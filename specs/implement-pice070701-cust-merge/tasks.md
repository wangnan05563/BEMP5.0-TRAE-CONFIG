# Tasks

- [x] Task 1: 创建PICE070701MessageConverter.java文件
  - [x] SubTask 1.1: 在`banks/ext-hnnxbank/hnnxbank-adapter-as/src/main/java/com/hundsun/bemp/hnnxbank/adapter/msg/server/ecif/`目录下创建PICE070701MessageConverter.java
  - [x] SubTask 1.2: 实现类继承AbstractMessageApplyResponseConverter，添加@Component注解
  - [x] SubTask 1.3: 实现getFunctionIdMapping方法，配置外部服务码"EBBS.0402006.01"与内部功能号"PICE070701"的映射
  - [x] SubTask 1.4: 实现fromMessage方法，解析XML报文并映射外围字段到Ecif4001ReqDto的JSON结构
  - [x] SubTask 1.5: 实现toMessage方法，将Ecif4001ResDto的JSON响应转换为外围系统期望的XML格式

- [ ] Task 2: 代码评审修复
  - [ ] SubTask 2.1: 对PICE070701MessageConverter.java执行后端代码评审（bemp-backend-code-review），确保代码符合河南农商项目规范
  - [ ] SubTask 2.2: 根据评审意见修复发现的问题
  - [ ] SubTask 2.3: 修复后重新执行评审验证，确保严重=0且主要=0

- [ ] Task 3: 代码质量扫描
  - [ ] SubTask 3.1: 对新增代码执行SonarQube质量门禁扫描（bemp-sonarqube-mcp）
  - [ ] SubTask 3.2: 若存在阻断级问题则修复并重新扫描

- [ ] Task 4: 启动服务（与Task 5并行）
  - [ ] SubTask 4.1: 启动Redis、ZooKeeper
  - [ ] SubTask 4.2: 启动SpringBoot后端服务
  - [ ] SubTask 4.3: 启动前端开发服务器
  - [ ] SubTask 4.4: 验证所有服务健康状态

- [ ] Task 5: 测试用例编制（与Task 4并行）
  - [ ] SubTask 5.1: 使用bemp-testcase-generator编制PICE070701功能测试用例，覆盖正常场景与异常场景
  - [ ] SubTask 5.2: 编制单元测试用例：XML报文正常解析验证
  - [ ] SubTask 5.3: 编制单元测试用例：XML报文格式异常处理验证
  - [ ] SubTask 5.4: 编制单元测试用例：响应报文组装正确性验证
  - [ ] SubTask 5.5: 编制集成测试用例：端到端客户合并流程验证

- [ ] Task 6: 用例评审
  - [ ] SubTask 6.1: 执行测试用例评审（test-lead-reviewer），确保严重=0
  - [ ] SubTask 6.2: 若存在严重问题则回退Task 5修复后重新评审

- [ ] Task 7: 功能测试
  - [ ] SubTask 7.1: 使用bemp-webapp-testing执行功能测试用例
  - [ ] SubTask 7.2: 验证消息接收与字段解析正确性
  - [ ] SubTask 7.3: 验证服务调用与响应处理正确性
  - [ ] SubTask 7.4: 记录测试结果，缺陷按严重度分派修复

- [ ] Task 8: 二轮调试测试
  - [ ] SubTask 8.1: 使用bemp-chrome-devtools-test在浏览器端执行二轮回归测试
  - [ ] SubTask 8.2: 确认企业信息报备模块中客户号与账号关联关系正确更新
  - [ ] SubTask 8.3: 验证异常场景（消息格式错误、服务调用失败等）处理正确

- [ ] Task 9: 缺陷修复验证
  - [ ] SubTask 9.1: P0/P1缺陷修复（bemp-personalized-developer修复 → bemp-auto-tester验证）
  - [ ] SubTask 9.2: P2/P3缺陷记录为"已知问题"或修复
  - [ ] SubTask 9.3: 执行回归测试确认修复未引入新问题

- [ ] Task 10: 输出交付文档
  - [ ] SubTask 10.1: 使用bemp-advanced-doc-generator生成详细设计文档（含字段映射关系、处理逻辑说明）
  - [ ] SubTask 10.2: 生成测试用例文档（含正常场景、异常场景、边界条件用例）
  - [ ] SubTask 10.3: 生成测试报告

# Task Dependencies
- Task 1 已完成（代码开发阶段）
- Task 2 → Task 1 完成后方可执行（代码评审依赖代码开发完成）
- Task 3 → Task 2 完成后方可执行（质量扫描在评审修复后进行）
- Task 4 与 Task 5 无依赖，应并行执行
- Task 6 → Task 5 完成后方可执行（用例评审依赖用例编制完成）
- Task 7 → Task 4 + Task 6 完成后方可执行（功能测试依赖服务启动与用例评审通过）
- Task 8 → Task 7 完成后方可执行（二轮测试在功能测试后）
- Task 9 → Task 7 + Task 8 完成后方可执行（缺陷修复在测试发现问题后）
- Task 10 → Task 2~9 全部完成后方可执行（交付文档为最后阶段）
