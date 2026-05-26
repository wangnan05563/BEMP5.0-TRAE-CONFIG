---
name: bemp-webapp-testing
version: "2.0.0"
description: "基于 Playwright 实现 BEMP 票据系统的 Web 端自动化测试，覆盖：服务健康检查、登录态管理、页面功能验证、个性化路径校验、控制台错误检测、组件交互测试。通过配置驱动支持多银行环境无缝切换。接收 bemp-testcase-generator 编写的测试用例并执行验证，是 BEMP 测试流程中'用例执行'环节的唯一执行技能。共享资源（用例文档、参考指南、用例索引）由 bemp-test-common 统一管理。通过 Python 脚本（scripts/run_test.py、scripts/test_accept_bank_credit.py）驱动 Playwright 执行测试，支持 --bank 参数切换银行环境。"
whenToUse: "开发完成后需要验证功能、修复 bug 后需要回归测试、bemp-testcase-generator 编写完测试用例后需要执行验证、首轮测试时调用、执行 test-cases/ 目录中的用例、执行页面冒烟测试、执行承兑行额度 E2E 测试"
triggers:
  - "测试/功能/自动化/复现/页面 验证"
  - "页面/自动化/功能/需求/前端/UI/组件 测试"
  - "用例/案例 执行"
  - "执行测试用例/运行测试/自动化功能测试"
  - "bemp.testcase.generator 生成用例后"
  - "执行 test-cases/ 目录中的测试用例"
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
│   └── test_config.schema.json       JSON Schema 校验定义
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

> 以下资源已迁移至 `bemp-test-common/`，由 common 统一管理：
> - `references/website-functional-map.md` → `bemp-test-common/references/website-functional-map.md`
> - `references/test-priority-matrix.md` → `bemp-test-common/references/test-priority-matrix.md`
> - `references/testing-standards.md` → `bemp-test-common/references/testing-standards.md`
> - `references/test-data-management.md` → `bemp-test-common/references/test-data-management.md`
> - `test-cases/` → `bemp-test-common/test-cases/`
> - `test-index.json` → `bemp-test-common/test-index.json`

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

## 快速开始

```powershell
# 1. 配置测试账号（编辑 PLACEHOLDER）
#    test-data/test-accounts.json 或 config/test_config.json → banks.{id}.login

# 2. 环境检查
python scripts/health_check.py
python scripts/health_check.py --bank hnnxbank
python scripts/health_check.py --validate-only    # 仅校验配置

# 3. 运行测试
python scripts/run_test.py --test all
python scripts/run_test.py --test all --bank hnnxbank --role admin
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
| ① 代码预检 | 前端代码必检项（@on-click/@views/Col:）<br/>⚠️ 多银行时确认 glob 匹配当前 `active_bank` | `run_test.py` 内置，或手动 Select-String |
| ② 环境预检 | 确认后端(8010)、前端(8091)、Redis、ZK | `python scripts/health_check.py` |
| ③ 测试数据 | Oracle MCP 查询/补充测试数据 | 详见 `bemp-test-common/references/test-data-management.md` |
| ④ 登录 | LoginManager 自动处理（storage_state 复用） | `python scripts/login_manager.py --pre-login` |
| ⑤ 导航 | Vue 懒加载路由须菜单点击注册，URL 回退 | `references/bemp-component-guide.md` |
| ⑥ 测试 | 弹窗交互 / DataGrid 查询 / 控制台错误检测 | `references/bemp-component-guide.md` |
| ⑦ 报告 | Markdown 格式，含 Token 消耗统计 | `aotutests-playwright/reports/` |

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