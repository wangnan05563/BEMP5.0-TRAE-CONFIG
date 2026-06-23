# 河南农商银行（hnnxbank）适配器开发参考模板

> bank-key: `hnnxbank` | 目录: `ext-hnnxbank` | 包: `com.hundsun.bemp.hnnxbank.adapter.msg`
> 状态: **IMPLEMENTED** | Converter: **1** | Test: **1**
> 风格: **SERVER_XML+CLIENT_NONE**

---

## 一、项目结构

```
com/hundsun/bemp/hnnxbank/adapter/msg/
├── server/
```

## 二、基类选择

端 | 基类 | 适用场景
---- | ------ | ---------
Server | `AbstractMessageApplyResponseConverter` | 所有 Server 端 Converter
Client | 无 | 仅服务端

## 三、报文格式

按 style `SERVER_XML+CLIENT_NONE` 查 bank-index.json style_enum 获取详细报文格式。

## 四、测试要求

- 继承测试基类: 按 style_enum.test_template 选用
- mock报文: src/test/resources/mock-msg/<converter>/
- 覆盖率: 行>=70%, 分支>=60%

## 五、踩坑记录

### 5.1 getFunctionIdMapping 数组格式错误（PICE070701）

**现象**: 内网测试报"功能号映射关系查找失败"

**根因**: `getFunctionIdMapping()` 返回数组中逗号写在字符串内部，导致数组长度=1，基类 `afterPropertiesSet()` 不注册映射

```java
// ❌ 错误写法：数组长度=1
return new String[]{"EBBS.12402060.01,PICE070701"};

// ✅ 正确写法：数组长度=2
return new String[]{"EBBS.12402060.01", "PICE070701"};
```

**排查路径**: 错误日志 → 定位功能号 EBBS.12402060.01 → 搜索基类 afterPropertiesSet() 注册逻辑 → 对比其他正常 Converter 的写法

**预防**: 参考 bank-config.json mapping_validation 配置中的 auto_check_rules
