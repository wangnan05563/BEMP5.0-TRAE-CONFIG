---
alwaysApply: true
---
# 流程闭环铁律
1. 流程必须走到"输出交付文档"，不得中途结束
2. 每阶段完成→输出交接声明→立即执行下一阶段，禁止等待用户确认
3. 使用 TodoWrite 跟踪全流程，流程未完成时列表不得清空

# 智能体调用铁律
1. 所有阶段任务必须通过 Task 工具调用对应智能体
2. 禁止在主对话中直接执行技能任务
3. MCP 不可用时，智能体应输出降级方案而非跳过智能体
4. 任一前置检查失败 → 输出修复建议，不得跳过智能体

# 流程路径
完整开发：需求梳理→需求确认→方案设计→代码同步→代码开发/适配器开发→代码评审修复→代码质量扫描→启动服务‖测试用例编制→用例评审→功能测试→二轮调试测试→缺陷修复验证→输出交付文档→[用户反馈迭代]
快速测试：需求梳理→需求确认→测试用例编制‖启动服务→用例评审→功能测试→二轮调试测试→缺陷修复验证→输出交付文档→[用户反馈迭代]

> ‖ 前后阶段无依赖，应并行执行
> **"用户反馈迭代"**（2026-06-02 新增）：交付文档后，用户反馈4类问题——格式不符/缺目录/编号冲突/图表专业。智能体必须基于反馈重新生成 v2/v3/v4...，每次迭代都应：
> 1. 在 TodoWrite 中明确"迭代目标"
> 2. 输出版本号 -v{n+1}.docx
> 3. 交接声明中说明"修复了XX问题"

# 阶段映射
| 阶段 | 智能体 | 技能 |
|------|--------|------|
| 需求梳理 | bill-requirement-analyst | bemp-generate-prd |
| 需求确认 | bill-requirement-analyst | - |
| 方案设计 | bemp-personalized-developer | bemp-personalized-dev |
| 代码同步 | bemp-implementation-engineer | bemp-git-maven-automation |
| 代码开发 | bemp-personalized-developer | bemp-personalized-dev |
| 适配器开发 | bemp-adapter-developer | bemp-adapter-dev |
| 代码评审修复 | bemp-personalized-developer | bemp-frontend-code-review + bemp-backend-code-review |
| 代码质量扫描 | bemp-implementation-engineer | bemp-sonarqube-mcp |
| 启动服务 | bemp-implementation-engineer | bemp-automation-startserver |
| 测试用例编制 | bemp-auto-tester | bemp-testcase-generator |
| 用例评审 | test-lead-reviewer | - |
| 功能测试 | bemp-auto-tester | bemp-webapp-testing |
| 二轮调试测试 | chrome-devtools-debugger | bemp-chrome-devtools-test |
| 缺陷修复验证 | bemp-personalized-developer + bemp-auto-tester | bemp-personalized-dev + bemp-webapp-testing |
| 输出交付文档 | document-delivery-engineer | bemp-advanced-doc-generator |

# 并行规则
- 启动服务 ‖ 测试用例编制 | 前端评审 ‖ 后端评审
- SpringBoot 依赖 Redis+ZooKeeper 就绪，Frontend 无启动依赖

# 门禁速查
| 门禁 | 通过条件 | 不通过处理 |
|------|---------|-----------|
| 需求确认 | 无阻塞项 或 阻塞项不涉核心流程 | 阻塞核心→等待确认；可假设→标"测试假设" |
| 用例评审 | 严重=0 且 主要=0 | 严重>0→回退用例编制；主要>0→执行前修复 |
| 缺陷闭环 | P0/P1 全部修复验证通过 | P2/P3 记录"已知问题"，交付文档中列出 |
| 代码评审修复 | 修复后原评审智能体验证通过 | 不通过→重新修复，不得跳过验证 |
| 代码质量扫描 | SonarQube 服务可用 + Token 有效 + 扫描结果上传成功 | 服务不可用→启动服务；Token无效→提示配置；结果未上传→重新扫描 |

# 降级处理规则
| 场景 | 降级方案 |
|------|---------|
| SonarQube MCP 不可用 | 使用 sonar-scanner 命令行工具 |
| SonarQube 服务未启动 | 启动服务后重新扫描 |
| Token 无效 | 提示用户配置后重新扫描 |

# 回退规则
| 发现阶段 | 回退到 | 触发条件 |
|---------|--------|---------|
| 代码开发 | 方案设计 | 需求理解偏差致方案不可行 |
| 代码评审 | 代码开发 | 评审发现架构/规范问题 |
| 功能测试 | 代码开发 | 测试发现功能性缺陷 |
| 功能测试 | 测试用例编制 | 用例覆盖不足 |
| 二轮调试 | 代码开发 | 缺陷根因在代码层面 |
| 代码质量扫描 | 代码评审修复 | 扫描发现严重问题需修复 |
> 用例评审回退→见门禁速查。回退时更新TodoWrite，后续阶段标记pending；仅修复问题后从回退点推进，非全部重做；同一阶段最多回退3次，超限暂停与用户确认；回退原因和影响范围须在交接声明中注明。

# 缺陷分派
| 缺陷类型 | 修复 | 验证 |
|---------|------|------|
| 前端/后端缺陷 | bemp-personalized-developer | bemp-auto-tester 或 chrome-devtools-debugger |
| 测试数据/配置问题 | bemp-implementation-engineer | bemp-auto-tester |
> 修复→验证双重确认才算关闭，验证与修复不能同角色；P0/P1修复后必须回归验证。
