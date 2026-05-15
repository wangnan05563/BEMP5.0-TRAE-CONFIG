# 前端开发指南

> 本文档整合了前端开发规范与代码模板，是 BEMP 个性化前端开发的完整参考。

## 目录导航

- [一、开发规范](#一开发规范)
  - [1. 概述](#1-概述)
  - [2. 环境要求](#2-环境要求)
  - [3. 命名约定](#3-命名约定)
  - [4. HTML/Template 开发规范](#4-htmltemplate-开发规范)
  - [5. CSS/LESS/SASS 开发规范](#5-csslesssass-开发规范)
  - [6. JS/ES6 开发规范](#6-jses6-开发规范)
  - [7. Vue 开发规范](#7-vue-开发规范)
  - [8. 页面开发指南](#8-页面开发指南)
  - [9. 组件设计规范](#9-组件设计规范)
  - [10. 国际化规范](#10-国际化规范)
  - [11. 性能优化指南](#11-性能优化指南)
  - [12. 最佳实践](#12-最佳实践)
- [13. HUI 组件文档查询规范](#13-hui-组件文档查询规范)
- [二、代码模板](#二代码模板)
  - [模板1：标准页面模板](#模板1标准页面模板)
  - [模板2：批量操作模板](#模板2批量操作模板)
  - [模板3：表格页面模板](#模板3表格页面模板)
  - [模板4：表单页面模板](#模板4表单页面模板)
  - [模板5：树形页面模板](#模板5树形页面模板)
  - [模板6：API 调用模板](#模板6-api-调用模板)
  - [模板7：测试用例模板](#模板7-测试用例模板)

---
## 一、开发规范

# 河南农信 BEMP 前端个性化开发规范

## 目录

- [1. 概述](#1-概述)
- [2. 环境要求](#2-环境要求)
- [3. 命名约定](#3-命名约定)
- [4. HTML/Template 开发规范](#4-htmltemplate-开发规范)
- [5. CSS/LESS/SASS 开发规范](#5-csslesssass-开发规范)
- [6. JS/ES6 开发规范](#6-jses6-开发规范)
- [7. Vue 开发规范](#7-vue-开发规范)
- [8. 页面开发指南](#8-页面开发指南)
- [9. 组件设计规范](#9-组件设计规范)
- [10. 国际化规范](#10-国际化规范)
- [11. 性能优化指南](#11-性能优化指南)
- [12. 最佳实践](#12-最佳实践)
- [13. HUI 组件文档查询规范](#13-hui-组件文档查询规范)

---

## 1. 概述

### 1.1 文档目的

本文档旨在规范河南农信 BEMP 系统前端个性化开发流程，确保代码质量、可维护性和与产品化代码的兼容性。

### 1.2 适用范围

- 河南农信 BEMP 系统所有前端个性化功能开发
- 前端代码修改和优化
- 前端组件开发和复用

### 1.2.1 个性化开发目录

**【强制】前端个性化代码必须在以下目录下开发：**

| 目录类型 | 路径 | 说明 |
|---------|------|------|
| 页面文件 | `frontend/src/views/bizViews/banks/hnnxbank` | Vue 页面组件 |
| 组件文件 | `frontend/src/components/bank/hnnxbank` | 可复用组件 |
| 资源文件 | `frontend/src/assets/hnnxbank` | 图片、样式等资源 |
| 工具文件 | `frontend/src/utils/banks/hnnxbank` | 工具函数和类 |
| 静态资源 | `frontend/static/bank/hnnxbank` | 静态文件 |

**【目录匹配规则】** 所有包含 `/banks/hnnxbank` 或 `/bank/hnnxbank` 路径的目录均为个性化开发目录。

### 1.3 核心原则

- **增量开发**：在产品化代码基础上新增，不修改产品化代码
- **目录隔离**：个性化代码必须在指定目录下开发
- **组件复用**：优先复用已有组件和工具类
- **国际化**：所有文本必须使用国际化

### 1.4 技术栈

- **Vue.js**：前端 JavaScript 框架
- **H-UI**：基于 Vue.js 的 UI 组件库
- **ES6**：JavaScript 语言标准

---

## 2. 环境要求

### 2.1 开发工具

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 10.15.3 | 使用 nvm 管理多版本 |
| Python | 2.7.12 | 兼容 node-sass |
| VS Code | 最新 | 推荐代码编辑器 |
| Chrome | 最新 | 推荐浏览器 |

### 2.2 VS Code 插件

**【强制】安装以下插件：**

1. **Vetur**：Vue 开发扩展及 Vue 文件代码格式化
2. **Prettier - Code formatter**：CSS/Less/JS 等文件代码格式化

**【推荐】安装以下插件：**

1. **Chinese (Simplified) Language Pack**：VS Code 简体中文语言包
2. **EditorConfig**：固定尾部换行符为 LF

### 2.3 VS Code 配置

```json
{
  "editor.tabSize": 2,
  "editor.formatOnSave": true
}
```

### 2.4 浏览器调试

**【推荐】** 安装 Vue.js devtools 插件进行调试

---

## 3. 命名约定

### 3.1 文件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| Vue 文件 | 驼峰命名法 | `BranchManager.vue`、`LegalPersonVirtualMain.vue` |
| 国际化文件 | 语言代码 | `zh-CN.js`、`en-US.js` |
| API 文件 | 模块名 + API | `branchApi.js`、`roleApi.js` |
| 组件文件夹 | PascalBase 风格 | `FaBox/`、`HForm/` |

### 3.2 变量命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| data 属性 | 驼峰命名 | `formItem`、`addOrEditWin`、`branchList` |
| 常量 | 大写 + 下划线 | `COMMON_CONSTANT`、`MAX_LENGTH` |
| 布尔值 | is/has/can 前缀 | `isValid`、`hasError`、`canEdit` |
| 私有属性 | 下划线前缀 | `_privateData`、`_tempObj` |

### 3.3 方法命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 普通方法 | 驼峰命名 | `handleSearch`、`formAdd`、`resetForm` |
| 事件处理 | handle + 事件名 | `handleClick`、`handleChange` |
| 生命周期 | 钩子函数名 | `mounted`、`created` |

### 3.4 组件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| name 属性 | 小写 + 连字符 | `branch-manager`、`role-distribute` |
| 文件名 | 驼峰命名 | `BranchManager.vue` |
| 注册名 | 驼峰命名 | `BranchManager` |

**【强制】组件名应该始终是多个单词的，根组件 App 除外**

### 3.5 CSS 命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| BEM 命名 | block__element--modifier | `h-form__item`、`h-button--primary` |
| 作用域类 | 模块名 + 功能 | `layout-menu-left`、`h-form-search-box` |

**【强制】** id、类名使用小写字母，以中划线分隔（'-'）

**【强制】** 不允许使用拼音，尤其是缩写的拼音、拼音与英文的混合

---

## 4. HTML/Template 开发规范

### 4.1 通用语法

**【强制】** 缩进使用两个空格代替 Tab

**【强制】** 嵌套元素应当缩进一次（即两个空格），同层级缩进应保持一致

**【强制】** 将每个块元素、列表元素或表格元素都放在新行

**【强制】** 对于属性的定义，使用双引号，不要使用单引号

**【强制】** 不要省略可选的结束标签（closing tag）

### 4.2 特殊符号

**【强制】** 特殊符号使用 HTML 字符实体：

| 符号 | 实体编码 |
|------|---------|
| 空格 | `&nbsp;` |
| © | `&copy;` |
| ¥ | `&yen;` |
| ® | `&reg;` |
| > | `&gt;` |
| < | `&lt;` |
| & | `&amp;` |

### 4.3 标签规范

**【强制】** td / th 要在 tr 里面，li 要在 ul / ol 里面

**【强制】** ul / ol 的直接子元素只能是 li，不能包含其他元素

**【强制】** 行内元素里面不可使用块级元素

**【强制】** 不使用自定义标签，会与 Vue 组件系统的自定义组件冲突

**【强制】** 不使用重复属性，重复的属性只会取第一个

**【强制】** 所有元素必须正确嵌套，不允许交叉嵌套

### 4.4 链接与锚点

**【推荐】** 在 a 标签中的 href，没有具体指向链接时，应该使用 `javascript:void(0)` 而不是 `#`

**【推荐】** 需要在页内跳转时，请使用 `#id` 的方式

### 4.5 属性顺序

**【参考】** 属性应该按照特定的顺序出现以保证易读性：

1. class
2. id, name
3. data-*
4. src, for, type, href
5. title, alt
6. aria-*, role

### 4.6 注释

**【推荐】** 尽可能的为代码写上注释，在每个模块开始和结束的地方添加注释

```html
<!-- 列表模块 -->
<div class="list">
  ...
</div>
<!-- /列表模块 -->
```

---

## 5. CSS/LESS/SASS 开发规范

### 5.1 命名规范

**【强制】** id、类名及 less/sass 中的变量、函数、混合等使用小写字母，以中划线分隔

```less
$affix-prefix-cls: "#{$css-prefix}affix";

.#{$affix-prefix-cls}{
  position: fixed;
  z-index: $zindex-affix;
}
```

**【强制】** 避免 class 与 id 重名，id 用于标识模块或页面的某一个父容器区域

**【强制】** 定义某个样式名，都有同名的样式已存在的可能性，因此尽量写上前缀，减少全局污染

### 5.2 语法规范

**【强制】** 所有声明语句都应当以分号结尾

**【强制】** 避免为 0 值指定单位，例如，用 `margin: 0;` 代替 `margin: 0px;`

**【强制】** 为选择器中的属性添加双引号，例如，`input[type="text"]`

**【强制】** 十六进制值应该全部小写，例如，`#f3f6fa`

**【强制】** 不出现空的规则（声明块中没有声明语句）

**【强制】** 不要设置太大的 z-index（一个正常的系统的层级关系在 10 以内就能完成）

### 5.3 代码风格

**【强制】** 缩进使用两个空格代替 Tab

**【强制】** 为选择器分组时，将单独的选择器单独放在一行

**【强制】** 声明块的左花括号前添加一个空格

**【强制】** 声明块的右花括号应当单独成行

**【强制】** 每条声明语句的 : 后应该插入一个空格，: 前不加空格

**【强制】** 每条样式声明应该独占一行

### 5.4 注释规范

**【强制】** 注释规范：

a) 多写注释，且多使用句子进行描述而不是词语

b) 保持注释内容与星号之间有一个空格的距离

```css
/* 普通注释 */

/*
 * 模块: m-box
 * 描述
 * 应用：page detail, info and etc...
 */
```

### 5.5 选择器权重

**【强制】** 非通用样式使用嵌套方式进行编写，避免影响其他自己不了解样式，造成样式覆盖

**【推荐】** Vue 中样式谨慎使用 scoped，会影响样式选择器性能

**【强制】** 无法修改原样式声明时，应通过权重关系，编写权重更高的样式进行覆盖

**【强制】** 不使用 !important，除非原样式使用内联样式或 !important 且无法直接修改

### 5.6 声明顺序

**【参考】** 相关的属性声明按以下顺序做分组处理：

A. **Positioning**（影响其他元素和自身位置相关声明）：display/list-style/position/float/clear/z-index/zoom/overflow

B. **Box model**（自身盒模型相关声明）：width/height/margin/padding/border/line-height

C. **Typographic**（文本相关声明）：color/font/text-decoration/text-align/text-indent/vertical-align/white-space/content

D. **Visual**（自身样式）background/border-radius/cursor

E. **Misc**（其他声明）: CSS3 属性 transform/transition/animation/box-shadow

---

## 6. JS/ES6 开发规范

### 6.1 命名规范

**【强制】** 支持 ES6 语法的文件中变量全部采用 let 定义，常量使用 const 定义

**【强制】** 标准变量采用驼峰式命名

**【强制】** 常量全大写，用下划线连接

**【强制】** 变量名不应过短，要能准确完整地描述该变量所表述的事物

| 不好的变量名 | 好的变量名 |
|------------|-----------|
| inp | input, priceInput |
| day1, day2, param1 | today, tomorrow |
| id | userId, orderId |
| obj | orderData, houseInfos |

**【强制】** 变量名的对仗要明确，如 up/down、begin/end、opened/closed、visible/invisible、source/target

**【推荐】** 波尔变量应使用肯定的布尔变量名，不要使用否定的名词，如 notOk、notReady

### 6.2 语法规范

**【强制】** 变量不要先使用后声明

**【强制】** 不要声明了变量却不使用

**【强制】** 不要在同个作用域下声明同名变量

**【强制】** 一个函数作用域中所有的变量声明尽量提到函数首部

**【强制】** 为了快速知晓变量类型，声明变量时要赋值

**【强制】** 单一函数的返回值类型要确定

**【强制】** debugger 不要出现在提交的代码里

**【推荐】** 使用 === 代替 ==，!== 代替 !=

**【推荐】** 使用 let 定义变量，const 定义常量

**【推荐】** 使用箭头函数取代简单的函数（ES6 支持）

### 6.3 代码风格

**【强制】** 缩进使用两个空格代替 Tab

**【强制】** 统一使用双引号 ""

**【强制】** 语句结尾不需要加分号

**【强制】** 以下几种情况不需要空格：

- 对象的属性名后
- 前缀一元运算符后
- 后缀一元运算符前
- 函数调用括号前
- 无论是函数声明还是函数表达式，'(' 前不要空格
- 数组的 '[' 后和 ']' 前
- 对象的 '{' 后和 '}' 前
- 运算符 '(' 后和 ')' 前

**【强制】** 以下几种情况需要空格：

- 二元运算符前后
- 三元运算符 '?:' 前后
- 代码块 '{' 前
- 下列关键字前：else, while, catch, finally
- 下列关键字后：if, else, for, while, do, switch, case, try, catch, finally, with, return, typeof
- 单行注释 '//' 后（若单行注释和代码同行，则 '//' 前也需要），多行注释 '*' 后
- 对象的属性值前
- for 循环，分号后留有一个空格，前置条件如果有多个，逗号后留一个空格
- 无论是函数声明还是函数表达式，'{' 前一定要有空格
- 函数的参数之间

### 6.4 数组、对象

**【强制】** 对象属性名不需要加引号

**【强制】** 对象以缩进的形式书写，不要写在一行

**【强制】** 数组中不要存在空元素

**【强制】** 不要用 for in 循环数组

**【强制】** for-in 只用于 object/map/hash 的遍历

### 6.5 使用 null

**【强制】** 正确使用 null

**适用场景：**

- 初始化一个将来可能被赋值为对象的变量
- 与已经初始化的变量做比较
- 作为一个参数为对象的函数的调用传参
- 作为一个返回对象的函数的返回值

**【强制】** 不要用 null 来判断函数调用时有无传参

**【强制】** 不要与未初始化的变量做比较

### 6.6 文档注释

**【强制】** 版权注释

```javascript
/**
 * 版权信息：Copyright ® 恒生电子股份有限公司
 */
```

**【强制】** 属性注释

```javascript
/**
 * Maximum number of things per pane.
 * @type {number}
 */
project.MyClass.prototype.someProperty = 4;
```

**【推荐】** 建议在以下情况下使用文档注释：

- 所有常量
- 所有函数
- 所有类

### 6.7 JS 优化常识

#### 6.7.1 循环

**【推荐】** 最佳的遍历元素方式：

```javascript
for (var i = 0, len = arr.length; i < len; i++) {
  ...
}
```

或者，如果无所谓顺序的话：

```javascript
for (var i = arr.length; i > 0; i--) {
  ...
}
```

还可以使用 ES6 中 array 的 forEach/some/filter/every

#### 6.7.2 局部变量和全局变量

局部变量的速度要比全局变量的访问速度更快

#### 6.7.3 不使用 eval

使用 eval 相当于在运行时再次调用解释引擎对内容进行运行，需要消耗大量时间

#### 6.7.4 减少对象查找

因为 JavaScript 的解释性，所以 a.b.c.d.e，需要进行至少 4 次查询操作

#### 6.7.5 字符串连接

如果是追加字符串，最好使用 `s += anotherStr` 操作

如果要连接多个字符串，应该少使用 +=，如：

```javascript
s += a + b + c;
```

#### 6.7.6 类型转换

把数字转换成字符串，应用 `"" + 1`

浮点数转换成整型，不要使用 parseInt()，应该使用 Math.floor() 或者 Math.round()

---

## 7. Vue 开发规范

### 7.1 .vue 命名规范

**【强制】** 组件名应该始终是多个单词的，根组件 App 除外

**【推荐】** 应用特定样式和约定的基础组件应该全部以一个特定的前缀开头，比如 Base、App 或 V

**【强制】** 和父组件紧密耦合的子组件应该以父组件名作为前缀命名

**【强制】** 组件名应该以高级别的（通常是一般化描述的）单词开头，以描述性的修饰词结尾

**【推荐】** 业务页面名称（非模板组件）统一使用小写字母开头的（camelCase）规范，例如：index.js/index.vue/bondItem.vue

**【推荐】** 组件名应该倾向于完整单词而不是缩写

### 7.2 文件夹命名规范

**【推荐】** ./src 下除 components 外的子文件夹命名均使用（camelCase）规范，例如 bizViews

**【推荐】** ./src/components 下最多只有一层子文件夹，文件夹名称为组件的名称，命名使用以大写字母开头的 PascalBase 风格

### 7.3 语法规范

**【强制】** 组件的 data 必须是一个函数（除了 new Vue 外的任何地方）

**【强制】** prop 的定义应该尽量详细，至少需要指定其类型

**【强制】** 为 v-for 设置键值

**【强制】** 不要把 v-if 和 v-for 同时用在同一个元素上

**【强制】** 自闭合组件在单文件组件、字符串模板和 JSX 中没有内容的组件应该是自闭合的

**【强制】** 模版中的组件名大小写在单文件组件和字符串模板中组件名应该总是 PascalCase 的

**【强制】** JS/JSX 中的组件名应该始终是 PascalCase 的

**【推荐】** Prop 名大小写，在声明 prop 的时候，其命名应该始终使用 camelCase，而在模板和 JSX 中应该始终使用 kebab-case

**【强制】** 组件模板应该只包含简单的表达式，复杂的表达式则应该重构为计算属性或方法

**【强制】** 非空 HTML 特性值应该始终带引号

**【强制】** 可简写指令需要缩写（用 : 表示 v-bind: 和用 @ 表示 v-on:）

**【强制】** 不要把一个变量作为多个且同时存在的组件的 v-model 绑定值

### 7.4 组件/实例的选项的顺序

**【参考】** 组件/实例的选项应该有统一的顺序：

1. **副作用**（触发组件外的影响）
   - el

2. **全局感知**（要求组件以外的知识）
   - name
   - parent

3. **组件类型**（更改组件的类型）
   - functional

4. **模板修改器**（改变模板的编译方式）
   - delimiters
   - comments

5. **模板依赖**（模板内使用的资源）
   - components
   - directives
   - filters

6. **组合**（向选项里合并属性）
   - extends
   - mixins

7. **接口**（组件的接口）
   - inheritAttrs
   - model
   - props/propsData

8. **本地状态**（本地的响应式属性）
   - data
   - computed

9. **事件**（通过响应式事件触发的回调）
   - watch

10. **方法**（组件的方法）
    - methods

11. **生命周期钩子**（按照它们被调用的顺序）
    - beforeCreate
    - created
    - beforeMount
    - mounted
    - beforeUpdate
    - updated
    - activated
    - deactivated
    - beforeDestroy
    - destroyed

### 7.5 单文件组件结构

```vue
<template>
  <!-- 模板内容 -->
</template>

<script>
import { post, on, off } from "@/api/bizApi/commonUtil";

export default {
  name: "componentName",
  
  // 1. 组件属性
  props: {
    // 属性定义
  },
  
  // 2. 数据
  data() {
    return {
      // 数据定义
    };
  },
  
  // 3. 计算属性
  computed: {
    // 计算属性
  },
  
  // 4. 监听器
  watch: {
    // 监听器
  },
  
  // 5. 方法
  methods: {
    // 方法定义
  },
  
  // 6. 生命周期
  mounted() {
    // 生命周期
  }
};
</script>

<style scoped>
  /* 样式定义 */
</style>
```

---

## 8. 页面开发指南

### 8.1 页面结构

页面布局是常用的内容管理系统的结构，上左右：

- **上**：系统状态栏
- **左**：菜单列表
- **右**：工作区管理（查询表单、操作按钮、数据列表、分页栏）

### 8.2 查询表单代码

**代码说明：**

1. 表单布局结构不能改变，页面上的 dom 节点样式 class 必须保证拼写无误

```html
<div class="h-form-search-box">
  <h-panel class="clearfix" :class="{'h-form-overhd':!ifShowMore}">
    <h-form :model="formItem" :label-width="90" ref="formItem" cols="4" class="h-form-search">
```

2. 表单上需在 js 里的 data 属性定义的变量：formItem: 绑定表单输入域值

3. ifShowMore：是否显示高级查询

4. label 属性名设置为 :label-width = "90"

5. 表单输入域 name : prop = "brchNo"

```html
<h-form-item label="机构号" prop="brchNo">
```

6. 查询表单校验：只控制输入长度 maxlength="20"

7. 表单触发按钮触发事件

```html
<h-button type="primary" @click="formSearch()">{{$t("m.i.common.search")}}</h-button>
<h-button type="ghost" @click="formSearchReset()">{{$t("m.i.common.reset")}}</h-button>
```

```javascript
formSearch() { // 触发表单查询数据，并渲染响应到列表中
  this.$refs.datagrid.dataChange(1);
},

formSearchReset() { // 清空表单输入域数据
  this.$refs.formItem.resetFields();
},
```

8. **【注意】** 表单输入域如果超出 3 个，应添加"高级"按钮

### 8.3 操作按钮

按钮触发事件脚本代码应写在 js/ methods:{}

### 8.4 新增处理

```javascript
handleAddForm(str) {
  this.type = str;
  this.readonly = false;
  this.isRequired = true;
  this.addForm.userId = null;
  
  if (this.type == "modify" || this.type == "view") {
    if (this.currentSelectRow.length === 0) {
      this.$hMessage.info(this.$t("m.i.common.chooseOneData"));
      return;
    }
    let newRow = this.currentSelectRow[0];
    this.addForm.userNo = newRow.userNo;
    this.addForm.userId = newRow.userId;
    // ... 其他字段赋值
  } else {
    this.addFormReset();
  }
  this.addOrEditWin = true;
},
```

### 8.5 表单说明

1. 有相同父元素的子元素必须有独特的 key，重复的 key 会造成渲染错误

2. 新增编辑表单数据绑定 :model="addForm"

3. **【注意】** 弹出框布局 width 控制 400, 800，1000，支持最大化 maximize = true

### 8.6 提交表单

```javascript
submitForm() {
  let btnType = this.type;
  this.$refs["addForm"].validate(valid => {
    if (valid) {
      // 提交逻辑
    }
  });
},
```

---

## 9. 组件设计规范

### 9.1 组件注册机制

#### 9.1.1 全局自动注册

**【重要】** 项目采用组件全局自动注册机制，理解该机制对于正确使用组件至关重要。

**自动注册原理：**

项目通过 `index.js` 文件实现目录下所有 `.vue` 组件的自动扫描和全局注册：

```javascript
import Vue from 'vue'

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// 自动扫描当前目录下所有 .vue 文件
const requireComponent = require.context('.', true, /\.vue$/)

requireComponent.keys().forEach(fileName => {
  const componentConfig = requireComponent(fileName)
  
  // 提取文件名：showBranch
  fileName = fileName.substring(fileName.toString().lastIndexOf("\/"))
  const componentName = capitalizeFirstLetter(
    fileName.replace(/^\.\/|\//, '').replace(/\.\w+$/, '')
  )
  
  // 全局注册组件：ShowBranch
  Vue.component(componentName, componentConfig.default || componentConfig)
})
```

**已配置自动注册的目录：**

| 目录路径 | 说明 | 组件命名示例 |
|---------|------|------------|
| `src/components/bopp/` | BOPP 通用组件 | `BaseButton.vue` → `<BaseButton>` 或 `<base-button>` |
| `src/components/bemp/` | BEMP 通用组件 | `CommonInput.vue` → `<CommonInput>` 或 `<common-input>` |
| `src/components/bemp/input/` | 输入类组件 | `BillNo.vue` → `<BillNo>` 或 `<bill-no>` |
| `src/components/bemp/input/common/` | 通用输入组件 | `CommonInput.vue` → `<CommonInput>` 或 `<common-input>` |
| `src/components/bemp/input/ce/` | 承兑业务输入组件 | 根据文件名转换 |
| `src/components/bemp/button/` | 按钮类组件 | `QueryBtn.vue` → `<QueryBtn>` 或 `<query-btn>` |
| `src/components/bemp/button/common/` | 通用按钮组件 | `GoBackBtn.vue` → `<GoBackBtn>` 或 `<go-back-btn>` |
| `src/components/bank/{bankName}/` | 银行个性化组件 | 根据银行名称动态加载 |
| `src/components/bank/hlsecurity/` | 安全相关组件 | `ShowBranch.vue` → `<ShowBranch>` 或 `<show-branch>` |

**命名转换规则：**

- 文件名：`showBranch.vue` → 组件名：`ShowBranch`
- 模板中使用 PascalCase：`<ShowBranch>`
- 模板中使用 kebab-case：`<show-branch>`
- 两者在 Vue 中等价，推荐使用 kebab-case

**全局注册组件的使用：**

```vue
<template>
  <div>
    <!-- 直接使用，无需 import -->
    <show-branch 
      v-model="formItem.acptBrchNameList" 
      :label="$t('m.i.common.brchName')"
      prop="acptBrchNameList"
      :brchNo.sync="formItem.acptBrchNoList"
      :brchName.sync="formItem.acptBrchNameList">
    </show-branch>
    
    <!-- 以下写法等价 -->
    <ShowBranch></ShowBranch>
  </div>
</template>

<script>
export default {
  name: "myComponent",
  // 无需在 components 中注册 show-branch
  // 因为它已经通过 hlsecurity/index.js 全局注册
  data() {
    return {
      formItem: {
        acptBrchNameList: '',
        acptBrchNoList: ''
      }
    }
  }
}
</script>
```

#### 9.1.2 局部注册

**【强制】** 以下情况的组件必须使用局部注册：

1. **业务视图组件**：位于 `src/views/bizViews/` 下的组件
2. **无 index.js 的目录**：所在目录没有 `index.js` 自动注册文件
3. **避免命名冲突**：当多个目录存在同名组件时

**局部注册示例：**

```vue
<template>
  <div>
    <!-- 使用局部注册的组件 -->
    <show-branch-sec 
      :showBranchWin="showBranchWin" 
      title="机构查询" 
      @brchNoChange="brchNoChanges"
      @showBranchWinClose="showBranchWinClose">
    </show-branch-sec>
  </div>
</template>

<script>
export default {
  name: "eDiscTrackBatchMain",
  components: {
    // 局部注册组件，指定别名
    ShowBranchSec: () => import(
      /* webpackChunkName: "be/market/rediscount/common/showBranch" */
      `@/views/bizViews/be/market/rediscount/common/showBranch`
    )
  },
  data() {
    return {
      showBranchWin: false
    }
  },
  methods: {
    brchNoChanges(info) {
      // 处理机构选择
    },
    showBranchWinClose() {
      this.showBranchWin = false
    }
  }
}
</script>
```

#### 9.1.3 组件查找规则

**【重要】** 当模板中使用组件时，Vue 按以下顺序查找：

1. **局部注册**：当前组件 `components` 选项中定义的组件
2. **全局注册**：通过 `Vue.component()` 注册的组件

**同名组件处理：**

- 如果多个 `index.js` 都注册了同名组件，**后注册的会覆盖先注册的**
- 加载顺序由 `main.js` 中的 import 顺序决定：
  1. `components/bopp/index.js`
  2. `components/bemp/index.js`
  3. `components/bank/{bankName}/index.js`（根据银行名称动态加载）

**示例：工作空间中有多个 `showBranch.vue` 文件**

| 文件路径 | 是否全局注册 | 原因 | 使用方式 |
|---------|------------|------|---------|
| `components/bank/hlsecurity/showBranch.vue` | ✅ 是 | 目录有 `index.js` | 直接使用 `<show-branch>` |
| `views/bizViews/sm/auth/branch/showBranch.vue` | ❌ 否 | 无 `index.js` | 需要手动 `import` |
| `views/bizViews/shcpe/cpes/branchcontinue/common/showBranch.vue` | ❌ 否 | 无 `index.js` | 需要手动 `import` |
| `views/bizViews/be/market/rediscount/common/showBranch.vue` | ❌ 否 | 无 `index.js` | 需要手动 `import` |
| `components/bemp/searchinput/showBranch.vue` | ❌ 否 | 无 `index.js` | 需要手动 `import` |

#### 9.1.4 个性化开发中的组件使用

**【强制】** 在河南农信个性化开发中，组件使用遵循以下规范：

1. **优先使用全局组件**：
   - 如果 `components/bemp/` 或 `components/bank/hlsecurity/` 中已有满足需求的组件，直接使用
   - 无需在 `components` 中注册，直接在模板中使用

2. **创建个性化组件**：
   - 如需新增组件，优先放在 `components/bank/hnnxbank/` 目录下（如果该目录有 `index.js`）
   - 或者在页面所在目录下创建，并使用局部注册

3. **复用已有业务组件**：
   - 检查 `src/views/bizViews/banks/hnnxbank/` 目录下是否已有类似实现
   - 检查 `src/components/bank/hnnxbank/` 目录下是否有可复用的组件

4. **避免重复开发**：
   - 同一功能不要在全局组件和局部组件中重复实现
   - 如果多个页面都需要，考虑提取为全局组件

### 9.2 通用业务组件

#### 9.2.1 文本框组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonInput | 通用文本框 | label, prop, maxlength, readonly, required, clearable | 不常用字段直接使用 |
| batchNo | 批次号 | v-model | 批次号输入 |
| billNo | 票据号码 | billClass, billType | 根据票据介质和种类区分校验规则 |
| acptBankName | 承兑人开户行行名 | v-model | 承兑人开户行输入 |
| acptName | 承兑人全称 | v-model | 承兑人名称输入 |
| socCode | 统一社会信用代码 | v-model, className | 信用代码输入 |
| orgCode | 组织机构代码 | v-model | 组织机构代码输入 |

**commonInput 使用示例：**
```vue
<common-input 
  v-model="addForm.transMemberId" 
  :label="$t('m.i.be.memberId')" 
  prop="transMemberId" 
  :maxlength="6" 
  :readonly="true" 
  :showIcon="true" 
  :required="true" 
  @on-click="showCpesBranch()"
  :clearVal="clearVal" 
  :clearable="true">
</common-input>
```

**billNo 使用示例：**
```vue
<!-- 纸票校验规则，billClass和billType两个属性必传 -->
<!-- 银票 -->
<bill-no v-model="formItem.billNo" billClass="ME01" billType="AC01"></bill-no>

<!-- 商票 -->
<bill-no v-model="formItem.billNo" billClass="ME01" billType="AC02"></bill-no>

<!-- 不指定纸电票 -->
<bill-no v-model="formItem.billNo"></bill-no>
```

#### 9.2.2 下拉菜单组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonDropdown | 通用下拉菜单 | isShowDropdown, dropdownTitle, dropdownItemProps | 提交按钮下拉、操作菜单 |

**commonDropdown 使用示例：**
```vue
<!-- 使用默认slot -->
<common-dropdown 
  @on-click="submit"
  :isShowDropdown="this.batchParams.isCommit === 'noCommit'"
  :dropdownTitle="$t('m.i.common.submit')"
  :dropdownItemProps="[
    {label: this.$t('m.i.ce.selectSubmit'), name: 'select'}, 
    {label: this.$t('m.i.ce.batchSubmit'), name: 'batch'}
  ]">
</common-dropdown>

<!-- 自定义slot -->
<common-dropdown @on-click="submit">
  <a>提交<h-icon name="unfold"></h-icon></a>
  <h-dropdown-menu slot="list">
    <h-dropdown-item name="BT01">转贴现</h-dropdown-item>
    <h-dropdown-item name="BT02">质押式回购</h-dropdown-item>
    <h-dropdown-item name="BT03">买断式回购</h-dropdown-item>
  </h-dropdown-menu>
</common-dropdown>
```

#### 9.2.3 下拉框组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonSelect | 通用下拉框 | dictList, paramsMap, multiple, clearable | 不常用字段，支持单选/多选/搜索 |
| billClass | 票据介质 | dictList | 票据介质选择 |
| billType | 票据种类 | dictList | 票据种类选择 |
| busiType | 业务类型 | dictList, paramsMap | 业务类型选择 |
| channelSelect | 渠道 | dictList, paramsMap, queryUrl | 渠道选择 |

**commonSelect 使用示例：**
```vue
<!-- 数据来源于数据字典 -->
<common-select 
  v-model="formItem.sendRcvFlag" 
  :dictList="sendRcvFlagList" 
  :clearable="false" 
  :label="$t('m.i.be.sendRcvFlag')" 
  prop="sendRcvFlag" 
  @on-change="changeSendRcvFlag">
</common-select>

<!-- 数据来源于后台查询 -->
<common-select 
  v-model="formItem.prodNo" 
  prop="prodNo" 
  :dictList="prodNoList"
  :label="$t('m.i.common.prodName')"
  :paramsMap="{key:'prodNo',value:'prodName'}">
</common-select>

<!-- 多选 -->
<common-select 
  v-model="formItem.creditMainBrchClass" 
  :dictList="creditMajorList"
  :label="$t('m.i.billInfo.creditMainBankType')" 
  multiple 
  prop="creditMainBrchClass">
</common-select>
```

**channelSelect 使用示例：**
```vue
<!-- 数据来源于数据字典 -->
<channel-select 
  v-model="formItem.remittanceChannel" 
  prop="remittanceChannel" 
  :label="$t('m.i.ce.remittanceChannel')"
  :dictList="remittanceChannelList"
  :paramsMap="{key: 'key', value: 'value'}">
</channel-select>

<!-- 数据来源于后台查询（默认接口） -->
<channel-select v-model="formItem.channelNo"></channel-select>
```

#### 9.2.4 金额框组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonTypeField | 通用金额框 | label, prop, integerNum, suffixNum, divided | 不常用金额字段 |
| commonTypeFieldRange | 通用金额范围框 | rangeProps, integerNum, suffixNum | 金额范围输入 |
| billMoneyRange | 票据金额范围框 | rangeProps, integerNum, suffixNum | 票据金额范围 |

**commonTypeField 使用示例：**
```vue
<common-type-field 
  v-model="formItem.usedLimitAmt" 
  :label="$t('m.i.pc.usedLimitAmt')"
  prop="usedLimitAmt">
</common-type-field>
```

**commonTypeFieldRange 使用示例：**
```vue
<common-type-field-range 
  v-model="formItem" 
  :label="$t('m.i.pe.deductAmt')" 
  :integerNum="2"
  :suffixNum="4" 
  :rangeProps="['minDeductAmt','maxDeductAmt']"
  :validRules="rateRule">
</common-type-field-range>
```

**billMoneyRange 使用示例：**
```vue
<bill-money-range 
  v-model="formItem" 
  :rangeProps="['minBillMoney','maxBillMoney']">
</bill-money-range>
```

#### 9.2.5 利率框组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonRate | 通用利率框 | label, prop, integerNum, suffixNum, nonNegative | 利率输入 |
| commonRateRange | 通用利率范围框 | rangeProps, integerNum, suffixNum | 利率范围输入 |

**commonRate 使用示例：**
```vue
<!-- 输入框没有后置内容 -->
<common-rate 
  v-model="formItem.rate" 
  :label="$t('m.i.common.rate')" 
  prop="rate">
</common-rate>

<!-- 输入框有后置内容 -->
<common-rate v-model="formItem.rate" :label="$t('m.i.common.rate')" prop="rate">
  <div slot="append">
    <span v-if="formItem.rateType === '360'">(%)</span>
    <span v-if="formItem.rateType === '30'">(‰)</span>
    <span v-if="formItem.rateType === '1'">(‱)</span>
  </div>
</common-rate>
```

**commonRateRange 使用示例：**
```vue
<common-rate-range 
  v-model="formItem" 
  :label="$t('m.i.be.tradRate')" 
  :rangeProps="['minRate','maxRate']"
  :validRules="rateRule">
</common-rate-range>
```

#### 9.2.6 日期框组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonDatePicker | 通用日期框 | type, format, rangeValue | 日期选择，支持多种类型 |
| commonTimePicker | 通用时间框 | type, format | 时间选择 |
| remitDtRange | 出票日期 | type, minRemitDt.sync, maxRemitDt.sync | 出票日期选择 |
| dueDtRange | 汇票到期日 | type, minDueDt.sync, maxDueDt.sync | 汇票到期日选择 |

**commonDatePicker 使用示例：**
```vue
<!-- 单日期选择 -->
<common-date-picker 
  v-model="formItem.settleDt" 
  :label="$t('m.i.be.settleDt')" 
  prop="settleDt">
</common-date-picker>

<!-- 日期范围选择 -->
<common-date-picker 
  v-model="settleDt" 
  :label="$t('m.i.be.settleDt')" 
  prop="settleDt" 
  type="daterange" 
  :rangeValue="['minSettleDt','maxSettleDt']"
  :minSettleDt.sync="formItem.minSettleDt" 
  :maxSettleDt.sync="formItem.maxSettleDt">
</common-date-picker>
```

**remitDtRange 使用示例：**
```vue
<!-- 单日期选择 -->
<remit-dt-range v-model="formItem.remitDt" type="date"></remit-dt-range>

<!-- 日期范围选择 -->
<remit-dt-range 
  v-model="remitDt" 
  :minRemitDt.sync="formItem.minRemitDt" 
  :maxRemitDt.sync="formItem.maxRemitDt">
</remit-dt-range>
```

**dueDtRange 使用示例：**
```vue
<!-- 单日期选择 -->
<due-dt-range v-model="formItem.dueDt" type="date"></due-dt-range>

<!-- 日期范围选择 -->
<due-dt-range 
  v-model="dueDt" 
  :minDueDt.sync="formItem.minDueDt" 
  :maxDueDt.sync="formItem.maxDueDt">
</due-dt-range>
```

#### 9.2.7 单选框组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| isCommitRadio | 是否已提交互斥单选框 | label, prop, radioLabel, radioCustomLabel | 提交状态选择 |

**isCommitRadio 使用示例：**
```vue
<is-commit-radio 
  v-model="formItem.isCommit" 
  prop="isCommit"
  @on-click="isCommitButton">
</is-commit-radio>
```

```javascript
// 注意：不绑定prop，重置对该组件不生效；绑定prop，重置对该组件生效
isCommitButton(isCommit, val) {
  if(isCommit === "hasCommit"){
    this.hasCommit = true;
    this.noCommit = false;
  }else {
    this.noCommit = true;
    this.hasCommit = false;
  }
  this.handleSearch();
}
```

#### 9.2.8 弹窗组件

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonTree | 通用树弹窗 | commonTreeWin, ifcheck, url, required | 树形结构选择 |
| cpesBranchMsgbox | 票交机构弹窗 | showCpesBranchWin, selectType | 票交机构选择 |
| custCorpMsgBox | 企业客户弹窗 | showCustCorpWin, custCorpParams, selectType, isBreakGroup | 企业客户选择 |

**commonTree 使用示例：**
```vue
<common-tree 
  :commonTreeWin="showTransBrchTypeWin" 
  title="查询机构类型" 
  :ifcheck="true" 
  :isFilterChildren="true" 
  @treeSelectedChange="transBrchTypeChange" 
  @commonTreeWinClose="showTransBrchTypeWinClose" 
  :checkedDataArr="transBrchTypesArr"     
  url="/be/market/clickdeal/credit/creditManage/func_buildBrchTypeTree" 
  required>
</common-tree>
```

**cpesBranchMsgbox 使用示例：**
```vue
<!-- 单选 -->
<cpes-branch-msgbox 
  :showCpesBranchWin="showCpesBranch"  
  @cpesBranchWinClose="cpesBranchWinClose" 
  @cpesBranchChange="cpesBranchChange">
</cpes-branch-msgbox>

<!-- 复选 -->
<cpes-branch-msgbox 
  :showCpesBranchWin="showCpesBranch1"  
  @cpesBranchWinClose="cpesBranchWinClose" 
  @cpesBranchChange="cpesBranchChange" 
  selectType="check">
</cpes-branch-msgbox>
```

**custCorpMsgBox 使用示例：**
```vue
<!-- 单选 -->
<cust-corp-msg-box 
  :showCustCorpWin="showCustCorpMainWin"
  :custCorpParams="custCorpParams" 
  @custCorpWinClose="custCorpWinClose"
  @custCorpChange="custCorpChange">
</cust-corp-msg-box>

<!-- 复选 -->
<cust-corp-msg-box 
  :showCustCorpWin="showCustCorpMainWin"
  :custCorpParams="custCorpParams" 
  @custCorpWinClose="custCorpWinClose"
  @custCorpChange="custCorpChange" 
  selectType="check">
</cust-corp-msg-box>

<!-- 解除集团总部客户信息 -->
<cust-corp-msg-box 
  :showCustCorpWin="showCustCorpWin" 
  :isBreakGroup="true"
  :custCorpParams="custCorpParams" 
  title="解除集团总部下客户集团关系"
  @custCorpWinClose="custCorpWinClose()">
</cust-corp-msg-box>
```

#### 9.2.9 通用业务组件（弹出框）

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| simpleSelectLink | 联想组件 | v-model, @on-change | 与机构、企业客户等配合使用 |
| showBranch | 机构弹出框 | brchNo.sync, brchName.sync, isSelectRequired, msgBoxWin | 机构选择，支持联想 |
| showEcdsBranch | ECDS机构弹出框 | brchNo.sync, brchName.sync, msgBoxWin | ECDS机构选择 |
| showCpesBranch | 票交机构弹出框 | cpesBrchNo.sync, cpesBrchName.sync, msgBoxWin | 票交机构选择 |
| showCustCorp | 企业客户弹出框 | custCorpNo.sync, custCorpName.sync, msgBoxWin | 企业客户选择 |
| showProduct | 产品名称弹出框 | prodNo.sync, prodName.sync, msgBoxWin | 产品名称选择 |

**showBranch 使用示例：**
```vue
<!-- 主界面调用 -->
<show-branch 
  v-model="formItem.brchName" 
  :brchNo.sync="formItem.brchNo"
  :brchName.sync="formItem.brchName" 
  isSelectRequired 
  :showCheckBox="false"
  @brchNoChange="brchNoChange">
</show-branch>

<!-- 弹窗界面调用：必须传入msgBoxWin属性 -->
<h-msg-box v-model="addOrEditWin" width="800" class="h-form-search-layer" :maximize="true" :mask-closable="false">
  <p slot="header">
    <span v-if="type==='add'">新增客户信息</span>
    <span v-if="type==='modify'">修改客户信息</span>
  </p>
  <h-panel>
    <h-form :model="addForm" :label-width="120" ref="addForm" cols="2" class="h-form-search">
      <show-branch 
        v-model="addForm.brchName" 
        :brchNo.sync="addForm.brchNo"
        :brchName.sync="addForm.brchName" 
        :msgBoxWin="addOrEditWin">
      </show-branch>        
    </h-form>
  </h-panel>
  <div slot="footer">
    <!-- 按钮 -->
  </div>
</h-msg-box>
```

```javascript
methods: {
  brchNoChange(info) {
    if(info.length > 0) {
      this.addForm.bankNo = info[0].bankNo;
    } else {//点击清空按钮
      this.addForm.bankNo = "";
    }
  }
}
```

#### 9.2.10 通用树形弹框组件（commonTree）

**【重要】** commonTree 是机构树选择弹框组件，用于在弹窗中选择机构节点。当启用搜索功能时，需特别注意查询/重置按钮的布局方式。

| 组件名 | 用途 | 关键属性 | 使用场景 |
|--------|------|---------|---------|
| commonTree | 通用树形弹框 | title, url, params, showSearch, ifcheck, commonTreeWin | 机构/菜单等树形数据选择 |

**布局结构规范：**

当 `showSearch=true` 启用搜索功能时，必须采用以下布局结构，避免按钮与树内容重叠：

```vue
<template>
  <h-msg-box v-model="tempCommonTreeWin" :mask-closable="false"
             :maximize="true" @on-maximize="getTreeHeight($event, 'commonTreeMsg')" ref="commonTreeMsg">
    <p slot="header">
      <span>{{title}}</span>
    </p>
    <div class="h-tree-search">
      <!-- 第一区域：操作按钮栏（展开/收缩/联动等） -->
      <div class="h-modal-header-wrapper">
        <div class="h-modal-header-btn">
          <h-button type="primary" @click='expandTree(filteredTreeDataList)'>
            {{$t("m.i.common.expand")}}
          </h-button>
          <h-button type="primary" @click='unExpandTree(filteredTreeDataList)'>
            {{$t("m.i.common.noExpand")}}
          </h-button>
          <slot name="checkStrictly" v-if="isTree"></slot>
          <slot></slot>
        </div>
      </div>

      <!-- 第二区域：搜索表单 + 操作按钮（独立容器，避免与树重叠） -->
      <div v-if="showSearch" class="h-modal-search-form">
        <h-form :model="searchForm" :label-width="80" ref="searchFormRef" cols="3" class="h-form-search">
          <h-form-item :label="$t('m.i.common.brchNo')" prop="brchNo">
            <h-input v-model="searchForm.brchNo" :maxlength="10"></h-input>
          </h-form-item>
          <h-form-item :label="$t('m.i.auth.brchLevel')" prop="brchLevel">
            <h-select v-model="searchForm.brchLevel" filterable clearable>
              <h-option v-for="item in brchLevelOptions" :value="item.value" :key="item.value">{{item.label}}</h-option>
            </h-select>
          </h-form-item>
          <h-form-item :label="$t('m.i.common.brchName')" prop="brchName">
            <h-input v-model="searchForm.brchName" :maxlength="60"></h-input>
          </h-form-item>
        </h-form>
        <!-- 按钮独立一行，使用 flexbox 布局 -->
        <div class="h-modal-search-operate">
          <h-button type="primary" @click="handleSearch()">{{$t("m.i.common.search")}}</h-button>
          <h-button type="ghost" @click="handleReset()">{{$t("m.i.common.reset")}}</h-button>
        </div>
      </div>

      <!-- 第三区域：树内容 -->
      <div class="h-tree-content" :style="{height: mTreeHeight + 'px'}">
        <h-tree :data="filteredTreeDataList" ref='treeRef' ...></h-tree>
      </div>
    </div>
    <div slot="footer">
      <h-button type="ghost" @click="handleClose">{{$t("m.i.common.close")}}</h-button>
      <h-button type="primary" @click="submitForm">{{$t("m.i.common.commit")}}</h-button>
    </div>
  </h-msg-box>
</template>
```

**样式规范（scoped）：**

```css
<style scoped>
/* 搜索表单容器：独立区域，与树内容分离 */
.h-modal-search-form {
  padding: 8px 12px;
  background: #f8f8f8;
  border-bottom: 1px solid #e8eaec;
}

/* 操作按钮区：flexbox 布局，避免浮动导致重叠 */
.h-modal-search-operate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
</style>
```

**高度计算调整：**

启用搜索功能时，需增加搜索区域的高度估算值：

```javascript
getTreeHeight(isMax, msgRef) {
  this.$nextTick(() => {
    if (isMax) {
      let headerHeight = this.$refs[msgRef].$el.getElementsByClassName('h-modal-header')[0].offsetHeight;
      let footerHeight = this.$refs[msgRef].$el.getElementsByClassName('h-modal-footer')[0].offsetHeight;
      let headerBtnHeight = this.$refs[msgRef].$el.getElementsByClassName('h-modal-header-wrapper')[0].offsetHeight;
      // 搜索表单区域高度：两行布局约110px，根据实际情况调整
      let searchFormHeight = this.showSearch ? 110 : 0;
      let mTreeHeight = window.innerHeight - headerHeight - footerHeight - headerBtnHeight - searchFormHeight - 20;
      this.mTreeHeight = mTreeHeight;
    } else {
      this.mTreeHeight = 300;
    }
  });
}
```

**【核心要点】**

| 要点 | 说明 |
|------|------|
| 按钮独立容器 | 查询/重置按钮必须在 `h-form` 外部，使用独立的 `div` 容器 |
| 禁止 h-form-operate | 不要将按钮放在 `h-form-item class="h-form-operate"` 中，会导致绝对定位偏移 |
| 使用 flexbox | 按钮容器使用 `display: flex` + `gap` 控制间距，避免 `float` 导致的重叠 |
| 区域分隔 | 搜索区域添加背景色和底边框，与树内容视觉分离 |
| 高度适配 | 搜索区域高度需计入树高度计算，避免树被截断 |

**常见错误示例（禁止）：**

```vue
<!-- ❌ 错误：按钮在表单内部，会导致位置异常或与树重叠 -->
<h-form cols="3" class="h-form-search">
  <h-form-item label="机构号">...</h-form-item>
  <h-form-item label="机构级别">...</h-form-item>
  <h-form-item label="机构名称">...</h-form-item>
  <!-- 禁止这种写法 -->
  <h-form-item class="h-form-operate one-form">
    <h-button>查询</h-button>
    <h-button>重置</h-button>
  </h-form-item>
</h-form>
```

#### 9.2.11 侧边栏树搜索表单（左侧窄栏布局）

**【重要】** 当树组件位于左侧边栏（窄栏）时，搜索表单采用**单列布局 + 按钮居中**的方式。

**布局结构规范：**

```vue
<template>
  <div class="layout-menu-left">
    <!-- 树搜索表单：单列布局，按钮居中 -->
    <div class="h-sidebar-menutree-header h-sidebar-search-form">
      <h-form :model="treeSearchForm" :label-width="70" ref="treeSearchForm" cols="1" class="h-form-search">
        <h-form-item :label="$t('m.i.common.brchNo')" prop="brchNo">
          <h-input v-model="treeSearchForm.brchNo" :maxlength="10" size="small"></h-input>
        </h-form-item>
        <h-form-item :label="$t('m.i.auth.brchLevel')" prop="brchLevel">
          <h-select v-model="treeSearchForm.brchLevel" filterable clearable size="small">
            <h-option v-for="item in brchLevelOptions" :value="item.value" :key="item.value">{{item.label}}</h-option>
          </h-select>
        </h-form-item>
        <h-form-item :label="$t('m.i.common.brchName')" prop="brchName">
          <h-input v-model="treeSearchForm.brchName" :maxlength="60" size="small"></h-input>
        </h-form-item>
      </h-form>
      <!-- 按钮独立一行，居中显示 -->
      <div class="h-sidebar-search-operate">
        <h-button type="primary" size="small" @click="handleSearch()">{{$t("m.i.common.search")}}</h-button>
        <h-button type="ghost" size="small" @click="handleReset()">{{$t("m.i.common.reset")}}</h-button>
      </div>
    </div>

    <!-- 树操作按钮：展开/收缩 -->
    <div class="h-sidebar-menutree-header" style="padding: 0 10px 10px; text-align: center;">
      <h-button type="primary" @click="expandTree(branchList)" style="margin-right: 5px;">
        {{$t("m.i.common.expand")}}
      </h-button>
      <h-button type="primary" @click="unExpandTree(branchList)">
        {{$t("m.i.common.noExpand")}}
      </h-button>
    </div>

    <!-- 树主体 -->
    <div class="h-tree-search h-sidebar-menutree">
      <div class="h-sidebar-menutree-body">
        <h-tree :data="filteredBranchList" ...></h-tree>
      </div>
    </div>
  </div>
</template>
```

**样式规范（scoped）：**

```css
<style scoped>
.h-sidebar-search-form {
  padding: 10px;
}
.h-sidebar-search-operate {
  display: flex;
  justify-content: center;  /* 按钮居中 */
  align-items: center;
  gap: 8px;               /* 按钮间距 */
  margin-top: 4px;        /* 与表单间距 */
}
</style>
```

**与弹框树组件的区别：**

| 对比项 | 弹框树（9.2.10） | 侧边栏树（9.2.11） |
|--------|-----------------|-------------------|
| 布局宽度 | 宽屏 | 窄栏（左侧边栏） |
| 表单列数 | `cols="3"` | `cols="1"` 单列 |
| 按钮对齐 | 左对齐 (`text-align: left`) | 居中 (`justify-content: center`) |
| 输入框尺寸 | 默认尺寸 | `size="small"` 小尺寸 |
| 区域分隔 | 有背景色+边框 | 无（紧凑布局） |

### 9.3 通用组件

#### 9.3.1 表单查询按钮（queryBtn）

**使用示例：**
```vue
<query-btn @on-search="handleSearch" @on-reset="resetSearch"></query-btn>
```

#### 9.3.2 表格组件（Hdatagrid）

**使用示例：**
```vue
<h-datagrid 
  :columns="columns"
  highlightRow
  url="/hnnxbank/模块路径/查询方法"
  :bindForm="formItem"
  ref="datagrid">
  <div slot="toolbar" class="pull-left">
    <h-button type="primary" @click="handleAdd()" v-if="authObj.add">
      {{$t("m.i.common.add")}}
    </h-button>
    <h-button type="primary" @click="handleModify()" v-if="authObj.modify">
      {{$t("m.i.common.modify")}}
    </h-button>
    <h-button type="primary" @click="handleDelete()" v-if="authObj.delete">
      {{$t("m.i.common.delete")}}
    </h-button>
  </div>
</h-datagrid>
```

### 9.4 组件使用原则

**【强制】** 优先使用项目已有的业务组件，避免重复开发

**【推荐】** 不常用字段可直接使用通用组件（commonInput、commonSelect、commonDatePicker等）

**【强制】** 使用组件时必须正确绑定v-model和必要的属性

**【推荐】** 对于需要后台数据源的下拉组件，使用paramsMap属性映射key-value字段

**【强制】** 弹窗组件在弹窗界面调用时，必须传入msgBoxWin属性

**【推荐】** 日期范围选择时，使用.sync修饰符配合rangeValue属性，确保数据同步和格式化

---

## 10. 国际化规范

### 10.1 基本原则

**【强制】** 所有按钮名称、文本必须写入国际化文件

**【强制】** 禁止在模板文件中直接硬编码文本

**【强制】** 遵循国际化键值（key）的现有命名规范

### 10.2 国际化文件位置

- 中文：`frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js`
- 英文：`frontend/src/views/bizViews/banks/hnnxbank/locale/lang/en-US.js`

### 10.3 使用方式

```vue
<!-- 模板中使用 -->
<template>
  <h-button>{{$t("m.i.common.search")}}</h-button>
  <span>{{$t("m.i.bill.billNo")}}</span>
</template>
```

```javascript
// JS 中使用
this.$Message.error(this.$t("m.i.common.chooseOneData"));
```

### 10.4 命名规范

```javascript
export default {
  m: {
    i: {
      common: {
        search: '查询',
        reset: '重置',
        add: '新增',
        edit: '编辑',
        delete: '删除',
        save: '保存',
        cancel: '取消',
        confirm: '确认',
        input: '请输入',
        select: '请选择',
        chooseOneData: '请选择一条数据'
      },
      bill: {
        billNo: '票据号码',
        billMoney: '票面金额',
        billType: '票据类型'
      }
    }
  }
}
```

---

## 11. 性能优化指南

### 11.1 循环优化

**【推荐】** 预先缓存数组长度：

```javascript
for (var i = 0, len = arr.length; i < len; i++) {
  // ...
}
```

### 11.2 局部变量优化

局部变量的速度要比全局变量的访问速度更快

### 11.3 对象查找优化

减少对象查找次数，使用局部变量缓存：

```javascript
// 不推荐
a.b.c.d.e

// 推荐
const temp = a.b.c;
temp.d.e;
```

### 11.4 字符串连接优化

```javascript
// 不推荐
s += a;
s += b;
s += c;

// 推荐
s += a + b + c;

// 收集字符串时
var buf = new Array();
for (var i = 0; i < 100; i++) {
  buf.push(i.toString());
}
var all = buf.join("");
```

### 11.5 正则表达式优化

对字符串进行循环操作，譬如替换、查找，应使用正则表达式

### 11.6 DOM 操作优化

**【推荐】** 使用 document.createElement() 方法创建 DOM 节点

**【推荐】** 如果需要创建很多元素，应该先准备一个样板节点，使用 cloneNode() 方法

---

## 12. 最佳实践

### 12.1 代码格式

| 项目 | 规范 | 说明 |
|------|------|------|
| 缩进 | 2 个空格 | 不使用 Tab |
| 行长度 | ≤ 120 字符 | 超长时进行换行 |
| 引号 | HTML 使用双引号，JS 使用单引号 | 统一风格 |
| 分号 | JS 语句结尾不需要分号 | 与 Prettier 一致 |
| 空行 | 方法间空一行 | 提高可读性 |

### 12.2 导入顺序

```javascript
// 1. 核心库
import Vue from 'vue';

// 2. 第三方库
import { post, on, off } from "@/api/bizApi/commonUtil";

// 3. 本地组件
import CustomComponent from './components/CustomComponent';

// 4. 本地工具
import { formatDate } from '@/utils/dateUtil';

// 5. 本地样式
import './styles/index.scss';
```

### 12.3 注释规范

#### 12.3.1 文件头注释

```javascript
/**
 * 机构管理页面
 * @description 实现机构的增删改查、角色分配等功能
 * @author [作者姓名]
 * @date [创建日期]
 * @version 1.0.0
 */
```

#### 12.3.2 方法注释

```javascript
/**
 * 搜索处理
 * @description 根据查询条件搜索数据
 * @param {String} searchType 搜索类型
 */
handleSearch(searchType) {
  // 实现代码
}
```

### 12.4 错误处理

```javascript
// 校验目标机构号是否为空
if (!this.copyRoleForm.targetBrchNo) {
  this.$Message.error(this.$t('m.i.common.targetBrchNoRequired'));
  return;
}
```

### 12.5 个性化开发目录

**【强制】** 所有前端代码仅允许在以下目录开发：

- `frontend/src/views/bizViews/banks/hnnxbank`
- `frontend/src/api/bank/hnnxbankIndex.js`

**【强制】** 禁止在其他目录开发前端代码

### 12.6 组件复用

**【推荐】** 检查 `frontend/src/views/bizViews/banks/hnnxbank` 目录，若有产品化 vue 对应的个性化 vue 文件则复用

**【推荐】** 无对应个性化 vue 文件时，新增 vue，名称和目录结构与原产品化文件一致

### 12.7 路径映射

**【强制】** 路径映射在 `frontend/src/api/bank/hnnxbankIndex.js` 中维护

---

## 附录 A. 恒生电子前端编码规范补充

本章节内容来源于恒生电子前端编码规范，作为河南农信 BEMP 前端开发规范的补充。

### A.1 约束等级定义

| 约束等级 | 约束效力 | 强制性 |
|---------|---------|--------|
| 【强制】 | 违反该项将被认为代码存在严重缺陷 | 必须遵守 |
| 【推荐】 | 违反该项即被认为代码存在轻微缺陷 | 根据具体产品特性的不同，选择性遵守 |
| 【参考】 | 违反该项可被认为代码存在优化空间 | 从产品持续优化及人员技能提升的角度，参考使用 |

### A.2 HTML/Template 开发规范补充

#### A.2.1 HTML5 Doctype

**【强制】** 在页面开头使用这个简单地 doctype 来启用标准模式，使其在每个浏览器中尽可能一致的展现。

```html
<!DOCTYPE html>
<html>
  ...
</html>
```

#### A.2.2 语言属性

**【推荐】** 根据 HTML5 规范，应在 html 标签上加上 lang 属性。

```html
<html lang="zh-CN">
```

#### A.2.3 字符编码

**【强制】** 通过声明一个明确的字符编码，让浏览器轻松、快速的确定适合网页内容的渲染方式。

```html
<meta charset="UTF-8">
```

#### A.2.4 引入 CSS 和 JavaScript 文件

**【推荐】** 根据 HTML5 规范，通常在引入 CSS 和 JavaScript 文件时不需要指明 type 属性，因为 text/css 和 text/javascript 分别是它们的默认值。

```html
<!-- External CSS -->
<link rel="stylesheet" href="code-guide.css">

<!-- In-document CSS -->
<style>
  /* ... */
</style>

<!-- JavaScript -->
<script src="code-guide.js"></script>
```

#### A.2.5 减少标签数量

**【推荐】** 在编写 HTML 代码时，需要尽量避免多余的父节点，很多时候，需要通过迭代和重构来使 HTML 更少。

```html
<!-- Not so great -->
<span class="avatar">
  <img src="...">
</span>

<!-- Better -->
<img class="avatar" src="...">
```

#### A.2.6 属性顺序（补充）

**【参考】** 属性应该按照特定的顺序出现以保证易读性：

1. `class`
2. `id`, `name`
3. `data-*`
4. `src`, `for`, `type`, `href`, `value`
5. `title`, `alt`, `placeholder`
6. `role`, `aria-*`
7. `disabled`, `readonly`, `required`
8. `v-model`, `v-bind`, `v-on`

#### A.2.7 语义化

**【推荐】** HTML 标签的使用应该符合语义化原则，根据标签的语义而非样式来选择标签：

| 标签 | 用途 |
|------|------|
| `<header>` | 页面或区块的头部 |
| `<nav>` | 导航区域 |
| `<main>` | 主要内容区域 |
| `<article>` | 独立的内容块 |
| `<section>` | 文档中的节 |
| `<aside>` | 侧边栏内容 |
| `<footer>` | 页面或区块的底部 |

#### A.2.8 多媒体回溯

**【推荐】** 对多媒体元素提供回溯方案，如 `<video>` 和 `<audio>` 元素需要后备内容。

```html
<video width="320" height="240" controls>
  <source src="movie.mp4" type="video/mp4">
  <source src="movie.ogg" type="video/ogg">
  您的浏览器不支持 video 标签。
</video>
```

### A.3 CSS/LESS/SASS 开发规范补充

#### A.3.1 样式兼容性

**【推荐】** 遵循以下原则处理浏览器兼容性：

1. 遵循 CSS 标准规范
2. 尽量少用 Hack
3. 使用特性检测而非浏览器检测

#### A.3.2 选择器权重（补充）

| 选择器类型 | 权重值 |
|-----------|--------|
| 行内样式 | 1000 |
| ID 选择器 | 100 |
| 类选择器、属性选择器、伪类 | 10 |
| 元素选择器、伪元素 | 1 |

**【强制】** 无法修改原样式声明时，应通过权重关系，编写权重更高的样式进行覆盖。

#### A.3.3 声明简写

**【推荐】** 尽量限制使用简写形式的属性声明，常见的需要简写的属性：

```css
/* 推荐 */
border-top: 0;
font: 100%/1.6 palatino, georgia, serif;
background: transparent;

/* 不推荐 */
border-top-style: none;
font-family: palatino, georgia, serif;
font-size: 100%;
line-height: 1.6;
background-color: transparent;
```

#### A.3.4 CSS 动画

**【推荐】** CSS 动画规范：

1. 尽量使用 CSS3 动画代替 JavaScript 动画
2. 使用 transform 和 opacity 实现动画，避免使用 left、top 等属性
3. 为动画元素开启 GPU 加速：`transform: translateZ(0)`

#### A.3.5 Hack 规范

**【强制】** 当需要 Hack 时，应该统一使用如下方式：

```css
/* IE6 */
_selector { property: value; }

/* IE6/7 */
*selector { property: value; }

/* IE6/7/8/9/10 */
selector { property: value\9; }

/* IE8/9/10 */
selector { property: value\0; }

/* IE9/10 */
selector { property: value\9\0; }
```

#### A.3.6 字体规则

**【推荐】** 字体声明规范：

```css
/* 字体声明顺序 */
font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

### A.4 JS/ES6 开发规范补充

#### A.4.1 数组、对象（补充）

**【强制】** 使用字面量创建对象和数组：

```javascript
// 推荐
let obj = {};
let arr = [];

// 不推荐
let obj = new Object();
let arr = new Array();
```

**【强制】** 对象属性名不需要加引号，除非属性名是保留字或包含特殊字符：

```javascript
// 推荐
let obj = {
  name: 'test',
  age: 18
};

// 需要加引号的情况
let obj = {
  'class': 'test',
  'data-id': '123'
};
```

#### A.4.2 使用 null（补充）

**【强制】** null 的适用场景：

- 初始化一个将来可能被赋值为对象的变量
- 与已经初始化的变量做比较
- 作为一个参数为对象的函数的调用传参
- 作为一个返回对象的函数的返回值

**【强制】** 不要用 null 来判断函数调用时有无传参

**【强制】** 不要与未初始化的变量做比较

### A.5 Vue 开发规范补充

#### A.5.1 组件/实例选项顺序（补充）

**【参考】** 组件/实例的选项应该有统一的顺序：

1. **副作用**（触发组件外的影响）：el
2. **全局感知**（要求组件以外的知识）：name, parent
3. **组件类型**（更改组件的类型）：functional
4. **模板修改器**（改变模板的编译方式）：delimiters, comments
5. **模板依赖**（模板内使用的资源）：components, directives, filters
6. **组合**（向选项里合并属性）：extends, mixins
7. **接口**（组件的接口）：inheritAttrs, model, props/propsData
8. **本地状态**（本地的响应式属性）：data, computed
9. **事件**（通过响应式事件触发的回调）：watch
10. **方法**（组件的方法）：methods
11. **生命周期钩子**（按照它们被调用的顺序）：beforeCreate, created, beforeMount, mounted, beforeUpdate, updated, activated, deactivated, beforeDestroy, destroyed

#### A.5.2 元素特性顺序

**【参考】** 元素特性（包括组件）应该有统一的顺序：

1. **定义**：is
2. **列表渲染**：v-for
3. **条件渲染**：v-if, v-else-if, v-else, v-show, v-cloak
4. **渲染方式**：v-pre, v-once
5. **全局感知**：id
6. **唯一的特性**：ref, key, v-slot, slot
7. **双向绑定**：v-model
8. **其它特性**：所有普通的绑定或未绑定的特性
9. **事件**：v-on
10. **内容**：v-html, v-text

#### A.5.3 单文件组件顶级元素顺序

**【推荐】** 单文件组件的顶级元素顺序：

```vue
<template>...</template>
<script>...</script>
<style>...</style>
```

### A.6 前端请求调用规范

#### A.6.1 请求方式规范

**【强制】** 使用统一的请求工具类进行 API 调用：

```javascript
import { post, get } from "@/api/bizApi/commonUtil";

// POST 请求
post('/api/url', data).then(res => {
  // 处理响应
}).catch(err => {
  // 处理错误
});

// GET 请求
get('/api/url', params).then(res => {
  // 处理响应
});
```

#### A.6.2 请求路径规范

**【强制】** 个性化接口路径必须以 `/hnnxbank` 开头：

```javascript
// 正确
post('/hnnxbank/sm/auth/branch/query', data);

// 错误
post('/sm/auth/branch/query', data);
```

#### A.6.3 请求参数规范

**【推荐】** 请求参数应使用 BaseRequest 包装：

```javascript
let req = {
  opCode: 'BISM010101',
  version: '1.0',
  reqFlowNo: generateFlowNo(),
  channelNo: '01',
  requestDto: data
};

post('/hnnxbank/xxx', req).then(res => {
  // 处理响应
});
```

#### A.6.4 响应处理规范

**【强制】** 统一处理响应结果：

```javascript
post('/hnnxbank/xxx', data).then(res => {
  if (res.success) {
    // 成功处理
    this.$Message.success(this.$t('m.i.common.success'));
  } else {
    // 失败处理
    this.$Message.error(res.message || this.$t('m.i.common.fail'));
  }
}).catch(err => {
  // 异常处理
  this.$Message.error(this.$t('m.i.common.networkError'));
});
```

#### A.6.5 错误处理规范

**【强制】** 必须对请求进行错误处理：

```javascript
post('/hnnxbank/xxx', data)
  .then(res => {
    // 成功处理
  })
  .catch(err => {
    // 错误处理
    console.error('请求失败:', err);
    this.$Message.error(this.$t('m.i.common.requestFail'));
  });
```

#### A.6.6 并发请求规范

**【推荐】** 需要同时发起多个请求时，使用 Promise.all：

```javascript
Promise.all([
  post('/hnnxbank/api1', data1),
  post('/hnnxbank/api2', data2)
]).then(([res1, res2]) => {
  // 处理两个请求的结果
});
```


---

## 13. HUI 组件文档查询规范

### 13.1 基本原则

**【强制】** 在前端开发过程中，凡涉及 H-UI 组件（`h-form`、`h-datagrid`、`h-button`、`h-msg-box`、`h-input`、`h-select`、`h-tree` 等）的使用，必须先通过 `hui_doc` MCP 服务平台查询该组件的完整官方文档，确保组件使用的准确性和规范性。

**【强制】** 禁止凭记忆或猜测使用组件 API，必须以官方文档为唯一权威来源。组件 API 可能因版本升级而发生变化，历史经验不一定适用于当前版本。

**【强制】** 查询内容包括但不限于：组件属性（props）、方法（methods）、事件（events）、插槽（slots）、使用示例及最佳实践。

### 13.2 可用工具

`hui_doc` MCP 提供以下三个核心工具：

| 工具名 | 用途 | 参数 |
|--------|------|------|
| `mcp_hui_doc_get-components-list` | 获取所有可用组件列表（基础组件+扩展组件） | 无 |
| `mcp_hui_doc_get-base-component` | 查询某个 HUI 基础组件的详细使用文档 | `componentName`: 组件名称 |
| `mcp_hui_doc_get-extend-component` | 查询某个 HUI 扩展组件的详细使用文档 | `componentName`: 组件名称 |

### 13.3 查询工作流

**【强制】** 前端开发中 HUI 组件文档查询遵循以下流程：

```
1. 需求分析 → 明确当前页面需要使用的 H-UI 组件清单
       ↓
2. 组件列表查询 → 调用 mcp_hui_doc_get-components-list 确认组件是否存在于 HUI 体系中
       ↓
3. 逐个查询文档 → 对每个需要使用的组件调用 mcp_hui_doc_get-base-component 或
                    mcp_hui_doc_get-extend-component 获取详细文档
       ↓
4. 确认 API 签名 → 核对组件属性类型、必填项、默认值、事件回调参数格式
       ↓
5. 参考示例实现 → 使用文档中提供的官方示例代码作为开发模板
```

### 13.4 查询策略

#### 13.4.1 按组件熟悉度分级

| 熟悉度 | 策略 | 说明 |
|--------|------|------|
| 不熟悉的组件 | 完整查阅文档 | 逐项阅读属性、方法、事件、插槽，理解组件设计意图和使用约束 |
| 比较熟悉的组件 | 确认关键属性 | 重点确认属性的默认值和类型签名，避免因版本差异导致 API 不一致 |
| 组合使用场景 | 多组件交叉查询 | 同时查询多个相关组件文档，确保组合使用的兼容性和数据流正确 |

#### 13.4.2 常见查询场景

**场景 1：使用表单组件 `h-form` 时**
```text
查询步骤：
1. mcp_hui_doc_get-base-component("form") → 获取 h-form 完整文档
2. 确认规则：model 属性类型、rules 校验规则格式、label-width 默认值
3. 确认子组件兼容性：h-form-item、h-input、h-select 的事件传递机制
```

**场景 2：使用数据表格 `h-datagrid` 时**
```text
查询步骤：
1. mcp_hui_doc_get-base-component("table") → 获取表格组件文档
2. 确认规则：columns 配置格式、url 参数传递方式、slot 插槽名称
3. 确认分页组件兼容性：h-page 的事件绑定和参数格式
```

**场景 3：不熟悉业务组件时**
```text
查询步骤：
1. mcp_hui_doc_get-components-list → 确认组件是否为基础组件还是扩展组件
2. 根据分类调用对应的文档查询工具
3. 重点阅读使用示例和最佳实践章节
```

### 13.5 文档查询产出物

**【推荐】** 每次组件文档查询完成后，在开发记录中留存以下信息：

| 产出物 | 说明 | 格式示例 |
|--------|------|---------|
| 组件名称 | 查询的组件名 | `h-form`、`h-datagrid` |
| 关键属性 | 实际使用的属性及其值 | `:model="formItem"`, `:label-width="90"` |
| 关键事件 | 绑定的事件回调 | `@on-select-change="handleSelectChange"` |
| 注意事项 | 文档中标注的约束条件 | `h-msg-box`中使用组件必须传 `msgBoxWin` |

### 13.6 错误预防

**【强制】** 以下情况视为违反规范，必须在代码审查中被发现和纠正：

| 违规行为 | 说明 | 后果 |
|---------|------|------|
| 未查文档直接使用组件 | 凭记忆编写组件代码 | 属性签名可能错误，导致运行时异常 |
| 忽略组件版本差异 | 复制老旧代码但未确认 API 是否有变化 | 升级 HUI 版本后功能异常 |
| 误用组件属性类型 | 传递了错误类型的值 | 控制台报错但难以定位 |

### 13.7 与项目已有组件的配合

**【推荐】** 项目已有业务组件（如 `commonInput`、`commonSelect`、`billNo` 等）大多基于 HUI 基础组件封装。在使用已有业务组件前，也应了解其底层 HUI 组件的约束条件：

1. 查看业务组件源码，确认其包裹了哪些 HUI 组件
2. 对底层 HUI 组件调用 `hui_doc` MCP 查询文档
3. 确保传递给业务组件的属性与底层 HUI 组件的预期签名一致

---

## 二、代码模板

# 河南农信 BEMP 前端开发模板

## 目录

- [1. 标准页面模板](#1-标准页面模板)
- [2. 批量操作模板](#2-批量操作模板)
- [3. 表格页面模板](#3-表格页面模板)
- [4. 表单页面模板](#4-表单页面模板)
- [5. 树形页面模板](#5-树形页面模板)
- [6. API 调用模板](#6-API-调用模板)
- [7. 测试用例模板](#7-测试用例模板)

---

## 1. 标准页面模板

```vue
<template>
  <div class="layout">
    <h-row name="flex" class="layout-menu-wrapper">
      <!-- 查询表单 -->
      <div class="h-form-search-box">
        <h-panel class="clearfix">
          <h-form :model="formItem" :label-width="90" ref="formItem" cols="4" class="h-form-search">
            <h-form-item prop="queryField1" :label="$t('m.i.common.field1')">
              <h-input v-model="formItem.queryField1" :maxlength="60"></h-input>
            </h-form-item>
            <h-form-item prop="queryField2" :label="$t('m.i.common.field2')">
              <h-input v-model="formItem.queryField2" :maxlength="60"></h-input>
            </h-form-item>
            <h-form-item class="h-form-operate">
              <h-button type="primary" @click="handleSearch()">{{$t("m.i.common.search")}}</h-button>
              <h-button type="ghost" @click="resetSearch()">{{$t("m.i.common.reset")}}</h-button>
            </h-form-item>
          </h-form>
        </h-panel>
      </div>
      
      <!-- 数据表格 -->
      <h-datagrid :columns="columns"
                  highlightRow
                  url="/hnnxbank/模块路径/查询方法"
                  :bindForm="formItem"
                  ref="datagrid">
        <div slot="toolbar" class="pull-left">
          <h-button type="primary" @click="handleAdd()" v-if="authObj.add">{{$t("m.i.common.add")}}</h-button>
          <h-button type="primary" @click="handleModify()" v-if="authObj.modify">{{$t("m.i.common.modify")}}</h-button>
          <h-button type="primary" @click="handleDelete()" v-if="authObj.delete">{{$t("m.i.common.delete")}}</h-button>
        </div>
      </h-datagrid>
    </h-row>

    <!-- 新增/修改弹窗 -->
    <h-msg-box v-model="addOrEditWin" width="800" class="h-form-search-layer" :maximize="true" :mask-closable="false">
      <p slot="header">
        <span v-if="type=='add'">新增</span>
        <span v-if="type=='modify'">修改</span>
      </p>
      <div>
        <h-form :model="addOrEditForm" :label-width="115" ref="addOrEditForm" cols="2" class="h-form-search">
          <h-form-item :label="$t('m.i.common.fieldName')" prop="fieldName" required>
            <h-input v-model="addOrEditForm.fieldName" :maxlength="60"></h-input>
          </h-form-item>
          <h-form-item :label="$t('m.i.common.fieldDesc')" prop="fieldDesc">
            <h-input v-model="addOrEditForm.fieldDesc" :maxlength="200"></h-input>
          </h-form-item>
        </h-form>
      </div>
      <div slot="footer">
        <h-button type="ghost" @click="addOrEditWinClose()">{{$t("m.i.common.close")}}</h-button>
        <h-button type="primary" @click="formSubmit()">{{$t("m.i.common.commit")}}</h-button>
      </div>
    </h-msg-box>
  </div>
</template>

<script>
  import { post, on, off } from "@/api/bizApi/commonUtil";
  
  export default {
    name: "customPageName",
    
    data() {
      return {
        // 查询条件
        formItem: {},
        // 表格列配置
        columns: [
          { title: this.$t('m.i.common.field1'), key: 'field1', width: 150 },
          { title: this.$t('m.i.common.field2'), key: 'field2', width: 150 },
          { 
            title: this.$t('m.i.common.operation'), 
            key: 'operation', 
            width: 200,
            render: (h, params) => {
              return h('div', [
                h('Button', {
                  props: { type: 'primary', size: 'small' },
                  style: { marginRight: '5px' },
                  on: {
                    click: () => {
                      this.handleModify(params.row);
                    }
                  }
                }, this.$t('m.i.common.modify')),
                h('Button', {
                  props: { type: 'error', size: 'small' },
                  on: {
                    click: () => {
                      this.handleDelete(params.row);
                    }
                  }
                }, this.$t('m.i.common.delete'))
              ]);
            }
          }
        ],
        // 新增/修改弹窗
        addOrEditWin: false,
        // 新增/修改表单
        addOrEditForm: {},
        // 操作类型：add/modify
        type: '',
        // 提交标志
        submitFlag: false
      };
    },
    
    computed: {
      // 权限对象
      authObj() {
        return this.$store.state.authObj || {};
      }
    },
    
    methods: {
      /**
       * 搜索处理
       */
      handleSearch() {
        this.$refs.datagrid.loadData();
      },
      
      /**
       * 重置搜索
       */
      resetSearch() {
        this.$refs.formItem.resetFields();
        this.handleSearch();
      },
      
      /**
       * 新增处理
       */
      handleAdd() {
        this.type = 'add';
        this.addOrEditForm = {};
        this.addOrEditWin = true;
      },
      
      /**
       * 修改处理
       */
      handleModify(row) {
        this.type = 'modify';
        this.addOrEditForm = Object.assign({}, row);
        this.addOrEditWin = true;
      },
      
      /**
       * 删除处理
       */
      handleDelete(row) {
        this.$Modal.confirm({
          title: this.$t('m.i.common.confirm'),
          content: this.$t('m.i.common.deleteConfirm'),
          onOk: () => {
            post('/hnnxbank/模块路径/delete', { id: row.id }).then(res => {
              if (res.success) {
                this.$Message.success(this.$t('m.i.common.deleteSuccess'));
                this.handleSearch();
              }
            }).catch(err => {
              this.$Message.error(this.$t('m.i.common.deleteFail'));
            });
          }
        });
      },
      
      /**
       * 表单提交
       */
      formSubmit() {
        this.$refs.addOrEditForm.validate((valid) => {
          if (valid) {
            this.submitFlag = true;
            const url = this.type === 'add' 
              ? '/hnnxbank/模块路径/add' 
              : '/hnnxbank/模块路径/modify';
            
            post(url, this.addOrEditForm).then(res => {
              this.submitFlag = false;
              if (res.success) {
                this.$Message.success(this.$t('m.i.common.success'));
                this.addOrEditWinClose();
                this.handleSearch();
              }
            }).catch(err => {
              this.submitFlag = false;
              this.$Message.error(this.$t('m.i.common.fail'));
            });
          }
        });
      },
      
      /**
       * 关闭弹窗
       */
      addOrEditWinClose() {
        this.addOrEditWin = false;
        this.$refs.addOrEditForm.resetFields();
      }
    },
    
    mounted() {
      // 初始化
    }
  };
</script>

<style scoped>
  .layout {
    height: 100%;
  }
</style>
```

---

## 2. 批量操作模板

```vue
<template>
  <div>
    <!-- 批量操作按钮 -->
    <h-button type="primary" @click="batchOperation()">
      {{$t("hnnxbank.m.i.auth.batchOperation")}}
    </h-button>
    
    <!-- 批量操作弹窗 -->
    <h-msg-box v-model="batchWin" :mask-closable="false" width="400" class="h-form-search-layer">
      <p slot="header">
        <span>{{$t("hnnxbank.m.i.auth.batchOperation")}}</span>
      </p>
      <div>
        <h-form :model="batchForm" :label-width="115" ref="batchForm" cols="1" class="h-form-search">
          <h-form-item :label="$t('m.i.common.targetNo')" prop="targetNo" required>
            <h-input v-model="batchForm.targetNo" placeholder="" icon="android-search"
                     @on-click="queryTarget()" readonly clearable @on-clear="clearTarget"></h-input>
          </h-form-item>
          <h-form-item :label="$t('m.i.common.targetName')" prop="targetName">
            <h-input v-model="batchForm.targetName" placeholder="" readonly></h-input>
          </h-form-item>
        </h-form>
      </div>
      <div slot="footer">
        <h-button type="ghost" @click="batchWinClose()">{{$t("m.i.common.close")}}</h-button>
        <h-button type="primary" v-if="submitFlag" disabled>{{$t("m.i.common.submiting")}}</h-button>
        <h-button type="primary" v-else @click="batchSubmit()">{{$t("m.i.common.commit")}}</h-button>
      </div>
    </h-msg-box>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        batchWin: false,
        batchForm: {
          targetNo: '',
          targetName: ''
        },
        submitFlag: false
      };
    },
    methods: {
      /**
       * 批量操作
       */
      batchOperation() {
        this.batchWin = true;
      },
      
      /**
       * 查询目标
       */
      queryTarget() {
        // 实现查询逻辑
      },
      
      /**
       * 清空目标
       */
      clearTarget() {
        this.batchForm.targetNo = '';
        this.batchForm.targetName = '';
      },
      
      /**
       * 批量提交
       */
      batchSubmit() {
        this.$refs.batchForm.validate((valid) => {
          if (valid) {
            this.submitFlag = true;
            post('/hnnxbank/模块路径/batchOperation', this.batchForm).then(res => {
              this.submitFlag = false;
              if (res.success) {
                this.$Message.success(this.$t('m.i.common.success'));
                this.batchWinClose();
              }
            }).catch(err => {
              this.submitFlag = false;
              this.$Message.error(this.$t('m.i.common.fail'));
            });
          }
        });
      },
      
      /**
       * 关闭弹窗
       */
      batchWinClose() {
        this.batchWin = false;
        this.$refs.batchForm.resetFields();
      }
    }
  };
</script>
```

---

## 3. 表格页面模板

```vue
<template>
  <div class="layout">
    <!-- 查询表单 -->
    <div class="h-form-search-box">
      <h-panel class="clearfix">
        <h-form :model="formItem" :label-width="90" ref="formItem" cols="4" class="h-form-search">
          <h-form-item prop="queryField1" :label="$t('m.i.common.field1')">
            <h-input v-model="formItem.queryField1" :maxlength="60"></h-input>
          </h-form-item>
          <h-form-item prop="queryField2" :label="$t('m.i.common.field2')">
            <h-input v-model="formItem.queryField2" :maxlength="60"></h-input>
          </h-form-item>
          <h-form-item class="h-form-operate">
            <h-button type="primary" @click="handleSearch()">{{$t("m.i.common.search")}}</h-button>
            <h-button type="ghost" @click="resetSearch()">{{$t("m.i.common.reset")}}</h-button>
          </h-form-item>
        </h-form>
      </h-panel>
    </div>
    
    <!-- 数据表格 -->
    <h-datagrid :columns="columns"
                highlightRow
                url="/hnnxbank/模块路径/查询方法"
                :bindForm="formItem"
                :onSelectChange="handleSelectClick"
                :onCurrentChange="handleCurrentChange"
                ref="datagrid">
      <div slot="toolbar" class="pull-left">
        <h-button type="primary" @click="handleAdd()" v-if="authObj.add">{{$t("m.i.common.add")}}</h-button>
        <h-button type="primary" @click="handleModify()" v-if="authObj.modify">{{$t("m.i.common.modify")}}</h-button>
        <h-button type="primary" @click="handleDelete()" v-if="authObj.delete">{{$t("m.i.common.delete")}}</h-button>
      </div>
    </h-datagrid>
    
    <!-- 分页 -->
    <div class="h-page-wrapper">
      <h-page :total="total" :page-size="pageSize" :current="currentPage" 
              @on-change="handlePageChange" @on-page-size-change="handlePageSizeChange"
              show-elevator show-sizer></h-page>
    </div>
  </div>
</template>

<script>
  import { post, on, off } from "@/api/bizApi/commonUtil";
  
  export default {
    name: "customTablePage",
    
    data() {
      return {
        // 查询条件
        formItem: {},
        // 表格列配置
        columns: [
          { type: 'selection', width: 60, align: 'center' },
          { title: this.$t('m.i.common.field1'), key: 'field1', width: 150 },
          { title: this.$t('m.i.common.field2'), key: 'field2', width: 150 }
        ],
        // 总记录数
        total: 0,
        // 每页条数
        pageSize: 20,
        // 当前页码
        currentPage: 1,
        // 选中行
        selectedRows: []
      };
    },
    
    computed: {
      // 权限对象
      authObj() {
        return this.$store.state.authObj || {};
      }
    },
    
    methods: {
      /**
       * 搜索处理
       */
      handleSearch() {
        this.$refs.datagrid.loadData();
      },
      
      /**
       * 重置搜索
       */
      resetSearch() {
        this.$refs.formItem.resetFields();
        this.handleSearch();
      },
      
      /**
       * 选中行变化
       */
      handleSelectClick(rows) {
        this.selectedRows = rows;
      },
      
      /**
       * 当前页变化
       */
      handleCurrentChange(current) {
        this.currentPage = current;
      },
      
      /**
       * 分页变化
       */
      handlePageChange(page) {
        this.currentPage = page;
        this.handleSearch();
      },
      
      /**
       * 每页条数变化
       */
      handlePageSizeChange(size) {
        this.pageSize = size;
        this.handleSearch();
      },
      
      /**
       * 新增处理
       */
      handleAdd() {
        // 实现新增逻辑
      },
      
      /**
       * 修改处理
       */
      handleModify() {
        // 实现修改逻辑
      },
      
      /**
       * 删除处理
       */
      handleDelete() {
        // 实现删除逻辑
      }
    }
  };
</script>
```

---

## 4. 表单页面模板

```vue
<template>
  <div class="layout">
    <h-msg-box v-model="visible" width="800" class="h-form-search-layer" :maximize="true" :mask-closable="false">
      <p slot="header">
        <span>{{title}}</span>
      </p>
      <div>
        <h-form :model="formItem" :label-width="115" ref="formItem" cols="2" class="h-form-search">
          <h-form-item :label="$t('m.i.common.field1')" prop="field1" required>
            <h-input v-model="formItem.field1" :maxlength="60"></h-input>
          </h-form-item>
          <h-form-item :label="$t('m.i.common.field2')" prop="field2" required>
            <h-input v-model="formItem.field2" :maxlength="60"></h-input>
          </h-form-item>
          <h-form-item :label="$t('m.i.common.field3')" prop="field3">
            <h-input v-model="formItem.field3" :maxlength="200"></h-input>
          </h-form-item>
          <h-form-item :label="$t('m.i.common.field4')" prop="field4">
            <h-input type="textarea" v-model="formItem.field4" :maxlength="500"></h-input>
          </h-form-item>
        </h-form>
      </div>
      <div slot="footer">
        <h-button type="ghost" @click="close()">{{$t("m.i.common.close")}}</h-button>
        <h-button type="primary" v-if="submitFlag" disabled>{{$t("m.i.common.submiting")}}</h-button>
        <h-button type="primary" v-else @click="submit()">{{$t("m.i.common.commit")}}</h-button>
      </div>
    </h-msg-box>
  </div>
</template>

<script>
  import { post } from "@/api/bizApi/commonUtil";
  
  export default {
    name: "customForm",
    
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      title: {
        type: String,
        default: ''
      }
    },
    
    data() {
      return {
        formItem: {},
        submitFlag: false
      };
    },
    
    methods: {
      /**
       * 提交处理
       */
      submit() {
        this.$refs.formItem.validate((valid) => {
          if (valid) {
            this.submitFlag = true;
            post('/hnnxbank/模块路径/submit', this.formItem).then(res => {
              this.submitFlag = false;
              if (res.success) {
                this.$Message.success(this.$t('m.i.common.success'));
                this.$emit('success');
                this.close();
              }
            }).catch(err => {
              this.submitFlag = false;
              this.$Message.error(this.$t('m.i.common.fail'));
            });
          }
        });
      },
      
      /**
       * 关闭处理
       */
      close() {
        this.visible = false;
        this.formItem = {};
        this.$refs.formItem.resetFields();
      }
    }
  };
</script>
```

---

## 5. 树形页面模板

```vue
<template>
  <div class="layout">
    <h-row name="flex" class="layout-menu-wrapper">
      <!-- 左侧树 -->
      <h-col :span="spanLeft" class="layout-menu-left">
        <div>
          <div class="h-tree-search h-sidebar-menutree">
            <div class="h-sidebar-menutree-header">
              <h-button type="primary" @click="handleExpandTree(branchList)" :disabled="isExpandDisabled">
                {{$t("m.i.common.expand")}}
              </h-button>
              <h-button type="primary" @click="handleUnExpandTree(branchList)" :disabled="isNotExpandDisabled">
                {{$t("m.i.common.noExpand")}}
              </h-button>
            </div>
            <div class="h-sidebar-menutree-body">
              <h-tree :data="branchList" :show-checkbox="false" @on-select-change="orgSelectChange"
                      :style="{height: mBarHeight-153 + 'px',overflow: 'auto'}" ref="branchTree"
                      @on-toggle-expand="toggleExpand"></h-tree>
            </div>
          </div>
        </div>
      </h-col>
      
      <!-- 右侧数据展示表格 -->
      <h-col :span="spanRight" class="layout-menu-right">
        <div>
          <!-- 查询表单 -->
          <div class="h-form-search-box">
            <h-panel class="clearfix">
              <h-form :model="formItem" :label-width="90" ref="formItem" cols="4" class="h-form-search">
                <h-form-item :label="$t('m.i.common.brchName')" prop="brchName">
                  <h-input v-model="formItem.brchName" :maxlength="60" :title="formItem.brchName"></h-input>
                </h-form-item>
                <h-form-item :label="$t('m.i.common.brchNo')" prop="brchNo">
                  <h-input v-model="formItemBrchNo" :maxlength="10"></h-input>
                </h-form-item>
                <h-form-item :label="$t('m.i.common.cpesBrchCode')" prop="cpesBrchCode">
                  <h-input v-model="formItem.cpesBrchCode" :maxlength="9"></h-input>
                </h-form-item>
                <h-form-item class="h-form-operate">
                  <h-button type="primary" @click="formSearch('1')">{{$t("m.i.common.search")}}</h-button>
                  <h-button type="ghost" @click="formSearchReset()">{{$t("m.i.common.reset")}}</h-button>
                </h-form-item>
              </h-form>
            </h-panel>
          </div>
          
          <!-- 数据展示表格 -->
          <h-datagrid :columns="columns" highlightRow 
                      url="/hnnxbank/模块路径/查询方法"
                      :bindForm="formItem" 
                      :onSelectChange="handleSelectClick"
                      :onCurrentChange="handleCurrentChange" 
                      :onCurrentChangeCancel="handleCurrentChangeCancel"
                      ref="datagrid">
            <div slot="toolbar" class="pull-left">
              <h-button type="primary" @click="handleAddForm('add')" v-if="authObj.branchAdd">
                {{$t("m.i.common.add")}}
              </h-button>
              <h-button type="primary" @click="handleAddForm('modify')" v-if="authObj.branchModify">
                {{$t("m.i.common.modify")}}
              </h-button>
              <h-button type="primary" @click="handleComfirm" v-if="authObj.branchDelete">
                {{$t("m.i.common.delete")}}
              </h-button>
            </div>
          </h-datagrid>
        </div>
      </h-col>
    </h-row>
  </div>
</template>

<script>
  import { post, on, off } from "@/api/bizApi/commonUtil";
  
  export default {
    name: "customTreePage",
    
    data() {
      return {
        // 树形数据
        branchList: [],
        // 左侧树宽度
        spanLeft: 4,
        // 右侧表格宽度
        spanRight: 20,
        // 树是否展开
        isExpandDisabled: false,
        isNotExpandDisabled: true,
        // 表格高度
        mBarHeight: 0,
        // 查询条件
        formItem: {},
        // 表格列配置
        columns: [
          { title: this.$t('m.i.common.brchName'), key: 'brchName', width: 200 },
          { title: this.$t('m.i.common.brchNo'), key: 'brchNo', width: 150 },
          { title: this.$t('m.i.common.cpesBrchCode'), key: 'cpesBrchCode', width: 150 }
        ],
        // 选中行
        selectedRows: []
      };
    },
    
    computed: {
      // 权限对象
      authObj() {
        return this.$store.state.authObj || {};
      }
    },
    
    methods: {
      /**
       * 展开树
       */
      handleExpandTree(data) {
        this.$refs.branchTree.expandAll();
        this.isExpandDisabled = true;
        this.isNotExpandDisabled = false;
      },
      
      /**
       * 收起树
       */
      handleUnExpandTree(data) {
        this.$refs.branchTree.expandAll(false);
        this.isExpandDisabled = false;
        this.isNotExpandDisabled = true;
      },
      
      /**
       * 树选择变化
       */
      orgSelectChange(node, nodes) {
        // 实现选择逻辑
      },
      
      /**
       * 树展开/收起
       */
      toggleExpand(node, status) {
        // 实现展开/收起逻辑
      },
      
      /**
       * 搜索处理
       */
      formSearch(type) {
        this.$refs.datagrid.loadData();
      },
      
      /**
       * 重置搜索
       */
      formSearchReset() {
        this.$refs.formItem.resetFields();
        this.formSearch('1');
      },
      
      /**
       * 选中行变化
       */
      handleSelectClick(row) {
        this.selectedRows = row;
      },
      
      /**
       * 当前行变化
       */
      handleCurrentChange(row) {
        // 实现当前行变化逻辑
      },
      
      /**
       * 取消当前行变化
       */
      handleCurrentChangeCancel(row) {
        // 实现取消当前行变化逻辑
      },
      
      /**
       * 新增处理
       */
      handleAddForm(type) {
        // 实现新增逻辑
      },
      
      /**
       * 修改处理
       */
      handleModifyForm() {
        // 实现修改逻辑
      },
      
      /**
       * 删除处理
       */
      handleComfirm() {
        // 实现删除逻辑
      }
    },
    
    mounted() {
      // 初始化树形数据
      this.mBarHeight = document.body.clientHeight;
    }
  };
</script>
```

---

## 6. API 调用模板

```javascript
/**
 * API 调用工具类
 */
import { post, on, off } from "@/api/bizApi/commonUtil";

// 查询列表
export function queryList(data) {
  return post('/hnnxbank/模块路径/queryList', data);
}

// 新增
export function add(data) {
  return post('/hnnxbank/模块路径/add', data);
}

// 修改
export function modify(data) {
  return post('/hnnxbank/模块路径/modify', data);
}

// 删除
export function remove(data) {
  return post('/hnnxbank/模块路径/remove', data);
}

// 详情
export function detail(id) {
  return post('/hnnxbank/模块路径/detail', { id: id });
}

// 批量操作
export function batchOperation(data) {
  return post('/hnnxbank/模块路径/batchOperation', data);
}

// 导出
export function exportData(data) {
  return post('/hnnxbank/模块路径/export', data);
}

// 导入
export function importData(data) {
  return post('/hnnxbank/模块路径/import', data);
}

// 下载模板
export function downloadTemplate() {
  return post('/hnnxbank/模块路径/downloadTemplate', {}, { responseType: 'blob' });
}
```

---

## 7. 测试用例模板

```javascript
/**
 * 测试用例模板
 */
describe('CustomPage.vue', () => {
  let wrapper;
  
  beforeEach(() => {
    // 创建组件实例
    wrapper = shallowMount(CustomPage, {
      mocks: {
        $t: (msg) => msg,
        $Message: {
          success: jest.fn(),
          error: jest.fn()
        },
        $store: {
          state: {
            authObj: {
              add: true,
              modify: true,
              delete: true
            }
          }
        }
      }
    });
  });
  
  afterEach(() => {
    wrapper.destroy();
  });
  
  test('should render correctly', () => {
    expect(wrapper.exists()).toBe(true);
  });
  
  test('should search correctly', () => {
    wrapper.setData({
      formItem: {
        queryField1: 'test',
        queryField2: 'test'
      }
    });
    
    wrapper.vm.handleSearch();
    
    expect(wrapper.vm.$refs.datagrid.loadData).toBeCalled();
  });
  
  test('should reset search correctly', () => {
    wrapper.setData({
      formItem: {
        queryField1: 'test',
        queryField2: 'test'
      }
    });
    
    wrapper.vm.resetSearch();
    
    expect(wrapper.vm.formItem.queryField1).toBe('');
    expect(wrapper.vm.formItem.queryField2).toBe('');
  });
  
  test('should add correctly', () => {
    wrapper.vm.handleAdd();
    
    expect(wrapper.vm.type).toBe('add');
    expect(wrapper.vm.addOrEditWin).toBe(true);
  });
  
  test('should modify correctly', () => {
    const row = {
      id: 1,
      field1: 'test1',
      field2: 'test2'
    };
    
    wrapper.vm.handleModify(row);
    
    expect(wrapper.vm.type).toBe('modify');
    expect(wrapper.vm.addOrEditWin).toBe(true);
    expect(wrapper.vm.addOrEditForm).toEqual(row);
  });
  
  test('should delete correctly', () => {
    const row = {
      id: 1
    };
    
    wrapper.vm.handleDelete(row);
    
    // 需要模拟 $Modal.confirm 的回调
    expect(wrapper.vm.$Modal.confirm).toBeCalled();
  });
  
  test('should submit correctly', () => {
    wrapper.setData({
      type: 'add',
      addOrEditForm: {
        field1: 'test1',
        field2: 'test2'
      }
    });
    
    wrapper.vm.addOrEditWin = true;
    
    // 模拟表单验证通过
    wrapper.vm.$refs.addOrEditForm = {
      validate: (callback) => {
        callback(true);
      }
    };
    
    // 模拟 post 请求
    jest.mock('@/api/bizApi/commonUtil', () => ({
      post: jest.fn(() => Promise.resolve({ success: true }))
    }));
    
    wrapper.vm.formSubmit();
    
    expect(wrapper.vm.submitFlag).toBe(false);
    expect(wrapper.vm.addOrEditWin).toBe(false);
  });
});
```
