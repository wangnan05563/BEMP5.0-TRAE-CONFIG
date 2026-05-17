---
name: "bemp-frontend-code-review"
description: "审查BEMP工程各银行个性化前端代码是否符合项目规范。支持配置切换不同银行，自动化脚本一键扫描 + 人工逐项审查双模式。"
whenToUse: "需要审查BEMP工程各银行个性化前端代码是否符合项目规范"
triggers: "代码/规范/code 走查/审查/审核/把关/review"
---

# BEMP前端代码审查技能

## 功能说明

审查BEMP工程各银行个性化模块的前端代码。先运行自动化脚本，再人工逐项走查。通过 `scripts/review-config.json` 或 `--bank=xxx` 切换银行。

## 🚀 快速开始

```bash
# 默认银行 (review-config.json 中配置)
node .trae/skills/bemp-frontend-code-review/scripts/check-all.js

# 指定银行
node .trae/skills/bemp-frontend-code-review/scripts/check-all.js --bank=jinzbank
```

3 个自动化脚本覆盖：硬编码中文检测 `check-hardcode.js`、路由注册完整性 `check-routes.js`、国际化覆盖率 `check-i18n.js`。

**银行切换**：修改 `scripts/review-config.json` 的 `bankName`（永久）或加 `--bank=xxx`（临时）。可用：`hnnxbank|huisbank|jinzbank|huzbank|hxbank|yibbank|tianjbank|shaoxbank|qinnbank|nmgbank|hlsecurity|fxbank`。

**流程**：`编码完成 → 运行 check-all.js → 修复阻塞问题 → 人工逐项审查`

报告按 🔴阻塞/🟠严重/🟡警告/🟢提示 四级分类。阻塞级必须修复后进入人工审查。

## 审查规范（16项）

### 1. 目录结构
- 【强制】所有代码在 `frontend/src/views/bizViews/banks/{bankName}` 下开发
- 【强制】模块子目录名与产品化目录一致，文件不得混放

### 2. 个性化文件
- 【强制】检查产品化vue对应的个性化vue是否存在，不存在则新增（名和目录结构一致）
- 【强制】在 `frontend/src/api/bank/{bankName}Index.js` 维护路径映射关系

### 3. 国际化
- 【强制】按钮/标签/弹窗标题用 `$t()` 国际化；placeholder/提示信息/确认对话框内容硬编码
- 【强制】检查 `{bankName}/locale/lang/zh-CN.js` 中是否有可复用文本
- **设计原则**：UI框架层可复用文本国际化，业务一次性提示硬编码
- 实现流程：先在zh-CN.js添加键值 → Vue中使用 `$t()` 调用 → 检查是否有可复用键
- 同时必须在 `en-US.js` 中同步（自动化脚本检测）

### 4. API调用
- 【强制】路径与后端 `@RequestMapping` 一致，参数格式匹配后端接收方式
- 三种参数场景：① `HnnxXxxReq req`（DTO直接传对象）② `BaseRequest req`（用 `requestDto` 包装）③ `@RequestBody`（需改Content-Type为application/json）
- ❌ 禁止使用 `extParam`

### 5. 组件使用
- 【强制】优先复用已有组件，UI风格与现有保持一致
- 检查目录：`{bankName}/components/`、`frontend/src/components/`、同模块其他vue
- 复用决策流程：需求分析→组件搜索→代码审查→复用评估→复用/新建

### 6. 代码质量
- 关键逻辑添加中文注释，缩进格式化规范，遵循Vue 2.6.12编码风格

### 7. 模板
- v-bind/v-if/v-for语法正确，表单验证规则完整，事件绑定正确

### 8. UI组件
- 使用项目统一h_ui组件库，布局符合设计规范

### 9. 路由
- router/index.js正确注册，路径与 `{bankName}Index.js` 映射一致，meta信息正确

### 10. 状态管理
- Vuex store模块划分合理，actions/mutations/getters使用正确

### 11. 异步处理
- 【强制】async/await或.then().catch()错误处理；禁止遗漏this上下文绑定
- 【强制】每个异步请求有错误处理分支（retCode != "000000"）；连续异步防竞态
- 提交按钮异步期间设loading/disabled防重复提交
- 代码模板参考：`scripts/examples/async-patterns.js`

### 12. 样式
- 【强制】`<style scoped>` 防污染；复用公共样式类（frame.scss/views.scss）；禁止 `!important`（除非覆盖第三方库且有注释）
- 检查项：[scoped声明 / 深层选择器≤3层 / 主题变量 / 无行内样式]

### 13. 性能
- 【强制】大列表(>100)用分页非全量加载；v-for 绑定唯一:key 禁用 index
- v-show 用于频繁切换，v-if 用于一次性渲染；computed 替代模板复杂表达式
- 大体积弹窗子组件用动态导入 `() => import(...)`

### 14. 安全性
- 【强制】用户输入禁止v-html渲染（用v-text或h_ui内置转义）；禁止硬编码密码/token/密钥
- 检查项：[v-html使用 / 凭证硬编码 / 文件上传限制 / URL参数编码]

### 15. 多语言同步
- 【强制】zh-CN.js 和 en-US.js 键值结构完全一致（check-i18n.js 自动检测）
- 命名：`{bankName}.{模块}.i.{功能}.{字段}`

### 16. 路由权限
- 敏感页面配置权限守卫（meta.permission/auth）；hidden属性正确；路径与后端菜单接口一致

## 审查流程

### 第零阶段-自动化扫描（优先）
```bash
node .trae/skills/bemp-frontend-code-review/scripts/check-all.js [--bank=xxx]
```
修复所有🔴阻塞 → 评估🟠严重 → 🟡警告入报告

### 第一阶段-前置检查
- 文件位置：是否在 `{bankName}` 目录，目录结构一致，命名规范
- 路由映射：`{bankName}Index.js` 注册，映射路径和组件路径正确

### 第二阶段-规范检查
- 国际化：按钮/标签用 $t()，hardcode 项在范围内
- API：路径一致，参数格式匹配（extParam禁用），HTTP方法正确
- UI风格：组件复用，输入框/弹窗/按钮风格一致

### 第三阶段-质量检查
- 代码质量：中文注释、格式化规范、Vue 2.6.12风格、无冗余
- 异步处理：try-catch或.catch()、错误提示、防重复提交
- 样式安全：scoped、v-for有key、无v-html渲染用户输入

### 第四阶段-输出报告
汇总问题 → 按严重程度分类 → 给出改进建议 → 标记必修项
报告模板见 `report-template.md`

## 审查判断标准

| 级别 | 说明 | 处理 |
|------|------|------|
| 🔴 阻塞 | 违反强制规范，致功能异常 | 必须修复才通过 |
| 🟠 严重 | 潜在问题或反最佳实践 | 强烈建议修复 |
| 🟡 警告 | 风格/轻微规范问题 | 建议修复 |
| 🟢 提示 | 优化建议 | 可选 |

**阻塞级**：文件不在 `{bankName}` 目录 | 未注册路由映射 | 按钮/标签硬编码 | API路径不一致 | 参数格式不匹配 | 使用extParam | 语法/编译错误

**严重级**：未复用组件 | UI不一致 | 缺注释 | 验证规则不完整 | 错误处理不完善 | 空指针风险

**警告级**：缩进不规范 | 变量命名不规范 | 冗余代码 | 注释不清晰

## 常见问题排查

| 现象 | 原因 | 解决方案 |
|------|------|---------|
| 国际化不显示 | 未在zh-CN.js定义或键名拼写错误 | 添加键值对，检查命名规范 |
| UI风格不一致 | 未参考现有组件，使用原生HTML | 复用已有组件，保持风格一致 |
| API调用报错 | extParam格式、路径拼写/方法不匹配 | 用requestDto格式，核对路径和HTTP方法 |
| 表单验证不生效 | 验证规则配置错误 | 检查rules属性配置 |

## 审查示例

**✅ 正确**：`<h-button>{{$t("m.i.common.commit")}}</h-button>` + name属性 + 箭头函数methods + hnnxbankIndex.js路由映射

**❌ 错误**：`<h-button>提交</h-button>`（硬编码）+ 缺name属性 + 缺.bind(this) + 无路由映射

## 参考文件
- 异步代码模板：`scripts/examples/async-patterns.js`
- 审查报告模板：`report-template.md`
- 自动化配置：`scripts/review-config.json`