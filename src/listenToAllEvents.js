import { HostComponent } from './constants.js';

const allEvents = ['click', 'mousedown', 'mouseup', 'dblclick'];

/**
 * 从指定的 Fiber 节点开始向上遍历 Fiber 树，收集所有绑定了特定 React 事件监听器的函数。
 * @param {string} reactEventName - React 事件名，例如 'onClick'、'onMouseDown' 等。
 * @param {Object} fiber - 起始的 Fiber 节点，从此节点开始向上遍历。
 * @returns {Array<Function>} - 包含所有收集到的事件监听器函数的数组。
 */
function accumulateListeners(reactEventName, fiber) {
  // 初始化一个空数组，用于存储收集到的事件监听器函数
  const listeners = [];
  // 当前正在处理的 Fiber 节点，初始值为传入的起始 Fiber 节点
  let currentFiber = fiber;

  // 当 currentFiber 存在时，持续向上遍历 Fiber 树
  while (currentFiber) {
    // 检查当前 Fiber 节点是否为宿主组件（如 div、span 等 DOM 元素对应的 Fiber 节点）
    // 并且该节点是否有对应的 DOM 元素（存储在 stateNode 中）
    if (currentFiber.tag === HostComponent && currentFiber.stateNode) {
      // 从当前 Fiber 节点的 memoizedProps 中获取指定 React 事件名对应的监听器函数
      const listener = currentFiber.memoizedProps[reactEventName];
      // 若存在对应的监听器函数
      if (listener) {
        // 将监听器函数添加到 listeners 数组中
        listeners.push(listener);
      }
    }
    // 将 currentFiber 更新为其父 Fiber 节点，继续向上遍历
    currentFiber = currentFiber.return;
  }

  // 返回收集到的所有事件监听器函数组成的数组
  return listeners;
}

class SyntheticEvent {
  constructor(event) {
    this.nativeEvent = event;

    Object.keys(event).forEach((key) => {
      if (key === 'preventDefault') {
        this[key] = function () {};
      } else if (key === 'stopPropagation') {
        this[key] = function () {};
      } else {
        this[key] = event[key];
      }
    });
  }
}

/**
 * 分发 DOM 事件，模拟 React 事件系统的事件分发机制。
 * 该函数会将原生 DOM 事件转换为 React 事件，收集相关事件处理函数（监听器）并依次执行。
 * @param {Event} event - 原生 DOM 事件对象。
 */
function dispatchEvent(event) {
  // 从原生 DOM 事件对象中解构出触发事件的目标元素和事件类型
  const { target, type } = event;
  // 将原生事件类型转换为 React 事件名格式，例如 'click' 转换为 'onClick'
  const reactEventName = `on` + type[0].toUpperCase() + type.slice(1);
  // 收集函数：调用 accumulateListeners 函数，从触发事件的目标元素对应的 Fiber 节点开始向上遍历
  // 收集所有绑定了该 React 事件的监听器函数
  const listeners = accumulateListeners(reactEventName, target.internalFiber);
  // 合成事件：创建 SyntheticEvent 类的实例，将原生 DOM 事件对象封装为合成事件对象
  const syntheticEvent = new SyntheticEvent(event);
  // 执行：遍历收集到的事件监听器函数数组，依次调用每个监听器函数，并传入合成事件对象
  for (const listener of listeners) {
    listener(syntheticEvent);
  }
}

/**
 * 为指定的 DOM 容器添加多个事件监听器，模拟 React 的事件委托机制。
 * 该函数会监听一系列预定义的原生 DOM 事件，并将事件处理委托给 dispatchEvent 函数。
 * @param {HTMLElement} container - 用于添加事件监听器的 DOM 容器元素。
 */
export function listenToAllEvents(container) {
  // 遍历 allEvents 数组中的每个原生 DOM 事件名
  for (const eventName of allEvents) {
    // 为容器元素添加事件监听器
    // eventName: 当前要监听的原生 DOM 事件名，如 'click'
    // dispatchEvent: 事件处理函数，当 container 或其内部元素触发对应事件时，会调用 dispatchEvent 函数来处理事件。
    // false: 表示在事件冒泡阶段处理事件
    container.addEventListener(eventName, dispatchEvent, false);
  }
}
