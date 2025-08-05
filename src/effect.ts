import {TrackOpTypes, TriggerOpTypes} from "./operations.js";

let shouldTrack = true

export function pauseTracking() {
    shouldTrack = false
}

export function enableTracking() {
    shouldTrack = true
}

export function track(target: object, type: TrackOpTypes, key: unknown) {
    if (!shouldTrack){
        return
    }
    console.log(`track: ${type} ${String(key)}`)
}

export function trigger(target: object, type: TriggerOpTypes, key: unknown) {
    console.log(`trigger: ${type} ${String(key)}`)
}
