/**
 * BEMP 前端代码审查 — 配置文件加载共享模块
 *
 * 所有检查脚本通过 require('./config-loader') 引入此模块获取统一配置。
 *
 * 当前银行解析链（单一事实源为 _shared/env-config.json，切换银行只改该文件或环境变量）：
 *   1. CLI 参数 --bank=xxx（临时，仅本次审查）
 *   2. 环境变量 BANK_CODE
 *   3. _shared/env-config.json 的 environmentDefaults.BANK_CODE
 *   4. review-config.json 的 bankName（兼容遗留，建议删除该字段）
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const SHARED_ENV_CONFIG = path.resolve(__dirname, '../../_shared/env-config.json');

/**
 * 解析命令行参数中的 --bank=xxx
 * @returns {string|null}
 */
function parseCliBankName() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    const match = arg.match(/^--bank=(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * 从 _shared/env-config.json 读取指定环境变量的默认值（environmentDefaults）
 * @param {string} varName
 * @returns {string|null}
 */
function readSharedDefault(varName) {
  try {
    const shared = JSON.parse(fs.readFileSync(SHARED_ENV_CONFIG, 'utf-8'));
    const defaults = shared.environmentDefaults || {};
    return defaults[varName] || null;
  } catch (e) {
    return null;
  }
}

/**
 * 解析当前银行：CLI > 环境变量 > _shared 默认值 > 配置文件遗留字段
 * @param {object} config
 * @returns {string}
 */
function resolveBankName(config) {
  const candidates = [
    parseCliBankName(),
    process.env.BANK_CODE || null,
    readSharedDefault('BANK_CODE'),
    config.bankName || null
  ];
  const bank = candidates.find(v => v && v.trim());
  if (!bank) {
    console.error('错误: 无法确定当前银行。请设置环境变量 $env:BANK_CODE 或编辑 _shared/env-config.json environmentDefaults.BANK_CODE');
    process.exit(1);
  }
  return bank.trim();
}

/**
 * 加载并解析配置
 * @returns {{ bankName: string, paths: object, availableBanks: string[] }}
 */
function loadConfig() {
  let config;
  try {
    config = require('./review-config.json');
  } catch (e) {
    console.error('错误: 无法读取 review-config.json，请确认文件存在');
    process.exit(1);
  }

  config.bankName = resolveBankName(config);

  // 可用银行白名单校验（列表本身来自 review-config.json，属技能能力范围配置而非“当前银行”硬编码）
  if (config.availableBanks && !config.availableBanks.includes(config.bankName)) {
    console.error(`错误: 银行 "${config.bankName}" 不在 availableBanks 白名单中，可用: ${config.availableBanks.join(', ')}；或将其加入白名单`);
    process.exit(1);
  }

  return config;
}

/**
 * 根据 bankName 解析模板路径为绝对路径
 * @param {string} template - 包含 {bankName} 占位符的路径模板
 * @returns {string}
 */
function resolvePath(bankName, template) {
  const relativePath = template.replace('{bankName}', bankName);
  return path.resolve(PROJECT_ROOT, relativePath);
}

module.exports = { loadConfig, resolvePath, PROJECT_ROOT, parseCliBankName, resolveBankName, readSharedDefault };