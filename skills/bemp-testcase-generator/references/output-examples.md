# BEMP 测试用例输出示例

本文档提供各类测试用例的输出示例，已融合 BEMP 票据系统特有格式和验证点。

---

## 一、功能/UI/性能/安全/联动/路由/跳转/适配/可访问性/兼容测试用例格式

```
## 测试用例清单 - 承兑行额度管理模块

### 功能测试

| 编号 | 标题 | 类型 | 模块 | 级别 | 预置条件 | 步骤 | 预期结果 |
|------|------|------|------|------|----------|------|----------|
| TC-CREDITBATCH-001 | 正常新增额度批次 | 功能 | 额度管理 | P0 | 1. 已登录<br>2. 后端服务正常 | 1. 进入额度申请页面<br>2. 点击新增按钮<br>3. 填写必填项<br>4. 点击确定 | 1. 页面正常加载<br>2. 弹窗正常打开<br>3. 数据填写成功<br>4. 提交成功，弹窗关闭 |
| TC-CREDITBATCH-002 | 必填项为空提交 | 功能 | 额度管理 | P1 | 1. 已登录 | 1. 进入额度申请页面<br>2. 点击新增按钮<br>3. 不填写必填项<br>4. 点击确定 | 1. 页面正常<br>2. 弹窗打开<br>3. 提示必填项不能为空 |
| TC-CREDITBATCH-003 | 金额边界值测试 | 功能 | 额度管理 | P1 | 1. 已登录 | 1. 新增额度明细<br>2. 输入最大授信额度<br>3. 提交 | 提交成功 |

### 安全测试

| 编号 | 标题 | 类型 | 模块 | 级别 | 预置条件 | 步骤 | 预期结果 |
|------|------|------|------|------|----------|------|----------|
| TC-CREDITBATCH-SEC-001 | SQL注入防护 | 安全 | 额度管理 | P0 | 1. 已登录 | 1. 在输入框输入SQL注入语句<br>2. 提交 | 1. 注入失败<br>2. 数据安全 |
| TC-CREDITBATCH-SEC-002 | XSS攻击防护 | 安全 | 额度管理 | P0 | 1. 已登录 | 1. 在输入框输入XSS脚本<br>2. 提交 | 1. 脚本不执行<br>2. 原样展示或转义 |

### 联动测试

| 编号 | 标题 | 类型 | 模块 | 级别 | 预置条件 | 步骤 | 预期结果 |
|------|------|------|------|------|----------|------|----------|
| TC-CREDITBATCH-LINK-001 | 提交复核→复核页状态同步 | 联动 | 额度管理 | P0 | 1. 有草稿状态额度明细 | 1. 在额度申请页提交复核<br>2. 导航到额度复核页 | 1. 申请页状态变为"待复核"<br>2. 复核页显示"待复核"记录 |
| TC-CREDITBATCH-LINK-002 | 复核→申请页状态回写 | 联动 | 额度管理 | P0 | 1. 有待复核额度明细 | 1. 在复核页执行复核<br>2. 返回申请页 | 1. 复核成功<br>2. 申请页状态变为"已复核" |

### BEMP特有验证

| 编号 | 标题 | 类型 | 模块 | 级别 | 预置条件 | 步骤 | 预期结果 |
|------|------|------|------|------|----------|------|----------|
| TC-CREDITBATCH-BEMP-001 | 个性化路径验证 | BEMP验证 | 额度管理 | P0 | 1. 已配置银行url_prefix | 1. 触发查询操作<br>2. 监听API请求 | 请求路径包含/hnnxbank/前缀 |
| TC-CREDITBATCH-BEMP-002 | 控制台错误检测 | BEMP验证 | 额度管理 | P0 | 1. 已登录 | 1. 执行页面操作<br>2. 检查控制台日志 | 无TypeError/ReferenceError |
| TC-CREDITBATCH-BEMP-003 | 弹窗三通道关闭 | BEMP验证 | 额度管理 | P0 | 1. 弹窗已打开 | 1. 点击X关闭<br>2. 点击关闭按钮<br>3. 点击重置按钮 | 1. X关闭成功<br>2. 关闭按钮关闭成功<br>3. 重置后表单清空，弹窗保持 |
| TC-CREDITBATCH-BEMP-004 | 机构数据隔离 | BEMP验证 | 额度管理 | P1 | 1. 两个不同机构账号 | 1. 机构A查询额度<br>2. 机构B查询额度 | 各机构仅可见本机构及下级数据 |
```

---

## 二、接口测试用例格式

接口测试用例与其他类型用例格式不同，采用以下结构：

### 接口测试用例格式说明

| 字段 | 说明 |
|------|------|
| 编号 | TC-{模块}-API-{序号} |
| 标题 | {接口名}-{场景描述} |
| 类型 | 接口 |
| 模块 | 所属功能模块 |
| 级别 | P0(阻塞)/P1(高)/P2(中)/P3(低) |
| 请求信息 | Method + URL |
| 请求头 | Headers（如有） |
| 请求参数 | Query/Body参数 |
| 预期响应 | 状态码 + 响应体结构/关键字段 |

### 接口测试用例示例

```
## 测试用例清单 - 额度管理模块（接口测试）

### 接口测试

| 编号 | 标题 | 类型 | 模块 | 级别 | 请求信息 | 请求头 | 请求参数 | 预期响应 |
|------|------|------|------|------|----------|--------|----------|----------|
| TC-CREDITBATCH-API-001 | 查询额度批次-正常 | 接口 | 额度管理 | P0 | GET /hnnxbank/credit/batch/list | Authorization: Bearer {token} | {pageNo: 1, pageSize: 10} | 200, {total: N, list: [...]} |
| TC-CREDITBATCH-API-002 | 新增额度批次-正常 | 接口 | 额度管理 | P0 | POST /hnnxbank/credit/batch/add | Authorization: Bearer {token} | {creditType: "1", custType: "1", ...} | 200, {success: true} |
| TC-CREDITBATCH-API-003 | 新增额度批次-参数缺失 | 接口 | 额度管理 | P1 | POST /hnnxbank/credit/batch/add | Authorization: Bearer {token} | {creditType: "1"} | 400, {error: "必填参数缺失"} |
| TC-CREDITBATCH-API-004 | 查询额度批次-无效Token | 接口 | 额度管理 | P1 | GET /hnnxbank/credit/batch/list | Authorization: Bearer invalid | {pageNo: 1} | 401, {error: "认证失败"} |
| TC-CREDITBATCH-API-005 | 查询额度批次-个性化路径 | 接口 | 额度管理 | P0 | GET /hnnxbank/credit/batch/list | Authorization: Bearer {token} | {pageNo: 1, pageSize: 10} | 请求路径包含/hnnxbank/前缀 |
| TC-CREDITBATCH-API-006 | 提交复核-状态守卫 | 接口 | 额度管理 | P0 | POST /hnnxbank/credit/batch/submit | Authorization: Bearer {token} | {batchId: "{已复核的id}"} | 200, {success: false, msg: "状态不允许"} |
```

### 真实BEMP接口测试用例示例（承兑行额度管理）

```
## 测试用例清单 - 承兑行额度管理（接口测试）

### 接口测试

| 编号 | 标题 | 类型 | 模块 | 级别 | 请求信息 | 请求头 | 请求参数 | 预期响应 |
|------|------|------|------|------|----------|--------|----------|----------|
| TC-CREDITBATCH-API-010 | 查询额度申请列表 | 接口 | 额度管理 | P0 | POST /bemp-served/hnnxbank/creditBatch/queryCreditBatchList | Cookie: {session} | {"pageNo":1,"pageSize":10,"creditType":"","status":""} | 200, {"code":"0000","data":{"total":N,"list":[...]}} |
| TC-CREDITBATCH-API-011 | 新增额度批次 | 接口 | 额度管理 | P0 | POST /bemp-served/hnnxbank/creditBatch/addCreditBatch | Cookie: {session} | {"creditType":"1","custType":"1","custName":"测试银行","maxCreditAmt":"1000000"} | 200, {"code":"0000","msg":"新增成功"} |
| TC-CREDITBATCH-API-012 | 删除额度批次-草稿状态 | 接口 | 额度管理 | P1 | POST /bemp-served/hnnxbank/creditBatch/deleteCreditBatch | Cookie: {session} | {"batchId":"{草稿状态batchId}"} | 200, {"code":"0000","msg":"删除成功"} |
| TC-CREDITBATCH-API-013 | 删除额度批次-已复核状态 | 接口 | 额度管理 | P0 | POST /bemp-served/hnnxbank/creditBatch/deleteCreditBatch | Cookie: {session} | {"batchId":"{已复核batchId}"} | 200, {"code":"9999","msg":"状态不允许删除"} |
| TC-CREDITBATCH-API-014 | 提交复核 | 接口 | 额度管理 | P0 | POST /bemp-served/hnnxbank/creditBatch/submitCreditBatch | Cookie: {session} | {"batchId":"{草稿batchId}"} | 200, {"code":"0000","msg":"提交成功"} |
| TC-CREDITBATCH-API-015 | 查询额度明细列表 | 接口 | 额度管理 | P0 | POST /bemp-served/hnnxbank/creditInfo/queryCreditInfoList | Cookie: {session} | {"pageNo":1,"pageSize":10,"batchId":"{batchId}"} | 200, {"code":"0000","data":{"total":N,"list":[...]}} |
| TC-CREDITBATCH-API-016 | 个性化路径验证 | 接口 | 额度管理 | P0 | * | * | * | 所有请求路径包含/hnnxbank/前缀 |
| TC-CREDITBATCH-API-017 | 机构数据隔离验证 | 接口 | 额度管理 | P1 | POST /bemp-served/hnnxbank/creditBatch/queryCreditBatchList | Cookie: {机构B session} | {"pageNo":1,"pageSize":10} | 返回数据仅含机构B及下级数据 |
```

---

## 三、组件测试用例示例

### DataGrid 组件测试用例

```
## 测试用例清单 - DataGrid 组件（BEMP）

### 功能测试

| 编号 | 标题 | 类型 | 模块 | 级别 | 预置条件 | 步骤 | 预期结果 |
|------|------|------|------|------|----------|------|----------|
| TC-DATAGRID-001 | 默认查询加载 | 功能 | DataGrid | P0 | 1. 进入列表页面 | 1. 等待页面加载完成 | DataGrid自动查询并显示数据 |
| TC-DATAGRID-002 | 条件查询 | 功能 | DataGrid | P0 | 1. 进入列表页面 | 1. 输入查询条件<br>2. 点击查询 | 结果符合筛选条件 |
| TC-DATAGRID-003 | 翻页功能 | 功能 | DataGrid | P1 | 1. 有分页数据 | 1. 点击下一页 | 数据正确翻页 |

### BEMP验证

| 编号 | 标题 | 类型 | 模块 | 级别 | 预置条件 | 步骤 | 预期结果 |
|------|------|------|------|------|----------|------|----------|
| TC-DATAGRID-BEMP-001 | 个性化路径验证 | BEMP验证 | DataGrid | P0 | 1. 已配置url_prefix | 1. 触发查询<br>2. 监听请求 | API使用个性化前缀 |
| TC-DATAGRID-BEMP-002 | 状态列文本映射 | BEMP验证 | DataGrid | P1 | 1. 有状态列数据 | 1. 读取状态列文本 | 状态文本与状态码映射正确 |
```

---

## 四、测试用例汇总统计

生成完整测试用例后，应输出汇总统计：

```
## 测试用例汇总统计

| 类型 | 数量 | P0 | P1 | P2 | P3 |
|------|------|-----|-----|-----|-----|
| 功能测试 | 15 | 3 | 5 | 5 | 2 |
| 接口测试 | 8 | 2 | 5 | 1 | 0 |
| UI测试 | 5 | 0 | 2 | 2 | 1 |
| 性能测试 | 3 | 0 | 2 | 1 | 0 |
| 安全测试 | 4 | 2 | 2 | 0 | 0 |
| 联动测试 | 2 | 1 | 1 | 0 | 0 |
| 路由测试 | 2 | 1 | 1 | 0 | 0 |
| 跳转测试 | 2 | 0 | 1 | 1 | 0 |
| 适配测试 | 2 | 0 | 1 | 1 | 0 |
| 可访问性测试 | 2 | 0 | 1 | 1 | 0 |
| 兼容测试 | 2 | 0 | 1 | 1 | 0 |
| BEMP特有验证 | 4 | 2 | 1 | 1 | 0 |
| **总计** | **51** | **11** | **23** | **13** | **4** |

**覆盖率**：100%（所有11种测试类型 + BEMP特有验证均已覆盖）
**目标达成**：覆盖度≥90% ✓
```
