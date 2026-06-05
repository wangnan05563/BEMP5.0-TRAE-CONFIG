const fs = require('fs');
const path = require('path');

class DocValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    validateDocxStructure(docPath) {
        this.errors = [];
        this.warnings = [];
        this.info = [];

        if (!fs.existsSync(docPath)) {
            this.errors.push({ code: 'V001', message: `文件不存在: ${docPath}` });
            return this._result();
        }

        const stats = fs.statSync(docPath);
        if (stats.size < 10240) {
            this.warnings.push({ code: 'W001', message: `文件过小 (${(stats.size / 1024).toFixed(1)}KB)，可能内容不完整` });
        }

        this.info.push({ code: 'I001', message: `文件大小: ${(stats.size / 1024).toFixed(1)}KB` });

        return this._result();
    }

    validateNumbering(headings) {
        this.errors = [];
        this.warnings = [];
        this.info = [];

        const numberRegex = /^(\d+\.[\d.]+)\s/;
        const numberedHeadings = headings.filter(h => numberRegex.test(h.text));

        let prevNumParts = [];
        let prevLevel = 0;

        for (let i = 0; i < numberedHeadings.length; i++) {
            const h = numberedHeadings[i];
            const match = h.text.match(numberRegex);
            if (!match) continue;

            const numStr = match[1];
            const parts = numStr.split('.').map(Number);
            const level = parts.length;

            if (level > 6) {
                this.warnings.push({
                    code: 'W010',
                    message: `序号层级过深 (>6): "${h.text}"`,
                    heading: h.text
                });
            }

            if (parts.some(p => p === 0)) {
                this.errors.push({
                    code: 'E010',
                    message: `序号包含0: "${h.text}"`,
                    heading: h.text
                });
            }

            if (i > 0 && prevNumParts.length > 0) {
                if (level === prevLevel) {
                    if (parts[parts.length - 1] !== prevNumParts[prevNumParts.length - 1] + 1) {
                        if (parts[parts.length - 2] !== prevNumParts[prevNumParts.length - 2]) {
                            // 同级但不同父级，允许
                        }
                    }
                } else if (level === prevLevel + 1) {
                    const parentParts = parts.slice(0, -1);
                    const expectedParent = prevNumParts;
                    if (parentParts.join('.') !== expectedParent.join('.')) {
                        this.warnings.push({
                            code: 'W011',
                            message: `子级序号与父级不连续: "${h.text}" (期望父级: ${expectedParent.join('.')})`,
                            heading: h.text
                        });
                    }
                }
            }

            prevNumParts = parts;
            prevLevel = level;
        }

        this.info.push({ code: 'I010', message: `共检测到 ${numberedHeadings.length} 个带序号标题` });

        return this._result();
    }

    validateHeadingHierarchy(headings) {
        this.errors = [];
        this.warnings = [];
        this.info = [];

        let lastH1 = '';
        let lastH2 = '';
        let foundFuncSection = false;
        let funcSectionHeadings = [];

        for (const h of headings) {
            if (h.text.includes('功能需求') && h.style.includes('1')) {
                foundFuncSection = true;
            }

            if (foundFuncSection && h.style.includes('Heading')) {
                funcSectionHeadings.push(h);
            }
        }

        if (funcSectionHeadings.length > 0) {
            this.info.push({
                code: 'I020',
                message: `功能需求章节共 ${funcSectionHeadings.length} 个标题`
            });
        }

        return this._result();
    }

    validateContentCompleteness(chapters) {
        this.errors = [];
        this.warnings = [];
        this.info = [];

        const requiredChapters = ['引言', '项目概述', '功能需求', '非功能性需求'];
        const chapterTitles = chapters.map(c => c.title);

        for (const req of requiredChapters) {
            if (!chapterTitles.some(t => t.includes(req))) {
                this.errors.push({
                    code: 'E020',
                    message: `缺少必填章节: ${req}`
                });
            }
        }

        for (const chapter of chapters) {
            if (chapter.sections) {
                for (const section of chapter.sections) {
                    const content = section.content;
                    if (content && content.description) {
                        if (content.description.includes('（待补充）') || content.description.includes('（根据')) {
                            this.warnings.push({
                                code: 'W020',
                                message: `章节 "${section.title}" 包含占位符内容`
                            });
                        }
                    }
                }
            }
        }

        return this._result();
    }

    validateAll(docPath, templateData) {
        const results = [];

        results.push(this.validateDocxStructure(docPath));

        if (templateData && templateData.chapters) {
            const headings = this._extractHeadingsFromTemplate(templateData);
            results.push(this.validateNumbering(headings));
            results.push(this.validateHeadingHierarchy(headings));
            results.push(this.validateContentCompleteness(templateData.chapters));
        }

        const merged = {
            passed: results.every(r => r.errors.length === 0),
            errors: results.flatMap(r => r.errors),
            warnings: results.flatMap(r => r.warnings),
            info: results.flatMap(r => r.info),
            summary: ''
        };

        const errCount = merged.errors.length;
        const warnCount = merged.warnings.length;
        merged.summary = errCount > 0
            ? `❌ 验证未通过: ${errCount} 个错误, ${warnCount} 个警告`
            : warnCount > 0
                ? `⚠️ 验证通过(有警告): ${warnCount} 个警告`
                : `✅ 验证通过: 无错误无警告`;

        return merged;
    }

    _extractHeadingsFromTemplate(templateData) {
        const headings = [];

        if (templateData.chapters) {
            for (const chapter of templateData.chapters) {
                headings.push({ text: chapter.title, style: 'Heading 1' });

                if (chapter.sections) {
                    for (const section of chapter.sections) {
                        headings.push({ text: section.title, style: 'Heading 2' });

                        if (section.subSections) {
                            for (const sub of section.subSections) {
                                headings.push({ text: sub.title, style: 'Heading 3' });
                            }
                        }
                    }
                }
            }
        }

        return headings;
    }

    _result() {
        return {
            passed: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings],
            info: [...this.info]
        };
    }
}

module.exports = { DocValidator };
