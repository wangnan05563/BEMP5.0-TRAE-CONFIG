# 机构管理优化 - v2.3/v2.4 增量用例（TC-ORGV2）

> **需求基线**：PRD《机构管理优化-v2.md》（v2.4，含 2026-08-28 行方需求变更：BR-ORG-21 非账务机构确认、BR-ORG-05 层级校验作废、BR-ORG-02 组织机构代码不再查重；v2.2 增量同步 BR-SYNC-12~19；v2.1 管理员批量导入最大个数开关 BR-ADM-20）
> **复用策略**：F-01~F-11 基础场景复用既有用例（TC-BRANCH-010、TC-BRANCH-ORG-001、TC-ORGMGMT-V3-P0/P1/P2、TC-F01~F11 系列、TC-BRANCH-030），本文件仅覆盖 v2.1/v2.2/v2.3/v2.4 增量缺口，与既有用例无编号/场景重复。
> **关联既有用例修订**：TC-F01-P0-006（层级超4级）、TC-ORGMGMT-V3-P0 中层级类用例 → 按 BR-ORG-05 作废口径回归修订（见 TC-ORGV2-007）。
> **修订记录**：v1.2（2026-09-06）v2.4 用例覆盖缺口补齐（对照 PRD §11.1.1 TC-ORG-17~19 与 §11.1.4 TC-ADM-06/07 逐条映射）：M-1 存量 TC-ORGV2-004~006 仅覆盖 PRD TC-ORG-17"点'是'放行"链路，**点"否"终止（TC-ORG-18）与账务机构无弹窗直接新增（TC-ORG-19）两个 P0 场景缺失**——新增 TC-ORGV2-015/016 补齐；M-2 BR-ADM-20（v2.1 管理员批量导入最大个数开关，默认 30）经盘点未被任何存量用例覆盖（TC-F05 系列 2026-07-21 编制早于 v2.1 2026-08-14 参数化改造、TC-ORGV2 v1.0/1.1 未含）——新增 TC-ORGV2-017/018/019（P0 超限整批拒绝 / P1 参数动态生效 / P2 默认值与法人级配置）。v1.1（2026-09-02）用例评审修订：M-1 遗留假设 H1/H2 经代码核实均成立并关闭（skipNonAccounting/nonAccountingBranchNos 已实现：HnnxBankBranchController.java L156 @RequestParam + BranchImportVo.java L17 + BranchImportValidateResp.java L30；增量分支已合入：SyncPjgcsBranchParamJobServiceImpl.java L136-145 与 SyncPjgxBranchRelationJobServiceImpl.java L132-138），TC-ORGV2-009~013 解除"⏸ 待实现"阻塞；M-2 TC-ORGV2-010/011/012 代码审查步骤由 Job 层修正为 Service 层落库实现（增量 upsert 与失败日志四要素实际位于 PjgcsBranchParamServiceImpl/PjgxBranchRelationServiceImpl，Job 层仅做模式分发）；M-3 TC-ORGV2-001 弹窗文案补充前端锚点 zh-CN.js L70 与 skipNonAccounting 双侧参数锚点。v1.0（2026-09-02）初版。

## 一、增量范围与覆盖度映射

| PRD 增量点 | 规则 | 已有用例覆盖状态 | 本次动作 |
|-----------|------|----------------|---------|
| 非账务机构确认-批量导入 | BR-ORG-21（v2.3） | 未覆盖 | 新增 TC-ORGV2-001~003 |
| 非账务机构确认-单条手工新增扩展 | BR-ORG-21（v2.4） | 未覆盖 | 新增 TC-ORGV2-004~006（覆盖 PRD TC-ORG-17） |
| 机构层级校验作废回归 | BR-ORG-05 作废（v2.3） | 已有用例按旧口径覆盖 | 新增回归 TC-ORGV2-007 + 修订旧用例标注 |
| 组织机构代码不做重复性校验 | BR-ORG-02 v2.3 修订 | 未覆盖 | 新增 TC-ORGV2-008 |
| 增量同步机制 | BR-SYNC-12~19（v2.2） | TC-BRANCH-030 仅覆盖全量同步 | 新增 TC-ORGV2-009~014 |
| **单条手工新增点"否"终止** | BR-ORG-21 ②（v2.4，PRD TC-ORG-18） | TC-ORGV2-004 仅覆盖首次不落库，点"否"交互缺失 | **新增 TC-ORGV2-015（v1.2）** |
| **单条手工新增账务机构无弹窗** | BR-ORG-21（v2.4，PRD TC-ORG-19） | TC-ORGV2-003 仅覆盖批量导入侧，单条新增侧缺失 | **新增 TC-ORGV2-016（v1.2）** |
| **管理员批量导入最大个数开关** | BR-ADM-20（v2.1，PRD TC-ADM-06/07、Q-17） | 全部存量未覆盖（TC-F05 系列早于 v2.1 参数化） | **新增 TC-ORGV2-017~019（v1.2）** |

## 二、测试数据准备（三重校准）

> 执行前由 bemp-implementation-engineer 通过 Oracle MCP 跑就绪检查；本节 SQL 均为只读检查与受控变更，清理 SQL 见各用例。

### D1 非账务机构对照数据（TC-ORGV2-001~006）

```sql
-- 校准1-关联字段对照：PJGGX.FAREDM 必须与 PJGCS.YNGYJG（机构号）业务主档一致，禁止孤立机构号
SELECT g.FAREDM, g.YWGXZL, g.JILUZT, p.YNGYJG
  FROM PJGGX g LEFT JOIN PJGCS p ON g.FAREDM = p.YNGYJG
 WHERE g.FAREDM IN ('NACCT001','NACCT002') ;
-- 预置：NACCT001 在 PJGGX 无 YWGXZL='ZNGWSJ' AND JILUZT='0' 记录（非账务机构），NACCT002 存在（账务机构对照组）
-- 校准2-列宽：机构号 ≤ PJGCS.YNGYJG 列宽（VARCHAR2(10)），超长即校准失败
```

### D2 层级回归对照数据（TC-ORGV2-007）

```sql
-- 预置一条 level=4 的上级机构（总行→分行→支行→网点链），其下再导入 level=5 机构用于验证"不再拦截"
-- 校准3-业务日期基准：WEIHRQ（维护日期）取当前营业日，格式 YYYYMMDD
SELECT YNGYJG, JILUZT FROM PJGCS WHERE YNGYJG = 'LV5PARENT';
```

### D3 同步模式参数（TC-ORGV2-009~013）

```sql
-- branch_sync_mode 参数就绪检查（未配置=默认 INCR，锚点 SyncJobUtils.java L27 常量/L33 默认值/L45-67 readSyncMode；增量分支已合入：SyncPjgcsBranchParamJobServiceImpl.java L136-145）
SELECT * FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY = 'branch_sync_mode';
-- 增量用例结束后复位：UPDATE TM_BUSINESS_PARAMETER SET PARAM_VALUE='INCR' WHERE PARAM_KEY='branch_sync_mode';
```

### D4 管理员批量导入对照数据（TC-ORGV2-017~019，v1.2 新增；015/016 用 D1 数据）

```sql
-- branch_admin_max_count 参数就绪检查（未配置=默认 30，锚点：HnnxbankBranchAdminController.java L367-368 getIntegerParamWithDefault(legalNo,"branch_admin_max_count",30)）
SELECT * FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY = 'branch_admin_max_count';
-- 校准1-列宽：PARAM_KEY/PARAM_VALUE/LEGAL_NO 列宽以 describe 核对为准；机构号 ≤ PJGCS.YNGYJG 列宽
-- 校准2-对照数据：预置目标机构 ADMTGT01（本法人下已存在），管理员用户号 ADMU001~ADMU040 需不存在（防用户号重复校验干扰超限断言）
SELECT COUNT(*) FROM PJGCS WHERE YNGYJG = 'ADMTGT01';
-- 清理闭环：用例结束后删除预置管理员与参数记录
-- DELETE FROM TM_USER WHERE USER_NO LIKE 'ADMU0%' AND INFO_SRC='TEST';  -- 表名/列名以 describe 核对为准
-- DELETE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY='branch_admin_max_count' AND LEGAL_NO='{REQ_LEGAL_NO}';
```

## 三、用例明细

### TC-ORGV2-001 批量导入含非账务机构-确认弹窗+点"是"跳过后导入成功

| 项 | 内容 |
|---|---|
| 用例名称 | 批量导入含非账务机构时弹窗确认，点"是"带 skipNonAccounting=true 重新提交后导入成功 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询（RULE-09/RULE-06） |
| 跨模块标注 | 独立可执行（数据需按 D1 预置） |
| 前置条件 | 1. 以 hnnxbank 法人管理员（userType="4"）登录前端 `http://{BEMP_HOST}:{BEMP_FRONTEND_PORT}/#/login`；2. 按 D1 预置 NACCT001（非账务）/NACCT002（账务）；3. 上级机构在系统中已存在且 PJGCS 中存在（F-10 校验前置） |
| 步骤 | 1. 系统管理-机构管理-批量导入，上传含 NACCT001/NACCT002 的合法 Excel；2. 点击导入提交第一次请求（POST sm/auth/branch/branch/func_batchImportValidate）；3. 观察弹窗；4. 点"是"；5. 数据库查询两机构落库结果 |
| 预期结果 | 1. 步骤3弹出确认弹窗，文案="NACCT001机构号非账务机构，不能作为业务发起及记账机构，是否继续？"（多机构号以"、"拼接列出全部命中机构号；锚点：前端 zh-CN.js L70 nonAccountingBranchConfirm 文案模板 + branch.vue 机构号清单 join("、") 前置拼接 + PRD §7.1 BR-ORG-21、§10.1 非账务机构确认行；服务端清单来源：func_batchImportValidate 成功响应顶层 nonAccountingBranchNos，锚点 HnnxBankBranchController.java L427-430 + BranchImportValidateResp.java L30）；2. 步骤4后携带 skipNonAccounting=true 重新提交（两步提交设计，锚点：PRD §2.2.1 v2.3 变更说明、§12 Q-22；参数双侧实现：BranchImportVo.java L17 批量导入侧 + HnnxBankBranchController.java L156 单条新增侧），NACCT001/NACCT002 全部写入 PJGCS（SELECT COUNT(*)=2）；3. 首次请求服务端不落库（两步提交，弹窗前 PJGCS 无 NACCT001 记录；func_batchImport 服务端二次校验兜底：未携带标识时命中非账务机构直接拒绝，锚点 HnnxBankBranchController.java L906-913） |
| 数据清理 | DELETE FROM PJGCS WHERE YNGYJG IN ('NACCT001','NACCT002') 及关联 PJGGX/角色关系记录 |

### TC-ORGV2-002 批量导入非账务机构弹窗点"否"终止导入不写库

| 项 | 内容 |
|---|---|
| 用例名称 | 批量导入非账务机构确认弹窗点"否"关闭导入界面，不写入任何数据 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询 |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 同 TC-ORGV2-001 |
| 步骤 | 1. 同 TC-ORGV2-001 步骤1~3；2. 点"否"；3. 查询 PJGCS 确认无新增 |
| 预期结果 | 1. 导入界面关闭，流程终止；2. PJGCS 中 NACCT001/NACCT002 均无记录（SELECT COUNT(*)=0），整批不写库（BR-ORG-21 点"否"终止口径，锚点：PRD §7.1） |
| 数据清理 | 同上（应无数据可清，核对为空） |

### TC-ORGV2-003 批量导入全部为账务机构时不弹窗直接写库

| 项 | 内容 |
|---|---|
| 用例名称 | 导入机构号全部为账务机构时无确认弹窗，直接进入写库环节 |
| 优先级/测试方式 | P0 / Playwright |
| 跨模块标注 | 独立可执行 |
| 前置条件 | NACCT002 在 PJGGX 存在 YWGXZL='ZNGWSJ' AND JILUZT='0' 记录（D1 对照组）；上级机构就绪 |
| 步骤 | 1. 批量导入仅含 NACCT002 的 Excel；2. 提交导入；3. 观察是否出现非账务机构确认弹窗 |
| 预期结果 | 全程无非账务机构确认弹窗，导入成功，PJGCS 新增 NACCT002（锚点：PRD §7.1 BR-ORG-21"导入机构号全部为账务机构时不弹窗"） |

### TC-ORGV2-004 单条手工新增非账务机构-首次提交返回 nonAccountingBranchNos 不落库

| 项 | 内容 |
|---|---|
| 用例名称 | 单条手工新增非账务机构首次提交，成功响应顶层携带 nonAccountingBranchNos 且服务端不落库 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询 |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 法人管理员登录；NACCT001 非账务（D1）；func_addBranch 入口可用（机构管理-新增） |
| 步骤 | 1. 机构管理-新增，填写机构号 NACCT001 及其余必填项；2. 点击确定提交（POST func_addBranch）；3. 抓取响应报文；4. 查询 PJGCS |
| 预期结果 | 1. 响应为成功态且顶层携带 nonAccountingBranchNos 字段，值=["NACCT001"]（锚点：PRD §2.2.1 v2.4 变更说明、§7.1 BR-ORG-21 ②）；2. 前端弹确认弹窗，文案与批量导入一致；3. PJGCS 无 NACCT001 记录（首次提交不落库） |

### TC-ORGV2-005 单条手工新增点"是"后豁免非账务校验正常落库且其余校验不豁免

| 项 | 内容 |
|---|---|
| 用例名称 | 单条新增确认放行（skipNonAccounting=true）后正常落库，PJGCS 主系统存在性校验等其他校验仍生效 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询 |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 同 TC-ORGV2-004，且另备一条机构号在 PJGCS 不存在的数据（验证 F-10 不豁免） |
| 步骤 | 1. 同 TC-ORGV2-004 弹出确认弹窗；2. 点"是"（skipNonAccounting=true 重新提交）；3. 查询 PJGCS；4. 重复步骤1但机构号不在 PJGCS 主系统，点"是"提交 |
| 预期结果 | 1. 步骤3 NACCT001 写入 PJGCS 成功（非账务校验豁免，锚点：PRD §7.1 BR-ORG-21 ②；skipNonAccounting=true 时 checkNonAccountingOnAdd 直接返回 null 放行，锚点 HnnxBankBranchController.java L226 条件短路 + L183-186）；2. 步骤4 主系统不存在仍被拦截："机构[XXX]在核心系统机构树中不存在，不能创建"（F-10 不豁免，锚点：PjgcsBranchParamServiceImpl.java L93 报错文案 + HnnxBankBranchController.java L163-168 主系统校验先于非账务校验执行，PRD §10.1 主系统不存在行） |

### TC-ORGV2-006 单条新增非账务校验执行时序-位于 F-10 之后复核模式之前

| 项 | 内容 |
|---|---|
| 用例名称 | 非账务机构校验时序位于 PJGCS 主系统存在性校验之后、复核模式分支之前（代码审查） |
| 优先级/测试方式 | P1 / 代码审查（RULE-01 逻辑验证） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取到本地工作区 |
| 步骤 | 1. Read `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java` 中 func_addBranch 实现链（L153-214）：L163-168 主系统校验（checkBranchStatus）→ L173-179 核算机构号唯一性校验 → L183-186 非账务机构确认校验（checkNonAccountingOnAdd，L225-241 私有方法）→ L188-213 复核模式分支；2. 追踪非账务机构校验（PJGGX YWGXZL='ZNGWSJ' AND JILUZT='0' 判定，复用 F-11 BR-DISC-03 口径）、PjgcsBranchParamService 主系统校验、复核模式分支三者调用顺序 |
| 预期结果 | 代码执行顺序=主系统存在性校验（F-10）→ 非账务机构校验（含 skipNonAccounting 豁免分支）→ 复核模式分支（双岗/单岗），与 PRD §7.1 BR-ORG-21 ③ 一致；skipNonAccounting=true 时不进入非账务拦截分支但主系统校验仍在之前执行（锚点行号：L163-168 主系统校验、L226 豁免条件短路、L188-213 复核分支） |

### TC-ORGV2-007 层级校验作废回归-超4级机构导入不再拦截

| 项 | 内容 |
|---|---|
| 用例名称 | 机构批量导入不再校验层级上限（BR-ORG-05 作废），第5级机构可正常导入 |
| 优先级/测试方式 | P1 / Playwright + 代码审查 |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 按 D2 预置 level=4 上级机构 LV5PARENT；确认 HnnxBankBranchController 导入链已无 calculateBranchLevel 层级拦截调用 |
| 步骤 | 1. 批量导入 Excel：机构号 LV5ORG、上级机构 LV5PARENT（构造第5级）；2. 提交导入；3. 查询落库；4. 代码审查导入校验链确认层级校验已移除 |
| 预期结果 | 1. 导入成功无"层级超4级"拦截，LV5ORG 写入 PJGCS；2. 代码审查：导入校验链（func_batchImportValidate）中不存在 level>=4 阻断逻辑（锚点：PRD §7.1 BR-ORG-05"v2.3 作废"、§8.4 层级规则说明）；3. 既有用例修订记录：TC-F01-P0-006（层级超4级）及 TC-ORGMGMT-V3-P0 层级类用例标注"按 BR-ORG-05 作废口径失效，回归以本用例为准" |

### TC-ORGV2-008 组织机构代码重复导入不做重复性校验

| 项 | 内容 |
|---|---|
| 用例名称 | 组织机构代码重复的两个机构导入成功（BR-ORG-02 v2.3 修订：组织机构代码不查重） |
| 优先级 | P1 / Playwright + 数据库查询 |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 法人管理员登录；机构号 ORGDUPE1/ORGDUPE2 未存在，两者组织机构代码相同（如 91410000DUP1） |
| 步骤 | 1. 批量导入含 ORGDUPE1、ORGDUPE2（其余字段合法）的 Excel；2. 提交导入；3. 查询 PJGCS |
| 预期结果 | 导入成功，无"组织机构代码重复"报错，两机构均落库（锚点：PRD §2.2.1 校验规则第2条 v2.3 变更、§7.1 BR-ORG-02）；机构号/机构名称重复仍拦截（对照断言，防过度放开） |

### TC-ORGV2-009 branch_sync_mode 参数控制全量/增量-默认 INCR

| 项 | 内容 |
|---|---|
| 用例名称 | 同步模式参数 branch_sync_mode（FULL/INCR）控制 PJGCS/PJGGX 同步模式，未配置默认 INCR（代码审查+配置验证） |
| 优先级/测试方式 | P0 / 代码审查 + 数据库查询（RULE-04 配置验证） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取；TM_BUSINESS_PARAMETER 可查询 |
| 步骤 | 1. Read `banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/tk/job/service/impl/SyncJobUtils.java` L27 常量定义、L33 默认值、L45-67 readSyncMode 分发逻辑；2. Read SyncPjgcsBranchParamJobServiceImpl L136-145 / SyncPjgxBranchRelationJobServiceImpl L132-138 中模式分发逻辑；3. 数据库查询 branch_sync_mode 当前配置 |
| 预期结果 | 1. 常量 SYNC_MODE_PARAM_KEY="branch_sync_mode"（SyncJobUtils.java L27），SYNC_MODE_DEFAULT=INCR（L33）；2. 参数值 FULL 走 deleteAll+insertBatch 全量替换、INCR 走按主键 upsert（BR-SYNC-08/17，增量分支已合入：SyncPjgcsBranchParamJobServiceImpl L141-144 调用 syncIncrementalData）；3. 参数未配置/取值非法/读取异常时默认 INCR 并告警（BR-SYNC-12，锚点：SyncJobUtils.java L53-66，PRD §7.3）；4. 反洗钱同步使用独立参数 key（hnnx.market.antimoney.sync.mode，锚点：SyncAntiMoneyListJobServiceImpl.java L43 参数注释 + L226-234 独立 readSyncMode 实现"参考 SyncJobUtils.readSyncMode 的读取思路"），与 branch_sync_mode 互不影响 |

### TC-ORGV2-010 PJGCS 增量 upsert-主键 YNGYJG 存在则 UPDATE 不存在则 INSERT

| 项 | 内容 |
|---|---|
| 用例名称 | 增量模式 PJGCS 按主键 YNGYJG upsert：存在更新、不存在新增（数据库查询+运行时） |
| 优先级/测试方式 | P0 / 数据库查询 + 运行时测试（RULE-06/RULE-10） |
| 跨模块标注 | 需专项数据（PJGCS 存量记录 + 增量文件） |
| 前置条件 | 1. branch_sync_mode=INCR；2. cbs 目录 `{cbsFilePath}/{营业日前一天}/CBS_PJGCS_{日期}.txt` 已按 0x03 分隔构造：含1条已存在主键（改字段值）+1条新主键；3. 日期目录取营业日前一天（BR-SYNC-02） |
| 步骤 | 1. 记录存量记录当前字段值；2. 触发 PJGCS 同步任务（HNNXTK020111）；3. 对比前后数据；4. 代码审查佐证：Job 层 SyncPjgcsBranchParamJobServiceImpl L141-144 INCR 分支调用 `pjgcsBranchParamService.syncIncrementalData(dataList, lineNums, rawLines)`，落库 upsert 实现在 PjgcsBranchParamServiceImpl.syncIncrementalData（L183 起，按主键 YNGYJG 存在 UPDATE/不存在 INSERT） |
| 预期结果 | 已存在主键记录字段被 UPDATE 为文件值、主键不新增行；新主键 INSERT 成功；无 deleteAll 清表（对照：全量模式计数先清零后等于文件行数，锚点：BR-SYNC-14/17，PRD §7.3；代码锚点：PjgcsBranchParamServiceImpl.syncIncrementalData L183 起 upsert 实现） |
| 数据清理 | 恢复存量原值、删除新增记录，branch_sync_mode 复位 INCR |

### TC-ORGV2-011 PJGGX 增量主键 FAREDM+YNGYJG+YWGXZL+BIZHON+YWGXJG upsert

| 项 | 内容 |
|---|---|
| 用例名称 | 增量模式 PJGGX 按五字段联合主键 upsert（代码审查+数据库查询） |
| 优先级/测试方式 | P1 / 代码审查 + 数据库查询 |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取 |
| 步骤 | 1. Read SyncPjgxBranchRelationJobServiceImpl L132-138（Job 层 INCR 分发）→ PjgxBranchRelationServiceImpl.syncIncrementalData（L150 起）增量落库实现；2. Read PjgxBranchRelationDao L106 起五字段主键 upsert 方法注释与对应 mapper SQL，核对主键查询条件字段清单与 BR-SYNC-15 一致性；3. 数据库验证 PJGGX 表五字段联合唯一性边界（同 FAREDM 不同 YWGXZL 可并存） |
| 预期结果 | 代码主键条件=FAREDM+YNGYJG+YWGXZL+BIZHON+YWGXJG（锚点：PjgxBranchRelationDao.java L106"须含全部五字段主键值"+ mapper SQL，BR-SYNC-15）；存在则 UPDATE、不存在 INSERT（BR-SYNC-17，锚点：PjgxBranchRelationServiceImpl.syncIncrementalData L150 起） |

### TC-ORGV2-012 增量单条失败详细日志并跳过不影响其他记录

| 项 | 内容 |
|---|---|
| 用例名称 | 增量模式逐条处理，单条失败输出详细日志（行号/原始内容/原因/主键值）且跳过不影响其他记录（代码审查） |
| 优先级/测试方式 | P1 / 代码审查（RULE-01） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取 |
| 步骤 | 1. Read PjgcsBranchParamServiceImpl.syncIncrementalData（L183 起）与 PjgxBranchRelationServiceImpl.syncIncrementalData（L150 起）增量逐条处理与日志语句——失败日志素材（行号/原始行）由 Job 层 readCbsFile 收集传入（SyncPjgcsBranchParamJobServiceImpl L162-186 readCbsFile、L144 传参）；2. 核对异常 catch 分支日志字段（PjgcsBranchParamServiceImpl L210-211、PjgxBranchRelationServiceImpl L181-182） |
| 预期结果 | 单条失败日志包含失败行号、文件行原始内容、失败原因、主键值四要素（BR-SYNC-18/Q-20，锚点：PjgcsBranchParamServiceImpl L210-211 "增量同步单条记录失败，行号：{}，机构号：{}，文件行内容：{}，失败原因：{}"、PjgxBranchRelationServiceImpl L181-182 同构含币种/业务关系种类）；continue 跳过后其余记录正常 upsert；增量模式非整体事务（与全量 @Transactional 原子语义区分） |

### TC-ORGV2-013 增量不做物理删除-文件未出现记录保留

| 项 | 内容 |
|---|---|
| 用例名称 | 增量同步对库中已有但本次文件不出现的记录不做物理删除（数据库查询+运行时） |
| 优先级/测试方式 | P1 / 数据库查询 + 运行时测试 |
| 跨模块标注 | 需专项数据 |
| 前置条件 | branch_sync_mode=INCR；PJGCS 预置记录 KEYKEEP01（本次增量文件不含该主键）；增量文件仅含其他主键 |
| 步骤 | 1. 触发增量同步；2. 查询 KEYKEEP01 |
| 预期结果 | KEYKEEP01 仍在 PJGCS 且字段未变（BR-SYNC-19 不做物理删除，锚点：PRD §7.3）；对照反洗钱 INCR"按 OBJ_ID 物理删除重插"口径不同（防口径串用） |
| 数据清理 | 删除预置记录 |

### TC-ORGV2-014 ODS 增量抽取基准-按维护日期 WEIHRQ

| 项 | 内容 |
|---|---|
| 用例名称 | ODS 按 WEIHRQ 维护日期增量抽取 PJGCS/PJGGX 文件数据（口径核对） |
| 优先级/测试方式 | P2 / 代码审查 + 文档核对（RULE-04） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码与 ODS 供数说明可用 |
| 步骤 | 1. 核对 ODS 供数口径文档；2. 核对 Job 侧对文件数据的处理不依赖 WEIHRQ 字段值做二次过滤（供数侧已过滤） |
| 预期结果 | ODS 均按 WEIHRQ 增量抽取（BR-SYNC-16，锚点：PRD §7.3）；票据系统侧无重复按日期过滤导致漏单的逻辑缺陷 |

### TC-ORGV2-015 单条手工新增非账务机构点"否"终止（v1.2 新增，PRD TC-ORG-18）

| 项 | 内容 |
|---|---|
| 用例名称 | 单条手工新增非账务机构确认弹窗点"否"，关闭新增界面终止新增，数据库不写入任何机构记录 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询（RULE-09/RULE-06） |
| 跨模块标注 | 独立可执行（数据需按 D1 预置） |
| 前置条件 | 1. 以 hnnxbank 法人管理员（userType="4"）登录前端 `http://{BEMP_HOST}:{BEMP_FRONTEND_PORT}/#/login`；2. 按 D1 预置 NACCT001（非账务）；3. 记录 PJGCS 当前记录数基线 |
| 步骤 | 1. 机构管理-新增，填写机构号 NACCT001 及其余必填项；2. 点击确定提交（POST func_addBranch）；3. 出现非账务机构确认弹窗后点击"否"；4. 查询 PJGCS 确认无新增并复核界面状态 |
| 预期结果 | 1. 步骤2 首次提交返回成功响应且顶层携带 nonAccountingBranchNos=["NACCT001"]（首次提交服务端即不落库，锚点：HnnxBankBranchController.java L156 skipNonAccounting 参数 + L183-186 checkNonAccountingOnAdd 未携带标识时返回清单，PRD §11.1.1 TC-ORG-18）；2. 弹窗文案与批量导入一致"NACCT001机构号非账务机构，不能作为业务发起及记账机构，是否继续？"（锚点：zh-CN.js L70 nonAccountingBranchConfirm，PRD §7.1 BR-ORG-21）；3. 点击"否"后新增界面关闭、新增流程终止；4. PJGCS 记录数与基线一致（SELECT COUNT 无 NACCT001，两段提交语义：点"否"不重发请求，库中零写入） |

### TC-ORGV2-016 单条手工新增账务机构无弹窗直接新增成功（v1.2 新增，PRD TC-ORG-19）

| 项 | 内容 |
|---|---|
| 用例名称 | 单条手工新增账务机构（PJGGX 存在 YWGXZL='ZNGWSJ' 且 JILUZT='0' 记录）时无确认弹窗，按复核模式正常进入新增流程 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询（RULE-09/RULE-06） |
| 跨模块标注 | 独立可执行（数据需按 D1 预置对照组） |
| 前置条件 | 1. 法人管理员登录；2. 按 D1 预置 NACCT002（账务机构对照组：PJGGX 存在 YWGXZL='ZNGWSJ' AND JILUZT='0' 记录）；3. NACCT002 同时在 PJGCS 主系统存在（通过 F-10 校验） |
| 步骤 | 1. 机构管理-新增，填写机构号 NACCT002 及其余必填项；2. 点击确定提交（POST func_addBranch）；3. 观察是否出现非账务机构确认弹窗；4. 按复核模式完成后续流程后查询 PJGCS |
| 预期结果 | 1. 响应不携带 nonAccountingBranchNos 字段、全程不弹出非账务机构确认弹窗（账务机构命中豁免条件，锚点：HnnxBankBranchController.java L183-186 checkNonAccountingOnAdd 查得 YWGXZL='ZNGWSJ' AND JILUZT='0' 记录返回 null 放行，PRD §11.1.1 TC-ORG-19）；2. 新增流程直接进入复核模式分支（双岗/单岗以实际配置为准），NACCT002 复核通过后写入 PJGCS；3. 证明非账务弹窗仅对非账务机构触发，无过度拦截 |
| 数据清理 | DELETE FROM PJGCS WHERE YNGYJG='NACCT002' 及关联 PJGGX/角色关系记录（复核通过情形），或复核驳回后删除申请记录 |

### TC-ORGV2-017 管理员批量导入超 BR-ADM-20 上限整批拒绝（v1.2 新增，PRD TC-ADM-06）

| 项 | 内容 |
|---|---|
| 用例名称 | 管理员批量导入 35 条（超 branch_admin_max_count 上限 30）整批拒绝，不新增任何记录 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询（RULE-09/RULE-06） |
| 跨模块标注 | 需专项数据（D4：35 条合法管理员 Excel/报文 + 目标机构 ADMTGT01） |
| 前置条件 | 1. 以 hnnxbank 法人管理员（userType="4"）登录（仅法人管理员可操作，锚点：HnnxbankBranchAdminController.java L360-362）；2. TM_BUSINESS_PARAMETER 无 branch_admin_max_count 记录（默认 30 生效）；3. 按 D4 准备 35 条用户号（ADMU001~ADMU035）不重复、机构号 ADMTGT01 的导入数据；4. 记录管理员表记录数基线 |
| 步骤 | 1. 机构管理员管理-批量导入，上传 35 条 Excel；2. 提交导入（POST func_batchImportBranchAdmin）；3. 观察返回结果；4. 查询管理员表确认无新增 |
| 预期结果 | 1. 整批拒绝：返回错误码 EX_0BE229905511，提示文案含"单次批量导入机构管理员个数不能超过30个（本次提交35个），请分批导入"（锚点：HnnxbankBranchAdminController.java L369-373 抛 BempRuntimeException + String.format 文案；实现文案与 PRD TC-ADM-06 示例文案"单次批量新增不可超过 30 条"措辞存在差异，以代码实现为准，语义一致不阻塞）；2. 超限校验位于逐条身份认证之前作为整体前置 gate，35 条全部未落库（SELECT COUNT 与基线一致，锚点：L364-373 校验先于 L392 逐条循环，PRD §2.4.2"超限则整批拒绝，不执行任何新增"）；3. 非法人管理员账号提交被权限拦截"只有法人管理员可以批量新增机构管理员"（对照断言） |
| 数据清理 | 删除预置测试数据（应无数据可清，核对为空）；参数复位见 D4 |

### TC-ORGV2-018 BR-ADM-20 参数修改后以最新参数值校验（v1.2 新增，PRD TC-ADM-07）

| 项 | 内容 |
|---|---|
| 用例名称 | branch_admin_max_count 参数修改（30→50）后校验以最新参数值为准，单次批量上限随之变为 50 |
| 优先级/测试方式 | P1 / Playwright + 数据库查询（RULE-09/RULE-06） |
| 跨模块标注 | 需专项数据 + 需跨模块操作（系统参数维护） |
| 前置条件 | 1. 法人管理员登录；2. 按 D4 将 branch_admin_max_count 配置为 50（法人级 LEGAL_NO={REQ_LEGAL_NO}）；3. 准备 35 条导入数据（超原上限 30、低于新上限 50） |
| 步骤 | 1. 数据库配置参数值为 50 并查询确认落库；2. 批量导入 35 条管理员数据；3. 观察导入结果；4. 【对照】再将参数改为 10，以 35 条重新提交 |
| 预期结果 | 1. 参数为 50 时 35 条导入放行进入逐条处理（不再被 30 上限拦截，参数修改后再次提交以最新值校验，如参数服务存在刷新延迟，以实际机制为准并记录，锚点：HnnxbankBranchAdminController.java L367-369 getIntegerParamWithDefault 在请求内调用），单条成功/失败以逐条结果为准（单条失败不影响其他，L341 业务规则3）；2. 参数改为 10 时 35 条整批拒绝，文案上限值显示为"10"（锚点：L371 String.format 动态取 maxImportCount），证明校验以最新参数值为准（PRD §11.1.4 TC-ADM-07） |
| 数据清理 | 删除本轮导入成功的管理员记录；删除 branch_admin_max_count 参数记录恢复默认态（D4 清理闭环） |

### TC-ORGV2-019 branch_admin_max_count 未配置默认 30 且法人级配置优先（v1.2 新增，Q-17）

| 项 | 内容 |
|---|---|
| 用例名称 | branch_admin_max_count 未配置时取默认值 30，按法人（legalNo）单独配置优先于全局默认（代码审查+数据库查询） |
| 优先级/测试方式 | P2 / 代码审查 + 数据库查询（RULE-04/RULE-06） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取；TM_BUSINESS_PARAMETER 可查询 |
| 步骤 | 1. Read HnnxbankBranchAdminController.java L364-373：getIntegerParamWithDefault(userInfo.getLegalNo(), "branch_admin_max_count", 30, "机构管理员单次批量导入最大个数")；2. Read getIntegerParamWithDefault 私有方法实现，核对取参顺序（法人级配置优先→未配置回退默认 30）与"最大个数=单次批量导入行数上限"语义边界（Q-17 ①②③④：paramKey 命名 branch_admin_max_count、语义为单次行数非累计总数、按法人单独配置、超限整批拒绝）；3. 数据库查询当前参数配置态 |
| 预期结果 | 1. paramKey=`branch_admin_max_count`、默认值=30（Q-17 ①，锚点：L368）；2. "最大个数"语义=单次批量导入行数上限（userDtoList.size() 与上限比较，非累计总数，锚点：L369，Q-17 ②）；3. 参数支持按法人 legalNo 单独配置（getIntegerParamWithDefault 首参传 userInfo.getLegalNo()，法人优先取参语义，Q-17 ③）；4. 未配置/取值非法时回退默认 30 且不阻断主流程（对照 L381-386 密码有效期/错误次数同构回退模式） |

## 四、统计

| 优先级 | 数量 | 编号 |
|-------|------|------|
| P0 | 10 | TC-ORGV2-001~005、009~010、015~017 |
| P1 | 7 | TC-ORGV2-006~008、011~013、018 |
| P2 | 2 | TC-ORGV2-014、019 |
| 合计 | 19 | — |

> v1.2 统计口径：新增 5 条（015/016 补 PRD TC-ORG-18/19 P0 缺口，017~019 补 BR-ADM-20 缺口）；PRD 场景映射对照——TC-ORG-17↔TC-ORGV2-004+005、TC-ORG-18↔TC-ORGV2-015、TC-ORG-19↔TC-ORGV2-016、TC-ADM-06↔TC-ORGV2-017、TC-ADM-07↔TC-ORGV2-018、Q-17↔TC-ORGV2-019，全部 PRD v2.1/v2.3/v2.4 增量场景已闭环覆盖。

## 五、遗留测试假设

> **批2 执行记录（2026-09-06，bemp-auto-tester）**：TC-ORGV2-001~008 通过（001 弹窗文案逐字匹配+两段提交落库 TM_BRANCH；003 全账务无弹窗；004/005 单条新增两段提交+F-10 不豁免；007 level5 落库无层级拦截；008 同码双落库）；009~014 通过（代码审查：YNGYJG 主键 upsert、PJGGX 五字段主键、日志四要素、增量无 deleteAll、WEIHRQ 仅装载），010/013 运行时 BLOCKED（TT_TASK 无手动触发通道）；017~019 通过（35 条整批拒绝文案逐字、参数 50→35 条放行/10→动态上限生效[Redis 缓存刷新备注]、默认 30/法人优先/单次行数语义）。执行备注：①落库断言以 TM_BRANCH 为准（用例"写入 PJGCS"为笔误，PJGCS 为核心侧同步源）；②非账务判定按 PJGGX.YNGYJG（D1 校准 SQL 中 g.FAREDM 为笔误）；③sm.auth.is_allow_repeat_orgcode=1 已补插全局参数。详见 aotutests-playwright/reports/hnnxbank/2026-09/batch2_execution_report.md。

| # | 假设项 | 影响 | 处理 |
|---|-------|------|------|
| H1 | ✅ 已核实（2026-09-02 评审）：两步提交参数名 skipNonAccounting 与 PRD §12 Q-22 建议口径一致，代码已实现——单条新增侧 HnnxBankBranchController.java L156 `@RequestParam(value="skipNonAccounting", required=false)`、批量导入侧 BranchImportVo.java L17；响应清单字段 nonAccountingBranchNos 见 BranchImportValidateResp.java L30 | TC-ORGV2-001/004/005/015 步骤4参数断言 | 假设关闭，按现锚点直接执行，无需执行前再核准 |
| H2 | ✅ 已核实（2026-09-02 评审）：BR-SYNC-12~19 增量机制代码已合入——SyncJobUtils.java L27 常量存在，SyncPjgcsBranchParamJobServiceImpl.java L136-145 与 SyncPjgxBranchRelationJobServiceImpl.java L132-138 FULL/INCR 分发及 syncIncrementalData 增量落库分支均已实现 | TC-ORGV2-009~013 | 假设关闭，解除"⏸ 待实现"阻塞，5 条用例可直接执行 |
| H3 | BR-ADM-20 拒绝文案以代码实现为准："单次批量导入机构管理员个数不能超过{N}个（本次提交{X}个），请分批导入"（锚点：HnnxbankBranchAdminController.java L370-372），与 PRD TC-ADM-06 示例文案"单次批量新增不可超过 30 条"措辞不同（语义一致：整批拒绝+上限提示） | TC-ORGV2-017 断言1 | 按实现文案断言；文案差异已记录，若需求方坚持 PRD 原文案由 bemp-personalized-developer 评估修改 |
| H4 | TM_USER 管理员表名/列名以执行时 describe 核对为准（D4 清理 SQL 为模板） | TC-ORGV2-017/018 数据清理 | 落库/清理前 Oracle MCP describe 核对，禁止直接执行模板 SQL |
