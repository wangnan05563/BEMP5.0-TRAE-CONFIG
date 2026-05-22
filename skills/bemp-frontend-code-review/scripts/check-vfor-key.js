/**
 * BEMP 前端代码审查 - v-for :key 绑定检测
 *
 * 检测规则：
 * 1. 扫描所有 .vue 文件中 v-for 指令是否紧跟 :key 绑定
 * 2. v-for 缺 :key 会导致 DOM 复用异常，影响列表渲染正确性和性能
 *
 * 严重程度：
 * - 阻塞：v-for 未绑定 :key（性能规范强制要求）
 *
 * 用法: node check-vfor-key.js [--bank=hnnxbank]
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

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const shortPath = path.relative(PROJECT_ROOT, filePath);

  // 逐行扫描：记录 v-for 出现的行号，在同一行或后续行查找 :key
  const lines = content.split('\n');
  const vforLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bv-for\b/.test(line)) {
      // 同一行有 :key 则通过
      if (/:key\b/.test(line)) continue;
      // 向后搜索（最多5行）查找 :key
      let foundKey = false;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        if (/:key\b/.test(lines[j])) {
          foundKey = true;
          break;
        }
        // 遇到标签闭合 > 说明当前标签结束，不再搜索
        if (/>/.test(lines[j])) break;
      }
      if (!foundKey) {
        RESULTS.blocking.push({
          file: shortPath,
          line: i + 1,
          rule: 'v-for 必须绑定 :key',
          description: 'v-for 指令缺少 :key 绑定，会导致 DOM 复用异常和性能问题',
          severity: 'blocking',
          code: line.trim().length > 120 ? line.trim().substring(0, 120) + '...' : line.trim()
        });
      }
    }
  }
}

function main() {
  console.log('\n============================================');
  console.log(`  BEMP 前端 v-for :key 绑定检测报告 — [${config.bankName}]`);
  console.log('============================================\n');

  const files = collectVueFiles(TARGET_DIR);
  console.log(`扫描文件数: ${files.length}\n`);

  for (const file of files) {
    checkFile(file);
  }

  const totalBlocking = RESULTS.blocking.length;

  if (totalBlocking === 0) {
    console.log('✅ 所有 v-for 均已绑定 :key，检查通过！');
  } else {
    console.log(`🔴 发现 ${totalBlocking} 处 v-for 缺少 :key:\n`);
    for (const item of RESULTS.blocking) {
      console.log(`  文件: ${item.file}`);
      console.log(`  行号: ${item.line}`);
      console.log(`  说明: ${item.description}`);
      console.log(`  代码: ${item.code}\n`);
    }
  }

  console.log('============================================');
  if (totalBlocking === 0) {
    console.log('✅ v-for :key 检查通过！');
  } else {
    console.log('❌ 审查不通过：存在阻塞级问题，请修复后重试');
  }
  console.log('============================================\n');

  process.exitCode = totalBlocking > 0 ? 1 : 0;
}

main();