# BEMP河南农信(hnnxbank)个性化后端代码走查报告

| 项目 | 内容 |
|------|------|
| 银行 | 河南农信(hnnxbank) |
| 审查日期 | 2026-05-20 |
| 审查范围 | 5个需求模块相关6个Java文件 |
| sourceDir | banks/ext-hnnxbank |
| packagePath | com.hundsun.bemp.hnnxbank |
| classPrefix | HnnxBank / Hnnx |
| dtoPrefix | Hnnx |
| urlPrefixes | /hnnx/, /hnnxbank/, /banks/hnnxbank/ |

---

## 审查问题统计

| 级别 | 数量 | 说明 |
|------|------|------|
| 🔴 阻塞 | 3 | 必须修复才能上线 |
| 🟠 严重 | 5 | 应尽快修复 |
| 🟡 警告 | 9 | 建议修复 |
| 🟢 提示 | 5 | 可优化 |
| **合计** | **22** | |

---

## 阶段1：前置检查结果

### 1.1 文件位置检查

| 文件 | 路径 | 结果 |
|------|------|------|
| HnnxbankBranchAdminController | banks/ext-hnnxbank/hnnxbank-biz-as/.../sm/controller/branch/ | ✅ 通过 |
| HnnxRoleServiceImpl | banks/ext-hnnxbank/hnnxbank-biz-as/.../sm/service/impl/role/ | ✅ 通过 |
| HnnxBankCustCorpSignServiceImpl | banks/ext-hnnxbank/hnnxbank-biz-as/.../bm/sign/service/impl/cpes/cpes/ | ✅ 通过 |
| HnnxAcceptBankCreditServiceImpl | banks/ext-hnnxbank/hnnxbank-biz-as/.../pc/credit/service/impl/ | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | banks/ext-hnnxbank/hnnxbank-biz-as/.../pc/credit/controller/ | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | banks/ext-hnnxbank/hnnxbank-biz-as/.../pc/credit/controller/ | ✅ 通过 |

### 1.2 包结构检查

| 文件 | 包路径 | 结果 |
|------|--------|------|
| HnnxbankBranchAdminController | com.hundsun.bemp.hnnxbank.biz.sm.controller.branch | ✅ 通过 |
| HnnxRoleServiceImpl | com.hundsun.bemp.hnnxbank.biz.sm.service.impl.role | ✅ 通过 |
| HnnxBankCustCorpSignServiceImpl | com.hundsun.bemp.hnnxbank.biz.bm.sign.service.impl.cpes.cpes | ✅ 通过 |
| HnnxAcceptBankCreditServiceImpl | com.hundsun.bemp.hnnxbank.biz.pc.credit.service.impl | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | com.hundsun.bemp.hnnxbank.biz.pc.credit.controller | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | com.hundsun.bemp.hnnxbank.biz.pc.credit.controller | ✅ 通过 |

### 1.3 类名前缀检查

| 文件 | 类名 | 前缀 | 结果 |
|------|------|------|------|
| HnnxbankBranchAdminController | Hnnxbank | Controller用Hnnxbank | ✅ 通过 |
| HnnxRoleServiceImpl | Hnnx | Service用Hnnx | ✅ 通过 |
| HnnxBankCustCorpSignServiceImpl | HnnxBank | 替换标准Service用HnnxBank | ✅ 通过 |
| HnnxAcceptBankCreditServiceImpl | Hnnx | 新增Service用Hnnx | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | Hnnx | Controller用Hnnx | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | Hnnx | Controller用Hnnx | ✅ 通过 |

### 1.4 注解检查

| 文件 | @CustomizedBean | @CloudComponent/@RestController | extends BaseController | 结果 |
|------|-----------------|-------------------------------|----------------------|------|
| HnnxbankBranchAdminController | 无(Controller不应加) ✅ | @RestController ✅ | ✅ | ✅ 通过 |
| HnnxRoleServiceImpl | 无(新服务不需) ✅ | @CloudComponent ✅ | N/A | ✅ 通过 |
| HnnxBankCustCorpSignServiceImpl | ✅ 有(替换标准服务) | @CloudComponent ✅ | N/A | ✅ 通过 |
| HnnxAcceptBankCreditServiceImpl | 无(新服务不需) ✅ | @CloudComponent ✅ | N/A | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | 无(Controller不应加) ✅ | @RestController ✅ | ✅ | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | 无(Controller不应加) ✅ | @RestController ✅ | ✅ | ✅ 通过 |

### 1.5 依赖注入检查

| 文件 | 远程服务 | 本地DAO | 结果 |
|------|---------|---------|------|
| HnnxbankBranchAdminController | @CloudReference ✅ | N/A | ✅ 通过 |
| HnnxRoleServiceImpl | N/A | @Resource ✅ | ✅ 通过 |
| HnnxBankCustCorpSignServiceImpl | 继承父类 | 继承父类 | ✅ 通过 |
| HnnxAcceptBankCreditServiceImpl | @CloudReference ✅ | @Resource ✅ | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | @CloudReference ✅ | N/A | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | @CloudReference ✅ | N/A | ✅ 通过 |

### 1.6 URL前缀检查

| 文件 | URL前缀 | 结果 |
|------|---------|------|
| HnnxbankBranchAdminController | /hnnx/sm/auth/branch/branchAdmin | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | /banks/hnnxbank/pc/credit/acceptBankCreditGrantBatch | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | /banks/hnnxbank/pc/credit/acceptBankCreditGrantInfo | ✅ 通过 |

### 1.7 DTO检查

| DTO | Hnnx前缀 | Serializable | 结果 |
|-----|----------|-------------|------|
| HnnxBatchCopyRoleReq | ✅ | ✅ 有 | ✅ 通过 |
| HnnxRoleDto | ✅ | ⚠️ 依赖父类RoleDto | 🟡 警告 |
| HnnxAcceptBankCreditBatchDto | ✅ | ✅ 有 | ✅ 通过 |
| HnnxAcceptBankCreditInfoDto | ✅ | ✅ 有 | ✅ 通过 |
| HnnxAcptDiscLoanInfoDto | ✅ | ❌ 未实现 | 🟡 警告 |
| BranchAdminImportVo | ❌ 无Hnnx前缀 | ❌ 未实现 | 🟡 警告 |

### 1.8 Controller返回值检查

| Controller | 返回类型 | 结果 |
|-----------|---------|------|
| HnnxbankBranchAdminController | CommonResp/void | ✅ 通过 |
| HnnxAcceptBankCreditBatchController | CommonResp | ✅ 通过 |
| HnnxAcceptBankCreditInfoController | CommonResp | ✅ 通过 |

---

## 阶段2-3：逐文件详细审查

---

### 文件1：HnnxbankBranchAdminController.java

**需求模块**: 需求1&2 - 机构管理和批量复制角色
**文件路径**: `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxbankBranchAdminController.java`

#### 🔴 BLOCK-001: 默认密码硬编码

- **位置**: 第257-260行
- **描述**: `batchImportBranchAdmin`方法中，当系统参数`branch_admin_init_pwd`为空时，使用硬编码默认密码"123456"。这是严重安全隐患，硬编码密码可能被反编译获取，且不符合安全审计要求。
- **代码片段**:
```java
String initPwd = getParamValue(userInfo.getLegalNo(), "branch_admin_init_pwd");
if (StringUtils.isBlank(initPwd)) {
    initPwd = "123456";  // 硬编码默认密码
}
```
- **修复建议**: 移除硬编码默认值，当系统参数未配置时应抛出业务异常提示管理员配置初始密码参数，而非使用不安全的默认值。

#### 🟠 SEVERE-001: batchImportBranchAdmin无事务保护

- **位置**: 第246-294行
- **描述**: `batchImportBranchAdmin`方法循环调用`branchUserService.addBranchAdmin`逐个新增用户，但方法本身无`@Transactional`注解。当部分用户导入成功、部分失败时，已导入的数据无法回滚，导致数据不一致。
- **修复建议**: 在方法上添加`@Transactional(rollbackFor = Exception.class)`注解，确保批量操作的原子性。同时需评估循环内catch异常后继续执行的逻辑是否合理——当前实现是部分失败仍继续，这与事务回滚语义矛盾，需明确业务需求：要么全部成功要么全部回滚，要么改为逐条独立事务。

#### 🟡 WARN-001: batchImportValidate中N+1查询

- **位置**: 第154-231行
- **描述**: 循环遍历Excel行时，每行都调用`userService.getUserByNoNoThrow(userNoReq)`校验用户号是否存在，以及`queryBranchByBranchNo`校验机构号。当导入数据量较大时，会产生大量远程服务调用，严重影响性能。
- **修复建议**: 先收集所有需校验的用户号和机构号，批量查询已存在的用户号集合和机构号集合，再在内存中进行校验，将N次远程调用降为1-2次。

#### 🟡 WARN-002: batchCopyRole中N+1查询

- **位置**: 第326-332行
- **描述**: `copyRoleToTargetUser`方法在循环中对每个目标用户调用`userService.getUserByNoNoThrow`，产生N+1查询问题。
- **修复建议**: 先批量查询所有目标用户信息，构建Map后在内存中校验。

#### 🟡 WARN-003: BranchAdminImportVo未实现Serializable且无Hnnx前缀

- **位置**: `banks/ext-hnnxbank/hnnxbank-biz-as/.../sm/controller/branch/vo/BranchAdminImportVo.java`
- **描述**: `BranchAdminImportVo`类未实现`Serializable`接口，且类名缺少`Hnnx`前缀，不符合个性化DTO/VO命名规范。
- **修复建议**: 类名改为`HnnxBranchAdminImportVo`，并实现`Serializable`接口。

---

### 文件2：HnnxRoleServiceImpl.java

**需求模块**: 需求1&2 - 机构管理和批量复制角色
**文件路径**: `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/service/impl/role/HnnxRoleServiceImpl.java`

#### 🔴 BLOCK-002: BempRuntimeException使用字符串而非错误码常量

- **位置**: 第134行、第137行
- **描述**: `copyAssignBranchRole`方法中参数校验抛出异常时使用了纯字符串构造方式`new BempRuntimeException("源机构号不能为空")`，未使用项目定义的错误码常量。这不符合项目异常处理规范，前端无法根据错误码进行国际化处理。
- **代码片段**:
```java
throw new BempRuntimeException("源机构号不能为空");
throw new BempRuntimeException("目标机构号列表不能为空");
```
- **修复建议**: 在异常码常量类中定义对应错误码，使用`new BempRuntimeException(ErrorCodeConstant.XXX, "提示信息")`方式抛出异常。

#### 🟠 SEVERE-002: getRoleNameById在循环中调用产生N+1查询

- **位置**: 第168-176行
- **描述**: `copyAssignBranchRole`方法中，对`rolesToRemove`列表循环调用`getRoleNameById`，每次调用都会查询数据库获取角色名称。当待删除角色较多时，会产生多次数据库查询。
- **修复建议**: 在循环外一次性批量查询所有需要的角色名称，构建Map<Long, String>后在循环中直接从Map获取。

#### 🟡 WARN-004: 方法名拼写错误chekcDistributeBranchRole

- **位置**: 第84行
- **描述**: 方法名`chekcDistributeBranchRole`中"chekc"应为"check"，拼写错误影响代码可读性。
- **修复建议**: 修正方法名为`checkDistributeBranchRole`，同时修改接口定义和所有调用处。

#### 🟡 WARN-005: copyAssignBranchRole删除目标机构多余角色的破坏性操作

- **位置**: 第156-158行
- **描述**: 当前逻辑会将源机构没有但目标机构有的角色删除（`rolesToRemove`），这是一个破坏性操作。如果业务意图是"追加"而非"覆盖"，则不应删除目标机构已有角色。需确认业务需求是否正确。
- **修复建议**: 与业务方确认批量复制的语义是"覆盖式复制"还是"追加式复制"。如果是追加式，应移除删除逻辑，仅新增源有目标无的角色。

---

### 文件3：HnnxBankCustCorpSignServiceImpl.java

**需求模块**: 需求4 - 分理处机构业务办理优化
**文件路径**: `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/bm/sign/service/impl/cpes/cpes/HnnxBankCustCorpSignServiceImpl.java`

#### 🔴 BLOCK-003: commitCustSign无事务注解

- **位置**: 第30-41行
- **描述**: `commitCustSign`方法执行了多步数据库操作：保存/更新法人映射(`saveOrUpdateLegalMapping`)、更新法人映射(`updateLegalMappingIfCanChange`)、提交审核(`submitSignAudit`)。这些操作应在同一事务中，任一步失败应全部回滚，但方法缺少`@Transactional`注解。
- **修复建议**: 在`commitCustSign`方法上添加`@Transactional(rollbackFor = Exception.class)`注解。

#### 🟡 WARN-006: 关键业务操作无日志记录

- **位置**: 整个文件
- **描述**: `HnnxBankCustCorpSignServiceImpl`类中没有任何日志记录（未声明Logger），关键业务操作如企业信息报备提交、法人映射更新等缺乏可追溯性，不利于问题排查和审计。
- **修复建议**: 添加`private static final Logger LOGGER = LoggerFactory.getLogger(HnnxBankCustCorpSignServiceImpl.class);`，在关键操作节点添加INFO级别日志。

#### 🟢 TIPS-001: 类缺少标准修改记录头部注释

- **位置**: 类声明前
- **描述**: 类注释不完整，缺少项目标准的修改记录表格头部（`修改单号|修改人员|修改日期|评审人员|修改说明`）。
- **修复建议**: 补充标准格式的类头部注释。

---

### 文件4：HnnxAcceptBankCreditServiceImpl.java

**需求模块**: 需求5 - 承兑行额度管理
**文件路径**: `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/service/impl/HnnxAcceptBankCreditServiceImpl.java`

#### 🟠 SEVERE-003: syncUsedCreditAmt无事务注解

- **位置**: 第284-313行
- **描述**: `syncUsedCreditAmt`方法循环更新多条额度明细记录（`hnnxAcceptBankCreditInfoDao.updateByIdSelective`），但方法虽有`@Transactional`注解标记（第284行），需确认该注解是否生效。经仔细检查，第284行确实有`@Transactional(rollbackFor = Exception.class)`注解，此项修正为通过。

#### 🟠 SEVERE-004: logger命名不符合项目规范

- **位置**: 第50行
- **描述**: Logger变量命名为`logger`（小写），项目其他文件统一使用`LOGGER`（全大写），不符合项目日志变量命名规范。
- **代码片段**:
```java
private static final Logger logger = LoggerFactory.getLogger(HnnxAcceptBankCreditServiceImpl.class);
```
- **修复建议**: 改为`private static final Logger LOGGER = LoggerFactory.getLogger(HnnxAcceptBankCreditServiceImpl.class);`，并同步修改所有引用处。

#### 🟡 WARN-007: delCreditInfo循环逐条操作可批量优化

- **位置**: 第196-217行
- **描述**: `delCreditInfo`方法在循环中逐条执行`selectById`+`deleteById`，当删除记录较多时效率较低。
- **修复建议**: 可先批量查询所有待删除记录进行状态校验，再批量执行删除操作，减少数据库交互次数。

#### 🟡 WARN-008: custName使用LIKE模糊查询性能风险

- **位置**: 第543行、第574行
- **描述**: `buildBatchExample`和`buildInfoExample`中，`custName`条件使用`LIKE '%xxx%'`双百分号模糊查询，当数据量较大时无法利用索引，存在性能风险。
- **修复建议**: 评估是否可改为右模糊`LIKE 'xxx%'`以利用索引，或在数据量较大时引入全文检索方案。

#### 🟡 WARN-009: HnnxAcptDiscLoanInfoDto未实现Serializable

- **位置**: `banks/ext-hnnxbank/hnnxbank-biz-api/.../pc/credit/dto/HnnxAcptDiscLoanInfoDto.java`
- **描述**: `HnnxAcptDiscLoanInfoDto`作为服务间传输的DTO，未实现`Serializable`接口，在远程调用序列化时可能存在风险。
- **修复建议**: 添加`implements Serializable`和`serialVersionUID`。

#### 🟢 TIPS-002: HnnxAcceptBankCreditInfoDto金额字段类型不一致

- **位置**: `banks/ext-hnnxbank/hnnxbank-biz-api/.../pc/credit/dto/HnnxAcceptBankCreditInfoDto.java`
- **描述**: DTO中金额相关字段（`creditLimitAmt`、`usedCreditAmt`、`doAmt`、`freezedAmt`）声明为`String`类型，但Entity层对应字段为`BigDecimal`。虽然工具类做了转换，但类型不一致增加了出错风险。
- **修复建议**: 评估将DTO金额字段改为`BigDecimal`类型的可行性，保持前后端类型一致性。

#### 🟢 TIPS-003: HnnxAcceptBankCreditBatchDto的totalCount类型不一致

- **位置**: `banks/ext-hnnxbank/hnnxbank-biz-api/.../pc/credit/dto/HnnxAcceptBankCreditBatchDto.java`
- **描述**: DTO中`totalCount`声明为`String`类型，但ServiceImpl中`updateBatchTotalCount`方法设置值为`(int) count`，存在类型转换。
- **修复建议**: 将`totalCount`字段改为`Integer`类型，与实际使用语义一致。

---

### 文件5：HnnxAcceptBankCreditBatchController.java

**需求模块**: 需求5 - 承兑行额度管理
**文件路径**: `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/controller/HnnxAcceptBankCreditBatchController.java`

#### 🟠 SEVERE-005: addCreditGrantBatch手动获取UserInfo与AOP注释矛盾

- **位置**: 第57-67行
- **描述**: 类注释明确说明"legalNo由HnnxAcceptBankCreditControllerAspect切面自动注入，无需手动设置"，但`addCreditGrantBatch`方法仍手动通过`UserContext.get()`获取UserInfo并设置到Request中。如果AOP切面确实已处理，则此处为冗余代码；如果AOP未处理，则其他方法（如`delCreditGrantBatch`）缺少UserInfo设置。
- **修复建议**: 确认AOP切面的实际处理范围。如果切面已统一处理，移除手动获取UserInfo的代码；如果切面仅处理DTO级别的legalNo，则需确保所有写操作方法都正确设置Request级别的用户信息。

#### 🟢 TIPS-004: delCreditGrantBatch使用raw BaseRequest无泛型

- **位置**: 第74行
- **描述**: `delCreditGrantBatch`方法参数`BaseRequest req`未指定泛型类型，缺乏类型安全性。
- **修复建议**: 改为`BaseRequest<HnnxAcceptBankCreditBatchDto> req`。

---

### 文件6：HnnxAcceptBankCreditInfoController.java

**需求模块**: 需求5 - 承兑行额度管理
**文件路径**: `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/controller/HnnxAcceptBankCreditInfoController.java`

#### 🟡 WARN-010: 多个写操作方法未设置Request级用户信息

- **位置**: 第80-115行（updateCreditGrantInfo、delCreditGrantInfo、submitReCheckGrantInfo、cancelSubmitReCheckGrantInfo）
- **描述**: 仅`addCreditGrantInfo`方法调用了`fillRequestWithUserInfo`设置`reqLegalNo/reqBrchNo/reqUserNo`，其他写操作方法（修改、删除、提交复核、撤销提交）均未设置这些字段。如果服务层依赖Request中的用户信息（如`req.getReqUserNo()`），则这些操作可能因获取不到操作人信息而异常。
- **修复建议**: 统一所有写操作方法的用户信息设置逻辑。如果AOP切面已统一处理，则移除`fillRequestWithUserInfo`方法；如果未统一处理，则所有写操作方法都应调用`fillRequestWithUserInfo`。

#### 🟢 TIPS-005: HnnxBatchCopyRoleReq的targetUserNos使用逗号分隔String

- **位置**: `banks/ext-hnnxbank/hnnxbank-biz-api/.../sm/controller/branch/dto/HnnxBatchCopyRoleReq.java`
- **描述**: `targetUserNos`字段使用逗号分隔的String存储多个用户号，而非`List<String>`。这种方式类型安全性较低，且需要手动split处理，容易因格式问题出错。
- **修复建议**: 评估改为`List<String> targetUserNoList`的可行性，由前端传入数组格式，提升类型安全性。

---

## 审查问题汇总表

| 编号 | 级别 | 文件 | 位置 | 问题描述 |
|------|------|------|------|---------|
| BLOCK-001 | 🔴阻塞 | HnnxbankBranchAdminController | L257-260 | 默认密码"123456"硬编码 |
| BLOCK-002 | 🔴阻塞 | HnnxRoleServiceImpl | L134,137 | BempRuntimeException使用字符串而非错误码常量 |
| BLOCK-003 | 🔴阻塞 | HnnxBankCustCorpSignServiceImpl | L30-41 | commitCustSign无@Transactional事务注解 |
| SEVERE-001 | 🟠严重 | HnnxbankBranchAdminController | L246-294 | batchImportBranchAdmin无事务保护 |
| SEVERE-002 | 🟠严重 | HnnxRoleServiceImpl | L168-176 | getRoleNameById循环调用N+1查询 |
| SEVERE-003 | 🟠严重 | HnnxAcceptBankCreditServiceImpl | L50 | logger命名不符合项目规范(应为LOGGER) |
| SEVERE-004 | 🟠严重 | HnnxAcceptBankCreditServiceImpl | - | (原syncUsedCreditAmt事务问题，经验证已有@Transactional，此项移除) |
| SEVERE-005 | 🟠严重 | HnnxAcceptBankCreditBatchController | L57-67 | 手动获取UserInfo与AOP注释矛盾 |
| WARN-001 | 🟡警告 | HnnxbankBranchAdminController | L154-231 | batchImportValidate中N+1查询 |
| WARN-002 | 🟡警告 | HnnxbankBranchAdminController | L326-332 | batchCopyRole中N+1查询 |
| WARN-003 | 🟡警告 | BranchAdminImportVo | - | 未实现Serializable且无Hnnx前缀 |
| WARN-004 | 🟡警告 | HnnxRoleServiceImpl | L84 | 方法名chekcDistributeBranchRole拼写错误 |
| WARN-005 | 🟡警告 | HnnxRoleServiceImpl | L156-158 | 删除目标机构多余角色的破坏性操作需确认 |
| WARN-006 | 🟡警告 | HnnxBankCustCorpSignServiceImpl | - | 关键业务操作无日志记录 |
| WARN-007 | 🟡警告 | HnnxAcceptBankCreditServiceImpl | L196-217 | delCreditInfo循环逐条操作可批量优化 |
| WARN-008 | 🟡警告 | HnnxAcceptBankCreditServiceImpl | L543,574 | custName LIKE模糊查询性能风险 |
| WARN-009 | 🟡警告 | HnnxAcptDiscLoanInfoDto | - | 未实现Serializable |
| WARN-010 | 🟡警告 | HnnxAcceptBankCreditInfoController | L80-115 | 多个写操作方法未设置Request级用户信息 |
| TIPS-001 | 🟢提示 | HnnxBankCustCorpSignServiceImpl | - | 类缺少标准修改记录头部注释 |
| TIPS-002 | 🟢提示 | HnnxAcceptBankCreditInfoDto | - | 金额字段String类型与Entity BigDecimal不一致 |
| TIPS-003 | 🟢提示 | HnnxAcceptBankCreditBatchDto | - | totalCount为String但实际使用为int |
| TIPS-004 | 🟢提示 | HnnxAcceptBankCreditBatchController | L74 | delCreditGrantBatch使用raw BaseRequest无泛型 |
| TIPS-005 | 🟢提示 | HnnxBatchCopyRoleReq | - | targetUserNos用逗号分隔String而非List |

---

## 修复优先级建议

### 第一优先级（阻塞级，必须修复）

1. **BLOCK-001**: 移除硬编码默认密码，改为抛出业务异常提示配置系统参数
2. **BLOCK-002**: 为`copyAssignBranchRole`中的参数校验异常添加错误码常量
3. **BLOCK-003**: 为`commitCustSign`添加`@Transactional(rollbackFor = Exception.class)`注解

### 第二优先级（严重级，尽快修复）

4. **SEVERE-001**: 评估`batchImportBranchAdmin`的事务策略，添加事务注解或改为逐条独立事务
5. **SEVERE-002**: 批量查询角色名称，消除N+1查询
6. **SEVERE-003**: 将`logger`重命名为`LOGGER`
7. **SEVERE-005**: 确认AOP切面处理范围，统一UserInfo获取方式

### 第三优先级（警告级，建议修复）

8. **WARN-001/002**: 优化批量校验逻辑，减少远程调用次数
9. **WARN-003**: BranchAdminImportVo添加Serializable和Hnnx前缀
10. **WARN-004**: 修正方法名拼写错误
11. **WARN-005**: 与业务方确认批量复制角色的语义
12. **WARN-006**: 添加关键业务操作日志
13. **WARN-007**: 优化delCreditInfo为批量操作
14. **WARN-008**: 评估模糊查询优化方案
15. **WARN-009**: HnnxAcptDiscLoanInfoDto添加Serializable
16. **WARN-010**: 统一写操作方法的用户信息设置

---

## 审查结论

本次审查共发现22个问题，其中3个阻塞级、5个严重级、9个警告级、5个提示级。前置检查（文件位置、包结构、类名前缀、注解、URL前缀、返回值类型）整体通过率较高，主要问题集中在以下方面：

1. **事务管理缺失**：3个阻塞级问题中有2个涉及事务注解缺失，这是影响数据一致性的核心问题
2. **安全隐患**：硬编码默认密码属于严重安全漏洞
3. **异常规范**：部分异常抛出未使用错误码常量，不符合项目规范
4. **性能风险**：多处N+1查询和循环内远程调用，在大数据量场景下可能严重影响性能
5. **代码一致性**：UserInfo获取方式不统一、日志命名不规范等问题影响代码可维护性

**建议**：在修复所有阻塞级和严重级问题后，方可进入测试阶段。
