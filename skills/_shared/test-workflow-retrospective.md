# BEMP 测试流程复盘文档

> 版本：1.0.0
> 基于机构管理优化需求测试全流程复盘提炼
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

## 二、适用场景与不适用场景

### 适用场景
- BEMP 票据系统银行个性化开发测试
- 需求驱动的功能测试（有明确PRD）
- Web 端到端测试（前端+后端+数据库）
- 多阶段流程化测试

### 不适用场景
- 纯后端 API 测试 → 需 api-test-pro
- 性能测试 → 需 bemp-jmeter-test
- 安全测试 → 需专门安全工具
- 移动端测试 → 需移动端框架
- 非 BEMP 项目 → 流程映射不适用
