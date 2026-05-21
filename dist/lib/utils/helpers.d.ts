/**
 * Helpers - Utility functions for database operations
 */
export declare function isFunction(value: any): value is Function;
export declare function isObject(value: any): value is object;
export declare function isArray(value: any): value is any[];
export declare function isEmpty(value: any): boolean;
export declare function clone<T>(obj: T): T;
export declare function merge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T;
export declare function flatten<T>(arr: (T | T[])[]): T[];
export declare function unique<T>(arr: T[]): T[];
export declare function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K>;
export declare function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K>;
export declare function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void;
//# sourceMappingURL=helpers.d.ts.map
