import {around, serialize, after, dedupe} from "./index.ts";
import mockdown from "mockdown";
import assert from "assert";

function null_wrapper(f) { return function(...args) {return f(...args);} }

describe("around()", function(){
    describe("returns a remover that", function(){
        it("stops calls to the wrapper", function(){
            let call_count = 0;
            const obj = {thing(){}};
            const remove1 = around(obj, {thing: f => function(){call_count+=1; return f();}})
            const remove2 = around(obj, {thing: null_wrapper})
            obj.thing(); assert(call_count==1);
            remove1();
            obj.thing(); assert(call_count==1);
        });
        it("restores the previous method if safe", function(){
            const obj = {thing(){}};
            const original = obj.thing;
            const remove = around(obj, {thing: null_wrapper});
            remove();
            assert(obj.thing === original);
        });
        it("deletes the property if it was inherited", function(){
            const obj = {};
            const remove = around(obj, {thing: null_wrapper});
            remove();
            assert(obj.thing === undefined);
        });
        it("removes the wrapper from the prototype chain", function(){
            const obj = {thing(){}};
            const remove1 = around(obj, {thing: f => {
                wrapper.thingy = 42;
                return wrapper;
                function wrapper(){ return f(); }
            }});
            const remove2 = around(obj, {thing: null_wrapper})
            assert(obj.thing.thingy===42);
            remove1();
            assert(obj.thing.thingy===undefined);
        })
    });
    describe("installs a wrapper that", function(){
        it("restores the previous method if it was removed", function(){
            const obj = {thing(){}};
            const original = obj.thing;
            const remove1 = around(obj, {thing: null_wrapper});
            const remove2 = around(obj, {thing: null_wrapper});
            remove1();  // remove inner wrapper first
            remove2();  // then outer, so inner wrapper is still there
            obj.thing(); // it should remove itself during the call
            assert(obj.thing === original);
        });
        it("inherits from the previous definition", function(){
            const obj = {thing(){}};
            const original = obj.thing;
            around(obj, {thing: null_wrapper});
            obj.thing();
            original.x = "y"
            assert(obj.thing.x === "y")
        });
        it("allows prototype and instance methods to be patched separately", function(){
            const obj = {thing(){ return 99; }}, child = Object.create(obj);
            const original = obj.thing;
            const r1 = around(child, {thing: null_wrapper});
            const r2 = around(obj, {thing(old) {
                return function() {
                    return 42;
                }
            }});
            assert(obj.thing() === 42);
            r2();
            assert (obj.thing === original);
            assert(obj.thing() === 99);
            r1();
            assert (child.thing === original);
            assert(!child.hasOwnProperty("thing"));
        })
    });
});

mockdown.testFiles(['README.md'], describe, it, {
    globals: { around, serialize, after, dedupe },
});

