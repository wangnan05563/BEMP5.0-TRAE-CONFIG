# bemp-sonarqube-mcp 反向构建提示词

## 核心功能
BEMP项目SonarQube代码质量扫描与问题修复技能。基于SonarQube MCP对BEMP新增代码进行质量门禁检查、问题扫描、代码片段分析、问题分类与修复建议。支持服务器自动检测与启动、增量扫描、修复闭环验证。

## 关键实现逻辑
- 服务器先行：所有扫描前必须确保SonarQube服务已启动(端口9000)，未启动自动执行start-sonarqube.ps1
- 7步执行流程：服务器检测启动→连接验证项目确认→功能模块代码定位→质量门禁检查→问题扫描(按文件级别)→问题分类报告→修复建议(可选)→修复验证
- 问题扫描：search_sonar_issues_in_projects按严重级别(BLOCKER>HIGH>MEDIUM>LOW>INFO)，analyze_code_snippet逐文件增量分析
- 问题分类：SECURITY/RELIABILITY/MAINTAINABILITY三大类
- BEMP上下文感知：@CloudComponent/@CloudReference等框架注解可能触发误报，需结合上下文判断

## 输入输出参数
- 输入：config/scan_config.json(项目配置/服务器配置/模块路径映射)、功能模块描述
- 输出：质量门禁报告(覆盖率/重复率/新增问题数)、问题扫描报告(严重级别/规则/文件/行号/分类)、修复建议(方案+代码示例)

## 主要业务流程
1. 服务器检测：读取scan_config.json→检测端口9000→未启动则执行start-sonarqube.ps1→轮询健康检查
2. 连接验证：search_my_sonarqube_projects确认MCP可用和项目存在
3. 代码定位：SearchCodebase按功能模块定位Java文件，按Controller/Service/DAO/DTO/Util/Aspect分类
4. 质量门禁：get_project_quality_gate_status检查覆盖率≥80%/重复率≤3%/新增问题=0
5. 问题扫描：按严重级别扫描→逐文件增量分析→记录到分类表
6. 分类报告+修复建议+修复验证闭环

## 技术特性
- 自动启动脚本：start-sonarqube.ps1设置JAVA_HOME/PATH，启动StartSonar.bat，轮询/api/system/status
- 增量扫描：只扫描新增/修改文件，不重复扫描全量
- 不自动变更问题状态：标记falsepositive/accept前必须用户确认
- 配置集中：scan_config.json管理所有路径和参数
