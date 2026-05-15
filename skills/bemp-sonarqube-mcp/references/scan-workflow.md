# BEMP SonarQube 扫描工作流程

## 完整操作手册

### 0. SonarQube 服务器检测与启动（前置条件）

**目标**：确保本地 SonarQube 服务已启动，这是所有后续扫描操作的前置条件

**操作步骤**：

#### 0.1 读取服务器配置

```
读取 config/scan_config.json → sonarqube_server 节点
获取：java_home、install_path、start_script、port、host、startup_timeout_seconds
```

#### 0.2 检测服务状态

**方式一：Agent 自动检测（推荐）**

Agent 在执行扫描前，先通过端口检测判断服务是否运行：

```
1. 在 IDE 终端中执行：
   cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-sonarqube-mcp\scripts
   .\start-sonarqube.ps1 -StatusOnly

2. 退出码 0 = 服务已运行且健康
   退出码 1 = 服务未运行或不健康
```

**方式二：手动检测**

```powershell
# 端口检测
Test-NetConnection -ComputerName localhost -Port 9000

# 健康检查
Invoke-WebRequest -Uri "http://localhost:9000/api/system/status" -UseBasicParsing
```

#### 0.3 自动启动流程

如果服务未运行，Agent 执行自动启动：

```
1. 在 IDE 终端中执行（blocking=false，后台运行）：
   cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-sonarqube-mcp\scripts
   .\start-sonarqube.ps1

2. 脚本内部执行流程：
   a. 设置 JAVA_HOME = config中的java_home
   b. 设置 PATH = %JAVA_HOME%\bin;%PATH%
   c. 启动 StartSonar.bat（在新窗口中）
   d. 轮询健康检查接口，最长等待 startup_timeout_seconds
   e. 返回启动结果
```

**启动脚本核心逻辑**（参考 bemp-automation-startserver）：
- 端口检测：优先 `Get-NetTCPConnection`，回退 `netstat`
- 进程验证：检测端口占用的进程名是否为 java
- 健康检查：HTTP GET `/api/system/status`，判断 `status == "UP"`
- 超时机制：默认 120 秒，每 5 秒检查一次
- 进度显示：实时显示启动进度百分比

#### 0.4 启动验证标准

| 检查项 | 预期结果 | 判定 |
|--------|----------|------|
| 端口 9000 监听 | LISTENING | ✅/❌ |
| 健康检查接口 | status: "UP" | ✅/❌ |
| MCP 工具可用 | search_my_sonarqube_projects 返回正常 | ✅/❌ |

#### 0.5 启动失败排查

| 现象 | 可能原因 | 排查方法 |
|------|----------|----------|
| 端口未监听 | Java 未安装或路径错误 | 检查 `java_home` 路径是否存在 |
| 端口被占用 | 其他程序占用 9000 端口 | `netstat -ano | findstr 9000` |
| 健康检查失败 | SonarQube 正在启动中 | 等待更长时间或查看日志 |
| 启动超时 | 内存不足或配置错误 | 查看 `install_path/logs/sonar.log` |

**日志路径**：`{install_path}/logs/sonar.log`

#### 0.6 强制重启

当 SonarQube 状态异常需要重启时：

```powershell
.\start-sonarqube.ps1 -ForceRestart
```

脚本会先停止现有进程，再重新启动。

---

### 1. 连接验证

**目标**：确认 SonarQube MCP 可用，目标项目可访问

**操作**：
```
调用 search_my_sonarqube_projects(q="BEMP")
```

**验证标准**：
- 返回项目列表中包含 `bemp-ext-hnnxbank`
- 无连接超时或认证错误

**异常处理**：
- 连接失败：检查 MCP 配置和环境变量（SONARQUBE_TOKEN、SONARQUBE_URL）
- 项目不存在：确认项目 Key 是否正确

---

### 2. 功能模块代码定位

**目标**：根据用户描述的功能模块，定位需要扫描的 Java 文件

**操作**：
```
调用 SearchCodebase(information_request="功能关键词", target_directories=["banks/ext-hnnxbank"])
```

**文件分类标准**：

| 层级 | 路径模式 | 扫描优先级 |
|------|----------|-----------|
| Service实现 | `**/service/impl/*ServiceImpl.java` | 高 |
| Controller | `**/controller/*Controller.java` | 高 |
| Util | `**/utils/*Util.java` | 中 |
| Aspect | `**/aspect/*Aspect.java` | 中 |
| DAO Entity | `**/dao/entity/*.java` | 低（通常自动生成） |
| DTO | `**/dto/*Dto.java` | 低（数据类） |
| Service接口 | `**/service/*Service.java` | 低（接口定义） |
| DAO接口 | `**/dao/*Dao.java` | 低（接口定义） |

**输出**：文件清单表格，包含文件路径、行数、层级

---

### 3. 质量门禁检查

**目标**：验证项目整体是否通过质量门禁

**操作**：
```
调用 get_project_quality_gate_status(projectKey="bemp-ext-hnnxbank")
```

**门禁条件解读**：

| 条件指标 | 含义 | 阈值 | 判定逻辑 |
|----------|------|------|----------|
| new_coverage | 新代码测试覆盖率 | ≥80% | 低于阈值失败 |
| new_duplicated_lines_density | 新代码重复率 | ≤3% | 高于阈值失败 |
| new_violations | 新增问题数 | 0 | 大于阈值失败 |

**输出格式**：

```
## 质量门禁状态：✅ 通过 / ❌ 未通过

| 指标 | 当前值 | 阈值 | 状态 |
|------|--------|------|------|
| 新代码覆盖率 | 0.0% | ≥80% | ❌ |
| 新代码重复率 | 18.6% | ≤3% | ❌ |
| 新增问题数 | 48 | 0 | ❌ |
```

---

### 4. 问题扫描

**目标**：扫描新增代码中的 SonarQube 问题

**操作步骤**：

#### 4.1 项目级问题搜索
```
调用 search_sonar_issues_in_projects(
  projects=["bemp-ext-hnnxbank"],
  severities=["BLOCKER", "HIGH"],
  issueStatuses=["OPEN"],
  ps=100
)
```

#### 4.2 文件级代码片段分析
```
对每个核心文件：
1. 读取文件内容
2. 调用 analyze_code_snippet(
     projectKey="bemp-ext-hnnxbank",
     fileContent=<文件内容>,
     language="java"
   )
```

**注意**：`analyze_code_snippet` 的 `scope` 参数只接受 `MAIN` 或 `TEST`，不能有空格或换行

#### 4.3 分页处理
```
如果返回结果中 paging.hasNextPage == true：
  继续调用 search_sonar_issues_in_projects(p=下一页码)
```

---

### 5. 问题分类

**目标**：将扫描到的问题按类别和严重级别分类

**分类维度**：

#### 按质量维度
- **SECURITY**（安全）：密码泄露、SQL注入、XSS等
- **RELIABILITY**（可靠性）：空指针、资源泄露、并发问题等
- **MAINTAINABILITY**（可维护性）：代码重复、认知复杂度、命名规范等

#### 按严重级别
- **BLOCKER**：必须立即修复，阻塞发布
- **HIGH/CRITICAL**：当前迭代内修复
- **MEDIUM/MAJOR**：排入近期计划
- **LOW/MINOR**：日常维护时修复
- **INFO**：仅记录

#### 按BEMP项目上下文
- **真实问题**：需要修复
- **框架误报**：BEMP框架注解/模式触发的误报（如 @CloudComponent 被识别为未使用组件）
- **可接受债务**：业务需要但不符合规范的模式

---

### 6. 报告输出

**目标**：输出标准化扫描报告

**使用模板**：`assets/report-template.md`

**报告结构**：
1. 扫描概览（项目、扫描范围、时间）
2. 质量门禁状态
3. 问题统计（按类别/级别汇总）
4. 问题详情列表
5. 修复建议
6. 代码亮点（零问题文件值得表扬）

---

### 7. 修复与验证

**目标**：修复问题并验证修复效果

**修复流程**：
1. 对每个问题调用 `show_rule(key=规则ID)` 获取修复指导
2. 结合 BEMP 项目规范给出修复方案
3. 用户确认后执行代码修改
4. 修改后重新调用 `analyze_code_snippet` 验证

**验证标准**：
- 修复后同一文件不再报告相同问题
- 不引入新的问题
- 代码功能不受影响

---

### 8. 问题状态管理

**目标**：对确认的误报或可接受债务进行状态变更

**操作**：
```
调用 change_sonar_issue_status(
  key=问题ID,
  status="falsepositive" | "accept",
  comment="变更原因说明"
)
```

**原则**：
- 必须用户明确确认后才能变更状态
- 必须填写 comment 说明原因
- 安全类问题（SECURITY）不得标记为 falsepositive，除非经过团队评审
