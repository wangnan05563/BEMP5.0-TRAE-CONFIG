---
name: bemp-webapp-testing
version: "2.4.0"
description: "基于 Playwright 实现 BEMP 票据系统的 Web 端自动化测试，覆盖：服务健康检查、登录态管理、页面功能验证、个性化路径校验、控制台错误检测、组件交互测试。通过配置驱动支持多银行环境无缝切换。接收 bemp-testcase-generator 编写的测试用例并执行验证，是 BEMP 测试流程中'用例执行'环节的唯一执行技能。共享资源（用例文档、参考指南、用例索引）由 bemp-test-common 统一管理。通过 Python 脚本（scripts/run_test.py、scripts/test_accept_bank_credit.py）驱动 Playwright 执行测试，支持 --bank 参数切换银行环境。Playwright 与 Chrome DevTools 均无法覆盖的系统对话框、外设、跨应用核验等桌面级场景，按技能内置的 references/computer-use-guide.md 执行 L3 桌面兜底（平台无关，接入参数由 config/computer-use.json 配置）。"
whenToUse: "开发完成后需要验证功能、修复 bug 后需要回归测试、bemp-testcase-generator 编写完测试用例后需要执行验证、首轮测试时调用、执行页面冒烟测试、执行承兑行额度 E2E 测试、Playwright/Chrome DevTools 均无法处理的桌面级测试场景"
triggers:
  - "测试/功能/自动化/复现/页面 验证"
  - "页面/自动化/功能/需求/前端/UI/组件 测试"
  - "用例/案例 执行"
  - "执行测试用例/运行测试/自动化功能测试"
  - "bemp.testcase.generator 生成用例后"
  - "首轮测试/回归测试"
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

## Token 效率规约（执行全程适用，违反视为执行缺陷）

以下规约在不降低断言准确性与功能完整性的前提下约束 token 消耗：

| 编号 | 规约 |
|:---|:---|
| T1 配置单键取参 | 银行参数用 `load_config.py --get banks.{bank_id}.<key>` 单键解析，禁止整读 `test_config.json` 全文 |
| T2 按需读取 | `test_config.schema.json` 仅在 `--validate-only` 或修改配置时读取；执行测试禁止读取 |
| T3 最小信息启动 | 用户只需提供用例集/模块名；银行、账号、端口走配置解析链默认值，缺省成功不追问；仅在配置解析失败时以一句话+选项澄清 |
| T4 快照精准查询 | browser_snapshot 后立即提取断言锚点；后续状态查询用 browser_evaluate 按选择器精准获取，禁止对同一页面重复全页快照 |
| T5 轮询脚本化 | 服务等待由 `health_check.py` 内置逻辑完成，禁止在对话中手写循环 netstat（单次预检 netstat 输出 ≤1 次） |
| T6 批处理执行 | 多用例必须 `--test all` 或 YAML 集合批跑，禁止逐条 invoke |
| T7 摘要回传 | 对话中只回传报告「对话回传摘要区」表格与 BLOCKED 清单；报告全文/控制台日志/诊断明细落盘 `aotutests-playwright/` 后以路径引用，禁止粘贴原文 |
| T8 移交瘦身 | 工具切换移交信息仅含 YAML 路径+用例ID+失败步骤号+推荐模式，禁止复制用例全文或页面快照 |
| T9 L3 懒加载 | 未判定命中 L3 触发条件前不读 `references/computer-use-guide.md`；命中后按文首索引只读命中章节；接入参数用 `load_config.py --get` 单键解析 `config/computer-use.json` |

## 多银行环境支持

通过 `config/test_config.json` 的 `active_bank` 字段决定默认银行，命令行 `--bank` 参数可覆盖。新增银行只需在 `banks` 节点下添加配置，无需修改代码。

## 目录结构（关键路径）

```
bemp-webapp-testing/
├── SKILL.md                          本文件
├── config/                           核心配置（节点说明见下方"核心配置"表）
├── scripts/                          公共工具、健康检查、登录管理、测试运行器、E2E、清理
├── assets/templates/                 用例模板 + 报告模板
├── examples/                         测试模式示例（登录/页面测试/API监控）
├── references/                       本技能独有参考文档（清单见文末"参考文件"表）
└── test-data/                        测试账号
```

> 以下资源已迁移至共享技能统一管理，不再本目录维护：功能地图/优先级矩阵/测试标准/测试数据管理 → `bemp-test-common/references/`；用例文档与索引 → `bemp-test-common/`；用例 YAML Schema 与用例配置 → `bemp-testcase-generator/config/`。
> 所有运行时产物统一输出至项目根目录 `aotutests-playwright/`，详见"输出规范"。

## 核心配置

`config/test_config.json` 关键节点：

| 节点 | 说明 |
|:---|:---|
| `active_bank` | 当前激活的银行标识 |
| `banks.{id}` | 银行配置：url_prefix, login(账号), pages(页面路由) |
| `selectors` | UI 选择器（login/datagrid/msg_box/button 等） |
| `session` | 会话管理：state_dir, state_max_age(1800s) |
| `error_filters` | 错误分类：critical(TypeError/ReferenceError) / ignorable |
| `code_checks` | 前端/后端代码预检项 |
| `product_url_patterns` | 产品化页面 URL 模式，用于判断页面是否需要个性化覆盖 |
| `precheck_gate` | 前置就绪核查门禁（登录/后端连通/DB探测/菜单可达四项，任一 FAIL 停止执行） |
| `data_baseline` | 数据基线与清理（baseline_tables 基线比对、JDBC 直插主键约束） |
| `param_switch` | 参数开关类用例约定（switch/restore 成对、参数缓存等待 cache_ttl_minutes） |

> 详细选择器用法见 `config/test_config.json` selectors 节点，组件交互模式见 `references/bemp-component-guide.md`

## 测试用例配置驱动（零硬编码）

测试用例通过 YAML 配置文件定义，API路径、参数、预期值均从配置读取，禁止在 prompt 或脚本中硬编码。

### 配置加载优先级

```
bank-specific (bemp-testcase-generator/config/test-cases/{bank_id}/*.yaml)
    > 通用 (bemp-testcase-generator/config/test-cases/*.yaml)
    > Schema默认值 (bemp-testcase-generator/config/test-case-schema.yaml)
```

合并策略：deep_merge，bank-specific 配置覆盖通用配置的同名字段。

### 用例配置格式

每个 YAML 文件定义一个模块的测试用例，核心字段：

| 字段 | 说明 |
|:---|:---|
| `module` | 模块标识（大写，如 ECIFMRG） |
| `api.path` / `api.method` / `api.content_type` | API路径（不含base_url）/ 方法（默认POST）/ 内容类型（默认x-www-form-urlencoded） |
| `test_cases[].id` / `.priority` | 用例编号 / 优先级（P0/P1/P2） |
| `test_cases[].request.params` | 请求参数（key-value） |
| `test_cases[].assertions[].field` | 断言字段（支持点号路径如 retData.chkRsltRetRsn） |
| `test_cases[].assertions[].operator` / `.expected` | 断言算子 / 预期值 |
| `test_cases[].failure_category_hint` | 失败分类提示（code_defect/data_defect/env_defect/config_defect） |

### 断言算子说明

| 算子 | 含义 | 典型场景 |
|:---|:---|:---|
| `equals` / `not_equals` | 精确匹配 / 不等于 | retCode == "000000" |
| `contains` / `not_contains` | 包含 / 不包含子串 | retMsg含"账号已报备"（解决DB查询顺序不确定问题） |
| `matches` | 正则匹配 | retCode匹配"^[0-9]{6}$" |
| `is_null` / `is_not_null` | 为空 / 不为空 | 错误场景retData为空，正常场景非空 |

### 新增用例步骤

1. 在 `bemp-testcase-generator/config/test-cases/` 下创建或编辑 YAML 文件
2. 按 Schema 格式添加 test_cases 条目
3. 如需银行级覆盖，在 `bemp-testcase-generator/config/test-cases/{bank_id}/` 下创建同名 YAML，仅写覆盖字段
4. 执行测试验证

> Schema完整定义见 `bemp-testcase-generator/config/test-case-schema.yaml`，示例见 `bemp-testcase-generator/config/test-cases/ecif-cust-merge.yaml`

## 前置就绪核查门禁（precheck_gate，F8 沉淀）

> 来源：本轮"审批&指导利率改造"实测 26 条 BLOCKED 复盘。本门禁是执行用例前的**强制第 0 步**，先于预检三连（0a/0b/0c）执行；核查项清单、探测表、换账号序列全部走配置（`config/test_config.json → precheck_gate`），禁止硬编码。

**执行序列**：precheck_gate 门禁 → 预检三连（0a/0b/0c）→ 用例执行。

| 核查项（items.*） | 核查内容 | FAIL 处理 |
|:---|:---|:---|
| ①login 登录成功 | 按 account_key 从 `banks.{bank_id}.login` / `test-data/test-accounts.json` 取号登录，验证菜单树可见 | 停止执行，输出账号/密码/权限修复建议 |
| ②backend_connectivity 后端连通 | `services.backend_api.health_url` 可达（404 即存活口径） | 停止执行，走启动门禁通道恢复后重检 |
| ③db_channel DB 通道可查 | 对 `precheck_gate.probe_tables` 逐表执行探测 COUNT | 停止执行，按 db-connection-schema-check 修通道 |
| ④menu_reachability 菜单可达性逐项 | 本轮用例涉及页面逐项导航验证 page_ready_indicator | 不可达 → 按 `menu_check.fallback_account_keys` 换账号重试一轮；仍不可达 → 记 BLOCKED 并上报权限特征（`menu_check.blocked_report_fields`：账号键/目标页面/菜单路径/可见菜单范围），**禁止静默跳过** |

- 任一项 FAIL → **停止执行并输出修复建议**，不得带病进入用例执行
- 取参遵守 T1：`load_config.py --get precheck_gate.<key>`

## 执行纪律（F8 沉淀）

1. **BLOCKED 不停摆**：单条用例 BLOCKED → 登记进 BLOCKED 清单（用例ID+阻塞原因+证据）后继续执行下一条；仅 precheck_gate 门禁 FAIL 才整体停止
2. **证据强制**：每条结果（PASS/FAIL/BLOCKED）必须附证据——截图（落 screenshots/）、报文原文（落 logs/）、DB 结果原文（落 logs/ 或 evidence/）至少其一
3. **禁止推测通过**：无证据的用例一律不得标 PASS，只能标 BLOCKED（缺证据）并补采后重判
4. BLOCKED 清单与报告回传遵守 T7 摘要规约

## 测试前预检三连（Step 0，自动化连贯执行）

预检三连一次完成，合计输出 ≤20 行摘要，中途不请示用户；仅 BLOCKED 时停下并给出修复建议。

### 0a 服务健康检查

| 服务 | 默认端口 | 配置来源 |
|:---|:---|:---|
| SpringBoot | 8010 | `config/health-check.json` services.springboot.port |
| Frontend | 8091 | `config/health-check.json` services.frontend.port |
| Redis | 6379 | `config/health-check.json` services.redis.port |
| ZooKeeper | 2181 | `config/health-check.json` services.zookeeper.port |

端口未监听时由脚本自动等待（SpringBoot/Frontend 最长600s/轮询30s，Redis/ZK 60s/10s，可按 `bank_overrides.{bank_id}` 覆盖）；超时报"服务启动超时"，不继续执行，返回 BLOCKED。

### 0b 数据一致性校验（LEGAL_NO）

自动查询 TM_CUST_ELEC_SIGN 与 TM_CUST_CORP 的 LEGAL_NO 是否一致（不一致会导致签约报备校验异常）。校验SQL来自 `bemp-testcase-generator/config/test-data-check.json` consistencyChecks[0].checkSql：

```sql
SELECT e.CUST_NO, e.LEGAL_NO AS SIGN_LEGAL_NO, c.LEGAL_NO AS CORP_LEGAL_NO
FROM TM_CUST_ELEC_SIGN e
JOIN TM_CUST_CORP c ON e.CUST_NO = c.CUST_NO
WHERE e.CUST_NO LIKE '{testDataPrefix}%'
AND e.LEGAL_NO != c.LEGAL_NO
```

`autoFix=true` 时自动执行修复SQL（UPDATE签约表LEGAL_NO为客户表LEGAL_NO），修复前须截图记录不一致数据。testDataPrefix/校验规则/银行覆盖均取自 `bemp-testcase-generator/config/test-data-check.json`。

### 0c 数据就绪度预检

避免执行阶段才发现数据未准备导致大量 SKIP。流程：加载 `config/data-readiness-check.json` → 从用例文件提取数据依赖 → 按检查类型逐项检查（database_table/database_record 走 Oracle/MySQL MCP，file_exists 走 Test-Path，api_available 走 HTTP，config_value 读配置校验）→ 未就绪用例标注 SKIP 原因（取自 `skip_reasons` 模板）→ 报告输出至 `aotutests-playwright/reports/{bank_id}/{date}/data-readiness-report.md`。预检不通过不阻塞执行。

> 新增检查类型时只需在 `checks` 数组追加条目，无需修改技能逻辑。

## 快速开始与命令速查

```powershell
# 1. 配置测试账号（编辑 PLACEHOLDER）
#    test-data/test-accounts.json 或 config/test_config.json → banks.{id}.login

# 2. 环境检查
python scripts/health_check.py
python scripts/health_check.py --bank ${ENV:BANK_CODE}
python scripts/health_check.py --validate-only    # 仅校验配置

# 3. 运行测试
python scripts/run_test.py --test all
python scripts/run_test.py --test all --bank ${ENV:BANK_CODE} --role admin
python scripts/run_test.py --test branch --no-headless    # 可见模式调试

# 4. 查看报告 → aotutests-playwright/reports/{bank_id}/YYYY-MM/ 目录
```

| 命令 | 说明 |
|:---|:---|
| `--test all` | 验证银行配置中的所有页面 |
| `--test branch` / `--test sign` | 机构管理 / 企业报备模块 |
| `--bank {id}` | 切换银行环境 |
| `--role admin` | 使用管理员角色登录 |
| `--no-headless` | 显示浏览器窗口（调试用） |
| `--skip-health-check` | 跳过健康检查 |
| `--cleanup-states` | 清理缓存的会话状态 |
| `--auto-cleanup` | 测试前自动清理过期产物 |

## 输出规范

所有自动化测试生成内容统一存放于项目根目录 `aotutests-playwright/`：

```
aotutests-playwright/
├── index.json                       元数据索引（每次测试自动更新）
├── reports/{bank_id}/YYYY-MM/       报告：{bank_id}_{YYYYMMDD}_{HHmmss}_{mode}.{md|json}
├── screenshots/{bank_id}/YYYY-MM/   截图：{bank_id}_{test_id}_{step}_{timestamp}.png
├── session_states/                   会话：{bank_id}_{role}_state.json
└── logs/                             日志：{bank_id}_{YYYYMMDD}.log
```

> 对话回传遵守 T7：只回传报告模板中「对话回传摘要区」，其余落盘后引用路径。
> 清理过期产物：`python scripts/cleanup.py --dry-run`（预览）/ 去掉 `--dry-run`（执行）；测试前自动清理：`python scripts/run_test.py --auto-cleanup`

## 执行步骤概要

| 步骤 | 操作 | 命令/要点 |
|:---|:---|:---|
| 0-pre 前置就绪核查门禁 | precheck_gate 四项核查（登录/后端连通/DB探测/菜单可达），任一 FAIL 停止执行 | `load_config.py --get precheck_gate.<key>` |
| 0a 服务健康检查 | 预检三连第一环（端口监听，未就绪脚本自动等待） | `python scripts/health_check.py` |
| 0b 数据一致性校验 | LEGAL_NO 一致性，不一致自动修复 | Oracle MCP 执行 checkSql |
| 0c 数据就绪度预检 | 数据未就绪用例标注SKIP，不阻塞 | `config/data-readiness-check.json` |
| 1 代码预检 | 前端代码必检项（@on-click/@views/Col:）⚠️ 多银行时确认 glob 匹配当前 `active_bank` | `run_test.py` 内置，或手动 Select-String |
| 2 环境预检 | 确认后端(8010)、前端(8091)、Redis、ZK | `python scripts/health_check.py` |
| 3 测试数据 | Oracle MCP 查询/补充测试数据 | 详见 `bemp-test-common/references/test-data-management.md` |
| 4 登录 | LoginManager 自动处理（storage_state 复用） | `python scripts/login_manager.py --pre-login` |
| 5 导航 | Vue 懒加载路由须菜单点击注册，URL 回退 | `references/bemp-component-guide.md` |
| 6 测试 | 弹窗交互 / DataGrid 查询 / 控制台错误检测 / API断言（YAML配置驱动） | `references/bemp-component-guide.md` + `bemp-testcase-generator/config/test-cases/` |
| 7 失败诊断 | 自动按 环境→数据→代码→配置 逐层诊断，输出分类和建议 | 见"测试失败自动诊断"章节 |
| 8 报告 | Markdown 格式，含 Token 消耗统计 + 失败诊断分类 | `aotutests-playwright/reports/` |

> BEMP Chrome 模式下密码字段可能是 tempPassword，登录按钮文本可能是"登 录"(含空格)
> 弹窗操作必须先截图后断言，关闭弹窗前不要导航

## 新增银行环境（3 步）

1. **`config/test_config.json`** → `banks.{new_id}` 添加 url_prefix、login、pages
2. **`test-data/test-accounts.json`** → `{new_id}` 添加测试账号
3. **运行验证**：`python scripts/run_test.py --test all --bank {new_id}`

## 输出标准

| 状态 | 条件 |
|:---|:---|
| PASS | 功能正常，无 TypeError/ReferenceError |
| FAIL | 结果不符预期，或存在致命 JS 错误 |
| BLOCKED | 服务不可达、登录失败、数据缺失 |

## 测试失败自动诊断

当测试用例失败时，按以下优先级逐层诊断，定位根因分类：

### 诊断流程

```
Step 1: 环境检查 → 服务是否正常运行？端口是否监听？
  ├─ 失败 → env_defect（服务未启动/端口未监听/网络不通）
  └─ 通过 ↓

Step 2: 数据检查 → 测试数据是否存在？LEGAL_NO是否一致？签约状态是否正确？
  ├─ 失败 → data_defect（测试数据缺失/状态错误/LEGAL_NO不一致）
  └─ 通过 ↓

Step 3: 代码检查 → 个性化代码是否生效？class文件是否最新？SpringBoot是否已重启？
  ├─ 失败 → code_defect（代码逻辑错误/class文件未更新/未重启）
  └─ 通过 ↓

Step 4: 配置检查 → API参数格式是否正确？legalNo是否与测试数据匹配？
  ├─ 失败 → config_defect（API参数格式错误/legalNo不匹配）
  └─ 通过 → code_defect（默认归因，需人工复核代码逻辑）
```

### 失败分类定义

| 分类 | 根因 | 典型表现 |
|:---|:---|:---|
| `env_defect` | 环境问题 | 连接超时、端口未监听、服务503 |
| `data_defect` | 数据问题 | 查询结果为空、LEGAL_NO不一致、签约状态与预期不符 |
| `code_defect` | 代码问题 | 返回码不符合预期、逻辑判断错误、class文件时间戳早于源码 |
| `config_defect` | 配置问题 | API参数格式错误、legalNo与测试数据不匹配、content_type错误 |

### 诊断输出格式

```
[DIAGNOSIS] TC-ECIFMRG-011 失败诊断:
  分类: code_defect
  根因: retCode返回"000000"而非预期的非"000000"
  诊断路径: 环境(OK) → 数据(OK) → 代码(FAIL)
  建议: 检查 operCustMergeByCustNo 方法中报备状态判断逻辑
```

> 用例配置中的 `failure_category_hint` 字段提供默认分类提示，诊断结果可覆盖
> 遵守 T7：诊断过程与日志全文落盘 logs/，对话中只输出上述 [DIAGNOSIS] 摘要

## 数据基线与清理（F8 沉淀）

**流程**：执行前记录基线 COUNT（表清单走 `data_baseline.baseline_tables`，默认空=由本次测试模块配置或用例文件前置声明填充）→ 执行用例 → 执行清理 → 基线比对还原（`compare_on_finish=true`）。比对不一致 → 报告列差异表并标注未还原项，禁止静默放过。

**JDBC 直插约束**（`data_baseline.jdbc_direct_insert`）：
- 仅限 UI 不可达状态构造场景
- 必须记录插入行主键值，清理时按主键精确清理并回读 COUNT=0
- 落库前自检沿用 `bemp-testcase-generator/config/test-data-check.json` checkItems 清单

## 参数开关类用例（F8 沉淀）

- **switch/restore SQL 成对**：参数修改（switch）与还原（restore）必须成对出现在用例步骤中；restore 强制执行并回读参数值确认还原（`param_switch.restore_mandatory=true`），禁止"测完不还原"
- **参数缓存等待**：参数修改后的生效/还原验证，等待时长取 `param_switch.cache_ttl_minutes`（实测参数缓存失效时长大于 20 分钟，默认取大于该观测值的 25，可按银行覆盖）；等待不足即断言会得到旧值假阴性

## 多账号矩阵（F8 沉淀）

双用户/支行柜员类用例（数据隔离、权限对比、跨机构操作）的账号引用规则：

- 用例中账号一律以**配置键**引用（如 `u1`/`u2`/`branch_tellers` 等语义键），映射到 `banks.{bank_id}.login.{key}` 或 `test-data/test-accounts.json` 的 `{bank}.accounts[].role`；**禁止写死用户名**
- 新增角色键时：`config/test_config.json → banks.{id}.login` 加角色条目 + `test-data/test-accounts.json` 补账号（密码走 `${ENV:BEMP_TEST_PASSWORD}` 解析链）
- precheck_gate ④菜单可达核查的换账号重试，同样按键名序列 `precheck_gate.menu_check.fallback_account_keys` 取号

## Vue懒加载路由处理（菜单导航模式）

Vue懒加载路由未注册时，直接URL导航会被路由守卫回退到主页，必须通过菜单点击注册路由后才能访问目标页面。

| 策略 | 说明 | 适用场景 |
|:---|:---|:---|
| `auto` | 先URL跳转，检测到回退后自动切换菜单导航（默认） | 通用场景 |
| `url_first` | 仅URL跳转，失败报错不回退 | 已确认路由已注册 |
| `menu_only` | 仅菜单点击导航，跳过URL跳转 | 已知懒加载路由 |

`auto` 策略回退检测：导航后等待 `fallback_detection.wait_after_navigation_ms`（默认2000ms）比较URL，被重定向到主页（匹配 `home_url_patterns`）则自动切换菜单导航；菜单导航按 `menu_paths.{page_id}.menu_path` 逐级点击，到达后验证 `page_ready_indicator`。

> 完整配置见 `config/menu-navigation.json`（导航策略/回退检测/11个页面菜单路径映射/银行级覆盖/workflow步骤）

## 弹窗自动检测与处理

账号已在其他会话登录时系统弹出"强制登录确认"弹窗，需自动检测处理。通过配置驱动覆盖各类弹窗：

| 弹窗ID | 名称 | 检测时机 | 处理动作 |
|:---|:---|:---|:---|
| `force_login` | 强制登录确认 | after_login | 点击"是"/"确定" |
| `session_expired` | 会话过期 | after_navigation | 点击确认后重新登录 |
| `generic_confirm` | 通用确认 | after_action | 点击"确定" |

处理流程：检测时机触发扫描 → 按 `match_logic` 匹配（选择器可见+文本匹配） → 截图 → 按 `action_selectors` 顺序点击 → 等待 `post_action_wait_ms` 验证关闭 → 失败重试（不超过 `max_retries`）→ 超限执行 `on_failure` 策略。

> 完整配置见 `config/dialog-handlers.json`（3类弹窗定义/检测策略/处理动作/银行级覆盖/workflow步骤）

## 控制台错误分类

将控制台错误分为三类，避免环境噪音（如 WebSocket 连接失败）被误报为业务错误：

| 分类 | 说明 | 处理策略 | 是否FAIL |
|:---|:---|:---|:---|
| `business` | TypeError/ReferenceError/ChunkLoadError/Vue渲染错误 | 报告 | 是 |
| `environment` | WebSocket失败/favicon缺失/SourceMap缺失 | 忽略 | 否 |
| `network` | API超时/连接拒绝/5xx错误 | 警告 | 否（视情况升级） |

分类规则按 `classification_rules` 数组顺序匹配（`pattern_type`: contains/regex/equals），未匹配的默认归为 `business`（确保未知错误不被静默忽略）。典型：`WebSocket connection failed` → environment；`TypeError` → business；`NET:ERR_TIMEOUT` → network。

> 完整配置见 `config/ignorable-errors.json`（三分类定义/11条分类规则/报告格式/银行级覆盖/workflow步骤）

## 最佳实践

- **将捆绑脚本作为黑盒使用** - 要完成任务时，考虑 `scripts/` 中可用的脚本是否可以帮助你。这些脚本可靠地处理常见的复杂工作流，而不会弄乱上下文窗口。使用 `--help` 查看用法，然后直接调用。
- 使用 `sync_playwright()` 编写同步脚本；完成后始终关闭浏览器（必须调用 `playwright_close`，避免残留窗口占用内存和端口）
- 使用描述性选择器：`text=`、`role=`、CSS 选择器或 ID；添加适当的等待：`page.wait_for_selector()` 或 `page.wait_for_timeout()`
- **地址必须使用 127.0.0.1，禁止使用 localhost**：Windows 环境下 localhost 可能因 DNS 解析或 IPv6 优先导致连接超时或失败，所有 URL（前端、后端、API）统一使用 127.0.0.1
- **登录密码禁止硬编码**：从 config/env-config 读取

### HUI 组件操作注意事项（实战复盘提炼）

| 组件 | 注意事项 | 详细参考（bemp-chrome-devtools-test/references/pitfalls/） |
|------|---------|---------|
| h-dropdown | "新增"等按钮可能是Dropdown组件，需先设`visible=true`再点击下拉项，直接click无效 | 陷阱20 |
| window-layer | 部分弹窗使用window-layer而非h-modal，可能默认最小化，需检测并恢复 | 陷阱21 |
| h-datagrid | 行选中需同时设置`selects`+`selectIds`+`currentSelectList`，仅设一项操作按钮可能无反应 | 陷阱23 |
| v-if字段 | 条件渲染字段需先满足v-if条件（如交易类型）再验证，否则字段不存在 | 陷阱24 |
| 弹窗关闭 | 关闭弹窗后需验证URL未跳转，若跳转需重新导航回目标页面 | 陷阱22 |
| 强制登录 | 登录时可能出现"强制登录确认"弹窗，必须检测并处理 | 陷阱12 |
| 菜单导航 | 菜单文本需精确匹配，模糊搜索可能导航到错误页面 | 陷阱3 |

### 工具切换策略（FP-08）

> **完整策略文档**：[_shared/tool-switching-strategy.md](../_shared/tool-switching-strategy.md)

当 Playwright MCP 因 HUI 组件能力限制导致用例 BLOCKED 时，按标准化流程切换到 Chrome DevTools MCP。

**切换触发条件**（满足任一即切换）：元素不可见（fill/click 报 not visible/interactable）、HUI隐藏组件（input 被 h-typefield/h-select 包裹无法直接 fill）、Vue响应式未触发（fill 后 datagrid 未刷新/表单未提交）、文件上传/下载无效、复杂弹窗（h-dropdown 两步操作/window-layer 最小化）、DataGrid行选中后 `currentSelectList` 未更新。

**不触发切换**（Playwright 可处理）：标准 button/input 操作、页面导航、会话复用、批量回归、断言失败（属测试失败诊断，非工具限制）。

**切换流程**：
```
[1] 标记用例状态为"TOOL_SWITCH_REQUIRED"，记录失败表现
[2] 匹配切换触发条件 → 按 T8 生成移交信息（YAML路径/用例ID/失败步骤/推荐模式）
[3] 移交到 bemp-chrome-devtools-test 技能执行
[4] Chrome DevTools 完成后回填结果到原用例
```

**核心经验**：HUI组件框架的隐藏input和Vue响应式更新机制与Playwright fill不兼容，这是系统性问题而非偶发问题。遇到HUI组件应直接切换Chrome DevTools，无需反复尝试Playwright。切换规则配置：`config/tool-switch-rules.json`（触发条件与推荐模式映射，零硬编码）。

Chrome DevTools MCP 仍无法处理（问题位于操作系统对话框或桌面应用层）时，进入下节 L3 桌面兜底。

## L3 桌面兜底（computer-use，懒加载）

> **平台无关**：执行手册内置于本技能 `references/computer-use-guide.md`，不依赖任何平台的 computer-use 技能。移植到 WorkBuddy 等平台时只需修改 `config/computer-use.json` 的 `mcp` 节点（服务名/调用方式/工具名映射），手册无需变更。
> **懒加载**：未判定命中 L3 前不读取上述文档；命中后先看手册文首索引，只读命中章节。

### 三级工具链

| 层级 | 工具 | 作用域 | 典型适用 |
|:---|:---|:---|:---|
| L1 主力 | Playwright MCP | 页面 DOM | 标准组件、导航、批量回归、API 断言 |
| L2 兜底 | Chrome DevTools MCP（`bemp-chrome-devtools-test`） | DOM + JS 运行时 | HUI 隐藏 input、Vue 响应式、复杂弹窗、DataGrid 选中 |
| L3 桌面兜底 | computer-use（平台 MCP） | 操作系统 / 桌面应用 | 系统级对话框、外设交互、跨应用核验、真实指针轨迹 |

### 触发条件（满足任一，且已确认 L1/L2 不可行）

| 场景 | 具体表现 |
|:---|:---|
| 系统文件对话框 | 上传组件拉起 Windows 文件选择器，`playwright_upload_file` 无法关联 |
| 原生下载/另存为 | 导出时弹出系统"另存为/下载确认"，非 DOM 元素 |
| 打印预览对话框 | 页面 `window.print()` 拉起系统打印预览 |
| 浏览器原生弹窗 | 客户端证书选择、摄像头/麦克风/通知授权等浏览器级 UI |
| 硬件与外设 | UKey 证书、高拍仪/扫描仪、读卡器等票据外设交互 |
| 跨应用核验 | 需用桌面 Excel/PDF 阅读器核对导出文件数据或版式 |
| 真实指针轨迹 | Canvas 签章、手写签名等对鼠标轨迹敏感的控件 |

**不触发 L3**：DOM 内可定位元素、断言失败（属测试失败诊断）、环境/数据问题、HUI 组件问题（L2 已覆盖）。禁止用 L3 替代 DOM 断言或批量回归。

### 懒加载读取顺序

| 步骤 | 读取内容 | 取参方式 |
|:---|:---|:---|
| 1 | `references/computer-use-guide.md` 文首索引 → 命中章节 | 按章节标题定位 |
| 2 | `config/computer-use.json` → `mcp.server_name` / `mcp.invoke` / `mcp.tool_names` | `load_config.py --file config/computer-use.json --get mcp.server_name`（禁止用占位符字面量） |
| 3 | 手册第 3/5 章（观察循环与异常决策） | 执行中按需回查 |

### 执行要点（细则见手册）

1. **能力探测**：先 `list_apps`（或平台等价工具）验证 L3 可用；不可用 → BLOCKED，不虚构结果。
2. **观察**：默认 `disableScreenshot: true` 取语义树；需要坐标或视觉证据时单次改 `false` 重新观察，禁止复用旧坐标。
3. **动作**：串行执行，禁止 `Promise.all`；优先 `element_id`，坐标操作必须来自最新截图 + 窗口根 element_id。
4. **验证**：每个动作后重新观察并验证后置条件；尝试动作不等于完成，未验证不得标记 PASS。
5. **归档**：截图落 `screenshot.dir`，报告标注 `tool=computer-use`。
6. **回填**：L3 仅补操作通道，结果须由 Playwright/数据库/API 二次证实后再回填用例状态。

### 与 Playwright 会话协同

- computer-use 操作同一台桌面上的真实浏览器窗口，不新建浏览器会话；先用 Playwright 导航目标页面并保持窗口前台，再切换。
- 切换前记录当前 URL 与关键页面状态；L3 操作结束后由 Playwright 重新取页面状态，避免焦点切换造成误判。
- 窗口最小化或被遮挡时，先观察确认窗口状态再决定是否恢复，禁止盲目点击。

### 安全与边界

- 仅在测试环境执行（`safety.environment=test_only`）；生产地址禁止 L3 操作。
- 删除数据、安装软件、填写验证码、支付、权限变更、敏感数据传输按 `safety.confirm_required` 先向用户确认（详见手册第 7 章）。
- L3 失败不重复盲试：记录阻塞原因与已尝试动作，用例回填 BLOCKED。

## 参考文件

| 文件 | 说明 |
|:---|:---|
| `bemp-test-common/references/website-functional-map.md` | 功能地图：6子系统 285+ 页面清单、路由映射 |
| `bemp-test-common/references/test-priority-matrix.md` | 测试优先级矩阵：P0-P3 分级、高风险场景 |
| `bemp-test-common/references/testing-standards.md` | 测试用例编写标准、代码审查清单 |
| `bemp-test-common/references/test-data-management.md` | Oracle MCP 测试数据准备流程 |
| `bemp-test-common/test-index.json` | 用例索引：26 条目/288+ 用例 ↔ 脚本双向映射 |
| `references/bemp-component-guide.md` | BEMP 组件交互参考（h-msg-box/h-datagrid 等，文首有快速定位索引） |
| `references/error-catalog.md` | 常见错误分类：ChunkLoadError 等排查（文首有快速定位索引） |
| `references/playwright-mcp-guide.md` | Playwright MCP 工具调用工作流指南（文首有快速定位索引） |
| `references/computer-use-guide.md` | L3 桌面兜底执行手册：平台适配/工具契约/观察循环/异常决策/场景配方（文首有快速定位索引，懒加载） |
| `scripts/health_check.py` | 健康检查 + `--validate-only` 配置校验 |
| `scripts/login_manager.py` | 统一登录管理器（storage_state 持久化） |
| `scripts/run_test.py` | 通用测试运行器（配置驱动，--bank/--role） |
| `scripts/test_accept_bank_credit.py` | 承兑行额度管理 E2E（--bank 多银行） |
| `config/test_config.json` | 核心配置（选择器/超时/银行/会话） |
| `config/test_config.schema.json` | 配置 JSON Schema 校验定义（仅 --validate-only/修改配置时读取，见 T2） |
| `config/health-check.json` | 服务健康检查配置（端口/超时/轮询/银行覆盖） |
| `config/menu-navigation.json` | Vue懒加载路由导航配置（菜单路径/导航策略/回退检测/银行覆盖） |
| `config/dialog-handlers.json` | 弹窗自动检测与处理配置（强制登录/会话过期/通用确认） |
| `config/ignorable-errors.json` | 控制台错误分类配置（业务/环境/网络三分类规则） |
| `config/computer-use.json` | L3 桌面兜底平台适配配置（MCP 服务名/调用方式/工具名映射/截图与安全策略） |
| `test-data/test-accounts.json` | 测试账号配置（按银行和角色） |
| `eval-cases.md` | 技能迭代评测用例集（回归基线，技能维护用，非运行时参考） |

## 测试用例基准

> 完整用例索引（含脚本覆盖/缺失标注、用例数、覆盖范围）详见 `bemp-test-common/test-index.json`。
> 用例文件位于 `bemp-test-common/test-cases/` 目录下，按子系统（common/sm/bm/be/ce）组织。
> 用例合计约 288 条，25 条目。详细条目以 test-index.json 为准，不在本文件重复列举。

## 适用与不适用场景

**适用**：
- 用例集来自 `bemp-testcase-generator` 且需要 Web 端执行验证
- 服务（SpringBoot/Frontend/Redis/ZK）可等待就绪或由启动门禁通道管理
- 涉及多账号权限/数据隔离对比、参数开关往返、DB 基线比对类验证
- 需要证据留档（截图/报文原文/DB 结果原文）的回归测试

**不适用**：
- precheck_gate 任一核查项 FAIL 且修复建议未落实时（禁止带病执行）
- 纯代码审查类验证（走 `bemp-testcase-generator` 的 code_review 方式，无需浏览器）
- 生产环境（仅测试环境执行）
- 桌面级系统对话框/外设场景（由本技能判定后走 L3 桌面兜底移交，主通道不直接处理）
