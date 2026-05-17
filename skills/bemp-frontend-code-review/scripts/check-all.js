/**
 * BEMP 前端代码审查 - 一键全量检查
 *
 * 依次执行以下检查脚本并汇总结果：
 * 1. check-hardcode.js - 硬编码中文文本检测
 * 2. check-routes.js   - 路由注册完整性检查
 * 3. check-i18n.js     - $t() 国际化覆盖率检查
 *
 * 用法: node check-all.js [--bank=hnnxbank]
 */

const { execSync } = require('child_process');
const path = require('path');
const { loadConfig } = require('./config-loader');

const config = loadConfig();
const SCRIPTS_DIR = __dirname;
const SCRIPTS = [
  { name: '硬编码中文文本检测', file: 'check-hardcode.js' },
  { name: '路由注册完整性检查', file: 'check-routes.js' },
  { name: '$t() 国际化覆盖率检查', file: 'check-i18n.js' }
];

// 解析 bank 参数
const bankArg = process.argv.slice(2).find(a => a.startsWith('--bank='));
const bankParam = bankArg || '';

console.log('╔══════════════════════════════════════════════╗');
console.log(`║   BEMP 前端代码审查 — [${config.bankName}]   ║`);
console.log('╚══════════════════════════════════════════════╝\n');

let totalPassed = 0;
let totalFailed = 0;

for (const script of SCRIPTS) {
  const header = `▶ 正在执行: ${script.name}`;
  console.log(`${header}`);
  console.log('-'.repeat(50));

  try {
    const result = execSync(`node "${path.join(SCRIPTS_DIR, script.file)}" ${bankParam}`, {
      cwd: SCRIPTS_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(result);

    if (result.includes('❌') || result.includes('阻塞')) {
      totalFailed++;
    } else {
      totalPassed++;
    }
  } catch (err) {
    // 脚本因发现问题而退出码非零时，stdout 仍在 err 中
    const output = (err.stdout || '') + (err.stderr || '');
    if (output) console.log(output);
    totalFailed++;
  }
}

console.log('══════════════════════════════════════════════');
console.log('              审查汇总结果');
console.log('══════════════════════════════════════════════');
console.log(`  银行: ${config.bankName}`);
console.log(`  通过: ${totalPassed} 项`);
console.log(`  失败: ${totalFailed} 项`);
console.log('══════════════════════════════════════════════\n');

if (totalFailed > 0) {
  console.log('📋 修复建议:');
  console.log('  1. 将硬编码的中文按钮/标签文本改为 $t() 国际化调用');
  console.log(`  2. 在 ${config.bankName}Index.js 中注册缺失的路由映射`);
  console.log('  3. 确保 zh-CN.js 和 en-US.js 的键值同步\n');
}

process.exit(totalFailed > 0 ? 1 : 0);