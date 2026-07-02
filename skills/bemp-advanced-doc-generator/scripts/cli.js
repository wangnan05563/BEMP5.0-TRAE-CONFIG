const fs = require('fs');
const path = require('path');

// 2026-06-03 优化：带时间戳的日志（精确到毫秒）
const _t0 = Date.now();
function _ts() {
    const ms = (Date.now() - _t0).toString().padStart(6, ' ');
    return `[+${ms}ms]`;
}
const _originalLog = console.log.bind(console);
console.log = (...args) => _originalLog(`  ${_ts()}`, ...args);
const { paths, BempDocError, ERROR_CODES, validTypes: VALID_TYPES, validFormats: VALID_FORMATS, defaultTemplateMap: DEFAULT_TEMPLATE_MAP } = require('../config/default');
const pathsLite = require('./paths'); // 2026-07-02 优化：使用统一的 Node 端路径工具

/**
 * 解析封面占位文字映射
 * 格式: "XXX=项目名称;YYYY=信息科技部;2018=2026"
 * @param {string} raw
 * @returns {Object<string,string>}
 */
function parsePlaceholderMap(raw) {
    if (!raw || typeof raw !== 'string') return {};
    const map = {};
    raw.split(';').forEach(pair => {
        const [k, ...rest] = pair.split('=');
        if (k && rest.length > 0) {
            map[k.trim()] = rest.join('=').trim();
        }
    });
    return map;
}

/**
 * 图表生成质量门禁
 * 校验三张必要 PNG 是否齐全，文件大小是否 > 10KB（防止空图）
 * 当任一张图降级为 matplotlib 时，必须输出 WARN 告知智能体在交付文档中标注
 * @param {string} diagramDir
 * @param {string} mcpConfigPath
 * @returns {{passed:boolean, errors:string[], warnings:string[], summary:object}}
 */
function enforceDiagramGate(diagramDir, mcpConfigPath) {
    const errors = [];
    const warnings = [];
    const required = [
        { type: 'architecture', filename: 'architecture-diagram.png' },
        { type: 'network', filename: 'network-topology.png' },
        { type: 'deployment', filename: 'deployment-diagram.png' }
    ];
    const summary = { present: [], missing: [], fallbackToMatplotlib: [] };

    for (const { type, filename } of required) {
        const p = path.join(diagramDir, filename);
        if (fs.existsSync(p)) {
            const size = fs.statSync(p).size;
            if (size < 10 * 1024) {
                errors.push(`图表 ${filename} 文件过小 (${size} bytes)，疑似空图，必须重新生成`);
            } else {
                summary.present.push({ type, filename, size });
            }
        } else {
            summary.missing.push({ type, filename });
            errors.push(`图表 ${filename} 缺失，必须生成 architecture/network/deployment 三张图`);
        }
    }

    if (fs.existsSync(mcpConfigPath)) {
        try {
            const configs = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
            for (const c of (Array.isArray(configs) ? configs : [])) {
                if (c.source === 'matplotlib') {
                    summary.fallbackToMatplotlib.push(c.type);
                    warnings.push(`图表 ${c.type} 降级为 matplotlib（AntV 不可用或数据非法），建议在交付文档"已知问题"章节标注`);
                }
            }
        } catch (_) { /* ignore parse error, file was just written by us */ }
    }

    return {
        passed: errors.length === 0,
        errors,
        warnings,
        summary
    };
}

function parseArgs(args) {
    const options = { type: 'design', format: 'docx', jsonOutput: false, noOverwrite: false, listModules: false, keepTemplateToc: false, coverPlaceholders: null, updateFields: true, useAntV: true, umlEngine: 'graphviz' };
    let lastFlagConsumed = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--type': case '-t':
                options.type = args[++i]; lastFlagConsumed = true; break;
            case '--module': case '-m':
                options.module = args[++i]; lastFlagConsumed = true; break;
            case '--format': case '-f':
                options.format = args[++i]; lastFlagConsumed = true; break;
            case '--output': case '-o':
                options.outputPath = args[++i]; lastFlagConsumed = true; break;
            case '--template':
                options.templatePath = args[++i]; lastFlagConsumed = true; break;
            case '--xlsx-template':
                options.xlsxTemplate = args[++i]; lastFlagConsumed = true; break;
            case '--test-source':
                options.testSource = args[++i]; lastFlagConsumed = true; break;
            case '--test-cases':
                options.testCasesPath = args[++i]; lastFlagConsumed = true; break;
            case '--md-files':
                options.mdFiles = []; lastFlagConsumed = true;
                while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                    options.mdFiles.push(args[++i]);
                }
                break;
            case '--json-files':
                options.jsonFiles = []; lastFlagConsumed = true;
                while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                    options.jsonFiles.push(args[++i]);
                }
                break;
            case '--mode':
                options.mode = args[++i]; lastFlagConsumed = true; break;
            case '--excel-doc-type':
                options.excelDocType = args[++i]; lastFlagConsumed = true; break;
            case '--requirement': case '-r':
                options.requirementPath = args[++i]; lastFlagConsumed = true; break;
            case '--requirement-md': case '--requirementMD':
                options.requirementMd = args[++i]; lastFlagConsumed = true; break;
            case '--root': case '--project-root':
                options.projectRoot = args[++i]; lastFlagConsumed = true; break;
            case '--config': case '-c':
                options.configPath = args[++i]; lastFlagConsumed = true; break;
            case '--profile': case '-p':
                options.profilePath = args[++i]; lastFlagConsumed = true; break;
            case '--visualization': case '-v':
                options.visualization = true; lastFlagConsumed = false; break;
            case '--json':
                options.jsonOutput = true; lastFlagConsumed = false; break;
            case '--list':
                options.listModules = true; lastFlagConsumed = false; break;
            case '--no-overwrite':
                options.noOverwrite = true; lastFlagConsumed = false; break;
            // 2026-06-03 新增：扫描缓存与分离模式
            case '--use-scan-cache':
                options.useScanCache = true; lastFlagConsumed = false; break;
            case '--scan-only':
                options.scanOnly = true; lastFlagConsumed = false; break;
            case '--from-scan':
                options.fromScan = args[++i]; lastFlagConsumed = true; break;
            case '--no-scan':
                options.noScan = true; lastFlagConsumed = false; break;
            // 2026-06-07 v8.0 新增：外部 SEMANTIC_RULES 注入
            case '--semantic-map':
                options.semanticMap = args[++i]; break;
            // 2026-06-08 v9.0 新增：银行级配置加载
            case '--bank':
                options.bankCode = args[++i]; lastFlagConsumed = true; break;
            // 2026-06-08 v9.0 新增：测试类名过滤（逗号分隔）
            case '--test-filter':
                options.testFilter = args[++i] ? args[i].split(',').map(s => s.trim()).filter(Boolean) : []; lastFlagConsumed = true; break;
            // 2026-06-07 新增：直接传入 design_data JSON 路径（跳过 RequirementAnalyzer）
            case '--design-data':
                options.designDataPath = args[++i]; lastFlagConsumed = true; break;
            // 2026-06-07 新增：显式设置保留模式（保留模板正文，仅替换封面）
            case '--preserve':
                options.preserveTemplate = true; break;
            // 2026-06-02 新增：模板驱动文档生成参数
            case '--keep-template-toc':
                options.keepTemplateToc = true; break;
            case '--cover-placeholders':
                // 格式: "XXX信息系统/项目=项目名称;XXX=..."
                options.coverPlaceholders = parsePlaceholderMap(args[++i]); break;
            case '--no-update-fields':
                options.updateFields = false; break;
            case '--no-antv':
                options.useAntV = false; break;
            case '--uml-engine':
                options.umlEngine = args[++i]; lastFlagConsumed = true; break;
            // 2026-07-02 新增：显式指定输出根目录（启用后允许非 PROJECT_ROOT/output 路径）
            case '--output-root':
                options.outputRoot = args[++i]; lastFlagConsumed = true;
                process.env.BEMP_OUTPUT_DIR = path.resolve(options.outputRoot);
                console.log(`  [output-root] 已显式指定输出根目录: ${process.env.BEMP_OUTPUT_DIR}`);
                break;
            case '--help': case '-h':
                printHelp(); process.exit(0);
            default:
                if (!arg.startsWith('-') && !lastFlagConsumed) options.module = arg;
                lastFlagConsumed = false;
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
    if (options.type === 'unit-test-report-xlsx') {
        options.format = 'xlsx';
    }
    if (options.type === 'excel-custom') {
        options.format = 'excel-custom';
    }

    return options;
}

function printHelp() {
    console.log(`
文档生成器

用法: node cli.js [选项]

选项:
  -t, --type <类型>        文档类型: design|testcase|testreport|outline-design|unit-test-report|excel-custom (默认: design)
  -m, --module <模块>      模块名称
  -f, --format <格式>      输出格式: docx|md|excel (默认: docx)
  -o, --output <路径>      输出文件路径
  -r, --requirement <路径> 需求文档路径 (用于testcase类型)
  --root <路径>           项目根路径（用于代码扫描）
  --template <路径>        模板文件路径
  -c, --config <路径>      配置文件路径
  -p, --profile <路径>     业务模块配置文件路径（JSON）
  --json                   JSON结构化输出（含自动验证结果）
  --list                   列出所有可用模块Profile
  --no-overwrite           已存在文件跳过生成，不覆盖
  -v, --visualization      生成可视化文档
  --keep-template-toc      保留模板自带的动态TOC域（需配合 --template）
  --cover-placeholders <map> 封面占位文字替换，格式 "占位1=值1;占位2=值2"
  --no-update-fields       禁止自动注入 updateFields=true（默认注入）
  --no-antv                禁用 AntV 引擎，强制走 matplotlib（用于离线环境）
  --uml-engine <引擎>      UML图表引擎: graphviz(默认,生成5种专业图)/ mermaid(旧版兼容)
  --output-root <路径>     2026-07-02 新增：显式指定输出根目录(需配合 --output 使用,允许非项目根 output 路径)
  --xlsx-template <路径>   xlsx模板文件路径（unit-test-report-xlsx 类型必填）
  --test-source <路径>     Java测试代码目录（unit 模式必填）
  --test-cases <路径>      功能测试用例MD文件路径（functional 模式必填）
  --mode <模式>            xlsx报告模式: unit|functional（默认根据参数自动推断）
  --bank <银行代码>        银行级配置代码（如 <银行代码>），自动加载 testSource/template/filter
  --test-filter <关键词>   测试类名过滤（逗号分隔），仅扫描类名包含关键词的测试类
  --excel-doc-type <类型>  excel-custom子类型: test-case-custom|unit-test-report-custom (默认: test-case-custom)
  --md-files <路径...>     MD数据源文件（excel-custom类型，支持多个）
  --json-files <路径...>   JSON数据源文件（excel-custom类型，支持多个）
  -h, --help               显示帮助信息

示例:
  node cli.js -t design -m "模块名称"
  node cli.js -t testcase -f excel -r "需求.md" -m "模块名称"
  node cli.js -t testcase -f excel -r "需求.md" -m "模块名称" --json
  node cli.js -t testreport -m "模块名称"
  node cli.js -t outline-design -m "项目名称" -r "项目根目录"
  node cli.js -t outline-design -m "项目名称" -r "项目根目录" --template "模板.docx" --json
  node cli.js -t unit-test-report -m "项目名称"
  node cli.js -t unit-test-report-xlsx -m "模块名称" --xlsx-template "模板.xlsx" --test-cases "用例.md" --mode functional --json
  node cli.js -t unit-test-report-xlsx -m "模块名称" --bank <银行代码> --json
  node cli.js -t unit-test-report-xlsx -m "模块名称" --bank <银行代码> --test-filter "ClassNameA,ClassNameB" --json
  node cli.js -t excel-custom --excel-doc-type test-case-custom --md-files "用例1.md" "用例2.md" -m "模块名称" --json
  node cli.js -t excel-custom --excel-doc-type unit-test-report-custom --json-files "结果.json" -m "模块名称"
  node cli.js --list
`);
}

async function generateDocument(options) {
    const jsonMode = options.jsonOutput;
    const moduleName = options.module || '未命名模块';

    if (!VALID_TYPES.includes(options.type)) {
        throw new BempDocError(ERROR_CODES.INVALID_PARAMS, `不支持的文档类型: ${options.type}，支持: ${VALID_TYPES.join(', ')}`);
    }

    let requirementContent = null;
    if (options.requirementPath && options.type !== 'outline-design') {
        const reqPath = path.isAbsolute(options.requirementPath)
            ? options.requirementPath
            : path.resolve(process.cwd(), options.requirementPath);
        if (fs.existsSync(reqPath)) {
            requirementContent = fs.readFileSync(reqPath, 'utf-8');
        }
    }

    const { RequirementAnalyzer } = require('./lib/requirement-analyzer');
    let profile = null;
    if (options.profilePath) {
        const profilePath = path.isAbsolute(options.profilePath)
            ? options.profilePath
            : path.resolve(process.cwd(), options.profilePath);
        if (fs.existsSync(profilePath)) {
            try { profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8')); } catch (e) {
                console.warn(`  ⚠ 用户指定profile解析失败: ${profilePath} - ${e.message}`);
            }
        }
    }
    if (!profile) {
        profile = RequirementAnalyzer.loadProfile(moduleName) || {};
    }

    const CURRENT_SCHEMA = '1.0';
    if (profile._schemaVersion && profile._schemaVersion !== CURRENT_SCHEMA) {
        if (!jsonMode) {
            console.warn(`⚠ Profile schema 版本不匹配: profile=${profile._schemaVersion}, 当前=${CURRENT_SCHEMA}，可能缺少新字段`);
        }
    }
    const outputDir = profile.outputDir || paths.outputDir;

    if (options.format === 'excel') {
        const { ExcelTestCaseGenerator } = require('./lib/excel-testcase-generator');
        const excelGen = new ExcelTestCaseGenerator({
            projectRoot: paths.projectRoot
        });

        let testCasesForExcel;
        if (requirementContent) {
            const analyzer = new RequirementAnalyzer({ profile });
            const analysis = analyzer.analyzeForTestCase(requirementContent, moduleName);
            testCasesForExcel = analysis.testCases;
        }

        const excelParams = {
            moduleName,
            templatePath: options.templatePath || undefined,
            requirementPath: testCasesForExcel ? undefined : (options.requirementPath || undefined),
            testCases: testCasesForExcel || undefined,
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

    if (options.type === 'unit-test-report-xlsx' || (options.type === 'unit-test-report' && options.format === 'xlsx')) {
        const { XlsxUnitTestReportGenerator } = require('./lib/xlsx-report-generator');
        // v8.0：解析 --semantic-map（JSON 文件）→ 数组
        let semanticMap = null;
        if (options.semanticMap) {
            const { TemplateInspector } = require('./lib/xlsx-report/template-inspector');
            semanticMap = TemplateInspector.loadSemanticMap(options.semanticMap);
            if (!jsonMode) {
                console.log(`[semantic-map] 已加载 ${semanticMap.length} 条自定义规则: ${options.semanticMap}`);
            }
        }

        // v9.0：银行级配置加载（--bank 参数）
        let bankConfig = null;
        if (options.bankCode) {
            const { BankConfigLoader } = require('./lib/bank-config-loader');
            const loader = new BankConfigLoader(options.bankCode);
            bankConfig = loader.load();
            if (!jsonMode) {
                console.log(`[bank-config] 已加载银行配置: ${bankConfig.bankName} (${options.bankCode})`);
            }
        }

        // v9.0：参数优先级 —— 用户显式参数 > bankConfig > 内置默认值
        const resolvedXlsxTemplate = options.xlsxTemplate
            || (bankConfig && bankConfig.getUnitTestReportTemplate());
        const resolvedTestSource = options.testSource
            || (bankConfig && bankConfig.getTestSource(moduleName))
            || (bankConfig && bankConfig.getTestSourceBase());

        // v9.0：classFilters 优先级 —— CLI --test-filter > bankConfig.getTestFilter
        const classFilters = options.testFilter
            || (bankConfig && bankConfig.getTestFilter(moduleName))
            || null;

        if (classFilters && !jsonMode) {
            console.log(`[test-filter] 类名过滤: ${classFilters.join(', ')} (共 ${classFilters.length} 条)`);
        }

        const xlsxGen = new XlsxUnitTestReportGenerator({
            bankConfig,
            classFilters
        });
        const result = await xlsxGen.generate({
            xlsxTemplate: resolvedXlsxTemplate,
            testSource: resolvedTestSource,
            testCasesPath: options.testCasesPath,
            outputPath: options.outputPath,
            moduleName,
            requirementPath: options.requirementPath,
            project: (profile && profile.projectName) || moduleName,
            mode: options.mode,
            semanticMap
        });

        if (jsonMode) {
            return {
                success: true,
                type: options.mode === 'functional' ? 'functional-test-report-xlsx' : 'unit-test-report-xlsx',
                outputPath: result.outputPath,
                mode: result.mode,
                totalCases: result.totalCases,
                sheetNames: result.sheetNames,
                dataRange: result.dataRange,
                validation: result.validation
            };
        }

        const modeLabel = result.mode === 'functional' ? '功能测试' : '单元测试';
        const lines = [
            `✓ xlsx ${modeLabel}报告已生成: ${result.outputPath}`,
            `  模式: ${result.mode} | 用例数: ${result.totalCases}`,
            `  数据范围: ${result.dataRange.start}-${result.dataRange.end}`,
            `  Sheet 列表: ${result.sheetNames.join(', ')}`
        ];
        if (result.validation) {
            const failed = result.validation.items.filter(i => !i.pass);
            if (failed.length) lines.push(`  ⚠ 质量审核未通过: ${failed.map(f => f.name).join(', ')}`);
            else lines.push(`  ✓ 质量审核 7 项全部通过`);
        }
        return lines;
    }

    if (options.type === 'excel-custom' || options.format === 'excel-custom') {
        return await generateExcelCustom(options, jsonMode, moduleName);
    }

    const { DocumentBuilder } = require('./lib/doc-builder');
    const builder = new DocumentBuilder({ profile, outputDir });

    if (options.type === 'outline-design') {
        return await generateOutlineDesign(options, outputDir, profile, jsonMode);
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const typeLabels = { design: '详细设计文档', testcase: '测试用例', testreport: '测试报告', 'unit-test-report': '单元测试报告' };
    const typeLabel = typeLabels[options.type] || '文档';

    let templateData = null;

    // 2026-06-07 新增：--design-data 直接传入 JSON，跳过 RequirementAnalyzer
    if (options.designDataPath) {
        const resolvedPath = path.isAbsolute(options.designDataPath)
            ? options.designDataPath
            : path.resolve(process.cwd(), options.designDataPath);
        if (!fs.existsSync(resolvedPath)) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `design_data 文件不存在: ${resolvedPath}`);
        }
        templateData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
        // 若未设置 moduleName，从文件中读取或使用 --module 参数
        if (!templateData.moduleName && moduleName) {
            templateData.moduleName = moduleName;
        }
        console.log(`  [design-data] 已加载 JSON: ${resolvedPath} (chapters: ${(templateData.chapters || []).length})`);
    } else if (requirementContent && options.type === 'design') {
        const analyzer = new RequirementAnalyzer({ profile });
        templateData = analyzer.analyzeForDesign(requirementContent, moduleName);
    } else if (requirementContent && options.type === 'testcase') {
        const analyzer = new RequirementAnalyzer({ profile });
        templateData = analyzer.analyzeForTestCase(requirementContent, moduleName);
    } else if (options.templatePath) {
        // 2026-06-07 修复：仅当模板为 JSON 时才尝试解析，.docx 模板由 Python 脚本处理
        if (options.templatePath.toLowerCase().endsWith('.docx')) {
            templateData = null;
        } else {
            templateData = loadTemplateData(options.templatePath, options.type);
        }
    } else {
        templateData = getDefaultTemplateData(options.type);
    }

    let outputPath;

    if (options.format === 'md') {
        const defaultOutput = path.join(outputDir, `${moduleName}-${typeLabel}-${date}.md`);
        outputPath = options.outputPath || defaultOutput;
        if (options.noOverwrite && fs.existsSync(outputPath)) {
            return [`⊘ 跳过(已存在): ${outputPath}`];
        }
        builder.generateMarkdown(moduleName, outputPath, options.type, templateData);
    } else {
        const defaultOutput = path.join(outputDir, `${moduleName}-${typeLabel}-${date}.docx`);
        outputPath = options.outputPath || defaultOutput;
        if (options.noOverwrite && fs.existsSync(outputPath)) {
            return [`⊘ 跳过(已存在): ${outputPath}`];
        }

        switch (options.type) {
            case 'design':
                // v9.1：统一加载银行配置，供整个 design 分支复用
                let designBankConfig = null;
                if (options.bankCode) {
                    try {
                        const { BankConfigLoader } = require('./lib/bank-config-loader');
                        const loader = new BankConfigLoader(options.bankCode);
                        designBankConfig = loader.load();
                        console.log(`  [bank-config] 已加载银行配置: ${designBankConfig.bankName} (${options.bankCode})`);
                    } catch (e) {
                        console.warn(`  ⚠ 银行配置加载失败: ${e.message}`);
                    }
                }

                // 当传入 .docx 模板时，使用 python-docx 模板填充模式
                // 2026-06-07 优化：未显式指定 --template 时，优先回退到 docs/07 标准模板，
                // 避免错误地命中内置"差异化需求"模板导致样式丢失
                // v9.0：--bank 配置中的设计模板也参与回退链
                if (!options.templatePath) {
                    // 优先使用银行配置中的设计模板
                    if (designBankConfig) {
                        const bankTpl = designBankConfig.getDesignTemplate();
                        if (bankTpl && fs.existsSync(bankTpl)) {
                            options.templatePath = bankTpl;
                            console.log(`  [bank-config] 使用银行设计模板: ${bankTpl}`);
                        }
                    }
                    // 银行配置无模板或未指定 --bank，使用默认模板
                    if (!options.templatePath) {
                        const fallbackTpl = paths.designTemplate;
                        if (fallbackTpl && fs.existsSync(fallbackTpl)) {
                            options.templatePath = fallbackTpl;
                            console.log(`  [default-template] 未指定 --template，使用默认: ${fallbackTpl}`);
                        }
                    }
                }
                // v9.0：银行配置自动注入 coverPlaceholders（用户未显式指定时）
                if ((!options.coverPlaceholders || Object.keys(options.coverPlaceholders).length === 0) && designBankConfig) {
                    const bankPlaceholders = designBankConfig.getCoverPlaceholdersString();
                    if (bankPlaceholders) {
                        options.coverPlaceholders = parsePlaceholderMap(bankPlaceholders);
                        console.log(`  [bank-config] 已注入银行封面占位替换: ${Object.keys(options.coverPlaceholders).length} 项`);
                    }
                }
                if (options.templatePath && options.templatePath.toLowerCase().endsWith('.docx')) {
                    const { execFileSync: execDesignPy } = require('child_process');
                    const designDataPath = path.join(outputDir, `_design-data-${date}.json`);
                    let designData = templateData || builder._getDefaultTemplateData(moduleName, 'design');
                    // 2026-06-07 修复：注入 moduleName 到顶层，让 _render_template 占位符替换生效
                    // 设计原则：通用化（不硬编码具体字段），仅补全 CLI 显式传入的上下文
                    if (moduleName && !designData.moduleName) {
                        designData = { ...designData, moduleName };
                    }
                    // 2026-06-07 新增：--preserve 标志注入到 design_data，传递保留模式到 Python 生成器
                    if (options.preserveTemplate) {
                        designData._preserve = true;
                    }
                    // v9.1 新增：注入源代码路径到 design_data，使 Python 生成器能扫描实际代码填充"代码示例"
                    // 优先级：--test-source > designBankConfig testSource
                    const resolvedSourceDir = options.testSource
                        || (designBankConfig && designBankConfig.getTestSource(moduleName))
                        || (designBankConfig && designBankConfig.getTestSourceBase());
                    if (resolvedSourceDir && fs.existsSync(resolvedSourceDir)) {
                        designData.sourceDir = resolvedSourceDir;
                        console.log(`  [source-dir] 已注入源代码路径: ${resolvedSourceDir}`);
                    }
                    fs.writeFileSync(designDataPath, JSON.stringify(designData, null, 2), 'utf-8');
                    const designScript = path.join(paths.scriptsDir, 'design-generator.py');
                    const resolvedTemplate = path.isAbsolute(options.templatePath) ? options.templatePath : path.resolve(process.cwd(), options.templatePath);

                    // 图表生成管线：为详细设计生成架构图/网络图/部署图
                    // v9.1 修复：diagramDir 按需求名隔离，避免多需求共用同一套图
                    let diagramDir = null;
                    try {
                        const { DiagramService } = require('./lib/diagram-service');
                        // 详细设计不需要完整代码扫描，从需求文档推断基本系统结构
                        const lightScanData = {
                            projectName: moduleName,
                            modules: [],
                            interfaces: [],
                            subsystems: [{ name: moduleName, components: [] }],
                            techStack: ['Spring Boot', 'MyBatis', 'Vue.js'],
                        };
                        const diagramService = new DiagramService({
                            outputDir: path.join(outputDir, 'diagrams', moduleName),
                            projectName: moduleName,
                            useAntV: options.useAntV !== false,
                            fallbackToMatplotlib: true,
                        });
                        const diagramResult = await diagramService.generateAll(lightScanData);
                        diagramDir = diagramService.getDiagramDir();
                        const successCount = diagramResult.results.filter(r => r.success).length;
                        console.log(`  详细设计图表生成: ${successCount}/${diagramResult.results.length} 成功 | 目录: ${diagramDir}`);
                    } catch (diagErr) {
                        console.warn(`  ⚠ 详细设计图表生成失败: ${diagErr.message}，文档将不含图表`);
                        diagramDir = null;
                    }

                    // 2026-06-04/06 升级：UML 图表生成 - 默认走 Graphviz 引擎
                    // 5 种专业图表：类图/顺序图/活动图/业务流程图/时序图
                    // 引擎选择：--uml-engine graphviz（默认，高质量）/ mermaid（旧版兼容）
                    let umlDir = null;
                    try {
                        const umlEngine = options.umlEngine || 'graphviz';
                        if (umlEngine === 'graphviz') {
                            const { EnhancedUmlService } = require('./lib/enhanced-uml-service');
                            const umlService = new EnhancedUmlService({
                                outputDir: path.join(outputDir, 'diagrams', moduleName, 'uml'),
                                projectName: moduleName,
                                fallbackToPython: true,
                            });
                            // 2026-06-06：优先使用需求文档（--requirement / -r）生成需求驱动的5图
                            let requirementText = null;
                            const reqPath = options.requirementPath || options.requirementMd;
                            if (reqPath && fs.existsSync(reqPath)) {
                                requirementText = fs.readFileSync(reqPath, 'utf-8');
                            } else if (templateData && templateData._rawRequirement) {
                                requirementText = templateData._rawRequirement;
                            }
                            if (requirementText) {
                                // 需求驱动模式
                                const umlResult = await umlService.generateFromRequirement(requirementText);
                                const pngCount = (umlResult.classDiagram && umlResult.classDiagram.png && umlResult.classDiagram.png.success ? 1 : 0)
                                    + umlResult.sequenceDiagrams.filter(s => s.png && s.png.success).length
                                    + umlResult.activityDiagrams.filter(a => a.png && a.png.success).length
                                    + umlResult.businessFlows.filter(b => b.png && b.png.success).length
                                    + umlResult.timingDiagrams.filter(t => t.png && t.png.success).length;
                                const total = 1 + umlResult.sequenceDiagrams.length + umlResult.activityDiagrams.length
                                    + umlResult.businessFlows.length + umlResult.timingDiagrams.length;
                                umlDir = umlService.getOutputDir();
                                console.log(`  UML 图表(Graphviz/需求驱动): ${pngCount}/${total} 成功 | 类图×1+顺序图×${umlResult.sequenceDiagrams.length}+活动图×${umlResult.activityDiagrams.length}+流程图×${umlResult.businessFlows.length}+时序图×${umlResult.timingDiagrams.length} | 目录: ${umlDir}`);
                            } else {
                                // 兼容模式：从 scanData 走旧版 generateAll
                                const lightScanDataForUml = {
                                    projectName: moduleName,
                                    modules: (templateData && Array.isArray(templateData.modules)) ? templateData.modules : [],
                                    businessSubsystems: (templateData && Array.isArray(templateData.businessSubsystems)) ? templateData.businessSubsystems : [],
                                    dependencies: (templateData && Array.isArray(templateData.dependencies)) ? templateData.dependencies : [],
                                };
                                // 用 Graphviz 风格但保留旧 generateAll 行为
                                const oldGen = require('./lib/uml-generator');
                                const oldUmlGen = new oldGen.UmlGenerator({ outputDir: path.join(outputDir, 'diagrams', moduleName, 'uml'), projectName: moduleName, useAntV: false, fallbackToMatplotlib: false });
                                const oldResult = await oldUmlGen.generateAll(lightScanDataForUml);
                                umlDir = oldUmlGen.getUmlDir();
                                const ok = oldResult.results.filter(r => r.png && r.png.success).length;
                                console.log(`  UML 图表(Graphviz/旧数据): ${ok}/${oldResult.results.length} 成功 | 目录: ${umlDir}`);
                            }
                        } else {
                            // mermaid 旧版兼容
                            const { UmlGenerator } = require('./lib/uml-generator');
                            const umlGen = new UmlGenerator({
                                outputDir: path.join(outputDir, 'diagrams', moduleName, 'uml'),
                                projectName: moduleName,
                                useAntV: options.useAntV !== false,
                                fallbackToMatplotlib: true,
                            });
                            const lightScanDataForUml = {
                                projectName: moduleName,
                                modules: (templateData && Array.isArray(templateData.modules)) ? templateData.modules : [],
                                businessSubsystems: (templateData && Array.isArray(templateData.businessSubsystems)) ? templateData.businessSubsystems : [],
                                dependencies: (templateData && Array.isArray(templateData.dependencies)) ? templateData.dependencies : [],
                            };
                            const umlResult = await umlGen.generateAll(lightScanDataForUml);
                            umlDir = umlGen.getUmlDir();
                            const umlSuccess = umlResult.results.filter(r => r.png && r.png.success).length;
                            console.log(`  UML 图表(Mermaid): ${umlSuccess}/${umlResult.results.length} 成功 | 目录: ${umlDir}`);
                        }
                    } catch (umlErr) {
                        console.warn(`  ⚠ UML 图表生成失败: ${umlErr.message}`);
                        umlDir = null;
                    }

                    // 合并 diagramDir：包含 architecture/network/deployment 与 uml 子目录
                    // 将 UML 图表 PNG 复制到 diagramDir，使 Python 脚本可在同一目录找到所有图表
                    if (umlDir && diagramDir) {
                        try {
                            const umlPngs = fs.readdirSync(umlDir).filter(f => f.toLowerCase().endsWith('.png'));
                            for (const png of umlPngs) {
                                const src = path.join(umlDir, png);
                                const dst = path.join(diagramDir, png);
                                if (!fs.existsSync(dst)) {
                                    fs.copyFileSync(src, dst);
                                }
                            }
                            if (umlPngs.length > 0) {
                                console.log(`  UML 图表已合并到图表目录: ${umlPngs.length} 个文件`);
                            }
                        } catch (copyErr) {
                            console.warn(`  ⚠ UML 图表合并失败: ${copyErr.message}`);
                        }
                    }
                    // 如果只有 UML 目录没有架构图目录，使用 UML 目录
                    const effectiveDiagramDir = diagramDir || umlDir;
                    // 可选：把 umlDir 写入中间 JSON 供 Python 脚本读取（如未来扩展）
                    if (umlDir) {
                        try {
                            const umlInfoPath = path.join(outputDir, `_uml-info-${date}.json`);
                            fs.writeFileSync(umlInfoPath, JSON.stringify({ umlDir }, null, 2), 'utf-8');
                        } catch (_) { /* 非关键路径 */ }
                    }

                    try {
                        const pyArgs = [designScript, resolvedTemplate, designDataPath, outputPath];
                        // 将图表目录作为第4个参数传递给 Python 脚本
                        if (effectiveDiagramDir) {
                            pyArgs.push(effectiveDiagramDir);
                        }
                        const pyResult = execDesignPy('python', pyArgs, {
                            encoding: 'utf-8',
                            maxBuffer: 10 * 1024 * 1024,
                            cwd: paths.scriptsDir,
                        });
                        const parsed = JSON.parse(pyResult.trim());
                        if (!parsed.success) throw new Error('design-generator.py returned failure');
                        console.log(`  ✓ 详细设计文档（模板填充模式）生成完成: ${outputPath}`);
                    } catch (pyErr) {
                        console.warn(`  ⚠ 模板填充模式失败(${pyErr.message})，回退到内置模板生成`);
                        await builder.generateDesignDocument(moduleName, outputPath, templateData);
                    }
                } else {
                    await builder.generateDesignDocument(moduleName, outputPath, templateData);
                }
                break;
            case 'testcase':
                await builder.generateTestCaseDocument(moduleName, outputPath, templateData);
                break;
            case 'testreport':
                await builder.generateTestReportDocument(moduleName, outputPath, templateData);
                break;
            case 'unit-test-report':
                await builder.generateUnitTestReportDocument(moduleName, outputPath, templateData);
                break;
            case 'srs':
                // 需求规格说明书：JSON 模板填充模式
                // 1) --template 指向 .docx：调用 Python design-generator.py 模板填充模式
                // 2) --template 指向 .json：直接使用 templateData 渲染（docx 库）
                // 3) 未指定 --template：回退到 defaultTemplateMap['srs']（.json）
                let srsTemplatePath = options.templatePath;
                if (srsTemplatePath && srsTemplatePath.toLowerCase().endsWith('.docx')) {
                    // .docx 模板：复用 design 分支的 Python 脚本填充模式
                    const { execFileSync: execSrsPy } = require('child_process');
                    const srsDataPath = path.join(outputDir, `_srs-data-${date}.json`);
                    let srsData = templateData || builder._getDefaultTemplateData(moduleName, 'srs');
                    if (moduleName && !srsData.moduleName) {
                        srsData = { ...srsData, moduleName };
                    }
                    fs.writeFileSync(srsDataPath, JSON.stringify(srsData, null, 2), 'utf-8');
                    const resolvedTemplate = path.isAbsolute(srsTemplatePath) ? srsTemplatePath : path.resolve(process.cwd(), srsTemplatePath);
                    console.log(`  [srs] 使用 .docx 模板: ${resolvedTemplate}`);
                } else {
                    // JSON 模板或无模板：使用 docx 库直接生成
                    // 当 --design-data 显式传入时，templateData 已加载；否则回退 defaultTemplateMap
                    if (!templateData) {
                        templateData = builder._getDefaultTemplateData(moduleName, 'srs');
                    }
                    console.log(`  [srs] 使用 JSON 模板数据渲染（chapters: ${(templateData && templateData.chapters || []).length}）`);
                    await builder.generateDesignDocument(moduleName, outputPath, templateData);
                }
                break;
        }
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
            vizResult = { error: vizError.message };
        }
    }

    // 2026-07-02 优化：校验 outputPath 必须在 PROJECT_ROOT/output 下
    // 例外：--output-root 显式指定时放行
    try {
        pathsLite.validateOutputPath(outputPath, { explicitRoot: !!options.outputRoot });
    } catch (e) {
        if (e.code === 'OUTPUT_PATH_INVALID') {
            throw new BempDocError(ERROR_CODES.OUTPUT_PATH_INVALID, e.message, { allowedRoot: e.allowedRoot, actualPath: e.actualPath });
        }
        throw e;
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

/**
 * 从业务模块数据中提取 UML 类图所需的实体信息。
 * 将需求文档中的业务模块转换为类图可用的 {name, attributes, methods} 结构。
 * @param {Array} businessModules - 从需求文档解析的业务模块列表
 * @param {string} moduleName - 模块名称（用于兜底）
 * @returns {Array<{name, attributes, methods}>}
 */
function _extractUmlModules(businessModules, moduleName) {
    const modules = [];
    if (!businessModules || businessModules.length === 0) {
        // 兜底：从模块名生成一个基础实体
        modules.push({
            name: moduleName || 'BusinessEntity',
            attributes: [
                { name: 'id', type: 'Long' },
                { name: 'status', type: 'String' },
                { name: 'createTime', type: 'Date' },
            ],
            methods: [
                { name: 'query', returnType: 'List', params: [{ name: 'condition', type: 'Object' }] },
                { name: 'save', returnType: 'void', params: [{ name: 'entity', type: 'Object' }] },
            ],
        });
        return modules;
    }
    for (const bm of businessModules) {
        const name = bm.name || bm.title || '';
        if (!name) continue;
        const attrs = [];
        const methods = [];
        // 从子节中提取字段作为属性
        const subsections = bm.subsections || [];
        for (const sub of subsections) {
            const subName = (sub.name || sub.title || '').trim();
            if (['查询', '新增', '修改', '删除'].includes(subName)) {
                methods.push({ name: subName, returnType: 'void', params: [] });
            }
            // 从栏位描述中提取字段
            const fields = sub.fields || [];
            for (const field of fields) {
                const fieldName = field.name || field.dataName || '';
                if (fieldName && !attrs.find(a => a.name === fieldName)) {
                    attrs.push({ name: fieldName, type: field.type || 'String' });
                }
            }
        }
        // 确保至少有基本属性
        if (attrs.length === 0) {
            attrs.push({ name: 'id', type: 'Long' });
            attrs.push({ name: 'status', type: 'String' });
        }
        if (methods.length === 0) {
            methods.push({ name: 'query', returnType: 'List', params: [] });
        }
        modules.push({
            name: name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, ''),
            attributes: attrs.slice(0, 15),
            methods: methods.slice(0, 10),
        });
    }
    return modules;
}

async function generateOutlineDesign(options, outputDir, profile, jsonMode) {
    const { execFileSync } = require('child_process');
    const { ProjectScanner } = require('./lib/project-scanner');

    // v9.0：银行级配置加载（--bank 参数），自动注入 coverPlaceholders/template 等
    let bankConfig = null;
    if (options.bankCode) {
        const { BankConfigLoader } = require('./lib/bank-config-loader');
        const loader = new BankConfigLoader(options.bankCode);
        bankConfig = loader.load();
        console.log(`[bank-config] 已加载银行配置: ${bankConfig.bankName} (${options.bankCode})`);
        // 银行配置中的 coverPlaceholders 合并到用户参数（用户显式参数优先）
        if (!options.coverPlaceholders || Object.keys(options.coverPlaceholders).length === 0) {
            const bankPlaceholders = bankConfig.getCoverPlaceholdersString();
            if (bankPlaceholders) {
                options.coverPlaceholders = parsePlaceholderMap(bankPlaceholders);
                console.log(`[bank-config] 已注入银行封面占位替换: ${Object.keys(options.coverPlaceholders).length} 项`);
            }
        }
        // 银行配置中的概要设计模板（用户未指定时使用）
        if (!options.templatePath && bankConfig.getOutlineDesignTemplate()) {
            options.templatePath = bankConfig.getOutlineDesignTemplate();
            console.log(`[bank-config] 已注入银行概要设计模板: ${options.templatePath}`);
        }
    }

    // 2026-06-02 新增：模板驱动参数透传给Python脚本
    if (options.coverPlaceholders && Object.keys(options.coverPlaceholders).length > 0) {
        process.env.BEMP_COVER_PLACEHOLDERS = JSON.stringify(options.coverPlaceholders);
        console.log(`  [cover-placeholders] 已设置 ${Object.keys(options.coverPlaceholders).length} 个占位文字替换`);
    } else {
        process.env.BEMP_COVER_PLACEHOLDERS = '';
    }
    process.env.BEMP_KEEP_TEMPLATE_TOC = options.keepTemplateToc ? 'true' : 'false';
    process.env.BEMP_UPDATE_FIELDS = options.updateFields ? 'true' : 'false';
    if (options.keepTemplateToc) {
        console.log('  [keep-template-toc] 已开启：保留模板原版动态TOC域');
    }
    if (options.updateFields) {
        console.log('  [update-fields] 已开启：自动注入 updateFields=true（Word打开时自动更新域）');
    }

    const projectRoot = options.projectRoot || options.requirementPath || process.cwd();
    const resolvedRoot = path.isAbsolute(projectRoot) ? projectRoot : path.resolve(process.cwd(), projectRoot);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const scanDataPath = path.join(outputDir, '_scan-data.json');
    const cacheKeyPath = path.join(outputDir, '_scan-data.cache');

    // 2026-06-03 优化：构建缓存键 = projectRoot + requirement-md(mtime+size) + projectRoot-mtime
    function buildCacheKey() {
        const parts = [resolvedRoot];
        const reqMd = options.requirementMd || options.requirementMD || '';
        if (reqMd) {
            const absReq = path.isAbsolute(reqMd) ? reqMd : path.resolve(process.cwd(), reqMd);
            if (fs.existsSync(absReq)) {
                const st = fs.statSync(absReq);
                parts.push(`${absReq}#${st.mtimeMs}#${st.size}`);
            } else {
                parts.push(`${absReq}#missing`);
            }
        }
        // projectRoot 自身的 mtime（代码变更时变化）
        try {
            const pomSt = fs.statSync(path.join(resolvedRoot, 'pom.xml'));
            parts.push(`pom.xml#${pomSt.mtimeMs}#${pomSt.size}`);
        } catch (e) {}
        return parts.join('|');
    }

    // 2026-06-03 优化：扫描缓存命中检测
    function tryLoadFromCache() {
        if (!options.useScanCache && !options.fromScan) return null;
        const targetPath = options.fromScan || scanDataPath;
        if (!fs.existsSync(targetPath)) return null;
        // 验证缓存键
        const currentKey = buildCacheKey();
        let storedKey = null;
        const keyPath = options.fromScan ? targetPath + '.cache' : cacheKeyPath;
        if (fs.existsSync(keyPath)) {
            try { storedKey = fs.readFileSync(keyPath, 'utf-8').trim(); } catch (e) {}
        }
        if (storedKey === currentKey) {
            console.log(`  [cache] 命中: ${targetPath} (跳过扫描)`);
            return JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        } else if (options.fromScan) {
            // --from-scan 强制读取，不做缓存键校验
            console.log(`  [from-scan] 加载: ${targetPath}`);
            return JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        } else if (options.useScanCache) {
            console.log(`  [cache] 缓存失效（代码或需求变更），将重新扫描`);
        }
        return null;
    }

    let scanData = tryLoadFromCache();
    if (scanData) {
        console.log(`  扫描数据已加载: ${scanData.modules ? scanData.modules.length : 0}个模块, ${(scanData.interfaces || []).length}个接口, ${(scanData.subsystems || []).length}个子系统`);
    } else if (!options.noScan) {
        console.log('  [1/7] 扫描项目结构...');
        const scanner = new ProjectScanner(resolvedRoot);
        scanData = scanner.scan();
        fs.writeFileSync(scanDataPath, JSON.stringify(scanData, null, 2), 'utf-8');
        // 写入缓存键
        try { fs.writeFileSync(cacheKeyPath, buildCacheKey(), 'utf-8'); } catch (e) {}
        console.log(`  扫描完成: ${scanData.modules.length}个模块, ${scanData.interfaces.length}个接口, ${scanData.subsystems.length}个子系统`);
    } else {
        throw new BempDocError(ERROR_CODES.INVALID_PARAMS, '未找到可用的扫描数据，请先执行 --scan-only 或 --from-scan <path>');
    }

    // 2026-06-03 优化：--scan-only 模式只扫描，输出 scan_data.json 后立即退出
    if (options.scanOnly) {
        console.log(`  [scan-only] 仅扫描模式，scan数据已写入: ${scanDataPath}`);
        return [`✓ 扫描完成: ${scanDataPath} (${fs.statSync(scanDataPath).size} bytes)`];
    }

    // 2026-06-03 新增：解析需求文档，提取业务子模块并合并到扫描数据
    if (options.requirementMd || options.requirementMD) {
        const reqMdPath = path.isAbsolute(options.requirementMd || options.requirementMD)
            ? (options.requirementMd || options.requirementMD)
            : path.resolve(process.cwd(), options.requirementMd || options.requirementMD);
        if (fs.existsSync(reqMdPath)) {
            console.log(`  [1.5/7] 解析需求文档提取业务子模块: ${reqMdPath}`);
            const parserScript = path.join(paths.scriptsDir, 'requirement_md_parser.py');
            // 从 profile 注入模块识别关键字
            const profileKw = (profile && profile.moduleKeywords) ? JSON.stringify(profile.moduleKeywords) : '';
            const parserArgs = [parserScript, reqMdPath, scanDataPath, scanDataPath];
            if (profileKw) parserArgs.push(profileKw);
            try {
                const reqResult = execFileSync('python', parserArgs, {
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024,
                    cwd: paths.skillRoot,
                });
                const reqData = JSON.parse(reqResult.trim());
                if (reqData.success) {
                    // 重新读取合并后的扫描数据
                    const mergedData = JSON.parse(fs.readFileSync(scanDataPath, 'utf-8'));
                    console.log(`  业务子模块提取完成: ${reqData.businessModulesCount}个子模块, ${reqData.globalRulesCount}条全局规则`);
                    Object.assign(scanData, mergedData);
                } else {
                    console.warn(`  ⚠ 需求解析失败: ${reqData.error}`);
                }
            } catch (reqErr) {
                console.warn(`  ⚠ 需求解析脚本执行失败: ${reqErr.message}`);
            }
        } else {
            console.warn(`  ⚠ 需求文档不存在: ${reqMdPath}`);
        }
    }

    const defaultTemplate = paths.outlineDesignTemplate;
    let templatePath;
    if (options.templatePath) {
        const userTemplate = path.isAbsolute(options.templatePath) ? options.templatePath : path.resolve(process.cwd(), options.templatePath);
        if (fs.existsSync(userTemplate)) {
            templatePath = userTemplate;
        } else {
            console.warn(`  ⚠ 用户指定模板不存在: ${userTemplate}，回退使用默认模板`);
            templatePath = defaultTemplate;
        }
    } else {
        templatePath = defaultTemplate;
    }
    if (!fs.existsSync(templatePath)) {
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `概要设计模板不存在: ${templatePath}`);
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const moduleName = options.module || scanData.projectName || '未命名项目';
    const outputPath = options.outputPath || path.join(outputDir, `${moduleName}-概要设计说明书-${date}.docx`);
    if (options.noOverwrite && fs.existsSync(outputPath)) {
        return [`⊘ 跳过(已存在): ${outputPath}`];
    }

    console.log('  [2/7] 生成ER关系图...');
    let erResults = [];
    let erDataPath = null;
    let erPngPaths = [];
    const dbSchema = scanData.dbSchema;
    if (dbSchema && dbSchema.tables && dbSchema.tables.length > 0) {
        try {
            const { ERDiagramGenerator } = require('./lib/er-diagram-generator');
            // ER图过滤关键字：仅从 profile.erFilterKeywords 读取（英文表前缀/表名关键字）
            // 中文模块名无法匹配英文表名，因此不再从模块名自动提取
            const profileKeywords = (profile && profile.erFilterKeywords && profile.erFilterKeywords.length > 0)
                ? profile.erFilterKeywords : null;
            const erGenOpts = { outputDir };
            if (profileKeywords) {
                erGenOpts.relevantTableKeywords = profileKeywords;
            }
            // 从 profile 传入银行个性化表前缀
            if (profile && profile.bankTablePrefixes && profile.bankTablePrefixes.length > 0) {
                erGenOpts.bankTablePrefixes = profile.bankTablePrefixes;
            }
            // 无过滤关键字时生成全部ER图分组
            const erGen = new ERDiagramGenerator(erGenOpts);
            erResults = erGen.generateFromSchema(dbSchema);
            console.log(`  ER图生成完成: ${erResults.length}个分组`);
            for (const er of erResults) {
                console.log(`    - ${er.label}: ${er.tableCount}个表 -> ${er.mmdPath}`);
            }
            erDataPath = path.join(outputDir, '_er-diagrams.json');
            fs.writeFileSync(erDataPath, JSON.stringify(erResults.map(er => ({
                groupName: er.groupName,
                label: er.label,
                tableCount: er.tableCount,
                tables: er.tables || [],
                mermaidCode: er.mermaidCode,
                mmdPath: er.mmdPath,
                htmlPath: er.htmlPath,
            })), null, 2), 'utf-8');
        } catch (erError) {
            console.warn(`  ⚠ ER图生成失败: ${erError.message}`);
        }
    } else {
        console.log('  未检测到数据库表结构，跳过ER图生成');
    }

    console.log('  [3/7] 渲染ER关系图为PNG...');
    if (erDataPath && fs.existsSync(erDataPath)) {
        try {
            const erRendererScript = path.join(paths.scriptsDir, 'er-diagram-renderer.py');
            const erPngResult = execFileSync('python', [erRendererScript, erDataPath, outputDir, moduleName], {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
                cwd: paths.skillRoot,
            });
            const erPngData = JSON.parse(erPngResult.trim());
            if (erPngData.success && erPngData.images) {
                erPngPaths = erPngData.images.map(img => img.pngPath);
                console.log(`  ER图PNG渲染完成: ${erPngPaths.length}张`);
            }
        } catch (erPngError) {
            console.warn(`  ⚠ ER图PNG渲染失败: ${erPngError.message}，将使用Mermaid代码替代`);
            erPngPaths = [];
        }
    }

    console.log('  [4/7] 生成架构图表（AntV）...');
    let diagramDir = outputDir;
    let mcpChartConfigs = [];
    let diagramEngine = 'matplotlib';
    try {
        const { DiagramService } = require('./lib/diagram-service');
        const { VisualizationGenerator } = require('./lib/visualization');
        const diagramService = new DiagramService({
            outputDir,
            projectName: scanData.projectName || '本项目',
            useAntV: options.useAntV !== false,
            fallbackToMatplotlib: true,
        });
        const diagramResult = await diagramService.generateAll(scanData);
        diagramDir = diagramService.getDiagramDir();
        diagramEngine = diagramResult.results.every((r) => r.success && !r.fallbackResolvedBy)
            ? 'AntV'
            : (diagramResult.results.find((r) => r.fallbackResolvedBy === 'matplotlib') ? 'matplotlib' : 'AntV');

        diagramResult.results.forEach((r) => {
            r.source = r.fallbackResolvedBy ? 'matplotlib' : 'AntV';
            mcpChartConfigs.push(r);
        });
        const successCount = diagramResult.results.filter((r) => r.success).length;
        const fallbackCount = diagramResult.results.filter((r) => r.fallbackResolvedBy).length;
        console.log(`  图表生成: ${successCount}/${diagramResult.results.length} 成功 (${fallbackCount > 0 ? '部分降级到matplotlib' : 'AntV完成'})`);
        console.log(`  引擎: ${diagramEngine} | 目录: ${diagramDir}`);

        const vizGen = new VisualizationGenerator();
        const mcpConfigPath = path.join(outputDir, '_mcp-chart-configs.json');
        const fullConfigs = [];
        for (const dtype of ['architecture', 'network', 'deployment']) {
            const config = vizGen.generateMcpFlowDiagramConfig(scanData.projectName || '本项目', dtype, scanData);
            const result = diagramResult.results.find((r) => r.type === dtype);
            fullConfigs.push({
                type: dtype,
                title: config.title,
                config,
                source: result?.source || 'unknown',
                localPath: result?.filePath || null,
                size: result?.size || 0,
            });
        }
        fs.writeFileSync(mcpConfigPath, JSON.stringify(fullConfigs, null, 2), 'utf-8');
    } catch (diagError) {
        console.warn(`  ⚠ AntV图表生成失败: ${diagError.message}，回退到matplotlib...`);
        try {
            const diagramScript = path.join(paths.scriptsDir, 'diagram-generator.py');
            const diagramArgs = [diagramScript, outputDir, moduleName];
            execFileSync('python', diagramArgs, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
                cwd: paths.skillRoot,
            });
            diagramEngine = 'matplotlib';
            console.log(`  图表已生成(matplotlib): ${diagramDir}`);
        } catch (pyError) {
            console.warn(`  ⚠ matplotlib也失败: ${pyError.message}`);
            diagramDir = null;
        }
    }

    const diagramGate = enforceDiagramGate(
        diagramDir || outputDir,
        path.join(outputDir, '_mcp-chart-configs.json')
    );
    if (!diagramGate.passed) {
        for (const err of diagramGate.errors) console.warn(`  ⚠ 图表门禁: ${err}`);
        const relDiagDir = path.join('output', 'diagrams');
        throw new BempDocError(
            ERROR_CODES.GENERATION_FAILED,
            `图表质量门禁未通过: ${diagramGate.errors.join('; ')}。请检查 ${relDiagDir} 目录是否生成 3 张 PNG（架构/网络/部署）。`
        );
    } else {
        console.log(`  图表门禁: 3/3 存在 (${diagramGate.summary.present.map(p => Math.round(p.size/1024) + 'KB').join(', ')})`);
    }
    for (const warn of diagramGate.warnings) console.warn(`  ⚠ ${warn}`);

    // 2026-06-05/06 升级：UML 图表生成 - 默认走 Graphviz 引擎（5种专业图）
    // 引擎选择：--uml-engine graphviz（默认，高质量）/ mermaid（旧版兼容）
    console.log('  [4.5/7] 生成 UML 图表（类图/顺序图/活动图/业务流程图/时序图）...');
    let umlDir = null;
    try {
        const umlEngine = options.umlEngine || 'graphviz';
        if (umlEngine === 'graphviz') {
            // 优先尝试需求驱动（5种图）
            let requirementText = null;
            const reqPath = options.requirementPath || options.requirementMd;
            console.log('    [uml-debug] reqPath=' + JSON.stringify(reqPath) + ' exists=' + (reqPath ? fs.existsSync(reqPath) : 'no') + ' stat=' + (reqPath && fs.existsSync(reqPath) ? (fs.statSync(reqPath).isFile() ? 'file' : (fs.statSync(reqPath).isDirectory() ? 'DIR' : '?')) : 'N/A'));
            try { fs.appendFileSync('d:/code/QJ/BEMP5.0DEV/output/uml_debug.log', '[' + new Date().toISOString() + '] reqPath=' + JSON.stringify(reqPath) + ' exists=' + (reqPath ? fs.existsSync(reqPath) : 'no') + ' stat=' + (reqPath && fs.existsSync(reqPath) ? (fs.statSync(reqPath).isFile() ? 'file' : (fs.statSync(reqPath).isDirectory() ? 'DIR' : '?')) : 'N/A') + '\n'); } catch(e){}
            if (reqPath && fs.existsSync(reqPath)) {
                try {
                    requirementText = fs.readFileSync(reqPath, 'utf-8');
                    console.log('    [uml] requirement loaded: ' + requirementText.length + ' chars');
                } catch (e) {
                    console.log('    [uml] readFile FAILED: ' + e.message);
                }
            }
            if (requirementText) {
                const { EnhancedUmlService } = require('./lib/enhanced-uml-service');
                const umlService = new EnhancedUmlService({ outputDir, projectName: moduleName, fallbackToPython: true });
                const umlResult = await umlService.generateFromRequirement(requirementText);
                umlDir = umlService.getOutputDir();
                const total = 1 + umlResult.sequenceDiagrams.length + umlResult.activityDiagrams.length + umlResult.businessFlows.length + umlResult.timingDiagrams.length;
                const ok = (umlResult.classDiagram && umlResult.classDiagram.png && umlResult.classDiagram.png.success ? 1 : 0)
                    + umlResult.sequenceDiagrams.filter(s => s.png && s.png.success).length
                    + umlResult.activityDiagrams.filter(a => a.png && a.png.success).length
                    + umlResult.businessFlows.filter(b => b.png && b.png.success).length
                    + umlResult.timingDiagrams.filter(t => t.png && t.png.success).length;
                console.log(`  UML 图表(Graphviz/需求驱动): ${ok}/${total} 成功 | 类图+顺序×${umlResult.sequenceDiagrams.length}+活动×${umlResult.activityDiagrams.length}+流程×${umlResult.businessFlows.length}+时序×${umlResult.timingDiagrams.length} | ${umlDir}`);
            } else {
                // 兼容旧版：从 scanData 提取类
                const { UmlGenerator } = require('./lib/uml-generator');
                const umlGen = new UmlGenerator({ outputDir, projectName: moduleName, useAntV: false, fallbackToMatplotlib: false });
                const businessModules = scanData.businessModules || [];
                const umlModules = _extractUmlModules(businessModules, moduleName);
                const lightScanDataForUml = {
                    projectName: moduleName,
                    modules: umlModules,
                    businessSubsystems: scanData.businessSubsystems || [],
                    dependencies: [],
                };
                const umlResult = await umlGen.generateAll(lightScanDataForUml);
                umlDir = umlGen.getUmlDir();
                const umlSuccess = umlResult.results.filter(r => r.png && r.png.success).length;
                console.log(`  UML 图表(Graphviz/数据驱动): ${umlSuccess}/${umlResult.results.length} 成功 | ${umlDir}`);
            }
        } else {
            // mermaid 旧版兼容
            const { UmlGenerator } = require('./lib/uml-generator');
            const umlGen = new UmlGenerator({ outputDir, projectName: moduleName, useAntV: options.useAntV !== false, fallbackToMatplotlib: true });
            const businessModules = scanData.businessModules || [];
            const umlModules = _extractUmlModules(businessModules, moduleName);
            const lightScanDataForUml = { projectName: moduleName, modules: umlModules, businessSubsystems: scanData.businessSubsystems || [], dependencies: [] };
            const umlResult = await umlGen.generateAll(lightScanDataForUml);
            umlDir = umlGen.getUmlDir();
            const umlSuccess = umlResult.results.filter(r => r.png && r.png.success).length;
            console.log(`  UML 图表(Mermaid/旧版): ${umlSuccess}/${umlResult.results.length} 成功 | ${umlDir}`);
        }
    } catch (umlErr) {
        console.warn(`  ⚠ UML 图表生成失败: ${umlErr.message}`);
        umlDir = null;
    }

    // 将 UML 图表 PNG 复制到 diagramDir，使 Python 脚本可在同一目录找到所有图表
    if (umlDir && diagramDir) {
        try {
            const umlPngs = fs.readdirSync(umlDir).filter(f => f.toLowerCase().endsWith('.png'));
            for (const png of umlPngs) {
                const src = path.join(umlDir, png);
                const dst = path.join(diagramDir, png);
                if (!fs.existsSync(dst)) {
                    fs.copyFileSync(src, dst);
                }
            }
            if (umlPngs.length > 0) {
                console.log(`  UML 图表已合并到图表目录: ${umlPngs.length} 个文件`);
            }
        } catch (copyErr) {
            console.warn(`  ⚠ UML 图表合并失败: ${copyErr.message}`);
        }
    }

    console.log('  [5/7] 生成概要设计文档...');
    const generatorScript = path.join(paths.scriptsDir, 'outline-design-generator.py');
    try {
        const pyArgs = [generatorScript, templatePath, scanDataPath, outputPath];
        pyArgs.push(erDataPath || '');
        pyArgs.push(diagramDir || '');
        pyArgs.push(erPngPaths.join(';') || '');
        const result = execFileSync('python', pyArgs, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            cwd: paths.skillRoot,
        });
        const genResult = JSON.parse(result.trim());
        if (!genResult.success) {
            throw new BempDocError(ERROR_CODES.GENERATION_FAILED, `概要设计文档生成失败`);
        }
    } catch (e) {
        if (e instanceof BempDocError) throw e;
        throw new BempDocError(ERROR_CODES.GENERATION_FAILED, `Python生成脚本执行失败: ${e.message}`);
    }
    console.log(`  文档已生成: ${outputPath}`);

    console.log('  [6/7] 校验图表生成结果...');
    if (mcpChartConfigs.length > 0) {
        const antvCount = mcpChartConfigs.filter((r) => r.source === 'AntV' && r.success).length;
        const pyCount = mcpChartConfigs.filter((r) => r.source === 'matplotlib' && r.success).length;
        const failCount = mcpChartConfigs.filter((r) => !r.success).length;
        console.log(`  图表统计: AntV成功 ${antvCount} 张, matplotlib降级 ${pyCount} 张, 失败 ${failCount} 张`);
        if (failCount > 0) {
            console.warn(`  ⚠ 有 ${failCount} 张图表生成失败，文档中可能缺少图片`);
        }
    } else {
        console.warn('  ⚠ 未生成任何图表');
    }

    console.log('  [7/7] 校验文档格式...');
    const validatorScript = path.join(paths.scriptsDir, 'document-validator.py');
    let validationPassed = false;
    let validationDetails = null;
    try {
        const valResult = execFileSync('python', [validatorScript, templatePath, outputPath], {
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            cwd: paths.skillRoot,
        });
        validationDetails = JSON.parse(valResult.trim());
        validationPassed = validationDetails.passed;
    } catch (e) {
        // 2026-06-03 优化：validator 进程返回非零（如有 errors）时，execFileSync 会抛错
        // 但 stdout 中通常有完整 JSON 结果，应优先解析而非当作失败
        if (e.stdout) {
            try {
                validationDetails = JSON.parse(e.stdout.toString('utf-8').trim());
                validationPassed = validationDetails.passed === true;
            } catch (parseErr) {
                validationDetails = { error: e.message, stdout: e.stdout?.toString('utf-8')?.slice(-2000) };
            }
        } else {
            validationDetails = { error: e.message };
        }
    }

    // 2026-07-02 优化：校验 outputPath 必须在 PROJECT_ROOT/output 下（在 jsonMode 之前，确保两种模式都校验）
    try {
        pathsLite.validateOutputPath(outputPath, { explicitRoot: !!options.outputRoot });
    } catch (e) {
        if (e.code === 'OUTPUT_PATH_INVALID') {
            throw new BempDocError(ERROR_CODES.OUTPUT_PATH_INVALID, e.message, { allowedRoot: e.allowedRoot, actualPath: e.actualPath });
        }
        throw e;
    }

    if (jsonMode) {
        return {
            success: true,
            type: 'outline-design',
            format: 'docx',
            outputPath,
            scanSummary: {
                modules: scanData.modules.length,
                interfaces: scanData.interfaces.length,
                subsystems: scanData.subsystems.length,
                techStack: scanData.techStack,
            },
            erDiagrams: erResults.map(er => ({
                groupName: er.groupName,
                label: er.label,
                tableCount: er.tableCount,
                mmdPath: er.mmdPath,
                htmlPath: er.htmlPath,
            })),
            erPngImages: erPngPaths,
            mcpChartConfigs: mcpChartConfigs.map(c => ({
                type: c.type,
                title: c.title,
                source: c.source,
            })),
            mcpChartConfigPath: path.join(outputDir, '_mcp-chart-configs.json'),
            diagramGate: {
                passed: diagramGate.passed,
                warnings: diagramGate.warnings,
                summary: diagramGate.summary,
            },
            validation: validationDetails,
        };
    }

    const results = [`✓ 概要设计说明书已生成: ${outputPath}`];
    results.push(`  项目: ${scanData.projectName} | 模块: ${scanData.modules.length} | 接口: ${scanData.interfaces.length} | 子系统: ${scanData.subsystems.length}`);

    if (erResults.length > 0) {
        results.push(`✓ ER关系图已生成: ${erResults.length}个分组`);
        for (const er of erResults) {
            results.push(`  - ${er.label}: ${er.tableCount}个表`);
        }
    }

    if (validationPassed) {
        results.push('  ✅ 文档格式校验通过');
    } else {
        results.push('  ❌ 文档格式校验未通过:');
        if (validationDetails && validationDetails.errors) {
            for (const err of validationDetails.errors) {
                results.push(`    - 错误: ${err}`);
            }
        }
        if (validationDetails && validationDetails.warnings) {
            for (const warn of validationDetails.warnings) {
                results.push(`    - 警告: ${warn}`);
            }
        }
    }
    return results;
}

/**
 * excel-custom 类型处理：调用 Python 通用 Excel 生成器
 * 配置驱动，所有列定义/样式/数据源映射从 config/excel-doc-types.json 读取
 * 与模板填充模式(excel-testcase/unit-test-report-xlsx)并存
 */
async function generateExcelCustom(options, jsonMode, moduleName) {
    const { execFileSync } = require('child_process');
    const { paths, BempDocError, ERROR_CODES } = require('../config/default');

    const docType = options.excelDocType || 'test-case-custom';
    const configPath = path.join(paths.configDir, 'excel-doc-types.json');
    if (!fs.existsSync(configPath)) {
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `Excel文档类型配置不存在: ${configPath}`);
    }

    const generatorScript = path.join(paths.scriptsDir, 'excel_generators', 'excel_generator.py');
    if (!fs.existsSync(generatorScript)) {
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `Excel生成器脚本不存在: ${generatorScript}`);
    }

    // 组装 Python 脚本参数（全部通过 CLI 参数传递，无硬编码）
    const pyArgs = [generatorScript, '--doc-type', docType, '--config', configPath, '--module', moduleName || ''];
    if (options.mdFiles && options.mdFiles.length > 0) {
        pyArgs.push('--md-files', ...options.mdFiles);
    }
    if (options.jsonFiles && options.jsonFiles.length > 0) {
        pyArgs.push('--json-files', ...options.jsonFiles);
    }
    if (options.outputPath) {
        pyArgs.push('--output', options.outputPath);
    }

    console.log(`[excel-custom] 文档类型: ${docType}`);
    console.log(`[excel-custom] 配置文件: ${configPath}`);
    if (options.mdFiles) console.log(`[excel-custom] MD数据源: ${options.mdFiles.length} 个文件`);
    if (options.jsonFiles) console.log(`[excel-custom] JSON数据源: ${options.jsonFiles.length} 个文件`);

    let pyResult;
    try {
        pyResult = execFileSync('python', pyArgs, {
            encoding: 'utf-8',
            maxBuffer: 20 * 1024 * 1024,
            cwd: paths.scriptsDir,
        });
    } catch (pyErr) {
        const stderr = pyErr.stderr ? pyErr.stderr.toString('utf-8') : pyErr.message;
        throw new BempDocError(ERROR_CODES.GENERATION_FAILED, `Excel生成器执行失败: ${stderr}`);
    }

    // 从 stdout 提取最后一个 JSON 对象（支持多行 JSON）
    let resultJson = null;
    const lastBrace = pyResult.lastIndexOf('}');
    if (lastBrace !== -1) {
        // 从最后一个 } 向前找匹配的 {
        let depth = 0;
        for (let i = lastBrace; i >= 0; i--) {
            if (pyResult[i] === '}') depth++;
            else if (pyResult[i] === '{') depth--;
            if (depth === 0) {
                const jsonStr = pyResult.slice(i, lastBrace + 1);
                try {
                    resultJson = JSON.parse(jsonStr);
                    break;
                } catch (_) { /* continue searching */ }
            }
        }
    }
    if (!resultJson) {
        throw new BempDocError(ERROR_CODES.GENERATION_FAILED, 'Excel生成器未返回有效JSON结果');
    }

    if (jsonMode) {
        return {
            success: true,
            type: 'excel-custom',
            docType: resultJson.docType,
            outputPath: resultJson.outputPath,
            totalRecords: resultJson.totalRecords,
            sheets: resultJson.sheets,
            summarySheet: resultJson.summarySheet
        };
    }

    const lines_out = [
        `✓ Excel文档已生成: ${resultJson.outputPath}`,
        `  文档类型: ${resultJson.docType} | 记录数: ${resultJson.totalRecords}`,
        `  Sheet列表: ${resultJson.sheets.join(', ')}${resultJson.summarySheet ? ' + 汇总Sheet' : ''}`
    ];
    return lines_out;
}

function loadTemplateData(templatePath, fallbackType) {
    const resolvedPath = path.isAbsolute(templatePath) ? templatePath : path.resolve(process.cwd(), templatePath);
    if (!fs.existsSync(resolvedPath)) {
        if (fallbackType) {
            console.warn(`  ⚠ 用户指定模板不存在: ${resolvedPath}，回退使用默认模板`);
            return getDefaultTemplateData(fallbackType);
        }
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件不存在: ${resolvedPath}`);
    }
    try {
        return JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    } catch (e) {
        if (fallbackType) {
            console.warn(`  ⚠ 模板文件解析失败: ${e.message}，回退使用默认模板`);
            return getDefaultTemplateData(fallbackType);
        }
        throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `模板文件解析失败: ${e.message}`);
    }
}

// 当用户未指定 --template 时，根据文档类型自动加载 skill 内置模板
function getDefaultTemplateData(type) {
    const templatePath = DEFAULT_TEMPLATE_MAP[type];
    if (!templatePath || !fs.existsSync(templatePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    } catch (e) {
        return null;
    }
}

/**
 * 2026-07-02 新增：output-guard
 * 在 CLI 启动时检测技能内 output 与项目根 output 是否同时存在
 * 若同时存在,提示用户收敛到项目根 output(不强制迁移,仅警告)
 * @returns {{ converged: boolean, skillOutput: string, projectOutput: string, warnings: string[] }}
 */
function checkOutputGuard() {
    const dual = pathsLite.detectDualOutput();
    const warnings = [];
    if (dual.bothExist) {
        warnings.push(`检测到技能内 output 与项目根 output 同时存在:`);
        warnings.push(`  技能内: ${dual.skillOutput}`);
        warnings.push(`  项目根: ${dual.projectOutput}`);
        warnings.push(`  → 已自动收敛到项目根: ${paths.outputDir}`);
        warnings.push(`  → 建议: 使用 scripts/migrate_output.py 将技能内 output 旧文件迁移到项目根 output`);
    }
    if (paths.outputDir !== dual.projectOutput && !process.env.BEMP_OUTPUT_DIR) {
        // 输出目录已收敛,但不在项目根（理论上不应该发生,除非 PROJECT_ROOT 推算异常）
        warnings.push(`输出目录未收敛到项目根: ${paths.outputDir}`);
    }
    return {
        converged: true,
        skillOutput: dual.skillOutput,
        projectOutput: dual.projectOutput,
        bothExist: dual.bothExist,
        warnings,
    };
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printHelp();
        process.exit(0);
    }

    // 2026-07-02 优化：output-guard 启动检查
    const guard = checkOutputGuard();
    if (guard.bothExist) {
        console.log(`\n[output-guard] 输出目录已收敛至: ${paths.outputDir}`);
        for (const w of guard.warnings) console.log(`  ⚠ ${w}`);
        console.log('');
    }

    const options = parseArgs(args);

    if (options.listModules) {
        const { RequirementAnalyzer } = require('./lib/requirement-analyzer');
        const profiles = RequirementAnalyzer.listProfiles();
        console.log('\n可用模块 Profile:\n');
        if (profiles.length === 0) {
            console.log('  (未找到任何 profile 文件)');
        } else {
            const moduleProfs = profiles.filter(p => !p.isDefault);
            const defaultProf = profiles.find(p => p.isDefault);
            for (const p of moduleProfs) {
                console.log(`  📄 ${p.name}  (v${p.schemaVersion})`);
                if (p.description) console.log(`     ${p.description}`);
            }
            if (defaultProf) {
                console.log(`\n  📋 ${defaultProf.name} (默认配置, v${defaultProf.schemaVersion})`);
                if (defaultProf.description) console.log(`     ${defaultProf.description}`);
            }
            console.log(`\n共 ${moduleProfs.length} 个模块 + 1 个默认配置`);
        }
        console.log('');
        process.exit(0);
    }

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

    console.log(`\n文档生成器`);
    console.log(`类型: ${options.type} | 格式: ${options.format} | 模块: ${options.module || '未指定'}`);
    console.log('---\n');

    try {
        const results = await generateDocument(options);
        results.forEach(r => console.log(r));
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

if (require.main === module) {
    main();
}

module.exports = { parseArgs, enforceDiagramGate };
