# BEMP 测试流程复盘文档

> 版本：2.0.0
> 基于机构管理优化需求测试全流程复盘提炼（v1.0）+ W8 河南农信反洗钱需求开发测试全流程复盘增量（v2.0）
> 用途：供后续测试流程参考，避免重复踩坑
>
> **流程规则说明**：标准流程链路图、门禁判定、并行策略、回退规则、缺陷分派、降级处理等流程规则统一定义在 `rules/bemprule.md` 和 `_agent-common.md`，本文件仅保留复盘独有的经验教训。

## 一、已知失败点及规避策略

| 序号 | 失败点 | 根因 | 规避策略 |
|------|--------|------|---------|
| 1 | URL前缀缺失 | 前端 API 路径缺少个性化前缀 | 前端代码评审增加 URL 前缀检查规则 |
| 2 | 后端方法未重写 | 个性化 Controller 未重写产品化方法 | 后端代码评审增加方法覆盖检查 |
| 3 | 截图路径阻塞 | MCP workspace roots 未配置 | 配置 MCP workspace roots 或使用默认路径 |
| 4 | Oracle MCP 只读 | MCP 仅支持 SELECT | 使用 MySQL MCP 或 Java JDBC 执行 DML |
| 5 | Playwright channel 限制 | MCP 不支持 channel='chrome' | 使用 Chrome DevTools MCP 替代 |
| 6 | 任务描述路径错误 | 产品化 vs 个性化文件混淆 | 任务描述明确标注个性化文件路径 |
| 7 | PowerShell 变量丢失 | 嵌套调用 $r 被吃掉 | 避免嵌套调用，使用脚本文件 |
| 8 | Oracle 版本不兼容 | 11.2 不兼容 12c+ | 使用 ojdbc8 驱动 |
| 9 | class 加载优先级 | jar 中 class 优先级低于 classes | 复制 class 到 WEB-INF/classes |
| 10 | fill 工具截断 | 长字符串被截断 | 改用 evaluate_script + Vue $set |
| W8-01 | 弹窗内嵌 Datagrid 首帧空数据 | gridData watcher 无 immediate + autoLoad 空分支 setGridData 被注释，弹窗复用旧实例 | 弹窗内 `v-if` 重建实例 + `:autoLoad="false"`；评审规则已沉淀至 bemp-frontend-code-review check-dialog-component.js（J-HD1） |
| W8-02 | scoped 样式对子组件 render 元素失效 | scoped 属性选择器只命中本组件模板节点 | 移入独立非 scoped 块 + 唯一类名前缀隔离；评审规则 J-SC1 同上 |
| W8-03 | PowerShell 双引号吞占位符 | PS 插值 `${ENV:...}` 产生假失败 | 冒烟命令外层用单引号或写临时脚本文件执行 |
| W8-04 | ZK 端口三处配置错配（2181 vs 21811） | startserver 端口知识未同步测试技能 | 全链统一 `${ENV:BEMP_ZK_PORT:21811}`（W6-02 同源） |

## 二、W8 全流程成功路径（最短可复现）

```
PreCheck + start-bemp-env.ps1 启动 5 服务（全UP）
  → 测试用例承接（bemp-test-common 统一索引）
  → 五段式回归（登录→导航[menu_path配置+叶子dump兜底]→注入→断言[响应/样式/console三通道]→清理落盘）
  → 缺陷双重定位（共享组件源码 ↔ 浏览器组件实例转储互相印证）
  → 最小侵入修复（不动共享框架组件，修复收敛在个性化文件）
  → 回归验证 → 报告落盘（round6_bugfix_regression_report.md + 截图）
```

## 三、适用场景与不适用场景

### 适用场景
- BEMP 票据系统银行个性化开发测试
- 需求驱动的功能测试（有明确PRD）
- Web 端到端测试（前端+后端+数据库）
- 多阶段流程化测试
- Vue2 + H-UI 弹窗/Datagrid/提交阻断类缺陷回归（W8 增补，详见 bemp-chrome-devtools-test/references/regression-patterns.md）

### 不适用场景
- 纯后端 API 测试 → 需 api-test-pro
- 性能测试 → 需 bemp-jmeter-test
- 安全测试 → 需专门安全工具
- 移动端测试 → 需移动端框架
- 非 BEMP 项目 → 流程映射不适用
- Vue3 组件实例遍历（$children 失效，需 findComponent/provide-inject）
