import {trigger, track } from "./effect.js";
import {isObject} from "./utils.js";
import {mutableHandlers} from "./baseHandlers.js";

export const targetMap = new WeakMap<Target, any>();

export function reactive<T extends object>(target: T): T;

export function reactive(target: Target) {

    // target不是对象则直接返回
    if(!isObject(target)){
        return target
    }

    // target如果是代理了的对象则直接返回之前的代理对象
    if (targetMap.has(target)) {
        return targetMap.get(target)
    }

    // 判断是否是响应式对象
    if(target[ReactiveFlags.IS_REACTIVE]) {
        return target
    }

    const proxy = new Proxy(target, mutableHandlers)

    // 标记为响应式对象
    // @ts-ignore
    proxy[ReactiveFlags.IS_REACTIVE] = true;

    targetMap.set(target, proxy);

    return proxy;
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
