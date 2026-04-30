# Tasks

- [x] Task 1: 分析外围接口规范与产品服务接口差异
  - [x] SubTask 1.1: 详细对比0402006广播机构客户合并.md与Ecif4001ReqDto字段差异
  - [x] SubTask 1.2: 确定字段映射关系和数据转换规则
  - [x] SubTask 1.3: 分析数组字段的处理策略

- [x] Task 2: 实现fromMessage方法（XML转JSON）
  - [x] SubTask 2.1: 解析XML报文头信息（ebbsHdrReq）
  - [x] SubTask 2.2: 解析XML报文体基本信息字段
  - [x] SubTask 2.3: 解析mOrgCust数组字段
  - [x] SubTask 2.4: 解析mOrgCertInfo数组字段
  - [x] SubTask 2.5: 解析mAddrInfo数组字段
  - [x] SubTask 2.6: 构造JSONObject请求对象并映射字段
  - [x] SubTask 2.7: 使用HeadUtils封装报文头信息

- [x] Task 3: 实现toMessage方法（JSON转XML）
  - [x] SubTask 3.1: 解析服务响应JSONObject
  - [x] SubTask 3.2: 使用HeadUtils构造响应报文头
  - [x] SubTask 3.3: 构造响应报文体（retCode、retMsg）
  - [x] SubTask 3.4: 添加检查结果字段（chkRsltRetCd、chkRsltRetRsn）
  - [x] SubTask 3.5: 添加客户号字段（custNo、mrgdCustNo）

- [x] Task 4: 配置功能号映射关系
  - [x] SubTask 4.1: 在getFunctionIdMapping方法中配置PICE070701功能号

- [x] Task 5: 编写单元测试
  - [x] SubTask 5.1: 准备测试数据（模拟外围广播消息XML）
  - [x] SubTask 5.2: 测试fromMessage方法的字段映射正确性
  - [x] SubTask 5.3: 测试toMessage方法的响应构造正确性
  - [x] SubTask 5.4: 测试异常场景（消息格式错误、必填字段缺失等）

- [x] Task 6: 编写详细设计文档和测试用例
  - [x] SubTask 6.1: 编写详细设计文档，说明字段映射关系和处理逻辑
  - [x] SubTask 6.2: 编写测试用例文档，覆盖正常和异常场景

# Task Dependencies
- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 5 依赖于 Task 2、Task 3、Task 4
- Task 6 依赖于 Task 1、Task 2、Task 3
