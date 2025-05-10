import {
  createFiberFromElement,
  createHostRootFiber,
  createWorkInProgress,
} from './fiber.js';
import { appendChildren, createElement, setInitialProps } from './dom.js';
import React from './react.js';
import {
  ClassComponent,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './constants';
import { listenToAllEvents } from './listenToAllEvents.js';

const hostComponent = (
  <h1 style={{ color: 'orange' }}>
    <span>Host Component</span>
  </h1>
);
function AppFunctionComponent() {
  return <h1 style={{ color: 'green' }}>Function Component</h1>;
}
const AppClassComponent = class extends React.Component {
  render() {
    return (
      <div
        style={{ color: 'blue' }}
        onClick={() => {
          console.log('div clicked');
        }}
      >
        <h2
          onClick={() => {
            console.log('h2 clicked');
          }}
        >
          我是h2
        </h2>
      </div>
    );
  }
};

// 定义根对象，包含一个指向 DOM 容器的引用
const root = {
  container: document.getElementById('root'),
};
// 调用 createHostRootFiber 函数创建一个宿主根 Fiber 节点
// 宿主根 Fiber 节点是 React 应用的根节点，用于管理整个应用的渲染流程
const hostRootFiber = createHostRootFiber();
// 将创建的宿主根 Fiber 节点赋值给 root 对象的 current 属性
root.current = hostRootFiber;
// 将 root 对象赋值给宿主根 Fiber 节点的 stateNode 属性，建立双向引用
hostRootFiber.stateNode = root;

// 创建一个根Fiber节点的副本节点 workInProgress（正在构建、正在处理、工作中的节点），用于后续的渲染工作。传入根 Fiber 节点、初始的props配置
// 双缓存
let workInProgress = createWorkInProgress(hostRootFiber, {
  // children: hostComponent,
  // children: <AppFunctionComponent />,
  children: <AppClassComponent />,
});

// NOTE: 监听所有事件
listenToAllEvents(root.container);

// 模拟ReactDOM.render(element, container)
function render() {
  // 渲染阶段，构建 Fiber 树
  renderRootSync();
  // commit阶段，更新真实DOM
  commitRoot();
}

function commitRoot() {
  console.log(111, root);
  const container = root.container;
  const finishedWork = root.current.alternate;
  let childFiber = finishedWork.child;
  while (childFiber) {
    if (childFiber.tag === HostComponent && childFiber.stateNode) {
      container.appendChild(childFiber.stateNode);
      break;
    }
    childFiber = childFiber.child;
  }
  container.current = finishedWork;
}

render();

/**
 * 渲染阶段，构建 Fiber 树。
 * 同步渲染根节点的函数。
 * 该函数会遍历 fiber 树，依次执行 beginWork 和 completeWork 操作，完成整个渲染流程。
 */
function renderRootSync() {
  // 当存在待处理的 workInProgress fiber 节点时，继续执行渲染工作
  // 当不存在待处理的 workInProgress fiber 节点时，说明渲染工作已经完成，退出循环
  while (workInProgress) {
    // 获取当前 workInProgress fiber 节点对应的 current fiber 节点
    const current = workInProgress.alternate;
    // 执行 beginWork 函数，处理当前 fiber 节点，返回下一个需要处理的子 fiber
    const next = beginWork(current, workInProgress);
    // 将 pendingProps 赋值给 memoizedProps，表示属性已经处理完成
    workInProgress.memoizedProps = workInProgress.pendingProps;
    // 如果存在下一个需要处理的子 fiber
    if (next) {
      // 将 workInProgress 指向子 fiber，继续处理子节点
      workInProgress = next;
    } else {
      // 当没有子 fiber 时，开始回溯，完成当前节点及其父节点的工作
      do {
        // 执行 completeWork 函数，完成当前 fiber 节点的工作
        completeWork(workInProgress);
        // TODO 从左到右：如果当前 fiber 存在兄弟节点
        if (workInProgress.sibling) {
          // 将 workInProgress 指向兄弟节点，继续处理兄弟节点
          workInProgress = workInProgress.sibling;
          // TODO 跳出 do-while 循环，开始从上到下处理兄弟节点的子节点
          break;
        } else {
          // TODO 从下到上：如果没有兄弟节点，将 workInProgress 指向父节点，继续回溯
          workInProgress = workInProgress.return;
        }
      } while (workInProgress);
    }
  }
}

/**
 * 构建current Fiber 节点。不是首次渲染，复用现有节点。是首次渲染，根据 React Element，创建新的Fiber节点。
 * @param {Fiber|null} current - current Fiber 树中对应的 Fiber 节点，如果是首次渲染则为 null。
 * @param {Fiber} workInProgress - 正在构建的新 Fiber 节点。
 * @returns {Fiber|null} - 下一个需要处理的子 Fiber 节点，如果没有则返回 null。
 */
function beginWork(current, workInProgress) {
  // NOTE: 首次渲染
  // NOTE: 存储下一个需要处理的子节点对应的ReactElement
  let nextChildren = null;
  // NOTE: 获取对应的ReactElement，根据 workInProgress 节点的类型进行不同处理
  switch (workInProgress.tag) {
    case HostRoot:
      // 获取根节点的对应的ReactElement
      nextChildren = workInProgress.pendingProps.children;
      break;
    case HostComponent:
      // 获取宿主组件的子节点
      const children = workInProgress.pendingProps.children;
      // 如果子节点是字符串或数字，则不处理，react不会为字符串或数字创建fiber节点（节省内存）
      nextChildren =
        typeof children === 'string' || typeof children === 'number'
          ? null
          : children;
      break;
    case HostText:
      // 文本节点没有子节点
      break;
    case FunctionComponent:
      // NOTE: 调用函数，获取ReactElement
      nextChildren = workInProgress.type(workInProgress.pendingProps);
      break;
    case ClassComponent:
      // 如果是首次渲染
      if (!current) {
        // 创建类组件的实例
        const instance = new workInProgress.type(workInProgress.pendingProps);
        // 将实例与 Fiber 节点关联
        instance._reactFiber = workInProgress;
        // 将实例存储在 Fiber 节点的 stateNode 属性中
        workInProgress.stateNode = instance;
        // NOTE: 调用实例的 render 方法，获取ReactElement
        nextChildren = instance.render();
      } else {
        // 获取类组件的实例
        const instance = workInProgress.stateNode;
        // 初始化新的状态
        let newState = instance.state;
        // 获取当前节点的更新队列
        const pendingState = current.updateQueue.pending;
        // 获取更新队列的第一个更新
        let next = pendingState.next;
        // 遍历更新队列，合并状态
        do {
          newState = { ...newState, ...next.payload };
          if (next === pendingState) {
            break;
          }
          next = next.next;
        } while (next);
        // 更新实例的状态
        instance.state = newState;
        // 调用实例的 render 方法获取子节点
        nextChildren = instance.render();
      }
      break;
    default:
      return;
  }

  if (!nextChildren) {
    // 如果没有子节点
    workInProgress.child = null;
    return workInProgress.child;
  }
  // NOTE: 根据 nextChildren React 元素创建一个新的 Fiber 节点。完善节点之间的关系。
  const childFiber = createFiberFromElement(nextChildren);
  childFiber.return = workInProgress;
  workInProgress.child = childFiber;

  // 返回下一个需要处理的子 Fiber 节点
  return workInProgress.child;
}

/**
 * 遍历节点从下到上时，完善、完成节点的属性。
 * 完成当前 workInProgress Fiber 节点的属性（DOM/优先级/副作用）、更新属性等，如，DOM属性 stateNode（创建 DOM 元素）、优先级属性、副作用属性。
 * 根据节点类型进行不同处理。
 * 并向上冒泡，完善子节点的副作用标记和优先级。
 * @param {Fiber} workInProgress - 正在构建的新 Fiber 节点。
 */
function completeWork(workInProgress) {
  // 获取当前 workInProgress Fiber 节点对应的 current Fiber 节点
  const current = workInProgress.alternate;
  // 根据 workInProgress 节点的类型进行不同处理
  switch (workInProgress.tag) {
    case HostRoot:
    case FunctionComponent:
    case ClassComponent:
    case Fragment:
      // 对于根节点、函数组件、类组件和 Fragment 节点，目前不做额外处理，直接跳过
      break;
    case HostComponent:
      // // 更新逻辑（注释部分）
      // // 如果存在 current Fiber 节点且 workInProgress 节点已存在对应的 DOM 元素
      // if (current && workInProgress.stateNode) {
      //     // 检查属性是否未发生变化
      //     if (current.memoizedProps === workInProgress.pendingProps) {
      //         // 若属性未变，无需更新，直接返回
      //         return;
      //     }
      //     // 若属性发生变化，计算属性差异
      //     const updatePayload = diffProperties(current.memoizedProps, workInProgress.pendingProps);
      //     // 将属性差异存储到更新队列中
      //     workInProgress.updateQueue = updatePayload;
      //     // 如果存在属性差异，给当前 Fiber 节点打上更新标记，等待提交阶段处理
      //     if (updatePayload) {
      //         workInProgress.flags |= Update;
      //     }
      //     break;
      // }
      // 新增逻辑
      // NOTE: 创建宿主组件（Host Component）对应的 DOM 元素
      const instance = createElement(workInProgress);
      // 将workInProgress的子节点对应的 DOM 元素添加到当前 DOM 元素中
      appendChildren(instance, workInProgress);
      // NOTE: 每一个宿主组件的Fiber节点都有一个stateNode属性，指向真实的DOM节点
      // 将创建的 DOM 元素关联到 workInProgress Fiber 节点的 stateNode 属性
      workInProgress.stateNode = instance;
      // 将 workInProgress Fiber 节点关联到 DOM 元素的 internalFiber 属性
      instance.internalFiber = workInProgress;
      // 为 DOM 元素设置初始属性
      setInitialProps(instance, workInProgress.pendingProps);
      break;
    case HostText:
      // 创建文本节点，并将其关联到 workInProgress Fiber 节点的 stateNode 属性
      workInProgress.stateNode = document.createTextNode(
        workInProgress.pendingProps
      );
      break;

    default:
      // 对于其他未处理的节点类型，直接返回
      return;
  }
  // 调用 bubbleProperties 函数，向上冒泡子节点的副作用标记、优先级车道
  // bubbleProperties(workInProgress);
}

/* 
// 测试代码：3. 创建一个 Fiber 节点
const element = <div className='div'>i am div</div>;

console.log('element', element);

export default function App() {
  return <h1 className='h1'>Hello World</h1>;
}
console.log(
  'App'
  // <App />

  // <App className='tt'>
  //   test
  //   <h1>title</h1>
  // </App>
);
 */
