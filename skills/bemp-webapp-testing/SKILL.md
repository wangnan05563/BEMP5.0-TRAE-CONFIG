# BEMP Web 应用自动化测试 Skill

## Skill 职责

基于 Playwright 实现 BEMP 票据系统的 Web 端自动化测试，覆盖：服务健康检查、登录态管理、页面功能验证、个性化路径校验、控制台错误检测、组件交互测试、机构数据隔离验证。

## 触发场景

- 用户要求"测试验证"、"功能验证"、"页面测试"
- 开发完成后需要验证功能是否正常
- 修复 bug 后需要回归测试
- 代码 review 后需要确认无运行时错误
- 状态流转验证（如额度管理草稿→待复核→已复核）
- 额度管理模块测试（额度批次、额度明细、额度复核）

## 多银行环境支持

通过配置驱动支持多银行环境切换，核心机制：

- `config/test_config.json` 中 `active_bank` 字段决定默认银行
- 命令行 `--bank` 参数可覆盖默认配置
- 新增银行只需在 `banks` 节点下添加配置，无需修改任何代码

```powershell
python scripts/run_test.py --test all
python scripts/run_test.py --test all --bank {bank_id}
```

## 目录结构

```
bemp-webapp-testing/
├── SKILL.md                          本文件
├── config/
│   └── test_config.json              核心配置（银行环境、服务端口、选择器、错误过滤、代码检查、会话管理）
├── assets/templates/                 模板文件
│   ├── test_case_template.md         测试用例模板
│   └── test_report_template.md       测试报告模板
├── test-data/
│   └── test-accounts.json            测试账号配置（按银行和角色组织）
├── test-cases/                       测试用例文档
│   ├── common/                       通用测试用例
│   ├── sm/                           系统管理模块
│   └── bm/                           业务管理模块
├── scripts/                          自动化测试脚本
│   ├── health_check.py               服务健康检查
│   ├── login_manager.py              统一登录管理器（会话复用、多角色切换）
│   └── run_test.py                   通用测试运行器
├── examples/                         测试脚本示例
│   ├── bemp_login.py                 登录流程示例
│   ├── bemp_page_test.py             通用测试模式示例
│   └── bemp_api_monitor.py           API 路径监控示例
├── references/                       测试标准和规范
│   ├── testing-standards.md          测试用例编写标准
│   ├── bemp-component-guide.md       BEMP 组件交互参考
│   └── error-catalog.md              常见错误分类和处理
├── reports/                          测试报告输出目录
└── session_states/                   登录状态持久化目录（自动生成）
```

## 配置文件说明

### config/test_config.json 核心结构

```json
{
  "active_bank": "{bank_id}",
  "host": "127.0.0.1",
  "services": { "后端/前端/Redis/ZK端口和健康检查URL" },
  "banks": {
    "{bank_id}": {
      "name": "银行名称",
      "url_prefix": "/{bank_id}/",
      "login": { "角色名": {"username": "...", "password": "..."} },
      "pages": { "页面key": {"name": "...", "path": "/#/...", "require_personalized": true} }
    }
  },
  "login": { "超时配置" },
  "session": { "state_dir", "state_max_age", "auto_refresh_threshold" },
  "test": { "viewport", "browser配置" },
  "error_filters": { "critical_errors", "ignorable_patterns" },
  "selectors": { "UI选择器配置" },
  "code_checks": { "前端/后端代码预检项" }
}
```

**关键设计原则**：所有银行特定信息（URL前缀、登录账号、页面路由）均从配置读取，代码中不硬编码。

### selectors 配置

| key | 默认值 | 用途 |
|-----|--------|------|
| login_username | `input[placeholder*="用户名"]` | 登录用户名输入框 |
| login_password | `input[placeholder*="密码"]` | 登录密码输入框 |
| login_button | `button:has-text("登录")` | 登录按钮 |
| force_login_confirm | `.h-msg-box-confirm button:has-text("是")` | 强制登录确认 |
| session_expired | `text=会话已失效` | 会话失效提示 |
| msg_box_visible | `.h-msg-box:visible` | 可见弹窗 |
| msg_box_close | `.h-msg-box-close:visible` | 弹窗关闭X按钮 |
| msg_box_confirm | `.h-msg-box button:has-text("确定")` | 弹窗确定按钮 |
| msg_box_cancel | `.h-msg-box button:has-text("关闭")` | 弹窗关闭按钮 |
| datagrid | `.h-datagrid` | 数据表格 |
| query_button | `button:has-text("查询")` | 查询按钮 |
| add_button | `button:has-text("新增")` | 新增按钮 |

## 执行步骤

### 第一步：代码预检（推荐）

测试前运行代码必检项，提前发现常见P0缺陷。检查项配置在 `test_config.json` 的 `code_checks` 节点。

```powershell
# 通过run_test.py内置预检
python scripts/run_test.py --test all

# 手动预检（将{bank_id}替换为实际银行标识）
Select-String -Path "frontend\src\views\bizViews\banks\{bank_id}\**\*.vue" -Pattern "@on-click" -Recurse
Select-String -Path "frontend\src\api\bank\{bank_id}Index.js" -Pattern "@views/"
Select-String -Path "frontend\src\views\bizViews\banks\{bank_id}\**\*.vue" -Pattern "\bCol:" -Recurse
```

### 第二步：环境预检（必须）

```
测试请求 → 后端可达? → 前端可达? → 登录成功? → 执行功能测试
```

```powershell
python scripts/health_check.py
python scripts/health_check.py --bank {bank_id}
```

服务启动顺序：Redis → ZooKeeper → SpringBoot → 前端

### 第三步：选择测试模式

| 模式 | 命令 | 适用场景 |
|------|------|---------|
| 通用测试 | `--test all` | 验证所有配置页面 |
| 模块测试 | `--test branch` | 验证特定模块 |
| 指定银行 | `--bank {bank_id}` | 切换银行环境 |
| 指定角色 | `--role admin` | 使用特定角色登录 |
| 可见模式 | `--no-headless` | 观察浏览器行为 |

### 第四步：登录系统（LoginManager）

LoginManager 提供会话复用、storage_state持久化、多角色切换、自动重连能力。

**Token优化效果**：N个页面单角色从N次登录降至1次，节省(N-1)/N。

```python
from login_manager import LoginManager, LoginError

mgr = LoginManager(config, bank_id='{bank_id}')
try:
    page = mgr.get_page(role='default')       # 获取已认证page（自动复用或新建）
    admin_page = mgr.switch_role('admin')     # 切换角色（复用已认证context）
    mgr.navigate_to('/#/sm/auth/branch/branch')  # 导航到目标页面
finally:
    mgr.cleanup()
```

**登录流程**：填写用户名密码 → 点击登录 → 处理强制登录弹窗 → 等待networkidle → 保存storage_state

**会话配置**（`config/test_config.json` 的 `session` 节点）：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| state_dir | session_states | 状态文件存储目录 |
| state_max_age | 1800 | 状态最大有效期（秒） |
| max_login_retries | 2 | 登录失败最大重试次数 |

### 第五步：导航到目标页面

页面路径从 `banks.{bank_id}.pages` 配置读取。导航后必须 `wait_for_load_state('networkidle')`。

**Vue 动态路由导航**：BEMP 使用 Vue 懒加载路由，直接 URL 导航会导致页面空白。必须通过菜单点击触发路由注册：

```javascript
// playwright_evaluate: 点击子系统选项卡
const menuItems = document.querySelectorAll('.h-sidebar-leftfixed .h-menu-item');
for (const item of menuItems) {
  const span = item.querySelector('span');
  if (span && span.textContent.includes('业务管理子系统')) {
    item.click();
    break;
  }
}
```

然后点击子菜单项触发具体路由注册。回退方案：如果菜单点击失败，尝试 `playwright_navigate` 直接 URL（仅在路由已被注册过时有效）。

### 第六步：执行功能测试

**弹窗交互**：`click(add_button)` → `wait_for_selector(msg_box_visible)` → `wait_for_timeout(500)` → 操作 → 关闭

**DataGrid查询**：监听 `page.on("request")` → `click(query_button)` → 验证API使用 `{url_prefix}` 前缀

**控制台错误**：监听 `page.on("console")` → 过滤 TypeError/ReferenceError → 详见 [error-catalog.md](references/error-catalog.md)

**机构数据隔离**：使用不同机构账号登录 → 对比查询结果 → 确认无交叉数据

### 第七步：生成测试报告

报告包含：用例编号、名称、状态、详情、截图、控制台错误、Token消耗统计。

## 新增银行环境指南

3步完成新银行接入：

**1. 在 test_config.json 添加银行配置**
```json
{
  "banks": {
    "{bank_id}": {
      "name": "银行名称",
      "url_prefix": "/{bank_id}/",
      "login": { "default": {"username": "...", "password": "..."} },
      "pages": { "branch": {"name": "机构管理", "path": "/#/sm/auth/branch/branch", "require_personalized": true} }
    }
  }
}
```

**2. 在 test-accounts.json 添加测试账号**
```json
{
  "{bank_id}": {
    "accounts": [{"role": "admin", "username": "...", "password": "...", "scope": "all"}]
  }
}
```

**3. 运行测试**
```powershell
python scripts/run_test.py --test all --bank {bank_id}
```

## 输出标准

| 状态 | 定义 |
|------|------|
| PASS | 功能正常，无关键控制台错误 |
| FAIL | 功能异常或存在 TypeError/ReferenceError |
| BLOCKED | 服务不可达或登录失败 |

## 最佳实践

1. **配置驱动**：所有银行特定信息从配置读取，不硬编码
2. **先截图后验证**：用截图确认页面状态，再执行具体验证
3. **文本验证优于选择器**：`text=查询` 比 `.btn-search` 更稳定
4. **网络请求监听**：通过 `page.on("request")` 验证个性化路径
5. **弹窗操作加延时**：弹窗打开/关闭后 `wait_for_timeout(500)`
6. **Vue路由需菜单触发**：BEMP懒加载路由需要菜单点击注册，直接URL导航不可靠
7. **选择后等待同步**：DataGrid行选择后等待500ms让Vue数据同步
8. **密码字段兼容**：BEMP Chrome模式下密码字段可能是tempPassword

## 参考文件

| 文件 | 说明 |
|------|------|
| references/testing-standards.md | 测试用例编写标准、代码审查检查清单、回归测试策略 |
| references/bemp-component-guide.md | BEMP 组件交互参考（h-button/h-msg-box/h-datagrid/h-tree/h-upload/h-form等） |
| references/error-catalog.md | 常见错误分类和处理、调试工作流、错误快速索引 |
| references/playwright-mcp-guide.md | Playwright MCP自动化测试实战指南（工具概述、登录/导航/组件交互/状态流转/API监控工作流） |
| references/test-data-management.md | 测试数据管理指南（数据分类、数据库操作、数据生命周期） |
| scripts/health_check.py | 服务健康检查（支持--bank参数） |
| scripts/login_manager.py | 统一登录管理器（会话复用、多角色切换、storage_state持久化） |
| scripts/run_test.py | 通用测试运行器（配置驱动，支持--bank/--role参数、代码预检） |
| config/test_config.json | 核心配置文件 |
| test-data/test-accounts.json | 测试账号配置 |
