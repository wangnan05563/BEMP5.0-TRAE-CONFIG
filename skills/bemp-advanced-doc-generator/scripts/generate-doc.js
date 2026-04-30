/**
 * BEMP 高级文档生成器
 * 基于参考 Word 模板文档格式，自动生成 BEMP 业务功能详细设计文档、测试用例和测试报告
 * 
 * 使用方法：
 * node generate-doc.js --type design --module "机构批量导入" --output "output.docx"
 * node generate-doc.js --type testcase --module "机构批量导入" --output "testcase.docx"
 * node generate-doc.js --type testreport --module "机构批量导入" --output "testreport.docx"
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载 .env 文件中的环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

const { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, PageNumber, HeadingLevel,
    BorderStyle, WidthType, ShadingType, PageBreak, LevelFormat,
    TableOfContents, VerticalAlign
} = require('docx');

const DXA_PER_INCH = 1440;
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;

const BEMP_DOC_STYLES = {
    default: {
        document: {
            run: { font: "SimSun", size: 24 }
        }
    },
    paragraphStyles: [
        {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 32, bold: true, font: "SimHei" },
            paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 }
        },
        {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 28, bold: true, font: "SimHei" },
            paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 }
        },
        {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 24, bold: true, font: "SimHei" },
            paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 }
        }
    ]
};

const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const TABLE_BORDERS = { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER };

class DocumentGenerator {
    constructor(templatePath) {
        this.templatePath = templatePath;
        this.template = this.loadTemplate(templatePath);
    }

    loadTemplate(templatePath) {
        const fullPath = path.join(__dirname, '..', 'assets', templatePath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
    }

    replacePlaceholders(obj, replacements) {
        const json = JSON.stringify(obj);
        const replaced = json.replace(/\$\{(\w+)\}/g, (match, key) => {
            return replacements[key] || match;
        });
        return JSON.parse(replaced);
    }

    createParagraph(text, options = {}) {
        const { bold = false, size = 24, font = "SimSun", alignment = AlignmentType.LEFT, spacing = {} } = options;
        return new Paragraph({
            alignment,
            spacing: { before: spacing.before || 0, after: spacing.after || 120, line: 360 },
            children: [
                new TextRun({ text, bold, size, font })
            ]
        });
    }

    createHeading(text, level = 1) {
        return new Paragraph({
            heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            children: [new TextRun(text)]
        });
    }

    createTable(headers, rows, options = {}) {
        const { headerBgColor = "D5E8F0", columnWidths = null } = options;
        const colCount = headers.length;
        const defaultWidth = Math.floor(9000 / colCount);
        const widths = columnWidths || Array(colCount).fill(defaultWidth);
        
        const tableRows = [];
        
        tableRows.push(new TableRow({
            children: headers.map((header, idx) => 
                new TableCell({
                    borders: TABLE_BORDERS,
                    width: { size: widths[idx], type: WidthType.DXA },
                    shading: { fill: headerBgColor, type: ShadingType.CLEAR },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: header, bold: true, size: 21, font: "SimHei" })]
                    })]
                })
            )
        }));
        
        rows.forEach(row => {
            tableRows.push(new TableRow({
                children: row.map((cell, idx) =>
                    new TableCell({
                        borders: TABLE_BORDERS,
                        width: { size: widths[idx], type: WidthType.DXA },
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [new TextRun({ text: cell, size: 21, font: "SimSun" })]
                        })]
                    })
                )
            }));
        });
        
        return new Table({
            width: { size: 9000, type: WidthType.DXA },
            columnWidths: widths,
            rows: tableRows
        });
    }

    createPageBreak() {
        return new Paragraph({ children: [new PageBreak()] });
    }

    createCoverPage(coverData) {
        const children = [];
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1440, after: 480 },
            children: [new TextRun({ text: coverData.title || "详细设计文档", bold: true, size: 44, font: "SimHei" })]
        }));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `公司：${coverData.company || ""}`, size: 24, font: "SimSun" })]
        }));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `产品：${coverData.product || ""}`, size: 24, font: "SimSun" })]
        }));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `版本：${coverData.version || "V5.0"}`, size: 24, font: "SimSun" })]
        }));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `文档类型：${coverData.documentType || ""}`, size: 24, font: "SimSun" })]
        }));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `部门：${coverData.department || ""}`, size: 24, font: "SimSun" })]
        }));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 1440 },
            children: [new TextRun({ text: `日期：${coverData.date || new Date().toLocaleDateString('zh-CN')}`, size: 24, font: "SimSun" })]
        }));
        
        children.push(this.createPageBreak());
        
        return children;
    }

    createRevisionHistory(revisionData) {
        const children = [];
        
        children.push(this.createHeading("文档修改记录", 2));
        children.push(new Paragraph({ spacing: { after: 240 } }));
        
        if (revisionData.headers && revisionData.rows) {
            children.push(this.createTable(revisionData.headers, revisionData.rows || [["", "", "", "", ""]]));
        }
        
        children.push(this.createPageBreak());
        
        return children;
    }

    createChapter(chapter) {
        const children = [];
        
        children.push(this.createHeading(chapter.title, 1));
        
        if (chapter.sections) {
            chapter.sections.forEach(section => {
                children.push(this.createHeading(section.title, 2));
                
                if (section.content) {
                    const contentChildren = this.createSectionContent(section.content);
                    children.push(...contentChildren);
                }
            });
        }
        
        return children;
    }

    createSectionContent(content) {
        const children = [];
        
        if (typeof content === 'string') {
            children.push(this.createParagraph(content));
        } else if (content.description) {
            children.push(this.createParagraph(content.description));
        }
        
        if (content.headers && content.rows) {
            children.push(this.createTable(content.headers, content.rows));
        }
        
        return children;
    }

    generateDesignDocument(moduleName, outputPath) {
        const replacements = {
            moduleName,
            currentDate: new Date().toLocaleDateString('zh-CN')
        };
        
        const templateData = this.loadTemplate('详细设计文档模板.json');
        
        if (!templateData) {
            console.warn('未找到详细设计文档模板，使用默认模板');
            templateData = {
                coverPage: {
                    title: `${moduleName}详细设计文档`,
                    company: "恒生电子股份有限公司",
                    product: "HUNDSUN 票据交易管理平台软件",
                    version: "V5.0",
                    documentType: "设计说明书",
                    department: "票据业务事业部",
                    date: new Date().toLocaleDateString('zh-CN')
                },
                revisionHistory: {
                    headers: ["版本", "修订人", "修订说明", "批准人", "发布日期"],
                    rows: [["V1.0", "", "初始版本", "", new Date().toLocaleDateString('zh-CN')]]
                },
                chapters: []
            };
        }
        
        const filledTemplate = this.replacePlaceholders(templateData, replacements);

        const children = [];
        
        children.push(...this.createCoverPage(filledTemplate.coverPage));
        children.push(...this.createRevisionHistory(filledTemplate.revisionHistory));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 360 },
            children: [new TextRun({ text: "目  录", bold: true, size: 32, font: "SimHei" })]
        }));
        
        children.push(new TableOfContents("目录", {
            hyperlink: true,
            headingStyleRange: "1-3"
        }));
        
        children.push(this.createPageBreak());
        
        if (filledTemplate.chapters) {
            filledTemplate.chapters.forEach((chapter, idx) => {
                children.push(...this.createChapter(chapter));
                
                if (idx < filledTemplate.chapters.length - 1) {
                    children.push(this.createPageBreak());
                }
            });
        }
        
        return this.buildDocument(children, outputPath);
    }

    generateTestCaseDocument(moduleName, outputPath) {
        const replacements = {
            moduleName,
            currentDate: new Date().toLocaleDateString('zh-CN')
        };
        
        const templateData = this.loadTemplate('测试用例模板.json');
        
        if (!templateData) {
            console.warn('未找到测试用例模板，使用默认模板');
            templateData = {
                coverPage: {
                    title: `${moduleName}测试用例`,
                    company: "恒生电子股份有限公司",
                    product: "HUNDSUN 票据交易管理平台软件",
                    version: "V5.0",
                    documentType: "测试用例说明书",
                    department: "票据业务事业部",
                    date: new Date().toLocaleDateString('zh-CN')
                },
                revisionHistory: {
                    headers: ["版本", "修订人", "修订说明", "批准人", "发布日期"],
                    rows: [["V1.0", "", "初始版本", "", new Date().toLocaleDateString('zh-CN')]]
                },
                chapters: []
            };
        }
        
        const filledTemplate = this.replacePlaceholders(templateData, replacements);

        const children = [];
        
        children.push(...this.createCoverPage(filledTemplate.coverPage));
        children.push(...this.createRevisionHistory(filledTemplate.revisionHistory));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 360 },
            children: [new TextRun({ text: "目  录", bold: true, size: 32, font: "SimHei" })]
        }));
        
        children.push(new TableOfContents("目录", {
            hyperlink: true,
            headingStyleRange: "1-3"
        }));
        
        children.push(this.createPageBreak());
        
        if (filledTemplate.chapters) {
            filledTemplate.chapters.forEach((chapter, idx) => {
                children.push(...this.createChapter(chapter));
                
                if (idx < filledTemplate.chapters.length - 1) {
                    children.push(this.createPageBreak());
                }
            });
        }
        
        return this.buildDocument(children, outputPath);
    }

    generateTestReportDocument(moduleName, outputPath) {
        const replacements = {
            moduleName,
            currentDate: new Date().toLocaleDateString('zh-CN')
        };
        
        const templateData = this.loadTemplate('测试报告模板.json');
        
        if (!templateData) {
            console.warn('未找到测试报告模板，使用默认模板');
            templateData = {
                coverPage: {
                    title: `${moduleName}测试报告`,
                    company: "恒生电子股份有限公司",
                    product: "HUNDSUN 票据交易管理平台软件",
                    version: "V5.0",
                    documentType: "测试报告",
                    department: "票据业务事业部",
                    date: new Date().toLocaleDateString('zh-CN')
                },
                revisionHistory: {
                    headers: ["版本", "修订人", "修订说明", "批准人", "发布日期"],
                    rows: [["V1.0", "", "初始版本", "", new Date().toLocaleDateString('zh-CN')]]
                },
                chapters: []
            };
        }
        
        const filledTemplate = this.replacePlaceholders(templateData, replacements);

        const children = [];
        
        children.push(...this.createCoverPage(filledTemplate.coverPage));
        children.push(...this.createRevisionHistory(filledTemplate.revisionHistory));
        
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 360 },
            children: [new TextRun({ text: "目  录", bold: true, size: 32, font: "SimHei" })]
        }));
        
        children.push(new TableOfContents("目录", {
            hyperlink: true,
            headingStyleRange: "1-3"
        }));
        
        children.push(this.createPageBreak());
        
        if (filledTemplate.chapters) {
            filledTemplate.chapters.forEach((chapter, idx) => {
                children.push(...this.createChapter(chapter));
                
                if (idx < filledTemplate.chapters.length - 1) {
                    children.push(this.createPageBreak());
                }
            });
        }
        
        return this.buildDocument(children, outputPath);
    }

    buildDocument(children, outputPath) {
        const numbering = {
            config: [
                {
                    reference: "numbering",
                    levels: [{
                        level: 0,
                        format: LevelFormat.DECIMAL,
                        text: "%1.",
                        alignment: AlignmentType.LEFT,
                        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                    }]
                },
                {
                    reference: "bullets",
                    levels: [{
                        level: 0,
                        format: LevelFormat.BULLET,
                        text: "•",
                        alignment: AlignmentType.LEFT,
                        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                    }]
                }
            ]
        };
        
        const doc = new Document({
            styles: BEMP_DOC_STYLES,
            numbering,
            sections: [{
                properties: {
                    page: {
                        size: { width: A4_WIDTH, height: A4_HEIGHT },
                        margin: { top: 1440, right: 1800, bottom: 1440, left: 1800 }
                    }
                },
                headers: {
                    default: new Header({
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: "BEMP 文档", size: 20, font: "SimSun" })]
                        })]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "第 ", size: 20, font: "SimSun" }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
                                new TextRun({ text: " 页", size: 20, font: "SimSun" })
                            ]
                        })]
                    })
                },
                children
            }]
        });
        
        return Packer.toBuffer(doc).then(buffer => {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(outputPath, buffer);
            console.log(`文档已生成：${outputPath}`);
            return outputPath;
        });
    }

    generateMarkdown(moduleName, outputPath, type = 'design') {
        const date = new Date().toLocaleDateString('zh-CN');
        
        let md = '';
        
        if (type === 'design') {
            md = `# ${moduleName}详细设计文档\n\n`;
        } else {
            md = `# ${moduleName}测试用例\n\n`;
        }
        
        md += `**公司**: 恒生电子股份有限公司\n`;
        md += `**产品**: HUNDSUN 票据交易管理平台软件\n`;
        md += `**版本**: V5.0\n`;
        md += `**日期**: ${date}\n\n`;
        
        md += `## 文档修改记录\n\n`;
        md += `| 版本 | 修订人 | 修订说明 | 批准人 | 发布日期 |\n`;
        md += `| --- | --- | --- | --- | --- |\n`;
        md += `| V1.0 | | 初始版本 | | ${date} |\n\n`;
        
        if (type === 'design') {
            md += `## 第一章 系统概述\n\n`;
            md += `### 1.1 业务背景\n\n`;
            md += `在【系统管理子系统】-【系统管理】-【机构管理】菜单中，需要新增批量导入、模版下载和批量复制角色功能，以提高机构管理的效率和便捷性。\n\n`;
            md += `### 1.2 设计目标\n\n`;
            md += `| 目标类型 | 目标描述 |\n`;
            md += `| --- | --- |\n`;
            md += `| 功能目标 | 实现机构批量导入、模版下载和批量复制角色功能 |\n`;
            md += `| 性能目标 | 保证批量导入操作的响应速度和稳定性 |\n`;
            md += `| 质量目标 | 确保数据校验的准确性和完整性 |\n\n`;
            md += `### 1.3 范围说明\n\n`;
            md += `| 范围类型 | 说明 |\n`;
            md += `| --- | --- |\n`;
            md += `| 纳入范围 | 批量导入按钮、模版下载按钮、批量复制角色按钮的实现 |\n`;
            md += `| 排除范围 | 其他机构管理相关功能的修改 |\n\n`;
            
            md += `## 第二章 功能模块划分\n\n`;
            md += `### 2.1 模块划分\n\n`;
            md += `| 子模块 | 功能 | 说明 |\n`;
            md += `| --- | --- | --- |\n`;
            md += `| 批量导入模块 | 机构信息批量导入 | 支持Excel文件导入，包含数据校验 |\n`;
            md += `| 模版下载模块 | 导入模板下载 | 提供标准的机构信息导入模板 |\n`;
            md += `| 批量复制角色模块 | 角色批量复制 | 支持将一个机构的角色复制到多个机构 |\n\n`;
            md += `### 2.2 模块职责\n\n`;
            md += `详细描述每个子模块的职责和模块间的调用关系\n\n`;
            md += `### 2.3 接口边界\n\n`;
            md += `| 接口名称 | 接口类型 | 说明 |\n`;
            md += `| --- | --- | --- |\n`;
            md += `| 批量导入接口 | 内部 | 处理Excel文件上传和数据导入 |\n`;
            md += `| 模板下载接口 | 内部 | 生成并下载机构信息导入模板 |\n`;
            md += `| 批量复制角色接口 | 内部 | 处理角色复制逻辑 |\n\n`;
            
            md += `## 第三章 核心业务流程\n\n`;
            md += `### 3.1 业务流程图\n\n`;
            md += `使用 ASCII 或 Mermaid 绘制流程图，关键节点要有标注\n\n`;
            md += `### 3.2 时序图\n\n`;
            md += `绘制至少 2 张时序图，说明系统间的交互流程\n\n`;
            md += `### 3.3 关键节点说明\n\n`;
            md += `| 节点编号 | 节点名称 | 说明 |\n`;
            md += `| --- | --- | --- |\n`;
            md += `| N1 | 选择文件 | 用户选择要导入的Excel文件 |\n`;
            md += `| N2 | 数据校验 | 对导入的数据进行完整性和唯一性校验 |\n`;
            md += `| N3 | 数据导入 | 将校验通过的数据导入到系统 |\n`;
            md += `| N4 | 结果反馈 | 向用户反馈导入结果 |\n`;
            md += `| N5 | 模板下载 | 用户下载机构信息导入模板 |\n`;
            md += `| N6 | 角色复制 | 用户选择目标机构并执行角色复制 |\n\n`;
            
            md += `## 第四章 数据模型设计\n\n`;
            md += `### 4.1 ER 图\n\n`;
            md += `绘制实体关系图，标识实体、属性和关系\n\n`;
            md += `### 4.2 数据字典\n\n`;
            md += `| 字段名称 | 字段代码 | 类型 | 长度 | 必填 | 说明 |\n`;
            md += `| --- | --- | --- | --- | --- | --- |\n`;
            md += `| 机构ID | id | VARCHAR | 32 | 是 | 主键 |\n`;
            md += `| 机构名称 | brchName | VARCHAR | 60 | 是 | 机构名称不可重复 |\n`;
            md += `| 机构号 | brchNo | VARCHAR | 10 | 是 | 机构号不可重复 |\n`;
            md += `| 核算机构号 | cashorgid | VARCHAR | 10 | 是 | 核算机构号不可重复 |\n`;
            md += `| 组织机构代码 | orgCode | VARCHAR | 10 | 是 | 组织机构代码不可重复 |\n`;
            md += `| 票交所机构代码 | cpesBrchCode | VARCHAR | 9 | 否 | 非必输项 |\n`;
            md += `| 上级机构号 | parentBrchNo | VARCHAR | 10 | 是 | 上级机构 |\n`;
            md += `| 机构层级 | brchLevel | VARCHAR | 1 | 是 | 机构层级，最多4级 |\n`;
            md += `| 状态 | operateStatus | VARCHAR | 4 | 是 | 机构状态 |\n`;
            
            md += `### 4.3 存储策略\n\n`;
            md += `说明数据分区策略、索引策略、备份和恢复策略\n\n`;
            
            md += `## 第五章 接口定义\n\n`;
            md += `### 5.1 API 接口清单\n\n`;
            md += `| 接口名称 | 请求方式 | 接口路径 | 说明 |\n`;
            md += `| --- | --- | --- | --- |\n`;
            md += `| 批量导入机构 | POST | /sm/auth/branch/importBranch | 批量导入机构信息 |\n`;
            md += `| 下载导入模板 | GET | /sm/auth/branch/downloadTemplate | 下载机构信息导入模板 |\n`;
            md += `| 批量复制角色 | POST | /sm/auth/branch/copyRoles | 批量复制角色 |\n`;
            
            md += `### 5.2 接口详情\n\n`;
            md += `对每个接口进行详细说明，包含请求参数、响应参数、调用示例\n\n`;
            
            md += `## 第六章 异常处理机制\n\n`;
            md += `### 6.1 错误码定义\n\n`;
            md += `| 错误码 | 错误信息 | 处理方式 |\n`;
            md += `| --- | --- | --- |\n`;
            md += `| E001 | 机构号重复 | 返回错误提示 |\n`;
            md += `| E002 | 机构名称重复 | 返回错误提示 |\n`;
            md += `| E003 | 核算机构号重复 | 返回错误提示 |\n`;
            md += `| E004 | 组织机构代码重复 | 返回错误提示 |\n`;
            md += `| E005 | 机构层级超过4级 | 返回错误提示 |\n`;
            md += `| E006 | 角色[xxx]为机构下用户使用不能去除与当前机构关系 | 返回错误提示 |\n`;
            
            md += `### 6.2 处理流程\n\n`;
            md += `说明异常捕获和处理的流程，说明不同异常类型的处理策略\n\n`;
            md += `### 6.3 恢复策略\n\n`;
            md += `说明失败后的恢复机制，说明数据一致性保证措施\n\n`;
            
            md += `## 第七章 安全策略\n\n`;
            md += `### 7.1 认证授权\n\n`;
            md += `说明身份认证机制和权限控制策略\n\n`;
            md += `### 7.2 数据加密\n\n`;
            md += `说明传输加密方式和存储加密方式\n\n`;
            md += `### 7.3 访问控制\n\n`;
            md += `说明操作限制和数据隔离策略\n\n`;
            
            md += `## 第八章 技术实现细节\n\n`;
            md += `### 8.1 核心算法\n\n`;
            md += `列出核心算法，提供伪代码或流程图\n\n`;
            md += `### 8.2 代码示例\n\n`;
            md += `| 类名 | 方法名 | 说明 |\n`;
            md += `| --- | --- | --- |\n`;
            md += `| BranchServiceImpl | importBranches | 批量导入机构信息 |\n`;
            md += `| BranchServiceImpl | downloadTemplate | 下载导入模板 |\n`;
            md += `| BranchServiceImpl | copyRoles | 批量复制角色 |\n`;
            
            md += `### 8.3 性能优化\n\n`;
            md += `列出性能优化策略，说明优化效果\n\n`;
        } else {
            md += `## 第一章 引言\n\n`;
            md += `### 1.1 编写目的\n\n`;
            md += `说明编写本测试用例的目的，说明测试的范围和目标\n\n`;
            md += `### 1.2 背景说明\n\n`;
            md += `项目背景、功能背景说明\n\n`;
            md += `### 1.3 定义\n\n`;
            md += `定义测试中用到的术语\n\n`;
            md += `### 1.4 参考资料\n\n`;
            md += `列出参考的文档和规范\n\n`;
            
            md += `## 第二章 测试计划\n\n`;
            md += `### 2.1 测试范围\n\n`;
            md += `| 范围类型 | 说明 |\n`;
            md += `| --- | --- |\n`;
            md += `| 纳入范围 | 批量导入功能、模板下载功能、批量复制角色功能 |\n`;
            md += `| 排除范围 | 其他机构管理相关功能 |\n\n`;
            md += `### 2.2 测试目标\n\n`;
            md += `| 测试类型 | 目标描述 |\n`;
            md += `| --- | --- |\n`;
            md += `| 功能测试 | 验证批量导入、模板下载、批量复制角色功能的正确性 |\n`;
            md += `| 性能测试 | 验证批量导入操作的响应速度 |\n`;
            md += `| 安全测试 | 验证权限控制的有效性 |\n`;
            
            md += `### 2.3 测试资源\n\n`;
            md += `| 资源类型 | 配置 |\n`;
            md += `| --- | --- |\n`;
            md += `| 硬件 | 服务器配置 |\n`;
            md += `| 软件 | 操作系统/数据库 |\n`;
            
            md += `### 2.4 测试进度\n\n`;
            md += `测试阶段划分和时间安排\n\n`;
            
            md += `## 第三章 测试环境\n\n`;
            md += `### 3.1 硬件环境\n\n`;
            md += `| 设备 | 配置 |\n`;
            md += `| --- | --- |\n`;
            md += `| 服务器 | CPU/内存/硬盘 |\n`;
            md += `| 客户端 | PC配置 |\n`;
            
            md += `### 3.2 软件环境\n\n`;
            md += `| 软件 | 版本 |\n`;
            md += `| --- | --- |\n`;
            md += `| 操作系统 | Windows/Linux |\n`;
            md += `| 数据库 | MySQL/Oracle |\n`;
            
            md += `### 3.3 测试工具\n\n`;
            md += `| 工具名称 | 用途 |\n`;
            md += `| --- | --- |\n`;
            md += `| Postman | API测试 |\n`;
            md += `| JMeter | 性能测试 |\n`;
            
            md += `## 第四章 功能测试用例\n\n`;
            md += `### 4.1 正常场景测试\n\n`;
            md += `| 用例编号 | 用例名称 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 |\n`;
            md += `| --- | --- | --- | --- | --- | --- |\n`;
            md += `| TC-001 | 批量导入机构 | 系统登录 | 1. 点击批量导入按钮 2. 选择Excel文件 3. 上传 | 有效的机构数据 | 导入成功 |\n`;
            md += `| TC-002 | 下载导入模板 | 系统登录 | 1. 点击模板下载按钮 | N/A | 模板下载成功 |\n`;
            md += `| TC-003 | 批量复制角色 | 系统登录 | 1. 选择机构 2. 点击批量复制角色 3. 选择目标机构 4. 确认 | 有效的机构和角色数据 | 复制成功 |\n`;
            
            md += `### 4.2 异常场景测试\n\n`;
            md += `| 用例编号 | 用例名称 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 |\n`;
            md += `| --- | --- | --- | --- | --- | --- |\n`;
            md += `| TC-004 | 机构号重复 | 系统登录 | 1. 批量导入包含重复机构号的数据 | 重复的机构号 | 导入失败，提示错误 |\n`;
            md += `| TC-005 | 机构名称重复 | 系统登录 | 1. 批量导入包含重复机构名称的数据 | 重复的机构名称 | 导入失败，提示错误 |\n`;
            md += `| TC-006 | 角色使用中 | 系统登录 | 1. 尝试复制正在使用的角色 | 正在使用的角色 | 操作失败，提示错误 |\n`;
            
            md += `### 4.3 边界值测试\n\n`;
            md += `| 用例编号 | 用例名称 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 |\n`;
            md += `| --- | --- | --- | --- | --- | --- |\n`;
            md += `| TC-007 | 机构层级4级 | 系统登录 | 1. 尝试导入第4级机构 | 第4级机构数据 | 导入成功 |\n`;
            md += `| TC-008 | 机构层级5级 | 系统登录 | 1. 尝试导入第5级机构 | 第5级机构数据 | 导入失败，提示错误 |\n`;
            
            md += `## 第五章 性能测试用例\n\n`;
            md += `### 5.1 负载测试\n\n`;
            md += `负载测试用例\n\n`;
            md += `### 5.2 压力测试\n\n`;
            md += `压力测试用例\n\n`;
            md += `### 5.3 稳定性测试\n\n`;
            md += `稳定性测试用例\n\n`;
            
            md += `## 第六章 安全测试用例\n\n`;
            md += `### 6.1 认证测试\n\n`;
            md += `认证测试用例\n\n`;
            md += `### 6.2 授权测试\n\n`;
            md += `授权测试用例\n\n`;
            md += `### 6.3 数据加密测试\n\n`;
            md += `数据加密测试用例\n\n`;
            
            md += `## 第七章 测试执行结果\n\n`;
            md += `### 7.1 测试执行情况\n\n`;
            md += `| 统计项 | 数量 |\n`;
            md += `| --- | --- |\n`;
            md += `| 总用例数 | 0 |\n`;
            md += `| 通过 | 0 |\n`;
            md += `| 失败 | 0 |\n`;
            
            md += `### 7.2 缺陷统计\n\n`;
            md += `| 严重程度 | 数量 |\n`;
            md += `| --- | --- |\n`;
            md += `| 严重 | 0 |\n`;
            md += `| 一般 | 0 |\n`;
            md += `| 轻微 | 0 |\n`;
            
            md += `### 7.3 测试结论\n\n`;
            md += `测试总结和发布建议\n\n`;
        }
        
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, md, 'utf-8');
        console.log(`Markdown 文档已生成：${outputPath}`);
        return outputPath;
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        type: 'design',
        module: '',
        output: '',
        format: 'both'
    };
    
    args.forEach((arg, idx) => {
        if (arg === '--type' && args[idx + 1]) {
            result.type = args[idx + 1];
        } else if (arg === '--module' && args[idx + 1]) {
            result.module = args[idx + 1];
        } else if (arg === '--output' && args[idx + 1]) {
            result.output = args[idx + 1];
        } else if (arg === '--format' && args[idx + 1]) {
            result.format = args[idx + 1];
        }
    });
    
    return result;
}

async function main() {
    const args = parseArgs();
    const moduleName = args.module || "业务功能";
    
    const generator = new DocumentGenerator('详细设计文档模板.json');
    
    const outputDir = args.output ? path.dirname(args.output) : './output';
    const baseName = args.output ? path.basename(args.output, path.extname(args.output)) : moduleName;
    
    let fileSuffix = args.type === 'testcase' ? '-测试用例' : args.type === 'testreport' ? '-测试报告' : '-详细设计';
        
        try {
            if (args.format === 'md' || args.format === 'both') {
                const mdOutput = path.join(outputDir, `${baseName}${fileSuffix}.md`);
                generator.generateMarkdown(moduleName, mdOutput, args.type);
            }
            
            if (args.format === 'docx' || args.format === 'both') {
                const docxOutput = path.join(outputDir, `${baseName}${fileSuffix}.docx`);
                if (args.type === 'testreport') {
                    await generator.generateTestReportDocument(moduleName, docxOutput);
                } else if (args.type === 'testcase') {
                    await generator.generateTestCaseDocument(moduleName, docxOutput);
                } else {
                    await generator.generateDesignDocument(moduleName, docxOutput);
                }
            }
        
        console.log("文档生成成功！");
    } catch (error) {
        console.error("文档生成失败:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    DocumentGenerator
};
