const fs = require('fs');
const path = require('path');
const { BempDocError, ERROR_CODES } = require('../config/default');

class RequirementAnalyzer {
    constructor(options = {}) {
        this.options = {
            defaultModuleHierarchy: ['系统管理子系统', '业务管理子系统', '场内交易子系统'],
            ...options
        };
    }

    analyzeRequirement(mdContent) {
        const testPoints = this._extractTestPoints(mdContent);
        const testCases = this._generateTestCases(testPoints);
        return {
            testPoints,
            testCases,
            summary: {
                totalTestPoints: testPoints.length,
                totalTestCases: testCases.length,
                positiveCases: testCases.filter(tc => tc.nature === '正例').length,
                negativeCases: testCases.filter(tc => tc.nature === '反例').length,
                boundaryCases: testCases.filter(tc => tc.nature === '边界').length
            }
        };
    }

    analyzeRequirementFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new BempDocError(ERROR_CODES.REQUIREMENT_NOT_FOUND, `需求文件不存在: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return this.analyzeRequirement(content);
    }

    _extractTestPoints(content) {
        const testPoints = [];
        const lines = content.split('\n');
        const subsystemKeywords = ['系统管理子系统', '业务管理子系统', '场内交易子系统', '场内业务子系统'];
        const menuPath = this._extractMenuPath(content, subsystemKeywords);
        const level1 = menuPath.level1;
        const level2 = menuPath.level2;
        const level3 = menuPath.level3;

        const sections = this._splitBySubFeatureHeadings(lines);
        for (const section of sections) {
            const tp = this._buildTestPoint(section, level1, level2, level3, content);
            if (tp) testPoints.push(tp);
        }

        if (testPoints.length === 0) {
            testPoints.push(...this._fallbackExtract(content, level1, level2, level3));
        }

        return testPoints;
    }

    _extractMenuPath(content, subsystemKeywords) {
        const regex = /【([^】]+)】/g;
        let match;
        const refs = [];
        while ((match = regex.exec(content)) !== null) refs.push(match[1]);
        const subsystems = refs.filter(ref => subsystemKeywords.includes(ref));
        const modules = refs.filter(ref => !subsystemKeywords.includes(ref));
        return {
            level1: subsystems[0] || '系统管理子系统',
            level2: modules[0] || '',
            level3: modules[1] || modules[0] || ''
        };
    }

    _splitBySubFeatureHeadings(lines) {
        const sections = [];
        let currentHeading = '';
        let currentLevel = 0;
        let buffer = [];
        let parentHeadings = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

            if (headingMatch) {
                if (buffer.length > 0 && currentHeading) {
                    sections.push({
                        title: currentHeading,
                        level: currentLevel,
                        content: buffer.join('\n'),
                        parentTitle: parentHeadings[currentLevel - 1] || ''
                    });
                }
                currentLevel = headingMatch[1].length;
                currentHeading = headingMatch[2].trim();
                parentHeadings[currentLevel] = currentHeading;
                buffer = [];
            } else {
                buffer.push(line);
            }
        }

        if (buffer.length > 0 && currentHeading) {
            sections.push({
                title: currentHeading,
                level: currentLevel,
                content: buffer.join('\n'),
                parentTitle: parentHeadings[currentLevel - 1] || ''
            });
        }

        return sections;
    }

    _buildTestPoint(section, level1, level2, level3, fullContent) {
        const title = section.title;
        const sectionContent = section.content;

        const skipKeywords = ['需求背景', '需求目标', '需求概述', '优化详情', '问题描述', '业务背景', '分析结果', '版本历史'];
        if (skipKeywords.some(kw => title.includes(kw))) return null;

        const isSubFeature = section.level >= 5;
        const isMidFeature = section.level >= 3 && section.level <= 4;
        if (!isSubFeature && !isMidFeature) return null;

        const hasContent = sectionContent.trim().length > 10;
        if (!hasContent) return null;

        const businessRules = this._extractBusinessRules(sectionContent);
        const validations = this._extractValidations(sectionContent);
        const fieldDescriptions = this._extractFieldDescriptions(sectionContent);

        let level4 = title;
        if (isSubFeature && section.parentTitle) level4 = section.parentTitle + '-' + title;

        const description = businessRules.length > 0 ? businessRules.join('；') : title;

        return {
            level1, level2, level3, level4, description,
            validations: validations.length > 0 ? validations : ['正常流程'],
            businessRules, fieldDescriptions,
            rawText: sectionContent
        };
    }

    _extractBusinessRules(content) {
        const rules = [];
        const lines = content.split('\n');
        const rulePatterns = [/^\s*\d+\.\s+(.+)/, /^\s*[-*+]\s+(.+)/];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            for (const pattern of rulePatterns) {
                const match = trimmed.match(pattern);
                if (match) {
                    const ruleText = match[1].trim();
                    if (ruleText.length > 3 && !ruleText.startsWith('|') && !ruleText.startsWith('---')) {
                        rules.push(ruleText);
                    }
                    break;
                }
            }
        }
        return rules;
    }

    _extractFieldDescriptions(content) {
        const fields = [];
        const lines = content.split('\n');
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.includes('数据名称')) {
                inTable = true;
                continue;
            }
            if (inTable && line.startsWith('|')) {
                const cells = line.split('|').map(c => c.trim()).filter(Boolean);
                if (cells.length >= 4) {
                    const fieldName = cells[0];
                    const ioType = cells[1];
                    const required = cells[3] || '';
                    const constraint = cells[4] || '';
                    if (fieldName && fieldName !== '数据名称' && !fieldName.startsWith('-')) {
                        fields.push({ name: fieldName, io: ioType, required: required.includes('M') || required.includes('必输'), constraint });
                    }
                }
            } else if (inTable && !line.startsWith('|')) {
                inTable = false;
            }
        }
        return fields;
    }

    _extractValidations(text) {
        const validations = [];
        const patterns = [
            { regex: /不可重复|不能重复|唯一|不可与.*重复/g, type: '唯一性校验' },
            { regex: /必[须需输填]|不能为空|不可为空|M\(必输\)/g, type: '必填校验' },
            { regex: /格式[为应]|格式要求|格式校验/g, type: '格式校验' },
            { regex: /不超过|不能超过|最多|最大|最小|至少|必须大于/g, type: '边界校验' },
            { regex: /提示|报错|错误|失败/g, type: '异常提示' },
            { regex: /只能|仅[限能]|不允许|不可以/g, type: '权限校验' },
            { regex: /已存在|重复|冲突/g, type: '重复校验' },
            { regex: /默认|自动/g, type: '默认值校验' },
            { regex: /灰显|不可修改|只读/g, type: '只读校验' },
            { regex: /校验|验证|检查/g, type: '数据校验' },
            { regex: /选中|选择.*数据|未选择/g, type: '选择校验' },
            { regex: /确认|二次确认/g, type: '确认校验' }
        ];

        for (const pattern of patterns) {
            if (pattern.regex.test(text)) validations.push(pattern.type);
        }
        return validations;
    }

    _fallbackExtract(content, level1, level2, level3) {
        const testPoints = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const numberedMatch = line.match(/^\s*\d+\.\s+【([^】]+)】/);
            if (!numberedMatch) continue;

            const featureName = numberedMatch[1];
            const subLines = [];
            for (let j = i + 1; j < lines.length && j < i + 15; j++) {
                const subLine = lines[j].trim();
                const subMatch = subLine.match(/^\s*\d+\.\s+(.+)/);
                if (subMatch && !subLine.match(/^\s*\d+\.\s+【/)) {
                    subLines.push(subMatch[1].trim());
                } else if (subLine.match(/^\s*\d+\.\s+【/)) {
                    break;
                }
            }

            testPoints.push({
                level1, level2, level3,
                level4: featureName,
                description: subLines.length > 0 ? subLines.join('；') : featureName,
                validations: this._extractValidations(subLines.join('\n')),
                businessRules: subLines,
                fieldDescriptions: [],
                rawText: [line, ...subLines].join('\n')
            });
        }
        return testPoints;
    }

    _generateTestCases(testPoints) {
        const testCases = [];
        let caseId = 1;

        for (const tp of testPoints) {
            testCases.push({
                id: caseId++,
                level1: tp.level1, level2: tp.level2, level3: tp.level3, level4: tp.level4,
                precondition: this._generatePrecondition(tp),
                content: this._generatePositiveContent(tp),
                nature: '正例',
                expected: this._generatePositiveExpected(tp)
            });

            const validationTypes = tp.validations.filter(v => v !== '正常流程');
            const limitedValidations = validationTypes.slice(0, 3);

            for (const validation of limitedValidations) {
                const negativeCase = this._generateNegativeCase(tp, validation, caseId);
                if (negativeCase) { testCases.push(negativeCase); caseId++; }
            }

            const specificCases = this._generateSpecificTestCases(tp, caseId);
            for (const tc of specificCases) { testCases.push(tc); caseId++; }
        }

        return testCases;
    }

    _generateSpecificTestCases(tp, startId) {
        const cases = [];
        let id = startId;

        if (tp.businessRules && tp.businessRules.length > 0) {
            for (const rule of tp.businessRules) {
                if (this._isNegativeRule(rule)) {
                    cases.push({
                        id: id++,
                        level1: tp.level1, level2: tp.level2, level3: tp.level3,
                        level4: tp.level4,
                        precondition: this._generatePrecondition(tp),
                        content: rule.length > 80 ? rule.substring(0, 80) + '...' : rule,
                        nature: '反例',
                        expected: this._extractExpectedFromRule(rule)
                    });
                }
            }
        }

        if (tp.fieldDescriptions) {
            const requiredFields = tp.fieldDescriptions.filter(f => f.required);
            for (const field of requiredFields.slice(0, 3)) {
                cases.push({
                    id: id++,
                    level1: tp.level1, level2: tp.level2, level3: tp.level3,
                    level4: `${tp.level4}-${field.name}必填`,
                    precondition: this._generatePrecondition(tp),
                    content: `不填写${field.name}，执行${tp.level4}操作`,
                    nature: '反例',
                    expected: `操作失败，提示${field.name}为必填项`
                });
            }
        }

        return cases;
    }

    _isNegativeRule(rule) {
        const kws = ['不能', '不可', '不允许', '必须', '不可以', '失败', '报错', '提示', '拒绝', '超过', '大于', '小于', '未选择', '若未选择'];
        return kws.some(kw => rule.includes(kw));
    }

    _extractExpectedFromRule(rule) {
        const promptMatch = rule.match(/提示[""「」""]([^""「」""]+)[""「」""]/);
        if (promptMatch) return `提示：${promptMatch[1]}`;
        const errorMatch = rule.match(/报错[""「」""]([^""「」""]+)[""「」""]/);
        if (errorMatch) return `报错：${errorMatch[1]}`;
        if (rule.includes('不能')) return '操作被拒绝，系统给出限制提示';
        if (rule.includes('必须')) return '校验不通过，提示必须满足的条件';
        if (rule.includes('超过')) return '操作失败，提示超出限制';
        return '操作失败，系统给出相应提示';
    }

    _generatePrecondition(tp) {
        const subsystemMap = {
            '系统管理子系统': '系统管理子系统',
            '业务管理子系统': '业务管理子系统',
            '场内交易子系统': '场内交易子系统',
            '场内业务子系统': '场内交易子系统'
        };
        const subsystem = subsystemMap[tp.level1] || tp.level1;
        const menuPath = [tp.level2, tp.level3, tp.level4].filter(Boolean).join('-');
        return `已登录${subsystem}，进入${menuPath}菜单`;
    }

    _generatePositiveContent(tp) {
        const desc = tp.description || tp.level4;
        const shortDesc = desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
        return `执行${tp.level4}操作，输入符合要求的数据：${shortDesc}`;
    }

    _generatePositiveExpected(tp) {
        return `${tp.level4}操作成功，数据正确保存并刷新显示`;
    }

    _generateNegativeCase(tp, validationType, caseId) {
        const templates = {
            '唯一性校验': { content: `输入已存在的重复数据进行${tp.level4}操作`, expected: `操作失败，提示数据不可重复` },
            '必填校验': { content: `不填写必填项，执行${tp.level4}操作`, expected: `操作失败，提示必填项不能为空` },
            '格式校验': { content: `输入不符合格式要求的数据，执行${tp.level4}操作`, expected: `操作失败，提示数据格式不正确` },
            '边界校验': { content: `输入超出边界值的数据，执行${tp.level4}操作`, expected: `操作失败，提示数据超出允许范围` },
            '异常提示': { content: `在异常条件下执行${tp.level4}操作`, expected: `系统给出明确的错误提示信息` },
            '权限校验': { content: `在无权限的情况下执行${tp.level4}操作`, expected: `操作被拒绝，提示无权限` },
            '重复校验': { content: `重复提交${tp.level4}操作`, expected: `系统拦截重复操作，提示数据已存在` },
            '默认值校验': { content: `不修改默认值，执行${tp.level4}操作`, expected: `系统使用默认值正确处理` },
            '只读校验': { content: `尝试修改只读字段，执行${tp.level4}操作`, expected: `只读字段不可修改，操作正常完成` },
            '数据校验': { content: `输入不符合校验规则的数据，执行${tp.level4}操作`, expected: `校验不通过，提示具体校验错误信息` },
            '选择校验': { content: `未选择任何数据，执行${tp.level4}操作`, expected: `提示"请选中一条数据"` },
            '确认校验': { content: `执行${tp.level4}操作，在确认弹窗中点击取消`, expected: `操作取消，数据不变` }
        };

        const template = templates[validationType];
        if (!template) return null;

        return {
            id: caseId,
            level1: tp.level1, level2: tp.level2, level3: tp.level3,
            level4: `${tp.level4}-${validationType}`,
            precondition: this._generatePrecondition(tp),
            content: template.content,
            nature: '反例',
            expected: template.expected
        };
    }
}

module.exports = { RequirementAnalyzer };
