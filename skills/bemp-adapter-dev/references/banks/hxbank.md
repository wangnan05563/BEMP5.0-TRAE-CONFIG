# 华夏银行（hxbank）适配器开发参考模板

> bank-key: `hxbank` | 目录: `ext-hxbank` | 包: `com.hundsun.bemp.hxbank.adapter.msg`
> 状态: **IMPLEMENTED** | Converter: **49** | Test: **0**
> 风格: **SERVER_XML_ONLY**

---

## 一、项目结构

```
com/hundsun/bemp/hxbank/adapter/msg/
├── common/
├── server/
├── tcp/
```

## 二、基类选择

端 | 基类 | 适用场景
---- | ------ | ---------
Server | `AbstractMessageApplyResponseConverter` | 所有 Server 端 Converter
Client | 无 | 仅服务端

## 三、报文格式

按 style `SERVER_XML_ONLY` 查 bank-index.json style_enum 获取详细报文格式。

## 四、测试要求

- 继承测试基类: 按 style_enum.test_template 选用
- mock报文: src/test/resources/mock-msg/<converter>/
- 覆盖率: 行>=70%, 分支>=60%
