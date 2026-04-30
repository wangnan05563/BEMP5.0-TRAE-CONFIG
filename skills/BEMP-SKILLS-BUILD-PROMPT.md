# BEMP Skills 构建提示词合集

## 目录

1. [bemp-advanced-doc-generator Skill 构建提示词](#一bemp-advanced-doc-generator-skill-构建提示词)
2. [hnnx-personalized-dev Skill 构建提示词](#二hnnx-personalized-dev-skill-构建提示词)

---

# 一、bemp-advanced-doc-generator Skill 构建提示词

## 1. 项目概述

### 1.1 Skill 名称
**bemp-advanced-doc-generator**（BEMP 高级文档生成器）

### 1.2 核心定位
基于参考 Word 模板文档格式，自动生成 BEMP 业务功能详细设计文档和测试用例的专业工具。V2.0 版本新增智能场景识别、ProcessOn MCP 集成、自定义模板系统等功能，能够根据不同的业务场景需求自动生成高质量的流程图或思维导图等可视化文档。

### 1.3 目标用户
- BEMP 项目开发团队成员
- 需要快速生成技术文档的开发人员
- 需要进行文档标准化的测试人员
- 需要可视化文档的产品经理

---

## 2. 核心功能需求

### 2.1 文档生成功能

#### 2.1.1 支持生成的文档类型
1. **详细设计文档** - 包含 8 个标准章节
2. **测试用例文档** - 包含 7 个标准章节
3. **可视化文档** - 流程图或思维导图

#### 2.1.2 详细设计文档结构（8 章节）
| 章节 | 内容要求 | 必需元素 |
|------|----------|----------|
| 系统概述 | 业务背景、设计目标、范围说明 | 业务背景≥3行、设计目标≥2条、范围说明≥2条 |
| 功能模块划分 | 模块职责、层级关系、接口边界 | 模块划分≥3个、职责描述完整 |
| 核心业务流程 | 流程图、时序图、关键节点说明 | 流程图≥1张、时序图≥2张、关键节点说明≥5条 |
| 数据模型设计 | ER图、数据字典、存储策略 | ER图≥1张、数据字典≥10条 |
| 接口定义 | API规范、参数说明、调用示例 | API接口≥3个、参数说明完整 |
| 异常处理机制 | 错误码定义、处理流程、恢复策略 | 错误码≥5个、处理流程图≥1张 |
| 安全策略 | 认证授权、数据加密、访问控制 | 安全措施≥3条 |
| 技术实现细节 | 核心算法、关键代码片段、性能优化 | 核心代码≥5行、注释完整 |

#### 2.1.3 测试用例文档结构（7 章节）
| 章节 | 内容要求 | 必需元素 |
|------|----------|----------|
| 引言 | 编写目的、背景说明、定义、参考资料 | 编写目的≥2条、背景说明≥3行 |
| 测试计划 | 测试范围、测试目标、测试资源、测试进度 | 测试范围明确、测试目标≥3条 |
| 测试环境 | 硬件环境、软件环境、测试工具 | 硬件、软件、测试工具说明完整 |
| 功能测试用例 | 正常场景、异常场景、边界值测试 | 正常场景≥5条、异常场景≥3条、边界值≥3条 |
| 性能测试用例 | 负载测试、压力测试、稳定性测试 | 各≥1条 |
| 安全测试用例 | 认证测试、授权测试、数据加密测试 | 各≥1条 |
| 测试执行结果 | 测试执行情况、缺陷统计、测试结论 | 完整记录 |

#### 2.1.4 可视化文档类型
| 图表类型 | 必需元素 |
|----------|----------|
| 流程图 | 节点≥5个、连接线清晰、决策点明确 |
| 思维导图 | 中心主题明确、分支≥3层、层级关系清晰 |

### 2.2 输出格式要求

#### 2.2.1 双格式输出
- **Markdown (.md)** - 便于版本控制和在线查看
- **Word (.docx)** - 正式交付文档格式

#### 2.2.2 文档格式标准
| 项目 | 标准 |
|------|------|
| 文件格式 | Markdown (.md) 和 Word (.docx) |
| 页面设置 | A4 纵向，边距上下 2.54cm，左右 3.17cm |
| 标题样式 | 一级黑体三号，二级黑体四号，三级黑体小四号 |
| 正文字体 | 宋体小四号，1.5 倍行距 |
| 表格样式 | 表头黑体五号加粗，内容宋体五号 |
| 图表编号 | 图 X-Y、表 X-Y |

### 2.3 智能场景识别功能

#### 2.3.1 场景识别机制
- 根据输入内容自动判断适合生成流程图还是思维导图
- 分析内容特征（关键词、结构、长度等）
- 选择合适的可视化类型

#### 2.3.2 流程图特征关键词
- 流程、步骤、顺序、判断、决策、分支、循环
- 开始、结束、处理、输入、输出、条件、执行
- mermaid、flow、sequence、时序、泳道、bpmn

#### 2.3.3 思维导图特征关键词
- 思维导图、中心主题、分支、层级、概念、知识
- 结构、组织、大纲、树状、树形、金字塔、分类

#### 2.3.4 识别逻辑
1. 统计关键词匹配得分
2. 根据内容长度和结构加权
3. 检测明显的格式标记
4. 综合评分决定图表类型

### 2.4 ProcessOn MCP 集成功能

#### 2.4.1 核心功能
- 调用 ProcessOn API 创建可视化文档
- 支持流程图和思维导图两种类型
- 提供错误处理和重试机制

#### 2.4.2 错误处理机制
- 自动重试（默认 3 次）
- 指数退避延迟
- 详细错误日志记录

---

## 3. 技术架构规范

### 3.1 技术栈要求

#### 3.1.1 运行环境
- **Node.js** v12+（推荐 v14+）
- **npm** v6+ 或 **yarn**

#### 3.1.2 核心依赖包
| 包名 | 版本 | 用途 |
|------|------|------|
| docx | ^8.5.0 | Word 文档生成 |
| axios | ^1.6.0 | HTTP 请求（ProcessOn API） |
| dotenv | ^16.3.0 | 环境变量管理 |

#### 3.1.3 开发依赖
- 无需特殊开发依赖
- 使用原生 Node.js API

### 3.2 目录结构规范

```
bemp-advanced-doc-generator/
├── SKILL.md                            # 技能主文件（必需）
├── README.md                           # 使用指南（可选）
├── references/                         # 参考文档目录
│   ├── 文档格式标准.md               # 页面设置、文字样式、表格图表规范
│   ├── 内容结构标准.md               # 各章节内容结构要求
│   └── 技术术语表.md                 # 票据业务、系统模块、接口协议术语
├── scripts/                            # 脚本目录
│   ├── generate-doc.js               # 文档生成主脚本（核心）
│   ├── processon-integration.js      # ProcessOn MCP 集成模块
│   ├── cli.js                        # 命令行接口
│   ├── interactive-cli.js            # 交互式命令行界面
│   └── package.json                  # npm 配置
├── assets/                             # 资源目录
│   ├── 详细设计文档模板.json         # 详细设计 JSON 模板
│   ├── 测试用例模板.json             # 测试用例 JSON 模板
│   ├── templates/                    # 可视化文档模板目录
│   │   ├── default_mindmap.json      # 默认思维导图模板
│   │   └── default_flowchart.json    # 默认流程图模板
│   └── 启金供应链票据管理平台软件V1.0-供应链票据-企业端-撤票业务详细设计.doc  # 参考 Word 文档
└── output/                             # 输出目录
    └── (生成的文档)
```

### 3.3 核心类设计

#### 3.3.1 DocumentGenerator 类
```javascript
class DocumentGenerator {
    constructor(templatePath) {
        this.templatePath = templatePath;
        this.template = this.loadTemplate(templatePath);
    }

    loadTemplate(templatePath) { /* 加载 JSON 模板 */ }
    replacePlaceholders(obj, replacements) { /* 替换占位符 */ }
    createParagraph(text, options) { /* 创建段落 */ }
    createHeading(text, level) { /* 创建标题 */ }
    createTable(headers, rows) { /* 创建表格 */ }
    generateDesignDoc(moduleName, outputPath) { /* 生成详细设计文档 */ }
    generateTestCaseDoc(moduleName, outputPath) { /* 生成测试用例文档 */ }
}
```

#### 3.3.2 VisualizationGenerator 类
```javascript
class VisualizationGenerator {
    constructor(apiKey, apiBase) {
        this.apiKey = apiKey;
        this.apiBase = apiBase;
        this.retryCount = 3;
        this.retryDelay = 1000;
    }

    async detectScene(content) { /* 场景识别 */ }
    async generateFlowchart(content, template) { /* 生成流程图 */ }
    async generateMindmap(content, template) { /* 生成思维导图 */ }
    async callProcessOnAPI(type, content) { /* 调用 ProcessOn API */ }
    async retryOperation(operation) { /* 重试机制 */ }
}
```

### 3.4 配置文件结构

#### 3.4.1 package.json
```json
{
  "name": "bemp-advanced-doc-generator",
  "version": "2.0.0",
  "description": "BEMP 高级文档生成器",
  "main": "scripts/generate-doc.js",
  "scripts": {
    "start": "node scripts/cli.js",
    "interactive": "node scripts/interactive-cli.js",
    "start-mcp": "node scripts/processon-integration.js --mcp"
  },
  "dependencies": {
    "docx": "^8.5.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.0"
  },
  "engines": {
    "node": ">=12.0.0"
  }
}
```

#### 3.4.2 文档模板 JSON 结构
```json
{
  "documentType": "design|testcase",
  "version": "1.0",
  "chapters": [
    {
      "title": "章节标题",
      "level": 1,
      "content": "章节内容模板",
      "required": true,
      "elements": {
        "paragraphs": [],
        "tables": [],
        "images": []
      }
    }
  ],
  "styles": {
    "heading1": { "font": "SimHei", "size": 32, "bold": true },
    "heading2": { "font": "SimHei", "size": 28, "bold": true },
    "heading3": { "font": "SimHei", "size": 24, "bold": true },
    "body": { "font": "SimSun", "size": 24 }
  }
}
```

---

## 4. 实现细节规范

### 4.1 Word 文档生成规范

#### 4.1.1 页面设置
```javascript
const DXA_PER_INCH = 1440;
const A4_WIDTH = 11906;   // 约 21cm
const A4_HEIGHT = 16838;  // 约 29.7cm

const pageSettings = {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    margin: {
        top: DXA_PER_INCH,      // 2.54cm
        right: DXA_PER_INCH * 1.25,  // 3.17cm
        bottom: DXA_PER_INCH,
        left: DXA_PER_INCH * 1.25
    }
};
```

#### 4.1.2 字体规范
| 元素 | 字体 | 字号 | 加粗 |
|------|------|------|------|
| 一级标题 | 黑体 (SimHei) | 16pt (32 half-points) | 是 |
| 二级标题 | 黑体 (SimHei) | 14pt (28 half-points) | 是 |
| 三级标题 | 黑体 (SimHei) | 12pt (24 half-points) | 是 |
| 正文 | 宋体 (SimSun) | 12pt (24 half-points) | 否 |
| 表格表头 | 黑体 (SimHei) | 10.5pt (21 half-points) | 是 |
| 表格内容 | 宋体 (SimSun) | 10.5pt (21 half-points) | 否 |

#### 4.1.3 表格样式
```javascript
const TABLE_BORDER = { 
    style: BorderStyle.SINGLE, 
    size: 1, 
    color: "000000" 
};

const TABLE_BORDERS = { 
    top: TABLE_BORDER, 
    bottom: TABLE_BORDER, 
    left: TABLE_BORDER, 
    right: TABLE_BORDER 
};
```

### 4.2 命令行接口规范

#### 4.2.1 参数解析
```javascript
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        type: 'design',           // design | testcase
        module: '业务功能',       // 模块名称
        format: 'both',           // both | docx | md
        visualization: true,      // true | false
        template: 'default',      // 模板名称
        interactive: false        // true | false
    };
    // 解析逻辑...
    return options;
}
```

#### 4.2.2 参数说明
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--type` | string | 否 | design | 文档类型：design（详细设计）或 testcase（测试用例） |
| `--module` | string | 否 | 业务功能 | 业务模块名称 |
| `--format` | string | 否 | both | 输出格式：both（两种）、docx（仅 Word）、md（仅 Markdown） |
| `--visualization` | boolean | 否 | true | 是否生成可视化文档 |
| `--template` | string | 否 | default | 使用的模板名称 |
| `--interactive` | flag | 否 | false | 启动交互式界面 |
| `--help` | flag | 否 | false | 显示帮助信息 |

### 4.3 ProcessOn API 集成规范

#### 4.3.1 API 调用流程
```
1. 准备内容数据
2. 检测场景类型（流程图/思维导图）
3. 加载对应模板
4. 构建 API 请求体
5. 调用 ProcessOn API
6. 处理响应结果
7. 错误处理和重试
```

#### 4.3.2 环境变量配置
```bash
# Windows
set PROCESSON_API_KEY=your_api_key_here
set PROCESSON_API_BASE=https://www.processon.com
set PROCESSON_RETRY_COUNT=3
set PROCESSON_RETRY_DELAY=1000

# Linux/Mac
export PROCESSON_API_KEY=your_api_key_here
export PROCESSON_API_BASE=https://www.processon.com
export PROCESSON_RETRY_COUNT=3
export PROCESSON_RETRY_DELAY=1000

# 或创建 .env 文件
echo "PROCESSON_API_KEY=your_api_key_here" > .env
```

#### 4.3.3 错误码处理
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| -32001 | MCP 调用超时 | 增加重试次数或检查网络连接 |
| EACCES | 文件权限错误 | 检查输出目录权限 |
| ENOENT | 文件不存在 | 检查文件路径是否正确 |
| ECONNREFUSED | 连接被拒绝 | 检查 ProcessOn 服务是否启动 |

---

## 5. 集成要求

### 5.1 IDE 集成

#### 5.1.1 VSCode/Trae 集成
- 作为 Skill 集成到 IDE
- 通过命令面板触发
- 支持文件右键菜单（可选）

#### 5.1.2 命令调用方式
```bash
# 直接调用
node scripts/cli.js --type design --module "机构批量导入"

# 交互式调用
node scripts/interactive-cli.js
```

### 5.2 外部服务集成

#### 5.2.1 ProcessOn 集成
- API Key 管理
- 请求限流处理
- 响应格式解析
- 错误重试机制

#### 5.2.2 BEMP 项目集成
- 扫描工作空间代码
- 读取项目配置
- 提取业务模块信息

---

## 6. 性能指标

### 6.1 文档生成性能

#### 6.1.1 生成时间（参考值）
| 文档类型 | 简单模块 | 复杂模块 |
|----------|----------|----------|
| 详细设计文档 | 5-10 秒 | 15-30 秒 |
| 测试用例文档 | 3-8 秒 | 10-20 秒 |
| 可视化文档 | 10-20 秒 | 30-60 秒 |

#### 6.1.2 资源占用
- 内存占用：< 200 MB
- CPU 占用：< 50%（单核）
- 磁盘 I/O：根据输出文件大小

### 6.2 API 调用性能

#### 6.2.1 ProcessOn API
- 连接超时：10 秒
- 读取超时：30 秒
- 重试次数：3 次
- 重试延迟：指数退避（1s, 2s, 4s）

---

## 7. 测试标准

### 7.1 功能测试

#### 7.1.1 文档生成测试
- [ ] 能够正确加载 JSON 模板
- [ ] 能够正确生成 Word 文档
- [ ] 能够正确生成 Markdown 文档
- [ ] 能够正确替换占位符
- [ ] 能够正确应用样式

#### 7.1.2 命令行测试
- [ ] 所有参数能够正确解析
- [ ] 帮助信息能够正确显示
- [ ] 交互式界面能够正常工作
- [ ] 错误参数能够正确提示

#### 7.1.3 可视化文档测试
- [ ] 场景识别准确
- [ ] 流程图能够正确生成
- [ ] 思维导图能够正确生成
- [ ] 模板能够正确加载

### 7.2 异常测试

#### 7.2.1 文件异常
- [ ] 模板文件不存在时给出明确错误
- [ ] 输出目录不存在时自动创建
- [ ] 文件权限不足时给出明确错误

#### 7.2.2 API 异常
- [ ] API Key 无效时给出明确错误
- [ ] 网络超时能够正确重试
- [ ] API 限流能够正确处理

### 7.3 兼容性测试

#### 7.3.1 Node.js 版本兼容
- [ ] Node.js 12.x
- [ ] Node.js 14.x
- [ ] Node.js 16.x
- [ ] Node.js 18.x

#### 7.3.2 操作系统兼容
- [ ] Windows 10
- [ ] Windows 11
- [ ] macOS（可选）
- [ ] Linux（可选）

---

## 8. 兼容性要求

### 8.1 运行环境兼容

#### 8.1.1 必需环境
- Node.js >= 12.0.0
- npm >= 6.0.0

#### 8.1.2 可选环境
- ProcessOn API Key（用于可视化文档）
- .env 文件（用于环境变量配置）

### 8.2 字体兼容

#### 8.2.1 中文字体要求
- Windows 系统需安装 SimSun（宋体）和 SimHei（黑体）
- 或使用系统默认中文字体作为后备

#### 8.2.2 字体后备方案
```javascript
const FONT_FALLBACK = {
    chinese: ['SimSun', '宋体', 'NSimSun', 'FangSong', 'STFangsong'],
    heading: ['SimHei', '黑体', 'Microsoft YaHei', '微软雅黑']
};
```

---

## 9. 使用示例

### 9.1 生成详细设计文档

```bash
# 进入脚本目录
cd .trae/skills/bemp-advanced-doc-generator/scripts

# 生成 Markdown 和 Word 两种格式
node cli.js --type design --module "机构批量导入" --format both

# 仅生成 Word 格式
node cli.js --type design --module "机构批量导入" --format docx

# 仅生成 Markdown 格式
node cli.js --type design --module "机构批量导入" --format md

# 启动交互式界面
node cli.js --interactive
```

### 9.2 生成测试用例文档

```bash
# 生成 Markdown 和 Word 两种格式
node cli.js --type testcase --module "机构批量导入" --format both

# 仅生成 Word 格式
node cli.js --type testcase --module "机构批量导入" --format docx

# 仅生成 Markdown 格式
node cli.js --type testcase --module "机构批量导入" --format md
```

### 9.3 可视化文档生成

```bash
# 生成可视化文档（默认启用）
node cli.js --type design --module "机构批量导入" --visualization true

# 不生成可视化文档
node cli.js --type design --module "机构批量导入" --visualization false

# 使用自定义模板
node cli.js --type design --module "机构批量导入" --template my_template
```

---

## 10. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| V2.0.0 | 2026-04-14 | 新增智能场景识别机制<br>新增 ProcessOn MCP 集成<br>新增自定义模板系统<br>新增错误处理和重试机制<br>新增交互式命令行界面<br>优化用户交互体验 |
| V1.0.0 | 2026-04-14 | 初始版本，基于参考 Word 模板的高级文档生成器 |

---

# 二、hnnx-personalized-dev Skill 构建提示词

## 1. 项目概述

### 1.1 Skill 名称
**hnnx-personalized-dev**（河南农信个性化开发 Skill）

### 1.2 核心定位
专门用于河南农信（hnnxbank）个性化功能开发，遵循 BEMP 项目规范和河南农信个性化开发要求，提供标准化的开发流程和质量控制。

### 1.3 目标用户
- 河南农信个性化功能开发人员
- 需要遵循 BEMP 项目规范的开发者
- 需要进行个性化代码审查的审核人员

---

## 2. 核心功能需求

### 2.1 开发流程管理

#### 2.1.1 三阶段开发流程
1. **第一阶段：需求分析与规范确认**
   - 需求理解
   - 规范检查
   - 参考分析

2. **第二阶段：开发实施**
   - 后端开发
   - 前端开发
   - 功能实现

3. **第三阶段：质量控制**
   - SonarQube 代码扫描
   - 代码审查
   - 编译验证
   - 功能验证

#### 2.1.2 规范检查清单
- [ ] 检查 banks/ext-hnnxbank 目录下是否有可复用的带 @CustomizedBean 注解的个性化类
- [ ] 检查 frontend/src/views/bizViews/banks/hnnxbank 目录下是否有对应的个性化 Vue 文件
- [ ] 检查是否有同类功能的实现可供参考
- [ ] 明确国际化范围（按钮/标签需要国际化，提示信息等保持硬编码）

### 2.2 后端开发规范

#### 2.2.1 开发目录要求
- **强制要求**：所有后端代码必须在 `banks/ext-hnnxbank` 目录下
- **禁止行为**：不允许在其他目录下开发

#### 2.2.2 Controller 开发规范
| 项目 | 规范 |
|------|------|
| 继承关系 | 应继承 BaseController |
| 注解 | 不应添加 @CustomizedBean 注解 |
| 命名规则 | Hnnx[原类名]，与产品化 Controller 并存 |
| 请求参数 | 使用 BaseRequest 作为请求参数类 |
| 参数获取 | 增强参数获取逻辑，兼容多种参数格式（extParam、requestDto、直接参数等） |

#### 2.2.3 DTO 设计与使用规范

**命名规范：**
- 请求 DTO：`Hnnx` + `功能名` + `Req`
- 响应 DTO：`Hnnx` + `功能名` + `Resp`
- 查询 DTO：`Hnnx` + `功能名` + `QueryDto`

**DTO 必备元素：**
```java
public class HnnxBatchCopyRoleReq implements Serializable {
    private static final long serialVersionUID = 1L;
    
    // 字段定义
    private String sourceUserNo;
    private String targetUserNos;
    
    // 必须提供无参构造（默认即可）
    
    // 必须提供 getter/setter
    public String getSourceUserNo() {
        return sourceUserNo;
    }
    
    public void setSourceUserNo(String sourceUserNo) {
        this.sourceUserNo = sourceUserNo;
    }
    
    // 建议提供 toString 方法（便于日志输出）
    @Override
    public String toString() {
        return "HnnxBatchCopyRoleReq{" +
                "sourceUserNo='" + sourceUserNo + '\'' +
                ", targetUserNos='" + targetUserNos + '\'' +
                '}';
    }
}
```

**DTO 存放位置：**
- 请求 DTO：`banks/ext-hnnxbank/hnnxbank-biz-api/src/main/java/.../dto/`
- 响应 DTO：同上
- 内部使用 DTO：可放在实现类的同级目录

#### 2.2.4 Spring MVC 参数绑定规范

**参数接收方式选择：**
| 场景 | 推荐方式 | 说明 |
|------|---------|------|
| 简单参数（1-3个） | 直接使用 DTO 对象 | Spring MVC 自动绑定 form-data 参数 |
| 复杂参数（嵌套对象） | @RequestBody + DTO | 接收 JSON 格式数据 |
| 文件上传 | MultipartFile + DTO | 处理文件流数据 |
| 通用查询 | BaseRequest<T> | 兼容现有产品化代码 |

**正确示例：**
```java
@RequestMapping(value = "/func_batchCopyRole", method = {RequestMethod.POST})
@ResponseBody
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    // Spring MVC 自动将 form-data 参数绑定到 DTO 对象属性
    String sourceUserNo = req.getSourceUserNo();
    String targetUserNos = req.getTargetUserNos();
}
```

**前端参数传递格式（form-data）：**
```javascript
let params = {
  sourceUserNo: this.form.sourceUserNo,
  targetUserNos: this.form.targetUserNos
};
post(params, "/hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole");
```

#### 2.2.5 服务调用与数据完整性规范

**数据完整性检查清单：**
- [ ] 主键字段（如 userNo）已设置
- [ ] 外键字段（如 legalNo、brchNo）已设置
- [ ] 业务必需字段（如 roleIds）已设置
- [ ] 类型标识字段（如 userType）已设置
- [ ] 关联查询字段（如 brchNo 用于查询机构）已设置

**服务方法调研步骤：**
1. 查看接口定义：了解参数要求和返回值
2. 查看实现逻辑：了解内部调用的其他服务和必需的字段
3. 查看示例代码：参考项目中已有的调用示例
4. 测试验证：单元测试验证参数完整性

#### 2.2.6 日志记录规范

**日志级别使用：**
- **ERROR**：系统错误、业务异常、关键操作失败
- **WARN**：警告信息、非关键错误、潜在问题
- **INFO**：重要业务操作、流程节点、参数信息
- **DEBUG**：调试信息、详细流程（生产环境关闭）

**日志内容规范：**
```java
// 方法入口日志
LOGGER.info("开始执行批量复制角色操作");

// 参数日志（关键参数）
LOGGER.info("获取到的参数 - sourceUserNo: {}, targetUserNos: {}", sourceUserNo, targetUserNos);

// 成功日志
LOGGER.info("批量复制角色成功，源用户：{}，目标用户：{}", sourceUserNo, targetUserNo);

// 错误日志
LOGGER.error("批量复制角色失败，目标用户号：{}，错误：{}", targetUserNo, e.getMessage());
```

**日志注意事项：**
- 敏感信息（密码、密钥）禁止记录
- 大对象（List/Map）使用 toString() 前考虑大小
- 异常日志必须包含异常对象：`LOGGER.error("msg", e)`
- 生产环境 DEBUG 日志需关闭

### 2.3 前端开发规范

#### 2.3.1 开发目录要求
- **强制要求**：所有前端代码必须在 `frontend/src/views/bizViews/banks/hnnxbank` 目录下
- **禁止行为**：不允许在其他目录下开发

#### 2.3.2 开发流程
1. 检查是否有对应的个性化 Vue 文件，有则复用
2. 如无，则新增 Vue 文件，名称和目录结构与原产品化文件保持一致
3. 在 `frontend/src/api/bank/hnnxbankIndex.js` 中维护路径映射关系

#### 2.3.3 UI 风格标准
- 参考同目录下已有组件的实现方式
- 保持与现有组件相同的 UI 风格
- 超链接风格、输入框风格等保持一致

#### 2.3.4 参数传递标准
- **前端参数传递**：使用 requestDto 格式传递参数
- **格式**：`{ requestDto: { 参数1: 值1, 参数2: 值2 } }`

#### 2.3.5 组件复用原则
- 优先复用已有的组件
- 如需新建组件，参考现有组件结构
- 保持相同的编码范式

### 2.4 国际化规范

#### 2.4.1 国际化范围
| 元素类型 | 是否国际化 | 说明 |
|----------|------------|------|
| 按钮文本 | 必须 | 所有按钮必须国际化 |
| 标签文本 | 必须 | 所有标签必须国际化 |
| 弹窗标题 | 必须 | 弹窗标题必须国际化 |
| placeholder | 保持硬编码 | 输入框提示保持硬编码 |
| 提示信息 | 保持硬编码 | 提示信息保持硬编码 |
| 确认对话框内容 | 保持硬编码 | 确认对话框内容保持硬编码 |

#### 2.4.2 国际化实现步骤
1. 先在 `zh-CN.js` 中添加国际化文本
2. 遵循现有国际化键值命名规范
3. 在 Vue 中使用 `$t()` 方法调用
4. 检查是否已有可复用的国际化文本，如有则复用

#### 2.4.3 国际化检查清单
- [ ] 所有按钮名称和文本都已写入国际化文件
- [ ] 没有硬编码的按钮和标签文本
- [ ] 国际化键值命名规范一致
- [ ] 正确使用 `$t()` 方法调用国际化文本

### 2.5 质量控制流程

#### 2.5.1 SonarQube 代码扫描
- 使用 SonarQube MCP 扫描新开发的代码
- 扫描范围：`banks/ext-hnnxbank` 目录下的所有新增和修改的代码
- 修复扫描发现的所有问题：
  - 阻断性问题（Blocker）：必须立即修复
  - 严重问题（Critical）：必须修复
  - 重要问题（Major）：建议修复
  - 次要问题（Minor）：可选修复
- 重新扫描确认问题已修复

#### 2.5.2 代码审查
- 后端调用 `bemp-backend-code-review` Skill
- 前端调用 `bemp-frontend-code-review` Skill

#### 2.5.3 编译验证
- 执行 Maven 打包确保编译通过
- 检查是否有编译错误或警告
- 确认修改的 class 文件已生成

#### 2.5.4 功能验证
- 验证功能是否按需求实现
- 检查异常提示是否准确
- 验证国际化是否生效（按钮和标签已国际化）
- 验证 UI 风格与现有组件一致
- 验证参数传递格式正确（requestDto）

---

## 3. 技术架构规范

### 3.1 技术栈要求

#### 3.1.1 后端技术栈
| 技术 | 版本 | 说明 |
|------|------|------|
| Java | 1.8 | 语法编码 |
| Spring Boot | 参考 bom/import-bom/pom.xml | 框架版本 |
| Maven | 3.6+ | 构建工具 |

#### 3.1.2 前端技术栈
| 技术 | 版本 | 说明 |
|------|------|------|
| Vue.js | 参考 frontend/package.json | 前端框架 |
| Node.js | 14.x | 运行环境 |
| npm | 6.x | 包管理器 |

### 3.2 目录结构规范

```
hnnx-personalized-dev/
├── SKILL.md                            # 技能主文件（必需）
├── README.md                           # 项目说明（可选）
├── assets/                             # 资源目录
│   ├── templates/                      # 代码模板
│   │   ├── Hnnx.java                   # Java 类模板
│   │   ├── HnnxDtoTemplate.java        # DTO 模板
│   │   └── HnnxServiceTemplate.java    # Service 模板
│   └── 开发指南/                       # 开发指南目录
│       ├── README.md                   # 指南说明
│       ├── 前端开发模板.md             # 前端模板
│       ├── 前端开发规范.md             # 前端规范
│       ├── 后端开发模板.md             # 后端模板
│       ├── 后端开发规范.md             # 后端规范
│       └── 综合开发指南.md             # 综合指南
├── references/                         # 参考文档
│   ├── bemprule.md                     # BEMP 规则
│   ├── best-practices.md               # 最佳实践
│   └── common-issues.md                # 常见问题
```

### 3.3 代码模板规范

#### 3.3.1 Java 类模板结构
```java
package com.hundsun.bemp.hnnxbank.biz.{module}.service.impl.{subpackage};

import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.fw.common.pojo.ResultData;
import org.springframework.stereotype.Service;

/**
 * {功能描述}
 * 
 * @author {作者}
 * @date {日期}
 */
@Service
public class Hnnx{功能名}ServiceImpl {
    
    /**
     * {方法描述}
     * 
     * @param req 请求参数
     * @return 响应结果
     */
    public ResultData {方法名}(BaseRequest req) {
        // 1. 参数校验
        
        // 2. 业务逻辑处理
        
        // 3. 返回结果
        return ResultData.success();
    }
}
```

#### 3.3.2 DTO 模板结构
```java
package com.hundsun.bemp.hnnxbank.biz.{module}.dto;

import java.io.Serializable;

/**
 * {功能描述}请求 DTO
 * 
 * @author {作者}
 * @date {日期}
 */
public class Hnnx{功能名}Req implements Serializable {
    private static final long serialVersionUID = 1L;
    
    // 字段定义
    
    // getter/setter
    
    // toString
}
```

#### 3.3.3 Vue 组件模板结构
```vue
<template>
  <div class="hnnx-{组件名}">
    <!-- 组件内容 -->
  </div>
</template>

<script>
export default {
  name: 'Hnnx{组件名}',
  data() {
    return {
      // 数据定义
    }
  },
  methods: {
    // 方法定义
  }
}
</script>

<style scoped>
/* 样式定义 */
</style>
```

---

## 4. 实现细节规范

### 4.1 后端实现细节

#### 4.1.1 异常处理规范
**业务异常：**
- 使用 `BempRuntimeException`
- 异常信息清晰准确
- 包含必要的参数占位符

**参数校验：**
- 进行输入参数非空校验
- 进行业务规则校验
- 提前拦截非法请求

#### 4.1.2 API 路径规范
- 后端 API 路径前缀：`/hnnx/`
- 示例：`/hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole`

#### 4.1.3 版本规范
- 使用 Java 1.8 语法编码
- 后端框架版本参考 `bom/import-bom/pom.xml` 中的 version 标签值
- pom.xml 添加依赖包时版本号参考 `bom/import-bom/pom.xml` 中的 version 标签值
- 新增字段名称优先使用已定义的 Dto 类中的字段名称

### 4.2 前端实现细节

#### 4.2.1 API 调用规范
- 前端 API 路径需要核对确保正确
- 使用 `post` 方法发送请求
- 参数格式：`{ requestDto: { ... } }`

#### 4.2.2 国际化调用示例
```javascript
// 在 zh-CN.js 中定义
export default {
  hnnx: {
    button: {
      batchCopy: '批量复制',
      confirm: '确认'
    },
    label: {
      sourceUser: '源用户',
      targetUser: '目标用户'
    }
  }
}

// 在 Vue 组件中使用
<button>{{ $t('hnnx.button.batchCopy') }}</button>
<label>{{ $t('hnnx.label.sourceUser') }}</label>
```

---

## 5. 集成要求

### 5.1 IDE 集成

#### 5.1.1 Trae IDE 集成
- 作为 Skill 集成到 Trae IDE
- 通过自然语言触发（如"开发河南农信批量复制角色功能"）
- 自动执行三阶段开发流程

#### 5.1.2 相关 Skill 调用
| Skill 名称 | 调用时机 | 用途 |
|------------|----------|------|
| bemp-backend-code-review | 第三阶段 | 后端代码审查 |
| bemp-frontend-code-review | 第三阶段 | 前端代码审查 |
| SonarQube MCP | 第三阶段 | 代码质量扫描 |

### 5.2 项目集成

#### 5.2.1 BEMP 项目集成
- 扫描 `banks/ext-hnnxbank` 目录
- 扫描 `frontend/src/views/bizViews/banks/hnnxbank` 目录
- 读取项目配置和现有代码

---

## 6. 性能指标

### 6.1 开发效率指标

#### 6.1.1 代码生成时间
| 功能复杂度 | 预估时间 |
|------------|----------|
| 简单功能（单表 CRUD） | 30-60 分钟 |
| 中等功能（多表关联） | 1-2 小时 |
| 复杂功能（业务流程） | 2-4 小时 |

#### 6.1.2 代码审查时间
| 代码量 | 预估时间 |
|--------|----------|
| < 100 行 | 10-15 分钟 |
| 100-500 行 | 15-30 分钟 |
| 500-1000 行 | 30-60 分钟 |

### 6.2 质量指标

#### 6.2.1 SonarQube 质量门禁
| 问题级别 | 要求 |
|----------|------|
| Blocker | 0 个 |
| Critical | 0 个 |
| Major | < 5 个 |
| Minor | < 10 个 |

---

## 7. 测试标准

### 7.1 单元测试

#### 7.1.1 测试覆盖率要求
| 类型 | 覆盖率要求 |
|------|------------|
| 行覆盖率 | >= 70% |
| 分支覆盖率 | >= 60% |
| 方法覆盖率 | >= 80% |

#### 7.1.2 测试用例设计
- 正常场景测试
- 异常场景测试
- 边界值测试
- 空值测试

### 7.2 集成测试

#### 7.2.1 API 测试
- 接口可用性测试
- 参数校验测试
- 返回值格式测试
- 异常处理测试

#### 7.2.2 功能测试
- 端到端功能测试
- 业务流程测试
- 数据一致性测试

---

## 8. 兼容性要求

### 8.1 开发环境兼容

#### 8.1.1 必需环境
- JDK 1.8+
- Maven 3.6+
- Node.js 14.x
- npm 6.x

#### 8.1.2 IDE 兼容
- Trae IDE
- VSCode（可选）
- IntelliJ IDEA（可选）

### 8.2 浏览器兼容

#### 8.2.1 支持浏览器
- Chrome 80+
- Firefox 75+
- Edge 80+
- IE 11（部分支持）

---

## 9. 使用示例

### 9.1 开发新功能

**用户输入：**
```
开发河南农信机构批量导入功能
```

**Skill 执行流程：**
1. 需求分析与规范确认
   - 理解批量导入功能需求
   - 检查是否有可复用的代码
   - 确认国际化范围

2. 开发实施
   - 后端：创建 HnnxOrgBatchImportController
   - 后端：创建 HnnxOrgBatchImportService
   - 后端：创建 HnnxOrgBatchImportReq DTO
   - 前端：创建 OrgBatchImport.vue
   - 前端：添加国际化文本
   - 前端：维护路径映射

3. 质量控制
   - SonarQube 扫描
   - 代码审查
   - 编译验证
   - 功能验证

### 9.2 修复 Bug

**用户输入：**
```
修复河南农信批量复制角色功能的参数获取问题
```

**Skill 执行流程：**
1. 定位问题代码
2. 修改参数获取逻辑
3. 添加兼容性处理
4. 代码审查
5. 测试验证

---

## 10. 注意事项

### 10.1 开发禁忌

1. **不要在其他目录下开发代码**
   - 后端必须在 `banks/ext-hnnxbank`
   - 前端必须在 `frontend/src/views/bizViews/banks/hnnxbank`

2. **不要直接修改产品化代码**
   - 通过个性化类继承或复写
   - 保持产品化代码的完整性

3. **不要忽略国际化**
   - 按钮和标签必须国际化
   - 遵循现有国际化规范

4. **不要忽略代码审查**
   - 必须调用代码审查 Skill
   - 必须修复 SonarQube 发现的问题

### 10.2 最佳实践

1. **优先复用已有的个性化代码**
2. **参考现有实现进行开发**
3. **保持 UI 风格与现有组件一致**
4. **使用 DTO 对象传递参数**
5. **添加必要的日志记录**
6. **进行充分的参数校验**

---

## 11. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| V1.0.0 | 2026-04-15 | 初始版本，河南农信个性化开发 Skill |

---

# 附录：Skills 对比总结

| 特性 | bemp-advanced-doc-generator | hnnx-personalized-dev |
|------|----------------------------|----------------------|
| **核心功能** | 自动生成技术文档 | 个性化功能开发 |
| **技术栈** | Node.js + docx | Java + Vue.js |
| **输出产物** | Word/Markdown 文档 | 可运行代码 |
| **集成方式** | 命令行 + MCP | IDE Skill |
| **外部依赖** | ProcessOn API | SonarQube MCP |
| **用户群体** | 开发/测试/产品 | 开发人员 |
| **执行模式** | 独立脚本 | 交互式向导 |

---

**文档版本：** v1.0.0  
**最后更新：** 2026-04-15  
**维护团队：** BEMP 项目开发团队
