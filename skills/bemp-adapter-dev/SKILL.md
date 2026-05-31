---
name: "bemp-adapter-dev"
description: "BEMP银行适配器MessageConverter开发。当需要在银行适配器模块新增MQ消息转换器、对接外围系统广播消息、或进行报文字段映射开发时触发。"
whenToUse: "当用户要求在banks/ext-xxx目录下新增MessageConverter、对接ECIF/信贷/核心等外围系统MQ消息、或进行报文字段映射开发时使用"
triggers: "新增MessageConverter、MQ消息对接、报文字段映射、适配器开发、广播消息接收"
---

# BEMP银行适配器MessageConverter开发

## 职责
在BEMP银行适配器模块中，按规范开发MessageConverter，实现外围系统MQ报文与内部服务DTO的双向转换，并配套单元测试。

## 触发条件
Use this skill when:
- 用户要求在`banks/ext-xxx/xxx-adapter-as/src/main/java/`下新增MessageConverter
- 用户提到MQ消息对接、广播消息接收
- 用户提到外围系统报文字段映射到内部服务
- 用户提到ECIF/信贷/核心等系统的消息适配开发
- 用户提到PICE/PICM/PIBM等交易码的消息转换器开发
- 用户提到server端（外围→票据）或client端（票据→外围）的消息转换

Do NOT use this skill when:
- 前端页面开发
- 数据库表结构变更
- 非适配器模块的后端业务逻辑开发
- 纯配置修改（如Spring配置、MQ队列配置）

## 流程对接说明

本技能在bemprule.md完整开发流程中对应**适配器开发**阶段：

```
需求梳理 → 需求确认 → 方案设计 → 代码同步 → 代码开发 或 适配器开发(本技能) → 代码评审修复 → ...
```

**前置条件**（由主控Agent负责，本技能不重复执行）：
- 需求梳理和需求确认已完成
- 方案设计已完成，Spec文档（spec.md/tasks.md/checklist.md）已输出到`.trae/specs/<change-id>/`
- 代码同步已完成（如需新建模块目录）

**本技能职责边界**：
- 从Step 1（需求文档解析）到Step 5（验证），聚焦代码实现
- Spec文档编写由主控Agent在方案设计阶段完成，本技能不重复编写
- 验证通过后，交由主控Agent进入代码评审修复阶段

## 银行报文风格识别

开发前必须先识别目标银行的报文风格，不同银行差异巨大：

| 风格 | 代表银行 | 报文格式 | server端基类 | XML解析 | 代码量 |
|------|---------|---------|-------------|---------|--------|
| XML报文 | hnnxbank/shaoxbank | XML入XML出 | `AbstractMessageApplyResponseConverter` | `XmlDocument`+`XmlNode` | 大 |
| JSON报文+银行基类 | yibbank | JSON入XML出 | 银行专属基类 | 不需要 | 中 |
| JSON报文直通 | qinnbank | JSON入JSON出 | `AbstractMessageApplyResponseConverter` | 不需要 | 小 |

**识别方法**：读取目标银行任意一个已有MessageConverter，判断其payload类型和基类。

## 执行步骤

### Step 1: 需求文档解析
1. 读取需求文档（docx），使用markitdown转换为markdown
2. 提取外围接口字段定义表，识别：交易码、上送字段、返回字段、数组字段
3. 识别报文结构层级（根节点、子节点、数组节点）
4. **保留字段元信息**：字段中文名、类型/长度、是否必输、备注，这些将作为代码注释

**失败处理（按优先级依次尝试）**：
1. docx转换失败时，先尝试安装`markitdown[docx]`依赖后重试
2. 若安装后仍失败，读取方案设计阶段已输出的`.trae/specs/<change-id>/spec.md`，从中提取字段映射表
3. 若spec.md也不存在，请用户口述需求：提供交易码、上送/返回字段定义，手动整理字段映射关系

### Step 2: 三线代码探索（并行执行）
同时搜索以下三类代码，收集映射依据：

| 搜索线 | 目标 | 搜索方式 |
|--------|------|---------|
| 同银行参考 | 同银行适配器模块下已有的MessageConverter | `Glob banks/ext-{bank}/**/*MessageConverter.java` |
| 其他银行同类 | 其他银行适配器下的同名MessageConverter | `Grep PICE{code}MessageConverter` |
| 产品接口定义 | 服务接口+请求DTO+响应DTO | `Grep class Ecif{code}Service` → 读取DTO |

**必须读取的文件**：
- 同银行参考MessageConverter（确定报文风格和工具类用法）
- 工具类：`HeadUtils.java`、`XmlUtil.java`、`MessageConstants.java`（XML风格银行）
- 产品接口：`EcifXXXService.java` + `EcifXXXReqDto.java` + `EcifXXXResDto.java`
- 拦截器：`MqMessageInterceptor.java`（了解消息路由和Header处理）

**目录预检查**（新增）：开发前检查server目录下是否已有对应模块目录（如ecif/credit/ebank），如果不存在需新建。

### Step 3: 字段映射矩阵
对比外围报文字段与内部DTO字段，建立映射关系表：

```
| 外围字段 | 外围中文名 | 外围路径 | 内部DTO字段 | 内部DTO中文名 | 映射说明 |
|---------|-----------|---------|-----------|-------------|---------|
| xxx | 交易编号 | 根节点 | - | - | 用于报文头 |
```

**关键判断**：
- 外围字段名 ≠ 内部DTO字段名时，需标注映射关系（如suspectCustNo→mrgdCustNo）
- 外围字段位置在request节点而非ebbsHdrReq时，需手动覆盖Header
- 数组类型字段需识别循环解析逻辑
- **保留外围中文名和内部DTO中文名**，这些将作为代码注释

**ECIF渠道特殊判断**（新增）：
- ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq中，必须在sysHeadToJson之后手动覆盖Header
- ECIF渠道外部服务码格式为`ECIF.{交易码}0.01`（注意交易码后补0），不同于信贷渠道的`EBBS.{服务码}.01`
- ECIF广播消息中isCust字段映射为内部operType（1=校验，0=修改），不能固定为"1"
- ECIF数组字段（如mOrgCertInfo）取值时，若内部DTO为单值字段，取第一条（主证件）

### Step 4: 代码实现（MessageConverter + 单元测试）

#### 4.1 确定开发模式
根据Step 2识别的银行风格，选择对应的开发模式：

**XML报文模式**（hnnxbank/shaoxbank等）：
- 继承`AbstractMessageApplyResponseConverter`
- 使用`XmlDocument`/`XmlNode`解析，`MessageXmlBuilder`构建响应
- 实现`getFunctionIdMapping`、`fromMessage`、`toMessage`

**JSON报文+银行基类模式**（yibbank等）：
- 继承银行专属基类（如`YbinChannelBaseMessageApplyResponseConverter`）
- `getFunctionIdMapping`可能自动从类名推导
- 只需覆盖业务逻辑方法

**JSON报文直通模式**（qinnbank等）：
- 继承`AbstractMessageApplyResponseConverter`
- payload直接是JSONObject，无需XML解析
- `toMessage`直接返回JSON字符串

#### 4.2 注释规范（强制）
代码中必须包含以下注释，确保字段映射关系可追溯：

**类级注释**：
```java
/**
 * {功能中文名}
 * 外围交易码: {txCode}  内部功能号: {PICE_CODE}
 * 外围系统: {ECIF/信贷/核心}  报文格式: {XML/JSON}
 * 产品接口: {EcifXXXService}.{methodName}
 */
```

**fromMessage字段注释**：每个put操作必须带行内注释，包含外围字段名和中文名
```java
requestDto.put("operType", XmlUtil.getNodeValue(requestNode, "isCust")); // isCust-是否客户操作(S(1)/Y)
requestDto.put("custNo", XmlUtil.getNodeValue(requestNode, "custNo")); // custNo-保留客户号(S(13))
requestDto.put("mrgdCustNo", XmlUtil.getNodeValue(requestNode, "suspectCustNo")); // suspectCustNo-被合并客户号(S(13))→mrgdCustNo
```

**toMessage字段注释**：响应字段注释包含内部字段名和中文含义
```java
data.createElement("chkRsltRetCd").addText(reqInfo.getString("chkRsltRetCd")); // chkRsltRetCd-检查结果返回码
data.createElement("custNo").addText(reqInfo.getString("custNo")); // custNo-保留客户号（ECIF）
```

**子节点注释**：标注子节点来源和含义
```java
// mOrgCust-机构客户信息子节点
XmlNode mOrgCust = requestNode.getSubNode("mOrgCust");
if (null != mOrgCust) {
    requestDto.put("certType", XmlUtil.getNodeValue(mOrgCust, "custSubtype")); // custSubtype-客户细分类型(S(3))→certType
}
```

**映射差异注释**：当外围字段名与内部DTO字段名不同时，必须注释说明
```java
// 外围suspectCustNo映射为内部mrgdCustNo（被归并客户号）
requestDto.put("mrgdCustNo", XmlUtil.getNodeValue(requestNode, "suspectCustNo"));
```

#### 4.3 ECIF Header覆盖（强制，仅ECIF渠道）
ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq中，`HeadUtils.sysHeadToJson`从ebbsHdrReq提取的reqUserNo/reqBrchNo可能为空。**必须在sysHeadToJson之后手动覆盖**：

```java
JSONObject req = HeadUtils.sysHeadToJson(request, requestNode);
// ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq，需手动覆盖Header
JSONObject header = req.getJSONObject("Header");
if (header != null) {
    header.put("reqUserNo", XmlUtil.getNodeValue(requestNode, "tellerNo")); // tellerNo-柜员号(S(32)/Y)
    header.put("reqBrchNo", XmlUtil.getNodeValue(requestNode, "orgCode")); // orgCode-机构码(S(32)/Y)
}
```

**判断规则**：如果外围系统是ECIF，必须做Header覆盖；信贷/核心渠道不需要。

#### 4.4 单元测试（强制）
每个MessageConverter必须配套单元测试类，放置在`src/test/java/`对应包路径下。

**测试类规范**（详见assets/MessageConverterTest.java.tpl）：
- 使用JUnit 4 + Mockito
- 不启动Spring上下文（纯单元测试）
- Mock `Message` 对象构造测试报文
- 测试覆盖以下场景：
  - 正常报文解析（fromMessage）
  - 正常响应组装（toMessage）
  - 子节点缺失时的容错处理
  - 数组字段的循环解析
  - Header字段覆盖逻辑

**测试类命名**：`{PICE_CODE}MessageConverterTest.java`
**测试类路径**：`banks/ext-{bank}/{bank}-adapter-as/src/test/java/com/hundsun/bemp/{bank}/adapter/msg/server/{module}/`

### Step 5: 验证
1. 使用`GetDiagnostics`检查语法错误
2. **Maven编译验证**：在适配器模块目录下执行`mvn compile -pl banks/ext-{bank}/{bank}-adapter-as`，确认编译通过无错误
3. **ECIF渠道专项检查**：确认fromMessage中是否包含tellerNo/orgCode的Header覆盖逻辑
4. **代码评审**：使用bemp-backend-code-review技能对新增MessageConverter和单元测试进行后端代码评审，确保符合项目规范
5. 逐项验证方案设计阶段输出的checklist.md
6. 确认单元测试可独立执行

## 输出标准

### 代码输出
- MessageConverter.java：风格与同银行参考实现一致
- **每个put/createElement操作带字段注释**（外围字段名+中文名+类型）
- **映射差异处带说明注释**
- MessageConverterTest.java：可独立执行的单元测试
- IDE诊断无错误
- Maven编译通过
- 后端代码评审通过

## 运行机制参考

### 消息路由流程
```
MQ消息到达 → JmsMessageListener.onMessage()
    ↓
MqMessageInterceptor.preInvoke() (解析XML, 提取msgCd, 查FUNCTION_ID_MAP得到functionId)
    ↓
messageConverterMap.get(functionId + "MessageConverter") (按bean名路由)
    ↓
Converter.fromMessage() (外部消息 → 内部JSON)
    ↓
ServiceInvokeUtil.invokeByFunctionId() (调用内部微服务)
    ↓
Converter.toMessage() (内部响应 → 外部消息)
    ↓
MqMessageInterceptor.postInvoke()
```

### 路由公式
`bean名 = functionId + "MessageConverter"`
每个Converter用`@Component("XXXMessageConverter")`注册到Spring容器。

### getFunctionIdMapping映射规则
数组最后一个元素是内部功能号，前面所有元素是外部服务码：

**外部服务码格式按渠道区分**：
| 渠道 | 格式 | 示例 | 来源 |
|------|------|------|------|
| ECIF | `ECIF.{交易码}0.01` | `ECIF.04020060.01` | HeadUtils.bempToEsb中ECIF分支 |
| 信贷 | `EBBS.{服务码}.01` | `EBBS.02104300.01` | 信贷渠道约定 |
| BUP/CMS | `{渠道}.000{服务码}0.01` | `BUP.00007000010.01` | HeadUtils.bempToEsb中BUP分支 |
| JYT | `JYT.{服务码}0.01` | `JYT.07000010.01` | HeadUtils.bempToEsb中JYT分支 |
| JSON报文银行 | 内外相同，直接用PICE代码 | `PICE070101` | 无需转换 |

```java
// ECIF渠道一对一映射
return new String[]{"ECIF.04020060.01", "PICE070701"};
// 信贷渠道一对一映射
return new String[]{"EBBS.02104300.01", "PICE030505"};
// 多对一映射（多个外部服务码映射到同一个内部功能号）
return new String[]{"EBBS.07000010.01","EBBS.07000020.01","EBBS.07000030.01", "PICE070101"};
// 一对一且内外相同（JSON报文银行常见）
return new String[]{"PICE070101", "PICE070101"};
```

### server端 vs client端
| 维度 | server端（被动接收） | client端（主动调用） |
|------|---------------------|---------------------|
| 基类 | `AbstractMessageApplyResponseConverter` | `AbstractGenericMessageRequestReplyConverter` |
| 触发 | MQ消息到达自动调用 | 业务代码主动调用 |
| 核心方法 | `fromMessage` + `toMessage` | `toMessage`(组装请求) + `fromMessage`(解析响应) |
| getFunctionIdMapping | 必须实现 | 不需要 |
| @Component命名 | `{PICE_CODE}MessageConverter` | `{POBM/POPC/POSM}MessageConverter` |

## 失败处理
| 场景 | 处理策略 |
|------|---------|
| docx转换失败 | ①安装markitdown[docx]后重试 ②读取已有spec.md提取字段映射 ③请用户口述需求 |
| 找不到同银行参考 | 使用其他银行同类实现 + sample模块自动生成代码 |
| 字段映射歧义 | 标注为"待确认"，列出所有可能映射供用户选择 |
| XML结构不确定 | 参考同银行其他MessageConverter的XML解析模式 |
| Header字段位置不确定 | 先按ebbsHdrReq解析，再从request节点手动覆盖 |
| Maven编译失败 | 根据编译错误修复代码，重新编译直到通过 |
| 代码评审不通过 | 根据评审意见修复代码，重新评审直到通过 |
| 银行风格不确定 | 读取该银行任意一个已有MessageConverter判断 |
