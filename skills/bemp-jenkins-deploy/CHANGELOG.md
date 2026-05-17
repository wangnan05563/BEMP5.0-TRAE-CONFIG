# 变更日志

所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## [6.1.0] - 2026-05-17

### 优化

- **SKILL.md瘦身**: 从285行精简至119行（-58%），转为"索引路由"角色，移除关键技术要点代码块、目录结构树、冗余代码示例
- **SKILL.md按需读取指引**: 新增信息获取指引表，明确"修改配置→读Jenkinsfile、故障排查→读references/"，减少防御性文件读取
- **删除pipeline-parameters.yml**: v5.0配置内联后此文件已无运行时价值，参数定义直接看Jenkinsfile
- **合并quick-start+usage**: 两个文档80%内容重叠，合并为精简的usage.md（372→138行，-63%）
- **精简config/README.md**: 移除与usage.md重复的参数表和配置表，只保留操作指引（205→56行，-73%）
- **精简bemp-deploy.yml**: 移除冗余注释标题，只保留key:value（105→89行）
- **精简docs/index.md**: 移除重复的问题查找表和emoji装饰（92→56行）
- **更新overview.md/index.md**: 移除对已删除文件的引用，版本号更新为v6.0.0

### Token节省预估

| 指标 | 优化前 | 优化后 | 降幅 |
|------|--------|--------|------|
| SKILL.md固定成本 | ~4000 token/次 | ~1700 token/次 | -57% |
| 文件总数 | 20个 | 18个 | -10% |
| 总行数 | ~3473行 | ~2360行 | -32% |

---

## [6.0.0] - 2026-05-17

### 新增

- **失败自动回滚**: failure post块新增自动回滚机制，查找最新备份zip并解包覆盖部署目录
- **Redis & Zookeeper 并行启动**: 阶段8和9合并为阶段8-9并行块，缩短启动等待时间约50%
- **health-check.ps1 集成**: Redis/ZK/bemp-served/Nginx 服务启动检测统一调用health-check.ps1脚本，替代内联while循环
- **cleanup-backups.ps1 集成**: 备份历史清理统一调用cleanup-backups.ps1脚本，替代内联bat批处理

### 变更

- **凭据外部化**: SONAR_TOKEN从明文改为`credentials('bemp-sonar-token')`引用Jenkins凭据存储
- **BUILD_TIMESTAMP空值保护统一**: 后端采用与前端一致的三重保护（null / 'null' / isEmpty）
- **SCRIPTS_HOME环境变量**: 新增脚本工具目录路径配置
- **Nginx启动检测增强**: 使用health-check.ps1 nginx模式替代单次tasklist检查，增加重试等待逻辑

### 优化

- Redis/ZK/bemp-served/Nginx内联监控循环合计减少约50行Groovy代码
- 备份清理内联bat批处理合计减少约30行代码
- 服务启动可观测性提升：health-check.ps1提供统一日志格式和TCP连接检测

---

## [5.0.0] - 2026-04-26

### 变更

- **配置内联化**: 所有配置直接定义在Jenkinsfile的environment块中，不再从外部YAML文件加载
- **bemp-deploy.yml**: 改为纯参考文档，不参与运行时加载
- **参数名统一**:
  - `SKIP_TOMCAT` → `SKIP_BEMP_SERVED`（与实际脚本对齐）
  - `SKIP_CHECKOUT` → `SKIP_CODE_PULL`（与实际脚本对齐）
- **阶段编号修正**: 后端流水线从"10个阶段"修正为实际"8个阶段"（1-6, 8-10，阶段7已移除）
- **bemp-served启动方式**: 统一为 `start /b java` + 显式设置JAVA_HOME（与实际脚本对齐）
- **备份方式**: 后端使用zip压缩备份（与实际脚本对齐），前端使用zip压缩备份
- **配置文件引用**: 移除不存在的env-config.yml和pipeline-config.yml引用

### 修正

- SKILL.md: 阶段编号、参数名、配置文件引用与实际脚本对齐
- config/pipeline-parameters.yml: 参数名与Jenkinsfile对齐
- config/bemp-deploy.yml: 补充CONFIG_REPLACE等缺失配置项
- config/README.md: 配置文件引用与实际目录对齐
- docs/index.md: 目录结构与实际对齐
- docs/getting-started/quick-start.md: 阶段编号、参数名对齐
- docs/user-guide/usage.md: 配置方式改为environment块直接编辑
- docs/references/service-startup-templates.md: bemp-served启动方式与实际脚本对齐
- docs/references/error-handling-rollback.md: 备份方式与实际脚本对齐
- docs/references/jenkins-pipeline-syntax.md: 参数名与实际脚本对齐
- docs/references/jenkins-mcp-guide.md: 参数名与实际脚本对齐
- docs/troubleshooting/faq.md: 参数名与实际脚本对齐
- docs/troubleshooting/known-issues.md: 新增v5.0.0修复记录
- docs/troubleshooting/index.md: 阶段名称与实际脚本对齐
- scripts/cleanup-backups.ps1: 支持目录备份和文件备份两种模式

---

## [4.0.0] - 2026-04-26

### 变更

- 目录结构重组：config/、assets/、scripts/、docs/ 四级结构
- 文档整合：FAQ精简分类
- 配置文件合并为bemp-deploy.yml

---

## [3.0.0] - 2026-04-25

### 变更

- 前端参数提取为parameters块
- 配置校验增强

---

## [2.0.0] - 2026-04-24

### 变更

- 配置外部化为YAML文件
- MD5校验优化（使用正则提取）

---

## [1.0.0] - 2026-04-23

### 新增

- 初始版本
- 后端8阶段Pipeline脚本
- 前端6阶段Pipeline脚本
- SonarQube代码质量门禁
- 服务自动启动（Redis/Zookeeper/bemp-served）
- Windows UTF-8编码支持
- Jenkins MCP接口集成
