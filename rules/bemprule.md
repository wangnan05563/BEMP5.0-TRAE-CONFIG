---
alwaysApply: true
---
## 执行规范【强制】
- 最大限度考虑复用
- /spec和/plan命令必须调用bemp-personalized-dev技能和bill-requirement-analyst智能体先做需求分析
- 开发需求、编码、修复bug调用bemp-personalized-developer智能体
- 启动服务、同步代码调用bemp-implementation-engineer智能体
- 测试或验证调用bemp-auto-tester智能体
- 交付文档编写调用document-delivery-engineer智能体
## 开发流程【强制】
- 同步代码【bemp-implementation-engineer智能体】->需求分析【bill-requirement-analyst智能体】->设计编码【bemp-personalized-developer智能体】->代码review->修复问题->启动服务【bemp-implementation-engineer智能体】->测试验证【bemp-auto-tester智能体】-> 二轮测试验证【chrome-devtools-debugger智能体】->交付文档【document-delivery-engineer智能体】
## 前端个性化功能规范【强制】
- 无对应个性化vue文件时，新增vue，名称和目录结构与原产品化文件一致；路径映射在`frontend/src/api/bank/hnnxbankIndex.js`中维护
- 前端代码仅允许在以下个性化目录下开发，禁止其他目录开发：
  - 页面文件：`frontend/src/views/bizViews/banks/hnnxbank`
  - 组件文件：`frontend/src/components/bank/hnnxbank`
  - 资源文件：`frontend/src/assets/hnnxbank`
  - 工具文件：`frontend/src/utils/banks/hnnxbank`
  - 静态资源：`frontend/static/bank/hnnxbank`
## 后端个性化功能规范【强制】
- 所有后端代码仅允许在`banks/ext-hnnxbank`目录开发，禁止其他目录开发