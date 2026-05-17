const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { ExcelTemplateParser } = require('./excel-template-parser');
const { RequirementAnalyzer } = require('./requirement-analyzer');
const { paths, BempDocError, ERROR_CODES } = require('../config/default');

class ExcelTestCaseGenerator {
    constructor(options = {}) {
        this.options = {
            defaultTemplateDir: paths.templateDir,
            defaultOutputDir: paths.outputDir,
            ...options
        };
        this.parser = new ExcelTemplateParser();
        this.analyzer = new RequirementAnalyzer();
    }

    async generate(params) {
        const {
            templatePath, requirementPath, requirementContent,
            testCases: externalTestCases, configPath, outputPath, moduleName
        } = params;

        console.log('\n========================================');
        console.log('  BEMP Excel测试用例生成器 v2.0');
        console.log('========================================\n');

        const resolvedTemplatePath = this._resolveTemplatePath(templatePath);
        console.log(`[1/5] 解析Excel模板: ${resolvedTemplatePath}`);
        const templateConfig = await this._parseTemplateWithConfig(resolvedTemplatePath, configPath);
        console.log(`  检测到 ${Object.keys(templateConfig.columns).length} 个字段列`);
        console.log(`  数据起始行: ${templateConfig.dataStartRow}`);

        console.log('\n[2/5] 获取测试用例数据...');
        let testCases;
        if (externalTestCases && externalTestCases.length > 0) {
            testCases = externalTestCases;
            console.log(`  使用外部传入的 ${testCases.length} 条测试用例`);
        } else if (requirementPath || requirementContent) {
            testCases = await this._analyzeRequirement(requirementPath, requirementContent);
            console.log(`  从需求文档分析生成 ${testCases.length} 条测试用例`);
        } else {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, '必须提供 requirementPath、requirementContent 或 testCases 参数之一');
        }

        console.log('\n[3/5] 加载模板工作簿...');
        const workbook = await this._loadTemplateWorkbook(resolvedTemplatePath);
        const ws = workbook.worksheets[0];

        console.log('\n[4/5] 写入测试用例数据...');
        this._writeTestCases(ws, testCases, templateConfig);
        console.log(`  已写入 ${testCases.length} 条测试用例`);

        const resolvedOutputPath = this._resolveOutputPath(outputPath, moduleName);
        console.log(`\n[5/5] 保存输出文件: ${resolvedOutputPath}`);
        await this._saveWorkbook(workbook, resolvedOutputPath);

        const positiveCases = testCases.filter(tc => tc.nature === '正例').length;
        const negativeCases = testCases.filter(tc => tc.nature === '反例').length;
        const boundaryCases = testCases.filter(tc => tc.nature === '边界').length;

        const validation = await this._validateAlignment(resolvedOutputPath, templateConfig, testCases.length);

        console.log('\n========================================');
        console.log('  生成完成！');
        console.log(`  输出文件: ${resolvedOutputPath}`);
        console.log(`  测试用例数: ${testCases.length}`);
        console.log(`  正例: ${positiveCases}`);
        console.log(`  反例: ${negativeCases}`);
        console.log(`  边界: ${boundaryCases}`);
        if (validation.alignmentRate) {
            console.log(`  列对齐率: ${validation.alignmentRate}`);
        }
        console.log('========================================\n');

        return {
            outputPath: resolvedOutputPath,
            totalCases: testCases.length,
            positiveCases,
            negativeCases,
            boundaryCases,
            validation
        };
    }

    async _parseTemplateWithConfig(templatePath, configPath) {
        const autoDetected = await this.parser.parseTemplate(templatePath);

        if (configPath) {
            const configFile = this.parser.loadConfig(configPath);
            if (configFile) return this.parser.mergeConfig(autoDetected, configFile);
        }

        const defaultConfigPath = path.join(this.options.defaultTemplateDir, 'excel-testcase-template-config.json');
        const defaultConfig = this.parser.loadConfig(defaultConfigPath);
        if (defaultConfig) return this.parser.mergeConfig(autoDetected, defaultConfig);

        return autoDetected;
    }

    async _analyzeRequirement(requirementPath, requirementContent) {
        if (requirementPath) {
            const result = this.analyzer.analyzeRequirementFile(requirementPath);
            return result.testCases;
        }
        const result = this.analyzer.analyzeRequirement(requirementContent);
        return result.testCases;
    }

    async _loadTemplateWorkbook(templatePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        return workbook;
    }

    _writeTestCases(ws, testCases, templateConfig) {
        const { columns, dataStartRow, styles } = templateConfig;
        const fieldToColumn = {};
        for (const [colLetter, colInfo] of Object.entries(columns)) {
            fieldToColumn[colInfo.field] = colInfo;
        }

        this._validateColumnMapping(fieldToColumn, testCases[0]);

        for (let idx = 0; idx < testCases.length; idx++) {
            const tc = testCases[idx];
            const row = dataStartRow + idx;

            for (const [field, colInfo] of Object.entries(fieldToColumn)) {
                const cell = ws.getCell(row, colInfo.colNumber);
                const value = this._getTestCaseFieldValue(tc, field);
                cell.value = value;
                this._applyCellStyle(cell, colInfo.align, styles);
            }

            if (styles.rowHeight) ws.getRow(row).height = styles.rowHeight;
        }
    }

    _validateColumnMapping(fieldToColumn, sampleTestCase) {
        if (!sampleTestCase) return;

        const requiredFields = ['id', 'level1', 'level2', 'level3', 'precondition', 'content', 'nature', 'expected'];
        const missing = requiredFields.filter(f => !fieldToColumn[f]);
        if (missing.length > 0) {
            console.warn(`[警告] 列映射缺少以下必填字段: ${missing.join(', ')}，可能导致数据错位`);
        }

        const mappedCols = Object.values(fieldToColumn).map(c => c.colNumber);
        const duplicates = mappedCols.filter((c, i) => mappedCols.indexOf(c) !== i);
        if (duplicates.length > 0) {
            console.warn(`[警告] 多个字段映射到同一列: ${duplicates.join(', ')}，可能导致数据覆盖`);
        }

        const fieldColPairs = Object.entries(fieldToColumn)
            .map(([f, c]) => `${f}→${this._colToLetter(c.colNumber)}`)
            .join(', ');
        console.log(`  列映射: ${fieldColPairs}`);
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

    _getTestCaseFieldValue(tc, field) {
        const fieldMap = {
            id: tc.id, level1: tc.level1, level2: tc.level2, level3: tc.level3, level4: tc.level4,
            precondition: tc.precondition, content: tc.content, nature: tc.nature, expected: tc.expected,
            actual: tc.actual || '', tester: tc.tester || '', status: tc.status || '', remark: tc.remark || ''
        };
        return fieldMap[field] !== undefined ? fieldMap[field] : '';
    }

    _applyCellStyle(cell, align, styles) {
        const font = styles.font || {};
        cell.font = { name: font.name || '宋体', size: font.size || 9 };

        const borderStyle = styles.border || 'thin';
        const borderDef = { style: borderStyle, color: { argb: 'FF000000' } };
        cell.border = { top: borderDef, left: borderDef, bottom: borderDef, right: borderDef };

        const alignment = styles.alignment || {};
        cell.alignment = {
            horizontal: align || alignment.horizontal || 'center',
            vertical: alignment.vertical || 'center',
            wrapText: alignment.wrapText !== undefined ? alignment.wrapText : true
        };
    }

    _resolveTemplatePath(templatePath) {
        if (!templatePath) {
            const defaultPath = path.join(this.options.defaultTemplateDir, '测试用例.xlsx');
            if (fs.existsSync(defaultPath)) return defaultPath;
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, '未指定模板路径且默认模板不存在');
        }

        if (path.isAbsolute(templatePath)) {
            if (!fs.existsSync(templatePath)) {
                throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件不存在: ${templatePath}`);
            }
            return templatePath;
        }

        const projectRoot = this.options.projectRoot || paths.projectRoot;
        const candidates = [
            path.resolve(projectRoot, templatePath),
            path.resolve(this.options.defaultTemplateDir, templatePath),
            path.resolve(process.cwd(), templatePath)
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }

        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件不存在: ${templatePath}，已搜索路径: ${candidates.join(', ')}`);
    }

    _resolveOutputPath(outputPath, moduleName) {
        if (outputPath) {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            return outputPath;
        }

        if (!fs.existsSync(this.options.defaultOutputDir)) {
            fs.mkdirSync(this.options.defaultOutputDir, { recursive: true });
        }

        const name = moduleName || '测试用例';
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return path.join(this.options.defaultOutputDir, `${name}-SIT测试用例-${date}.xlsx`);
    }

    async _saveWorkbook(workbook, outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await workbook.xlsx.writeFile(outputPath);
    }

    _validateOutput(outputPath, expectedCount) {
        if (!fs.existsSync(outputPath)) return { valid: false, error: '输出文件不存在' };
        const stats = fs.statSync(outputPath);
        if (stats.size === 0) return { valid: false, error: '输出文件为空' };
        return { valid: true, fileSize: stats.size, expectedCount, message: `验证通过，文件大小 ${(stats.size / 1024).toFixed(1)}KB` };
    }

    async _validateAlignment(outputPath, templateConfig, expectedCount) {
        const baseValidation = this._validateOutput(outputPath, expectedCount);
        if (!baseValidation.valid) return baseValidation;

        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            const ws = workbook.worksheets[0];
            if (!ws) return { ...baseValidation, alignmentRate: 'N/A' };

            const { columns, dataStartRow } = templateConfig;
            const fieldToColumn = {};
            for (const [colLetter, colInfo] of Object.entries(columns)) {
                fieldToColumn[colInfo.field] = colInfo;
            }

            const natureCol = fieldToColumn.nature;
            const idCol = fieldToColumn.id;
            if (!natureCol && !idCol) return { ...baseValidation, alignmentRate: 'N/A' };

            let checkedRows = 0;
            let alignedRows = 0;
            const maxCheck = Math.min(dataStartRow + expectedCount, ws.rowCount + 1);

            for (let rowNum = dataStartRow; rowNum < maxCheck; rowNum++) {
                const row = ws.getRow(rowNum);
                let isAligned = false;

                if (natureCol) {
                    const natureCell = row.getCell(natureCol.colNumber);
                    const natureVal = String(natureCell.value || '').trim();
                    if (['正例', '反例', '边界'].includes(natureVal)) {
                        isAligned = true;
                    }
                }

                if (!isAligned && idCol) {
                    const idCell = row.getCell(idCol.colNumber);
                    const idVal = String(idCell.value || '').trim();
                    if (/^TC-/.test(idVal) || /^\d+$/.test(idVal)) {
                        isAligned = true;
                    }
                }

                checkedRows++;
                if (isAligned) alignedRows++;
            }

            const alignmentRate = checkedRows > 0
                ? ((alignedRows / checkedRows) * 100).toFixed(1) + '%'
                : 'N/A';

            return {
                ...baseValidation,
                alignmentRate,
                checkedRows,
                alignedRows
            };
        } catch (e) {
            return { ...baseValidation, alignmentRate: 'N/A', alignmentError: e.message };
        }
    }

    async generateFromJson(testCasesJsonPath, templatePath, outputPath) {
        if (!fs.existsSync(testCasesJsonPath)) {
            throw new BempDocError(ERROR_CODES.REQUIREMENT_NOT_FOUND, `测试用例JSON文件不存在: ${testCasesJsonPath}`);
        }
        const testCases = JSON.parse(fs.readFileSync(testCasesJsonPath, 'utf-8'));
        return this.generate({ templatePath, testCases, outputPath });
    }
}

module.exports = { ExcelTestCaseGenerator };
