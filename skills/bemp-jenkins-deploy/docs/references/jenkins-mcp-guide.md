# Jenkins MCP 接口使用指南

## 概述

Jenkins MCP (Model Context Protocol) 接口允许通过AI助手直接操作Jenkins，实现构建触发、状态监控、日志查看等自动化操作。

---

## 可用接口

### 构建操作

| 接口 | 功能 | 参数 |
|------|------|------|
| `mcp_jenkins_triggerBuild` | 触发构建 | jobFullName, parameters |
| `mcp_jenkins_rebuildBuild` | 重新构建 | jobFullName, buildNumber |
| `mcp_jenkins_replayBuild` | 重放构建 | jobFullName, buildNumber, script |
| `mcp_jenkins_updateBuild` | 更新构建信息 | jobFullName, buildNumber |

### 构建查询

| 接口 | 功能 | 参数 |
|------|------|------|
| `mcp_jenkins_getBuild` | 获取构建详情 | jobFullName, buildNumber |
| `mcp_jenkins_getBuildLog` | 获取构建日志 | jobFullName, buildNumber, limit |
| `mcp_jenkins_searchBuildLog` | 搜索构建日志 | jobFullName, pattern, useRegex |
| `mcp_jenkins_getBuildScm` | 获取SCM信息 | jobFullName, buildNumber |
| `mcp_jenkins_getBuildChangeSets` | 获取变更集 | jobFullName, buildNumber |

### 任务管理

| 接口 | 功能 | 参数 |
|------|------|------|
| `mcp_jenkins_getJob` | 获取任务详情 | jobFullName |
| `mcp_jenkins_getJobs` | 获取任务列表 | - |
| `mcp_jenkins_getJobScm` | 获取任务SCM配置 | jobFullName |

### 测试结果

| 接口 | 功能 | 参数 |
|------|------|------|
| `mcp_jenkins_getTestResults` | 获取测试结果 | jobFullName, buildNumber |
| `mcp_jenkins_getFlakyFailures` | 获取不稳定测试 | jobFullName |

### 系统信息

| 接口 | 功能 | 参数 |
|------|------|------|
| `mcp_jenkins_getStatus` | 获取Jenkins状态 | - |
| `mcp_jenkins_whoAmI` | 获取当前用户 | - |
| `mcp_jenkins_getQueueItem` | 获取队列项 | queueItemId |

---

## 使用示例

### 1. 触发后端部署

```python
result = mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Backend-Deploy",
    parameters={
        "GIT_BRANCH": "feature/hnnxbank/dev",
        "SKIP_SONAR": True,
        "FORCE_OVERWRITE": True,
        "SKIP_CODE_PULL": True,
        "SKIP_MAVEN_BUILD": False,
        "SKIP_BEMP_SERVED": False
    }
)
print(f"构建已触发，队列ID: {result['queueId']}")
```

### 2. 触发前端部署

```python
result = mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Frontend-Deploy",
    parameters={
        "GIT_BRANCH": "feature/hnnxbank/dev",
        "SKIP_SONAR": True,
        "FORCE_OVERWRITE": True
    }
)
```

### 3. 监控构建状态

```python
build = mcp_jenkins_getBuild(
    jobFullName="BEMP-Backend-Deploy"
)
print(f"构建号: {build['number']}")
print(f"状态: {build['result']}")
print(f"耗时: {build['duration']}ms")
```

### 4. 查看构建日志

```python
# 获取最后100行日志
log = mcp_jenkins_getBuildLog(
    jobFullName="BEMP-Backend-Deploy",
    limit=-100
)
print(log)

# 搜索错误
errors = mcp_jenkins_searchBuildLog(
    jobFullName="BEMP-Backend-Deploy",
    pattern="ERROR",
    useRegex=False
)
print(errors)
```

### 5. 诊断构建失败

```python
def diagnose_build_failure(job_name):
    """诊断构建失败原因"""
    build = mcp_jenkins_getBuild(jobFullName=job_name)
    if build.get('result') == 'SUCCESS':
        print("构建成功")
        return

    print(f"构建失败: {build.get('result')}")

    # 搜索关键错误
    for pattern in ['ERROR', 'FAILED', '超时', 'timeout', 'ExceptionInInitializer']:
        results = mcp_jenkins_searchBuildLog(
            jobFullName=job_name,
            pattern=pattern,
            useRegex=False
        )
        if results:
            print(f"\n[{pattern}] 相关日志:")
            print(results)

    # 检查测试结果
    tests = mcp_jenkins_getTestResults(
        jobFullName=job_name,
        onlyFailingTests=True
    )
    if tests:
        print(f"\n失败的测试: {tests}")
```

---

## 参数说明

### 后端构建参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| GIT_BRANCH | string | feature/hnnxbank/dev | 目标分支 |
| FORCE_OVERWRITE | boolean | true | 强制覆盖 |
| SKIP_SONAR | boolean | true | 跳过SonarQube |
| SKIP_TESTS | boolean | true | 跳过单元测试 |
| SKIP_CODE_PULL | boolean | true | 跳过代码拉取 |
| SKIP_MAVEN_BUILD | boolean | false | 跳过Maven编译 |
| SKIP_CONFIG_REPLACE | boolean | true | 跳过配置替换 |
| SKIP_BACKUP | boolean | false | 跳过备份 |
| SKIP_UPLOAD | boolean | false | 跳过上传 |
| SKIP_REDIS | boolean | false | 跳过Redis |
| SKIP_ZOOKEEPER | boolean | false | 跳过Zookeeper |
| SKIP_BEMP_SERVED | boolean | false | 跳过bemp-served |
| DEPLOY_ENVIRONMENT | choice | dev | 部署环境 |
| NOTIFY_EMAIL | string | wangnan@hundsun.com | 通知邮箱 |
| BUILD_THREADS | string | 4 | 构建线程数 |

### 前端构建参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| GIT_BRANCH | string | feature/hnnxbank/dev | 目标分支 |
| FORCE_OVERWRITE | boolean | true | 强制覆盖 |
| SKIP_CODE_PULL | boolean | false | 跳过代码拉取 |
| SKIP_NPM_BUILD | boolean | false | 跳过前端编译打包 |
| SKIP_SONAR | boolean | true | 跳过扫描 |
| SKIP_BACKUP | boolean | false | 跳过备份 |
| SKIP_UPLOAD | boolean | false | 跳过上传 |
| SKIP_NGINX | boolean | false | 跳过Nginx启动 |
| DEPLOY_ENVIRONMENT | choice | dev | 部署环境 |
| NOTIFY_EMAIL | string | wangnan@hundsun.com | 通知邮箱 |

---

## 自动化工作流

### 完整部署工作流

```python
def full_deploy(branch="feature/hnnxbank/dev", skip_sonar=True):
    """完整部署工作流"""
    # 1. 检查Jenkins状态
    status = mcp_jenkins_getStatus()
    if not status:
        raise Exception("Jenkins不可用")

    # 2. 触发构建
    result = mcp_jenkins_triggerBuild(
        jobFullName="BEMP-Backend-Deploy",
        parameters={
            "GIT_BRANCH": branch,
            "SKIP_SONAR": str(skip_sonar).lower(),
            "FORCE_OVERWRITE": "true"
        }
    )
    return result

def quick_restart():
    """快速重启（跳过构建，仅重启服务）"""
    return mcp_jenkins_triggerBuild(
        jobFullName="BEMP-Backend-Deploy",
        parameters={
            "SKIP_CODE_PULL": "true",
            "SKIP_MAVEN_BUILD": "true",
            "SKIP_SONAR": "true",
            "SKIP_BACKUP": "true",
            "SKIP_UPLOAD": "true",
            "SKIP_CONFIG_REPLACE": "true",
            "SKIP_REDIS": "false",
            "SKIP_ZOOKEEPER": "false",
            "SKIP_BEMP_SERVED": "false"
        }
    )
```

---

*相关文档: [Pipeline语法](jenkins-pipeline-syntax.md) | [故障排查](../troubleshooting/index.md)*
