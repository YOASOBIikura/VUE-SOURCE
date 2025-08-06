
import {reactive} from "./reactive.js";
import {effect } from "./effect";

const layer1 = document.querySelector('#layer1')!
const layer2 = document.querySelector('#layer2')!
const btn1 = document.querySelector('#btn1')!
const btn2 = document.querySelector('#btn2')!

const arr = ['jack', 'lucy', 'lily']
const obj = {
    name: 'tom',
    age: 18,
    addr: {
        province: "成都",
        city: '四川'
    }
}

const stateArr = reactive(arr)
const stateObj = reactive(obj)

function fn() {
    console.log("----执行了函数fn------")
    layer1.innerHTML = stateArr[0] + '--' + stateArr[1] + '--' + stateArr[2]
    layer2.innerHTML = stateObj.name + '--' + stateObj.age + '--' + stateObj.addr.province + '--' + stateObj.addr.city
}

effect(fn)

btn1.addEventListener('click', () => {
    stateArr[0] = 'tom'
})

btn2.addEventListener('click', () => {
    stateObj.addr.province = '广东'
    stateObj.addr.city = '惠州'
})



