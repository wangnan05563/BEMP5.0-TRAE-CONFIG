# 石家庄农商银行（shnsbank）适配器开发参考模板

> bank-key: `shnsbank` | 目录: `ext-shnsbank` | 包: `com.hundsun.bemp.shnsbank.adapter.msg`
> 状态: **IMPLEMENTED** | Converter: **108** | Test: **0**
> 风格: **SERVER_XML+CLIENT_HTTP**

---

## 一、项目结构

```
com/hundsun/bemp/shnsbank/adapter/msg/
├── client/
├── credit/
├── common/
├── server/
```

## 二、基类选择

端 | 基类 | 适用场景
---- | ------ | ---------
Server | `AbstractHttpMessageRequestReplyConverter` | 所有 Server 端 Converter
Client | `AbstractHttpMessageRequestReplyConverter` | 所有 Client 端 Converter

### 自定义抽象基类

- `AbstractSpringWsMessageApplyResponseConverter`

## 三、报文格式

按 style `SERVER_XML+CLIENT_HTTP` 查 bank-index.json style_enum 获取详细报文格式。

## 四、测试要求

- 继承测试基类: 按 style_enum.test_template 选用
- mock报文: src/test/resources/mock-msg/<converter>/
- 覆盖率: 行>=70%, 分支>=60%
