# 单张票据应付利息为0时弹窗提示并禁止提交 - 功能测试用例

| 属性 | 值 |
|------|-----|
| 需求编号 | HNNS-EB-STD-REQ-002 |
| 需求文档 | docs/prd/单张票据应付利息为 0 时弹窗提示并禁止提交/HNNS-EB-STD-REQ-002-单张票据应付利息为 0 时弹窗提示并禁止提交-日常优化类-v3.md |
| 用例版本 | v1.3 |
| 编制日期 | 2026-09-02 |
| 编制智能体 | bemp-auto-tester（bemp-testcase-generator） |
| 目标银行 | 河南农商银行（hnnxbank） |
| 覆盖业务规则 | R-001 ~ R-009、§4.2 金额规则（先负数后零值） |
| 修订记录 | v1.3（2026-09-02）用例评审修订：M-1 TC-001 预期6/TC-003 预期3 留痕日志断言对齐现实现——WARN 日志已含利息值（HnnxMarketValidateUtil.java L65 双参数 billNo+firstPayInterest），操作人经 throwZeroInterestException error 日志记录（L149-158，调用方 L195/L339/L471 传入 reqUserNo），v1.1 标注的"PRD §7 利息值+操作人 vs 现实现仅票据号"需求-实现偏差已消除，删除过时偏差标注；M-2 全文件代码锚点行号对齐当前代码（submitCheckMixin.js 校验链+15~19行、HnnxMarketValidateUtil 零值方法区间更新、HnnxRebuyApplyServiceImpl 零值校验 L191-196、zh-CN.js warnTip L50），断言语义不变。v1.1（2026-09-01）评审回退局部修复：M-1 新增 TC-015 回购式转贴现（BT02）场景；M-2 TC-001 补充 §7 后端留痕日志断言并标注需求-实现偏差；M-3 贴现表名修正 TE_DISC_BILL→TE_CE_DISC_BILL（含批次表 TE_CE_DISC_BATCH 锚点）；轻微项 L-1/L-2/L-3/L-4/L-5/L-6。v1.2（2026-09-02）复用优先增量修订（零新增用例）：①确认对齐 PRD v3 补充/v3 补充2（2026-08-24）——参数码 hnnx.bill.zeroInterest.block 参数化由 TC-006（默认态 fail-closed）/TC-007（关闭放行 0/N/否）覆盖，卖出端字段更正 SaleBillDto.firstPayInterest 由 TC-003 断言锚点覆盖（HnnxMarketValidateUtil.java L88），均无缺口；②补 PRD §5.2 回购复用覆盖映射——质押式（BT02）/买断式（BT03）回购与转贴现（BT01）共用 rebuy/sale commitApply 提交入口（产品层按 busiType 分流，锚点：HnnxRebuyApplyServiceImpl.java L210/HnnxBankSaleApplyServiceImpl.java L467），BT03 零利息校验由 TC-001/TC-002（rebuy/sale 链路）+TC-015（回购式计息路径）联合覆盖，不另立用例；③与 hnnx-interest-zero-check.md（TC-MARKET-067 系列，v2-20260819）分工去重：本文件为 PRD v3 口径主文件（含参数开关/fail-closed/校验顺序），TC-MARKET-067 系列保留贴现 interest 链路细节、弹窗交互多轮验证、预删除跳过、null 处理等补充场景，两文件无冲突断言，执行时按"本文件优先、TC-MARKET-067 系列补充"顺序 |

## 用例统计

| 优先级 | 数量 | 用例编号区间 |
|--------|------|-------------|
| P0 | 6 | TC-MARKET-ZINT-001 ~ 006 |
| P1 | 6 | TC-MARKET-ZINT-007 ~ 011、015 |
| P2 | 3 | TC-MARKET-ZINT-012 ~ 014 |
| 合计 | 15 | - |

## 局部功能地图（需求涉及页面）

| 页面 | 路径 | 接入锚点 | interestField |
|------|------|---------|---------------|
| 转贴现买入（对话报价） | frontend/src/views/bizViews/banks/hnnxbank/be/market/quote/rebuy/quoteRebuyChange.vue | mixin引入 L141/L590、配置 L575-576、按钮loading L38、校验链 L1052-1053 | firstPayInterest |
| 转贴现卖出（对话报价） | frontend/src/views/bizViews/banks/hnnxbank/be/market/quote/sale/quoteSaleChange.vue | mixin引入 L145/L622、配置 L597-598、按钮loading L36、校验链 L1203-1204 | firstPayInterest |
| 再贴现卖出 | frontend/src/views/bizViews/banks/hnnxbank/be/market/rediscount/redSaleApplChange.vue | mixin引入 L132/L693、配置 L679-680、校验链 L1055-1056 | firstPayInterest |
| 贴现电票批量录入 | frontend/src/views/bizViews/banks/hnnxbank/ce/disc/elec/apply/eDiscApplyBatchAdd.vue | mixin引入 L381/L385、配置 L1135-1136、校验链 L2563-2566、票据来源覆盖 L2535-2559 | interest |

公共校验组件：`frontend/src/views/bizViews/banks/hnnxbank/components/submitCheckMixin.js`（零利息校验单点收口 + 防重复锁 + 中互金预检链）。

## 局部优先级矩阵

| 风险点 | 等级 | 说明 | 优先级 |
|--------|------|------|--------|
| 零息票提交后票交所成交但核心无法记账（账实不符） | 高 | 需求原始动因，核心资金风险 | P0 |
| 批次拦截策略（一张为0整批拦截） | 高 | 拦截粒度错误将导致漏网或过度拦截 | P0 |
| 弹窗交互与页面数据保持 | 高 | 数据丢失直接影响用户重试体验 | P0 |
| 开关默认态与关闭态（参数化配置） | 高 | 默认态错误=需求失效；关闭态错误=业务被误拦 | P1 |
| 暂存/草稿不触发 | 中 | 误触发将阻断正常暂存流程 | P1 |
| 贴现/再贴现链路接入 | 中 | 字段名差异（interest vs firstPayInterest）易出错 | P1 |
| 防重复提交锁 | 中 | 锁失效将重复发起提交 | P1 |
| eDisc 跨页校验边界（前端范围外依赖后端兜底） | 中 | A-4 已知边界，兜底失效=漏网 | P2 |
| 空利息误拦 | 低 | Number("")===0 陷阱 | P2 |
| 负数/零值校验顺序 | 低 | 顺序颠倒不影响拦截结果但影响提示准确性 | P2 |

## 测试方式判定依据（test-method-rules.json）

- RULE-01（代码审查）：内部逻辑/校验顺序/字符串判断逻辑类 → TC-013、TC-014
- RULE-09（Playwright）：UI 交互/按钮/弹窗/表单提交类 → TC-001~005、TC-007~011、TC-015
- RULE-08/RULE-09 组合 + 数据库查询前置（primary_first 策略）：涉及系统参数切换 → TC-006、TC-007、TC-012
- 多方式策略：multi_method_strategy.default_option = primary_first（主方式为主，其余补充验证）

---

## P0 用例

### TC-MARKET-ZINT-001 转贴现买入提交-单张票首期应付利息为0-弹窗提示整批拦截

| 字段 | 内容 |
|------|------|
| 用例名称 | 转贴现买入提交-单张票首期应付利息为0-弹窗提示整批拦截 |
| 优先级 | P0 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据（零息票买入批次） |
| 对应规则 | R-001、R-002、R-004、R-009（默认开） |
| 代码锚点 | HnnxMarketValidateUtil.java L45-69（validateZeroInterestForRebuy，firstPayInterest，compareTo(BigDecimal.ZERO)==0）；HnnxRebuyApplyServiceImpl.java L191-196（commitApply 内零值校验调用，L192 isZeroInterestIntercept + L193-195 throwZeroInterestException 传入 reqUserNo）；submitCheckMixin.js L120-142（validateZeroInterestBills）；quoteRebuyChange.vue L575-576（interestField=firstPayInterest） |

**前置条件**：
1. 法人管理员账号已登录 hnnxbank 环境（账号取 bemp-webapp-testing/config/test_config.json → banks.hnnxbank.login；登录遇强制登录弹窗直接点确认）
2. 系统参数 hnnx.bill.zeroInterest.block 处于默认开启态（TM_BUSINESS_PARAMETER 无该 PARAM_KEY 记录，或参数值为 1/是）
3. 已准备转贴现买入批次数据：含 1 张首期应付利息为 0.00 的票据（数据项 D1，见测试数据准备章节）与 1 张首期应付利息大于 0 的对照票据（数据项 D2）

**测试步骤**：
1. 进入【场内业务子系统】→【市场交易】→【对话报价申请】，新增转贴现买入申请
2. 在票据明细中加载 D1（零息票，首期结算利息列显示 0.00）与 D2（正常票）
3. 填写报价要素（交易对手、利率、结算方式等）
4. 点击"提交申请"按钮，同时通过网络监听观察是否发出 commitApply 请求

**预期结果**：
1. 弹出提示弹窗，文案精确为"票号{D1票据号}的应付利息为0"（锚点：zh-CN.js L50 warnTip="票号{0}的应付利息为0" + submitCheckMixin.js L134-135 replace("{0}", billNo)）
2. 弹窗仅有"确定"按钮（btnType: inform 告知态，锚点：submitCheckMixin.js L136-138）
3. 未发出 /banks/hnnxbank/be/market/quote/rebuyApply/commitApply 请求（前端拦截，校验链在 runSubmitCheck 内 return，锚点：submitCheckMixin.js L44-48）
4. 弹窗关闭后页面停留在申请编辑页，无跳转
5. D2 正常票不受影响，批次整体未被提交（批次状态仍为可编辑态）
6. 【§7 后端留痕断言-限后端路径触发】仅当请求到达后端触发校验时（本用例主流程为前端拦截不发请求、后端日志不产生；本断言在后端兜底场景执行，如 TC-003 步骤 4 直调 commitApply），服务端输出两类留痕日志：①WARN 日志内容含拦截动作、票据号与利息值："买入端票据[{票据号}]的首期应付利息为0（利息值:{利息值}），将拦截整批次提交"（锚点：HnnxMarketValidateUtil.java L64-65，logger.warn 双参数 billNo+firstPayInterest，票号经 CdRangeUtil 拼接子票区间）；②error 日志记录操作人与票据清单："检测到以下票据首期应付利息为0，整批次拦截提交，操作人:{操作人}，票据:{票号清单}"（锚点：HnnxMarketValidateUtil.java L149-158 throwZeroInterestException，opUserNo 由调用方传入——HnnxRebuyApplyServiceImpl.java L195 baseRequest.getReqUserNo()）。PRD §7 要求的"利息值+操作人"两项现实现均已覆盖（v1.1 标注的需求-实现偏差已消除，无需再走产品确认）

**数据准备**：D1、D2（见测试数据准备章节）
**清理 SQL**：按批次业务键删除 D1/D2 明细与批次记录，零残留断言 COUNT=0（模板见清理闭环契约）

---

### TC-MARKET-ZINT-002 转贴现卖出提交-单张票应付利息为0-弹窗提示整批拦截

| 字段 | 内容 |
|------|------|
| 用例名称 | 转贴现卖出提交-单张票应付利息为0-弹窗提示整批拦截 |
| 优先级 | P0 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据（零息票卖出批次） |
| 对应规则 | R-001（卖出端）、R-002、R-004 |
| 代码锚点 | HnnxMarketValidateUtil.java L79-103（validateZeroInterestForSale，SaleBillDto.firstPayInterest）；HnnxBankSaleApplyServiceImpl.java L391-392（commitApply）/L466（负数校验）/L467-472（零值校验调用）；quoteSaleChange.vue L597-598（interestField=firstPayInterest）、L36（:loading="preSubmitChecking"） |

**前置条件**：
1. 法人管理员账号已登录 hnnxbank 环境
2. 开关 hnnx.bill.zeroInterest.block 处于默认开启态
3. 已准备转贴现卖出批次数据：含 1 张应付利息为 0.00 的票据（数据项 D3a）

**测试步骤**：
1. 进入【场内业务子系统】→【市场交易】→【对话报价申请】，新增转贴现卖出申请
2. 票据明细加载 D3a（零息票）
3. 填写卖出报价要素
4. 点击"提交申请"按钮

**预期结果**：
1. 弹出提示弹窗，文案精确为"票号{D3a票据号}的应付利息为0"
2. 未发出 /banks/hnnxbank/be/market/quote/saleApply/commitApply 请求
3. 卖出端校验字段为 firstPayInterest 而非 interest（锚点：HnnxMarketValidateUtil.java L90 billDto.getFirstPayInterest()；PRD v3补充2 已修正字段名），断言以 firstPayInterest 命中拦截为准
4. 点击"确定"关闭弹窗后页面数据保持，可修正后重试

**数据准备**：D3a
**清理 SQL**：同卖出批次清理模板

---

### TC-MARKET-ZINT-003 转贴现买入提交-多张票利息为0-一次弹窗列出全部零息票号

| 字段 | 内容 |
|------|------|
| 用例名称 | 转贴现买入提交-多张票利息为0-一次弹窗列出全部零息票号 |
| 优先级 | P0 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据（多张零息票批次） |
| 对应规则 | R-002、R-008（一次抛出全部零息票号） |
| 代码锚点 | submitCheckMixin.js L132-135（zeroInterestBillNos.map(...).join("；")，一次弹窗全列）；HnnxMarketValidateUtil.java L149-158（throwZeroInterestException，L152 String.join(",", billNos) 一次抛出） |

**前置条件**：
1. 法人管理员账号已登录 hnnxbank 环境
2. 开关默认开启
3. 已准备买入批次含 2 张零息票（D1a、D1b，票号不同）与 1 张正常票（D2）

**测试步骤**：
1. 新增转贴现买入申请，明细加载 D1a、D1b、D2
2. 点击"提交申请"
3. 检查弹窗文案内容与弹窗数量
4. 【后端兜底补充验证】通过接口工具直接调用 commitApply（携带同批次报文，绕过前端），观察响应错误信息与服务端留痕日志；【直调替代路径】若无接口直调工具，可在开关显式关闭态（TC-007 配置 0）下通过页面提交使请求到达后端，替代本步骤完成后端兜底与留痕日志验证（开关关闭态下后端零值校验整体跳过：HnnxRebuyApplyServiceImpl.java L192 if 不成立，validateZeroInterestForRebuy 不执行、HnnxMarketValidateUtil.java L65 留痕日志不产生，本替代路径仅验证开关关闭放行；后端兜底拦截与留痕日志断言须在开关开启且请求到达后端时执行，仅能通过接口直调主路径完成）

**预期结果**：
1. 前端弹窗文案为"票号{D1a票号}的应付利息为0；票号{D1b票号}的应付利息为0"（多票号以中文分号"；"连接，锚点：submitCheckMixin.js L135 join("；")），且仅弹 1 次窗完整列出全部零息票号，无需多次提交逐个暴露
2. 弹窗不包含正常票 D2 的票号
3. 后端兜底验证（补充项）：commitApply 响应错误信息为"票号{D1a票号},{D1b票号}的应付利息为0"（后端多票号以英文逗号","拼接，锚点：HnnxMarketValidateUtil.java L152 String.join(",") + i18n hnnx_mt_zh_CN.properties L8），错误码 HNNX0BE320008；服务端输出两类留痕日志（TC-001 预期 6 的日志断言在此后端路径执行）：WARN 日志逐张记录票号+利息值（锚点：HnnxMarketValidateUtil.java L64-65，D1a/D1b 各一条）、error 日志记录操作人与逗号拼接票据清单"操作人:{reqUserNo}，票据:{D1a票号},{D1b票号}"（锚点：HnnxMarketValidateUtil.java L154，opUserNo 由调用方 HnnxRebuyApplyServiceImpl.java L195传入）

**数据准备**：D1a、D1b、D2
**清理 SQL**：同买入批次清理模板

---

### TC-MARKET-ZINT-004 转贴现买入提交-批次混合（正常票+零息票）-整批拦截

| 字段 | 内容 |
|------|------|
| 用例名称 | 转贴现买入提交-批次混合（正常票+零息票）-整批拦截 |
| 优先级 | P0 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据 |
| 对应规则 | R-002（批次下任意一张为0整批拦截） |
| 代码锚点 | HnnxRebuyApplyServiceImpl.java L191-196（整批校验入口）；HnnxMarketValidateUtil.java L50-68（逐张遍历整批，任意一张命中即收集并整批拦截） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 已准备批次：2 张正常票（D2a、D2b，利息大于0）+ 1 张零息票（D1c）

**测试步骤**：
1. 新增买入申请，明细加载 D2a、D2b、D1c
2. 点击"提交申请"
3. 观察弹窗与请求
4. 点击"确定"关闭弹窗，将 D1c 的利率修改为正常值使利息大于 0（或删除 D1c 仅留正常票）
5. 再次点击"提交申请"

**预期结果**：
1. 第 2 步后整批拦截：弹窗仅列 D1c 票号，commitApply 未发出，D2a/D2b 不随批次提交
2. 关闭弹窗后页面数据保持（R-005）
3. 第 5 步修正后提交成功（批次内已无零息票），commitApply 正常发出且返回成功——验证拦截为动态校验而非一次失效
4. 批次提交成功后批次状态进入提交后状态（待复核/待审批，以实际流转为准）

**数据准备**：D2a、D2b、D1c
**清理 SQL**：同买入批次清理模板

---

### TC-MARKET-ZINT-005 弹窗交互-仅确定按钮/文案不自动消失/关闭后页面数据保持

| 字段 | 内容 |
|------|------|
| 用例名称 | 弹窗交互-仅确定按钮/文案不自动消失/关闭后页面数据保持 |
| 优先级 | P0 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据 |
| 对应规则 | R-005（页面数据不丢失）、PRD 已确认问题#2（弹窗仅"确定"按钮） |
| 代码锚点 | submitCheckMixin.js L136-139（$msgTip.warn，btnType:"inform" 告知态仅确定按钮，不传 duration/autoHide 防止一闪而过） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 买入批次含零息票 D1（同 TC-001）

**测试步骤**：
1. 录入批次完整信息（记录已填写的交易对手、利率、备注等要素值）
2. 点击"提交申请"触发弹窗
3. 等待 10 秒，观察弹窗是否自动消失
4. 检查弹窗按钮构成
5. 点击"确定"关闭弹窗
6. 逐项核对页面表单要素与票据明细数据

**预期结果**：
1. 弹窗停留 10 秒以上不自动消失（须用户点击关闭）
2. 弹窗仅含"确定"按钮，无"取消"按钮与右上角 X 关闭图标（btnType: inform 告知态）
3. 点击"确定"后弹窗关闭
4. 关闭后表单所有已填写要素值与步骤 1 记录值完全一致，票据明细行数与内容无变化（数据不丢失）
5. 页面可直接再次点击"提交申请"重试（校验链锁已释放，锚点：submitCheckMixin.js L46 preSubmitChecking=false）

**数据准备**：D1
**清理 SQL**：同买入批次清理模板

---

### TC-MARKET-ZINT-006 开关默认态（参数未配置）-零息票提交仍被拦截（fail-closed 默认开启）

| 字段 | 内容 |
|------|------|
| 用例名称 | 开关默认态（参数未配置）-零息票提交仍被拦截（fail-closed 默认开启） |
| 优先级 | P0 |
| 测试方式 | Playwright 页面测试（主）+ 数据库查询（前置核对）（primary_first，RULE-09 + RULE-06） |
| 跨模块标注 | 需专项数据 + 需跨模块操作（数据库核对参数态） |
| 对应规则 | R-009（默认开启，禁止提交） |
| 代码锚点 | HnnxMarketValidateUtil.java L171（getParamValue 默认值 "1"）/L173（仅显式 0/N/否 关闭）/L174-177（异常 fail-closed 返回 true）；submitCheckMixin.js L90-95（空值/未配置按开启处理） |

**前置条件**：
1. 法人管理员账号已登录
2. 数据库核对：TM_BUSINESS_PARAMETER 中不存在 PARAM_KEY='hnnx.bill.zeroInterest.block' 的记录（或值不为 0/N/否）
3. 买入批次含零息票 D1

**测试步骤**：
1. 通过 Oracle MCP 执行参数查询 SQL（见数据准备章节 D6-查询），确认默认开启态
2. 新增买入申请加载 D1，点击"提交申请"

**预期结果**：
1. 参数未配置时拦截生效：弹出"票号{D1票据号}的应付利息为0"，提交被阻断（前端 L90-95 空值收敛到校验分支；后端 L171 默认值 "1"）
2. 与 TC-001 行为一致，证明默认态无需任何配置即拦截
3. 【代码审查辅助断言】后端参数服务异常时（getParamValue 抛异常）按开启处理：HnnxMarketValidateUtil.java L174-177 catch 返回 true（fail-closed），日志记录"零利息拦截开关读取异常"

**数据准备**：D1；D6 默认态核对 SQL
**清理 SQL**：开关复位动作 = 确保 TM_BUSINESS_PARAMETER 无该参数记录或值为开启值；零残留断言见清理闭环契约

---

## P1 用例

### TC-MARKET-ZINT-007 开关显式关闭（0/N/否）-零息票放行提交成功

| 字段 | 内容 |
|------|------|
| 用例名称 | 开关显式关闭（0/N/否）-零息票放行提交成功 |
| 优先级 | P1 |
| 测试方式 | Playwright 页面测试（主）+ 数据库查询（参数配置前置）（primary_first，RULE-09 + RULE-06） |
| 跨模块标注 | 需专项数据 + 需跨模块操作（系统参数维护） |
| 对应规则 | R-009（修改为关闭后允许提交） |
| 代码锚点 | HnnxMarketValidateUtil.java L172-173（显式 "0"/"N"(忽略大小写)/"否" 关闭）；submitCheckMixin.js L92-95（flag==="0" || 大写"N" || "否" → resolve(true) 跳过零值校验） |

**前置条件**：
1. 法人管理员账号已登录
2. 通过系统管理-业务参数维护（或 SQL）将 hnnx.bill.zeroInterest.block 配置为 0（法人级）
3. 买入批次含零息票 D1
4. 测试环境关注名单库无该批次票据命中数据（开关关闭后提交将放行至中互金反洗钱预检链，锚点：HnnxRebuyApplyServiceImpl.java L214-218；若批次票据命中黑名单会被反洗钱校验阻断，干扰"放行提交成功"断言）

**测试步骤**：
1. 配置开关值为 0，通过数据库查询确认落库
2. 新增买入申请加载 D1，点击"提交申请"
3. 观察弹窗与请求
4. 依次将开关值改为 N、否，重复步骤 2-3（数据驱动）

**预期结果**：
1. 开关为 0 时：不弹出零利息提示弹窗，前端校验链跳过零值校验后继续执行中互金预检，预检通过后发出 commitApply
2. 后端 isZeroInterestIntercept 读取到 0 跳过零值校验（锚点 L173），commitApply 返回成功，批次提交成功
3. 开关为 N 与 否 时行为与 0 完全一致（前端大小写不敏感比较 flag.toUpperCase()==="N"，锚点 L92；后端 "N".equalsIgnoreCase(flag)，锚点 L173）
4. 三种值下提交均成功，零息票进入提交后状态

**数据准备**：D1；D6 关闭态配置 SQL（0/N/否 三轮）
**清理 SQL**：开关复位（删除参数记录或恢复默认）+ 批次数据清理，零残留断言见清理闭环契约

---

### TC-MARKET-ZINT-008 暂存/保存草稿不触发零利息校验

| 字段 | 内容 |
|------|------|
| 用例名称 | 暂存/保存草稿不触发零利息校验 |
| 优先级 | P1 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据 |
| 对应规则 | R-003（仅提交申请触发，暂存/草稿不触发） |
| 代码锚点 | 全库 Grep 锚定：isZeroInterestIntercept/validateZeroInterest* 调用仅存在于 4 个提交方法（HnnxRebuyApplyServiceImpl L192、HnnxBankSaleApplyServiceImpl L336/L468、HnnxBankRediscountSaleApplyServiceImpl L221、HnnxBankDiscBillServiceImpl L343），暂存/草稿链路无该校验调用；前端校验链仅绑定提交按钮 runSubmitCheck（quoteRebuyChange.vue L1052-1053 等 4 处） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 买入批次含零息票 D1

**测试步骤**：
1. 新增买入申请，加载 D1，填写报价要素
2. 点击"保存草稿/暂存"按钮（非提交）
3. 观察弹窗与网络请求
4. 从草稿列表重新打开该批次，点击"提交申请"

**预期结果**：
1. 暂存操作成功：无零利息弹窗，暂存请求正常返回，批次保存为草稿/暂存态
2. 暂存请求报文中不含零利息校验阻断（后端暂存链路无 isZeroInterestIntercept 调用）
3. 第 4 步提交该草稿时触发拦截：弹出"票号{D1票据号}的应付利息为0"，提交被阻断（提交链路校验正常生效，形成正向闭环）

**数据准备**：D1
**清理 SQL**：同买入批次清理模板（含草稿态批次）

---

### TC-MARKET-ZINT-009 贴现提交-贴现利息(interest)为0-弹窗拦截（多票汇总）

| 字段 | 内容 |
|------|------|
| 用例名称 | 贴现提交-贴现利息(interest)为0-弹窗拦截（多票汇总） |
| 优先级 | P1 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据（贴现零息票） |
| 对应规则 | R-007（场外贴现适用）、R-008（校验逻辑统一） |
| 代码锚点 | HnnxBankDiscBillServiceImpl.java L220（submitElecFlow）/L343（读开关）/L370-377（循环收集 discBill.getInterest() compareTo ZERO==0）/L443-447（循环后汇总抛出）；eDiscApplyBatchAdd.vue L1135-1136（interestField="interest"）、L2563-2566（校验链） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 已准备贴现申请数据：含 2 张贴现利息为 0.00 的电票（D5a、D5b）

**测试步骤**：
1. 进入【场外业务子系统】→【贴现申请】→ 电票批量录入（eDiscApplyBatchAdd）
2. 加载 D5a、D5b 明细，填写贴现申请要素
3. 点击"提交申请"
4. 检查弹窗文案
5. 【后端兜底补充验证】直接调用贴现提交接口（submitElecFlow 对应入口），观察响应错误信息

**预期结果**：
1. 弹出零利息弹窗，文案为"票号{D5a票号}的应付利息为0；票号{D5b票号}的应付利息为0"（前端 join("；")）
2. 贴现链路校验字段为 interest（非 firstPayInterest），零息票按 interest=0 命中（eDiscApplyBatchAdd.vue L1136 与后端 L373 字段口径一致）
3. 后端兜底验证（补充项）：submitElecFlow 响应错误文案"票号{D5a票号},{D5b票号}的应付利息为0"（循环内仅收集不抛出，循环后 L447 一次汇总抛出，多票逗号拼接）
4. 提交被阻断，贴现申请未进入流程

**数据准备**：D5a、D5b
**清理 SQL**：按贴现申请业务键清理（表 TE_CE_DISC_BILL，锚点 DiscBillDao.xml L282/L352 insert into TE_CE_DISC_BILL；落库前仍须 describe 核对列清单），零残留断言见清理闭环契约

---

### TC-MARKET-ZINT-010 再贴现卖出提交-首期应付利息为0-弹窗拦截

| 字段 | 内容 |
|------|------|
| 用例名称 | 再贴现卖出提交-首期应付利息为0-弹窗拦截 |
| 优先级 | P1 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据（再贴现零息票） |
| 对应规则 | R-007（再贴现适用）、R-008 |
| 代码锚点 | HnnxBankRediscountSaleApplyServiceImpl.java L215（commitRediscApply 重写父类）/L221-223（isZeroInterestIntercept + validateZeroInterestForRedisc）；HnnxMarketValidateUtil.java L113-137（RediscSaleBillDto.firstPayInterest）；redSaleApplChange.vue L679-680（interestField=firstPayInterest） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 已准备再贴现卖出批次：含 1 张首期应付利息为 0.00 的票据（D4）

**测试步骤**：
1. 进入再贴现卖出申请页面（redSaleApplChange 对应菜单）
2. 加载 D4 明细，填写再贴现申请要素
3. 点击"提交申请"

**预期结果**：
1. 弹出"票号{D4票据号}的应付利息为0"，提交被阻断
2. 未发出 commitRediscApply 成功请求（前端拦截于校验链）
3. 后端兜底（补充验证）：直接调用 commitRediscApply，响应错误码 HNNX0BE320008，文案"票号{D4票据号}的应付利息为0"

**数据准备**：D4
**清理 SQL**：按再贴现批次业务键清理（TE_REDISC_SALE_BILL，锚点 HnnxbankSaleBillDaoExt.xml L54），零残留断言见清理闭环契约

---

### TC-MARKET-ZINT-011 防重复提交锁-校验链执行期连点提交按钮仅触发一次校验

| 字段 | 内容 |
|------|------|
| 用例名称 | 防重复提交锁-校验链执行期连点提交按钮仅触发一次校验 |
| 优先级 | P1 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 独立可执行（复用 TC-001 数据即可） |
| 对应规则 | 用户体验与防重复提交（mixin 收口说明#1） |
| 代码锚点 | submitCheckMixin.js L27（preSubmitChecking 锁定义）/L39-43（执行期重复调用直接 return）/L46/L51（链完成解锁）；quoteRebuyChange.vue L38（:loading="preSubmitChecking"） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 买入批次含零息票 D1（同 TC-001）

**测试步骤**：
1. 新增买入申请加载 D1，填写要素
2. 点击"提交申请"后立即（校验链读参期间）再次快速点击"提交申请"2 次
3. 通过网络监听统计 getBusinessParameter 读参请求次数与弹窗数量
4. 观察提交按钮 loading 态

**预期结果**：
1. 校验链执行期间重复点击被锁拦截（L40-42 return），零利息弹窗仅弹出 1 次
2. 零利息开关读参请求（/sm/auth/businessParamete/getBusinessParameter）在本次提交操作中仅发出 1 次，且请求体 paramKey=hnnx.bill.zeroInterest.block 的请求仅 1 次（按请求体参数精确匹配，排除同接口其他参数键读参请求干扰）
3. 提交按钮在读参+校验期间呈 loading 加载态（:loading="preSubmitChecking"），弹窗确认后恢复可点击
4. 弹窗关闭后锁已释放，可立即再次点击提交触发重试

**数据准备**：D1
**清理 SQL**：同买入批次清理模板

---

### TC-MARKET-ZINT-015 回购式转贴现买入提交（busiType=BT02）-首期应付利息为0-弹窗拦截

| 字段 | 内容 |
|------|------|
| 用例名称 | 回购式转贴现买入提交（busiType=BT02）-首期应付利息为0-弹窗拦截 |
| 优先级 | P1 |
| 测试方式 | Playwright 页面测试（RULE-09，置信度 high） |
| 跨模块标注 | 需专项数据（回购式零息票 D1e） |
| 对应规则 | R-004（回购式转贴现场景覆盖）、R-001、R-002 |
| 代码锚点 | HnnxRebuyApplyServiceImpl.java L191-196（commitApply 统一入口：L191 注释"9-0、校验首期应付利息不能为0"，L192 isZeroInterestIntercept + L193-195 throwZeroInterestException，入口内无 busiType 分支，BT01/BT02/BT03 复用同一校验链，PRD §5.2）；quoteManager.vue L91（BT02=质押式回购菜单入口）；quoteRebuyChange.vue L701（bt==='BT02' 复用同一报价编辑页）；HnnxMarketValidateUtil.java L56/L58（firstPayInterest 判零字段） |

**前置条件**：
1. 法人管理员账号已登录 hnnxbank 环境（账号取 bemp-webapp-testing/config/test_config.json → banks.hnnxbank.login）
2. 系统参数 hnnx.bill.zeroInterest.block 处于默认开启态（TM_BUSINESS_PARAMETER 无该 PARAM_KEY 记录，或参数值为 1/是）
3. 已准备回购式转贴现买入批次：含 1 张首期应付利息为 0.00 的票据（数据项 D1e，回购式计息路径含首期+到期两期利息，仅首期置 0，到期利息正常构造）与 1 张首期应付利息大于 0 的对照票据（数据项 D2）

**测试步骤**：
1. 进入【场内业务子系统】→【市场交易】→【对话报价申请】，选择"质押式回购"（BT02）新增买入申请（进入 quoteRebuyChange 同一报价编辑页）
2. 票据明细加载 D1e（零息票，首期结算利息列显示 0.00）与 D2（正常票）
3. 填写回购式报价要素（回购日、回购利率、结算方式等）
4. 点击"提交申请"按钮，同时通过网络监听观察是否发出 commitApply 请求

**预期结果**：
1. 弹出提示弹窗，文案精确为"票号{D1e票据号}的应付利息为0"（与 TC-001 共用同一校验链：前端 submitCheckMixin.js validateZeroInterestBills + 后端 HnnxRebuyApplyServiceImpl L191-196 统一入口，BT02 不分叉，PRD §5.2 BT01/BT02/BT03 复用 commitApply 入口）
2. 未发出 /banks/hnnxbank/be/market/quote/rebuyApply/commitApply 请求（前端拦截于 runSubmitCheck 校验链）
3. 弹窗仅有"确定"按钮（btnType: inform），关闭后页面数据保持，D2 正常票不受影响，批次整体未被提交
4. 回购式计息路径（首期+到期两期利息）下，仅首期应付利息为 0 即触发拦截（校验字段=firstPayInterest，到期利息不参与本需求判零，锚点：HnnxMarketValidateUtil.java L56/L58），证明回购式场景无校验链旁路

**数据准备**：D1e、D2
**清理 SQL**：同买入批次清理模板

---

## P2 用例

### TC-MARKET-ZINT-012 eDisc batch 跨页零息票-前端范围外放行-后端 commit 兜底拦截（A-4 已知边界）

| 字段 | 内容 |
|------|------|
| 用例名称 | eDisc batch 跨页零息票-前端范围外放行-后端 commit 兜底拦截 |
| 优先级 | P2 |
| 测试方式 | Playwright 页面测试（主）+ 运行时断言（后端响应观察）（primary_first，RULE-09） |
| 跨模块标注 | 需专项数据（多页贴现批次，零息票跨页放置） |
| 对应规则 | R-008（后端兜底统一拦截）；A-4 已知边界（前端校验范围=勾选+当前页） |
| 代码锚点 | eDiscApplyBatchAdd.vue L2535-2559（collectSubmitBills 覆盖 getSubmitCheckBills，校验范围=datagrid.tData 当前页 + 勾选集合并）；HnnxBankDiscBillServiceImpl.java L347（循环 discBills 整批）/L373-377/L447（后端整批收集汇总抛出） |

**前置条件**：
1. 法人管理员账号已登录
2. 开关默认开启
3. 已准备贴现电票批次：共 3 页明细（每页 10 条），第 2 页含 1 张贴现利息为 0.00 的票据（D5c），D5c 不在勾选集内

**测试步骤**：
1. 打开 eDiscApplyBatchAdd 批量录入页，加载 3 页明细
2. 勾选第 1 页全部票据（不包含第 2 页 D5c），停留在第 1 页
3. 点击"提交申请"
4. 观察前端是否弹出零利息弹窗、是否发出提交请求
5. 观察提交请求的响应结果

**预期结果**：
1. 前端校验范围（勾选+当前页）内无零息票，不弹零利息弹窗，提交请求正常发出（A-4 边界行为：前端不拦截范围外票据）
2. 后端兜底拦截生效：提交响应返回错误，错误码 HNNX0BE320008，错误文案"票号{D5c票号}的应付利息为0"（后端按整批 discBills 校验，锚点 L347/L447）
3. 批次未提交成功，页面展示后端返回的错误提示，数据不丢失
4. 该用例证明"前端范围外零息票不会漏网至票交所"，兜底链路闭环

**数据准备**：3 页批次数据 + D5c
**清理 SQL**：按贴现批次业务键清理（表 TE_CE_DISC_BILL，锚点 DiscBillDao.xml L282/L352；批次表 TE_CE_DISC_BATCH 锚点 DiscBatchDao.xml L292/L370，describe 核对后定稿），零残留断言见清理闭环契约

---

### TC-MARKET-ZINT-013 空字符串/空白利息不误拦-空利息按现有流程处理

| 字段 | 内容 |
|------|------|
| 用例名称 | 空字符串/空白利息不误拦-空利息按现有流程处理 |
| 优先级 | P2 |
| 测试方式 | 代码审查（RULE-01，置信度 high；可选运行时补充） |
| 跨模块标注 | 独立可执行（源代码已拉取到本地工作区） |
| 对应规则 | PRD 异常情况表（利息计算未完成/字段为空按现有流程处理，不增加额外前置校验） |
| 代码锚点 | submitCheckMixin.js L127-128（注释明确 Number("")===0 与 Number(" ")===0 陷阱，用 trim 判断排除空串与纯空白串；空利息按 PRD 走现有流程不拦截）；L128 条件表达式 |

**前置条件**：
1. 源代码已拉取到本地工作区
2. 目标文件：frontend/src/views/bizViews/banks/hnnxbank/components/submitCheckMixin.js

**测试步骤**：
1. Read submitCheckMixin.js L120-131（validateZeroInterestBills 循环体）
2. 核对判零条件表达式：`interest !== null && interest !== undefined && String(interest).trim() !== "" && Number(interest) === 0`
3. 构造 4 组边界值做逻辑推演：""（空串）、"  "（空白串）、null、undefined、"0.00"
4. 【运行时补充，可选】SQL 构造 interest 为空串的票据（D5d，Oracle 空串落库即 NULL，落库形态以 IS NULL 复核为准）后页面提交，观察是否误拦

**预期结果**：
1. 条件表达式包含 trim 空串排除分支（锚点 L128 逐字一致）
2. 逻辑推演结果：空串""→trim 后为""，条件不成立，不进入 zeroInterestBillNos（不误拦）；空白串"  "→同上；null/undefined→前两个分支排除；"0.00"→Number("0.00")===0 成立，命中拦截
3. 运行时补充（若执行）：空利息票据（空串落库为 NULL 与前端取值为空两种口径）提交均不弹零利息弹窗，走现有利息未计算校验流程（后端 HnnxMarketValidateUtil.java L57-58 null 视为未计算不在此校验，由 DiscConstants 计息标志等现有校验处理）

**数据准备**：无（代码审查）；运行时补充需 D5d（interest 空串票据）
**清理 SQL**：运行时补充执行时按贴现业务键清理

---

### TC-MARKET-ZINT-014 校验顺序-同批含负数利息票与零息票-先报负数后零值

| 字段 | 内容 |
|------|------|
| 用例名称 | 校验顺序-同批含负数利息票与零息票-先报负数后零值 |
| 优先级 | P2 |
| 测试方式 | 代码审查（RULE-01，置信度 high） |
| 跨模块标注 | 独立可执行 |
| 对应规则 | §4.2 金额规则（校验顺序：先校验负数，再校验零值）；R-006（独立校验步骤互不干扰） |
| 代码锚点 | HnnxRebuyApplyServiceImpl.java L189-190（注释"9、校验结算金额和利息不能为负数"+ RebuyValidateUtil.validateSettleAmtAndInterest）→ L191-196（注释"9-0、校验首期应付利息不能为0…先负数后零值"+ 零值校验）；HnnxBankSaleApplyServiceImpl.java L466（validateSettleAmtAndInterest）→ L467-472（零值校验，注释"9-1-1…先负数后零值"） |

**前置条件**：
1. 源代码已拉取到本地工作区
2. 目标文件：HnnxRebuyApplyServiceImpl.java、HnnxBankSaleApplyServiceImpl.java

**测试步骤**：
1. Read HnnxRebuyApplyServiceImpl.java L186-196，确认 commitApply 内负数校验（L190）在零值校验（L192-196）之前
2. Read HnnxBankSaleApplyServiceImpl.java L464-472，确认同构顺序（L466 负数 → L468-472 零值）
3. 推演同批含负数利息票与零息票时的报错顺序

**预期结果**：
1. 买入端与卖出端代码分支排列均为"先负数校验（validateSettleAmtAndInterest）后零值校验（isZeroInterestIntercept + throwZeroInterestException）"，锚点行号一致
2. 逻辑推演：负数利息票命中负数校验先行抛出负数类错误（票交所报错前拦截），零值校验因异常中断不再执行——负数错误优先于零值错误展示
3. 零值校验为独立步骤（注释 9-0/9-1-1 独立编号），不内嵌于负数校验方法，满足 R-006 互不干扰
4. 贴现链路同构佐证：HnnxBankDiscBillServiceImpl.java L367-377（计息标志校验先行首张即抛 → 零值循环收集）→ L443-447（汇总抛出），注释 L446 明确"先到先拦的优先级不变"

**数据准备**：无（代码审查）
**清理 SQL**：无

---

## 测试数据准备

### 应用读取表声明（test-data-check.json → app-read-table-declaration）

| 数据域 | 应用读取表 | 表名锚点（mapper Base_Column_List/SQL 引用出处） | 与源侧参照表区分 |
|--------|-----------|---------------------------------------------|-----------------|
| 转贴现买入明细 | TE_REBUY_BILL | banks/ext-hnnxbank/.../dao/mature/ext/HnnxbankSaleBillDaoExt.xml L38（from TE_REBUY_BILL） | 非票交所源侧表 |
| 转贴现卖出明细 | TE_SALE_BILL | 同上 L46（from TE_SALE_BILL） | 非票交所源侧表 |
| 再贴现卖出明细 | TE_REDISC_SALE_BILL | 同上 L54（from TE_REDISC_SALE_BILL） | 非票交所源侧表 |
| 业务参数 | TM_BUSINESS_PARAMETER | banks/ext-nmgbank/.../sm/dao/businessparameter/ext/ExtBusinessParameterDao.xml L5（UPDATE TM_BUSINESS_PARAMETER） | 非缓存表，为参数实际存储表 |
| 贴现明细 | TE_CE_DISC_BILL | served/ce/disc-as/.../ce/disc/dao/DiscBillDao.xml L282（insert）/L352（insertSelective） | 批次表 TE_CE_DISC_BATCH（DiscBatchDao.xml L292/L370）；均非票交所源侧表 |

> 产品级 mapper 的 Base_Column_List 完整列清单需在数据准备执行阶段以 Oracle MCP `describe_table` 输出为准（test-data-check.json → data-sql-schema-verify：INSERT 列清单与 describe 输出逐列比对一致、主键取值方式声明后，方可生成落库 SQL）。本节 SQL 均为**模板**，禁止未经 describe 核对直接落库。

### 数据清单

| 数据项 | 内容 | 构造方式 | 用途 |
|--------|------|---------|------|
| D1（D1a/D1b/D1c） | 转贴现买入零息票：FIRST_PAY_INTEREST=0.00 | 优先 UI：对话报价买入录入贴现利率 0.00 由系统计息为 0；若利率 0 被前置校验拦截（测试假设：贴现利率允许录入 0，待执行确认），降级 SQL 直插（describe 核对后）。统一使用整票（无子票区间）构造，固化弹窗与日志文案断言口径为纯票号（无子票区间后缀，子票区间拼接逻辑 CdRangeUtil 不触发） | TC-001/003/004/005/006/007/008/011 |
| D1e | 回购式转贴现买入零息票：FIRST_PAY_INTEREST=0.00（回购式计息路径含首期+到期两期利息，仅首期置 0，到期利息字段正常构造，不参与本需求判零） | 同 D1 方式（整票无子票区间），busiType=BT02 质押式回购入口 | TC-015 |
| D2（D2a/D2b） | 转贴现买入正常票对照：FIRST_PAY_INTEREST>0（如 12000.00） | UI 正常录入（利率>0） | TC-001/003/004/015 |
| D3a | 转贴现卖出零息票：FIRST_PAY_INTEREST=0.00 | 同 D1 方式，卖出端 | TC-002 |
| D4 | 再贴现卖出零息票：FIRST_PAY_INTEREST=0.00 | UI 构造或 SQL 直插（TE_REDISC_SALE_BILL） | TC-010 |
| D5a/D5b | 贴现零息票：INTEREST=0.00 | UI 构造或 SQL 直插（TE_CE_DISC_BILL，锚点 DiscBillDao.xml L282/L352） | TC-009 |
| D5c | 贴现零息票（第 2 页） | 同 D5，批次 3 页结构 | TC-012 |
| D5d | 贴现空利息票：INTEREST=''（Oracle 空串落库即 NULL，插入后以 WHERE INTEREST IS NULL 复核确认落库形态；空串与 NULL 两种口径验证目标一致——"空利息不误拦"） | SQL 直插（UI 无法构造，表 TE_CE_DISC_BILL） | TC-013 运行时补充 |
| D6 | 系统参数 hnnx.bill.zeroInterest.block | 开关 SQL（见下） | TC-006/007 |

### 开关参数 SQL 模板（D6，执行前必须 describe 核对 TM_BUSINESS_PARAMETER 列清单）

```sql
-- 查询当前开关态（默认开启 = 无记录 或 PARAM_VALUE 为 1/是）
SELECT * FROM TM_BUSINESS_PARAMETER
 WHERE PARAM_KEY = 'hnnx.bill.zeroInterest.block';

-- 配置关闭态（列名以 describe 核对为准；法人级参数需带法人机构号 LEGAL_NO）
INSERT INTO TM_BUSINESS_PARAMETER (ID, LEGAL_NO, PARAM_KEY, PARAM_VALUE)
VALUES ({SEQ_OR_ID}, '{REQ_LEGAL_NO}', 'hnnx.bill.zeroInterest.block', '0');
-- 等效关闭值轮换：'0' → 'N' → '否'（TC-007 数据驱动三轮）

-- 开关复位（测试后恢复默认开启态：删除配置记录）
DELETE FROM TM_BUSINESS_PARAMETER
 WHERE PARAM_KEY = 'hnnx.bill.zeroInterest.block'
   AND LEGAL_NO = '{REQ_LEGAL_NO}';
```

### 明细数据 SQL 模板（describe 核对后定稿，以下为骨架）

```sql
-- 零息票直插骨架（列清单与主键取值方式以 describe_table 输出为准，禁止直接执行）
INSERT INTO TE_REBUY_BILL ({Base_Column_List 核对后的列清单})
VALUES ({ID 主键取值方式声明}, '{批次ID}', 'ZINT{SEQ}', ..., 0.00, ...);

-- 正常票对照（FIRST_PAY_INTEREST = 12000.00）
INSERT INTO TE_REBUY_BILL ({...}) VALUES ({...}, 12000.00, ...);
```

### 清理闭环契约（test-data-check.json → cleanup-closure-contract）

凡含写库/改配置步骤的用例（TC-006/007/012/013 及 SQL 直插路径）必须执行以下闭环：

```sql
-- 1. 按业务键精确删除测试批次数据（BATCH_ID/BILL_NO 列名以 describe 核对为准）
DELETE FROM TE_REBUY_BILL       WHERE BATCH_ID IN (SELECT ID FROM TE_REBUY_BATCH WHERE BATCH_NO LIKE 'ZINT%');
DELETE FROM TE_REBUY_BATCH      WHERE BATCH_NO LIKE 'ZINT%';
DELETE FROM TE_SALE_BILL        WHERE BATCH_ID IN (SELECT ID FROM TE_SALE_BATCH WHERE BATCH_NO LIKE 'ZINT%');
DELETE FROM TE_SALE_BATCH       WHERE BATCH_NO LIKE 'ZINT%';
DELETE FROM TE_REDISC_SALE_BILL WHERE BATCH_ID IN (SELECT ID FROM TE_REDISC_SALE_BATCH WHERE BATCH_NO LIKE 'ZINT%');
DELETE FROM TE_REDISC_SALE_BATCH WHERE BATCH_NO LIKE 'ZINT%';
DELETE FROM TE_CE_DISC_BILL   WHERE {贴现业务键} LIKE 'ZINT%';  -- 表名锚点 DiscBillDao.xml L282/L352，键名 describe 核对后定稿

-- 2. 开关/配置复位动作
DELETE FROM TM_BUSINESS_PARAMETER
 WHERE PARAM_KEY = 'hnnx.bill.zeroInterest.block'
   AND LEGAL_NO = '{REQ_LEGAL_NO}';

-- 3. 零残留复核断言（全部必须返回 0）
SELECT COUNT(*) AS CNT_REBUY_BILL  FROM TE_REBUY_BILL  WHERE BILL_NO LIKE 'ZINT%';
SELECT COUNT(*) AS CNT_SALE_BILL   FROM TE_SALE_BILL   WHERE BILL_NO LIKE 'ZINT%';
SELECT COUNT(*) AS CNT_REDISC_BILL FROM TE_REDISC_SALE_BILL WHERE BILL_NO LIKE 'ZINT%';
SELECT COUNT(*) AS CNT_PARAM       FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY = 'hnnx.bill.zeroInterest.block';
```

> UI 构造路径产生的批次（未直插库）清理优先通过页面删除操作完成，SQL 清理仅兜底直插数据；删除后执行零残留断言确认 CNT=0。

---

## 用例自校验结果

- 统计一致性：通过（P0=6、P1=6、P2=3，合计 15 条，与用例统计表一一对应；编号 TC-MARKET-ZINT-001~015 连续无跳号，与 test-index.json 已有 TC-MARKET-001/002/003/067、TC-DISCOUNT-001/010 无冲突）
- 预期结果确定性：通过（文案断言逐字锚定 zh-CN.js L50 / hnnx_mt_zh_CN.properties L8；弹窗按钮态锚定 mixin L136-138；接口路径断言取自 PRD §5.2 与代码；"利率 0 可录入"与"批次提交后状态"两处标测试假设/以实际流转为准；§7 日志断言按 v1.3 修订后现实现口径执行——WARN 含票号+利息值、error 含操作人+票据清单，原"需求-实现偏差"已消除）
- 编号规范性：通过（TC-MARKET-ZINT-{三位数字}，前缀符合 testcase-prefix-coordination.json 格式 TC-{MODULE}-{REQUIREMENT}-{SEQ}，REQUIREMENT=ZINT 取自需求关键词 Zero INTerest；TC-015 编号承接 014 顺延，无冲突）
- 前置条件完整性：通过（均含登录角色【法人管理员】与数据准备要求，登录规范引用 test_config.json，未使用"已登录系统"简略描述；TC-007 补充名单库无命中数据前置）
- 跨模块可执行性预标注：通过（逐条标注：需专项数据 TC-001~005/008~010/012/015；需专项数据+跨模块操作 TC-006/007；独立可执行 TC-011/013/014）
- 单一职责：通过（每条用例仅验证一个测试点；TC-003 后端兜底与 TC-010/012 的兜底验证均标注为补充验证项，主断言单一；TC-015 主断言单一聚焦回购式场景校验链共用性）
- 自校验结论：可执行（v1.3 评审修订完成：M-1 留痕日志断言对齐现实现含利息值+操作人、过时偏差标注已删除；M-2 全文件锚点行号经 test-lead-reviewer 对照当前代码逐处核准——submitCheckMixin.js L120-142/L127-128/L132-139、HnnxMarketValidateUtil.java L45-69/L79-103/L113-137/L149-158/L171-177、HnnxRebuyApplyServiceImpl.java L189-196、zh-CN.js L50 均与实现一致；v1.1 的 M-1/M-2/M-3 修复点已复核通过）

## test-data-check 三项自检结果

| 检查项 | 结果 | 说明 |
|--------|------|------|
| data-sql-schema-verify（落库前表结构核对） | 通过（流程内建） | 所有 INSERT/UPDATE SQL 均标注为模板并强制"落库前 Oracle MCP describe 核对列清单/列数/主键取值方式"；贴现表名已按 mapper 锚点定稿为 TE_CE_DISC_BILL（DiscBillDao.xml L282/L352），批次表 TE_CE_DISC_BATCH（DiscBatchDao.xml L292/L370） |
| app-read-table-declaration（应用读取表声明） | 通过 | 文档头部声明 5 张应用读取表，表名锚点给出 mapper XML 文件:行号（HnnxbankSaleBillDaoExt.xml L38/L46/L54、ExtBusinessParameterDao.xml L5、DiscBillDao.xml L282/L352），与源侧参照表显式区分 |
| cleanup-closure-contract（清理闭环契约） | 通过 | 清理 SQL 按业务键（ZINT% 前缀）精确定位；开关复位动作明确（删除参数记录恢复默认开启态）；零残留复核断言 4 条 CNT=0 |
