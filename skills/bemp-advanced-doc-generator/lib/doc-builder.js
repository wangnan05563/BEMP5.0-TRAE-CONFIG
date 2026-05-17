const fs = require('fs');
const path = require('path');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, PageNumber, HeadingLevel,
    BorderStyle, WidthType, ShadingType, PageBreak, LevelFormat,
    TableOfContents, VerticalAlign
} = require('docx');
const {
    A4_WIDTH, A4_HEIGHT, MARGIN, FONT, SIZE,
    DOC_STYLES, TABLE_BORDERS, TABLE_HEADER_BG,
    BempDocError, ERROR_CODES, paths
} = require('../config/default');

class DocumentBuilder {
    constructor() {
        this.outputDir = paths.outputDir;
    }

    heading1(text) {
        return new Paragraph({
            children: [new TextRun({ text, bold: true, font: FONT.HEI, size: SIZE.SAN })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 240 }
        });
    }

    heading2(text) {
        return new Paragraph({
            children: [new TextRun({ text, bold: true, font: FONT.HEI, size: SIZE.SI })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 160 }
        });
    }

    heading3(text) {
        return new Paragraph({
            children: [new TextRun({ text, bold: true, font: FONT.HEI, size: SIZE.XIAOSI })],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 120 }
        });
    }

    bodyText(text) {
        return new Paragraph({
            children: [new TextRun({ text, font: FONT.SONG, size: SIZE.XIAOSI })],
            spacing: { line: 360, before: 60, after: 60 }
        });
    }

    codeBlock(text) {
        return new Paragraph({
            children: [new TextRun({ text, font: FONT.CODE, size: SIZE.LIU })],
            spacing: { line: 276, before: 40, after: 40 },
            indent: { left: 480 }
        });
    }

    pageBreak() {
        return new Paragraph({ children: [new PageBreak()] });
    }

    createTable(headers, rows, colWidths) {
        const headerRow = new TableRow({
            children: headers.map((h, i) => new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: h, bold: true, font: FONT.HEI, size: SIZE.WU })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 }
                })],
                verticalAlign: VerticalAlign.CENTER,
                shading: { type: ShadingType.CLEAR, fill: TABLE_HEADER_BG },
                borders: TABLE_BORDERS,
                width: colWidths ? { size: colWidths[i], type: WidthType.DXA } : undefined
            })),
            tableHeader: true
        });

        const dataRows = rows.map(row => new TableRow({
            children: row.map((cell, i) => new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: cell || '', font: FONT.SONG, size: SIZE.WU })],
                    spacing: { before: 40, after: 40 }
                })],
                verticalAlign: VerticalAlign.CENTER,
                borders: TABLE_BORDERS,
                width: colWidths ? { size: colWidths[i], type: WidthType.DXA } : undefined
            }))
        }));

        return new Table({
            rows: [headerRow, ...dataRows],
            width: { size: A4_WIDTH - MARGIN.left - MARGIN.right, type: WidthType.DXA },
            borders: TABLE_BORDERS
        });
    }

    createCoverPage(coverData) {
        const children = [];
        children.push(new Paragraph({ spacing: { before: 4000 } }));
        children.push(new Paragraph({
            children: [new TextRun({ text: coverData.title || '详细设计文档', bold: true, font: FONT.HEI, size: SIZE.ER })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        }));
        const infoItems = [
            `公司：${coverData.company || ''}`,
            `产品：${coverData.product || ''}`,
            `版本：${coverData.version || 'V5.0'}`,
            `文档类型：${coverData.documentType || ''}`,
            `部门：${coverData.department || ''}`,
            `日期：${coverData.date || new Date().toLocaleDateString('zh-CN')}`
        ];
        infoItems.forEach(item => {
            children.push(new Paragraph({
                children: [new TextRun({ text: item, font: FONT.SONG, size: SIZE.SI })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }));
        });
        children.push(this.pageBreak());
        return children;
    }

    createRevisionHistory(rows) {
        const children = [];
        children.push(this.heading1('修订记录'));
        children.push(this.createTable(
            ['版本', '修订人', '修订说明', '批准人', '发布日期'],
            rows || [['V1.0', '', '初始版本', '', new Date().toLocaleDateString('zh-CN')]],
            [1200, 1500, 4000, 1500, 1800]
        ));
        children.push(this.pageBreak());
        return children;
    }

    createToc() {
        const children = [];
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 360 },
            children: [new TextRun({ text: '目  录', bold: true, size: SIZE.SAN, font: FONT.HEI })]
        }));
        children.push(new TableOfContents('目录', {
            hyperlink: true,
            headingStyleRange: '1-3'
        }));
        children.push(this.pageBreak());
        return children;
    }

    buildDocument(children, outputPath) {
        const doc = new Document({
            styles: DOC_STYLES,
            numbering: {
                config: [
                    {
                        reference: 'numbering',
                        levels: [{
                            level: 0, format: LevelFormat.DECIMAL, text: '%1.',
                            alignment: AlignmentType.LEFT,
                            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                        }]
                    },
                    {
                        reference: 'bullets',
                        levels: [{
                            level: 0, format: LevelFormat.BULLET, text: '\u2022',
                            alignment: AlignmentType.LEFT,
                            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                        }]
                    }
                ]
            },
            sections: [{
                properties: {
                    page: {
                        size: { width: A4_WIDTH, height: A4_HEIGHT },
                        margin: MARGIN
                    }
                },
                headers: {
                    default: new Header({
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'BEMP文档', size: 20, font: FONT.SONG })]
                        })]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: '第 ', size: 20, font: FONT.SONG }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
                                new TextRun({ text: ' 页', size: 20, font: FONT.SONG })
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
            return outputPath;
        });
    }

    async generateDesignDocument(moduleName, outputPath, templateData) {
        const data = templateData || this._getDefaultTemplateData(moduleName, 'design');
        const children = [];
        children.push(...this.createCoverPage(data.coverPage));
        children.push(...this.createRevisionHistory(data.revisionHistory?.rows));
        children.push(...this.createToc());

        if (data.chapters) {
            data.chapters.forEach((chapter, idx) => {
                children.push(...this._renderChapter(chapter));
                if (idx < data.chapters.length - 1) {
                    children.push(this.pageBreak());
                }
            });
        }

        await this.buildDocument(children, outputPath);
        return outputPath;
    }

    async generateTestCaseDocument(moduleName, outputPath, templateData) {
        const data = templateData || this._getDefaultTemplateData(moduleName, 'testcase');
        const children = [];
        children.push(...this.createCoverPage(data.coverPage));
        children.push(...this.createRevisionHistory(data.revisionHistory?.rows));
        children.push(...this.createToc());

        if (data.chapters) {
            data.chapters.forEach((chapter, idx) => {
                children.push(...this._renderChapter(chapter));
                if (idx < data.chapters.length - 1) {
                    children.push(this.pageBreak());
                }
            });
        }

        await this.buildDocument(children, outputPath);
        return outputPath;
    }

    async generateTestReportDocument(moduleName, outputPath, templateData) {
        const data = templateData || this._getDefaultTemplateData(moduleName, 'testreport');
        const children = [];
        children.push(...this.createCoverPage(data.coverPage));
        children.push(...this.createRevisionHistory(data.revisionHistory?.rows));
        children.push(...this.createToc());

        if (data.chapters) {
            data.chapters.forEach((chapter, idx) => {
                children.push(...this._renderChapter(chapter));
                if (idx < data.chapters.length - 1) {
                    children.push(this.pageBreak());
                }
            });
        }

        await this.buildDocument(children, outputPath);
        return outputPath;
    }

    generateMarkdown(moduleName, outputPath, type = 'design') {
        const date = new Date().toLocaleDateString('zh-CN');
        const typeLabel = { design: '详细设计文档', testcase: '测试用例', testreport: '测试报告' }[type] || '详细设计文档';

        let md = `# ${moduleName}${typeLabel}\n\n`;
        md += `**公司**: 恒生电子股份有限公司\n`;
        md += `**产品**: HUNDSUN 票据交易管理平台软件\n`;
        md += `**版本**: V5.0\n`;
        md += `**日期**: ${date}\n\n`;
        md += `## 文档修改记录\n\n`;
        md += `| 版本 | 修订人 | 修订说明 | 批准人 | 发布日期 |\n`;
        md += `| --- | --- | --- | --- | --- |\n`;
        md += `| V1.0 | | 初始版本 | | ${date} |\n\n`;

        if (type === 'design') {
            md += this._getDesignMarkdownTemplate();
        } else if (type === 'testcase') {
            md += this._getTestCaseMarkdownTemplate();
        } else {
            md += this._getTestReportMarkdownTemplate();
        }

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, md, 'utf-8');
        return outputPath;
    }

    _renderChapter(chapter) {
        const children = [];
        children.push(this.heading1(chapter.title));

        if (chapter.sections) {
            chapter.sections.forEach(section => {
                children.push(this.heading2(section.title));
                if (section.content) {
                    children.push(...this._renderSectionContent(section.content));
                }
            });
        }

        if (chapter.bodyTexts) {
            chapter.bodyTexts.forEach(text => children.push(this.bodyText(text)));
        }

        if (chapter.tables) {
            chapter.tables.forEach(t => children.push(this.createTable(t.headers, t.rows, t.colWidths)));
        }

        return children;
    }

    _renderSectionContent(content) {
        const children = [];
        if (typeof content === 'string') {
            children.push(this.bodyText(content));
        } else if (content.description) {
            children.push(this.bodyText(content.description));
        }
        if (content.headers && content.rows) {
            children.push(this.createTable(content.headers, content.rows, content.colWidths));
        }
        return children;
    }

    _getDefaultTemplateData(moduleName, type) {
        const typeLabels = { design: '设计说明书', testcase: '测试用例说明书', testreport: '测试报告' };
        return {
            coverPage: {
                title: `${moduleName}${typeLabels[type] || '详细设计文档'}`,
                company: '恒生电子股份有限公司',
                product: 'HUNDSUN 票据交易管理平台软件',
                version: 'V5.0',
                documentType: typeLabels[type] || '',
                department: '票据业务事业部',
                date: new Date().toLocaleDateString('zh-CN')
            },
            revisionHistory: {
                rows: [['V1.0', '', '初始版本', '', new Date().toLocaleDateString('zh-CN')]]
            },
            chapters: []
        };
    }

    _getDesignMarkdownTemplate() {
        return `## 第一章 系统概述\n\n### 1.1 业务背景\n\n（待补充）\n\n### 1.2 设计目标\n\n| 目标类型 | 目标描述 |\n| --- | --- |\n| 功能目标 | （待补充） |\n\n### 1.3 范围说明\n\n**纳入范围**：\n- （待补充）\n\n**排除范围**：\n- （待补充）\n\n## 第二章 功能模块划分\n\n### 2.1 模块划分\n\n| 子模块 | 功能 | 说明 |\n| --- | --- | --- |\n| （待补充） | | |\n\n## 第三章 核心业务流程\n\n（待补充流程图）\n\n## 第四章 数据模型设计\n\n### 4.1 数据字典\n\n| 字段名称 | 字段代码 | 类型 | 长度 | 必填 | 说明 |\n| --- | --- | --- | --- | --- | --- |\n| （待补充） | | | | | |\n\n## 第五章 接口定义\n\n| 接口名称 | 请求方式 | 接口路径 | 说明 |\n| --- | --- | --- | --- |\n| （待补充） | | | |\n\n## 第六章 异常处理机制\n\n| 错误码 | 错误信息 | 处理方式 |\n| --- | --- | --- |\n| （待补充） | | |\n\n## 第七章 安全策略\n\n（待补充）\n\n## 第八章 技术实现细节\n\n（待补充）\n`;
    }

    _getTestCaseMarkdownTemplate() {
        return `## 第一章 引言\n\n### 1.1 编写目的\n\n（待补充）\n\n## 第二章 测试计划\n\n### 2.1 测试范围\n\n（待补充）\n\n## 第三章 测试环境\n\n（待补充）\n\n## 第四章 功能测试用例\n\n| 用例编号 | 用例名称 | 前置条件 | 测试步骤 | 预期结果 |\n| --- | --- | --- | --- | --- |\n| （待补充） | | | | |\n\n## 第五章 集成测试用例\n\n（待补充）\n\n## 第六章 性能测试用例\n\n（待补充）\n\n## 第七章 安全测试用例\n\n（待补充）\n\n## 第八章 测试执行结果\n\n（待补充）\n`;
    }

    _getTestReportMarkdownTemplate() {
        return `## 第一章 测试概述\n\n（待补充）\n\n## 第二章 测试执行情况\n\n（待补充）\n\n## 第三章 测试结果详情\n\n（待补充）\n\n## 第四章 缺陷统计与分析\n\n（待补充）\n\n## 第五章 质量评估\n\n（待补充）\n\n## 第六章 测试结论与建议\n\n（待补充）\n`;
    }
}

module.exports = { DocumentBuilder };
