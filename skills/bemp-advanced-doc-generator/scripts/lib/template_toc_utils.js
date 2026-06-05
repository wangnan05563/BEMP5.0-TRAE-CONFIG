/**
 * template_toc_utils.js
 * 模板驱动文档生成的公共工具模块
 *
 * 解决以下反复出现的问题（v2→v3→v4复盘沉淀）：
 *   1. 占位文字被多run拆分导致逐run替换失败
 *   2. 删除模板正文时丢失模板自带的动态TOC域
 *   3. Word 打开文档后不自动更新目录（需用户手动点"是"）
 *   4. 模板的封面/TOC/正文三段边界模糊
 *
 * 适用场景：所有使用 .docx 模板生成文档的流程（design/outline-design/unit-test-report/testreport）
 *
 * @author document-delivery-engineer
 * @since 2026-06-02
 */

const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel } = require('docx');

/**
 * 识别模板的三大区域（封面 / TOC / 正文）
 *
 * @param {Document} doc - 已加载的 docx 文档对象
 * @returns {{coverEndIdx: number, tocEndIdx: number, contentStartIdx: number, hasToc: boolean}}
 *
 * 识别规则：
 *   - 封面结束：出现 style="toc1" / "toc 1" / "TOC1" 的第一个段落
 *   - TOC 结束：连续 toc1/toc2 样式段落后，回归普通样式（style 为空或 1/2/3）
 *   - 正文开始：TOC 结束位置 + 1（跳过可能的空段）
 */
function identifyTemplateRegions(doc) {
    const body = doc.element.body;
    const allElements = Array.from(body);
    const ns = { w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' };
    const w = ns.w;

    let coverEndIdx = 0;
    let tocEndIdx = -1;
    let hasToc = false;
    let inTocBlock = false;
    let consecutiveTocStyles = 0;

    for (let idx = 0; idx < allElements.length; idx++) {
        const elem = allElements[idx];
        const tag = elem.tagName ? elem.tagName.split('}').pop() : '';
        if (tag !== 'p') continue;

        const pPr = elem.getElementsByTagNameNS(w, 'pPr')[0];
        const pStyle = pPr ? pPr.getElementsByTagNameNS(w, 'pStyle')[0] : null;
        const styleName = pStyle ? pStyle.getAttributeNS(w, 'val') : '';

        // 出现 toc 样式 → 封面结束
        if (/^toc\s*\d*$/i.test(styleName) || /toc\s*heading/i.test(styleName)) {
            if (!inTocBlock) {
                coverEndIdx = idx;
                inTocBlock = true;
                hasToc = true;
            }
            consecutiveTocStyles++;
            continue;
        }

        // 进入 TOC 块后回归普通样式 → TOC 结束
        if (inTocBlock && consecutiveTocStyles > 0) {
            tocEndIdx = idx;
            break;
        }
    }

    // 未识别到 toc 样式 → 兼容模式：TOC 域代码搜索
    if (!hasToc) {
        const instrTexts = body.getElementsByTagNameNS(w, 'instrText');
        for (let idx = 0; idx < allElements.length; idx++) {
            const elem = allElements[idx];
            const tag = elem.tagName ? elem.tagName.split('}').pop() : '';
            if (tag !== 'p') continue;
            const instrs = elem.getElementsByTagNameNS(w, 'instrText');
            for (let k = 0; k < instrs.length; k++) {
                if (instrs[k].textContent && /^\s*TOC\s/.test(instrs[k].textContent)) {
                    hasToc = true;
                    coverEndIdx = idx;
                    // 找 TOC 段落结束位置
                    for (let j = idx + 1; j < allElements.length; j++) {
                        const next = allElements[j];
                        const nextTag = next.tagName ? next.tagName.split('}').pop() : '';
                        if (nextTag === 'p' && /^\s*\d+(\.\d+)*\s+/.test(next.textContent || '')) {
                            tocEndIdx = j;
                            break;
                        }
                    }
                    break;
                }
            }
            if (hasToc) break;
        }
    }

    // 最终兜底
    if (coverEndIdx === 0) coverEndIdx = 20;       // 经验值
    if (tocEndIdx === -1) tocEndIdx = coverEndIdx + 5;
    const contentStartIdx = tocEndIdx + 1;

    return { coverEndIdx, tocEndIdx, contentStartIdx, hasToc };
}

/**
 * 合并run后整体替换占位文字
 *
 * 解决问题：模板的"XXX信息系统/项目"通常被拆成 5 个独立run（X/XX/信息系统/[/]/项目），
 * 逐run.replace() 失败。
 *
 * @param {Paragraph} paragraph - docx 段落对象
 * @param {RegExp|string} pattern - 匹配模式（正则或字符串）
 * @param {string} replacement - 替换后的文本
 * @returns {boolean} 是否发生替换
 */
function replacePlaceholderInParagraph(paragraph, pattern, replacement) {
    const runs = paragraph.runs;
    if (!runs || runs.length === 0) return false;

    const fullText = runs.map(r => r.text || '').join('');
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

    if (!regex.test(fullText)) return false;

    // 捕获第一个run的格式属性
    const firstRun = runs[0];
    const savedBold = firstRun.bold;
    const savedSize = firstRun.font && firstRun.font.size;
    const savedName = firstRun.font && firstRun.font.name;

    const newText = fullText.replace(regex, replacement);

    // 删除全部run
    for (const run of runs) {
        if (run._element && run._element.parentNode) {
            run._element.parentNode.removeChild(run._element);
        }
    }

    // 创建新run并恢复格式
    const newRun = paragraph.addRun(newText);
    if (savedBold !== undefined) newRun.bold = savedBold;
    if (savedSize !== undefined) newRun.font.size = savedSize;
    if (savedName) newRun.font.name = savedName;

    return true;
}

/**
 * 批量替换占位文字（基于占位映射表）
 *
 * @param {Document} doc - 文档对象
 * @param {Object<string, string>} placeholderMap - 占位文字 → 替换文本
 * @param {Object} options
 * @param {number} options.coverEndIdx - 封面区域结束位置（仅替换该区域内）
 * @returns {{replaced: number, details: string[]}}
 */
function applyCoverPlaceholders(doc, placeholderMap, options = {}) {
    const coverEndIdx = options.coverEndIdx || 20;
    const details = [];
    let replaced = 0;

    const paragraphs = doc.paragraphs.slice(0, coverEndIdx + 5);
    for (const p of paragraphs) {
        for (const [placeholder, value] of Object.entries(placeholderMap)) {
            if (replacePlaceholderInParagraph(p, placeholder, value)) {
                details.push(`"${placeholder}" → "${value}"`);
                replaced++;
            }
        }
    }

    return { replaced, details };
}

/**
 * 在文档中插入动态TOC域（让Word打开时自动更新目录）
 *
 * @param {Document} doc
 * @param {Object} options
 * @param {string} options.heading - 目录标题（默认"目  录"）
 * @param {string} options.levels - 包含的级别（默认"1-3"）
 * @param {boolean} options.hyperlink - 是否生成超链接（默认 true）
 * @returns {Paragraph[]} - 包含 TOC 标题段 + TOC 域段落 的数组
 */
function insertDynamicTocField(doc, options = {}) {
    const heading = options.heading || '目  录';
    const levels = options.levels || '1-3';
    const hyperlink = options.hyperlink !== false;

    const headingP = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 360 },
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: heading, bold: true, size: 36, font: '黑体' })]
    });

    // Word 域代码: TOC \o "1-3" \h \z \u
    // 需通过 XML 注入（docx库未直接提供 TOC 域 API）
    const docx = require('docx');
    const fs = require('fs');
    const path = require('path');

    const tocPara = new Paragraph({
        spacing: { before: 120, after: 120 }
    });

    // 通过 child 数组添加 run，再二次注入域
    tocPara.addRun('');

    // 后续由 caller 注入域代码（需要操作 doc.element.body）
    // 这里返回段落和元数据
    return [headingP, tocPara];
}

/**
 * 注入 <w:updateFields w:val="true"/> 到文档 settings，
 * 让 Word 打开时自动提示"是否更新域"
 *
 * @param {Document} doc
 * @returns {boolean} 是否注入成功
 */
function injectUpdateFields(doc) {
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const w = ns;
    const settings = doc.settings && doc.settings.element;
    if (!settings) return false;

    const existing = settings.getElementsByTagNameNS(w, 'updateFields')[0];
    if (existing) {
        existing.setAttributeNS(w, 'val', 'true');
        return true;
    }

    // 创建 <w:updateFields w:val="true"/>
    const updateFields = settings.ownerDocument.createElementNS(w, 'w:updateFields');
    updateFields.setAttributeNS(w, 'val', 'true');
    settings.appendChild(updateFields);
    return true;
}

/**
 * 一站式：保留模板封面 + 保留模板动态TOC + 注入 updateFields
 * （专门解决用户反馈"静态目录太难看，使用原模板的动态目录"）
 *
 * @param {Document} doc - 已加载模板的 Document 对象
 * @param {Object} options
 * @param {Object} options.coverPlaceholders - 封面占位文字替换映射
 * @param {boolean} options.keepTemplateToc - 是否保留模板原版TOC域（默认 true）
 * @param {boolean} options.updateFields - 是否注入 updateFields=true（默认 true）
 * @returns {{
 *   coverEndIdx: number,
 *   tocEndIdx: number,
 *   contentStartIdx: number,
 *   hasToc: boolean,
 *   placeholdersReplaced: number,
 *   placeholderDetails: string[],
 *   updateFieldsInjected: boolean
 * }}
 */
function preserveTemplateStructure(doc, options = {}) {
    const {
        coverPlaceholders = {},
        keepTemplateToc = true,
        updateFields: enableUpdateFields = true
    } = options;

    // Step 1: 识别三段区域
    const regions = identifyTemplateRegions(doc);

    // Step 2: 替换封面占位文字
    let placeholdersReplaced = 0;
    let placeholderDetails = [];
    if (Object.keys(coverPlaceholders).length > 0) {
        const result = applyCoverPlaceholders(doc, coverPlaceholders, { coverEndIdx: regions.coverEndIdx });
        placeholdersReplaced = result.replaced;
        placeholderDetails = result.details;
    }

    // Step 3: 保留模板原版TOC域（由 caller 决定是否删除原TOC后重新插入）
    // 这里仅返回 regions 和 hasToc 供 caller 决策

    // Step 4: 注入 updateFields
    let updateFieldsInjected = false;
    if (enableUpdateFields) {
        updateFieldsInjected = injectUpdateFields(doc);
    }

    return {
        ...regions,
        placeholdersReplaced,
        placeholderDetails,
        updateFieldsInjected
    };
}

module.exports = {
    identifyTemplateRegions,
    replacePlaceholderInParagraph,
    applyCoverPlaceholders,
    insertDynamicTocField,
    injectUpdateFields,
    preserveTemplateStructure
};
