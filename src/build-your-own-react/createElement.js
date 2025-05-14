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

function createDom(fiber) {
  // 使用元素类型创建 DOM 节点
  // 处理文本元素，如果元素类型是 TEXT_ELEMENT ，我们会创建一个文本节点而不是普通节点。
  const dom =
    fiber.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);

  // 将元素属性分配给节点
  const isProperty = (key) => key !== 'children';
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

function commitRoot() {
  commitWork(wipRoot.child);
  wipRoot = null;
}

// 递归地将所有节点添加到 dom 中
// 替代 performUnitOfWork 函数的部分作用：将当前 Fiber 节点的 DOM 元素添加到父 Fiber 节点的 DOM 元素中
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };

  // 将 nextUnitOfWork 设置为 fiber 树的根。
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
// 跟踪fiber树的根，work in progress root
let wipRoot = null;

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // 一旦我们完成所有工作（不存在下一个工作单元），将整个 fiber 树提交到 DOM。
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

// 浏览器空闲时调用 workLoop 函数，开始工作循环。
// 当浏览器准备好时，它会调用我们的 workLoop ，然后我们将开始处理根节点。
requestIdleCallback(workLoop);

/**
 * 工作单元就是Fiber 节点。
 * 执行一个工作单元，即处理当前 Fiber 节点，返回下一个需要处理的工作单元。
 * 该函数负责：
 * - 创建 DOM 元素。为当前的fiber节点，创建对应的DOM元素。
 * - 创建 Fiber 节点并建立节点间的关系。为当前的fiber节点的每个子react element，创建新的fiber节点，
 *   并将其添加到fiber树中，建立fiber节点之间的关系（父子、兄弟）。
 * - 确定下一个工作单元，并返回。返回下一个需要处理的工作单元（fiber节点）。
 *   我们首先尝试子节点，然后是兄弟节点，然后是叔节点，等等。
 *
 * @param {Object} fiber - 当前需要处理的 Fiber 节点。
 * @returns {Object|null} - 下一个需要处理的 Fiber 节点，如果没有则返回 null。
 */
function performUnitOfWork(fiber) {
  // NOTE: 创建一个新的DOM，并将其添加到父 DOM 中
  if (!fiber.dom) {
    // 为 Fiber 节点创建对应的 DOM 元素
    fiber.dom = createDom(fiber);
  }

  /* 
  // 这里有一个问题：
  // 每次我们处理一个元素时，我们都在向 DOM 添加一个新的节点。
  // 记住，浏览器可能会在我们完成渲染整个树之前中断我们的工作。
  // 在这种情况下，用户会看到一个不完整的 UI。我们不希望这样。
  if (fiber.parent) {
    // 将当前 Fiber 节点的 DOM 元素添加到父 Fiber 节点的 DOM 元素中
    fiber.parent.dom.appendChild(fiber.dom);
  } */

  // NOTE: 为当前的fiber节点的每个子 react element，创建新的 fiber；将其添加到 fiber 树中，建立fiber节点之间的关系
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    // 将其添加到 fiber 树中，建立fiber节点之间的关系（父子、兄弟）
    if (index === 0) {
      // 父子关系：如果当前节点是第一个子节点，将其设置为父节点的子节点
      fiber.child = newFiber;
    } else {
      // 兄弟关系：如果当前节点不是第一个子节点，将其设置为前一个兄弟节点的兄弟节点
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // NOTE: 返回下一个需要处理的工作单元（fiber节点）。
  // 查找下一个工作单元。我们首先尝试子节点，然后是兄弟节点，然后是叔节点，等等。
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
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
