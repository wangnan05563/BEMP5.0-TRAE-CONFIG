# 配置说明

## 配置方式

v5.0.0 起所有配置直接定义在 Jenkinsfile 的 `environment` 块中，不从外部 YAML 加载。

- **后端**：编辑 `assets/Jenkinsfile-served` 的 `environment` 块
- **前端**：编辑 `assets/Jenkinsfile-frontend` 的 `environment` 块
- **配置参考清单**：[bemp-deploy.yml](bemp-deploy.yml)

## 目录结构

```
config/
├── bemp-deploy.yml    # 配置参考文档（记录所有内联配置项的默认值）
└── README.md          # 本文件
```

## 修改配置

### 路径配置

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/new/path/to/jdk1.8.0_341'
    MAVEN_HOME = 'D:/new/path/to/apache-maven-3.6.3'
}
```

### 端口配置

```groovy
environment {
    REDIS_PORT = '6380'
    BEMP_SERVED_PORT = '8020'
}
```

### 新增配置文件替换项

```groovy
environment {
    CONFIG_REPLACE_FILES = 'application.properties,logback.xml,application-dev.properties'
}
```

## 注意事项

- bemp-deploy.yml 仅作参考文档，不参与运行时加载
- 修改配置后需重新触发构建才能生效
- Groovy 语法中字符串用单引号

---

*相关文档: [使用指南](../docs/user-guide/usage.md) | [FAQ](../docs/troubleshooting/faq.md)*
