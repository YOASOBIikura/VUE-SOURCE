import {TrackOpTypes, TriggerOpTypes} from "./operations.js";

export function track(target: object, type: TrackOpTypes, key: unknown) {
    console.log(`track: ${type} ${String(key)}`)
}

export function trigger(target: object, type: TriggerOpTypes, key: unknown) {
    console.log(`trigger: ${type} ${String(key)}`)
}
