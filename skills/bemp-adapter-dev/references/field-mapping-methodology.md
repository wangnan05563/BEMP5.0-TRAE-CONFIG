# 字段映射方法论

## 映射分析三步法

### 第一步：提取外围字段清单
从需求文档中提取外围接口字段定义，关注：
- 字段英文名、中文名、类型/长度、是否必输
- 字段路径（根节点/子节点/数组节点）
- 数组类型字段（如mOrgCust、mOrgCertInfo、mAddrInfo）

### 第二步：提取内部DTO字段清单
从产品接口DTO中提取内部字段，关注：
- EcifXXXReqDto的字段名和含义
- EcifXXXResDto的字段名和含义
- BaseEcifReqDto/BaseEcifResDto的继承字段

### 第三步：建立映射矩阵
对比外围字段与内部DTO字段，按以下规则建立映射：

| 映射类型 | 判断依据 | 处理方式 |
|---------|---------|---------|
| 直接映射 | 字段名相同，语义一致 | 直接put |
| 重命名映射 | 字段名不同，语义一致 | 标注映射关系（如suspectCustNo→mrgdCustNo） |
| 语义映射 | 字段名不同，语义相近 | 标注映射依据（如custSubtype→certType） |
| 位置映射 | 字段在不同层级 | 标注覆盖逻辑（如tellerNo→Header.reqUserNo） |
| 缺失映射 | 外围有但内部无 | 标注"不映射"，说明原因 |
| 补充映射 | 内部有但外围无 | 标注"内部默认值"，说明来源 |

## 多银行映射差异

不同银行的报文格式和字段命名存在差异，映射方法论需适配三种模式：

### XML报文模式（hnnxbank/shaoxbank等）

**特征**：外围系统发送XML格式MQ报文，需通过XmlDocument/XmlNode逐节点解析

**映射要点**：
- 外围字段名与内部DTO字段名通常不一致，需要逐字段映射
- XML有层级结构，子节点需通过`getSubNode()`逐层获取
- Header字段位置特殊：ECIF报文中tellerNo/orgCode在request节点而非ebbsHdrReq
- 响应需通过MessageXmlBuilder逐节点构建XML

**注释要求**：每个字段映射必须标注外围字段名（接口文档原文）

```java
// isCust: 外围"是否客户"标志（1=是,0=否） → 内部operType操作类型
requestDto.put("operType", XmlUtil.getNodeValue(requestNode, "isCust"));
// suspectCustNo: 外围"疑似客户号" → 内部mrgdCustNo被合并客户号
requestDto.put("mrgdCustNo", XmlUtil.getNodeValue(requestNode, "suspectCustNo"));
```

### JSON+银行基类模式（yibbank等）

**特征**：外围系统发送JSON格式MQ报文，银行有统一基类处理通用逻辑

**映射要点**：
- YbinChannelBaseMessageApplyResponseConverter基类已实现fromMessage/toMessage通用逻辑
- fromMessage直接提取payload中的body节点返回
- toMessage通过XmlUtil.buildSuccessMessage构建成功响应
- 大部分Converter为空壳类，字段名与外围一致时无需映射
- 仅当字段名不一致或需要特殊处理时才覆写方法

**注释要求**：空壳类需标注"字段与外围一致，无需映射"；覆写方法需标注映射关系

```java
/**
 * PICE030505信贷查询
 * JSON报文字段与内部DTO完全一致，无需映射转换
 * 基类YbinChannelBaseMessageApplyResponseConverter处理通用逻辑
 */
@Component("PICE030505MessageConverter")
public class PICE030505MessageConverter extends YbinChannelBaseMessageApplyResponseConverter {
}
```

### JSON直通模式（qinnbank等）

**特征**：外围系统发送JSON格式MQ报文，无银行统一基类，每个Converter自行处理

**映射要点**：
- payload直接为JSONObject，通过getJSONObject/getJSONArray提取字段
- 字段名通常与内部DTO一致，但部分接口需要补充处理（如查询行名）
- toMessage通常直接透传或简单封装
- 部分Converter需要注入@CloudReference服务进行数据补充

**注释要求**：标注JSON路径和字段含义

```java
// operCode: 操作代码（OC00=新增,OC01=修改） → 决定处理分支
String operCode = requestDto.getString("operCode");
// billOrigin: 票据来源（CS01=电票,CS02=纸票） → 决定行名查询方式
String billOrigin = jsonObject1.getString("billOrigin");
```

### 三种模式映射对比

| 维度 | XML模式 | JSON+基类模式 | JSON直通模式 |
|------|---------|-------------|------------|
| 报文格式 | XML | JSON | JSON |
| 解析方式 | XmlDocument/XmlNode | 基类自动提取body | 手动getJSONObject |
| 字段映射 | 逐字段映射，名称通常不同 | 通常无需映射 | 部分需映射 |
| 基类 | AbstractMessageApplyResponseConverter | YbinChannelBaseMessageApplyResponseConverter | AbstractMessageApplyResponseConverter |
| 响应构建 | MessageXmlBuilder逐节点 | XmlUtil.buildSuccessMessage | 直接toJSONString |
| Header处理 | HeadUtils.sysHeadToJson/jsonToSysHead | 基类处理 | 通常无需处理 |
| 代码复杂度 | 高 | 低 | 中 |
| 注释重点 | 外围字段名→内部字段名映射 | 标注是否需要覆写 | JSON路径和字段含义 |

## 常见映射模式

### ECIF报文Header映射（XML模式特有）
ECIF报文中tellerNo和orgCode通常在request节点而非ebbsHdrReq中，需手动覆盖：
```java
// ECIF报文中tellerNo和orgCode在request节点而非ebbsHdrReq，需手动覆盖Header
JSONObject header = req.getJSONObject("Header");
if (null != header) {
    // tellerNo: 外围"柜员号" → Header.reqUserNo请求用户号
    header.put("reqUserNo", XmlUtil.getNodeValue(requestNode, "tellerNo"));
    // orgCode: 外围"机构号" → Header.reqBrchNo请求机构号
    header.put("reqBrchNo", XmlUtil.getNodeValue(requestNode, "orgCode"));
}
```

### 操作类型映射
外围isCust字段通常映射为内部operType：
- isCust="1" → operType为校验
- isCust="0" → operType为修改

### 客户号映射
- custNo → custNo（保留客户号，直接映射）
- suspectCustNo → mrgdCustNo（被合并客户号，重命名映射）

### 数组字段映射（XML模式）
外围数组字段需循环解析：
```java
// mOrgCust: 外围"机构客户信息"数组节点 → 内部客户信息字段
XmlNode mOrgCust = requestNode.getSubNode("mOrgCust");
if (null != mOrgCust) {
    // custSubtype: 外围"客户子类型" → 内部certType证件类型
    requestDto.put("certType", XmlUtil.getNodeValue(mOrgCust, "custSubtype"));
    // lrCertNo: 外围"法人证件号" → 内部certNo证件号码
    requestDto.put("certNo", XmlUtil.getNodeValue(mOrgCust, "lrCertNo"));
}
```

### 数组字段映射（JSON模式）
JSON模式下数组通过JSONArray处理：
```java
// reqInfoList: 外围"请求信息列表" → 内部请求明细数组
JSONArray reqInfoList = requestDto.getJSONArray("reqInfoList");
for (int i = 0; i < reqInfoList.size(); i++) {
    JSONObject item = reqInfoList.getJSONObject(i);
    // 逐条处理映射
}
```

## 映射验证清单
- [ ] 外围必输字段均有映射目标
- [ ] 内部DTO必填字段均有映射来源
- [ ] 字段类型兼容（字符串/数字/日期）
- [ ] 数组字段映射逻辑完整
- [ ] Header字段位置正确处理（XML模式）
- [ ] 字段映射注释已标注外围字段名（接口文档原文）
- [ ] 多银行差异已在注释中标注（如适用）
- [ ] ECIF渠道Header覆盖已实现（tellerNo→reqUserNo, orgCode→reqBrchNo）
- [ ] ECIF渠道isCust字段从报文提取，未固定为"1"
- [ ] ECIF数组字段取值策略已确认（取首条/取主证件标志）

## 渠道特殊映射规则（新增）

### ECIF渠道
| 规则 | 说明 | 代码模式 |
|------|------|---------|
| Header覆盖 | tellerNo/orgCode在request节点而非ebbsHdrReq | sysHeadToJson后手动覆盖Header |
| operType映射 | isCust字段映射为operType | `XmlUtil.getNodeValue(requestNode, "isCust")` |
| 数组取首条 | mOrgCertInfo数组取第一条 | `mOrgCertInfos.get(0)` |
| 服务码格式 | ECIF.{交易码}0.01 | 交易码后补0 |

### 信贷渠道
| 规则 | 说明 | 代码模式 |
|------|------|---------|
| Header无需覆盖 | tellerNo/orgCode在ebbsHdrReq中 | sysHeadToJson自动提取 |
| 服务码格式 | EBBS.{服务码}.01 | 标准格式 |
