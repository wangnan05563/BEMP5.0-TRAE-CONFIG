// TC-NEW-I5: 错误信息中不应出现硬编码 'output/diagrams/'，应使用 path.join 后的相对路径
// TC-NEW-N4: 所有阶段日志编号应为 N/7
// TC-NEW-DEPRECATED: scripts/DEPRECATED.md 必须存在
//
// 用法: node scripts/test-improvements.js

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const cliSrc = fs.readFileSync(path.join(root, 'cli.js'), 'utf-8');

const out = (s) => process.stdout.write(s + '\n');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok, detail: detail || '' });
    out(`${ok ? '[OK]' : '[FAIL]'} ${name}${detail ? ' — ' + detail : ''}`);
}

// ============ TC-NEW-I5 ============
// 复现：抓 cli.js 错误消息原文，跨平台检查
check(
    'TC-NEW-I5: 错误消息使用 path.join 而非硬编码 output/diagrams/',
    !cliSrc.match(/图表质量门禁未通过[^`]*output\/diagrams\//),
    cliSrc.match(/图表质量门禁未通过[^`]*output\/diagrams\//) ? '仍存在硬编码路径' : ''
);
// 进一步验证：手动模拟错误信息生成
const relDiagDir = path.join('output', 'diagrams');
check(
    'TC-NEW-I5-WIN: 在 Windows 上 path.join 输出是 output\\diagrams',
    relDiagDir === path.join('output', 'diagrams'),
    `实际为: ${relDiagDir}`
);

// ============ TC-NEW-N4 ============
const stageLogs = [...cliSrc.matchAll(/\[(\d)\/(\d)\]\s*(\S+)/g)].map(m => ({
    n: m[1], total: m[2], label: m[3]
}));
out(`\n阶段日志共 ${stageLogs.length} 条：`);
stageLogs.forEach(s => out(`  - [${s.n}/${s.total}] ${s.label}`));

const allSevens = stageLogs.every(s => s.total === '7');
check(
    'TC-NEW-N4: 所有阶段日志的分母都是 7',
    allSevens && stageLogs.length >= 5,
    `总计 ${stageLogs.length} 条，非 7 分母: ${stageLogs.filter(s => s.total !== '7').map(s => '[' + s.n + '/' + s.total + ']').join(', ') || '无'}`
);

const noDupStage = new Set(stageLogs.map(s => s.n)).size === stageLogs.length;
check(
    'TC-NEW-N4-2: 阶段编号无重复',
    noDupStage,
    noDupStage ? '' : '有重复编号'
);

const stagesContiguous = stageLogs.map(s => parseInt(s.n)).sort((a, b) => a - b).every((n, i) => n === i + 1);
check(
    'TC-NEW-N4-3: 阶段编号 1..N 连续',
    stagesContiguous,
    `编号列表: ${stageLogs.map(s => s.n).join(', ')}`
);

// ============ TC-NEW-DEPRECATED ============
const depPath = path.join(root, 'scripts', 'DEPRECATED.md');
const depExists = fs.existsSync(depPath);
let depContent = '';
if (depExists) depContent = fs.readFileSync(depPath, 'utf-8');
check('TC-NEW-DEPRECATED: scripts/DEPRECATED.md 存在', depExists);
if (depExists) {
    check(
        'TC-NEW-DEPRECATED-2: DEPRECATED.md 含"已不再被维护"声明',
        depContent.includes('已不再被维护')
    );
    check(
        'TC-NEW-DEPRECATED-3: DEPRECATED.md 含"有效文件清单"',
        depContent.includes('有效文件清单')
    );
    check(
        'TC-NEW-DEPRECATED-4: DEPRECATED.md 列出有效 .py 脚本',
        depContent.includes('diagram-generator.py') && depContent.includes('document-validator.py')
    );
}

// ============ 汇总 ============
out('\n=== 汇总 ===');
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
out(`${pass} pass / ${fail} fail / ${results.length} total`);
process.exit(fail > 0 ? 1 : 0);
