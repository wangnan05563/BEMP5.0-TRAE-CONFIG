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
| XML报文 | hnnxbank/shaoxbank/huisbank/jinzbank/nmgbank/huzbank/hxbank | XML入XML出 | `AbstractMessageApplyResponseConverter` | `XmlDocument`+`XmlNode` | 大 |
| JSON报文+银行基类 | yibbank | JSON入XML出 | 银行专属基类 | 不需要 | 中 |
| JSON报文直通 | qinnbank(ebank) | JSON入JSON出 | `AbstractMessageApplyResponseConverter` | 不需要 | 小 |
| XML报文(混合) | qinnbank(credit) | XML入XML出+加密 | `AbstractMessageApplyResponseConverter` | `XmlDocument`+`XmlNode`+`EncryptKeyUtils` | 大 |

> **重要**：qinnbank 存在模块级差异——ebank 模块为 JSON 直通模式，credit 模块为 XML 模式（报文需加密）。必须按目标模块识别风格，不能仅凭银行名判断。

**识别方法**：读取目标银行对应模块目录下任意一个已有MessageConverter，判断其payload类型和基类。

### 银行基类继承链速查

**XML报文银行**（hnnxbank/shaoxbank等）：
```
AbstractMessageConverter
  └── AbstractMessageApplyResponseConverter (server端)
        └── {PICE_CODE}MessageConverter (子类实现)
```

**JSON报文+银行基类**（yibbank）：
```
AbstractMessageConverter
  └── AbstractMessageApplyResponseConverter
        ├── AbstractYbinMessageApplyResponseConverter (抽象, 需显式实现getFunctionIdMapping)
        │     └── {PICE_CODE}MessageConverter (需覆写fromMessage/toMessage时使用)
        └── YbinChannelBaseMessageApplyResponseConverter (自动从类名推导getFunctionIdMapping)
              └── {PICE_CODE}MessageConverter (空壳类，字段与外围一致时使用)
```

**JSON报文直通**（qinnbank ebank）：
```
AbstractMessageConverter
  └── AbstractMessageApplyResponseConverter
        └── {PICE_CODE}MessageConverter (子类实现)
```

**XML报文混合**（qinnbank credit）：
```
AbstractMessageConverter
  └── AbstractMessageApplyResponseConverter
        └── {PICE_CODE}MessageConverter (使用XmlDocument/XmlNode+EncryptKeyUtils)
```

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

**目录预检查**：开发前检查server目录下是否已有对应模块目录（如ecif/credit/ebank），如果不存在需新建。

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

**ECIF渠道特殊判断**：
- ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq中，必须在sysHeadToJson之后手动覆盖Header
- ECIF渠道外部服务码格式为`ECIF.{交易码}0.01`（注意交易码后补0），不同于信贷渠道的`EBBS.{服务码}.01`
- ECIF广播消息中isCust字段映射为内部operType（1=校验，0=修改），不能固定为"1"
- ECIF数组字段（如mOrgCertInfo）取值时，若内部DTO为单值字段，取第一条（主证件）

### Step 4: 代码实现（MessageConverter + 单元测试）

#### 4.1 确定开发模式
根据Step 2识别的银行风格，选择对应的开发模式：

**XML报文模式**（hnnxbank/shaoxbank/huisbank/jinzbank/nmgbank/huzbank/hxbank等）：
- 继承`AbstractMessageApplyResponseConverter`
- 使用`XmlDocument`/`XmlNode`解析，`MessageXmlBuilder`构建响应
- 实现`getFunctionIdMapping`、`fromMessage`、`toMessage`
- 响应头使用`HeadUtils.jsonToSysHead`，响应体逐节点构建

**JSON报文+银行基类模式**（yibbank等）：
- 字段完全一致时继承`YbinChannelBaseMessageApplyResponseConverter`（空壳类，自动推导getFunctionIdMapping）
- 需要字段映射时继承`AbstractYbinMessageApplyResponseConverter`（需显式实现getFunctionIdMapping）
- 基类已实现：fromMessage = 提取body节点，toMessage = `XmlUtil.buildSuccessMessage`

**JSON报文直通模式**（qinnbank ebank等）：
- 继承`AbstractMessageApplyResponseConverter`
- payload直接是JSONObject，无需XML解析
- `toMessage`直接返回JSON字符串
- 可能注入`@CloudReference`服务进行数据补充

**XML报文混合模式**（qinnbank credit等）：
- 继承`AbstractMessageApplyResponseConverter`
- XML报文需先解密再解析（使用`EncryptKeyUtils`）
- 响应需先格式化再加密（`XmlUtil.formatXml` + `EncryptKeyUtils.getEncryptString`）
- 报文头使用`HeadUtils.sysHeadToJson(rootNode, functionId)`（与hnnxbank签名不同）
- 报文结构使用`SERVICE/SERVICE_HEADER/SERVICE_BODY`而非`transaction/header/body`

#### 4.2 参考模板

##### 模板A：XML报文风格（hnnxbank等）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;

import com.hundsun.bemp.{bank}.adapter.msg.common.MessageConstants;
import com.hundsun.bemp.{bank}.adapter.msg.util.HeadUtils;
import com.hundsun.bemp.{bank}.adapter.msg.util.XmlUtil;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * {功能中文名}
 * 外围交易码: {txCode}  内部功能号: {PICE_CODE}
 * 外围系统: {外围系统名}  报文格式: XML
 * 产品接口: {ServiceName}.{methodName}
 */
@Component(value = "{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends AbstractMessageApplyResponseConverter {

    @Override
    public JSONObject fromMessage(Message<?> message) {
        // 接收外围报文
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        XmlNode rootNode = xmlDocument.getRoot();

        JSONObject request = new JSONObject();
        XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");

        // 拼装bemp报文体
        JSONObject requestDto = new JSONObject();
        requestDto.put("field1", XmlUtil.getNodeValue(requestNode, "outerField1")); // outerField1-外围字段中文名
        requestDto.put("field2", XmlUtil.getNodeValue(requestNode, "outerField2")); // outerField2-外围字段中文名→field2
        request.put("requestDto", requestDto);

        // sysHeadToJson提取报文头信息
        JSONObject req = HeadUtils.sysHeadToJson(request, requestNode);
        // ECIF渠道：tellerNo/orgCode在request节点，需手动覆盖Header
        // JSONObject header = req.getJSONObject("Header");
        // header.put("reqUserNo", XmlUtil.getNodeValue(requestNode, "tellerNo"));
        // header.put("reqBrchNo", XmlUtil.getNodeValue(requestNode, "orgCode"));

        return req;
    }

    @Override
    public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        MessageXmlBuilder transaction = MessageXmlBuilder.create("transaction");
        XmlNode header = xmlDocument.getRoot().getSubNode("header");
        MessageXmlBuilder response = HeadUtils.jsonToSysHead(header, jsonObject, transaction);
        response.createElement("retCode").addText(jsonObject.getString("retCode"));
        response.createElement("retMsg").addText(jsonObject.getString("retMsg"));

        JSONArray retData = jsonObject.getJSONArray("retData");
        MessageXmlBuilder retDataXml = response.createElement("body").createElement("response");

        if (null != retData && retData.size() > 0) {
            MessageXmlBuilder list = retDataXml.createElement("list");
            for (int i = 0; i < retData.size(); i++) {
                JSONObject reqInfo = retData.getJSONObject(i);
                MessageXmlBuilder data = list.createElement("data")
                        .addAttribute(MessageConstants.NUM, String.valueOf(i + 1));
                data.createElement("respField1").addText(reqInfo.getString("respField1")); // respField1-响应字段中文名
            }
        }

        return super.getMessage(response.asXML());
    }

    @Override
    public String[] getFunctionIdMapping() {
        return new String[]{
                // {功能中文名}
                "{外部服务码}",
                "{PICE_CODE}"
        };
    }
}
```

##### 模板B：JSON报文+银行基类（yibbank等）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.{bank}.adapter.msg.server.{Bank}ChannelBaseMessageApplyResponseConverter;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * {功能中文名}
 * 外围交易码: {PICE_CODE}  内部功能号: {PICE_CODE}
 * 外围系统: {外围系统名}  报文格式: JSON
 * 产品接口: {ServiceName}.{methodName}
 */
@Component("{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends {Bank}ChannelBaseMessageApplyResponseConverter {

    @Override
    public JSONObject fromMessage(Message<?> message) {
        JSONObject applyMessage = (JSONObject) message.getPayload();
        JSONObject body = applyMessage.getJSONObject("body");
        // 业务逻辑处理
        JSONObject requestDto = body.getJSONObject("requestDto");
        // ... 字段映射/数据补充 ...
        return body;
    }
}
```

##### 模板C：JSON报文直通（qinnbank等）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * {功能中文名}
 * 外围交易码: {PICE_CODE}  内部功能号: {PICE_CODE}
 * 外围系统: {外围系统名}  报文格式: JSON
 * 产品接口: {ServiceName}.{methodName}
 */
@Component("{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends AbstractMessageApplyResponseConverter {

    @Override
    public JSONObject fromMessage(Message<?> message) {
        JSONObject jsonObject = (JSONObject) message.getPayload();
        JSONObject requestDto = jsonObject.getJSONObject("requestDto");
        // 字段映射处理
        // requestDto.put("field1", jsonObject.getString("outerField1"));
        return jsonObject;
    }

    @Override
    public Message<?> toMessage(Message<?> applyMessage, JSONObject jsonObject) {
        return super.getMessage(jsonObject.toJSONString());
    }

    @Override
    public String[] getFunctionIdMapping() {
        return new String[]{"{PICE_CODE}", "{PICE_CODE}"};
    }
}
```

#### 4.3 注释规范（强制）
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

#### 4.4 ECIF Header覆盖（强制，仅ECIF渠道）
ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq中，`HeadUtils.sysHeadToJson`从ebbsHdrReq提取的reqUserNo/reqBrchNo可能为空。**必须在sysHeadToJson之后手动覆盖**：

```java
JSONObject req = HeadUtils.sysHeadToJson(request, requestNode);
// ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq，需手动覆盖Header
JSONObject header = req.getJSONObject("Header");
header.put("reqUserNo", XmlUtil.getNodeValue(requestNode, "tellerNo")); // tellerNo-柜员号
header.put("reqBrchNo", XmlUtil.getNodeValue(requestNode, "orgCode")); // orgCode-机构码
```

**判断规则**：如果外围系统是ECIF，必须做Header覆盖；信贷/核心渠道不需要。

#### 4.5 单元测试（强制）

每个MessageConverter必须配套单元测试类，放置在`src/test/java/`对应包路径下。

**测试类命名**：`{PICE_CODE}MessageConverterTest.java`
**测试类路径**：`banks/ext-{bank}/{bank}-adapter-as/src/test/java/com/hundsun/bemp/{bank}/adapter/msg/server/{module}/`

**测试框架**：JUnit 4 + Mockito，不启动Spring上下文（纯单元测试）

**测试必须覆盖以下场景**：
1. 正常报文解析（fromMessage） - 验证所有字段映射正确，包含Header字段覆盖（ECIF渠道）
2. 子节点缺失时的容错处理 - 验证null检查生效
3. 正常响应组装（toMessage） - 验证XML/JSON结构正确
4. retData为空时的容错处理 - 验证空数组处理
5. getFunctionIdMapping映射测试 - 验证外部服务码与内部功能号映射正确

**模拟报文要求**（强制）：
- XML模式：使用`MessageXmlParser`解析真实XML字符串，构造完整header+body+request结构
- JSON模式：使用`JSONObject`构造完整JSON payload，包含body和requestDto
- 模拟报文必须包含真实业务场景的样例数据，不能使用空值占位
- 每个测试方法独立构造报文，不依赖共享状态

**测试模板选择**：
| 银行风格 | 模板section | assets文件 |
|---------|-----------|-----------|
| XML报文(hnnxbank等) | `{{#XML_MODE}}` | `MessageConverterTest.java.tpl` |
| JSON+基类(yibbank) | `{{#JSON_BASE_MODE}}` | `MessageConverterTest.java.tpl` |
| JSON直通(qinnbank ebank) | `{{#JSON_MODE}}` | `MessageConverterTest.java.tpl` |
| XML混合(qinnbank credit) | `{{#QINN_XML_MODE}}` | `MessageConverterTest.java.tpl` |

##### 测试类完整模板（XML报文风格）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlParser;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import org.junit.Before;
import org.junit.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.Assert.*;

/**
 * {PICE_CODE}MessageConverter单元测试
 * {功能中文名}
 */
public class {PICE_CODE}MessageConverterTest {

    private {PICE_CODE}MessageConverter converter;

    @Before
    public void setUp() {
        converter = new {PICE_CODE}MessageConverter();
    }

    /**
     * 构造{外围系统}请求报文XML
     * 模拟外围系统发送的原始MQ报文
     */
    private String buildRequestXml() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<transaction>" +
                "  <header>" +
                "    <ver>1.0</ver>" +
                "    <msg>" +
                "      <seqNb>{流水号}</seqNb>" +
                "      <msgCd>{外部服务码}</msgCd>" +
                "      <sndAppCd>{外围系统}</sndAppCd>" +
                "      <sndDt>{日期}</sndDt>" +
                "      <sndTm>{时间}</sndTm>" +
                "      <sndMbrCd>{外围系统}</sndMbrCd>" +
                "      <replyToQ>{外围系统}.RESP</replyToQ>" +
                "      <refCallTyp>SYN</refCallTyp>" +
                "    </msg>" +
                "  </header>" +
                "  <body>" +
                "    <request>" +
                "      <ebbsHdrReq>" +
                "        <opCode>{PICE_CODE}</opCode>" +
                "        <version>01</version>" +
                "        <channelNo>{渠道}</channelNo>" +
                "        <reqFlowNo>{请求流水号}</reqFlowNo>" +
                "        <reqLegalNo>{法人号}</reqLegalNo>" +
                "      </ebbsHdrReq>" +
                "      {外围报文字段}" +
                "    </request>" +
                "  </body>" +
                "</transaction>";
    }

    /**
     * 正常报文解析测试
     * 验证所有字段映射正确，包含Header覆盖
     */
    @Test
    public void testFromMessage_normal() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);

        JSONObject requestDto = result.getJSONObject("requestDto");
        assertNotNull("requestDto不应为null", requestDto);
        // 验证每个字段映射
        assertEquals("期望值", requestDto.getString("fieldName")); // outerField→fieldName

        // 验证Header字段（ECIF渠道需验证覆盖）
        JSONObject header = result.getJSONObject("Header");
        assertNotNull("Header不应为null", header);
    }

    /**
     * 子节点缺失时的容错处理
     * 验证null检查生效，不抛NPE
     */
    @Test
    public void testFromMessage_missingSubNodes() {
        String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<transaction>" +
                "  <header>...</header>" +
                "  <body>" +
                "    <request>" +
                "      <ebbsHdrReq>...</ebbsHdrReq>" +
                "      {仅包含必填字段，不含可选子节点}" +
                "    </request>" +
                "  </body>" +
                "</transaction>";

        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(xml);
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);
        JSONObject requestDto = result.getJSONObject("requestDto");

        assertNotNull("requestDto不应为null", requestDto);
        // 子节点缺失时，对应字段应为null
        assertNull("子节点缺失，对应字段应为null", requestDto.getString("subNodeField"));
    }

    /**
     * 正常响应组装测试
     * 验证XML结构正确，包含retCode/retMsg/数据节点
     */
    @Test
    public void testToMessage_normal() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        JSONArray retData = new JSONArray();
        JSONObject data = new JSONObject();
        data.put("respField1", "value1");
        retData.add(data);
        responseJson.put("retData", retData);

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payload = (String) result.getPayload();
        assertTrue("响应应包含响应字段", payload.contains("respField1"));
        assertTrue("响应应包含retCode", payload.contains("retCode"));
    }

    /**
     * retData为空时的容错处理
     * 验证空数组不导致异常
     */
    @Test
    public void testToMessage_emptyRetData() {
        MessageXmlParser parser = MessageXmlParser.create();
        XmlDocument xmlDocument = parser.parse(buildRequestXml());
        Message<?> message = MessageBuilder.createMessage(xmlDocument, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");
        responseJson.put("retData", new JSONArray());

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payload = (String) result.getPayload();
        assertTrue("响应应包含retCode", payload.contains("retCode"));
    }

    /**
     * getFunctionIdMapping映射测试
     * 验证外部服务码与内部功能号一对一映射
     */
    @Test
    public void testGetFunctionIdMapping() {
        String[] mapping = converter.getFunctionIdMapping();
        assertNotNull("映射不应为null", mapping);
        assertEquals("映射长度应为2", 2, mapping.length);
        assertEquals("外部服务码", "{外部服务码}", mapping[0]);
        assertEquals("内部功能号", "{PICE_CODE}", mapping[1]);
    }
}
```

##### 测试类模板（JSON报文风格）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.Assert.*;

/**
 * {PICE_CODE}MessageConverter单元测试
 * {功能中文名}
 */
public class {PICE_CODE}MessageConverterTest {

    private {PICE_CODE}MessageConverter converter;

    @Before
    public void setUp() {
        converter = new {PICE_CODE}MessageConverter();
    }

    /**
     * 构造外围系统请求JSON报文
     * 模拟外围系统发送的原始MQ JSON报文
     */
    private JSONObject buildRequestJson() {
        JSONObject payload = new JSONObject();
        JSONObject body = new JSONObject();
        JSONObject requestDto = new JSONObject();
        requestDto.put("field1", "value1");
        body.put("requestDto", requestDto);
        payload.put("body", body);
        return payload;
    }

    @Test
    public void testFromMessage_normal() {
        JSONObject payload = buildRequestJson();
        Message<?> message = MessageBuilder.createMessage(payload, new MessageHeaders(null));

        JSONObject result = converter.fromMessage(message);

        assertNotNull("result不应为null", result);
        JSONObject requestDto = result.getJSONObject("requestDto");
        assertEquals("value1", requestDto.getString("field1"));
    }

    @Test
    public void testToMessage_normal() {
        JSONObject payload = buildRequestJson();
        Message<?> message = MessageBuilder.createMessage(payload, new MessageHeaders(null));

        JSONObject responseJson = new JSONObject();
        responseJson.put("retCode", "0000");
        responseJson.put("retMsg", "成功");

        Message<?> result = converter.toMessage(message, responseJson);

        assertNotNull("响应消息不应为null", result);
        String payloadStr = (String) result.getPayload();
        assertTrue("响应应包含retCode", payloadStr.contains("retCode"));
    }

    @Test
    public void testGetFunctionIdMapping() {
        String[] mapping = converter.getFunctionIdMapping();
        assertNotNull("映射不应为null", mapping);
        assertEquals("映射长度应为2", 2, mapping.length);
        assertEquals("外部服务码", "{PICE_CODE}", mapping[0]);
        assertEquals("内部功能号", "{PICE_CODE}", mapping[1]);
    }
}
```

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
- MessageConverterTest.java：**可独立执行的单元测试，包含模拟报文**
- 测试覆盖：正常解析、子节点缺失容错、响应组装、空数据容错、映射验证
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

## 关键工具类速查

| 工具类 | 路径 | 用途 | 适用银行 |
|--------|------|------|---------|
| AbstractMessageApplyResponseConverter | `adapter/as/.../msg/core/` | server端基类 | 所有银行 |
| AbstractGenericMessageRequestReplyConverter | `adapter/as/.../msg/generic/` | client端基类 | 所有银行 |
| AbstractYbinMessageApplyResponseConverter | `banks/ext-yibbank/.../msg/server/` | yibbank抽象基类(需显式getFunctionIdMapping) | yibbank |
| YbinChannelBaseMessageApplyResponseConverter | `banks/ext-yibbank/.../msg/server/` | yibbank渠道基类(自动推导getFunctionIdMapping) | yibbank |
| MessageXmlBuilder | `adapter/as/.../msg/converter/` | XML响应构建器 | XML风格银行 |
| MessageXmlParser | `adapter/as/.../msg/converter/` | XML报文解析器 | XML风格银行 |
| XmlDocument | `adapter/as/.../msg/xml/` | XML文档对象 | XML风格银行 |
| XmlNode | `adapter/as/.../msg/xml/` | XML节点对象 | XML风格银行 |
| HeadUtils | `banks/ext-{bank}/{bank}-adapter-as/.../msg/util/` | 银行专属报文头工具 | 各银行独立 |
| XmlUtil | `banks/ext-{bank}/{bank}-adapter-as/.../msg/util/` | 银行专属XML工具 | XML风格银行 |
| EncryptKeyUtils | `banks/ext-qinnbank/.../msg/util/` | 报文加解密工具 | qinnbank(credit) |
| MessageConstants | `banks/ext-{bank}/{bank}-adapter-as/.../msg/common/` | 银行专属常量 | 各银行独立 |
| @CloudReference | `com.hundsun.jrescloud.rpc.annotation` | 远程服务注入 | qinnbank ebank |

## 框架基类继承链

```
AbstractMessageConverter (adapter/as/.../msg/core/)
  ├── AbstractMessageApplyResponseConverter (server端)
  │     ├── getFunctionIdMapping() [抽象方法]
  │     └── fromMessage() / toMessage() [子类实现]
  └── AbstractMessageRequestReplyConverter (client端)
        └── AbstractGenericMessageRequestReplyConverter
              └── toMessage() / fromMessage() [子类实现]
```

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