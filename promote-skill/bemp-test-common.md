# bemp-test-common 反向构建提示词

## 核心功能
BEMP测试体系共享资源层，为bemp-testcase-generator(用例编写)和bemp-webapp-testing(用例执行)提供统一的参考文档、用例文件和用例索引，确保单一数据源。核心原则：功能地图、优先级矩阵、测试标准、数据管理指南、用例文档和用例索引只有一份，由本技能统一管理。

## 关键实现逻辑
- 三技能架构：bemp-test-common(共享资源) → bemp-testcase-generator(用例编写) + bemp-webapp-testing(用例执行)
- 共享资源：references/(功能地图/优先级矩阵/测试标准/数据管理) + test-cases/(按子系统组织的用例文档) + test-index.json(用例索引)
- 用例索引：test-index.json 维护 test-cases ↔ scripts 双向映射，含脚本覆盖/缺失标注
- 用例目录按子系统组织：common(通用/登录)/sm(系统管理)/bm(业务管理)/be(场内交易)/ce(场外交易)

## 输入输出参数
- 输入：无直接输入，被其他技能引用
- 输出：共享参考文档、用例文档、用例索引(test-index.json约288条用例/25条目)

## 主要业务流程
本技能不独立执行任务，作为基础设施层被引用：
1. bemp-testcase-generator引用references/编写用例→写入test-cases/→更新test-index.json
2. bemp-webapp-testing引用references/读取test-cases/→执行验证→更新test-index.json脚本覆盖状态

## 技术特性
- 功能地图：子系统、页面清单、路由映射(website-functional-map.md)
- 优先级矩阵：P0-P3分级、高风险场景(test-priority-matrix.md)
- 测试标准：用例编写标准、BEMP特有验证点(testing-standards.md)
- 数据管理：Oracle MCP测试数据准备流程、核心表结构(test-data-management.md)
- 已知权衡：银行基础信息在generator和testing各自维护(用途不同)，未强行合并
