---
name: "bemp-frontend-code-review"
description: "审查BEMP工程各银行个性化前端代码是否符合项目规范。支持配置切换不同银行，自动化脚本一键扫描 + 人工逐项审查双模式。"
whenToUse: "需要审查BEMP工程各银行个性化前端代码是否符合项目规范"
triggers: "代码/规范/code 走查/审查/审核/把关/review"
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

## 功能说明

审查BEMP工程各银行个性化模块的前端代码。流程：`编码完成 → 运行 check-all.js → 修复🔴阻塞 → 人工逐项审查 → 输出报告`。当前银行通过统一解析链确定，不在本技能内硬编码。

**单轮闭环默认行为（免确认）**：触发审查后默认不询问，银行取解析链当前值，待审范围取最近变更文件（git status/diff 中的银行目录 vue 文件），直接执行 扫描→人工审查→报告落盘→摘要回复 全流程。仅两种情况询问用户：① 解析出的银行不在 `availableBanks` 白名单；② 待审文件集无法自动确定（如无 git 变更且用户未指定范围）。

> **银行配置统一约定**：当前银行解析链 = `--bank=xxx`（CLI 临时） > 环境变量 `BANK_CODE` > `_shared/env-config.json` 的 `environmentDefaults.BANK_CODE`（单一入口，所有技能共用，切换银行只改 _shared）。`scripts/review-config.json` 仅承载前端审查特有配置（路径模板、可用银行白名单、检查规则阈值），不含当前银行。银行级参数（classPrefix/dtoPrefix 等）与 `bemp-backend-code-review` 的 `config/bank-config.json`、`bemp-adapter-dev` 的银行字典保持同源语义。

## 快速开始

```bash
# 默认银行（由 _shared/env-config.json environmentDefaults.BANK_CODE 决定）
node scripts/check-all.js

# 指定银行（临时，不改任何配置）
node scripts/check-all.js --bank=jinzbank
```

4 个自动化脚本覆盖：硬编码中文检测 `check-hardcode.js`、路由注册完整性 `check-routes.js`、国际化覆盖率 `check-i18n.js`、弹窗组件规约 `check-dialog-component.js`（规则阈值配置于 `scripts/review-config.json` 的 `dialogComponentCheck` 节）。

**银行切换（单一入口）**：永久切换编辑 `_shared/env-config.json` 的 `environmentDefaults.BANK_CODE`（及同文件其它 `BANK_*` 参数）；或会话级 `$env:BANK_CODE = 'xxx'`；临时指定加 `--bank=xxx`（优先级最高）。可用银行白名单见 `scripts/review-config.json` 的 `availableBanks`。

## 审查流程（4阶段）

| 阶段 | 动作 |
|------|------|
| 第零阶段 自动化扫描（优先） | `node scripts/check-all.js [--bank=xxx]`；修复所有🔴阻塞 → 评估🟠严重 → 🟡警告入报告 |
| 第一阶段 前置检查 | 文件位置（在 `{bankName}` 目录、目录结构与产品化一致、命名规范）；路由映射（`{bankName}Index.js` 注册正确） |
| 第二阶段 规范检查 | 国际化（$t() 使用范围）；API（路径一致、参数格式匹配、extParam 禁用）；UI风格（组件复用、风格一致） |
| 第三阶段 质量检查 | 代码质量（中文注释/格式化/Vue 2.6.12风格）；异步处理（错误分支/防重复提交）；样式安全（scoped/v-for key/无v-html） |
| 第四阶段 输出报告 | 汇总问题 → 按严重程度分类 → 改进建议 → 标记必修项；模板见 `report-template.md` |

**扫描输出为紧凑模式**：终端仅显示各脚本通过状态 + 问题行（上限80行），完整明细落盘 `reports/scan-{bank}-{yyyyMMdd}.json`。Agent 读取规则：只读终端汇总段；需问题上下文时 Grep 该 JSON（按脚本名/文件路径定位），禁止要求 `--verbose` 重跑。

**报告输出纪律（省token）**：
1. 问题必须引用规范编号（如"违反规范#4"），禁止复述规范原文
2. 同类问题合并为一条 + 行号列表，不逐行重复描述
3. 仅 🔴/🟠 保留代码片段级详情；🟡/🟢 用单行格式（位置｜一句话｜规范#N）
4. 报告全文写入 `reports/` 目录落盘，对话中只回复：四级计数摘要 + 🔴阻塞项清单（如有）

**⚠ 规范按需加载**：进入第一/二/三阶段人工审查前，Read [references/review-rules.md](references/review-rules.md) 一次（17项规范完整条款、代码示例、排查表），整个会话仅读取一次，自动扫描阶段无需读取。

**代码阅读策略（Grep 定位优先，省token）**：人工审查每个 vue 文件时——
1. 第一遍定向 Grep 违规模式（替代全文阅读）：`extParam|v-html|!important|\.bind\(this\)|key="index"|key: index|:[\u4e00-\u9fa5]'|>\s*[\u4e00-\u9fa5]`
2. 命中行 Read ±5 行片段确认，禁止默认整文件 Read
3. 兜底：定向扫描通过 且 文件 ≤300 行时，才全文走查（覆盖上下文依赖型问题：组件复用/命名/结构）；>300 行按分段走查模板区与 script 区
4. 自动扫描 JSON（reports/scan-*.json）已标记的问题行，直接读 ±5 行确认即可，不重复扫描

## 17项规范索引（完整条款见 references/review-rules.md）

| # | 名称 | 级别 | 一句话要点 |
|---|------|------|-----------|
| 1 | 目录结构 | 强制 | 代码在 `frontend/src/views/bizViews/banks/{bankName}` 下，子目录与产品化一致 |
| 2 | 个性化文件 | 强制 | 产品化vue对应个性化vue必须存在；`{bankName}Index.js` 维护路径映射 |
| 3 | 国际化 | 强制 | 按钮/标签/弹窗标题用 $t()；placeholder/业务一次性提示硬编码 |
| 4 | API调用 | 强制 | 路径与后端 @RequestMapping 一致、参数格式匹配；禁止 extParam |
| 5 | 组件使用 | 强制 | 优先复用已有组件（components/、frontend/src/components/、同模块vue） |
| 6 | 代码质量 | 推荐 | 关键逻辑中文注释、缩进规范、Vue 2.6.12 风格 |
| 7 | 模板 | 推荐 | 语法正确、表单验证规则完整、事件绑定正确 |
| 8 | UI组件 | 推荐 | 统一 h_ui 组件库；h-typefield readonly/disabled 必须用 h-form-item 包裹 |
| 9 | 路由 | 强制 | router/index.js 注册正确，与 `{bankName}Index.js` 映射一致 |
| 10 | 状态管理 | 推荐 | Vuex 模块划分合理，actions/mutations/getters 使用正确 |
| 11 | 异步处理 | 强制 | 错误处理分支（retCode!=000000）、this绑定、防竞态、loading/disabled 防重复提交 |
| 12 | 样式 | 强制 | scoped 防污染、复用公共样式类、禁 !important（覆盖第三方库需注释） |
| 13 | 性能 | 强制 | 大列表分页、v-for 唯一 :key 禁 index、computed 替代复杂表达式、大组件动态导入 |
| 14 | 安全性 | 强制 | 禁 v-html 渲染用户输入、禁硬编码凭证 |
| 15 | 多语言同步 | 强制 | zh-CN.js 与 en-US.js 键值结构完全一致，命名 `{bankName}.{模块}.i.{功能}.{字段}` |
| 16 | 路由权限 | 推荐 | 敏感页面权限守卫（meta.permission/auth）、hidden 正确、路径与后端菜单一致 |
| 17 | 重复逻辑收口 | 强制 | ≥2 页面同构方法必须抽公共 mixin 放 `{bankName}/components/`，差异经配置对象+钩子注入；收口后 Grep 验证无残留 |

## 判断标准与报告

| 级别 | 说明 | 处理 |
|------|------|------|
| 🔴 阻塞 | 违反强制规范，致功能异常 | 必须修复才通过 |
| 🟠 严重 | 潜在问题或反最佳实践 | 强烈建议修复 |
| 🟡 警告 | 风格/轻微规范问题 | 建议修复 |
| 🟢 提示 | 优化建议 | 可选 |

- 🔴 典型：文件不在 `{bankName}` 目录｜未注册路由映射｜按钮/标签硬编码｜API路径不一致｜参数格式不匹配｜使用extParam｜语法/编译错误
- 🟠 典型：未复用组件｜UI不一致｜缺注释｜验证规则不完整｜错误处理不完善｜空指针风险｜同构逻辑多处复制未收口（规范#17）
- 🟡 典型：缩进不规范｜变量命名不规范｜冗余代码｜注释不清晰

## 参考文件
- 17项规范完整条款/代码示例/排查表：`references/review-rules.md`
- 审查报告模板：`report-template.md`
- 异步代码模板：`scripts/examples/async-patterns.js`
- 银行配置（统一）：`config/bank-config.json`（与 backend-code-review、adapter-dev 共用的银行参数单一数据源）
- 前端审查脚本入口配置：`scripts/review-config.json`（路径模板、可用银行列表等前端特有配置）
