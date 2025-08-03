import {track, trigger} from "./effect.js";
import {isObject, hasChanged} from "./utils.js";
import {reactive, ReactiveFlags} from "./reactive.js";
import {TrackOpTypes, TriggerOpTypes} from "./operations.js";

export const ITERATE_KEY = Symbol('iterate');

function get(target: object, key: string | symbol, receiver: object):any {
    if (key === ReactiveFlags.IS_REACTIVE) {
        return true
    }
    // 依赖搜集
    track(target, TrackOpTypes.GET, key);

    const result = Reflect.get(target, key, receiver);

    // 如果属性石对象就再次进行递归代理
    if (isObject(result)){
        return reactive(result)
    }

    return result
}

function  set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown, receiver: object):boolean {
    // 触发更新
    // 判断是ADD还是SET，而且还要判断设置的值是否一样
    const hadKey = target.hasOwnProperty(key)
    // target隐式any类型
    let oldValue = target[key]
    if (!hadKey){
        trigger(target, TriggerOpTypes.ADD, key);
    }else if (hasChanged(value, oldValue)){
        trigger(target, TriggerOpTypes.SET, key);
    }

    const result = Reflect.set(target, key, value, receiver);
    return result
}

function has(target:object, key: string| symbol):boolean {
    // 依赖搜集
    track(target, TrackOpTypes.HAS, key)
    const result = Reflect.has(target, key)
    return result
}

function ownKeys(target: object): (string | symbol)[] {
    // 依赖搜集
    track(target, TrackOpTypes.ITERATOR, ITERATE_KEY)
    return Reflect.ownKeys(target)
}

function deleteProperty(target: object, key: string | symbol):boolean {
    // 删除也判断是否属性存在
    const hadKey = target.hasOwnProperty(key)
    // 实际删除的结果
    const result = Reflect.deleteProperty(target, key)
    // 如果属性存在并且删除成功
    if (hadKey && result) {
        trigger(target, TriggerOpTypes.DELETE, key)
    }
    return result
}

export const mutableHandlers: ProxyHandler<object> = {
    get,
    set,
    has,
    ownKeys,
    deleteProperty
}

