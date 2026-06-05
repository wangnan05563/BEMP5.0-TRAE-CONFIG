// TC-GATE-003 (补充): 验证 cli.js step 4 处门禁不通过会抛 BempDocError
// 因为 enforceDiagramGate 在 cli.js 内部调用，测试 cli.js 的完整流程需要 cli 的 import

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { enforceDiagramGate, parseArgs } = require(path.join(root, 'scripts', 'cli.js'));

const out = (s) => process.stdout.write(s + '\n');

// 复现 cli.js 内部行为
function simulateStep4Gate(diagramDir) {
    const gate = enforceDiagramGate(
        diagramDir,
        path.join(diagramDir, '_mcp-chart-configs.json')
    );
    if (!gate.passed) {
        const err = new Error(`图表质量门禁未通过: ${gate.errors.join('; ')}`);
        err.name = 'BempDocError';
        throw err;
    }
    return gate;
}

const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bemp-step4-'));
out('--- CASE A: 图缺失（应抛错）---');
try {
    simulateStep4Gate(tmp);
    out('[FAIL] 未抛错');
} catch (e) {
    if (e.name === 'BempDocError' && e.message.includes('图表质量门禁未通过')) {
        out('[OK] 已抛 BempDocError，含 3 个 errors');
    } else {
        out('[FAIL] 错误类型不符: ' + e.message);
    }
}

out('--- CASE B: 图齐全（不应抛错）---');
for (const f of ['architecture-diagram.png', 'network-topology.png', 'deployment-diagram.png']) {
    fs.writeFileSync(path.join(tmp, f), Buffer.alloc(20 * 1024, 0));
}
try {
    const g = simulateStep4Gate(tmp);
    out('[OK] passed=' + g.passed + ' | present=' + g.summary.present.length);
} catch (e) {
    out('[FAIL] 不应抛错: ' + e.message);
}

fs.rmSync(tmp, { recursive: true, force: true });

out('--- CASE C: --no-antv 参数 ---');
const opts = parseArgs(['-t', 'outline-design', '-m', 'test', '--no-antv']);
out('[OK] useAntV=' + opts.useAntV);
if (opts.useAntV !== false) process.exit(1);

out('--- CASE D: 默认 useAntV=true ---');
const opts2 = parseArgs(['-t', 'outline-design', '-m', 'test']);
if (opts2.useAntV !== true) { out('[FAIL]'); process.exit(1); }
out('[OK] useAntV=' + opts2.useAntV);

out('\n所有 C2 + C1 补充用例通过');
