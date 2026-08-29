---
name: bemp-adapter-dev
description: |
  BEMP 银行适配器 MessageConverter 开发技能。
  适用：(1) 新增 MessageConverter（Server/Client）；(2) 改造已有 Converter；(3) 接入新外围系统；
  (4) 编写/补充单元测试。覆盖 SOAP/WS、JSON、TCP+定长头、HTTP、AMQP、SOFA RPC 等协议。
version: 12.0
updated: 2026-06-10 (v202602.00 新增 Mock-Msg 驱动开发章节)
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

## 触发条件

Use this skill when:
- 在 banks/ext-<bank-key>/ 下新增/改造 *MessageConverter.java
- 接入新外围系统（ESB/ECIF/信贷/核心/短信平台等）
- 编写/补充 *MessageConverterTest.java
- 为新银行搭建 adapter 模块脚手架

Do NOT use this skill when:
- 任务与银行适配器无关（纯前端/纯业务逻辑）
- 修改公共 adapter 基类（adapter/api、adapter/as）→ 用 bemp-personalized-dev
- 设计接口 → 用 bemp-generate-prd
- 处理业务逻辑（会计分录/审批流）→ 用 bemp-personalized-dev

## 前置检查

| # | 检查项 | 期望 | 失败处理 |
|---|--------|------|----------|
| 1 | 目标银行 | bank-index.json 中存在 | 不存在 → 走首次开发流程 |
| 2 | 外围接口文档 | 业务方提供 docx/markdown | 无文档 → 拒绝开发 |
| 3 | 报文类型 | SOAP/JSON/TCP/HTTP/AMQP/SOFA | 未知 → 走基类决策树 |
| 4 | 功能号 | PICE/BICE/POPC/BOCE 等 6-12 位编码 | 无功能号 → 找业务方申请 |
| 5 | mock-msg | src/test/resources/mock-msg/ 有请求+应答报文 | 缺失 → 找业务方索取 |
| 6 | 基类 | 决策树确定 | 多候选 → 优先同银行已有模式 |

## Mock-Msg 驱动开发

**核心原则**: mock-msg 是开发契约，先写报文再写代码。报文即测试数据，代码即报文映射。

### Step 1: 获取报文

```text
业务方提供报文?
  ├─ 是 → 验证完整性（有request+response、字段非空）→ 直接使用
  └─ 否 → 从接口文档推断报文结构 → 标"待联调确认"
           ├─ 有接口文档 → 提取字段列表+示例值 → 构造报文
           └─ 无接口文档 → 阻塞，等业务方提供
```

**报文来源优先级**: 业务方提供 > 同银行同通道已有报文参考 > 接口文档推断

### Step 2: 创建 mock-msg 文件

| 规则 | 要求 |
|------|------|
| 目录 | `src/test/resources/mock-msg/<ConverterName>/` |
| 命名 | `<bank>_<channel>_<func>_<biz>_<request\|response>.{xml\|json}` |
| 数量 | >=1 请求 + >=1 应答 |
| 编码 | UTF-8（查 bank-config.json mock_msg.encoding，默认 UTF-8） |
| 内容 | 真实业务值，禁止空JSON/占位符/全零值 |
| 注释 | XML 报文头部注释标明 bank/channel/func/base-class/报文特点 |

**命名示例**:
- `hnnxbank_ecif_PICE070701_request.xml`
- `sanxbank_ebank_PICE070101_newBill_request.json`
- `sanxbank_credit_POPC030102_occupyLimit_request.json`

**报文特点注释模板**（XML 报文必须包含）:
```xml
<!--
  mock-msg: <bank> <channel> <biz_desc>
  bank: <bank-key>
  channel: <channel>
  func: <FUNC_CODE>
  base-class: <base-class-name> (<template_mode>)
  报文特点:
    - <特点1: 如 XML 报文无 SOAP Envelope>
    - <特点2: 如含数组字段>
-->
```

### Step 3: 基于 mock-msg 编写 Converter

**开发顺序**: mock-msg → fromMessage → toMessage → getFunctionIdMapping

1. **fromMessage**: 按 mock-msg request 结构逐字段解析
   - 每个字段映射对应 mock-msg 中的一个节点
   - 嵌套节点先判 null 再取值
   - 语义映射（值域转换）标注"测试假设"

2. **toMessage**: 按 mock-msg response 结构组装
   - 参考同银行同通道已有 Converter 的响应格式
   - 成功响应至少包含 retCode + retMsg

3. **getFunctionIdMapping**: 格式 `{外围交易码, 产品功能号}`
   - 外围交易码从 mock-msg 或接口文档获取
   - 产品功能号即类名前缀（PICE/BICE/POPC 等）

   **格式校验规则**（查 bank-config.json mapping_validation 配置）:
   - 数组长度必须 >= `mapping_validation.min_length`（默认2）
   - 每个元素必须是独立字符串，禁止逗号写在字符串内部
   - 外部服务码必须匹配 `mapping_validation.ext_code_prefixes` 中的前缀之一
   - 最后一个元素（内部功能号）必须与类名前缀一致

   ```java
   // ✅ 正确：两个独立元素
   return new String[]{"EBBS.12402060.01", "PICE070701"};

   // ❌ 错误：逗号在字符串内部，数组长度=1，基类 afterPropertiesSet() 不注册映射
   return new String[]{"EBBS.12402060.01,PICE070701"};
   ```

   **基类注册逻辑**（AbstractMessageApplyResponseConverter.afterPropertiesSet）:
   - size == 2 → `FUNCTION_ID_MAP.put(array[0], array[1])`
   - size > 2 → 前面所有元素作为 key 映射到最后一个元素
   - size < 2 → 打印"无效映射关系"，映射表为空，运行时报"功能号映射关系查找失败"

### Step 4: 基于 mock-msg 编写 Test

1. 继承对应测试基类（查 bank-config.json test_config 或 style_enum.test_template）
2. 加载 mock-msg 文件作为输入
3. 调用 Converter 方法
4. 断言核心字段映射（>=3 个业务字段）
5. 补充异常场景（必输字段缺失、报文非法）

### 不确定性与失败处理

| 不确定性 | 判定 | 处理 |
|---------|------|------|
| 报文结构不确定 | 有接口文档 → 不阻塞 | 从文档推断，标"待联调确认" |
| 字段映射不确定 | 名不同义同 → 不阻塞 | 最保守假设，标"待确认" |
| 响应格式不确定 | 无参考 → 不阻塞 | 参考同银行同通道已有 Converter |
| mock-msg 与真实报文不一致 | 联调后才发现 | 联调后修正 mock-msg 并回归测试 |
| 字段名大小写错误 | 编译不报错但运行时取值null | 严格使用 MessageConstants 常量 |
| 嵌套节点路径错误 | fromMessage 返回空值 | 逐层 getNode 逐步调试 |

## 银行路由（按需加载）

**必须先读取 config/bank-index.json**，按 bank-key 路由，禁止在主文件硬编码银行信息：

```text
用户指定 bank-key  查 bank-index.json  获取 status/style/ref
  IMPLEMENTED  -> 加载 ref 模板（含详细规范）
  LEGACY       -> 加载 ref 模板（仅参考，基类当前分支不可用）
  EMPTY        -> 加载 _empty-bank-skeleton.md + 走首次开发
  不在索引中    -> 走首次开发
```

**路由规则**:
- custom_abstracts 非空 → 必须优先使用银行自定义基类
- LEGACY 银行基类在当前分支不可用
- 包名例外查 bank-index.json 的 pkg_note 字段
- style 字段 → 查 style_enum 子对象 → 获取 base/msg/test_template
## 实施步骤

> 所有步骤遵循 Mock-Msg 驱动开发原则：**先写报文，再写代码**。

### Server 端（被动接收）

1. 选择基类（决策树 + 银行模板 custom_abstracts）
2. **创建 mock-msg**（见 Mock-Msg 驱动开发 Step 1-2）
3. 创建 *MessageConverter.java
4. 基于 mock-msg request 重写 fromMessage(Message<?>)  解析外围报文为内部 JSON
5. 基于 mock-msg response 重写 toMessage(Message<?>, JSONObject)  内部 JSON 拼装为外围响应
6. 如需路由，重写 getFunctionIdMapping() 或 getWsdlDefinition()
7. 基于 mock-msg 编写配套 Test（见 Mock-Msg 驱动开发 Step 4）

### Client 端（主动调用）

1. 选择基类（决策树 + 银行模板 custom_abstracts）
2. **创建 mock-msg**（见 Mock-Msg 驱动开发 Step 1-2）
3. 创建 *MessageConverter.java
4. 基于 mock-msg request 重写 toMessage(JSONObject)  内部 JSON 拼装为外围请求
5. 基于 mock-msg response 重写 fromMessage(Message<?>, JSONObject)  解析外围响应为内部 JSON
6. 配置通道
7. 基于 mock-msg 编写配套 Test

### 异步/通用 Converter

1. 选择 AbstractGenericMessage* 系列基类
2. **创建 mock-msg**（见 Mock-Msg 驱动开发 Step 1-2）
3. 重写异步处理方法（process/handle）
4. 配置消息中间件队列名
5. 基于 mock-msg 编写配套 Test（使用 @MockBean mock 中间件）
## 基类决策树

### Step 1: 查 bank-index.json custom_abstracts

```text
custom_abstracts 非空 -> 必须使用银行自定义基类
空 -> Step 2
```

### Step 2: 公共基类决策树

```text
Server -> AbstractMessageApplyResponseConverter / AbstractGenericMessageApplyResponseConverter
Client -> JSON:AbstractMessageRequestReplyConverter / HTTP:AbstractHttpMessageRequestReplyConverter
         / WS:AbstractWsMessageRequestReplyConverter / TCP:AbstractTcpMessageRequestReplyConverter
         / JMS:AbstractJmsMessageRequestReplyConverter / AMQP:AbstractAmqpMessageRequestReplyConverter
         / Generic:AbstractGenericMessageRequestReplyConverter
```

基类位置: adapter/as

### Step 3: 按 style 查 bank-index.json style_enum

查 style -> style_enum -> 获取 server_base/client_base/server_msg/client_msg/test_template

**所有 style 枚举及对应基类均在 bank-index.json 中维护，SKILL.md 不重复列举。**

## 测试（MUST）

违反任一条 -> 开发不合格

| # | 规则 | 说明 |
|---|------|------|
| M1 | 每Converter必配Test | *MessageConverter.java -> *Test.java，同包 |
| M2 | 含mock报文 | >=1请求+>=1应答，存 src/test/resources/mock-msg/ |
| M3 | SpringBoot测试 | @SpringBootTest + @ActiveProfiles(test) |
| M4 | 双模式运行 | IDE Run(JUnit5) + mvn test -Dtest=NameTest |
| M5 | 4场景覆盖 | 入参解析/字段映射/应答拼装/异常分支 |
| M6 | 命名规范 | bank_channel_func_biz_request|response.xml|json |
| M7 | 继承测试基类 | 按 style_enum.test_template 选模板 |
| M8 | 真实业务值 | mock报文必须含真实字段值（禁止空JSON或占位符） |
| M9 | 核心字段断言 | 字段映射断言>=3个核心业务字段 |

覆盖率: 行>=70%，分支>=60%，关键方法100%

## 首次开发银行脚手架

当 bank-index.json 中目标银行 status!=IMPLEMENTED 或不在索引时，编写 Converter 前必须完成：

| # | 步骤 | 验证 |
|---|------|------|
| 1 | 创建 banks/ext-<bank>/pom.xml（parent=bemp-banks） | Test-Path |
| 2 | 创建 banks/ext-<bank>/<bank>-adapter-as/pom.xml（依赖bemp-adapter-as） | Test-Path |
| 3 | 在 banks/pom.xml 的 modules 中添加 ext-<bank> | Select-String |
| 4 | 在 bank-index.json 新增银行条目（status=IMPLEMENTING） | JSON解析 |
| 5 | （可选）创建 <bank>-adapter-boot-deploy 启动器 | Test-Path |

**规则**: 脚手架未完成禁止编写 Converter。参考最相似银行（同农商系列优先）复制目录结构。

## 字段映射

| 类型 | 判定 | 代码模式 |
|------|------|---------|
| 直接 | 字段名相同 | json.put(custNo, textOf(node, custNo)) |
| 重命名 | 名不同义同 | json.put(mrgdCustNo, textOf(node, suspectCustNo)) |
| 语义 | 值域不同需转换 | Y->1 / N->2 |
| 嵌套 | 外围嵌套需展平 | if (subNode != null) { json.put(...) } |
| 数组 | 外围数组->JSONArray | for (int i=0; i<arr.size(); i++) |

**null防护**: 嵌套映射必须先判 subNode!=null。语义映射标注测试假设。

详见 references/field-mapping-methodology.md

## 阻塞项判定

| 场景 | 判定 | 处理 |
|------|------|------|
| 产品代码不在仓库 | 不阻塞 | 从测试用例提取字段定义，标测试假设 |
| docx 找不到 | 必须验证 | Test-Path 确认不存在后才标阻塞 |
| 字段枚举值不确定 | 不阻塞 | 最保守假设，标待确认 |
| 报文结构不明确 | 阻塞 | 等业务方提供 |
| 功能号未分配 | 阻塞 | 等业务方申请 |

## 验证清单

- [ ] 编译: mvn clean compile -pl banks/ext-<bk>/<bk>-adapter-as/
- [ ] 单测: mvn test -pl banks/ext-<bk>/<bk>-adapter-as/ -Dtest=<Name>Test
- [ ] 覆盖率达标
- [ ] Spring启动无Bean失败
- [ ] 映射格式: getFunctionIdMapping数组长度>=2，无逗号写在字符串内部
- [ ] 路由可达（WS类型验证WSDL可下载）
- [ ] 联调通过
- [ ] 提交: git commit -m 【<银行名>】个性化开发【<func><功能名>】
- [ ] 更新银行模板: 新增字段映射/踩坑补充到 references/banks/<bk>.md

## 异常处理

| 异常 | 根因 | 处理 |
|------|------|------|
| WsdlDefinition Bean找不到 | 缺WSDL文件 | 复制同bank同channel的WSDL，修改service/operation |
| tagVo字段并发串数据 | tagVo声明为static | 改为实例变量 |
| 字段解析返回null | 字段名前缀与动态域名不一致 | 用tagVo.getRequestTag()+fieldName拼接 |
| 报文头解析失败 | 字段名大小写错误 | 严格使用MessageConstants.*常量 |
| 中文乱码 | 未指定GBK | builder.asXML(false,false,Charset.forName(GBK).toString()) |
| HeadUtils null | 未@Autowired | 改为@Autowired private HeadUtils headUtils |
| 测试全绿但生产报错 | mock-msg与真实报文不一致 | 用bemp-chrome-devtools-test抓真实报文对比 |
| Bean冲突 | @Component名称重复 | 确保Component名=类名 |
| cannot find symbol | 缺公共模块依赖 | pom.xml加adapter-api/adapter-as/adapter-client-api |
| ESB通道Bean找不到 | #esb通道未配置 | 检查Spring配置中tcpMessageChannel#esb |
| EsbXmlUtils解析失败 | ESB信封节点名不匹配 | 使用银行专用工具类（查银行模板ref） |
| 包名不一致 | 部分银行包名有例外 | 确认bank-index.json的pkg+pkg_note |
| mock-msg加载失败 | 文件路径或命名不规范 | 检查目录名=Converter类名，文件名符合命名规范 |
| mock报文字段全null | 报文节点路径与实际不匹配 | 对照mock-msg逐步调试getNode路径 |
| Test假绿（断言未执行） | mock-msg为空JSON或占位符 | mock-msg必须含真实业务值（M8规则） |
| 联调字段缺失 | mock-msg缺少生产报文中的字段 | 联调后补充缺失字段到mock-msg并回归 |
| 功能号映射关系查找失败 | getFunctionIdMapping数组格式错误：逗号写在字符串内部导致数组长度=1，基类afterPropertiesSet()不注册映射 | 拆分为独立字符串元素：`new String[]{"EBBS.xxx.01", "PICEyyy"}` |
| getFunctionIdMapping无效映射 | 数组长度<2，基类打印"无效映射关系" | 确保数组>=2个元素，参考mapping_validation配置 |

## 命名规范

- 包: com.hundsun.bemp.<bk>.adapter.msg.<server|client>.<channel>（例外见pkg_note）
- 类: <FUNC_CODE>MessageConverter.java
- Component: 与类名同名
- Test: <FUNC_CODE>MessageConverterTest.java（与被测类同包）
- mock-msg: <bank>_<channel>_<func>_<biz>_<request|response>.{xml|json}
- WSDL: src/main/resources/wsdl/<FUNC_CODE>.wsdl

## 文件索引

| 类别 | 路径 | 说明 |
|------|------|------|
| 银行路由索引 | config/bank-index.json | 唯一数据源: status/style/base_class/custom_abstracts/pkg/channels/test_template |
| 银行参考模板 | references/banks/ | 按需加载: 含详细开发规范、报文格式、工具类 |
| 测试基类模板 | references/test-template/ | 按 style_enum.test_template 选用 |
| 字段映射方法论 | references/field-mapping-methodology.md | 5种映射类型详解 |
| Converter模板 | assets/MessageConverter.java.tpl | 新建Converter骨架 |
| 扫描脚本 | scripts/scan_banks.py | 扫描 banks/ 生成结构化数据，支持 --root/BEMP_ROOT |
| 更新脚本 | scripts/update_index.py | 增量更新 bank-index.json，支持 --root/--scan/--branch |
| 验证脚本 | scripts/verify_index.py | 验证索引完整性、模板覆盖率 |
| 探索脚本 | scripts/explore_codebase.py | 搜索同银行/跨银行参考实现 |
| Spec生成 | scripts/generate_spec.py | 生成 spec/tasks/checklist 文档 |
