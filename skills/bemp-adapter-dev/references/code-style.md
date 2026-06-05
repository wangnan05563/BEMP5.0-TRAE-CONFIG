# MessageConverter 代码风格规范

## 类结构模板

### XML 报文模式

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
 * 外围系统: {ECIF/信贷/核心}  报文格式: {XML/JSON}
 * 产品接口: {EcifXXXService}.{methodName}
 */
@Component(value = "{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends AbstractMessageApplyResponseConverter {
```

### JSON 报文+银行基类模式

```java
@Component("{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends {BankBaseClass} {
```

### JSON 报文直通模式

```java
@Component("{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends AbstractMessageApplyResponseConverter {
```

## 注释规范（强制）

### 类级注释
每个 MessageConverter 必须有：功能中文名、外围交易码和内部功能号、外围系统名称和报文格式、产品接口引用

### fromMessage 字段注释
每个 put 操作必须带行内注释：`// {外围字段名}-{中文名}({类型}/{是否必输})`
字段名不同时：`// {外围字段名}-{中文名}({类型})→{内部DTO字段名}`

```java
requestDto.put("operType", XmlUtil.getNodeValue(requestNode, "isCust")); // isCust-是否客户操作(S(1)/Y)
requestDto.put("mrgdCustNo", XmlUtil.getNodeValue(requestNode, "suspectCustNo")); // suspectCustNo-被合并客户号(S(13))→mrgdCustNo
```

### toMessage 字段注释
每个 createElement 操作：`// {字段名}-{中文名}`

### 子节点/数组注释
子节点获取前标注含义；数组循环前标注数组含义

## 核心方法规范

### getFunctionIdMapping
```java
@Override
public String[] getFunctionIdMapping() {
    return new String[]{ "{ext_service_code}", "{PICE_CODE}" };
}
```

外部服务码格式按渠道区分：
- ECIF: `ECIF.{交易码}0.01`
- 信贷: `EBBS.{服务码}.01`
- BUP/CMS: `{渠道}.000{服务码}0.01`
- JYT: `JYT.{服务码}0.01`
- JSON 报文银行: 内外相同，直接用 PICE 代码

### fromMessage - XML 模式
```java
@Override
public JSONObject fromMessage(Message<?> message) {
    XmlDocument xmlDocument = (XmlDocument) message.getPayload();
    XmlNode rootNode = xmlDocument.getRoot();
    JSONObject request = new JSONObject();
    XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");
    JSONObject requestDto = new JSONObject();
    // 字段映射...
    request.put("requestDto", requestDto);
    JSONObject req = HeadUtils.sysHeadToJson(request, requestNode);
    logger.info("{PICE_CODE}MessageConverter请求json", req);
    return req;
}
```

### fromMessage - JSON 模式
```java
@Override
public JSONObject fromMessage(Message<?> message) {
    JSONObject jsonObject = (JSONObject) message.getPayload();
    JSONObject requestDto = jsonObject.getJSONObject("body").getJSONObject("requestDto");
    // 按需转换字段名
    return jsonObject;
}
```

### toMessage - XML 模式
```java
@Override
public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
    XmlDocument xmlDocument = (XmlDocument) message.getPayload();
    XmlNode header = xmlDocument.getRoot().getSubNode("header");
    MessageXmlBuilder transaction = MessageXmlBuilder.create("transaction");
    MessageXmlBuilder response = HeadUtils.jsonToSysHead(header, jsonObject, transaction);
    response.createElement("retCode").addText(jsonObject.getString("retCode"));
    response.createElement("retMsg").addText(jsonObject.getString("retMsg"));
    return super.getMessage(response.asXML());
}
```

### toMessage - JSON 模式
```java
@Override
public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
    return super.getMessage(jsonObject.toJSONString());
}
```

## 工具类使用

| 工具 | 用途 | 调用方式 |
|------|------|---------|
| XmlUtil.getNodeValue | 安全获取 XML 节点文本值 | `XmlUtil.getNodeValue(xmlNode, "key")` |
| HeadUtils.sysHeadToJson | 封装请求报文头 | `HeadUtils.sysHeadToJson(request, requestNode)` |
| HeadUtils.jsonToSysHead | 封装响应报文头 | `HeadUtils.jsonToSysHead(header, jsonObject, transaction)` |
| MessageXmlBuilder | 构建 XML 响应 | `MessageXmlBuilder.create("root")` |
| MessageConstants.NUM | 数组元素序号属性 | `.addAttribute(MessageConstants.NUM, String.valueOf(i + 1))` |

## 命名规范

| 项目 | 规则 | 示例 |
|------|------|------|
| 文件名 | {PICE_CODE}MessageConverter.java | PICE070701MessageConverter.java |
| Component 名 | {PICE_CODE}MessageConverter | PICE070701MessageConverter |
| 模块目录 | 按业务域划分 | ecif/credit/ebank/approve |
| 日志前缀 | {PICE_CODE}MessageConverter | PICE070701MessageConverter请求json |
| 测试类名 | {PICE_CODE}MessageConverterTest.java | PICE070701MessageConverterTest.java |
| 测试框架 | JUnit5 + @SpringBootTest + @ActiveProfiles("test") | 继承AbstractAdapterConverterTest |
| mock报文 | src/test/resources/mock-msg/<converter>/ | sanxbank_ebank_PICE070101_newBill_request.json |
