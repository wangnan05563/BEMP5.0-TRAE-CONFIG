# 宁夏银行（ningxbank）适配器开发参考模板

> bank-key: `ningxbank` | 目录: `ext-ningxbank` | 包: `com.hundsun.bemp.ningxbank.adapter.msg`
> 状态: **IMPLEMENTED** | Converter: **69** | Test: **0**
> 风格: **SERVER_XML+CLIENT_HTTP**

---

## 一、项目结构

```
com/hundsun/bemp/ningxbank/adapter/msg/
├── client/
├── credit/
├── server/
```

## 二、基类选择

端 | 基类 | 适用场景
---- | ------ | ---------
Server | `AbstractHttpMessageRequestReplyConverter` | 所有 Server 端 Converter
Client | `AbstractHttpMessageRequestReplyConverter` | 所有 Client 端 Converter

## 三、报文格式

按 style `SERVER_XML+CLIENT_HTTP` 查 bank-index.json style_enum 获取详细报文格式。

## 四、测试要求

- 继承测试基类: 按 style_enum.test_template 选用
- mock报文: src/test/resources/mock-msg/<converter>/
- 覆盖率: 行>=70%, 分支>=60%
