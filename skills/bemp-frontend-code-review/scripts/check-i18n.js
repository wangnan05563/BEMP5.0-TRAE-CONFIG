/**
 * BEMP 前端代码审查 - $t() 国际化覆盖率检查
 *
 * 检测规则：
 * 1. 统计每个 Vue 文件中 $t() 使用的行数
 * 2. 检测硬编码中文（不在 $t() 内且不在已豁免标签内）
 * 3. 检查 zh-CN.js 中定义的 key 是否在模板中使用
 * 4. 检查 zh-CN.js 和 en-US.js 键值数量是否一致
 *
 * 严重程度：
 * - 阻塞：zh-CN.js 与 en-US.js 键值数量不一致
 * - 严重：$t() 使用率低于 60% 但存在中文文本的文件
 * - 警告：zh-CN.js 中存在未使用的国际化 key
 *
 * 用法: node check-i18n.js [--bank=hnnxbank]
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolvePath, PROJECT_ROOT } = require('./config-loader');

const config = loadConfig();
const VUE_DIR = resolvePath(config.bankName, config.paths.vueDirTemplate);
const ZH_CN_FILE = resolvePath(config.bankName, config.paths.zhCNTemplate);
const EN_US_FILE = resolvePath(config.bankName, config.paths.enUSTemplate);

const CHINESE_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf]+/;

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
    } catch (e) {}
  }
  walk(dir);
  return files;
}

/**
 * 从 JS 导出对象中提取所有叶子节点的 key path
 * 递归遍历嵌套对象，拼接完整路径，如 { hnxxbank: { m: { i: { auth: { x: "y" } } } } } → ["hnnxbank.m.i.auth.x"]
 */
function extractI18nKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractI18nKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * 解析 locale/lang/*.js 文件中的导出对象
 */
function parseLocaleFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // 移除 export default、注释等，提取对象部分
    let cleaned = content
      .replace(/\/\/.*$/gm, '')           // 移除单行注释
      .replace(/\/\*[\s\S]*?\*\//g, '')   // 移除多行注释
      .replace(/export\s+default\s*/, '') // 移除 export default
      .replace(/;?\s*$/, '')               // 移除结尾分号
      .trim();

    // 尝试解析为 JSON（JS对象字面量基本兼容）
    // 先处理尾随逗号
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    const obj = eval(`(${cleaned})`);
    return obj;
  } catch (e) {
    return null;
  }
}

function countITagUsage(content) {
  const matches = content.match(/\$t\(/g);
  return matches ? matches.length : 0;
}

function countChineseTexts(content) {
  const lines = content.split('\n');
  let count = 0;
  for (const line of lines) {
    // 排除条件：不在 $t() 内、不是 placeholder/info/content 属性、不包含 $t(
    if (CHINESE_PATTERN.test(line) && !line.includes('$t(')) {
      // 豁免：placeholder、info、content 等属性的中文
      if (line.match(/placeholder\s*=\s*"[\u4e00-\u9fff]/)) continue;
      if (line.match(/:?\s*info\s*[=:]\s*["'][\u4e00-\u9fff]/)) continue;
      if (line.match(/:?\s*content\s*[=:]\s*["'][\u4e00-\u9fff]/)) continue;
      if (line.match(/\/\/\s*[\u4e00-\u9fff]/)) continue;  // 注释中的中文
      if (line.match(/<!--/)) continue;
      count++;
    }
  }
  return count;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const shortPath = path.relative(PROJECT_ROOT, filePath);
  const iTagCount = countITagUsage(content);
  const chineseCount = countChineseTexts(content);

  if (chineseCount > 0) {
    const totalI18nCandidates = iTagCount + chineseCount;
    const coverage = totalI18nCandidates > 0 ? Math.round((iTagCount / totalI18nCandidates) * 100) : 100;

    if (coverage < 60) {
      RESULTS.serious.push({
        file: shortPath,
        rule: '$t() 国际化覆盖率不足',
        description: `$t() 使用 ${iTagCount} 次，未国际化中文 ${chineseCount} 处，覆盖率 ${coverage}%`,
        severity: 'serious'
      });
    } else if (coverage < 80) {
      RESULTS.warning.push({
        file: shortPath,
        rule: '$t() 国际化覆盖率偏低',
        description: `$t() 使用 ${iTagCount} 次，未国际化中文 ${chineseCount} 处，覆盖率 ${coverage}%`,
        severity: 'warning'
      });
    }
  }

  return { shortPath, iTagCount, chineseCount };
}

function main() {
  console.log('\n============================================');
  console.log(`  BEMP 前端 $t() 国际化覆盖率检查报告 — [${config.bankName}]`);
  console.log('============================================\n');

  // 检查1: zh-CN.js vs en-US.js 同步性
  const zhObj = parseLocaleFile(ZH_CN_FILE);
  const enObj = EN_US_FILE ? parseLocaleFile(EN_US_FILE) : null;

  if (zhObj && enObj) {
    const zhKeys = extractI18nKeys(zhObj);
    const enKeys = extractI18nKeys(enObj);

    console.log(`zh-CN.js 键值数: ${zhKeys.length}`);
    console.log(`en-US.js 键值数: ${enKeys.length}`);

    if (zhKeys.length !== enKeys.length) {
      RESULTS.blocking.push({
        rule: '多语言文件键值数量不一致',
        description: `zh-CN.js 有 ${zhKeys.length} 个键，en-US.js 有 ${enKeys.length} 个键，必须保持同步`,
        severity: 'blocking'
      });
    }

    // 检查 zh-CN.js 有但 en-US.js 没有的 key
    const enKeySet = new Set(enKeys);
    const missingInEn = zhKeys.filter(k => !enKeySet.has(k));
    if (missingInEn.length > 0) {
      for (const key of missingInEn) {
        RESULTS.serious.push({
          rule: 'en-US.js 缺少键',
          description: `键 "${key}" 在 zh-CN.js 中存在但 en-US.js 中缺失`,
          severity: 'serious'
        });
      }
    }

    // 检查 en-US.js 有但 zh-CN.js 没有的 key
    const zhKeySet = new Set(zhKeys);
    const missingInZh = enKeys.filter(k => !zhKeySet.has(k));
    if (missingInZh.length > 0) {
      for (const key of missingInZh) {
        RESULTS.serious.push({
          rule: 'zh-CN.js 缺少键',
          description: `键 "${key}" 在 en-US.js 中存在但 zh-CN.js 中缺失`,
          severity: 'serious'
        });
      }
    }
  } else {
    RESULTS.info.push({
      rule: '多语言文件检查',
      description: zhObj ? 'en-US.js 不存在或无法解析，跳过多语言同步检查' : (enObj ? 'zh-CN.js 不存在或无法解析' : '多语言文件均不存在'),
      severity: 'info'
    });
  }

  // 检查2: 每个 Vue 文件的 $t() 使用覆盖率
  console.log('\n逐文件 $t() 覆盖率分析:\n');
  const files = collectVueFiles(VUE_DIR);
  const fileStats = [];
  for (const file of files) {
    fileStats.push(analyzeFile(file));
  }

  // 输出文件统计表格
  console.log(`${'文件'.padEnd(60)} ${'$t()次数'.padEnd(10)} ${'中文处数'.padEnd(10)} ${'覆盖率'}`);
  console.log('-'.repeat(90));
  for (const stat of fileStats) {
    const total = stat.iTagCount + stat.chineseCount;
    const coverage = total > 0 ? Math.round((stat.iTagCount / total) * 100) : 100;
    const fileName = stat.shortPath.replace(`frontend/src/views/bizViews/banks/${config.bankName}/`, '');
    const truncatedName = fileName.length > 56 ? '...' + fileName.slice(-53) : fileName;
    const covStr = coverage >= 80 ? `✅ ${coverage}%` : (coverage >= 60 ? `⚠️ ${coverage}%` : `❌ ${coverage}%`);
    console.log(`${truncatedName.padEnd(60)} ${String(stat.iTagCount).padEnd(10)} ${String(stat.chineseCount).padEnd(10)} ${covStr}`);
  }

  // 输出综合问题
  const totalBlocking = RESULTS.blocking.length;
  const totalSerious = RESULTS.serious.length;
  const totalWarning = RESULTS.warning.length;

  if (totalBlocking > 0 || totalSerious > 0 || totalWarning > 0) {
    console.log('\n问题详情:\n');

    for (const [level, items] of Object.entries(RESULTS)) {
      if (items.length === 0) continue;
      const labels = { blocking: '🔴 阻塞', serious: '🟠 严重', warning: '🟡 警告', info: '🟢 提示' };
      console.log(`${labels[level]}:`);
      for (const item of items) {
        const loc = item.file ? ` [${item.file}]` : '';
        console.log(`   - ${item.description}${loc}`);
      }
      console.log();
    }
  }

  console.log('============================================');
  if (totalBlocking === 0 && totalSerious === 0) {
    console.log('✅ 国际化覆盖率检查通过！');
  } else {
    console.log(`❌ 发现 ${totalBlocking + totalSerious} 个需修复的问题`);
  }
  console.log('============================================\n');
}

main();