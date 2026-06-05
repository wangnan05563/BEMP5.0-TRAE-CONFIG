const path = require('path');
const fs = require('fs');
const { DiagramService } = require('../lib/diagram-service');

const sampleScanData = {
    projectName: 'BEMP5.0DEV',
    moduleName: '票据系统',
    subsystems: [
        { name: '系统管理' },
        { name: '公共' },
        { name: '业务管理' },
        { name: '票据承兑' },
        { name: '票据到期' },
        { name: '场内交易' },
        { name: '渠道管理' },
        { name: '任务调度' },
    ],
};

(async () => {
    const outDir = path.join(__dirname, '..', 'output', 'diagram-test');
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    const service = new DiagramService({
        outputDir: outDir,
        projectName: 'BEMP5.0DEV',
        useAntV: true,
        fallbackToMatplotlib: true,
    });

    console.log('=== 图表生成端到端测试 ===\n');
    const result = await service.generateAll(sampleScanData);

    console.log('\n--- 生成结果 ---');
    result.results.forEach((r) => {
        r.source = r.fallbackResolvedBy ? 'matplotlib' : 'AntV';
        const status = r.success ? '✅' : '❌';
        const engine = r.source;
        const size = r.size ? `(${Math.round(r.size / 1024)}KB)` : '';
        const err = r.errorMessage ? `, err=${r.errorMessage.substring(0, 80)}` : '';
        console.log(`${status} [${r.type}] engine=${engine} ${size}${err}`);
    });

    console.log('\n--- 目录内容 ---');
    if (fs.existsSync(outDir)) {
        const files = fs.readdirSync(outDir);
        files.forEach((f) => {
            const stat = fs.statSync(path.join(outDir, f));
            if (stat.isFile()) {
                console.log(`  ${f} (${stat.size} bytes)`);
            }
        });
    }

    console.log('\n--- 总体结果 ---');
    console.log(`success: ${result.success}, fallbackUsed: ${result.fallbackUsed}`);
    process.exit(result.success ? 0 : 1);
})().catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
});
