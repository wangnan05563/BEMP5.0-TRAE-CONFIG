# BEMP Jenkins Pipeline Deployer 文档导航

## 文档结构

```
bemp-jenkins-deploy/
├── SKILL.md                    # 技能主文档（入口）
├── CHANGELOG.md                # 版本变更记录
├── config/                     # 配置文件
│   ├── bemp-deploy.yml        # 配置参考文档
│   └── README.md              # 配置说明
├── assets/                     # 核心资源
│   ├── Jenkinsfile-served     # 后端部署流水线
│   ├── Jenkinsfile-frontend   # 前端部署流水线
│   └── sonar-project.properties # SonarQube模板
├── scripts/                    # 辅助脚本
│   ├── validate-file.ps1      # 文件完整性验证
│   ├── cleanup-backups.ps1    # 备份清理
│   └── health-check.ps1       # 服务健康检查
└── docs/                       # 详细文档
    ├── user-guide/             # 用户指南
    ├── troubleshooting/        # 故障排查
    ├── architecture/           # 架构说明
    └── references/             # 技术参考
```

## 快速导航

| 需求 | 文档位置 |
|------|---------|
| 配置环境 | [配置说明](../config/README.md) |
| 使用指南 | [用户指南](user-guide/usage.md) |
| 遇到问题？ | [故障排查](troubleshooting/faq.md) |
| 了解架构 | [架构说明](architecture/overview.md) |
| 技术参考 | [参考文档](references/) |

## 文档分类

### 用户指南 (user-guide/)
- **usage.md** - 完整使用说明（含快速开始、参数、MCP操作、高级配置）

### 故障排查 (troubleshooting/)
- **faq.md** - 常见问题与解决方案

### 架构说明 (architecture/)
- **overview.md** - 系统架构、模块设计和扩展点

### 技术参考 (references/)
- **jenkins-pipeline-syntax.md** - Jenkins Pipeline语法参考
- **error-handling-rollback.md** - 错误处理与回滚机制
- **service-startup-templates.md** - 服务启动模板
- **jenkins-mcp-guide.md** - Jenkins MCP接口使用指南

---

*最后更新: 2026-05-17*
