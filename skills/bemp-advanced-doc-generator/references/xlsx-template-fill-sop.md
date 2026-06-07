# xlsx 模板填充 SOP（标准作业流程）

> 适用：基于用户提供的 `.xlsx` 模板生成 BEMP 测试/报告文档  
> 版本：v1.0 (2026-06-07 沉淀自机构管理优化场景)  
> 关联：[xlsx-template-fill-retrospective.md](./xlsx-template-fill-retrospective.md)

---

## 0. 三句话总纲

1. **Schema 优先**：永远先解析模板得到 `TemplateSchema`，再驱动后续所有步骤
2. **零硬编码**：列数、列名、表头行、起始行、Sheet 名全部从模板动态读取
3. **可独立诊断**：每步失败必须可重试，不允许错误传染

---

## 1. 标准作业 6 步

```
[1] TemplateInspector.inspect(template)         → TemplateSchema
        │  • headerRow / dataStartRow / columns[17]
        │  • 必含主键 / 摘要 Sheet 状态 / 前置行
        ↓
[2] Scanner.scan(source)                         → scanResult
        │  • MD 模式：TestCaseMdScanner → testcases[] + 章节 + 用例数
        │  • Java 模式：JavaTestScanner → @Test 方法 + 文件数
        ↓
[3] ContentBuilder.buildXxx(scanResult, module)  → testcases[] (全语义键)
        │  • id/name/stepDesc/expected/priority/summary/stepName/data
        ↓
[4] ColumnMapper.mapRows(testcases, schema)      → rows[][] 二维数组
        │  • 优先用 schema.columns[i].formatter → semanticKey → _deriveValue
        ↓
[5] _writeAll(template, output, schema, rows)    → 写入 + 统一样式
        │  • 复制模板 → 清空 dataStartRow..end → 写入 → font/对齐统一
        ↓
[6] _validate(output, schema)                    → 7 项校验
        • 主表 / 表头 / 数据 / id列 / 摘要 / 蓝色 / 用例数
```

---

## 2. 关键判断逻辑

### 2.1 表头检测评分机制

```javascript
score = Σ(HEADER_KEYWORDS 命中数)              // 关键词越多越好
      + Σ(*必填标记数) × 2                      // *加分
      + (列名均长 < 12 ? +3 :                  // 短列名加分
         (列名均长 > 30 ? -5 : 0))              // 长文本行（说明）扣分
      - (以"说明："开头 ? 10 : 0)               // 排除说明行

候选行 score 降序 + row 升序 → 最高分 = 表头
```

**口诀**：列短+多关键词+有星号=表头；列长+以"说明："开头=不是表头。

### 2.2 SEMANTIC_RULES 顺序原则

```javascript
// ✓ 正确顺序（更具体的在前）
{ keys: ['操作步骤名称', '步骤名称', 'Step Name'], semantic: 'stepName' },
{ keys: ['步骤描述', '测试步骤', '操作步骤'],     semantic: 'stepDesc' },
{ keys: ['测试概述', '概述', 'Summary'],         semantic: 'summary' },

// ✗ 错误顺序（"描述"会先匹配到 summary）
{ keys: ['测试概述', '概述', 'Summary'],         semantic: 'summary' },
{ keys: ['操作步骤名称', '步骤名称'],             semantic: 'stepName' },
{ keys: ['步骤描述', '测试步骤'],                 semantic: 'stepDesc' },
```

**口诀**：长字符串包含短字符串的所有特征，长规则必须先匹配。

### 2.3 列填充率 100% 门禁

```javascript
if (fillRate < 100%) {
    // 优先级 1：检查 schema.columns 中是否存在该列
    if (!column) → TemplateInspector 列名不识别
    // 优先级 2：检查 testcase 中是否有该字段
    else if (!tc[key]) → Scanner 未提取
    // 优先级 3：检查 mapper 兜底
    else if (!mapper._deriveValue) → 推导器未实现
}
```

### 2.4 路径解析稳健性

```javascript
// ✓ 正确
const skillRoot = path.resolve(__dirname, '..', '..', '..');

// ✗ 错误（依赖 cwd）
const skillRoot = path.resolve('..', '..');
```

**口诀**：技能脚本位置固定，用 `__dirname` 锚定；`process.cwd()` 等同于赌运气。

### 2.5 多语言 key 兼容读取

```javascript
const pickList = (...keys) => {
    for (const k of keys) {
        const v = data[k];
        if (Array.isArray(v) && v.length) return v;
        if (typeof v === 'string' && v.trim()) return [v];
    }
    return [];
};

// 调用：pickList('前置条件', 'preconditions', 'Preconditions')
```

**口诀**：YAML/JSON 字段名支持中英+别名容错，调用方按优先级轮询。

### 2.6 样式覆盖最小化

```javascript
// ✓ 正确：保留模板原 style（边框/底色/数字格式），仅覆盖 font/alignment
cell.style = {
    ...oldStyle,
    font: { name: FONT_NAME, size: FONT_SIZE, family: 1 },
    alignment: {
        ...(oldStyle.alignment || {}),
        wrapText: true,
        vertical: 'center',
        horizontal: oldStyle.alignment?.horizontal || 'left'
    }
};

// ✗ 错误：直接覆盖整个 style 对象
cell.style = { font: ..., alignment: ... };  // 边框/底色丢失
```

### 2.7 错误码体系

| 错误码 | 场景 | 触发 |
|--------|------|------|
| E101 | 模板表头未识别 | _detectHeaderRow 无候选 |
| E102 | 列填充率不达标 | _validate 必含主键 < 100% |
| E103 | 输出路径错误 | path.resolve 失败 |
| E104 | 必含主键缺失 | schema.columns 无 id/name |
| E105 | 模板 Sheet 缺失 | workbook.getWorksheet 返回 undefined |
| E106 | 数据源格式不识别 | Scanner 返回 chapterCount=0 |

---

## 3. PowerShell 调试 Node.js 脚本

```powershell
# ✓ 推荐：Start-Process + 重定向
$proc = Start-Process -FilePath "node" `
  -ArgumentList "scripts/run-unit-report.js" `
  -RedirectStandardOutput "$env:TEMP\out.log" `
  -RedirectStandardError "$env:TEMP\err.log" `
  -Wait -NoNewWindow -PassThru
Get-Content $env:TEMP\out.log -Encoding utf8

# ✗ 不推荐：> 重定向（编码混乱 + 截断）
node script.js > out.log
```

---

## 4. 验证清单（每次生成后必跑）

- [ ] 文件输出到 `output/`，路径含 `-单元测试报告-YYYYMMDD.xlsx`
- [ ] 主表 17 列 × N 行（无空行无空列）
- [ ] 17 列填充率全部 100%（A~Q）
- [ ] 字体：宋体 10.5pt（用 verify-v2.js 检查）
- [ ] 摘要 Sheet 存在，7 小节，52 行左右
- [ ] 非超链接蓝色残留 = 0
- [ ] 必含主键（id）全部有值

---

## 5. 失败排查决策树

```
生成失败？
  │
  ├─ 模板解析失败？
  │   ├─ "工作表不存在" → 检查 sheetName 大小写
  │   ├─ "表头未识别"   → 手动确认表头行，扩展 HEADER_KEYWORDS
  │   └─ "必含主键缺失" → 调整 SEMANTIC_RULES
  │
  ├─ 数据扫描失败？
  │   ├─ chapterCount=0 → MD 格式不符合（缺 ## 章节）
  │   └─ testCaseCount=0 → 缺 ### TC-XXX 用例块
  │
  ├─ 列填充率 < 100%？
  │   ├─ 整列 0%      → schema.columns 缺该列，扩 SEMANTIC_RULES
  │   ├─ 关键列（id）0% → ContentBuilder 未填该字段
  │   └─ 步骤描述 0%  → scanner 多语言 key 不识别
  │
  └─ 样式问题？
      ├─ 字体不统一   → _writeAll 的 FONT_NAME 路径不对
      ├─ 行高不对齐   → 不要强制 row.height，继承模板
      └─ 边框丢失     → 检查是否覆盖了整个 cell.style
```

---

## 6. 复用检查清单

新场景（不同模块/不同模板）下，问以下问题：

- [ ] 模板表头行号？是否需要扩展 HEADER_KEYWORDS？
- [ ] 模板列名是否在 SEMANTIC_RULES 中？是否需要新增规则？
- [ ] 数据源是 MD 还是 Java？是否需要新增 Scanner？
- [ ] 摘要 Sheet 是否模板自带？影响是否追加摘要
- [ ] 字体/对齐要求？是否与默认宋体 10.5pt 不同？
- [ ] 模板含特殊元素（图片/图表/公式）？ExcelJS 是否支持？

---

## 7. 一句话规则

> **TemplateSchema 是唯一真理来源，所有后续步骤都必须基于 Schema 动态决策，禁止写死任何模板特征。**
