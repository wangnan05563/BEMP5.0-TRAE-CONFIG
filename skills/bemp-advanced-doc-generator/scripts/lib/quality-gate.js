'use strict';

/**
 * QualityGate —— 统一质量门禁模块
 *
 * 职责：
 *   1. 从 bank config 的 qualityGate 配置或默认值加载阈值
 *   2. 对 docx/xlsx/testcase 三种文档类型提供统一校验接口
 *   3. 所有阈值参数化，零硬编码
 *
 * 配置来源优先级：bank config qualityGate > 内置默认值
 *
 * 配置结构（bank config qualityGate）：
 *   docx: { minParagraphs, maxBlueResidual, maxPlaceholderResidual, headingLevelConsistency }
 *   xlsx: { minFillRate, requiredKeyFillRate, maxBlueResidual, fontConsistency }
 *   testcase: { minCases, columnAlignmentRate, priorityDistribution }
 */

/** 内置默认阈值 —— 无 bank config 时使用 */
const DEFAULT_THRESHOLDS = {
    docx: {
        minParagraphs: 50,
        maxBlueResidual: 0,
        maxPlaceholderResidual: 0,
        headingLevelConsistency: true
    },
    xlsx: {
        minFillRate: 100,
        requiredKeyFillRate: 100,
        maxBlueResidual: 0,
        fontConsistency: true
    },
    testcase: {
        minCases: 1,
        columnAlignmentRate: 100,
        priorityDistribution: {}
    }
};

class QualityGate {
    /**
     * @param {Object} config 银行级 qualityGate 配置（来自 bank config）
     */
    constructor(config = {}) {
        this.thresholds = {
            docx: { ...DEFAULT_THRESHOLDS.docx, ...(config.docx || {}) },
            xlsx: { ...DEFAULT_THRESHOLDS.xlsx, ...(config.xlsx || {}) },
            testcase: { ...DEFAULT_THRESHOLDS.testcase, ...(config.testcase || {}) }
        };
    }

    /**
     * 校验 xlsx 报告质量
     * @param {Object} params
     * @param {number} params.writtenCount 写入行数
     * @param {Array} params.columnRates 列填充率统计
     * @param {number} params.blueCount 蓝色字体数量
     * @param {boolean} params.fontConsistent 字体是否一致
     * @returns {{passed: boolean, items: Array, summary: Object}}
     */
    checkXlsx(params) {
        const { writtenCount, columnRates = [], blueCount = 0, fontConsistent = true } = params;
        const t = this.thresholds.xlsx;
        const items = [];

        // 1. 用例数门禁
        items.push({
            name: '用例数',
            pass: writtenCount >= this.thresholds.testcase.minCases,
            message: writtenCount >= this.thresholds.testcase.minCases
                ? `写入 ${writtenCount} 条`
                : `用例数 ${writtenCount} 低于最低要求 ${this.thresholds.testcase.minCases}`
        });

        // 2. 必含主键填充率门禁
        const requiredCols = columnRates.filter(c => c.required);
        const requiredUnderfilled = requiredCols.filter(c => c.rate < t.requiredKeyFillRate);
        items.push({
            name: '必含主键填充率',
            pass: requiredUnderfilled.length === 0,
            message: requiredUnderfilled.length === 0
                ? `全部 ${requiredCols.length} 个必含主键填充率 ≥ ${t.requiredKeyFillRate}%`
                : `${requiredUnderfilled.length} 列不达标: ${requiredUnderfilled.map(c => `${c.headerText}=${c.rate}%`).join(', ')}`
        });

        // 3. 整体填充率门禁
        const underfilled = columnRates.filter(c => c.rate < t.minFillRate);
        items.push({
            name: '整体填充率',
            pass: underfilled.length === 0,
            message: underfilled.length === 0
                ? `全部 ${columnRates.length} 列填充率 ≥ ${t.minFillRate}%`
                : `${underfilled.length} 列低于 ${t.minFillRate}%: ${underfilled.map(c => `${c.headerText}=${c.rate}%`).join(', ')}`
        });

        // 4. 蓝色字体残留
        items.push({
            name: '蓝色字体残留',
            pass: blueCount <= t.maxBlueResidual,
            message: blueCount <= t.maxBlueResidual
                ? `${blueCount} 处（阈值 ≤ ${t.maxBlueResidual}）`
                : `${blueCount} 处超过阈值 ${t.maxBlueResidual}`
        });

        // 5. 字体一致性
        if (t.fontConsistency) {
            items.push({
                name: '字体一致性',
                pass: fontConsistent,
                message: fontConsistent ? '字体统一' : '存在不一致字体'
            });
        }

        const passed = items.every(i => i.pass);
        return { passed, items, summary: { writtenCount, columnRates: columnRates.length, blueCount } };
    }

    /**
     * 校验 docx 文档质量
     * @param {Object} params
     * @param {number} params.paragraphCount 段落数
     * @param {number} params.blueResidual 蓝色字体残留数
     * @param {number} params.placeholderResidual 占位符残留数
     * @param {boolean} params.headingConsistency 标题层级一致性
     * @returns {{passed: boolean, items: Array, summary: Object}}
     */
    checkDocx(params) {
        const { paragraphCount = 0, blueResidual = 0, placeholderResidual = 0, headingConsistency = true } = params;
        const t = this.thresholds.docx;
        const items = [];

        items.push({
            name: '段落数',
            pass: paragraphCount >= t.minParagraphs,
            message: paragraphCount >= t.minParagraphs
                ? `${paragraphCount} 段（阈值 ≥ ${t.minParagraphs}）`
                : `${paragraphCount} 段低于阈值 ${t.minParagraphs}`
        });

        items.push({
            name: '蓝色字体残留',
            pass: blueResidual <= t.maxBlueResidual,
            message: blueResidual <= t.maxBlueResidual
                ? `${blueResidual} 处（阈值 ≤ ${t.maxBlueResidual}）`
                : `${blueResidual} 处超过阈值 ${t.maxBlueResidual}`
        });

        items.push({
            name: '占位符残留',
            pass: placeholderResidual <= t.maxPlaceholderResidual,
            message: placeholderResidual <= t.maxPlaceholderResidual
                ? `${placeholderResidual} 处（阈值 ≤ ${t.maxPlaceholderResidual}）`
                : `${placeholderResidual} 处超过阈值 ${t.maxPlaceholderResidual}`
        });

        if (t.headingLevelConsistency) {
            items.push({
                name: '标题层级一致性',
                pass: headingConsistency,
                message: headingConsistency ? '标题层级连续' : '标题层级不连续'
            });
        }

        const passed = items.every(i => i.pass);
        return { passed, items, summary: { paragraphCount, blueResidual, placeholderResidual } };
    }

    /**
     * 校验测试用例质量
     * @param {Object} params
     * @param {number} params.caseCount 用例数
     * @param {number} params.alignmentRate 列对齐率
     * @param {Object} params.priorityDist 优先级分布 {P0: n, P1: n, P2: n}
     * @returns {{passed: boolean, items: Array, summary: Object}}
     */
    checkTestcase(params) {
        const { caseCount = 0, alignmentRate = 100, priorityDist = {} } = params;
        const t = this.thresholds.testcase;
        const items = [];

        items.push({
            name: '用例数',
            pass: caseCount >= t.minCases,
            message: caseCount >= t.minCases
                ? `${caseCount} 条（阈值 ≥ ${t.minCases}）`
                : `${caseCount} 条低于阈值 ${t.minCases}`
        });

        items.push({
            name: '列对齐率',
            pass: alignmentRate >= t.columnAlignmentRate,
            message: alignmentRate >= t.columnAlignmentRate
                ? `${alignmentRate}%（阈值 ≥ ${t.columnAlignmentRate}%）`
                : `${alignmentRate}% 低于阈值 ${t.columnAlignmentRate}%`
        });

        // 优先级分布检查
        const pd = t.priorityDistribution || {};
        for (const [level, minCount] of Object.entries(pd)) {
            const actual = priorityDist[level] || 0;
            const key = level.replace(/[^A-Za-z0-9]/g, '');
            items.push({
                name: `${level} 用例数`,
                pass: actual >= minCount,
                message: actual >= minCount
                    ? `${level}: ${actual} 条（阈值 ≥ ${minCount}）`
                    : `${level}: ${actual} 条低于阈值 ${minCount}`
            });
        }

        const passed = items.every(i => i.pass);
        return { passed, items, summary: { caseCount, alignmentRate, priorityDist } };
    }

    /**
     * 获取当前生效的阈值配置
     * @param {string} type 文档类型: docx|xlsx|testcase
     * @returns {Object}
     */
    getThresholds(type) {
        return this.thresholds[type] || {};
    }

    // ============================================================
    // P1-4: 文档质量检查矩阵 —— 确保不同需求生成同样质量的文档
    // ============================================================

    /**
     * 文档完整性检查矩阵
     * 校验生成的文档是否包含所有必填章节，且章节内容非空
     * @param {Object} params
     * @param {Object} params.docStructure 文档结构 { chapterTitle: { hasContent: boolean, wordCount: number } }
     * @param {Array} params.requiredChapters 必填章节列表 [{ title, minWords }]
     * @returns {{passed: boolean, items: Array, summary: Object}}
     */
    checkDocCompleteness(params) {
        const { docStructure = {}, requiredChapters = [] } = params;
        const items = [];

        // 1. 必填章节存在性检查
        const missingChapters = requiredChapters.filter(
            (rc) => !docStructure[rc.title]
        );
        items.push({
            name: '必填章节存在性',
            pass: missingChapters.length === 0,
            message:
                missingChapters.length === 0
                    ? `全部 ${requiredChapters.length} 个必填章节均存在`
                    : `缺失 ${missingChapters.length} 个章节: ${missingChapters.map((c) => c.title).join(', ')}`,
        });

        // 2. 章节内容非空检查
        const emptyChapters = requiredChapters.filter((rc) => {
            const ch = docStructure[rc.title];
            return ch && !ch.hasContent;
        });
        items.push({
            name: '章节内容非空',
            pass: emptyChapters.length === 0,
            message:
                emptyChapters.length === 0
                    ? '所有必填章节均有内容'
                    : `${emptyChapters.length} 个章节内容为空: ${emptyChapters.map((c) => c.title).join(', ')}`,
        });

        // 3. 章节字数达标检查
        const underwordChapters = requiredChapters.filter((rc) => {
            const ch = docStructure[rc.title];
            return ch && ch.wordCount < (rc.minWords || 0);
        });
        items.push({
            name: '章节字数达标',
            pass: underwordChapters.length === 0,
            message:
                underwordChapters.length === 0
                    ? '所有章节字数达标'
                    : `${underwordChapters.length} 个章节字数不足: ${underwordChapters.map((c) => `${c.title}(${docStructure[c.title].wordCount}/${c.minWords})`).join(', ')}`,
        });

        const passed = items.every((i) => i.pass);
        return {
            passed,
            items,
            summary: {
                totalChapters: requiredChapters.length,
                existingChapters: requiredChapters.length - missingChapters.length,
                emptyChapters: emptyChapters.length,
            },
        };
    }

    /**
     * 交叉校验检查 —— 需求/代码/测试三者一致性
     * 确保每项功能需求都有代码实现和测试用例覆盖
     * @param {Object} params
     * @param {Array} params.requirements 需求列表 [{ id, name }]
     * @param {Array} params.implementations 代码实现列表 [{ reqId, moduleName, apiPath }]
     * @param {Array} params.testCases 测试用例列表 [{ reqId, caseId, priority }]
     * @returns {{passed: boolean, items: Array, summary: Object}}
     */
    checkCrossValidation(params) {
        const { requirements = [], implementations = [], testCases = [] } = params;
        const items = [];

        // 1. 需求-代码一致性：每项需求都有对应实现
        const implReqIds = new Set(implementations.map((i) => i.reqId));
        const unimplementedReqs = requirements.filter((r) => !implReqIds.has(r.id));
        items.push({
            name: '需求-代码一致性',
            pass: unimplementedReqs.length === 0,
            message:
                unimplementedReqs.length === 0
                    ? `全部 ${requirements.length} 项需求均有代码实现`
                    : `${unimplementedReqs.length} 项需求未实现: ${unimplementedReqs.map((r) => r.id).join(', ')}`,
        });

        // 2. 需求-测试一致性：每项需求都有对应测试用例
        const testReqIds = new Set(testCases.map((t) => t.reqId));
        const untestedReqs = requirements.filter((r) => !testReqIds.has(r.id));
        items.push({
            name: '需求-测试一致性',
            pass: untestedReqs.length === 0,
            message:
                untestedReqs.length === 0
                    ? `全部 ${requirements.length} 项需求均有测试用例`
                    : `${untestedReqs.length} 项需求无测试用例: ${untestedReqs.map((r) => r.id).join(', ')}`,
        });

        // 3. 代码-测试一致性：每个实现都有对应测试
        const implWithoutTest = implementations.filter(
            (i) => !testReqIds.has(i.reqId)
        );
        items.push({
            name: '代码-测试一致性',
            pass: implWithoutTest.length === 0,
            message:
                implWithoutTest.length === 0
                    ? '所有代码实现均有测试覆盖'
                    : `${implWithoutTest.length} 项实现无测试: ${implWithoutTest.map((i) => i.reqId).join(', ')}`,
        });

        const passed = items.every((i) => i.pass);
        return {
            passed,
            items,
            summary: {
                totalRequirements: requirements.length,
                implementedCount: requirements.length - unimplementedReqs.length,
                testedCount: requirements.length - untestedReqs.length,
            },
        };
    }

    /**
     * 信息收集清单验证
     * 与 doc-info-collection-template.json 配合，验证文档生成前信息收集完整性
     * @param {Object} collectedInfo 已收集的信息对象
     * @returns {{passed: boolean, items: Array, summary: Object}}
     */
    checkInfoCollection(collectedInfo) {
        const items = [];
        const requiredSections = [
            'requirementName',
            'businessBackground',
            'businessGoals',
            'scope',
            'modules',
            'apiEndpoints',
            'databaseTables',
            'architecture',
            'deviations',
            'testSummary',
            'defects',
            'knownIssues',
            'coverageAnalysis',
            'requirementGate',
            'reviewGate',
            'defectGate',
        ];

        // 1. 必填字段完整性
        const missingFields = requiredSections.filter(
            (f) => collectedInfo[f] === undefined || collectedInfo[f] === null
        );
        items.push({
            name: '必填字段完整性',
            pass: missingFields.length === 0,
            message:
                missingFields.length === 0
                    ? `全部 ${requiredSections.length} 个必填字段均已收集`
                    : `缺失 ${missingFields.length} 个字段: ${missingFields.join(', ')}`,
        });

        // 2. 门禁通过检查
        const gates = ['requirementGate', 'reviewGate', 'defectGate'];
        const failedGates = gates.filter(
            (g) => collectedInfo[g] && !collectedInfo[g].passed
        );
        items.push({
            name: '门禁通过检查',
            pass: failedGates.length === 0,
            message:
                failedGates.length === 0
                    ? '三个前置门禁均通过'
                    : `${failedGates.length} 个门禁未通过: ${failedGates.join(', ')}`,
        });

        // 3. 偏差记录检查
        const deviations = collectedInfo.deviations || [];
        items.push({
            name: '偏差记录检查',
            pass: deviations.length > 0,
            message:
                deviations.length > 0
                    ? `记录了 ${deviations.length} 项偏差`
                    : '未记录任何偏差（无偏差时需填写 N/A）',
        });

        // 4. 已知问题闭环检查
        const knownIssues = collectedInfo.knownIssues || [];
        items.push({
            name: '已知问题闭环检查',
            pass: true,
            message:
                knownIssues.length > 0
                    ? `列出 ${knownIssues.length} 个已知问题`
                    : '无已知问题',
        });

        const passed = items.every((i) => i.pass);
        return {
            passed,
            items,
            summary: {
                totalFields: requiredSections.length,
                collectedFields: requiredSections.length - missingFields.length,
                gatesPassed: gates.length - failedGates.length,
            },
        };
    }

    /**
     * 综合质量检查矩阵
     * 汇总所有质量检查项，输出完整质量报告
     * @param {Object} params 包含各检查项的输入参数
     * @returns {{passed: boolean, matrix: Array, summary: Object}}
     */
    checkDocQualityMatrix(params = {}) {
        const matrix = [];
        const {
            docxParams,
            xlsxParams,
            testcaseParams,
            completenessParams,
            crossValidationParams,
            infoCollection,
        } = params;

        if (docxParams) {
            const r = this.checkDocx(docxParams);
            matrix.push({ category: 'DOCX基础质量', passed: r.passed, items: r.items });
        }
        if (xlsxParams) {
            const r = this.checkXlsx(xlsxParams);
            matrix.push({ category: 'XLSX基础质量', passed: r.passed, items: r.items });
        }
        if (testcaseParams) {
            const r = this.checkTestcase(testcaseParams);
            matrix.push({ category: '测试用例质量', passed: r.passed, items: r.items });
        }
        if (completenessParams) {
            const r = this.checkDocCompleteness(completenessParams);
            matrix.push({ category: '文档完整性', passed: r.passed, items: r.items });
        }
        if (crossValidationParams) {
            const r = this.checkCrossValidation(crossValidationParams);
            matrix.push({ category: '交叉校验一致性', passed: r.passed, items: r.items });
        }
        if (infoCollection) {
            const r = this.checkInfoCollection(infoCollection);
            matrix.push({ category: '信息收集完整性', passed: r.passed, items: r.items });
        }

        const passed = matrix.every((m) => m.passed);
        const passedCount = matrix.filter((m) => m.passed).length;
        return {
            passed,
            matrix,
            summary: {
                totalCategories: matrix.length,
                passedCategories: passedCount,
                failedCategories: matrix.length - passedCount,
            },
        };
    }
}

module.exports = { QualityGate, DEFAULT_THRESHOLDS };
