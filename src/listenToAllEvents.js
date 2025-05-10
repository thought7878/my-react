import { HostComponent } from './constants.js';

const allEvents = ['click', 'mousedown', 'mouseup', 'dblclick'];

function accumulateListeners(reactEventName, fiber) {
  const listeners = [];
  let currentFiber = fiber;
  while (currentFiber) {
    if (currentFiber.tag === HostComponent && currentFiber.stateNode) {
      const listener = currentFiber.memoizedProps[reactEventName];
      if (listener) {
        listeners.push(listener);
      }
    }
    currentFiber = currentFiber.return;
  }

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

function dispatchEvent(event) {
  const { target, type } = event;
  const reactEventName = `on` + type[0].toUpperCase() + type.slice(1);
  // 收集函数
  const listeners = accumulateListeners(reactEventName, target.internalFiber);
  // 合成事件
  const syntheticEvent = new SyntheticEvent(event);
  // 执行
  for (const listener of listeners) {
    listener(syntheticEvent);
  }
}

export function listenToAllEvents(container) {
  for (const eventName of allEvents) {
    container.addEventListener(eventName, dispatchEvent, false);
  }
}
