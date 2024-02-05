type uninstaller = () => void;
type methodWrapperFactory<T extends Function> = (next: T) => T;
declare function around<O extends Record<string, any>>(obj: O, factories: Partial<{
    [key in keyof O]: methodWrapperFactory<O[key]>;
}>): uninstaller;
declare function dedupe<T extends Function>(key: string | symbol, oldFn: T, newFn: T): T;
declare function after(promise: Promise<any>, cb: () => void): Promise<void>;
declare function serialize(asyncFunction: Function): {
    (...args: any[]): Promise<void>;
    after(): Promise<void>;
};

export { after, around, dedupe, serialize };
