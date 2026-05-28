# 测试用例 - ECIF广播机构客户合并 (PICE070701)

## 模块信息

| 字段 | 内容 |
|------|------|
| 功能名称 | ECIF广播机构客户合并 |
| 交易码 | 0402006 |
| 服务码映射 | EBBS.0402006.01 → PICE070701 |
| 所属银行 | 河南农信 (hnnxbank) |
| 实现类 | PICE070701MessageConverter |
| 基类 | AbstractMessageApplyResponseConverter |
| 代码路径 | banks/ext-hnnxbank/hnnxbank-adapter-as/src/main/java/com/hundsun/bemp/hnnxbank/adapter/msg/server/ecif/ |

## 功能说明

接收ECIF系统广播的机构客户合并XML报文，解析字段映射到Ecif4001ReqDto，调用Ecif4001Service完成客户合并处理。响应结果以XML格式返回给ECIF系统。

### 请求报文字段映射

| XML节点路径 | JSON字段 | 说明 |
|-------------|----------|------|
| body/request/isCust | operType | 操作类型（是否客户） |
| body/request/custNo | custNo | 客户号 |
| body/request/suspectCustNo | mrgdCustNo | 疑似客户号（被合并客户号） |
| body/request/mOrgCust/custSubtype | certType | 证件类型 |
| body/request/mOrgCust/lrCertNo | certNo | 证件号码 |
| body/request/mOrgCust/custNmcn | custName | 客户名称 |
| body/request/mOrgCust/lrName | mrgdCustName | 被合并客户名称 |
| body/request/mOrgCertInfo/certType | mrgdCertType | 被合并证件类型 |
| body/request/mOrgCertInfo/certNo | mrgdCertNo | 被合并证件号码 |

### 响应报文结构

```
transaction
├── header (由HeadUtils.jsonToSysHead构建)
├── retCode
├── retMsg
└── body
    └── response
        └── list
            └── data (num属性从1递增)
                ├── chkRsltRetCd
                ├── chkRsltRetRsn
                ├── custNo
                └── mrgdCustNo
```

---

## P0 核心功能测试

### TC-ECIFMRG-001：fromMessage正常解析-全字段映射验证

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-001 |
| 用例名称 | fromMessage正常解析-全字段映射验证（含mOrgCust和mOrgCertInfo） |
| 优先级 | P0 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备完整的ECIF客户合并XML报文（含ebbsHdrReq报文头和所有业务字段）
- Mock Message对象，Payload为构造好的XmlDocument

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造完整ECIF XML报文：body/request节点包含isCust、custNo、suspectCustNo字段，以及mOrgCust子节点（custSubtype/lrCertNo/custNmcn/lrName）、mOrgCertInfo子节点（certType/certNo），ebbsHdrReq节点包含报文头字段 | XML结构完整，所有节点非空 |
| 2 | 将XML报文包装为XmlDocument，构建Message\<XmlDocument\>对象 | Message对象构建成功 |
| 3 | 调用fromMessage(message)方法 | 方法正常返回，无异常抛出 |
| 4 | 验证返回JSONObject中各字段值 | operType=isCust值, custNo=custNo值, mrgdCustNo=suspectCustNo值, certType=custSubtype值, certNo=lrCertNo值, custName=custNmcn值, mrgdCustName=lrName值, mrgdCertType=certType值, mrgdCertNo=certNo值 |
| 5 | 验证Header字段 | Header包含opCode/version/channelNo/reqFlowNo/reqLegalNo/reqUserNo/reqBrchNo等报文头字段 |

**验证点**：
- [ ] 所有9个业务字段映射正确（operType/custNo/mrgdCustNo/certType/certNo/custName/mrgdCustName/mrgdCertType/mrgdCertNo）
- [ ] Header报文头字段正确提取
- [ ] request.requestDto嵌套结构正确
- [ ] 方法执行无异常

**预期结果**：fromMessage正确解析完整XML报文，所有字段正确映射到JSONObject的requestDto和Header节点中。

---

### TC-ECIFMRG-002：fromMessage正常解析-可选子节点mOrgCust缺失

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-002 |
| 用例名称 | fromMessage正常解析-可选子节点mOrgCust缺失 |
| 优先级 | P1 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备不含mOrgCust子节点的ECIF XML报文

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造XML报文：body/request节点包含isCust/custNo/suspectCustNo/mOrgCertInfo，但不包含mOrgCust子节点 | XML中无mOrgCust节点 |
| 2 | 调用fromMessage(message)方法 | 方法正常返回，无NullPointerException |
| 3 | 验证certType/certNo/custName/mrgdCustName字段 | 四个字段均为null（未设置） |

**验证点**：
- [ ] null检查生效：getSubNode("mOrgCust")返回null时不进入赋值分支
- [ ] certType/certNo/custName/mrgdCustName字段为null
- [ ] 其他非可选字段（operType/custNo/mrgdCustNo）正常解析
- [ ] mOrgCertInfo子节点字段正常解析

**预期结果**：mOrgCust子节点缺失时，对应字段不设置（保持null），其他字段正常解析，方法不抛出异常。

---

### TC-ECIFMRG-003：fromMessage正常解析-可选子节点mOrgCertInfo缺失

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-003 |
| 用例名称 | fromMessage正常解析-可选子节点mOrgCertInfo缺失 |
| 优先级 | P1 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备不含mOrgCertInfo子节点的ECIF XML报文

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造XML报文：body/request节点包含isCust/custNo/suspectCustNo/mOrgCust，但不包含mOrgCertInfo子节点 | XML中无mOrgCertInfo节点 |
| 2 | 调用fromMessage(message)方法 | 方法正常返回，无NullPointerException |
| 3 | 验证mrgdCertType/mrgdCertNo字段 | 两个字段均为null（未设置） |

**验证点**：
- [ ] null检查生效：getSubNode("mOrgCertInfo")返回null时不进入赋值分支
- [ ] mrgdCertType/mrgdCertNo字段为null
- [ ] 其他字段（operType/custNo/mrgdCustNo/certType/certNo/custName/mrgdCustName）正常解析

**预期结果**：mOrgCertInfo子节点缺失时，对应字段不设置（保持null），其他字段正常解析，方法不抛出异常。

---

### TC-ECIFMRG-004：fromMessage异常-必填节点body缺失

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-004 |
| 用例名称 | fromMessage异常处理-必填节点body缺失导致NullPointerException |
| 优先级 | P0 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（异常测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备不含body节点的异常XML报文

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造XML报文：根节点下无body子节点（或body节点不存在） | XML结构异常 |
| 2 | 调用fromMessage(message)方法 | 抛出NullPointerException（rootNode.getSubNode("body")返回null，继续调用.getSubNode("request")导致NPE） |

**验证点**：
- [ ] 捕获到NullPointerException
- [ ] 堆栈信息指向fromMessage中的rootNode.getSubNode("body").getSubNode("request")行

**预期结果**：当body节点缺失时，fromMessage方法抛出NullPointerException。**测试假设**：当前实现未对body节点做null防护，后续如需增强健壮性可在此用例基础上断言抛出自定义BempRuntimeException。

---

### TC-ECIFMRG-005：toMessage响应组装-正常retData数组

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-005 |
| 用例名称 | toMessage响应组装-正常retData数组（含多条数据） |
| 优先级 | P0 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备包含header/msg子节点的XmlDocument作为message payload
- 准备包含retCode/retMsg和retData数组的JSONObject

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造响应JSONObject：retCode="0000"，retMsg="成功"，retData数组包含2条数据（每条含chkRsltRetCd/chkRsltRetRsn/custNo/mrgdCustNo） | JSONObject结构完整 |
| 2 | 构造message：XmlDocument含header/msg子节点（含msgCd/seqNb/sndAppCd/sndDt/sndTm等字段） | XmlDocument含完整请求头信息 |
| 3 | 调用toMessage(message, jsonObject) | 方法正常返回Message对象 |
| 4 | 验证返回Message的payload XML结构 | XML包含transaction/header/retCode/retMsg/body/response/list路径 |
| 5 | 验证list节点下data节点数量 | data节点数为2，num属性分别为"1"和"2" |
| 6 | 验证每个data节点的子节点 | 每个data含chkRsltRetCd/chkRsltRetRsn/custNo/mrgdCustNo，值与JSON一致 |

**验证点**：
- [ ] retCode节点值="0000"
- [ ] retMsg节点值="成功"
- [ ] list/data节点数量=2
- [ ] 每个data节点的num属性递增（"1", "2"）
- [ ] 每个data节点包含完整4个子字段
- [ ] header响应报文头正确构建（refMsgCd/refSeqNb/sndAppCd/seqNb等）

**预期结果**：toMessage正确组装响应XML，retData数组正确映射为list/data结构的XML节点，每个data节点的num属性从1开始递增。

---

### TC-ECIFMRG-006：toMessage响应组装-retData为空数组

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-006 |
| 用例名称 | toMessage响应组装-retData为空数组 |
| 优先级 | P1 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备retData为空数组[]的JSONObject

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造响应JSONObject：retCode="0000"，retMsg="成功"，retData=空数组[] | retData为[] |
| 2 | 调用toMessage(message, jsonObject) | 方法正常返回，无异常 |
| 3 | 验证返回XML中无list节点 | body/response下无list子节点 |

**验证点**：
- [ ] retData.size()==0时跳过list节点创建
- [ ] XML中无list/data节点
- [ ] retCode/retMsg节点正常存在
- [ ] header节点正常存在

**预期结果**：retData为空数组时，不创建list节点，仅返回retCode/retMsg和header。

---

### TC-ECIFMRG-007：toMessage响应组装-retData为null

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-007 |
| 用例名称 | toMessage响应组装-retData为null |
| 优先级 | P1 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- 准备不含retData字段（或retData为null）的JSONObject

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造响应JSONObject：retCode="0000"，retMsg="成功"，不设置retData字段 | jsonObject.getJSONArray("retData")返回null |
| 2 | 调用toMessage(message, jsonObject) | 方法正常返回，无NullPointerException |
| 3 | 验证返回XML中无list节点 | body/response下无list子节点 |

**验证点**：
- [ ] null!=retData判空生效，不进入list构建分支
- [ ] XML中无list/data节点
- [ ] retCode/retMsg节点正常存在

**预期结果**：retData为null时，null检查生效，不创建list节点，方法不抛出NullPointerException。

---

### TC-ECIFMRG-008：服务码映射验证

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-008 |
| 用例名称 | getFunctionIdMapping服务码映射验证 |
| 优先级 | P0 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 单元测试（接口测试） |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 独立可执行 |

**前置条件**：
- 测试环境已配置JUnit测试框架
- PICE070701MessageConverter实例已创建

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 调用getFunctionIdMapping() | 返回长度为2的字符串数组 |
| 2 | 验证数组第0个元素 | 等于"EBBS.0402006.01" |
| 3 | 验证数组第1个元素 | 等于"PICE070701" |
| 4 | 调用afterPropertiesSet()触发映射注册 | 方法正常执行无异常 |
| 5 | 调用AbstractMessageApplyResponseConverter.getFunctionId("EBBS.0402006.01") | 返回"PICE070701" |
| 6 | 调用AbstractMessageApplyResponseConverter.getFunctionId("不存在的服务码") | 返回null |

**验证点**：
- [ ] 外部服务码为"EBBS.0402006.01"
- [ ] 内部功能号为"PICE070701"
- [ ] 映射注册后可通过getFunctionId查询
- [ ] 不存在的服务码查询返回null

**预期结果**：getFunctionIdMapping返回正确的服务码与功能号映射关系，afterPropertiesSet正确注册映射，getFunctionId可通过外部服务码正确查找到内部功能号。

---

## P1 集成测试

### TC-ECIFMRG-009：端到端客户合并流程-集成测试

| 字段 | 内容 |
|------|------|
| 用例编号 | TC-ECIFMRG-009 |
| 用例名称 | 端到端客户合并流程-完整请求响应链路验证 |
| 优先级 | P1 |
| 所属模块 | ECIF客户合并 |
| 测试类型 | 集成测试 |
| 银行环境 | hnnxbank |
| 跨模块可执行性 | 需专项数据 |

**前置条件**：
- 后端服务已启动（SpringBoot + MQ监听）
- ECIF模拟系统可发送XML报文到适配器MQ队列
- 数据库中存在可合并的机构客户数据（含证件信息）
- Ecif4001Service及其依赖服务可用

**测试步骤**：

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 构造完整ECIF客户合并XML请求报文，包含header（msgCd=ECIF.0402006.01）和body/request（含isCust/custNo/suspectCustNo/mOrgCust/mOrgCertInfo以及ebbsHdrReq） | XML报文格式正确 |
| 2 | 通过MQ发送XML报文到适配器监听队列 | 报文发送成功 |
| 3 | 适配器接收报文，路由到PICE070701MessageConverter | 路由正确，fromMessage被调用 |
| 4 | fromMessage成功解析报文，调用Ecif4001Service处理客户合并 | Service调用成功，返回处理结果 |
| 5 | toMessage将处理结果组装为响应XML | 响应XML格式正确 |
| 6 | 验证响应XML包含retCode="0000"和正确retData | 响应码成功，数据完整 |
| 7 | 验证数据库中客户数据已合并 | 原客户号数据关联到合并后客户号 |

**验证点**：
- [ ] MQ报文接收和路由正常
- [ ] fromMessage完整解析所有字段
- [ ] Ecif4001Service调用成功
- [ ] toMessage正确组装响应
- [ ] 响应XML通过ESB返回ECIF
- [ ] 数据库状态正确变更
- [ ] 日志记录完整（请求JSON和响应JSON均有info级别日志）

**预期结果**：全链路从MQ报文接收到响应XML返回均正常，客户合并业务逻辑正确执行，数据库状态与预期一致。

---

## 测试用例汇总统计

| 类型 | 数量 | P0 | P1 |
|------|------|-----|-----|
| 单元测试（正常流程） | 5 | 2 | 3 |
| 单元测试（异常流程） | 1 | 1 | 0 |
| 单元测试（服务映射） | 2 | 1 | 1 |
| 集成测试 | 1 | 0 | 1 |
| **总计** | **9** | **4** | **5** |

---

## Java单元测试文件

单元测试实现位于：
`banks/ext-hnnxbank/hnnxbank-adapter-as/src/test/java/com/hundsun/bemp/hnnxbank/adapter/msg/server/ecif/PICE070701MessageConverterTest.java`

测试框架：JUnit 4 + Mockito

### 关键测试方法

| 测试方法 | 对应用例 | 测试内容 |
|---------|---------|---------|
| testFromMessageFullFields | TC-ECIFMRG-001 | 完整XML解析，全字段映射验证 |
| testFromMessageWithoutMOrgCust | TC-ECIFMRG-002 | mOrgCust子节点缺失 |
| testFromMessageWithoutMOrgCertInfo | TC-ECIFMRG-003 | mOrgCertInfo子节点缺失 |
| testFromMessageMissingBody | TC-ECIFMRG-004 | body节点缺失异常 |
| testToMessageWithRetData | TC-ECIFMRG-005 | 正常retData数组响应 |
| testToMessageWithEmptyRetData | TC-ECIFMRG-006 | 空retData数组响应 |
| testToMessageWithNullRetData | TC-ECIFMRG-007 | null retData响应 |
| testGetFunctionIdMapping | TC-ECIFMRG-008 | 服务码映射验证 |