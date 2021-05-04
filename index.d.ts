declare type uninstaller = () => void;
declare type anyFunction = (...args: any[]) => any;
declare type methodWrapperFactory<T extends Function> = (next: T) => T;
export declare function around<O extends Record<string, unknown>, T extends anyFunction>(obj: O, factories: {
    [key in keyof O | string]: methodWrapperFactory<T>;
}): uninstaller;
export declare function after(promise: Promise<any>, cb: () => void): Promise<void>;
export declare function serialize(asyncFunction: Function): {
    (...args: any[]): Promise<void>;
    after(): Promise<void>;
};
export {};
