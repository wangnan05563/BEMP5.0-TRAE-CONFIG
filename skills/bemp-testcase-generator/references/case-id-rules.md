# BEMP 用例编号与模块缩写对照表

> 完整列表见 `config/generator-config.json` → `case_id_prefixes`

| 缩写 | 模块 | 编号示例 |
|:---|:---|:---|
| COMMON | 通用/登录 | TC-COMMON-001 |
| BRANCH | 机构管理 | TC-BRANCH-001 |
| ROLE | 角色权限 | TC-ROLE-001 |
| CLEAR | 清算管理 | TC-CLEAR-001 |
| CUSTSIGN | 企业信息报备 | TC-CUSTSIGN-001 |
| SIGNAUDIT | 报备复核 | TC-SIGNAUDIT-001 |
| SIGNRECORD | 报备记录 | TC-SIGNRECORD-001 |
| CUSTCORP | 企业客户查询 | TC-CUSTCORP-001 |
| CUSTACCT | 企业账号同步 | TC-CUSTACCT-001 |
| APPROVAL | 审批与记账 | TC-APPROVAL-001 |
| PAYMENT | 支付管理 | TC-PAYMENT-001 |
| CREDITBATCH | 额度批次 | TC-CREDITBATCH-001 |
| CREDITINFO | 额度明细 | TC-CREDITINFO-001 |
| CREDITRECHECK | 额度复核 | TC-CREDITRECHECK-001 |
| TRUST | 场内-托管 | TC-TRUST-001 |
| MARKET | 场内-市场交易 | TC-MARKET-001 |
| ACCEPT | 场外-承兑 | TC-ACCEPT-001 |
| DISCOUNT | 场外-贴现 | TC-DISCOUNT-001 |
| PLEDGE | 场外-质押 | TC-PLEDGE-001 |
| ADMIN | 机构管理员管理 | TC-ADMIN-001 |
| INVOICE | 发票维护 | TC-INVOICE-001 |
| CONTRACT | 合同发票管理 | TC-CONTRACT-001 |
| VOUCHER | 其他凭证管理 | TC-VOUCHER-001 |
| DISCPOST | 贴现发票后补 | TC-DISCPOST-001 |
| ECIFMRG | ECIF客户合并 | TC-ECIFMRG-001 |

## 编号分配规则

- 同一模块内序号从 001 开始递增
- 新增用例追加到模块最大序号之后
- 废弃用例保留编号，标注"已废弃"
- 不同优先级用例共享同一序号空间