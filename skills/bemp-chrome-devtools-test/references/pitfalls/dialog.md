# 陷阱分片：弹窗与 Dropdown（dialog）

> 代码 SSoT 原则：弹窗/Dropdown/Window-Layer/URL验证代码见 [tool-mapping.md §片段库](../tool-mapping.md#evaluate_script-常用代码片段库) 对应小节。

## 症状速查

| 症状 | 陷阱 |
|------|------|
| 页面操作无响应 | 陷阱2 |
| 弹窗重叠无法关闭 | 陷阱14 |
| 新增按钮点击无反应 | 陷阱20 |
| 弹窗出现但不可见 | 陷阱21 |
| 关闭弹窗后页面跳转 | 陷阱22 |

---

## 陷阱2：模态弹窗阻塞页面操作（P0）

**现象**：关闭 DataGrid 弹窗后导航到其他页面，仍卡在弹窗遮罩层上。

**根因**：HUI Modal 用 `position: absolute` 全屏遮罩，异常关闭时 DOM 遮罩未清除，同域再导航被残留遮罩阻挡。

**标准方案**（优先级递减）：
- 方案A（首选）：弹窗内关闭（X 或取消按钮）→ wait_for(弹窗不可见) → take_screenshot 确认
- 方案B（已阻塞）：`new_page` → 重新登录 → 导航目标页
- 方案C（调试用）：强制移除遮罩 → 代码见 [片段库-弹窗操作](../tool-mapping.md#弹窗操作)

**预防**：弹窗操作后立即截图确认关闭；关弹窗后等 500ms；禁用 `close_page` 关含弹窗页面。

---

## 陷阱14：弹窗重叠无法关闭（P1）

**现象**：关导入弹窗后开"批量复制角色"，两弹窗重叠且前者关不掉。

**根因**：弹窗组件关闭时未完全清理 Vue 状态与 DOM。

**标准方案**（按序）：
- 方案A：强制移除残留弹窗 DOM（[片段库-弹窗操作](../tool-mapping.md#弹窗操作)）
- 方案B：刷新当前页重试
- 方案C：new_page 重新登录

**预防**：开新弹窗前 evaluate_script 检查可见弹窗数量；弹窗操作间等 500ms。

---

## 陷阱20：Dropdown 组件操作需两步触发（P0）

**现象**：点击"新增"等按钮无反应，take_snapshot 发现是 `h-dropdown` 组件，下拉未展开。

**根因**：h-dropdown 直接 click 不展开，需先 Vue 实例设 `visible=true`。

**标准方案**：见 [tool-mapping.md 模式10](../tool-mapping.md#模式10dropdown-组件操作) + [片段库-Dropdown组件操作](../tool-mapping.md#dropdown-组件操作)：
`evaluate_script(visible=true) → wait(300ms) → take_snapshot → click(目标项) → wait_for(networkidle)`

**适用**：所有 h-dropdown 按钮（"新增"含子类型、"导出"含格式等）。

---

## 陷阱21：Window-Layer 弹窗被最小化（P1）

**现象**：点"新增/修改"后出现 `window-layer` 元素但看不到内容，弹窗被最小化到底部任务栏。

**根因**：`window-layer` 组件（非标准 h-modal/h-msg-box）默认可能最小化打开。

**标准方案**：见 [tool-mapping.md 模式11](../tool-mapping.md#模式11window-layer-弹窗恢复)：
检测（take_snapshot 找 `.window-layer`）→ Vue 实例恢复（`minimized=false` + `$emit('on-restore')`）→ wait(500ms) → 截图确认。CSS 强制显示为降级方案，代码见 [片段库-Window-Layer弹窗恢复](../tool-mapping.md#window-layer-弹窗恢复)。

---

## 陷阱22：弹窗关闭导致页面路由跳转（P1）

**现象**：关闭弹窗后 URL 跳到 mainIndex 等非目标页，后续操作在错误页面执行。

**根因**：弹窗关闭事件触发 Vue Router 导航守卫或 `router.push()`（window-layer 和嵌套弹窗常见）。

**标准方案**：见 [tool-mapping.md 模式14](../tool-mapping.md#模式14弹窗关闭后路由恢复)：
`click(关闭) → wait(300ms) → evaluate_script 检查 URL hash`（代码见 [片段库-弹窗关闭后URL验证](../tool-mapping.md#弹窗关闭后-url-验证)）→ 若跳转则 `navigate_page` 回目标页 → take_snapshot 确认。

**预防**：每次关弹窗后立即查 URL；用弹窗内按钮关闭而非 `close_page`；频繁跳转时改用 evaluate_script 直接关弹窗。
