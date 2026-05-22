# BEMP 河南农信(hnnxbank) 个性化前端代码走查报告

| 项目 | 信息 |
|------|------|
| 银行 | hnnxbank (河南农信) |
| 审查日期 | 2026-05-20 |
| 审查范围 | 5个需求模块，11个Vue文件 |
| 审查规范 | bemp-frontend-code-review 四阶段审查 |

---

## 一、审查总览

### 问题统计

| 级别 | 数量 | 说明 |
|------|------|------|
| 🔴 阻塞 | 2 | 必须修复，否则阻塞发布 |
| 🟠 严重 | 8 | 强烈建议修复，影响国际化或代码质量 |
| 🟡 警告 | 12 | 建议修复，改善代码质量 |
| 🟢 提示 | 6 | 优化建议，非强制 |

### 文件审查结果

| 文件 | 需求 | 阻塞 | 严重 | 警告 | 提示 | 结论 |
|------|------|------|------|------|------|------|
| branch.vue | 需求1&2 | 0 | 2 | 3 | 1 | 🟠 |
| branchAdmin.vue | 需求1&2 | 0 | 2 | 2 | 1 | 🟠 |
| custCorp.vue | 需求3 | 0 | 1 | 2 | 1 | 🟠 |
| custAcct.vue | 需求3 | 0 | 1 | 1 | 0 | 🟠 |
| custCorpSign.vue | 需求4 | 0 | 1 | 1 | 1 | 🟠 |
| custCorpSignAudit.vue | 需求4 | 1 | 0 | 0 | 0 | 🔴 |
| custCorpSignRecord.vue | 需求4 | 0 | 0 | 1 | 1 | 🟡 |
| custInfoOnlineQuery.vue | 需求4 | 0 | 0 | 1 | 1 | 🟡 |
| acceptBankCreditGrantBatch.vue | 需求5 | 0 | 0 | 0 | 0 | 🟢 |
| acceptBankCreditGrantInfo.vue | 需求5 | 1 | 0 | 1 | 0 | 🔴 |
| acceptBankCreditGrantInfoReCheck.vue | 需求5 | 0 | 1 | 0 | 0 | 🟠 |

---

## 二、阶段1：前置检查

### 2.1 文件位置检查

| 文件 | 期望路径 | 实际路径 | 结果 |
|------|----------|----------|------|
| branch.vue | banks/hnnxbank/sm/auth/branch/ | banks/hnnxbank/sm/auth/branch/ | ✅ |
| branchAdmin.vue | banks/hnnxbank/sm/auth/branch/ | banks/hnnxbank/sm/auth/branch/ | ✅ |
| custCorp.vue | banks/hnnxbank/bm/cust/corp/ | banks/hnnxbank/bm/cust/corp/ | ✅ |
| custAcct.vue | banks/hnnxbank/bm/cust/acct/ | banks/hnnxbank/bm/cust/acct/ | ✅ |
| custCorpSign.vue | banks/hnnxbank/bm/sign/cpes/ | banks/hnnxbank/bm/sign/cpes/ | ✅ |
| custCorpSignAudit.vue | banks/hnnxbank/bm/sign/cpes/ | banks/hnnxbank/bm/sign/cpes/ | ✅ |
| custCorpSignRecord.vue | banks/hnnxbank/bm/sign/cpes/ | banks/hnnxbank/bm/sign/cpes/ | ✅ |
| custInfoOnlineQuery.vue | banks/hnnxbank/bm/sign/cpes/ | banks/hnnxbank/bm/sign/cpes/ | ✅ |
| acceptBankCreditGrantBatch.vue | banks/hnnxbank/pc/credit/ | banks/hnnxbank/pc/credit/ | ✅ |
| acceptBankCreditGrantInfo.vue | banks/hnnxbank/pc/credit/ | banks/hnnxbank/pc/credit/ | ✅ |
| acceptBankCreditGrantInfoReCheck.vue | banks/hnnxbank/pc/credit/ | banks/hnnxbank/pc/credit/ | ✅ |

**结论：所有文件均在 hnnxbank 个性化目录下，位置合规。**

### 2.2 路由映射检查

| 文件 | 路由Key | hnnxbankIndex.js注册 | 结果 |
|------|---------|---------------------|------|
| branch.vue | /sm/auth/branch/branch | ✅ 行9 | 通过 |
| branchAdmin.vue | /sm/auth/branch/branchAdmin | ✅ 行48 | 通过 |
| custCorp.vue | /bm/cust/corp/custCorp | ✅ 行10 | 通过 |
| custAcct.vue | /bm/cust/acct/custAcct | ✅ 行60 | 通过 |
| custCorpSign.vue | /bm/sign/cpes/custCorpSign | ✅ 行12 | 通过 |
| custCorpSignAudit.vue | /bm/sign/cpes/custCorpSignAudit | ✅ 行15 | 通过 |
| custCorpSignRecord.vue | /bm/sign/cpes/custCorpSignRecord | ✅ 行14 | 通过 |
| custInfoOnlineQuery.vue | /bm/sign/cpes/custInfoOnlineQuery | ✅ 行16 | 通过 |
| acceptBankCreditGrantBatch.vue | /pc/credit/acceptBankCreditGrantBatch | ✅ 行72 | 通过 |
| acceptBankCreditGrantInfo.vue | (弹窗组件) | 不需要独立路由 | 通过 |
| acceptBankCreditGrantInfoReCheck.vue | /pc/credit/acceptBankCreditGrantInfoReCheck | ✅ 行73 | 通过 |

**结论：路由映射完整，acceptBankCreditGrantInfo.vue 作为弹窗组件不需要独立路由，合规。**

### 2.3 目录结构一致性

所有文件目录结构与产品化模块划分一致：sm/bm/pc 模块分类清晰。

---

## 三、阶段2：规范检查

### 3.1 国际化检查

#### 🔴 阻塞级问题

**[BLOCK-01] en-US.js 缺少 32 个 pc.credit 相关键值**

en-US.js 中 `hnnxbank.m.i.pc.credit` 命名空间缺少以下键值（zh-CN.js 中已定义但 en-US.js 未同步）：

| 缺失键 | 中文值 |
|--------|--------|
| custType | 客户类型 |
| custName | 客户名称 |
| creditDt | 授信日期 |
| searchAdvanced | 高级查询 |
| search | 查询 |
| reset | 重置 |
| add | 新增 |
| delete | 删除 |
| modify | 修改 |
| creditGrantInfo | 批复明细 |
| close | 关闭 |
| submiting | 提交中 |
| commit | 提交 |
| index | 序号 |
| memberId | 会员编号 |
| memberBankNo | 会员行号 |
| custNo | 客户号 |
| confirm | 确认 |
| isConfirmDelete | 确认要删除吗 |
| chooseOneData | 请选择一条数据 |
| onlyChooseOneData | 只能选择一条数据 |
| netError | 网络异常 |
| reviewStatus | 复核状态 |
| creditInfoNo | 额度信息编号 |
| creditLimitAmt | 授信额度 |
| doAmt | 可用额度 |
| usedCreditAmt | 已用额度 |
| freezedAmt | 冻结额度 |
| activeDt | 生效日期 |
| failureDt | 失效日期 |
| isRecircle | 是否循环 |
| sync | 同步 |
| syncUsedAmt | 同步 |
| submitCheck | 提交复核 |
| cancelCheck | 撤销复核 |
| submitCheckAuth | 复核 |
| cancelCheckAuth | 撤销复核 |
| listExport | 清单导出 |
| addCreditBatch | 新增额度批复 |
| modifyCreditBatch | 修改额度批复 |
| addCreditInfo | 新增额度批复明细 |
| modifyCreditInfo | 修改额度批复明细 |
| confirmSubmitCheck | 确认提交复核？ |
| confirmCancelCheck | 确认撤销提交？ |
| confirmReCheck | 确定复核？ |
| confirmCancelReCheck | 确定撤销复核? |
| confirmDelete | 确认要删除吗？ |
| syncUsedAmtSuccess | 同步已用额度成功 |
| creditBatchHasInfo | 该额度申请存在额度信息，不能删除 |
| onlyUnSubmitCanSubmitCheck | 只有处于【未提交】状态的才可发起此操作 |
| onlyWaitCheckCanCancelCheck | 只有处于【待复核】状态的才可发起此操作 |
| onlyWaitCheckCanReCheck | 只有处于【待复核】状态的才可发起此操作 |
| onlyCheckedCanCancelReCheck | 只有处于【已复核】状态的才可发起此操作 |
| busiBrch | 业务机构 |
| total | 总笔数 |
| operTeller | 操作员 |
| selectCustTypeFirst | 请先选择客户类型 |
| statusNotAllowedModify | 状态为【{0}】,不允许修改 |
| confirmReCheckWithTransfer | 确定复核？本次复核需要结转历史额度流水... |
| creditInfoNoStatusCheck | 额度信息编号【{0}】的当前状态为【{1}】... |
| viewCustCorp | 查看企业客户 |

**影响：** 英文环境下所有 pc.credit 模块页面将显示键名而非文本，属于功能性缺陷。

**修复建议：** 在 en-US.js 的 `hnnxbank.m.i.pc.credit` 中补全所有缺失键值。

---

**[BLOCK-02] acceptBankCreditGrantInfo.vue 中 "是"/"否" 选项硬编码**

- 文件：`acceptBankCreditGrantInfo.vue` 行93-94
- 代码：
  ```html
  <h-option value="0">否</h-option>
  <h-option value="1">是</h-option>
  ```
- 影响：isRecircle 字段的下拉选项硬编码中文，未使用 $t() 国际化

**修复建议：** 使用 `$t('m.i.common.yes')` / `$t('m.i.common.no')` 或字典数据渲染。

---

#### 🟠 严重级问题

**[CRIT-01] branch.vue 弹窗标题硬编码中文**

- 文件：`branch.vue` 行122-124
- 代码：
  ```html
  <span v-if="type==='add'">新增机构</span>
  <span v-if="type==='modify'">修改机构</span>
  <span v-if="type==='synch'">同步机构</span>
  ```
- 同文件行256、275、310 也有硬编码弹窗标题："批量复制授权产品"、"机构历史查询"、"查询机构窗口"
- 同文件行243、247、249 组件 title 属性硬编码："角色分配"、"查看菜单"、"产品分配"

**修复建议：** 将所有弹窗标题和组件 title 移入国际化文件，使用 `$t()` 引用。

---

**[CRIT-02] branch.vue render 函数中硬编码中文**

- 文件：`branch.vue` 行422-427、行602-610、行434-441、行617-624
- 代码：reserve1 字段渲染 "县域"/"城区"，reserve2 字段渲染 "是"/"否"，operateStatus 渲染 "待复核"/"复核已拒绝"/"复核已通过"/"无复核"
- 影响：表格列内容在非中文环境下显示键名

**修复建议：** 使用字典映射或 $t() 替换硬编码中文。

---

**[CRIT-03] branchAdmin.vue 弹窗标题硬编码中文**

- 文件：`branchAdmin.vue` 行87-89
- 代码：
  ```html
  <span v-if="type==='add'">新增机构管理员</span>
  <span v-if="type==='modify'">修改机构管理员</span>
  <span v-if="type==='syncUser'">同步机构管理员</span>
  ```
- 同文件行155、157 组件 title 硬编码："角色分配"、"查看菜单"
- 同文件行503-504、563-564、585-586、621-622 确认弹窗标题硬编码："重置密码"、"解锁用户"、"锁定用户"、"置为离线"

**修复建议：** 移入国际化文件。

---

**[CRIT-04] branchAdmin.vue 批量复制角色弹窗中硬编码中文**

- 文件：`branchAdmin.vue` 行168、174、806-807、817
- 代码：
  ```html
  placeholder="请输入源用户号"
  placeholder="选择管理员后自动显示"
  title: "确认",
  content: "确定要批量复制角色吗？这将覆盖目标用户的原有角色。",
  info: "批量复制角色成功"
  ```
- 注意：zh-CN.js 中已有对应键值（confirmTitle、confirmBatchCopyRole、batchCopyRoleSuccess 等），但代码中未使用

**修复建议：** 使用 `$t('hnnxbank.m.i.auth.inputSourceUserNo')` 等已定义的国际化键替换硬编码文本。

---

**[CRIT-05] custCorp.vue 弹窗标题和表单标签硬编码中文**

- 文件：`custCorp.vue` 行109-113、行116、行154/160、行199、行397、行866
- 代码：
  ```html
  <span v-if="type==='add'">新增客户信息</span>
  :label="'同步方式'"
  :label="'证件类型'"
  <h-option value="RC01" key="RC01">企业</h-option>
  :label="$t('是否短信提醒')"
  this.$t('是否发送短信')
  ```
- 特别注意：行397 `$t('是否短信提醒')` 和 行866 `$t('是否发送短信')` 使用中文作为 i18n key，这是错误用法，应使用标准 key 格式

**修复建议：** 
1. 弹窗标题移入国际化文件
2. "同步方式"、"证件类型" 使用标准 i18n key
3. `$t('是否短信提醒')` 和 `$t('是否发送短信')` 改为标准 key 格式如 `$t('m.i.common.isMsgNotice')` / `$t('m.i.bm.isSendSms')`

---

**[CRIT-06] custAcct.vue 弹窗标题硬编码中文**

- 文件：`custAcct.vue` 行87-90
- 代码：
  ```html
  <span v-if="type=='add'">新增账户信息</span>
  <span v-if="type=='modify'">修改账户信息</span>
  <span v-if="type=='view'">查看账户信息</span>
  <span v-if="type=='coll'">同步账户信息</span>
  ```

**修复建议：** 移入国际化文件。

---

**[CRIT-07] custCorpSign.vue 下拉选项硬编码中文**

- 文件：`custCorpSign.vue` 行21-22
- 代码：
  ```html
  <h-option value="0">未登记</h-option>
  <h-option value="1">已登记</h-option>
  ```

**修复建议：** 使用字典数据（CorpSignRgstStatus 已在 mounted 中加载）或 $t() 替换。

---

**[CRIT-08] acceptBankCreditGrantInfoReCheck.vue 中 "是"/"否" 硬编码**

- 文件：`acceptBankCreditGrantInfoReCheck.vue` 中未直接出现，但关联的 acceptBankCreditGrantInfo.vue 行93-94 存在硬编码
- 此处标记为严重，因影响国际化完整性

---

#### 🟡 警告级问题

**[WARN-01] branch.vue 多处提示信息硬编码中文**

- 行1047: `"该机构正在复核中，请重新选择"`
- 行1051: `"总行信息不允许修改"`
- 行1087: `"请先选择父机构"`
- 行1132: `"该机构正在复核中，请重新选择"`（重复）
- 行1211: `"该机构正在复核中，请重新选择"`（重复）
- 行1254: `"该机构正在复核中，请重新选择"`（重复）
- 行1547: `"同步机构信息失败："` + res.data.retMsg
- 行1555: `"机构号不能为空"`

**修复建议：** 提取到国际化文件，使用参数化消息。

---

**[WARN-02] branchAdmin.vue 多处提示信息硬编码中文**

- 行428: `"该管理员正在复核中，请重新选择"`
- 行466: `"该管理员正在复核中，请重新选择"`（重复）
- 行504: `"确定要重置密码吗？"`
- 行529: `"请选择正常用户"`
- 行539: `"该管理员正在复核中，请重新选择"`（重复）
- 行564: `"确定要解锁用户吗？"`
- 行586: `"确定要锁定用户吗？"`
- 行608: `"请选择正常或者锁定的用户"`
- 行618: `"请选择在线用户"`
- 行622: `"确定要置为离线吗？"`
- 行698: `"用户号不能为空"`
- 行797: `"请输入源用户号"`
- 行801: `"请输入目标用户号"`

**修复建议：** 提取到国际化文件。

---

**[WARN-03] custCorp.vue 多处提示信息硬编码中文**

- 行1273: `"只有创建机构能进行此操作"`
- 行1532: `"客户号：" + ... + "，只有创建机构能进行此操作"`
- 行1590: `"客户：" + ... + "为集团总部，请先解除其集团关系再进行注销"`
- 行1600: `"客户下仍有" + num + "条账户信息未注销，请注销后再进行操作"`
- 行1644: `"只有创建机构能进行此操作"`（重复）
- 行1648: `"该客户不是集团总部，无法进行此操作"`
- 行1743-1777: 多处同步校验提示信息硬编码
- 行1878: `"对不起！解除集团关系才能修改集团总部的集团性质。"`

**修复建议：** 提取到国际化文件，使用参数化消息模板。

---

**[WARN-04] custAcct.vue 多处提示信息硬编码中文**

- 行685: `"只有开户/创建机构能进行此操作"`
- 行883: `"账户号：" + ... + "的账户开户/创建机构不是本机构，只有开户/创建机构能进行此操作"`
- 行896: `"注销"` / `"撤销注销"` (content 变量)
- 行904: `"是否要" + content + "?"`
- 行935: `"客户账号：" + ... + "，已签约，不允许" + content`
- 行942: `"检验账户是否签约失败"` + res.data.retMsg

**修复建议：** 提取到国际化文件。

---

**[WARN-05] custCorpSign.vue / custCorpSignAudit.vue 国际化 key 使用中文**

- `custCorpSign.vue` 行319: `this.$t("确认要对该企业进行修改登记吗")`
- `custCorpSign.vue` 行348: `this.$t("请确认是否向票交所注销该企业")`
- `custCorpSignAudit.vue` 行315: `this.$t("确认要对该企业进行修改登记吗")`
- `custCorpSignAudit.vue` 行344: `this.$t("确认要对该企业注销登记吗")`

**影响：** 使用中文作为 i18n key 是错误用法，在中文环境下可能偶然工作（如果 zh-CN.js 中恰好有此 key），但在英文环境下必然失败。

**修复建议：** 改为标准 key 格式，如 `hnnxbank.m.i.bm.confirmModifySign` 等。

---

**[WARN-06] custInfoOnlineQuery.vue 提示信息硬编码中文**

- 行514: `"该企业正在查询中，请勿重复操作"`
- 行529: `'状态为"已发出"或"查询失败"时，无详细信息'`

**修复建议：** 提取到国际化文件。

---

**[WARN-07] custCorpSignRecord.vue 列标题和渲染文本硬编码中文**

- 行108-109: `title: "记录查询"`, `key: "记录查询"`
- 行118: `h("a", ..., "记录查询")`

**修复建议：** 使用 $t() 国际化。

---

**[WARN-08] branch.vue 中 "系统内" + this.$t("m.i.common.brchNo") 拼接方式不规范**

- 行515: `title: "系统内" + this.$t("m.i.common.brchNo")`

**修复建议：** 应在国际化文件中定义完整的 key，如 `m.i.common.innerBrchNo`，避免中英混合拼接。

---

**[WARN-09] branch.vue 中 placeholder 硬编码中文**

- 行15: `placeholder="请选择"`
- 行129: `placeholder="机构名称不可重复"`
- 行134: `placeholder="机构号不可重复，不超过10位数字或字母"`
- 行150: `placeholder="不超过10位数字或字母"`
- 行153: `placeholder="12位数字"`
- 行161: `placeholder="不超过20位数字或字母"`
- 行317: `placeholder="请选择机构级别"`

**修复建议：** placeholder 文本也应国际化。

---

**[WARN-10] branchAdmin.vue 中 placeholder 硬编码中文**

- 行96-97: `placeholder="不超过20位数字或字母"`
- 行101: `placeholder="不超过20位数字或字母"`
- 行128: `placeholder="区号-号码/11位手机号"`

**修复建议：** placeholder 文本也应国际化。

---

**[WARN-11] custAcct.vue 中 activeFlag 渲染硬编码中文**

- 行387-393: `"已注销"` / `"生效中"` / `"已冻结"` 硬编码在 render 函数中

**修复建议：** 使用字典映射或 $t()。

---

**[WARN-12] acceptBankCreditGrantInfo.vue 中 placeholder 硬编码中文**

- 行81: `placeholder="大于0的数字，小数位只能输2位"`
- 行99: `placeholder="大于0的数字，小数位只能输2位"` (readonly)
- 行103: `placeholder="大于0的数字，小数位只能输2位"` (readonly)

**修复建议：** placeholder 文本也应国际化。

---

#### 🟢 提示级问题

**[INFO-01] branch.vue 中 reserve1List 选项硬编码中文**

- 行658-664: `label: "县域"` / `label: "城区"` 硬编码在 data 中

**修复建议：** 使用字典数据或 $t() 渲染。

---

**[INFO-02] branch.vue 中 "是否简单机构" 选项硬编码**

- 行202-204: `<h-option value="1">是</h-option>` / `<h-option value="0">否</h-option>`

**修复建议：** 使用字典数据渲染。

---

**[INFO-03] branchAdmin.vue 中 certTypeList 硬编码**

- 行350: `certTypeList: [{ key : "DC01", value : "居民身份证" }]`

**修复建议：** 应从字典接口获取，与其他文件保持一致。

---

**[INFO-04] branchAdmin.vue 中 loginStatus 渲染硬编码**

- 行263: `val === "0" ? "离线" : "在线"`

**修复建议：** 使用 $t() 国际化。

---

**[INFO-05] custCorpSign.vue 中 custRgstStatus 默认值 "1"**

- 行80: `custRgstStatus:"1"` — 默认查询"已登记"状态，这是业务需求，但建议添加注释说明

---

**[INFO-06] custInfoOnlineQuery.vue 中 formItem 初始化直接读取 sessionStorage**

- 行389-390: 在 data() 中直接读取 `window.sessionStorage.getItem('userInfo')`
- 虽然功能正常，但如果 sessionStorage 未初始化可能报错

**修复建议：** 添加空值保护 `JSON.parse(window.sessionStorage.getItem('userInfo') || '{}')`。

---

### 3.2 API 路径检查

| 文件 | API路径 | 前缀规范 | 结果 |
|------|---------|----------|------|
| branch.vue | /hnnxbank/sm/auth/branch/branch/func_querySubBranchAndSelf | /hnnxbank/ | ✅ |
| branch.vue | /hnnx/sm/auth/branch/roleDistribute/func_copyAssignBranchRole | /hnnx/ | ⚠️ |
| branchAdmin.vue | /sm/auth/branchAdmin/branchAdmin/func_queryBranchAdminList | 无前缀 | ⚠️ |
| branchAdmin.vue | /hnnx/sm/auth/branch/branchAdmin/func_batchImportValidate | /hnnx/ | ⚠️ |
| branchAdmin.vue | /hnnx/sm/auth/branch/branchAdmin/func_batchImportBranchAdmin | /hnnx/ | ⚠️ |
| branchAdmin.vue | /hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole | /hnnx/ | ⚠️ |
| custCorp.vue | /hnnxbank/bm/cust/corp/pageQueryCustCorpList | /hnnxbank/ | ✅ |
| custAcct.vue | /bm/cust/acct/custAcct/func_pageQueryCustAcctList | 无前缀 | ⚠️ |
| custCorpSign.vue | /hnnxbank/bm/cpes/custsign/custCorpSign/func_queryCustCorpInfoByPage | /hnnxbank/ | ✅ |
| custCorpSignAudit.vue | /hnnxbank/bm/cpes/custsignaudit/func_queryCustSignAuditByPage | /hnnxbank/ | ✅ |
| custCorpSignRecord.vue | /hnnxbank/bm/cpes/custsign/custCorpSign/func_queryCustCorpSignRecordByPage | /hnnxbank/ | ✅ |
| custInfoOnlineQuery.vue | /hnnxbank/bm/sign/cpes/custInfoOnlineQuery/func_queryCustInfoByPage | /hnnxbank/ | ✅ |
| acceptBankCreditGrantBatch.vue | /banks/hnnxbank/pc/credit/... | /banks/hnnxbank/ | ✅ |
| acceptBankCreditGrantInfo.vue | /banks/hnnxbank/pc/credit/... | /banks/hnnxbank/ | ✅ |
| acceptBankCreditGrantInfoReCheck.vue | /banks/hnnxbank/pc/credit/... | /banks/hnnxbank/ | ✅ |

**注意：** API 前缀存在三种风格：`/hnnxbank/`、`/hnnx/`、`/banks/hnnxbank/`、无前缀。这可能是后端 Controller 映射路径不同导致，需确认后端 @RequestMapping 是否一致。

---

### 3.3 组件复用检查

| 文件 | 复用组件 | 结果 |
|------|----------|------|
| branch.vue | show-branch, show-cpes-branch, show-ecds-branch, common-file-upload, role-distribute, show-branch-menu, product-distribute, brch-log-detail | ✅ |
| branchAdmin.vue | show-branch, common-file-upload, role-distribute, show-branch-menu, hnnxbankSelectBranchManager | ✅ |
| custCorp.vue | show-branch, select-cust-corp, show-cust-acct, show-cust-corp, show-cust-manager, show-cust-message, common-excel-download, common-date-picker, common-select | ✅ |
| custAcct.vue | show-branch, select-cust-corp, show-cust-corp, show-cust-acct, common-select, common-date-picker | ✅ |
| custCorpSign.vue | select-cust-corp, common-input, acct-detail-show | ✅ |
| custCorpSignAudit.vue | select-cust-corp, common-input, audit-acct-detail-show | ✅ |
| custCorpSignRecord.vue | select-cust-corp, common-input, record-detail-show | ✅ |
| custInfoOnlineQuery.vue | show-branch, common-input, common-select, common-date-picker | ✅ |
| acceptBankCreditGrantBatch.vue | show-cust-corp, show-member, accept-bank-credit-grant-info | ✅ |
| acceptBankCreditGrantInfoReCheck.vue | show-cust-corp, show-member, common-excel-download | ✅ |

**结论：组件复用良好，个性化组件 hnnxbankSelectBranchManager 正确放置在 hnnxbank/components/ 下。**

---

### 3.4 UI 风格一致性

所有文件均使用项目统一的 h- 前缀组件库（h-form, h-datagrid, h-msg-box 等），UI 风格一致。

---

## 四、阶段3：质量检查

### 4.1 样式安全

| 文件 | scoped | 结果 |
|------|--------|------|
| branch.vue | ✅ `<style scoped>` | 通过 |
| branchAdmin.vue | ❌ 无 `<style>` 标签 | ⚠️ |
| custCorp.vue | ✅ `<style scoped>` (空) | 通过 |
| custAcct.vue | ✅ `<style scoped>` (空) | 通过 |
| custCorpSign.vue | ✅ `<style scoped>` (空) | 通过 |
| custCorpSignAudit.vue | ✅ `<style scoped>` (空) | 通过 |
| custCorpSignRecord.vue | ✅ `<style scoped>` (空) | 通过 |
| custInfoOnlineQuery.vue | ✅ `<style scoped>` (空) | 通过 |
| acceptBankCreditGrantBatch.vue | 无 style 标签 | 通过(无自定义样式) |
| acceptBankCreditGrantInfo.vue | 无 style 标签 | 通过(无自定义样式) |
| acceptBankCreditGrantInfoReCheck.vue | 无 style 标签 | 通过(无自定义样式) |

**结论：** branchAdmin.vue 无 `<style>` 标签，但未定义自定义样式，不会造成样式泄漏。其余文件均使用 scoped。

### 4.2 v-for key 检查

所有 v-for 循环均绑定了 :key，合规。

### 4.3 v-html 安全检查

未发现使用 v-html 渲染用户输入的情况，合规。

### 4.4 异步处理检查

| 文件 | 问题 | 级别 |
|------|------|------|
| branch.vue | queryBranchTree() 无 .catch() | 🟡 |
| branch.vue | queryBranchSearchTree() 无 .catch() | 🟡 |
| branchAdmin.vue | handleDel() 无 .catch() | 🟡 |
| custCorp.vue | queryObjById() 无 .catch() | 🟡 |
| custAcct.vue | queryObjById() 无 .catch() | 🟡 |
| custCorpSign.vue | cancelSignRgst() 无 .catch() | 🟡 |

**说明：** 部分 post 请求缺少 .catch() 错误处理，在网络异常时可能导致未捕获的 Promise 异常。branch.vue 的 syncBrch() 和 branchAdmin.vue 的 resetPwd()/lockUser()/dropUser() 已正确使用 .catch()，可作为参考。

### 4.5 代码质量

| 文件 | 问题 | 级别 |
|------|------|------|
| branch.vue | 行1342-1354 使用 var 声明变量，应使用 let | 🟢 |
| branch.vue | 行82 模板中混用 this.btnAuth，应使用计算属性 | 🟢 |
| branchAdmin.vue | 行369-383 getValueFromMap 函数定义在 data() 内部，应提取为 methods 或 mixin | 🟢 |
| custAcct.vue | 行840 `this.addForm.bailType == "00"` 使用 == 赋值而非 === 比较，应为 `= "00"` | 🟡 |
| custCorpSignAudit.vue | 行317 `let custNo = this.custNo` 使用了未定义的 this.custNo | 🟡 |
| custCorpSign.vue | 行321 `let custNo = this.custNo` 使用了未定义的 this.custNo | 🟡 |

**[WARN-13] custAcct.vue 行840 赋值运算符错误**

```javascript
// 原代码（错误：== 是比较运算符，不是赋值）
this.addForm.bailType == "00";
// 应改为
this.addForm.bailType = "00";
```

**影响：** 保证金账户的 bailType 默认值设置无效，可能导致后端接收空值。

---

**[WARN-14] custCorpSignAudit.vue / custCorpSign.vue 中 this.custNo 未定义**

- `custCorpSignAudit.vue` 行317: `let custNo = this.custNo` — this.custNo 在 data 和 props 中均未定义
- `custCorpSign.vue` 行321: 同样问题

**影响：** modifySignRgst 方法中 custNo 变量始终为 undefined，虽然当前方法未被调用（被 acctDetail 替代），但属于潜在缺陷。

---

### 4.6 性能检查

- 所有列表均使用分页查询（h-datagrid 自带分页），合规
- v-for 均绑定唯一 key，合规
- 树形数据过滤使用 computed 计算属性，合规

---

## 五、问题汇总与优先级

### 必须修复（阻塞发布）

| 编号 | 文件 | 问题 | 修复工作量 |
|------|------|------|-----------|
| BLOCK-01 | en-US.js | 缺少 32+ 个 pc.credit 国际化键值 | 中 |
| BLOCK-02 | acceptBankCreditGrantInfo.vue | "是"/"否" 下拉选项硬编码 | 小 |

### 强烈建议修复

| 编号 | 文件 | 问题 | 修复工作量 |
|------|------|------|-----------|
| CRIT-01 | branch.vue | 弹窗标题/组件title硬编码(7处) | 中 |
| CRIT-02 | branch.vue | render函数中硬编码中文(4处) | 中 |
| CRIT-03 | branchAdmin.vue | 弹窗标题/确认框硬编码(10+处) | 中 |
| CRIT-04 | branchAdmin.vue | 批量复制角色弹窗硬编码(已有i18n key未使用) | 小 |
| CRIT-05 | custCorp.vue | 弹窗标题/表单标签硬编码+$t()中文key | 中 |
| CRIT-06 | custAcct.vue | 弹窗标题硬编码(4处) | 小 |
| CRIT-07 | custCorpSign.vue | 下拉选项硬编码 | 小 |
| CRIT-08 | acceptBankCreditGrantInfo.vue | "是"/"否"硬编码(同BLOCK-02) | 小 |

### 建议修复

| 编号 | 文件 | 问题 |
|------|------|------|
| WARN-01 | branch.vue | 提示信息硬编码(8处) |
| WARN-02 | branchAdmin.vue | 提示信息硬编码(13处) |
| WARN-03 | custCorp.vue | 提示信息硬编码(8+处) |
| WARN-04 | custAcct.vue | 提示信息硬编码(6处) |
| WARN-05 | custCorpSign/Audit | $t()使用中文key(4处) |
| WARN-06 | custInfoOnlineQuery.vue | 提示信息硬编码(2处) |
| WARN-07 | custCorpSignRecord.vue | 列标题硬编码(3处) |
| WARN-08 | branch.vue | 中英混合拼接标题 |
| WARN-09 | branch.vue | placeholder硬编码(7处) |
| WARN-10 | branchAdmin.vue | placeholder硬编码(3处) |
| WARN-11 | custAcct.vue | activeFlag渲染硬编码 |
| WARN-12 | acceptBankCreditGrantInfo.vue | placeholder硬编码(3处) |
| WARN-13 | custAcct.vue | == 赋值运算符错误 |
| WARN-14 | custCorpSign/Audit | this.custNo 未定义 |

---

## 六、审查结论

### 总体评价

河南农信个性化前端代码在以下方面表现良好：
1. **目录结构**：所有文件严格放置在 hnnxbank 个性化目录下
2. **路由注册**：所有页面组件均已在 hnnxbankIndex.js 中正确注册
3. **组件复用**：充分复用产品化组件（show-branch、select-cust-corp 等）
4. **UI一致性**：统一使用 h- 前缀组件库
5. **需求5（承兑行额度管理）**：国际化覆盖最完整，可作为标杆

主要风险集中在：
1. **国际化覆盖率不足**：尤其是弹窗标题、提示信息、placeholder 等场景硬编码严重
2. **en-US.js 缺失键值**：pc.credit 模块英文翻译完全缺失，阻塞英文环境使用
3. **少量代码缺陷**：custAcct.vue 赋值运算符错误、custCorpSign 中 this.custNo 未定义

### 建议修复顺序

1. **第一步**（阻塞级）：补全 en-US.js 中 pc.credit 键值 + 修复 acceptBankCreditGrantInfo.vue "是/否"硬编码
2. **第二步**（严重级）：统一修复所有弹窗标题硬编码，提取到国际化文件
3. **第三步**（严重级）：修复 branchAdmin.vue 中已有 i18n key 但未使用的问题
4. **第四步**（警告级）：修复 custAcct.vue 赋值运算符错误 + custCorpSign 中 this.custNo 未定义
5. **第五步**（警告级）：逐步将提示信息、placeholder 等硬编码文本国际化

---

*报告生成时间：2026-05-20*
*审查工具：BEMP 前端代码走查规范 v1.0*
