# 反洗钱 rebuy 场景漏拦修复增量用例（TC-AML-P0-040~042 / P1-048~049 / P2-035~036）

> **被测改动**：rebuy 场景（转贴现买入 BT01 / 质押式逆回购 BT02 / 买断式逆回购 BT03，三业务共用 quoteRebuyChange.vue 提交页）commit 反洗钱拦截取数口径更新，改动 2 文件：
> 1. `HnnxRebuyApplyServiceImpl.collectRebuyBillCheckItems`（banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/be/market/service/impl/quote/rebuy/HnnxRebuyApplyServiceImpl.java L290-339）：交易对手补装 oppName（批次表 te_rebuy_batch.SALE_BRCH_NAME，L297-298 补装 + L310-311 装配）；明细装配 discBrchCode（te_rebuy_bill.DISC_BRCH_CODE，L315）；rebuy 裁剪 ET05 查库补全（collect 方法内无 fillDiscountCustInfoFromDb 调用）；贴现人空值跳过 + WARN 汇总留痕（L325-337）
> 2. `HnnxAntiMoneyValidateUtil.fillDiscBankSocCode`（banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/antimoney/validate/HnnxAntiMoneyValidateUtil.java L2101-2145）：贴现行信用代码走 te_rebuy_bill.disc_brch_code → tm_cpes_branch(BRCH_CODE 且 BRCH_STATUS='ST01') 反查 SOC_CODE（仅回填空缺 L2138-2145、批次去重 LinkedHashSet L2121-2132、复用 querySocCodeByBrchCodes ≤1000 分片 L2031）
>
> **复用策略**：反洗钱核心口径（5 角色/两轮匹配/开关降级/黑灰文案）、定时抽取、名单页面、四阶段、⑤⑥签收阶段均由既有用例覆盖（TC-AML-P0-001~039、P1-011~047、P2-026~034、TC-AML-DATA-V1），本文件仅覆盖本次 rebuy 漏拦修复增量，编号从既有最大序号顺延（P0 最大 039、P1 最大 047、P2 最大 034），无场景重复。
> **银行配置**：当前银行走 `${ENV:BANK_CODE}` 占位符解析链（环境变量 > _shared/env-config.json environmentDefaults），本次解析值 `hnnxbank`；个性化路径前缀 `/hnnxbank/`（bemp-testcase-generator/config/generator-config.json → banks.hnnxbank.url_prefix）；登录账号引用 `bemp-webapp-testing/config/test_config.json` → banks.hnnxbank.login（default=普通柜员、admin=法人管理员），用例内不硬编码账号口令。
> **修订记录**：v1.0（2026-09-03）初版，7 条用例（P0:3 P1:2 P2:2）；v1.1（2026-09-03）用例评审修复——P0-040 步骤3 commit 直调 URL 由误写的 /hnnxbank/ 前缀更正为页面实际 /be/market/quote/quoteManager/func_commitRebuyApply（L1113-1114）；P1-048 预期4 WARN 文案补"反查"二字对齐 L2113；D2 锚点 RebuyBillDto.java L185→L184（discBrchCode 声明行）；P0-042 空值过滤主锚点改为 rebuy 实际链路 L372-375（L245-253 降为旁证）并补充日志时间窗口与批次 C 一次性消耗说明；样本批次 A 增加与 R-RB2/R-RB3 的匹配要素互斥约束（防串扰误命中）。

## 一、增量范围与覆盖度映射

| 修复点 | 代码锚点 | 既有覆盖状态 | 本次动作 |
|-------|---------|------------|---------|
| 交易对手名称拦截（round2 名称兜底，此前 oppName 漏装致该通道整段失效） | HnnxRebuyApplyServiceImpl.java L297-298/L310-311；HnnxAntiMoneyValidateUtil.java L360-384/L616-619 | 未覆盖（既有 TC-AML-P0-003 交易对手用例基于四入口预检链，未覆盖 rebuy commit 兜底取数口径） | 新增 P0-040 |
| 贴现行信用代码拦截（round1，disc_brch_code 机构反查新通道） | HnnxAntiMoneyValidateUtil.java L2101-2145/L2019-2047/L334-353 | 未覆盖（v3.5 新增第五段） | 新增 P0-041 |
| 贴现人空值跳过语义 + WARN 汇总留痕 | HnnxRebuyApplyServiceImpl.java L316-318/L325-337 | 未覆盖（rebuy 场景裁剪后的新语义） | 新增 P0-042 |
| 反查降级路径（disc_brch_code 空 / 机构非 ST01 → 不阻断降级名称匹配） | HnnxAntiMoneyValidateUtil.java L2121-2132/L2033/L2111-2114 | 未覆盖 | 新增 P1-048 |
| sale/redisc/贴现/预检场景 ET05 补全未被裁剪影响（回归） | HnnxBankSaleApplyServiceImpl.java L544；HnnxBankRediscountSaleApplyServiceImpl.java L279；HnnxBankDiscBillServiceImpl.java L604；HnnxAntiMoneyPreCheckServiceImpl.java L104 | 既有用例覆盖各场景功能行为，未覆盖"裁剪不外溢"回归断言 | 新增 P1-049 |
| 前端预检（quoteRebuyChange.vue oppName 上送 saleBrchName + 弹窗） | quoteRebuyChange.vue L575-586/L1051-1055/L134-135；submitCheckMixin.js L153-219/L181 | 既有 TC-AML-P0-003 覆盖预检通案，未覆盖 rebuy 页 fieldMap 映射专项 | 新增 P2-035 |
| 三业务分支（BT01/BT02/BT03 各走一遍 P0 场景） | quoteRebuyChange.vue L602-604（props bt）；HnnxRebuyApplyServiceImpl.java L197-202（共用校验入口） | 未覆盖 | 新增 P2-036 |

## 二、全局前置条件（各运行时用例共享）

| 项 | 内容 | 锚点/引用 |
|---|------|----------|
| G1 校验开关开启 | `hnnx.market.antiMoneyList.block` 参数值非 "0/N/否"（默认开启）；该参数位于 BEMP 业务库 TM_BUSINESS_PARAMETER（schema 区别见 TC-AML-DATA-V1 §4 m4 口径） | HnnxCommonConst.java L56（参数 key 常量）；HnnxAntiMoneyValidateUtil.java L182-185（读取与 isInterceptFlag 判定） |
| G2 批次满足既有 commit 前置校验 | 批次状态=QBS001、prodNo 非空、利息已计算（interestStatus=1）、贴贷比/贴现限额校验通过（hnnxCommitApplyCheck 链），否则 commit 在反洗钱校验段之前即被既有规则拦截，干扰结果观察 | HnnxRebuyApplyServiceImpl.java L118（QBS001）、L121-123（prodNo）、L127-129（利息）、L346-385（贴贷比） |
| G3 登录会话 | 以 test_config.json → banks.hnnxbank.login.default 普通柜员账号登录（具备买入批次提交权限）；接口直调用例复用同一登录态 | bemp-webapp-testing/config/test_config.json（配置引用，不硬编码） |
| G4 营业日口径 | 名单时效判定取票据业务营业日（BusiDateService.viewBusiDate().getWorkday()），名单 CTRL_START_TIME 以营业日基准预置 | HnnxAntiMoneyValidateUtil.java L834-847（currentDate 营业日优先） |
| G5 执行环境 | 运行时类用例（P0-040/041/042、P1-048、P2-035/036）需前后端服务就绪后由 bemp-webapp-testing 执行；代码审查类用例（P1-049）不依赖服务 | 测试方式标注 |

## 三、测试数据准备

> 名单表=应用读取表 `HNNX_M_CUST_SPECIAL_INFO`（22 列含 RECORD_ID 主键，直插一律落该表并带 INFO_SRC='TEST' 标记，口径：TC-AML-DATA-V1 §9.2 v3.4.10）；执行前由 bemp-implementation-engineer 通过 Oracle MCP 跑就绪检查（config/test-data-check.json → checkItems 三项自检：表结构核对 / 应用读取表声明 / 清理闭环契约）。

### D1 名单记录（3 条，LIST_CHRC='1' 黑名单）

| 记录 ID | OBJ_ID | CUST_NM | CERT_TYPE | CERT_NO | 通道用途 | 服务用例 |
|--------|--------|---------|-----------|---------|---------|---------|
| R-RB1 | AMLREBUY01 | AML-RBUY-对手测试机构甲 | 01 | NULL | 纯名称命中（round2；certNo 空不参与 round1） | P0-040、P2-036、P2-035 |
| R-RB2 | AMLREBUY02 | AML-RBUY-贴现行名单显示名（与实际贴现行名称刻意不同） | 22 | <D2 反查 SOC_CODE，两步法回填> | 代码命中（round1，CERT_TYPE='22'+CERT_NO） | P0-041 |
| R-RB3 | AMLREBUY03 | <D3 选定的实际贴现行名称，取 te_rebuy_bill.disc_bank_name 原值> | 01 | NULL | 纯名称命中贴现行（降级场景 round2 兜底） | P1-048 |

公共列要求（锚点：HnnxAntiMoneyValidateUtil.java L75-90 常量 + L701-742/L759-812 两分支查询条件）：DATA_SRC='18'、VLD_ST='1'、LIST_CHRC='1'、CTRL_START_TIME≤营业日（G4）、CTRL_END_TIME=NULL、INFO_SRC='TEST'。

### D2 贴现行信用代码对照（两步法，锁定 round1 命中值）

```sql
-- 步骤1：选定样本票并反查其贴现行有效机构 SOC_CODE（锚点：HnnxAntiMoneyValidateUtil.java L2033 andBrchStatusEqualTo(ST01) + L2031 ≤1000 分片；明细表字段锚点：HnnxRebuyApplyServiceImpl.java L315 / RebuyBillDto.java L184）
SELECT r.id, r.bill_no, r.disc_brch_code, r.disc_bank_name, b.soc_code
  FROM te_rebuy_bill r
  JOIN tm_cpes_branch b ON b.brch_code = r.disc_brch_code AND b.brch_status = 'ST01'
 WHERE r.batch_id = :批次ID AND b.soc_code IS NOT NULL;
-- 步骤2：将步骤1查得的 soc_code 回填至 D1 R-RB2.CERT_NO 后再执行名单直插
```

### D3 批次与票据样本核对

```sql
-- 批次样本（锚点：HnnxRebuyApplyServiceImpl.java L297-298 oppName 取批次表卖方名；L118 状态校验）
SELECT id, batch_no, batch_status, sale_brch_code, sale_brch_name, prod_no, interest_status
  FROM te_rebuy_batch
 WHERE sale_brch_name = 'AML-RBUY-对手测试机构甲' AND batch_status = 'QBS001';
-- 明细样本（贴现人恒空与 disc_brch_code 就绪核对，锚点：HnnxRebuyApplyServiceImpl.java L316-318 注释 + RebuyBillDto.java L692）
SELECT bill_no, disc_brch_code, disc_bank_name, discount_cust_name FROM te_rebuy_bill WHERE batch_id = :批次ID;
```

样本要求：
1. 样本批次 A（P0-040/P2-036/P2-035 用）：批次表 SALE_BRCH_NAME='AML-RBUY-对手测试机构甲'（与 R-RB1.CUST_NM 一致），状态 QBS001、利息已计算（G2），含≥1 张正常票据；且该批次各明细贴现行名称不得命中 D1 任一名单 CUST_NM、各角色经 tm_cpes_branch 反查的 SOC_CODE 不得等于 R-RB2.CERT_NO（防 round1/round2 串扰使命中文案偏离交易对手通道，round2 遍历顺序不保证交易对手名先命中）；
2. 样本批次 B（P0-041 用）：明细表 DISC_BRCH_CODE 在 tm_cpes_branch 存在 ST01 有效机构且 SOC_CODE 非空（D2 步骤1 可查出），批次其余条件同 G2；贴现行名称不得与任何名单 CUST_NM 相同（保证仅代码命中）；
3. 样本批次 C（P0-042 用）：全部角色均不命中名单、明细 DISCOUNT_CUST_NAME 为空（rebuy 场景买入类 DTO 恒空，锚点 HnnxRebuyApplyServiceImpl.java L316-318），其余条件同 G2；
4. 样本批次 D（P1-048 用）：明细 DISC_BRCH_CODE 为空或指向 tm_cpes_branch 中不存在/BRCH_STATUS≠'ST01' 的机构（二者任一即可），且贴现行名称= R-RB3.CUST_NM，其余条件同 G2。

### D4 就绪检查与清理（闭环契约）

```sql
-- 就绪检查
SELECT COUNT(*) FROM HNNX_M_CUST_SPECIAL_INFO WHERE OBJ_ID IN ('AMLREBUY01','AMLREBUY02','AMLREBUY03') AND INFO_SRC='TEST';
-- 清理模板（按业务键精确删除，禁止 TRUNCATE；测试结束后恢复现场）
DELETE FROM HNNX_M_CUST_SPECIAL_INFO WHERE OBJ_ID IN ('AMLREBUY01','AMLREBUY02','AMLREBUY03') AND INFO_SRC='TEST';
```

## 四、用例明细

### TC-AML-P0-040 rebuy commit 交易对手名称拦截（round2 名称兜底，本次核心修复）

| 项 | 内容 |
|---|---|
| 用例名称 | rebuy 批次 commit 时名单命中批次表卖方机构名称（sale_brch_name），后端兜底拦截且报错文案正确 |
| 优先级 | P0 |
| 测试方式 | 接口直调（Playwright 登录态发起）+ 代码审查（RULE-09/RULE-03，primary_first：接口直调为主，代码审查文案锚点背书）；运行时执行项，服务就绪后执行 |
| 跨模块标注 | 需专项数据（D1 R-RB1 + D3 样本批次 A）+ 需跨模块操作（登录 + 导航 + commit 接口直调） |
| 代码锚点 | HnnxRebuyApplyServiceImpl.java L197-202（commit 校验入口）、L297-298（oppName=saleBrchName 补装）、L310-311（item.setOppName 装配）、L298（取自 te_rebuy_batch.SALE_BRCH_NAME）；HnnxAntiMoneyValidateUtil.java L360-384（matchByNamesFallback round2）、L378-383（throwIfHit(name,...)）、L616-619（黑名单命中抛 320009，{0}=匹配名称）；hnnx_mt_zh_CN.properties L9（文案模板） |
| 前置条件 | G1~G4 + D1 R-RB1 直插就绪 + D3 样本批次 A 就绪（其 SALE_BRCH_NAME='AML-RBUY-对手测试机构甲'） |
| 步骤 | 1. 以 G3 账号登录（${ENV:BANK_CODE}=hnnxbank 环境）；2. 进入【场内业务子系统】→【市场交易】→【对话报价申请】定位样本批次 A；3. 因前端预检将命中并弹窗阻断（submitCheckMixin.js L184-189 resolve(false)），commit 兜底以登录态直调 POST `/be/market/quote/quoteManager/func_commitRebuyApply`（quoteRebuyChange.vue L1113-1114 锚点，页面实际 URL 为 /be/ 前缀——/hnnxbank/market/ 前缀仅用于预检接口 func_antiMoneyPreCheck，勿混淆；body 含批次 A id）验证后端通道；4. 检查响应与批次状态、应用日志 |
| 预期结果 | 1. commit 接口返回非 000000，retMsg='客户[AML-RBUY-对手测试机构甲]在中互金关注名单中，禁止办理票据业务'（{0}=批次表 SALE_BRCH_NAME trim 后值，文案锚点 hnnx_mt_zh_CN.properties L9 + HnnxAntiMoneyValidateUtil.java L617-619）；2. 应用日志出现 error 级留痕'客户[AML-RBUY-对手测试机构甲]命中中互金关注名单（黑名单），名单编号[AMLREBUY01]，禁止办理票据业务'（HnnxAntiMoneyValidateUtil.java L617-618 LOGGER.error 模板）；3. 批次状态保持 QBS001 未流转（拦截发生在 L200-202 校验段，早于额度占用/审批流）；4. 该批次再次直调结果一致（校验无副作用，可重复复现） |

### TC-AML-P0-041 rebuy commit 贴现行信用代码拦截（round1 机构反查通道，本次核心修复）

| 项 | 内容 |
|---|---|
| 用例名称 | rebuy 批次 commit 时名单命中 te_rebuy_bill.disc_brch_code 反查出的贴现行统一社会信用代码（round1 优先匹配），后端兜底拦截 |
| 优先级 | P0 |
| 测试方式 | 接口直调（Playwright 登录态发起）+ 数据库查询 + 代码审查（RULE-09/RULE-06/RULE-01）；运行时执行项，服务就绪后执行 |
| 跨模块标注 | 需专项数据（D1 R-RB2 + D2 两步法 + D3 样本批次 B）+ 需跨模块操作 |
| 代码锚点 | HnnxRebuyApplyServiceImpl.java L315（item.setDiscBrchCode 装配 te_rebuy_bill.DISC_BRCH_CODE）；HnnxAntiMoneyValidateUtil.java L1747-1758（fillSocCodeFromDb 五段顺序，第五段 L1757）、L2101-2115（fillDiscBankSocCode）、L2121-2132（collectDiscBrchCodes 仅收集 discBankSocCode 空缺项）、L2138-2145（applyDiscBankSocCode 仅回填空缺）、L2019-2047（querySocCodeByBrchCodes：BRCH_CODE + L2033 BRCH_STATUS='ST01'，L2031 ≤1000 分片）、L334-353（round1 matchBySocCodes）、L759-812（queryMatchBySocCodes certType='22'+certNo in）、L349（命中传名单记录 CUST_NM） |
| 前置条件 | G1~G4 + D2 步骤1 已查得样本批次 B 贴现行 SOC_CODE + D1 R-RB2（CERT_NO=该 SOC_CODE）直插就绪 + 样本批次 B 就绪且贴现行名称与任何名单 CUST_NM 均不同 |
| 步骤 | 1. 数据库复核样本批次 B：disc_brch_code 非空且 tm_cpes_branch 存在 ST01 记录（D2 SQL）；2. 以 G3 账号登录态直调 func_commitRebuyApply（同 P0-040 步骤3）；3. 检查响应与日志；4. 数据库复核名单命中记录 CERT_TYPE='22' |
| 预期结果 | 1. commit 接口返回非 000000，retMsg='客户[AML-RBUY-贴现行名单显示名]在中互金关注名单中，禁止办理票据业务'——{0}=名单记录 CUST_NM（round1 命中传 e.getValue().getCustNm()，锚点 HnnxAntiMoneyValidateUtil.java L349；此时贴现行角色名称未命中名单，证明命中途径为信用代码而非名称）；2. round1 命中早于 round2（L312-316 validateAntiMoneyListByItems 先 matchBySocCodes 后 matchByNamesFallback），日志命中记录为该 22 代码名单记录（名单编号[AMLREBUY02]）；3. 批次状态保持 QBS001；4. 反查链路数据核对：disc_brch_code→tm_cpes_branch.BRCH_CODE（BRCH_STATUS='ST01'）→SOC_CODE 与 R-RB2.CERT_NO 三者一致（D2 口径） |

### TC-AML-P0-042 rebuy commit 贴现人空值跳过语义（不阻断 + WARN 汇总留痕）

| 项 | 内容 |
|---|---|
| 用例名称 | rebuy 批次 commit 时贴现人无数据源不阻断提交流程，且以单条 WARN 日志汇总留痕（票据数+票号清单） |
| 优先级 | P0 |
| 测试方式 | 接口直调/Playwright 提交 + 运行时测试（日志落盘检查）+ 代码审查（RULE-09/RULE-11/RULE-01）；运行时执行项，服务就绪后执行 |
| 跨模块标注 | 需专项数据（D3 样本批次 C）+ 需跨模块操作（含日志文件检查） |
| 代码锚点 | HnnxRebuyApplyServiceImpl.java L316-318（discountCustName 恒空装配）、L325-337（!items.isEmpty() 时单条 WARN 汇总，票号逗号连接 L327-334，日志文本 L335-336）、L68（logger name=RebuyApplyServiceImpl，getLogger(RebuyApplyServiceImpl.class)——日志检索须按父类 logger 名而非 HnnxRebuyApplyServiceImpl）；HnnxAntiMoneyValidateUtil.java L372-375（rebuy 实际链路：round2 名称收集仅取非空名，空值自然不参与匹配；L245-253 为同文件名称版入口 validateAntiMoneyList 的同语义过滤，作旁证） |
| 前置条件 | G1~G4 + D3 样本批次 C 就绪（各角色均不命中名单、无贴现人数据）+ 日志文件路径可访问（服务日志目录，logger name=RebuyApplyServiceImpl） |
| 步骤 | 1. 以 G3 账号登录态对样本批次 C 直调 func_commitRebuyApply（或 UI 提交，两通道均可）；2. 检查 commit 结果与批次状态；3. 检索应用日志中"中互金名单校验[rebuy]"关键字 |
| 预期结果 | 1. commit 不因贴现人为空而阻断：各角色未命中名单时接口返回 000000（或返回与反洗钱无关的后续校验结果），不出现任何含"贴现人"的报错文案——空值由校验工具过滤即"该角色本轮不参与匹配"（锚点 L317 注释 + HnnxAntiMoneyValidateUtil.java L372-375 round2 非空名称收集过滤）；2. 应用日志出现且仅出现 1 条 WARN：'中互金名单校验[rebuy]：贴现人角色该阶段无数据源（背书链ET05未落库），不参与本轮名单匹配，票据数[<N>]，票号[<票号逗号清单>]'（L335-336 模板逐字一致，N 与票号清单与批次 C 明细吻合；日志检索以本次执行时间戳为起点，排除历史执行残留干扰计数）；3. 汇总性成立：批次 C 含 M 张票据时该 WARN 仅 1 条（非逐张刷屏，锚点 L321 汇总一次打印注释 + L325 条件）；4. 日志 logger 名为 RebuyApplyServiceImpl（L68 getLogger 取父类 class，检索时不得误用 HnnxRebuyApplyServiceImpl 过滤）；5. 批次 C 若 commit 完整走通将产生真实状态流转（审批流/额度占用），属一次性消耗样本——执行后按批处置数据恢复或在用例数据准备阶段重置，不影响本用例断言（WARN 打印于反洗钱段，早于额度占用/审批流） |

### TC-AML-P1-048 rebuy 贴现行反查降级路径（disc_brch_code 缺失/机构非 ST01 → 不阻断降级名称匹配）

| 项 | 内容 |
|---|---|
| 用例名称 | 贴现行机构代码反查不可得（disc_brch_code 为空或机构不在 tm_cpes_branch ST01）时 commit 不阻断，贴现行名称命中名单仍经 round2 名称兜底拦截 |
| 优先级 | P1 |
| 测试方式 | 接口直调 + 数据库查询 + 代码审查（RULE-09/RULE-06/RULE-01）；运行时执行项，服务就绪后执行 |
| 跨模块标注 | 需专项数据（D1 R-RB3 + D3 样本批次 D）+ 需跨模块操作 |
| 代码锚点 | HnnxAntiMoneyValidateUtil.java L2127（collectDiscBrchCodes 仅收集 discBrchCode 非空项——为空自然跳过反查）、L2033（ST01 过滤——机构不存在/非 ST01 时查空，discBankSocCode 保持空值）、L2111-2114（反查异常仅 WARN'贴现行统一社会信用代码反查异常，降级为名称匹配'不阻断）、L372-375（round2 名称兜底收集） |
| 前置条件 | G1~G4 + D1 R-RB3（CUST_NM=样本批次 D 贴现行名称）直插就绪 + D3 样本批次 D 就绪（disc_brch_code 为空或指向无 ST01 记录的机构） |
| 步骤 | 1. 数据库复核批次 D 明细 disc_brch_code 状态（D3 SQL）；2. 以 G3 账号登录态直调 func_commitRebuyApply；3. 检查响应、批次状态与日志 |
| 预期结果 | 1. 反查不可得未阻断流程：未出现 5xx/框架异常，流程进入两轮匹配（collectDiscBrchCodes 空集/查空均为静默跳过，锚点 L2103-2105 空集早返回）；2. round1 无该贴现行信用代码可匹配（discBankSocCode 保持空，不臆造），round2 名称兜底命中 R-RB3：retMsg='客户[<R-RB3.CUST_NM>]在中互金关注名单中，禁止办理票据业务'（L378-383 throwIfHit 通道）；3. 批次状态保持 QBS001；4. 若构造的是"机构代码存在但 BRCH_STATUS≠'ST01'"变体，行为一致（ST01 过滤生效，锚点 L2033）；仅当反查抛出 DAO 异常时才出现 WARN'贴现行统一社会信用代码反查异常，降级为名称匹配'日志（L2113，正常降级路径无该日志） |

### TC-AML-P1-049 sale/redisc/贴现/预检场景 ET05 补全回归（rebuy 裁剪不外溢）

| 项 | 内容 |
|---|---|
| 用例名称 | rebuy 裁剪 ET05 查库补全仅作用于 rebuy collect 路径，sale/redisc/贴现 commit 与前端预检四调用点的 fillDiscountCustInfoFromDb 通道保持完整，fillDiscBankSocCode 仅回填空缺不覆盖既有回填值 |
| 优先级 | P1 |
| 测试方式 | 代码审查 + 单元测试（RULE-01 逻辑验证；单测基线 HnnxAntiMoneyValidateTest 提供运行断言）；独立可执行，不依赖服务启动 |
| 跨模块标注 | 独立可执行 |
| 代码锚点 | HnnxBankSaleApplyServiceImpl.java L476-477（sale commit 入口）+ L544（仍调 fillDiscountCustInfoFromDb）；HnnxBankRediscountSaleApplyServiceImpl.java L232-234（redisc commit 入口）+ L279（仍调）；HnnxBankDiscBillServiceImpl.java L604（贴现仍调）；HnnxAntiMoneyPreCheckServiceImpl.java L104（预检仍调）；HnnxRebuyApplyServiceImpl.java 全文件无 fillDiscountCustInfoFromDb 调用（rg 核对）；HnnxAntiMoneyValidateUtil.java L2127（fillDiscBankSocCode 仅收集 discBankSocCode 空缺项）+ L2140-2142（仅回填空缺，ET05 先行回填值不被覆盖）；HnnxAntiMoneyValidateTest.java L410-442（批量回填仅覆盖空缺项单测）、L457-476（补全异常降级保持原值单测） |
| 前置条件 | 源代码已拉取到本地工作区；单测模块可执行（hnnxbank-biz-as） |
| 步骤 | 1. rg 全库检索 fillDiscountCustInfoFromDb 调用点，核对四调用点仍在、rebuy collect 无调用；2. Read HnnxAntiMoneyValidateUtil.java L2101-2145，核对 collectDiscBrchCodes/applyDiscBankSocCode 的 isBlank 前置条件（仅空缺回填）；3. Read 三处 collect 方法的 discountCustName/discBankSocCode 装配来源，确认 sale/redisc/贴现的 ET05 补全输入未变；4. 执行 HnnxAntiMoneyValidateTest 中 fillDiscountCustInfoFromDb 相关单测（L410-442/L457-476）确认全绿 |
| 预期结果 | 1. fillDiscountCustInfoFromDb 调用点恰为 4 处主链路（sale L544 / redisc L279 / 贴现 L604 / 预检 L104），HnnxRebuyApplyServiceImpl 无任何调用（rebuy 裁剪生效且不外溢）；2. fillDiscBankSocCode 的收集与回填均以 discBankSocCode 为空为前提（L2127/L2140），sale/redisc 场景已由 ET05 TRANS_TO_SOC_CODE 回填的值不会被机构反查覆盖（L2098-2099 注释语义）；3. 4 个单测执行通过：批量回填仅覆盖空缺项、补全 DAO 异常不向外传播保持原值；4. 三处 commit 入口（sale/redisc/rebuy）校验链结构一致：均先 collect 后 validateAntiMoneyListByItems，差异仅在 rebuy 无补全调用与贴现人 WARN 留痕 |

### TC-AML-P2-035 rebuy 前端预检（oppName 上送 saleBrchName）弹窗验证

| 项 | 内容 |
|---|---|
| 用例名称 | quoteRebuyChange.vue 提交申请触发中互金预检，交易对手名称按"预检入参 oppName ← 票据 DTO saleBrchName"映射上送，命中时弹窗阻断提交 |
| 优先级 | P2 |
| 测试方式 | Playwright（RULE-09：UI 交互/弹窗）；运行时执行项，服务就绪后执行 |
| 跨模块标注 | 需专项数据（D1 R-RB1 + D3 样本批次 A）+ 需跨模块操作 |
| 代码锚点 | quoteRebuyChange.vue L575-586（submitCheckConfig.antiMoneyFieldMap，L580 `oppName: "saleBrchName"`）、L1051-1055（apply → runSubmitCheck）、L134-135（anti-money-bill-dialog）、L38（提交按钮 :loading="preSubmitChecking"）、L1046-1049（formatCheckBillNo 覆盖保持子票区间展示）；submitCheckMixin.js L153-219（checkAntiMoneyBeforeSubmit）、L181（POST /hnnxbank/market/func_antiMoneyPreCheck）、L184-189（命中弹窗 resolve(false) 阻断）、L221-224（弹窗关闭仅关闭不自动重提）；RebuyBillDto.java L676（saleBrchName 字段存在） |
| 前置条件 | G1~G4 + D1 R-RB1 + D3 样本批次 A 就绪 |
| 步骤 | 1. 以 G3 账号登录，进入【场内业务子系统】→【市场交易】→【对话报价申请】打开批次 A 提交页；2. 网络面板就绪后点击"提交申请"；3. 捕获预检请求报文与响应；4. 观察弹窗内容；5. 点击弹窗关闭后再次点击"提交申请" |
| 预期结果 | 1. 预检请求为 POST `/hnnxbank/market/func_antiMoneyPreCheck`（个性化路径前缀 /hnnxbank/ 引用 generator-config.json banks.hnnxbank.url_prefix），请求体 bills 数组内 oppName 值=批次表 saleBrchName='AML-RBUY-对手测试机构甲'（L580 映射生效，不取其他字段）；2. 命中响应 retData 非空后弹出"中互金校验异常票据"弹窗（L134-135），弹窗表格含票号、命中角色'交易对手'、命中客户'AML-RBUY-对手测试机构甲'、命中要素（hitType）；弹窗弹出同时提交链被阻断（L188 resolve(false)，applyContinue 未发起）；3. 提交按钮在预检期间处于 loading（L38 preSubmitChecking），完成后恢复；4. 弹窗关闭后系统不自动重新提交（L221-224 onAntiMoneyDialogClose 仅清空状态），用户再次点击提交仍先走预检并被再次阻断；5. 控制台无 TypeError/ReferenceError/ChunkLoadError |

### TC-AML-P2-036 三业务分支（BT01/BT02/BT03）commit 兜底拦截一致性

| 项 | 内容 |
|---|---|
| 用例名称 | 转贴现买入（BT01）、质押式逆回购（BT02）、买断式逆回购（BT03）三类买入批次 commit 反洗钱拦截同样生效且文案一致（共用 collectRebuyBillCheckItems） |
| 优先级 | P2 |
| 测试方式 | 接口直调（Playwright 登录态发起）+ 代码审查（RULE-09/RULE-01）；运行时执行项，服务就绪后执行 |
| 跨模块标注 | 需专项数据（D1 R-RB1 + 三业务各一样本批次，批次表 SALE_BRCH_NAME 同为'AML-RBUY-对手测试机构甲'）+ 需跨模块操作 |
| 代码锚点 | quoteRebuyChange.vue L602-604（props bt：BT01/BT02/BT03 共用本提交页）、L654-661（rebuyBusiType='R'+bt）；HnnxRebuyApplyServiceImpl.java L82-276（commitApply 不区分 busiType）、L197-202（三类买入批次同走反洗钱校验段与 collectRebuyBillCheckItems）、L290（collect 方法签名仅依赖批次+明细，与业务类型解耦） |
| 前置条件 | G1~G4 + D1 R-RB1 直插就绪 + BT01/BT02/BT03 各准备一个满足 G2 的买入批次（卖方机构名均= R-RB1.CUST_NM） |
| 步骤 | 1. 以 G3 账号登录态分别对三个批次直调 func_commitRebuyApply（busiType 差异仅影响批次归属，接口入口相同）；2. 逐一检查三响应与三批次状态 |
| 预期结果 | 1. 三个批次的 commit 均返回非 000000，retMsg 一致为'客户[AML-RBUY-对手测试机构甲]在中互金关注名单中，禁止办理票据业务'（同一 collect/校验链，文案同锚点 hnnx_mt_zh_CN.properties L9）；2. 三个批次状态均保持 QBS001；3. 三批次各产生 1 条命中 error 日志（名单编号[AMLREBUY01]），日志票据数与各批次明细数一致 |

## 五、自校验结果

- 统计一致性：通过——明细 7 条（P0:040/041/042，P1:048/049，P2:035/036）与覆盖度映射表 7 行、编号顺延（P0 最大 039→040 起、P1 最大 047→048 起、P2 最大 034→035 起）一一对应
- 预期结果确定性：通过——文案断言均为完整拼接形态（{0} 具体值来自名单/批次预置数据），无"或/应/可能"措辞；日志断言逐字引用代码模板；P2-035 预检弹窗列内容标注以 AntiMoneyBillDialog 实际渲染为准（运行时确认项，非业务规则歧义）
- 编号规范性：通过——TC-AML-P0-040~042 / P1-048~049 / P2-035~036，无重复/跳号/非标准后缀，与 test-index.json 既有最大序号顺延
- 前置条件完整性：通过——全局前置 G1~G5（开关/既有校链/登录引用/营业日/执行环境）+ 各用例专项数据（D1~D4）+ 登录角色引用配置路径（不硬编码）
- 跨模块可执行性预标注：通过——每条用例标注"独立可执行"（P1-049）或"需专项数据+需跨模块操作"（其余 6 条），运行时执行项均标注"服务就绪后执行"
- 单一职责：通过——每条用例仅验证一个测试点（交易对手名称通道 / 贴现行代码通道 / 贴现人跳过语义 / 反查降级 / 裁剪回归 / 预检弹窗 / 三业务一致性）
- 自校验结论：可提交评审
