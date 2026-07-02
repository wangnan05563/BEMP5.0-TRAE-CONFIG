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
// 2026-07-02 优化：输出目录统一收敛到项目根 output，避免技能内/项目根双输出
// 优先级：环境变量 BEMP_OUTPUT_DIR > PROJECT_ROOT/output > SKILL_ROOT/output（兜底）
const OUTPUT_DIR = path.resolve(
    process.env.BEMP_OUTPUT_DIR
    || path.join(PROJECT_ROOT, 'output')
    || path.join(SKILL_ROOT, 'output')
);
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
// 环境变量：BEMP_OUTLINE_TEMPLATE / BEMP_DESIGN_TEMPLATE
// 用户应在对话中通过 --template 参数或环境变量指定银行特定模板
function outlineDesignTemplate() {
    const envTpl = process.env.BEMP_OUTLINE_TEMPLATE;
    if (envTpl) {
        return path.isAbsolute(envTpl) ? envTpl : path.resolve(SKILL_ROOT, envTpl);
    }
    return path.join(ASSETS_DIR, 'template-outline-design.docx');
}

// 2026-07-02 修复：环境变量名误用 BEMP_DETAIL_TEMPLATE（实际项目用 BEMP_DESIGN_TEMPLATE）
// 修正回退逻辑：docs/07 标准模板 > skill 内置差异化模板 > null
function detailDesignTemplate() {
    const envTpl = process.env.BEMP_DESIGN_TEMPLATE || process.env.BEMP_DETAIL_TEMPLATE;
    if (envTpl) {
        return path.isAbsolute(envTpl) ? envTpl : path.resolve(SKILL_ROOT, envTpl);
    }
    const projectTpl = path.join(PROJECT_ROOT, 'docs', '07【模板】详细设计说明书.docx');
    if (fs.existsSync(projectTpl)) {
        return projectTpl;
    }
    const innerTpl = path.join(SKILL_ROOT, 'assets', 'templates', 'XX银行-XX项目-差异化需求详细设计模板.docx');
    if (fs.existsSync(innerTpl)) {
        return innerTpl;
    }
    return null;
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

/**
 * 2026-07-02 新增：校验输出路径合法性
 * 默认要求 outputPath 位于 PROJECT_ROOT/output 子路径下
 * - options.explicitRoot === true 时,放行任意绝对路径(用户显式指定)
 * - 其他情况:outputPath 必须在 PROJECT_ROOT/output 下,否则抛出错误
 * @param {string} outputPath - 待校验的输出路径
 * @param {Object} [options] - { explicitRoot?: boolean }
 * @returns {string} - 规范化后的绝对路径
 */
function validateOutputPath(outputPath, options = {}) {
    if (!outputPath || typeof outputPath !== 'string') {
        throw new Error('validateOutputPath: outputPath 必须是非空字符串');
    }
    const absPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(process.cwd(), outputPath);
    if (options.explicitRoot === true) {
        return absPath;
    }
    const allowedRoot = path.resolve(PROJECT_ROOT, 'output');
    // Windows: 大小写不敏感比较
    const isUnder = absPath.toLowerCase().startsWith(allowedRoot.toLowerCase());
    if (!isUnder) {
        const err = new Error(
            `输出路径必须在 ${allowedRoot} 下，当前为 ${absPath}。` +
            `如需显式指定其他位置，请使用 --output-root 参数并显式声明。`
        );
        err.code = 'OUTPUT_PATH_INVALID';
        err.allowedRoot = allowedRoot;
        err.actualPath = absPath;
        throw err;
    }
    return absPath;
}

/**
 * 2026-07-02 新增：检测技能内 output 与项目根 output 是否同时存在
 * 若同时存在,提示用户收敛到项目根 output(不强制迁移,仅提示)
 * @returns {{ skillOutput: string, projectOutput: string, bothExist: boolean }}
 */
function detectDualOutput() {
    const skillOutput = path.resolve(SKILL_ROOT, 'output');
    const projectOutput = path.resolve(PROJECT_ROOT, 'output');
    const bothExist = fs.existsSync(skillOutput) && fs.existsSync(projectOutput)
        && skillOutput.toLowerCase() !== projectOutput.toLowerCase();
    return { skillOutput, projectOutput, bothExist };
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
    validateOutputPath,
    detectDualOutput,
};
