---
name: bemp-sonarqube-mcp
description: "BEMP项目SonarQube代码质量扫描与问题修复技能。基于SonarQube MCP对BEMP新增代码进行质量门禁检查、问题扫描、代码片段分析、问题分类与修复建议。触发场景：代码Review后扫描、新功能开发完成扫描、提交前质量检查、质量门禁验证、SonarQube问题修复。"
---

# BEMP SonarQube MCP 代码质量扫描技能

基于 SonarQube MCP Server，对 BEMP 项目新增代码执行标准化质量扫描、问题定位与修复指导。

## Skill 职责

1. **服务器检测与启动**：自动检测本地 SonarQube 服务状态，未启动时自动启动
2. **连接验证**：确认 SonarQube MCP 可用，项目可访问
3. **代码定位**：根据功能模块自动定位新增代码文件
4. **质量门禁检查**：验证项目是否通过质量门禁
5. **问题扫描**：按严重级别扫描新增代码的 SonarQube 问题
6. **代码片段分析**：对核心实现文件进行逐文件分析
7. **问题分类与报告**：按安全/可靠性/可维护性分类输出报告
8. **修复建议**：针对每个问题提供修复方案和代码示例
9. **修复验证**：修复后重新扫描确认问题已解决

## 触发场景

- 用户完成新功能开发后要求代码质量检查
- 代码 Review 环节需要 SonarQube 扫描结果
- 提交代码前需要质量门禁验证
- 用户提到 "sonar"、"代码质量"、"质量门禁"、"代码扫描"、"问题修复"
- BEMP 工作流中代码 Review 与修复阶段

## 执行步骤

### 第零步：SonarQube 服务器检测与启动（前置条件）

> **必须在所有扫描步骤之前执行**。SonarQube 服务未运行时，MCP 工具无法连接服务器。

```
1. 读取 config/scan_config.json 获取 sonarqube_server 配置
2. 检测 SonarQube 服务端口（默认9000）是否在监听
   - 调用 HTTP GET {host}/api/system/status 验证服务健康
3. 如果服务已运行且健康 → 跳过启动，继续下一步
4. 如果服务未运行 → 执行自动启动流程：
   a. 在 IDE 终端中执行 scripts/start-sonarqube.ps1
   b. 脚本自动设置 JAVA_HOME 和 PATH
   c. 脚本启动 StartSonar.bat 并等待服务就绪
   d. 轮询健康检查接口，最长等待 startup_timeout_seconds（默认120秒）
5. 启动成功 → 继续下一步
6. 启动失败 → 输出排查建议，终止流程
```

**自动启动命令（Agent 执行）**：
```powershell
cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-sonarqube-mcp\scripts
.\start-sonarqube.ps1
```

**仅检测状态（不启动）**：
```powershell
.\start-sonarqube.ps1 -StatusOnly
```

**强制重启**：
```powershell
.\start-sonarqube.ps1 -ForceRestart
```

**可配置项**（config/scan_config.json → sonarqube_server）：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| java_home | D:\code\Java\jdk-25.0.1 | SonarQube 运行所需的 JDK 路径 |
| install_path | D:\code\sonar\sonarqube-26.1.0.118079 | SonarQube 安装目录 |
| start_script | bin\windows-x86-64\StartSonar.bat | 启动脚本相对路径 |
| port | 9000 | SonarQube 服务端口 |
| host | http://localhost:9000 | SonarQube 服务地址 |
| startup_timeout_seconds | 120 | 启动超时时间 |
| health_check_interval_seconds | 5 | 健康检查轮询间隔 |

### 第一步：连接验证与项目确认

```
1. 调用 search_my_sonarqube_projects 确认 MCP 可用
2. 确认目标项目存在（默认：bemp-ext-hnnxbank）
3. 读取 config/scan_config.json 获取项目配置
```

### 第二步：功能模块代码定位

```
1. 根据用户描述的功能模块，使用 SearchCodebase 定位相关 Java 文件
2. 按层级分类：Controller / Service / DAO / DTO / Util / Aspect
3. 输出文件清单供用户确认扫描范围
```

### 第三步：质量门禁检查

```
1. 调用 get_project_quality_gate_status 检查项目整体门禁状态
2. 解析门禁条件：新代码覆盖率、重复率、新增问题数
3. 输出门禁通过/未通过状态及具体差距
```

### 第四步：问题扫描（按文件级别）

```
1. 调用 search_sonar_issues_in_projects 按严重级别扫描
   - 优先扫描 BLOCKER / HIGH
   - 其次扫描 MEDIUM / LOW / INFO
2. 对每个核心文件调用 analyze_code_snippet 进行增量分析
3. 记录问题到分类表
```

### 第五步：问题分类与报告输出

```
1. 按类别分组：SECURITY / RELIABILITY / MAINTAINABILITY
2. 按严重级别排序：BLOCKER > HIGH > MEDIUM > LOW > INFO
3. 使用 assets/report-template.md 输出标准化报告
4. 标注 BEMP 项目特有的问题模式
```

### 第六步：修复建议（可选）

```
1. 对每个问题调用 show_rule 获取规则详情
2. 结合 BEMP 项目规范给出修复方案
3. 提供修复代码示例
4. 等待用户确认后执行修复
```

### 第七步：修复验证

```
1. 修复后重新调用 analyze_code_snippet 验证
2. 确认问题状态已变更
3. 输出修复前后对比报告
```

## 输出标准

### 质量门禁报告格式

| 指标 | 当前值 | 阈值 | 状态 |
|------|--------|------|------|
| 新代码覆盖率 | X% | ≥80% | ✅/❌ |
| 新代码重复率 | X% | ≤3% | ✅/❌ |
| 新增问题数 | X | 0 | ✅/❌ |

### 问题扫描报告格式

| 严重级别 | 规则 | 文件 | 行号 | 问题描述 | 分类 |
|----------|------|------|------|----------|------|
| BLOCKER | java:S2068 | XxxConfig.java | 45 | 硬编码密码 | SECURITY |

### 修复建议格式

- **问题**：[规则ID] 问题描述
- **严重级别**：BLOCKER/HIGH/MEDIUM/LOW
- **修复方案**：具体修复步骤
- **修复代码**：代码示例
- **验证方法**：如何确认修复有效

## 关键设计原则

1. **服务器先行**：所有扫描操作前必须确保 SonarQube 服务已启动，否则自动启动
2. **先定位后扫描**：先确认扫描范围再执行扫描，避免无效查询
3. **按严重级别优先**：BLOCKER > HIGH > MEDIUM > LOW，优先修复高危问题
4. **BEMP 上下文感知**：结合项目规范（如 AOP 切面、CloudReference 注解等）判断问题是否为误报
5. **增量扫描**：只扫描新增/修改的文件，不重复扫描全量代码
6. **修复闭环**：修复后必须重新验证，确保问题真正解决
7. **不自动变更问题状态**：标记 falsepositive/accept 前必须用户确认
8. **项目规范优先**：BEMP 框架的注解和模式（如 @CloudComponent、@CloudReference）可能触发 SonarQube 误报，需结合上下文判断
9. **配置集中管理**：所有路径和参数集中在 config/scan_config.json，修改配置无需改代码

## 参考文档

- `references/scan-workflow.md` — 完整扫描工作流程与操作手册
- `references/issue-classification.md` — BEMP 项目常见问题分类与判断标准
- `references/bemp-rule-overrides.md` — BEMP 项目规则豁免与误报处理
- `references/mcp-tool-guide.md` — SonarQube MCP 工具选择与参数映射

## 配置文件

- `config/scan_config.json` — 项目配置、SonarQube 服务器配置、模块路径映射、扫描参数

## 自动化脚本

- `scripts/start-sonarqube.ps1` — SonarQube 服务器检测与启动
- `scripts/verify-connection.ps1` — MCP 连接验证
- `scripts/generate-scan-scope.ps1` — 扫描范围自动生成
