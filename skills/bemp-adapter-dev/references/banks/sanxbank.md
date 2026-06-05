# 三峡银行（sanxbank）适配器开发参考模板

> bank-key: `sanxbank` | 目录: `ext-sanxbank` | 包: `com.hundsun.bemp.sanxbank.adapter.msg`
> 状态: **IMPLEMENTED** | Converter: **24** | Test: **0**
> 风格: **SERVER_JSON + CLIENT_ESC_HTTP**
> 代表性外围系统: 核心(core)、信贷(credit)、CFCA(数字证书)

---

## 一、项目背景

三峡银行（sanxbank）是 BEMP 项目 workspace 中 10 家已实现银行之一。其 ESC/HTTP 协议适配模式是同类银行的**唯一参考样本**。

- 适配器子模块: `sanxbank-adapter-as`
- 适配器启动器: `sanxbank-adapter-boot-deploy`
- 业务子模块: `sanxbank-biz-as` / `sanxbank-biz-api` / `sanxbank-common` / `sanxbank-conf` / `sanxbank-bemp-home` / `sanxbank-bemp-script`
- 已实现 Converter 总数: **24 个**（Server 端 ~5, Client 端 ~19）
- **test 覆盖: 0%（所有现有 Converter 均无配套测试，是当前最大缺口）**

> **注意**: 历史文档里把 sanxbank 称为「hnnxbank」（河南农商银行），两者**不是同一银行**。`bank-config.json` 中的 `hnnxbank` 配置是占位/历史条目，不要与 sanxbank 混淆。

## 二、子包结构（业务渠道分类）

```
com/hundsun/bemp/sanxbank/adapter/msg/
├── esc/                        # ESC 协议封装（仅 client 端使用）
│   ├── SanxiaAbstractHttpMessageRequestReplyConverter.java   # 抽象基类
│   ├── SanxiaHttpMessageRequestReplyChannel.java
│   ├── EscManager.java
│   ├── EscServer.java
│   ├── EscService.java
│   ├── IProtocol.java
│   ├── Http.java
│   ├── SanxMessageChannelContainer.java
│   └── ThreadLocalContext.java
├── server/                     # Server 端（被动接收）
│   ├── ebank/                  # 网银 (~30 个) — PICE07xxxx, BICE07xxxx, BICE03xxxx, BICE02xxxx, PIBM05xxxx
│   ├── creadit/                # 信贷 (~15 个) — PICE07xxxx, PICE03xxxx, BICE07xxxx, BIPC01xxxx, BIBM04xxxx
│   ├── csp/                    # CSP 平台 (~7 个) — BICE01xxxx, BICE07xxxx, BISM02xxxx, BIPC07xxxx
│   ├── core/                   # 核心 (~2 个) — PICE07xxxx, PIBM01xxxx
│   └── ubps/                   # UBPS (~1 个) — PIPE02xxxx
├── client/                     # Client 端（主动调用）
│   ├── ebank/                  # 网银客户端
│   ├── credit/                 # 信贷客户端 (~9 个) — POPC03xxxx, POBM01xxxx, BOPC05xxxx, BOCExxxxxx
│   ├── core/                   # 核心客户端 (~14 个) — POPC05xxxx, POBM0xxxxx, BOPC05/07xxxx
│   ├── csp/                    # CSP 客户端 (~3 个) — POSM0xxxxx, BOCE01xxxx
│   ├── cfca/                   # CFCA 数字证书 (~5 个) — POSH020101~020105
│   ├── ubps/                   # UBPS 客户端 (~2 个) — POPE020101/020102
│   ├── ocr/                    # OCR (~2 个) — POPC070107, BOPC070106
│   └── core/coredto/           # 核心客户端 DTO 子包
└── util/                       # 工具类
    ├── EcsHeadUtils.java       # ECS 报文头处理（核心工具）
    ├── TransUtils.java         # 报文字段转换
    ├── CommonConstants.java    # 常量
    ├── CoreinitRecord.java     # 核心初始化记录
    └── SanxiaHttpMessageRequestReplyChannel.java
```

## 三、报文格式

### 3.1 Server 端：JSON 直通（与 shangrbank 风格相近）

报文结构：

```json
{
  "HEAD": {
    "srcSysId": "BEMP",
    "msgId": "BEMP202105030001",
    "msgDate": "2021-05-03 10:30:00",
    "msgRefId": "..."
  },
  "BODY": {
    "requestDto": {
      "billId": "B202105030001",
      "billType": "P_TYPE_001",
      "billClass": "AC01",
      "drwrName": "...",
      "drwrAcctNo": "...",
      "billMoney": "1000000.00",
      "dueDt": "2021-11-03"
    }
  }
}
```

**Server 端 Converter 标准写法**（参考 PICE070101MessageConverter）：

```java
@Component("PICE070101MessageConverter")
public class PICE070101MessageConverter extends AbstractMessageApplyResponseConverter {

    @Override
    public JSONObject fromMessage(Message<?> message) {
        JSONObject apply = (JSONObject) message.getPayload();
        // 1) 解析报文头
        JSONObject req = EcsHeadUtils.sysHeadToJson(apply, "PICE070101");
        // 2) 提取业务字段（requestDto）
        JSONObject requestDto = apply.getJSONObject("BODY").getJSONObject("requestDto");
        req.put("requestDto", requestDto);
        return req;
    }

    @Override
    public Message<?> toMessage(Message<?> applyMessage, JSONObject jsonObject) {
        // 1) 提取产品返回的 retCode/retMsg
        String errCode = jsonObject.getJSONArray("retData").getJSONObject(0).getString("retCode");
        String retMsg  = jsonObject.getJSONArray("retData").getJSONObject(0).getString("retMsg");
        // 2) 用 EcsHeadUtils 拼装响应头
        JSONObject ret = EcsHeadUtils.jsonToSysHead(jsonObject, errCode, retMsg);
        // 3) 业务字段转换（此处可按需加 List 循环 / 字段映射）
        JSONArray retData = jsonObject.getJSONArray("retData");
        JSONObject retData2 = new JSONObject();
        JSONArray infoListData = new JSONArray();
        for (int i = 0; i < retData.size(); i++) {
            infoListData.add(retData.getJSONObject(i));
        }
        ret.put("retData", infoListData);
        // 4) 通过基类返回 Spring Message
        return super.getMessage(ret);
    }
}
```

### 3.2 Client 端：ESC 协议（HTTP）

Client 端 Converter 通过 **ESC（Enterprise Service Center）** 平台动态获取目标服务地址，再走 HTTP 调用。**基类选择**：

- 大部分 client 端：`extends SanxiaAbstractHttpMessageRequestReplyConverter`（项目内抽象基类）
- CFCA 加签类：`extends AbstractGenericMessageRequestReplyConverter`（不走 ESC）

**ESC 协议工作原理**：

1. `SanxiaAbstractHttpMessageRequestReplyConverter.getDestination()` 调用 `EscManager.getEscServer()`
2. `EscServer.getProtocol()` 返回协议实例（必须是 `Http`）
3. 构造 `SanxiaHttpMessageRequestReplyChannel`，设置 host/port/timeout
4. Spring MessageChannel 走 HTTP 调用
5. 响应通过 `Http` 协议原路返回

**Client 端 Converter 标准写法**（参考 POPC030102MessageConverter）：

```java
@Component("POPC030102MessageConverter")
public class POPC030102MessageConverter extends SanxiaAbstractHttpMessageRequestReplyConverter {

    @Autowired
    SanxMessageChannelContainer sanxMessageChannelContainer;

    @Override
    public Message<?> toMessage(JSONObject jsonObject) {
        logger.info("POPC030102MessageConverter.toMessage start");
        JSONObject requestDto = jsonObject.getJSONObject(REQUEST_DTO);
        // 1) 构造内部请求 → 转换为 ESC 标准请求
        // 2) 走 SanxiaAbstractHttpMessageRequestReplyChannel
        return super.getMessage(escRequest);
    }

    @Override
    public JSONObject fromMessage(Message<?> message, JSONObject originalRequest) {
        // 1) 解析 ESC 响应 XML/JSON
        // 2) 提取外围字段 → 转换为内部 JSON
        return internalResp;
    }
}
```

### 3.3 ESC 服务注册

#### 配置文件：`src/main/resources/config/escService.properties`

```properties
#EBANK
PICE070101=新增票据信息服务
PICE070104=企业电票业务申请
...
PICE070241=企业电票可签约信息查询

#CREDIT
PICE070301=接收银票承兑签发信息
...
```

#### 路由配置：`src/main/resources/adapter.clientroute/adapter.ext.clientroute.xml`

```xml
<ClientField opCode="POPE020101"
             reqChannel="outReqChannel"
             mockReqChannel="noneReqChannel"
             clientConverter="msgJsonClientConverter"
             connectChannel="wsConnectOutChannel">
</ClientField>

<ClientField opCode="POBM010101"
             reqChannel="outReqChannel"
             mockReqChannel="noneReqChannel"
             clientConverter="msgJsonClientConverter"
             connectChannel="wsConnectOutChannel">
</ClientField>
```

#### ESC 服务定义（一般在 `sanxbank-biz-as` 或 `sanxbank-conf` 中）：

```xml
<!-- escService.xml -->
<escService>
    <service id="PICE070101" type="Http" name="ebankService" host="..." port="..." url="..." />
    <service id="POPC030102" type="Http" name="creditService" host="..." port="..." url="..." />
</escService>
```

## 四、基类选择决策树（sanxbank 适用版本）

```
是否使用 CFCA 数字证书（加签/验签）？
├── 是 → Client: AbstractGenericMessageRequestReplyConverter
│        （参考 POSH020101MessageConverter，使用 PBCAgent2G）
└── 否 → 是否需要走 ESC 平台？
    ├── 是 → Client: SanxiaAbstractHttpMessageRequestReplyConverter
    │        Server: AbstractMessageApplyResponseConverter
    │        （95% 场景走这条）
    └── 否 → Server 端 JSON 直通
             Client 端根据协议选择：
             - JSON: AbstractMessageRequestReplyConverter
             - HTTP: AbstractHttpMessageRequestReplyConverter
             - WS/SOAP: AbstractWsMessageRequestReplyConverter
```

## 五、字段映射规范

### 5.1 报文头字段映射（Server 端 EcsHeadUtils）

```java
// EcsHeadUtils.sysHeadToJson 内部处理
// HEAD 节点 → 内部 head 字段
srcSysId  → appSourceSysId
msgId     → requestFlowNo
msgDate   → requestTime
msgRefId  → externalFlowNo
```

### 5.2 业务字段映射（信贷类典型）

```java
// 在 fromMessage 中转换
if (null != requestDto.getString("feeRatio")) {
    requestDto.replace("feeRatio",
        Double.valueOf(requestDto.getString("feeRatio")) / 10000);
}
if (null != requestDto.getString("totalFee")) {
    requestDto.replace("totalFee", "");
}
```

> **为什么这么写**: 三峡银行外围报文的费率是万分位整数，内部要求 4 位小数存储；totalFee/totalBailAmt 是冗余字段，外围返回但不参与 BEMP 计算，置空。

### 5.3 ESC 标准请求头（Client 端）

```java
// toMessage 中构造 ESC 头
escReq.put("serviceId", "PICE070101");
escReq.put("txnId", FlowNoUtil.genTranFlowNo());
escReq.put("channelId", "BEMP");
escReq.put("reqTime", DateUtil.format(new Date()));
```

## 六、命名规范

| 维度 | 规范 | 示例 |
|------|------|------|
| 包名 | `com.hundsun.bemp.sanxbank.adapter.msg.<server\|client>.<channel>` | `com.hundsun.bemp.sanxbank.adapter.msg.server.ebank` |
| 类名 | `<外部功能号>MessageConverter.java` | `PICE070101MessageConverter.java` |
| Component 名 | 与类名同名（首字母大写） | `PICE070101MessageConverter` |
| WSDL 文件 | sanxbank **不强制要求** WSDL（走 ESC 动态寻址） | — |
| Test 类 | `<外部功能号>MessageConverterTest.java`（与被测类同包） | `PICE070101MessageConverterTest.java` |
| mock-msg 文件 | `sanxbank_<channel>_<func-code>_<biz>_<request\|response>.{xml\|json}` | `sanxbank_ebank_PICE070101_newBill_request.json` |

## 七、典型踩坑与调试

### 7.1 `EscManager` 找不到服务

**症状**: 启动后调用 client 端 Converter 报 `No service found for PICE070101`

**根因**:
1. `escService.xml` 中未注册该 opCode
2. `escService.properties` 中未配置中文名（用于后台查询，但部分版本会校验）
3. ESC 服务中心未启动

**处理**:
- 检查 `sanxbank-biz-as/src/main/resources/esc/` 下的服务定义文件
- 启动 ESC 配置中心 (`bemp-config-center`)

### 7.2 报文头 `retCode`/`retMsg` 错位

**症状**: 业务返回成功但 `retCode` 显示失败

**根因**: 三峡银行外围业务码在 `retData[0].retCode`，不是 `retCode`

**处理**:
```java
String errCode = jsonObject.getJSONArray("retData").getJSONObject(0).getString("retCode");
String retMsg  = jsonObject.getJSONArray("retData").getJSONObject(0).getString("retMsg");
```

### 7.3 PBCAgent2G 加签失败

**症状**: CFCA 类 Converter 调用 `dettachedSign()` 返回非零

**根因**:
1. `signature.host` / `signature.port` / `signature.passwd` 配置缺失
2. 数字证书服务未启动
3. `certDN` 字段为空

**处理**:
- 检查 `application.properties` 中 `signature.*` 配置
- 确认 PBC 服务可达
- 业务方传入 `certDN` 必填

### 7.4 Client 端 Bean 名称冲突

**症状**: `NoUniqueBeanDefinitionException`

**根因**: 多个 Converter 用了相同 Component 名

**处理**:
```java
@Component(value = "POPC050101MessageConverter")  // 显式指定
```

### 7.5 报文 JSON 解析 null

**症状**: `requestDto.getJSONObject("BODY")` 抛 NPE

**根因**: 三峡银行外围请求结构可能是 `{HEAD, BODY}` 也可能是 `{HEAD, BODY:{requestDto:{}}}`，不同 opCode 不一致

**处理**:
```java
if (apply.containsKey("BODY") && apply.getJSONObject("BODY").containsKey("requestDto")) {
    JSONObject requestDto = apply.getJSONObject("BODY").getJSONObject("requestDto");
    // ...
}
```

## 八、测试编写指引

参考 [references/test-template/AbstractAdapterConverterTest.java](test-template/AbstractAdapterConverterTest.java) 的基类与 mock 加载工具。

### 8.1 Server 端（JSON 透传）Test 示例

```java
package com.hundsun.bemp.sanxbank.adapter.msg.server.ebank;

public class PICE070101MessageConverterTest extends AbstractJsonMessageConverterTest {
    @Override protected String getConverterBeanName() { return "PICE070101MessageConverter"; }
    @Override protected Class<?> getConverterClass() { return PICE070101MessageConverter.class; }
    @Override protected String getRequestMockFile() { return "sanxbank_ebank_PICE070101_newBill_request"; }
    @Override protected String getResponseMockFile() { return "sanxbank_ebank_PICE070101_newBill_response"; }
    @Override protected void assertFromMessageFields(JSONObject requestDto) {
        assertEquals("B202105030001", requestDto.getString("billId"));
    }
}
```

### 8.2 Client 端（ESC）Test 示例

```java
package com.hundsun.bemp.sanxbank.adapter.msg.client.credit;

public class POPC030102MessageConverterTest extends AbstractHttpMessageConverterTest {
    @Override protected String getConverterBeanName() { return "POPC030102MessageConverter"; }
    // ESC 类 Test 需要 @MockBean SanxMessageChannelContainer
}
```

### 8.3 mock-msg 存放位置

```
banks/ext-sanxbank/sanxbank-adapter-as/src/test/resources/mock-msg/
├── PICE070101MessageConverter/
│   ├── sanxbank_ebank_PICE070101_newBill_request.json
│   └── sanxbank_ebank_PICE070101_newBill_response.json
├── POPC030102MessageConverter/
│   ├── sanxbank_credit_POPC030102_occupy_request.json
│   └── sanxbank_credit_POPC030102_occupy_response.xml
└── POSH020101MessageConverter/
    ├── sanxbank_cfca_POSH020101_sign_request.json
    └── sanxbank_cfca_POSH020101_sign_response.json
```

> 完整 mock 样例见 [references/test-template/mock-msg/](../test-template/mock-msg/)

## 九、验证清单

- [ ] 编译通过：`mvn clean compile -pl banks/ext-sanxbank/sanxbank-adapter-as/`
- [ ] Spring 启动成功：`<bank>-adapter-boot-deploy` 启动无 `NoSuchBean` / `EscServer not found` 错误
- [ ] 路由可达：`sanxbank-adapter-as/src/main/resources/adapter.clientroute/adapter.ext.clientroute.xml` 中 opCode 已声明
- [ ] ESC 服务注册：`escService.properties` 含新 opCode 中文名
- [ ] 单测通过：执行 `mvn test -Dtest=<ConverterName>Test`
- [ ] 覆盖率达标：行 ≥ 70%，分支 ≥ 60%（参考 SKILL.md 第五节）

## 十、改造前后对比（本次修复）

| 维度 | 修复前 | 修复后 |
|------|--------|--------|
| sanxbank 模板 | **完全缺失**（最大缺陷） | **完整模板**（含 ESC 协议细节、JSON 报文格式、24 个 Converter 索引） |
| 误判 | 把 sanxbank 的 24 Converter 误归到 whnsbank / shangrbank | **已纠正**：明确 sanxbank 是 10 家有实现银行之一 |
| bank-config.json | 无 sanxbank 配置 | **新增 sanxbank 完整配置** |
| mock-msg | 基于错误数据（whnsbank_esb_P00002000309） | **重写为 sanxbank 真实报文**（ebank / credit / cfca 三种） |
| 整体逻辑 | 多处自相矛盾（声称 whnsbank 有 130 个 Converter 又说 0 test） | **逻辑自洽**：明确标注 10 家有实现 + 2 家空模板 |
