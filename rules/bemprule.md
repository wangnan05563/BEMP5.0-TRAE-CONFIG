---
alwaysApply: true
---
# 流程（强制）
完整开发：需求梳理→需求确认→方案设计→代码同步→代码开发→代码评审修复→代码质量扫描→启动服务(并行)→测试用例编制→用例评审(门禁)→功能测试→二轮调试测试→缺陷修复验证→输出交付文档
快速测试：需求梳理→需求确认→测试用例编制(并行启动服务)→用例评审(门禁)→功能测试→二轮调试测试→缺陷修复验证→输出交付文档

# 阶段映射
| 阶段 | 智能体 | 技能 |
|------|--------|------|
| 需求梳理 | bill-requirement-analyst | bemp-generate-prd |
| 需求确认 | bill-requirement-analyst | - |
| 方案设计 | bemp-personalized-developer | bemp-personalized-dev |
| 代码同步 | bemp-implementation-engineer | bemp-git-maven-automation |
| 代码开发 | bemp-personalized-developer | bemp-personalized-dev |
| 代码评审修复 | bemp-personalized-developer | bemp-frontend-code-review + bemp-backend-code-review |
| 代码质量扫描 | bemp-implementation-engineer | bemp-sonarqube-mcp |
| 启动服务 | bemp-implementation-engineer | bemp-automation-startserver |
| 测试用例编制 | bemp-auto-tester | bemp-testcase-generator |
| 用例评审 | test-lead-reviewer | - |
| 功能测试 | bemp-auto-tester | bemp-webapp-testing |
| 二轮调试测试 | chrome-devtools-debugger | bemp-chrome-devtools-test |
| 缺陷修复验证 | bemp-personalized-developer + bemp-auto-tester | bemp-personalized-dev + bemp-webapp-testing |
| 输出交付文档 | document-delivery-engineer | bemp-advanced-doc-generator |

# 流程驱动（强制执行）
- 阶段不终止，流程必闭环：每个阶段完成后必须推进到下一阶段，禁止在非最后阶段结束
- /spec、/plan 的 verify 完成后必须继续后续流程，不得结束
- 使用 TodoWrite 跟踪全流程，流程未完成时列表不得清空
- 每个阶段完成时必须输出：`[当前阶段]✅ → [下一阶段] | 智能体:[name] | 技能:[skill] | 上下文:[摘要]`
- 流程未到"输出交付文档"，不得报告任务完成

## 交接即执行（强制）
- 输出阶段交接声明后，必须**立即**以下一阶段智能体的身份开始执行下一阶段任务，不得等待用户确认
- 交接声明不是终点，而是下一阶段的起点信号
- 禁止在输出交接声明后停止输出，必须在同一轮回复中继续执行下一阶段
- 示例：需求梳理完成后 → 输出交接声明 → 立即以 bill-requirement-analyst 身份执行需求确认 → 需求确认完成后 → 输出交接声明 → 立即以 bemp-personalized-developer 身份执行方案设计 → ... → 直到输出交付文档

## 流程自检（每阶段完成后必须执行）
1. 当前阶段是否为"输出交付文档"？若是 → 任务完成；若否 → 继续下一步
2. TodoWrite 中是否还有未完成的阶段？若有 → 立即推进；若无 → 检查是否遗漏阶段
3. 是否已输出交接声明？若是 → 必须立即执行下一阶段；若否 → 先输出交接声明再继续

# 并行规则
- 启动服务 与 测试用例编制 无依赖，应并行执行
- 代码评审 的前端评审与后端评审无依赖，应并行执行
- 前端启动与后端启动无依赖，应并行执行
- SpringBoot 依赖 Redis + ZooKeeper 就绪，Frontend 与后端无启动依赖

# 门禁规则
## 需求确认门禁
- 已闭环项：正常进入下一环节
- 未闭环（可假设）：标记"测试假设"，用例中标注假设前提
- 未闭环（不可假设）：标记"阻塞项"，影响核心流程时必须等待确认

## 用例评审门禁
- 通过：严重=0 且 主要=0 → 进入功能测试
- 有条件通过：严重=0 且 主要>0 → 进入，主要问题执行前修复
- 需回退：严重>0 → 回退用例编制修复后重新评审
- 不通过：质量不达标 → 全面重写

## 缺陷闭环门禁
- P0/P1 必须修复验证通过后方可进入交付
- P2/P3 可记录为"已知问题"进入交付，交付文档中明确列出

## 代码评审修复验证门禁
- 评审发现的问题修复后，必须由原评审智能体验证修复是否正确
- 验证不通过时，返回修复环节重新修改，不得跳过验证直接推进
- 前端评审问题由 bemp-personalized-developer 修复，修复后重新执行前端评审验证
- 后端评审问题由 bemp-personalized-developer 修复，修复后重新执行后端评审验证

# 阶段回退机制
当某阶段发现前序阶段遗留问题时，按以下规则回退：
## 回退路径
| 发现阶段 | 可回退到 | 触发条件 | 回退操作 |
|---------|---------|---------|---------|
| 代码开发 | 方案设计 | 需求理解偏差导致方案不可行 | 回退方案设计，重新确认技术方案 |
| 代码评审 | 代码开发 | 评审发现架构/规范问题 | 回退代码开发，修复后重新评审 |
| 功能测试 | 代码开发 | 测试发现功能性缺陷 | 回退代码开发，修复后重新评审+测试 |
| 功能测试 | 测试用例编制 | 用例覆盖不足 | 补充用例后重新评审 |
| 二轮调试 | 代码开发 | 缺陷根因在代码层面 | 回退代码开发，修复后重新测试 |
| 用例评审 | 测试用例编制 | 严重问题>0 | 回退用例编制修复后重新评审 |

## 回退规则
1. 回退时必须更新 TodoWrite，将被回退阶段及后续阶段标记为 pending
2. 回退不意味着全部重做，仅修复发现的问题后从回退点重新推进
3. 同一阶段最多回退3次，超过3次需升级处理（暂停流程，与用户确认）
4. 回退必须记录原因和影响范围，在后续阶段交接声明中注明

# 缺陷分派闭环
## 缺陷生命周期
```
发现缺陷 → 记录(编号/严重度/描述) → 分派修复 → 修复实施 → 验证确认 → 关闭
```

## 分派规则
| 缺陷类型 | 修复智能体 | 验证智能体 |
|---------|-----------|-----------|
| 前端缺陷 | bemp-personalized-developer | bemp-auto-tester 或 chrome-devtools-debugger |
| 后端缺陷 | bemp-personalized-developer | bemp-auto-tester 或 chrome-devtools-debugger |
| 测试数据问题 | bemp-implementation-engineer | bemp-auto-tester |
| 配置问题 | bemp-implementation-engineer | bemp-auto-tester |

## 闭环规则
1. 缺陷必须经过"修复→验证"双重确认才算关闭
2. 验证智能体与修复智能体不能是同一角色（避免自己验证自己）
3. P0/P1 缺陷修复后必须回归验证，确认未引入新问题
4. 缺陷修复验证阶段，bemp-personalized-developer 负责修复，bemp-auto-tester 负责验证

# 服务启动规则
- 启动前检测服务是否已运行，已运行且未要求重启则跳过
- "重启"/"重新启动" = 强制重启，停止旧进程后重新启动
