# Spec文档模板

## spec.md模板

```markdown
# {功能名称} Spec

## Why
{1-2句话说明问题/机会}

## What Changes
- 在{bank}银行适配器模块中新增{PICE_CODE}MessageConverter.java
- 将外围报文（交易码{txCode}）字段映射到产品{PICE_CODE}服务的请求DTO
- 实现响应报文的组装

## Impact
- Affected specs: {业务域}消息接收与处理
- Affected code:
  - 新增文件: `banks/ext-{bank}/{bank}-adapter-as/src/main/java/com/hundsun/bemp/{bank}/adapter/msg/server/{module}/{PICE_CODE}MessageConverter.java`
  - 参考文件: `{同银行参考MessageConverter路径}`
  - 依赖服务: `{Service接口路径}`（{PICE_CODE}功能号）
  - 请求DTO: `{ReqDto路径}`
  - 响应DTO: `{ResDto路径}`

## ADDED Requirements

### Requirement: {PICE_CODE}消息转换器 - 外围报文接收与解析
系统SHALL提供{PICE_CODE}MessageConverter，继承AbstractMessageApplyResponseConverter，接收外围系统广播的XML报文并转换为内部JSON格式。

#### Scenario: 正常接收广播消息
- **WHEN** 外围系统通过MQ广播发送交易码{txCode}的消息
- **THEN** {PICE_CODE}MessageConverter的fromMessage方法正确解析XML报文，字段映射关系如下：

| 外围字段 | 外围路径 | 内部DTO字段 | 说明 |
|---------|---------|-----------|------|
| {field} | {path} | {dto_field} | {desc} |

#### Scenario: 报文格式错误
- **WHEN** 接收到的XML报文格式异常或缺少必输字段
- **THEN** 系统抛出BempRuntimeException，记录错误日志

### Requirement: {PICE_CODE}消息转换器 - 响应报文组装
系统SHALL将服务处理后的响应结果转换为外围系统期望的XML格式返回报文。

### Requirement: {PICE_CODE}消息转换器 - 服务码映射
系统SHALL配置正确的外部服务码与内部功能号映射关系。

### Requirement: 代码规范遵循
系统SHALL严格遵循{bank}银行适配器模块的代码规范。

## MODIFIED Requirements
无修改需求。

## REMOVED Requirements
无移除需求。
```

## tasks.md模板

```markdown
# Tasks

- [ ] Task 1: 创建{PICE_CODE}MessageConverter.java文件
  - [ ] SubTask 1.1: 在正确目录下创建{PICE_CODE}MessageConverter.java
  - [ ] SubTask 1.2: 实现类继承AbstractMessageApplyResponseConverter，添加@Component注解
  - [ ] SubTask 1.3: 实现getFunctionIdMapping方法
  - [ ] SubTask 1.4: 实现fromMessage方法
  - [ ] SubTask 1.5: 实现toMessage方法

# Task Dependencies
- 无外部依赖，Task 1内部子任务需按顺序执行
```

## checklist.md模板

```markdown
- [ ] {PICE_CODE}MessageConverter.java文件已创建在正确路径
- [ ] 类继承AbstractMessageApplyResponseConverter，@Component注解value正确
- [ ] getFunctionIdMapping返回正确的映射数组
- [ ] fromMessage方法字段映射关系完整
- [ ] fromMessage方法使用XmlUtil.getNodeValue和HeadUtils.sysHeadToJson
- [ ] toMessage方法正确将响应JSON转换为XML格式
- [ ] toMessage方法使用HeadUtils.jsonToSysHead和MessageXmlBuilder
- [ ] 代码风格与项目现有MessageConverter保持一致
- [ ] IDE诊断无语法错误
```
