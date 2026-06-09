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
}

module.exports = { QualityGate, DEFAULT_THRESHOLDS };
