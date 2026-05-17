# BEMP 前端代码审查技能

审查BEMP工程各银行个性化模块的前端代码。**自动化脚本一键扫描 + 人工逐项审查**双模式，支持 12 家银行配置切换。

## 功能特性

| 功能 | 描述 |
|------|------|
| **自动化扫描** | 3 个 Node.js 脚本覆盖硬编码中文、路由完整性、国际化覆盖率 |
| **多银行切换** | 配置驱动，支持 12 家银行，`--bank=xxx` 临时切换或修改配置文件永久切换 |
| **四级问题分级** | 🔴阻塞 / 🟠严重 / 🟡警告 / 🟢提示，阻塞级必须修复后进入人工审查 |
| **完整规范覆盖** | 16 项审查规范：目录结构、国际化、API、组件、样式、异步、安全、性能等 |

## 目录结构

```
bemp-frontend-code-review/
├── SKILL.md                              # 技能完整规范（157行，含16项审查规范）
├── README.md                             # 使用说明（本文件）
├── report-template.md                    # 审查报告模板（四级别问题 + 修复验证）
├── scripts/
│   ├── review-config.json                # 银行配置：默认银行、12家可用银行、路径模板
│   ├── config-loader.js                  # 共享配置加载模块（--bank=xxx CLI覆盖）
│   ├── check-all.js                      # 一键全量检查：串行执行3个脚本 + 汇总结果
│   ├── check-hardcode.js                 # 硬编码中文检测：按钮/表单/弹窗标题的中文
│   ├── check-routes.js                   # 路由注册完整性：Vue文件↔路由映射 双向校验
│   ├── check-i18n.js                     # $t() 国际化覆盖：多语言同步 + 逐文件覆盖率
│   ├── package.json                      # npm 配置（check-all/check-hardcode/check-routes/check-i18n）
│   └── examples/
│       └── async-patterns.js             # 异步处理代码模板（async/then正确示例 + 错误示例）
```

## 快速开始

### 1. 运行自动化扫描

```bash
# 默认银行（review-config.json 中配置的 bankName）
node .trae/skills/bemp-frontend-code-review/scripts/check-all.js

# 指定银行（临时切换，不修改配置文件）
node .trae/skills/bemp-frontend-code-review/scripts/check-all.js --bank=jinzbank

# 单独运行某个检查
node .trae/skills/bemp-frontend-code-review/scripts/check-hardcode.js
node .trae/skills/bemp-frontend-code-review/scripts/check-routes.js
node .trae/skills/bemp-frontend-code-review/scripts/check-i18n.js
```

### 2. 切换银行

**方式 A — 永久切换**：编辑 `scripts/review-config.json` 的 `bankName` 字段

```json
{
  "bankName": "jinzbank",
  "availableBanks": [
    "hnnxbank", "huisbank", "jinzbank", "huzbank",
    "hxbank", "yibbank", "tianjbank", "shaoxbank",
    "qinnbank", "nmgbank", "hlsecurity", "fxbank"
  ]
}
```

**方式 B — 临时切换**：命令行加 `--bank=xxx`

### 3. 审查工作流

```
编码完成 → 运行 check-all.js → 修复 🔴阻塞问题 → 人工逐项审查 → 输出审查报告
```

## 自动化检查脚本详解

### check-hardcode.js — 硬编码中文文本检测

| 检测项 | 严重程度 | 检测规则 |
|--------|---------|---------|
| `<h-button>` 按钮文本 | 🔴 阻塞 | 标签内直接出现中文且未使用 `$t()` |
| `<h-form-item>` label 属性 | 🔴 阻塞 | `:label` 属性值直接使用中文 |
| `<h-msg-box>` / 弹窗标题 | 🔴 阻塞 | slot="header" 内中文文本 |

**排除规则**：placeholder、info、content 属性中的中文允许硬编码，注释中的中文豁免。

### check-routes.js — 路由注册完整性检查

| 检测项 | 严重程度 | 检测规则 |
|--------|---------|---------|
| Vue 文件未注册路由 | 🔴 阻塞 | 银行目录下每个 `.vue` 文件必须在 `{bankName}Index.js` 有映射 |
| 路由映射指向的文件不存在 | 🔴 阻塞 | `{bankName}Index.js` 中注册的组件路径必须有对应 `.vue` 文件 |
| 路由路径格式问题 | 🟡 警告 | 路径以 `//` 开头等不规范格式 |

### check-i18n.js — $t() 国际化覆盖率检查

| 检测项 | 严重程度 | 检测规则 |
|--------|---------|---------|
| zh-CN.js ↔ en-US.js 键值不一致 | 🔴 阻塞 | 两文件键值数量不同步 |
| 某键在对方文件中缺失 | 🟠 严重 | zh-CN.js 有但 en-US.js 无（或反之） |
| 文件覆盖率 < 60% | 🟠 严重 | `$t()` 使用次数 / ($t()次数 + 硬编码中文处数) |
| 文件覆盖率 < 80% | 🟡 警告 | 同上，但阈值不同 |

脚本输出逐文件的 `$t()` 使用次数、中文处数、覆盖率表格。

## 审查规范（16项）

### 目录与文件

| # | 规范 | 级别 | 要点 |
|---|------|------|------|
| 1 | **目录结构** | 强制 | 所有代码在 `frontend/src/views/bizViews/banks/{bankName}` 下，子目录名与产品化一致 |
| 2 | **个性化文件** | 强制 | 产品化vue对应的个性化vue必须存在，`{bankName}Index.js` 维护路径映射 |

### 国际化与API

| # | 规范 | 级别 | 要点 |
|---|------|------|------|
| 3 | **国际化** | 强制 | 按钮/标签/弹窗标题用 `$t()`，设计原则：UI框架层国际化，业务一次性提示硬编码 |
| 4 | **API调用** | 强制 | 路径与后端 `@RequestMapping` 一致，禁止 `extParam`，三种参数场景按后端接收方式处理 |

### 组件与代码质量

| # | 规范 | 级别 | 要点 |
|---|------|------|------|
| 5 | **组件使用** | 强制 | 优先复用已有组件，检查 `components/`、`frontend/src/components/`、同模块其他vue |
| 6 | **代码质量** | 推荐 | 关键逻辑中文注释、缩进格式化、Vue 2.6.12 编码风格 |
| 7 | **模板** | 推荐 | v-bind/v-if/v-for 语法正确、表单验证规则完整、事件绑定正确 |
| 8 | **UI组件** | 推荐 | 使用项目统一 h_ui 组件库，布局符合设计规范 |

### 路由与状态

| # | 规范 | 级别 | 要点 |
|---|------|------|------|
| 9 | **路由** | 强制 | router/index.js 正确注册，路径与 `{bankName}Index.js` 映射一致 |
| 10 | **状态管理** | 推荐 | Vuex store 模块划分合理，actions/mutations/getters 使用正确 |

### 质量与安全

| # | 规范 | 级别 | 要点 |
|---|------|------|------|
| 11 | **异步处理** | 强制 | async/await 错误处理、禁止遗漏 this 绑定、防竞态、loading/disabled 防重复提交 |
| 12 | **样式** | 强制 | `<style scoped>` 防污染、禁止 `!important`（除非覆盖第三方库且有注释） |
| 13 | **性能** | 强制 | 大列表分页、v-for 唯一:key 禁用 index、computed 替代模板复杂表达式 |
| 14 | **安全性** | 强制 | 禁止 v-html 渲染用户输入、禁止硬编码密码/token/密钥 |

### 多语言与权限

| # | 规范 | 级别 | 要点 |
|---|------|------|------|
| 15 | **多语言同步** | 强制 | zh-CN.js 和 en-US.js 键值结构完全一致，命名 `{bankName}.{模块}.i.{功能}.{字段}` |
| 16 | **路由权限** | 推荐 | 敏感页面配置权限守卫，hidden 属性正确，路径与后端菜单接口一致 |

代码模板参考：[scripts/examples/async-patterns.js](scripts/examples/async-patterns.js)

## 审查流程（4阶段）

### 第零阶段 — 自动化扫描（优先）

```bash
node .trae/skills/bemp-frontend-code-review/scripts/check-all.js [--bank=xxx]
```

工作流：修复所有 🔴阻塞 → 评估 🟠严重 → 🟡警告入报告

### 第一阶段 — 前置检查

- 文件位置：是否在 `{bankName}` 目录，目录结构与产品化一致
- 路由映射：`{bankName}Index.js` 注册正确，映射路径和组件路径对应

### 第二阶段 — 规范检查

- 国际化：按钮/标签用 `$t()`，hardcode 项在排除范围内
- API：路径一致、参数格式匹配（extParam 禁止）、HTTP 方法正确
- UI风格：组件复用、输入框/弹窗/按钮风格一致

### 第三阶段 — 质量检查

- 代码质量：中文注释、格式化规范、Vue 2.6.12 风格、无冗余代码
- 异步处理：try-catch 或 .catch()、错误提示、防重复提交
- 样式安全：scoped、v-for 有 key、无 v-html 渲染用户输入

### 第四阶段 — 输出报告

汇总问题 → 按严重程度分类 → 给出改进建议 → 标记必修项。报告模板见 [report-template.md](report-template.md)。

## 问题分级标准

| 级别 | 含义 | 处理方式 | 典型示例 |
|------|------|---------|---------|
| 🔴 **阻塞** | 违反强制规范，致功能异常 | **必须修复才通过** | 文件不在银行目录、未注册路由、按钮硬编码、API路径不一致、使用extParam |
| 🟠 **严重** | 潜在问题或反最佳实践 | 强烈建议修复 | 未复用组件、UI不一致、缺注释、错误处理不完善、空指针风险 |
| 🟡 **警告** | 风格/轻微规范问题 | 建议修复 | 缩进不规范、变量命名不规范、冗余代码、注释不清晰 |
| 🟢 **提示** | 优化建议 | 可选采纳 | 性能优化建议、代码简化建议 |

## 常见问题排查

| 现象 | 原因 | 解决方案 |
|------|------|---------|
| 国际化不显示 | 未在 zh-CN.js 定义或键名拼写错误 | 添加键值对，检查命名规范 |
| UI风格不一致 | 未参考现有组件，使用原生HTML | 复用已有组件，保持风格一致 |
| API调用报错 | extParam 格式、路径拼写/方法不匹配 | 用 requestDto 格式，核对路径和HTTP方法 |
| 表单验证不生效 | 验证规则配置错误 | 检查 rules 属性配置 |

## 正确 vs 错误对照

**✅ 正确示例**：
```vue
<h-button :loading="submitFlag">{{ $t("m.i.common.commit") }}</h-button>
```
- 使用 `$t()` 国际化
- 保留 `name` 属性
- methods 用箭头函数
- `{bankName}Index.js` 有路由映射

**❌ 错误示例**：
```vue
<h-button>提交</h-button>
```
- 按钮文本硬编码（应使用 `$t()`）
- 缺 `name` 属性
- 缺 `.bind(this)`
- `{bankName}Index.js` 无路由映射

## 参考文件

- [技能完整规范](SKILL.md) — 16 项审查规范的完整说明 + 判断标准 + 审查示例
- [审查报告模板](report-template.md) — 标准化审查报告格式（基本信息/问题列表/审查结论/修复验证）
- [异步代码模板](scripts/examples/async-patterns.js) — async/await + .then() 正确示例 + 常见错误
- [银行配置](scripts/review-config.json) — 12 家银行名称 + 路径模板