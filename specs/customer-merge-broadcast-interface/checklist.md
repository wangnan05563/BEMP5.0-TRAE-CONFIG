# 客户号合并广播接口开发检查清单

## 代码实现检查
- [x] PICE070701MessageConverter.java文件已按照规范改造完成
- [x] fromMessage方法正确解析XML报文头信息
- [x] fromMessage方法正确解析XML报文体所有字段
- [x] fromMessage方法正确处理mOrgCust数组字段
- [x] fromMessage方法正确处理mOrgCertInfo数组字段
- [x] fromMessage方法正确处理mAddrInfo数组字段
- [x] fromMessage方法字段映射关系符合接口规范
- [x] toMessage方法正确构造响应报文头
- [x] toMessage方法正确构造响应报文体
- [x] toMessage方法包含所有必需的响应字段
- [x] getFunctionIdMapping方法配置正确的功能号映射

## 字段映射检查
- [x] txCode字段正确映射到opCode（通过HeadUtils.sysHeadToJson从ebbsHdrReq节点读取）
- [x] tellerNo字段正确映射到reqUserNo（通过HeadUtils.sysHeadToJson从ebbsHdrReq节点读取）
- [x] orgCode字段正确映射到reqBrchNo（通过HeadUtils.sysHeadToJson从ebbsHdrReq节点读取）
- [x] custNo(保留客户号)字段正确映射
- [x] suspectCustNo(被合并客户号)字段正确映射到mrgdCustNo
- [x] isCust字段正确处理（外围接口规范中该字段用于业务判断，当前实现中通过HeadUtils处理）
- [x] mOrgCust数组字段正确解析和映射
- [x] mOrgCertInfo数组字段正确解析和映射
- [x] mAddrInfo数组字段正确解析和映射

## 代码规范检查
- [x] 代码遵循BEMP项目编码规范
- [x] 使用了项目现有的工具类（XmlUtil、HeadUtils）
- [x] 参考了PICE030505MessageConverter的实现模式
- [x] 添加了必要的中文注释说明关键逻辑
- [x] 异常处理符合项目规范
- [x] 日志记录完整（使用logger记录关键信息）

## 测试验证检查
- [x] 单元测试覆盖fromMessage方法
- [x] 单元测试覆盖toMessage方法
- [x] 测试用例覆盖正常场景
- [x] 测试用例覆盖异常场景（消息格式错误）
- [x] 测试用例覆盖异常场景（必填字段缺失）
- [x] 测试用例覆盖数组字段的解析

## 文档交付检查
- [x] 详细设计文档已完成，包含字段映射关系说明
- [x] 详细设计文档包含处理逻辑说明
- [x] 测试用例文档已完成
- [x] 测试报告已完成
