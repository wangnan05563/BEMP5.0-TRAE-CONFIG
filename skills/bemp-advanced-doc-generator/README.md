# BEMP 高级文档生成器使用指南

## 简介

BEMP 高级文档生成器是一个专业的技术文档生成工具，支持详细设计文档和测试用例文档的自动生成。最新版本（V2.0）新增了可视化文档生成功能，能够根据业务场景自动识别并生成流程图或思维导图。

## 主要特性

### V2.0 新增功能

- **智能场景识别**：自动判断内容适合生成流程图还是思维导图
- **ProcessOn MCP 集成**：无缝集成 ProcessOn API，生成高质量可视化文档
- **自定义模板系统**：支持用户自定义流程图/思维导图样式
- **错误处理与重试机制**：保障文档生成过程的可靠性
- **交互式界面**：提供直观的场景选择和参数配置选项

### 核心功能

- 双格式输出：同时支持 Markdown (.md) 和 Word (.docx) 格式
- 标准化文档结构：符合行业标准的文档模板
- 模块化设计：易于扩展和维护
- 命令行接口：支持参数配置和交互式两种模式

## 快速开始

### 安装依赖

```bash
cd .trae/skills/bemp-advanced-doc-generator/scripts
npm install
```

### 基本用法

#### 方式一：命令行参数模式

```bash
# 生成详细设计文档（双格式）
node cli.js --type design --module "机构批量导入"

# 生成测试用例文档（仅 Word 格式）
node cli.js --type testcase --module "机构批量导入" --format docx

# 生成文档但不生成可视化
node cli.js --type design --module "测试" --visualization false
```

#### 方式二：交互式界面模式

```bash
# 启动交互式界面
node interactive-cli.js

# 或使用 cli.js
node cli.js --interactive
```

## 命令行参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--type` | 文档类型：design（详细设计）或 testcase（测试用例） | design | `--type design` |
| `--module` | 模块名称 | 业务功能 | `--module "机构批量导入"` |
| `--format` | 输出格式：both（双格式）、docx（仅 Word）、md（仅 Markdown） | both | `--format docx` |
| `--visualization` | 是否生成可视化文档（true/false） | true | `--visualization false` |
| `--template` | 使用的模板名称 | default | `--template flowchart_template` |
| `--interactive` | 启动交互式界面 | - | `--interactive` |
| `--help` | 显示帮助信息 | - | `--help` |

## 交互式界面使用

启动交互式界面后，您将看到以下菜单：

### 主菜单

```
┌─────────────────────────────────────────────────────────┐
│ 主菜单                                                  │
├─────────────────────────────────────────────────────────┤
│ 1. 生成详细设计文档                                      │
│ 2. 生成测试用例文档                                      │
│ 3. 高级配置                                              │
│ 4. 退出                                                  │
└─────────────────────────────────────────────────────────┘
```

### 高级配置菜单

```
┌─────────────────────────────────────────────────────────┐
│ 高级配置                                                │
├─────────────────────────────────────────────────────────┤
│ 当前配置：                                              │
│   - 文档类型: 详细设计                                  │
│   - 模块名称: 机构批量导入                              │
│   - 输出格式: both                                      │
│   - 生成可视化: 是                                      │
│   - 模板名称: default                                   │
├─────────────────────────────────────────────────────────┤
│ 1. 修改文档类型                                          │
│ 2. 修改模块名称                                          │
│ 3. 修改输出格式                                          │
│ 4. 切换可视化生成                                        │
│ 5. 修改模板                                              │
│ 6. 返回主菜单                                            │
└─────────────────────────────────────────────────────────┘
```

## 可视化文档生成

### 场景识别机制

系统会根据以下特征自动识别适合的图表类型：

#### 流程图特征

- 包含"流程"、"步骤"、"顺序"、"判断"、"决策"等关键词
- 内容较长（超过 10 行）
- 包含流程图标记（`->`、`==>`、`-->`）

#### 思维导图特征

- 包含"思维导图"、"中心主题"、"分支"、"层级"等关键词
- 包含 Markdown 标题标记（`#`、`##`、`###`）
- 内容较短但层级清晰

### 可用模板

系统内置了以下模板：

- `default_mindmap`：默认思维导图模板
- `default_flowchart`：默认流程图模板

您可以在 `assets/templates/` 目录下创建自定义模板。

### 自定义模板

模板文件位于 `assets/templates/` 目录，格式为 JSON：

```json
{
  "name": "my_custom_template",
  "type": "mindmap",
  "theme": {
    "color": "#333333",
    "font": "SimSun",
    "fontSize": 14
  },
  "layout": {
    "direction": "TB",
    "spacing": 20
  }
}
```

## 输出文件

生成的文档将保存在 `output/` 目录下：

```
output/
├── {模块名}-详细设计.md
├── {模块名}-详细设计.docx
├── {模块名}-测试用例.md
└── {模块名}-测试用例.docx
```

## ProcessOn MCP 集成

### API Key 配置

如需使用 ProcessOn MCP 功能，请设置 API Key：

```bash
# Windows
set PROCESSON_API_KEY=your_api_key_here

# Linux/Mac
export PROCESSON_API_KEY=your_api_key_here
```

### MCP 服务启动

```bash
npm run start-mcp
```

## 故障排除

### 常见问题

1. **docx 模块未找到**
   ```
   解决方案：执行 npm install
   ```

2. **模板文件不存在**
   ```
   解决方案：检查 assets 目录下是否有对应的 JSON 文件
   ```

3. **ProcessOn API 连接失败**
   ```
   解决方案：检查 PROCESSON_API_KEY 环境变量是否设置
   ```

4. **中文显示异常**
   ```
   解决方案：确保使用 SimSun/SimHei 字体
   ```

5. **文件写入失败**
   ```
   解决方案：检查输出路径是否有写入权限
   ```

### 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| -32001 | MCP 调用超时 | 增加重试次数或检查网络连接 |
| EACCES | 文件权限错误 | 检查输出目录权限 |
| ENOENT | 文件不存在 | 检查文件路径是否正确 |
| ECONNREFUSED | 连接被拒绝 | 检查 ProcessOn 服务是否启动 |

## 高级配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PROCESSON_API_KEY` | ProcessOn API 密钥 | 空 |
| `PROCESSON_API_BASE` | ProcessOn API 地址 | https://www.processon.com |
| `PROCESSON_RETRY_COUNT` | 重试次数 | 3 |
| `PROCESSON_RETRY_DELAY` | 重试延迟（毫秒） | 1000 |

### 自定义配置文件

可以创建 `.env` 文件进行自定义配置：

```
PROCESSON_API_KEY=your_api_key
PROCESSON_RETRY_COUNT=5
PROCESSON_RETRY_DELAY=2000
```

## 版本历史

### V2.0.0 (2026-04-14)

**新增功能**

- ✅ 智能场景识别机制
- ✅ ProcessOn MCP 集成
- ✅ 自定义模板系统
- ✅ 错误处理与重试机制
- ✅ 交互式命令行界面

**改进**

- 优化文档生成性能
- 增强错误提示信息
- 改进用户交互体验

### V1.0.0 (2026-04-14)

**初始版本**

- 基础文档生成功能
- Markdown 和 Word 双格式输出
- 标准化文档模板

## 技术支持

如有问题或建议，请联系 BEMP 开发团队。

## 许可证

本工具基于 BEMP 项目内部使用协议。
