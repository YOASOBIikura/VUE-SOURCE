import {trigger, track } from "./effect.js";
import {isObject} from "./utils.js";
import {mutableHandlers, readonlyHandlers, shallowReactiveHandlers} from "./baseHandlers.js";

export const targetMap = new WeakMap<Target, any>();

// 为了区分普通代理reactive和readonly，我们分开进行存储
export const reactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();

function createReactiveObject(
    target: Target,
    isReadonly: boolean,
    baseHandler: ProxyHandler<any>
) {
    // target不是对象则直接返回
    if(!isObject(target)){
        return target
    }

    // 判断是否是只读对象
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existingProxy = proxyMap.get(target);

    // target如果是代理了的对象则直接返回之前的代理对象
    if (existingProxy) {
        return existingProxy
    }

    // 判断是否是响应式对象
    if(target[ReactiveFlags.RAW] && target[ReactiveFlags.IS_REACTIVE]) {
        return target
    }

    const proxy = new Proxy(target, baseHandler)

    proxyMap.set(target, proxy);

    return proxy;
}


export function reactive<T extends object>(target: T): T;
export function reactive(target: Target) {

    if (target && (target as Target)[ReactiveFlags.IS_READONLY]){
        return target
    }

    return createReactiveObject(target, false, mutableHandlers)
}

type DeepReadonly<T extends Record<string, any>> =
    T extends any ?
        {
            readonly [K in keyof T]: T[K] extends Record<string, any> ? DeepReadonly<T[K]> : T[K]
        }
        : never

export function readonly<T extends object>(target: T): T;
export function readonly<T extends Target>(target: T): DeepReadonly<T>{
    return createReactiveObject(target, true, readonlyHandlers)
}

export function toRaw<T>(observed: T): T {
    return (observed as Target)[ReactiveFlags.RAW] || observed
}

export function shallowReactive<T extends Target>(target: T): T {
    return createReactiveObject(target, false, shallowReactiveHandlers)
}

export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly',
    RAW = '__v_raw',
    SKIP = '__v_skip'
}

export interface Target {
    [ReactiveFlags.IS_REACTIVE]: boolean;
    [ReactiveFlags.IS_READONLY]: boolean;
    [ReactiveFlags.RAW]: any;
    [ReactiveFlags.SKIP]: boolean;
}
