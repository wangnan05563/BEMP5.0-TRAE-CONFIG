/**
 * 统一路径常量模块（Node.js 端） - 消除脚本中的硬编码绝对路径
 *
 * 所有路径基于 SKILL_ROOT 自动推导，支持通过环境变量覆盖：
 *   BEMP_SKILL_ROOT   - 技能根目录
 *   BEMP_PROJECT_ROOT - 项目根目录
 *   BEMP_OUTPUT_DIR   - 输出目录
 */
const path = require('path');
const fs = require('fs');

// ── 核心路径 ──────────────────────────────────────────────
const SKILL_ROOT = path.resolve(process.env.BEMP_SKILL_ROOT || path.join(__dirname, '..'));

// PROJECT_ROOT: 从 SKILL_ROOT 向上查找含 pom.xml 的目录
let PROJECT_ROOT = process.env.BEMP_PROJECT_ROOT || null;
if (!PROJECT_ROOT) {
    let candidate = path.dirname(SKILL_ROOT); // 从父级开始，避免匹配技能目录自身
    while (candidate !== path.dirname(candidate)) {
        const dirName = path.basename(candidate).toUpperCase();
        if (dirName.includes('BEMP')) {
            PROJECT_ROOT = candidate;
            break;
        }
        candidate = path.dirname(candidate);
    }
    if (!PROJECT_ROOT) {
        PROJECT_ROOT = path.resolve(SKILL_ROOT, '..', '..', '..', '..');
    }
}
PROJECT_ROOT = path.resolve(PROJECT_ROOT);

// ── 派生路径 ──────────────────────────────────────────────
const SCRIPTS_DIR = path.join(SKILL_ROOT, 'scripts');
const OUTPUT_DIR = path.resolve(process.env.BEMP_OUTPUT_DIR || path.join(SKILL_ROOT, 'output'));
const ASSETS_DIR = path.join(SKILL_ROOT, 'assets');
const CONFIG_DIR = path.join(SKILL_ROOT, 'config');
const DIAGRAMS_DIR = path.join(OUTPUT_DIR, 'diagrams');
const LIB_DIR = path.join(SCRIPTS_DIR, 'lib');

// ── 项目级路径 ────────────────────────────────────────────
// 银行个性化需求目录：环境变量 BEMP_REQUIREMENTS_DIR 指定，否则自动探测 docs 目录
const _envReqDir = process.env.BEMP_REQUIREMENTS_DIR;
const _defaultReqCandidates = _envReqDir
    ? [path.resolve(PROJECT_ROOT, _envReqDir)]
    : [path.join(PROJECT_ROOT, 'docs')];
const BANK_REQUIREMENTS_DIR = _defaultReqCandidates.find(d => fs.existsSync(d))
    || path.join(PROJECT_ROOT, 'docs');

// ── 常用文件路径（函数形式，延迟求值） ──────────────────────
// 模板路径优先级：环境变量 > 通用默认模板
// 环境变量：BEMP_OUTLINE_TEMPLATE / BEMP_DETAIL_TEMPLATE
// 用户应在对话中通过 --template 参数或环境变量指定银行特定模板
function outlineDesignTemplate() {
    const envTpl = process.env.BEMP_OUTLINE_TEMPLATE;
    if (envTpl) {
        return path.isAbsolute(envTpl) ? envTpl : path.resolve(SKILL_ROOT, envTpl);
    }
    return path.join(ASSETS_DIR, 'template-outline-design.docx');
}

function detailDesignTemplate() {
    const envTpl = process.env.BEMP_DETAIL_TEMPLATE;
    if (envTpl) {
        return path.isAbsolute(envTpl) ? envTpl : path.resolve(SKILL_ROOT, envTpl);
    }
    return path.join(ASSETS_DIR, 'template-outline-design.docx');
}

function scanDataPath() {
    return path.join(OUTPUT_DIR, '_scan-data.json');
}

function requirementParsedPath() {
    return path.join(OUTPUT_DIR, '_requirement-parsed.json');
}

function erDiagramsPath() {
    return path.join(OUTPUT_DIR, '_er-diagrams.json');
}

function mcpChartConfigsPath() {
    return path.join(OUTPUT_DIR, '_mcp-chart-configs.json');
}

// ── 工具函数 ──────────────────────────────────────────────
function ensureOutputDir() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
    return OUTPUT_DIR;
}

function resolvePath(p, base) {
    base = base || SKILL_ROOT;
    if (!path.isAbsolute(p)) {
        p = path.join(base, p);
    }
    return path.resolve(p);
}

module.exports = {
    SKILL_ROOT,
    PROJECT_ROOT,
    SCRIPTS_DIR,
    OUTPUT_DIR,
    ASSETS_DIR,
    CONFIG_DIR,
    DIAGRAMS_DIR,
    LIB_DIR,
    BANK_REQUIREMENTS_DIR,
    outlineDesignTemplate,
    detailDesignTemplate,
    scanDataPath,
    requirementParsedPath,
    erDiagramsPath,
    mcpChartConfigsPath,
    ensureOutputDir,
    resolvePath,
};
