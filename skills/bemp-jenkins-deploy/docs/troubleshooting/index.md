# 故障排查导航

## 快速定位问题

### 按构建阶段定位

| 阶段 | 常见错误 | 快速跳转 |
|------|---------|---------|
| 代码拉取 | 超时、SSL错误、凭据失败 | [FAQ: Git问题](faq.md#git相关问题) |
| Maven编译 | 内存不足、编译失败 | [FAQ: 环境问题](faq.md#环境兼容性问题) |
| SonarQube | 扫描失败、认证错误 | [FAQ: SonarQube](faq.md#sonarqube相关问题) |
| 应用备份 | 目录不存在、权限不足 | [FAQ: 部署备份](faq.md#部署与备份问题) |
| 部署上传 | 路径错误、文件校验失败 | [FAQ: 路径问题](faq.md#路径配置问题) |
| 配置替换 | 文件不存在、替换失败 | [FAQ: 部署备份](faq.md#部署与备份问题) |
| 服务启动 | 端口冲突、进程被杀、乱码 | [FAQ: 服务启动](faq.md#服务启动问题) |

### 按错误关键词定位

| 关键词 | 可能原因 | 快速跳转 |
|--------|---------|---------|
| `timeout` / `超时` | 服务启动慢或网络问题 | [FAQ Q2](faq.md#q2), [FAQ Q32](faq.md#q32) |
| `乱码` / `garbled` | 编码问题 | [FAQ Q7](faq.md#q7), [FAQ Q34](faq.md#q34) |
| `找不到文件` / `path` | 路径配置错误 | [FAQ Q11-Q13](faq.md#路径配置问题) |
| `denied` / `权限` | 权限不足 | [FAQ Q10](faq.md#q10) |
| `dontKillMe` / `进程被杀` | Jenkins杀死子进程 | [FAQ Q29](faq.md#q29) |
| `ExceptionInInitializer` | JAVA_HOME缺失 | [FAQ Q30](faq.md#q30) |
| `SSL_ERROR` | Git网络问题 | [FAQ Q3](faq.md#q3) |
| `MD5` | 校验失败 | [FAQ Q14](faq.md#q14) |

---

## 排查流程

### 步骤1: 查看构建日志

```python
# 使用MCP查看最新日志
mcp_jenkins_getBuildLog(
    jobFullName="BEMP-Backend-Deploy",
    limit=-100
)

# 搜索错误关键词
mcp_jenkins_searchBuildLog(
    jobFullName="BEMP-Backend-Deploy",
    pattern="ERROR",
    useRegex=False
)
```

### 步骤2: 定位失败阶段

在日志中搜索 `==========================================` 分隔符，找到失败阶段。

### 步骤3: 查阅FAQ

根据失败阶段和错误关键词，在 [FAQ](faq.md) 中查找解决方案。

### 步骤4: 检查配置

确认 Jenkinsfile environment 块中的配置是否正确：
- 路径是否存在
- 端口是否冲突
- 凭据是否有效

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [FAQ](faq.md) | 常见问题与解决方案 |
| [已知问题](known-issues.md) | 历史问题和修复记录 |
| [错误处理规范](../references/error-handling-rollback.md) | 错误处理与回滚机制 |
| [服务启动模板](../references/service-startup-templates.md) | 服务启动问题排查 |

---

*需要更多帮助？查看 [FAQ](faq.md) 或 [已知问题](known-issues.md)*
