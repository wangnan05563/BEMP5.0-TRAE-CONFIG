'use strict';

const ExcelJS = require('exceljs');
const { TemplateSchema } = require('./template-schema');
const { BempDocError, ERROR_CODES } = require('../../../config/default');

/**
 * 列名 → 语义键 的通用化映射规则
 *
 * 规则按"优先级从高到低"匹配（先匹配的具体键优先级高）。
 * 全部使用 substring 而非 equality，最大化兼容性：
 *  - "测试案例编号" 命中 "编号" → semanticKey: 'id'
 *  - "测试用例内容" 命中 "用例内容"/"测试内容" → semanticKey: 'stepDesc'
 *  - "用例性质"     命中 "性质"      → semanticKey: 'nature'
 *
 * 注意：完全数据驱动，不为任何具体模板硬编码列名。
 */
const SEMANTIC_RULES = [
    // === 一级：必含主键 ===
    { keys: ['测试案例编号', '案例编号', '用例编号', '编号', 'ID', 'No', 'No.', 'Case ID', 'Test ID'], semantic: 'id', required: true },
    { keys: ['测试案例名称', '用例名称', '案例名称', '测试名称', '测试点', '标题', 'Name', 'Title', 'Case Name'], semantic: 'name', required: true },

    // === 二级：内容字段（步骤/结果） ===
    // 注意：顺序很关键。"步骤描述"含"描述"，"测试概述"含"概述"，
    // "操作步骤名称"含"操作步骤"，需要更具体的优先匹配。
    { keys: ['操作步骤名称', '步骤名称', 'Step Name', 'StepName'], semantic: 'stepName' },
    { keys: ['步骤描述', '测试步骤', '操作步骤', '步骤', 'Step', 'Steps', 'Procedure', 'Steps Description'], semantic: 'stepDesc' },
    { keys: ['测试概述', '概述', 'Summary', 'Description'], semantic: 'summary' },
    { keys: ['预期结果', '期望结果', '预期', 'Expected', 'Expected Result'], semantic: 'expected' },
    { keys: ['实际结果', '运行结果', '实际', 'Actual', 'Actual Result', 'Test Result'], semantic: 'actual' },
    { keys: ['测试数据', '数据', 'Test Data', 'Input Data', 'Data'], semantic: 'data' },

    // === 三级：元数据 ===
    { keys: ['前置条件', '前提条件', '预置条件', 'Pre-condition', 'Precondition', 'Pre'], semantic: 'precondition' },
    { keys: ['用例性质', '案例性质', '性质', 'Nature', 'Type'], semantic: 'nature' },
    { keys: ['案例设计人', '设计人', 'Designer', 'Designed By'], semantic: 'designer' },
    { keys: ['测试人员', '执行人', 'Tester', 'Tested By'], semantic: 'tester' },
    { keys: ['投产点', '投产', 'Production', 'Prod'], semantic: 'prod' },
    { keys: ['周期', 'Cycle', 'Phase', 'Stage'], semantic: 'cycle' },
    { keys: ['评审状态', '评审', 'Review', 'Review Status'], semantic: 'review' },
    { keys: ['所属项目', '项目', 'Project'], semantic: 'project' },
    { keys: ['所属组件', '组件', 'Component'], semantic: 'component' },
    { keys: ['所属模块', '模块', 'Module'], semantic: 'module' },
    { keys: ['所属子系统', '子系统', 'Subsystem'], semantic: 'subsystem' },
    { keys: ['案例等级', '优先级', '等级', 'Priority', 'Level'], semantic: 'priority' },

    // === 四级：分类（模块层级） ===
    { keys: ['一级模块', '一级分类', 'L1', 'Module L1', 'Category L1'], semantic: 'module1' },
    { keys: ['二级模块', '二级分类', 'L2', 'Module L2', 'Category L2'], semantic: 'module2' },
    { keys: ['三级模块', '三级分类', 'L3', 'Module L3', 'Category L3'], semantic: 'module3' },
    { keys: ['四级模块', '四级分类', 'L4', 'Module L4', 'Category L4'], semantic: 'module4' },

    // === 五级：缺陷跟踪 ===
    { keys: ['缺陷编号', 'Bug ID', 'Defect ID'], semantic: 'bugId' },
    { keys: ['缺陷描述', 'Bug Description', 'Defect Description'], semantic: 'bugDesc' },
    { keys: ['缺陷等级', 'Bug Level', 'Severity'], semantic: 'bugLevel' },
    { keys: ['修复状态', 'Bug Status', 'Fix Status'], semantic: 'bugStatus' },

    // === 六级：日期/审计 ===
    { keys: ['开始日期', '开始', 'Start Date', 'Start'], semantic: 'startDate' },
    { keys: ['完成日期', '完成', 'End Date', 'Complete Date'], semantic: 'endDate' },
    { keys: ['创建人', 'Creator', 'Created By'], semantic: 'creator' },
    { keys: ['创建时间', 'Created At', 'Create Time'], semantic: 'createdAt' },
    { keys: ['修改人', 'Modifier', 'Modified By'], semantic: 'modifier' },
    { keys: ['修改时间', 'Modified At', 'Update Time'], semantic: 'updatedAt' },

    // === 末位：备注 ===
    { keys: ['备注', '说明', '注释', 'Remark', 'Note', 'Notes', 'Comment', 'Comments'], semantic: 'remark' }
];

/**
 * 摘要 Sheet 名称候选（按优先级排序）
 * 通用化处理：用户模板中可能叫"测试报告摘要"、"测试报告"、"Summary"、"汇总"等
 */
const SUMMARY_SHEET_CANDIDATES = [
    '测试报告摘要', '测试报告', '摘要', 'Summary', 'Summary Sheet',
    '汇总', '报告摘要', 'Test Report Summary', 'Test Report', 'Report'
];

/**
 * 表头识别关键词（任一命中即认为该行是表头行）
 */
const HEADER_KEYWORDS = [
    '编号', '案例', '用例', '测试', '步骤', '预期', '结果', '模块',
    'No', 'ID', 'Case', 'Test', 'Step', 'Expected', 'Actual',
    'Module', 'Priority', 'Nature', 'Type', 'Name', 'Description'
];

/**
 * TemplateInspector —— 通用化模板解析器
 *
 * 职责：
 *   1. 智能识别表头行（不依赖硬编码行号）
 *   2. 解析每列的语义（基于 SEMANTIC_RULES 关键词匹配）
 *   3. 智能识别数据起始行（表头+1，并向下扩展直到空行或脚注）
 *   4. 检测模板是否已存在"测试报告摘要" Sheet
 *   5. 智能识别表头之上的"原则/说明/填写须知"等固定行（必须保留）
 *
 * 通用化保证：
 *   - 不为任何具体模板硬编码列数 / 列名 / 表头行
 *   - 列数 = 模板实际列数
 *   - 列名 = 模板实际列名
 *   - 支持任意模板格式（用户自定义的"09【模板】单元测试报告.xlsx"）
 */
class TemplateInspector {
    constructor(options = {}) {
        this.options = {
            /** 表头搜索的最大行数（防止误读超大模板） */
            maxHeaderSearchRows: options.maxHeaderSearchRows || 20,
            /** 摘要 Sheet 名候选 */
            summarySheetCandidates: options.summarySheetCandidates || SUMMARY_SHEET_CANDIDATES,
            /** 启动时是否在表头之前寻找"原则/说明"行 */
            detectPreamble: options.detectPreamble !== false,
            /** v8.0 新增：外部 SEMANTIC_RULES 注入（数组），合并到内置规则前面 */
            extraSemanticRules: options.extraSemanticRules || null,
            ...options
        };
        // 合并外部规则：用户自定义的最优先（高优先级），在合并后放到内置规则前面
        this.effectiveRules = this._mergeRules();
    }

    /**
     * 合并内置 + 外部 SEMANTIC_RULES
     * 外部规则（extraSemanticRules）在前，内置在后，匹配时优先外部
     */
    _mergeRules() {
        if (!Array.isArray(this.options.extraSemanticRules) || this.options.extraSemanticRules.length === 0) {
            return SEMANTIC_RULES;
        }
        const ext = this.options.extraSemanticRules;
        // 校验：每条 rule 必须含 keys 和 semantic
        for (let i = 0; i < ext.length; i++) {
            const r = ext[i];
            if (!r || !Array.isArray(r.keys) || r.keys.length === 0 || !r.semantic) {
                throw new BempDocError(
                    ERROR_CODES.SEMANTIC_MAP_INVALID,
                    `extraSemanticRules[${i}] 格式错误：必须含 keys[] 与 semantic`,
                    { rule: r }
                );
            }
        }
        return [...ext, ...SEMANTIC_RULES];
    }

    /**
     * 加载外部 SEMANTIC_RULES 文件（JSON 数组）
     * 路径：--semantic-map /path/to/rules.json
     */
    static loadSemanticMap(jsonPath) {
        const fs = require('fs');
        if (!fs.existsSync(jsonPath)) {
            throw new BempDocError(
                ERROR_CODES.SEMANTIC_MAP_INVALID,
                `SEMANTIC_RULES 文件不存在: ${jsonPath}`
            );
        }
        let data;
        try {
            data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } catch (e) {
            throw new BempDocError(
                ERROR_CODES.SEMANTIC_MAP_INVALID,
                `SEMANTIC_RULES 文件 JSON 解析失败: ${e.message}`,
                { path: jsonPath }
            );
        }
        if (!Array.isArray(data)) {
            throw new BempDocError(
                ERROR_CODES.SEMANTIC_MAP_INVALID,
                `SEMANTIC_RULES 文件必须是数组，当前类型: ${typeof data}`,
                { path: jsonPath }
            );
        }
        return data;
    }

    /**
     * 解析模板 → TemplateSchema
     * @param {string} templatePath
     * @returns {Promise<TemplateSchema>}
     */
    async inspect(templatePath) {
        if (!templatePath) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, 'TemplateInspector: templatePath 必填');
        }
        const fs = require('fs');
        if (!fs.existsSync(templatePath)) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `xlsx 模板不存在: ${templatePath}`);
        }

        const t0 = Date.now();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        // 1. 选择主工作表：优先找含"测试记录单"/"测试用例"/"TestCase"等关键词的工作表
        const mainSheet = this._selectMainSheet(workbook.worksheets);
        if (!mainSheet) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, '模板中未找到主工作表（测试记录单/测试用例/TestCase）');
        }

        // 2. 智能识别表头行
        const headerRowNum = this._detectHeaderRow(mainSheet);
        if (headerRowNum < 1) {
            throw new BempDocError(
                ERROR_CODES.HEADER_NOT_DETECTED,
                '无法识别模板表头行：前 20 行内未找到含"编号/案例/测试/步骤"等关键词的行',
                { maxSearchRows: this.options.maxHeaderSearchRows, keywords: HEADER_KEYWORDS }
            );
        }

        // 3. 解析列定义
        const columns = this._parseColumns(mainSheet, headerRowNum);

        // 4. 智能识别数据起始行（表头+1，并向下找第一个非空非脚注行）
        const dataStartRow = this._detectDataStartRow(mainSheet, headerRowNum);

        // 5. 智能识别数据结束行（默认 null，表示按需扩展；也可能是用户模板已写好的"示例行"）
        const dataEndRow = this._detectDataEndRow(mainSheet, dataStartRow);

        // 6. 智能识别表头之上的固定行（原则/说明/填写须知）
        const preambleRows = this.options.detectPreamble
            ? this._detectPreambleRows(mainSheet, headerRowNum)
            : [];

        // 7. 检测是否已存在"测试报告摘要" Sheet
        const summaryInfo = this._detectSummarySheet(workbook);

        // 8. 校验：必含主键缺失时报错
        this._validateRequiredColumns(columns);

        const schema = new TemplateSchema({
            sheetName: mainSheet.name,
            headerRow: headerRowNum,
            dataStartRow,
            dataEndRow,
            preambleRows,
            columns,
            summary: summaryInfo,
            meta: {
                templatePath,
                parseDurationMs: Date.now() - t0,
                totalSheets: workbook.worksheets.length,
                inspectorVersion: '2.0.0'
            }
        });

        schema.validate();
        return schema;
    }

    /** 选择主工作表 */
    _selectMainSheet(sheets) {
        if (!sheets || sheets.length === 0) return null;
        // 优先级关键词
        const preferredNames = ['测试记录单', '测试用例', 'TestCase', 'Test Cases', 'Cases', 'Sheet1', '数据'];
        for (const name of preferredNames) {
            const found = sheets.find(s => s.name === name);
            if (found) return found;
        }
        // 兜底：取第一个非空工作表
        for (const s of sheets) {
            if (s.rowCount > 0) return s;
        }
        return sheets[0];
    }

    /** 智能识别表头行 */
    _detectHeaderRow(ws) {
        const searchLimit = Math.min(this.options.maxHeaderSearchRows, ws.rowCount);
        // 评估每一行作为表头候选的"质量分"
        const candidates = [];

        for (let r = 1; r <= searchLimit; r++) {
            const row = ws.getRow(r);
            const headers = [];
            for (let c = 1; c <= Math.min(ws.columnCount, 30); c++) {
                const v = this._cellToText(row.getCell(c).value);
                if (v) headers.push({ col: c, text: v });
            }
            if (headers.length === 0) continue;

            // === 排除"填写说明行"（以"说明："开头，描述列填写规则，不是真正的列名） ===
            const firstText = headers[0].text.trim();
            const isInstructionRow = /^说明[：:]/.test(firstText) || firstText.startsWith('说明：') || firstText.startsWith('说明:');

            // === 基础分：包含 HEADER_KEYWORDS 关键词的数量 ===
            let score = headers.reduce((sum, h) => {
                return sum + HEADER_KEYWORDS.filter(kw => h.text.includes(kw)).length;
            }, 0);

            // === 加分项：包含 * 必填标记（QC 模板常见特征） ===
            const requiredMarks = headers.filter(h => h.text.includes('*')).length;
            score += requiredMarks * 2;

            // === 加分项：列名长度普遍较短（说明行每格都很长）===
            const avgLen = headers.reduce((s, h) => s + h.text.length, 0) / headers.length;
            if (avgLen < 12) score += 3;
            else if (avgLen > 30) score -= 5;  // 长文本行（如"案例填写原则"）扣分

            // === 扣分项：说明行 ===
            if (isInstructionRow) score -= 10;

            // === 必须至少 2 个非空 cell 才算候选 ===
            if (headers.length >= 2) {
                candidates.push({ row: r, score, isInstructionRow });
            }
        }

        if (candidates.length === 0) return -1;

        // 按 score 降序、row 升序排列
        candidates.sort((a, b) => b.score - a.score || a.row - b.row);
        return candidates[0].row;
    }

    /** 解析每列定义（headerText + semanticKey） */
    _parseColumns(ws, headerRowNum) {
        const row = ws.getRow(headerRowNum);
        const columns = [];
        const seenSemanticKeys = new Set();

        for (let c = 1; c <= Math.min(ws.columnCount, 50); c++) {
            const cell = row.getCell(c);
            const headerText = this._cellToText(cell.value).trim();
            if (!headerText) continue;

            // 推断 semanticKey（v8.0：使用 effectiveRules，外部规则优先）
            let semanticKey = null;
            for (const rule of this.effectiveRules) {
                if (rule.keys.some(k => headerText.includes(k) || k.includes(headerText))) {
                    semanticKey = rule.semantic;
                    break;
                }
            }

            // 兜底：未匹配的列用 generic_<idx>，保留 headerText 用于展示
            if (!semanticKey) {
                semanticKey = `generic_${c}`;
            } else if (seenSemanticKeys.has(semanticKey)) {
                // 重复语义键，加后缀
                let n = 2;
                while (seenSemanticKeys.has(`${semanticKey}_${n}`)) n++;
                semanticKey = `${semanticKey}_${n}`;
            }
            seenSemanticKeys.add(semanticKey);

            // 推断 dataType
            const dataType = this._inferDataType(headerText);

            // 推断必填（v8.0：外部规则的 required 也生效）
            const rule = this.effectiveRules.find(r => r.semantic === semanticKey.split('_')[0]);
            const required = !!(rule && rule.required);

            // 列宽
            const colDef = ws.getColumn(c);
            const width = colDef && colDef.width ? colDef.width : null;

            columns.push({
                index: c,
                headerText,
                semanticKey,
                dataType,
                required,
                width
            });
        }
        return columns;
    }

    /** 推断数据类型 */
    _inferDataType(headerText) {
        if (/\d+%/.test(headerText)) return 'percent';
        if (/(日期|time|date|时间)/i.test(headerText)) return 'date';
        if (/(数|数量|amount|qty|count|coverage)/i.test(headerText)) return 'number';
        if (/(等级|level|priority|severity)/i.test(headerText)) return 'enum';
        return 'string';
    }

    /** 智能识别数据起始行：表头+1，并向下跳过"列名重复行/占位行" */
    _detectDataStartRow(ws, headerRowNum) {
        let r = headerRowNum + 1;
        // 跳过 1-2 个重复表头行（防御：部分模板会把列名复制两遍）
        while (r <= headerRowNum + 3 && r <= ws.rowCount) {
            const row = ws.getRow(r);
            const firstCellText = this._cellToText(row.getCell(1).value).trim();
            // 如果第一列看起来像列名（如"编号"/"案例"），说明是重复表头
            if (HEADER_KEYWORDS.some(kw => firstCellText.includes(kw))) {
                r++;
                continue;
            }
            break;
        }
        return r;
    }

    /** 智能识别数据结束行：扫描到第一个"完全空"的行 */
    _detectDataEndRow(ws, dataStartRow) {
        // 默认 null：表示按需扩展
        return null;
    }

    /** 智能识别表头之上的固定行（"原则/说明/填写须知"等） */
    _detectPreambleRows(ws, headerRowNum) {
        const preamble = [];
        const PREAMBLE_KEYWORDS = ['原则', '说明', '须知', '要求', '填写', '规范', 'Principle', 'Note', 'Guideline', 'Instruction', '说明：', '要求：'];

        for (let r = 1; r < headerRowNum; r++) {
            const row = ws.getRow(r);
            const text = this._collectRowText(row);
            if (!text) continue;
            if (PREAMBLE_KEYWORDS.some(kw => text.includes(kw))) {
                preamble.push({ rowNumber: r, content: text });
            }
        }
        return preamble;
    }

    /** 检测是否已存在摘要 Sheet */
    _detectSummarySheet(workbook) {
        for (const name of this.options.summarySheetCandidates) {
            const exists = workbook.worksheets.some(s => s.name === name);
            if (exists) {
                return { sheetName: name, exists: true, sections: [] };
            }
        }
        // 模板无摘要 Sheet，需要在生成时创建
        return { sheetName: this.options.summarySheetCandidates[0], exists: false, sections: [] };
    }

    /** 校验必含主键 */
    _validateRequiredColumns(columns) {
        const requiredKeys = ['id'];
        for (const req of requiredKeys) {
            const has = columns.some(c => c.semanticKey === req || c.semanticKey.startsWith(req + '_'));
            if (!has) {
                throw new BempDocError(
                    ERROR_CODES.REQUIRED_KEY_MISSING,
                    `模板必含"${req}"语义列（如"测试案例编号"），但解析后未找到。可用列：${columns.map(c => c.headerText).join('|')}`
                );
            }
        }
    }

    /** 提取单元格文本（兼容 richText、formula、object） */
    _cellToText(cell) {
        if (cell == null) return '';
        if (typeof cell === 'string') return cell;
        if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell);
        if (cell && typeof cell === 'object') {
            if ('text' in cell && typeof cell.text === 'string') return cell.text;
            if ('result' in cell && cell.result !== undefined) return String(cell.result);
            if ('richText' in cell && Array.isArray(cell.richText)) return cell.richText.map(rt => rt.text || '').join('');
            if ('hyperlink' in cell) return String(cell.hyperlink);
            if ('formula' in cell) return String(cell.formula);
        }
        return String(cell);
    }

    /** 收集整行文本 */
    _collectRowText(row) {
        const parts = [];
        for (let c = 1; c <= row.cellCount; c++) {
            const t = this._cellToText(row.getCell(c).value);
            if (t) parts.push(t);
        }
        return parts.join(' | ');
    }
}

module.exports = { TemplateInspector, SEMANTIC_RULES, HEADER_KEYWORDS, SUMMARY_SHEET_CANDIDATES };
