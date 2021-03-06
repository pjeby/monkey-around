declare type uninstaller = () => void;
declare type methodWrapperFactory<T extends Function> = (next: T) => T;
export declare function around<O extends Record<string, any>>(obj: O, factories: Partial<{
    [key in keyof O]: methodWrapperFactory<O[key]>;
}>): uninstaller;
export declare function after(promise: Promise<any>, cb: () => void): Promise<void>;
export declare function serialize(asyncFunction: Function): {
    (...args: any[]): Promise<void>;
    after(): Promise<void>;
};
export {};
