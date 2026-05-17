/**
 * BEMP 前端代码审查 - 路由注册完整性检查
 *
 * 检测规则：
 * 1. 银行目录下每个 .vue 文件必须在对应的 {bankName}Index.js 中有路由映射
 * 2. {bankName}Index.js 中注册的路径必须对应存在的 .vue 文件
 * 3. 路由映射路径格式检查
 *
 * 严重程度分级：
 * - 阻塞：.vue 文件存在但未注册路由映射 / 映射路径对应的 .vue 文件不存在
 * - 警告：路由路径格式不规范
 *
 * 用法: node check-routes.js [--bank=hnnxbank]
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolvePath, PROJECT_ROOT } = require('./config-loader');

const config = loadConfig();
const VUE_DIR = resolvePath(config.bankName, config.paths.vueDirTemplate);
const INDEX_FILE = resolvePath(config.bankName, config.paths.apiIndexTemplate);

const RESULTS = { blocking: [], serious: [], warning: [], info: [] };

function collectVueFiles(dir) {
  const files = [];
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory() && entry.name !== 'components' && entry.name !== 'locale') {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.vue')) {
          const relative = path.relative(VUE_DIR, fullPath).replace(/\\/g, '/');
          files.push(relative);
        }
      }
    } catch (e) {
      // 静默跳过
    }
  }
  walk(dir);
  return files;
}

function parseIndexMappings(content, bankName) {
  const mappings = {};
  const escapedBank = bankName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `'([^']+)'\\s*:\\s*\\(\\)\\s*=>\\s*import\\([^\`]*\`@\\/views\\/bizViews\\/banks\\/${escapedBank}\\/([^\`]+)\\.vue\`\\)`,
    'g'
  );
  let match;
  while ((match = regex.exec(content)) !== null) {
    const routePath = match[1];
    const componentPath = match[2].replace(/\\/g, '/');
    mappings[routePath] = {
      routePath,
      componentPath: componentPath,
      expectedVueFile: componentPath + '.vue'
    };
  }
  return mappings;
}

function main() {
  if (!fs.existsSync(VUE_DIR)) {
    console.error(`错误: Vue目录不存在 — ${VUE_DIR}`);
    console.error(`请确认银行 "${config.bankName}" 的 Vue 文件目录存在，或通过 --bank=xxx 切换`);
    process.exit(1);
  }
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`错误: 路由配置文件不存在 — ${INDEX_FILE}`);
    process.exit(1);
  }

  const vueFiles = collectVueFiles(VUE_DIR);
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const mappings = parseIndexMappings(indexContent, config.bankName);

  console.log('\n============================================');
  console.log(`  BEMP 前端路由注册完整性检查报告 — [${config.bankName}]`);
  console.log('============================================');
  console.log(`  Vue 文件总数: ${vueFiles.length}`);
  console.log(`  路由映射总数: ${Object.keys(mappings).length}\n`);

  // 检查1: .vue文件是否有路由映射
  const mappedFiles = new Set();
  for (const [, mapping] of Object.entries(mappings)) {
    mappedFiles.add(mapping.expectedVueFile);
  }

  let unmappedCount = 0;
  for (const vueFile of vueFiles) {
    if (!mappedFiles.has(vueFile)) {
      unmappedCount++;
      RESULTS.blocking.push({
        file: vueFile,
        rule: '路由映射缺失',
        description: `Vue 文件存在但未在 hnnxbankIndex.js 中注册路由映射`,
        severity: 'blocking'
      });
    }
  }

  // 检查2: 映射的路径对应的.vue文件是否存在
  let orphanedCount = 0;
  for (const [routePath, mapping] of Object.entries(mappings)) {
    if (!vueFiles.includes(mapping.expectedVueFile)) {
      orphanedCount++;
      RESULTS.blocking.push({
        rule: '路由映射指向文件不存在',
        description: `路由 "${routePath}" 映射到 "${mapping.expectedVueFile}"，但该文件不存在`,
        severity: 'blocking'
      });
    }
  }

  // 检查3: 路由路径格式
  for (const [routePath] of Object.entries(mappings)) {
    if (routePath.startsWith('//')) {
      RESULTS.warning.push({
        rule: '路由路径格式',
        description: `路由路径 "${routePath}" 以 "//" 开头，可能不符合规范`,
        severity: 'warning'
      });
    }
  }

  // 输出结果
  if (unmappedCount > 0) {
    console.log('🔴 未注册路由映射的 Vue 文件:');
    for (const item of RESULTS.blocking.filter(r => r.rule === '路由映射缺失')) {
      console.log(`   - ${item.file}`);
    }
    console.log();
  }

  if (orphanedCount > 0) {
    console.log('🔴 指向不存在文件的路由映射:');
    for (const item of RESULTS.blocking.filter(r => r.rule === '路由映射指向文件不存在')) {
      console.log(`   - ${item.description}`);
    }
    console.log();
  }

  const totalBlocking = RESULTS.blocking.length;
  const totalWarning = RESULTS.warning.length;

  console.log('============================================');
  if (totalBlocking === 0) {
    console.log('✅ 路由注册完整性检查通过！');
  } else {
    console.log(`❌ 发现 ${totalBlocking} 个阻塞级问题，${totalWarning} 个警告`);
  }
  console.log('============================================\n');

  if (totalBlocking > 0) {
    console.log('📋 统计摘要:');
    console.log(`   总计 Vue 文件: ${vueFiles.length}`);
    console.log(`   已注册路由: ${Object.keys(mappings).length}`);
    console.log(`   未注册路由: ${unmappedCount}`);
    console.log(`   孤儿映射: ${orphanedCount}\n`);
  }
}

main();