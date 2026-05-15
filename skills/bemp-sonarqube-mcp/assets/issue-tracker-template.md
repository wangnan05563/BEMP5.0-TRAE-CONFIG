# BEMP SonarQube 扫描问题记录模板

## 扫描信息

- **扫描日期**：{date}
- **扫描范围**：{scope}
- **项目Key**：{projectKey}
- **执行人**：{executor}

## 问题记录

| # | Issue Key | 规则ID | 严重级别 | 文件 | 行号 | 描述 | 处理方式 | 处理人 | 处理日期 |
|---|-----------|--------|----------|------|------|------|----------|--------|----------|
| 1 | {key} | {rule} | {severity} | {file} | {line} | {message} | 修复/误报/接受 | {name} | {date} |

## 修复记录

### 修复 1

- **Issue Key**：{key}
- **规则**：{rule}
- **修复前代码**：
```java
{before}
```
- **修复后代码**：
```java
{after}
```
- **验证结果**：✅ 已通过 / ❌ 未通过

## 误报记录

### 误报 1

- **Issue Key**：{key}
- **规则**：{rule}
- **误报原因**：{reason}
- **SonarQube状态变更**：OPEN → FALSE_POSITIVE
- **comment**：{comment}
