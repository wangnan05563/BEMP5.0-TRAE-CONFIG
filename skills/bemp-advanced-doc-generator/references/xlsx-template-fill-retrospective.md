# 复盘：以用户输入 xlsx 模板生成单元测试报告（机构管理优化场景）

> 时间：2026-06-06 ~ 2026-06-07  
> 智能体：document-delivery-engineer  
> 技能：bemp-advanced-doc-generator  
> 关联脚本：`scripts/run-unit-report.js`、`scripts/lib/xlsx-report/*`、`scripts/verify-v2.js`  
> 关联文档：[SKILL.md](../SKILL.md)

---

## 一、成功执行任务的完整步骤

### 阶段 1 — 前置准备与门禁
1. 确认输入：用户模板 `09【模板】单元测试报告.xlsx`、需求 `机构管理优化-需求.md`、测试用例 MD
2. 工具就绪：检查 `exceljs` 已安装、模板可加载、输出目录可写
3. 选择模式：functional（用例来源是 MD，非 Java @Test）

### 阶段 2 — 模板解析（Schema 先行）
1. **TemplateInspector.inspect(xlsxTemplate)** → `TemplateSchema`
2. 关键产出：表头行、列数、列定义（含 `semanticKey` 推导）、前置行、摘要 Sheet 状态
3. 此阶段建立的 `TemplateSchema` 贯穿全流水线，是"零硬编码"的基础

### 阶段 3 — 数据源扫描
1. **TestCaseMdScanner.scan(testCasesPath)** → `scanResult`
2. 解析 `##` 章节、`### TC-XXX` 用例块、`yaml` 元数据
3. 输出：`testcases[]`、章节数、用例数、优先级统计

### 阶段 4 — 标准化与映射
1. **ContentBuilder.buildFunctionalTestCases(scanResult, moduleName)** → 全语义键字段
2. **ColumnMapper.mapRows(testcases, schema)** → 17 列 × N 行二维数组
3. 映射兜底链：自定义格式化器 → 直接读 semanticKey → case-insensitive → `_deriveValue` 推导 → 兜底空串

### 阶段 5 — 写入与样式
1. `_writeAll` 复制模板 → 清空 dataStartRow..end → 写入数据行
2. 样式策略：保留模板原 style（边框/底色/数字格式），**仅覆盖** font(name, size)、alignment(wrapText, vertical, horizontal)
3. 字体统一为宋体 10.5pt，wrapText=true，水平/垂直居中

### 阶段 6 — 摘要 Sheet 条件追加
1. 仅当模板未自带摘要时追加
2. SummaryBuilder 输出 7 小节结构化摘要

### 阶段 7 — 校验与验证
1. 自动化：`XlsxReportPipeline._validate` 输出 7 项检查
2. 人工：`verify-v2.js` 逐列填充率、字体一致性、摘要 sheet 完整性
3. 输出文件路径、模式、用例数、校验结果

### 阶段 8 — 迭代修复（v1 → v2）
1. 用户反馈"只有用例名称无内容 + 格式不一致 + 输出路径错误"
2. 定位 3 个根因，逐一修复，重跑验证
3. 交付 v2：17 列 100% 填充，字体统一，路径正确

---

## 二、任务执行过程中的不确定性与失败点

### 失败点 1：输出路径错误
- **症状**：报告生成在 `scripts/output/` 而非技能根 `output/`
- **根因**：`_resolveOutputPath` 用 `path.resolve('..', '..')` 相对 `process.cwd()`，cwd 决定路径
- **修复**：用 `path.resolve(__dirname, '..', '..', '..')` 锚定到技能根目录
- **教训**：相对路径不可靠，**必须用 `__dirname` 锚定**

### 失败点 2：模板表头行识别错误
- **症状**：表头识别为第 3 行（实际是第 2 行）
- **根因**：模板第 1 行是"案例填写原则"说明文字，被 `_detectHeaderRow` 误判为表头
- **修复**：加入**评分机制**（HEADER_KEYWORDS 命中数 + 必填* 加分 + 列名长度评分 - 说明行扣分）
- **教训**：表头检测需要"质量分"而不是"首行非空"判断

### 失败点 3：SEMANTIC_RULES 顺序错配
- **症状**：J 列"步骤描述"被映射为 `summary_2` 而非 `stepDesc`
- **根因**：`步骤描述` 同时含 "步骤描述" 和 "描述"，旧顺序让 `summary` 规则（keys 包含 "描述"）先匹配
- **修复**：把更具体的 `stepName` / `stepDesc` 规则提到 `summary` 之前
- **教训**：**模糊匹配的规则顺序至关重要**，更具体的必须在前面

### 失败点 4：英文 yaml key 不识别（最终隐藏 bug）
- **症状**：J 列步骤描述 0% 填充（前两个 bug 修复后仍然空）
- **根因**：scanner 的 `_parseCaseBlock` 用 `data['前置条件']`、`data['测试步骤']`（中文 key），但 MD 文件用 `preconditions`、`steps`（英文）
- **修复**：`_parseCaseBlock` 改为**多语言 key 兼容**（`pickList('前置条件', 'preconditions', ...)`）
- **教训**：**MD 文件实际格式与代码假设不一致时，无声失败**。必须在写完数据后立即 verify

### 失败点 5：debug 脚本输出截断
- **症状**：`out.push` 多次，但写入文件只有 1 行
- **根因**：PowerShell `>` 重定向到 UTF-16 LE BOM + Read 工具按 cat 显示混乱
- **修复**：用 `Start-Process` + `RedirectStandardOutput/Error` 分离 stdout/stderr
- **教训**：**PowerShell 重定向 + 跨平台编码**容易踩坑，调试时优先用 `Start-Process -RedirectStandardOutput`

### 失败点 6：scanner 返回结构与代码假设不符
- **症状**：`sr.chapterRanges.length` → `Cannot read property 'length' of undefined`
- **根因**：scanner 返回 `{ chapterCount, testCaseCount }` 不是 `{ chapterRanges, testcases.length }`
- **修复**：debug 脚本改用 `sr.chapterCount`
- **教训**：**调用第三方 API 前先 Read 源码确认返回结构**，不要凭直觉

---

## 三、可抽象的固定流程与判断逻辑

### 流程 A — xlsx 模板填充 6 步标准作业

```
[1] TemplateInspector  → TemplateSchema
        │
[2] Scanner            → scanResult（MD/Java）
        │
[3] ContentBuilder     → testcases[]（全语义键）
        │
[4] ColumnMapper       → rows[][]（基于 schema.columns 动态映射）
        │
[5] _writeAll          → 复制模板 + 清空 dataStartRow..end + 写入 + 统一样式
        │
[6] _validate          → 7 项校验（主表/表头/数据/id列/摘要/蓝色）
```

**判断逻辑：每步失败必须可独立诊断、可重试，不允许跨步错误传染。**

### 流程 B — 列填充率 100% 门禁

```
if (fillRate < 100%) {
    ┌── 列没识别（schema.columns 缺失）→ 检查 TemplateInspector
    ├── semanticKey 错配 → 检查 SEMANTIC_RULES 顺序
    ├── testcase 字段为空 → 检查 Scanner 输出
    └── mapper 兜底失败 → 检查 _deriveValue
}
```

**判断逻辑：填充率为 0 的列，先看 schema 中是否存在该列；存在则看 testcase 是否有该字段；都没有则看 mapper 推导。**

### 流程 C — 表头检测评分机制

```
score = Σ(HEADER_KEYWORDS 命中数)
      + Σ(必填* 标记数) × 2
      + (列名均长 < 12 ? +3 : (列名均长 > 30 ? -5 : 0))
      - (是"说明："开头 ? 10 : 0)

候选行 score 降序 + row 升序 → 最高分 = 表头
```

**判断逻辑：列名越短、必填标记越多、关键词命中越多，越可能是表头。"说明："行必须排除。**

### 流程 D — SEMANTIC_RULES 优先级原则

```
1. 必含主键（id/name）最优先
2. 更具体的复合词（"操作步骤名称"含"操作步骤"）先于通用词（"描述"）
3. 英文 key 与中文 key 互不干扰（不同长度语义不重叠）
4. 同级规则按"最具体"排序
```

**判断逻辑：长字符串包含短字符串的所有特征，长规则必须先匹配。**

### 流程 E — 路径解析稳健性

```
绝对路径 → 直接返回
相对路径 → path.resolve(__dirname, '..', '..', '..') + 目标子目录
绝不用 process.cwd() 作为基准（除非明确说明）
```

**判断逻辑：技能脚本的位置是固定的，用 `__dirname` 锚定；用 `cwd` 等同于赌运气。**

### 流程 F — 多语言 key 兼容读取

```javascript
const pickList = (...keys) => {
    for (const k of keys) {
        const v = data[k];
        if (Array.isArray(v) && v.length) return v;
        if (typeof v === 'string' && v.trim()) return [v];
    }
    return [];
};
```

**判断逻辑：YAML/JSON 配置文件应支持英文+中文+别名容错，调用方按优先级轮询。**

### 流程 G — 输出调试稳健手法

```
Windows + PowerShell 调试 Node.js 脚本：
  首选：Start-Process node + RedirectStandardOutput/Error 到 .log 文件
  备选：fs.writeFileSync 同步写入
  避免：> 重定向（编码混乱） / tee（与 Windows 不兼容） / cmd /c（被沙箱禁用）
```

---

## 四、该流程和判断逻辑的适用场景与不适用场景

### 适用场景
| 场景 | 适配度 | 说明 |
|------|--------|------|
| 用户提供 xlsx 模板，模板列名规范（*必填、含标准术语） | ⭐⭐⭐⭐⭐ | 完美匹配，可全自动生成 |
| 用户提供 xlsx 模板，列名是业务定制 | ⭐⭐⭐⭐ | 通过 SEMANTIC_RULES 扩展可适配 |
| 功能测试用例 MD 格式（##章节 + ###用例 + ```yaml```） | ⭐⭐⭐⭐⭐ | TestCaseMdScanner 完整支持 |
| 单元测试 Java 源码（@Test 注解） | ⭐⭐⭐⭐ | JavaTestScanner 支持 |
| 模板列数 5 ~ 30 列 | ⭐⭐⭐⭐⭐ | 流程已验证 17 列模板 |
| 模板列数 1 ~ 5（极简）或 30+（复杂） | ⭐⭐⭐ | 可工作，需手动扩展样式/摘要 |
| 同一模板需多次填充（迭代场景） | ⭐⭐⭐⭐⭐ | 模板不变，scan_data 变化即可 |

### 不适用场景
| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 模板含复杂公式、合并单元格、数据验证 | _writeAll 简单覆盖公式可能丢失 | 用 openpyxl + 公式保留模式 |
| 模板含图片、图表（chart 对象） | ExcelJS 对 chart 处理有限 | 手动后处理 / 用 docx-PPTX 路径 |
| 数据源是 Excel 而非 MD/Java | 需额外 Scanner | 扩展 JavaTestScanner 或新增 ExcelScanner |
| 用户要求 Word 格式而非 Excel | 输出类型不同 | 用 `unit-test-report`（Word）技能路径 |
| 模板表头完全无规律（不可枚举） | SEMANTIC_RULES 无法覆盖 | 提供显式列映射文件（YAML/JSON） |
| 多 Sheet 数据交叉填充 | 当前 Pipeline 只支持单 Sheet | 重构 _writeAll 支持多 Sheet |
| 实时流式追加（数据持续到达） | 每次全量重写 | 改为增量写入模式 |

### 边界条件
- **空用例集**：`testcases.length === 0` → Pipeline 仍生成模板 + 摘要 + 警告
- **模板不存在的 Sheet**：抛出 `TEMPLATE_INVALID` 错误，不静默
- **必含主键缺失**：在 `inspect()` 阶段就抛错，不进入写入
- **列填充率 < 100%**：verify 报错"✗ N/M (P%)"，需修复

---

## 五、关键资产沉淀

| 资产 | 位置 | 用途 |
|------|------|------|
| XlsxReportPipeline 主类 | `scripts/lib/xlsx-report/xlsx-report-pipeline.js` | 编排器，6 步流水线 |
| TemplateInspector | `scripts/lib/xlsx-report/template-inspector.js` | 模板解析 + 评分表头检测 |
| ColumnMapper | `scripts/lib/xlsx-report/column-mapper.js` | 列映射 + 兜底链 |
| ContentBuilder | `scripts/lib/xlsx-report/content-builder.js` | 标准化测试用例 |
| TestCaseMdScanner | `scripts/lib/test-case-md-scanner.js` | MD → scanResult |
| SummaryBuilder | `scripts/lib/xlsx-report/summary-builder.js` | 摘要 Sheet 追加 |
| verify-v2.js | `scripts/verify-v2.js` | 人工+自动校验 |
| run-unit-report.js | `scripts/run-unit-report.js` | CLI 包装 |
| 复盘文档（本文件） | `references/xlsx-template-fill-retrospective.md` | 流程规范与判断逻辑 |

---

## 六、改进建议（下一迭代）

1. **SEMANTIC_RULES 应支持运行时扩展**：用户可通过 `--semantic-map config.json` 注入自定义规则
2. **填充率门禁自动化**：`_validate` 直接 fail 时返回每列非空率，无需人工跑 verify
3. **多 Sheet 模板支持**：扩展 `_writeAll` 支持 `--sheet-mapping` 配置
4. **MD 格式自适应**：检测 yaml key 是中文还是英文，自动选择 pickList 顺序
5. **统一错误码**：BempDocError 新增 E101（表头未识别）、E102（列未填充）、E103（路径错误）
6. **单元测试覆盖**：为 TemplateInspector、ColumnMapper 添加 Jest 单测
7. **CI 集成**：在 `npm test` 中跑完整 happy path + 异常 path，确保回归不破

---

## 七、最终交付

```
报告路径：D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理优化-单元测试报告-20260606.xlsx
17 列 × 30 行，填充率 100%
字体：宋体 10.5pt（统一）
摘要 Sheet：52 行（7 小节）
校验：✓ 全部 7 项通过
```

