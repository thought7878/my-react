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

  // 递归地对每个子元素做同样的处理
  element.props.children.forEach((child) => render(child, dom));

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
