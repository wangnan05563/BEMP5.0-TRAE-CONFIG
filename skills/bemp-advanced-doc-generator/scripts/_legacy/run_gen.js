const { spawnSync } = require('child_process');
const path = require('path');

const cliPath = path.join(__dirname, 'cli.js');
const args = [
    cliPath,
    '-t', 'unit-test-report',
    '-m', '承兑行额度管理',
    '--mode', 'functional',
    '--xlsx-template', 'd:\\code\\QJ\\BEMP5.0DEV\\河南农商个性化需求\\09【模板】单元测试报告.xlsx',
    '--test-cases', 'd:\\code\\QJ\\BEMP5.0DEV\\.trae\\skills\\bemp-test-common\\test-cases\\bm\\credit\\credit-management.md',
    '--output', 'd:\\code\\QJ\\BEMP5.0DEV\\河南农商个性化需求\\承兑行额度管理-单元测试报告.xlsx',
    '--requirement', 'd:\\code\\QJ\\BEMP5.0DEV\\河南农商个性化需求\\额度.md',
    '--json'
];

console.log('CMD:', 'node', args.join(' '));
const r = spawnSync('node', args, { encoding: 'utf-8', cwd: __dirname });
console.log('--- STDOUT ---');
console.log(r.stdout);
console.log('--- STDERR ---');
console.log(r.stderr);
console.log('--- EXIT ---', r.status);
