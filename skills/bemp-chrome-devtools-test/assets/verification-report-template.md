# {模块名称} - Chrome DevTools 功能验证报告

> **模板说明**：复制本文件，替换 `{...}` 占位符为实际内容。

---

## 测试环境
- 前端地址: {frontend_url}
- 后端地址: {backend_url}
- 浏览器: Chrome (Chrome DevTools MCP)
- 测试账号: {username}
- 测试时间: {timestamp}

## 验证目的
{简要说明本次验证的目标}

## 前置条件
- [x] 后端服务已启动（端口 {backend_port}）
- [x] 前端服务已启动（端口 {frontend_port}）
- [x] 已登录系统
- [x] 测试数据已就绪（{data_description}）

---

## 验证步骤

### 一、{阶段名称}

| 步骤 | 操作描述 | 预期结果 | 实际结果 | 状态 | 截图文件名 |
|------|---------|---------|---------|------|-----------|
| 1 | {操作描述} | {预期结果} | {实际结果} | PASS | step1_{desc}.png |
| 2 | {操作描述} | {预期结果} | {实际结果} | PASS | step2_{desc}.png |

---

## 测试结果汇总

| 统计项 | 数量 |
|--------|------|
| 总测试项 | {total} |
| ✅ 通过 | {pass} |
| ❌ 失败 | {fail} |
| ⬜ 未验证（因前置阻塞） | {blocked} |

---

## 控制台错误检测

| 级别 | 数量 | 详情 |
|------|------|------|
| 致命 (TypeError等) | {fatal_count} | {fatal_details} |
| 严重 (ChunkLoadError等) | {critical_count} | {critical_details} |
| 警告 | {warning_count} | {warning_details} |

---

## 缺陷清单

| 编号 | 严重程度 | 模块 | 步骤 | 描述 | 状态 |
|------|----------|------|------|------|------|
| BUG-{num} | {P0/P1/P2} | {module} | 步骤{step} | {description} | {新发现/已修复/待修复} |

### 缺陷详情

**BUG-{num}**: {title}

| 项目 | 内容 |
|------|------|
| **复现步骤** | {steps} |
| **预期结果** | {expected} |
| **实际结果** | {actual} |
| **根因分析** | {root_cause} |
| **影响范围** | {impact} |
| **修复建议** | {suggestion} |

---

## 修复前后对比（二轮验证专用）

| BUG编号 | 修复前状态 | 修复后状态 | 结论 |
|---------|-----------|-----------|------|
| BUG-{num} | {before_status} | {after_status} | {已修复 ✓ / 未修复 ✗} |

---

## 截图索引

| 文件名 | 步骤 | 页面 | 说明 |
|--------|------|------|------|
| {filename} | 步骤{step} | {page_name} | {description} |

---

## 结论

{overall_conclusion}

---

> 报告生成时间: {report_timestamp}
> 由 bemp-chrome-devtools-test Skill 验证生成