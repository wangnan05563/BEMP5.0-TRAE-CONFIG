# 反洗钱同步安全修复回归用例（2026-09-06 扫描缺陷收敛）

| 属性 | 值 |
|------|-----|
| 版本 | v1.0（2026-09-06） |
| 变更来源 | 代码扫描质量收敛：SyncJobUtils.resolveDataFile 白名单升级 + 两个 Branch 控制器 validateImportFile Content-Type/魔数双校验 |
| 关联索引 | TC-AML-SEC-001~006（test-index.json） |
| 被测代码 | banks/ext-hnnxbank/hnnxbank-biz-as |
| 编号规则 | SEC-{三位数字}，模块归属反洗钱同步安全回归 |

## 一、代码版本确认（执行前必读）

- SyncJobUtils.class / HnnxBankBranchController.class / HnnxbankBranchAdminController.class 编译时间：2026-09-06 13:09:27~13:09:30
- 后端进程（PID 27520，端口 8010）启动时间：2026-09-06 11:12:44
- **结论：后端运行时为旧代码，安全修复未生效。** SEC-001~005 代码审查类按源代码核对不受影响；SEC-006 运行时用例执行结果仅代表旧代码行为，魔数"不误伤"结论须服务重启加载新代码后回归确认（回归条件见第六节）。

## 二、用例清单

| 编号 | 名称 | 测试方式 | 优先级 | 可执行性 |
|------|------|---------|--------|---------|
| SEC-001 | resolveDataFile 合法路径放行 | 代码审查 | P0 | 独立可执行 |
| SEC-002 | 非法文件名拒绝 | 代码审查 | P0 | 独立可执行 |
| SEC-003 | 非法日期/根目录拒绝 | 代码审查 | P0 | 独立可执行 |
| SEC-004 | .. 逃逸双重拦截 | 代码审查 | P0 | 独立可执行 |
| SEC-005 | 上传 Content-Type+魔数双校验 | 代码审查 | P0 | 独立可执行 |
| SEC-006 | 管理员批量导入真实 xlsx 正常解析 | 运行时/Playwright | P0 | 需跨模块操作 |

---

## SEC-001 resolveDataFile 合法路径放行

- **测试方式**：代码审查
- **优先级**：P0
- **前置条件**：SyncJobUtils.java 为 2026-09-06 白名单升级后版本（L31 修改说明存在即满足）
- **步骤**：
  1. 核对三个预编译白名单正则定义：FILE_NAME_PATTERN（L56）、DATE_STR_PATTERN（L61）、ROOT_PATH_PATTERN（L67）
  2. 对三个业务文件名做正则语义推演：`CBS_PJGCS_20260905.txt`、`CBS_PJGGX_20260905.txt`、`ECF_M_CUST_SPECIAL_INFO_LIST_20260905.txt`，字符集均为 [A-Za-z0-9._-] 且无连续两点段，应命中 `^(?!.*\.\.)[A-Za-z0-9._-]+$`
  3. 对日期 `20260905` 做推演：8 位数字命中 `^\d{8}$`
  4. 对合法根目录 `D:\bemp\cbs` 做推演：字符集 [A-Za-z0-9._\\/: -] 命中 ROOT_PATH_PATTERN
  5. 核对 L170-178：三段校验通过后 `root.resolve(dateStr).resolve(fileName).normalize()` 返回 File 对象且 startsWith 守卫不触发
- **预期结果**：
  1. 三个前缀文件名均匹配 FILE_NAME_PATTERN，不抛异常
  2. resolveDataFile("D:\bemp\cbs", "20260905", "CBS_PJGCS_20260905.txt") 返回 File 对象（路径 D:\bemp\cbs\20260905\CBS_PJGCS_20260905.txt）
  3. 校验链顺序为：空参 → 文件名 → 日期 → 根目录 → normalize/startsWith，任一白名单匹配即继续执行而非中断
- **代码锚点**：[SyncJobUtils.java](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/tk/job/service/impl/SyncJobUtils.java#L56-L67)、[SyncJobUtils.java L147-179](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/tk/job/service/impl/SyncJobUtils.java#L147-L179)

## SEC-002 非法文件名拒绝

- **测试方式**：代码审查
- **优先级**：P0
- **前置条件**：同 SEC-001
- **步骤**：对以下文件名做 FILE_NAME_PATTERN 匹配推演（L156-159 分支）：
  1. 含路径分隔符：`a/b.txt`、`a\b.txt`（/ 与 \ 均不在 [A-Za-z0-9._-] 字符集）
  2. 含空字节：`CBS_PJGCS_20260905\u0000.txt`（\u0000 不在字符集）
  3. 含遍历段：`..evil.txt`、`CBS_PJGCS_.._20260905.txt`（负向前瞻 `(?!.*\.\.)` 排除任意位置连续两点）
  4. 含中文：`名单_20260905.txt`（中文不在字符集）
- **预期结果**：以上 5 类文件名全部不匹配白名单，resolveDataFile 在 L156-159 抛出 BempRuntimeException，错误文案为"同步文件名包含非法字符，已拒绝访问：{fileName}"，不进入日期/根目录校验段
- **代码锚点**：[SyncJobUtils.java L156-159](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/tk/job/service/impl/SyncJobUtils.java#L156-L159)

## SEC-003 非法日期/根目录拒绝

- **测试方式**：代码审查
- **优先级**：P0
- **前置条件**：同 SEC-001
- **步骤**：
  1. 日期段非法推演（L161-164 分支）：`2026090`（7 位）、`202609055`（9 位）、`2026-0905`（含连字符）、`abcd9012`（含字母）均不匹配 `^\d{8}$`
  2. 根目录非法推演（L166-169 分支）：`D:\bemp\<cbs`（含 <）、`D:\bemp>|cbs`（含 > 与 |）、`D:\bemp"cbs`（含 "）、`D:\bemp*`（含 *）、`D:\bemp?`（含 ?）、`D:\bemp\..\other`（含 `..` 段）均不匹配 ROOT_PATH_PATTERN
- **预期结果**：
  1. 4 组非法日期均触发 L161-164 抛 BempRuntimeException，文案"同步营业日期格式非法（须为YYYYMMDD），已拒绝访问：{dateStr}"
  2. 6 组非法根目录均触发 L166-169 抛 BempRuntimeException，文案"同步文件根目录配置包含非法字符，已拒绝访问：{rootPath}"
  3. 文件名合法时日期/根目录校验仍独立生效（三段校验互不短路放行）
- **代码锚点**：[SyncJobUtils.java L161-169](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/tk/job/service/impl/SyncJobUtils.java#L161-L169)

## SEC-004 .. 逃逸双重拦截（纵深防御）

- **测试方式**：代码审查
- **优先级**：P0
- **前置条件**：同 SEC-001
- **测试假设**：本条验证第二层守卫独立有效性，输入 `..\..\secret.txt` 假设性绕过第一层文件名白名单（实际白名单已在第一层拦截，见 SEC-002），观察 normalize+startsWith 守卫是否兜底
- **步骤**：
  1. 核对 L170-171：`root.resolve(dateStr).resolve(fileName).normalize()` 对 `..\..` 段执行路径规范化
  2. 语义推演：root=`D:\bemp\cbs`，dateStr=`20260905`，fileName=`..\..\secret.txt` → target 原始值 `D:\bemp\cbs\20260905\..\..\secret.txt` → normalize 后 `D:\bemp\secret.txt`
  3. 核对 L174-177：`target.startsWith(root)` 结果为 false（D:\bemp\secret.txt 不以 D:\bemp\cbs 开头），触发越界异常
- **预期结果**：normalize 后路径逃出根目录时抛 BempRuntimeException，文案"同步文件路径越界，已拒绝访问：{target}"；两层守卫（正则白名单 + normalize/startsWith）互为冗余，移除任一层另一层仍拦截
- **代码锚点**：[SyncJobUtils.java L170-177](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/tk/job/service/impl/SyncJobUtils.java#L170-L177)

## SEC-005 上传 Content-Type+魔数双校验

- **测试方式**：代码审查
- **优先级**：P0
- **前置条件**：两个控制器源码为 2026-09-06 收敛后版本（HnnxBankBranchController L85 / HnnxbankBranchAdminController L70 修改说明存在即满足）
- **步骤**：
  1. 核对 Content-Type 白名单常量（HnnxBankBranchController L108-112 / HnnxbankBranchAdminController L92-96）：仅含 vnd.ms-excel、vnd.openxmlformats-officedocument.spreadsheetml.sheet、octet-stream 三值，小写化后 contains 比对
  2. 核对魔数常量：EXCEL_XLS_MAGIC=D0CF11E0A1B11AE1、EXCEL_XLSX_MAGIC=PK0304（L113-116 / L97-100）
  3. 校验顺序核对（validateImportFile，控制器 A L551-575 / 控制器 B L944-972）：空名 → 扩展名 → 非法字符 → 大小 → Content-Type → 魔数
  4. 伪造场景推演：纯文本内容 `hello...` 伪装 `.xls` 后缀上传 → validateExcelMagicNumber 读前 8 字节为 "hello..."，两个魔数均不匹配 → L611-614（B 为 L1008-1011）抛"上传文件内容与 Excel 格式不符，可能被篡改"
  5. xlsx 伪装场景记录实际结果：普通 ZIP 文件（头 PK0304）改名 .xlsx 上传 → 魔数校验通过（PK0304 匹配）→ 进入 FileUtil.importExcelMultipartFile 解析层，预期由解析层报错（魔数层不做 openxml 结构校验，此为分层防御设计边界）
  6. 合法文件推演：真实 xls（OLE2 头）与真实 xlsx（openxml，头 PK0304）均命中白名单 Content-Type + 对应魔数 → 放行进入解析
  7. Content-Type 为 `text/plain` 或空 → validateExcelContentType 抛"上传文件类型不允许，仅支持 Excel 格式"（先于魔数校验）
- **预期结果**：
  1. Content-Type 白名单三值精确；非白名单值（含空值）一律拒绝且拒绝发生在魔数校验之前
  2. 纯文本伪装 .xls 被魔数校验拒绝（文案"上传文件内容与 Excel 格式不符，可能被篡改"）
  3. 普通 ZIP 伪装 .xlsx 通过魔数层、由解析层拒绝（记录为设计边界，非缺陷）
  4. 合法 xls/xlsx 双层校验均放行
  5. 两控制器校验链结构与文案完全一致（重复实现为既定收敛方案，一致性核对通过即可）
- **代码锚点**：[HnnxBankBranchController.java L551-633](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java#L551-L633)、[HnnxbankBranchAdminController.java L944-1030](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxbankBranchAdminController.java#L944-L1030)

## SEC-006 管理员批量导入真实 xlsx 正常解析

- **测试方式**：运行时/Playwright
- **优先级**：P0
- **可执行性**：需跨模块操作（登录 + 机构管理员管理页面 + 文件上传）
- **前置条件**：
  1. 前端 8091 / 后端 8010 存活，hnnxbank 管理员账号可登录（账号取 test_config.json banks.hnnxbank.login）
  2. 测试数据：openpyxl 生成的真实 .xlsx 文件（模板列序对齐管理员批量导入模板：用户号/姓名/机构号/角色等），机构号使用专用可识别标记段（清理闭环契约）
  3. ⚠ 版本注记：后端运行时当前为旧代码（无魔数校验），本用例运行时结果仅验证基础导入链路；魔数校验"不误伤正常业务"的最终结论须后端重启加载 13:09 新代码后回归确认
- **步骤**：
  1. Playwright 登录（处理强制登录弹窗），进入机构管理员管理页面（懒加载路由走菜单点击导航）
  2. 点击"批量导入"，上传真实 xlsx 文件，确认导入提交
  3. 观察上传后的响应：不出现"上传文件内容与 Excel 格式不符"/"上传文件类型不允许"类拦截
  4. 查询导入结果：合法行进入解析校验流程（校验结果可为业务校验提示，但不得为文件格式类拒绝）
- **预期结果**：
  1. 真实 xlsx 通过格式校验进入解析流程，无格式类拦截报错
  2. 解析后的业务校验结果（重复用户号/机构不存在等）为正常业务提示，与本回归点无关
- **代码锚点**：[HnnxbankBranchAdminController.java L1040](file:///D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxbankBranchAdminController.java#L1040)（func_batchImportBranchAdmin 调用 validateImportFile）
- **数据清理**：导入产生的管理员记录执行后按用户号标记段清理或登记移交

---

## 三、执行结果记录区

| 编号 | 结果 | 执行时间 | 证据摘要 |
|------|------|---------|---------|
| SEC-001 | ✅ 通过 | 2026-09-06 13:2x | L56/L61/L67 三正则与预期逐字一致；L147-179 校验链顺序=空参→文件名→日期→根目录→normalize/startsWith→返回File；三前缀均 [A-Za-z0-9_] 字符集命中白名单，`CBS_PJGCS_20260905.txt` 无连续两点段通过；resolveDataFile("D:\bemp\cbs","20260905",...) 返回 File 对象 |
| SEC-002 | ✅ 通过 | 2026-09-06 13:2x | `/`/`\`/`\u0000` 不在 [A-Za-z0-9._-] 字符集、`..` 被负向前瞻 `(?!.*\.\.)` 排除、中文不在字符集——5 类输入均在 L156-159 抛 BempRuntimeException，文案逐字核对一致 |
| SEC-003 | ✅ 通过 | 2026-09-06 13:2x | `2026090`/`202609055`/`2026-0905`/`abcd9012` 不匹配 `^\d{8}$`（L161-164 拒绝）；含 <>|"*? 或 `..` 段的 6 组根目录均不匹配 ROOT_PATH_PATTERN（L166-169 拒绝）；三段校验互不短路 |
| SEC-004 | ✅ 通过 | 2026-09-06 13:2x | L170-177 normalize+startsWith 守卫独立于白名单存在；假设 `..\..\secret.txt` 绕过白名单，normalize 后 `D:\bemp\secret.txt` 不以 `D:\bemp\cbs` 开头 → L174-177 抛"同步文件路径越界"；双层互为冗余成立 |
| SEC-005 | ✅ 通过 | 2026-09-06 13:2x | 两控制器常量逐字一致（ContentType 三值白名单 L108-112/L92-96；xls/xlsx 魔数 L113-116/L97-100）；校验链顺序=空名→扩展名→非法字符→大小→ContentType→魔数；文本伪装 .xls 前 8 字节不匹配双魔数→拒绝"上传文件内容与 Excel 格式不符"；ZIP 伪装 .xlsx 过魔数层由解析层拒绝（设计边界记录）；Content-Type=text/plain 先于魔数被 L585-591/L982-988 拒绝；合法 xls/xlsx 放行 |
| SEC-006 | ✅ 通过（带版本注记） | 2026-09-06 | 真实 xlsx（openpyxl 生成，PK0304）上传后成功解析并进入业务校验链——2 条对照文件返回行级业务校验错误（机构号 000011 逐行正确提取，0BE229905511 行级聚合），证明格式校验未拦截合法文件；35 条触发 000002 系统错误（运行时旧代码行为，见 BUG-SEC-002）。魔数校验层未加载（后端运行时旧代码 11:12 启动<13:09 编译），"魔数不误伤"最终结论须重启后回归（第四节） |

## 四、BLOCKED 与回归条件（2026-09-06 23:36 重启后已闭环）

| 用例 | 条件 | 回归动作 | 回归结果 |
|------|------|---------|---------|
| SEC-006 | 后端运行时为旧代码（11:12 启动 < 13:09 编译） | 后端重启加载新代码后重跑本用例，并补跑"文本伪装 .xls 被魔数拦截"的运行时正向回归 | ✅ 已回归（2026-09-06 23:36 重启，进程 43924 > 13:09 编译）：①伪造 .xls（纯文本+正确 MIME）→ validate 接口返回 `0BE128800001 参数校验不通过: 上传文件内容与 Excel 格式不符，可能被篡改`（文案逐字一致）；②空文件上传 → 同文案拒绝；③真实 xlsx（2 条对照，SHA-256 校验 b9e38346…）→ 通过魔数层进入行级业务校验（返回 `0BE229905511` 行级聚合"机构号[000011]不存在"），无格式类拦截——"不误伤"结论成立，版本注记解除 |

### 重启后回归补充结果（2026-09-06 23:36 重启会话）

| 回归项 | 结果 | 证据 |
|--------|------|------|
| BUG-SEC-001（func_importFile 路由残留） | ✅ **关闭** | 无权限/有权限会话 POST `/hnnxbank/antimoney/func_importFile` → HTTP 404 `{"retCode":"000009","retMsg":"request path not found"}`，与不存在路径对照一致（旧代码为 200/000005）；名单页运行时确认无"手动抽取文件"按钮 |
| TC-AML-P0-040 断言2（接口不可达终态） | ✅ **通过** | 同上 404/000009 终态；断言1（无按钮）运行时复核一致；断言3 代码侧前批已过 |
| TC-ORGV2-017（35 条超限精确文案） | ✅ **通过** | form 索引绑定提交 35 条（ADMU001~035/机构 233）→ `0BE229905511 权属机构维护导入异常：单次批量导入机构管理员个数不能超过30个（本次提交35个），请分批导入`（默认 30 动态读取，文案精确）；BUG-SEC-002（000002 系统错误）**关闭**；TM_USER ADMU%=0 零落库复核 |
| TC-ORGV2-018（参数动态生效） | ✅ **通过** | TM_BUSINESS_PARAMETER 插入 branch_admin_max_count=20（LEGAL_NO=000000，无需重启）→ 35 条再提交文案动态变为"不能超过20个（本次提交35个）"；测试后参数已删除，恢复默认 30 |
| SEC-006 魔数层补验 | ✅ **通过** | 见上方回归结果①②③ |
| 菜单 2026090210 可见性（A6） | ✅ 通过（带口径注记） | 机构管理员 wangnan01 会话：场内交易子系统→市场交易→"中互金关注名单"菜单可见可点，路由 `#/banks/hnnxbank/pc/antimoney/antiMoneyList` 注册成功，查询 13 条名单数据（含 certType='22' 记录）、批量导出弹窗 22 列模板一致、同步导出 getExcel HTTP 200；页面无"手动抽取文件"按钮。**口径注记（新缺陷 OBS-004）**：菜单 AUTH_TYPE='2,4,5' 与父分组 303 AUTH_TYPE='3' 不一致——法人管理员（type=4）树断链不可见、普通柜员（type=3）不可见、仅机构管理员（type=2）可见（2026090210 命中 `%2%` 段），详见回归报告 |
| SCHEMA 探针验证 | 过程记录 | TM_AUTHORITY 插入探针菜单（ID=2026090699）→ queryAuthority 立即返回（后端直读 BEMP_HNNX 且菜单无缓存），验证后已删除 |

### 测试数据清理闭环（2026-09-06 会话）

| 数据 | 状态 | 清理 |
|------|------|------|
| SCHEMA 探针菜单 2026090699 | 验证后已删除 | TM_AUTHORITY 计数=0 ✅ |
| TM_ROLE_AUTH 2964390615000001（测试角色→2026090210） | 已删除 | 计数=0 ✅ |
| TM_USER_ROLE 2964390615000002（mllzs01 挂测试角色） | 已删除 | 计数=0 ✅ |
| TM_BUSINESS_PARAMETER 2026090602（branch_admin_max_count=20） | 已删除 | 计数=0 ✅，恢复默认 30 |
| ADMU001~035 管理员用户号 | 超限整批拒绝零落库 | TM_USER ADMU%=0 ✅ |
| 名单表 HNNX_M_CUST_SPECIAL_INFO | 只读查询未写入 | 无需清理 |
| 菜单 2026090210（环境数据） | 保留（另一会话初始化产物） | 不属于本批测试数据 |

## 五、统计

| 优先级 | 条数 | 测试方式分布 |
|--------|------|-------------|
| P0 | 6 | 代码审查 5 + 运行时/Playwright 1 |
| 合计 | 6 | - |
