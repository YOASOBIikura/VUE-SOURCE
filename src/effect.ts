import {TrackOpTypes, TriggerOpTypes} from "./operations.js";
import {isArray, isIntegerKey} from "./utils";

type Dep = Set<ReactiveEffect>

// 副作用函数类型
export interface ReactiveEffect<T = any>{
    (): T
    deps: Array<Dep>
    options: ReactiveEffectOptions
    _isEffect: true
    raw: () => T
}

export const ITERATE_KEY = Symbol("")

// 副作用可调度的选项
export interface ReactiveEffectOptions {
    // 懒加载开关
    lazy?: boolean;
    // 调度器函数
    scheduler?: (effect: ReactiveEffect) => void;
    onStop?: () => void;
}

export function isEffect(fn: any): fn is ReactiveEffect {
    return fn && fn._isEffect
}

// 当前激活的副作用函数 永远指向effectStack的栈顶
let activeEffect: ReactiveEffect | undefined
// 嵌套副作用函数栈
let effectStack: ReactiveEffect[] = []

// 依赖收集时 每个属性键对应一个依赖集合的数据结构
type KeyToDepMap = Map<any, Dep>;
let targetMap = new WeakMap<any, KeyToDepMap>()

let shouldTrack = true

export function pauseTracking() {
    shouldTrack = false
}

export function enableTracking() {
    shouldTrack = true
}

export function track(target: object, type: TrackOpTypes, key: unknown) {
    // 暂停依赖收集开关
    if (!shouldTrack || activeEffect === undefined){
        return
    }

    // 1. 根据target从targetMap中获取对应的Map, 保存的类型是key -> Dep的键值对
    let depsMap = targetMap.get(target)
    // 如果不存在则创建
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }

    // 2. 根据key从depsMap中获取对应的Set, 保存的类型是Dep
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }

    // 3. 将当前激活的副作用函数添加到依赖集合中
    dep.add(activeEffect)

    // 将上面的deps集合挂载到activeEffect.deps中
    activeEffect.deps.push(dep)
}

export function trigger(
    target: object,
    type: TriggerOpTypes,
    key: unknown,
    newValue?: unknown,
    oldValue?: unknown
    ) {

    // 根据target从targetMap中获取对应的Map
    const depsMap = targetMap.get(target)

    // 如果不存在则返回
    if (!depsMap) {
        return
    }

    // 根据key从depsMap中获取对应的deps ==> deps
    let deps = depsMap.get(key)

    // 依次执行depsMap中的副作用函数
    // 为了避免无限循环，这里可以新建一个Set对象
    const effects = new Set<ReactiveEffect>()

    const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
        if (effectsToAdd){
            effectsToAdd.forEach((effectFn) => {
                if (effectFn !== activeEffect) {
                    effects.add(effectFn)
                }
            })
        }
    }

    if (key === 'length' && isArray(target)){
        depsMap.forEach((deps, key) => {
            if (key === 'length' || key >= (newValue as number)){ // 改变数组length属性，需要触发更新
                add(deps)
            }
        })
    }else {
        if (key !== undefined){
            add(depsMap.get(key))
        }

        // ADD, DELETE操作会影响for...in循环迭代，也会隐式的影响数组的长度，这些都需要触发更新
        switch (type) {
            case TriggerOpTypes.ADD:
                // 如果不是数组，说明是需要迭代的对象
                if (!isArray(target)){
                    add(depsMap.get(ITERATE_KEY))
                }else if (isIntegerKey(key)){
                    add(depsMap.get('length'))
                }
                break
            case TriggerOpTypes.DELETE:
                // 如果不是数组，说明是需要迭代的对象
                if (!isArray(target)){
                    add(depsMap.get(ITERATE_KEY))
                }
                break
        }
    }



    effects.forEach((effect) => {
        // 如果调度器存在则执行调度器
        if (effect.options.scheduler){
            effect.options.scheduler(effect)
        } else {
            effect()
        }
    })
}

export function createReactiveEffect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions
): ReactiveEffect<T> {
    const effect: ReactiveEffect = function reactiveEffect(): unknown {

        if (!effectStack.includes(effect)){
            // 先进行清理
            cleanup(effect)

            try {
                // 当effect执行时，将当前副作用函数设置为activeEffect
                activeEffect = effect

                // 在调用副作用函数之前，将其亚茹effectStack栈中
                effectStack.push(effect)

                // 执行副作用函数，结果保存在res中
                const res = fn()

                // 返回结果
                return res

            } finally {
                // 在调用副作用函数之后，将其从effectStack栈中弹出
                effectStack.pop()

                // activeEffect始终指向当前effectStack栈顶的副作用函数
                activeEffect = effectStack[effectStack.length - 1]
            }

        }

    } as ReactiveEffect;

    // 将option挂载到effectFn上
    effect.options = options

    // 在effectFn函数上又挂载deps数组，目的是在依赖收集时可以临时记录依赖关系
    // 在effectFn函数上挂载，其实相当于挂载到activeEffect.deps
    effect.deps = []
    // 如果发生effect发生了嵌套，直接将内部的fn函数作为effect.raw
    effect._isEffect = true
    effect.raw = fn

    return effect
}

export function effect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions = {}
): ReactiveEffect<T>{
    // 如果原始方法本身就是一个effect则返回其原始方法 防止effect相互嵌套
    if (isEffect(fn)){
        fn = fn.raw
    }

    const effect = createReactiveEffect(fn, options)

    // 只有非lazy的情况，才会立即执行副作用函数
    if (!options.lazy){
        effect()
    }

    // 将副作用函数作为返回值返回
    return effect
}

function cleanup(effect: ReactiveEffect){
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i]?.delete(effect);
        }
        deps.length = 0;
    }
}

