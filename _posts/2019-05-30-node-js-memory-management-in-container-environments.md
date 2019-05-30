---
layout: post
title:  "容器环境下Node.js的内存管理"
date:   2019-05-30 
author: cairc
categories: develop node.js docker
tags: docker node.js 翻译
---

此文章最初发布在[IBM Developer](https://developer.ibm.com/articles/nodejs-memory-management-in-container-environments/)。

>在基于容器的Node.js应用程序中管理内存的最佳实践

在docker容器中运行Node.js应用程序时，传统的内存参数调整并不总是按预期工作。本文我们将阐述内存参数调优在基于容器的Node.js应用程序中并不总是有效的原因，并提供了在容器环境中使用Node.js应用程序时可以遵循的建议和最佳实践。

## 综述

当Node.js应用程序运行在设置了内存限制的容器中时（使用docker `--memory`选项或业务流程系统的其他标志），请使用`--max-old-space-size`选项以确保Node知道其内存限制并且设置值小于容器限制。

当Node.js应用程序在容器内运行时，请根据应用程序的峰值内存值设置其内存容量（假如容器内存可以调整的话）。

接下来让我们更详细地探讨一下。

## Docker内存限制

默认情况下，容器是没有资源限制的，可以使用系统（OS）允许的尽可能多的可用内存资源。但是docker 运行命令可以指定选项，用于设置容器可以使用的内存或CPU。

该`docker-run`命令如下所示：`docker run --memory <x><y> --interactive --tty <imagename> bash`

参数介绍：

* x是以y为单位的内存
* y可以是b（字节），k（千字节），m（兆字节），g（千兆字节）

例如：`docker run --memory 1000000b --interactive --tty <imagename> bash`将内存或CPU限制设置为1,000,000字节

要检查容器内的内存限制（以字节为单位），请使用以下命令：

``` shell
cat /sys/fs/cgroup/memory/memory.limit_in_bytes
```

接下来我们一起来看下设置了`--max_old_space_size`之后容器的各种表现。

“旧生代”是V8内存托管堆的公共堆部分（即JavaScript对象所在的位置），并且该`--max-old-space-size`标志控制其最大大小。有关更多信息，请参阅[关于-max-old-space-size](https://nodejs.org/api/cli.html#cli_node_options_options)。

通常，当应用程序使用的内存多于容器内存时，应用程序将终止。

以下示例应用程序以10毫秒的间隔推送记录。这个快速的间隔使得堆无限制地增长，模拟内存泄漏。

``` javascript 
'use strict';
const list = [];
setInterval(()=> {
  const record = new MyRecord();
  list.push(record);
},10);
function MyRecord() {
  var x='hii';
  this.name = x.repeat(10000000);
  this.id = x.repeat(10000000);
  this.account = x.repeat(10000000);
}
setInterval(()=> {
  console.log(process.memoryUsage())
},100);
```

本文所有的示例程序都可以在我推入Docker Hub的Docker映像中获得。你也可以拉取docker镜像并运行程序。使用`docker pull ravali1906/dockermemory`来获取图像。

或者，你可以自己构建镜像，并使用内存限制运行镜像，如下所示：

``` bash
docker run --memory 512m --interactive --tty ravali1906/dockermemory bash
```

`ravali1906/dockermemory`是镜像的名称

接下来，运行内存大于容器限制的应用程序：

```
$ node --max_old_space_size=1024 test-fatal-error.js
{ rss: 550498304,
heapTotal: 1090719744,
heapUsed: 1030627104,
external: 8272 }
Killed
```

PS：

* `--max_old_space_size` 取M为单位的值
* `process.memoryUsage()` 以字节为单位输出内存使用情况

当内存使用率超过某个阈值时，应用程序终止。但这些阈值是多少？有什么限制？我们来看一下约束。

## 在容器中设置了--max-old-space-size约束的预期结果

默认情况下，Node.js(适用于11.x版本及以下)在32位和64位平台上使用最大堆大小分别为700MB和1400MB。对于当前默认值，请参阅博客末尾参考文章。

因此，理论上，当设置--max-old-space-size内存限制大于容器内存时，期望应用程序应直接被OOM(Out Of Memory)终止。

实际上，这可能不会发生。

## 在容器中设置了--max-old-space-size约束的实际结果

并非所有通过--max-old-space-size指定的内存的容量都可以提前分配给应用程序。

相反，为了响应不断增长的需求，JavaScript内存堆是逐渐增长的。

应用程序使用的实际内存（以JavaScript堆中的对象的形式）可以在`process.memoryUsage()`API中的`heapUsed`字段看到。

因此，现在修改后的期望是，如果实际堆大小（驻留对象大小）超过OOM-KILLER阈值（--memory容器中的标志），则容器终止应用程序。

实际上，这也可能不会发生。

当我在容器受限的环境下分析内存密集型Node.js应用程序时，我看到两种情况：

* OOM-KILLER在heapTotal和heapUsed的值都高于容器限制之后，隔一段很长的时间才执行。
* OOM-KILLER根本没有执行。

## 容器环境中的Node.js相关行为解释

监控容器中运行应用程序的重要指标是驻留集大小（RSS-resident set size）。

它属于应用程序虚拟内存的一部分。

或者说，它代表应用程序被分配的内存的一部分。

更进一步说，它表示应用程序分配的内存中当前处于活动状态的部分。

并非应用程序中的所有已分配内存都属于活动状态，这是因为“分配的内存”只有在进程实际开始使用它时才会真实分配。另外，为了响应其他进程的内存需求，系统可能`swap out`当前进程中处于非活动或休眠状态的内存给其他进程，后续如果当前进程需要的时候通过`swapped in`重新分配回来。

RSS反映了应用程序的可用和活动的内存量。

## 证明

### 示例1.创建一个大小超过容器内存限制的空Buffer对象

以下`buffer_example.js`为往内存分配空Buffer对象的实例代码：

``` javascript
const buf = Buffer.alloc(+process.argv[2] * 1024 * 1024)
console.log(Math.round(buf.length / (1024 * 1024)))
console.log(Math.round(process.memoryUsage().rss / (1024 * 1024)))
```

运行docker映像并限制其内存用量：

``` bash
docker run --memory 1024m --interactive --tty ravali1906/dockermemory bash
```

运行该应用程序。你会看到以下内容：

``` bash
$ node buffer_example 2000
2000
16
```

即使内存大于容器限制，应用程序也不会终止。这是因为分配的内存还未被完全访问。rss值非常低，并且没有超过容器内存限制。

### 示例2.创建一个大小超过容器内存限制的并填满的Buffer对象

以下为往内存分配Buffer对象并填满值的实例代码：

``` javascript
const buf = Buffer.alloc(+process.argv[2] * 1024 * 1024,'x')
console.log(Math.round(buf.length / (1024 * 1024)))
console.log(Math.round(process.memoryUsage().rss / (1024 * 1024)))
```

运行docker映像并限制其内存用量：

``` shell
docker run --memory 1024m --interactive --tty ravali1906/dockermemory bash
```

运行该应用程序

``` shell
$ node buffer_example_fill.js 2000
2000
984
```

即使在这里应用也没有被终止！为什么？当活动内存达到容器设置限制时，并且`swap space`还有空间时，一些旧内存片段将被推送到`swap space`并可供同一进程使用。默认情况下，docker分配的交换空间量等于通过--memory标志设置的内存限制。有了这种机制，这个进程几乎可以使用2GB内存 - 1GB活动内存和1GB交换空间。简而言之，由于内存的交换机制，rss仍然在容器强制限制范围内，并且应用程序能够持续运行。

### 示例3.创建一个大小超过容器内存限制的空Buffer对象并且限制容器使用swap空间

``` javascript
const buf = Buffer.alloc(+process.argv[2] * 1024 * 1024,'x')
console.log(Math.round(buf.length / (1024 * 1024)))
console.log(Math.round(process.memoryUsage().rss / (1024 * 1024)))
```

运行镜像时限制docker内存，交换空间和关闭匿名页面交换，如下所示：

``` shell
docker run --memory 1024m --memory-swap=1024m --memory-swappiness=0 --interactive --tty ravali1906/dockermemory bash
```

``` shell
$ node buffer_example_fill.js 2000
Killed
```

当`--memory-swap`的值等于`--memory`的值时，它表示容器不使用任何额外的交换空间。此外，默认情况下，容器的内核可以交换出一定比例的匿名页，因此将`--memory-swappiness`设置为0以禁用它。因此，由于容器内没有发生交换，rss超出了容器限制，在正确的时间终止了进程。

## 总结和建议

当您运行Node.js应用程序并将其--max-old-space-size设置为大于容器限制时，看起来Node.js可能不会“尊重”容器强制限制。但正如您在上面的示例中看到的，原因是应用程序可能无法使用标志访问JavaScript堆集的全长。

请记住，当您使用的内存多于容器中可用的内存时，无法保证应用按期望行为方式运行。为什么？因为进程的活动内存（rss）受到许多因素的影响，这些因素超出了应用程序的控制范围，并且可能依赖于高负载和环境 - 例如工作负载本身，系统中的并发级别，操作系统调度程序，垃圾收集率等。此外，这些因素可以在运行之间发生变化。

## 关于Node.js堆大小的建议（当你可以控制它，但不能控制容器大小时）

* 运行一个空的Node.js应用程序，并测量空转情况下rss的使用情况（我在Node.js v10.x版本得到它的值约为20 MB）。
* 由于Node.js在堆中具有其他内存区域（例如new_space，code_space等），因此假设其默认配置会占用额外的20 MB。如果更改其默认值，请相应地调整此值。
* 从容器中的可用内存中减去此值（40 MB），得到的值设置为JavaScript的旧生代大小，应该是一个相当安全的值。

## 关于容器大小的建议（当你可以控制它，但不能控制Node.js内存时）

* 运行涵盖高峰工作负载的应用程序。
* 观察rss空间的增长。使用`top`命令和`process.memoryUsage()`API得到最高值。
* 如果容器中不存在其他活动进程，将此值用作容器的内存限制。该值上浮10%以上会更加安全。

## 备注

如果在容器环境下运行，Node.js 12.x的堆内存限制根据当前可用内存进行配置，而不是使用默认值。对于设置了`max_old_space_size`的场景，上面的建议仍然适用。此外，了解相关限制可以让您更好地调整应用并发挥应用的性能，因为默认值是相对保守的。

有关更多信息，请参阅[配置默认堆转储](https://github.com/nodejs/node/pull/25576#issuecomment-455737693)。

原文： [Node.js memory management in container environments](https://medium.com/the-node-js-collection/node-js-memory-management-in-container-environments-7eb8409a74e8)