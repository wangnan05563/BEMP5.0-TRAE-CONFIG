const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { paths, BempDocError, ERROR_CODES } = require('../config/default');

class ExcelTemplateParser {
    constructor(options = {}) {
        this.defaultConfig = {
            headerDetectionMaxRows: 10,
            dataDetectionMaxRows: 20,
            knownFieldKeywords: {
                id: ['用例编号', '序号', 'ID', 'No'],
                level1: ['一级模块', '子系统'],
                level2: ['二级模块', '子模块', '功能域'],
                level3: ['三级模块', '菜单'],
                level4: ['四级模块', '子功能', '测试点'],
                precondition: ['前置条件', '前提条件', '预置条件', '初始状态'],
                content: ['测试用例内容', '用例内容', '测试步骤', '操作步骤', '测试内容'],
                nature: ['用例性质', '用例类型', '正反例'],
                expected: ['预期结果', '期望结果', '预期输出'],
                actual: ['实际结果', '实际输出'],
                tester: ['测试人员', '执行人'],
                status: ['测试状态', '执行状态'],
                remark: ['备注', '说明']
            }
        };
        this.options = { ...this.defaultConfig, ...options };
    }

    async parseTemplate(templatePath) {
        if (!fs.existsSync(templatePath)) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件不存在: ${templatePath}`);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];

        if (!ws) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, '模板文件中未找到工作表');
        }

        const result = {
            sheetName: ws.name,
            headerRows: 0,
            dataStartRow: 0,
            columns: {},
            styles: {},
            mergedCells: [],
            fixedContent: {},
            rawWorkbook: workbook
        };

        result.headerRows = this._detectHeaderRows(ws);
        result.dataStartRow = result.headerRows + 1;
        result.columns = this._extractColumnMapping(ws, result.headerRows);
        result.styles = this._extractStyles(ws, result.dataStartRow);
        result.mergedCells = this._extractMergedCells(ws);
        result.fixedContent = this._extractFixedContent(ws, result.headerRows);

        return result;
    }

    _detectHeaderRows(ws) {
        let headerEndRow = 0;
        const maxCheck = Math.min(this.options.headerDetectionMaxRows, ws.rowCount);
        const dataFieldKeywords = ['用例编号', '一级模块', '二级模块', '三级模块', '四级模块',
            '前置条件', '测试用例内容', '用例性质', '预期结果'];

        for (let rowNum = 1; rowNum <= maxCheck; rowNum++) {
            const row = ws.getRow(rowNum);
            let dataHeaderCount = 0;
            let hasDataPattern = false;

            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const val = this._getCellValue(cell);
                if (val && typeof val === 'string') {
                    if (dataFieldKeywords.some(kw => val.includes(kw))) dataHeaderCount++;
                    if (/^\d+$/.test(val) && colNumber <= 3) hasDataPattern = true;
                }
            });

            if (dataHeaderCount >= 3) {
                headerEndRow = rowNum;
            } else if (hasDataPattern) {
                break;
            }
        }

        return headerEndRow || 1;
    }

    _extractColumnMapping(ws, headerRows) {
        const columns = {};
        const fieldKeywords = this.options.knownFieldKeywords;
        const fieldPriority = Object.keys(fieldKeywords);

        for (let rowNum = 1; rowNum <= headerRows; rowNum++) {
            const row = ws.getRow(rowNum);
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const val = this._getCellValue(cell);
                if (!val || typeof val !== 'string') return;

                const colLetter = this._colToLetter(colNumber);
                if (columns[colLetter]) return;

                let bestField = null;
                let bestMatchLen = 0;

                for (const field of fieldPriority) {
                    const keywords = fieldKeywords[field];
                    for (const kw of keywords) {
                        if (val.includes(kw) && kw.length > bestMatchLen) {
                            bestMatchLen = kw.length;
                            bestField = field;
                        }
                    }
                }

                if (bestField) {
                    columns[colLetter] = {
                        field: bestField,
                        header: val,
                        colNumber,
                        align: this._detectCellAlign(cell)
                    };
                }
            });
        }

        return columns;
    }

    _extractStyles(ws, dataStartRow) {
        const styles = {
            font: { name: '宋体', size: 9 },
            border: 'thin',
            rowHeight: 45,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            columnWidths: {}
        };

        const sampleRow = ws.getRow(dataStartRow);
        if (sampleRow) {
            const cell = sampleRow.getCell(2);
            if (cell.font) {
                styles.font.name = cell.font.name || '宋体';
                styles.font.size = cell.font.size || 9;
            }
            if (cell.alignment) {
                styles.alignment.horizontal = cell.alignment.horizontal || 'center';
                styles.alignment.vertical = cell.alignment.vertical || 'center';
                styles.alignment.wrapText = cell.alignment.wrapText !== undefined ? cell.alignment.wrapText : true;
            }
        }

        if (sampleRow && sampleRow.height) styles.rowHeight = sampleRow.height;

        ws.columns.forEach((col, idx) => {
            if (col && col.width) styles.columnWidths[this._colToLetter(idx + 1)] = col.width;
        });

        return styles;
    }

    _extractMergedCells(ws) {
        const merged = [];
        if (ws._merges) {
            for (const [rangeStr, range] of Object.entries(ws._merges)) {
                merged.push({
                    range: rangeStr,
                    top: range.model ? range.model.top : range.top,
                    left: range.model ? range.model.left : range.left,
                    bottom: range.model ? range.model.bottom : range.bottom,
                    right: range.model ? range.model.right : range.right
                });
            }
        }
        return merged;
    }

    _extractFixedContent(ws, headerRows) {
        const fixed = {};
        for (let rowNum = 1; rowNum <= headerRows; rowNum++) {
            const row = ws.getRow(rowNum);
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const val = this._getCellValue(cell);
                if (val) {
                    const key = `${this._colToLetter(colNumber)}${rowNum}`;
                    fixed[key] = val;
                }
            });
        }
        return fixed;
    }

    _getCellValue(cell) {
        if (!cell || cell.value === null || cell.value === undefined) return null;
        if (typeof cell.value === 'object') {
            if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('');
            if (cell.value.result !== undefined) return cell.value.result;
            if (cell.value.text) return cell.value.text;
            return String(cell.value);
        }
        return cell.value;
    }

    _detectCellAlign(cell) {
        if (!cell || !cell.alignment || !cell.alignment.horizontal) return 'center';
        const h = cell.alignment.horizontal;
        if (h === 'left' || h === 'justify' || h === 'distributed') return 'left';
        if (h === 'right') return 'right';
        return 'center';
    }

    _colToLetter(col) {
        let letter = '';
        let temp = col;
        while (temp > 0) {
            const mod = (temp - 1) % 26;
            letter = String.fromCharCode(65 + mod) + letter;
            temp = Math.floor((temp - 1) / 26);
        }
        return letter;
    }

    loadConfig(configPath) {
        if (!fs.existsSync(configPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (e) {
            console.warn(`配置文件加载失败: ${configPath}`, e.message);
            return null;
        }
    }

    mergeConfig(autoDetected, configFile) {
        if (!configFile) return autoDetected;
        return {
            ...autoDetected,
            columns: configFile.columnMapping
                ? this._remapColumns(autoDetected.columns, configFile.columnMapping)
                : autoDetected.columns,
            dataStartRow: configFile.dataStartRow || autoDetected.dataStartRow,
            styles: { ...autoDetected.styles, ...(configFile.styles || {}) }
        };
    }

    _remapColumns(autoColumns, configMapping) {
        const remapped = {};
        for (const [field, mapping] of Object.entries(configMapping)) {
            const colLetter = mapping.column;
            remapped[colLetter] = {
                field,
                header: mapping.header || field,
                colNumber: this._letterToCol(colLetter),
                align: mapping.align || 'center'
            };
        }
        return remapped;
    }

    _letterToCol(letter) {
        let col = 0;
        for (let i = 0; i < letter.length; i++) {
            col = col * 26 + (letter.charCodeAt(i) - 64);
        }
        return col;
    }
}

module.exports = { ExcelTemplateParser };
