# 买入交易确认报文发送时间记录功能 Spec

## Why
在【场内交易子系统】-【市场交易】-【对话报价】-【买入】-【买入交易确认】菜单中，业务人员需要追踪报文的实际发送时间，以便于后续的问题排查、审计和业务监控。当前系统在发送报文成功后未记录具体的发送时间点。

## What Changes
- 在买入交易确认（RebuyReplyServiceImpl.sendQuoteAgree）报文发送成功后，增加记录"报文发送时间"字段
- 复用 RebuyBatchDto 中现有的保留字段存储报文发送时间（推荐使用 batchReserve 字段）
- 报文发送时间格式：yyyy-MM-dd HH:mm:ss

## Impact
- Affected specs: 对话报价-买入交易确认流程
- Affected code:
  - `served/be/market-as/.../quote/rebuy/RebuyReplyServiceImpl.java` - 核心修改点
  - `served/api/cs/common-api/.../quote/rebuy/dto/RebuyBatchDto.java` - 可能需要添加新字段或使用现有字段
  - 数据库表 TE_REBUY_BATCH - 批次表

## ADDED Requirements

### Requirement: 记录报文发送时间
系统 SHALL 在买入交易确认发送报文成功后，自动记录并保存报文发送时间到批次表中。

#### Scenario: 买入交易确认报文发送成功时记录时间
- **WHEN** 用户执行买入交易确认操作且报文发送成功
- **THEN** 系统在报文发送方法返回后，立即获取当前时间并设置到批次的"报文发送时间"字段
- **AND** 在批次更新时将该时间持久化到数据库

#### Scenario: 报文发送失败时不记录时间
- **WHEN** 用户执行买入交易确认操作但报文发送抛出异常
- **THEN** 不记录报文发送时间，保持字段为空

## MODIFIED Requirements

### Requirement: 买入交易确认流程
修改后的买入交易确认流程 SHALL 包含以下步骤：
1. 校验批次状态和业务规则
2. 风险校验
3. 发送报文（sendCDCes011Msg 或 sendApplyQuoteMsg 等）
4. **【新增】记录报文发送时间**
5. 设置消息ID和交易状态
6. 更新批次信息（包含报文发送时间）

## Implementation Notes
- 推荐使用 RebuyBatchDto 的 `batchReserve1` 字段存储报文发送时间字符串
- 或者在数据库表中新增专门的字段 MSG_SEND_TIME（需要评估DDL变更影响）
- 时间获取方式：`new Date()` 或 `System.currentTimeMillis()`
- 需要考虑个性化扩展点：如果 banks/ext-hnnxbank 目录下有 RebuyReplyServiceImpl 的个性化类，则应在个性化类中实现
