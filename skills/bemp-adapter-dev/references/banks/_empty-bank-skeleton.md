# 空模板银行开发通用骨架

> 适用: bank-index.json 中 status=EMPTY 的银行
> 共同特征: 银行子模块已建，但 `src/main/java` 仅有 `del.properties`，未实现任何 MessageConverter

## 目录约定

```
banks/ext-<bank-key>/
├── <bank-key>-adapter-api/         # 接口定义
├── <bank-key>-adapter-as/          # 适配器实现（Converter 主战场）
│   └── src/main/java/.../adapter/msg/
│       ├── server/                 # server 端（ebank/credit/ecif/core/other）
│       ├── client/                 # client 端（esb/ecif/credit/core/other）
│       ├── utils/                  # 工具（TransUtil, HeadUtils, XmlUtil, DateUtil）
│       ├── constants/              # 常量（MessageConstants, WsTagConst, EbankConst）
│       ├── vo/                     # 值对象（RetVo, TagVo, BillRoleVo）
│       └── interceptor/            # MqMessageInterceptor / TcpMessageInterceptor
├── <bank-key>-biz-api/             # 业务接口
├── <bank-key>-biz-as/              # 业务实现
├── <bank-key>-common/              # 公共代码
├── <bank-key>-conf/                # 配置文件
├── <bank-key>-adapter-boot-deploy/ # 适配器启动
├── <bank-key>-cpesmq-boot-deploy/  # CPESMQ 启动
└── <bank-key>-served-boot-deploy/  # 服务启动
```

## 首次开发检查清单

### 模块准备
- [ ] `<bank-key>-adapter-as/pom.xml` 已声明 `adapter-api`/`adapter-as`/`adapter-client-api`/`fw-common` 依赖
- [ ] `<bank-key>-adapter-boot-deploy` 已建（含 `BempAdapterAppStarter`）
- [ ] `<bank-key>-served-boot-deploy` 已建（含 `BempServedAppStarter`）

### 工具类与常量
- [ ] 创建 `utils/TransUtil.java`
- [ ] 创建 `utils/HeadUtils.java`（SOAP/WS 或 TCP 时需要）
- [ ] 创建 `utils/XmlUtil.java`（XML 时需要）
- [ ] 创建 `utils/DateUtil.java`（涉及日期时需要）
- [ ] 创建 `constants/MessageConstants.java`
- [ ] 创建 `constants/WsTagConst.java`（SOAP/WS 时需要）
- [ ] 创建 `constants/EbankConst.java`（网银业务常量）
- [ ] 创建 `vo/RetVo.java` / `vo/TagVo.java`

### 拦截器
- [ ] 创建 `MqMessageInterceptor.java`（MQ 监听时）
- [ ] 创建 `TcpMessageInterceptor.java`（TCP 监听时）

### 路由配置
- [ ] `application.properties` 配置 `mq.queue.bill.dispatch.in` 和 `bank.code=<bank-key>`

### 第一个 Converter 落地
- [ ] 选择最简单的接口（如 PICE070101）作为首个 Converter
- [ ] 按基类决策树选基类
- [ ] 编写 Converter + 配套 Test + mock-msg
- [ ] `mvn test` + `mvn compile` 通过
- [ ] 启动 adapter-boot-deploy 验证 bean 注册

### 参考实现
- 查 `bank-index.json` 中 status=IMPLEMENTED 的银行模板，作为最权威的参考样本
- 搜索同功能号在其他银行的实现: `Grep: {PICE_CODE}MessageConverter (glob: *.java)`
