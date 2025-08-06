import {enableTracking, pauseTracking, track, trigger} from "./effect.js";
import {isObject, hasChanged, isArray, isSymbol, extend, isIntegerKey, hasOwn} from "./utils.js";
import {reactive, ReactiveFlags, type Target, reactiveMap, readonlyMap, toRaw, readonly} from "./reactive.js";
import {TrackOpTypes, TriggerOpTypes} from "./operations.js";

export const ITERATE_KEY = Symbol('iterate');

const builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
        .filter(isSymbol)
)

// 通过对象存储改动之后的数组方法，进行统一管理
const arrayInstrumentations:Record<string, Function> = {};

;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    // 获取原始方法
    const method = Array.prototype[key] as any;
    
    arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) {

        // 转换为原始数组对象
        const arr = toRaw(this)

        // 遍历数组的每个索引，通过track函数对数组的索引进行依赖收集
        for (let i = 0, l = arr.length; i < l; i++) {
            track(arr, TrackOpTypes.GET, i + '')
        }

        // 直接在原始方法中查找
        const  res = method.apply(arr, args)
        if (res === -1){
            //如果没找到 参数也有可能是响应式
            return method.apply(arr, args.map(toRaw))
        }else {
            return  res
        }
    }
})

;(['push', 'pop', 'shift', 'unshift', 'splice'] as  const).forEach(key => {
    // 获取原始方法
    const method = Array.prototype[key] as any

    arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) {
        pauseTracking()
        const res = method.apply(this, args)
        enableTracking()
        return res
    }
})

function createGetter(isReadonly = false, isShallow = false) {
    return function get(target: Target, key: string | symbol, receiver: object):any {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return true
        }else if (key === ReactiveFlags.IS_READONLY){
            return isReadonly
        } else if (key === ReactiveFlags.RAW &&
            receiver === (isReadonly? readonlyMap : reactiveMap).get(target) // 确保原始对象的访问是代理发起的
        ){
            return target
        }

        const targetIsArray = isArray(target)
        if (targetIsArray && arrayInstrumentations.hasOwnProperty(key)){
            return Reflect.get(arrayInstrumentations, key, receiver)
        }

        const result = Reflect.get(target, key, receiver);

        // 一些隐式依赖和属性需要排除依赖收集
        const keyIsSymbol = isSymbol(key)
        if ( keyIsSymbol ? builtInSymbols.has(key as symbol) : key === '__proto__'){
            return result
        }

        // 依赖搜集
        // 如果是只读情况不需要进行依赖收集
        if(!isReadonly){
            track(target, TrackOpTypes.GET, key);
        }

        // 如果只是浅层代理则直接返回结果
        if (isShallow){
            return result
        }

        // 如果属性是对象就再次进行递归代理
        if (isObject(result)){
            return isReadonly? readonly(result) : reactive(result)
        }

        return result
    }
}

const get = createGetter()
const readonlyGet = createGetter(true)
const shallowGet = createGetter(false, true)
const shallowReadonlyGet = createGetter(true, true)

function createSetter(shallow = false){
    return function  set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown, receiver: object):boolean {

        let oldValue = target[key]

        // 判断动作是ADD or DELETE
        // 如果目标是数组，并且key是一个有效的数组索引，需要判断key是否小于数组的长度
        // 如果是非数组对象，我们就判断是否有这个key
        const hadKey = isArray(target) && isIntegerKey(key) ?
            Number(key) < target.length :
            hasOwn(target, key)

        const result = Reflect.set(target, key, value, receiver)

        if (target === toRaw(receiver)){
            if (!hadKey) {
                // 添加
                trigger(target, TriggerOpTypes.ADD, key, value)
            }else if (hasChanged(value, oldValue)){
                // 修改
                trigger(target, TriggerOpTypes.SET, key, value, oldValue)
            }
        }

        return result
    }
}

const set = createSetter()
const shallowSet = createSetter(true)

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

export const readonlyHandlers: ProxyHandler<object> = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target)
        return true
    },
    deleteProperty(target: object, p: string | symbol): boolean {
        console.warn(`Delete operation on key "${String(p)}" failed: target is readonly.`, target)
        return false
    }
}

export const shallowReactiveHandlers: ProxyHandler<object> = extend({}, mutableHandlers, {
    get: shallowGet,
    set: shallowSet
})
