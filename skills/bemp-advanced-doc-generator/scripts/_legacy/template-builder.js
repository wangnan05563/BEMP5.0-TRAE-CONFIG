const fs = require('fs');
const { BempDocError, ERROR_CODES, COMPANY_DEFAULTS } = require('../config/default');

class TemplateBuilder {
    constructor() {
        this.companyDefaults = COMPANY_DEFAULTS;
    }

    buildFromRequirement(requirementPath, type, moduleName) {
        const { RequirementAnalyzer } = require('./requirement-analyzer');
        const analyzer = new RequirementAnalyzer();
        const result = analyzer.analyzeRequirementFile(requirementPath);
        const content = fs.readFileSync(requirementPath, 'utf-8');

        if (type === 'testcase') {
            return this.buildTestCaseTemplate(result, moduleName);
        }

        if (type === 'srs') {
            try {
                const { SRSConverter } = require('./srs-converter');
                const converter = new SRSConverter();
                return converter.convertToSRS(requirementPath, moduleName);
            } catch (e) {
                console.warn(`⚠ SRSConverter转换失败，使用基础模板: ${e.message}`);
                return this.buildSRSTemplate(content, moduleName);
            }
        }

        return this.buildDesignTemplate(content, moduleName);
    }

    _createCoverData(titleSuffix, moduleName) {
        return {
            title: `${moduleName}${titleSuffix}`,
            company: this.companyDefaults.company,
            product: this.companyDefaults.product,
            version: this.companyDefaults.version,
            documentType: titleSuffix,
            department: this.companyDefaults.department,
            date: new Date().toLocaleDateString('zh-CN')
        };
    }

    _createRevisionHistory(rows) {
        return {
            rows: rows || [['V1.0', '', '初始版本', '', new Date().toLocaleDateString('zh-CN')]]
        };
    }

    buildDesignTemplate(content, moduleName) {
        const lines = content.split('\n');
        const sections = this._parseRequirementSections(lines);

        const coverPage = this._createCoverData('详细设计文档', moduleName);
        const revisionHistory = this._createRevisionHistory();
        const chapters = [];

        chapters.push({
            title: '第一章 系统概述',
            sections: [
                { title: '1.1 业务背景', content: { description: this._extractBusinessBackground(content) } },
                { title: '1.2 设计目标', content: { description: this._extractDesignGoals(content) } },
                { title: '1.3 范围说明', content: { description: this._extractScope(content) } }
            ]
        });

        chapters.push({
            title: '第二章 功能模块划分',
            sections: sections.map(s => ({
                title: s.title,
                content: { description: s.content.substring(0, 200) }
            }))
        });

        chapters.push({
            title: '第三章 核心业务流程',
            sections: sections.filter(s => s.hasBusinessRules).map(s => ({
                title: `3.${sections.indexOf(s) + 1} ${s.title}业务流程`,
                content: { description: s.businessRules.join('；') }
            }))
        });

        chapters.push({
            title: '第四章 数据模型设计',
            sections: sections.filter(s => s.hasFields).map(s => ({
                title: `4.${sections.indexOf(s) + 1} ${s.title}数据字段`,
                content: {
                    headers: ['字段名称', '输入/输出', '是否必输', '数据约束'],
                    rows: s.fields.map(f => [f.name, f.io, f.required ? 'M(必输)' : 'O(可输)', f.constraint]),
                    colWidths: [2000, 1500, 1500, 3000]
                }
            }))
        });

        chapters.push({
            title: '第五章 接口定义',
            sections: [{ title: '5.1 接口清单', content: { description: '（根据实际实现补充）' } }]
        });

        chapters.push({
            title: '第六章 异常处理机制',
            sections: sections.filter(s => s.hasValidations).map(s => ({
                title: `6.${sections.indexOf(s) + 1} ${s.title}校验规则`,
                content: { description: s.validations.join('；') }
            }))
        });

        chapters.push({
            title: '第七章 安全策略',
            sections: [{ title: '7.1 权限控制', content: { description: '（根据实际实现补充）' } }]
        });

        chapters.push({
            title: '第八章 技术实现细节',
            sections: [{ title: '8.1 核心逻辑', content: { description: '（根据实际实现补充）' } }]
        });

        return { coverPage, revisionHistory, chapters };
    }

    buildTestCaseTemplate(analysisResult, moduleName) {
        const { testCases, summary } = analysisResult;

        const coverPage = this._createCoverData('测试用例说明书', moduleName);
        const revisionHistory = this._createRevisionHistory();
        const chapters = [];

        chapters.push({
            title: '第一章 引言',
            sections: [
                { title: '1.1 编写目的', content: { description: `本文档用于验证${moduleName}功能的正确性和完整性。` } },
                { title: '1.2 测试范围', content: { description: `覆盖${moduleName}的所有功能点，包括正向流程、反向异常和边界值场景。` } }
            ]
        });

        chapters.push({
            title: '第二章 测试计划',
            sections: [
                { title: '2.1 测试目标', content: { description: `共设计 ${summary.totalTestCases} 条测试用例，其中正例 ${summary.positiveCases} 条，反例 ${summary.negativeCases} 条，边界 ${summary.boundaryCases} 条。` } }
            ]
        });

        chapters.push({
            title: '第三章 测试环境',
            sections: [
                { title: '3.1 硬件环境', content: { description: '（根据实际环境补充）' } },
                { title: '3.2 软件环境', content: { description: '（根据实际环境补充）' } }
            ]
        });

        const groupedCases = {};
        for (const tc of testCases) {
            const key = tc.level4 || tc.level3 || '其他';
            if (!groupedCases[key]) groupedCases[key] = [];
            groupedCases[key].push(tc);
        }

        const caseTableRows = [];
        for (const cases of Object.values(groupedCases)) {
            for (const tc of cases) {
                caseTableRows.push([
                    `TC-${String(tc.id).padStart(3, '0')}`,
                    tc.level4,
                    tc.precondition,
                    tc.content,
                    tc.expected,
                    tc.nature
                ]);
            }
        }

        chapters.push({
            title: '第四章 功能测试用例',
            sections: [{
                title: '4.1 测试用例清单',
                content: {
                    headers: ['用例编号', '功能点', '前置条件', '测试步骤', '预期结果', '用例性质'],
                    rows: caseTableRows,
                    colWidths: [1200, 2000, 2000, 2500, 2000, 1000]
                }
            }]
        });

        chapters.push({
            title: '第五章 集成测试用例',
            sections: [{ title: '5.1 端到端测试', content: { description: '（根据实际场景补充）' } }]
        });

        chapters.push({
            title: '第六章 性能测试用例',
            sections: [{ title: '6.1 负载测试', content: { description: '（根据实际场景补充）' } }]
        });

        chapters.push({
            title: '第七章 安全测试用例',
            sections: [{ title: '7.1 权限测试', content: { description: '（根据实际场景补充）' } }]
        });

        chapters.push({
            title: '第八章 测试执行结果',
            sections: [{ title: '8.1 执行情况', content: { description: '（测试执行后补充）' } }]
        });

        return { coverPage, revisionHistory, chapters };
    }

    buildSRSTemplate(content, moduleName) {
        const lines = content.split('\n');
        const sections = this._parseRequirementSections(lines);

        const coverPage = this._createCoverData('-需求规格说明书', moduleName);
        const revisionHistory = this._createRevisionHistory([['V1.0', new Date().toLocaleDateString('zh-CN'), '', '初始版本']]);
        const chapters = [];

        chapters.push({
            title: '第一章 引言',
            sections: [
                { title: '1.1 背景', content: { description: this._extractBusinessBackground(content) } },
                { title: '1.2 目的', content: { description: `本文档旨在明确${moduleName}的功能需求和非功能性需求，为后续的设计、开发、测试和验收提供依据。` } },
                { title: '1.3 范围', content: { description: this._extractScope(content) } },
                { title: '1.4 术语和缩略语', content: { description: '（根据项目实际情况补充）' } },
                { title: '1.5 参考资料', content: { description: '（根据项目实际情况补充）' } }
            ]
        });

        chapters.push({
            title: '第二章 项目概述',
            sections: [
                { title: '2.1 项目介绍', content: { description: `本项目为${moduleName}模块的功能优化开发。` } },
                { title: '2.2 项目目标', content: { description: this._extractDesignGoals(content) } },
                { title: '2.3 项目范围影响分析', content: { description: '（根据项目实际情况补充）' } },
                { title: '2.4 运行环境', content: { description: '（根据项目实际情况补充）' } },
                { title: '2.5 面向用户群体', content: { description: '（根据项目实际情况补充）' } },
                { title: '2.6 假定和约束', content: { description: '（根据项目实际情况补充）' } }
            ]
        });

        const funcListRows = sections.map((s, i) => [`F-${String(i + 1).padStart(3, '0')}`, s.title, moduleName, s.title, '高']);

        const funcDetailSections = sections.map((s, idx) => {
            const detailSections = [];
            if (s.content && s.content.trim().length > 10) {
                detailSections.push({ title: `${idx + 1}.1 功能概述`, content: { description: s.content.substring(0, 500) } });
            }
            if (s.hasBusinessRules) {
                detailSections.push({ title: `${idx + 1}.2 业务规则`, content: { description: s.businessRules.map((r, i) => `${i + 1}. ${r}`).join('\n') } });
            }
            if (s.hasFields) {
                detailSections.push({
                    title: `${idx + 1}.3 输入/输出要素`,
                    content: {
                        headers: ['数据名称', '输入/输出', '是否必输', '数据约束'],
                        rows: s.fields.map(f => [f.name, f.io, f.required ? 'M(必输)' : 'O(可输)', f.constraint]),
                        colWidths: [2000, 1500, 1500, 3000]
                    }
                });
            }
            if (s.hasValidations) {
                detailSections.push({ title: `${idx + 1}.4 异常处理`, content: { description: s.validations.join('；') } });
            }
            detailSections.push({ title: `${idx + 1}.5 补充说明`, content: { description: '（根据项目实际情况补充）' } });
            return { title: s.title, sections: detailSections };
        });

        chapters.push({
            title: '第三章 功能需求',
            sections: [
                {
                    title: '3.1 功能结构及列表',
                    content: { headers: ['功能编号', '功能名称', '所属子系统', '所属业务', '优先级'], rows: funcListRows, colWidths: [1200, 2500, 2000, 2000, 1000] }
                },
                {
                    title: '3.2 功能需求详情',
                    content: { description: '以下对各功能模块进行详细需求描述。' },
                    subSections: funcDetailSections.flatMap(fd => fd.sections)
                }
            ]
        });

        chapters.push({
            title: '第四章 非功能性需求',
            sections: [
                { title: '4.1 用户界面需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.2 软硬件环境要求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.3 接口需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.4 安全性需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.5 性能需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.6 品质需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.7 运维需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.8 政策和法律要求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.9 设计约束', content: { description: '（根据项目实际情况补充）' } }
            ]
        });

        chapters.push({
            title: '第五章 附录',
            sections: [
                { title: '5.1 附录', content: { description: '（根据项目实际情况补充）' } }
            ]
        });

        return { coverPage, revisionHistory, chapters };
    }

    _parseRequirementSections(lines) {
        const sections = [];
        let currentTitle = '';
        let currentContent = '';
        let currentRules = [];
        let currentFields = [];
        let currentValidations = [];

        const flushSection = () => {
            if (currentTitle && currentContent.trim().length > 10) {
                sections.push({
                    title: currentTitle,
                    content: currentContent,
                    businessRules: currentRules,
                    fields: currentFields,
                    validations: currentValidations,
                    hasBusinessRules: currentRules.length > 0,
                    hasFields: currentFields.length > 0,
                    hasValidations: currentValidations.length > 0
                });
            }
        };

        for (const line of lines) {
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                flushSection();
                currentTitle = headingMatch[2].trim();
                currentContent = '';
                currentRules = [];
                currentFields = [];
                currentValidations = [];
            } else {
                currentContent += line + '\n';

                const trimmed = line.trim();
                if (trimmed.match(/^\s*\d+\.\s+/) || trimmed.match(/^\s*[-*+]\s+/)) {
                    const ruleText = trimmed.replace(/^\s*(\d+\.|[-*+])\s+/, '');
                    if (ruleText.length > 3 && !ruleText.startsWith('|')) {
                        currentRules.push(ruleText);
                    }
                }

                if (trimmed.startsWith('|') && trimmed.includes('数据名称')) {
                    continue;
                }
                if (trimmed.startsWith('|')) {
                    const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
                    if (cells.length >= 4 && cells[0] !== '数据名称' && !cells[0].startsWith('-')) {
                        currentFields.push({
                            name: cells[0],
                            io: cells[1] || '',
                            required: (cells[3] || '').includes('M') || (cells[3] || '').includes('必输'),
                            constraint: cells[4] || ''
                        });
                    }
                }

                const validationPatterns = [
                    { regex: /不可重复|不能重复|唯一/g, type: '唯一性校验' },
                    { regex: /必[须需输填]|不能为空/g, type: '必填校验' },
                    { regex: /格式[为应]|格式要求/g, type: '格式校验' },
                    { regex: /不超过|不能超过|最多|最大|最小/g, type: '边界校验' },
                    { regex: /提示|报错|错误|失败/g, type: '异常提示' },
                    { regex: /只能|仅[限能]|不允许/g, type: '权限校验' },
                    { regex: /已存在|重复|冲突/g, type: '重复校验' },
                    { regex: /确认|二次确认/g, type: '确认校验' }
                ];
                for (const p of validationPatterns) {
                    if (p.regex.test(trimmed) && !currentValidations.includes(p.type)) {
                        currentValidations.push(p.type);
                    }
                }
            }
        }

        flushSection();
        return sections;
    }

    _extractBusinessBackground(content) {
        const match = content.match(/####?\s*业务背景\s*\n([\s\S]*?)(?=####?|\Z)/);
        return match ? match[1].trim().substring(0, 500) : '（待补充业务背景）';
    }

    _extractDesignGoals(content) {
        const match = content.match(/####?\s*优化详情\s*\n([\s\S]*?)(?=####?|\Z)/);
        return match ? match[1].trim().substring(0, 500) : '（待补充设计目标）';
    }

    _extractScope(content) {
        const lines = content.split('\n').filter(l => l.trim().startsWith('######'));
        return lines.length > 0 ? `覆盖以下功能点：\n${lines.map(l => l.replace(/^#+\s*/, '')).join('、')}` : '（待补充范围说明）';
    }
}

module.exports = { TemplateBuilder };
