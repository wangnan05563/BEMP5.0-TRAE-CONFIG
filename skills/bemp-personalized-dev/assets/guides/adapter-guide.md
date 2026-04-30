# Adapter 接口开发指南

> 本文档整合了 Adapter 接口开发规范与代码模板，是 BEMP 个性化接口开发的完整参考。

---

## 一、开发规范


## 目录

- [1. 概述](#1-概述)
- [2. 消息通道开发](#2-消息通道开发)
- [3. 消息转换开发](#3-消息转换开发)
- [4. 命名规范](#4-命名规范)
- [5. Client 端开发规范](#5-client-端开发规范)
- [6. Server 端开发规范](#6-server-端开发规范)
- [7. 工具类使用规范](#7-工具类使用规范)
- [8. 异常处理规范](#8-异常处理规范)
- [9. 日志规范](#9-日志规范)
- [10. 数据映射规范](#10-数据映射规范)
- [11. 开发流程](#11-开发流程)
- [12. 最佳实践](#12-最佳实践)
- [13. 常见问题](#13-常见问题)

---

## 1. 概述

### 1.1 适用范围

本规范适用于河南农信票据系统 Adapter 层接口开发，主要用于与外部系统 (如核心系统、信贷系统、网银系统、ECIF、审批系统等) 进行报文交互的场景。

### 1.2 目录结构

```
banks/ext-hnnxbank/hnnxbank-adapter-as/
└── src/main/java/com/hundsun/bemp/hnnxbank/adapter/msg/
    ├── client/                    # 客户端 (主动调用外部系统)
    │   ├── approve/              # 审批系统相关
    │   ├── auth/                 # 认证相关
    │   ├── bup/                  # BUP 平台相关
    │   ├── core/                 # 核心系统相关
    │   ├── credit/               # 信贷系统相关
    │   ├── ecif/                 # ECIF 系统相关
    │   └── sign/                 # 签名相关
    └── server/                    # 服务端 (接收外部系统调用)
        ├── approve/              # 审批系统相关
        ├── credit/               # 信贷系统相关
        ├── ebank/                # 网银系统相关
        └── ecif/                 # ECIF 系统相关
```

### 1.3 核心组件说明

| 组件类型 | 基类 | 用途 | 示例 |
|---------|------|------|------|
| **Client 端** | `AbstractGenericMessageRequestReplyConverter` | 主动调用外部系统，发送请求并接收响应 | BOCE020104MessageConverter |
| **Server 端** | `AbstractMessageApplyResponseConverter` | 接收外部系统请求，返回响应 | PICE030503MessageConverter |
| **拦截器** | `AbstractMessageInterceptor` | 报文预处理，如功能号映射 | MqMessageInterceptor |
| **异常处理** | `AbstractExceptionHandler` | 统一异常捕获和处理 | MqMessageExceptionHandler |

---

## 2. 消息通道开发

### 2.1 消息通道概述

消息通道旨在与外部系统进行通讯。目前 adapter 已实现 tcp、http、ibm mq 三种常见的通讯方式。更多通讯方式，由产品部持续开发集成更新。

**【强制】** 为了向前兼容，启动新版消息通道必须开启配置中心参数：

```properties
adapter.is_use_new_message_channel=1
```

### 2.2 启用消息通道

在 `application.properties` 文件中，配置 `spring.profiles.active` 项：

```properties
# 启用 tcp 通讯方式
spring.profiles.active=tcp

# 同时启用 tcp 和 http 通讯方式
spring.profiles.active=tcp,http
```

### 2.3 TCP 通讯配置

```properties
# 外部系统 tcp 服务端 ip
adapter.tcp.client.host_name=127.0.0.1

# 外部系统 tcp 服务端 port
adapter.tcp.client.port=9088

# adapter tcp 监听端口
adapter.tcp.server.port=9088

# 是否启用 netty 日志功能
adapter.tcp.netty_log_enable=true
```

### 2.4 HTTP 通讯配置

```properties
# 外部系统 http/https 服务端 ip
adapter.http.client.host_name=127.0.0.1

# 外部系统 http/https 服务端 port
adapter.http.client.port=8099

# 外部系统 http/https 服务端 uri
adapter.http.client.uri=/bemp-adapter/test/message

# 调用外部系统 http/https 请求内容类型
adapter.http.client.content_type=application/json

# 调用外部系统 http/https 请求是否压缩内容
adapter.http.client.content_compressor=false

# 调用外部系统是否启用 https 协议
adapter.http.client.ssl_enable=false

# 外部系统 https 请求 key alias
adapter.http.client.ssl_key_alias=CLIENT_ROOT

# 外部系统 https 请求 key store 文件
adapter.http.client.ssl_key_store=E:/https.jks

# 外部系统 https 请求 key store 类型
adapter.http.client.ssl_key_store_type=JKS

# 外部系统 https 请求 trust store 类型
adapter.http.client.ssl_trust_store_type=JKS

# 外部系统 https 请求 trust store 文件
adapter.http.client.ssl_trust_store=E:/https.jks

# 外部系统 https 请求 key store 密钥
adapter.http.client.ssl_key_store_password=123abc

# 外部系统 https 请求 trust store 密钥
adapter.http.client.ssl_trust_store_password=123abc

# 是否启用 netty 日志功能
adapter.http.netty_log_enable=true

# adapter http/https 监听端口
adapter.http.server.port=9087

# adapter http/https 上下文路径
adapter.http.server.context_path=/adapter

# adapter 接收 http/https 请求是否开启内容压缩
adapter.http.server.content_compressor=false

# adapter 是否启用 https 协议
adapter.http.server.ssl_enable=false

# adapter 启用 https key store 路径
adapter.http.server.ssl_key_store=E:/https.jks

# adapter 启用 https trust store 路径
adapter.http.server.ssl_trust_store=E:/https.jks

# adapter 启用 https key store 密钥
adapter.http.server.ssl_key_password=123abc

# adapter 启用 https trust store 密钥
adapter.http.server.ssl_trust_password=123abc

# adapter 接收 http/https 请求内容类型
adapter.http.server.content_type=application/json
```

### 2.5 IBM MQ 通讯配置

```properties
# ibm mq ip 和 port
adapter.mq.connection_name_list=192.168.56.101(1417),192.168.56.102(1417)

# ibm mq 消息传输方式
adapter.mq.transport_type=1

# ibm mq 字符集标识，819 用于 unix，1381 用于 window
adapter.mq.ccsid=819

# ibm mq 队列管理器
adapter.mq.queue_manager=QMEMBFE

# ibm mq 通道
adapter.mq.queue_channel=SYSTEM.AUTO.SVRCONN

# 接出请求队列
adapter.mq.send_out_queue=3143010006_3

# 接出响应队列
adapter.mq.send_in_queue=3143010006_5

# 接入响应队列
adapter.mq.recv_out_queue=3143010006_5

# 接入请求队列
adapter.mq.recv_in_queue=3143010006_3

# 连接是否启用权限认证
adapter.mq.user_credentials=true

# ibm mq 用户名
adapter.mq.username=mqm

# ibm mq 密码
adapter.mq.password=mqm
```

---

## 3. 消息转换开发

### 3.1 消息转换概述

消息转换是为了将内部消息转换成外部系统所识别报文，以及将外部消息转换成内部所识别消息。接口类 `MessageConverter` 的 `toMessage` 方法 (内部 json 转换成外部消息) 和 `fromMessage` 方法 (外部消息转换成内部 json)。

### 3.2 命名约定

消息转换采用**约定优于配置**规则，即：接口编号 + MessageConverter 则为 java 类名，同时也是 spring bean 的名字。

**示例：**
- 接口编号：`BOCE020104`
- 类名：`BOCE020104MessageConverter`
- Bean 名称：`BOCE020104MessageConverter`

### 3.3 接出消息转换 (Client 端)

接出消息转换除处理转换消息外，还有一个重要职责，即**指定该接口所路由的消息通道**。

**【强制】** 继承 `AbstractMessageRequestReplyConverter` 重写以下方法：

1. `toMessage` - 内部 JSON 转换为外部消息
2. `fromMessage` - 外部消息转换成内部 JSON
3. `getDestination` - 指定该接口接出消息通道

**【推荐】** 目前 adapter 提供三个已实现指定消息通道的接出消息转换：

| 基类 | 适用场景 |
|------|---------|
| `AbstractJmsMessageRequestReplyConverter` | JMS 消息队列通讯 |
| `AbstractTcpMessageRequestReplyConverter` | TCP 通讯 |
| `AbstractHttpMessageRequestReplyConverter` | HTTP 通讯 |

若是接出通讯方式是 tcp、http、mq，则只需要按照实际消息通讯方式，选择继承即可。

### 3.4 接入消息转换 (Server 端)

接入消息转换除处理转换消息外，还有一个重要职责，即**指定外部接口服务与内部服务映射关系**。

**【强制】** 继承 `AbstractMessageApplyResponseConverter` 重写以下方法：

1. `toMessage` - 内部 JSON 转换为外部消息
2. `fromMessage` - 外部消息转换成内部 JSON
3. `getFunctionIdMapping` - 外部服务码与内部功能号映射关系

**映射规则：** 外部服务码从起始至末尾前，内部功能号在数组末尾。

**【强制】** 由于接入消息外部服务码无法统一识别，因此需要继承 `AbstractMessageInterceptor` 实现 `preInvoke` 方法：

- 通过 `preInvoke` 来对外部消息进行拦截处理
- 获取外部服务码
- 同时设定内部功能号
- 需要在注解 `@Component` 下再加一行注解 `@Primary`

**【推荐】** 也可以重写 `postInvoke` 方法来对响应消息进行后置处理 (此步骤非必须)。

**【强制】** 由于接入消息处理时会出现异常，因此需要继承 `AbstractExceptionHandler` 重写 `handleFailure` 方法：

- 通过 `handleFailure` 方法来返回通用失败消息
- 需要在注解 `@Component` 下再加一行注解 `@Primary`

---

## 4. 命名规范

### 4.1 类命名规范

```
[方向] + [业务系统] + [交易码] + MessageConverter
```

**示例:**
- `BOCE020104MessageConverter` - B 端 (本系统) 向核心系统发送的电票贴现申请查询
- `PICE070101MessageConverter` - 接收网银系统的票据信息
- `BOPC040101MessageConverter` - B 端向审批系统发送的撤销推送

**命名规则说明:**
- **方向前缀**: 
  - `B` 开头：本系统主动发起 (BOPC、BOCE 等)
  - `P` 开头：接收外部系统 (POPC、PICE 等)
- **业务系统代码**:
  - `CE`: 电票系统 (Core Enterprise)
  - `PC`: 同业系统
  - `BM`: 基础模块
  - `SH`: 签名模块
- **交易码**: 8 位数字，如 020104、070101

### 4.2 包命名规范

```java
// Client 端
package com.hundsun.bemp.hnnxbank.adapter.msg.client.[业务系统];

// Server 端
package com.hundsun.bemp.hnnxbank.adapter.msg.server.[业务系统];
```

**示例:**
```java
package com.hundsun.bemp.hnnxbank.adapter.msg.client.core;
package com.hundsun.bemp.hnnxbank.adapter.msg.server.ebank;
package com.hundsun.bemp.hnnxbank.adapter.msg.server.credit;
```

### 4.3 Bean 命名规范

```java
@Component("BOCE020104MessageConverter")  // 与类名一致
public class BOCE020104MessageConverter extends AbstractGenericMessageRequestReplyConverter {
```

---

## 5. Client 端开发规范

### 5.1 基本要求

1. **继承基类**: 必须继承 `AbstractGenericMessageRequestReplyConverter`
2. **添加注解**: 必须添加 `@Component` 注解，Bean 名称与类名一致
3. **日志定义**: 必须定义 Logger 用于日志记录
4. **依赖注入**: 使用 `@Autowired` 注入所需服务

### 5.2 核心方法实现

#### 5.2.1 toMessage 方法

将内部 JSON 转换为外部报文:

```java
@Override
public Message<?> toMessage(JSONObject jsonObject) {
    logger.info("BOCE020104MessageConverter 请求 json:", jsonObject);
    
    // 参数校验
    JSONObject requestDto = jsonObject.getJSONObject("requestDto");
    if (null == requestDto) {
        throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求信息为空");
    }
    
    // 构建外部报文并发送
    String msg = requestSend(jsonObject);
    
    return super.getMessage("{\"retCode\":\"000000\"}");
}
```

#### 5.2.2 fromMessage 方法

将外部响应转换为内部 JSON:

```java
@Override 
public JSONObject fromMessage(Message<?> message, JSONObject jsonObject) {
    // 1. 解析 XML 响应报文
    MessageXmlParser xmlParser = MessageXmlParser.create();
    XmlDocument xmlDocument = xmlParser.parse(msg);
    XmlNode rootNode = xmlDocument.getRoot();
    
    // 2. 提取头部信息
    XmlNode headerNode = rootNode.getSubNode("header");
    XmlNode headStatusNode = headerNode.getSubNode("status");
    String retCd = XmlUtil.getNodeValue(headStatusNode, "retCd");
    String desc = XmlUtil.getNodeValue(headStatusNode, "desc");
    
    // 3. 构建响应 JSON
    JSONObject commonResp = new JSONObject();
    JSONObject retData = new JSONObject();
    
    if("000000".equals(retCd)) {
        commonResp.put("retCode", retCd);
        commonResp.put("retMsg", "交易成功");
        
        // 提取业务数据
        XmlNode bodyNode = rootNode.getSubNode("body");
        XmlNode responseNode = bodyNode.getSubNode("response");
        // ... 业务数据处理
    }
    
    logger.info("BOCE020104MessageConverter 响应 json:", commonResp);
    return commonResp;
}
```

### 5.3 报文发送方法

```java
// 请求报文组装并发送
public String requestSend(JSONObject jsonObject) {
    // 1. 生成流水号和时间
    String seqNb = ESB2.getInstance().getSeqNb();
    String dt = String.valueOf(DateTimeUtil.getCurTimeYYYYMMdd());
    String time = String.valueOf(DateTimeUtil.getCurTimeYYYYMMddHHmmssSSS());
    String tranTime = time.substring(time.length()-9, time.length());
    
    // 2. 获取请求参数
    JSONObject requestDto = jsonObject.getJSONObject("requestDto");
    if (null == requestDto) {
        throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求信息为空");
    }
    
    // 3. 构建 XML 报文
    String trans_code = "00101001";
    MessageXmlBuilder messageXmlBuilder = MessageXmlBuilder.create("transaction");
    
    // 4. 组装报文头
    HeadUtils.bempToEsb(requestDto, "JYT", trans_code, messageXmlBuilder, seqNb, dt, tranTime);
    
    // 5. 组装报文体
    MessageXmlBuilder body = messageXmlBuilder.createElement("body");
    MessageXmlBuilder transMsg = body.createElement("request");
    HeadUtils.bempToBup(jsonObject, trans_code, transMsg);
    approveBoby(requestDto, transMsg);
    
    // 6. 发送报文
    String respMsg = null;
    try {
        respMsg = CommonReq.sendReq(messageXmlBuilder, seqNb, dt, tranTime);
    } catch (Exception e) {
        logger.error("发送报文失败", e);
        throw new BempRuntimeException(e, CommonErrorNoConst.GENERAL_FAIL, "调用 ESB 异常");
    }
    
    return respMsg;
}
```

---

## 6. Server 端开发规范

### 6.1 基本要求

1. **继承基类**: 必须继承 `AbstractMessageApplyResponseConverter`
2. **添加注解**: 必须添加 `@Component` 注解
3. **实现功能号映射**: 必须实现 `getFunctionIdMapping()` 方法

### 6.2 核心方法实现

#### 6.2.1 getFunctionIdMapping 方法

外部服务码与内部功能号映射:

```java
@Override
public String[] getFunctionIdMapping() {
    return new String[]{
        "EBBS.02100500.01", "PICE030503"  // 外部服务码 -> 内部功能号
    };
}
```

#### 6.2.2 fromMessage 方法

将外部报文转换为内部 JSON:

```java
@Override
public JSONObject fromMessage(Message<?> message) {
    // 1. 解析 XML 报文
    XmlDocument xmlDocument = (XmlDocument) message.getPayload();
    XmlNode rootNode = xmlDocument.getRoot();
    logger.info("PICE030503MessageConverter 请求 xml:", rootNode);
    
    // 2. 提取业务数据
    XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");
    JSONObject requestDto = new JSONObject();
    
    // 3. 字段映射 (外部字段 -> 内部字段)
    requestDto.put("contractNo", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("contractNo")));
    requestDto.put("billClass", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("billClass")));
    requestDto.put("billType", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("billType")));
    
    // 4. 处理列表数据
    List<XmlNode> billList = requestNode.getSubNodes("list");
    List<JSONObject> promNoteNoList = new ArrayList<>();
    
    if (null != billList && billList.size() > 0) {
        for (int i = 0; i < billList.size(); i++) {
            XmlNode node = billList.get(i);
            JSONObject data = new JSONObject();
            data.put("impawnNo", XmlUtil.xmlNodeIsNull(node.getSubNode("pledgeNo")));
            data.put("cdtBillFlowNo", XmlUtil.xmlNodeIsNull(node.getSubNode("cdtBillFlowNo")));
            // ... 其他字段
            promNoteNoList.add(data);
        }
    }
    
    return requestDto;
}
```

### 6.3 特殊场景处理

#### 6.3.1 签名服务集成

```java
@Component("POSH020101MessageConverter")
public class POSH020101MessageConverter extends AbstractGenericMessageRequestReplyConverter {
    
    @Value("${signature.timeout}")
    private int timeout;
    
    @Value("${signature.reconnectMaxTimes}")
    private int reconnectMaxTimes;
    
    @Override
    public JSONObject fromMessage(Message<?> message, JSONObject jsonObject) {
        JSONObject requestDto = jsonObject.getJSONObject("requestDto");
        String memberId = requestDto.getString("memberId");
        String origBytes = requestDto.getString("msg");
        
        // 连接加签服务器
        TassSignService pbcaGent = TassSignService.getInstance();
        pbcaGent.SetTimeOut(timeout, timeout);
        pbcaGent.setEncodingCharsetName(m_charsetName);
        pbcaGent.setSignMethod(m_signMethod);
        
        // 执行加签
        String result = pbcaGent.p7AttachedSignEx(origBytes, signTime, keyName);
        
        // 构建响应
        JSONObject commonResp = new JSONObject();
        commonResp.put("retCode", null==result ? "999999" : "000000");
        commonResp.put("retMsg", "加签结果码:" + pbcaGent.getErrorCode());
        
        return commonResp;
    }
}
```

#### 6.3.2 列表数据处理

```java
// 处理响应中的列表数据
if(null != outObj.getSubNodes("outTbl")) {
    List<XmlNode> outTbls = outObj.getSubNodes("outTbl");
    JSONArray list = new JSONArray();
    
    for(XmlNode outTbl : outTbls) {
        JSONObject info = new JSONObject();
        info.put("controlFlag", XmlUtil.getNodeValue(outTbl, "bizType"));
        info.put("controlFlagName", XmlUtil.getNodeValue(outTbl, "memo"));
        list.add(info);
    }
    
    retData.put("controlFlagList", list);
}
```

---

## 7. 工具类使用规范

### 7.1 XmlUtil 工具类

**字段提取:**

```java
// 安全提取字段值 (为空返回空字符串)
String value = XmlUtil.xmlNodeIsNull(xmlNode);

// 提取子节点值
String acctNo = XmlUtil.getNodeValue(outObj, "acctNo");

// 校验必填字段
XmlNode node = XmlUtil.NullToException(requestNode, "contractNo");
```

### 7.2 HeadUtils 工具类

**Client 端报文头组装:**

```java
// 组装 ESB 报文头
HeadUtils.bempToEsb(requestDto, "JYT", trans_code, messageXmlBuilder, seqNb, dt, tranTime);

// 组装核心报文头
HeadUtils.bempToCore(jsonObject, messageXmlBuilder, brchNo, userNo);

// 组装核心交易头
HeadUtils.coreTxHeader(jsonObject, coreTransCode, messageXmlBuilder, dt);
```

**Server 端报文头解析:**

```java
// 解析请求头
JSONObject sysHead = HeadUtils.sysHeadToJson(apply, xmlNode);

// 解析分页信息
JSONObject pageInfo = HeadUtils.xmlToJsonPage(request, xmlNode);

// 构建响应头
MessageXmlBuilder rspHeader = HeadUtils.jsonToSysHead(header, jsonObject, transaction);
```

### 7.3 CommonReq 工具类

**发送 ESB 请求:**

```java
String respMsg = CommonReq.sendReq(messageXmlBuilder, seqNb, dt, tranTime);
```

---

## 8. 异常处理规范

### 8.1 参数校验异常

```java
JSONObject requestDto = jsonObject.getJSONObject("requestDto");
if (null == requestDto) {
    throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求信息为空");
}
```

### 8.2 业务异常

```java
if("OC00".equals(operCode)) { // 新增
    String date = "" + BempCacheUtils.getBusiDate4Cache();
    if(date.equals(XmlUtil.xmlNodeIsNull(node.getSubNode("remitDt"))) != true) {
        throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "日期与当前营业日不一致");
    }
}
```

### 8.3 系统异常

```java
try {
    respMsg = CommonReq.sendReq(messageXmlBuilder, seqNb, dt, tranTime);
} catch (Exception e) {
    logger.error("发送报文失败", e);
    throw new BempRuntimeException(e, CommonErrorNoConst.GENERAL_FAIL, "调用 ESB 异常");
}
```

---

## 9. 日志规范

### 9.1 Logger 定义

```java
private static final Logger logger = LoggerFactory.getLogger(BOCE020104MessageConverter.class);
```

### 9.2 日志记录点

**请求日志:**

```java
logger.info("BOCE020104MessageConverter 请求 json:", jsonObject);
logger.info("PICE030503MessageConverter 请求 xml:", rootNode);
```

**响应日志:**

```java
logger.info("BOCE020104MessageConverter 响应 json:", commonResp);
```

**关键业务日志:**

```java
logger.info("开始带公钥加签 [" + "签名时间:" + signTime + ";加签内容:" + origBytes + ";keyName:" + keyName + "]");
logger.info("加签成功。" + "返回结果:" + result);
```

**异常日志:**

```java
logger.error("加签失败。" + "错误码:" + pbcaGent.getErrorCode() + "错误信息：" + pbcaGent.getErrorMessage());
logger.error("发送报文失败", e);
```

---

## 10. 数据映射规范

### 10.1 字段命名映射

| 外部字段名 | 内部字段名 | 说明 |
|-----------|-----------|------|
| acctNo | custAcctNo | 客户账号 |
| acctStat | accountStatus | 账户状态 |
| avalBal | availBalanceAmt | 可用余额 |
| contractNo | contractNo | 合同号 (保持一致) |
| billClass | billClass | 票据介质 (保持一致) |

### 10.2 数据字典映射

```java
// 控制状态映射
info.put("controlFlag", XmlUtil.getNodeValue(outTbl, "bizType"));
info.put("controlFlagName", XmlUtil.getNodeValue(outTbl, "memo"));
```

---

## 11. 开发流程

### 11.1 需求分析

1. **确定交互方向**: Client 端还是 Server 端
2. **确定外部系统**: 核心、信贷、网银、ECIF 等
3. **确定报文格式**: XML 结构、字段映射关系
4. **确定业务流程**: 请求 - 响应流程、异常处理

### 11.2 开发步骤

1. **创建类文件**: 按照命名规范创建 MessageConverter 类
2. **选择基类**: 根据方向选择正确的基类
3. **实现核心方法**: 
   - Client 端：toMessage + fromMessage
   - Server 端：getFunctionIdMapping + fromMessage
4. **编写报文处理逻辑**: 使用工具类进行 XML 解析和构建
5. **添加异常处理**: 参数校验、业务校验、系统异常
6. **添加日志记录**: 请求、响应、关键业务点
7. **单元测试**: 验证报文转换的正确性

### 11.3 测试验证

1. **单元测试**: 验证报文转换逻辑
2. **集成测试**: 与外部系统联调
3. **异常测试**: 验证异常处理机制
4. **性能测试**: 验证响应时间

---

## 12. 最佳实践

### 12.1 代码复用

- 复用已有的工具类 (XmlUtil、HeadUtils、CommonReq)
- 复用 CommomQueryService 查询公共服务
- 相同业务的 MessageConverter 放在同一包下

### 12.2 性能优化

- 避免重复创建对象 (如 ESB2 实例)
- 合理使用缓存 (如 BempCacheUtils)
- 控制日志输出量 (生产环境避免过多 debug 日志)

### 12.3 可维护性

- 添加详细的类注释和方法注释
- 使用有意义的变量名
- 保持代码结构清晰
- 遵循单一职责原则

---

## 13. 常见问题

### 13.1 报文发送失败

**问题**: 调用外部系统超时或无响应

**解决方案**:
1. 检查 ESB 配置是否正确
2. 检查网络连通性
3. 增加超时时间配置
4. 添加重试机制

### 13.2 报文解析异常

**问题**: XML 解析失败或字段提取为空

**解决方案**:
1. 使用 `XmlUtil.xmlNodeIsNull()` 安全提取字段
2. 检查 XML 结构是否与预期一致
3. 添加日志输出完整 XML 便于排查

### 13.3 功能号映射错误

**问题**: 外部系统调用后无法路由到内部服务

**解决方案**:
1. 检查 `getFunctionIdMapping()` 返回值是否正确
2. 确认外部服务码格式与映射规则一致
3. 检查拦截器 `preInvoke` 方法是否正确设置功能号


---

## 二、代码模板


## 1. Client 端开发模板

### 1.1 基础模板 (调用外部系统)

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.client.[业务系统];

import java.util.List;
import java.util.Map;

import com.hundsun.bemp.hnnxbank.adapter.msg.common.CommomQueryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlParser;
import com.hundsun.bemp.adapter.msg.generic.AbstractGenericMessageRequestReplyConverter;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.util.DateTimeUtil;
import com.hundsun.bemp.hnnxbank.adapter.msg.common.mq.request.CommonReq;
import com.hundsun.bemp.hnnxbank.adapter.msg.util.HeadUtils;
import com.hundsun.bemp.hnnxbank.adapter.msg.util.XmlUtil;

import spc.webos.endpoint.ESB2;

/**
 * @Description: [功能描述]
 * @author: [作者姓名]
 * @date: [创建日期]
 * @time: [创建时间]
 */
@Component("[交易码]MessageConverter")
public class [交易码]MessageConverter extends AbstractGenericMessageRequestReplyConverter {
    
    private static final Logger logger = LoggerFactory.getLogger([交易码]MessageConverter.class);
    
    @Autowired
    private CommomQueryService commomQueryService;
    
    @Override
    public Message<?> toMessage(JSONObject jsonObject) {
        logger.info("[交易码]MessageConverter 请求 json:", jsonObject);
        
        // 1. 参数校验
        JSONObject requestDto = jsonObject.getJSONObject("requestDto");
        if (null == requestDto) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求信息为空");
        }
        
        // 2. 构建外部报文并发送
        String msg = requestSend(jsonObject);
        
        return super.getMessage("{\"retCode\":\"000000\"}");
    }

    @Override 
    public JSONObject fromMessage(Message<?> message, JSONObject jsonObject) {
        // 1. 解析 XML 响应报文
        String msg = requestSend(jsonObject);
        MessageXmlParser xmlParser = MessageXmlParser.create();
        XmlDocument xmlDocument = xmlParser.parse(msg);
        XmlNode rootNode = xmlDocument.getRoot();
        
        // 2. 提取头部信息
        XmlNode headerNode = rootNode.getSubNode("header");
        XmlNode headStatusNode = headerNode.getSubNode("status");
        String retCd = XmlUtil.getNodeValue(headStatusNode, "retCd");
        String desc = XmlUtil.getNodeValue(headStatusNode, "desc");
        
        // 3. 构建响应 JSON
        JSONObject commonResp = new JSONObject();
        JSONObject retData = new JSONObject();
        
        if("000000".equals(retCd) && null != rootNode.getSubNode("body") 
           && null != rootNode.getSubNode("body").getSubNode("response")) {
            
            XmlNode bodyNode = rootNode.getSubNode("body");
            XmlNode responseNode = bodyNode.getSubNode("response");
            
            // 4. 提取业务数据
            // [业务字段提取逻辑]
            
            commonResp.put("retCode", retCd);
            commonResp.put("retMsg", "交易成功");
            commonResp.put("retData", retData);
        } else {
            commonResp.put("retCode", retCd);
            commonResp.put("retMsg", desc);
        }
        
        logger.info("[交易码]MessageConverter 响应 json:", commonResp);
        return commonResp;
    }
    
    /**
     * 请求报文组装并发送
     * @param jsonObject 请求参数
     * @return 响应报文
     */
    public String requestSend(JSONObject jsonObject) {
        // 1. 生成流水号和时间
        String seqNb = ESB2.getInstance().getSeqNb();
        String dt = String.valueOf(DateTimeUtil.getCurTimeYYYYMMdd());
        String time = String.valueOf(DateTimeUtil.getCurTimeYYYYMMddHHmmssSSS());
        String tranTime = time.substring(time.length()-9, time.length());
        
        // 2. 获取请求参数
        JSONObject requestDto = jsonObject.getJSONObject("requestDto");
        if (null == requestDto) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求信息为空");
        }
        
        // 3. 构建 XML 报文
        String trans_code = "[交易码]";
        MessageXmlBuilder messageXmlBuilder = MessageXmlBuilder.create("transaction");
        
        // 4. 组装报文头
        HeadUtils.bempToEsb(requestDto, "[渠道代码]", trans_code, messageXmlBuilder, seqNb, dt, tranTime);
        
        // 5. 组装报文体
        MessageXmlBuilder body = messageXmlBuilder.createElement("body");
        MessageXmlBuilder transMsg = body.createElement("request");
        
        // 6. 业务字段组装
        // [业务字段组装逻辑]
        
        // 7. 发送报文
        String respMsg = null;
        try {
            respMsg = CommonReq.sendReq(messageXmlBuilder, seqNb, dt, tranTime);
        } catch (Exception e) {
            logger.error("发送报文失败", e);
            throw new BempRuntimeException(e, CommonErrorNoConst.GENERAL_FAIL, "调用外部系统异常");
        }
        
        return respMsg;
    }
}
```

### 1.2 签名服务模板

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.client.sign;

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.generic.AbstractGenericMessageRequestReplyConverter;
import com.tass.sign.SignOption;
import com.tass.sign.TassCryptConst;
import com.tass.sign.TassSignService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;

import static com.tass.sign.TassSignService.putInstance;

/**
 * @Description: [签名功能描述]
 * @author: [作者姓名]
 * @date: [创建日期]
 */
@Component("[交易码]MessageConverter")
public class [交易码]MessageConverter extends AbstractGenericMessageRequestReplyConverter {
    
    private static final Logger logger = LoggerFactory.getLogger([交易码]MessageConverter.class);
    
    // 签名参数配置
    public static String m_isIncludeCert = "true";
    public static String m_isIncludeAuth = "false";
    public static String m_isIncludeSignTime = "false";
    public static String m_isQ7 = "true";
    public static String m_isVerifyCert = "true";
    public static String m_charsetName = TassCryptConst.TA_DEFAULT_ENCODING;
    public static String m_signMethod = TassCryptConst.TA_S_ALG_SM3WITHSM2;
    
    @Value("${signature.timeout}")
    private int timeout;
    
    @Value("${signature.reconnectMaxTimes}")
    private int reconnectMaxTimes;
    
    @Override
    public JSONObject fromMessage(Message<?> message, JSONObject jsonObject) {
        logger.info("[交易码]MessageConverter 请求参数:", jsonObject);
        
        JSONObject requestDto = jsonObject.getJSONObject("requestDto");
        
        // 1. 获取签名参数
        String memberId = requestDto.getString("memberId");
        String keyName = memberId;
        String origBytes = requestDto.getString("msg");
        
        // 2. 生成签名时间
        String signTime = null;
        Date signDate = new Date();
        DateFormat df = new SimpleDateFormat("yyyy-MM-dd");
        signTime = df.format(signDate);
        
        // 3. 连接加签服务器
        TassSignService pbcaGent = TassSignService.getInstance();
        pbcaGent.SetTimeOut(timeout, timeout);
        pbcaGent.setEncodingCharsetName(m_charsetName);
        pbcaGent.setSignMethod(m_signMethod);
        
        // 4. 设置签名选项
        pbcaGent.setSignOption(SignOption.ISVERIFYCERT, m_isVerifyCert);
        pbcaGent.setSignOption(SignOption.ISINCLUDECERT, m_isIncludeCert);
        pbcaGent.setSignOption(SignOption.ISINCLUDEAUTH, m_isIncludeAuth);
        pbcaGent.setSignOption(SignOption.ISINCLUDESIGNTIME, m_isIncludeSignTime);
        pbcaGent.setSignOption(SignOption.ISQ7, m_isQ7);
        pbcaGent.setDigestMethod(TassCryptConst.TA_DIGEST_SM3);
        pbcaGent.setSignMethod(TassCryptConst.TA_S_ALG_SM3WITHSM2);
        
        // 5. 执行加签
        String result = pbcaGent.p7AttachedSignEx(origBytes, signTime, keyName);
        
        // 6. 构建响应
        JSONObject commonResp = new JSONObject();
        JSONObject retData = new JSONObject();
        
        if (null == result) {
            logger.error("加签失败。错误码:" + pbcaGent.getErrorCode() + "错误信息：" + pbcaGent.getErrorMessage());
            commonResp.put("retCode", "999999");
            commonResp.put("retMsg", "加签失败");
        } else {
            logger.info("加签成功。返回结果:" + result);
            commonResp.put("retCode", "000000");
            commonResp.put("retMsg", "加签成功");
            retData.put("[签名结果字段]", result);
            commonResp.put("retData", retData);
        }
        
        // 7. 释放连接
        putInstance(pbcaGent);
        
        return commonResp;
    }
    
    @Override
    public Message<?> toMessage(JSONObject jsonObject) {
        return super.getMessage(jsonObject);
    }
}
```

## 2. Server 端开发模板

### 2.1 基础模板 (接收外部系统)

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.server.[业务系统];

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.fw.common.cache.BempCacheUtils;
import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.hnnxbank.adapter.msg.common.CommomQueryService;
import com.hundsun.bemp.hnnxbank.adapter.msg.util.HeadUtils;
import com.hundsun.bemp.hnnxbank.adapter.msg.util.XmlUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * [功能描述]
 * @author: [作者姓名]
 * @date: [创建日期]
 */
@Component(value = "[交易码]MessageConverter")
public class [交易码]MessageConverter extends AbstractMessageApplyResponseConverter {
    
    private static final Logger logger = LoggerFactory.getLogger([交易码]MessageConverter.class);
    
    @Autowired
    private CommomQueryService commomQueryService;
    
    /**
     * 外部服务码与内部功能号映射关系
     */
    @Override
    public String[] getFunctionIdMapping() {
        return new String[]{
            "[外部服务码 1]", "[内部功能号]",
            "[外部服务码 2]", "[内部功能号]"
        };
    }
    
    /**
     * 外部消息转换成内部 json
     */
    @Override
    public JSONObject fromMessage(Message<?> message) {
        // 1. 解析 XML 报文
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        XmlNode rootNode = xmlDocument.getRoot();
        logger.info("[交易码]MessageConverter 请求 xml:", rootNode);
        
        // 2. 提取业务数据
        XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");
        JSONObject requestDto = new JSONObject();
        
        // 3. 字段映射 (外部字段 -> 内部字段)
        requestDto.put("[内部字段 1]", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("[外部字段 1]")));
        requestDto.put("[内部字段 2]", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("[外部字段 2]")));
        requestDto.put("[内部字段 3]", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("[外部字段 3]")));
        
        // 4. 处理列表数据
        List<XmlNode> [列表节点] = requestNode.getSubNodes("[列表节点名称]");
        List<JSONObject> [列表数据] = new ArrayList<>();
        
        if (null != [列表节点] && [列表节点].size() > 0) {
            for (int i = 0; i < [列表节点].size(); i++) {
                XmlNode node = [列表节点].get(i);
                JSONObject data = new JSONObject();
                
                data.put("[内部字段 1]", XmlUtil.xmlNodeIsNull(node.getSubNode("[外部字段 1]")));
                data.put("[内部字段 2]", XmlUtil.xmlNodeIsNull(node.getSubNode("[外部字段 2]")));
                data.put("[内部字段 3]", XmlUtil.xmlNodeIsNull(node.getSubNode("[外部字段 3]")));
                
                [列表数据].add(data);
            }
        }
        
        requestDto.put("[列表字段名]", [列表数据]);
        
        logger.info("[交易码]MessageConverter 转换后的 json:", requestDto);
        return requestDto;
    }
}
```

### 2.2 带校验的模板

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.server.[业务系统];

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.adapter.msg.converter.MessageXmlBuilder;
import com.hundsun.bemp.adapter.msg.core.AbstractMessageApplyResponseConverter;
import com.hundsun.bemp.adapter.msg.xml.XmlDocument;
import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.fw.common.cache.BempCacheUtils;
import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.hnnxbank.adapter.msg.util.XmlUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * [功能描述]
 * @author: [作者姓名]
 * @date: [创建日期]
 */
@Component(value = "[交易码]MessageConverter")
public class [交易码]MessageConverter extends AbstractMessageApplyResponseConverter {
    
    private static final Logger logger = LoggerFactory.getLogger([交易码]MessageConverter.class);
    
    @Override
    public String[] getFunctionIdMapping() {
        return new String[]{"[外部服务码]", "[内部功能号]"};
    }
    
    /**
     * 外部消息转换成内部 json
     */
    @Override
    public JSONObject fromMessage(Message<?> message) {
        // 1. 解析 XML 报文
        XmlDocument xmlDocument = (XmlDocument) message.getPayload();
        XmlNode rootNode = xmlDocument.getRoot();
        logger.info("[交易码]MessageConverter 请求 xml:", rootNode);
        
        XmlNode requestNode = rootNode.getSubNode("body").getSubNode("request");
        JSONObject requestDto = new JSONObject();
        
        // 2. 必填字段校验
        XmlNode contractNoNode = XmlUtil.NullToException(requestNode, "contractNo");
        requestDto.put("contractNo", contractNoNode.getText());
        
        // 3. 可选字段映射
        requestDto.put("billClass", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("billClass")));
        requestDto.put("billType", XmlUtil.xmlNodeIsNull(requestNode.getSubNode("billType")));
        
        // 4. 业务校验
        List<XmlNode> billList = requestNode.getSubNodes("list");
        if (null != billList && billList.size() > 0) {
            for (int i = 0; i < billList.size(); i++) {
                XmlNode node = billList.get(i);
                
                // 日期校验
                String date = "" + BempCacheUtils.getBusiDate4Cache();
                String remitDt = XmlUtil.xmlNodeIsNull(node.getSubNode("remitDt"));
                if(date.equals(remitDt) != true) {
                    throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "日期与当前营业日不一致");
                }
                
                // 金额校验
                String billMoney = XmlUtil.xmlNodeIsNull(node.getSubNode("billMoney"));
                if(null == billMoney || "".equals(billMoney) || "0".equals(billMoney)) {
                    throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "票据金额不能为空或 0");
                }
            }
        }
        
        return requestDto;
    }
}
```

## 3. 工具类模板

### 3.1 自定义工具类模板

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.util;

import com.hundsun.bemp.adapter.msg.xml.XmlNode;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * [工具类功能描述]
 * @author: [作者姓名]
 * @date: [创建日期]
 */
public class [工具类名称] {
    
    private static final Logger logger = LoggerFactory.getLogger([工具类名称].class);
    
    /**
     * [方法功能描述]
     * @param [参数说明]
     * @return [返回值说明]
     */
    public static String [方法名](XmlNode xmlNode) {
        String result = "";
        
        if (null == xmlNode) {
            result = "";
        } else {
            result = xmlNode.getText();
        }
        
        return result;
    }
    
    /**
     * [方法功能描述]
     * @param [参数说明]
     * @return [返回值说明]
     */
    public static XmlNode [方法名](XmlNode xmlNode, String label) {
        XmlNode node = null;
        
        if (null != xmlNode) {
            if (null == xmlNode.getSubNode(label) || StringUtils.isBlank(xmlNode.getSubNode(label).getText())) {
                throw new BempRuntimeException("000003", label + "不能为空");
            } else {
                node = xmlNode.getSubNode(label);
            }
        } else {
            throw new BempRuntimeException("000003", "XmlNode 不能为空");
        }
        
        return node;
    }
}
```

## 4. 测试用例模板

### 4.1 Client 端测试模板

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.client.[业务系统];

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.fw.common.test.BaseTest;
import org.junit.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * [交易码]MessageConverter 测试
 * @author: [作者姓名]
 * @date: [创建日期]
 */
public class [交易码]MessageConverterTest extends BaseTest {
    
    @Autowired
    private [交易码]MessageConverter converter;
    
    @Test
    public void testToMessage() {
        // 1. 准备测试数据
        JSONObject jsonObject = new JSONObject();
        JSONObject requestDto = new JSONObject();
        requestDto.put("字段 1", "值 1");
        requestDto.put("字段 2", "值 2");
        jsonObject.put("requestDto", requestDto);
        
        // 2. 调用 toMessage 方法
        // Message<?> message = converter.toMessage(jsonObject);
        
        // 3. 验证结果
        // Assert.assertNotNull(message);
    }
    
    @Test
    public void testFromMessage() {
        // 1. 准备测试数据
        JSONObject jsonObject = new JSONObject();
        JSONObject requestDto = new JSONObject();
        requestDto.put("字段 1", "值 1");
        jsonObject.put("requestDto", requestDto);
        
        // 2. 调用 fromMessage 方法
        // JSONObject result = converter.fromMessage(null, jsonObject);
        
        // 3. 验证结果
        // Assert.assertNotNull(result);
        // Assert.assertEquals("000000", result.getString("retCode"));
    }
}
```

### 4.2 Server 端测试模板

```java
package com.hundsun.bemp.hnnxbank.adapter.msg.server.[业务系统];

import com.alibaba.fastjson.JSONObject;
import com.hundsun.bemp.fw.common.test.BaseTest;
import org.junit.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * [交易码]MessageConverter 测试
 * @author: [作者姓名]
 * @date: [创建日期]
 */
public class [交易码]MessageConverterTest extends BaseTest {
    
    @Autowired
    private [交易码]MessageConverter converter;
    
    @Test
    public void testGetFunctionIdMapping() {
        // 1. 调用方法
        String[] mappings = converter.getFunctionIdMapping();
        
        // 2. 验证结果
        // Assert.assertNotNull(mappings);
        // Assert.assertEquals(2, mappings.length);
    }
    
    @Test
    public void testFromMessage() {
        // 1. 准备测试数据 (模拟 XML 报文)
        // Message<?> message = createTestMessage();
        
        // 2. 调用 fromMessage 方法
        // JSONObject result = converter.fromMessage(message);
        
        // 3. 验证结果
        // Assert.assertNotNull(result);
        // Assert.assertEquals("期望值", result.getString("字段名"));
    }
}
```

## 5. 报文示例

### 5.1 Client 端请求报文示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<transaction>
    <header>
        <ver>1.0</ver>
        <msg>
            <seqNb>202501010001</seqNb>
            <msgCd>JYT.001010010.01</msgCd>
            <sndAppCd>EBBS</sndAppCd>
            <callTyp>SYN</callTyp>
            <sndDt>20250101</sndDt>
            <sndTm>123456789</sndTm>
            <rcvAppCd>JYT</rcvAppCd>
        </msg>
    </header>
    <body>
        <request>
            <字段 1>值 1</字段 1>
            <字段 2>值 2</字段 2>
            <列表>
                <记录>
                    <子字段 1>子值 1</子字段 1>
                    <子字段 2>子值 2</子字段 2>
                </记录>
            </列表>
        </request>
    </body>
</transaction>
```

### 5.2 Client 端响应报文示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<transaction>
    <header>
        <ver>1.0</ver>
        <msg>
            <status>
                <retCd>000000</retCd>
                <desc>交易成功</desc>
            </status>
        </msg>
    </header>
    <body>
        <response>
            <outObj>
                <字段 1>值 1</字段 1>
                <字段 2>值 2</字段 2>
                <outTbl>
                    <子字段 1>子值 1</子字段 1>
                    <子字段 2>子值 2</子字段 2>
                </outTbl>
            </outObj>
        </response>
    </body>
</transaction>
```

### 5.3 Server 端请求报文示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ebbs>
    <header>
        <opCode>EBBS.02100500.01</opCode>
        <version>1.0</version>
        <channelNo>信贷系统</channelNo>
        <reqFlowNo>202501010001</reqFlowNo>
    </header>
    <body>
        <request>
            <contractNo>合同编号</contractNo>
            <billClass>票据介质</billClass>
            <billType>票据类型</billType>
            <list>
                <record>
                    <pledgeNo>质押物编号</pledgeNo>
                    <cdtBillFlowNo>出账清单流水号</cdtBillFlowNo>
                </record>
            </list>
        </request>
    </body>
</ebbs>
```

## 6. 常用字段映射表

### 6.1 核心系统字段映射

| 外部字段 | 内部字段 | 类型 | 说明 |
|---------|---------|------|------|
| acctNo | custAcctNo | String | 客户账号 |
| acctStat | accountStatus | String | 账户状态 |
| avalBal | availBalanceAmt | Decimal | 可用余额 |
| custNo | custNo | String | 客户号 |
| custName | custName | String | 客户名称 |

### 6.2 信贷系统字段映射

| 外部字段 | 内部字段 | 类型 | 说明 |
|---------|---------|------|------|
| contractNo | contractNo | String | 合同号 |
| billClass | billClass | String | 票据介质 |
| billType | billType | String | 票据类型 |
| pledgeNo | impawnNo | String | 质押物编号 |
| cdtBillFlowNo | cdtBillFlowNo | String | 出账清单流水号 |

### 6.3 网银系统字段映射

| 外部字段 | 内部字段 | 类型 | 说明 |
|---------|---------|------|------|
| elctrncSgntr | elctrncSgntr | String | 电子签名 |
| applAcctNo | applAcctNo | String | 申请人账号 |
| custNo | custNo | String | 客户号 |
| billType | billType | String | 票据类型 |
| billMoney | billMoney | Decimal | 票据金额 |

## 7. 快速参考

### 7.1 开发检查清单

- [ ] 类命名符合规范
- [ ] 包路径正确 (client/server + 业务系统)
- [ ] 继承正确的基类
- [ ] 添加@Component 注解
- [ ] 实现 getFunctionIdMapping(Server 端)
- [ ] 实现 toMessage 和 fromMessage(Client 端)
- [ ] 添加 Logger 并记录关键日志
- [ ] 参数校验和异常处理
- [ ] 使用工具类 (XmlUtil、HeadUtils)
- [ ] 列表数据处理
- [ ] 单元测试

### 7.2 常见错误

1. **类名与 Bean 名称不一致**
   ```java
   // 错误
   @Component("BOCE020104MessageConverter")
   public class BOCe020104MessageConverter { ... }
   
   // 正确
   @Component("BOCE020104MessageConverter")
   public class BOCE020104MessageConverter { ... }
   ```

2. **未实现必要的方法**
   ```java
   // Server 端必须实现
   @Override
   public String[] getFunctionIdMapping() { ... }
   ```

3. **字段映射错误**
   ```java
   // 错误 - 未处理空值
   String value = node.getSubNode("field").getText();
   
   // 正确 - 使用工具类
   String value = XmlUtil.xmlNodeIsNull(node.getSubNode("field"));
   ```

### 7.3 最佳实践

1. **代码复用**: 优先复用已有工具类和公共服务
2. **异常处理**: 明确区分参数校验异常、业务异常和系统异常
3. **日志记录**: 记录关键业务点和异常情况
4. **性能优化**: 避免重复创建对象，合理使用缓存
5. **可维护性**: 添加详细注释，保持代码清晰
