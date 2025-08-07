import {isFunction, NOOP} from "./utils";
import {effect, type ReactiveEffect, track, trigger} from "./effect";
import {ReactiveFlags, toRaw} from "./reactive";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import type {Ref} from "./ref";

export type ComputedGetter<T> = (ctx?:any) => T
export type ComputedSetter<T> = (v: T) => void

export interface WriteableComputedOptions<T>{
    get: ComputedGetter<T>
    set: ComputedSetter<T>
}



export interface WritableComputedRef<T> extends Ref<T> { // 有一个可写的value
    readonly effect: ReactiveEffect<T>
}

export interface ComputedRef<T> extends WritableComputedRef<T> { //有一个不可写的value
    readonly value: T
}

export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>

export function computed<T>(options: WriteableComputedOptions<T>): WritableComputedRef<T>

export function computed<T>(
    getterOrOptions: ComputedGetter<T> | WriteableComputedOptions<T>
): any {
    let getter
    let setter

    if (isFunction(getterOrOptions)){
        getter = getterOrOptions
        setter = NOOP
    }else {
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }

    return new ComputedRefImpl(
        setter,
        getter,
        isFunction(getterOrOptions) || !getterOrOptions.set
    )
}

class ComputedRefImpl<T> {
    private _value!: T
    private _dirty = true
    public readonly effect: ReactiveEffect<T>
    public readonly [ReactiveFlags.IS_READONLY]!: boolean

    constructor(
        getter: ComputedGetter<T>,
        private readonly _setter: ComputedSetter<T>,
        isReadonly: boolean
    ){
        this._setter = _setter
        this.effect = effect(getter, {
            lazy: true,
            scheduler: () => {
                if (!this._dirty){
                    this._dirty = true
                    trigger(toRaw(this), TriggerOpTypes.SET, "value")
                }
            }
        })
        this[ReactiveFlags.IS_READONLY] = isReadonly
    }

    get value(){
        if (this._dirty){ // 由于一开始设置的时true所以肯定会执行一次副作用函数中的getter，然后返给this._value
            this._value = this.effect()
            this._dirty = false
        }
        track(toRaw(this), TrackOpTypes.GET, "value")

        return this._value
    }

    set value(newValue: T){
        this._setter(newValue)
    }

}




