## Pluggable, removable monkeypatching with `monkey-around`

Ever needed to monkeypatch a method someplace?  It's not hard to do if you're the only one doing it, or if you can leave the patch in place for the life of your program.  But it's not quite as easy if multiple independently-written bits of code need to patch the same method(s), and might need to uninstall their patches in arbitrary order.

That's what `monkey-around` is for.  Let's say you have an object that looks like this:

```js
// Unwrapped object
var anObject = {
    someMethod(...args) {
        console.log("someMethod", args);
        return 42;
    }
};

anObject.someMethod(27);
```
> ```
> someMethod [ 27 ]
> ```

Then you can import the `around` function:

<!--mockdown: ++ignore -->

```js
import {around} from 'monkey-around';
```

And wrap one or more methods like so:

```js
// Add a wrapper
var uninstall1 = around(anObject, {
    someMethod(oldMethod) {
        return function(...args) {
            console.log("wrapper 1 before someMethod", args);
            const result = oldMethod && oldMethod.apply(this, args);
            console.log("wrapper 1 after someMethod", result);
            return result;
        }
    }
});

anObject.someMethod(23);
```
> ```
> wrapper 1 before someMethod [ 23 ]
> someMethod [ 23 ]
> wrapper 1 after someMethod 42
> ```

The `around()` function takes an object, and an object whose own-methods are factory functions that receive the old method (which may be `undefined`) and return a replacement method.  Each old method on the original object is then replaced with a wrapper that delegates to the newly-created method.  The `around()` function then returns an "uninstaller" -- a function that can be called to disable or remove all of the wrappers it created.

The wrapper functions are set up to inherit properties from the newly-created method, which in turn are configured to inherit from the original method(s), so that any properties or methods attached to them will also be visible on the wrappers (and any wrappers added around those wrappers).

Multiple wrappers can be applied to the same method of the same object:

```js
// Add a second wrapper
var uninstall2 = around(anObject, {
    someMethod(oldMethod) {
        return function(...args) {
            console.log("wrapper 2 before someMethod", args);
            const result = oldMethod && oldMethod.apply(this, args);
            console.log("wrapper 2 after someMethod", result);
            return result;
        }
    }
});

anObject.someMethod(); // runs both wrappers
```
> ```
> wrapper 2 before someMethod []
> wrapper 1 before someMethod []
> someMethod []
> wrapper 1 after someMethod 42
> wrapper 2 after someMethod 42
> ```

And the uninstallers can be called in any order:

```js
// Uninstall wrappers
uninstall1(); // remove the first wrapper
anObject.someMethod(); // runs only the second wrapper
uninstall2(); // remove the second wrapper
anObject.someMethod(); // runs only the original method
```
> ```
> wrapper 2 before someMethod []
> someMethod []
> wrapper 2 after someMethod 42
> someMethod []
> ```

However, when uninstallation is requested, the wrapper for each method is removed...  unless another wrapper has since been added for that method, in which case the wrapper will delegate to the original method instead of the new version.  (Until such time as it detects it is once again safe to remove itself entirely.)

### Co-operative/Shared Patches

<!--mockdown: ++ignore -->

```js
import {dedupe} from 'monkey-around';
```

When multiple clients may require the same patch of a target library or platform (as is often the case with [Obsidian](https://obsidian.md/) plugins), it may be important to perform the new behavior only once, no matter how many clients are currently active (e.g. to avoid triggering duplicate events).  For this purpose,  `monkey-around` offers a `dedupe()` function, that takes a string or symbol as a "key" to ensure that one (and *only* one) version of the patch is applied.  The de-duplication is done at runtime rather than patch time, so that patches can be added or removed at any time and still only one version of the patch will run for a given invocation of the wrapped method.

To use it, you should choose a globally unique string (or `Symbol.for()` that string) that will stand for the functionality provided by the patch.  Then, return `dedupe(key, oldMethod, newMethod)` from your around wrapper method, like this:

```js
// Add a wrapper
var demo_key = "demo-wrapper@github.com/pjeby/monkey-around";
var uninstall1 = around(anObject, {
    someMethod(oldMethod) {
        return dedupe(demo_key, oldMethod, function(...args) {
            console.log("wrapper 1 before someMethod", args);
            const result = oldMethod && oldMethod.apply(this, args);
            console.log("wrapper 1 after someMethod", result);
            return result;
        });
    }
});

anObject.someMethod(23);
```

> ```
> wrapper 1 before someMethod [ 23 ]
> someMethod [ 23 ]
> wrapper 1 after someMethod 42
> ```

As you can see, the first wrapper applied works the same as any other patch.  The second, however, does not:

```js
// Add a second wrapper
var uninstall2 = around(anObject, {
    someMethod(oldMethod) {
        return dedupe(demo_key, oldMethod, function(...args) {
            console.log("wrapper 2 before someMethod", args);
            const result = oldMethod && oldMethod.apply(this, args);
            console.log("wrapper 2 after someMethod", result);
            return result;
        });
    }
});

anObject.someMethod(); // Second wrapper won't be called while first is in place!
```
> ```
> wrapper 1 before someMethod []
> someMethod []
> wrapper 1 after someMethod 42
> ```

But if the first wrapper is removed, then the second wrapper will run:

```js
uninstall1();
anObject.someMethod(99); //
```
> ```
> wrapper 2 before someMethod [ 99 ]
> someMethod [ 99 ]
> wrapper 2 after someMethod 42
> ```

Thus, no matter how many independent clients/plugins/etc. apply the "same" patch, only the oldest currently-active such patch will be run: all others will be bypassed in the call chain, so long as only `monkey-around` is used to do the patching.

### Serializing Invocation of Async Methods

<!--mockdown: ++ignore -->

```js
import {serialize} from 'monkey-around';
```

Async methods that manipulate the state of an object can sometimes be subject to race conditions if the method can be called (e.g. from an event handler) while another invocation is already occurring.  In such cases, it can be desirable to defer the execution of a method until the promise from its previous invocation has settled.

For this purpose, `monkey-around` offers a `serialize()` function, that takes an async function and returns a new async function that only calls the old function after its most-recent invocation has settled.  You can thus use it as a method factory argument to `around()`, e.g. `around(anObject, {asyncMethod: serialize})`, to prevent re-entry of the method while an invocation is pending.

```js
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

const aService = {
    async method(msg) {
        console.log(`  before ${msg}`);
        await sleep(15);
        console.log(`  after ${msg}`);
    }
}

async function demo() {
    console.log("Without serialization:");
    aService.method("Without 1");
    await sleep(5);
    aService.method("Without 2");
    await sleep(20);

    around(aService, {method: serialize});
    console.log();

    console.log("With serialization:");
    aService.method("With 1");
    await sleep(5);
    aService.method("With 2");
    await sleep(35);

    console.log();
    console.log("Using .after():");
    aService.method("After 1");
    await aService.method.after();
    console.log("done");
}

wait(demo())
```

> ```
> Without serialization:
>   before Without 1
>   before Without 2
>   after Without 1
>   after Without 2
> 
> With serialization:
>   before With 1
>   after With 1
>   before With 2
>   after With 2
> 
> Using .after():
>   before After 1
>   after After 1
> done
> ```

The wrapped function returned by `serialize()` (and thus the wrapper(s) created by `around()`) will have an `after()` method that returns a promise that will resolve when there are no in-progress invocations of the wrapped function that were requested beofre `after()` was called.

(Note: if you patch a class prototype rather than an instance, this will make invocation of the method serialized across *all* instances of the class that share that method...  which may or may not be what you want!  If you want different instances to be able to run that method at the same time, you need to patch each instance instead of patching the prototype.  The `.after()` method is similarly either shared or not: if you patch the prototype, then `.after()` means "after the current invocation of this method on *any* instance", not "the current invocation on *this* instance".  So, most of the time, you probably want to serialize the instance methods, not prototype methods.)