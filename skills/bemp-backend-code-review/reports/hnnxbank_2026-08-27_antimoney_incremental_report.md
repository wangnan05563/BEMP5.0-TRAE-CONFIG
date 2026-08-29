# 反洗钱（中互金）代码评审报告（增量）

- 银行：河南农信（hnnxbank）
- 日期：2026-08-27
- 范围：本会话反洗钱功能改动（5 角色、两轮匹配、五角色信用代码取数）
- Spec：HNNS-EB-STD-REQ-002 PRD v3.4.6 / 待确认 v3.4.6

## 一、审查范围（改动文件）
| 层 | 文件 |
|----|------|
| 校验工具 | antimoney/validate/HnnxAntiMoneyValidateUtil.java |
| 注入配置 | antimoney/validate/HnnxAntiMoneyUtilConfig.java |
| 预检 | antimoney/dto/HnnxAntiMoneyPreCheckReqDto.java、service/impl/HnnxAntiMoneyPreCheckServiceImpl.java |
| commit 兜底 | quote/rebuy/HnnxRebuyApplyServiceImpl.java、quote/sale/HnnxBankSaleApplyServiceImpl.java、redisc/HnnxBankRediscountSaleApplyServiceImpl.java |
| 常量 | hnnxbank-biz-api/.../HnnxCommonConst.java |

## 二、编译与自动扫描
- mvn 编译 BUILD SUCCESS；单测 HnnxAntiMoneyValidateTest 22/22 绿
- auto-scan 25 个 WARN 均为全库存量问题（@Resource/lang3/toMap），本次改动文件未新增阻塞项

## 三、发现与改进建议（按优先级）

### 高
- **H-1 双层防御不对称：预检侧交易对手 round1 恒失效**
  - 现象：前端 4 页预检 bills 仅上送名称字段，无 drwrSocCode/oppSocCode/acptBankSocCode/discBankSocCode/discountCustSocCode/oppBrchCode。预检侧 fillSocCodeFromDb 第一段依赖 oppBrchCode（仅 commit 侧由批次 DTO 设置），故预检侧交易对手信用代码恒空 → round1 对交易对手失效，仅剩名称兜底。
  - 影响：名单记录仅有信用代码、名称不一致时，预检弹窗漏提示交易对手命中（commit 仍硬拦）。合规风险可控但提示不完整，且与"预检与 commit 口径一致"目标有偏差。
  - 建议：①确认各业务列表接口是否可回填 socCode/机构码供前端上送；不可则②在 PRD 已知问题中明示"预检侧交易对手按名称兜底"，并保持 commit 兜底为最终防线。

### 中
- **M-1 N+1：贴现人补全循环内逐张查库**
  - fillDiscountCustNameFromDb 在 preCheck ServiceImpl 与三处 collectXxxBillCheckItems 的 for 循环内逐张调用（singletonList 单条查询），100 票 = 100 次 DB 往返（规范第12条）。
  - 建议：批量收集缺失项后一次 in 查询回填（DAO 已支持 List 入参），参照 fillSocCodeFromDb 批量模式。

- **M-2 过时注释误导（口径凭证失真）**
  - redisc L242/L262、util L231-232 javadoc 仍写"承兑行…ACPT_SOC_CODE 直取"；util L549 acptBrchCode 字段注释同。v3.4.4 已改为 acpt_bank_no→trans_brch_bank_no 反查。注释与实现不符易致后人误改回旧口径。
  - 建议：同步更新为 acpt_bank_no → tm_cpes_branch.trans_brch_bank_no(ST01) 口径。

### 低
- L-1 querySocCodeByTransBrchBankNos 以 trans_brch_bank_no 作 key：同号多 ST01 机构时取值不确定（数据质量依赖），建议与业务确认唯一性或加观察日志。
- L-2 两轮匹配逻辑在 validateAntiMoneyListByItems 与 validateAntiMoneyListByBills 各实现一遍，round2 待校验集合计算逻辑重复，存在漂移风险，建议提取共用私有方法。
- L-3 产品码常量已定义未用于 prod_no 过滤（入口天然限定），属可接受设计，保持常量与 PRD 同步即可。
- L-4 单测缺口：queryMatchBySocCodes 无 certType='22' 断言（22 更正后防回归弱）；fillSocCodeFromDb 分支无 mock 测试。

## 四、Spec 一致性结论
| 检查项 | 结论 |
|--------|------|
| Q-03 两轮匹配（信用代码优先→名称兜底） | ✅ 一致 |
| certType='22'（v3.4.6） | ✅ CERT_TYPE_SOC="22"，注释留凭证 |
| 五角色取数口径（v3.4.4/v3.4.5） | ✅ 出票人 DRWR_SOC_CODE / 承兑行 acpt_bank_no 反查 / 交易对手 sale/buy_brch_code+ST01 / 贴现人、贴现行 ET05 trans_from/to |
| 来文行不校验、承兑人不在集合 | ✅ |
| 黑/灰错误码 HNNX0BE320009/010、时效两分支、来源18+有效1 | ✅ |
| 异常降级 Q-09 fail-closed（DAO 未初始化→开关降级） | ✅ DG-005 合规 |
| round1/round2 去重防双计、仅回填空缺项 | ✅ |

## 五、结论性评价
整体改动质量**良好**：两轮匹配框架正确、五角色取数与需求定案一致、降级策略完整、批量分片合规、方法命名规避泛型擦除问题的处理得当且有注释。未发现功能性 bug 或安全漏洞。需重点关注 H-1（预检侧交易对手信用代码缺失的双层防御不对称）与 M-1（N+1 性能），二者不影响当前硬拦截能力，但影响体验完整性与其运行效率，建议在功能测试前一并处理。
