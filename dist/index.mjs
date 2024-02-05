function around(obj, factories) {
  const removers = Object.keys(factories).map((key) => around1(obj, key, factories[key]));
  return removers.length === 1 ? removers[0] : function() {
    removers.forEach((r) => r());
  };
}
function around1(obj, method, createWrapper) {
  const inherited = obj[method], hadOwn = obj.hasOwnProperty(method), original = hadOwn ? inherited : function() {
    return Object.getPrototypeOf(obj)[method].apply(this, arguments);
  };
  let current = createWrapper(original);
  if (inherited)
    Object.setPrototypeOf(current, inherited);
  Object.setPrototypeOf(wrapper, current);
  obj[method] = wrapper;
  return remove;
  function wrapper(...args) {
    if (current === original && obj[method] === wrapper)
      remove();
    return current.apply(this, args);
  }
  function remove() {
    if (obj[method] === wrapper) {
      if (hadOwn)
        obj[method] = original;
      else
        delete obj[method];
    }
    if (current === original)
      return;
    current = original;
    Object.setPrototypeOf(wrapper, inherited || Function);
  }
}
function dedupe(key, oldFn, newFn) {
  check[key] = key;
  return check;
  function check(...args) {
    return (oldFn[key] === key ? oldFn : newFn).apply(this, args);
  }
}
function after(promise, cb) {
  return promise.then(cb, cb);
}
function serialize(asyncFunction) {
  let lastRun = Promise.resolve();
  function wrapper(...args) {
    return lastRun = new Promise((res, rej) => {
      after(lastRun, () => {
        asyncFunction.apply(this, args).then(res, rej);
      });
    });
  }
  wrapper.after = function() {
    return lastRun = new Promise((res, rej) => {
      after(lastRun, res);
    });
  };
  return wrapper;
}

export { after, around, dedupe, serialize };
