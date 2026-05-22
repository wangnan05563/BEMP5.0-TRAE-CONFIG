/**
 * BEMP 前端代码审查 - extParam 禁用检测
 *
 * 检测规则：
 * 1. 扫描所有 .vue 文件中是否使用了 extParam 参数传递方式
 * 2. extParam 是旧版 API 参数格式，项目已禁止使用，应改用 requestDto 包装
 *
 * 严重程度：
 * - 阻塞：任何文件中出现 extParam 使用
 *
 * 用法: node check-extparam.js [--bank=hnnxbank]
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
  const lines = content.split('\n');
  const shortPath = path.relative(PROJECT_ROOT, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 排除注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) continue;

    if (/\bextParam\b/.test(line)) {
      RESULTS.blocking.push({
        file: shortPath,
        line: i + 1,
        rule: '禁止使用 extParam',
        description: '项目已禁止 extParam 参数格式，应改用 requestDto 包装',
        severity: 'blocking',
        code: line.trim()
      });
    }
  }
}

function main() {
  console.log('\n============================================');
  console.log(`  BEMP 前端 extParam 禁用检测报告 — [${config.bankName}]`);
  console.log('============================================\n');

  const files = collectVueFiles(TARGET_DIR);
  console.log(`扫描文件数: ${files.length}\n`);

  for (const file of files) {
    checkFile(file);
  }

  const totalBlocking = RESULTS.blocking.length;

  if (totalBlocking === 0) {
    console.log('✅ 未发现 extParam 使用，检查通过！');
  } else {
    console.log(`🔴 发现 ${totalBlocking} 处 extParam 使用:\n`);
    for (const item of RESULTS.blocking) {
      console.log(`  文件: ${item.file}`);
      console.log(`  行号: ${item.line}`);
      console.log(`  说明: ${item.description}`);
      console.log(`  代码: ${item.code}\n`);
    }
  }

  console.log('============================================');
  if (totalBlocking === 0) {
    console.log('✅ extParam 检查通过！');
  } else {
    console.log('❌ 审查不通过：存在阻塞级问题，请修复后重试');
  }
  console.log('============================================\n');

  process.exitCode = totalBlocking > 0 ? 1 : 0;
}

main();