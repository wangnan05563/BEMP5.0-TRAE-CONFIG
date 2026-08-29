# BEMP 回归测试模式沉淀（W8 round6 复盘产物）

> 来源：E2E-BUG-001（$msgTip.warning）+ E2E-BUG-003（预检弹窗明细表）修复回归实战。
> 本文档沉淀可复用的回归模式与失败点，配套资产：`assets/regression-script-template.py` + `config/regression-scenarios/*.json`。

## 一、五段式回归骨架（固定流程）

```
登录(账号配置引用) → 导航(菜单链路配置+叶子dump兜底) → 场景注入(数据策略声明)
   → 断言(响应拦截/样式/console三通道) → 清理与日志落盘
```

## 二、关键判断逻辑

| 编号 | 判断 | 规则 |
|------|------|------|
| J1 | 数据策略 | 提交会被前置校验（提示/预检）中断 → `memory_inject`（无脏数据）；需真实状态流转 → `db_prepare` + SQL 模板 |
| J2 | 开窗策略 | UI 操作优先；选中行勾选不可靠（editQuote 前置条件）→ `component_state` 直驱组件状态打开弹窗 |
| J3 | 断言通道 | 值断言用响应拦截 `expect_response`；样式断言用 `getComputedStyle`；行为断言用 console error 监听 |
| J4 | 噪声过滤 | 统一 `error_filters.ignorable_patterns` + 场景级 `console_noise_extra`，新增噪声=改配置不改脚本 |
| J5 | 失败诊断 | 日志 finally 落盘为兜底（PowerShell GBK 管道可能吞 stdout），stdout 仅尽力输出 |

## 三、失败点清单（W6-01 ~ W6-07）

| 编号 | 失败点 | 根因 | 沉淀措施 |
|------|--------|------|---------|
| W6-01 | 回归脚本绕开配置基建，环境值全内联 | 调试技能与用例执行技能配置层未打通 | 场景配置 JSON + 参数化模板脚本 |
| W6-02 | ZK 端口三处配置 2181，实际 21811 | startserver 端口知识未同步测试技能 | env-config/两技能配置已统一 `${ENV:BEMP_ZK_PORT:21811}` |
| W6-03 | findComp 递归 JS 重复 6 次 | 通用工具未沉淀 | 模板内置 `FIND_COMP_JS`/`call_component` |
| W6-04 | 菜单链路三级假设→实测四级 | 链路未配置化 | `navigation.menu_path` 配置 + `leaf_dump_fallback` |
| W6-05 | CLODOP 噪声白名单未随轮次合并 | 报告建议与脚本脱节 | 已合并进两技能 ignorable 配置 |
| W6-06 | 账号/测试数据/断言五要素内联 | 场景未配置化 | `cases[].inject_row/assert` 配置化 |
| W6-07 | 组件状态直驱开窗未声明 | 经验行为未沉淀 | `open_strategy: component_state` + `open_state` 配置 |

## 四、W8 根因定位法（双重定位）

1. **读共享组件源码** + **浏览器组件实例转储**互相印证（如 HDatagrid：gridData watcher 无 `immediate` + `autoLoad` 空分支 `setGridData` 被注释）。
2. 修复遵守最小侵入：**不动共享框架组件**——弹窗内 `v-if` 重建实例 + `:autoLoad="false"`；scoped 样式命中不了子组件 render 元素 → 移入非 scoped 块（类名前缀隔离）。

## 五、适用边界

- ✅ Vue2 + H-UI 组件库弹窗/datagrid/提交阻断类回归；前置校验中断类断言（内存注入）；多银行场景切换。
- ❌ Vue3（`$children` 遍历失效，需改 findComponent/provide-inject）；真实落库状态流转联调；验证码/stdin 交互登录；非 Chromium 兼容测试。

## 六、评测用例提案

1. **配置切换回归**：改场景 JSON 的 `env.frontend_url` 指向另一环境重跑，脚本零改动 → 通过标准：登录+导航 PASS；失败标准：出现任一内联地址。
2. **噪声白名单生效**：注入 CLODOP 报错环境跑回归 → 通过标准：console_errors 不含 CLodop。
3. **菜单链路变更**：menu_path 改成新四级链路 → 通过标准：target_url_fragment 命中且 dump 兜底可定位。
4. **端口一致性**：解析三份配置的 ZK 端口 → 通过标准：均为 21811 且来源单一（`BEMP_ZK_PORT`）。
