# BEMP Jenkins Pipeline Deployer 文档导航

## 📚 文档结构

```
bemp-jenkins-deploy/
├── SKILL.md                    # 技能主文档（入口）
├── CHANGELOG.md                # 版本变更记录
├── config/                     # 配置文件
│   ├── bemp-deploy.yml        # 配置参考文档（记录所有内联配置项）
│   ├── pipeline-parameters.yml# 构建参数定义参考
│   └── README.md              # 配置说明
├── assets/                     # 核心资源
│   ├── Jenkinsfile-served     # 后端部署流水线（v5.0.0 配置内联版）
│   ├── Jenkinsfile-frontend   # 前端部署流水线（v5.0.0 配置内联版）
│   └── sonar-project.properties # SonarQube模板
├── scripts/                    # 辅助脚本
│   ├── validate-file.ps1      # 文件完整性验证
│   ├── cleanup-backups.ps1    # 备份清理
│   └── health-check.ps1       # 服务健康检查
└── docs/                       # 详细文档
    ├── getting-started/        # 快速入门
    ├── user-guide/             # 用户指南
    ├── troubleshooting/        # 故障排查
    ├── architecture/           # 架构说明
    └── references/             # 技术参考
```

## 🚀 快速开始

| 需求 | 文档位置 |
|------|---------|
| 第一次使用？ | [快速入门指南](getting-started/quick-start.md) |
| 配置环境 | [配置说明](../config/README.md) |
| 查看执行流程 | [用户指南](user-guide/usage.md) |
| 遇到问题？ | [故障排查](troubleshooting/index.md) |
| 了解架构 | [架构说明](architecture/overview.md) |
| 技术参考 | [参考文档](references/) |

## 📖 文档分类

### 1. 快速入门 (getting-started/)
- **quick-start.md** - 5分钟上手指南，包含最常用的操作步骤

### 2. 用户指南 (user-guide/)
- **usage.md** - 完整的使用说明，涵盖所有功能和配置选项

### 3. 故障排查 (troubleshooting/)
- **index.md** - 故障排查导航和快速定位指南
- **faq.md** - 常见问题与解决方案（按类别组织）
- **known-issues.md** - 已知问题和历史解决方案

### 4. 架构说明 (architecture/)
- **overview.md** - 系统架构、模块设计和扩展点

### 5. 技术参考 (references/)
- **jenkins-pipeline-syntax.md** - Jenkins Pipeline语法参考
- **error-handling-rollback.md** - 错误处理与回滚机制
- **service-startup-templates.md** - 服务启动模板（Redis/Zookeeper/bemp-served）
- **jenkins-mcp-guide.md** - Jenkins MCP接口使用指南

## 🔍 问题查找

### 按阶段查找

| 构建阶段 | 常见问题 | 解决方案 |
|----------|----------|----------|
| Git拉取 | 超时、凭据错误、SSL错误 | [FAQ: Git相关问题](troubleshooting/faq.md#git) |
| Maven构建 | 内存不足、编译失败 | [FAQ: 环境兼容性](troubleshooting/faq.md#environment) |
| SonarQube | 扫描失败、认证错误 | [FAQ: SonarQube](troubleshooting/faq.md#sonar) |
| 部署上传 | 路径错误、文件校验失败 | [FAQ: 路径配置](troubleshooting/faq.md#path) |
| 服务启动 | 端口冲突、乱码、进程被杀 | [FAQ: 服务启动](troubleshooting/faq.md#services) |

### 按错误类型查找

| 错误类型 | 关键词 | 位置 |
|----------|--------|------|
| 超时错误 | `timeout`, `超时` | [FAQ Q2](troubleshooting/faq.md#q2) |
| 编码错误 | `乱码`, `garbled` | [FAQ Q7, Q34](troubleshooting/faq.md#encoding) |
| 路径错误 | `找不到文件`, `path` | [FAQ Q11-Q13](troubleshooting/faq.md#path) |
| 权限错误 | `denied`, `权限` | [FAQ Q10](troubleshooting/faq.md#sonar) |

## 📞 获取帮助

1. 查看 [常见问题](troubleshooting/faq.md)
2. 阅读 [已知问题](troubleshooting/known-issues.md)
3. 参考 [架构文档](architecture/overview.md) 了解系统设计
4. 查看 [Jenkins MCP指南](references/jenkins-mcp-guide.md) 进行自动化操作

---

*最后更新: 2026-04-26*
