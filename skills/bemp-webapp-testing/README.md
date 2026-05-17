# BEMP Web 应用自动化测试

基于 Playwright 的 BEMP 票据交易管理平台 Web 端自动化测试技能包。配置驱动，支持多银行环境无缝切换。

## 架构特点

| 特性 | 说明 |
|:---|:---|
| 🏦 **多银行** | 通过 `test_config.json` 的 `active_bank` / `--bank` 参数切换环境，新增银行只需加配置 |
| 🔐 **会话复用** | `LoginManager` 基于 `storage_state` 持久化会话，30 分钟过期自动续期，多角色切换 |
| ⚙️ **配置驱动** | 选择器、页面路由、登录凭据、错误过滤全部配置化，零硬编码 |
| ✅ **Schema 校验** | `test_config.schema.json` 定义配置规范，启动时自动校验 |
| 📋 **双向索引** | `test-index.json` 建立 test-cases ↔ scripts 映射，覆盖 21 条目 207+ 用例 |

## 目录结构

```
bemp-webapp-testing/
├── SKILL.md                      AI Agent 入口文档
├── README.md                     本文件
├── test-index.json               用例 ↔ 脚本双向映射
├── .gitignore                    运行时文件排除规则
├── config/
│   ├── test_config.json          核心配置（银行/服务/选择器/会话/错误过滤）
│   └── test_config.schema.json   JSON Schema 校验定义
├── scripts/
│   ├── health_check.py           服务健康检查 + --validate-only 配置校验
│   ├── login_manager.py          会话复用、多角色切换
│   ├── run_test.py               通用测试运行器 (--auto-cleanup)
│   ├── test_accept_bank_credit.py 承兑行额度管理 E2E 测试
│   └── cleanup.py                定期清理过期产物 (--dry-run)
├── examples/
│   ├── bemp_login.py             登录流程示例
│   ├── bemp_page_test.py         弹窗交互 / DataGrid 查询示例
│   └── bemp_api_monitor.py       API 请求监控示例
├── references/                   参考文档（7 份）
│   ├── website-functional-map.md 功能地图：6 子系统 285+ 页面
│   ├── test-priority-matrix.md   优先级矩阵 P0-P3
│   ├── testing-standards.md      测试编写规范
│   ├── bemp-component-guide.md   h-ui 组件交互参考
│   ├── error-catalog.md          错误分类与排查
│   ├── playwright-mcp-guide.md   Playwright MCP 工具指南
│   └── test-data-management.md   Oracle MCP 测试数据管理
├── test-cases/                   测试用例（common/sm/bm/be/ce）
├── test-data/
│   └── test-accounts.json        测试账号配置（PLACEHOLDER）
└── assets/templates/             用例模板 + 报告模板
```

> 运行时产物统一输出至项目根目录 `aotutests-playwright/`（详见下方"输出管理"）

## 前置条件

- Python 3.8+
- Playwright（`pip install playwright`）
- 目标服务运行中：后端(8010)、前端(8091)、Redis(6379)、ZooKeeper(2181)

```powershell
# 安装依赖
pip install playwright jsonschema
playwright install chromium
```

## 快速开始

```powershell
# 1. 配置测试账号
#    编辑 config/test_config.json → banks.{id}.login 节点
#    或编辑 test-data/test-accounts.json

# 2. 环境检查
python scripts/health_check.py
python scripts/health_check.py --validate-only   # 仅校验配置

# 3. 运行测试
python scripts/run_test.py --test all
python scripts/run_test.py --test all --bank hnnxbank --role admin

# 4. 查看报告 → aotutests-playwright/reports/{bank_id}/YYYY-MM/ 目录
```

## 核心命令

### 通用测试运行器

```powershell
python scripts/run_test.py --test all              # 验证所有页面
python scripts/run_test.py --test branch           # 机构管理模块
python scripts/run_test.py --test sign             # 企业报备模块
python scripts/run_test.py --bank huisbank         # 切换银行
python scripts/run_test.py --role admin            # 管理员角色
python scripts/run_test.py --no-headless           # 显示浏览器（调试）
python scripts/run_test.py --skip-health-check     # 跳过健康检查
python scripts/run_test.py --cleanup-states        # 清理缓存会话
python scripts/run_test.py --auto-cleanup          # 测试前自动清理过期产物
```

### 专项测试

```powershell
python scripts/test_accept_bank_credit.py --bank hnnxbank   # 承兑行额度 E2E
```

### 环境预检

```powershell
python scripts/health_check.py                    # 完整健康检查
python scripts/health_check.py --bank huisbank    # 指定银行
python scripts/health_check.py --validate-only    # 仅校验配置格式
```

## 多银行配置

在 `config/test_config.json` → `banks` 节点下管理银行环境：

```json
{
  "active_bank": "hnnxbank",
  "banks": {
    "hnnxbank": {
      "name": "河南农信",
      "url_prefix": "/hnnxbank/",
      "login": { "default": { "username": "...", "password": "..." } },
      "pages": { ... }
    },
    "huisbank": {
      "name": "徽商银行",
      "url_prefix": "/huisbank/",
      "login": { "default": { "username": "...", "password": "..." } },
      "pages": { ... }
    }
  }
}
```

新增银行只需在 `banks` 下添加配置 + 在 `test-data/test-accounts.json` 中添加测试账号。

## 输出管理

所有自动化测试产物统一存放于项目根目录 `aotutests-playwright/`：

```
aotutests-playwright/
├── index.json                          # 元数据索引（自动更新）
├── reports/{bank_id}/YYYY-MM/          # {bank_id}_{YYYYMMDD}_{HHmmss}_{mode}.md
├── screenshots/{bank_id}/YYYY-MM/      # {bank_id}_{test_id}_{step}_{timestamp}.png
├── session_states/                     # {bank_id}_{role}_state.json（30分钟过期）
└── logs/                               # {bank_id}_{YYYYMMDD}.log
```

### 文件命名规范

| 类型 | 格式 | 示例 |
|:---|:---|:---|
| 报告 | `{bank_id}_{日期}_{时间}_{模式}.md` | `hnnxbank_20260516_143000_all.md` |
| 截图 | `{bank_id}_{用例}_{步骤}_{时间戳}.png` | `hnnxbank_TC001_step1_20260516143000.png` |
| 会话 | `{bank_id}_{角色}_state.json` | `hnnxbank_admin_state.json` |
| 日志 | `{bank_id}_{日期}.log` | `hnnxbank_20260516.log` |

### 定期清理

```powershell
# 预览过期文件（不删除）
python scripts/cleanup.py --dry-run

# 执行清理（报告30天/截图14天/会话7天/日志14天）
python scripts/cleanup.py

# 自定义保留天数
python scripts/cleanup.py --report-days 60 --screenshot-days 30

# 测试前自动清理
python scripts/run_test.py --auto-cleanup
```

## 测试覆盖

| 子系统 | 模块 | 用例数 | 自动化脚本 |
|:---|:---|:---|:---|
| 通用 | 登录与会话 | 21 | `run_test.py` / `login_manager.py` |
| 系统管理 | 机构/角色/清算 | 29+ | `run_test.py` |
| 业务管理 | 客户/签约/审批/支付 | 34+ | `run_test.py` |
| 业务管理 | 额度管理 | - | `test_accept_bank_credit.py` |
| 场内交易 | 托管/市场交易 | 64 | 待开发 |
| 场外交易 | 承兑/贴现/质押 | 59 | 待开发 |

> 详细索引与脚本覆盖标注见 `test-index.json`

## 组件测试模式

| 模式 | 说明 | 示例 |
|:---|:---|:---|
| 弹窗交互 | h-msg-box 打开/关闭/确认/取消 | `examples/bemp_page_test.py` |
| DataGrid 查询 | 查询按钮 → 等待数据 → 验证行数 | `examples/bemp_page_test.py` |
| 字段显示 | 特定字段可见性检查 | `examples/bemp_page_test.py` |
| API 监控 | 请求拦截、4xx/5xx 捕获 | `examples/bemp_api_monitor.py` |
| 状态流转 | 草稿→待复核→已复核 | `scripts/test_accept_bank_credit.py` |

## 输出标准

| 状态 | 条件 |
|:---|:---|
| **PASS** | 功能正常，无 TypeError/ReferenceError |
| **FAIL** | 结果不符预期，或存在致命 JS 错误 |
| **BLOCKED** | 服务不可达、登录失败、数据缺失 |

## 相关技能

| 技能 | 关系 |
|:---|:---|
| `bemp-auto-tester` | 调用本技能执行自动化测试 |
| `bemp-implementation-engineer` | 启动/停止 BEMP 服务、Oracle MCP 测试数据查询 |
| `bemp-personalized-developer` | 功能开发 → 测试验证环节调用 |
| `bemp-db-operator` | 测试数据准备时查询数据库 |
| `jmeter-performance-test` | 性能/负载测试补充 |

## License

内部项目，仅供 BEMP 团队使用。