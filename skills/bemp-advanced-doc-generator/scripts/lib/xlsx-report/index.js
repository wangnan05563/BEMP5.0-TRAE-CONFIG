'use strict';

const { TemplateSchema } = require('./template-schema');
const { TemplateInspector, SEMANTIC_RULES, HEADER_KEYWORDS, SUMMARY_SHEET_CANDIDATES } = require('./template-inspector');
const { ColumnMapper } = require('./column-mapper');
const { ContentBuilder } = require('./content-builder');
const { SummaryBuilder } = require('./summary-builder');
const { XlsxReportPipeline } = require('./xlsx-report-pipeline');

module.exports = {
    // 核心接口
    TemplateSchema,
    TemplateInspector,
    ColumnMapper,
    ContentBuilder,
    SummaryBuilder,
    XlsxReportPipeline,

    // 内部规则（供高级用户覆盖/扩展）
    SEMANTIC_RULES,
    HEADER_KEYWORDS,
    SUMMARY_SHEET_CANDIDATES,

    // 工厂方法：推荐使用
    createPipeline(options) {
        return new XlsxReportPipeline(options);
    }
};
