declare type uninstaller = () => void;
declare type methodWrapperFactory<T extends Function> = (next: T) => T;
export declare function around<T extends Function>(obj: Object, factories: {
    [key: string]: methodWrapperFactory<T>;
}): uninstaller;
export declare function after(promise: Promise<any>, cb: () => void): Promise<void>;
export declare function serialize(asyncFunction: Function): {
    (...args: any[]): Promise<void>;
    after(): Promise<void>;
};
export {};
