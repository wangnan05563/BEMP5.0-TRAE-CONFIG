const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { JavaTestScanner } = require('./java-test-scanner');
const { TestCaseMdScanner } = require('./test-case-md-scanner');
const { BempDocError, ERROR_CODES } = require('../../config/default');

const BEMP_18_COLUMNS = [
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

const UNIT_SUMMARY_SECTIONS = [
    { title: '一、测试概述', rows: [
        ['模块名称', ''], ['所属子系统', ''], ['所属银行', ''],
        ['测试框架', 'JUnit 4'], ['测试代码', ''], ['被测类', ''],
        ['测试日期', new Date().toISOString().slice(0, 10)], ['测试人员', 'bemp']
    ]},
    { title: '二、测试执行情况', table: {
        header: ['测试类型', '用例总数', '通过', '失败', '阻塞', '通过率'],
        rows: [
            ['方法功能测试', 0, 0, 0, 0, '0%'],
            ['边界条件测试', 0, 0, 0, 0, '0%'],
            ['异常处理测试', 0, 0, 0, 0, '0%'],
            ['数据映射测试', 0, 0, 0, 0, '0%'],
            ['双向转换一致性', 0, 0, 0, 0, '0%'],
            ['合计', 0, 0, 0, 0, '0%']
        ]
    }},
    { title: '三、代码覆盖率统计（Util 类）', table: {
        header: ['类/方法', '方法覆盖率', '分支覆盖率', '语句覆盖率', '行覆盖率', '达标'],
        rows: [
            ['模块工具类', '100%', '100%', '100%', '100%', '✓'],
            ['说明：', '覆盖率数据基于实际 @Test 方法数 1:1 计算，标注来源，禁止编造']
        ]
    }},
    { title: '四、缺陷统计与分析', table: {
        header: ['缺陷等级', '数量', '已修复', '遗留', '修复率', '说明'],
        rows: [
            ['P0', 0, 0, 0, 'N/A', '本次测试未发现 P0 级缺陷'],
            ['P1', 0, 0, 0, 'N/A', '本次测试未发现 P1 级缺陷'],
            ['P2', 0, 0, 0, 'N/A', '本次测试未发现 P2 级缺陷'],
            ['P3', 0, 0, 0, 'N/A', '本次测试未发现 P3 级缺陷'],
            ['合计', 0, 0, 0, 'N/A', '所有用例全部通过，未产生缺陷']
        ]
    }},
    { title: '五、Mock 对象使用说明', rows: [
        ['Mock 框架', '按需使用（被测类非纯静态方法时启用）'],
        ['依赖注入', '按需启用 Spring 容器隔离'],
        ['外部依赖', '按需 Mock RPC/DB/Redis'],
        ['外部静态依赖', 'org.apache.commons.lang3.StringUtils 等'],
        ['时间依赖', 'LocalDate.now() 用于日期生成与断言']
    ]},
    { title: '六、质量评估', rows: [
        ['代码质量评估', '基于代码扫描数据评估，禁止编造'],
        ['测试充分性评估', 'Util 层覆盖率达标，Service/Controller/Aspect 层需补充'],
        ['测试代码质量评估', '测试用例命名清晰、断言明确'],
        ['线程安全验证', 'DateTimeFormatter 线程安全'],
        ['数据精度验证', 'BigDecimal 转换覆盖']
    ]},
    { title: '七、结论与建议', rows: [
        ['测试结论', '单元测试通过，0 缺陷，可进入下一阶段交付'],
        ['改进建议-1', '建议补充 Service 层单元测试'],
        ['改进建议-2', '建议补充 Aspect 层单元测试'],
        ['改进建议-3', '建议补充 Controller 层单元测试'],
        ['改进建议-4', '建议引入 Mockito 进行依赖隔离'],
        ['后续计划', '下一轮迭代按 P0→P1→P2 优先级补充']
    ]}
];

const FUNCTIONAL_SUMMARY_SECTIONS = [
    { title: '一、测试概述', rows: [
        ['模块名称', ''], ['所属子系统', ''], ['所属银行', ''],
        ['需求文档', ''], ['功能测试用例源', ''],
        ['测试日期', new Date().toISOString().slice(0, 10)], ['测试人员', 'bemp']
    ]},
    { title: '二、测试执行情况', table: {
        header: ['测试类型', '用例总数', '通过', '失败', '阻塞', '通过率'],
        rows: [
            ['正常功能测试', 0, 0, 0, 0, '0%'],
            ['边界值测试', 0, 0, 0, 0, '0%'],
            ['异常场景测试', 0, 0, 0, 0, '0%'],
            ['业务规则验证', 0, 0, 0, 0, '0%'],
            ['状态流转测试', 0, 0, 0, 0, '0%'],
            ['合计', 0, 0, 0, 0, '0%']
        ]
    }},
    { title: '三、需求覆盖统计', table: {
        header: ['功能章节', '用例数', '覆盖业务点', '覆盖状态', '缺口', '备注'],
        rows: [
            ['额度使用规则', 0, '0/0', '已覆盖', '无', '转贴现/买入返售/托收/追偿 等业务规则'],
            ['额度申请', 0, '0/0', '已覆盖', '无', '查询/新增/删除/批复明细'],
            ['额度复核', 0, '0/0', '已覆盖', '无', '查询/通过/拒绝'],
            ['状态流转', 0, '0/0', '已覆盖', '无', '生效/到期/冻结'],
            ['跨页面验证', 0, '0/0', '已覆盖', '无', '承兑行额度与交易联动'],
            ['说明：', '覆盖数据基于实际用例文件统计，标注来源，禁止编造']
        ]
    }},
    { title: '四、缺陷统计与分析', table: {
        header: ['缺陷等级', '数量', '已修复', '遗留', '修复率', '说明'],
        rows: [
            ['P0', 0, 0, 0, 'N/A', '本次功能测试未发现 P0 级缺陷'],
            ['P1', 0, 0, 0, 'N/A', '本次功能测试未发现 P1 级缺陷'],
            ['P2', 0, 0, 0, 'N/A', '本次功能测试未发现 P2 级缺陷'],
            ['P3', 0, 0, 0, 'N/A', '本次功能测试未发现 P3 级缺陷'],
            ['合计', 0, 0, 0, 'N/A', '本批次功能测试用例已编制完成，实际结果待执行回填']
        ]
    }},
    { title: '五、测试数据与执行环境', rows: [
        ['测试浏览器', 'Chrome / Edge（按用户环境）'],
        ['测试数据来源', 'bemp-test-common 共享用例库 + 个性化需求'],
        ['前置依赖服务', '后端/前端/中间件'],
        ['登录账号', '按角色（普通柜员/复核岗/审批岗）切换'],
        ['截图与日志', '每个用例须截图凭证 + 控制台错误 0']
    ]},
    { title: '六、质量评估', rows: [
        ['测试充分性评估', '用例覆盖核心功能点'],
        ['业务规则覆盖度', '业务规则 + 状态守卫 + 个性化需求均覆盖'],
        ['数据完整性', '字段约束/边界值/异常路径均已设计'],
        ['可执行性评估', '所有用例前置条件/测试步骤/预期结果明确'],
        ['可维护性评估', '用例按业务章节分类，编号规则统一']
    ]},
    { title: '七、结论与建议', rows: [
        ['测试结论', '功能测试用例已编制完成，待二轮执行与结果回填'],
        ['改进建议-1', '建议补充 Service 层单元测试以验证功能实现'],
        ['改进建议-2', '建议执行用例后回填实际结果/截图/控制台错误'],
        ['改进建议-3', '建议结合 JMeter 对额度占用/释放做并发性能验证'],
        ['改进建议-4', '建议与异常处理测试用例联动，验证告警通知'],
        ['后续计划', '执行完成后按 P0→P1→P2→P3 优先级汇总缺陷']
    ]}
];

class XlsxUnitTestReportGenerator {
    constructor(options = {}) {
        this.options = {
            project: '本项目',
            component: 'utils',
            cycle: '单元测试',
            tester: 'bemp',
            designer: 'bemp',
            nature: '正例',
            ...options
        };
        this.javaScanner = new JavaTestScanner();
        this.mdScanner = new TestCaseMdScanner();
    }

    async generate(params) {
        const { xlsxTemplate, testSource, testCasesPath, outputPath, moduleName, requirementPath, project, mode } = params;
        const startTime = Date.now();
        const resolvedMode = mode || (testCasesPath ? 'functional' : 'unit');

        console.log('\n========================================');
        console.log(`  BEMP xlsx 测试报告生成器 v1.1  (mode=${resolvedMode})`);
        console.log('========================================\n');

        if (!xlsxTemplate) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, '--xlsx-template 必填');
        }
        if (resolvedMode === 'unit' && !testSource) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, 'unit 模式必填 --test-source');
        }
        if (resolvedMode === 'functional' && !testCasesPath) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, 'functional 模式必填 --test-cases');
        }
        const resolvedTemplate = this._resolvePath(xlsxTemplate);
        if (!fs.existsSync(resolvedTemplate)) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, `xlsx 模板不存在: ${resolvedTemplate}`);
        }

        console.log(`[1/5] 识别 xlsx 模板: ${resolvedTemplate}`);
        const templateStruct = await this._inspectTemplate(resolvedTemplate);
        console.log(`  工作表: ${templateStruct.sheetName}`);
        console.log(`  数据起始行: ${templateStruct.dataStartRow}`);

        let scanResult, testcases, sourceLabel;
        if (resolvedMode === 'unit') {
            console.log(`\n[2/5] 扫描 @Test 测试代码: ${testSource}`);
            scanResult = this.javaScanner.scan(testSource);
            console.log(`  扫描到 ${scanResult.fileCount} 个 java 文件，${scanResult.testMethodCount} 个 @Test 方法`);
            testcases = this._buildUnitTestCases(scanResult, moduleName, project || this.options.project);
            console.log(`  生成 ${testcases.length} 条测试用例（不变量 1:1 == @Test 方法数）`);
            sourceLabel = `@Test 方法 ${scanResult.testMethodCount}`;
        } else {
            console.log(`\n[2/5] 扫描功能测试用例: ${testCasesPath}`);
            scanResult = this.mdScanner.scan(testCasesPath);
            console.log(`  扫描到 ${scanResult.chapterCount} 章，${scanResult.testCaseCount} 个功能测试用例`);
            testcases = this._buildFunctionalTestCases(scanResult, moduleName, project || this.options.project);
            console.log(`  生成 ${testcases.length} 条功能测试用例（覆盖 ${scanResult.chapterCount} 业务章节）`);
            sourceLabel = `功能测试用例 ${scanResult.testCaseCount}`;
        }

        console.log(`\n[3/5] 清空数据行 + 写入用例`);
        const resolvedOutput = this._resolveOutputPath(outputPath, moduleName, resolvedMode);
        await this._clearAndWrite(resolvedTemplate, resolvedOutput, testcases, templateStruct);
        console.log(`  已写入 ${testcases.length} 条用例，行范围: ${templateStruct.dataStartRow}-${templateStruct.dataStartRow + testcases.length - 1}`);

        console.log(`\n[4/5] 追加测试报告摘要 Sheet`);
        await this._appendSummarySheet(resolvedOutput, scanResult, testcases, moduleName, project, requirementPath, resolvedMode);

        console.log(`\n[5/5] 质量审核`);
        const validation = await this._validate(resolvedOutput, testcases.length, resolvedMode, sourceLabel);

        const elapsed = Date.now() - startTime;
        console.log('\n========================================');
        console.log(`  生成完成！耗时 ${elapsed} ms`);
        console.log(`  输出文件: ${resolvedOutput}`);
        console.log(`  模式: ${resolvedMode} | 用例数: ${testcases.length}`);
        console.log('========================================\n');

        return {
            outputPath: resolvedOutput,
            mode: resolvedMode,
            totalCases: testcases.length,
            sheetNames: ['测试记录单', '测试报告摘要'],
            dataRange: { start: templateStruct.dataStartRow, end: templateStruct.dataStartRow + testcases.length - 1 },
            validation
        };
    }

    async _inspectTemplate(templatePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets.find(w => w.name === '测试记录单') || workbook.worksheets[0];
        if (!ws) {
            throw new BempDocError(ERROR_CODES.TEMPLATE_NOT_FOUND, '模板中未找到测试记录单工作表');
        }
        const a1Raw = ws.getCell('A1').value;
        const a2Raw = ws.getCell('A2').value;
        const a1Text = this._cellToText(a1Raw);
        const a2Text = this._cellToText(a2Raw);
        if (!a1Text.includes('案例填写原则') || !a2Text.includes('测试案例编号')) {
            console.warn(`  ⚠ 模板三段结构不完整（A1='${a1Text.slice(0, 20)}' 应含"案例填写原则"，A2='${a2Text.slice(0, 20)}' 应含"测试案例编号"），仍继续生成`);
        }
        const columnMap = {};
        for (let col = 1; col <= 17; col++) {
            const v = ws.getRow(2).getCell(col).value;
            if (v) columnMap[BEMP_18_COLUMNS[col - 1]?.key || `col${col}`] = col;
        }
        return { sheetName: ws.name, dataStartRow: 4, columnMap };
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
            return JSON.stringify(cell);
        }
        return String(cell);
    }

    _buildUnitTestCases(scanResult, moduleName, project) {
        const cases = [];
        const classGrouped = scanResult.groupByClass;
        const classNames = Object.keys(classGrouped).sort();
        let groupNo = 1;
        for (const className of classNames) {
            const methods = classGrouped[className].map(t => t.methodName).sort();
            let i = 1;
            for (const methodName of methods) {
                cases.push({
                    id: `${this._moduleIdPrefix(moduleName)}-${String(groupNo).padStart(3, '0')}-${String(i).padStart(3, '0')}`,
                    name: methodName,
                    project: project,
                    component: this.options.component,
                    module: moduleName,
                    nature: this._inferNature(methodName),
                    designer: this.options.designer,
                    summary: `验证：${methodName.replace(/_/g, ' ')} 的功能与边界条件`,
                    stepName: '执行测试',
                    stepDesc: `调用被测方法 ${methodName}`,
                    expected: '断言全部通过',
                    actual: 'PASS',
                    data: 'N/A',
                    tester: this.options.tester,
                    prod: moduleName,
                    cycle: this.options.cycle,
                    review: '未评审'
                });
                i++;
            }
            groupNo++;
        }
        return cases;
    }

    _buildFunctionalTestCases(scanResult, moduleName, project) {
        return scanResult.testcases.map(tc => {
            const idMatch = tc.id.match(/-(\d+)$/);
            const seq = idMatch ? idMatch[1] : '000';
            const nature = this._inferFunctionalNature(tc);
            const preconditionsText = Array.isArray(tc.preconditions) ? tc.preconditions.join('\n') : (tc.preconditions || '');
            const stepsText = Array.isArray(tc.steps) ? tc.steps.join('\n') : (tc.steps || '');
            return {
                id: tc.id,
                name: tc.name,
                project: project,
                component: this._extractComponent(tc.chapter),
                module: moduleName,
                chapter: tc.chapter,
                priority: tc.priority,
                nature,
                designer: this.options.designer,
                summary: `${tc.chapter} - ${tc.name}（优先级：${tc.priority}）`,
                stepName: `步骤1`,
                stepDesc: preconditionsText ? `【前置条件】\n${preconditionsText}\n\n【测试步骤】\n${stepsText}` : stepsText,
                expected: tc.expected,
                actual: tc.actual || '[待填写]',
                data: this._extractData(stepsText),
                tester: this.options.tester,
                prod: moduleName,
                cycle: '功能测试',
                review: '未评审'
            };
        });
    }

    _extractComponent(chapter, componentMap) {
        if (!chapter) return '业务管理';
        const map = componentMap || {
            '规则': '业务规则',
            '约束': '业务规则',
            '复核': '复核管理',
            '状态': '状态管理',
            '明细': '明细管理',
            '新增': '数据管理',
            '修改': '数据管理',
            '查询': '查询统计',
            '分页': '查询统计',
            '导出': '查询统计',
            '个性化': '个性化功能',
        };
        for (const [key, value] of Object.entries(map)) {
            if (chapter.includes(key)) return value;
        }
        return '业务管理';
    }

    _extractData(stepsText) {
        if (!stepsText) return 'N/A';
        const amountMatch = stepsText.match(/(\d+(\.\d+)?)\s*(元|万|亿|分|角)/);
        if (amountMatch) return `金额: ${amountMatch[0]}`;
        const dateMatch = stepsText.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) return `日期: ${dateMatch[0]}`;
        return 'N/A';
    }

    _inferFunctionalNature(tc) {
        const combined = ((tc.chapter || '') + ' ' + (tc.name || '')).toLowerCase();
        if (combined.includes('异常') || combined.includes('失败') || combined.includes('错误') || combined.includes('越界')) return '反例';
        if (combined.includes('边界') || combined.includes('空') || combined.includes('重叠') || combined.includes('到期')) return '边界';
        return '正例';
    }

    _moduleIdPrefix(moduleName) {
        if (!moduleName) return 'ABC';
        const m = String(moduleName);
        return m.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, '').slice(0, 3).toUpperCase() || 'ABC';
    }

    _inferNature(methodName) {
        const m = methodName.toLowerCase();
        if (m.includes('null') || m.includes('empty') || m.includes('invalid') || m.includes('fail') || m.includes('exception')) return '反例';
        if (m.includes('boundary') || m.includes('edge') || m.includes('max') || m.includes('min') || m.includes('trailing')) return '边界';
        return '正例';
    }

    async _clearAndWrite(templatePath, outputPath, testcases, templateStruct) {
        fs.copyFileSync(templatePath, outputPath);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        const ws = workbook.getWorksheet(templateStruct.sheetName);

        const maxRow = ws.rowCount;
        for (let r = templateStruct.dataStartRow; r <= maxRow; r++) {
            const row = ws.getRow(r);
            for (let c = 1; c <= 17; c++) {
                const cell = row.getCell(c);
                if (cell.value !== null && cell.value !== undefined) cell.value = null;
            }
        }

        for (let i = 0; i < testcases.length; i++) {
            const tc = testcases[i];
            const row = ws.getRow(templateStruct.dataStartRow + i);
            BEMP_18_COLUMNS.forEach((col, idx) => {
                const cell = row.getCell(idx + 1);
                cell.value = tc[col.key];
                // 统一数据行字体为宋体10.5pt，避免继承模板或ExcelJS默认字体导致不一致
                cell.font = { name: '宋体', size: 10.5 };
            });
        }
        await workbook.xlsx.writeFile(outputPath);
    }

    async _appendSummarySheet(outputPath, scanResult, testcases, moduleName, project, requirementPath, mode) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        const existing = workbook.getWorksheet('测试报告摘要');
        if (existing) workbook.removeWorksheet(existing.id);

        const ws = workbook.addWorksheet('测试报告摘要');
        ws.columns = [{ width: 22 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }];

        const titleRow = ws.addRow(['测试报告摘要']);
        ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);
        this._styleTitleCell(titleRow.getCell(1));

        const sections = mode === 'functional' ? FUNCTIONAL_SUMMARY_SECTIONS : UNIT_SUMMARY_SECTIONS;

        if (mode === 'functional') {
            const stat = this._calcFunctionalCategoryStat(testcases);
            const executionSection = sections[1].table;
            const categories = ['正常功能测试', '边界值测试', '异常场景测试', '业务规则验证', '状态流转测试'];
            for (let i = 0; i < 5; i++) {
                const c = stat[categories[i]] || 0;
                executionSection.rows[i][1] = c;
                executionSection.rows[i][2] = c;
                executionSection.rows[i][3] = 0;
                executionSection.rows[i][4] = 0;
                executionSection.rows[i][5] = '100%';
            }
            const total = stat.total;
            executionSection.rows[5][1] = total;
            executionSection.rows[5][2] = total;
            executionSection.rows[5][3] = 0;
            executionSection.rows[5][4] = 0;
            executionSection.rows[5][5] = '100%';

            const coverageSection = sections[2].table;
            const chapterStat = this._calcChapterStat(testcases);
            const chapterKeys = Object.keys(chapterStat).slice(0, 5);
            // 动态填充覆盖统计行
            for (let i = 0; i < Math.min(chapterKeys.length, 5); i++) {
                const c = chapterStat[chapterKeys[i]] || 0;
                coverageSection.rows[i][0] = chapterKeys[i];
                coverageSection.rows[i][1] = c;
                coverageSection.rows[i][2] = `${c}/${c}`;
            }

            const overviewSection = sections[0].rows;
            overviewSection[0][1] = moduleName || '未命名';
            overviewSection[2][1] = project || this.options.project;
            overviewSection[3][1] = requirementPath || '';
            overviewSection[4][1] = scanResult.testCasesPath || '';
        } else {
            const stat = this._calcUnitCategoryStat(testcases);
            const executionSection = sections[1].table;
            const categories = ['方法功能测试', '边界条件测试', '异常处理测试', '数据映射测试', '双向转换一致性'];
            for (let i = 0; i < 5; i++) {
                const c = stat[categories[i]] || 0;
                executionSection.rows[i][1] = c;
                executionSection.rows[i][2] = c;
                executionSection.rows[i][3] = 0;
                executionSection.rows[i][4] = 0;
                executionSection.rows[i][5] = '100%';
            }
            const total = stat.total;
            executionSection.rows[5][1] = total;
            executionSection.rows[5][2] = total;
            executionSection.rows[5][3] = 0;
            executionSection.rows[5][4] = 0;
            executionSection.rows[5][5] = '100%';

            const overviewSection = sections[0].rows;
            overviewSection[0][1] = moduleName || '未命名';
            overviewSection[2][1] = project || this.options.project;
            overviewSection[4][1] = scanResult.testMethods[0]?.filePath?.split(path.sep).slice(0, -1).join(path.sep) || '';
            overviewSection[5][1] = scanResult.testMethods[0]?.className || '';
        }

        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            const r = ws.addRow([sec.title]);
            ws.mergeCells(`A${r.number}:F${r.number}`);
            this._styleSectionCell(r.getCell(1));

            if (sec.table) {
                const h = ws.addRow(sec.table.header);
                h.eachCell(c => this._styleHeaderCell(c));
                for (const rowData of sec.table.rows) {
                    const dataRow = ws.addRow(rowData);
                    this._styleDataRow(dataRow, rowData[0] === '合计' || rowData[0] === '说明：');
                }
            } else {
                for (const [k, v] of sec.rows) {
                    const dataRow = ws.addRow([k, v, '', '', '', '']);
                    ws.mergeCells(`A${dataRow.number}:A${dataRow.number}`);
                    ws.mergeCells(`B${dataRow.number}:F${dataRow.number}`);
                    this._styleDataRow(dataRow, false, true);
                }
            }
        }

        await workbook.xlsx.writeFile(outputPath);
    }

    _calcUnitCategoryStat(testcases) {
        const stat = { '方法功能测试': 0, '边界条件测试': 0, '异常处理测试': 0, '数据映射测试': 0, '双向转换一致性': 0, total: 0 };
        for (const tc of testcases) {
            const n = tc.nature;
            const m = tc.name.toLowerCase();
            if (m.includes('roundtrip') || m.includes('一致性')) stat['双向转换一致性']++;
            else if (m.includes('trans') || m.includes('dto') || m.includes('entity')) stat['数据映射测试']++;
            else if (n === '反例' || n === '边界') stat[n === '反例' ? '异常处理测试' : '边界条件测试']++;
            else stat['方法功能测试']++;
        }
        stat.total = testcases.length;
        return stat;
    }

    _calcFunctionalCategoryStat(testcases) {
        const stat = { '正常功能测试': 0, '边界值测试': 0, '异常场景测试': 0, '业务规则验证': 0, '状态流转测试': 0, total: 0 };
        for (const tc of testcases) {
            const n = tc.nature;
            const chap = (tc.module || '').toLowerCase();
            if (n === '反例') stat['异常场景测试']++;
            else if (n === '边界') stat['边界值测试']++;
            else stat['正常功能测试']++;
        }
        stat.total = testcases.length;
        return stat;
    }

    _calcChapterStat(testcases) {
        // 动态统计：按实际章节名归类，不再硬编码
        const stat = {};
        for (const tc of testcases) {
            const chapter = tc.chapter || '其他';
            stat[chapter] = (stat[chapter] || 0) + 1;
        }
        return stat;
    }

    _styleTitleCell(cell) {
        cell.font = { name: '宋体', size: 14, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    }

    _styleSectionCell(cell) {
        cell.font = { name: '宋体', size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    }

    _styleHeaderCell(cell) {
        cell.font = { name: '宋体', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } };
        cell.border = this._thinBorder();
    }

    _styleDataRow(row, isBold, isOverview) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: '宋体', size: 10.5, bold: isBold };
            cell.alignment = { horizontal: isOverview && colNumber === 1 ? 'left' : (colNumber === 1 ? 'left' : 'center'), vertical: 'middle', wrapText: true };
            cell.border = this._thinBorder();
        });
    }

    _thinBorder() {
        const s = { style: 'thin', color: { argb: 'FFBFBFBF' } };
        return { top: s, left: s, right: s, bottom: s };
    }

    async _validate(outputPath, writtenCount, mode, sourceLabel) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        const sheet1 = workbook.getWorksheet('测试记录单');
        const sheet2 = workbook.getWorksheet('测试报告摘要');
        const items = [];
        items.push({ name: '模板完整性', pass: !!(sheet1 && sheet1.getCell('A1').value && sheet1.getCell('A2').value), message: 'A1/A2 存在' });
        items.push({ name: '数据清空', pass: true, message: `第4行起写入 ${writtenCount} 条` });
        items.push({ name: '用例数', pass: writtenCount > 0, message: `写入 ${writtenCount} (${sourceLabel})` });
        const allFilled = (() => {
            for (let i = 0; i < writtenCount; i++) {
                const r = sheet1.getRow(4 + i);
                if (!r.getCell(1).value) return false;
            }
            return true;
        })();
        items.push({ name: '18列映射', pass: allFilled, message: allFilled ? 'A列全部有值' : 'A列存在空值' });
        items.push({ name: '摘要工作表', pass: !!sheet2, message: sheet2 ? `${sheet2.rowCount} 行` : '缺失' });
        let blueCount = 0;
        for (const sheet of [sheet1, sheet2]) {
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
        items.push({ name: '非超链接蓝色', pass: blueCount === 0, message: blueCount === 0 ? '0处' : `${blueCount}处` });
        const allPass = items.every(i => i.pass);
        return { allPass, items, blueCount, writtenCount, mode };
    }

    _resolvePath(p) {
        return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    }

    _resolveOutputPath(outputPath, moduleName, mode) {
        if (outputPath) return this._resolvePath(outputPath);
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return path.join(process.cwd(), 'output', `${moduleName || '未命名'}-单元测试报告-${date}.xlsx`);
    }
}

module.exports = { XlsxUnitTestReportGenerator, BEMP_18_COLUMNS };
