---
alwaysApply: true
---
# 通用强制准则
- 所有开发任务优先遵循代码复用原则
- 不同业务动作固定绑定指定智能体 / 技能，不可随意调用
# 任务 - 智能体绑定清单
- /spec、/plan 指令：调用bemp-personalized-dev技能
- 项目开发/方案设计/代码编写/BUG 修复/代码走查：bemp-personalized-developer
- 常规测试/用例编制/功能测试：bemp-auto-tester
- 二轮调试测试：chrome-devtools-debugger
- 用例评审：test-lead-reviewer
- 开发/测试 前 需求分析/需求梳理：bill-requirement-analyst
- 开发/测试 前 启动服务/代码同步/代码扫描：bemp-implementation-engineer
- 输出交付文档：document-delivery-engineer
# 标准化闭环流程
## 完整开发流程
- 需求梳理→方案设计→代码同步→代码开发→代码评审修复→代码质量扫描→启动服务→测试用例编制→用例评审→功能测试→二轮调试测试→输出交付文档
## 快速测试流程
- 需求梳理→测试用例编制→用例评审→启动服务→功能测试→二轮调试测试→输出交付文档
# 最终要求
- 项目严格依照上述流程顺序执行，全流程闭环落地，确保项目达到正式交付标准。