/**
 * BEMP 前端代码审查 - 硬编码中文文本检测
 *
 * 检测规则：
 * 1. <h-button> 标签内直接出现中文字符（应使用 $t() 国际化）
 * 2. <h-form-item> 的 label 属性直接写中文字符（应使用 $t() 国际化）
 * 3. <h-msg-box> / <h-modal> 的 title 属性直接写中文字符
 * 4. 排除规则：placeholder、info、content 属性中的中文允许硬编码
 *
 * 严重程度分级：
 * - 阻塞：按钮文本、表单标签、弹窗标题中直接出现中文
 * - 警告：其他标签中可能存在未国际化的中文文本
 *
 * 用法: node check-hardcode.js [--bank=hnnxbank]
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolvePath, PROJECT_ROOT } = require('./config-loader');

const config = loadConfig();
const TARGET_DIR = resolvePath(config.bankName, config.paths.vueDirTemplate);
const LOCALE_FILE = resolvePath(config.bankName, config.paths.zhCNTemplate);

const CHINESE_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf]+/;
const I18N_PATTERN = /\$t\(/;

const RESULTS = { blocking: [], serious: [], warning: [], info: [] };

function isChinese(text) {
  return CHINESE_PATTERN.test(text);
}

function hasI18n(text) {
  return I18N_PATTERN.test(text);
}

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
      // 目录不存在等异常，静默跳过
    }
  }
  walk(dir);
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const shortPath = path.relative(PROJECT_ROOT, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 检查 <h-button> 标签内直接出现中文
    if (line.match(/<h-button/) && isChinese(line) && !hasI18n(line)) {
      // 排除纯属性值中的中文（如 title 属性）
      if (checkButtonHardcode(line)) {
        RESULTS.blocking.push({
          file: shortPath,
          line: lineNum,
          rule: 'h-button 按钮文本国际化',
          description: '<h-button> 内部文本直接使用中文，应使用 $t() 国际化',
          snippet: line.trim(),
          severity: 'blocking'
        });
      }
    }

    // 检查 <h-form-item> label 属性直接使用中文
    if (line.match(/<h-form-item/) && line.includes(':label=') && isChinese(line) && !hasI18n(line) && !line.includes('placeholder')) {
      const chineseInLabel = extractChineseFromAttr(line, 'label');
      if (chineseInLabel) {
        RESULTS.blocking.push({
          file: shortPath,
          line: lineNum,
          rule: 'h-form-item label 国际化',
          description: ':label 属性中直接使用中文，应使用 $t() 国际化',
          snippet: line.trim(),
          severity: 'blocking'
        });
        continue;
      }
    }

    // 检查弹窗标题中文
    if ((line.includes('slot="header"') || line.includes('<span')) && line.match(/(新增|修改|查看|删除|同步)/) && isChinese(line) && !hasI18n(line)) {
      // 这些在 slot="header" 内的中文span可能是弹窗标题
      if (line.match(/v-if.*type.*==.*(add|modify|view|sync)/) || line.match(/v-if/)) {
        RESULTS.blocking.push({
          file: shortPath,
          line: lineNum,
          rule: '弹窗标题国际化',
          description: '弹窗标题文本直接使用中文，应使用 $t() 国际化',
          snippet: line.trim(),
          severity: 'blocking'
        });
      }
    }
  }
}

function checkButtonHardcode(line) {
  // 如果button内部有 $t() 调用则认为通过
  if (line.includes('$t(')) return false;
  // 提取 > 和 < 之间的文本
  const match = line.match(/>([^<]*[\u4e00-\u9fff][^<]*)</);
  if (match && isChinese(match[1])) return true;
  return false;
}

function extractChineseFromAttr(line, attrName) {
  const regex = new RegExp(`:${attrName}\\s*=\\s*"([^"]*)"`);
  const match = line.match(regex);
  if (match && isChinese(match[1]) && !match[1].includes('$t(')) return match[1];
  return null;
}

function printResults(bankName) {
  console.log('\n============================================');
  console.log(`  BEMP 前端硬编码中文文本检测报告 — [${bankName}]`);
  console.log('============================================\n');

  const allCount = Object.values(RESULTS).reduce((sum, arr) => sum + arr.length, 0);
  if (allCount === 0) {
    console.log('✅ 未发现硬编码中文文本，所有检查项通过！\n');
    return;
  }

  console.log(`🔴 阻塞问题: ${RESULTS.blocking.length} 个`);
  console.log(`🟠 严重问题: ${RESULTS.serious.length} 个`);
  console.log(`🟡 警告问题: ${RESULTS.warning.length} 个`);
  console.log(`🟢 提示信息: ${RESULTS.info.length} 个\n`);

  for (const [level, items] of Object.entries(RESULTS)) {
    if (items.length === 0) continue;
    const labels = { blocking: '🔴 阻塞问题', serious: '🟠 严重问题', warning: '🟡 警告问题', info: '🟢 提示信息' };
    console.log(`${'─'.repeat(50)}`);
    console.log(`${labels[level]} (${items.length}个)`);
    console.log(`${'─'.repeat(50)}`);

    for (const item of items) {
      console.log(`\n  文件: ${item.file}`);
      console.log(`  行号: ${item.line}`);
      console.log(`  规则: ${item.rule}`);
      console.log(`  说明: ${item.description}`);
      console.log(`  代码: ${item.snippet.trim().substring(0, 120)}`);
    }
  }

  console.log('\n============================================');
  if (RESULTS.blocking.length > 0) {
    console.log('❌ 审查不通过：存在阻塞级问题，请修复后重试');
  } else {
    console.log('✅ 审查通过：无阻塞级问题');
  }
  console.log('============================================\n');
}

// 主流程
function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`错误: 目标目录不存在 — ${TARGET_DIR}`);
    console.error(`请确认银行 "${config.bankName}" 的 Vue 文件目录存在，或通过 --bank=xxx 切换`);
    process.exit(1);
  }

  const files = collectVueFiles(TARGET_DIR);
  console.log(`审查银行: ${config.bankName}`);
  console.log(`扫描目标: ${files.length} 个 Vue 文件\n`);

  for (const file of files) {
    analyzeFile(file);
  }

  printResults(config.bankName);

  if (RESULTS.blocking.length > 0) {
    process.exitCode = 1;
  }
}

main();