# 验证报告输出格式标准

## 一、报告结构要求

每份验证报告必须严格按以下结构输出：

```markdown
# {模块名称} - Chrome DevTools 功能验证报告

## 测试环境
- 前端地址: http://127.0.0.1:8091
- 后端地址: http://127.0.0.1:8010
- 浏览器: Chrome (Chrome DevTools MCP)
- 测试账号: {实际使用的用户名}
- 测试时间: {YYYY-MM-DD HH:mm}

## 验证目的
{简要说明本次验证的目标，如"验证BUG-001修复后状态流转功能正常"}

## 验证步骤

| 步骤 | 操作描述 | 预期结果 | 实际结果 | 状态 | 截图文件名 |
|------|---------|---------|---------|------|-----------|
| 1 | ... | ... | ... | PASS | step1_xxx.png |
| n | ... | ... | ... | PASS/FAIL/BLOCKED | stepN_xxx.png |

## 测试结果汇总

| 统计项 | 数量 |
|--------|------|
| 总测试项 | N |
| ✅ 通过 | N |
| ❌ 失败 | N |
| ⬜ 未验证（因前置阻塞） | N |

## 控制台错误检测

| 级别 | 数量 | 详情 |
|------|------|------|
| 致命 (TypeError等) | N | ... |
| 严重 (ChunkLoadError等) | N | ... |
| 警告 | N | ... |

## 缺陷清单（如有）

| 编号 | 严重程度 | 模块 | 步骤 | 描述 | 状态 |
|------|----------|------|------|------|------|
| BUG-XXX | P0/P1/P2 | ... | ... | ... | 新发现/已修复/待修复 |

## 修复前后对比（二轮验证专用）

| BUG编号 | 修复前 | 修复后 | 结论 |
|---------|--------|--------|------|
| BUG-001 | 提交复核报错"发生异常!null" | 状态正常流转0→1 | 已修复 ✓ |

## 截图索引

| 文件名 | 步骤 | 页面 | 说明 |
|--------|------|------|------|
| step1_login_success.png | 1 | 登录页 | 登录成功后的首页 |
| ... | ... | ... | ... |
```

## 二、状态判定标准

### PASS（通过）
同时满足以下条件：
1. 操作结果符合预期结果描述
2. 无 TypeError / ReferenceError 控制台错误
3. 页面无白屏或渲染异常

### FAIL（失败）
任一满足：
1. 操作结果不符合预期
2. 出现 TypeError / ReferenceError
3. ChunkLoadError（组件加载失败）
4. 弹窗无法打开或关闭
5. 提交操作返回错误
6. DataGrid 查询无响应

### BLOCKED（阻塞）
1. 后端/前端服务不可达
2. 登录失败
3. 测试所需数据不存在（且无法自动创建）

## 三、截图规范

### 临时存放路径（验证过程中）
```
aotutests-devtools/screenshots/_incoming/
```
验证过程中的截图临时存放在此目录。验证完成后通过 `organize-screenshots.ps1` 归档。

### 归档路径规则
```
aotutests-devtools/screenshots/{YYYY-MM-DD}/{任务ID}/
```
示例: `aotutests-devtools/screenshots/2026-05-17/credit-20260517-001/`

### 文件命名
```
格式: step{序号}_{操作描述}_{状态}.png
示例:
  step1_login_success.png
  step5_detail_dialog.png
  step6_submit_confirm.png
  step11_review_confirm.png
  step14_undo_review.png
  step16_undo_submit.png
```

### 归档策略
验证完成后运行 `aotutests-devtools/organize-screenshots.ps1 -TaskId "{任务ID}"`，按日期+任务ID两层目录归档。自动生成每任务独立的 `index.md` 截图索引。

## 四、缺陷记录规范

### 编号规则
```
格式: BUG-{三位序号}
示例: BUG-001, BUG-002
```
每次验证任务内连续编号，不与历史BUG编号冲突。

### 严重程度定义

| 级别 | 定义 | 阻塞范围 |
|------|------|---------|
| P0 | 核心功能完全不可用，阻塞后续所有验证 | 全部后续步骤 |
| P1 | 核心功能部分不可用，可绕过 | 当前模块 |
| P2 | 非核心功能异常，不影响主流程 | 单项功能 |

### 缺陷描述模板
```markdown
| BUG-001 | P0 | 额度明细-提交复核 |
**复现步骤**: 1.选中未提交记录 2.点击提交复核 3.确认提交
**预期**: 状态变更为"待复核"
**实际**: 返回"操作失败 - 发生异常!null"
**根因**: Controller未设置requestDto导致NPE
**影响**: 阻塞后续复核流程（步骤9-16）
| 已修复 |
```

## 五、输出语言要求

- 报告标题、章节标题：中文
- 状态标识：PASS / FAIL / BLOCKED（英文）
- 截图文件名：英文+数字
- 缺陷编号：BUG-{数字}

## 六、验收标准

功能验证判定为"全部通过"的条件：
1. 所有步骤状态为 PASS
2. 控制台 0 个致命错误
3. 无新增阻塞性缺陷
4. 所有状态流转截图齐全
5. 修复前后对比截图整齐（二轮验证）

---

## 七、产出文件管理规范

### 报告命名规范

```
格式: {模块名}_{测试类型}_{日期}_v{序号}.md
字段说明:
  - 模块名: credit(额度) / bill(票据) / auth(认证) / ...
  - 测试类型: regression(回归) / bugfix(缺陷修复) / smoke(冒烟) / exploratory(探索性)
  - 日期: YYYYMMDD
  - 序号: v1, v2, ...（同模块同日期递增）

示例:
  credit_regression_20260517_v1.md
  bill_bugfix_20260517_v2.md
  auth_smoke_20260517_v1.md
```

### 报告存放路径

```
aotutests-devtools/reports/{YYYY-MM-DD}/{报告文件名}
```

示例: `aotutests-devtools/reports/2026-05-17/credit_regression_20260517_v1.md`

### 控制台日志命名规范

```
格式: {任务ID}_console_{日期}.json
任务ID格式: {模块名}-{日期}-{序号}
示例: credit-20260517-001_console_20260517.json
```

### 控制台日志存放路径

```
aotutests-devtools/console-logs/{YYYY-MM-DD}/{日志文件名}
```

### 任务ID 命名规范

```
格式: {模块名缩写}-{日期}-{三位序号}
示例:
  credit-20260517-001    — 额度模块，2026-05-17 第 1 次
  bill-20260517-002      — 票据模块，2026-05-17 第 2 次
  auth-20260517-001      — 认证模块，2026-05-17 第 1 次
```

### 索引管理

每次完成验证后，必须在 `aotutests-devtools/index.json` 中记录本次任务元数据：
```powershell
.\aotutests-devtools\manage-index.ps1 -Action add `
  -TaskId "credit-20260517-001" `
  -Module "credit" `
  -TestType "regression" `
  -ReportPath "reports/2026-05-17/credit_regression_20260517_v1.md" `
  -ScreenshotDir "screenshots/2026-05-17/credit-20260517-001" `
  -Status "pass"
```

### 定期清理

每月执行一次清理，自动归档或删除过期内容：
```powershell
# 预览清理范围
.\aotutests-devtools\cleanup-old-tests.ps1 -Preview -Archive

# 归档模式（推荐，保留历史可回溯）
.\aotutests-devtools\cleanup-old-tests.ps1 -RetentionDays 30 -Archive -Force

# 直接删除模式
.\aotutests-devtools\cleanup-old-tests.ps1 -RetentionDays 30 -Force
```