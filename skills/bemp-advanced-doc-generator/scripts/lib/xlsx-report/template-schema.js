'use strict';

/**
 * TemplateSchema —— 通用化的 xlsx 模板结构描述
 *
 * 设计原则：完全数据驱动，不硬编码任何列数、列名、表头行。
 * 模板的形状由 TemplateInspector 解析后存入该对象，
 * 后续 ColumnMapper / ContentBuilder / Pipeline 全部基于该 Schema 工作。
 *
 * 字段说明：
 *   - sheetName           ：目标工作表名（用户模板中的真实工作表）
 *   - headerRow           ：表头行（1-based），包含列名的那一行
 *   - dataStartRow        ：数据起始行（1-based），从此行开始清空并写入
 *   - dataEndRow          ：数据结束行（1-based），清空时包含此行；写入时按需扩展
 *   - preambleRows        ：表头之上的固定行（如"案例填写原则"），必须保留
 *   - columns             ：列定义数组，按列顺序
 *     - index             ：1-based 列号
 *     - headerText        ：表头文本（已 trim）
 *     - semanticKey       ：语义键（id/name/expected/...），由 inspector 推断
 *     - dataType          ：'string' | 'number' | 'enum'
 *     - width             ：列宽（px），可选
 *     - required          ：是否必填
 *   - summary             ：摘要配置
 *     - sheetName         ：摘要工作表名（若模板已存在则填入，不追加；否则创建）
 *     - sections          ：用户提供的摘要小节（可为空：完全由系统推断）
 *   - meta                ：元数据（源文件、解析耗时、模板版本等）
 *
 * @class TemplateSchema
 */
class TemplateSchema {
    constructor(init) {
        this.sheetName = init.sheetName;
        this.headerRow = init.headerRow;
        this.dataStartRow = init.dataStartRow;
        this.dataEndRow = init.dataEndRow || null;
        this.preambleRows = init.preambleRows || []; // [{ rowNumber, content }]
        this.columns = init.columns || [];
        this.summary = init.summary || { sheetName: null, exists: false, sections: [] };
        this.meta = init.meta || {};
    }

    /** 获取列数（动态） */
    get columnCount() {
        return this.columns.length;
    }

    /** 通过 semanticKey 查找列定义（O(n)，n=列数 通常<=20） */
    findColumn(semanticKey) {
        return this.columns.find(c => c.semanticKey === semanticKey) || null;
    }

    /** 通过 headerText 模糊匹配（用于向后兼容） */
    findColumnByHeader(text) {
        const t = (text || '').trim();
        return this.columns.find(c => c.headerText === t || c.headerText.includes(t) || t.includes(c.headerText)) || null;
    }

    /** 序列化为可缓存的纯对象（用于 cache 或传输） */
    toJSON() {
        return {
            sheetName: this.sheetName,
            headerRow: this.headerRow,
            dataStartRow: this.dataStartRow,
            dataEndRow: this.dataEndRow,
            preambleRows: this.preambleRows,
            columns: this.columns,
            summary: this.summary,
            meta: this.meta
        };
    }

    /** 从缓存对象反序列化 */
    static fromJSON(obj) {
        return new TemplateSchema(obj);
    }

    /** 校验 Schema 完整性（核心字段缺失时抛错） */
    validate() {
        if (!this.sheetName) throw new Error('TemplateSchema 校验失败：sheetName 缺失');
        if (!this.headerRow || this.headerRow < 1) throw new Error('TemplateSchema 校验失败：headerRow 无效');
        if (!this.dataStartRow || this.dataStartRow < 1) throw new Error('TemplateSchema 校验失败：dataStartRow 无效');
        if (this.dataStartRow <= this.headerRow) throw new Error('TemplateSchema 校验失败：dataStartRow 必须 > headerRow');
        if (!Array.isArray(this.columns) || this.columns.length === 0) {
            throw new Error('TemplateSchema 校验失败：columns 为空，无法生成报告');
        }
        return true;
    }
}

module.exports = { TemplateSchema };
