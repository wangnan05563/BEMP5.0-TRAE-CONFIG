# 广播机构客户合并（PICE070701）功能开发 Spec

## Why
当外围核心系统执行客户号合并操作后，票据系统虽能维护新客户号并完成账号同步，但企业信息报备模块中客户号与账号的关联关系未能同步更新，导致用户无法进行重新报备操作，影响业务连续性。需要开发PICE070701消息转换器，接收ECIF系统广播的客户号合并通知，调用产品现有Ecif4001Service服务完成全系统客户号与账号关联关系的一致性更新。

## What Changes
- 在河南农商银行适配器模块中新增PICE070701MessageConverter.java，实现ECIF广播消息的接收与转换
- 将外围报文（交易码0402006）字段映射到产品PICE070701服务（Ecif4001Service）的请求DTO
- 实现响应报文的组装，将Ecif4001ResDto转换为外围系统期望的XML格式返回

## Impact
- Affected specs: ECIF客户号合并广播消息接收与处理
- Affected code:
  - 新增文件: `banks/ext-hnnxbank/hnnxbank-adapter-as/src/main/java/com/hundsun/bemp/hnnxbank/adapter/msg/server/ecif/PICE070701MessageConverter.java`
  - 参考文件: `banks/ext-hnnxbank/hnnxbank-adapter-as/src/main/java/com/hundsun/bemp/hnnxbank/adapter/msg/server/credit/PICE030505MessageConverter.java`
  - 依赖服务: `served/api/cs/channel-api/src/main/java/com/hundsun/bemp/channel/service/ecif/Ecif4001Service.java`（PICE070701功能号）
  - 请求DTO: `served/api/cs/channel-api/src/main/java/com/hundsun/bemp/channel/service/ecif/dto/ecif4001/Ecif4001ReqDto.java`
  - 响应DTO: `served/api/cs/channel-api/src/main/java/com/hundsun/bemp/channel/service/ecif/dto/ecif4001/Ecif4001ResDto.java`

## ADDED Requirements

### Requirement: PICE070701消息转换器 - 外围报文接收与解析
系统SHALL提供PICE070701MessageConverter，继承AbstractMessageApplyResponseConverter，接收ECIF系统广播的机构客户合并XML报文并转换为内部JSON格式。

#### Scenario: 正常接收客户合并广播消息
- **WHEN** ECIF系统通过MQ广播发送交易码0402006的客户合并通知
- **THEN** PICE070701MessageConverter的fromMessage方法正确解析XML报文，提取以下字段并映射到Ecif4001ReqDto：
  - 外围字段映射关系（外围报文 → 内部DTO）：
    | 外围字段 | 外围路径 | 内部DTO字段 | 说明 |
    |---------|---------|-----------|------|
    | txCode | 根节点 | - | 交易编号，用于报文头 |
    | tellerNo | 根节点 | Header.reqUserNo | 柜员号 |
    | orgCode | 根节点 | Header.reqBrchNo | 机构码 |
    | isCust | 根节点 | requestDto.operType | 是否客户操作（映射为操作类型） |
    | custNo | 根节点 | requestDto.custNo | 保留客户号 |
    | suspectCustNo | 根节点 | requestDto.mrgdCustNo | 被合并客户号 |
    | mOrgCust.custSubtype | mOrgCust | requestDto.certType | 客户细分类型（映射为证件类型） |
    | mOrgCust.lrCertNo | mOrgCust | requestDto.certNo | 法人代表证件号码 |
    | mOrgCust.custNmcn | mOrgCust | requestDto.custName | 客户中文名 |
    | mOrgCertInfo.certType | mOrgCertInfo | requestDto.mrgdCertType | 证件类型（映射为被合并证件类型） |
    | mOrgCertInfo.certNo | mOrgCertInfo | requestDto.mrgdCertNo | 证件号码（映射为被合并证件号码） |
    | mOrgCust.lrName | mOrgCust | requestDto.mrgdCustName | 法人代表名称（映射为被合并客户名称） |

#### Scenario: 报文格式错误
- **WHEN** 接收到的XML报文格式异常或缺少必输字段
- **THEN** 系统抛出BempRuntimeException，记录错误日志，不进行后续处理

### Requirement: PICE070701消息转换器 - 响应报文组装
系统SHALL将Ecif4001Service处理后的响应结果转换为外围系统期望的XML格式返回报文。

#### Scenario: 正常响应组装
- **WHEN** Ecif4001Service返回Ecif4001ResDto
- **THEN** toMessage方法将响应DTO转换为XML报文，包含以下字段：
  - retCode: 返回码
  - retMsg: 返回信息
  - retData数组，每项包含：
    - chkRsltRetCd: 检查结果返回码
    - chkRsltRetRsn: 检查结果返回原因
    - custNo: 保留客户号
    - mrgdCustNo: 被归并客户号

### Requirement: PICE070701消息转换器 - 服务码映射
系统SHALL配置正确的外部服务码与内部功能号映射关系。

#### Scenario: 服务码映射配置
- **WHEN** PICE070701MessageConverter注册到Spring容器
- **THEN** getFunctionIdMapping返回映射数组，外部服务码为"EBBS.0402006.01"，内部功能号为"PICE070701"

### Requirement: 代码规范遵循
系统SHALL严格遵循河南农商银行适配器模块的代码规范。

#### Scenario: 代码风格一致性
- **WHEN** 开发PICE070701MessageConverter
- **THEN** 代码风格与PICE030505MessageConverter保持一致：
  - 使用XmlDocument/XmlNode解析XML报文
  - 使用XmlUtil.getNodeValue获取节点值
  - 使用HeadUtils.sysHeadToJson封装报文头
  - 使用HeadUtils.jsonToSysHead封装响应头
  - 使用MessageXmlBuilder构建响应XML
  - 使用MessageConstants中的常量
  - Component注解value为"PICE070701MessageConverter"

### Requirement: 代码评审与质量扫描
系统SHALL通过前端/后端代码评审及SonarQube质量扫描，确保代码质量与项目规范一致。

#### Scenario: 后端代码评审通过
- **WHEN** PICE070701MessageConverter.java开发完成后执行后端代码评审
- **THEN** 评审结果严重=0且主要=0，代码符合规范无阻塞项

#### Scenario: 代码质量扫描通过
- **WHEN** 对新增代码执行SonarQube质量门禁检查
- **THEN** 无新增阻断级问题，代码质量达标

### Requirement: 单元测试
系统SHALL编写单元测试用例验证PICE070701MessageConverter的消息接收、字段映射及服务调用正确性。

#### Scenario: 正常报文解析测试
- **WHEN** 输入符合外围接口规范的XML报文（交易码0402006）
- **THEN** fromMessage方法正确解析所有字段，映射到Ecif4001ReqDto的JSON结构无遗漏

#### Scenario: 异常场景测试
- **WHEN** 输入格式异常的XML报文、缺少必输字段的报文或服务调用失败的场景
- **THEN** 系统抛出BempRuntimeException并记录错误日志，不进行后续处理

#### Scenario: 响应报文组装测试
- **WHEN** 模拟Ecif4001Service返回Ecif4001ResDto
- **THEN** toMessage方法正确转换为外围系统期望的XML格式，包含retCode、retMsg及retData数组

### Requirement: 集成测试
系统SHALL通过模拟ECIF系统广播消息，验证端到端业务流程的正确性。

#### Scenario: 端到端客户合并流程验证
- **WHEN** 模拟ECIF系统发送客户号合并广播通知
- **THEN** 票据系统正确接收消息、解析报文、调用Ecif4001Service完成处理，企业信息报备模块中客户号与账号关联关系正确更新

#### Scenario: 服务调用失败场景
- **WHEN** Ecif4001Service调用失败
- **THEN** 系统返回错误响应报文，retCode为非零值，retMsg包含错误描述

### Requirement: 交付文档
系统SHALL输出详细设计文档与测试用例文档作为项目交付物。

#### Scenario: 详细设计文档
- **WHEN** 功能开发与测试全部完成
- **THEN** 输出详细设计文档，包含字段映射关系、处理逻辑说明、接口调用流程

#### Scenario: 测试用例文档
- **WHEN** 测试用例编制与评审完成
- **THEN** 输出测试用例文档，包含正常场景、异常场景、边界条件用例及测试报告

## MODIFIED Requirements
无修改需求。

## REMOVED Requirements
无移除需求。
