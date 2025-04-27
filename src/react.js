import { REACT_ELEMENT } from './constants.js';

/**
 * 创建一个 React 元素对象。
 *
 * @param {string|Function|Class} type - 元素的类型，可以是 HTML 标签名、函数组件或类组件。
 * @param {Object|null} config - 包含元素属性的配置对象，如 `key`、`ref` 以及其他自定义属性。
 * @param {...*} children - 元素的子节点，可以是零个或多个。
 * @returns {Object} 一个表示 React 元素的对象，包含类型、键、引用和属性等信息。
 */
function createElement(type, config, ...children) {
  // 初始化元素的 key，用于在列表渲染时标识元素，默认为 null
  let key = null;
  // 初始化元素的 ref，用于获取 DOM 节点或组件实例，默认为 null
  let ref = null;
  // 初始化元素的属性对象
  let props = {};

  // 处理 props
  if (config) {
    // 从 config 中提取 key，如果不存在则默认为 null
    key = config.key || null;
    // 从 config 中提取 ref，如果不存在则默认为 null
    ref = config.ref || null;
    // 从 config 对象中删除 key 属性，避免将其作为普通属性传递
    // 注意：这里存在错误，应该使用字符串 'key' 作为参数
    Reflect.deleteProperty(config, 'key');
    // 从 config 对象中删除 ref 属性，避免将其作为普通属性传递
    // 注意：这里存在错误，应该使用字符串 'ref' 作为参数
    Reflect.deleteProperty(config, 'ref');
    // 将处理后的 config 对象赋值给 props
    props = config;
  }

  // 处理 children
  if (children.length > 0) {
    if (children.length === 1) {
      // 如果只有一个子节点，直接将该子节点赋值给 props.children
      props.children = children[0];
    } else {
      // 如果有多个子节点，将子节点数组赋值给 props.children
      props.children = children;
    }
  }

  // 返回一个表示 React 元素的对象
  return {
    // 标识这是一个 React 元素
    $$typeof: REACT_ELEMENT,
    // 元素的类型
    type,
    // 元素的 key
    key,
    // 元素的 ref
    ref,
    // 元素的属性
    props,
  };
}

export default { createElement };
