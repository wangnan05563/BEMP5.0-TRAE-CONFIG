---
name: bemp-sql-change-analyzer
description: |
  BEMP项目SQL增量脚本变更分析技能。自动解析DDL/DML SQL脚本，提取表结构变更（新增/修改/删除字段、新增表、索引变更）和配置数据变更（字典/参数/流程/权限/产品/定时任务），按模板格式生成多Sheet Excel汇总文档。触发时机：用户要求分析/梳理/汇总SQL增量脚本的表结构变更，或要求生成上线变更影响文档。
version: 1.0
updated: 2026-06-12
---

## 触发条件

Use this skill when:
- 用户要求分析/梳理/汇总 SQL增量脚本的表结构变更
- 用户要求生成上线变更影响文档（表机构调整文档）
- 用户提到"表结构变更"、"增量脚本分析"、"上线影响"、"DDL/DML变更汇总"
- 用户要求基于模板Excel生成表变更汇总

Do NOT use this skill when:
- 用户仅要求阅读/查看已有SQL文件（直接打开文件即可）
- 用户要求编写SQL脚本（应使用开发类技能）
- 用户要求生成全量表结构文档（此技能只关注增量变更）
- 用户要求数据库逆向工程（从现有数据库生成文档）

## 输入输出

Input:
- `--sql-dir` (string): SQL增量脚本目录路径，默认读取配置文件 `sql_dir`
- `--output` (string): 输出Excel文件路径，默认读取配置文件 `output_dir` + `output_filename_pattern`
- `--config` (string): 配置文件路径，默认 `config/sql-change-config.json`
- `--project-root` (string): 项目根目录，默认当前目录

Output:
- Excel文件（3个Sheet）:
  - Sheet1 "DDL字段变更": 表明/字段名/字段中文名称/长度/操作类型/是否影响下游/核心是否已升级
  - Sheet2 "索引变更": 表明/索引名/索引字段/操作类型/是否影响下游/核心是否已升级
  - Sheet3 "DML配置数据变更": 配置表/操作类型/变更内容摘要/涉及ID/KEY/是否影响下游/核心是否已升级
- 控制台输出统计信息（文件数/变更行数/涉及表数）

## 执行步骤

### Step 1: 加载配置

1. 读取 `config/sql-change-config.json`
2. 解析项目根目录（环境变量 `BEMP_PROJECT_ROOT` 或命令行 `--project-root`）
3. 将配置中的相对路径解析为绝对路径
4. 验证SQL目录存在，不存在则终止并提示

**门禁**: SQL目录必须存在且包含 `.sql` 文件

### Step 2: 扫描SQL文件

1. 遍历SQL目录下所有文件
2. 按文件名后缀分类：
   - 以 `.ddl.sql` 结尾 → DDL文件列表
   - 以 `.dml.sql` 结尾 → DML文件列表
3. 按文件名排序（确保版本顺序）
4. 输出扫描统计

### Step 3: 解析DDL脚本

对每个DDL文件，按以下顺序提取（顺序重要：先提取COMMENT再提取结构）：

1. **提取COMMENT** → 建立字段中文名映射表
   - `COMMENT ON COLUMN tbl.col IS 'comment'` → `(table, column) → comment`
   - `COMMENT ON TABLE tbl IS 'comment'` → `table → comment`

2. **解析CREATE TABLE** → 新增表
   - 提取表名
   - 解析括号内字段定义（按顶层逗号分割，跳过约束行）
   - 每个字段提取：字段名、类型（规范化）、注释（从映射表查）
   - 操作类型标记为"新增表"

3. **解析ALTER TABLE ADD** → 新增字段
   - 括号形式：`ALTER TABLE tbl ADD (col1 type1, col2 type2)` → 逐字段提取
   - 单字段形式：`ALTER TABLE tbl ADD col type` → 单字段提取
   - 操作类型标记为"新增"

4. **解析ALTER TABLE MODIFY** → 修改字段
   - 提取表名+字段+新类型
   - 操作类型标记为"修改"

5. **解析ALTER TABLE DROP COLUMN** → 删除字段
   - 提取表名+字段名
   - 操作类型标记为"删除"

6. **解析CREATE INDEX** → 索引变更
   - 提取索引名+表名+索引字段
   - 区分"新增索引"（已有表）和"新增表索引"（新建表上的索引）

7. **解析DROP TABLE / DROP INDEX** → 删除操作

### Step 4: 解析DML脚本

对每个DML文件：

1. 从文件名提取需求描述（去掉版本号和时间戳部分）
2. 扫描所有 `DELETE FROM`、`INSERT INTO`、`UPDATE` 语句
3. **DELETE+INSERT合并**：同文件中对同表先DELETE后INSERT → 合并为"DELETE+INSERT"
4. 提取关键ID/KEY信息：
   - INSERT: 从列名列表中提取ID/DICT_GROUP_CODE/KEY/PROD_NO等列
   - UPDATE: 提取WHERE条件（截断至100字符）
5. 合并同表同操作类型的记录

### Step 5: 生成Excel

1. 创建Workbook，3个Sheet按配置命名
2. 每个Sheet写入表头（加粗+边框）和数据行（边框）
3. 设置列宽（从配置读取）
4. 保存到输出路径

**门禁**: 输出目录必须可写

### Step 6: 输出统计

打印汇总信息：
- DDL字段变更行数
- 索引变更行数
- DML配置变更行数
- 涉及表总数

## 失败处理

| 场景 | 处理策略 |
|------|---------|
| SQL目录不存在 | 终止，提示"SQL directory not found: {path}" |
| 配置文件不存在 | 终止，提示"Config file not found: {path}" |
| openpyxl未安装 | 终止，提示"pip install openpyxl" |
| SQL文件编码异常 | 跳过该文件，打印警告 |
| 输出路径不可写 | 终止，提示权限问题 |
| CREATE TABLE括号不匹配 | 跳过该表定义，打印警告 |
| 字段类型无法识别 | 保留原始类型字符串 |
| DML中无DELETE+INSERT模式 | 分别记录DELETE和INSERT |

## 配置文件说明

配置文件路径: `config/sql-change-config.json`

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| sql_dir | SQL增量脚本目录（相对项目根） | docs/脚本 |
| output_dir | 输出目录 | docs |
| output_filename_pattern | 输出文件名模式 | 表机构调整-增量脚本变更汇总.xlsx |
| project_root_env | 项目根目录环境变量名 | BEMP_PROJECT_ROOT |
| encoding | SQL文件编码 | utf-8 |
| sheets.ddl.name | DDL Sheet名称 | DDL字段变更 |
| sheets.ddl.headers | DDL Sheet列头 | 7列标准格式 |
| sheets.index.name | 索引Sheet名称 | 索引变更 |
| sheets.dml.name | DML Sheet名称 | DML配置数据变更 |
| sql_patterns.* | SQL正则匹配模式 | Oracle语法 |
| operation_type_map | 操作类型映射 | 中文标签 |
| merge_rules.delete_insert_same_table | 是否合并DELETE+INSERT | true |
| styles.header.fill_color | 标题头背景色 | #1F4E78（深蓝） |
| styles.header.font_color | 标题头字体色 | #FFFFFF（白色） |
| styles.header.bold | 标题头加粗 | true |
| styles.data.column_styles | 各列字体样式 | 按列名映射 |
| styles.border.color | 边框颜色 | #808080 |
| styles.row_height.header | 标题行高 | 25 |
| styles.row_height.data | 数据行高 | 20 |

### 样式配置结构

```json
{
  "styles": {
    "header": {
      "fill_color": "#1F4E78",      // 背景色（深蓝）
      "font_color": "#FFFFFF",       // 字体色（白色）
      "bold": true,                  // 加粗
      "size": 12,                    // 字号
      "alignment": "center",         // 水平对齐
      "vertical": "center"           // 垂直对齐
    },
    "data": {
      "default": {
        "font_color": "#000000",
        "size": 11
      },
      "column_styles": {
        "字段中文名称": { "font_color": "#008000", "bold": true },  // 绿色
        "长度":         { "font_color": "#0070C0", "bold": true },  // 蓝色
        "操作类型":     { "font_color": "#0070C0", "bold": true },  // 蓝色
        "索引名":       { "font_color": "#0070C0", "bold": true },
        "配置表":       { "font_color": "#0070C0", "bold": true }
      }
    },
    "border": { "style": "thin", "color": "#808080" },
    "row_height": { "header": 25, "data": 20 }
  }
}
```

**颜色方案参考**：
- 标题头背景 `#1F4E78`（Office 经典深蓝）
- 字段中文名 `#008000`（深绿，突出语义）
- 关键列（长度/类型/操作类型）`#0070C0`（Office 蓝）
- 边框 `#808080`（中性灰）

## 智能体操作指南

当用户要求分析SQL增量脚本变更时，按以下流程操作：

1. **确认输入**：确认SQL脚本目录路径，如用户未指定则使用配置默认值
2. **执行脚本**：
   ```bash
   python scripts/analyze_sql_changes.py --project-root d:\code\QJ\BEMP5.0DEV
   ```
3. **检查输出**：验证生成的Excel包含3个Sheet且数据行数 > 0
4. **补充人工列**：提醒用户填写"是否影响下游"和"核心是否已升级"列
5. **如需自定义**：修改 `config/sql-change-config.json` 中的配置项
