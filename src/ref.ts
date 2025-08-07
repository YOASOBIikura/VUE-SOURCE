import {reactive, toRaw} from "./reactive";
import {hasChanged, isArray, isObject} from "./utils";
import {track, trigger} from "./effect";
import {TrackOpTypes, TriggerOpTypes} from "./operations";

export interface Ref<T = any> {
    value: T
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
    return Boolean(r && r.__v_isRef === true)
}

export function ref(value?: any): any {
    return createRef(value)
}

export function shallowRef(value?: any): any {
    return createRef(value, true)
}

export  function createRef(rawValue: unknown, shallow = false){

    if (isRef(rawValue)){
        return rawValue
    }

    // 其他情况 通过RefImpl来进行实现
    return new RefImpl(rawValue, shallow)
}

const convert = <T extends unknown>(value: T): T => {
    return isObject(value) ? reactive(value) : value
}

class RefImpl<T>{
    private  _value: T
    public __v_isRef = true

    constructor(private rawValue: T, private readonly shallow: boolean) {
        this._value = shallow ? rawValue : convert(rawValue)
    }

    get value(){
        track(toRaw(this), TrackOpTypes.GET, 'value')
        return this._value
    }

    set value(newValue: T){
        if (hasChanged(toRaw(newValue), this.rawValue)){
            this.rawValue = newValue
            this._value = this.shallow ? newValue : convert(newValue)
            trigger(toRaw(this), TriggerOpTypes.SET, 'value', newValue)
        }
    }
}

export function toRef<T extends object, K extends keyof T>(object: T, key: K): Ref<T[K]>{
    return isRef(object[key]) ? object[key] as any : new ObjectRefImpl(object, key)
}

class ObjectRefImpl<T extends object, K extends keyof T>{
    public readonly __v_isRef = true
    constructor(private _object: T, private _key: K) {}

    get value(){
        return this._object[this._key]
    }
    set value(newValue: any){
        this._object[this._key] = newValue
    }
}

export type ToRefs<T = any> = {[K in keyof T]: Ref<T[K]>}

export function toRefs<T extends object>(object: T): ToRefs<T>{
    const ret: any = isArray(object) ? new Array(object.length) : {}
    for (const key in object){
        ret[key] = toRef(object, key)
    }
    return ret
}

export type shallowUnwrapRef<T> = {
    [K in keyof T]: T[K] extends Ref<infer V> ? V : T[K]
}

export function unref<T>(ref: T): T extends Ref<infer V> ? V : T {
    return isRef(ref) ? ref.value as any : ref as any
}

export const shallowUnwrapHandlers: ProxyHandler<any> = {
    get(target, key, receiver){
        unref(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver){
        const oldValue = target[key]
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value
            return true
        } else {
            return Reflect.set(target, key, value, receiver)
        }
    }
}

export function proxyRefs<T extends object>(
    objectWithRefs: T
): shallowUnwrapRef<T> {
    return new Proxy(objectWithRefs, shallowUnwrapHandlers)
}


