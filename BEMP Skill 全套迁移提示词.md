# BEMP Skill 全套迁移提示词

## 使用说明
将以下内容完整复制给 AI，替换 `[ ]` 中的占位符后执行。此提示词适用于在新电脑环境下安装整套 BEMP Skill 并迁移至新银行场景。

**配置体系架构**：
```
全局配置中心 (_shared/env-config.json)
  ├─ bank 节 → 银行标识唯一数据源（code, classPrefix, projectDir, urlPrefix 等）
  ├─ environmentDefaults → 所有 ${ENV:VAR_NAME} 占位符的回退值
  └─ paths/services/database → 通用基础设施配置（已全部占位符化）

三级配置解析：系统环境变量 > environmentDefaults > 硬编码默认值
```

---

# 角色
你是 BEMP 票据系统的 Skill 迁移专家。请根据以下迁移参数，自动扫描并修改 `.trae/skills/` 目录下所有配置文件和代码中的旧值。

# 迁移参数（请根据实际情况填写）

## 1. 银行标识映射
| 配置项 | 旧值 | 新值 |
|--------|------|------|
| 银行代码 | hnnxbank | [NEW_BANK_CODE] |
| 银行短代码 | hnnx | [NEW_BANK_SHORT] |
| 银行中文名 | 河南农信 | [NEW_BANK_NAME] |
| 银行全称 | 河南农商银行 | [NEW_BANK_FULL_NAME] |
| 类名前缀 | HnnxBank | [NEW_CLASS_PREFIX] |
| DTO前缀 | Hnnx | [NEW_DTO_PREFIX] |
| 包名路径 | com.hundsun.bemp.hnnxbank | com.hundsun.bemp.[NEW_BANK_CODE] |
| 源码目录 | ext-hnnxbank | ext-[NEW_BANK_CODE] |
| URL前缀 | /hnnx/ | /[NEW_BANK_SHORT]/ |
| URL前缀(完整) | /hnnxbank/ | /[NEW_BANK_CODE]/ |
| 前端组件路径 | banks/hnnxbank | banks/[NEW_BANK_CODE] |
| 前端视图路径 | views/bizViews/banks/hnnxbank | views/bizViews/banks/[NEW_BANK_CODE] |
| 路由文件 | hnnxbankIndex.js | [NEW_BANK_CODE]Index.js |
| 部署模块名 | hnnxbank-served-deploy | [NEW_BANK_CODE]-served-deploy |
| 核心模块名 | hnnxbank-served-core | [NEW_BANK_CODE]-served-core |
| 接口模块名 | hnnxbank-served-facade | [NEW_BANK_CODE]-served-facade |
| 适配器模块 | hnnxbank-adapter-as | [NEW_BANK_CODE]-adapter-as |
| API模块名 | hnnxbank-biz-api | [NEW_BANK_CODE]-biz-api |
| 业务模块名 | hnnxbank-biz-as | [NEW_BANK_CODE]-biz-as |
| Sonar项目Key | bemp-ext-hnnxbank | bemp-ext-[NEW_BANK_CODE] |
| Sonar项目名称 | BEMP Henan Rural Credit Personalized Extension | BEMP [NEW_BANK_NAME] Personalized Extension |
| Sonar英文项目名 | BEMP Ext HNNXBank | BEMP Ext [NEW_CLASS_PREFIX]Bank |
| 数据库表前缀 | HNNX_ | [NEW_TABLE_PREFIX]_ |
| SpringBoot主模块 | hnnxbank-served-deploy | [NEW_BANK_CODE]-served-deploy |

## 2. 数据库映射
| 配置项 | 旧值 | 新值 |
|--------|------|------|
| Oracle用户名 | bemp_hnnx | [NEW_ORACLE_USER] |
| Oracle Schema | BEMP_HNNX | [NEW_ORACLE_SCHEMA] |
| Oracle DSN | 10.20.18.177:1521/orcl | [NEW_ORACLE_DSN] |
| Oracle主机 | 10.20.18.177 | [NEW_ORACLE_HOST] |
| Oracle服务名 | orcl | [NEW_ORACLE_SERVICE] |
| MySQL数据库名 | bemp_hnnx | [NEW_MYSQL_DB] |
| MySQL DSN | root@127.0.0.1:3306/bemp_hnnx | [NEW_MYSQL_DSN] |
| MySQL主机 | 127.0.0.1 | [NEW_MYSQL_HOST] |
| MySQL用户名 | root | [NEW_MYSQL_USER] |

## 3. 环境路径映射
| 配置项 | 旧值 | 新值 |
|--------|------|------|
| 工作区根目录 | d:\code\QJ\BEMP5.0DEV | [NEW_WORKSPACE_ROOT] |
| 银行工程路径 | d:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank | [NEW_BANKS_PROJECT_PATH] |
| 前端工程路径 | d:\code\QJ\BEMP5.0DEV\frontend | [NEW_FRONTEND_PATH] |
| 部署目录 | D:/code/QJ/bempDeploy | [NEW_DEPLOY_DIR] |
| Trae路径 | F:\Program Files\Trae CN\Trae CN.exe | [NEW_TRAE_PATH] |
| Java Home | D:\code\Java\jdk1.8.0_341 | [NEW_JAVA_HOME] |
| JDK for Sonar | D:\code\Java\jdk-25.0.1 | [NEW_JAVA_HOME_SONAR] |
| Node路径 | D:\code\nodejs14\node.exe | [NEW_NODE_PATH] |
| Node.js安装路径 | D:/code/nodejs14 | [NEW_NODE_HOME] |
| Maven路径 | D:\code\apache-maven-3.6.3\bin\mvn.cmd | [NEW_MAVEN_PATH] |
| Maven Home | D:\code\apache-maven-3.6.3 | [NEW_MAVEN_HOME] |
| Maven Settings | D:/code/apache-maven-3.6.3/conf/settings-Artifactory.xml | [NEW_MAVEN_SETTINGS] |
| Redis路径 | D:\code\Redis-x64-5.0.14.1\redis-server.exe | [NEW_REDIS_PATH] |
| ZooKeeper路径 | D:\code\apache-zookeeper-3.8.3-bin\bin\zkServer.cmd | [NEW_ZK_PATH] |
| JMeter路径 | D:\code\Jmeter\apache-jmeter-5.6.3\bin\jmeter.bat | [NEW_JMETER_PATH] |
| Sonar安装路径 | D:\code\sonar\sonarqube-26.1.0.118079 | [NEW_SONAR_SERVER_PATH] |
| Sonar Scanner路径 | D:\code\sonar\sonar-scanner-8.0.1.36819 | [NEW_SONAR_SCANNER_PATH] |
| Sonar Scanner前端 | D:\code\sonar\sonar-scanner-8.0.1.36819 | [NEW_SONAR_SCANNER_FRONTEND] |
| Nginx路径 | D:/code/nginx-1.12.2 | [NEW_NGINX_HOME] |
| Git仓库URL | https://gitlab.hundsun.com/bemp/banks.git | [NEW_GIT_REPO_URL] |
| Git凭证ID | gitlab-credentials | [NEW_GIT_CREDENTIALS_ID] |

## 4. 测试账号映射
| 角色 | 旧账号 | 新账号 |
|------|--------|--------|
| 普通柜员 | wangnan02 | [NEW_TELLER_USER] |
| 法人管理员 | mllzs01 | [NEW_ADMIN_USER] |
| 机构管理员 | wangnan01 | [NEW_BRANCH_ADMIN] |
| 分行柜员 | sjl03 | [NEW_BRANCH_TELLER] |

> 测试密码已统一使用 `${ENV:BEMP_TEST_PASSWORD}` 占位符，无需逐文件修改。只需在新环境中设置 `BEMP_TEST_PASSWORD` 环境变量或在 `_shared/env-config.json` 的 `environmentDefaults` 中配置。

## 5. 报文风格配置（根据新银行实际情况选择）
| 配置项 | 可选值 | 说明 |
|--------|--------|------|
| 报文风格 | XML / JSON_BASE / JSON_DIRECT | XML需XmlDocument/XmlNode解析；JSON_BASE大部分空壳Converter；JSON_DIRECT无基类自行处理 |
| 基类 | AbstractMessageApplyResponseConverter / YbinChannelBaseMessageApplyResponseConverter / [银行自定义基类] | XML和JSON_DIRECT用Abstract；JSON_BASE用银行基类 |
| 拦截器 | MqMessageInterceptor / YbinTcpMessageInterceptor / TcpMessageInterceptor / [银行自定义拦截器] | XML用MqMessage；JSON_BASE用YbinTcp；JSON_DIRECT用Tcp |
| 服务代码模式 | EBBS.{tx_code}.01 / {PICE_CODE} | XML风格用EBBS模式；JSON风格用PICE_CODE模式 |

---

# 执行任务清单

## 第一步：识别所有需要修改的文件
请先扫描 `.trae/skills/` 目录，列出所有包含旧银行标识的文件。按以下分类检查：

### P0 - 全局环境配置（最核心，必须最先修改）
- `_shared/env-config.json` — 银行标识唯一数据源（bank 节）+ 所有环境变量回退值（environmentDefaults）
- `_shared/Resolve-EnvConfig.ps1` — 环境变量解析器（一般无需修改，但需验证解析正常）
- `.trae/mcp.json` — MCP服务端配置，数据库实际连接参数在此文件管理

### P1 - 银行配置文件（配置字典模式，需新增银行节）
- `bemp-adapter-dev/config/bank-config.json` — 适配器银行配置（报文风格、模块、包名）
- `bemp-backend-code-review/config/bank-config.json` — 后端审查银行配置（currentBank、包名、类前缀）
- `bemp-frontend-code-review/scripts/review-config.json` — 前端审查银行配置（bankName、路径模板）

### P2 - 测试配置文件
- `bemp-webapp-testing/config/test_config.json` — Web自动化测试配置（active_bank、URL前缀、登录账号、页面路径、选择器）
- `bemp-webapp-testing/test-data/test-accounts.json` — 测试账号（银行key、用户名）
- `bemp-webapp-testing/config/test_config.schema.json` — 测试配置schema（描述中的示例值）
- `bemp-testcase-generator/config/generator-config.json` — 用例生成器配置（active_bank、URL前缀）
- `bemp-chrome-devtools-test/config/bemptest-config.json` — Chrome DevTools测试配置（bank_profile、API前缀、账号、银行专属选择器、表名前缀）

### P3 - 数据库配置文件
- `bemp-db-operator/config/db-config.json` — 数据库连接配置（bankName、权限模板SQL中的库名）

### P4 - 构建/部署配置文件
- `bemp-automation-startserver/config/config.json` — 服务启动配置（已占位符化，验证即可）
- `bemp-git-maven-automation/config/config.properties` — Git/Maven构建配置（BANKS_BUILD_DIRS）
- `bemp-jenkins-deploy/config/bemp-deploy.yml` — Jenkins部署配置（已占位符化，验证即可）
- `bemp-jenkins-deploy/assets/sonar-project.properties` — Sonar项目属性（projectKey、projectName、binaries路径）
- `bemp-sonarqube-mcp/config/scan_config.json` — SonarQube扫描配置（项目Key、模块路径）

### P5 - 文档生成配置文件
- `bemp-advanced-doc-generator/config/modules/default-profile.json` — 默认业务配置（codeDir）
- `bemp-advanced-doc-generator/assets/详细设计文档模板.json` — 详细设计模板（代码目录示例）

### P6 - 代码回退默认值
- `bemp-sonarqube-mcp/scripts/verify-connection.ps1` — Sonar连接验证（2处硬编码回退值）
- `bemp-sonarqube-mcp/scripts/generate-scan-scope.ps1` — 扫描范围生成（2处硬编码回退值）
- `bemp-advanced-doc-generator/lib/requirement-analyzer.js` — 需求分析（1处硬编码回退值）
- `bemp-webapp-testing/scripts/common.py` — 测试公共库（1处硬编码回退值）
- `bemp-webapp-testing/scripts/test_accept_bank_credit.py` — 承兑行额度测试（1处硬编码回退值）
- `bemp-git-maven-automation/scripts/config-reader.ps1` — 配置读取（1处硬编码回退值）
- `bemp-testcase-generator/scripts/generate_test_cases.py` — 用例生成（2处硬编码回退值）
- `bemp-webapp-testing/examples/bemp_page_test.py` — 测试示例（1处硬编码回退值）
- `bemp-webapp-testing/examples/bemp_login.py` — 登录示例（1处硬编码回退值）
- `bemp-webapp-testing/examples/bemp_api_monitor.py` — API监控示例（1处硬编码回退值）

### P7 - SKILL.md 和参考文档
- 所有 `*/SKILL.md` 文件中包含旧银行名称的引用
- `bemp-personalized-dev/` 下的参考文档和代码模板
- `bemp-frontend-code-review/scripts/config-loader.js` — unionbank 注释列表
- `bemp-frontend-code-review/scripts/check-routes.js` — 路由检查提示信息
- `bemp-frontend-code-review/scripts/examples/ui-patterns.js` — 代码审查教学示例
- `bemp-db-operator/scripts/oracle-cli-guide.md` — Oracle使用指南示例
- `bemp-db-operator/references/safety-guide.md` — 安全指南SQL示例
- `bemp-db-operator/references/connection-guide.md` — 连接指南示例

### P8 - 历史输出文件（不修改，仅记录）
- `bemp-test-common/delivery/hnnxbank-test-report.md` — 已生成的测试报告
- `bemp-test-common/delivery/hnnxbank-detail-design-doc.md` — 已生成的详细设计文档
- `bemp-test-common/test-cases/adapter/ecif/ecif-customer-merge.md` — 适配器测试用例
- `bemp-advanced-doc-generator/output/PICE070701-design-template.json` — 历史输出文件

> ⚠️ P8 文件为历史交付物和教学示例，**不需要修改**。迁移后这些文件仍保留 hnnxbank 的历史记录。

## 第二步：按文件详细修改字段

### 2.1 `_shared/env-config.json`（最核心，所有配置的源头）
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `bank.code` | `hnnxbank` | [NEW_BANK_CODE] |
| `bank.classPrefix` | `Hnnx` | [NEW_DTO_PREFIX] |
| `bank.classNamePrefix` | `HnnxBank` | [NEW_CLASS_PREFIX] |
| `bank.schemaName` | `BEMP_HNNX` | [NEW_ORACLE_SCHEMA] |
| `bank.dbName` | `bemp_hnnx` | [NEW_MYSQL_DB] |
| `bank.projectDir` | `ext-hnnxbank` | ext-[NEW_BANK_CODE] |
| `bank.urlPrefix` | `/hnnxbank/` | /[NEW_BANK_CODE]/ |
| `bank.sonarProjectKey` | `bemp-ext-hnnxbank` | bemp-ext-[NEW_BANK_CODE] |
| `bank.sonarProjectName` | `BEMP Ext HNNXBank` | BEMP Ext [NEW_CLASS_PREFIX]Bank |
| `bank.modulePrefix` | `hnnxbank-` | [NEW_BANK_CODE]- |
| `bank.packagePrefix` | `com.hundsun.bemp.hnnxbank` | com.hundsun.bemp.[NEW_BANK_CODE] |
| `bank.batchTable` | `HNNX_ACCBANK_CREDIT_BATCH` | [NEW_TABLE_PREFIX]_ACCBANK_CREDIT_BATCH |
| `bank.infoTable` | `HNNX_ACCBANK_CREDIT_INFO` | [NEW_TABLE_PREFIX]_ACCBANK_CREDIT_INFO |
| `environmentDefaults.BEMP_WORKSPACE_ROOT` | `d:\\code\\QJ\\BEMP5.0DEV` | [NEW_WORKSPACE_ROOT] |
| `environmentDefaults.JAVA_HOME` | `D:\\code\\Java\\jdk1.8.0_341` | [NEW_JAVA_HOME] |
| `environmentDefaults.JAVA_HOME_SONAR` | `D:\\code\\Java\\jdk-25.0.1` | [NEW_JAVA_HOME_SONAR] |
| `environmentDefaults.NODE_PATH` | `D:\\code\\nodejs14\\node.exe` | [NEW_NODE_PATH] |
| `environmentDefaults.NODE_HOME` | `D:\\code\\nodejs14` | [NEW_NODE_HOME] |
| `environmentDefaults.MAVEN_PATH` | `D:\\code\\apache-maven-3.6.3\\bin\\mvn.cmd` | [NEW_MAVEN_PATH] |
| `environmentDefaults.MAVEN_HOME` | `D:\\code\\apache-maven-3.6.3` | [NEW_MAVEN_HOME] |
| `environmentDefaults.MAVEN_SETTINGS` | （空） | [NEW_MAVEN_SETTINGS] |
| `environmentDefaults.JMETER_PATH` | `D:\\code\\Jmeter\\apache-jmeter-5.6.3\\bin\\jmeter.bat` | [NEW_JMETER_PATH] |
| `environmentDefaults.REDIS_EXE` | `D:\\code\\Redis-x64-5.0.14.1\\redis-server.exe` | [NEW_REDIS_PATH] |
| `environmentDefaults.ZOOKEEPER_EXE` | `D:\\code\\apache-zookeeper-3.8.3-bin\\bin\\zkServer.cmd` | [NEW_ZK_PATH] |
| `environmentDefaults.SONARQUBE_HOME` | `D:\\code\\sonar\\sonarqube-26.1.0.118079` | [NEW_SONAR_SERVER_PATH] |
| `environmentDefaults.SONAR_SCANNER_HOME` | `D:\\code\\sonar\\sonar-scanner-8.0.1.36819` | [NEW_SONAR_SCANNER_PATH] |
| `environmentDefaults.SONAR_SCANNER_HOME_FRONTEND` | `D:\\code\\sonar\\sonar-scanner-8.0.1.36819` | [NEW_SONAR_SCANNER_FRONTEND] |
| `environmentDefaults.NGINX_HOME` | `D:\\code\\nginx-1.12.2` | [NEW_NGINX_HOME] |
| `environmentDefaults.BEMP_DEPLOY_DIR` | `D:\\code\\QJ\\bempDeploy` | [NEW_DEPLOY_DIR] |
| `environmentDefaults.ORACLE_HOST` | `10.20.18.177` | [NEW_ORACLE_HOST] |
| `environmentDefaults.ORACLE_SERVICE` | `orcl` | [NEW_ORACLE_SERVICE] |
| `environmentDefaults.ORACLE_USERNAME` | `bemp_hnnx` | [NEW_ORACLE_USER] |
| `environmentDefaults.ORACLE_SCHEMA` | `BEMP_HNNX` | [NEW_ORACLE_SCHEMA] |
| `environmentDefaults.ORACLE_DSN` | `10.20.18.177:1521/orcl` | [NEW_ORACLE_DSN] |
| `environmentDefaults.SONAR_PROJECT_KEY` | `bemp-ext-hnnxbank` | bemp-ext-[NEW_BANK_CODE] |
| `environmentDefaults.MYSQL_HOST` | `127.0.0.1` | [NEW_MYSQL_HOST] |
| `environmentDefaults.MYSQL_DATABASE` | `bemp_hnnx` | [NEW_MYSQL_DB] |
| `environmentDefaults.MYSQL_USERNAME` | `root` | [NEW_MYSQL_USER] |
| `environmentDefaults.MYSQL_DSN` | `root@127.0.0.1:3306/bemp_hnnx` | [NEW_MYSQL_DSN] |
| `environmentDefaults.BEMP_TEST_PASSWORD` | （空） | [NEW_TEST_PASSWORD] |
| `environmentDefaults.BANK_CODE` | `hnnxbank` | [NEW_BANK_CODE] |
| `environmentDefaults.BANK_PROJECT_DIR` | `ext-hnnxbank` | ext-[NEW_BANK_CODE] |
| `environmentDefaults.BANK_URL_PREFIX` | `/hnnxbank/` | /[NEW_BANK_CODE]/ |
| `environmentDefaults.BANK_SONAR_PROJECT_KEY` | `bemp-ext-hnnxbank` | bemp-ext-[NEW_BANK_CODE] |
| `environmentDefaults.BANK_SONAR_PROJECT_NAME` | `BEMP Ext HNNXBank` | BEMP Ext [NEW_CLASS_PREFIX]Bank |
| `environmentDefaults.BANK_MODULE_PREFIX` | `hnnxbank-` | [NEW_BANK_CODE]- |
| `environmentDefaults.BANK_PACKAGE_PREFIX` | `com.hundsun.bemp.hnnxbank` | com.hundsun.bemp.[NEW_BANK_CODE] |
| `environmentDefaults.BANK_CLASS_PREFIX` | `Hnnx` | [NEW_DTO_PREFIX] |
| `environmentDefaults.BANK_DB_SCHEMA` | `BEMP_HNNX` | [NEW_ORACLE_SCHEMA] |
| `environmentDefaults.BANK_DB_NAME` | `bemp_hnnx` | [NEW_MYSQL_DB] |

> **关键规则**：`env-config.json` 中的 `environmentDefaults` 是所有 `${ENV:VAR_NAME}` 占位符的回退值来源。其他配置文件中的占位符（如 `${ENV:JAVA_HOME}`）不需要修改，只需确保 `environmentDefaults` 中有正确的值即可。

### 2.2 `bemp-automation-startserver/config/config.json`
此文件已全部占位符化，无需修改银行标识。验证以下占位符在 env-config.json 中有正确回退值：
- `globalPaths.banksProjectPath` → `${ENV:BEMP_WORKSPACE_ROOT}\\banks\\${ENV:BANK_PROJECT_DIR}`
- `services.springboot.modulePath` → `${ENV:BANK_MODULE_PREFIX}served-deploy`

### 2.3 `bemp-backend-code-review/config/bank-config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `currentBank` | `hnnxbank` | [NEW_BANK_CODE] |
| `banks.hnnxbank` → 整个节点 | 复制为新银行节点 | 按映射表修改所有字段 |

新增银行节点模板：
```json
"[NEW_BANK_CODE]": {
  "bankName": "[NEW_BANK_FULL_NAME]",
  "bankCode": "[NEW_BANK_CODE]",
  "bankCodeShort": "[NEW_BANK_SHORT]",
  "sourceDir": "banks/ext-[NEW_BANK_CODE]",
  "packagePath": "com.hundsun.bemp.[NEW_BANK_CODE]",
  "classPrefix": "[NEW_CLASS_PREFIX]",
  "dtoPrefix": "[NEW_DTO_PREFIX]",
  "urlPrefixes": ["/[NEW_BANK_SHORT]/", "/[NEW_BANK_CODE]/"],
  "dtoSourceDir": "banks/ext-[NEW_BANK_CODE]/[NEW_BANK_CODE]-biz-api/src/main/java",
  "enableAutoScan": true,
  "note": "[NEW_BANK_FULL_NAME]个性化模块"
}
```

> 保留原有 `hnnxbank` 节点作为历史参考。

### 2.4 `bemp-frontend-code-review/scripts/review-config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `bankName` | `hnnxbank` | [NEW_BANK_CODE] |
| `availableBanks` 数组 | 添加新银行代码 | 在数组中添加 [NEW_BANK_CODE] |

### 2.5 `bemp-frontend-code-review/scripts/config-loader.js`
| 行号 | 旧值 | 新值 |
|------|------|------|
| 第15行注释 | `unionbank = "hnnxbank\|huisbank\|...` | 在列表中添加 [NEW_BANK_CODE] |

### 2.6 `bemp-frontend-code-review/scripts/check-routes.js`
| 行号 | 旧值 | 新值 |
|------|------|------|
| 第102行 | `hnnxbankIndex.js 中注册路由映射` | [NEW_BANK_CODE]Index.js 中注册路由映射 |

### 2.7 `bemp-adapter-dev/config/bank-config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `banks.hnnxbank` → 整个节点 | 复制为新银行节点 | 按报文风格配置修改 |

新增银行节点需填写：
- `bank_name`, `adapter_module`, `package_prefix`
- `message_style`（XML/JSON_BASE/JSON_DIRECT），`style_detail`
- `base_class`, `ext_service_code_pattern`, `ext_service_code_patterns_by_channel`
- `interceptor_class`, `modules`（ecif/credit/ebank等子模块配置）

> 保留原有 `hnnxbank` 节点。新银行需根据报文风格（XML/JSON_BASE/JSON_DIRECT）选择对应的配置模板。如果新银行使用 XML 报文且与 hnnxbank 风格相同，可直接复制 hnnxbank 节点并替换银行标识。

### 2.8 `bemp-webapp-testing/config/test_config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `active_bank` | `hnnxbank` | [NEW_BANK_CODE] |
| `banks.hnnxbank` → 整个节点 | 复制为新银行节点 | 修改name、url_prefix、component_base、view_path、route_index、login账号、pages |
| `banks.hnnxbank.login.*.username` | 旧账号 | [NEW_*_USER] |

新增银行节点模板：
```json
"[NEW_BANK_CODE]": {
  "name": "[NEW_BANK_FULL_NAME]",
  "url_prefix": "/[NEW_BANK_CODE]/",
  "component_base": "banks/[NEW_BANK_CODE]",
  "view_path": "views/bizViews/banks/[NEW_BANK_CODE]",
  "route_index": "[NEW_BANK_CODE]Index.js",
  "login": {
    "teller": { "username": "[NEW_TELLER_USER]", "password": "${ENV:BEMP_TEST_PASSWORD}" },
    "admin": { "username": "[NEW_ADMIN_USER]", "password": "${ENV:BEMP_TEST_PASSWORD}" },
    "branch_admin": { "username": "[NEW_BRANCH_ADMIN]", "password": "${ENV:BEMP_TEST_PASSWORD}" },
    "branch_teller": { "username": "[NEW_BRANCH_TELLER]", "password": "${ENV:BEMP_TEST_PASSWORD}" }
  },
  "pages": { ... 参照 hnnxbank 节点结构 ... }
}
```

### 2.9 `bemp-webapp-testing/test-data/test-accounts.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `hnnxbank` → 整个节点 | 复制为新银行节点 | 修改账号和描述 |

### 2.10 `bemp-chrome-devtools-test/config/bemptest-config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `bank_profile` | `hnnxbank` | [NEW_BANK_CODE] |
| `environment.services.backend.api_prefix` | `${ENV:BANK_URL_PREFIX}` | 不变（已占位符化） |
| `accounts.*.username` | 旧账号 | [NEW_*_USER] |
| `selectors.selectors_by_bank.hnnxbank` | 整个节点 | 复制为新银行节点，修改表名前缀和菜单树 |

> 选择器依赖新银行的实际 DOM 结构。如果新银行使用相同的 BEMP 框架，选择器可能相同，但表名前缀和菜单路径需修改。

### 2.11 `bemp-testcase-generator/config/generator-config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `banks.active_bank` | `hnnxbank` | [NEW_BANK_CODE] |
| `banks.hnnxbank` → 整个节点 | 复制为新银行节点 | 修改name、url_prefix |

### 2.12 `bemp-db-operator/config/db-config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `databases.oracle.environments.*.bankName` | `河南农信` | [NEW_BANK_NAME] |
| `databases.mysql.environments.*.bankName` | `河南农信` | [NEW_BANK_NAME] |
| `databases.mysql.permissionTemplates.*.sql` | 含 `bemp_hnnx` | 替换为 [NEW_MYSQL_DB] |
| `description` | `河南农信开发环境` | [NEW_BANK_NAME]开发环境 |

> Oracle/MySQL 的 username/schema/database 等已使用 `${ENV:*}` 占位符，修改 env-config.json 即可自动生效。

### 2.13 `bemp-sonarqube-mcp/config/scan_config.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `project.key` | `bemp-ext-hnnxbank` | bemp-ext-[NEW_BANK_CODE] |
| `project.name` | `BEMP Henan Rural Credit Personalized Extension` | BEMP [NEW_BANK_NAME] Personalized Extension |
| `project.base_path` | `banks/ext-hnnxbank` | banks/ext-[NEW_BANK_CODE] |
| `modules.hnnxbank-biz-as` → key | `hnnxbank-biz-as` | [NEW_BANK_CODE]-biz-as |
| `modules.hnnxbank-biz-as.path` | `hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank` | [NEW_BANK_CODE]-biz-as/src/main/java/com/hundsun/bemp/[NEW_BANK_CODE] |
| `modules.hnnxbank-biz-api` → key | `hnnxbank-biz-api` | [NEW_BANK_CODE]-biz-api |
| `modules.hnnxbank-biz-api.path` | `hnnxbank-biz-api/src/main/java/com/hundsun/bemp/hnnxbank` | [NEW_BANK_CODE]-biz-api/src/main/java/com/hundsun/bemp/[NEW_BANK_CODE] |
| `modules.hnnxbank-adapter-as` → key | `hnnxbank-adapter-as` | [NEW_BANK_CODE]-adapter-as |
| `modules.hnnxbank-adapter-as.path` | `hnnxbank-adapter-as/src/main/java/com/hundsun/bemp/hnnxbank` | [NEW_BANK_CODE]-adapter-as/src/main/java/com/hundsun/bemp/[NEW_BANK_CODE] |

> modules 的 key 和 path 都需要修改。模块名必须与实际 Maven 项目结构完全一致。

### 2.14 `bemp-jenkins-deploy/config/bemp-deploy.yml`
此文件已全部占位符化，无需修改银行标识。验证以下占位符在 env-config.json 中有正确回退值：
- `sonar.SONAR_PROJECT_KEY` → `${ENV:BANK_SONAR_PROJECT_KEY}`
- `sonar.SONAR_PROJECT_NAME` → `${ENV:BANK_SONAR_PROJECT_NAME}`
- `sonar.SONAR_SOURCES` → `${ENV:BANK_MODULE_PREFIX}served-deploy/...`
- `deploy.SOURCE_WAR` → `${ENV:BANK_MODULE_PREFIX}served-deploy/target/bemp-served`
- `config_replace.CONFIG_REPLACE_WORKSPACE` → `${ENV:BEMP_WORKSPACE_ROOT}/banks/${ENV:BANK_PROJECT_DIR}`

### 2.15 `bemp-jenkins-deploy/assets/sonar-project.properties`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `sonar.projectKey` | `bemp-ext-hnnxbank` | bemp-ext-[NEW_BANK_CODE] |
| `sonar.projectName` | `BEMP Henan Rural Credit Personalized Extension` | BEMP [NEW_BANK_NAME] Personalized Extension |
| `sonar.java.binaries` | `hnnxbank-biz-as/target/classes,hnnxbank-served-deploy/target/classes` | [NEW_BANK_CODE]-biz-as/target/classes,[NEW_BANK_CODE]-served-deploy/target/classes |

### 2.16 `bemp-git-maven-automation/config/config.properties`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `BANKS_BUILD_DIRS` | `ext-hnnxbank` | ext-[NEW_BANK_CODE] |
| 注释示例 | `ext-hnnxbank` | ext-[NEW_BANK_CODE] |

### 2.17 `bemp-advanced-doc-generator/config/modules/default-profile.json`
| 字段路径 | 旧值 | 新值 |
|---------|------|------|
| `codeDir` | `banks/ext-hnnxbank` | banks/ext-[NEW_BANK_CODE] |

### 2.18 `bemp-advanced-doc-generator/assets/详细设计文档模板.json`
| 行号 | 旧值 | 新值 |
|------|------|------|
| 第308行 | `后端代码在banks/ext-hnnxbank目录` | 后端代码在banks/ext-[NEW_BANK_CODE]目录 |

### 2.19 `.trae/mcp.json`（MCP服务端配置）
此文件包含数据库实际连接参数，需手动更新：
- Oracle MCP 配置中的 host、port、serviceName、username、password
- MySQL MCP 配置中的 host、port、database、username、password

> ⚠️ `.trae/mcp.json` 中的连接参数是实际生效的配置，`db-config.json` 中的仅为记录用途。

### 2.20 代码回退默认值修改

| 文件 | 行号 | 旧值 | 新值 |
|------|------|------|------|
| `bemp-sonarqube-mcp/scripts/verify-connection.ps1` | 26 | `"bemp-ext-hnnxbank"` | `"bemp-ext-[NEW_BANK_CODE]"` |
| `bemp-sonarqube-mcp/scripts/verify-connection.ps1` | 48 | `"bemp-ext-hnnxbank"` | `"bemp-ext-[NEW_BANK_CODE]"` |
| `bemp-sonarqube-mcp/scripts/generate-scan-scope.ps1` | 32 | `"banks\ext-hnnxbank"` | `"banks\ext-[NEW_BANK_CODE]"` |
| `bemp-sonarqube-mcp/scripts/generate-scan-scope.ps1` | 52 | `"bemp-ext-hnnxbank"` | `"bemp-ext-[NEW_BANK_CODE]"` |
| `bemp-advanced-doc-generator/lib/requirement-analyzer.js` | 14 | `'banks/ext-hnnxbank'` | `'banks/ext-[NEW_BANK_CODE]'` |
| `bemp-webapp-testing/scripts/common.py` | 215 | `'hnnxbank'` | `'[NEW_BANK_CODE]'` |
| `bemp-webapp-testing/scripts/test_accept_bank_credit.py` | 51 | `'/hnnxbank/'` | `'/[NEW_BANK_CODE]/'` |
| `bemp-git-maven-automation/scripts/config-reader.ps1` | 45 | `"ext-hnnxbank"` | `"ext-[NEW_BANK_CODE]"` |
| `bemp-testcase-generator/scripts/generate_test_cases.py` | 52 | `'hnnxbank'` | `'[NEW_BANK_CODE]'` |
| `bemp-testcase-generator/scripts/generate_test_cases.py` | 55 | `'hnnxbank'` | `'[NEW_BANK_CODE]'` |
| `bemp-webapp-testing/examples/bemp_page_test.py` | 27 | `'hnnxbank'` | `'[NEW_BANK_CODE]'` |
| `bemp-webapp-testing/examples/bemp_login.py` | 27 | `'hnnxbank'` | `'[NEW_BANK_CODE]'` |
| `bemp-webapp-testing/examples/bemp_api_monitor.py` | 24 | `'hnnxbank'` | `'[NEW_BANK_CODE]'` |

> 只修改回退默认值字符串，不修改函数逻辑和注释中的说明文字。

### 2.21 SKILL.md 和参考文档

以下文件中的 hnnxbank/Hnnx 示例值需替换为新银行编码（仅替换示例值，保持文档结构不变）：

| 文件 | 修改内容 |
|------|---------|
| `bemp-personalized-dev/SKILL.md` | 表格中的 hnnxbank/Hnnx 示例值 |
| `bemp-personalized-dev/README.md` | 表格中的 hnnxbank/Hnnx 示例值 |
| `bemp-personalized-dev/references/project-rules.md` | 默认值声明 |
| `bemp-personalized-dev/references/faq.md` | Hnnx 前缀说明 |
| `bemp-personalized-dev/assets/guides/backend-guide.md` | 代码模板中的 Hnnx/hnnx/hnnxbank（约40+处） |
| `bemp-personalized-dev/assets/guides/database-guide.md` | DAO/Mapper 模板中的 Hnnx（约8处） |
| `bemp-webapp-testing/SKILL.md` | 命令示例中的 --bank hnnxbank |
| `bemp-frontend-code-review/SKILL.md` | 银行列表和 hnnxbankIndex.js 示例 |
| `bemp-adapter-dev/SKILL.md` | XML报文模式中的 hnnxbank 示例 |
| `bemp-adapter-dev/references/field-mapping-methodology.md` | hnnxbank 示例 |
| `bemp-adapter-dev/references/code-style.md` | hnnxbank 工具类示例 |
| `bemp-chrome-devtools-test/references/common-pitfalls.md` | hnnxbank 示例 |
| `bemp-automation-startserver/README.md` | 路径和命令示例 |
| `技能清单.md` | 全局示例值 |

> `bemp-personalized-dev/assets/guides/backend-guide.md` 中有大量代码模板使用 Hnnx 前缀，这些是教学示例，替换时需保持代码逻辑一致性（类名、变量名、方法名中的 Hnnx 前缀需统一替换）。

### 2.22 不需要修改的文件

以下文件为历史交付物或教学示例，**不需要修改**：

| 文件/目录 | 原因 |
|-----------|------|
| `bemp-test-common/delivery/hnnxbank-test-report.md` | 历史测试报告 |
| `bemp-test-common/delivery/hnnxbank-detail-design-doc.md` | 历史设计文档 |
| `bemp-test-common/test-cases/adapter/ecif/ecif-customer-merge.md` | 历史测试用例 |
| `bemp-advanced-doc-generator/output/PICE070701-design-template.json` | 历史输出文件 |
| `bemp-frontend-code-review/scripts/examples/ui-patterns.js` | 代码审查教学示例 |
| `bemp-frontend-code-review/scripts/check-*.js` 中的用法注释 | 工具帮助文本中的示例 |
| `bemp-adapter-dev/scripts/generate_spec.py` 中的帮助文本 | CLI帮助中的示例 |
| `bemp-adapter-dev/scripts/explore_codebase.py` 中的帮助文本 | CLI帮助中的示例 |
| `bemp-webapp-testing/scripts/run_test.py` 中的用法注释 | CLI帮助中的示例 |
| `bemp-webapp-testing/scripts/test_accept_bank_credit.py` 中的用法注释 | CLI帮助中的示例 |
| `bemp-db-operator/scripts/oracle-cli-guide.md` | 使用指南示例 |
| `bemp-db-operator/references/safety-guide.md` | 安全指南SQL示例 |
| `bemp-db-operator/references/connection-guide.md` | 连接指南示例 |
| `bemp-db-operator/scripts/execute-mysql-sql.ps1` 中的示例 | CLI帮助中的示例 |
| `bemp-db-operator/scripts/execute-oracle-sql.ps1` 中的示例 | CLI帮助中的示例 |
| `bemp-test-common/test-index.json` | 无银行硬编码 |
| `bemp-jmeter-test/config/*` | 无银行硬编码 |
| `bemp-generate-prd/SKILL.md` | 无银行硬编码 |
| `bemp-markdown-converter/SKILL.md` | 无银行硬编码 |

## 第三步：执行规则

### 3.1 环境变量占位符规则
1. **不修改占位符本身**：配置文件中的 `${ENV:VAR_NAME}` 占位符不需要替换，它们在运行时由 `Resolve-EnvConfig.ps1` 解析
2. **只修改 `environmentDefaults`**：更新 `_shared/env-config.json` 中的 `environmentDefaults` 节点即可改变所有占位符的回退值
3. **优先级**：系统环境变量 > `environmentDefaults` > 硬编码默认值（代码中的回退字符串）
4. **新环境建议**：在系统环境变量中设置关键路径（如 `BEMP_WORKSPACE_ROOT`、`JAVA_HOME`），而非仅依赖 `environmentDefaults`

### 3.2 替换顺序规则
1. **精确匹配优先**：先替换完整的银行代码（如 `hnnxbank`），再替换短代码（如 `hnnx`），避免部分匹配错误
2. **长字符串优先**：先替换 `com.hundsun.bemp.hnnxbank`，再替换 `hnnxbank`，避免 `hnnx` 先替换导致 `hnnxbank` 残留
3. **大小写敏感**：`Hnnx`（PascalCase）和 `hnnx`（lowercase）是不同的，需分别替换

### 3.3 配置字典模式规则
1. **新增而非修改**：在 `banks` 节中新增新银行节点，不删除原有 `hnnxbank` 节点
2. **切换激活**：修改 `currentBank`/`active_bank`/`bank_profile`/`bankName` 指向新银行
3. **模板复制**：从最相似的现有银行节点复制，然后修改银行特定字段

### 3.4 代码回退值规则
1. **保留回退机制**：不删除回退值，只替换为新银行的默认值
2. **保持一致性**：回退值必须与 `env-config.json` 中的 `bank` 节对应字段一致
3. **注释说明**：回退值处已有注释说明来源，保持注释不变

## 第四步：验证清单

### 4.1 JSON 语法验证
对所有修改过的 .json 文件执行：
```
python -c "import json; json.load(open('文件路径','r',encoding='utf-8')); print('PASS')"
```

### 4.2 PowerShell 脚本语法验证
对所有修改过的 .ps1 文件执行：
```
powershell -Command "$errors = $null; [System.Management.Automation.Language.Parser]::ParseFile('文件路径',[ref]$null,[ref]$errors); if ($errors.Count -eq 0) { 'PASS' } else { $errors | ForEach-Object { $_.ToString() } }"
```

### 4.3 配置引用链验证
- [ ] `env-config.json` 的 `bank.code` 与所有模块的 `active_bank`/`currentBank`/`bank_profile` 一致
- [ ] `env-config.json` 的 `BANK_SONAR_PROJECT_KEY` 与 `scan_config.json` 的 `project.key` 一致
- [ ] `env-config.json` 的 `BANK_PROJECT_DIR` 与 `config.properties` 的 `BANKS_BUILD_DIRS` 一致
- [ ] `env-config.json` 的 `BANK_URL_PREFIX` 与 `test_config.json` 的 `url_prefix` 一致
- [ ] `env-config.json` 的 `BANK_MODULE_PREFIX` 与 `bemp-deploy.yml` 的 `SONAR_SOURCES` 路径前缀一致
- [ ] 代码回退值与 `env-config.json` 的 `bank` 节对应字段一致

### 4.4 硬编码残留检查
```
grep -r "hnnxbank\|Hnnx\|hnnx" --include="*.json" --include="*.yml" --include="*.properties" --include="*.ps1" --include="*.py" --include="*.js" .trae/skills/
```
确认无遗漏（排除 output/、reports/、delivery/、examples/、test-cases/ 目录）

### 4.5 功能冒烟测试
- 启动服务：`.\start-bemp-env.ps1 -Service springboot`
- 健康检查：`python scripts/health_check.py --bank [NEW_BANK_CODE]`
- Sonar验证：`.\verify-connection.ps1`

## 第五步：迁移完成检查清单

- [ ] `_shared/env-config.json` 的 bank 节和 environmentDefaults 已更新
- [ ] `.trae/mcp.json` 的数据库连接参数已更新
- [ ] 所有配置字典模式的文件已新增银行节点并切换激活
- [ ] 所有静态配置文件的银行标识已替换
- [ ] 所有代码回退默认值已替换
- [ ] SKILL.md 和参考文档的示例值已更新
- [ ] JSON 语法验证全部通过
- [ ] 配置引用链验证全部通过
- [ ] 硬编码残留检查无遗漏
- [ ] 功能冒烟测试通过
- [ ] 迁移报告已生成
