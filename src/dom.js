import { HostComponent, HostText } from './constants.js';

/**
 * 根据传入的 Fiber 节点创建对应的 DOM 元素。
 * @param {Object} workInProgress - 当前正在处理的 Fiber 节点，包含创建 DOM 元素所需的类型信息。
 * @returns {HTMLElement} - 返回新创建的 DOM 元素。
 */
export function createElement(workInProgress) {
  // 调用 document.createElement 方法，根据 workInProgress 节点的 type 属性创建对应的 DOM 元素
  return document.createElement(workInProgress.type);
}

/**
 * 将 workInProgress 节点的子节点对应的 DOM 元素添加到指定的 DOM 元素中。
 * @param {HTMLElement} dom - 目标 DOM 元素，子节点对应的 DOM 元素将被添加到该元素中。
 * @param {Object} workInProgress - 当前正在处理的 Fiber 节点，函数会遍历其所有子 Fiber 节点。
 */
export function appendChildren(dom, workInProgress) {
  // 获取 workInProgress 节点的第一个子 Fiber 节点，作为遍历的起点
  let childFiber = workInProgress.child;
  // 循环遍历子 Fiber 节点，只要 childFiber 存在就继续循环
  while (childFiber) {
    // 挂载或下钻
    // NOTE: 如果当前子 Fiber 节点是宿主组件或文本节点
    if (childFiber.tag === HostComponent || childFiber.tag === HostText) {
      // 将该子节点对应的 DOM 元素添加到目标 DOM 元素中
      dom.appendChild(childFiber.stateNode);
    } else {
      // NOTE: 若不是宿主组件或文本节点，则下钻到其子节点继续处理
      childFiber = childFiber.child;
      // 跳过本次循环的剩余代码，继续下一次循环
      continue;
    }

    // 回到根
    // 如果当前子 Fiber 节点回到了 workInProgress 节点，说明遍历完成，直接返回
    if (childFiber === workInProgress) {
      return;
    }

    // 如果没有兄弟节点，返回上级；如果当前子 Fiber 节点没有兄弟节点时，不断向上回溯
    while (!childFiber.sibling) {
      // 如果回溯到 workInProgress 节点，说明遍历完成，直接返回
      if (childFiber.return === workInProgress) {
        return;
      }
      // 将当前子 Fiber 节点更新为其父节点
      childFiber = childFiber.return;
    }

    // 遍历兄弟节点
    // 将当前子 Fiber 节点更新为其兄弟节点，继续遍历
    childFiber = childFiber.sibling;
  }
}

// 首次挂载
/**
 * 为指定的 DOM 元素设置初始属性。
 * @param {HTMLElement} dom - 目标 DOM 元素，将为其设置属性。
 * @param {Object} nextProps - 包含要设置的属性的对象，键为属性名，值为属性值。
 */
export function setInitialProps(dom, nextProps) {
  // 遍历 nextProps 对象中的所有属性键值对
  for (const [k, v] of Object.entries(nextProps)) {
    // 处理 style 属性
    if (k === 'style') {
      // 遍历 style 对象中的所有样式键值对
      for (const [sk, sv] of Object.entries(v)) {
        // 为 DOM 元素的 style 属性设置具体样式
        dom.style[sk] = sv;
      }
      // 跳过本次循环的剩余代码，继续下一次循环
      continue;
    }
    // 处理 children 属性
    if (k === 'children') {
      // 若 children 的值为数字或字符串类型
      if (typeof v === 'number' || typeof v === 'string') {
        // 将该值设置为 DOM 元素的文本内容
        dom.textContent = v;
      }
      // 跳过本次循环的剩余代码，继续下一次循环
      continue;
    }

    // 为 DOM 元素直接设置其他属性
    dom[k] = v;
  }
}

// 更新 diff
export function diffProperties(oldProps, newProps) {
  let updatePayload = [];
  let styleUpdates = {};

  // 遍历老 props，将需要删除的属性置空
  for (const [k, v] of Object.entries(oldProps)) {
    if (newProps[k]) {
      continue;
    }
    if (k === 'style') {
      for (const [sk, sv] of Object.entries(v)) {
        styleUpdates[sk] = '';
      }
      continue;
    }
    if (k.startsWith('on') || k === 'children') {
      continue;
    }
    updatePayload.push(k, null);
  }

  // 遍历新 props
  for (const [k, v] of Object.entries(newProps)) {
    const lastProp = oldProps ? oldProps[k] : undefined;
    if (v === lastProp) {
      continue;
    }

    if (k === 'style') {
      if (lastProp) {
        // 两个对象的比较
        for (const [sk, sv] of Object.entries(lastProp)) {
          // 新 style 当中不存在
          if (!v[sk]) {
            styleUpdates[sk] = '';
          }
        }

        for (const [sk, sv] of Object.entries(v)) {
          if (sv !== lastProp[sk]) {
            styleUpdates[sk] = sv;
          }
        }
      } else {
        styleUpdates = v;
      }
      continue;
    }

    if (k === 'children') {
      if (typeof v === 'string' || typeof v === 'number') {
        updatePayload.push(k, v);
      }
      continue;
    }

    if (k.startsWith('on')) {
      continue;
    }

    updatePayload.push(k, v);
  }

  if (Object.keys(styleUpdates).length > 0) {
    updatePayload.push('style', styleUpdates);
  }

  return updatePayload.length > 0 ? updatePayload : null;
}
