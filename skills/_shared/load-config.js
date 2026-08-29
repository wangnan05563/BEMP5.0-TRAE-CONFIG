/**
 * BEMP 技能库权威配置加载器（Node.js 版）。
 *
 * 为什么存在：技能 config JSON 中的 ${ENV:VAR} 是占位符，直接 require 得到的是
 * 字面量——这是"技能调用时找不到配置参数"的根因。所有取值必须经本模块解析，
 * 禁止各技能手写解析逻辑（历史分散实现已收敛至此，语义与 load_config.py / Resolve-EnvConfig.ps1 对齐）。
 *
 * 解析链：环境变量 > _shared/env-config.json 的 environmentDefaults > ${ENV:VAR:default} 内联默认值
 *
 * 用法：
 *   const { loadResolved, getValue } = require('../../_shared/load-config');
 *   const cfg = loadResolved(path.join(__dirname, '../config/review-config.json'));
 *   CLI: node load-config.js --file <config.json> [--get a.b.c] [--lenient]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SHARED_DIR = __dirname;
const ENV_CONFIG_PATH = path.join(SHARED_DIR, 'env-config.json');
// 嵌套引用上限：超限视为配置循环引用，硬失败防止栈溢出
const MAX_NEST_DEPTH = 6;

const PLACEHOLDER_RE = /\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}/g;

let envDefaultsCache = null;

function envDefaults() {
  if (envDefaultsCache === null) {
    try {
      envDefaultsCache = JSON.parse(fs.readFileSync(ENV_CONFIG_PATH, 'utf8')).environmentDefaults || {};
    } catch (e) {
      // 与 Python 版语义一致：加载失败不抛，让 resolve 阶段给出明确缺参报错
      envDefaultsCache = {};
    }
  }
  return envDefaultsCache;
}

function resolveValue(value, strict = true, depth = 0) {
  if (depth > MAX_NEST_DEPTH) {
    throw new Error(`占位符嵌套解析超过 ${MAX_NEST_DEPTH} 层，疑似循环引用: ${value}`);
  }
  if (typeof value !== 'string' || !value.includes('${ENV:')) return value;

  const resolved = value.replace(PLACEHOLDER_RE, (raw, varName, inlineDefault) => {
    let v = process.env[varName];
    if (v) return v;
    v = envDefaults()[varName];
    if (v !== undefined && v !== '') return String(v);
    if (inlineDefault !== undefined) return inlineDefault;
    if (strict) {
      throw new Error(
        `无法解析 \${ENV:${varName}}：环境变量未设置、_shared/env-config.json environmentDefaults ` +
        `无默认值、且无内联默认值。修复：编辑 _shared/env-config.json 或执行 ` +
        `powershell -File ${path.join(SHARED_DIR, 'doctor-config.ps1')} 查看全量诊断`);
    }
    return raw;
  });

  // 解析结果可能仍含占位符（嵌套引用），递归到不动点
  if (resolved !== value && resolved.includes('${ENV:')) {
    return resolveValue(resolved, strict, depth + 1);
  }
  return resolved;
}

function resolveNode(node, strict) {
  if (typeof node === 'string') return resolveValue(node, strict);
  if (Array.isArray(node)) return node.map((i) => resolveNode(i, strict));
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      // key 也可能承载占位符（如 banks 的 key 写作 ${ENV:BANK_CODE}），
      // 只解析 value 会导致 banks[active_bank] 取空——W9 加固实证缺陷。
      // `_` 前缀 key 是文档/元字段（_doc/_comment/_envConfigNote），其中的
      // ${ENV:VAR_NAME} 只是示例文本，key 和 value 均不参与解析
      if (k.startsWith('_')) {
        out[k] = v;
        continue;
      }
      out[resolveValue(k, strict)] = resolveNode(v, strict);
    }
    return out;
  }
  return node;
}

function loadResolved(configPath, strict = true) {
  return resolveNode(JSON.parse(fs.readFileSync(configPath, 'utf8')), strict);
}

function getValue(configPath, dottedKey, strict = true) {
  const data = loadResolved(configPath, false);
  let cur = data;
  for (const part of dottedKey.split('.')) {
    if (cur !== null && typeof cur === 'object' && part in cur) {
      cur = cur[part];
    } else {
      if (strict) throw new Error(`配置路径不存在: ${dottedKey}（文件: ${configPath}）`);
      return null;
    }
  }
  return resolveNode(cur, strict);
}

module.exports = { loadResolved, getValue, resolveValue, ENV_CONFIG_PATH };

if (require.main === module) {
  const args = process.argv.slice(2);
  let configPath = null;
  let dottedKey = null;
  let lenient = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file') configPath = args[++i];
    else if (args[i] === '--get') dottedKey = args[++i];
    else if (args[i] === '--lenient' || args[i] === '--no-strict') lenient = true;
  }
  if (!configPath) configPath = ENV_CONFIG_PATH; // --get 单键不带 --file 时默认取 _shared/env-config.json
  try {
    if (dottedKey) {
      const v = getValue(configPath, dottedKey, !lenient);
      console.log(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));
    } else {
      console.log(JSON.stringify(loadResolved(configPath, !lenient), null, 2));
    }
  } catch (e) {
    console.error('[ERROR] ' + e.message);
    process.exit(1);
  }
}
