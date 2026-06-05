# 沧州银行(cangzbank) 适配器开发参考模板

> bank-key: `cangzbank` | 目录: `ext-cangzbank` | 包: `com.hundsun.bemp.cangzbank.adapter.msg`
> 状态: **LEGACY** | Converter: **95** | Test: **0**
> 风格: **SERVER_XML+CLIENT_MIXED**
> ★ 注意: 该银行代码不在当前分支，仅作开发参考

---

## 一、基类选择

端 | 基类 | 适用场景
---- | ------ | ---------
Server | `AbstractMessageApplyResponseConverter` | 所有 Server 端 Converter
Client | `AbstractGenericMessageRequestReplyConverter` | 所有 Client 端 Converter

## 二、报文格式

按 style `SERVER_XML+CLIENT_MIXED` 查 bank-index.json style_enum 获取详细报文格式。

## 三、测试要求

- 继承测试基类: 按 style_enum.test_template 选用
- mock报文: src/test/resources/mock-msg/<converter>/
- 覆盖率: 行>=70%, 分支>=60%
