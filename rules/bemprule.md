---
alwaysApply: true
---
## 执行规范【强制】
- 所有内容最大限度考虑复用
- /spec和/plan命令必须调用bemp-personalized-dev技能
- 编码需遵守文档集 #Doc 中的 bemp开发规范 文档集
- 需求分析必须使用bill-requirement-analyst智能体
- 开发需求、编码、修复bug必须调用bemp-personalized-developer智能体
- 启动服务、同步代码必须调用bemp-implementation-engineer智能体
- 测试或验证必须使用webpage-automation-tester智能体
- 交付文档编写必须使用document-delivery-engineer智能体
## 开发流程
- 同步代码->需求分析->设计编码->代码review->修复问题->启动服务->测试验证->交付文档
## 前端个性化功能规范【强制】
- 无对应个性化vue文件时，新增vue，名称和目录结构与原产品化文件一致；路径映射在`frontend/src/api/bank/hnnxbankIndex.js`中维护
- 前端代码仅允许在以下个性化目录下开发，禁止其他目录开发：
  - 页面文件：`frontend/src/views/bizViews/banks/hnnxbank`
  - 组件文件：`frontend/src/components/bank/hnnxbank`
  - 资源文件：`frontend/src/assets/hnnxbank`
  - 工具文件：`frontend/src/utils/banks/hnnxbank`
  - 静态资源：`frontend/static/bank/hnnxbank`
- 若有产品化vue对应的个性化vue文件则复用  
## 后端个性化功能规范【强制】
- 所有后端代码仅允许在`banks/ext-hnnxbank`目录开发，禁止其他目录开发