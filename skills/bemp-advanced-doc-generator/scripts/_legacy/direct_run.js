const { XlsxUnitTestReportGenerator } = require('./lib/xlsx-report-generator');
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        const gen = new XlsxUnitTestReportGenerator();
        const r = await gen.generate({
            xlsxTemplate: 'd:/code/QJ/BEMP5.0DEV/河南农商个性化需求/09【模板】单元测试报告.xlsx',
            testCasesPath: 'd:/code/QJ/BEMP5.0DEV/.trae/skills/bemp-test-common/test-cases/bm/credit/credit-management.md',
            outputPath: 'd:/code/QJ/BEMP5.0DEV/河南农商个性化需求/承兑行额度管理-单元测试报告.xlsx',
            moduleName: '承兑行额度管理',
            requirementPath: 'd:/code/QJ/BEMP5.0DEV/河南农商个性化需求/额度.md',
            project: '河南农商',
            mode: 'functional'
        });
        fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'aotutests-devtools', 'result.json'), JSON.stringify(r, null, 2));
        fs.appendFileSync(path.join(__dirname, '..', '..', '..', 'aotutests-devtools', 'gen_xlsx4.log'), 'OK totalCases=' + r.totalCases + ' mode=' + r.mode + '\n');
    } catch (e) {
        fs.appendFileSync(path.join(__dirname, '..', '..', '..', 'aotutests-devtools', 'gen_xlsx4.log'), 'ERR ' + e.message + '\n' + e.stack + '\n');
    }
})();

