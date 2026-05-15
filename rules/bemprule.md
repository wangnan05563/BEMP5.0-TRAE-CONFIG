---
alwaysApply: true
---
## 执行规范【强制】
- 最大限度考虑复用
- /spec和/plan命令必须调用bemp-personalized-dev技能
- 需求分析调用bill-requirement-analyst智能体
- 开发、设计、需求、编码、修复bug、代码走查调用bemp-personalized-developer智能体
- 启动服务、同步代码调用bemp-implementation-engineer智能体
- 测试或验证调用bemp-auto-tester智能体
- 二轮测试调用chrome-devtools-debugger智能体
- sonarqube扫描调用bemp-implementation-engineer智能体
- 测试用例评审调用test-lead-reviewer智能体
- 交付文档编写调用document-delivery-engineer智能体
## 工作流程【强制】
- 按此流程顺序执行整个开发或测试流程，并尽可能调用智能体完成各阶段工作：同步代码【bemp-implementation-engineer】->需求分析【bill-requirement-analyst】->设计【bemp-personalized-developer】->编码【bemp-personalized-developer】->代码Review与修复【bemp-personalized-developer】->sonarqube扫描功能对应的代码【bemp-implementation-engineer】->启动服务【bemp-implementation-engineer】->测试用例编写【bemp-auto-tester】->测试用例评审【test-lead-reviewer】->测试验证【bemp-auto-tester】->二轮测试验证【chrome-devtools-debugger】->交付文档【document-delivery-engineer】
- 以上步骤形成一个闭环，最终达成可交付标准