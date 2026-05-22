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
    BempDocError, ERROR_CODES, paths, COMPANY_DEFAULTS
} = require('../config/default');

const HEADING_CONFIGS = [
    { level: HeadingLevel.HEADING_1, styleKey: 'Heading1', prefix: '' },
    { level: HeadingLevel.HEADING_2, styleKey: 'Heading2', prefix: '' },
    { level: HeadingLevel.HEADING_3, styleKey: 'Heading3', prefix: '' },
    { level: HeadingLevel.HEADING_4, styleKey: 'Heading4', prefix: '  ' },
    { level: HeadingLevel.HEADING_5, styleKey: 'Heading5', prefix: '    ' }
];

class DocumentBuilder {
    constructor() {
        this.outputDir = paths.outputDir;
    }

    _createHeading(levelIndex, text) {
        const config = HEADING_CONFIGS[levelIndex - 1];
        const style = DOC_STYLES.paragraphStyles.find(s => s.id === config.styleKey);
        return new Paragraph({
            children: [new TextRun({
                text: `${config.prefix}${text}`,
                bold: true,
                font: style ? style.run.font : FONT.HEI,
                size: style ? style.run.size : SIZE.WU,
                color: '000000',
                italics: false
            })],
            heading: config.level,
            spacing: style && style.paragraph ? style.paragraph.spacing : { before: 120, after: 80 }
        });
    }

    heading1(text) { return this._createHeading(1, text); }
    heading2(text) { return this._createHeading(2, text); }
    heading3(text) { return this._createHeading(3, text); }
    heading4(text) { return this._createHeading(4, text); }
    heading5(text) { return this._createHeading(5, text); }

    bodyText(text) {
        return new Paragraph({
            children: [new TextRun({ text, font: FONT.SONG, size: SIZE.XIAOSI })],
            spacing: { line: 360, before: 60, after: 60 },
            indent: { firstLine: 480 }
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
            `公司：${coverData.company || COMPANY_DEFAULTS.company}`,
            `产品：${coverData.product || COMPANY_DEFAULTS.product}`,
            `版本：${coverData.version || COMPANY_DEFAULTS.version}`,
            `文档类型：${coverData.documentType || ''}`,
            `部门：${coverData.department || COMPANY_DEFAULTS.department}`,
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

    createRevisionHistory(rows, headers) {
        const children = [];
        const hdrs = headers || ['版本', '修订人', '修订说明', '批准人', '发布日期'];
        const widths = headers
            ? hdrs.map(() => Math.floor(10000 / hdrs.length))
            : [1200, 1500, 4000, 1500, 1800];
        children.push(this.heading1('修订记录'));
        children.push(this.createTable(
            hdrs,
            rows || [['V1.0', '', '初始版本', '', new Date().toLocaleDateString('zh-CN')]],
            widths
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

    async generateDocument(moduleName, outputPath, templateData, type = 'design') {
        const data = templateData || this._getDefaultTemplateData(moduleName, type);
        const children = [];
        children.push(...this.createCoverPage(data.coverPage));
        children.push(...this.createRevisionHistory(data.revisionHistory?.rows, data.revisionHistory?.headers));
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
        const typeLabel = { design: '详细设计文档', testcase: '测试用例', testreport: '测试报告', srs: '需求规格说明书' }[type] || '详细设计文档';

        let md = `# ${moduleName}${typeLabel}\n\n`;
        md += `**公司**: ${COMPANY_DEFAULTS.company}\n`;
        md += `**产品**: ${COMPANY_DEFAULTS.product}\n`;
        md += `**版本**: ${COMPANY_DEFAULTS.version}\n`;
        md += `**日期**: ${date}\n\n`;
        md += `## 文档修改记录\n\n`;
        md += `| 版本 | 修改时间 | 修改人 | 修改内容 |\n`;
        md += `| --- | --- | --- | --- |\n`;
        md += `| V1.0 | ${date} | | 初始版本 |\n\n`;

        if (type === 'design') {
            md += this._getDesignMarkdownTemplate();
        } else if (type === 'testcase') {
            md += this._getTestCaseMarkdownTemplate();
        } else if (type === 'srs') {
            md += this._getSRSMarkdownTemplate();
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
            chapter.sections.forEach((section, sIdx) => {
                children.push(this.heading2(section.title));
                const secNum = section.title.match(/^(\d+\.\d+)/);
                const numPrefix = secNum ? secNum[1] : '';
                if (section.content) {
                    children.push(...this._renderSectionContent(section.content, numPrefix, 3));
                }
                if (section.subSections) {
                    section.subSections.forEach(sub => {
                        const fullNum = sub.title.match(/^(\d+\.\d+\.\d+)\s/);
                        if (fullNum) {
                            children.push(this.heading3(sub.title));
                        } else {
                            const dotNum = sub.title.match(/^(\d+\.\d+)\s/);
                            if (dotNum && numPrefix) {
                                children.push(this.heading3(`${numPrefix}.${dotNum[1]} ${sub.title.replace(dotNum[0], '').trim()}`));
                            } else {
                                const simpleNum = sub.title.match(/^(\d+)\.?\s/);
                                if (simpleNum && numPrefix) {
                                    children.push(this.heading3(`${numPrefix}.${simpleNum[1]} ${sub.title.replace(simpleNum[0], '').trim()}`));
                                } else {
                                    children.push(this.heading3(sub.title));
                                }
                            }
                        }

                        let subPrefix = '';
                        const fullNumMatch = sub.title.match(/^(\d+\.\d+\.\d+)/);
                        if (fullNumMatch) {
                            subPrefix = fullNumMatch[1];
                        } else {
                            const dotNumMatch = sub.title.match(/^(\d+\.\d+)\s/);
                            if (dotNumMatch && numPrefix) {
                                subPrefix = `${numPrefix}.${dotNumMatch[1]}`;
                            } else {
                                const singleNumMatch = sub.title.match(/^(\d+)\.?\s/);
                                if (singleNumMatch && numPrefix) {
                                    subPrefix = `${numPrefix}.${singleNumMatch[1]}`;
                                }
                            }
                        }
                        if (sub.content) {
                            children.push(...this._renderSectionContent(sub.content, subPrefix, 4));
                        }
                    });
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

    _renderSectionContent(content, numPrefix, depth) {
        const children = [];
        const d = depth || 3;
        if (typeof content === 'string') {
            children.push(...this._renderRichText(content, numPrefix, d));
        } else if (content.description) {
            children.push(...this._renderRichText(content.description, numPrefix, d));
        }
        if (content.headers && content.rows) {
            children.push(this.createTable(content.headers, content.rows, content.colWidths));
        }
        return children;
    }

    _parseLineType(trimmed) {
        const tripleBracketMatch = trimmed.match(/^【【【(.+)】】】$/);
        if (tripleBracketMatch) return { type: 'grandchild', content: tripleBracketMatch[1].trim() };

        const deepBracketMatch = trimmed.match(/^【【(.+)】】$/);
        if (deepBracketMatch) return { type: 'child', content: deepBracketMatch[1].trim() };

        const bracketMatch = trimmed.match(/^【(.+)】$/);
        if (bracketMatch) return { type: 'parent', content: bracketMatch[1].trim() };

        const headingMatch = trimmed.match(/^#{2,6}\s+(.+)/);
        if (headingMatch) {
            const mdDepth = headingMatch[0].match(/^#+/)[0].length;
            return { type: 'markdown', content: headingMatch[1].trim(), mdDepth };
        }

        return { type: 'body', content: trimmed };
    }

    _generateNumbering(lineType, counters, numPrefix, baseDepth, mdDepth) {
        const { parentCounter, childCounter, grandChildCounter } = counters;

        if (lineType === 'grandchild') {
            const num = childCounter > 0
                ? `${numPrefix}.${parentCounter}.${childCounter}.${grandChildCounter}`
                : `${numPrefix}.${parentCounter}.${grandChildCounter}`;
            return { num, level: 'grandchild' };
        }

        if (lineType === 'child') {
            if (grandChildCounter > 0) {
                const num = `${numPrefix}.${parentCounter + 1}`;
                return { num, level: 'parent', resetParent: true };
            }
            const num = `${numPrefix}.${parentCounter}.${childCounter}`;
            return { num, level: 'child', resetParent: false };
        }

        if (lineType === 'markdown') {
            const relativeDepth = mdDepth - baseDepth;
            if (relativeDepth <= 0) {
                const num = `${numPrefix}.${parentCounter + 1}`;
                return { num, level: 'parent' };
            } else if (relativeDepth === 1) {
                if (grandChildCounter > 0) {
                    const num = `${numPrefix}.${parentCounter + 1}`;
                    return { num, level: 'parent' };
                }
                const num = `${numPrefix}.${parentCounter}.${childCounter}`;
                return { num, level: 'child' };
            } else {
                const num = childCounter > 0
                    ? `${numPrefix}.${parentCounter}.${childCounter}.${grandChildCounter}`
                    : `${numPrefix}.${parentCounter}.${grandChildCounter}`;
                return { num, level: 'grandchild' };
            }
        }

        return null;
    }

    _renderRichText(text, numPrefix, baseDepth) {
        const children = [];
        const lines = text.split('\n');
        const bd = baseDepth || 3;
        let parentCounter = 0;
        let childCounter = 0;
        let grandChildCounter = 0;
        let isFirstBracket = true;
        let tableBuffer = [];

        const flushTable = () => {
            if (tableBuffer.length >= 2) {
                const parsed = this._parseMarkdownTable(tableBuffer);
                if (parsed) {
                    children.push(this.createTable(parsed.headers, parsed.rows, parsed.colWidths));
                }
            }
            tableBuffer = [];
        };

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            const trimmed = line.trim();
            if (!trimmed) { flushTable(); continue; }

            if (trimmed.startsWith('|')) {
                tableBuffer.push(trimmed);
                continue;
            } else {
                flushTable();
            }

            const parsed = this._parseLineType(trimmed);

            if (parsed.type === 'grandchild') {
                grandChildCounter++;
                const result = this._generateNumbering('grandchild', { parentCounter, childCounter, grandChildCounter }, numPrefix, bd);
                children.push(this.heading5(`${result.num} ${parsed.content}`));
                continue;
            }

            if (parsed.type === 'child') {
                const result = this._generateNumbering('child', { parentCounter, childCounter, grandChildCounter }, numPrefix, bd);
                if (result.resetParent) {
                    parentCounter++;
                    childCounter = 0;
                    grandChildCounter = 0;
                    children.push(this.heading5(`${numPrefix}.${parentCounter} ${parsed.content}`));
                } else {
                    childCounter++;
                    grandChildCounter = 0;
                    children.push(this.heading5(`${result.num} ${parsed.content}`));
                }
                continue;
            }

            if (parsed.type === 'parent') {
                if (isFirstBracket && bd <= 4) {
                    parentCounter++;
                    childCounter = 0;
                    grandChildCounter = 0;
                    children.push(this.heading4(`${numPrefix}.${parentCounter} ${parsed.content}`));
                    isFirstBracket = false;
                } else if (grandChildCounter > 0 || childCounter > 0) {
                    parentCounter++;
                    childCounter = 0;
                    grandChildCounter = 0;
                    children.push(this.heading5(`${numPrefix}.${parentCounter} ${parsed.content}`));
                } else {
                    childCounter++;
                    grandChildCounter = 0;
                    children.push(this.heading5(`${numPrefix}.${parentCounter}.${childCounter} ${parsed.content}`));
                }
                continue;
            }

            if (parsed.type === 'markdown') {
                const result = this._generateNumbering('markdown', { parentCounter, childCounter, grandChildCounter }, numPrefix, bd, parsed.mdDepth);

                if (result.level === 'parent') {
                    parentCounter++;
                    childCounter = 0;
                    grandChildCounter = 0;
                    children.push(this.heading4(`${result.num} ${parsed.content}`));
                } else if (result.level === 'child') {
                    childCounter++;
                    grandChildCounter = 0;
                    children.push(this.heading5(`${result.num} ${parsed.content}`));
                } else {
                    grandChildCounter++;
                    children.push(this.heading5(`${result.num} ${parsed.content}`));
                }
                continue;
            }

            children.push(this.bodyText(trimmed));
        }

        flushTable();

        return children;
    }

    _parseMarkdownTable(tableLines) {
        if (tableLines.length < 2) return null;

        const splitCells = (line) => {
            let cells = line.split('|');
            if (cells.length > 1 && cells[0].trim() === '') cells = cells.slice(1);
            if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells = cells.slice(0, -1);
            return cells.map(c => c.trim());
        };

        let headerIdx = -1;
        let sepIdx = -1;
        let colCount = 0;

        for (let i = 0; i < tableLines.length; i++) {
            const cells = splitCells(tableLines[i]);
            const nonEmpty = cells.filter(c => c !== '');
            const isSep = cells.filter(c => /^:?-+:?$/.test(c)).length >= 2;

            if (isSep && headerIdx >= 0) {
                sepIdx = i;
                colCount = cells.length;
                break;
            }

            if (nonEmpty.length > 0 && !isSep && headerIdx < 0) {
                headerIdx = i;
            }
        }

        if (headerIdx < 0) return null;

        if (sepIdx < 0) {
            sepIdx = headerIdx;
            colCount = splitCells(tableLines[headerIdx]).length;
        }

        let headerCells = splitCells(tableLines[headerIdx]).map(c => c.replace(/\*\*/g, ''));
        while (headerCells.length < colCount) headerCells.push('');
        headerCells = headerCells.map(c => c === '' ? ' ' : c);

        const startIdx = sepIdx >= 0 ? sepIdx + 1 : headerIdx + 1;

        let actualStartIdx = startIdx;
        if (actualStartIdx < tableLines.length) {
            const firstRowCells = splitCells(tableLines[actualStartIdx]);
            const hasBold = firstRowCells.some(c => /\*\*/.test(c));
            if (hasBold) {
                const cleanedFirst = firstRowCells.map(c => c.replace(/\*\*/g, ''));
                if (cleanedFirst.some(c => c !== '')) {
                    for (let ci = 0; ci < cleanedFirst.length && ci < headerCells.length; ci++) {
                        if (headerCells[ci] === ' ' || headerCells[ci] === '调整前' || headerCells[ci] === '调整后') {
                            headerCells[ci] = cleanedFirst[ci] || ' ';
                        } else if (cleanedFirst[ci] && cleanedFirst[ci] !== ' ') {
                            headerCells[ci] = headerCells[ci] + '/' + cleanedFirst[ci];
                        }
                    }
                    actualStartIdx++;
                }
            }
        }

        const rows = [];
        for (let i = actualStartIdx; i < tableLines.length; i++) {
            let cells = splitCells(tableLines[i]).map(c => c.replace(/\*\*/g, ''));
            while (cells.length < colCount) cells.push('');
            if (cells.length > 0 && !cells.every(c => c === '---' || c === '--' || c === '' || c === ' ')) {
                rows.push(cells);
            }
        }

        if (rows.length === 0) return null;
        const colWidth = Math.floor(9000 / colCount);
        const colWidths = headerCells.map(() => colWidth);
        return { headers: headerCells, rows, colWidths };
    }

    _getDefaultTemplateData(moduleName, type) {
        const typeLabels = { design: '设计说明书', testcase: '测试用例说明书', testreport: '测试报告', srs: '需求规格说明书' };
        const baseData = {
            coverPage: {
                title: `${moduleName}${typeLabels[type] || '详细设计文档'}`,
                company: COMPANY_DEFAULTS.company,
                product: COMPANY_DEFAULTS.product,
                version: COMPANY_DEFAULTS.version,
                documentType: typeLabels[type] || '',
                department: COMPANY_DEFAULTS.department,
                date: new Date().toLocaleDateString('zh-CN')
            },
            revisionHistory: {
                rows: [['V1.0', '', '初始版本', '', new Date().toLocaleDateString('zh-CN')]]
            },
            chapters: this._getDefaultChapters(type, moduleName)
        };
        return baseData;
    }

    _getDefaultChapters(type, moduleName) {
        if (type === 'design') {
            return [
                {
                    title: '第一章 系统概述',
                    sections: [
                        { title: '1.1 业务背景', content: { description: '（待补充业务背景）' } },
                        { title: '1.2 设计目标', content: { description: '（待补充设计目标）' } },
                        { title: '1.3 范围说明', content: { description: '（待补充范围说明）' } }
                    ]
                },
                {
                    title: '第二章 功能模块划分',
                    sections: [
                        { title: '2.1 模块划分', content: { description: '（待补充模块划分）' } }
                    ]
                },
                {
                    title: '第三章 核心业务流程',
                    sections: [
                        { title: '3.1 业务流程', content: { description: '（待补充业务流程）' } }
                    ]
                },
                {
                    title: '第四章 数据模型设计',
                    sections: [
                        { title: '4.1 数据字典', content: { description: '（待补充数据字典）' } }
                    ]
                },
                {
                    title: '第五章 接口定义',
                    sections: [
                        { title: '5.1 接口清单', content: { description: '（待补充接口清单）' } }
                    ]
                },
                {
                    title: '第六章 异常处理机制',
                    sections: [
                        { title: '6.1 异常处理', content: { description: '（待补充异常处理机制）' } }
                    ]
                },
                {
                    title: '第七章 安全策略',
                    sections: [
                        { title: '7.1 安全策略', content: { description: '（待补充安全策略）' } }
                    ]
                },
                {
                    title: '第八章 技术实现细节',
                    sections: [
                        { title: '8.1 技术实现', content: { description: '（待补充技术实现细节）' } }
                    ]
                }
            ];
        } else if (type === 'testcase') {
            return [
                {
                    title: '第一章 引言',
                    sections: [
                        { title: '1.1 编写目的', content: { description: '（待补充编写目的）' } },
                        { title: '1.2 测试范围', content: { description: '（待补充测试范围）' } }
                    ]
                },
                {
                    title: '第二章 测试计划',
                    sections: [
                        { title: '2.1 测试目标', content: { description: '（待补充测试目标）' } }
                    ]
                },
                {
                    title: '第三章 测试环境',
                    sections: [
                        { title: '3.1 硬件环境', content: { description: '（待补充硬件环境）' } },
                        { title: '3.2 软件环境', content: { description: '（待补充软件环境）' } }
                    ]
                },
                {
                    title: '第四章 功能测试用例',
                    sections: [
                        { title: '4.1 测试用例清单', content: { description: '（待补充测试用例）' } }
                    ]
                },
                {
                    title: '第五章 集成测试用例',
                    sections: [
                        { title: '5.1 端到端测试', content: { description: '（待补充集成测试用例）' } }
                    ]
                },
                {
                    title: '第六章 性能测试用例',
                    sections: [
                        { title: '6.1 负载测试', content: { description: '（待补充性能测试用例）' } }
                    ]
                },
                {
                    title: '第七章 安全测试用例',
                    sections: [
                        { title: '7.1 权限测试', content: { description: '（待补充安全测试用例）' } }
                    ]
                },
                {
                    title: '第八章 测试执行结果',
                    sections: [
                        { title: '8.1 执行情况', content: { description: '（待补充测试执行结果）' } }
                    ]
                }
            ];
        } else if (type === 'testreport') {
            return [
                {
                    title: '第一章 测试概述',
                    sections: [
                        { title: '1.1 测试概述', content: { description: '（待补充测试概述）' } }
                    ]
                },
                {
                    title: '第二章 测试执行情况',
                    sections: [
                        { title: '2.1 执行情况', content: { description: '（待补充测试执行情况）' } }
                    ]
                },
                {
                    title: '第三章 测试结果详情',
                    sections: [
                        { title: '3.1 测试结果', content: { description: '（待补充测试结果详情）' } }
                    ]
                },
                {
                    title: '第四章 缺陷统计与分析',
                    sections: [
                        { title: '4.1 缺陷统计', content: { description: '（待补充缺陷统计与分析）' } }
                    ]
                },
                {
                    title: '第五章 质量评估',
                    sections: [
                        { title: '5.1 质量评估', content: { description: '（待补充质量评估）' } }
                    ]
                },
                {
                    title: '第六章 测试结论与建议',
                    sections: [
                        { title: '6.1 测试结论', content: { description: '（待补充测试结论与建议）' } }
                    ]
                }
             ];
         } else if (type === 'srs') {
            return [
                {
                    title: '第一章 引言',
                    sections: [
                        { title: '1.1 背景', content: { description: '（待补充项目背景）' } },
                        { title: '1.2 目的', content: { description: '（待补充文档目的）' } },
                        { title: '1.3 范围', content: { description: '（待补充功能范围说明）' } },
                        { title: '1.4 术语和缩略语', content: { description: '（待补充术语定义）' } },
                        { title: '1.5 参考资料', content: { description: '（待补充参考资料）' } }
                    ]
                },
                {
                    title: '第二章 项目概述',
                    sections: [
                        { title: '2.1 项目介绍', content: { description: '（待补充项目介绍）' } },
                        { title: '2.2 项目目标', content: { description: '（待补充项目目标）' } },
                        { title: '2.3 项目范围影响分析', content: { description: '（待补充影响分析）' } },
                        { title: '2.4 运行环境', content: { description: '（待补充运行环境）' } },
                        { title: '2.5 面向用户群体', content: { description: '（待补充用户群体）' } },
                        { title: '2.6 假定和约束', content: { description: '（待补充假定和约束条件）' } }
                    ]
                },
                {
                    title: '第三章 功能需求',
                    sections: [
                        { title: '3.1 功能结构及列表', content: { description: '（待补充功能结构及列表）' } },
                        { title: '3.2 功能需求详情', content: { description: '（待补充各功能详细需求描述）' } }
                    ]
                },
                {
                    title: '第四章 非功能性需求',
                    sections: [
                        { title: '4.1 用户界面需求', content: { description: '（待补充界面需求）' } },
                        { title: '4.2 软硬件环境要求', content: { description: '（待补充环境要求）' } },
                        { title: '4.3 接口需求', content: { description: '（待补充接口需求）' } },
                        { title: '4.4 安全性需求', content: { description: '（待补充安全性需求）' } },
                        { title: '4.5 性能需求', content: { description: '（待补充性能指标要求）' } },
                        { title: '4.6 品质需求', content: { description: '（待补充品质要求）' } },
                        { title: '4.7 运维需求', content: { description: '（待补充运维要求）' } },
                        { title: '4.8 政策和法律要求', content: { description: '（待补充政策法规要求）' } },
                        { title: '4.9 设计约束', content: { description: '（待补充设计约束条件）' } }
                    ]
                },
                {
                    title: '第五章 附录',
                    sections: [
                        { title: '5.1 附录', content: { description: '（待补充附录内容）' } }
                    ]
                }
            ];
         }
         return [];
    }

    _getSRSMarkdownTemplate() {
        return `## 第一章 引言\n\n### 1.1 背景\n\n（待补充）\n\n### 1.2 目的\n\n（待补充）\n\n### 1.3 范围\n\n（待补充）\n\n### 1.4 术语和缩略语\n\n| 术语/缩略语 | 全称 | 说明 |\n| --- | --- | --- |\n| （待补充） | | |\n\n### 1.5 参考资料\n\n| 文档名称 | 版本 | 说明 |\n| --- | --- | --- |\n| （待补充） | | |\n\n## 第二章 项目概述\n\n### 2.1 项目介绍\n\n（待补充）\n\n### 2.2 项目目标\n\n| 目标类型 | 目标描述 | 衡量标准 |\n| --- | --- | --- |\n| （待补充） | | |\n\n### 2.3 项目范围影响分析\n\n（待补充）\n\n### 2.4 运行环境\n\n（待补充）\n\n### 2.5 面向用户群体\n\n（待补充）\n\n### 2.6 假定和约束\n\n（待补充）\n\n## 第三章 功能需求\n\n### 3.1 功能结构及列表\n\n（待补充）\n\n### 3.2 功能需求详情\n\n（待补充）\n\n## 第四章 非功能性需求\n\n### 4.1 用户界面需求\n\n（待补充）\n\n### 4.2 软硬件环境要求\n\n（待补充）\n\n### 4.3 接口需求\n\n（待补充）\n\n### 4.4 安全性需求\n\n（待补充）\n\n### 4.5 性能需求\n\n（待补充）\n\n### 4.6 品质需求\n\n（待补充）\n\n### 4.7 运维需求\n\n（待补充）\n\n### 4.8 政策和法律要求\n\n（待补充）\n\n### 4.9 设计约束\n\n（待补充）\n\n## 第五章 附录\n\n（待补充）\n`;
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
