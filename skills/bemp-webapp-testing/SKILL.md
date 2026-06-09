---
name: bemp-webapp-testing
version: "2.0.0"
description: "基于 Playwright 实现 BEMP 票据系统的 Web 端自动化测试，覆盖：服务健康检查、登录态管理、页面功能验证、个性化路径校验、控制台错误检测、组件交互测试。通过配置驱动支持多银行环境无缝切换。接收 bemp-testcase-generator 编写的测试用例并执行验证，是 BEMP 测试流程中'用例执行'环节的唯一执行技能。共享资源（用例文档、参考指南、用例索引）由 bemp-test-common 统一管理。通过 Python 脚本（scripts/run_test.py、scripts/test_accept_bank_credit.py）驱动 Playwright 执行测试，支持 --bank 参数切换银行环境。"
whenToUse: "开发完成后需要验证功能、修复 bug 后需要回归测试、bemp-testcase-generator 编写完测试用例后需要执行验证、首轮测试时调用、执行页面冒烟测试、执行承兑行额度 E2E 测试"
triggers:
  - "测试/功能/自动化/复现/页面 验证"
  - "页面/自动化/功能/需求/前端/UI/组件 测试"
  - "用例/案例 执行"
  - "执行测试用例/运行测试/自动化功能测试"
  - "bemp.testcase.generator 生成用例后"
  - "首轮测试/回归测试"
---

## 多银行环境支持

通过 `config/test_config.json` 的 `active_bank` 字段决定默认银行，命令行 `--bank` 参数可覆盖。新增银行只需在 `banks` 节点下添加配置，无需修改代码。

```powershell
python scripts/run_test.py --test all
python scripts/run_test.py --test all --bank {bank_id}
```

## 目录结构（关键路径）

```
bemp-webapp-testing/
├── SKILL.md                          本文件
├── config/
│   ├── test_config.json              核心配置（银行/服务/选择器/会话/错误过滤）
│   ├── test_config.schema.json       JSON Schema 校验定义
│   └── health-check.json             服务健康检查配置（端口/超时/轮询间隔）
├── scripts/
│   ├── common.py                     公共工具函数（选择器解析、截图、日志等）
│   ├── health_check.py               服务健康检查 + 配置校验 (--validate-only)
│   ├── login_manager.py              会话复用、多角色切换
│   ├── run_test.py                   通用测试运行器 (--test/--bank/--role/--auto-cleanup)
│   ├── test_accept_bank_credit.py    承兑行额度管理 E2E 测试
│   └── cleanup.py                    定期清理过期产物 (--dry-run)
├── assets/templates/
│   ├── test_case_template.md         测试用例模板
│   └── test_report_template.md       测试报告模板
├── examples/                         测试模式示例（登录/页面测试/API监控）
├── references/                       本技能独有参考文档
│   ├── bemp-component-guide.md       BEMP 组件交互参考（h-msg-box/h-datagrid 等）
│   ├── error-catalog.md              常见错误分类：ChunkLoadError 等排查
│   └── playwright-mcp-guide.md       Playwright MCP 工具调用工作流指南
└── test-data/                        测试账号
```

> 以下资源已迁移至共享技能，由对应技能统一管理：
> - `references/website-functional-map.md` → `bemp-test-common/references/website-functional-map.md`
> - `references/test-priority-matrix.md` → `bemp-test-common/references/test-priority-matrix.md`
> - `references/testing-standards.md` → `bemp-test-common/references/testing-standards.md`
> - `references/test-data-management.md` → `bemp-test-common/references/test-data-management.md`
> - `test-cases/` → `bemp-test-common/test-cases/`
> - `test-index.json` → `bemp-test-common/test-index.json`
> - `config/test-case-schema.yaml` → `bemp-testcase-generator/config/test-case-schema.yaml`
> - `config/test-cases/` → `bemp-testcase-generator/config/test-cases/`
> - `config/test-data-check.json` → `bemp-testcase-generator/config/test-data-check.json`

> 所有运行时产物统一输出至项目根目录 `aotutests-playwright/`（报告/截图/会话/日志），详见下方输出规范。

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
| `api.path` | API路径（不含base_url） |
| `api.method` | 请求方法（默认POST） |
| `api.content_type` | 内容类型（默认application/x-www-form-urlencoded） |
| `test_cases[].id` | 用例编号 |
| `test_cases[].priority` | 优先级（P0/P1/P2） |
| `test_cases[].request.params` | 请求参数（key-value） |
| `test_cases[].assertions[].field` | 断言字段（支持点号路径如 retData.chkRsltRetRsn） |
| `test_cases[].assertions[].operator` | 断言算子（equals/contains/not_equals/matches/is_null/is_not_null） |
| `test_cases[].assertions[].expected` | 预期值 |
| `test_cases[].failure_category_hint` | 失败分类提示（code_defect/data_defect/env_defect/config_defect） |

### 断言算子说明

| 算子 | 含义 | 典型场景 |
|:---|:---|:---|
| `equals` | 精确匹配 | retCode == "000000" |
| `not_equals` | 不等于 | retCode != "000000" |
| `contains` | 包含子串 | retMsg含"账号已报备"，解决DB查询顺序不确定问题 |
| `not_contains` | 不包含 | retMsg不含"异常" |
| `matches` | 正则匹配 | retCode匹配"^[0-9]{6}$" |
| `is_null` | 为空 | 错误场景下retData为空 |
| `is_not_null` | 不为空 | 正常场景下retData非空 |

### 新增用例步骤

1. 在 `bemp-testcase-generator/config/test-cases/` 下创建或编辑 YAML 文件
2. 按 Schema 格式添加 test_cases 条目
3. 如需银行级覆盖，在 `bemp-testcase-generator/config/test-cases/{bank_id}/` 下创建同名 YAML，仅写覆盖字段
4. 执行测试验证

> Schema完整定义见 `bemp-testcase-generator/config/test-case-schema.yaml`，示例见 `bemp-testcase-generator/config/test-cases/ecif-cust-merge.yaml`

## 服务健康检查（测试前必执行）

### 自动端口检查

测试执行前，自动检查以下服务端口是否监听：

| 服务 | 默认端口 | 配置来源 |
|:---|:---|:---|
| SpringBoot | 8010 | `config/health-check.json` services.springboot.port |
| Frontend | 8091 | `config/health-check.json` services.frontend.port |
| Redis | 6379 | `config/health-check.json` services.redis.port |
| ZooKeeper | 2181 | `config/health-check.json` services.zookeeper.port |

检查方式：通过 RunCommand 执行 `netstat -ano | findstr ":{port} " | findstr "LISTEN"`

### 自动等待逻辑

如果端口未监听，自动等待：
- 最长等待：`maxWaitSeconds`（SpringBoot/Frontend默认600秒，Redis/ZK默认60秒）
- 轮询间隔：`pollIntervalSeconds`（SpringBoot/Frontend默认30秒，Redis/ZK默认10秒）
- 超时后报告"服务启动超时"，**不继续执行测试**，返回 BLOCKED 状态

### 银行级覆盖

`config/health-check.json` 的 `bank_overrides.{bank_id}` 节点可覆盖默认端口和超时配置，通过 `--bank` 参数自动加载。

> 完整配置见 `config/health-check.json`

## 测试数据一致性校验（测试前必执行）

### LEGAL_NO一致性检查

自动查询 TM_CUST_ELEC_SIGN 和 TM_CUST_CORP 表中测试数据的 LEGAL_NO 是否一致。不一致时签约报备校验逻辑会异常。

校验SQL（来自 `bemp-testcase-generator/config/test-data-check.json` consistencyChecks[0].checkSql）：

```sql
SELECT e.CUST_NO, e.LEGAL_NO AS SIGN_LEGAL_NO, c.LEGAL_NO AS CORP_LEGAL_NO
FROM TM_CUST_ELEC_SIGN e
JOIN TM_CUST_CORP c ON e.CUST_NO = c.CUST_NO
WHERE e.CUST_NO LIKE '{testDataPrefix}%'
AND e.LEGAL_NO != c.LEGAL_NO
```

### 自动修复

当 `autoFix=true` 时，自动执行修复SQL（UPDATE签约表的LEGAL_NO为客户表的LEGAL_NO）。修复前须截图记录不一致数据。

### 配置管理

| 配置项 | 说明 | 配置来源 |
|:---|:---|:---|
| testDataPrefix | 测试数据前缀 | `bemp-testcase-generator/config/test-data-check.json` testDataPrefix |
| consistencyChecks | 校验规则列表 | `bemp-testcase-generator/config/test-data-check.json` consistencyChecks |
| bank_overrides | 银行级覆盖 | `bemp-testcase-generator/config/test-data-check.json` bank_overrides.{bank_id} |

> 完整配置见 `bemp-testcase-generator/config/test-data-check.json`

## 快速开始

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

> 清理过期产物：`python scripts/cleanup.py --dry-run`（预览）/ 去掉 `--dry-run`（执行）
> 测试前自动清理：`python scripts/run_test.py --auto-cleanup`

## 测试命令速查

| 命令 | 说明 |
|:---|:---|
| `--test all` | 验证银行配置中的所有页面 |
| `--test branch` | 验证机构管理模块 |
| `--test sign` | 验证企业报备模块 |
| `--bank {id}` | 切换银行环境 |
| `--role admin` | 使用管理员角色登录 |
| `--no-headless` | 显示浏览器窗口（调试用） |
| `--skip-health-check` | 跳过健康检查 |
| `--cleanup-states` | 清理缓存的会话状态 |
| `--auto-cleanup` | 测试前自动清理过期产物 |

## 执行步骤概要

| 步骤 | 操作 | 命令/要点 |
|:---|:---|:---|
| 0a 服务健康检查 | 自动检查端口监听，未就绪则等待（配置见 `config/health-check.json`） | `netstat -ano \| findstr ":{port} " \| findstr "LISTEN"` |
| 0b 数据一致性校验 | 自动校验LEGAL_NO等字段一致性，不一致则自动修复（配置见 `bemp-testcase-generator/config/test-data-check.json`） | Oracle MCP 执行 checkSql |
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

## 最佳实践

- **将捆绑脚本作为黑盒使用** - 要完成任务时，考虑 `scripts/` 中可用的脚本是否可以帮助你。这些脚本可靠地处理常见的复杂工作流，而不会弄乱上下文窗口。使用 `--help` 查看用法，然后直接调用。
- 使用 `sync_playwright()` 编写同步脚本
- 完成后始终关闭浏览器
- 使用描述性选择器：`text=`、`role=`、CSS 选择器或 ID
- 添加适当的等待：`page.wait_for_selector()` 或 `page.wait_for_timeout()`
- **地址必须使用 127.0.0.1，禁止使用 localhost**：Windows 环境下 localhost 可能因 DNS 解析或 IPv6 优先导致连接超时或失败，所有 URL（前端、后端、API）统一使用 127.0.0.1
- **测试结束后必须关闭浏览器页面**：所有测试用例执行完毕后，必须调用 `playwright_close` 关闭浏览器页面，释放资源，避免残留窗口占用内存和端口

## 参考文件

| 文件 | 说明 |
|:---|:---|
| `bemp-test-common/references/website-functional-map.md` | 功能地图：6子系统 285+ 页面清单、路由映射 |
| `bemp-test-common/references/test-priority-matrix.md` | 测试优先级矩阵：P0-P3 分级、高风险场景 |
| `bemp-test-common/references/testing-standards.md` | 测试用例编写标准、代码审查清单 |
| `bemp-test-common/references/test-data-management.md` | Oracle MCP 测试数据准备流程 |
| `bemp-test-common/test-index.json` | 用例索引：26 条目/288+ 用例 ↔ 脚本双向映射 |
| `references/bemp-component-guide.md` | BEMP 组件交互参考（h-msg-box/h-datagrid 等） |
| `references/error-catalog.md` | 常见错误分类：ChunkLoadError 等排查 |
| `references/playwright-mcp-guide.md` | Playwright MCP 工具调用工作流指南 |
| `scripts/health_check.py` | 健康检查 + `--validate-only` 配置校验 |
| `scripts/login_manager.py` | 统一登录管理器（storage_state 持久化） |
| `scripts/run_test.py` | 通用测试运行器（配置驱动，--bank/--role） |
| `scripts/test_accept_bank_credit.py` | 承兑行额度管理 E2E（--bank 多银行） |
| `config/test_config.json` | 核心配置（选择器/超时/银行/会话） |
| `config/test_config.schema.json` | 配置 JSON Schema 校验定义 |
| `config/health-check.json` | 服务健康检查配置（端口/超时/轮询/银行覆盖） |
| `test-data/test-accounts.json` | 测试账号配置（按银行和角色） |

## 测试用例基准

| 子系统 | 文件 | 用例数 | 覆盖 |
|:---|:---|:---|:---|
| 通用 | bemp-test-common/test-cases/common/login-session.md | 21 | 密码登录、强制登录、会话管理 |
| 系统管理 | bemp-test-common/test-cases/sm/role-permission.md | 12 | 角色分配、机构业务权限 |
| 系统管理 | bemp-test-common/test-cases/sm/clearing/clearing.md | 17 | 清算明细、排队管理、结算同步 |
| 系统管理 | bemp-test-common/test-cases/sm/branch/ | - | 机构管理、简版机构 |
| 业务管理 | bemp-test-common/test-cases/bm/approval/approval-accounting.md | 21 | 审批路线、分录配置、科目维护 |
| 业务管理 | bemp-test-common/test-cases/bm/payment/payment.md | 13 | 支付申请、支付复核 |
| 业务管理 | bemp-test-common/test-cases/bm/cust/ | - | 企业客户查询、账号同步 |
| 业务管理 | bemp-test-common/test-cases/bm/sign/ | - | 企业报备、复核、记录查询 |
| 场内交易 | bemp-test-common/test-cases/be/trust/trust.md | 32 | 提示付款、质押/解质押 |
| 场内交易 | bemp-test-common/test-cases/be/market/market.md | 32 | 买入、卖出、再贴现、回购、返售 |
| 场外交易 | bemp-test-common/test-cases/ce/acceptance/acceptance.md | 25 | 电票签发、承兑记账、付款登记、到期扣款 |
| 场外交易 | bemp-test-common/test-cases/ce/discount/discount.md | 19 | 贴现申请、贴现记账、计息复核 |
| 场外交易 | bemp-test-common/test-cases/ce/pledge/pledge.md | 15 | 提示付款、质押、解质押 |

> 详细索引（脚本覆盖/缺失标注）见 `bemp-test-common/test-index.json` | 用例合计约 288 条
>
> 注：上表为概要视图，部分目录行（如 `bm/cust/`、`bm/sign/`）包含多个用例文件。完整条目以 test-index.json 为准。