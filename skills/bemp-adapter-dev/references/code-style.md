# MessageConverter代码风格规范

## 类结构模板

### XML报文模式（hnnxbank/shaoxbank等）

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

### JSON报文+银行基类模式（yibbank等）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.{bank}.adapter.msg.server.{BankBaseClass};
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * {功能中文名}
 * 外围交易码: {txCode}  内部功能号: {PICE_CODE}
 * 外围系统: {ECIF/信贷/核心}  报文格式: JSON
 * 产品接口: {EcifXXXService}.{methodName}
 */
@Component("{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends {BankBaseClass} {
```

### JSON报文直通模式（qinnbank等）

```java
package com.hundsun.bemp.{bank}.adapter.msg.server.{module};

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

/**
 * {功能中文名}
 * 外围交易码: {txCode}  内部功能号: {PICE_CODE}
 * 外围系统: {ECIF/信贷/核心}  报文格式: JSON
 * 产品接口: {EcifXXXService}.{methodName}
 */
@Component("{PICE_CODE}MessageConverter")
public class {PICE_CODE}MessageConverter extends AbstractMessageApplyResponseConverter {
```

## 注释规范（强制）

### 类级注释
每个MessageConverter必须有类级注释，包含：
- 功能中文名
- 外围交易码和内部功能号
- 外围系统名称和报文格式
- 产品接口引用

### fromMessage字段注释
每个put操作必须带行内注释，格式：`// {外围字段名}-{中文名}({类型}/{是否必输})`
当外围字段名与内部DTO字段名不同时：`// {外围字段名}-{中文名}({类型})→{内部DTO字段名}`

```java
requestDto.put("operType", XmlUtil.getNodeValue(requestNode, "isCust")); // isCust-是否客户操作(S(1)/Y)
requestDto.put("custNo", XmlUtil.getNodeValue(requestNode, "custNo")); // custNo-保留客户号(S(13))
requestDto.put("mrgdCustNo", XmlUtil.getNodeValue(requestNode, "suspectCustNo")); // suspectCustNo-被合并客户号(S(13))→mrgdCustNo
```

### toMessage字段注释
每个createElement操作必须带行内注释，格式：`// {字段名}-{中文名}`

```java
data.createElement("chkRsltRetCd").addText(reqInfo.getString("chkRsltRetCd")); // chkRsltRetCd-检查结果返回码
data.createElement("custNo").addText(reqInfo.getString("custNo")); // custNo-保留客户号（ECIF）
```

### 子节点注释
子节点获取前必须标注子节点含义：

```java
// mOrgCust-机构客户信息子节点
XmlNode mOrgCust = requestNode.getSubNode("mOrgCust");
if (null != mOrgCust) {
    requestDto.put("certType", XmlUtil.getNodeValue(mOrgCust, "custSubtype")); // custSubtype-客户细分类型(S(3))→certType
}
```

### 数组字段注释
数组循环前必须标注数组含义：

```java
// mOrgCertInfo-机构客户证件信息(数组)
List<XmlNode> certInfoList = requestNode.getSubNodes("mOrgCertInfo");
JSONArray certInfoArray = new JSONArray();
for (int i = 0; i < certInfoList.size(); i++) {
    XmlNode certInfo = certInfoList.get(i);
    JSONObject item = new JSONObject();
    item.put("certType", XmlUtil.getNodeValue(certInfo, "certType")); // certType-证件类型(S(2))
    certInfoArray.add(item);
}
```

## 核心方法规范

### getFunctionIdMapping
```java
@Override
public String[] getFunctionIdMapping() {
    // 外部服务码{ext_code}映射到内部功能号{PICE_CODE}
    return new String[]{
        "{ext_service_code}",
        "{PICE_CODE}"
    };
}
```

外部服务码格式（按渠道区分）：
- ECIF渠道: `ECIF.{交易码}0.01`（注意交易码后补0，如ECIF.04020060.01）
- 信贷渠道: `EBBS.{服务码}.01`（如EBBS.02104300.01）
- BUP/CMS渠道: `{渠道}.000{服务码}0.01`（如BUP.00007000010.01）
- JYT渠道: `JYT.{服务码}0.01`
- 核心渠道: 遵循各银行约定
- JSON报文银行: 内外相同，直接用PICE代码

### fromMessage - XML报文模式

```java
@Override
public JSONObject fromMessage(Message<?> message) {
    XmlDocument xmlDocument = (XmlDocument) message.getPayload();
    XmlNode rootNode = xmlDocument.getRoot();

    JSONObject request = new JSONObject();
    XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");

    // 封装业务字段到requestDto
    JSONObject requestDto = new JSONObject();
    requestDto.put("field1", XmlUtil.getNodeValue(requestNode, "xmlField1")); // xmlField1-中文名(S(32)/Y)
    requestDto.put("field2", XmlUtil.getNodeValue(requestNode, "xmlField2")); // xmlField2-中文名(S(13))

    // subNodeName-子节点中文名
    XmlNode subNode = requestNode.getSubNode("subNodeName");
    if (null != subNode) {
        requestDto.put("field3", XmlUtil.getNodeValue(subNode, "subField1")); // subField1-子字段中文名(S(2))
    }

    request.put("requestDto", requestDto);

    // 封装报文头
    JSONObject req = HeadUtils.sysHeadToJson(request, requestNode);

    // ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq，需手动覆盖Header
    JSONObject header = req.getJSONObject("Header");
    if (null != header) {
        header.put("reqUserNo", XmlUtil.getNodeValue(requestNode, "tellerNo")); // tellerNo-柜员号(S(32)/Y)
        header.put("reqBrchNo", XmlUtil.getNodeValue(requestNode, "orgCode")); // orgCode-机构码(S(32)/Y)
    }

    logger.info("{PICE_CODE}MessageConverter请求json", req);
    return req;
}
```

### fromMessage - JSON报文模式

```java
@Override
public JSONObject fromMessage(Message<?> message) {
    JSONObject jsonObject = (JSONObject) message.getPayload();
    JSONObject body = jsonObject.getJSONObject("body");
    JSONObject requestDto = body.getJSONObject("requestDto");
    // 直接操作JSON，按需转换字段名
    requestDto.put("targetField", requestDto.getString("sourceField")); // sourceField-中文名→targetField
    return body;
}
```

### toMessage - XML报文模式

```java
@Override
public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
    logger.info("{PICE_CODE}MessageConverter响应json", jsonObject);
    XmlDocument xmlDocument = (XmlDocument) message.getPayload();
    XmlNode header = xmlDocument.getRoot().getSubNode("header");
    MessageXmlBuilder transaction = MessageXmlBuilder.create("transaction");
    MessageXmlBuilder response = HeadUtils.jsonToSysHead(header, jsonObject, transaction);
    response.createElement("retCode").addText(jsonObject.getString("retCode")); // retCode-返回码
    response.createElement("retMsg").addText(jsonObject.getString("retMsg")); // retMsg-返回信息

    JSONArray retData = jsonObject.getJSONArray("retData");
    MessageXmlBuilder retDataXml = response.createElement("body").createElement("response");

    if (null != retData && retData.size() > 0) {
        MessageXmlBuilder list = retDataXml.createElement("list");
        for (int i = 0; i < retData.size(); i++) {
            JSONObject reqInfo = retData.getJSONObject(i);
            MessageXmlBuilder data = list.createElement("data")
                .addAttribute(MessageConstants.NUM, String.valueOf(i + 1));
            data.createElement("field1").addText(reqInfo.getString("field1")); // field1-中文名
            data.createElement("field2").addText(reqInfo.getString("field2")); // field2-中文名
        }
    }

    return super.getMessage(response.asXML());
}
```

### toMessage - JSON报文模式

```java
@Override
public Message<?> toMessage(Message<?> message, JSONObject jsonObject) {
    return super.getMessage(jsonObject.toJSONString());
}
```

## 工具类使用规范

| 工具 | 用途 | 适用银行 | 调用方式 |
|------|------|---------|---------|
| XmlUtil.getNodeValue | 安全获取XML节点文本值 | XML报文银行 | `XmlUtil.getNodeValue(xmlNode, "key")` |
| XmlUtil.xmlNodeIsNull | 获取节点值，null返回空串 | XML报文银行 | `XmlUtil.xmlNodeIsNull(node.getSubNode("key"))` |
| HeadUtils.sysHeadToJson | 封装请求报文头 | hnnxbank | `HeadUtils.sysHeadToJson(request, requestNode)` |
| HeadUtils.jsonToSysHead | 封装响应报文头 | hnnxbank | `HeadUtils.jsonToSysHead(header, jsonObject, transaction)` |
| MessageXmlBuilder | 构建XML响应 | XML报文银行 | `MessageXmlBuilder.create("root")` |
| MessageConstants.NUM | 数组元素序号属性 | hnnxbank | `.addAttribute(MessageConstants.NUM, String.valueOf(i + 1))` |
| ConvertUtils | 通用报文解析 | shaoxbank | `ConvertUtils.commonRequestBody(message)` |
| CommonService | 通用文本提取 | shaoxbank | `commonService.getTextByMap(body.get("field"))` |

## 命名规范

| 项目 | 规则 | 示例 |
|------|------|------|
| 文件名 | {PICE_CODE}MessageConverter.java | PICE070701MessageConverter.java |
| Component名 | {PICE_CODE}MessageConverter | PICE070701MessageConverter |
| 模块目录 | 按业务域划分 | ecif/credit/ebank/approve |
| 日志前缀 | {PICE_CODE}MessageConverter | PICE070701MessageConverter请求json |
| 测试类名 | {PICE_CODE}MessageConverterTest.java | PICE070701MessageConverterTest.java |
