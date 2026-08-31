# 陷阱分片：导航与页面管理（navigation）

> 代码 SSoT 原则：菜单点击等通用代码见 [tool-mapping.md §片段库-菜单导航](../tool-mapping.md#菜单导航) 与 [片段库-页面状态检测](../tool-mapping.md#页面状态检测)。

## 症状速查

| 症状 | 陷阱 |
|------|------|
| 导航到错误页面 | 陷阱3 |
| 选择器找不到元素 | 陷阱4 |
| 数据未加载完成就断言 | 陷阱5 |
| URL导航后页面空白 | 陷阱8 |
| 页面变为 about:blank | 陷阱19 |

---

## 陷阱3：菜单导航搜索歧义（P1）

**现象**：菜单搜索"额度复核"等关键词，进入错误页面（通用模块而非当前银行个性化页面）。

**根因**：不同银行共享相似菜单名，搜索匹配排序不可控。

**标准方案**：
- 方案A（最可靠）：直接 URL `navigate_page`（前提：路由已注册，见陷阱8）
- 方案B：菜单树逐级展开 → 精确文本匹配 click（菜单树配置见 [config](../../config/bemptest-config.json) `selectors_by_bank.{bank_profile}.menu_tree`）

**不推荐**：搜索后盲点第一个结果；"复核"等宽泛词搜索。

---

## 陷阱4：select_page 索引漂移（P2）

**现象**：硬编码页面索引 `select_page(1)` 因弹窗开关变化选错页面。

**标准方案**：操作前先 `list_pages` → 按 URL 内容匹配目标页面 → 再 select_page。

**最佳实践**：用 URL 内容而非索引识别页面；禁用硬编码索引。

---

## 陷阱5：wait_for_timeout 硬编码等待不可靠（P2）

**现象**：`wait_for_timeout(2000)` 等数据加载，等待不足或浪费时间。

**标准方案**：优先语义化等待 `wait_for: networkidle` 或等待特定元素出现。仅动画过渡（弹窗 500ms）和非网络 UI 更新用固定等待。

---

## 陷阱8：Vue动态路由直接URL导航失败（P0）

**现象**：`navigate_page` 直接访问个性化路由（如 `#/pc/credit/acceptBankCreditGrantBatch`）页面空白或404。

**根因**：Vue 懒加载路由，银行个性化路由不在初始路由表，需菜单点击触发 `mergeMenus()` 注册后才可访问。

**标准方案**：逐级菜单点击（精确文本匹配）→ 每步 `wait_for(networkidle)` → take_snapshot 确认。代码见 [片段库-菜单导航](../tool-mapping.md#菜单导航)。

**关键**：
- 不同子菜单需分别点击注册（点"额度申请"不会注册"额度复核"）
- 已注册路由当前会话内有效，后续可直接 `navigate_page`

**不推荐**：直接 URL 导航未注册路由；只点父菜单不点子菜单。

---

## 陷阱19：页面变为 about:blank（P1）

**现象**：操作中页面突然变 `about:blank`，上下文丢失，evaluate_script 返回空。

**根因**：CDP 边界行为——`navigate_page` 超时、click 触发导航、连接中断后 MCP 可能重置页面。非 BEMP 问题。

**标准方案**：重新 `navigate_page` → 需要时重新登录 → 路由未注册则走菜单导航（陷阱8）。

**预防**：关键操作前 take_screenshot 留证；避免页面加载中执行 click；长会话每 5 步检查 URL。
