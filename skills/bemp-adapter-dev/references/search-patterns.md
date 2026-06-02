# 代码探索搜索模式

## 搜索策略总览

开发MessageConverter时，需并行搜索三类代码，收集完整的映射依据。搜索策略需适配不同银行的报文风格。

## 第零步：识别银行报文风格

在搜索前，先确定目标银行的报文风格，决定后续搜索重点。

### 识别方法
```
Glob: banks/ext-{bank}/**/msg/server/*BaseMessageApplyResponseConverter.java
Glob: banks/ext-{bank}/**/msg/server/Abstract*MessageApplyResponseConverter.java
```

### 风格判定规则
| 发现的基类 | 报文风格 | 搜索重点 |
|-----------|---------|---------|
| 无银行基类 + XmlDocument引用 | XML模式 | XML解析风格、HeadUtils用法 |
| YbinChannelBaseMessageApplyResponseConverter | JSON+基类模式(YbinChannel) | 是否需要覆写、基类逻辑 |
| AbstractYbinMessageApplyResponseConverter | JSON+基类模式(AbstractYbin) | 需显式getFunctionIdMapping |
| 无银行基类 + JSONObject引用 + @CloudReference | JSON直通模式 | JSON字段结构、数据补充逻辑 |
| 无银行基类 + XmlDocument + EncryptKeyUtils | XML混合模式(qinnbank credit) | 解密解析、加密响应、SERVICE结构 |

### 特殊情况：qinnbank 模块级差异
qinnbank 不同模块使用不同报文风格，必须按模块识别：
- `banks/ext-qinnbank/.../msg/server/ebank/` → JSON直通模式
- `banks/ext-qinnbank/.../msg/server/credit/` → XML混合模式（加密传输）

## 搜索线一：同银行参考实现

### 目标
找到同银行适配器模块下已有的MessageConverter，确定报文解析风格和工具类用法。

### 搜索命令
```
Glob: banks/ext-{bank}/**/*MessageConverter.java
```

### 必读文件（按报文风格区分）

#### XML模式必读
| 文件 | 用途 |
|------|------|
| 同目录下的MessageConverter | 确定XML解析风格 |
| {bank}/adapter/msg/util/HeadUtils.java | 请求/响应头封装方法 |
| {bank}/adapter/msg/util/XmlUtil.java | XML节点取值方法 |
| {bank}/adapter/msg/common/MessageConstants.java | 常量定义 |
| {bank}/adapter/msg/server/MqMessageInterceptor.java | 消息拦截器，了解路由机制 |

#### JSON+基类模式必读
| 文件 | 用途 |
|------|------|
| YbinChannelBaseMessageApplyResponseConverter.java | 渠道基类，自动从类名推导getFunctionIdMapping |
| AbstractYbinMessageApplyResponseConverter.java | 抽象基类，需显式实现getFunctionIdMapping |
| 同目录下的空壳Converter | 确认是否需要覆写 |
| 同目录下覆写了fromMessage的Converter | 确认字段映射逻辑 |
| {bank}/adapter/msg/utils/XmlUtil.java | buildSuccessMessage方法 |

#### JSON直通模式必读
| 文件 | 用途 |
|------|------|
| 同目录下的MessageConverter | 确定JSON处理风格 |
| {bank}/adapter/msg/util/HeadUtils.java | 报文头工具（如有） |
| {bank}/adapter/msg/common/MessageConstants.java | 常量定义 |
| {bank}/adapter/msg/TcpMessageInterceptor.java | TCP消息拦截器 |

#### XML混合模式必读（qinnbank credit）
| 文件 | 用途 |
|------|------|
| 同目录下的MessageConverter | 确定XML加解密和解析风格 |
| {bank}/adapter/msg/util/EncryptKeyUtils.java | 报文加解密工具 |
| {bank}/adapter/msg/util/HeadUtils.java | 报文头工具（sysHeadToJson签名不同） |
| {bank}/adapter/msg/util/XmlUtil.java | XML工具（formatXml、xmlNodeIsNull） |
| {bank}/adapter/msg/common/MessageConstants.java | 常量（SERVICE/SERVICE_HEADER/SERVICE_BODY） |

### 关键观察点

#### XML模式观察点
- XML解析入口：`XmlDocument` → `getRoot()` → `getSubNode("body")` → `getSubNode("request")`
- 请求头封装：`HeadUtils.sysHeadToJson` 的参数和返回值
- 响应头封装：`HeadUtils.jsonToSysHead` 的参数和返回值
- 数组处理：`getSubNodes` + 循环 + `MessageConstants.NUM`
- ECIF特殊处理：tellerNo/orgCode的Header覆盖

#### JSON模式观察点
- JSON提取路径：`payload.getJSONObject("body")` 或 `payload.getJSONObject("requestDto")`
- 字段映射：是否需要重命名或类型转换
- 数据补充：是否注入@CloudReference服务
- 响应封装：直接toJSONString还是buildSuccessMessage

## 搜索线二：其他银行同类实现

### 目标
找到其他银行适配器下的同名MessageConverter，确定字段映射关系。

### 搜索命令
```
Grep: {PICE_CODE}MessageConverter (glob: *.java)
```

### 关键观察点
- fromMessage中的字段映射逻辑
- 外围字段名到内部DTO字段名的映射关系
- toMessage中的响应字段组装逻辑
- 特殊处理逻辑（如Header覆盖、数组解析）
- **不同银行的映射差异**：同一功能号在不同银行的字段名可能不同

### 跨银行映射差异分析
当发现其他银行已有同类实现时，需对比：
1. 外部服务码是否相同（不同银行可能使用不同服务码）
2. 字段映射是否一致（外围字段名可能不同）
3. 报文格式是否相同（XML vs JSON）
4. 基类是否相同（影响代码结构）

## 搜索线三：产品接口定义

### 目标
找到产品服务接口和DTO定义，确定内部字段结构。

### 搜索命令
```
Grep: class Ecif{code}Service (glob: *.java)
Glob: **/ecif{code}/Ecif{code}ReqDto.java
Glob: **/ecif{code}/Ecif{code}ResDto.java
```

### 必读文件
| 文件 | 用途 |
|------|------|
| EcifXXXService.java | 确认功能号（@CloudFunction）和方法签名 |
| EcifXXXReqDto.java | 确认请求DTO字段名和含义 |
| EcifXXXResDto.java | 确认响应DTO字段名和含义 |
| EcifXXXServiceImpl.java | 确认业务逻辑和校验规则 |

### 关键观察点
- @CloudFunction的functionId（即内部功能号）
- ReqDto的字段名、类型、注释
- ResDto的字段名、类型、注释
- ServiceImpl中的字段校验规则（如operType的合法值）

## 搜索线四：单元测试参考（新增）

### 目标
查找同银行或同模块的单元测试，确定测试风格和Mock模式。

### 搜索命令
```
Glob: banks/ext-{bank}/**/src/test/**/*Test.java
Glob: adapter/as/src/test/**/*Test.java
```

### 关键观察点
- 测试框架版本（JUnit 4 / JUnit 5）
- Mock框架（Mockito / PowerMock）
- 是否启动Spring上下文
- Message/XmlDocument的Mock方式
- 断言风格（assertEquals / assertThat）

### 无现有测试时的默认策略
- JUnit 4 + Mockito（项目pom.xml已声明junit依赖）
- 纯Mock方式，不启动Spring上下文
- XmlDocument/XmlNode使用Mockito.mock()
- JSONObject使用真实对象构造
- 每个Converter配套一个Test类

## 搜索结果汇总模板

完成四线搜索后，按以下格式汇总：

```
=== 搜索结果汇总 ===

【银行风格】{bank} = {XML模式/JSON+基类模式/JSON直通模式}

【同银行参考】
- 参考Converter: {文件路径}
- 工具类: HeadUtils={路径}, XmlUtil={路径}
- 解析风格: {描述}

【其他银行同类实现】
- {bank2}: {文件路径}, 映射差异={描述}
- {bank3}: {文件路径}, 映射差异={描述}

【产品接口】
- Service: {路径}, functionId={PICE_CODE}
- ReqDto: {路径}, 字段={列表}
- ResDto: {路径}, 字段={列表}

【单元测试】
- 现有测试: {有/无}
- 测试风格: {描述}
```
