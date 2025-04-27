/**
 * 用于标识 React 元素的唯一 Symbol。
 * 每个 React 元素对象都会包含一个 $$typeof 属性，其值为该 Symbol。
 */
export const REACT_ELEMENT = Symbol('react_element');

/**
 * fiber tag 类型
 * 定义了一系列用于标识不同类型 Fiber 节点的常量，
 * 这些常量在 React 的协调器（Reconciler）中用于区分不同类型的组件或元素。
 * 下面逐个解释这些常量：
 */
// 含义：表示该 Fiber 节点对应的是一个函数组件。在 React 里，函数组件是一个返回 React 元素的 JavaScript 函数。
// 用途：协调器在处理组件树时，通过这个标记来识别当前节点是函数组件，从而按照函数组件的逻辑进行渲染和更新。
export const FunctionComponent = 0;
// 含义：表示该 Fiber 节点对应的是一个类组件。类组件是继承自 React.Component 或 React.PureComponent 的 JavaScript 类
// 用途：协调器使用这个标记来识别当前节点是类组件，进而执行类组件的生命周期方法和状态管理逻辑。
export const ClassComponent = 1;
// 含义：表示该 Fiber 节点是整个应用的根节点。在 React 应用中，通常通过 ReactDOM.render 方法将组件渲染到一个 DOM 容器中，这个 DOM 容器对应的 Fiber 节点就是 HostRoot。
// 用途：协调器以此标记来确定整个应用的根节点，从这里开始进行组件树的遍历和协调工作。
export const HostRoot = 3;
// 含义：表示该 Fiber 节点对应的是一个宿主组件，也就是原生的 DOM 元素，如 <div>、<span> 等。
// 用途：协调器使用这个标记来识别当前节点是原生 DOM 元素，从而在提交阶段创建、更新或删除对应的 DOM 节点。
export const HostComponent = 5;
// 含义：表示该 Fiber 节点对应的是一个文本节点。在 React 中，文本内容会被转换为 HostText 类型的 Fiber 节点。
// 用途：协调器通过这个标记来识别当前节点是文本节点，在提交阶段将文本内容插入到对应的 DOM 中。
export const HostText = 6;
// 含义：表示该 Fiber 节点对应的是一个 React.Fragment。Fragment 允许你在不添加额外 DOM 节点的情况下将多个子元素分组。
// 用途：协调器使用这个标记来识别当前节点是 Fragment，在处理组件树时会正确处理 Fragment 包裹的子元素。
export const Fragment = 7;

/**
 * 协调过程中产生的副作用 flag
 * 定义了一系列用于表示 React 协调过程中副作用标记（flags）的常量。
 * 在 React 的协调算法里，副作用标记用于标记 Fiber 节点在提交阶段（commit phase）需要执行的操作，
 * 下面逐个解释这些常量：
 */
// 含义：表示该 Fiber 节点没有任何副作用操作。二进制形式下所有位都是 0，意味着在提交阶段不需要对这个节点执行额外的操作。
// 用途：在初始化或者节点没有变化时，会给 Fiber 节点设置这个标记。
export const NoFlags = /*                      */ 0b00000000000000000000000000;
// 含义：表示该 Fiber 节点需要在 DOM 中进行插入操作。对应的二进制数中，从右往左数第二位为 1。
// 用途：当一个新的 Fiber 节点被创建，或者节点从一个位置移动到另一个位置时，会被标记为 Placement，在提交阶段会将对应的 DOM 元素插入到正确的位置。
export const Placement = /*                    */ 0b00000000000000000000000010;
// 含义：表示该 Fiber 节点需要进行更新操作。对应的二进制数中，从右往左数第三位为 1。
// 用途：当节点的属性、状态发生变化时，会被标记为 Update，在提交阶段会更新对应的 DOM 元素的属性。
export const Update = /*                       */ 0b00000000000000000000000100;
// 含义：表示该 Fiber 节点的子节点需要被删除。对应的二进制数中，从右往左数第五位为 1。
// 用途：当某些子节点从组件树中移除时，父节点会被标记为 ChildDeletion，在提交阶段会删除对应的 DOM 元素。
export const ChildDeletion = /*                */ 0b00000000000000000000010000;
// 含义：表示该 Fiber 节点有副作用操作需要在布局之后异步执行，通常和 useEffect 钩子相关。对应的二进制数中，从右往左数第十一位为 1。
// 用途：当组件使用了 useEffect 钩子时，对应的 Fiber 节点可能会被标记为 Passive，在提交阶段会将副作用操作放入队列，在布局完成后异步执行。
export const Passive = /*                      */ 0b00000000000000100000000000; // 2048

export const HookHasEffect = /* */ 0b0001; // 1
export const HookInsertion = /*  */ 0b0010; // 2
export const HookLayout = /*    */ 0b0100; // 4
export const HookPassive = /*   */ 0b1000; // 8

// 渲染优先级 lane
/**
 * 表示没有任何渲染优先级。
 * 二进制形式下所有位都是 0，意味着该值代表不存在任何渲染优先级。
 * 通常用于初始化或者表示没有待处理的渲染任务。
 */
export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
/**
 * 同样表示没有任何渲染优先级，与 NoLanes 作用相同。
 * 这种设计可能是为了在不同的上下文或语义中使用，以提高代码的可读性。
 */
export const NoLane = /*                        */ 0b0000000000000000000000000000000;
/**
 * 表示同步渲染优先级。
 * 对应的二进制数中，从右往左数第一位为 1。
 * 具有该优先级的渲染任务会被立即同步执行，通常用于处理用户输入等需要即时响应的操作。
 */
export const SyncLane = /*                       */ 0b0000000000000000000000000000001;

/**
 * 合并两个渲染优先级（lane）。
 * 在 React 的渲染机制里，lane 用于表示不同的渲染优先级，通过合并操作可以将多个优先级合并成一个。
 * 此函数使用按位或运算符 `|` 来合并两个 lane 值，合并后的结果包含了两个输入 lane 中的所有优先级。
 *
 * @param {number} a - 第一个渲染优先级的值，以二进制形式表示。
 * @param {number} b - 第二个渲染优先级的值，以二进制形式表示。
 * @returns {number} 合并后的渲染优先级的值，包含了 `a` 和 `b` 中的所有优先级。
 */
export function mergeLane(a, b) {
  // 使用按位或运算符合并两个 lane 值
  return a | b;
}

/**
 * 检查两个渲染优先级（lane）是否有交集。
 * 在 React 的渲染机制中，lane 用于表示不同的渲染优先级。
 * 此函数通过按位与运算符 `&` 来判断两个 lane 值是否存在共同的优先级位。
 * 如果存在共同的优先级位，则说明 `a` 包含 `b` 中的部分优先级。
 *
 * @param {number} a - 第一个渲染优先级的值，以二进制形式表示。
 * @param {number} b - 第二个渲染优先级的值，以二进制形式表示。
 * @returns {boolean} 如果 `a` 和 `b` 有共同的优先级位，则返回 `true`；否则返回 `false`。
 */
export function includesSomeLane(a, b) {
  // 使用按位与运算符判断 a 和 b 是否有共同的优先级位，若结果不为 NoLane 则存在交集
  return (a & b) !== NoLane;
}
