# BEMP Skill 全套迁移提示词

## 使用说明
将以下内容完整复制给 AI，替换 `[ ]` 中的占位符后执行。此提示词适用于在新电脑环境下安装整套 BEMP Skill 并迁移至新银行场景。

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

## 2. 数据库映射
| 配置项 | 旧值 | 新值 |
|--------|------|------|
| Oracle用户名 | bemp_hnnx | [NEW_ORACLE_USER] |
| Oracle Schema | BEMP_HNNX | [NEW_ORACLE_SCHEMA] |
| MySQL数据库名 | bemp_hnnx | [NEW_MYSQL_DB] |
| Oracle表前缀 | HNNX_ | [NEW_TABLE_PREFIX]_ |

## 3. 环境路径映射
| 配置项 | 旧值 | 新值 |
|--------|------|------|
| 工作区根目录 | d:\code\QJ\BEMP5.0DEV | [NEW_WORKSPACE_ROOT] |
| 银行工程路径 | d:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank | [NEW_BANKS_PROJECT_PATH] |
| 前端工程路径 | d:\code\QJ\BEMP5.0DEV\frontend | [NEW_FRONTEND_PATH] |
| 部署目录 | D:/code/QJ/bempDeploy | [NEW_DEPLOY_DIR] |
| Trae路径 | F:\Program Files\Trae CN\Trae CN.exe | [NEW_TRAE_PATH] |
| Java Home | D:\code\Java\jdk1.8.0_341 | [NEW_JAVA_HOME] |
| Node路径 | D:\code\nodejs14\node.exe | [NEW_NODE_PATH] |
| Maven路径 | D:\code\apache-maven-3.6.3\bin\mvn.cmd | [NEW_MAVEN_PATH] |
| Maven Settings | D:/code/apache-maven-3.6.3/conf/settings-Artifactory.xml | [NEW_MAVEN_SETTINGS] |
| Redis路径 | D:\code\Redis-x64-5.0.14.1\redis-server.exe | [NEW_REDIS_PATH] |
| ZooKeeper路径 | D:\code\apache-zookeeper-3.8.3-bin\bin\zkServer.cmd | [NEW_ZK_PATH] |
| JMeter路径 | D:\code\Jmeter\apache-jmeter-5.6.3\bin\jmeter.bat | [NEW_JMETER_PATH] |
| Sonar安装路径 | D:\code\sonar\sonarqube-26.1.0.118079 | [NEW_SONAR_SERVER_PATH] |
| Sonar Scanner路径 | D:\code\sonar\sonar-scanner-8.0.1.36819 | [NEW_SONAR_SCANNER_PATH] |
| Node.js安装路径 | D:/code/nodejs14 | [NEW_NODE_HOME] |
| Nginx路径 | D:/code/nginx-1.12.2 | [NEW_NGINX_HOME] |
| JDK for Sonar | D:/code/Java/jdk-25.0.1 | [NEW_JAVA_HOME_SONAR] |
| Git仓库URL | https://gitlab.hundsun.com/bemp/banks.git | [NEW_GIT_REPO_URL] |
| Git凭证ID | gitlab-credentials | [NEW_GIT_CREDENTIALS_ID] |
| Sonar项目Key | bemp-ext-hnnxbank | bemp-ext-[NEW_BANK_CODE] |
| Sonar项目名称 | BEMP Ext HNNXBank | BEMP Ext [NEW_BANK_NAME] |
| 测试账号文件 | test-data/test-accounts.json | [SAME_OR_NEW_PATH] |

## 4. 测试账号映射
| 角色 | 旧账号/密码 | 新账号/密码 |
|------|-------------|-------------|
| 普通柜员 | wangnan02 / abc@123 | [NEW_TELLER_USER] / [NEW_TELLER_PWD] |
| 法人管理员 | mllzs01 / 888888 | [NEW_ADMIN_USER] / [NEW_ADMIN_PWD] |
| 机构管理员 | wangnan01 / abc@123 | [NEW_BRANCH_ADMIN] / [NEW_BRANCH_ADMIN_PWD] |
| 分行柜员 | sjl03 / 888888 | [NEW_BRANCH_TELLER] / [NEW_BRANCH_TELLER_PWD] |

## 5. 报文风格配置（根据新银行实际情况选择）
| 配置项 | 可选值 |
|--------|--------|
| 报文风格 | XML / JSON_BASE / JSON_DIRECT |
| 基类 | AbstractMessageApplyResponseConverter / [银行自定义基类] |
| 拦截器 | MqMessageInterceptor / [银行自定义拦截器] |
| 服务代码模式 | EBBS.{tx_code}.01 / {PICE_CODE} |

---

# 执行任务清单

## 第一步：识别所有需要修改的文件
请先扫描 `.trae/skills/` 目录，列出所有包含旧银行标识的文件。重点检查以下目录：
- `bemp-adapter-dev/config/bank-config.json`
- `bemp-backend-code-review/config/bank-config.json`
- `bemp-webapp-testing/config/test_config.json`
- `bemp-webapp-testing/test-data/test-accounts.json`
- `bemp-db-operator/config/db-config.json`
- `bemp-testcase-generator/config/generator-config.json`
- `bemp-automation-startserver/config/config.json`
- `bemp-jenkins-deploy/config/bemp-deploy.yml`
- `bemp-jmeter-test/config/jmeter-config.yml`
- `bemp-sonarqube-mcp/config/scan_config.json`
- `bemp-chrome-devtools-test/config/bemptest-config.json`
- `bemp-advanced-doc-generator/config/modules/default-profile.json`
- `bemp-git-maven-automation/config/config.properties`
- 所有 SKILL.md 文件中包含旧银行名称的引用
- `bemp-personalized-dev/` 下的参考文档和模板

## 第二步：按优先级分组执行修改

### P0 - 核心配置文件（必须修改）
1. **银行配置**：更新所有 `bank-config.json` 中的银行代码、名称、包名、类前缀
2. **测试配置**：更新 `test_config.json` 中的 active_bank、url_prefix、login 账号、pages 路径
3. **数据库配置**：更新 `db-config.json` 中的用户名、schema、bankName
4. **Sonar配置**：更新 `scan_config.json` 中的 project key、name、module paths

### P1 - 环境配置文件（必须修改）
1. **启动配置**：更新 `config.json` 中的 workspaceRoot、banksProjectPath、工具路径
2. **Jenkins配置**：更新 `bemp-deploy.yml` 中的 GIT_REPO_URL、SONAR_PROJECT_KEY、路径
3. **测试生成配置**：更新 `generator-config.json` 中的 active_bank、url_prefix
4. **Chrome测试配置**：更新 `bemptest-config.json` 中的 bank_profile、api_prefix、accounts

### P2 - 测试数据与文档（必须修改）
1. **测试账号**：更新 `test-accounts.json` 中的用户名密码
2. **默认配置**：更新 `default-profile.json` 中的 codeDir
3. **SKILL.md**：更新所有 SKILL.md 文件中的银行引用

### P3 - 参考文档与模板（按需修改）
1. **参考文档**：更新各 skill 的 references/ 目录中包含旧银行名的文档
2. **输出文件**：清理 output/ 目录下的历史输出文件（或删除包含旧银行标识的文件名）
3. **报告文件**：清理 reports/ 目录下的历史报告

## 第三步：执行规则

1. **精确匹配优先**：先替换完整的银行代码（如 `hnnxbank`），再替换短代码（如 `hnnx`），避免部分匹配错误
2. **保持大小写**：类名前缀保持首字母大写，包名保持小写，URL 保持原格式
3. **不修改通用配置**：不要修改与银行无关的通用配置（如端口号、超时时间、JVM参数等）
4. **保留示例配置**：`bank-config.json` 中已有的其他银行配置（如 shaoxbank、yibbank、qinnbank）保持不变
5. **路径分隔符**：Windows 路径使用 `\\` 或 `/` 均可，保持原文件的风格
6. **YAML 格式**：修改 `bemp-deploy.yml` 时保持 YAML 缩进格式
7. **JSON 格式**：确保修改后的 JSON 文件语法正确
8. **批量替换**：对于 SKILL.md 等文档中的文字引用，使用全局替换

## 第四步：验证

1. 所有 JSON/YAML 配置文件修改后验证格式正确性
2. 确认不存在遗漏的旧银行标识残留
3. 确认新增银行的所有配置项已完整填写
4. 生成迁移报告，列出所有修改的文件和变更内容

## 第五步：输出迁移报告

请生成一份迁移报告，包含：
- 修改的文件总数
- 每个文件的变更摘要
- 需要手动确认的配置项（如测试账号、数据库密码等）
- 迁移完成后的检查清单

---

# 注意事项

1. **不要删除**任何 skill 目录结构，仅修改内容
2. **不要修改**通用业务逻辑配置（如子系统关键词、错误码、优先级定义等）
3. **保留多银行配置**：`bank-config.json` 等文件中的多银行配置模板应保留
4. **敏感信息**：数据库密码等敏感信息建议在新环境中通过 MCP 配置文件管理，Skill 配置文件中仅作为记录用途
5. **Git 仓库**：确保新 Git 仓库 URL 和凭证已配置正确
6. **工具路径**：确保所有工具路径（Java、Node、Maven、Redis、ZooKeeper 等）在新电脑上存在且可访问
7. **测试账号**：迁移完成后务必联系新银行系统管理员获取真实的测试账号密码

---

# 迁移完成检查清单

- [ ] 所有 JSON/YAML 配置文件格式验证通过
- [ ] 无旧银行标识残留
- [ ] 新银行代码、名称、包名、类前缀已全局替换
- [ ] 数据库连接信息已更新
- [ ] 测试账号已配置（或标记为待补充）
- [ ] 工具路径已更新且验证存在
- [ ] Git 仓库 URL 已更新
- [ ] Sonar 项目配置已更新
- [ ] Jenkins 部署配置已更新
- [ ] SKILL.md 文档中的银行引用已更新
- [ ] 历史输出/报告文件已清理或归档
- [ ] 迁移报告已生成