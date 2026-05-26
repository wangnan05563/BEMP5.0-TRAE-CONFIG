# bemp-advanced-doc-generator 反向构建提示词

## 核心功能
BEMP高级文档生成器，自动生成详细设计文档、测试用例、测试报告，支持Word/Markdown/Excel格式输出。核心能力：需求文档智能分析→自动提取测试点→生成用例，Excel SIT测试用例基于模板自动解析列映射，可视化流程图/思维导图（ProcessOn MCP + 本地HTML备用）。

## 关键实现逻辑
- CLI入口 `cli.js`，参数驱动：`-t` 文档类型(design/testcase/testreport)、`-f` 格式(docx/md/excel)、`-r` 需求文档路径、`-m` 模块名称
- Excel测试用例：`excel-testcase-generator.js` 解析模板配置(`excel-testcase-template-config.json`)自动映射列，`--json` 模式输出含自动验证结果
- 需求分析：`requirement-analyzer.js` 从Markdown需求文档提取多级标题、业务规则、校验规则
- 文档构建：`doc-builder.js` + `template-builder.js` 基于模板生成结构化文档
- 可视化：`visualization.js` 生成流程图/思维导图JSON，对接ProcessOn MCP

## 输入输出参数
| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --type | -t | design/testcase/testreport | design |
| --module | -m | 模块名称 | 必填 |
| --format | -f | docx/md/excel | docx |
| --requirement | -r | 需求文档路径(Markdown) | - |
| --output | -o | 输出路径 | 自动生成 |
| --json | | JSON结构化输出(含验证) | false |
| --visualization | -v | 生成可视化 | false |

## 主要业务流程
1. 解析CLI参数，确定文档类型与格式
2. 若有需求文档(-r)，调用requirement-analyzer提取业务规则和测试点
3. 根据类型调用对应生成器(design→doc-builder, testcase→excel-testcase-generator, testreport→doc-builder)
4. Excel用例自动验证列对齐，`--json`模式输出验证结果
5. 可视化选项(-v)生成流程图/思维导图
6. 输出到 `output/{模块名}-{文档类型}-{日期}.xlsx/.docx/.md`

## 技术特性
- Node.js实现，package.json管理依赖
- 模板引擎：Word用docx模板，Excel用xlsx模板+列映射配置
- 参考文档：ER图生成工作流标准、内容结构标准、技术术语表、文档格式标准
- 资源目录：`assets/templates/` 含Word模板、Excel模板、流程图/思维导图默认JSON
