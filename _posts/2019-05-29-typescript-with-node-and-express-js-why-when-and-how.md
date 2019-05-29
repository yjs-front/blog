---
layout: post
title:  "为什么我们要在Node和Express项目中使用Typescript"
date:   2019-05-29 
author: cairc
categories: develop 翻译
tags: Typescript
---
![banner]({{site.baseurl}}/assets/img/post/whyts/banner.png) 

在我职业生涯刚开始的时候，我是一名桌面开发工程师，强类型语言占据了市场的主导地位。

当我开始转向web开发时，JavaScript和Python等弱类型语言的特性令我很着迷。我再也不需要声明变量的类型，这极大的提高了我的生产力，使我的工作变得更加有趣。

所以当我第一次听说TypeScript时，脑海中的第一个想法是这个语言的出现是一种倒退。

![qa]({{site.baseurl}}/assets/img/post/whyts/qa.jpg) 
## 我改变了主意吗？

是的，但这也要取决于具体项目类型。对于个人项目，我更喜欢纯JavaScript，他的生产力更高。但是对于团队或者大型项目，我建议使用TypeScript。接下来，我将解释原因以及怎么使用。

![ts]({{site.baseurl}}/assets/img/post/whyts/ts.png) 
## TypeScript

如果你还不了解Typescript，建议先看下介绍:

[https://www.tutorialspoint.com/typescript/typescript_overview.htm](https://www.tutorialspoint.com/typescript/typescript_overview.htm)

和官方的5分钟上手TypeScript教程:

[https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

可以简单地把Typescript理解为一个拥有强类型特性的ECMAScript 6版本。

## 生产力 VS 可维护性

根据官方定义，“TypeScript是用于大型应用程序开发的JavaScript”。也就是说，虽然项目初始设置的工作较多，但是在复杂项目的可维护性方面我们得到了补偿。主要原因如下：

### 类型安全 = 更少的错误（Type safe = less errors）
通过在代码中定义类型，我们就可以在编码阶段直接在IDE看到错误信息而不是在代码运行阶段

从图中可以看出，我们在Visual Studio Code中直接看到了两个类型错误

![ex1]({{site.baseurl}}/assets/img/post/whyts/ex1.png) 

在第6行：我们试图将字符串参数传递给只接受数字的函数。

在第9行：我们试图将一个返回数字的函数的结果赋给字符串。

如果没有Typescript，这两个错误就会被忽视，导致最终应用程序出现一些错误。

### 在IDE中更容易找到相关功能模块

在复杂的项目中，我们有大量的类分布在多个文件中。当我们定义类型时，IDE能够将对象和函数关联到给它们源文件。
使用`control +单击`组合键点击方法或类时，IDE将自动跳转到对应的文件并突出显示定义引用。
![type-search]({{site.baseurl}}/assets/img/post/whyts/type-search.png) 
import的文件如果是一个类，那么对应的方法和属性IDE会帮我们自动补全，如下图。
![ex2]({{site.baseurl}}/assets/img/post/whyts/ex2.png) 
不易维护是Java和C＃开发工程师避免将大型项目迁移到JS的主要障碍之一。而Typescript作为企业级语言克服了这一障碍。

## 如何在Express项目中使用Typescript

现在让我们一步一步地创建一个在Express.js项目中使用Typescript语言的环境。
### 初始化项目

``` shell
npm init
```

### 安装typescript包。

``` shell
npm install typescript -s
```

**关于Typescript包**

Node.js是一个运行Javascript的引擎。Typescript包帮我们把 `.ts`文件转换为 `.js`脚本。Babel 7也可用于转换Typescript，但目前大多使用官方的Microsoft软件包。


### 在`package.json`中新增tsc指令

``` shell
"scripts": {
    "tsc": "tsc"
},
```

添加之后，可以在当前项目下直接运行如下命令调用typescript函数：

``` shell
npm run tsc
```

### 生成并初始化`tsconfig.json`文件

``` shell
npm run tsc -- --init
```

运行之后，会在项目目录中生成tsconfig.json文件。在此文件中，我们取消注释`outDir`选项，表示将ts文件编译之后的js文件输出到`build`目录：

![tsconfig]({{site.baseurl}}/assets/img/post/whyts/tsconfig.png) 

### 安装Express.js

``` shell
npm install express -s
```

Express和Typescript包是独立的。Typescript并不知道Express的类型。因此还需要安装一个特定的npm包来让Typescript识别Express类型。

``` shell
npm install @types/express -s
```

### 编写Hello world

为了程序尽量简单，我直接使用express.js教程的hello world示例进行演示：

[https://expressjs.com/pt-br/starter/hello-world.html](https://expressjs.com/pt-br/starter/hello-world.html)

![hello]({{site.baseurl}}/assets/img/post/whyts/hello.png) 

在我们的项目中，我们将创建一个名为的文件夹app。在此文件夹中，我们将创建一个名为app.ts的文件,内容如下：
``` javascript
// lib/app.ts
import express = require('express');

// Create a new express application instance
const app: express.Application = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
```

### 编译我们第一个Typescript项目：

``` shell
npm run tsc
```

如您所见，该命令运行之后自动创建了build文件夹和.js文件。
![build]({{site.baseurl}}/assets/img/post/whyts/build.png) 

### 运行Express

``` shell
node build/app.js
```

运行之后，我们在3000端口上运行了一个服务。

## 免编译直接运行TypeScript

使用`ts-node`包在Node上直接运行Typescript。

此软件包建议仅用于开发。在生产环境，请始终使用编译后javascript版本。

ts-node已被包含在另一个包`ts-node-dev`中。安装后，运行ts-node-dev指令可以直接监听文件变化并重新启动服务。

``` shell
npm install ts-node-dev -s
```

修改packege.json我们将添加两个脚本：

``` shell
"scripts": {
    "tsc": "tsc",
    "dev": "ts-node-dev --respawn --transpileOnly ./app/app.ts",
    "prod": "tsc && node ./build/app.js"
},
```


以开发模式启动服务:

``` shell
npm run dev
```

以生产模式启动服务：

``` shell
npm run prod
```

具体实例代码在github中查看：[https://github.com/andregardi/ts-express](https://github.com/andregardi/ts-express)

原文： [How (and why) you should use Typescript with Node and Express.](https://medium.com/javascript-in-plain-english/typescript-with-node-and-express-js-why-when-and-how-eb6bc73edd5d)