type uninstaller = () => void;
type methodWrapperFactory<T extends Function> = (next: T) => T

export function around<O extends Record<string, any>>(
    obj:O, factories: Partial<{ [key in keyof O]: methodWrapperFactory<O[key]> }>
): uninstaller {
    const removers = Object.keys(factories).map(key => around1(obj, key, factories[key]));
    return removers.length === 1 ? removers[0] : function () { removers.forEach(r => r()); };
}

function around1<O extends Record<string, any>>(
    obj: O, method: keyof O, createWrapper: methodWrapperFactory<O[keyof O]>
): uninstaller {
    const original = obj[method], hadOwn = obj.hasOwnProperty(method);
    let current = createWrapper(original);

    // Let our wrapper inherit static props from the wrapping method,
    // and the wrapping method, props from the original method
    if (original) Object.setPrototypeOf(current, original);
    Object.setPrototypeOf(wrapper, current);
    obj[method] = wrapper as O[keyof O];

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

export function dedupe<T extends Function>(key: string|symbol, oldFn: T, newFn: T): T {
    check[key] = key;
    return check as unknown as T;
    function check(...args) {
        // Skip running the patch if another version exists "upstream" in the call chain
        return (oldFn[key]===key ? oldFn : newFn).apply(this, args);
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
