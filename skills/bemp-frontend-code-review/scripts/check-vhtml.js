/**
 * BEMP 前端代码审查 - v-html 安全检测
 *
 * 检测规则：
 * 1. 扫描所有 .vue 文件中是否使用了 v-html 指令
 * 2. v-html 直接渲染 HTML 存在 XSS 风险，应使用 v-text 或 h_ui 内置转义
 *
 * 严重程度：
 * - 阻塞：v-html 绑定用户输入变量（非静态字符串）
 * - 警告：v-html 使用（即使绑定静态字符串也需检查）
 *
 * 用法: node check-vhtml.js [--bank=hnnxbank]
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolvePath, PROJECT_ROOT } = require('./config-loader');

const config = loadConfig();
const TARGET_DIR = resolvePath(config.bankName, config.paths.vueDirTemplate);

const RESULTS = { blocking: [], serious: [], warning: [], info: [] };

function collectVueFiles(dir) {
  const files = [];
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'locale') {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.vue')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // 目录不存在或无权访问时跳过
    }
  }
  walk(dir);
  return files;
}

function isStaticString(value) {
  // v-html="'静态字符串'" 或 v-html='"静态字符串"' 视为静态
  const trimmed = value.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return true;
  }
  return false;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const shortPath = path.relative(PROJECT_ROOT, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 排除注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('<!--')) continue;

    const vhtmlMatch = line.match(/v-html\s*=\s*["'](.+?)["']/);
    if (!vhtmlMatch) continue;

    const value = vhtmlMatch[1];
    if (isStaticString(value)) {
      RESULTS.warning.push({
        file: shortPath,
        line: i + 1,
        rule: 'v-html 安全使用',
        description: `v-html 绑定静态字符串 "${value}"，建议确认无 XSS 风险`,
        severity: 'warning',
        code: line.trim()
      });
    } else {
      RESULTS.blocking.push({
        file: shortPath,
        line: i + 1,
        rule: 'v-html 禁止绑定动态变量',
        description: `v-html="${value}" 可能渲染用户输入，存在 XSS 风险，应改用 v-text 或 h_ui 组件`,
        severity: 'blocking',
        code: line.trim()
      });
    }
  }
}

function main() {
  console.log('\n============================================');
  console.log(`  BEMP 前端 v-html 安全检测报告 — [${config.bankName}]`);
  console.log('============================================\n');

  const files = collectVueFiles(TARGET_DIR);
  console.log(`扫描文件数: ${files.length}\n`);

  for (const file of files) {
    checkFile(file);
  }

  const totalBlocking = RESULTS.blocking.length;
  const totalWarning = RESULTS.warning.length;

  if (totalBlocking === 0 && totalWarning === 0) {
    console.log('✅ 未发现 v-html 使用，检查通过！');
  }

  if (totalBlocking > 0) {
    console.log(`🔴 发现 ${totalBlocking} 处 v-html 绑定动态变量:\n`);
    for (const item of RESULTS.blocking) {
      console.log(`  文件: ${item.file}`);
      console.log(`  行号: ${item.line}`);
      console.log(`  说明: ${item.description}`);
      console.log(`  代码: ${item.code}\n`);
    }
  }

  if (totalWarning > 0) {
    console.log(`🟡 发现 ${totalWarning} 处 v-html 绑定静态字符串:\n`);
    for (const item of RESULTS.warning) {
      console.log(`  文件: ${item.file}`);
      console.log(`  行号: ${item.line}`);
      console.log(`  说明: ${item.description}`);
      console.log(`  代码: ${item.code}\n`);
    }
  }

  console.log('============================================');
  if (totalBlocking === 0) {
    console.log('✅ v-html 安全检查通过！');
  } else {
    console.log('❌ 审查不通过：存在阻塞级问题，请修复后重试');
  }
  console.log('============================================\n');

  process.exitCode = totalBlocking > 0 ? 1 : 0;
}

main();