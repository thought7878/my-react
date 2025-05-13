function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  };
}

/**
 * children数组也可以包含字符串或数字等原始值。所以我们将所有不是对象的内容都包裹在自己的元素中，
 * 并为他们创建一个特殊类型： TEXT_ELEMENT 。
 * @param {string} text - 要创建的文本元素的内容。
 * @returns {Object} - 返回一个表示文本元素的对象，包含类型和属性。
 *
 **/
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function render(element, container) {
  // 使用元素类型创建 DOM 节点
  // 处理文本元素，如果元素类型是 TEXT_ELEMENT ，我们会创建一个文本节点而不是普通节点。
  const dom =
    element.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type);

  // 将元素属性分配给节点
  const isProperty = (key) => key !== 'children';
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  /* 
  // 递归地对每个子元素做同样的处理
  element.props.children.forEach((child) => render(child, dom));
  */
  let nextUnitOfWork = null;
  function workLoop(deadline) {
    // 标记是否应该停止工作
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
      // 检查是否还有剩余时间，如果没有，设置 shouldYield 为 true，以便在下一次循环中继续工作。
      // 这是一个简单的时间切片实现，它允许浏览器在处理完一部分工作后，有机会处理其他任务，如响应用户输入或更新屏幕。

      // requestIdleCallback 还给我们提供了一个截止日期参数。
      // 我们可以用它来检查浏览器再次需要控制之前还有多少时间。
      shouldYield = deadline.timeRemaining() < 1;
    }
    // 使用 requestIdleCallback 来创建一个循环。
    // 你可以把 requestIdleCallback 看作是一个 setTimeout ，但不是由我们告诉它何时运行，
    // 而是当主线程空闲时浏览器会运行回调。
    requestIdleCallback(workLoop);
  }
  // React 不再使用 requestIdleCallback 了。现在它使用调度器包。但对于这个用例，在概念上是一样的。
  requestIdleCallback(workLoop);
  // 执行工作单元
  // 该函数不仅执行工作，还返回下一个工作单元
  function performUnitOfWork(nextUnitOfWork) {
    // TODO
  }

  // 将新节点追加到容器中
  container.appendChild(dom);
}

const Didact = {
  createElement,
  render,
};

/**
 * 我们如何告诉 babel 使用 Didact 的 createElement 而不是 React 的？
 *
 * 如果我们有一个像这样的注释，当 babel 转换 JSX 时，它将使用我们定义的函数。
 */
/** @jsx Didact.createElement */
const element = (
  <div id='foo'>
    <a>bar</a>
    <b />
  </div>
);

/*
const element = Didact.createElement(
  'div',
  { id: 'foo' },
  Didact.createElement('a', null, 'bar'),
  Didact.createElement('b')
);
 */

const container = document.getElementById('root');
Didact.render(element, container);
