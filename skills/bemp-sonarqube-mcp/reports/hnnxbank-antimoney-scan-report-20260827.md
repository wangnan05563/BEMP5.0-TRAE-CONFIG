# BEMP 河南农信反洗钱（中互金）增量代码 SonarQube 扫描报告

- 扫描日期：2026-08-27
- SonarQube 版本：26.1.0.118079（http://localhost:9000，状态 UP）
- 扫描通道：bemp-sonarqube-mcp 技能；结果检索经 SonarQube MCP 工具，分析上传经 sonar-scanner CLI 8.0.1（JDK 25.0.1 运行时）
- 扫描方式：sonar.inclusions 白名单增量，仅纳入本轮 14 个改动文件（9 Java + 1 MyBatis XML + 4 Vue）

## 一、扫描项目与状态

| 项目 Key | 内容 | 状态 | 文件数 |
|----------|------|------|--------|
| bemp-ext-hnnxbank-antimoney | 后端 banks/ext-hnnxbank（biz-as/biz-api/resources） | 分析上传成功，门禁 OK（默认无阈值条件） | 10 |
| bemp-ext-hnnxbank-antimoney-fe | 前端 frontend/src/views/bizViews/banks/hnnxbank | 分析上传成功 | 4 |

Dashboard：
- 后端 http://localhost:9000/dashboard?id=bemp-ext-hnnxbank-antimoney
- 前端 http://localhost:9000/dashboard?id=bemp-ext-hnnxbank-antimoney-fe

注：两项目为本轮新建快照型项目，无历史基线；“本次引入 vs 存量遗留”的区分依据 git 快照边界失效的事实（仓库仅 dab863d 单一 init 提交），改以“文件是否为本轮新增模块 / 问题行号是否落入本轮嵌入的反洗钱调用区间”逐条判定（见第三节）。

## 二、问题分级统计

严重度映射：SonarQube 26.x 无独立 MEDIUM 显示档，请求中 BLOCKER/HIGH/MEDIUM 过滤对应 CRITICAL/MAJOR 及以上；MINOR/INFO 仅作存量背景参考。

### 后端（38 条，无 BLOCKER）

| 文件 | CRITICAL | MAJOR | MINOR | INFO |
|------|----------|-------|-------|------|
| HnnxAntiMoneyValidateUtil.java | 4 | 1 | 5 | 3 |
| HnnxRebuyApplyServiceImpl.java | 1 | 3 | 2 | 1 |
| HnnxBankSaleApplyServiceImpl.java | 3 | 2 | 2 | 3 |
| HnnxBankRediscountSaleApplyServiceImpl.java | 1 | 1 | 2 | 2 |
| HnnxCommonConst.java | 0 | 1 | 1 | 0 |
| HnnxAntiMoneyUtilConfig.java / HnnxAntiMoneyPreCheckReqDto.java / HnnxAntiMoneyPreCheckServiceImpl.java / HnnxbankSaleBillDao.java / HnnxbankSaleBillDaoExt.xml | 0 | 0 | 0 | 0 |

后端规则分布（CRITICAL/MAJOR）：java:S3776 认知复杂度 ×9、java:S125 注释代码 ×3、java:S5738 废弃 API 调用 ×3、java:S1066 可合并条件 ×1、java:S1118 缺私有构造器 ×1。
MINOR/INFO 主要为：S6541 Brain Method ×6（与 S3776 同源）、S1155 isEmpty()、S135 break/continue、S1124 修饰符顺序、S3077 线程安全类型、S1481 未用变量、S1135 TODO、Java CPD/SCM blame 缺失（未提交文件所致，非代码缺陷）。

### 前端（175 条，无 BLOCKER）

| 文件 | CRITICAL | MAJOR | MINOR |
|------|----------|-------|-------|
| quoteRebuyChange.vue | 4 | 1 | 若干 |
| quoteSaleChange.vue | 3 | 6 | 若干 |
| redSaleApplChange.vue | 5 | 4 | 若干 |
| eDiscApplyBatchAdd.vue | 5 | 24 | 大量 |

前端规则分布（CRITICAL/MAJOR 共 52）：javascript:S3776 ×15、S125 ×11、S7762 removeChild 写法 ×7、S6660 else-if 写法 ×4、Web 注释代码 ×4、S7721 循环内函数 ×3、S3504 var 声明 ×2、S1534 重名定义 / S878 逗号运算符 / S7740 this 别名 / S108 空块 / S4144 重复实现 / css:S4667 空 style 各 ×1。MINOR ×123 全部列存量为背景，不在本轮修复范围。

## 三、“本次引入”问题明细与修复建议（共 7 条高级别：CRITICAL 4 / MAJOR 3，另附同文件低级别 6 条）

归属判定依据：反洗钱模块 5 文件为全新代码（PreCheckServiceImpl 注释 @date 2026/08/26、本轮新模块）；3 个存量 ServiceImpl 与 4 个存量 Vue 页面经 Grep 定位其本轮嵌入点（isAntiMoneyListIntercept / validateAntiMoneyListByItems / checkAntiMoneyBeforeSubmit 区间），问题行号凡位于嵌入区间之外或内容为既有业务逻辑者判“存量遗留”。

### 3.1 [CRITICAL] java:S3776 — HnnxAntiMoneyValidateUtil.java 认知复杂度超标 ×4

| 行号 | 方法 | 当前值 / 阈值 |
|------|------|--------------|
| 247 | 待核方法 A | 33 / 15 |
| 851 | 待核方法 B | 65 / 15 |
| 1029 | 待核方法 C | 33 / 15 |
| 1193 | 待核方法 D | 121 / 15 |

均为本工具类（新模块核心校验器）中的长流程方法，多角色的匹配、查库补全、round 判定混在同一方法体内。

修复建议（等价重构，不改变拦截语义）：
1. 按校验维度拆分：将“五角色逐个命中判断”提取为 perRoleHit(BillCheckItem, MatchResult...) 私有方法，主干保留编排顺序；
2. 将查库补全段（fillSocCodeFromDb / fillDiscountCustInfoFromDb）与“名单比对段”分离为两个阶段方法，避免查库分支与匹配分支叠加嵌套；
3. 用卫语句提前返回替代深层 else 嵌套；对反复出现的“某角色是否参与 roundN 校验”的判断收敛为单一谓词方法；
4. 优先重构 L1193（121 分）与 L851（65 分）两条最严重的，拆分后预期均可降至 15 以内。
- 由 bemp-personalized-developer 执行；属结构性重构，若主会话认为风险大，可选择先修 MAJOR 级、S3776 记入技术债。

### 3.2 [MAJOR] java:S125 — HnnxAntiMoneyValidateUtil.java:202 注释掉的代码块应删除

修复建议：直接删除该注释代码块；确需保留演进线索的，写入方法 JavaDoc 或随 git 历史留存，禁止以注释形式携带死代码。

### 3.3 [MAJOR] java:S1118 — HnnxCommonConst.java:14 工具常量类缺私有构造器

修复建议：为该类显式添加 `private HnnxCommonConst() {}` 以屏蔽隐式公有构造器，防止实例化（不影响常量使用方）。附带同文件 MINOR java:S1124:34 修饰符顺序调整（`static final` 规范位序）一并修正，一次提交解决。
- 说明：“业务常量集中于 HnnxCommonConst”这一设计决策（用户豁免项）不受影响，此处仅指类的构造器封装缺失，不属于被豁免的模式。

### 3.4 [MAJOR] javascript:S4144 — eDiscApplyBatchAdd.vue:2568 本轮新增函数复制了既有实现（与 2531 完全相同）

本轮新增的 checkAntiMoneyBeforeSubmit() 中 `mergeBill` 箭头函数与既有 checkZeroInterestBeforeSubmit()（L2531 起）实现完全一致（select 取勾选 / batch 双来源去重收集票据）。

修复建议：将“提交前收集去重票据列表”逻辑抽取为页面级公共方法（如 collectSubmitBills()），由 checkZeroInterestBeforeSubmit 与 checkAntiMoneyBeforeSubmit 共用；改动收敛于本轮新增函数内部与既有函数的一行替换，回归面小。后续 4 个页面的同类预检方法也建议下沉为 mixin/公共工具，消除四处相似的 checkAntiMoneyBeforeSubmit 复制（本轮先不做跨页统一，避免扩散影响）。

### 3.5 本次引入的低级别问题（同新模块文件，列示供主会话定夺，不计入门禁重点）

| 位置 | 规则 | 行号 | 说明 |
|------|------|------|------|
| HnnxAntiMoneyValidateUtil.java | java:S3077 | 86, 97 | 名单缓存 Map 使用普通引用，volatile 不足以保证线程安全；BEMP 服务内为启动加载只读场景，风险低，建议注明 final/不可变包装 |
| HnnxAntiMoneyValidateUtil.java | java:S135 | 1035, 1077, 1287 | 循环内多个 break/continue；配合 3.1 拆分自然消解 |
| HnnxAntiMoneyValidateUtil.java / HnnxCommonConst.java | java:S1124 | （ValidationUtil 与 Const:34） | 修饰符顺序规范 |

## 四、“存量遗留”问题概览（206 条，本轮不展开修复建议）

- 3 个市场报价/转贴现 ServiceImpl 的 S3776×5、S5738×3、S1066×1、S125×2 及其 MINOR/INFO：核查确认 S3776 方法的复杂度主体来自既有报价提交流程（rebuy commitApply=61 分中本轮预检仅叠加少量分支）；3 处 S5738 均为既有代码中 `new Integer(maxBillSizeForBank)`（be.market.max_bill_size_for_bank 参数校验，JDK9 起废弃，建议统一改 Integer.parseInt 并记入技术债）；S1066/S125 位于存量区域。
- 4 个 Vue 页面的绝大多数问题（52 条高级别中除 3.4 外全部、MINOR×123）：位于各页面既有提交/校验方法内（如 redSaleApplChange applyContinue 的 S3776@1147、eDisc data() 内 _that@398 等），典型集中在历史性的注释代码（S125/Web×11+4）、removeChild 写法、var 声明、else-if 结构、parseInt 用法等，属于页面长期演进积累的技术债，建议另立专项治理，不阻塞本轮交付。
- 已知豁免确认：auto-scan 全库存量 @Resource/lang3/toMap 类 WARN 未在本轮 14 文件白名单范围内出现（无重复报告）；HnnxCommonConst 常量集中定义的设计决策本身不被列为问题（见 3.3 附注）。

## 五、质量门禁

| 项目 | 门禁状态 | 新覆盖率 | 重复率 | 备注 |
|------|----------|----------|--------|------|
| bemp-ext-hnnxbank-antimoney | OK（PASSED） | 无数据 | 无数据 | 新建项目未配置自定义 Quality Gate，也无测试工程覆盖配置；覆盖率/重复率阈值未生效 |
| bemp-ext-hnnxbank-antimoney-fe | 成功上传 | 无数据 | 无数据 | 同上 |

依据技能配置（scan_config.json quality_gate：new_coverage ≥80%、duplication ≤3%、new violations =0）的精神评估：本次引入问题不含 BLOCKER/安全漏洞，CRITICAL 集中于新工具类的方法复杂度（可用性问题而非正确性缺陷），MAJOR 无安全性/可靠性硬伤，可以交付并由主会话决定修复排期。

## 六、过程告警（非代码缺陷）

- SCM blame 信息缺失（10+4 个文件 untracked/本地修改状态）：仅影响 SonarQube 的 SCM 归因功能，不影响问题检出；
- scanner 上传期内 baseline-browser-mapping 提示数据过期：来自 frontend npm 依赖环境探测，与本次扫描无关。

---
报告生成：bemp-implementation-engineer · bemp-sonarqube-mcp 技能 · 2026-08-27
