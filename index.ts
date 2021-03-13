type uninstaller = () => void;
type methodWrapperFactory<T extends Function> = (next: T) => T

export function around<T extends Function>(obj:Object, factories: {[key: string]: methodWrapperFactory<T>}): uninstaller {
    const removers = Object.keys(factories).map(key => around1(obj, key, factories[key]));
    return removers.length === 1 ? removers[0] : function () { removers.forEach(r => r()); };
}

function around1<T extends Function>(obj: Object, method: string, createWrapper: methodWrapperFactory<T>): uninstaller {
    const original = obj[method], hadOwn = obj.hasOwnProperty(method);
    let current = createWrapper(original);

    // Let our wrapper inherit static props from the wrapping method,
    // and the wrapping method, props from the original method
    if (original) Object.setPrototypeOf(current, original);
    Object.setPrototypeOf(wrapper, current);
    obj[method] = wrapper;

    // Return a callback to allow safe removal
    return remove;

    function wrapper(...args) {
        // If we have been deactivated and are no longer wrapped, remove ourselves
        if (current === original && obj[method] === wrapper) remove();
        return current.apply(this, args);
    }

    function remove() {
        // If no other patches, just do a direct removal
        if (obj[method] === wrapper) {
            if (hadOwn) obj[method] = original; else delete obj[method];
        }
        if (current === original) return;
        // Else pass future calls through, and remove wrapper from the prototype chain
        current = original;
        Object.setPrototypeOf(wrapper, original || Function);
    }
}

export function after(promise: Promise<any>, cb: () => void): Promise<void> {
    return promise.then(cb, cb);
}

export function serialize(asyncFunction: Function) {
    let lastRun = Promise.resolve();

    function wrapper(...args) {
        return lastRun = new Promise((res, rej) => {
            after(lastRun, () => {
                asyncFunction.apply(this, args).then(res, rej)
            });
        });
    }
    wrapper.after = function () {
        return lastRun = new Promise((res, rej) => { after(lastRun, res as ()=>void); });
    }
    return wrapper;
}
