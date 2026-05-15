# SonarQube MCP 工具选择与参数映射指南

## 工具选择决策树

```
用户想要...
├── 验证 MCP 连接是否可用
│   └── search_my_sonarqube_projects
│
├── 检查项目是否通过质量门禁
│   └── get_project_quality_gate_status (projectKey)
│
├── 扫描项目中的问题
│   ├── 按严重级别扫描
│   │   └── search_sonar_issues_in_projects (projects + severities)
│   ├── 按文件扫描
│   │   └── search_sonar_issues_in_projects (projects + files)
│   └── 按PR扫描
│       └── search_sonar_issues_in_projects (projects + pullRequestId)
│
├── 分析代码片段
│   └── analyze_code_snippet (projectKey + fileContent + language)
│
├── 查看规则详情
│   └── show_rule (key)
│
├── 获取项目度量
│   └── get_component_measures (projectKey + metricKeys)
│
├── 变更问题状态
│   └── change_sonar_issue_status (key + status + comment)
│
└── 查看质量门禁列表
    └── list_quality_gates
```

---

## BEMP 项目专用参数映射

### 项目 Key

| 项目 | Key | 用途 |
|------|-----|------|
| BEMP主项目 | bemp5.0 | 基础框架 |
| 河南农信个性化 | bemp-ext-hnnxbank | 个性化扩展 |

### 常用度量指标组合

**项目健康度**：
```json
["coverage", "bugs", "vulnerabilities", "code_smells", "ncloc", "duplicated_lines_density"]
```

**新代码质量**：
```json
["new_coverage", "new_bugs", "new_vulnerabilities", "new_duplicated_lines_density", "new_violations"]
```

**复杂度评估**：
```json
["complexity", "cognitive_complexity", "ncloc", "functions"]
```

### 严重级别过滤值

**API参数只接受以下值**：
```json
["BLOCKER", "HIGH", "MEDIUM", "LOW", "INFO"]
```

> 注意：CRITICAL、MAJOR、MINOR 是旧版标签，不能用于 API 参数过滤。
> CRITICAL → 使用 HIGH，MAJOR → 使用 MEDIUM，MINOR → 使用 LOW

---

## analyze_code_snippet 注意事项

### scope 参数

只接受以下两个值（注意不能有空格或换行）：
- `MAIN` — 主代码
- `TEST` — 测试代码

### language 参数

BEMP 项目使用：
- `java` — 后端代码

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| Invalid scope | scope 值包含空格或换行 | 确保值为纯 `MAIN` 或 `TEST` |
| Insufficient privileges | Token 权限不足 | 检查 SONARQUBE_TOKEN 权限 |
| Project not found | 项目 Key 错误 | 确认项目 Key 正确 |

---

## 搜索问题参数速查

### 按文件过滤

```json
{
  "projects": ["bemp-ext-hnnxbank"],
  "files": ["bemp-ext-hnnxbank:hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/service/impl/HnnxAcceptBankCreditServiceImpl.java"],
  "issueStatuses": ["OPEN"],
  "severities": ["BLOCKER", "HIGH", "MEDIUM"]
}
```

### 按规则类型过滤

```json
{
  "projects": ["bemp-ext-hnnxbank"],
  "types": ["VULNERABILITY", "BUG"],
  "issueStatuses": ["OPEN"]
}
```

### 分页查询

```json
{
  "projects": ["bemp-ext-hnnxbank"],
  "p": 1,
  "ps": 100
}
```

检查 `paging.hasNextPage` 判断是否需要继续翻页。

---

## 工具调用顺序模式

### 模式1：功能模块扫描（最常用）

```
0. 执行 scripts/start-sonarqube.ps1 → 确保服务器已启动
1. search_my_sonarqube_projects → 验证连接
2. SearchCodebase → 定位文件
3. get_project_quality_gate_status → 检查门禁
4. search_sonar_issues_in_projects → 扫描问题
5. analyze_code_snippet → 逐文件分析
6. show_rule → 查看规则详情（可选）
7. 输出报告
```

### 模式2：提交前快速检查

```
0. 执行 scripts/start-sonarqube.ps1 -StatusOnly → 检查服务器状态
1. get_project_quality_gate_status → 检查门禁
2. search_sonar_issues_in_projects(severities=["BLOCKER","HIGH"]) → 扫描高危问题
3. 输出结果
```

### 模式3：问题修复验证

```
0. 执行 scripts/start-sonarqube.ps1 -StatusOnly → 检查服务器状态
1. analyze_code_snippet → 分析修复后的代码
2. search_sonar_issues_in_projects → 确认问题已关闭
3. get_project_quality_gate_status → 验证门禁改善
4. 输出对比报告
```

### 模式4：安全审计

```
0. 执行 scripts/start-sonarqube.ps1 → 确保服务器已启动
1. search_sonar_issues_in_projects(types=["VULNERABILITY"]) → 扫描安全漏洞
2. search_security_hotspots → 检查安全热点
3. show_rule → 获取每个漏洞的详情
4. 输出安全报告
```
