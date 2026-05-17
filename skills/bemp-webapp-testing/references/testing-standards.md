# BEMP 测试用例编写标准

## 基准文档体系

编写测试用例前，应先参考以下基准文档了解系统全貌和测试优先级：

| 文档 | 位置 | 用途 |
|------|------|------|
| 网站功能地图 | `references/website-functional-map.md` | 了解6子系统285+页面清单、路由映射、页面关系、业务流程依赖 |
| 测试范围与优先级矩阵 | `references/test-priority-matrix.md` | 确定测试优先级(P0-P3)、高风险场景、资源分配策略 |
| P0测试用例基准 | `test-cases/` 目录下各子系统子目录 | 已设计的P0用例(约192条)，作为新用例编写的参考基准 |

**用例编写流程**：功能地图(了解页面) → 优先级矩阵(确定范围) → P0基准用例(参考格式) → 编写新用例

## 用例编号规则

格式：`TC-{模块缩写}-{三位序号}`

| 模块 | 缩写 | 示例 |
|------|------|------|
| 通用/登录 | COMMON | TC-COMMON-001 |
| 机构管理 | BRANCH | TC-BRANCH-001 |
| 角色权限 | ROLE | TC-ROLE-001 |
| 清算管理 | CLEAR | TC-CLEAR-001 |
| 企业信息报备 | CUSTSIGN | TC-CUSTSIGN-001 |
| 企业信息报备复核 | SIGNAUDIT | TC-SIGNAUDIT-001 |
| 企业信息报备记录 | SIGNRECORD | TC-SIGNRECORD-001 |
| 企业客户查询 | CUSTCORP | TC-CUSTCORP-001 |
| 企业账号同步 | CUSTACCT | TC-CUSTACCT-001 |
| 审批与记账 | APPROVAL | TC-APPROVAL-001 |
| 支付管理 | PAYMENT | TC-PAYMENT-001 |
| 承兑行额度批次 | CREDITBATCH | TC-CREDITBATCH-001 |
| 承兑行额度明细 | CREDITINFO | TC-CREDITINFO-001 |
| 承兑行额度复核 | CREDITRECHECK | TC-CREDITRECHECK-001 |
| 场内-托管 | TRUST | TC-TRUST-001 |
| 场内-市场交易 | MARKET | TC-MARKET-001 |
| 场外-承兑 | ACCEPT | TC-ACCEPT-001 |
| 场外-贴现 | DISCOUNT | TC-DISCOUNT-001 |
| 场外-质押 | PLEDGE | TC-PLEDGE-001 |
| 机构管理员管理 | ADMIN | TC-ADMIN-001 |
| 发票维护 | INVOICE | TC-INVOICE-001 |
| 合同发票管理 | CONTRACT | TC-CONTRACT-001 |
| 其他凭证管理 | VOUCHER | TC-VOUCHER-001 |
| 贴现发票后补 | DISCPOST | TC-DISCPOST-001 |

## 用例结构

每个测试用例必须包含以下字段：

```yaml
用例编号: TC-BRANCH-001
用例名称: [简明描述测试内容]
优先级: P1（P1最高/P2/P3/P4最低）
前置条件:
  - 后端服务已启动(配置中的端口)
  - 前端服务已启动(配置中的端口)
  - 已登录系统
测试步骤:
  - 步骤1: [操作描述]
  - 步骤2: [操作描述]
  - 步骤3: [操作描述]
预期结果:
  - [预期行为描述]
实际结果: [待填写]
测试状态: [待填写]
截图凭证: [待填写]
控制台错误: [待填写]
```

## 优先级定义

| 优先级 | 定义 | 适用场景 |
|--------|------|----------|
| P1 | 冒烟测试 | 核心功能、阻塞性问题、数据安全 |
| P2 | 核心功能 | 主要业务流程、关键交互 |
| P3 | 一般功能 | 辅助功能、非关键交互 |
| P4 | 边界场景 | 异常输入、极端条件 |

## BEMP 特有测试关注点

### 1. 个性化路径验证

所有涉及个性化开发的页面，必须验证 API 请求路径是否使用当前银行的个性化前缀（由 `config/test_config.json` 中 `banks.{bank_id}.url_prefix` 配置）：

```python
from scripts.health_check import load_config, get_bank_config

config = load_config('../config/test_config.json')
bank_config, bank_id = get_bank_config(config)
url_prefix = bank_config.get('url_prefix', '/')

api_requests = []
def capture_request(request):
    api_requests.append(request.url)
page.on("request", capture_request)

page.click('button:has-text("查询")')
page.wait_for_load_state('networkidle')

personalized_urls = [u for u in api_requests if url_prefix in u]
assert len(personalized_urls) > 0, f"请求未使用个性化路径(前缀: {url_prefix})"
```

### 2. 组件覆盖机制验证

验证个性化组件是否正确覆盖产品化组件：

- 检查页面加载时是否加载了 `banks/{bank_id}/` 路径下的组件
- 验证组件功能是否符合个性化需求
- 确认产品化组件未被错误加载
- 路由映射在 `{bank_id}Index.js` 中维护

### 3. 机构数据隔离验证

涉及机构过滤的功能，必须验证：

- 查询结果仅包含本机构及下级机构数据
- 不同机构用户看到的数据范围不同
- 默认查询条件包含当前用户机构号

### 4. 弹窗关闭完整性验证

BEMP 弹窗关闭必须验证三个通道：

| 关闭方式 | 选择器（配置key） | 验证要点 |
|---------|--------|----------|
| 右上角X | `selectors.msg_box_close` | 弹窗关闭 + 无JS错误 |
| 底部关闭按钮 | `selectors.msg_box_cancel` | 弹窗关闭 + 无JS错误 |
| 底部重置按钮 | `button:has-text("重置")` | 弹窗保持 + 表单清空 + 无JS错误 |

### 5. 控制台错误分级

| 级别 | 错误类型 | 处理方式 |
|------|---------|----------|
| 致命 | TypeError, ReferenceError | 必须修复，测试不通过 |
| 严重 | ChunkLoadError, NetworkError | 需要排查，可能阻塞测试 |
| 警告 | Warning, Deprecation | 记录但不阻塞测试 |
| 忽略 | WebSocket连接失败(非核心) | 不影响测试结论 |

> 错误过滤规则可在 `config/test_config.json` 的 `error_filters` 节点配置

## 测试数据管理

### 登录账号

按银行环境组织，配置在 `test-data/test-accounts.json` 中：

| 角色 | 用途 | 机构范围 |
|------|------|----------|
| 管理员 | 全功能测试 | 所有机构 |
| 普通用户 | 机构过滤验证 | 本机构及下级 |

### 测试数据要求

- 机构数据：至少包含2级机构层级（总行→分行→支行）
- 客户数据：每个机构至少1条客户记录
- 按银行环境准备对应的测试数据

## 多银行环境切换

通过 `config/test_config.json` 中的 `active_bank` 字段或命令行 `--bank` 参数切换银行环境：

```powershell
# 使用默认银行（active_bank配置）
python scripts/run_test.py --test all

# 指定银行
python scripts/run_test.py --test all --bank huisbank
```

新增银行环境时，只需在 `config/test_config.json` 的 `banks` 节点下添加对应配置即可。

## 代码审查检查清单（测试前必检）

> 以下检查项来自实际测试中发现的P0阻塞缺陷，在编写测试用例前应先确认代码无此类问题。

### 前端代码必检项

| 序号 | 检查项 | 检查命令 | 预期结果 |
|------|--------|---------|---------|
| F-01 | 无 `@on-click` 事件绑定 | `Select-String -Path "frontend\src\views\bizViews\banks\{bank_id}\**\*.vue" -Pattern "@on-click" -Recurse` | 0个匹配 |
| F-02 | 无 `@views/` 路径（应为 `@/views/`） | `Select-String -Path "frontend\src\api\bank\{bank_id}Index.js" -Pattern "@views/"` | 0个匹配 |
| F-03 | 组件name与文件名一致 | 逐个检查vue文件name属性 | name值与文件名一致 |
| F-04 | 无 `Col:` 拼写错误（应为 `hiddenCol:`） | `Select-String -Path "frontend\src\views\bizViews\banks\{bank_id}\**\*.vue" -Pattern "\bCol:" -Recurse` | 0个匹配 |
| F-05 | 国际化文本使用 `$t()` | 检查按钮和标签文本 | 无硬编码中文文本 |
| F-06 | API路径与后端RequestMapping一致 | 对比前端URL和后端注解 | 完全匹配 |

### 后端代码必检项

| 序号 | 检查项 | 检查命令 | 预期结果 |
|------|--------|---------|---------|
| B-01 | Service无冗余 `@Component` | 检查 `@CloudComponent` 类是否同时有 `@Component` | 无冗余注解 |
| B-02 | 无空catch块 | `Select-String -Path "banks\ext-hnnxbank\**\*.java" -Pattern "catch.*\{\s*\}" -Recurse` | 0个匹配 |
| B-03 | Controller继承BaseController | 检查Controller类继承关系 | 继承BaseController |
| B-04 | 请求路径以 `/hnnxbank/` 开头 | 检查 `@RequestMapping` 注解 | 路径前缀正确 |
| B-05 | Service有 `@CustomizedBean` | 检查个性化Service类注解 | 有 `@CustomizedBean` |
| B-06 | ThreadLocal有finally清理 | 检查ThreadLocal使用处 | finally块中调用remove |

### 测试执行前检查流程

```
1. 运行前端代码必检项 F-01 ~ F-06
   ├─ 发现问题 → 修复后重新检查
   └─ 全部通过 → 继续

2. 运行后端代码必检项 B-01 ~ B-06
   ├─ 发现问题 → 修复后重新检查
   └─ 全部通过 → 继续

3. 运行服务健康检查
   ├─ 服务不可达 → 启动服务后重新检查
   └─ 服务就绪 → 继续

4. 执行功能测试用例
   ├─ PASS → 记录结果
   ├─ FAIL → 记录缺陷，修复后重新测试
   └─ BLOCKED → 排查环境问题

5. 生成测试报告
```

## 测试报告验证标准

### PASS 判定条件（全部满足）

1. 页面正常渲染，无白屏
2. 无 TypeError / ReferenceError 控制台错误
3. 个性化页面 API 请求使用 `/hnnxbank/` 前缀
4. 弹窗打开/关闭正常
5. 按钮点击事件正常触发
6. 数据查询返回结果

### FAIL 判定条件（任一满足）

1. 存在 TypeError / ReferenceError
2. ChunkLoadError（组件加载失败）
3. 个性化页面未使用个性化 URL 路径
4. 按钮点击无响应
5. 弹窗无法打开或关闭
6. 数据查询结果不符合预期

### BLOCKED 判定条件

1. 后端服务不可达
2. 前端服务不可达
3. 登录失败

## 回归测试标准

### 回归测试范围确定

| 变更类型 | 必须回归 | 建议回归 | 可选回归 |
|---------|---------|---------|---------|
| P0缺陷修复 | 全部页面 | - | - |
| P1缺陷修复 | 受影响模块 | 关联模块 | 其他模块 |
| 新增功能 | 新功能页面 | 同模块页面 | 关联模块 |
| 前端公共组件修改 | 全部页面 | - | - |
| 后端接口修改 | 使用该接口的页面 | 同模块页面 | - |
| 配置文件修改 | 全部页面 | - | - |
| 环境变更 | 全部页面 | - | - |

### 回归测试执行标准

1. **P0缺陷修复后**：必须全量回归，确认修复未引入新问题
2. **每次回归前**：先运行代码预检（F-01~F-06、B-01~B-06）
3. **回归通过标准**：所有回归用例PASS，无新增控制台错误
4. **回归失败处理**：记录新缺陷，修复后重新回归

### 回归测试报告要求

- 标注回归范围和触发原因
- 列出所有回归用例及结果
- 对比修复前后测试结果
- 记录是否引入新问题

## 测试用例编写补充规范

### 弹窗测试用例必须覆盖的场景

每个包含弹窗的页面，测试用例必须覆盖以下场景：

| 场景 | 操作 | 预期结果 |
|------|------|---------|
| 打开弹窗 | 点击新增/修改按钮 | 弹窗正常显示，无JS错误 |
| 关闭弹窗-X按钮 | 点击右上角X | 弹窗关闭，无JS错误 |
| 关闭弹窗-关闭按钮 | 点击底部关闭按钮 | 弹窗关闭，无JS错误 |
| 重置表单 | 点击重置按钮 | 表单清空，弹窗保持 |
| 提交表单-校验失败 | 必填项为空点击确定 | 显示校验提示 |
| 提交表单-成功 | 填写完整数据点击确定 | 提交成功，弹窗关闭 |

### DataGrid测试用例必须覆盖的场景

| 场景 | 操作 | 预期结果 |
|------|------|---------|
| 默认查询 | 进入页面 | 自动查询并显示数据 |
| 条件查询 | 输入条件点击查询 | 结果符合筛选条件 |
| 个性化路径 | 查询时监听请求 | API使用个性化前缀 |
| 翻页 | 点击下一页 | 数据正确翻页 |
| 行选择 | 点击某行 | 行高亮，操作按钮可用 |

### 机构数据隔离测试用例模板

```yaml
用例编号: TC-{MODULE}-ISOLATION-001
用例名称: 机构数据隔离验证
优先级: P1
前置条件:
  - 准备两个不同机构的测试账号
  - 每个机构有独立的业务数据
测试步骤:
  - 步骤1: 使用机构A账号登录，执行查询，记录结果集
  - 步骤2: 使用机构B账号登录，执行相同查询，记录结果集
  - 步骤3: 对比两个结果集，确认无交叉数据
预期结果:
  - 机构A只能看到本机构及下级机构数据
  - 机构B只能看到本机构及下级机构数据
  - 两个机构的数据无交叉
```

## 测试环境配置补充

### 前端开发服务器配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 端口 | 8091 | 前端开发服务器端口 |
| 热更新 | 开启 | 修改Vue文件后自动刷新 |
| 编译时间 | 5-8分钟 | 首次启动编译时间 |
| 代理配置 | webpack.dev.conf.js | API请求代理到后端 |

### 后端服务配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 端口 | 8010 | SpringBoot服务端口 |
| 上下文路径 | /bemp-served/ | API基础路径 |
| 启动时间 | 3-5分钟 | 等待Started日志 |
| 日志级别 | INFO | 可在application.yml调整 |

### 浏览器配置

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| 浏览器 | Chrome | Playwright推荐使用Chrome |
| 视口大小 | 1920x1080 | 全屏模式避免响应式布局问题 |
| 无头模式 | 默认开启 | 调试时使用--no-headless |
| 截图格式 | PNG | 全页截图便于问题定位 |

## 状态流转测试标准

### 完整状态机定义

承兑行额度管理的状态机：

```
草稿(0) ──提交复核──→ 待复核(1) ──复核──→ 已复核(5)
   ↑                    │                    │
   └────撤销提交────────┘                    │
                        ↑                    │
                        └────撤销复核─────────┘
```

| 状态值 | 状态名称 | 可执行操作 |
|--------|---------|-----------|
| 0 | 草稿 | 修改、删除、提交复核 |
| 1 | 待复核 | 撤销提交、复核 |
| 5 | 已复核 | 撤销复核 |

### 正向流转测试

每个状态变更都需要独立验证：

| 测试用例 | 初始状态 | 操作 | 预期状态 |
|---------|---------|------|---------|
| TC-CREDITBATCH-FLOW-001 | 草稿(0) | 提交复核 | 待复核(1) |
| TC-CREDITBATCH-FLOW-002 | 待复核(1) | 复核 | 已复核(5) |

### 逆向回退测试

撤销操作验证：

| 测试用例 | 初始状态 | 操作 | 预期状态 |
|---------|---------|------|---------|
| TC-CREDITBATCH-REVERT-001 | 待复核(1) | 撤销提交 | 草稿(0) |
| TC-CREDITBATCH-REVERT-002 | 已复核(5) | 撤销复核 | 待复核(1) |

### 跨页面验证

额度申请页面提交后，需导航到额度复核页面验证状态：

1. 在额度申请页面创建批次并提交复核
2. 通过菜单导航到额度复核页面
3. 在复核页面 DataGrid 中查找对应记录
4. 验证状态为"待复核"
5. 在复核页面执行复核操作
6. 返回额度申请页面验证状态已变为"已复核"

### 状态守卫验证

非预期状态的操作应被拒绝：

| 测试用例 | 当前状态 | 尝试操作 | 预期结果 |
|---------|---------|---------|---------|
| TC-CREDITBATCH-GUARD-001 | 草稿(0) | 复核 | 操作不可用或提示错误 |
| TC-CREDITBATCH-GUARD-002 | 已复核(5) | 删除 | 操作不可用或提示错误 |
| TC-CREDITBATCH-GUARD-003 | 待复核(1) | 修改 | 操作不可用或提示错误 |

## BEMP 特定断言模式

### 状态列文本断言

```javascript
// playwright_evaluate: 提取DataGrid中指定行的状态文本
const rows = document.querySelectorAll('.h-datagrid tbody tr');
const statusColIndex = 4;
const statusText = rows[0].querySelectorAll('td')[statusColIndex].textContent.trim();
const statusMap = {'0': '草稿', '1': '待复核', '5': '已复核'};
statusText === statusMap['1']
```

### DataGrid 行数断言

```javascript
// playwright_evaluate: 验证DataGrid行数
const rowCount = document.querySelectorAll('.h-datagrid tbody tr').length;
rowCount > 0
```

### API 路径前缀断言

```javascript
// playwright_evaluate: 验证捕获的API请求包含个性化前缀
const requests = window.__capturedRequests || [];
requests.some(r => r.includes('/hnnxbank/'))
```

### 弹窗可见性断言

```javascript
// playwright_evaluate: 验证弹窗是否可见
!!document.querySelector('.h-msg-box:visible')
```

### 控制台错误断言

使用 `playwright_console_logs` 获取控制台日志，过滤 TypeError/ReferenceError：

- 无 TypeError / ReferenceError → PASS
- 存在 TypeError / ReferenceError → FAIL
- 仅 Warning → 记录但不阻塞
