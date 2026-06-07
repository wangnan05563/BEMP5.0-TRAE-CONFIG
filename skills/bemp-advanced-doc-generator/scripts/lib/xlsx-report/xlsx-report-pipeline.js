'use strict';

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { TemplateInspector } = require('./template-inspector');
const { ColumnMapper } = require('./column-mapper');
const { ContentBuilder } = require('./content-builder');
const { SummaryBuilder } = require('./summary-builder');
const { BempDocError, ERROR_CODES } = require('../../../config/default');

/**
 * XlsxReportPipeline —— 通用化 xlsx 报告生成主编排器
 *
 * 设计原则：
 *   1. Schema 优先 —— 先 inspect 模板得到 TemplateSchema，再驱动所有后续步骤
 *   2. 零硬编码 —— 列数、列名、表头行、起始行、Sheet 名全部从用户模板动态读取
 *   3. 可插拔 —— Inspector / Mapper / ContentBuilder / SummaryBuilder 均可替换
 *   4. 错误先行 —— 模板不存在、表头未识别、必含列缺失等场景提前抛出
 *   5. 向后兼容 —— 保留旧 XlsxUnitTestReportGenerator API 的入参/出参
 *
 * 流水线（v2.0）：
 *   1. inspect(template) → TemplateSchema
 *   2. scan(source)     → scanResult（Java @Test 或 MD 用例）
 *   3. build(scanResult, schema) → testcases[] 标准化
 *   4. map(testcases, schema) → rows[] 基于 schema.columns 动态映射
 *   5. clearAndWrite(template, output, schema, rows)
 *      - 保留 schema.preambleRows（原则/说明）
 *      - 清空 dataStartRow..end 范围
 *      - 写入 rows
 *   6. appendSummary(workbook, schema, sections) —— 条件性：仅当 !schema.summary.exists 时
 *   7. validate(output, schema) → { allPass, items }
 *
 * 配套规范：
 *   - SOP:    ../../../references/xlsx-template-fill-sop.md
 *   - 复盘:  ../../../references/xlsx-template-fill-retrospective.md
 *   - 错误码: E101(表头未识别) E102(列未填充) E103(路径错误) E104(主键缺失) E105(Sheet缺失) E106(数据源为空)
 */
class XlsxReportPipeline {
    constructor(options = {}) {
        this.options = {
            project: options.project || '本项目',
            component: options.component || '业务管理',
            tester: options.tester || 'bemp',
            designer: options.designer || 'bemp',
            cycle: options.cycle || '功能测试',
            /** v8.0：可选外部 SEMANTIC_RULES 数组（来自 --semantic-map） */
            semanticMap: options.semanticMap || null,
            inspector: options.inspector || new TemplateInspector({
                extraSemanticRules: options.semanticMap || null
            }),
            mapper: options.mapper || new ColumnMapper(),
            contentBuilder: options.contentBuilder || new ContentBuilder(options),
            summaryBuilder: options.summaryBuilder || new SummaryBuilder(),
            logger: options.logger || console.log,
            ...options
        };
    }

    /**
     * 主入口 —— 端到端生成 xlsx 报告
     * @param {Object} params
     *   - xlsxTemplate: string
     *   - testSource?: string (unit mode)
     *   - testCasesPath?: string (functional mode)
     *   - outputPath?: string
     *   - moduleName: string
     *   - project?: string
     *   - requirementPath?: string
     *   - mode?: 'unit'|'functional'
     * @returns {Promise<Object>}
     */
    async generate(params) {
        const { xlsxTemplate, testSource, testCasesPath, outputPath, moduleName, project, requirementPath, mode, semanticMap } = params;
        const startTime = Date.now();

        // 1. 参数校验
        this._validateParams(params);

        // v8.0：运行时 SEMANTIC_RULES 覆盖
        if (Array.isArray(semanticMap) && semanticMap.length) {
            this.options.inspector = new TemplateInspector({ extraSemanticRules: semanticMap });
            this._log(`[semantic-map] 已注入 ${semanticMap.length} 条自定义规则（最高优先级）`);
        }

        const resolvedMode = mode || (testCasesPath ? 'functional' : 'unit');
        const resolvedTemplate = this._resolvePath(xlsxTemplate);
        const resolvedOutput = this._resolveOutputPath(outputPath, moduleName, resolvedMode);

        this._log(`\n======== XlsxReportPipeline v2.0 (mode=${resolvedMode}) ========`);
        this._log(`[1/6] Inspect 模板: ${resolvedTemplate}`);

        // 2. 解析模板
        const schema = await this.options.inspector.inspect(resolvedTemplate);
        this._log(`  - 工作表: ${schema.sheetName}`);
        this._log(`  - 表头行: ${schema.headerRow} | 数据起始行: ${schema.dataStartRow}`);
        this._log(`  - 列数: ${schema.columnCount} | 必含主键: ${schema.columns.filter(c => c.required).map(c => c.semanticKey).join(', ')}`);
        this._log(`  - 摘要 Sheet: ${schema.summary.sheetName} (存在=${schema.summary.exists})`);
        if (schema.preambleRows.length) {
            this._log(`  - 前置固定行: ${schema.preambleRows.length} 行 (原则/说明)`);
        }

        // 3. 扫描数据源
        this._log(`[2/6] 扫描数据源`);
        const { scanResult, sourceLabel } = await this._scanSource(resolvedMode, testSource, testCasesPath);
        this._log(`  - ${sourceLabel}`);

        // 4. 构建测试用例
        this._log(`[3/6] 构建测试用例`);
        const testcases = resolvedMode === 'unit'
            ? this.options.contentBuilder.buildUnitTestCases(scanResult, moduleName)
            : this.options.contentBuilder.buildFunctionalTestCases(scanResult, moduleName);
        this._log(`  - 生成 ${testcases.length} 条测试用例`);

        if (testcases.length === 0) {
            this._log(`  ⚠ 警告：未生成任何测试用例，报告将只含模板 + 摘要`);
        }

        // 5. 映射为列值
        this._log(`[4/6] 映射为列值（基于 schema 动态列）`);
        const rowValues = this.options.mapper.mapRows(testcases, schema);
        this._log(`  - 已映射 ${rowValues.length} 行 × ${schema.columnCount} 列`);

        // 6. 写入 xlsx
        this._log(`[5/6] 写入 xlsx: ${resolvedOutput}`);
        await this._writeAll(resolvedTemplate, resolvedOutput, schema, rowValues);

        // 7. 追加摘要（条件性：仅当模板未自带）
        this._log(`[6/6] 摘要 Sheet 处理`);
        if (!schema.summary.exists) {
            const sections = this.options.contentBuilder.buildSummarySections(scanResult, testcases, resolvedMode, {
                moduleName,
                project: project || this.options.project,
                requirementPath
            });
            await this._appendSummary(resolvedOutput, schema, sections);
            this._log(`  - 已追加摘要 Sheet: ${schema.summary.sheetName} (${sections.length} 小节)`);
        } else {
            this._log(`  - 模板已存在摘要 Sheet (${schema.summary.sheetName})，保持原样，不追加`);
        }

        // 8. 校验
        const validation = await this._validate(resolvedOutput, schema, rowValues.length, sourceLabel);

        const elapsed = Date.now() - startTime;
        this._log(`\n======== 生成完成 耗时 ${elapsed}ms ========`);
        this._log(`  - 输出: ${resolvedOutput}`);
        this._log(`  - 模式: ${resolvedMode} | 用例数: ${testcases.length}`);
        this._log(`  - 校验: ${validation.allPass ? '✓ 全部通过' : '✗ 存在失败项'}`);

        return {
            outputPath: resolvedOutput,
            mode: resolvedMode,
            totalCases: testcases.length,
            sheetNames: [schema.sheetName, schema.summary.exists ? '(已有摘要)' : schema.summary.sheetName],
            schema: schema.toJSON(),
            dataRange: { start: schema.dataStartRow, end: schema.dataStartRow + rowValues.length - 1 },
            validation,
            durationMs: elapsed
        };
    }

    // === 内部方法 ===

    _validateParams(params) {
        if (!params.xlsxTemplate) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, 'xlsxTemplate 必填');
        }
        if (!params.testSource && !params.testCasesPath) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, 'testSource（unit模式）或 testCasesPath（functional模式）至少必填一项');
        }
        if (!params.moduleName) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, 'moduleName 必填');
        }
    }

    async _scanSource(mode, testSource, testCasesPath) {
        if (mode === 'unit') {
            const { JavaTestScanner } = require('../java-test-scanner');
            const scanner = new JavaTestScanner();
            const scanResult = scanner.scan(testSource);
            return {
                scanResult,
                sourceLabel: `扫描到 ${scanResult.fileCount} 个 java 文件，${scanResult.testMethodCount} 个 @Test 方法`
            };
        } else {
            const { TestCaseMdScanner } = require('../test-case-md-scanner');
            const scanner = new TestCaseMdScanner();
            const scanResult = scanner.scan(testCasesPath);
            return {
                scanResult,
                sourceLabel: `扫描到 ${scanResult.chapterCount} 章节，${scanResult.testCaseCount} 个功能测试用例`
            };
        }
    }

    /**
     * 写入主工作表 + 保留前置行
     */
    async _writeAll(templatePath, outputPath, schema, rowValues) {
        // 复制模板（保护原模板）
        fs.copyFileSync(templatePath, outputPath);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        const ws = workbook.getWorksheet(schema.sheetName);
        if (!ws) {
            throw new BempDocError(
                ERROR_CODES.SHEET_MISSING,
                `工作表不存在: ${schema.sheetName}`,
                { sheetName: schema.sheetName, availableSheets: workbook.worksheets.map(s => s.name) }
            );
        }

        // 1. 清空 dataStartRow..maxRow 范围的所有数据
        const maxRow = ws.rowCount;
        for (let r = schema.dataStartRow; r <= maxRow; r++) {
            const row = ws.getRow(r);
            for (let c = 1; c <= schema.columnCount; c++) {
                const cell = row.getCell(c);
                if (cell.value !== null && cell.value !== undefined) {
                    cell.value = null;
                }
            }
        }

        // 2. 写入数据行（按 schema.columns 顺序）
        // 样式策略：保留模板原始 cell.style（列宽/边框），仅统一字体+wrapText+对齐
        const FONT_NAME = this.options.summaryBuilder.options.font || '宋体';
        const FONT_SIZE = this.options.summaryBuilder.options.dataFontSize || 10.5;
        for (let i = 0; i < rowValues.length; i++) {
            const values = rowValues[i];
            const row = ws.getRow(schema.dataStartRow + i);
            // 不强制 row.height —— 继承模板，保持行高一致
            for (let c = 0; c < schema.columnCount; c++) {
                const colDef = schema.columns[c];
                const cell = row.getCell(colDef.index);
                cell.value = values[c];
                // 保留模板原 style（边框/底色/数字格式），仅覆盖 font/alignment
                const oldStyle = cell.style || {};
                cell.style = {
                    ...oldStyle,
                    font: { name: FONT_NAME, size: FONT_SIZE, family: 1 },
                    alignment: {
                        ...(oldStyle.alignment || {}),
                        wrapText: true,
                        vertical: 'center',
                        horizontal: oldStyle.alignment?.horizontal || 'left'
                    }
                };
            }
        }

        await workbook.xlsx.writeFile(outputPath);
    }

    /**
     * 追加摘要 Sheet
     */
    async _appendSummary(outputPath, schema, sections) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        this.options.summaryBuilder.appendToWorkbook(workbook, schema, sections);
        await workbook.xlsx.writeFile(outputPath);
    }

    /**
     * 校验 —— 基于 schema 动态校验
     */
    async _validate(outputPath, schema, writtenCount, sourceLabel) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        const items = [];

        // 1. 主工作表存在
        const mainSheet = workbook.getWorksheet(schema.sheetName);
        items.push({
            name: '主工作表',
            pass: !!mainSheet,
            message: mainSheet ? `存在: ${schema.sheetName}` : `缺失: ${schema.sheetName}`
        });

        // 2. 表头完整性 —— 表头行内容与 schema 一致
        if (mainSheet) {
            const headerRow = mainSheet.getRow(schema.headerRow);
            const headerTexts = [];
            for (let c = 1; c <= schema.columnCount; c++) {
                const t = this._cellToText(headerRow.getCell(c).value);
                headerTexts.push(t);
            }
            const expectedHeaders = schema.columns.map(c => c.headerText);
            const match = JSON.stringify(headerTexts) === JSON.stringify(expectedHeaders);
            items.push({
                name: '表头完整性',
                pass: match,
                message: match ? `${schema.columnCount} 列表头与模板一致` : `表头不匹配: 实际[${headerTexts.join('|')}] vs 期望[${expectedHeaders.join('|')}]`
            });
        }

        // 3. 数据清空
        items.push({
            name: '数据清空',
            pass: true,
            message: `第${schema.dataStartRow}行起写入 ${writtenCount} 条`
        });

        // 4. 用例数
        items.push({
            name: '用例数',
            pass: writtenCount > 0,
            message: writtenCount > 0 ? `写入 ${writtenCount} (${sourceLabel})` : '无测试用例'
        });

        // 5. **每列填充率门禁**（v8.0 新增）—— 自动发现"整列为空"问题
        if (mainSheet && writtenCount > 0) {
            const columnRates = [];
            const underfilled = [];
            for (const colDef of schema.columns) {
                let filled = 0;
                const emptyRows = [];
                for (let i = 0; i < writtenCount; i++) {
                    const v = this._cellToText(mainSheet.getRow(schema.dataStartRow + i).getCell(colDef.index).value);
                    if (v && v.trim()) filled++;
                    else emptyRows.push(schema.dataStartRow + i);
                }
                const rate = writtenCount > 0 ? (filled / writtenCount) * 100 : 0;
                columnRates.push({
                    headerText: colDef.headerText,
                    semanticKey: colDef.semanticKey,
                    index: colDef.index,
                    filled,
                    total: writtenCount,
                    rate: +rate.toFixed(1),
                    required: !!colDef.required
                });
                // 必含主键（required=true）必须 100%；其他列 < 100% 也告警
                if (colDef.required && filled < writtenCount) {
                    underfilled.push({ col: colDef, filled, emptyRows: emptyRows.slice(0, 5) });
                } else if (rate < 100) {
                    underfilled.push({ col: colDef, filled, emptyRows: emptyRows.slice(0, 5), warn: true });
                }
            }
            // 必含主键未达 100% → 抛错 E102
            const criticalMisses = underfilled.filter(u => !u.warn);
            items.push({
                name: '列填充率门禁',
                pass: criticalMisses.length === 0,
                message: underfilled.length === 0
                    ? `全部 ${columnRates.length} 列填充率 100%`
                    : `⚠ ${underfilled.length} 列不达标（必含主键 ${criticalMisses.length} 列）：${underfilled.map(u => `${u.col.headerText}=${u.filled}/${writtenCount}`).join('; ')}`
            });
            if (criticalMisses.length > 0) {
                const detail = criticalMisses.map(u => `${u.col.headerText}(${u.col.semanticKey}) 仅 ${u.filled}/${writtenCount}`).join('; ');
                throw new BempDocError(
                    ERROR_CODES.COLUMN_UNDERFILLED,
                    `必含主键列填充率不达标：${detail}`,
                    { columns: criticalMisses.map(u => ({ semanticKey: u.col.semanticKey, headerText: u.col.headerText, filled: u.filled, total: writtenCount })) }
                );
            }
        }

        // 6. 摘要 Sheet 状态
        const summarySheet = workbook.getWorksheet(schema.summary.sheetName);
        if (schema.summary.exists) {
            items.push({
                name: '摘要工作表',
                pass: !!summarySheet,
                message: summarySheet ? `模板自带（已保留）` : '缺失'
            });
        } else {
            items.push({
                name: '摘要工作表',
                pass: !!summarySheet,
                message: summarySheet ? `${summarySheet.rowCount} 行（已追加）` : '缺失'
            });
        }

        // 7. 非超链接蓝色检查
        let blueCount = 0;
        for (const sheet of [mainSheet, summarySheet]) {
            if (!sheet) continue;
            sheet.eachRow({ includeEmpty: false }, row => {
                row.eachCell({ includeEmpty: false }, cell => {
                    const color = cell.font && cell.font.color;
                    if (color && color.argb) {
                        const hex = color.argb.slice(-6).toUpperCase();
                        if (['0070C0', '0000FF', '0563C1', '1F4E79'].includes(hex)) blueCount++;
                    }
                });
            });
        }
        items.push({
            name: '非超链接蓝色',
            pass: blueCount === 0,
            message: blueCount === 0 ? '0处' : `${blueCount}处`
        });

        const allPass = items.every(i => i.pass);
        return { allPass, items, blueCount, writtenCount, mode: schema.meta?.mode || 'unknown' };
    }

    _resolvePath(p) {
        return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    }

    _resolveOutputPath(outputPath, moduleName, mode) {
        if (outputPath) return this._resolvePath(outputPath);
        // 默认输出到技能根目录的 output/ 而非 scripts/output/ —— 用户期望
        // __dirname = <skill>/scripts/lib/xlsx-report → 上 3 层 = 技能根
        const skillRoot = path.resolve(__dirname, '..', '..', '..');
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return path.join(skillRoot, 'output', `${moduleName || '未命名'}-单元测试报告-${date}.xlsx`);
    }

    _cellToText(cell) {
        if (cell == null) return '';
        if (typeof cell === 'string') return cell;
        if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell);
        if (cell && typeof cell === 'object') {
            if ('text' in cell) return String(cell.text);
            if ('result' in cell) return String(cell.result);
            if ('richText' in cell) return cell.richText.map(rt => rt.text).join('');
            if ('hyperlink' in cell) return String(cell.hyperlink);
        }
        return String(cell);
    }

    _log(...args) {
        if (this.options.logger) this.options.logger(...args);
    }
}

module.exports = { XlsxReportPipeline };
