# 客户号合并广播接口开发 Spec

## Why
当前外围核心系统执行客户号合并操作后，票据系统虽能维护新客户号并完成账号同步，但企业信息报备模块中客户号与账号的关联关系未能同步更新，导致用户无法进行重新报备操作。需要开发客户号合并服务接口，接收ECIF系统客户号合并广播通知并执行相应处理，确保全系统客户号与账号关联关系的一致性。

## What Changes
- 改造 `PICE070701MessageConverter.java` 消息转换器，实现外围广播消息格式到产品服务接口的完整映射
- 实现外围报文字段到Ecif4001ReqDto的转换逻辑
- 实现响应报文从Ecif4001ResDto到外围格式的转换
- 处理数组字段（mOrgCust、mOrgCertInfo、mAddrInfo）的解析与转换

## Impact
- Affected specs: ECIF客户管理系统-机构客户合并前检查/修改
- Affected code: 
  - `banks/ext-hnnxbank/hnnxbank-adapter-as/src/main/java/com/hundsun/bemp/hnnxbank/adapter/msg/server/ecif/PICE070701MessageConverter.java`
  - 调用服务：`Ecif4001Service.operCustMergeByCustNo()`

## ADDED Requirements

### Requirement: 外围广播消息接收与转换
系统应能够接收ECIF系统发送的客户号合并广播消息，并将其转换为产品服务接口所需的请求格式。

#### Scenario: 成功接收并转换广播消息
- **WHEN** ECIF系统发送客户号合并广播消息
- **THEN** 系统应正确解析消息头和消息体
- **AND** 将外围字段映射到Ecif4001ReqDto
- **AND** 调用Ecif4001Service.operCustMergeByCustNo服务
- **AND** 将服务响应转换为外围响应报文格式

#### Scenario: 字段映射规则
- **WHEN** 解析外围广播消息
- **THEN** 应按照以下映射关系转换字段：
  - 外围txCode → 内部opCode
  - 外围tellerNo → 内部reqUserNo
  - 外围orgCode → 内部reqBrchNo
  - 外围custNo(保留客户号) → 内部custNo
  - 外围suspectCustNo(被合并客户号) → 内部mrgdCustNo
  - 外围isCust → 操作类型判断依据
  - 外围mOrgCust数组 → 客户基本信息
  - 外围mOrgCertInfo数组 → 证件信息
  - 外围mAddrInfo数组 → 地址信息

#### Scenario: 数组字段处理
- **WHEN** 解析包含数组字段的广播消息
- **THEN** 应正确解析mOrgCust数组的客户基本信息
- **AND** 正确解析mOrgCertInfo数组的证件信息
- **AND** 正确解析mAddrInfo数组的地址信息
- **AND** 将数组数据合理映射到请求DTO

### Requirement: 响应报文构造
系统应能够将产品服务的响应结果转换为外围系统要求的响应报文格式。

#### Scenario: 成功响应构造
- **WHEN** 服务调用成功
- **THEN** 构造包含retCode和retMsg的响应报文
- **AND** 包含检查结果返回码(chkRsltRetCd)
- **AND** 包含检查结果返回原因(chkRsltRetRsn)
- **AND** 包含保留客户号和被合并客户号

#### Scenario: 异常处理
- **WHEN** 消息解析或服务调用失败
- **THEN** 返回错误码和错误信息
- **AND** 记录详细错误日志

## MODIFIED Requirements

### Requirement: PICE070701MessageConverter消息转换器
原有的框架代码需要改造为完整的消息转换实现。

**改造内容**:
1. `fromMessage`方法：实现从XML消息到JSONObject的完整转换
2. `toMessage`方法：实现从JSONObject到XML响应消息的完整转换
3. `getFunctionIdMapping`方法：配置正确的功能号映射关系

**实现规范**:
- 继承AbstractMessageApplyResponseConverter
- 使用XmlUtil工具类解析XML节点
- 使用HeadUtils工具类处理报文头
- 参考PICE030505MessageConverter的实现模式
- 遵循BEMP项目编码规范

## REMOVED Requirements
无移除的需求。
