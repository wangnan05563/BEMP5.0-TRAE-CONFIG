# 陷阱分片：DataGrid 与 HUI 组件（datagrid）

> 代码 SSoT 原则：组件操作代码见 [tool-mapping.md §片段库](../tool-mapping.md#evaluate_script-常用代码片段库) 对应小节，本分片仅保留根因与独有信息。

## 症状速查

| 症状 | 陷阱 |
|------|------|
| 金额修改后未生效 | 陷阱9 |
| readonly 属性不生效（前端代码问题） | 陷阱9.5 |
| 提交复核报ID为空 | 陷阱10 |
| 日期设置后未生效 | 陷阱11 |
| 设置选中后操作无反应 | 陷阱23 |
| 表单字段找不到 | 陷阱24 |

---

## 陷阱9：h-typefield 组件值绑定失效（P1）

**现象**：修改金额字段后提交，列表金额仍是旧值。

**根因**：`document.execCommand('insertText')` 或直接设 `input.value` 不触发 Vue v-model，DOM 修改不同步到 Vue data。

**标准方案**：通过 `__vue__` 实例设 `currentValue` + `$emit('input')`；降级用 value + dispatchEvent。代码见 [片段库-HUI组件表单](../tool-mapping.md#hui-组件表单)。

**不推荐**：`execCommand('insertText')`、`fill`。

---

## 陷阱9.5：h-typefield readonly 属性不生效（P0，前端代码缺陷）

**现象**：h-typefield 设 `readonly` 后输入框仍可编辑。

**根因**：直接用 `:label` 属性时，label 渲染逻辑覆盖 readonly 向内部 input 的传递。

**标准方案**（属前端代码修复，非测试绕过）：h-typefield 包裹在 h-form-item 中，label 移至 h-form-item：

```vue
<!-- 错误：readonly 不生效 -->
<h-typefield :label="$t('m.i.be.buyBackTotalAmt')" v-model="formItem.buyBackTotalAmt" readonly></h-typefield>

<!-- 正确：readonly 生效 -->
<h-form-item :label="$t('m.i.be.buyBackTotalAmt')" prop="buyBackTotalAmt" class="h-form-three">
  <h-typefield v-model="formItem.buyBackTotalAmt" readonly></h-typefield>
</h-form-item>
```

**验证**：`document.querySelector('.h-typefield input[readonly]')` 非空即生效。同样适用于 `disabled` 等需传到内部 input 的属性。

---

## 陷阱10：checkbox 选择后 currentSelectList 未同步（P1）

**现象**：选中行后点"提交复核"报"ID不能为空"。

**根因**：checkbox 点击触发 DOM 事件，但 Vue 内部数据更新异步，立即执行后续操作时选中数据未同步。

**标准方案**：click checkbox → `wait_for_timeout(500ms)` → evaluate_script 验证 `grid.__vue__.currentSelectList.length > 0`（代码见 [片段库-选中行操作](../tool-mapping.md#选中行操作)）→ 确认数量 >0 再提交。

---

## 陷阱11：h-date-picker 无法直接输入（P1）

**现象**：`fill` 或设 `input.value` 后日期未生效，提交时为空。

**根因**：h-date-picker 是复合组件，仅设 input.value 不触发内部日期解析，Vue data 仍为空。

**标准方案**：Vue 实例设 `value` + `$emit('input')`。代码见 [片段库-HUI组件表单](../tool-mapping.md#hui-组件表单)。

**不推荐**：`fill`、input.value + dispatchEvent（仅更新 DOM）。

---

## 陷阱23：DataGrid 行选中需同时设置 selects 和 selectIds（P0）

**现象**：仅设 `currentSelectList` 后点"修改"无反应，或提示"请选择一条记录"。

**根因**：选中状态由多属性共同维护：`currentSelectList`（数据对象数组）、`selects`（部分组件用）、`selectIds`（行 ID 数组）、`currentSelect`（radio 单选）。操作按钮可能检查其中任意一项。

**标准方案**：见 [tool-mapping.md 模式12](../tool-mapping.md#模式12datagrid-行选中vue-实例直设)，完整代码见 [片段库-DataGrid行选中](../tool-mapping.md#datagrid-行选中vue-实例直设完整版)：
同时设置全部 4 属性 → `$forceUpdate()` → wait(500ms) → evaluate_script 验证 → 再点操作按钮。

**不推荐**：仅设任一单属性；仅 click checkbox（同步延迟）。

---

## 陷阱24：v-if 条件字段验证需区分场景（P1）

**现象**：用例要求验证某字段（如回购总金额 buyBackTotalAmt），但页面上找不到或提交时字段不存在。

**根因**：BEMP 表单大量 v-if 条件渲染，字段显示依赖其他表单值（如 buyBackTotalAmt 仅 BT02 买入返售显示，BT03 卖出回购隐藏）。

**标准方案**：见 [tool-mapping.md 模式13](../tool-mapping.md#模式13v-if-条件字段验证)，检测代码见 [片段库-v-if条件字段检测](../tool-mapping.md#v-if-条件字段检测)：
检测可见性 → 不可见则先设触发条件值 → wait(500ms) → 复检 → 可见后设字段值。

**用例设计原则**：
- 每个用例必须明确 v-if 前置条件
- v-if 字段分两组用例：条件 true 验证存在可操作；条件 false 验证不存在
- 用例文档标注 `[v-if]` 标记
