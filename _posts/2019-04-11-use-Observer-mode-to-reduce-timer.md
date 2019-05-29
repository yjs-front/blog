---
layout: post
title:  "使用观察者模式减少JS定时器的数量并实现自校准"
date:   2019-04-11 
author: cairc
categories: develop base
tags: 设计模式 计时器
---

我们在实现功能的时候经常会用到前端倒计时，例如在抢购的场景，细心的同学肯定会发现将网页放置一段时间不进行任何操作，倒计时会越来越慢，明明已经过去60s了，然而前端倒计时只显示过了55s。且放置时间越久，误差也就越大。这样的倒计时便失去了其意义，用户体验也相对较差。 

通过相关资料的查找，发现SetInterval函数实现倒计时是不准确的。JavaScript的运行是单线程，setInterval的回调函数并不是时间到后立即执行，而是等系统计算资源空闲下来后才执行。而且假如这时候我们离开页面，浏览器可能会减缓甚至停止这个计时器，等页面重新被用户聚焦才会正常运行，这时候倒计时与正常数据就会相差一大截。这应该是浏览器为了保障性能，牺牲不活动页面的JavaScript线程导致的。并且这个问题在移动端浏览器更甚，计时器基本上是停止的。

> **setInterval函数计时是不可信的**，其计算时间周期可以做如下计算： 
setInterval每次周期时间 = 周期性时间 + 耗时任务时间占用“Interval线程”时间 + 页面挂起时间。 
扩展阅读：[一家之言：说说 JavaScript 计时器的工作原理](http://www.daqianduan.com/1112.html)

这就引入了我们的第一个问题，**"1.如何通过代码自校准计时器？"**。 
观察页面（如下图），我们发现这个页面有3个倒计时，由3个JS计时器分别控制。在前面说过计时器是不可信的，越多的计时器只会产生更多的耗时任务并拖累JavaScript主线程。由此引发第二个问题，**"2.在多个计时器完成相同功能时，如何减少计时器的数量?"**
![产品列表]({{site.baseurl}}/assets/img/setInterval.png) 

## 自校准计时器
**思路:** 每次执行时,setInterval回调函数中与上次回调函数的当前时间做差值，修正回调函数之间的延迟。

``` javascript
let _passTime = 0;//定时器总耗时
let _currentTime = Date.now();//初始时间

function notifyObject(){
    console.log(_passTime); // 已经流逝
}

window.setInterval(() =>{
    let _nowTime = Date.now();// 当前时间
    _passTime += _nowTime - _currentTime; // 与上次回调的差值
    _currentTime = _nowTime;// 重置初始时间为当前时间
    notifyObserver();//执行
}, 200);
```

## 使用观察者模式减少计时器的使用
**思路:** JavaScript线程永远只有一个计时器(观察者)。所有需要进行倒计时的产品订阅这个计时器（订阅者），计时器更新通知订阅者修改。

完整代码

``` javascript
//观察者类
let SuspendTimeNotify = function() {
    let _currentTime = Date.now();
    let _passTime = 0;
    let observers = [];
    let _interval = null;

    function attach(observer) {
        observers.push(observer);
    }

    function stop() {
        observers.length = 0;
        $interval.cancel(_interval);
    }

    function notifyObserver(target) {
        for (let i = 0; i < observers.length; i++) {
            let _result = observers[i].update(_passTime);
            //任意一个订阅者倒计时结束，结束观察者运行，并重置数据
            if (_result) {
                stop();
                target.initYYlcInfo();
            }
        }
    }

    function update(target) {
        // 每200毫秒通知订阅者更新
        _interval = window.setInterval(function() {
            let _nowTime = Date.now();
            _passTime += _nowTime - _currentTime;
            _currentTime = _nowTime;
            notifyObserver(target);
        }, 200);
    }

    return {
        attach: attach,
        update: update,
        stop: stop
    }
}

//订阅者类
let SuspendTimeObserve = function(item,endTime) {
    //格式化时间字符串
    function formatTimeString(end) {
        let leftSecond = parseInt(end / 1000);
        let day = Math.floor(leftSecond / (60 * 60 * 24)) < 0 ? 0 : Math.floor(
            leftSecond / (60 * 60 * 24));
        let hour = Math.floor((leftSecond - day * 24 * 60 * 60) / 3600) < 0 ?
            0 : Math.floor((leftSecond - day * 24 * 60 * 60) / 3600);
        let minute = Math.floor((leftSecond - day * 24 * 60 * 60 - hour *
            3600) / 60) < 0 ? 0 : Math.floor((leftSecond - day * 24 * 60 * 60 -
            hour * 3600) / 60);
        let second = Math.floor(leftSecond - day * 24 * 60 * 60 - hour * 3600 -
            minute * 60) < 0 ? 0 : Math.floor(leftSecond - day * 24 * 60 * 60 -
            hour * 3600 - minute * 60);

        hour = day * 24 + hour;
        minute = minute;
        second = second;
        return hour + ":" + minute + ":" + second;
    }

    //返回是否倒计时结束
    function update(_passTime) {
        let _countdownTime = endTime - _passTime;
        item.action = formatTimeString(_countdownTime);
        return _countdownTime <= 0;
    }
    return {
        update: update
    }
}

//调用
const _notify = new SuspendTimeNotify();
const list = [{intervalTime:1000},{intervalTime:1200}];

for (let item in list) {
    _notify.attach(new SuspendTimeObserve(item,intervalTime));//添加订阅
}
_notify.update($scope);
```


