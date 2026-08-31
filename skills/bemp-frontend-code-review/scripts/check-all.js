/**
 * BEMP 前端代码审查 - 一键全量检查
 *
 * 依次执行以下检查脚本并汇总结果：
 * 1. check-hardcode.js          - 硬编码中文文本检测
 * 2. check-routes.js            - 路由注册完整性检查
 * 3. check-i18n.js              - $t() 国际化覆盖率检查
 * 4. check-dialog-component.js  - 弹窗组件规约检查（W8 沉淀 J-HD1/J-SC1）
 *
 * 用法: node check-all.js [--bank=hnnxbank] [--verbose]
 *
 * 输出模式：
 * - 默认紧凑模式：每个脚本仅输出一行状态 + 问题行（过滤表头/分隔线），
 *   完整明细统一落盘 reports/scan-{bank}-{date}.json，供按需 Grep，节省回流 token
 * - --verbose：恢复完整逐行输出（明细仍同步落盘，便于对账）
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('./config-loader');

const config = loadConfig();
const SCRIPTS_DIR = __dirname;
const SCRIPTS = [
  { name: '硬编码中文文本检测', file: 'check-hardcode.js' },
  { name: '路由注册完整性检查', file: 'check-routes.js' },
  { name: '$t() 国际化覆盖率检查', file: 'check-i18n.js' },
  { name: '弹窗组件规约检查', file: 'check-dialog-component.js' }
];

// 解析参数
const args = process.argv.slice(2);
const bankArg = args.find(a => a.startsWith('--bank=')) || '';
const verbose = args.includes('--verbose');
const compact = !verbose;

// 紧凑模式下每个脚本最多输出的问题行数，超出部分引导到 JSON 明细（防止大范围违规时输出爆炸）
const MAX_ISSUE_LINES = 80;

// 分级汇总行特征：带分级 emoji 且带计数（如 "🔴 阻塞问题: 57 个"）
const ISSUE_LINE_RE = /🔴|🟠|🟡|🟢/;
const HEADER_LINE_RE = /检查|检测|覆盖|汇总|审查|报告|====|----|────|^\s*$/;

function compactOutput(output) {
  const lines = output.split('\n');
  const out = [];
  let pendingFile = null;
  for (const raw of lines) {
    const s = raw.trim();
    // 分级汇总计数行（如 "🔴 阻塞问题: 57 个"）——直接保留
    if (ISSUE_LINE_RE.test(s) && /\d+\s*个/.test(s)) {
      out.push(s);
      continue;
    }
    // 结构化问题条目：先"文件:"后"行号:"，合并为单行 "file:line"
    const f = s.match(/^文件:\s*(.+)$/);
    if (f) {
      pendingFile = f[1];
      continue;
    }
    const ln = s.match(/^行号:\s*(\d+)$/);
    if (ln && pendingFile) {
      out.push(`  - ${pendingFile}:${ln[1]}`);
      pendingFile = null;
      continue;
    }
    // 其他脚本格式：行内自带 emoji 的问题行
    if (ISSUE_LINE_RE.test(s) && !HEADER_LINE_RE.test(s)) {
      out.push(s);
    }
  }
  if (out.length === 0) return [];
  const shown = out.slice(0, MAX_ISSUE_LINES);
  const rest = out.length - shown.length;
  if (rest > 0) {
    shown.push(`  ...（其余 ${rest} 条问题明细见 JSON 报告）`);
  }
  return shown;
}

console.log('╔══════════════════════════════════════════════╗');
console.log(`║   BEMP 前端代码审查 — [${config.bankName}]   ║`);
console.log(`║   模式: ${compact ? '紧凑（明细落盘 JSON）' : '完整 verbose'}        ║`);
console.log('╚══════════════════════════════════════════════╝\n');

let totalPassed = 0;
let totalFailed = 0;
const scanReport = {
  generatedAt: new Date().toISOString(),
  bank: config.bankName,
  mode: compact ? 'compact' : 'verbose',
  scripts: []
};

for (const script of SCRIPTS) {
  let status = 'passed';
  let output = '';

  try {
    output = execSync(`node "${path.join(SCRIPTS_DIR, script.file)}" ${bankArg}`, {
      cwd: SCRIPTS_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    // 脚本因发现问题而退出码非零时，stdout 仍在 err 中
    output = (err.stdout || '') + (err.stderr || '');
    status = 'failed';
  }

  // “审查不通过”标记失败；脚本输出含“阻塞”字样的成功文案（如“无阻塞级问题”）不应误判
  if (status !== 'failed' && output.includes('❌ 审查不通过')) {
    status = 'failed';
  }
  if (status === 'passed') {
    totalPassed++;
  } else {
    totalFailed++;
  }

  scanReport.scripts.push({ name: script.name, file: script.file, status, output });

  if (compact) {
    const icon = status === 'passed' ? '✅ 通过' : '❌ 不通过';
    console.log(`▶ ${script.name}: ${icon}`);
    const issues = compactOutput(output);
    if (issues.length > 0) {
      issues.forEach(l => console.log(l));
    }
  } else {
    console.log(`▶ 正在执行: ${script.name}`);
    console.log('-'.repeat(50));
    console.log(output);
  }
}

// 明细统一落盘（两种模式都写，保证审计证据完整）
const reportsDir = path.resolve(SCRIPTS_DIR, '../reports');
fs.mkdirSync(reportsDir, { recursive: true });
const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const reportFile = path.join(reportsDir, `scan-${config.bankName}-${dateTag}.json`);
fs.writeFileSync(reportFile, JSON.stringify(scanReport, null, 2), 'utf-8');

console.log('══════════════════════════════════════════════');
console.log('              审查汇总结果');
console.log('══════════════════════════════════════════════');
console.log(`  银行: ${config.bankName}`);
console.log(`  通过: ${totalPassed} 项`);
console.log(`  失败: ${totalFailed} 项`);
console.log(`  明细: ${path.relative(process.cwd(), reportFile) || reportFile}`);
console.log('══════════════════════════════════════════════\n');

if (totalFailed > 0) {
  console.log('📋 修复建议:');
  console.log('  1. 将硬编码的中文按钮/标签文本改为 $t() 国际化调用');
  console.log(`  2. 在 ${config.bankName}Index.js 中注册缺失的路由映射`);
  console.log('  3. 确保 zh-CN.js 和 en-US.js 的键值同步\n');
}

process.exit(totalFailed > 0 ? 1 : 0);
