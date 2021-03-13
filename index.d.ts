declare type unsubscribe = () => void;
export declare function around<T extends Function>(obj: Object, method: string, createWrapper: (next: T) => T): unsubscribe;
export declare function after(promise: Promise<any>, cb: () => void): Promise<void>;
export declare function serialize(asyncFunction: Function): {
    (...args: any[]): Promise<void>;
    after(): Promise<void>;
};
export {};
