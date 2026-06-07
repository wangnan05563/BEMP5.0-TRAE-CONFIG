'use strict';

/**
 * XlsxUnitTestReportGenerator —— 向后兼容的旧 API 适配层
 *
 * 保留原因：
 *   1. cli.js 通过 require('./lib/xlsx-report-generator') 调用
 *   2. 外部脚本可能直接引用本类
 *
 * 实现策略：
 *   - 本类作为薄壳（facade），内部委托给新的 XlsxReportPipeline
 *   - 保留旧的 generate(params) 方法签名与返回结构
 *   - 保留旧 BEMP_18_COLUMNS 导出（仅用于向后兼容，新代码不应直接引用）
 *
 * ⚠ 新代码请使用 lib/xlsx-report/index.js
 *   推荐写法：
 *     const { XlsxReportPipeline } = require('./lib/xlsx-report');
 *     const pipeline = new XlsxReportPipeline();
 *     const result = await pipeline.generate({...});
 */

const path = require('path');
const { XlsxReportPipeline, BEMP_18_COLUMNS_LEGACY } = require('./xlsx-report/index');
const { BempDocError, ERROR_CODES } = require('../../config/default');

class XlsxUnitTestReportGenerator {
    constructor(options = {}) {
        this.options = options;
        this.pipeline = new XlsxReportPipeline(options);
    }

    /**
     * @deprecated 推荐使用 XlsxReportPipeline.generate
     * 保留旧 API 签名以确保向后兼容
     */
    async generate(params) {
        const result = await this.pipeline.generate(params);
        // 转换 schema → 旧版 columnMap 字段（向后兼容）
        const columnMap = {};
        if (result.schema && result.schema.columns) {
            for (const col of result.schema.columns) {
                if (col.semanticKey) columnMap[col.semanticKey] = col.index;
            }
        }
        return {
            outputPath: result.outputPath,
            mode: result.mode,
            totalCases: result.totalCases,
            sheetNames: [result.schema?.sheetName, result.schema?.summary?.sheetName].filter(Boolean),
            dataRange: result.dataRange,
            validation: result.validation
        };
    }
}

// 旧版硬编码列定义（仅供历史引用，新代码请使用 TemplateInspector 动态解析）
const BEMP_18_COLUMNS = BEMP_18_COLUMNS_LEGACY || [
    { key: 'id', label: '测试案例编号', width: 18 },
    { key: 'name', label: '测试案例名称', width: 32 },
    { key: 'project', label: '所属项目', width: 18 },
    { key: 'component', label: '所属组件', width: 18 },
    { key: 'module', label: '所属模块', width: 18 },
    { key: 'nature', label: '案例性质', width: 10 },
    { key: 'designer', label: '案例设计人', width: 12 },
    { key: 'summary', label: '测试概述', width: 40 },
    { key: 'stepName', label: '操作步骤名称', width: 18 },
    { key: 'stepDesc', label: '步骤描述', width: 40 },
    { key: 'expected', label: '预期结果', width: 40 },
    { key: 'actual', label: '运行结果', width: 12 },
    { key: 'data', label: '测试数据', width: 24 },
    { key: 'tester', label: '测试人员', width: 12 },
    { key: 'prod', label: '投产点', width: 12 },
    { key: 'cycle', label: '周期', width: 12 },
    { key: 'review', label: '评审状态', width: 12 }
];

module.exports = { XlsxUnitTestReportGenerator, BEMP_18_COLUMNS };
