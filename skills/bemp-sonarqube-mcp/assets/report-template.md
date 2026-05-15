# SonarQube 扫描报告模板

## 📊 {项目名称} SonarQube 扫描报告

**扫描时间**：{日期}
**扫描范围**：{功能模块名称}
**项目Key**：{projectKey}

---

### 一、质量门禁状态

**整体状态**：✅ 通过 / ❌ 未通过

| 指标 | 当前值 | 阈值 | 状态 |
|------|--------|------|------|
| 新代码覆盖率 | {value}% | ≥80% | ✅/❌ |
| 新代码重复率 | {value}% | ≤3% | ✅/❌ |
| 新增问题数 | {value} | 0 | ✅/❌ |

---

### 二、扫描文件清单

| 层级 | 文件 | 行数 | 问题数 |
|------|------|------|--------|
| Service | {filename} | {lines} | {count} |
| Controller | {filename} | {lines} | {count} |
| Util | {filename} | {lines} | {count} |
| Aspect | {filename} | {lines} | {count} |
| DAO | {filename} | {lines} | {count} |
| DTO | {filename} | {lines} | {count} |

**扫描文件总数**：{count}
**涉及代码行数**：{lines}

---

### 三、问题统计

#### 按严重级别

| 级别 | 数量 | 占比 |
|------|------|------|
| BLOCKER | {count} | {pct}% |
| HIGH | {count} | {pct}% |
| MEDIUM | {count} | {pct}% |
| LOW | {count} | {pct}% |
| INFO | {count} | {pct}% |
| **合计** | **{total}** | **100%** |

#### 按质量维度

| 维度 | 数量 | 占比 |
|------|------|------|
| SECURITY | {count} | {pct}% |
| RELIABILITY | {count} | {pct}% |
| MAINTAINABILITY | {count} | {pct}% |

---

### 四、问题详情

#### 🔴 BLOCKER 级别

| # | 规则 | 文件 | 行号 | 描述 | 维度 |
|---|------|------|------|------|------|
| 1 | {rule} | {file} | {line} | {message} | {category} |

#### 🟠 HIGH 级别

| # | 规则 | 文件 | 行号 | 描述 | 维度 |
|---|------|------|------|------|------|
| 1 | {rule} | {file} | {line} | {message} | {category} |

#### 🟡 MEDIUM 级别

| # | 规则 | 文件 | 行号 | 描述 | 维度 |
|---|------|------|------|------|------|
| 1 | {rule} | {file} | {line} | {message} | {category} |

#### 🟢 LOW / INFO 级别

| # | 规则 | 文件 | 行号 | 描述 | 维度 |
|---|------|------|------|------|------|
| 1 | {rule} | {file} | {line} | {message} | {category} |

---

### 五、修复建议

#### 问题 1：{规则ID} — {问题描述}

- **严重级别**：{severity}
- **所在文件**：{file}:{line}
- **问题分析**：{analysis}
- **修复方案**：{solution}
- **修复代码**：

```java
// 修复前
{before_code}

// 修复后
{after_code}
```

- **验证方法**：{verification}

---

### 六、代码亮点 ✨

以下文件通过扫描**零问题**，代码质量优秀：

| 文件 | 行数 | 亮点说明 |
|------|------|----------|
| {filename} | {lines} | {highlight} |

---

### 七、结论与建议

**整体评价**：{overall_assessment}

**必须修复**（阻塞发布）：
1. {blocker_item}

**建议修复**（当前迭代）：
1. {high_item}

**后续优化**：
1. {medium_item}

**测试覆盖率建议**：
- 当前覆盖率：{current_coverage}%
- 目标覆盖率：≥80%
- 建议优先补充测试的模块：{test_suggestion}
