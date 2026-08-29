/**
 * BEMP 前端代码审查 - 弹窗组件开发规约检测（W8 实战沉淀 J-HD1 / J-SC1）
 *
 * 检测规则（阈值与特征全部来自 review-config.json，零硬编码）：
 * 1. J-HD1 弹窗内嵌 h-datagrid 数据同步：
 *    弹窗块内的 <h-datagrid> 必须同时具备 v-if（实例随弹窗重建）
 *    和 :autoLoad="false"（禁用自动加载，数据由父级赋值后经 watcher 同步）。
 *    根因：HUI Datagrid 的 gridData watcher 无 immediate，弹窗复用旧实例时首帧必空。
 * 2. J-SC1 scoped 样式命中子组件 render 元素：
 *    <style scoped> 块内出现 HUI 子组件内部结构类选择器时告警——
 *    scoped 属性选择器只命中本组件模板节点，深层 render 元素必然落空，
 *    应移入独立非 scoped 块并用唯一类名前缀隔离。
 *
 * 用法: node check-dialog-component.js [--bank=hnnxbank]
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolvePath, PROJECT_ROOT } = require('./config-loader');

const config = loadConfig();

// 规则参数统一从配置读取，便于不同银行/项目按需调整而不改脚本
const RULES = config.dialogComponentCheck || {
  enabled: true,
  datagridAutoLoadValues: ['false'],
  huiInternalClassPrefixes: ['.ivu-table-', '.h-table-', '.h-checkbox-', '.h-radio-', '.h-select-dropdown'],
  severity: 'warning'
};

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
      // 目录不存在等异常，静默跳过
    }
  }
  walk(dir);
  return files;
}

/**
 * 从 startLine 起收集一个完整标签（处理属性跨行），返回 { text, endLine }
 */
function collectTag(lines, startIdx) {
  let text = '';
  let i = startIdx;
  while (i < lines.length) {
    text += lines[i] + '\n';
    // 标签在出现非自闭合结束“>”且不处于字符串/注释时视为完整（简化判断：行尾含 > 或 />）
    if (/>\s*$/.test(lines[i]) && text.length < 4000) {
      return { text, endLine: i };
    }
    i++;
  }
  return { text, endLine: i - 1 };
}

/**
 * J-HD1：扫描 h-msg-box 块内 h-datagrid 是否满足 v-if + autoLoad=false
 */
function analyzeDialogDatagrid(lines, shortPath) {
  let i = 0;
  while (i < lines.length) {
    if (/<h-msg-box[\s>]/.test(lines[i])) {
      // 定位弹窗块结束行（简化：找配对闭合标签）
      let boxEnd = lines.length - 1;
      for (let j = i + 1; j < lines.length; j++) {
        if (/<\/h-msg-box>/.test(lines[j])) { boxEnd = j; break; }
      }
      // 块内逐个 h-datagrid 检查
      for (let k = i + 1; k < boxEnd; k++) {
        if (/<h-datagrid[\s>]/.test(lines[k])) {
          const tag = collectTag(lines, k);
          // url 模式由组件远程加载，父级可手动 loadData 控制，不属于“父级异步传入”强制场景（豁免可通过配置关闭）
          const excludeAttr = RULES.excludeWhenAttr || [];
          if (excludeAttr.some(attr => new RegExp(`(?::|v-bind:)?${attr}\\s*=`).test(tag.text))) {
            k = tag.endLine;
            continue;
          }
          const hasVIf = /v-if\s*=/.test(tag.text);
          const autoLoadRe = /(?::|v-bind:)?autoLoad\s*=\s*"([^"]*)"/;
          const m = tag.text.match(autoLoadRe);
          const hasAutoLoadOff = m && RULES.datagridAutoLoadValues.includes(m[1].toLowerCase());
          if (!hasVIf || !hasAutoLoadOff) {
            const missing = [];
            if (!hasVIf) missing.push('v-if（实例需随弹窗重建）');
            if (!hasAutoLoadOff) missing.push(':autoLoad="false"（需禁用自动加载）');
            RESULTS[RULES.severity].push({
              file: shortPath,
              line: k + 1,
              rule: 'J-HD1 弹窗内嵌 Datagrid 数据同步',
              description: `弹窗内 h-datagrid 缺少：${missing.join('、')}。否则首帧渲染空数据或残留上一次数据`,
              snippet: tag.text.trim().split('\n')[0],
              severity: RULES.severity
            });
          }
          k = tag.endLine; // 跳过已收集的跨行属性
        }
      }
      i = boxEnd;
    }
    i++;
  }
}

/**
 * J-SC1：扫描 <style scoped> 块内是否出现 HUI 子组件内部结构类选择器
 */
function analyzeScopedStyle(content, lines, shortPath) {
  const blockRe = /<style[^>]*\bscoped\b[^>]*>([\s\S]*?)(?:<\/style>|$)/gi;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    const blockText = m[1];
    const startLine = content.substring(0, m.index).split('\n').length;
    for (const prefix of RULES.huiInternalClassPrefixes) {
      const idx = blockText.indexOf(prefix);
      if (idx !== -1) {
        RESULTS[RULES.severity].push({
          file: shortPath,
          line: startLine + blockText.substring(0, idx).split('\n').length - 1,
          rule: 'J-SC1 scoped 样式命中子组件 render 元素',
          description: `scoped 块内使用子组件内部类 ${prefix}*：scoped 属性选择器无法命中 render 生成的深层元素，应移入独立非 scoped 块并用唯一类名前缀隔离`,
          snippet: blockText.substring(idx, idx + 80).split('\n')[0],
          severity: RULES.severity
        });
      }
    }
  }
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const shortPath = path.relative(PROJECT_ROOT, filePath);
  analyzeDialogDatagrid(lines, shortPath);
  analyzeScopedStyle(content, lines, shortPath);
}

function printResults(bankName) {
  console.log('\n============================================');
  console.log(`  BEMP 弹窗组件规约检测报告 — [${bankName}]`);
  console.log('============================================\n');

  const allCount = Object.values(RESULTS).reduce((sum, arr) => sum + arr.length, 0);
  if (allCount === 0) {
    console.log('✅ 未发现弹窗组件规约问题，所有检查项通过！\n');
    return;
  }

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
  if (RESULTS.blocking.length > 0 || RESULTS.serious.length > 0) {
    console.log('❌ 审查不通过：存在阻塞/严重级问题，请修复后重试');
  } else {
    console.log('✅ 审查通过：无阻塞级问题（仅警告级，建议修复）');
  }
  console.log('============================================\n');
}

function main() {
  if (RULES.enabled === false) {
    console.log('弹窗组件规约检查已在配置中禁用（dialogComponentCheck.enabled=false），跳过');
    return;
  }

  const TARGET_DIR = resolvePath(config.bankName, config.paths.vueDirTemplate);
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

  if (RESULTS.blocking.length > 0 || RESULTS.serious.length > 0) {
    process.exitCode = 1;
  }
}

main();
