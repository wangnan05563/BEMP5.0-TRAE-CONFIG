'use strict';

const ExcelJS = require('exceljs');

/**
 * SummaryBuilder —— 通用化测试报告摘要写入器
 *
 * 设计原则：
 *   1. 仅消费 ContentBuilder.buildSummarySections() 输出的结构化数据
 *   2. 支持两种小节类型：'keyvalue'（A列键 / B列值）与 'table'（表头+数据行）
 *   3. 标题统一使用浅蓝色背景（与 BEMP 模板默认风格保持一致）
 *   4. 数据使用宋体 10.5pt + 居中（与原实现对齐）
 *   5. 不再硬编码"测试报告摘要"等业务术语——摘要 Sheet 名由 TemplateSchema 决定
 */
class SummaryBuilder {
    constructor(options = {}) {
        this.options = {
            titleFontSize: options.titleFontSize || 14,
            sectionFontSize: options.sectionFontSize || 12,
            dataFontSize: options.dataFontSize || 10.5,
            titleBg: options.titleBg || 'FFD9E2F3',
            sectionBg: options.sectionBg || 'FFD9E2F3',
            headerBg: options.headerBg || 'FF305496',
            headerFg: options.headerFg || 'FFFFFFFF',
            font: options.font || '宋体',
            ...options
        };
    }

    /**
     * 向工作簿追加摘要 Sheet
     * @param {ExcelJS.Workbook} workbook
     * @param {TemplateSchema} schema
     * @param {Array} sections ContentBuilder.buildSummarySections() 输出
     * @returns {string} 摘要 Sheet 名
     */
    appendToWorkbook(workbook, schema, sections) {
        if (!schema.summary) {
            throw new Error('SummaryBuilder.appendToWorkbook: schema.summary 缺失');
        }
        const targetName = schema.summary.sheetName || '测试报告摘要';

        // 若目标 Sheet 已存在，移除（避免重复）
        const existing = workbook.getWorksheet(targetName);
        if (existing) workbook.removeWorksheet(existing.id);

        const ws = workbook.addWorksheet(targetName);
        ws.columns = this._buildColumns();

        // 1. 标题行
        const titleRow = ws.addRow([`${schema.sheetName || '测试'}报告摘要`]);
        ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);
        this._styleTitleCell(titleRow.getCell(1));

        // 2. 各小节
        for (const sec of sections || []) {
            const secRow = ws.addRow([sec.title]);
            ws.mergeCells(`A${secRow.number}:F${secRow.number}`);
            this._styleSectionCell(secRow.getCell(1));

            if (sec.type === 'table' && sec.table) {
                this._writeTable(ws, sec.table);
            } else if (sec.type === 'keyvalue' && sec.rows) {
                this._writeKeyValue(ws, sec.rows);
            }
        }

        return targetName;
    }

    _buildColumns() {
        // 默认 6 列（与原 BEMP 模板一致，但 column 数量只是列宽设置，不影响数据写入）
        return [{ width: 22 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }];
    }

    _writeTable(ws, table) {
        if (!table.header || !Array.isArray(table.rows)) return;
        const headerRow = ws.addRow(table.header);
        headerRow.eachCell(c => this._styleHeaderCell(c));

        for (const rowData of table.rows) {
            const dataRow = ws.addRow(rowData);
            const isBold = rowData[0] === '合计' || rowData[0] === '说明：';
            this._styleDataRow(dataRow, isBold, false);
        }
    }

    _writeKeyValue(ws, rows) {
        for (const [k, v] of rows) {
            const dataRow = ws.addRow([k, v, '', '', '', '']);
            ws.mergeCells(`A${dataRow.number}:A${dataRow.number}`);
            ws.mergeCells(`B${dataRow.number}:F${dataRow.number}`);
            this._styleDataRow(dataRow, false, true);
        }
    }

    // === 样式辅助 ===
    _styleTitleCell(cell) {
        cell.font = { name: this.options.font, size: this.options.titleFontSize, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.options.titleBg } };
    }
    _styleSectionCell(cell) {
        cell.font = { name: this.options.font, size: this.options.sectionFontSize, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.options.sectionBg } };
    }
    _styleHeaderCell(cell) {
        cell.font = { name: this.options.font, size: this.options.dataFontSize, bold: true, color: { argb: this.options.headerFg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.options.headerBg } };
        cell.border = this._thinBorder();
    }
    _styleDataRow(row, isBold, isOverview) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: this.options.font, size: this.options.dataFontSize, bold: isBold };
            cell.alignment = {
                horizontal: colNumber === 1 ? 'left' : 'center',
                vertical: 'middle',
                wrapText: true
            };
            cell.border = this._thinBorder();
        });
    }
    _thinBorder() {
        const s = { style: 'thin', color: { argb: 'FFBFBFBF' } };
        return { top: s, left: s, right: s, bottom: s };
    }
}

module.exports = { SummaryBuilder };
