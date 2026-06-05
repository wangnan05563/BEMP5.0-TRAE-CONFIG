# 字段映射方法论

## 映射类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 直接映射 | 外围字段名 = 内部 DTO 字段名 | `custNo` → `custNo` |
| 重命名映射 | 外围字段名 ≠ 内部 DTO 字段名 | `suspectCustNo` → `mrgdCustNo` |
| 语义映射 | 外围字段含义与内部不同，需转换 | `isCust`(S/Y) → `operType`(1/2) |
| 嵌套映射 | 外围嵌套结构需展平 | `body.request.custNo` → `custNo` |
| 数组映射 | 外围数组 → 内部 JSONArray | `custList.cust[]` → `custArray` |

## XML 报文字段映射

### 请求解析（fromMessage）
```java
XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");
JSONObject requestDto = new JSONObject();
// 直接映射
requestDto.put("custNo", XmlUtil.getNodeValue(requestNode, "custNo")); // custNo-客户号(S(13))
// 重命名映射
requestDto.put("mrgdCustNo", XmlUtil.getNodeValue(requestNode, "suspectCustNo")); // suspectCustNo-被合并客户号(S(13))→mrgdCustNo
// 语义映射
String isCust = XmlUtil.getNodeValue(requestNode, "isCust"); // isCust-是否客户操作(S(1)/Y)
requestDto.put("operType", "S".equals(isCust) ? "1" : "2");
```

### 响应拼装（toMessage）
```java
MessageXmlBuilder response = HeadUtils.jsonToSysHead(header, jsonObject, transaction);
response.createElement("retCode").addText(jsonObject.getString("retCode")); // retCode-返回码
response.createElement("retMsg").addText(jsonObject.getString("retMsg"));   // retMsg-返回信息
// 数组
JSONArray details = jsonObject.getJSONArray("details");
for (int i = 0; i < details.size(); i++) {
    JSONObject detail = details.getJSONObject(i);
    MessageXmlBuilder detailNode = response.createElement("detail");
    detailNode.addAttribute(MessageConstants.NUM, String.valueOf(i + 1));
    detailNode.createElement("acctNo").addText(detail.getString("acctNo")); // acctNo-账号
}
```

## JSON 报文字段映射

### 直通模式（大部分字段名一致）
```java
JSONObject requestDto = jsonObject.getJSONObject("body").getJSONObject("requestDto");
// 仅处理不一致字段
if (requestDto.containsKey("suspectCustNo")) {
    requestDto.put("mrgdCustNo", requestDto.remove("suspectCustNo"));
}
```

### 银行基类模式（大部分字段由基类处理）
```java
// 仅重写需要特殊处理的字段
@Override
public JSONObject fromMessage(Message<?> message) {
    JSONObject jsonObject = (JSONObject) message.getPayload();
    // 基类已处理标准字段，仅补充银行特有逻辑
    return jsonObject;
}
```

## 字段映射检查清单

- [ ] 每个外围字段都有对应内部 DTO 字段（或标注"待确认"）
- [ ] 字段类型匹配（String/Number/Array）
- [ ] 必输字段在映射中未遗漏
- [ ] 重命名映射已在注释中标注
- [ ] 语义映射已实现转换逻辑
- [ ] 数组映射已处理空数组和单元素场景
