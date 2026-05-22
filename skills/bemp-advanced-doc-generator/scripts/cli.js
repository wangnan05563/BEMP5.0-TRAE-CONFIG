const fs = require('fs');
const path = require('path');
const { paths, BempDocError, ERROR_CODES, COMPANY_DEFAULTS, validatePaths } = require('./config/default');

const VALID_TYPES = ['design', 'testcase', 'testreport', 'srs', 'testcase-excel', 'testcase-md', 'testreport-md', 'design-md', 'srs-md'];
const VALID_FORMATS = ['docx', 'md', 'excel'];

function parseArgs(args) {
    const options = { type: 'design', format: 'docx', jsonOutput: false };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--type': case '-t':
                options.type = args[++i]; break;
            case '--module': case '-m':
                options.module = args[++i]; break;
            case '--format': case '-f':
                options.format = args[++i]; break;
            case '--output': case '-o':
                options.outputPath = args[++i]; break;
            case '--template':
                options.templatePath = args[++i]; break;
            case '--requirement': case '-r':
                options.requirementPath = args[++i]; break;
            case '--config': case '-c':
                options.configPath = args[++i]; break;
            case '--visualization': case '-v':
                options.visualization = true; break;
            case '--json':
                options.jsonOutput = true; break;
            case '--help': case '-h':
                printHelp(); process.exit(0);
            default:
                if (!arg.startsWith('-')) options.module = arg;
        }
    }

    if (options.type.endsWith('-md')) {
        options.format = 'md';
        options.type = options.type.replace('-md', '');
    }
    if (options.type === 'testcase-excel') {
        options.format = 'excel';
        options.type = 'testcase';
    }

    return options;
}

function printHelp() {
    console.log(`
BEMP 文档生成器 v2.0

用法: node cli.js [选项]

选项:
  -t, --type <类型>        文档类型: design|testcase|testreport|srs (默认: design)
  -m, --module <模块>      模块名称
  -f, --format <格式>      输出格式: docx|md|excel (默认: docx)
  -o, --output <路径>      输出文件路径
  -r, --requirement <路径> 需求文档路径 (用于testcase/srs类型)
  --template <路径>        模板文件路径
  -c, --config <路径>      配置文件路径
  --json                   JSON结构化输出（含自动验证结果）
  -v, --visualization      生成可视化文档
  -h, --help               显示帮助信息

示例:
  node cli.js -t design -m "机构管理"
  node cli.js -t srs -r "需求.md" -m "合同发票管理"
  node cli.js -t testcase -f excel -r "需求.md" -m "额度管理"
  node cli.js -t testcase -f excel -r "需求.md" -m "额度管理" --json
  node cli.js -t testreport -m "批量导入"
`);
}

async function generateDocument(options) {
    const jsonMode = options.jsonOutput;
    const moduleName = options.module || '未命名模块';

    if (!VALID_TYPES.includes(options.type)) {
        throw new BempDocError(ERROR_CODES.INVALID_PARAMS, `不支持的文档类型: ${options.type}，支持: ${VALID_TYPES.join(', ')}`);
    }

    if (options.format === 'excel') {
        const { ExcelTestCaseGenerator } = require('./lib/excel-testcase-generator');
        const excelGen = new ExcelTestCaseGenerator({
            projectRoot: paths.projectRoot
        });

        const excelParams = {
            moduleName,
            templatePath: options.templatePath || undefined,
            requirementPath: options.requirementPath || undefined,
            configPath: options.configPath || undefined,
            outputPath: options.outputPath || undefined
        };

        const result = await excelGen.generate(excelParams);

        if (jsonMode) {
            return {
                success: true,
                type: 'testcase-excel',
                outputPath: result.outputPath,
                totalCases: result.totalCases,
                positive: result.positiveCases || 0,
                negative: result.negativeCases || 0,
                boundary: result.boundaryCases || 0,
                validation: result.validation || {}
            };
        }

        return [
            `✓ Excel SIT测试用例已生成: ${result.outputPath}`,
            `  共 ${result.totalCases} 条测试用例`
        ];
    }

    const { DocumentBuilder } = require('./lib/doc-builder');
    const builder = new DocumentBuilder();

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const typeLabels = { design: '详细设计文档', testcase: '测试用例', testreport: '测试报告', srs: '需求规格说明书' };
    const typeLabel = typeLabels[options.type] || '文档';

    let outputPath;

    if (options.format === 'md') {
        const defaultOutput = path.join(paths.outputDir, `${moduleName}-${typeLabel}-${date}.md`);
        outputPath = options.outputPath || defaultOutput;
        builder.generateMarkdown(moduleName, outputPath, options.type);
    } else {
        const defaultOutput = path.join(paths.outputDir, `${moduleName}-${typeLabel}-${date}.docx`);
        outputPath = options.outputPath || defaultOutput;

        let templateData = null;
        if (options.templatePath) {
            templateData = loadTemplateData(options.templatePath);
        } else if (options.requirementPath) {
            const { TemplateBuilder } = require('./lib/template-builder');
            const templateBuilder = new TemplateBuilder();
            templateData = templateBuilder.buildFromRequirement(options.requirementPath, options.type, moduleName);
        }

        await builder.generateDocument(moduleName, outputPath, templateData, options.type);
    }

    let vizResult = null;
    if (options.visualization) {
        try {
            const { VisualizationGenerator } = require('./lib/visualization');
            const vizGen = new VisualizationGenerator();
            const vizContent = fs.existsSync(options.requirementPath || '')
                ? fs.readFileSync(options.requirementPath, 'utf-8')
                : `${moduleName} ${typeLabel}`;
            vizResult = await vizGen.generateVisualization(moduleName, vizContent);
        } catch (vizError) {
            console.warn(`⚠ 可视化文档生成失败: ${vizError.message}`);
            vizResult = { error: vizError.message };
        }
    }

    if (jsonMode) {
        const jsonResult = {
            success: true,
            type: options.type,
            format: options.format,
            outputPath,
        };
        if (vizResult) jsonResult.visualization = vizResult;
        return jsonResult;
    }

    const results = [`✓ ${options.format === 'md' ? 'Markdown' : 'Word'}${typeLabel}已生成: ${outputPath}`];
    if (vizResult && !vizResult.error) {
        results.push(`✓ 可视化文档已生成: ${vizResult.fileUrl}`);
        if (vizResult.isLocal) results.push(`  (本地模式)`);
    } else if (vizResult && vizResult.error) {
        results.push(`⚠ 可视化文档生成失败: ${vizResult.error}`);
    }
    return results;
}

function loadTemplateData(templatePath) {
    const resolvedPath = path.isAbsolute(templatePath) ? templatePath : path.resolve(process.cwd(), templatePath);
    if (!fs.existsSync(resolvedPath)) {
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件不存在: ${resolvedPath}`);
    }
    try {
        return JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    } catch (e) {
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件解析失败: ${e.message}`);
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printHelp();
        process.exit(0);
    }

    const options = parseArgs(args);

    if (options.jsonOutput) {
        try {
            const result = await generateDocument(options);
            console.log(JSON.stringify(result, null, 2));
        } catch (error) {
            const errResult = {
                success: false,
                errorCode: error instanceof BempDocError ? error.code : 'UNKNOWN',
                errorMessage: error.message
            };
            console.log(JSON.stringify(errResult, null, 2));
            process.exit(1);
        }
        return;
    }

    console.log(`\nBEMP 文档生成器 v2.0`);
    console.log(`类型: ${options.type} | 格式: ${options.format} | 模块: ${options.module || '未指定'}`);
    console.log('---\n');

    const pathWarnings = validatePaths();
    if (pathWarnings.length > 0) {
        pathWarnings.forEach(w => console.warn(`⚠ 配置警告: ${w}`));
    }

    try {
        const results = await generateDocument(options);
        results.forEach(r => console.log(r));

        if (options.format === 'docx' && results.length > 0) {
            const outputMatch = results[0].match(/已生成:\s*(.+)/);
            if (outputMatch) {
                const outputPath = outputMatch[1].trim();
                if (fs.existsSync(outputPath)) {
                    const { DocValidator } = require('./lib/doc-validator');
                    const validator = new DocValidator();
                    const validation = validator.validateDocxStructure(outputPath);
                    console.log('\n--- 文档验证 ---');
                    if (validation.errors.length > 0) {
                        validation.errors.forEach(e => console.log(`  ❌ [${e.code}] ${e.message}`));
                    }
                    if (validation.warnings.length > 0) {
                        validation.warnings.forEach(w => console.log(`  ⚠️ [${w.code}] ${w.message}`));
                    }
                    if (validation.info.length > 0) {
                        validation.info.forEach(i => console.log(`  ℹ️ [${i.code}] ${i.message}`));
                    }
                    if (validation.passed && validation.warnings.length === 0) {
                        console.log('  ✅ 验证通过');
                    }
                }
            }
        }

        console.log('\n✅ 全部完成');
    } catch (error) {
        if (error instanceof BempDocError) {
            console.error(`\n❌ 错误 [${error.code}]: ${error.message}`);
            if (error.detail) console.error(`   详情: ${error.detail}`);
        } else {
            console.error(`\n❌ 未知错误: ${error.message}`);
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();
