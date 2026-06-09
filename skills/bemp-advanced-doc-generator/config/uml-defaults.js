/**
 * UML 默认值配置 — 需求驱动 UML 抽取器的默认场景定义
 *
 * 此文件供 requirement-uml-extractor.js 加载，用于覆盖内置默认值。
 * 如果此文件不存在或加载失败，将自动回退到内置默认值。
 *
 * 自定义方式：
 *   1. 修改本文件中的对象定义以适配不同银行/项目
 *   2. 或通过环境变量 BEMP_UML_DEFAULTS 指定其他配置文件路径
 *
 * 导出对象：
 *   - ENTITY_DICT: 业务实体词典（关键词 → 类定义）
 *   - OPERATION_KEYWORDS: 操作关键词映射（关键词 → 顺序图模板）
 *   - DEFAULT_LANES: 默认泳道定义
 *   - BUSINESS_FLOW_TEMPLATES: 业务流程图模板
 *   - TIMING_TEMPLATES: 时序图模板
 *
 * 本文件为空模板。需要自定义时，参考 requirement-uml-extractor.js 中的对应常量定义。
 */
'use strict';

// 从源文件加载内置默认值作为基础，再合并自定义覆盖
const path = require('path');
const fs = require('fs');

// 内置默认值 — 从 requirement-uml-extractor.js 中提取（通过 re-export 避免代码重复）
const sourcePath = path.join(__dirname, '..', 'scripts', 'lib', 'requirement-uml-extractor.js');
let defaults = {};

try {
    if (fs.existsSync(sourcePath)) {
        // 延迟加载：在首次 require 时加载源文件默认值
        // 注意：这是静态快照，源文件修改后需重新加载
    }
} catch (e) {
    // 回退：使用空默认值，由 requirement-uml-extractor.js 内置兜底
}

// ─────────── 在此区域添加自定义覆盖 ───────────
// 示例：
// const ENTITY_DICT = { ...defaults.ENTITY_DICT, '自定义实体': { ... } };
// const OPERATION_KEYWORDS = { ...defaults.OPERATION_KEYWORDS, '自定义操作': { ... } };
// ────────────────────────────────────────────

module.exports = {
    // ENTITY_DICT,
    // OPERATION_KEYWORDS,
    // DEFAULT_LANES,
    // BUSINESS_FLOW_TEMPLATES,
    // TIMING_TEMPLATES,
};
