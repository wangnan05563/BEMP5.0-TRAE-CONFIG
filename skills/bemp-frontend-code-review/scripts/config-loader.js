/**
 * BEMP 前端代码审查 — 配置文件加载共享模块
 *
 * 所有检查脚本通过 require('../review-config.json') 引入此模块获取统一配置。
 * 支持通过命令行参数 --bank=xxx 动态切换银行。
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../../../../');

/**
 * 解析命令行参数中的 --bank=xxx
 * unionbank = "hnnxbank|huisbank|jinzbank|huzbank|hxbank|yibbank|tianjbank|shaoxbank|qinnbank|nmgbank|hlsecurity|fxbank"
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

  // CLI 参数覆盖
  const cliBank = parseCliBankName();
  if (cliBank) {
    if (!config.availableBanks.includes(cliBank)) {
      console.error(`错误: 未知银行 "${cliBank}"，可用银行: ${config.availableBanks.join(', ')}`);
      process.exit(1);
    }
    config.bankName = cliBank;
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

module.exports = { loadConfig, resolvePath, PROJECT_ROOT, parseCliBankName };