
import {reactive} from "./reactive.js";

const arr1 = [1,2,3,4,5,6]
const state1 = reactive(arr1)
function fn() {
    state1.push(7)
}

fn()




