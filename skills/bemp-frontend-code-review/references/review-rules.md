# BEMP 前端审查规范完整条款（17项）

> 本文件为 SKILL.md 规范索引的完整展开，供人工审查阶段按需读取。自动扫描阶段无需读取。

## 1. 目录结构
- 【强制】所有代码在 `frontend/src/views/bizViews/banks/{bankName}` 下开发
- 【强制】模块子目录名与产品化目录一致，文件不得混放

## 2. 个性化文件
- 【强制】检查产品化vue对应的个性化vue是否存在，不存在则新增（名和目录结构一致）
- 【强制】在 `frontend/src/api/bank/{bankName}Index.js` 维护路径映射关系

## 3. 国际化
- 【强制】按钮/标签/弹窗标题用 `$t()` 国际化；placeholder/提示信息/确认对话框内容硬编码
- 【强制】检查 `{bankName}/locale/lang/zh-CN.js` 中是否有可复用文本
- **设计原则**：UI框架层可复用文本国际化，业务一次性提示硬编码
- 实现流程：先在zh-CN.js添加键值 → Vue中使用 `$t()` 调用 → 检查是否有可复用键
- 同时必须在 `en-US.js` 中同步（自动化脚本检测）

## 4. API调用
- 【强制】路径与后端 `@RequestMapping` 一致，参数格式匹配后端接收方式
- 三种参数场景：
  1. `HnnxXxxReq req`（DTO直接传对象）
  2. `BaseRequest req`（用 `requestDto` 包装）
  3. `@RequestBody`（需改Content-Type为application/json）
- ❌ 禁止使用 `extParam`

## 5. 组件使用
- 【强制】优先复用已有组件，UI风格与现有保持一致
- 检查目录：`{bankName}/components/`、`frontend/src/components/`、同模块其他vue
- 复用决策流程：需求分析→组件搜索→代码审查→复用评估→复用/新建

## 6. 代码质量
- 关键逻辑添加中文注释，缩进格式化规范，遵循Vue 2.6.12编码风格

## 7. 模板
- v-bind/v-if/v-for语法正确，表单验证规则完整，事件绑定正确

## 8. UI组件
- 使用项目统一h_ui组件库，布局符合设计规范
- 【强制】h-typefield 设置 readonly/disabled 时必须用 h-form-item 包裹，禁止直接在 h-typefield 上同时使用 :label 和 readonly（readonly 不会传递到内部 input）

```vue
<!-- 错误 -->
<h-typefield :label="$t('key')" v-model="val" readonly></h-typefield>
<!-- 正确 -->
<h-form-item :label="$t('key')" prop="field"><h-typefield v-model="val" readonly></h-typefield></h-form-item>
```

## 9. 路由
- router/index.js正确注册，路径与 `{bankName}Index.js` 映射一致，meta信息正确

## 10. 状态管理
- Vuex store模块划分合理，actions/mutations/getters使用正确

## 11. 异步处理
- 【强制】async/await或.then().catch()错误处理；禁止遗漏this上下文绑定
- 【强制】每个异步请求有错误处理分支（retCode != "000000"）；连续异步防竞态
- 提交按钮异步期间设loading/disabled防重复提交
- 代码模板参考：`scripts/examples/async-patterns.js`

## 12. 样式
- 【强制】`<style scoped>` 防污染；复用公共样式类（frame.scss/views.scss）；禁止 `!important`（除非覆盖第三方库且有注释）
- 检查项：[scoped声明 / 深层选择器≤3层 / 主题变量 / 无行内样式]

## 13. 性能
- 【强制】大列表(>100)用分页非全量加载；v-for 绑定唯一:key 禁用 index
- v-show 用于频繁切换，v-if 用于一次性渲染；computed 替代模板复杂表达式
- 大体积弹窗子组件用动态导入 `() => import(...)`

## 14. 安全性
- 【强制】用户输入禁止v-html渲染（用v-text或h_ui内置转义）；禁止硬编码密码/token/密钥
- 检查项：[v-html使用 / 凭证硬编码 / 文件上传限制 / URL参数编码]

## 15. 多语言同步
- 【强制】zh-CN.js 和 en-US.js 键值结构完全一致（check-i18n.js 自动检测）
- 命名：`{bankName}.{模块}.i.{功能}.{字段}`

## 16. 路由权限
- 敏感页面配置权限守卫（meta.permission/auth）；hidden属性正确；路径与后端菜单接口一致

## 17. 重复逻辑收口
- 【强制】≥2 个页面出现**同构方法**（主体框架逐字一致、仅字段名/数据源/文案差异）时，必须抽取公共 mixin 放 `{bankName}/components/` 下，禁止同构副本在多页面扩散
- **同构副本判定特征**：Promise 框架、接口 URL、弹窗状态字段、降级/提示话术一致，仅入参组装段（字段映射、票据收集）不同
- **差异处理三模式**（不得在公共方法内 if(pageName) 分支硬编码）：
  1. 字段映射配置化：页面 data 提供映射表（如 `submitCheckConfig.antiMoneyFieldMap`：预检入参字段 → 票据 DTO 字段）
  2. 数据源钩子：页面覆盖钩子方法（如 `getSubmitCheckBills()`，默认实现取 `$refs.xxx.tData`，特殊页面覆盖为自有收集函数）
  3. 展示钩子：格式化等展示差异由页面覆盖（如 `formatCheckBillNo(bill)`）
- **收口后必须 Grep 验证**：原方法定义仅存于公共文件；各页面无残留方法定义、无残留 data 字段、无残留 import（组件注册由 mixin 的 components 选项提供）
- 参考实例：`hnnxbank/components/submitCheckMixin.js`（中互金预检 checkAntiMoneyBeforeSubmit + 零利息拦截 checkZeroInterestBeforeSubmit，原 4 页各约 120 行副本收口；quoteSaleChange/quoteRebuyChange/redSaleApplChange 覆盖 formatCheckBillNo，eDiscApplyBatchAdd 覆盖 getSubmitCheckBills）

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
