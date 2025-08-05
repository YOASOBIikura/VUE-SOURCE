

export const isObject = (val: any):val is Record<any, any> => val !== null && typeof val === 'object';

export  const isString = (val: any):val is string => typeof val === 'string';

export  const isFunction = (val: any):val is Function => typeof val === 'function';

export const isArray = Array.isArray;

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch);
}

// 通过Object.is判断两个值是否相等
export const hasChanged = (val: any, oldVal: any):boolean => !Object.is(val, oldVal);

export const isSymbol = (val: unknown):val is symbol => typeof val === 'symbol';

export const extend = Object.assign;
