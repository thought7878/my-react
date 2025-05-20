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

/**
 * 将工作中的 Fiber 树的更改提交到实际的 DOM 中，
 * 包括删除需要移除的节点，更新 DOM 并更新当前 Fiber 树的引用。
 */
function commitRoot() {
  // 遍历 deletions 数组，对其中每个需要删除的 Fiber 节点调用 commitWork 函数，执行实际的 DOM 删除操作
  // 当我们提交对 DOM 的更改时，会使用 deletions 数组中的 Fiber 节点来处理删除操作
  deletions.forEach(commitWork);

  // 从工作中的 Fiber 树的第一个子节点开始，递归调用 commitWork 函数，
  // 将整个 Fiber 树的更改（添加、更新）提交到实际的 DOM 中
  commitWork(wipRoot.child);

  // 将工作中的 Fiber 树的根节点赋值给 currentRoot，
  // 表示本次工作中的 Fiber 树已经成功提交到 DOM，成为当前生效的 Fiber 树
  currentRoot = wipRoot;

  // 将 wipRoot 置为 null，意味着当前没有正在进行的工作中的 Fiber 树，为下一次渲染工作做准备
  wipRoot = null;
}

/**
 * 将 Fiber 节点的更改（添加、删除、更新）递归地提交到实际的 DOM 中。
 * 该函数会根据 Fiber 节点的 effectTag 属性执行相应的 DOM 操作，
 * 并递归处理子节点和兄弟节点。
 *
 * @param {Object} fiber - 当前需要处理的 Fiber 节点。
 */
function commitWork(fiber) {
  // 如果传入的 Fiber 节点为空，直接返回，避免后续操作出错
  if (!fiber) {
    return;
  }
  // 获取当前 Fiber 节点的父节点对应的 DOM 元素，后续操作将基于此父元素进行
  const domParent = fiber.parent.dom;

  // NOTE：增删改，根据 Fiber 节点的 effectTag 属性执行不同的 DOM 操作
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    // 增：如果 fiber 的 effectTag 为 PLACEMENT 且对应的 DOM 元素存在，则将该 DOM 元素添加到父节点的 DOM 元素中
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'DELETION') {
    // 删：如果 fiber 的 effectTag 为 DELETION，则将该 Fiber 节点对应的 DOM 元素从父节点的 DOM 元素中移除
    // 这里添加安全检查，确保要移除的 DOM 元素存在
    if (fiber.dom) {
      domParent.removeChild(fiber.dom);
    }
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    // 改：如果 fiber 的 effectTag 为 UPDATE 且对应的 DOM 元素存在，调用 updateDom 函数，使用新旧属性更新 DOM 元素的属性
    // 用变化的属性更新现有的 DOM 节点
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }

  // 递归处理当前 Fiber 节点的子节点
  commitWork(fiber.child);
  // 递归处理当前 Fiber 节点的兄弟节点
  commitWork(fiber.sibling);
}

// 需要更新的特殊类型的属性是事件监听器，所以如果属性名以“on”前缀开头，我们将以不同的方式处理它们。
const isEvent = (key) => key.startsWith('on');
// 判断传入的属性名 key 是否不是 children。在更新 DOM 属性时，children 通常用于表示子元素，并非普通的 DOM 属性，所以需要将其排除。
const isProperty = (key) => key !== 'children' && !isEvent(key);
// 这是一个高阶函数，返回一个新函数。返回的函数，用于判断某个属性在新旧属性对象中是否有变化。
// prev：旧属性对象。next：新属性对象。
const isNew = (prev, next) => (key) => prev[key] !== next[key];
// 同样是高阶函数，返回一个新函数。返回的函数，用于判断某个属性是否在新属性对象中不存在。
// prev：旧属性对象。next：新属性对象。
const isGone = (prev, next) => (key) => !(key in next);
/**
 * 将旧 fiber 的 props 与新 fiber 的 props 进行比较，移除已消失的 props，
 * 并设置新出现或发生变化的 props。
 * @param {*} key
 * @returns
 */
function updateDom(dom, prevProps, nextProps) {
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = '';
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // 如果事件处理器改变了，我们就把它从节点中移除。Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });
  // 添加新的处理器。Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // 这个属性链接到旧的fiber，即我们在上一个提交阶段提交到 DOM 的fiber
    alternate: currentRoot,
  };

  deletions = [];
  // 将 nextUnitOfWork 设置为 fiber 树的根。
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
// 跟踪当前的fiber树的根，current root
// 最后提交到 DOM 的fiber树的根
let currentRoot = null;
// 跟踪fiber树的根，work in progress root
let wipRoot = null;
// 需要一个数组来跟踪我们想要删除的节点
let deletions = null;

/**
 * 工作循环函数，利用浏览器的空闲时间逐步处理 Fiber 节点，避免阻塞主线程。
 * 该函数会在浏览器空闲时持续运行，直至所有工作单元处理完成并提交到 DOM。
 * @param {IdleDeadline} deadline - 浏览器空闲周期的截止时间信息对象，包含剩余时间等属性。
 */
function workLoop(deadline) {
  // 标记是否需要暂停工作循环，将控制权交还给浏览器，避免长时间占用主线程
  let shouldYield = false;
  // 当存在下一个工作单元且不需要暂停工作循环时，持续处理工作单元
  while (nextUnitOfWork && !shouldYield) {
    // 执行当前工作单元，并获取下一个待处理的工作单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 检查浏览器空闲周期的剩余时间，若剩余时间小于 1 毫秒，则需要暂停工作循环
    shouldYield = deadline.timeRemaining() < 1;
  }

  // 当所有工作单元处理完毕（即不存在下一个工作单元），且存在工作中的 Fiber 树时
  if (!nextUnitOfWork && wipRoot) {
    // 将整个工作中的 Fiber 树的更改提交到实际的 DOM 中
    commitRoot();
  }

  // 请求浏览器在下一次空闲时再次调用 workLoop 函数，持续处理后续可能出现的工作单元
  requestIdleCallback(workLoop);
}

// 浏览器空闲时调用 workLoop 函数，开始工作循环。
// 当浏览器准备好时，它会调用我们的 workLoop ，然后我们将开始处理根节点。
requestIdleCallback(workLoop);

/**
 * 工作单元就是Fiber 节点。
 * 执行单个工作单元的处理逻辑，即处理当前 Fiber 节点（Fiber->DOM）、Fiber的子节点（ReactElement->Fiber），返回下一个需要处理的工作单元。
 * 该函数负责：
 * - 为正在处理（当前）的fiber，创建对应的DOM（在commit阶段，将其添加到父 DOM 中，根据fiber.effectTag）。
 * - 调用 reconcileChildren 调和子节点；为当前fiber的每个子 ReactElement，创建 fiber；将其添加到 fiber 树中，建立fiber节点之间的关系（父子、兄弟）。
 * - 查找下一个需要处理的工作单元（Fiber 节点），并返回。查找下一个工作单元，首先尝试子节点，然后是兄弟节点，然后是叔节点。
 *
 * @param {Object} fiber - 当前需要处理的 Fiber 节点。
 * @returns {Object|null} - 下一个需要处理的 Fiber 节点，如果没有则返回 null。
 */
function performUnitOfWork(fiber) {
  // NOTE: 为正在处理（当前）的fiber，创建对应的DOM（在commit阶段，将其添加到父 DOM 中，根据fiber.effectTag）
  // 检查当前 Fiber 节点是否已有对应的 DOM 元素，若没有则创建
  if (!fiber.dom) {
    // 调用 createDom 函数，为当前 Fiber 节点创建对应的 DOM 元素
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

  // NOTE: 调用 reconcileChildren 函数调和子节点；为当前fiber的每个子 ReactElement，创建 fiber；将其添加到 fiber 树中，建立fiber节点之间的关系（父子、兄弟）
  // 获取当前 Fiber 节点的子 ReactElement 数组
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

  // NOTE: 查找下一个需要处理的工作单元（Fiber 节点），并返回。查找下一个工作单元，首先尝试子节点，然后是兄弟节点，然后是叔节点。
  // 若当前 Fiber 节点有子节点，优先返回其子节点作为下一个工作单元
  if (fiber.child) {
    return fiber.child;
  }
  // 若没有子节点，从当前节点开始向上查找
  let nextFiber = fiber;
  while (nextFiber) {
    // 若当前节点有兄弟节点，返回其兄弟节点作为下一个工作单元
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    // 若没有兄弟节点，继续向上查找其父节点
    nextFiber = nextFiber.parent;
  }
  // 若没有找到下一个工作单元，返回 null
  return null;
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

// element 是我们想要渲染到 DOM 的东西，oldFiber 是我们上次渲染的fiber。
/**
 * 调和当前 Fiber 节点的子节点，对比新旧子节点，创建或复用 Fiber 节点，
 * 并标记相应的更新操作（添加、更新、删除），同时建立节点间的关系。
 *
 * current Fiber 树、current 树、当前树：旧的，页面显示的
 * workInProgress Fiber 树、工作树：新的，正在构建的，即将显示到页面的
 *
 * current Fiber 节点/对象、current/当前 节点/对象：current 树上的
 * workInProgress Fiber 节点/对象、work/工作 节点/对象：workInProgress 树上的
 *
 * @param {Object} wipFiber - 当前正在处理的工作中的 Fiber 节点。
 * @param {Array} elements - 当前 Fiber 节点的新子元素 ReactElement 数组。
 */
function reconcileChildren(wipFiber, elements) {
  // 初始化索引，用于遍历新子元素数组，初始值是第一个ReactElement的索引
  let index = 0;
  // 获取 work 节点对应的 current 节点的第一个子节点
  // oldFiber 是我们上次渲染的fiber（第一个子节点）
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  // 用于记录上一个处理的兄弟 Fiber 节点
  let prevSibling = null;

  // 循环条件：只要新子元素数组未遍历完或者旧的 Fiber 节点还有剩余，就继续处理
  while (index < elements.length || oldFiber != null) {
    // 获取当前索引对应的新子元素
    const element = elements[index];
    // 用于存储当前要创建或复用的新 Fiber 节点
    let newFiber = null;

    // NOTE: 比较 oldFiber 和 element
    // 比较旧的 Fiber 节点和新元素的类型是否相同
    // 这里 React 也使用 keys，可以更好地进行 reconciliation。例如，它检测到当子元素在元素数组中位置变化时。
    const sameType = oldFiber && element && element.type == oldFiber.type;

    // 改：若旧 Fiber 节点和新元素，类型相同。创建一个新的 fiber；
    if (sameType) {
      // update the node
      newFiber = {
        // 保持节点类型不变
        type: oldFiber.type,
        // 用新的属性更新
        props: element.props,
        // 复用旧的 DOM 节点
        dom: oldFiber.dom,
        // 设置父节点为当前工作中的 Fiber 节点
        parent: wipFiber,
        // 指向旧的 Fiber 节点，用于后续对比
        alternate: oldFiber,
        // 标记为更新操作，后续提交阶段会更新该节点属性
        // 改：在稍后的提交阶段将使用这个属性
        effectTag: 'UPDATE',
      };
    }
    // 增：如果有新元素并且新元素与旧 Fiber 节点类型不同。这意味着，ReactElement 新增了，应标记为新增操作，需要创建一个新的 Fiber 节点
    if (element && !sameType) {
      //  add this node
      newFiber = {
        // 使用新元素的类型
        type: element.type,
        // 设置新元素的属性
        props: element.props,
        // 初始时 DOM 节点为空，后续会创建（performUnitOfWork）
        dom: null,
        // 设置父节点为当前工作中的 Fiber 节点
        parent: wipFiber,
        // 没有旧的 Fiber 节点可复用
        alternate: null,
        // 标记为添加操作，后续提交阶段会添加该节点
        // 增：元素需要一个新 DOM 节点，将新 fiber 标记为 PLACEMENT 效果标签。
        effectTag: 'PLACEMENT',
      };
    }
    // 删：若旧 Fiber 节点存在且与新元素类型不同。这意味着，ReactElement被删除了，应标记为删除操作
    // 如果类型不同并且存在旧 fiber（oldFiber），需要移除旧节点 oldFiber
    if (oldFiber && !sameType) {
      // delete the oldFiber's node
      // 删：删除节点时，没有新的 fiber，所以向旧的 fiber 添加 effect 标签。
      oldFiber.effectTag = 'DELETION';
      // 将需要删除的旧 Fiber 节点添加到 deletions 数组，后续统一处理（commit阶段处理）
      deletions.push(oldFiber);
    }

    // 若旧 Fiber 节点存在，移动到下一个兄弟节点继续处理
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // 将新创建或复用的 Fiber 节点添加到 Fiber 树中，建立节点间的关系
    // 将其添加到 fiber 树中，建立fiber节点之间的关系（父子、兄弟）
    if (index === 0) {
      // 若当前是第一个子 ReactElement，也就是第一个子fiber
      // 父子关系：将这个新的fiber设置为父fiber的第一个子fiber
      wipFiber.child = newFiber;
    } else {
      // 若不是第一个子节点，设置为上一个兄弟节点的兄弟节点
      // 兄弟关系：将其设置为前一个兄弟节点的兄弟节点
      prevSibling.sibling = newFiber;
    }

    // 更新上一个兄弟节点为当前处理的新 Fiber 节点
    prevSibling = newFiber;
    // 索引加 1，继续处理下一个新子元素
    index++;
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
