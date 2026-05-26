# bemp-jenkins-deploy 反向构建提示词

## 核心功能
为BEMP后端和前端项目生成可直接使用的Jenkins Pipeline自动化部署脚本。前后端分离部署(Maven+Node.js)，配置内联(environment块直接定义)，阶段独立跳过(SKIP参数)，自动备份与失败自动回滚，SonarQube代码质量门禁，Redis&Zookeeper并行启动，统一健康检查(health-check.ps1 TCP/HTTP/Nginx三模式)。

## 关键实现逻辑
- 后端流水线8阶段：代码拉取→Maven编译→SonarQube扫描→应用备份→部署包上传→配置文件替换→Redis&ZK并行启动→bemp-served启动(Java+健康检查)
- 前端流水线6阶段：代码拉取→前端编译(npm install+dll+build)→SonarQube扫描→应用备份→部署包上传→Nginx启动
- Jenkinsfile模板：`assets/Jenkinsfile-served`(后端)、`assets/Jenkinsfile-frontend`(前端)
- 配置内联：environment块直接定义所有参数，YAML(config/bemp-deploy.yml)仅作参考文档
- 健康检查：`scripts/health-check.ps1` 支持TCP/HTTP/Nginx三模式

## 输入输出参数
- 输入：Jenkinsfile environment块配置(JAVA_HOME/MAVEN_HOME/REDIS_EXE等)、Jenkins MCP参数(jobFullName/parameters)
- 输出：Jenkins Pipeline执行结果、构建日志、部署状态

## 主要业务流程
1. 编辑Jenkinsfile environment块配置路径
2. 触发构建：Jenkins MCP `triggerBuild` 或手动触发
3. 各阶段按序执行，每阶段有SKIP参数可跳过
4. 失败自动回滚：恢复备份包
5. 健康检查确认服务启动成功

## 技术特性
- Windows编码：bat开头`chcp 65001 > nul`，environment设JAVA_TOOL_OPTIONS
- 进程隔离：`set JENKINS_NODE_COOKIE=dontKillMe`防止Jenkins终止子进程
- 路径规范：environment用正斜杠，bat执行前replace('/','\\')
- SONAR_TOKEN凭据外部化，不硬编码在Jenkinsfile中
