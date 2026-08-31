# 陷阱分片：登录与账号（login）

> 代码 SSoT 原则：通用代码只存于 [tool-mapping.md §片段库-登录与认证](../tool-mapping.md#登录与认证)，本分片仅保留独有信息。

## 症状速查

| 症状 | 陷阱 |
|------|------|
| 登录失败，输入值被截断 | 陷阱1 |
| 登录失败密码错误（加密未触发） | 陷阱12 |
| 账号锁定无法解锁 | 陷阱13 |
| MCP 解锁无效 | 陷阱15 |
| 登录失败密码过短 | 陷阱25 |

---

## 陷阱1：fill_form 截断输入值（P0）

**现象**：`fill_form` 填写 HUI 表单时输入值被截断（仅前半部分字符）。

**根因**：HUI 组件基于 Vue `v-model` 双向绑定，`fill_form` 触发的事件被框架重新计算覆盖。

**影响**：所有 h-input、日期、金额输入框。

**标准方案**：原生 setter 设 `input.value` → `dispatchEvent(new Event('input', {bubbles:true}))` → take_snapshot 验证。代码见 [片段库-HUI组件表单](../tool-mapping.md#hui-组件表单)。

**不推荐**：`type_text`（慢+输入法干扰）、单字段 `fill`（同样截断）、重复 `fill_form` 重试。

---

## 陷阱12：BEMP 登录密码加密未触发（P0）

**现象**：`fill`/`type_text` 填 `input[name="tempPassword"]` 后登录返回"用户名或密码错误"或"用户已锁定"。

**根因**：BEMP 登录用 SM4 加密，加密在 `login()` API 内部自动完成。`tempPassword` 是可见输入框，`password` 是隐藏加密字段；`fill` 类工具不触发 `passwordTempChange()`，导致加密字段为空或为明文。

**标准方案**（按优先级）：
- 方案A（首选）：Vue 实例设 `loginForm` 各字段后调 `handleLogin()` → 代码见 [片段库-登录与认证](../tool-mapping.md#登录与认证)
- 方案B（备选）：原生 setter + dispatchEvent('input'+'change'+'blur') → 代码见 [片段库-HUI组件表单](../tool-mapping.md#hui-组件表单)

**关键选择器**：
- 字段：`input[name="username"]`、`input[name="tempPassword"]`（可见）、`input[name="password"]`（隐藏加密）
- 登录按钮：`button.h-btn-primary`（按钮文本可能含空格，勿用 `:has-text("登录")`）
- 三种登录方式：密码登录(`div.login-type-content-pwd`)、指纹、手机号

---

## 陷阱13：用户账号被锁定后无法解锁（P0）

**现象**：多次登录失败后返回"用户已锁定"（错误码 0BE229904013），即使 MCP 数据库已解锁仍失败。

**根因**：后端实际连接的数据库可能与 Oracle MCP 连接的数据库不同；错误次数达阈值后 `IS_ENABLE=0` 且 `PWD_ERR_TIMES` 增加，MCP 侧解锁不影响后端真实库。

**标准方案**（按优先级）：
- 方案A（最可靠）：法人管理员(mllzs01)登录 → 系统管理 → 柜员/管理员管理 → 界面操作解锁
- 方案B：Vue 实例调用解锁 API `func_unLockLegalPersonManager` → 代码见 [片段库-登录与认证](../tool-mapping.md#登录与认证)
- 方案C：在后端真实库执行 SQL：
```sql
UPDATE TM_USER SET IS_ENABLE = '1', PWD_ERR_TIMES = 0, LOGIN_STATUS = '0' WHERE USER_NO = '{user_no}';
COMMIT;
```

**TM_USER 字段映射**（常见误解 → 实际）：

| 误解字段 | 实际字段 | 说明 |
|---------|---------|------|
| USER_CODE | USER_NO | 用户编号 |
| STATUS | IS_ENABLE | 启用(1)/禁用(0) |
| LOCK_FLAG | LOGIN_STATUS | 登录锁定(0正常/1锁定) |
| LOGIN_FAIL_COUNT | PWD_ERR_TIMES | 密码错误次数 |

**预防**：测试前确认后端实际数据库地址；避免连续错误登录；备好备用账号。

---

## 陷阱15：后端数据库地址与 MCP 数据库不一致（P1）

**现象**：Oracle MCP 解锁后登录仍失败。

**根因**：后端 `jdbc.url`（`deploy/bemp-home/src/main/resources/configcenter/banks/{bankName}/merge.properties`）与 MCP 配置的库不同。

**标准方案**：
1. 先查 merge.properties 确认后端真实库（密码可能带 `sm4:` 加密前缀）
2. 在正确库上执行解锁（sqlplus 需 ASCII 编码写 SQL 文件，避免 BOM）：
```powershell
$sqlFile = "unlock_user.sql"
[System.IO.File]::WriteAllText($sqlFile, "UPDATE TM_USER SET IS_ENABLE='1', PWD_ERR_TIMES=0 WHERE USER_NO='{user_no}'; COMMIT; EXIT;", [System.Text.Encoding]::ASCII)
& sqlplus -S "{jdbc_username}/{jdbc_password}@{jdbc_host}:{jdbc_port}:{jdbc_service}" "@$sqlFile"
```
3. 或走界面解锁（陷阱13方案A）

**注意**：解锁后可能需重启后端或清 Redis 缓存。

---

## 陷阱25：登录密码禁止硬编码，必须从配置读取（P0）

**现象**：脚本/prompt 中硬编码密码 '1'/'123456'，登录失败"密码不能小于6位"。

**根因**：默认密码 '888888'（env-config.json `environmentDefaults.default_password`）；不同银行密码不同且可能更换；硬编码有安全风险。

**密码获取优先级**：
1. 环境变量 `${ENV:BEMP_TEST_PASSWORD}`（CI/CD）
2. bemptest-config.json `accounts.{role}.password`
3. env-config.json `environmentDefaults.default_password`
4. 禁止在任何 prompt/脚本中硬编码密码值

**登录代码中的密码处理**：见 [片段库-登录与认证](../tool-mapping.md#登录与认证)，占位符 `{username_from_config}`/`{password_from_config}` 由配置解析链填充。

**预防**：测试前核对 accounts 配置完整性；代码评审检查硬编码密码。
