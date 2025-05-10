import {
  ClassComponent,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  Fragment,
  NoFlags,
  NoLanes,
} from './constants.js';

/**
 * FiberNode 构造函数，用于创建一个 Fiber 节点对象。
 * Fiber 节点是 React 协调器（Reconciler）中用于表示组件、DOM 元素或其他实体的对象。
 *
 * @param {number} tag - 标识 Fiber 节点类型的标签，不同的标签对应不同类型的节点（如宿主组件、类组件等）。
 * @param {Object} pendingProps - 节点的待处理属性，这些属性将在后续的渲染过程中被使用。
 * @param {string|null} key - 用于在列表渲染时唯一标识节点的键，有助于 React 高效地更新列表。
 */
function FiberNode(tag, pendingProps, key) {
  // 基本属性
  // 节点的类型标签，用于区分不同类型的 Fiber 节点
  this.tag = tag;
  // 节点的待处理属性，在组件更新时会被使用
  this.pendingProps = pendingProps;
  // 节点的唯一标识，用于列表渲染优化
  this.key = key;
  // 节点对应的组件类型或 DOM 标签名
  this.type = null;
  // 用于获取 DOM 节点或组件实例的引用
  this.ref = null;

  // 父子、兄弟关系
  // 指向父 Fiber 节点，当当前节点完成工作后，会返回父节点继续处理
  this.return = null;
  // 指向第一个子 Fiber 节点
  this.child = null;
  // 指向下一个兄弟 Fiber 节点
  this.sibling = null;

  // state,props,update
  // 节点的记忆化状态，存储组件的当前状态
  this.memoizedState = null;
  // 节点的记忆化属性，存储组件的当前属性
  this.memoizedProps = null;
  // 节点的更新队列，pending 指向最新的更新操作
  this.updateQueue = {
    pending: null,
  };

  // 各种标记
  // 当前节点的副作用标记，用于标记节点需要进行的操作（如插入、更新、删除等）
  this.flags = NoFlags;
  // 子树的副作用标记，用于标记子树中需要进行的操作
  this.subtreeFlags = NoFlags;
  // 当前节点的任务优先级
  this.lanes = NoLanes;
  // 子节点的任务优先级
  this.childLanes = NoLanes;

  // 其他
  // 节点在兄弟节点中的索引位置
  this.index = 0;
  // 节点的模式，用于控制组件的行为（如严格模式等）
  this.mode = null;
  // 节点对应的真实 DOM 元素或组件实例
  this.stateNode = null;
  // 存储需要删除的子节点列表
  this.deletions = null;
  // 指向当前 Fiber 节点的备用节点，用于双缓存机制
  this.alternate = null;
}

/**
 * 创建一个新的 Fiber 节点。
 * 该函数作为一个工厂函数，通过调用 `FiberNode` 构造函数来创建新的 Fiber 节点。
 *
 * @param {number} tag - 标识 Fiber 节点类型的标签，不同的标签对应不同类型的节点（如宿主组件、类组件等）。
 * @param {Object} pendingProps - 节点的待处理属性，这些属性将在后续的渲染过程中被使用。
 * @param {string|null} key - 用于在列表渲染时唯一标识节点的键，有助于 React 高效地更新列表。
 * @returns {FiberNode} - 返回一个新创建的 Fiber 节点实例。
 */
function createFiber(tag, pendingProps, key) {
  // 调用 FiberNode 构造函数创建一个新的 Fiber 节点实例并返回
  return new FiberNode(tag, pendingProps, key);
}

/**
 * 根据 React 元素创建对应的 Fiber 节点。
 *
 * @param {Object} element - 一个 React 元素对象，包含 type、props 和 key 等属性。
 * @returns {FiberNode} - 返回一个新创建的 Fiber 节点，该节点与传入的 React 元素相对应。
 */
export function createFiberFromElement(element) {
  // 初始化 Fiber 节点的标签，用于标识节点的类型
  let tag = null;
  // 从 React 元素中解构出 type、props 和 key 属性
  const { type, props, key } = element;

  // 根据元素类型设置 Fiber 节点的 tag
  if (typeof type === 'string') {
    // 如果元素类型是字符串，说明是一个宿主组件（如 <div>、<span> 等 HTML 标签）
    tag = HostComponent;
  } else if (typeof type === 'function') {
    // 如果元素类型是函数，需要进一步判断是类组件还是函数组件
    if (type.isReactComponent) {
      // 如果函数有 isReactComponent 属性，说明是类组件
      tag = ClassComponent;
    } else {
      // 否则，认为是函数组件
      tag = FunctionComponent;
    }
  }

  // 使用 createFiber 函数创建一个新的 Fiber 节点
  const fiberNode = createFiber(tag, props, key);
  // 将 React 元素的类型赋值给 Fiber 节点的 type 属性
  fiberNode.type = element.type;
  // 返回创建好的 Fiber 节点
  return fiberNode;
}

// 创建一个文本节点
export function createFiberFromText(text) {
  return createFiber(HostText, text, null);
}

// 创建空节点
export function createFiberFromFragment(element) {
  return createFiber(Fragment, element);
}

// 创建

// 创建根节点
export function createHostRootFiber() {
  return createFiber(HostRoot, null, null);
}

/**
 * React每次更新时，都会调用这个函数，根据老的Fiber节点，创建工作树的新节点
 *
 * 创建一个用于工作树的 Fiber 节点（workInProgress Fiber）。
 * workInProgress Fiber 是当前正在构建的新 Fiber 树中的节点，与当前渲染的 Fiber 树（current Fiber 树）相对应。
 * @param {FiberNode} current - 当前渲染的 Fiber 树中的对应节点（老节点）。
 * @param {Object} pendingProps - 新的待处理属性。
 * @returns {FiberNode} - 返回用于工作的新的 Fiber 节点。
 */
export function createWorkInProgress(current, pendingProps) {
  // 尝试从 current Fiber 节点的 alternate 属性获取 workInProgress Fiber 节点
  let workInProgress = current.alternate;

  // NOTE: 首次渲染后的第一次更新
  // 如果 alternate 不存在，说明还没有创建 workInProgress Fiber 节点
  if (workInProgress === null) {
    // 使用 createFiber 函数创建一个新的 Fiber 节点，继承 current 节点的 tag、key 和新的 pendingProps
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    // 将 current 节点的 stateNode 赋值给 workInProgress 节点，stateNode 通常存储 DOM 节点或组件实例
    workInProgress.stateNode = current.stateNode;
    // 建立 workInProgress 节点和 current 节点的双向关联
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // NOTE: 第二次及以后更新
    // 如果 alternate 存在，说明已经有 workInProgress Fiber 节点，复用它，更新其 pendingProps
    // 场景：第二次及以后更新，渲染时，复用已有的 workInProgress Fiber 节点，更新其 pendingProps
    workInProgress.pendingProps = pendingProps;
  }

  // 同步 current 节点的 type 到 workInProgress 节点，type 表示节点对应的组件类型或 DOM 标签名
  workInProgress.type = current.type;
  // 同步 current 节点的 child 到 workInProgress 节点，child 指向第一个子 Fiber 节点
  workInProgress.child = current.child;
  // 同步 current 节点的更新队列到 workInProgress 节点
  workInProgress.updateQueue = current.updateQueue;

  // 同步 current 节点的 lanes 和 childLanes 到 workInProgress 节点
  // lanes 用于表示任务的优先级
  workInProgress.lanes = current.lanes;
  workInProgress.childLanes = current.childLanes;

  // 返回创建好的 workInProgress Fiber 节点
  return workInProgress;
}
