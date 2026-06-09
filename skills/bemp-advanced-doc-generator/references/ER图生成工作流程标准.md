# ER图生成工作流程标准

> 本文档定义了从数据库表结构采集到ER图导出的完整标准化工作流程，确保在不同项目中面临相同或相似需求时，能够严格遵循此流程并交付质量一致的标准化输出物。

---

## 一、适用范围

- BEMP票据系统及同类银行信息系统的数据库ER关系图生成
- 数据库为Oracle/MySQL，无显式外键约束或外键约束不完整的场景
- 需要输出可编辑源文件、位图、矢量图三种格式的ER图交付物

## 二、流程总览

```
Step 1 数据采集        Step 2 关系分析        Step 3 Mermaid编写
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 查询全量表清单 │───→│ 推断表间关系   │───→│ 编写erDiagram │
│ 查询主键约束   │    │ 按业务模块分组 │    │ 语法校验      │
│ 查询外键约束   │    │ 标注关联字段   │    │ 源文件保存    │
└──────────────┘    └──────────────┘    └──────────────┘
                                              │
Step 5 质量校验        Step 4 渲染导出         │
┌──────────────┐    ┌──────────────┐          │
│ 完整性校验    │←───│ 安装mermaid-cli│←─────────┘
│ 准确性校验    │    │ 配置puppeteer  │
│ 格式规范校验  │    │ 批量导出PNG/SVG│
└──────────────┘    └──────────────┘
```

---

## 三、Step 1 — 数据采集

### 3.1 采集内容

| 采集项 | 用途 | 优先级 |
|--------|------|--------|
| 全量表清单 | 确定ER图覆盖范围 | P0 |
| 表字段结构 | 识别关联字段 | P0 |
| 主键约束 | 确定实体唯一标识 | P0 |
| 外键约束 | 确定显式关联关系 | P1 |

### 3.2 Oracle SQL模板

**查询全量表清单：**

```sql
SELECT TABLE_NAME, NUM_ROWS
FROM ALL_TABLES
WHERE OWNER = '{SCHEMA_NAME}'
ORDER BY TABLE_NAME;
```

**查询表字段结构：**

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
FROM ALL_TAB_COLUMNS
WHERE OWNER = '{SCHEMA_NAME}'
  AND TABLE_NAME IN ({TARGET_TABLES})
ORDER BY TABLE_NAME, COLUMN_ID;
```

**查询主键约束：**

```sql
SELECT a.TABLE_NAME, a.CONSTRAINT_NAME, c.COLUMN_NAME
FROM ALL_CONSTRAINTS a
JOIN ALL_CONS_COLUMNS c ON a.OWNER = c.OWNER
  AND a.CONSTRAINT_NAME = c.CONSTRAINT_NAME
WHERE a.OWNER = '{SCHEMA_NAME}'
  AND a.CONSTRAINT_TYPE = 'P'
ORDER BY a.TABLE_NAME, c.POSITION;
```

**查询外键约束：**

```sql
SELECT a.TABLE_NAME AS FK_TABLE, c.COLUMN_NAME AS FK_COLUMN,
       b.TABLE_NAME AS PK_TABLE, a.CONSTRAINT_NAME
FROM ALL_CONSTRAINTS a
JOIN ALL_CONSTRAINTS b ON a.OWNER = b.OWNER
  AND a.R_CONSTRAINT_NAME = b.CONSTRAINT_NAME
JOIN ALL_CONS_COLUMNS c ON a.OWNER = c.OWNER
  AND a.CONSTRAINT_NAME = c.CONSTRAINT_NAME
WHERE a.OWNER = '{SCHEMA_NAME}'
  AND a.CONSTRAINT_TYPE = 'R'
ORDER BY a.TABLE_NAME;
```

### 3.3 异常处理

| 异常场景 | 处理策略 |
|----------|----------|
| 数据库连接中断（ORA-12571） | 验证Schema存在后重试，最多3次 |
| 查询超时 | 拆分复杂查询为小批次，按表名范围分页查询 |
| ORA-00904 标识符无效 | 检查表别名是否正确，避免列名歧义 |
| ORA-00918 未明确定义列 | 使用显式表名前缀替代describe_table |
| 外键约束查询结果为空 | 标记为"无显式FK"，进入隐式关系推断流程 |

---

## 四、Step 2 — 关系分析

### 4.1 关系推断策略

当数据库无显式外键约束时，按以下优先级推断表间关系：

| 优先级 | 推断方法 | 示例 |
|--------|----------|------|
| 1 | 字段命名约定 | TB_TRANS_INFO.BILL_ID → TB_BILL_INFO.ID |
| 2 | 业务语义匹配 | TE_CE_ACPT_BILL.BILL_ID → TB_BILL_INFO.ID |
| 3 | 表前缀归类 | TE_CE_* 属于承兑业务模块 |
| 4 | 人工确认 | 无法自动推断的模糊关系 |

### 4.2 关系类型判定

| 关系类型 | Mermaid语法 | 判定规则 |
|----------|-------------|----------|
| 一对多 | `\|\|--o{` | 子表外键字段允许重复值 |
| 一对一 | `\|\|--\|{` | 子表外键字段有唯一约束 |
| 多对多 | `}o--o{` | 需中间关联表 |

### 4.3 业务模块分组策略

BEMP系统标准分组（按表前缀）：

| 分组 | 表前缀 | 说明 |
|------|--------|------|
| 核心业务 | TB_BILL_INFO, TB_TRANS_INFO | 票据主表与交易流水 |
| 票据交易流转 | TE_CE_*, TE_DI_*, TE_SA_* | 承兑/贴现/卖出 |
| 审批流程 | TB_WF_*, TB_APPROVAL_* | 工作流与审批 |
| 授信管理 | TE_CREDIT_*, TB_CREDIT_* | 额度与授信 |
| 科目账务 | TB_ACCOUNT_*, TB_SUBJECT_* | 会计科目与账务 |
| 票据池化 | TE_PL_*, TE_PB_* | 票据池与质押 |
| ECDS对接 | TE_ECDS_*, TB_ECDS_* | 电子商业汇票系统 |

**分组原则：**
- 每组ER图实体数控制在5~15个，超过15个拆分子图
- 核心主表（如TB_BILL_INFO）可出现在多个分组中作为关联枢纽
- 每组必须有至少一个核心实体，不可仅包含辅助表

---

## 五、Step 3 — Mermaid ER图编写

### 5.1 语法规范

```
erDiagram
    表名 {
        字段名 数据类型 "说明"
        ...
    }
    表A ||--o{ 表B : "1对多 关联字段"
```

### 5.2 命名规范

| 项目 | 规范 | 示例 |
|------|------|------|
| 实体名 | 与数据库表名一致 | TB_BILL_INFO |
| 字段名 | 与数据库列名一致 | BILL_ID |
| 关系标签 | "基数 关联字段" | "1对多 BILL_ID" |
| 文件名 | ER_序号_分组名称.mmd | ER_01_核心业务ER关系图.mmd |

### 5.3 关系标注标准

```
表A ||--o{ 表B : "1对多 外键字段名"
表A ||--|| 表B : "1对1 外键字段名"
表A }o--o{ 表B : "多对多 中间表名"
```

**必须标注关联字段名**，不可仅写"关联"或"引用"。

### 5.4 源文件保存

每个ER图保存为独立的 `.mmd` 文件，存放于项目根目录：

```
{PROJECT_ROOT}/
├── ER_01_核心业务ER关系图.mmd
├── ER_02_票据交易流转ER关系图.mmd
├── ER_03_审批流程ER关系图.mmd
└── ...
```

---

## 六、Step 4 — 环境准备与渲染导出

### 6.1 mermaid-cli安装

**标准安装（需网络下载puppeteer内置Chrome）：**

```bash
npm install -g @mermaid-js/mermaid-cli
```

**离线/内网安装（跳过Chrome下载，使用本地Chrome）：**

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='true'
npm install -g @mermaid-js/mermaid-cli
```

### 6.2 puppeteer配置

创建 `puppeteer-config.json`，指向本地Chrome：

```json
{
  "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
```

**Chrome路径探测（PowerShell）：**

```powershell
$paths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
foreach ($p in $paths) { if (Test-Path $p) { Write-Host "FOUND: $p" } }
```

### 6.3 导出命令

**导出PNG位图：**

```bash
mmdc -i "ER_01_核心业务ER关系图.mmd" -o "ER_01_核心业务ER关系图.png" -p puppeteer-config.json -w 1920 -H 1080 --backgroundColor white
```

**导出SVG矢量图：**

```bash
mmdc -i "ER_01_核心业务ER关系图.mmd" -o "ER_01_核心业务ER关系图.svg" -p puppeteer-config.json --backgroundColor white
```

**批量导出脚本（PowerShell）：**

```powershell
$files = Get-ChildItem -Path "." -Filter "ER_*.mmd"
foreach ($f in $files) {
    $base = $f.BaseName
    mmdc -i $f.FullName -o "$base.png" -p puppeteer-config.json -w 1920 -H 1080 --backgroundColor white
    mmdc -i $f.FullName -o "$base.svg" -p puppeteer-config.json --backgroundColor white
    Write-Host "Exported: $base.png + $base.svg"
}
```

### 6.4 常见问题与解决

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| puppeteer下载Chrome失败 | 网络限制/防火墙 | 设置 `$env:PUPPETEER_SKIP_DOWNLOAD='true'` + 配置本地Chrome路径 |
| EPERM: operation not permitted | npm缓存锁文件 | 删除 `node_modules` 后重试 |
| Input file doesn't exist | mmdc工作目录不匹配 | 使用文件绝对路径 |
| 渲染空白 | Mermaid语法错误 | 先在浏览器中验证语法 |
| 中文乱码 | 系统缺少中文字体 | 安装Microsoft YaHei字体 |

### 6.5 备选方案

当mermaid-cli不可用时，按以下优先级选择备选：

| 优先级 | 方案 | 步骤 |
|--------|------|------|
| 1 | 浏览器渲染+截图 | 创建HTML嵌入Mermaid CDN → 启动本地HTTP服务 → agent-browser截图 |
| 2 | 在线编辑器 | 将.mmd内容粘贴至 https://mermaid.live 编辑器导出 |
| 3 | IDE插件 | VS Code安装Mermaid Preview插件，右键导出 |

---

## 七、Step 5 — 质量校验

### 7.1 完整性校验

| 校验项 | 标准 | 方法 |
|--------|------|------|
| 表覆盖 | 核心业务表100%覆盖 | 核对全量表清单 |
| 关系覆盖 | 每个核心表至少1条关系 | 检查erDiagram关系行数 |
| 字段覆盖 | 主键+外键字段必须列出 | 检查实体字段定义 |
| 分组覆盖 | 所有业务模块均有对应ER图 | 核对模块分组表 |

### 7.2 准确性校验

| 校验项 | 标准 | 方法 |
|--------|------|------|
| 关系基数 | 与实际业务逻辑一致 | 交叉验证数据库约束 |
| 关联字段 | 标注字段名与数据库一致 | 对比ALL_TAB_COLUMNS |
| 实体命名 | 与数据库表名完全一致 | 逐表核对 |

### 7.3 格式规范校验

| 校验项 | 标准 |
|--------|------|
| PNG分辨率 | ≥1920×1080，白色背景 |
| SVG渲染 | 浏览器打开无空白/截断 |
| 文件命名 | ER_序号_分组名称.扩展名 |
| 源文件可编辑 | .mmd文件可用mmdc重新渲染 |

---

## 八、关键决策点汇总

| 决策点 | 决策条件 | 选项A | 选项B | 推荐选择 |
|--------|----------|-------|-------|----------|
| 无显式FK时如何建关系 | 外键约束查询为空 | 隐式推断 | 跳过关系 | 隐式推断（标注"推断"） |
| ER图分组粒度 | 表数量>15 | 拆分子图 | 合并为大图 | 拆分子图 |
| 导出格式选择 | 需打印/嵌入文档 | SVG矢量图 | PNG位图 | 两者均输出 |
| mermaid-cli不可用 | 安装失败 | 浏览器截图 | 在线编辑器 | 浏览器截图 |
| 核心表重复出现在多组 | 核心表被多模块引用 | 重复出现 | 仅出现一次 | 重复出现（保持每组图完整性） |

---

## 九、输出物清单

| 序号 | 输出物 | 格式 | 用途 | 必选 |
|------|--------|------|------|------|
| 1 | Mermaid源文件 | .mmd | 可编辑、可重新渲染 | 是 |
| 2 | ER关系图（位图） | .png | 通用查看、嵌入文档 | 是 |
| 3 | ER关系图（矢量图） | .svg | 高清打印、无损缩放 | 是 |
| 4 | puppeteer配置 | puppeteer-config.json | mermaid-cli渲染配置 | 条件必选 |
| 5 | 数据库表清单文档 | .md | 全量表清单与分类 | 是 |

### 文件命名规范

```
ER_{两位序号}_{业务模块名称}ER关系图.{扩展名}
```

示例：
- `ER_01_核心业务ER关系图.mmd`
- `ER_01_核心业务ER关系图.png`
- `ER_01_核心业务ER关系图.svg`

---

## 十、附录

### A. Mermaid ER图语法速查

```
erDiagram
    CUSTOMER ||--o{ ORDER : "1对多 CUSTOMER_ID"
    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER ||--|{ LINE_ITEM : "1对多 ORDER_ID"
    ORDER {
        int id PK
        int customer_id FK
        date order_date
    }
    LINE_ITEM {
        int id PK
        int order_id FK
        string product_name
        int quantity
    }
```

**关系类型：**

| 语法 | 含义 |
|------|------|
| `\|\|--\|\|` | 一对一 |
| `\|\|--o{` | 一对多 |
| `}o--o{` | 多对多 |
| `\|\|--o{` | 一对零或多 |
| `}o--\|\|` | 零或多对一 |

**字段标记：**

| 标记 | 含义 |
|------|------|
| PK | 主键 |
| FK | 外键 |
| UK | 唯一键 |

### B. 完整puppeteer-config.json模板

```json
{
  "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "args": [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
}
```

### C. 浏览器渲染备选方案HTML模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>ER关系图</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            er: {
                diagramPadding: 20,
                layoutDirection: 'TB',
                minEntityWidth: 100,
                minEntityHeight: 75,
                entityPadding: 15,
                stroke: 'gray',
                fill: 'honeydew',
                fontSize: 12
            }
        });
    </script>
    <style>
        .er-container { margin: 40px auto; max-width: 1200px; page-break-after: always; }
        h2 { text-align: center; color: #333; font-family: "Microsoft YaHei", sans-serif; }
    </style>
</head>
<body>
    <div class="er-container">
        <h2>ER_01 核心业务ER关系图</h2>
        <pre class="mermaid">
erDiagram
    TB_BILL_INFO ||--o{ TB_TRANS_INFO : "1对多 BILL_ID"
        </pre>
    </div>
</body>
</html>
```

### D. 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-18 | 初始版本，基于BEMP项目实践提炼 |
