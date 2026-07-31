---
alwaysApply: true
---
# 流程闭环铁律
1. 流程必须走到"输出交付文档"，不得中途结束
2. 每阶段完成→输出交接声明→立即执行下一阶段，禁止等待用户确认
3. TodoWrite 跟踪全流程；受阻/降级状态须标注（⚠/⏸），未关闭时列表不得清空

# 智能体调用铁律
1. 所有阶段任务必须通过 Task 工具调用对应智能体
2. 禁止在主对话中直接执行技能任务（PowerShell/Maven/jar）
3. **智能体退化处理**：子智能体输出重复性乱码/token 耗尽/自我评价为不可用时，立即停止追加 prompt、标"⚠ 降级"、按降级规则推进；不得在主对话中绕过智能体通道手工补做
4. MCP 不可用时输出降级方案而非跳过；前置检查失败→输出修复建议

# 流程路径
完整开发：需求梳理→需求确认→方案设计→代码同步→代码开发/适配器开发→代码评审修复→代码质量扫描→启动服务‖测试用例编制→用例评审→功能测试→二轮调试测试→缺陷修复验证→输出交付文档→[用户反馈迭代]
快速测试：跳过开发四步，保留"启动服务‖测试用例编制→用例评审→功能测试→二轮调试→缺陷修复→交付文档"

> ‖ 前后无依赖可并行；**"用户反馈迭代"**（2026-06-02 新增）：交付后用户反馈 4 类问题——格式不符/缺目录/编号冲突/图表专业，迭代生成 v{n+1}.docx；每次迭代 TodoWrite 写"迭代目标"、交接声明说明"修复了XX问题"

# 阶段映射
| 阶段 | 智能体 | 技能 |
|------|--------|------|
| 需求梳理/确认 | bill-requirement-analyst | bemp-generate-prd |
| 方案设计/代码开发 | bemp-personalized-developer | bemp-personalized-dev |
| 适配器开发 | bemp-adapter-developer | bemp-adapter-dev |
| 代码同步 | bemp-implementation-engineer | bemp-git-maven-automation |
| 代码评审修复 | bemp-personalized-developer（适配器自查由 bemp-adapter-developer） | bemp-frontend-code-review + bemp-backend-code-review |
| 代码质量扫描 | bemp-implementation-engineer | bemp-sonarqube-mcp |
| **启动服务** | **bemp-implementation-engineer** | **bemp-automation-startserver（强制 -PreCheck + 走 start-bemp-env.ps1）** |
| 测试用例编制/功能测试 | bemp-auto-tester | bemp-testcase-generator / bemp-webapp-testing |
| 用例评审 | test-lead-reviewer | - |
| 二轮调试测试 | chrome-devtools-debugger | bemp-chrome-devtools-test |
| 缺陷修复验证 | bemp-personalized-developer（修复）+ bemp-auto-tester / chrome-devtools-debugger（验证） | bemp-personalized-dev + bemp-webapp-testing / bemp-chrome-devtools-test |
| 输出交付文档 | document-delivery-engineer | bemp-advanced-doc-generator |

# 并行规则
- 启动服务 ‖ 测试用例编制 | 前端评审 ‖ 后端评审
- SpringBoot 依赖 Redis+ZooKeeper 就绪，Frontend 无启动依赖
- **启动服务前必 PreCheck**；PreCheck 失败→列失败项+修复建议，不跳过启动

# 门禁速查
| 门禁 | 通过条件 | 不通过处理 |
|------|---------|-----------|
| 需求确认 | 无阻塞项 或 不涉核心流程 | 阻塞核心→等确认；可假设→标"测试假设" |
| **启动服务** | **PreCheck PASS + 走 start-bemp-env.ps1 脚本通道 + Status 全 UP** | **脚本不可用→降级 mvn/jar+记录；PreCheck 失败→不启动；非 UP→抓日志定位** |
| 用例评审 | 严重=0 且 主要=0 | 严重>0→回退用例编制；主要>0→执行前修复 |
| 缺陷闭环 | P0/P1 全部修复验证通过 | P2/P3 记录"已知问题"，交付文档中列出 |
| 代码评审修复 | 修复后原评审智能体验证通过 | 不通过→重新修复，不得跳过验证 |
| 代码质量扫描 | SonarQube 可用+Token 有效+结果上传成功 | 服务不可用→启动；Token无效→提示配置；未上传→重扫 |

# 降级处理规则
## 智能体降级（子智能体退化循环/token 耗尽/输出不可用）
- 不得在主对话中手工补做越过智能体通道
- 标当前阶段"⚠ 降级"+写 integration-test-deferred.md 等降级记录文件
- 记录降级原因/影响范围/回归计划；交付文档"已知问题"章节明确列出

## 服务降级（MCP/外部服务不可用）
| 场景 | 降级方案 |
|------|---------|
| SonarQube MCP 不可用 | sonar-scanner CLI |
| SonarQube 服务未启动 | 启动后重扫 |
| Token 无效 | 提示用户配置后重扫 |

## 工具降级（生成类不可用）
| 场景 | 降级方案 |
|------|---------|
| 图表生成 | drawio → mcp-server-chart → graphviz → antv → matplotlib → 占位文字（5级降级链，详见 chart-tools.json） |

# 回退规则
| 发现阶段 | 回退到 | 触发条件 |
|---------|--------|---------|
| 代码开发 | 方案设计 | 需求理解偏差致方案不可行 |
| 代码评审 | 代码开发 | 评审发现架构/规范问题 |
| 功能测试 | 代码开发 | 测试发现功能性缺陷 |
| 功能测试 | 测试用例编制 | 用例覆盖不足 |
| 二轮调试 | 代码开发 | 缺陷根因在代码层面 |
| 代码质量扫描 | 代码评审修复 | 扫描发现严重问题 |
> 用例评审回退→见门禁速查。回退时更新 TodoWrite、后续阶段标 pending；仅修复后从回退点推进；同一阶段最多 3 次，超限暂停与用户确认；回退原因和影响范围须在交接声明中注明

# 缺陷分派
| 缺陷类型 | 修复 | 验证 |
|---------|------|------|
| 前端/后端缺陷 | bemp-personalized-developer | bemp-auto-tester 或 chrome-devtools-debugger |
| 测试数据/配置问题 | bemp-implementation-engineer | bemp-auto-tester |
> 修复→验证双重确认才算关闭，验证与修复不能同角色；P0/P1修复后必须回归验证
