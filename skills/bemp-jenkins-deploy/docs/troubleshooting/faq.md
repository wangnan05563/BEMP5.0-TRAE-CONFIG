# 常见问题与解决方案 (FAQ)

本文档整合了所有已知问题和解决方案，按类别组织便于快速查找。

---

## 目录

- [Git相关问题](#git相关问题)
- [环境兼容性问题](#环境兼容性问题)
- [SonarQube相关问题](#sonarqube相关问题)
- [路径配置问题](#路径配置问题)
- [部署与备份问题](#部署与备份问题)
- [服务启动问题](#服务启动问题)
- [性能优化建议](#性能优化建议)

---

## Git相关问题

### Q1: Agent标签找不到 - "doesn't have label 'windows-agent'"
**症状**: 构建卡在等待调度
**原因**: Pipeline指定了不存在的节点标签
**解决方案**:
```groovy
pipeline {
    agent {
        node {
            label ''
            customWorkspace 'D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank'
        }
    }
}
```
**状态**: ✅ 已修复，所有Jenkinsfile使用空label + customWorkspace

### Q2: Git拉取超时（超过5分钟）
**原因**: 
- Pipeline超时过短
- Git clone超时不足
- 深克隆数据量大

**解决方案**:
```groovy
options {
    timeout(time: 1800, unit: 'SECONDS')
}

checkout([
    $class: 'GitSCM',
    extensions: [
        [$class: 'CloneOption', 
         timeout: 900, shallow: true, depth: 1, noTags: true, honorRefspec: true]
    ]
])
```
**状态**: ✅ 已优化，默认启用浅克隆+网络优化

### Q3: SSL连接错误 (`SSL_ERROR_SYSCALL`)
**原因**: 深克隆在网络不稳定时容易断开
**解决方案**: 使用浅克隆替代深克隆
**状态**: ✅ 已默认使用浅克隆

### Q4: 工作空间为空（只有.git文件夹）
**原因**: 稀疏检出配置错误
**解决方案**: 后端使用完整检出，前端使用稀疏检出(frontend/)
**状态**: ✅ 已按需配置

### Q5: Git命令退出码1导致构建中断
**原因**: `git config --get` 在配置不存在时返回非零退出码
**解决方案**: 使用容错处理 `|| true` 或文件重定向
**状态**: ✅ 已修复

---

## 环境兼容性问题

### Q6: Windows环境下sh命令找不到
**症状**: `Cannot run program "sh"`
**原因**: 使用了Linux的`sh()`命令
**解决方案**: 将所有`sh()`替换为`bat()`
**状态**: ✅ 所有Jenkinsfile已使用`bat()`

### Q7: Windows批处理中文乱码
**症状**: `清理完成，保留最�?3 个备�?`
**原因**: Windows批处理默认GBK编码
**解决方案**: 在bat脚本开头添加 `chcp 65001 > nul`
**状态**: ✅ 已修复

---

## SonarQube相关问题

### Q8: 扫描失败 - 编译产物目录不存在
**症状**: `No files nor directories matching 'target/classes'`
**原因**: 项目还未编译或路径配置错误
**解决方案**: 确保编译步骤在扫描步骤之前执行
**状态**: ✅ 已配置正确的多模块路径

### Q9: 项目名称乱码
**解决方案**: 使用英文项目名避免编码问题
**状态**: ✅ 已使用英文项目名称

### Q10: 认证失败 - "not authorized"
**原因**: Token过期或格式不正确
**解决方案**: 使用`squ_`前缀的新版用户Token
**Token格式说明**:
| 格式 | 状态 |
|------|------|
| `squ_` 前缀 | ✅ 推荐（新版用户Token）|
| `sqp_` 前缀 | ⚠️ 可能过期（旧版项目Token）|

---

## 路径配置问题

### Q11: Groovy语法错误 - 反斜杠转义
**症状**: `unexpected char: '\'`
**解决方案**: 使用正斜杠或双反斜杠
**状态**: ✅ 所有路径已使用正斜杠

### Q12: 验证路径包含多余banks前缀
**症状**: `关键文件不存在 - banks/ext-hnnxbank/pom.xml`
**解决方案**: 移除多余的`banks/`前缀
**状态**: ✅ 已修复

### Q13: copy命令找不到文件（路径分隔符混乱）
**原因**: 混合使用正斜杠和反斜杠
**解决方案**: 统一使用反斜杠 `replace('/', '\\')`
**状态**: ✅ 已实现路径标准化

---

## 部署与备份问题

### Q14: MD5校验失败（包含命令回显）
**原因**: certutil输出包含完整命令文本
**解决方案**: 使用正则表达式精确提取32位十六进制MD5值
**状态**: ✅ 已使用正则提取+容错处理

### Q15: 备份目录未创建导致失败
**解决方案**: 先创建目录再操作 `mkdir "${BACKUP_DIR}"`
**状态**: ✅ 已添加目录创建逻辑

### Q16: "No such DSL method 'startService' found"
**原因**: Jenkins DSL方法作用域限制
**解决方案**: 将函数逻辑内联到对应阶段中
**状态**: ✅ 已修复

### Q17: 备份文件名包含null - `bemp-served_null`
**原因**: env赋值方式问题
**解决方案**: 使用局部变量 + 检查BUILD_TIMESTAMP是否存在
**状态**: ✅ 已修复

---

## 服务启动问题

### Q29: 服务启动后Jenkins自动关闭进程
**原因**: Jenkins构建结束后会杀死所有子进程
**解决方案**: 设置 `JENKINS_NODE_COOKIE=dontKillMe`
```groovy
bat """
    set JENKINS_NODE_COOKIE=dontKillMe
    start "Redis" "redis-server.exe"
"""
```
**状态**: ✅ 已修复

### Q30: bemp-served启动失败 - ExceptionInInitializerError
**原因**: Jenkins服务账户不继承用户环境变量，JAVA_HOME缺失
**解决方案**: 在bat块中显式设置JAVA_HOME和PATH
```groovy
bat """
    set JENKINS_NODE_COOKIE=dontKillMe
    set JAVA_HOME=${env.JAVA_HOME_BUILD}
    set PATH=%JAVA_HOME%\\bin;%PATH%
    cd /d "${env.BEMP_SERVED_HOME}"
    start /b java %JVM_OPTS% -cp ../classes;../lib/* com.hundsun.bemp.BempServedAppStarter
"""
```
**状态**: ✅ 已修复

### Q31: bemp-served启动失败 - 找不到类
**检查清单**:
- [ ] BEMP_SERVED_HOME 路径存在
- [ ] ../classes 目录存在且包含class文件
- [ ] ../lib/* 目录存在且包含依赖jar包
- [ ] JAVA_HOME 已显式设置

### Q32: 端口验证失败但服务已启动
**原因**: 服务启动较慢，端口尚未监听
**解决方案**: 增加超时时间（BEMP_SERVED_TIMEOUT默认600秒）

### Q33: 如何跳过某些服务启动？

| 参数 | 说明 | 默认值 |
|------|------|--------|
| SKIP_REDIS | 跳过Redis | false |
| SKIP_ZOOKEEPER | 跳过Zookeeper | false |
| SKIP_BEMP_SERVED | 跳过bemp-served | false |

### Q34: bemp-served启动窗口中文乱码
**解决方案**: 完整的UTF-8编码设置：
```groovy
environment {
    JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
    JVM_OPTS = '-server -Xms2048m -Xmx4096m ... -Dfile.encoding=UTF-8'
}
```
**状态**: ✅ 已修复

---

## 性能优化建议

### 如何加速Git拉取？
1. 启用浅克隆（默认已启用，depth: 1）
2. 不拉取标签（`noTags: true`）
3. 增加 `http.postBuffer=524288000`

### 如何加速Maven构建？
1. 使用并行构建（`-T4`，通过BUILD_THREADS参数控制）
2. 跳过单元测试（`SKIP_TESTS=true`）
3. 使用Artifactory镜像settings

### 如何优化SonarQube扫描？
1. 配置正确的 `sonar.exclusions`
2. 确保编译产物存在再扫描
3. 可通过SKIP_SONAR=true跳过

---

*详细的历史问题和修复记录请查看 [known-issues.md](known-issues.md)*
