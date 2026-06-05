"""outline-design-generator.py - 概要设计文档生成器

基于模板动态生成概要设计文档：
- 第1遍扫描：封面替换 + 蓝色文本清理 + 模板备注删除
- 第2遍扫描：各章节内容填充（从 scan_data 和需求解析数据动态生成）
- 第5章 系统组件：动态展开业务子模块（从需求文档解析）
- 第6-8章：模块复用、非功能性设计、系统集成
- 修订记录更新 + 目录更新 + 原图清空

所有内容均从 scan_data 动态生成，不包含任何业务硬编码。
"""
import sys
import os
import json
import shutil
import zipfile
from copy import deepcopy
from datetime import datetime
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from doc_utils import (
    is_blue_paragraph, is_blue_placeholder_text, is_blue_color,
    is_blue_cell, is_hyperlink_run, set_black, remove_paragraph,
    clear_blue_cell, fill_cell_text, add_table_row, format_table_styled,
)

import doc_formatter

# ─── 按需加载内容注册中心（ContentRegistry） ───
# 优先使用 content 模块的动态内容生成器，失败时回退到内置函数
try:
    from content import ContentRegistry
    _content_registry = ContentRegistry()
except ImportError:
    _content_registry = None

# ─── 常量定义（模板占位符匹配、章节锚点等，非业务内容） ───
PLACEHOLDER_PATTERNS = ('XXX信息系统', 'XXX项目', 'XXX 系统')
SYSTEM_NAME_KEYWORDS = ('系统名', 'XXX')
TEMPLATE_COMPONENT_FIRST = '组件1'
TEMPLATE_COMPONENT_LAST = '组件N'
CHAPTER_SYSTEM_COMPONENT = '系统组件'
CHAPTER_MODULE_REUSE = '模块复用分析'
CHAPTER_NON_FUNCTIONAL = '非功能性设计'
CHAPTER_NETWORK_DIAGRAM = '网络结构图'
CHAPTER_TOTAL_FRAMEWORK = '系统总体框架'
CHAPTER_DATABASE = '数据库'
CHAPTER_APPENDIX = '附录'
# 概述章节关键词（用于在 _fill_chapter_content 中定位"项目概述"/"系统概述"）
CHAPTER_OVERVIEW_KEYWORDS = ('项目概述', '系统概述', '概述')
# 架构图/网络图/部署图描述前缀（参数化，不硬编码业务）
DIAGRAM_DESC_PREAMBLE = '系统整体架构'
# 图片默认宽度（英寸）：原 IMAGE_WIDTH_INCHES 调整
IMAGE_WIDTH_INCHES = 5
# 目录标题常量
TOC_HEADING_TEXT = '目录'
# UML 图表占位关键词（用于在 _insert_uml_placeholders 中定位图表标题）
UML_DIAGRAM_KEYWORDS = ('类图', '顺序图', '活动图', '状态图', '组件图')

# 子模块提升关键字（通用，非特定业务）
PROMOTE_KEYWORDS = frozenset({'明细', '清单', '台账', '档案'})
# 常见UI操作名（不应被提升为子模块）
UI_OPERATION_NAMES = frozenset({
    '查询', '新增', '修改', '删除', '复核', '提交复核', '撤销复核',
    '清单导出', '提交', '撤销', '确认', '关闭', '重置', '同步',
    '查看', '导出', '导入', '打印'
})
# 全局规则关键字 → 子模块名模板（动态生成，不硬编码业务名）
RULE_KEYWORD_MODULE_MAP = [
    ('占用', '占用/释放', '{module_name}的占用、释放及退回释放处理'),
    ('释放', '占用/释放', '{module_name}的占用、释放及退回释放处理'),
]

# ─── 章节标题匹配关键词（用于 _fill_chapter_content） ───
CHAPTER_KEYWORDS_OVERVIEW = ('概述', '系统概述')
CHAPTER_KEYWORDS_PURPOSE = ('编写目的', '目的')
CHAPTER_KEYWORDS_READERS = ('读者对象', '读者')
CHAPTER_KEYWORDS_SCOPE = ('使用范围', '适用范围')
CHAPTER_KEYWORDS_GLOSSARY = ('术语和缩写', '术语定义')
CHAPTER_KEYWORDS_REFERENCES = ('参考资料', '参考文档')
CHAPTER_KEYWORDS_STRATEGY = ('设计策略', '设计原则')
CHAPTER_KEYWORDS_GOAL = ('设计目标',)
CHAPTER_KEYWORDS_EXTERNAL_IFACE = ('外部接口',)
CHAPTER_KEYWORDS_COMPONENT_SUMMARY = ('组件汇总表', '组件汇总')
CHAPTER_KEYWORDS_TECH_IMPL = ('技术实现', '关键技术')
CHAPTER_KEYWORDS_NON_FUNC = ('非功能性设计', '非功能性要求')
CHAPTER_KEYWORDS_APPENDIX = ('附录',)
CHAPTER_KEYWORDS_DESIGN_CONSTRAINT = ('设计约束',)
CHAPTER_KEYWORDS_MODULE_LIST = ('组件内部的模块列表及说明', '模块列表及说明')

# ─── 空章节兜底关键词（fill_empty_chapter 的统一入口） ───
EMPTY_CHECK_KEYWORDS = [
    '术语和缩写', '术语定义',
    '参考资料', '参考文档',
    '设计约束',
    '组件内部的模块列表及说明', '模块列表及说明',
]


# ─── 可选规则加载（doc_rules.yaml 存在时优先使用其配置） ───
def _load_doc_rules():
    """从 doc_rules.yaml 加载章节/关键词配置（若文件存在）。

    返回 dict；文件不存在或解析失败时返回 {}。
    设计原则：YAML 是可选的、增量的；不破坏默认行为。
    """
    try:
        rules_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'doc_rules.yaml')
        if not os.path.exists(rules_path):
            return {}
        try:
            import yaml  # type: ignore
        except ImportError:
            return {}
        with open(rules_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print(f'[WARN] 加载 doc_rules.yaml 失败: {e}', file=sys.stderr)
        return {}


def _new_heading(doc, text, level, ref_p=None, style_id=None):
    """生成带模板样式的标题。

    ref_p: 模板中的 w:p 元素（用于复制段落格式和样式引用）
    style_id: 显式指定 pStyle val（可选，None 时使用 ref_p 自带样式）
    """
    if ref_p is not None:
        new_p = deepcopy(ref_p)
        for tag in ('w:r', 'w:hyperlink', 'w:proofErr', 'w:bookmarkStart', 'w:bookmarkEnd'):
            for n in list(new_p.findall(qn(tag))):
                new_p.remove(n)
        if style_id is not None:
            pPr = new_p.find(qn('w:pPr'))
            if pPr is None:
                pPr = OxmlElement('w:pPr')
                new_p.insert(0, pPr)
            for ps in list(pPr.findall(qn('w:pStyle'))):
                pPr.remove(ps)
            pStyle = OxmlElement('w:pStyle')
            pStyle.set(qn('w:val'), style_id)
            pPr.insert(0, pStyle)
        r = OxmlElement('w:r')
        t = OxmlElement('w:t')
        t.text = text
        t.set(qn('xml:space'), 'preserve')
        r.append(t)
        new_p.append(r)
        return new_p
    return doc.add_heading(text, level=level)._element


def _new_paragraph(doc, text, ref_para=None):
    """生成段落（可指定参考样式）"""
    if ref_para is not None and ref_para.style is not None:
        new_p = deepcopy(ref_para._element)
        for r in list(new_p.findall(qn('w:r'))):
            new_p.remove(r)
        pPr = new_p.find(qn('w:pPr'))
        if pPr is not None:
            for ps in list(pPr.findall(qn('w:pStyle'))):
                pPr.remove(ps)
        for line in text.split('\n'):
            r = OxmlElement('w:r')
            t = OxmlElement('w:t')
            t.text = line
            t.set(qn('xml:space'), 'preserve')
            r.append(t)
            new_p.append(r)
            br = OxmlElement('w:br')
            r.append(br)
        return new_p
    return doc.add_paragraph(text)._element


def _new_table(doc, headers, rows, ref_table=None):
    """创建表格。ref_table 提供样式时复用其 tblPr 边框。"""
    tbl = doc.add_table(rows=1, cols=len(headers))
    try:
        tbl.style = 'Table Grid'
    except Exception:
        pass
    hdr = tbl.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
    for r in rows:
        row = tbl.add_row().cells
        for i, v in enumerate(r):
            if i < len(row):
                row[i].text = str(v)
    return tbl._element


def _find_paragraph_by_text(doc, text_match, level=None):
    """在文档中查找包含 text_match 的段落。level 指定 heading 级别（1/2/3）或 None。"""
    target = None
    for p in doc.paragraphs:
        if text_match in p.text:
            if level is None:
                return p
            sn = p.style.name if p.style else ''
            sn_low = sn.lower().replace(' ', '')
            if level == 1 and sn_low in ('heading1', '1'):
                return p
            if level == 2 and sn_low in ('heading2', '2'):
                return p
            if level == 3 and sn_low in ('heading3', '3'):
                return p
            if level is not None and target is None:
                target = p
    return target


def _get_template_styles(doc):
    """从模板 doc 中提取 H1/H2/H3 段落元素（完整 w:p，包含样式引用和段落属性）"""
    h1 = h2 = h3 = None
    for p in doc.paragraphs:
        sn = p.style.name if p.style else ''
        sn_low = sn.lower().replace(' ', '')
        if h1 is None and sn_low in ('heading1', '1'):
            h1 = p._element
        elif h2 is None and sn_low in ('heading2', '2'):
            h2 = p._element
        elif h3 is None and sn_low in ('heading3', '3'):
            h3 = p._element
    return h1, h2, h3


def _replace_placeholder_paragraph(target, text):
    """把 target 段落的文字替换为 text（保留段落样式）"""
    for r in list(target._element.findall(qn('w:r'))):
        target._element.remove(r)
    r = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    r.append(t)
    target._element.append(r)


# ═══════════════════════════════════════════════════════════════
# 第一遍扫描：蓝色文本清理 + 模板备注删除
# ═══════════════════════════════════════════════════════════════

def _clean_template_content(doc):
    """清理模板中的蓝色占位文本、蓝色空标题、蓝色模板备注

    规则：
    - 蓝色空标题段落 → 删除
    - 蓝色占位文本段落（非标题） → 删除
    - 蓝色标题（有实质内容） → 保留但变黑
    - 表格中的蓝色占位文本 → 清空变黑
    - 段落中**所有 run 包含蓝色**（即使非占位符） → 保留段落结构、删除内容
    """
    # 遍历段落时需要收集待删除列表，避免遍历中修改集合
    paragraphs_to_remove = []
    for p in doc.paragraphs:
        text = p.text.strip()
        is_heading = p.style and p.style.name.startswith('Heading')

        # 蓝色空标题段落 → 删除
        if is_heading and is_blue_paragraph(p) and not text:
            paragraphs_to_remove.append(p)
            continue

        # 蓝色占位文本段落（非标题） → 删除
        if is_blue_paragraph(p) and is_blue_placeholder_text(text) and not is_heading:
            paragraphs_to_remove.append(p)
            continue

        # 蓝色标题（有实质内容、非占位） → 保留但变黑
        if is_heading and is_blue_paragraph(p) and text and not is_blue_placeholder_text(text):
            set_black(p)
            continue

        # 增强：检查段落中所有 run 是否有蓝色（不依赖 is_blue_paragraph 单点判断）
        if not is_heading and text:
            has_blue = False
            has_hyperlink_blue = False
            for run in p.runs:
                if not (run.font.color and run.font.color.rgb):
                    continue
                if not is_blue_color(run.font.color.rgb):
                    continue
                has_blue = True
                if is_hyperlink_run(run):
                    has_hyperlink_blue = True
                    break
            # 存在蓝色且没有超链接 → 清空内容、保留段落结构、变黑
            if has_blue and not has_hyperlink_blue:
                for run in p.runs:
                    if is_hyperlink_run(run):
                        continue
                    run.text = ''
                set_black(p)

    for p in paragraphs_to_remove:
        remove_paragraph(p)

    # 清理表格中的蓝色占位文本（增强：处理 run 级蓝色）
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if is_blue_cell(cell):
                    clear_blue_cell(cell)
                else:
                    # 检查单元格内每个段落每个 run 是否蓝色
                    for para in cell.paragraphs:
                        for run in para.runs:
                            if (run.font.color and run.font.color.rgb
                                    and is_blue_color(run.font.color.rgb)
                                    and not is_hyperlink_run(run)):
                                run.text = ''
                                run.font.color.rgb = RGBColor(0, 0, 0)


def _secondary_clean_blue_runs(doc):
    """二次清理蓝色 run：遍历所有段落和表格单元格，调用 doc_formatter.clear_all_blue_runs

    _clean_template_content 可能遗漏表格中的蓝色 run，此函数做补充清理。
    """
    # 清理段落中的蓝色 run
    for p in doc.paragraphs:
        doc_formatter.clear_all_blue_runs(p)
    # 清理表格单元格中的蓝色 run
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    doc_formatter.clear_all_blue_runs(para)


# ═══════════════════════════════════════════════════════════════
# 第二遍扫描：各章节内容填充
# ═══════════════════════════════════════════════════════════════

def _match_heading_by_keywords(p, keywords):
    """检查段落是否匹配关键词列表中的任一关键词"""
    if not p.style or not p.style.name.startswith('Heading'):
        return False
    text = p.text.strip()
    return any(kw in text for kw in keywords)


def _clear_content_between_headings(heading_para):
    """清理标题和下一个同级/更高级标题之间的所有非标题段落"""
    heading_element = heading_para._element
    parent = heading_element.getparent()
    if parent is None:
        return

    heading_style_vals = {'1', '2', '3', '4', '5', '6',
                          'Heading1', 'Heading2', 'Heading3',
                          'heading1', 'heading2', 'heading3',
                          'heading 1', 'heading 2', 'heading 3'}

    to_remove = []
    found = False
    for elem in list(parent):
        if elem is heading_element:
            found = True
            continue
        if not found:
            continue
        if elem.tag.endswith('}p'):
            pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '')
                if style_val in heading_style_vals:
                    break
            to_remove.append(elem)
        # 表格也清理（模板占位表格）
        elif elem.tag.endswith('}tbl'):
            to_remove.append(elem)

    for elem in to_remove:
        parent.remove(elem)


def _insert_paragraph_after_element(elem, text):
    """在指定 XML 元素后插入段落，返回新段落元素"""
    new_p = OxmlElement('w:p')
    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '000000')
    rPr.append(color)
    r.append(rPr)
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    r.append(t)
    new_p.append(r)
    elem.addnext(new_p)
    return new_p


def _insert_table_after_element(elem, headers, rows):
    """在指定 XML 元素后插入表格"""
    tbl = OxmlElement('w:tbl')

    # 表格属性
    tblPr = OxmlElement('w:tblPr')
    tblStyle = OxmlElement('w:tblStyle')
    tblStyle.set(qn('w:val'), 'TableGrid')
    tblPr.append(tblStyle)
    tblW = OxmlElement('w:tblW')
    tblW.set(qn('w:w'), '5000')
    tblW.set(qn('w:type'), 'pct')
    tblPr.append(tblW)
    tbl.append(tblPr)

    # 表格网格
    tblGrid = OxmlElement('w:tblGrid')
    for _ in headers:
        gridCol = OxmlElement('w:gridCol')
        gridCol.set(qn('w:w'), str(int(9000 / len(headers))))
        tblGrid.append(gridCol)
    tbl.append(tblGrid)

    # 表头行
    tr_header = OxmlElement('w:tr')
    for h in headers:
        tc = OxmlElement('w:tc')
        p = OxmlElement('w:p')
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        b_elem = OxmlElement('w:b')
        rPr.append(b_elem)
        r.append(rPr)
        t = OxmlElement('w:t')
        t.text = str(h)
        t.set(qn('xml:space'), 'preserve')
        r.append(t)
        p.append(r)
        tc.append(p)
        tr_header.append(tc)
    tbl.append(tr_header)

    # 数据行
    for row in rows:
        tr = OxmlElement('w:tr')
        for cell_val in row:
            tc = OxmlElement('w:tc')
            p = OxmlElement('w:p')
            r = OxmlElement('w:r')
            t = OxmlElement('w:t')
            t.text = str(cell_val) if cell_val is not None else ''
            t.set(qn('xml:space'), 'preserve')
            r.append(t)
            p.append(r)
            tc.append(p)
            tr.append(tc)
        tbl.append(tr)

    elem.addnext(tbl)
    return tbl


def _get_heading_text(p):
    """安全获取段落文本（去除空白）"""
    if p is None:
        return ''
    return (p.text or '').strip()


def _iter_body_elements(doc):
    """迭代文档主体的顶层元素（段落 + 表格）"""
    body = doc.element.body
    return list(body) if body is not None else []


def _is_heading_element(elem):
    """判断 OXML 元素是否为标题段落"""
    if elem is None or not elem.tag.endswith('}p'):
        return False
    pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
    if pPr is None:
        return False
    style_val = pPr.get(qn('w:val'), '') or ''
    return style_val in {'1', '2', '3', '4', '5', '6',
                         'Heading1', 'Heading2', 'Heading3',
                         'heading1', 'heading2', 'heading3',
                         'heading 1', 'heading 2', 'heading 3'}


def _heading_text_of_element(elem):
    """获取 OXML 标题元素的纯文本（用于关键词匹配）"""
    if elem is None:
        return ''
    texts = []
    for t in elem.findall('.//' + qn('w:t')):
        if t.text:
            texts.append(t.text)
    return ''.join(texts).strip()


def _is_table_element(elem):
    """判断 OXML 元素是否为表格"""
    return elem is not None and elem.tag.endswith('}tbl')


def _table_contains_keyword(tbl_elem, keywords):
    """判断表格文本是否包含任一关键词（用于窜行检测）"""
    if tbl_elem is None or not keywords:
        return False
    texts = []
    for t in tbl_elem.findall('.//' + qn('w:t')):
        if t.text:
            texts.append(t.text)
    full_text = ''.join(texts)
    return any(kw in full_text for kw in keywords)


def _detect_misplaced_tables(doc, source_keywords, target_keywords):
    """检测"源章节"下是否包含"目标章节"相关的表格（窜行问题）。

    实现要点：
    - 在文档主体中定位 source_heading 与 target_heading 之间的范围
    - 在此范围内查找包含 target_keywords 的表格
    - 返回 [(table_elem, target_heading_elem), ...] 列表

    参数:
        doc: docx Document
        source_keywords: 源章节标题关键词（如 ['适用范围', '使用范围']）
        target_keywords: 目标章节标题关键词（如 ['设计目标', '设计原则']）

    返回:
        list of (tbl_elem, target_heading_elem) 待移动的表格列表
    """
    if doc is None:
        return []
    body_elems = _iter_body_elements(doc)

    # 找到第一个匹配的源标题与目标标题
    source_idx = None
    target_idx = None
    for i, elem in enumerate(body_elems):
        if not _is_heading_element(elem):
            continue
        text = _heading_text_of_element(elem)
        if source_idx is None and any(kw in text for kw in source_keywords):
            source_idx = i
        elif target_idx is None and any(kw in text for kw in target_keywords):
            target_idx = i
        if source_idx is not None and target_idx is not None:
            break

    if source_idx is None or target_idx is None or target_idx <= source_idx:
        return []

    # 找到源标题到目标标题之间的所有表格，检测是否包含目标关键词
    target_heading_elem = body_elems[target_idx]
    moved = []
    for j in range(source_idx + 1, target_idx):
        elem = body_elems[j]
        if _is_table_element(elem) and _table_contains_keyword(elem, target_keywords):
            moved.append((elem, target_heading_elem))
    return moved


def _move_table_after_heading(tbl_elem, target_heading_elem):
    """将表格元素移动到目标标题之后（紧邻插入到标题后面）。

    如果表格已经在目标标题下则跳过。返回是否实际移动。
    """
    if tbl_elem is None or target_heading_elem is None:
        return False
    if tbl_elem.getparent() is None:
        return False
    # 检查是否已经在目标标题之后
    cur = tbl_elem.getnext()
    while cur is not None:
        if cur is target_heading_elem:
            return False  # 已在目标标题之后（不太可能，但保护）
        # 跳过非标题元素
        if _is_heading_element(cur):
            break
        cur = cur.getnext()
    # 从原位置移除
    parent = tbl_elem.getparent()
    parent.remove(tbl_elem)
    # 插入到目标标题之后
    target_heading_elem.addnext(tbl_elem)
    return True


def _table_is_effectively_empty(tbl_elem, min_data_rows=1, min_text_len=1):
    """判断表格是否"空"：数据行不足且无有效内容。

    用于检测术语表等只有表头没有数据的空表格。
    """
    if tbl_elem is None or not _is_table_element(tbl_elem):
        return False
    rows = tbl_elem.findall(qn('w:tr'))
    if not rows:
        return True
    # 第一行视为表头
    if len(rows) <= 1:
        return True
    data_rows = rows[1:]
    if len(data_rows) < min_data_rows:
        # 检查所有数据行是否有有效文本
        total_text_len = 0
        for tr in data_rows:
            for t in tr.findall('.//' + qn('w:t')):
                if t.text:
                    total_text_len += len(t.text.strip())
        return total_text_len < min_text_len
    return False


def _remove_empty_table(tbl_elem):
    """从文档中移除空表格（数据行不足或无有效内容）。返回是否移除。"""
    if tbl_elem is None or not _is_table_element(tbl_elem):
        return False
    parent = tbl_elem.getparent()
    if parent is None:
        return False
    parent.remove(tbl_elem)
    return True


def _build_overview_text(scan, module_name):
    """生成概述/系统概述文本

    改造点（按需求）：
    - 不硬编码"项目概述"或"系统概述"标题（这些标题由模板决定）
    - 仅生成正文章节内容；缩进由主流程 apply_body_indent_to_doc() 统一处理
    - 通用化表述，避免硬编码特定业务名
    """
    project_name = scan.get('projectName') or scan.get('bankName') or '本项目'
    global_rules = scan.get('globalRules', [])
    rules_text = '、'.join(str(r) for r in global_rules) if global_rules else ''

    lines = [
        f'{project_name}是核心业务系统之一，{module_name}是其重要组成部分。',
        '',
        f'{module_name}负责实现相关业务流程的电子化处理，涵盖业务数据的录入、审批、查询和管理等功能，'
        f'为业务人员提供统一的操作入口和数据视图。',
    ]
    if rules_text:
        lines.append(f'全局业务规则包括：{rules_text}。')
    return '\n'.join(lines)


def _build_design_goal_text(module_name, scan):
    """生成设计目标文本（基于 module_name + scan.techStack 动态生成）。

    设计原则：
    - 不硬编码任何业务名（如"票据"/"账户"等）
    - 技术栈相关描述使用通用表述
    - 输出纯文本段落（与 _build_overview_text 风格保持一致）
    """
    tech_stack = scan.get('techStack', []) or []
    # 推断关键能力（不硬编码业务）
    capability_lines = []
    if tech_stack:
        # 仅取前 3 项作为"主要技术能力"标签，避免列表过长
        capability_lines = [f'采用{tech}技术构建高可用的{module_name}能力' for tech in tech_stack[:3]]
    else:
        capability_lines = [
            f'构建统一的{module_name}业务处理能力',
            '支持业务流程的电子化、参数化和可配置化',
        ]

    lines = [
        f'本章描述{module_name}概要设计的总体目标。',
        '',
        f'设计目标包括：',
    ]
    # 通用目标条目（不绑定具体业务）
    goals = [
        f'实现{module_name}核心业务的电子化处理与统一管理；',
        '满足业务高并发、高可用的运行要求；',
        '提供清晰的组件划分和标准化的服务接口；',
    ] + [f'{cap}；' for cap in capability_lines] + [
        '保证系统的可扩展性、可维护性和安全性。',
    ]
    for idx, g in enumerate(goals, 1):
        lines.append(f'{idx}. {g}')

    lines.append('')
    lines.append(f'本{module_name}概要设计说明书作为后续详细设计、代码实现及测试验证的总体技术依据。')
    return '\n'.join(lines)


def _build_purpose_text(module_name):
    """生成编写目的文本"""
    return (f'本文档是{module_name}概要设计说明书，旨在描述系统的总体架构、'
            f'核心组件及其交互关系，为详细设计和开发实现提供技术依据。'
            f'本文档将作为开发团队、测试团队和项目管理人员之间的技术契约。')


def _build_readers_text():
    """生成读者对象文本"""
    readers = ['项目经理', '架构师', '开发工程师', '测试工程师']
    lines = ['本文档的目标读者包括：']
    for idx, reader in enumerate(readers, 1):
        lines.append(f'{idx}. {reader}')
    return '\n'.join(lines)


def _build_scope_text(module_name, scan=None):
    """生成适用范围文本，优先从 scan 数据中提取业务模块信息"""
    bm = scan.get('businessModules', []) if scan else []
    if bm:
        mod_names = [m.get('name', '') for m in bm if m.get('name')]
        lines = [f'本文档适用于{module_name}的设计与开发阶段。']
        if mod_names:
            lines.append('')
            lines.append(f'{module_name}涵盖以下业务模块：')
            for idx, name in enumerate(mod_names, 1):
                lines.append(f'{idx}. {name}')
        lines.append('')
        lines.append('涵盖系统架构设计、组件划分、接口定义及非功能性要求等方面。')
        return '\n'.join(lines)
    return (f'本文档适用于{module_name}的设计与开发阶段，'
            f'涵盖系统架构设计、组件划分、接口定义及非功能性要求等方面。')


def _build_glossary_data(scan):
    """从技术栈推断术语表"""
    tech_stack = scan.get('techStack', [])
    # 通用票据术语
    glossary = [
        ('RPC', 'Remote Procedure Call', '远程过程调用，用于服务间通信'),
        ('API', 'Application Programming Interface', '应用程序编程接口'),
        ('DTO', 'Data Transfer Object', '数据传输对象'),
        ('DAO', 'Data Access Object', '数据访问对象'),
    ]
    # 从技术栈推断
    tech_glossary = {
        'Spring Boot': ('Spring Boot', 'Spring Boot', '基于Spring的快速开发框架'),
        'MyBatis': ('MyBatis', 'MyBatis', '半自动ORM持久层框架'),
        'Dubbo RPC': ('Dubbo', 'Dubbo', '分布式RPC服务框架'),
        'Redis': ('Redis', 'Redis', '高性能键值缓存数据库'),
    }
    for tech in tech_stack:
        if tech in tech_glossary:
            glossary.append(tech_glossary[tech])
    return ['术语', '英文全称', '说明'], glossary


def _build_references_text():
    """生成参考资料列表"""
    refs = [
        '需求规格说明书',
        '接口规范文档',
        '数据库设计文档',
        '系统架构设计文档',
        '项目开发计划',
    ]
    lines = []
    for idx, ref in enumerate(refs, 1):
        lines.append(f'[{idx}] {ref}')
    return '\n'.join(lines)


def _build_design_strategy_text():
    """生成设计策略/设计原则文本"""
    principles = [
        ('高内聚低耦合', '各组件内部功能高度聚合，组件间通过明确定义的接口交互，降低耦合度。'),
        ('可扩展性', '系统设计支持业务功能的横向扩展，新增业务模块不影响现有功能。'),
        ('安全性', '遵循最小权限原则，关键操作需经过权限校验和审计日志记录。'),
        ('可维护性', '代码结构清晰，遵循统一编码规范，便于后续维护和迭代。'),
        ('高可用性', '关键服务采用集群部署，支持故障自动切换，确保业务连续性。'),
    ]
    lines = ['本系统设计遵循以下原则：', '']
    for idx, (name, desc) in enumerate(principles, 1):
        lines.append(f'{idx}. {name}：{desc}')
    return '\n'.join(lines)


def _build_design_constraint_text():
    """生成设计约束文本（通用约束，不硬编码特定业务）"""
    constraints = [
        ('开发语言', 'Java 8+，确保与现有技术栈兼容，利用 Lambda 表达式和 Stream API 提升开发效率。'),
        ('应用框架', 'Spring Boot 2.x，采用微服务架构，各服务独立部署、独立升级。'),
        ('数据持久化', 'MyBatis 作为 ORM 框架，数据库采用 Oracle/MySQL，支持主从分离和高可用部署。'),
        ('服务通信', 'Dubbo RPC 作为分布式服务框架，使用 ZooKeeper 实现服务注册与发现。'),
        ('前端技术', 'Vue.js + Element UI，前端与后端通过 RESTful API 交互，前后端分离开发。'),
        ('安全约束', '接口鉴权采用 OAuth2.0 + JWT，关键操作需经过权限校验和审计日志记录。'),
        ('部署环境', '基于 Linux 环境部署，使用 Nginx 作为反向代理，Docker 容器化部署。'),
    ]
    lines = ['本系统设计遵循以下约束条件：', '']
    for idx, (name, desc) in enumerate(constraints, 1):
        lines.append(f'{idx}. {name}：{desc}')
    return '\n'.join(lines)


def _build_external_interface_table(scan):
    """从 scan_data 构建外部接口表

    - 优先从 interfaces 和 externalDeps 提取实际数据
    - 若为空，则基于 subsystems 生成默认外部接口，避免显示"不涉及"
    - 最终兜底：至少一个核心接口条目
    """
    headers = ['接口名称', '提供方', '调用方式', '说明']
    rows = []

    # 从 interfaces 提取
    interfaces = scan.get('interfaces', [])
    for iface in interfaces:
        if isinstance(iface, dict):
            name = iface.get('name', '')
            subsystem = iface.get('subsystem', '')
            protocol = iface.get('protocol', 'RPC')
            desc = iface.get('desc', f'调用{subsystem}获取相关数据')
            if name and subsystem:
                rows.append([name, subsystem, protocol, desc])

    # 从 externalDeps 提取
    external_deps = scan.get('externalDeps', [])
    for dep in external_deps:
        if isinstance(dep, dict):
            name = dep.get('name', '')
            subsystem = dep.get('subsystem', '')
            protocol = dep.get('protocol', 'HTTP')
            desc = dep.get('desc', f'调用{subsystem}获取相关数据')
            if name and subsystem:
                rows.append([name, subsystem, protocol, desc])

    # 兜底：基于 subsystems 生成默认外部接口，最多列出5个，避免表格过长
    # 注：以下为系统全部外部接口中与当前需求相关的接口（按扫描顺序取前5个）
    if not rows:
        subsystems = scan.get('subsystems', [])
        subsystem_count = 0
        for sub in subsystems:
            if isinstance(sub, dict):
                name = sub.get('name', '')
                if name and name not in ('.git', 'node_modules', '.idea', 'target'):
                    rows.append([f'{name}服务接口', name, 'RPC', f'调用{name}子系统获取相关数据'])
                    subsystem_count += 1
                    if subsystem_count >= 5:
                        break

    # 最终兜底：至少一个核心接口
    if not rows:
        project_name = scan.get('projectName', '核心系统')
        rows.append([f'{project_name}核心接口', project_name, 'RPC', '系统核心业务接口调用'])

    return headers, rows


def _build_component_summary_table(scan):
    """从 scan_data.subsystems 构建组件汇总表，过滤非业务目录"""
    headers = ['组件名称', '职责描述', '关键技术']
    rows = []
    # 非业务目录黑名单
    EXCLUDED_DIRS = {'.git', 'node_modules', '.idea', 'target', '.vscode', '__pycache__', '.settings', 'bin', 'logs'}

    subsystems = scan.get('subsystems', [])
    for sub in subsystems:
        if isinstance(sub, dict):
            name = sub.get('name', '')
            if name in EXCLUDED_DIRS or name.startswith('.'):
                continue
            desc = sub.get('desc', sub.get('description', ''))
            tech = sub.get('techStack', '')
            if name:
                rows.append([name, desc or f'{name}业务处理', tech or 'Spring Boot'])

    if not rows:
        module_name = scan.get('requirementModuleName') or scan.get('projectName') or '核心组件'
        rows.append([module_name, f'{module_name}业务处理', 'Spring Boot + MyBatis'])

    return headers, rows


def _build_tech_impl_text(scan):
    """从 scan_data.techStack 构建技术实现描述，内容与业务模块关联"""
    module_name = scan.get('requirementModuleName') or scan.get('projectName') or '本项目'
    tech_stack = scan.get('techStack', [])
    if not tech_stack:
        modules = scan.get('modules', [])
        has_dubbo = any('dubbo' in m.get('name', '').lower() or 'dubbo' in m.get('path', '').lower()
                        for m in modules)
        has_redis = any('redis' in m.get('name', '').lower() or 'redis' in m.get('path', '').lower()
                        for m in modules)
        tech_stack = ['Spring Boot', 'MyBatis']
        if has_dubbo:
            tech_stack.append('Dubbo RPC')
        if has_redis:
            tech_stack.append('Redis')

    # 技术模板：描述与实际业务场景关联
    tech_templates = {
        'Spring Boot': '基于 Spring Boot 框架构建独立微服务，通过 RESTful API 对外提供{module}相关服务。',
        'MyBatis': '使用 MyBatis 作为数据访问层，管理{module}相关的数据持久化操作。',
        'Dubbo RPC': '服务间通过 Dubbo RPC 进行通信，使用 ZooKeeper 实现服务注册与发现。',
        'Redis': '缓存{module}相关的高频访问数据，通过 Redis 哨兵模式保证高可用。',
    }

    lines = [f'{module_name}采用以下关键技术实现：', '']
    for idx, tech in enumerate(tech_stack, 1):
        desc = tech_templates.get(tech, f'采用{tech}技术框架实现相关功能。')
        desc = desc.format(module=module_name)
        lines.append(f'{idx}. {tech}：{desc}')
        lines.append('')

    # 业务特性技术（仅当存在业务模块时添加）
    business_modules = scan.get('businessModules', [])
    if business_modules:
        next_idx = len(tech_stack) + 1
        lines.append(f'{next_idx}. 业务校验：基于{module_name}的业务规则，在服务层实现核心逻辑校验与状态流转控制。')
        lines.append('')
        next_idx += 1
        lines.append(f'{next_idx}. 审计日志：通过 AOP 拦截关键业务方法，记录{module_name}的操作人、操作时间、操作内容到审计表。')
    else:
        lines.append(f'{len(tech_stack) + 1}. 数据库事务：基于 Spring 声明式事务管理，确保业务操作的原子性。')
        lines.append('')
        lines.append(f'{len(tech_stack) + 2}. 审计日志：通过 AOP 拦截关键业务方法，记录操作人、操作时间、操作内容到审计表。')
    return '\n'.join(lines)


def _build_non_functional_text():
    """生成非功能性设计文本

    改造点（按需求）：
    - 不再插入 H3 级别子标题（模板本身已有 H2 级别的非功能性子章节）
    - 改为纯文本段落，只填充内容，不创建新标题结构
    - 避免与模板自带的 H2 子章节（界面/性能/安全性/可靠性等）冲突
    """
    # 非功能性设计标准内容（通用，非特定业务）
    subsections = [
        ('性能要求', '核心操作响应时间不超过500ms，列表查询响应时间不超过1s，支持50+并发用户。'),
        ('安全要求', '所有接口需通过OAuth2.0鉴权，敏感数据加密传输，关键操作记录审计日志。'),
        ('可用性要求', '系统可用性不低于99.9%，关键服务采用集群部署，支持故障自动切换。'),
        ('可扩展性要求', '系统支持水平扩展，新增业务模块不影响现有功能运行。'),
        ('数据一致性要求', '核心业务操作采用分布式事务或补偿机制保证数据最终一致性。'),
    ]
    # 纯文本段落：不使用 ### H3 标记，避免与模板 H2 子章节冲突
    lines = []
    for name, desc in subsections:
        lines.append(f'{name}：{desc}')
        lines.append('')
    return '\n'.join(lines).rstrip()


def _build_appendix_text():
    """生成附录说明"""
    return ('附录包含以下内容：\n'
            '1. ER图：详见数据库设计章节中的实体关系图。\n'
            '2. 接口清单：详见各组件"提供的接口"和"需要的接口"章节。\n'
            '3. 部署架构图：详见系统总体框架章节。')


def _fill_chapter_content(doc, scan, module_name):
    """第二遍扫描：根据章节标题关键词匹配，填充各章节内容

    通过 H1/H2 标题文本匹配（不硬编码序号），使用 _find_paragraph_by_text 查找。

    增强点：
    - 优先通过 ContentRegistry 按需加载内容生成器
    - 表格插入后调用 doc_formatter.apply_table_style 统一外观
    - 非功能性章节识别 ### H3 标记并生成 H3 样式段落
    - 外部接口章节无内容时调用 doc_formatter.fill_empty_chapter 标注"不涉及"
    """
    # 构建章节关键词 → 填充逻辑的映射
    chapter_fillers = [
        (CHAPTER_KEYWORDS_OVERVIEW, lambda: _build_overview_text(scan, module_name), 'text'),
        (CHAPTER_KEYWORDS_PURPOSE, lambda: _build_purpose_text(module_name), 'text'),
        (CHAPTER_KEYWORDS_READERS, lambda: _build_readers_text(), 'text'),
        (CHAPTER_KEYWORDS_SCOPE, lambda: _build_scope_text(module_name, scan), 'text'),
        (CHAPTER_KEYWORDS_GOAL, lambda: _build_design_goal_text(module_name, scan), 'text'),
        (CHAPTER_KEYWORDS_GLOSSARY, lambda: _build_glossary_data(scan), 'table'),
        (CHAPTER_KEYWORDS_REFERENCES, lambda: _build_references_text(), 'text'),
        (CHAPTER_KEYWORDS_DESIGN_CONSTRAINT, lambda: _build_design_constraint_text(), 'text'),
        (CHAPTER_KEYWORDS_STRATEGY, lambda: _build_design_strategy_text(), 'text'),
        (CHAPTER_KEYWORDS_EXTERNAL_IFACE, lambda: _build_external_interface_table(scan), 'table'),
        (CHAPTER_KEYWORDS_COMPONENT_SUMMARY, lambda: _build_component_summary_table(scan), 'table'),
        (CHAPTER_KEYWORDS_TECH_IMPL, lambda: _build_tech_impl_text(scan), 'text'),
        (CHAPTER_KEYWORDS_NON_FUNC, lambda: _build_non_functional_text(), 'text'),
        (CHAPTER_KEYWORDS_APPENDIX, lambda: _build_appendix_text(), 'text'),
    ]

    for keywords, content_fn, content_type in chapter_fillers:
        # 尝试通过 ContentRegistry 获取内容生成器
        content = _try_content_registry_generate(scan, keywords, content_type)
        if content is None:
            content = content_fn()

        # 通过关键词查找匹配的标题段落
        target = None
        for kw in keywords:
            target = _find_paragraph_by_text(doc, kw)
            if target is not None:
                break

        if target is None:
            continue

        # 清理标题和下一标题之间的旧内容
        _clear_content_between_headings(target)

        # 插入新内容
        heading_elem = target._element

        if content_type == 'text':
            # 按行插入段落
            lines = content.split('\n')
            insert_anchor = heading_elem
            for line in lines:
                new_p = _insert_paragraph_after_element(insert_anchor, line)
                insert_anchor = new_p
        elif content_type == 'table':
            headers, rows = content
            if headers and rows:
                tbl_elem = _insert_table_after_element(heading_elem, headers, rows)
                _apply_table_style_to_element(doc, tbl_elem)
            else:
                doc_formatter.fill_empty_chapter_compat(
                    doc, list(keywords), placeholder='不涉及', skip_if_has_content=False
                )
        elif content_type == 'h3mixed':
            _insert_h3mixed_content(doc, heading_elem, content)


def _try_content_registry_generate(scan, keywords, content_type):
    """尝试通过 ContentRegistry 按需加载内容生成器

    优先使用 content 模块的生成器，失败时返回 None（由调用方回退）。
    """
    if _content_registry is None:
        return None
    try:
        for kw in keywords:
            result = _content_registry.generate('outline', kw, scan)
            if result is not None:
                return result
        return None
    except Exception:
        return None


def _apply_table_style_to_element(doc, tbl_elem):
    """对 OXML 表格元素应用 doc_formatter 统一样式

    tbl_elem 是 w:tbl 元素；需要找到对应的 docx Table 对象才能调用 doc_formatter。
    """
    try:
        # 通过元素查找对应的 Table 对象
        for table in doc.tables:
            if table._tbl is tbl_elem:
                doc_formatter.apply_table_style(table)
                return
    except Exception as e:
        print(f'[WARN] 应用表格样式失败: {e}', file=sys.stderr)


def _insert_h3mixed_content(doc, anchor_elem, content_text):
    """插入 H3 标记混合内容：识别 '### 标题' 行为 H3 样式，其余为普通段落

    用于非功能性设计等需要子章节结构的章节。
    """
    insert_anchor = anchor_elem
    for line in content_text.split('\n'):
        if line.startswith('### '):
            title = line[4:].strip()
            # 构造 H3 样式段落（复用模板 h3 样式）
            h3_p_elem = _new_heading(doc, title, level=3)
            insert_anchor.addnext(h3_p_elem)
            insert_anchor = h3_p_elem
        elif line.strip() == '':
            # 空行：跳过
            continue
        else:
            # 普通段落
            new_p = _insert_paragraph_after_element(insert_anchor, line)
            insert_anchor = new_p


# ═══════════════════════════════════════════════════════════════
# 修订记录表格更新
# ═══════════════════════════════════════════════════════════════

def _update_revision_table(doc):
    """查找文档中的修订记录表格，更新第一行数据

    查找包含"版本"/"日期"/"修改人"/"修改内容"等列头的表格，
    将第一行数据更新为：V1.0 | 当前日期 | 自动生成 | 初始版本

    使用直接 XML 操作而非 fill_cell_text，避免对某些单元格结构不兼容导致写入失败。
    """
    revision_keywords = ('版本', '日期', '修改人', '修改内容', '修订')
    today = datetime.now().strftime('%Y-%m-%d')

    for table in doc.tables:
        header_cells = table.rows[0].cells if table.rows else []
        header_text = ' '.join(cell.text.strip() for cell in header_cells)
        match_count = sum(1 for kw in revision_keywords if kw in header_text)
        if match_count < 1:
            continue

        if len(table.rows) < 2:
            row_cells = table.add_row().cells
        else:
            row_cells = table.rows[1].cells

        # 构建列头→更新值的映射
        col_updates = {}
        for ci, cell in enumerate(header_cells):
            col_header = cell.text.strip()
            if '版本' in col_header:
                col_updates[ci] = 'V1.0'
            elif '日期' in col_header:
                col_updates[ci] = today
            elif '修改人' in col_header or '修订人' in col_header or '作者' in col_header:
                col_updates[ci] = '自动生成'
            elif '修改内容' in col_header or '修订内容' in col_header or '说明' in col_header or '描述' in col_header:
                col_updates[ci] = '初始版本'

        # 直接操作XML更新单元格内容，绕过 fill_cell_text 的兼容性问题
        for ci, new_text in col_updates.items():
            if ci >= len(row_cells):
                continue
            cell = row_cells[ci]
            # 清除单元格内所有段落的文本
            for para in cell.paragraphs:
                for run in para.runs:
                    run.text = ''
            # 在第一个段落设置新文本
            if cell.paragraphs:
                p = cell.paragraphs[0]
                if p.runs:
                    p.runs[0].text = new_text
                    try:
                        p.runs[0].font.color.rgb = RGBColor(0, 0, 0)
                    except Exception:
                        pass
                else:
                    run = p.add_run(new_text)
                    run.font.color.rgb = RGBColor(0, 0, 0)

        # 清除剩余数据行（第2行及以后），避免显示空白行
        for row_idx in range(2, len(table.rows)):
            for cell in table.rows[row_idx].cells:
                for para in cell.paragraphs:
                    for run in para.runs:
                        run.text = ''
        break


# ═══════════════════════════════════════════════════════════════
# 目录更新：注入 updateFields 到 document settings
# ═══════════════════════════════════════════════════════════════

def _inject_update_fields(output_path):
    """在 .docx 文件的 settings.xml 中注入 <w:updateFields w:val="true"/>

    让 Word 打开文档时自动提示"是否更新域"（更新目录）。
    仅当环境变量 BEMP_UPDATE_FIELDS=true 时执行。
    参考实现：scripts/lib/template_toc_utils.js 中的 injectUpdateFields()
    """
    env_val = os.environ.get('BEMP_UPDATE_FIELDS', '').lower()
    if env_val != 'true':
        return False

    try:
        # .docx 是 ZIP 包，直接操作 settings.xml
        with zipfile.ZipFile(output_path, 'r') as zin:
            file_list = zin.namelist()

        settings_path = 'word/settings.xml'
        if settings_path not in file_list:
            return False

        # 读取 settings.xml
        with zipfile.ZipFile(output_path, 'r') as zin:
            settings_content = zin.read(settings_path).decode('utf-8')

        # 检查是否已有 updateFields
        if 'updateFields' in settings_content:
            # 已存在，确保 val="true"
            import re
            settings_content = re.sub(
                r'(<w:updateFields\s+w:val=")([^"]*)(")',
                r'\g<1>true\3',
                settings_content
            )
        else:
            # 在 </w:settings> 前插入
            settings_content = settings_content.replace(
                '</w:settings>',
                '<w:updateFields w:val="true"/></w:settings>'
            )

        # 重写 ZIP 中的 settings.xml
        with zipfile.ZipFile(output_path, 'a') as zout:
            # ZIP 不支持直接修改，需要重建
            pass

        # 完整重建 ZIP
        temp_path = output_path + '.tmp'
        with zipfile.ZipFile(output_path, 'r') as zin:
            with zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    if item.filename == settings_path:
                        zout.writestr(item, settings_content.encode('utf-8'))
                    else:
                        zout.writestr(item, zin.read(item.filename))

        # 替换原文件
        shutil.move(temp_path, output_path)
        return True

    except Exception as e:
        print(f'[WARN] 注入 updateFields 失败: {e}', file=sys.stderr)
        return False


# ═══════════════════════════════════════════════════════════════
# 原图清空：删除标题和下一标题之间的 w:drawing / w:pict 元素
# ═══════════════════════════════════════════════════════════════

def _clear_drawings_between_headings(heading_para):
    """删除标题和下一个同级/更高级标题之间的所有 w:drawing 和 w:pict 元素"""
    heading_element = heading_para._element
    parent = heading_element.getparent()
    if parent is None:
        return

    heading_style_vals = {'1', '2', '3', '4', '5', '6',
                          'Heading1', 'Heading2', 'Heading3',
                          'heading1', 'heading2', 'heading3',
                          'heading 1', 'heading 2', 'heading 3'}

    # 收集标题到下一标题之间的所有段落元素
    elems_in_range = []
    found = False
    for elem in list(parent):
        if elem is heading_element:
            found = True
            continue
        if not found:
            continue
        if elem.tag.endswith('}p'):
            pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '')
                if style_val in heading_style_vals:
                    break
            elems_in_range.append(elem)

    # 在这些段落中删除 drawing 和 pict 元素
    for elem in elems_in_range:
        for drawing in list(elem.findall('.//' + qn('w:drawing'))):
            drawing.getparent().remove(drawing)
        for pict in list(elem.findall('.//' + qn('w:pict'))):
            pict.getparent().remove(pict)


# ═══════════════════════════════════════════════════════════════
# 业务子模块构建
# ═══════════════════════════════════════════════════════════════

def _build_function_description(bm, module_name):
    """根据子模块的子节信息动态生成功能描述文本"""
    bm_name = bm.get('name', '')
    bm_desc = bm.get('desc', '')
    subsections = bm.get('subsections', []) or []

    # 从子节中提取功能点
    func_points = []
    for sub in subsections:
        if isinstance(sub, dict):
            sub_name = sub.get('name', '')
            if sub_name:
                func_points.append(sub_name)

    # 如果子节不足，补充通用功能点
    if not func_points:
        func_points = ['查询和列表展示', '新增和维护', '复核审批', '状态管理和日志记录']

    lines = [f'{bm_name}组件提供{bm_desc if bm_desc else "相关业务处理"}。', '']
    lines.append('主要业务功能包括：')
    for idx, fp in enumerate(func_points, 1):
        lines.append(f'{idx}. {bm_name}的{fp}；')
    lines.append('')
    lines.append('业务约束：所有操作需通过岗位分离和权限校验，关键操作记录审计日志。')
    return '\n'.join(lines)


def _build_tech_description(scan, bm=None):
    """根据 scan_data 中的技术栈信息动态生成关键技术描述

    当提供 bm 参数时，根据 bm.get('name') 生成组件特定的技术描述，
    避免所有组件共用同一段技术描述。
    """
    tech_stack = scan.get('techStack', [])
    # 如果 scan_data 没有技术栈信息，从模块列表推断
    if not tech_stack:
        modules = scan.get('modules', [])
        has_dubbo = any('dubbo' in m.get('name', '').lower() or 'dubbo' in m.get('path', '').lower()
                        for m in modules)
        has_redis = any('redis' in m.get('name', '').lower() or 'redis' in m.get('path', '').lower()
                        for m in modules)
        tech_stack = ['Spring Boot', 'MyBatis']
        if has_dubbo:
            tech_stack.append('Dubbo RPC')
        if has_redis:
            tech_stack.append('Redis')

    bm_name = bm.get('name', '') if bm else ''

    # 技术描述模板：根据组件名动态生成差异化描述
    tech_templates = {
        'Spring Boot': '基于 Spring Boot 框架构建 RESTful API，提供{bm}相关的 HTTP 接口服务。',
        'MyBatis': '使用 MyBatis 实现{bm}相关的数据持久化，通过 XML 映射文件管理 SQL。',
        'Dubbo RPC': '通过 Dubbo RPC 实现{bm}相关的服务间通信，使用 ZooKeeper 进行服务注册与发现。',
        'Redis': '使用 Redis 缓存{bm}相关的高频查询数据，通过哨兵模式保证高可用。',
    }

    lines = []
    if bm_name:
        lines.append(f'{bm_name}组件采用以下关键技术实现：')
    else:
        lines.append('本组件采用以下关键技术实现：')
    lines.append('')
    for idx, tech in enumerate(tech_stack, 1):
        desc = tech_templates.get(tech, f'采用{tech}技术框架实现相关功能。')
        desc = desc.format(bm=bm_name or '本组件')
        lines.append(f'{idx}. {tech}：{desc}')
        lines.append('')

    # 组件特定技术描述（根据组件名差异化）
    if bm_name:
        lines.append(f'{len(tech_stack) + 1}. 业务校验：在服务层实现{bm_name}的业务规则校验，确保数据合法性。')
        lines.append('')
        lines.append(f'{len(tech_stack) + 2}. 操作日志：通过 AOP 记录{bm_name}相关操作的用户、时间和内容。')
    else:
        lines.append(f'{len(tech_stack) + 1}. 数据库事务：基于 Spring 声明式事务管理，确保业务操作的原子性。')
        lines.append('')
        lines.append(f'{len(tech_stack) + 2}. 审计日志：通过 AOP 拦截关键业务方法，记录操作信息。')
    return '\n'.join(lines)


def _build_provided_interfaces(bm):
    """根据子模块的子节信息动态生成提供的接口描述"""
    bm_name = bm.get('name', '')
    subsections = bm.get('subsections', []) or []

    # 从子节推断接口
    iface_map = {
        '查询': f'提供{bm_name}的列表查询和分页功能。',
        '新增': f'提供{bm_name}的新增功能。',
        '修改': f'提供{bm_name}的修改功能。',
        '删除': f'提供{bm_name}的删除功能（含业务校验）。',
        '复核': f'提供{bm_name}的复核提交和撤销功能。',
        '清单导出': '提供 Excel 导出功能。',
        '导出': '提供 Excel 导出功能。',
    }

    lines = ['本组件对外提供以下核心接口：', '']
    idx = 1
    # 优先从子节生成
    for sub in subsections:
        if isinstance(sub, dict):
            sub_name = sub.get('name', '')
            if sub_name in iface_map:
                lines.append(f'{idx}. {sub_name}接口：{iface_map[sub_name]}')
                idx += 1

    # 如果子节没有覆盖到，补充通用接口
    if idx == 1:
        for op_name, desc in iface_map.items():
            if op_name in ('查询', '新增', '修改', '删除'):
                lines.append(f'{idx}. {op_name}接口：{desc}')
                idx += 1

    lines.append('')
    lines.append('接口协议：RESTful JSON，鉴权采用 OAuth2.0 + JWT，错误码遵循平台统一规范。')
    return '\n'.join(lines)


def _build_required_interfaces(scan, module_name, bm=None):
    """根据 scan_data 中的外部依赖动态生成需要的接口描述

    优先从 scan_data.businessModules 的 subsections 中提取接口信息。
    当提供 bm 参数时，仅从该 bm 的 subsections 生成接口，避免所有组件共用同一份接口列表。
    """
    # 当提供 bm 时，优先从 bm 的 subsections 生成组件特定的接口
    if bm is not None:
        subsections = bm.get('subsections', []) or []
        subsection_iface_map = {
            '查询': '数据查询接口：调用数据服务获取业务数据列表。',
            '新增': '数据新增接口：调用数据服务新增业务记录。',
            '修改': '数据修改接口：调用数据服务修改业务记录。',
            '删除': '数据删除接口：调用数据服务删除业务记录（含业务校验）。',
            '复核': '审批流程接口：调用工作流引擎提交/撤销复核。',
            '清单导出': '文件导出接口：调用通用导出服务生成Excel文件。',
            '导出': '文件导出接口：调用通用导出服务生成文件。',
        }
        bm_name = bm.get('name', '')
        lines = [f'本组件（{bm_name}）需要调用以下外部接口：', '']
        idx = 1
        seen = set()
        for sub in subsections:
            if isinstance(sub, dict):
                sub_name = sub.get('name', '')
                if sub_name in subsection_iface_map and sub_name not in seen:
                    lines.append(f'{idx}. {subsection_iface_map[sub_name]}')
                    idx += 1
                    seen.add(sub_name)
        if idx == 1:
            # 无具体子节时给出通用接口
            lines.append('1. 权限校验接口：调用系统管理组件验证操作员权限。')
            lines.append('2. 字典查询接口：调用通用组件查询业务字典。')
            idx = 3
        else:
            if '权限' not in seen:
                lines.append(f'{idx}. 权限校验接口：调用系统管理组件验证操作员权限。')
                idx += 1
            if '字典' not in seen:
                lines.append(f'{idx}. 字典查询接口：调用通用组件查询业务字典。')
                idx += 1
        lines.append('')
        lines.append('外部接口通过 RPC 或 HTTP 调用，统一通过平台服务网关进行路由和监控。')
        return '\n'.join(lines)

    # 无 bm 时，走原有逻辑：从所有 businessModules 收集子节
    business_modules = scan.get('businessModules', [])
    subsection_iface_map = {
        '查询': '数据查询接口：调用数据服务获取业务数据列表。',
        '新增': '数据新增接口：调用数据服务新增业务记录。',
        '修改': '数据修改接口：调用数据服务修改业务记录。',
        '删除': '数据删除接口：调用数据服务删除业务记录（含业务校验）。',
        '复核': '审批流程接口：调用工作流引擎提交/撤销复核。',
        '清单导出': '文件导出接口：调用通用导出服务生成Excel文件。',
        '导出': '文件导出接口：调用通用导出服务生成文件。',
    }

    # 收集所有子模块的子节
    all_subsections = []
    for bm in business_modules:
        if isinstance(bm, dict):
            subsections = bm.get('subsections', []) or []
            for sub in subsections:
                if isinstance(sub, dict):
                    sub_name = sub.get('name', '')
                    if sub_name:
                        all_subsections.append(sub_name)

    # 如果有具体的子节，只生成子节对应的接口
    if all_subsections:
        lines = ['本组件需要调用以下外部接口：', '']
        idx = 1
        seen = set()
        for sub_name in all_subsections:
            if sub_name in subsection_iface_map and sub_name not in seen:
                lines.append(f'{idx}. {subsection_iface_map[sub_name]}')
                idx += 1
                seen.add(sub_name)

        # 补充通用外部接口（权限、字典等）
        if '权限' not in seen:
            lines.append(f'{idx}. 权限校验接口：调用系统管理组件验证操作员权限。')
            idx += 1
        if '字典' not in seen:
            lines.append(f'{idx}. 字典查询接口：调用通用组件查询业务字典。')
            idx += 1

        lines.append('')
        lines.append('外部接口通过 RPC 或 HTTP 调用，统一通过平台服务网关进行路由和监控。')
        return '\n'.join(lines)

    # 兜底：从 scan_data 的 interfaces 中提取外部依赖
    external_deps = []
    interfaces = scan.get('interfaces', [])
    for iface in interfaces:
        if isinstance(iface, dict):
            subsystem = iface.get('subsystem', '')
            name = iface.get('name', '')
            if subsystem and name:
                external_deps.append({'subsystem': subsystem, 'name': name})

    # 如果 scan_data 没有外部依赖信息，从 subsystems 推断
    if not external_deps:
        subsystems = scan.get('subsystems', [])
        for sub in subsystems:
            if isinstance(sub, dict):
                sub_name = sub.get('name', '')
                # 排除自身模块
                if sub_name and module_name not in sub_name:
                    external_deps.append({'subsystem': sub_name, 'name': f'{sub_name}服务接口'})

    lines = ['本组件需要调用以下外部接口：', '']
    if external_deps:
        for idx, dep in enumerate(external_deps[:8], 1):
            lines.append(f'{idx}. {dep["name"]}：调用{dep["subsystem"]}获取相关数据。')
    else:
        lines.append('1. 权限校验接口：调用系统管理组件验证操作员权限。')
        lines.append('2. 字典查询接口：调用通用组件查询业务字典。')

    lines.append('')
    lines.append('外部接口通过 RPC 或 HTTP 调用，统一通过平台服务网关进行路由和监控。')
    return '\n'.join(lines)


def _insert_business_submodules(doc, scan, module_name, h1_style, h2_style, h3_style):
    """在第5章"系统组件"中插入业务子模块（核心交付）

    所有内容均从 scan_data 动态生成，不包含业务硬编码。
    """
    business_modules = scan.get('businessModules') or _extract_modules_from_requirement(scan)

    # 子模块后处理：提升独立子节 + 基于全局规则补齐隐含子模块
    business_modules = _enrich_business_modules(business_modules, scan, module_name)

    if not business_modules:
        # 兜底：如果没有解析到任何子模块，生成一个通用占位
        business_modules = [
            {'name': module_name, 'desc': f'{module_name}的业务处理', 'subsections': []},
        ]

    # 查找插入位置
    comp1 = _find_paragraph_by_text(doc, TEMPLATE_COMPONENT_FIRST, level=2)
    comp_n = _find_paragraph_by_text(doc, TEMPLATE_COMPONENT_LAST, level=2)

    if comp1 is None:
        comp1 = _find_paragraph_by_text(doc, CHAPTER_SYSTEM_COMPONENT, level=1)

    if comp1 is None:
        return

    # 删除模板组件N占位
    if comp_n is not None:
        elems_to_remove = []
        for sib in comp_n._element.itersiblings():
            if sib.tag == qn('w:p'):
                pPr = sib.find(qn('w:pPr'))
                if pPr is not None:
                    pStyle = pPr.find(qn('w:pStyle'))
                    if pStyle is not None:
                        sid = pStyle.get(qn('w:val'), '')
                        if sid in ('1', 'Heading1') or 'Heading1' in sid:
                            break
            elems_to_remove.append(sib)
        for e in elems_to_remove:
            e.getparent().remove(e)

    # 动态生成业务子模块内容
    new_elements = []
    for i, bm in enumerate(business_modules, 1):
        bm_name = bm.get('name', f'组件{i}')
        # 5.X 组件名（H2）
        new_elements.append(_new_heading(doc, f'组件{i} {bm_name}', 2, h2_style, '2'))

        # 5.X.1 功能描述（H3）—— 从子节动态生成
        new_elements.append(_new_heading(doc, '功能描述', 3, h3_style, '3'))
        func_text = _build_function_description(bm, module_name)
        new_elements.append(_new_paragraph(doc, func_text))

        # 5.X.2 关键技术（H3）—— 从 scan_data 技术栈动态生成，传入 bm 以区分组件
        new_elements.append(_new_heading(doc, '关键技术', 3, h3_style, '3'))
        tech_text = _build_tech_description(scan, bm)
        new_elements.append(_new_paragraph(doc, tech_text))

        # 5.X.3 提供的接口（H3）—— 从子节动态生成
        new_elements.append(_new_heading(doc, '提供的接口', 3, h3_style, '3'))
        iface_text = _build_provided_interfaces(bm)
        new_elements.append(_new_paragraph(doc, iface_text))

        # 5.X.4 需要的接口（H3）—— 从 scan_data 外部依赖动态生成，传入 bm 以区分组件
        new_elements.append(_new_heading(doc, '需要的接口', 3, h3_style, '3'))
        need_text = _build_required_interfaces(scan, module_name, bm)
        new_elements.append(_new_paragraph(doc, need_text))

    # 删除模板原 comp1 占位及其后续 H3
    elems_to_remove = [comp1._element]
    for sib in comp1._element.itersiblings():
        if sib.tag != qn('w:p'):
            continue
        pPr = sib.find(qn('w:pPr'))
        if pPr is not None:
            pStyle = pPr.find(qn('w:pStyle'))
            if pStyle is not None:
                sid = pStyle.get(qn('w:val'), '')
                if sid in ('1', 'Heading1') or 'Heading1' in sid:
                    break
        elems_to_remove.append(sib)
    for e in elems_to_remove:
        e.getparent().remove(e)

    # 在下一章 H1 前插入新内容
    next_h1 = _find_paragraph_by_text(doc, CHAPTER_MODULE_REUSE, level=1)
    if next_h1 is None:
        next_h1 = _find_paragraph_by_text(doc, CHAPTER_NON_FUNCTIONAL, level=1)
    if next_h1 is None:
        return
    for e in new_elements:
        next_h1._element.addprevious(e)


def _extract_modules_from_requirement(scan):
    """从需求文档数据中提取业务子模块（兜底逻辑）"""
    req = scan.get('requirement') or {}
    sections = req.get('sections', [])
    modules = []
    for sec in sections:
        if sec.get('level') == 3 and sec.get('title'):
            modules.append({'name': sec['title'], 'desc': sec.get('summary', ''), 'subsections': []})
    return modules


def _enrich_business_modules(modules, scan, module_name=''):
    """业务子模块后处理：
    (1) 提升独立的子节（含"明细"/"清单"等关键字）为业务子模块
    (2) 基于全局规则关键字补齐隐含子模块（如"占用/释放"）
    """
    if not modules:
        return modules

    # 规则(1)：从子节中提升含特定关键字的独立子模块
    new_modules = []
    for m in modules:
        kept_subs = []
        subsections = m.get('subsections', []) or []
        for sub in subsections:
            sub_name = sub.get('name', '') if isinstance(sub, dict) else str(sub)
            if (any(kw in sub_name for kw in PROMOTE_KEYWORDS)
                    and sub_name not in UI_OPERATION_NAMES):
                new_modules.append({
                    'name': sub_name,
                    'desc': f'{sub_name}子模块提供{sub_name}的查询、维护、导出等功能。',
                    'subsections': [sub] if isinstance(sub, dict) else []
                })
            else:
                kept_subs.append(sub)
        if kept_subs:
            m['subsections'] = kept_subs
        new_modules.append(m)

    modules = new_modules

    # 规则(2)：基于全局规则关键字补齐隐含子模块
    existing_names = {m.get('name', '') for m in modules}
    global_rules = scan.get('globalRules', []) if isinstance(scan, dict) else []
    global_rules_text = ' '.join(str(r) for r in global_rules)

    for keyword, suffix, desc_template in RULE_KEYWORD_MODULE_MAP:
        if keyword in global_rules_text:
            bm_name = f'{module_name}{suffix}' if module_name else suffix
            # 去重：避免"{module_name}{suffix}"和短名"{suffix}"同时存在
            if not any(suffix in existing for existing in existing_names):
                bm_desc = desc_template.format(module_name=module_name)
                modules.append({
                    'name': bm_name,
                    'desc': bm_desc,
                    'subsections': []
                })
                existing_names.add(bm_name)

    return modules


# ═══════════════════════════════════════════════════════════════
# 架构图和 ER 图插入（含原图清空）
# ═══════════════════════════════════════════════════════════════

def _insert_architecture_diagrams(doc, diagram_dir, h2_style):
    """在系统总体框架章节插入架构图、网络拓扑图、部署图

    插入新图前先删除标题和下一标题之间的所有 w:drawing 和 w:pict 元素。
    增强点（按需求）：
    - 每张图前后插入 Caption 描述段落（描述从 scan_data.subsystems 动态生成，不硬编码）
    - 图片宽度统一为 IMAGE_WIDTH_INCHES（5 英寸）
    """
    arch_path = os.path.join(diagram_dir, 'architecture-diagram.png')
    net_path = os.path.join(diagram_dir, 'network-topology.png')
    deploy_path = os.path.join(diagram_dir, 'deployment-diagram.png')

    # 动态生成架构图描述（从 doc.subsystems 推断）
    arch_desc = _build_architecture_caption(doc, '组件结构图')
    net_desc = _build_architecture_caption(doc, '网络结构图')
    deploy_desc = _build_architecture_caption(doc, '部署图')

    # ─── 架构图 ───
    arch_target = _find_paragraph_by_text(doc, '组件结构图', level=2)
    if arch_target is None:
        arch_target = _find_paragraph_by_text(doc, CHAPTER_TOTAL_FRAMEWORK, level=1)
    if arch_target is not None:
        # 先清旧图
        _clear_drawings_between_headings(arch_target)
        # 插入描述段落（紧跟标题）
        if arch_desc:
            doc_formatter.insert_caption_paragraph(doc, arch_target, arch_desc)
        # 插入架构图
        if os.path.exists(arch_path):
            arch_p = doc.add_paragraph()
            arch_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = arch_p.add_run()
            try:
                # 宽度固定为 5 英寸，高度按比例自动调整
                run.add_picture(arch_path, width=Inches(IMAGE_WIDTH_INCHES))
            except Exception as e:
                print(f'[WARN] 插入架构图失败: {e}', file=sys.stderr)
            arch_target._element.addnext(arch_p._element)

    # ─── 网络拓扑图 ───
    net_target = _find_paragraph_by_text(doc, CHAPTER_NETWORK_DIAGRAM, level=2)
    if net_target is not None:
        # 先清旧图
        _clear_drawings_between_headings(net_target)
        if net_desc:
            doc_formatter.insert_caption_paragraph(doc, net_target, net_desc)
        if os.path.exists(net_path):
            net_p = doc.add_paragraph()
            net_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = net_p.add_run()
            try:
                run.add_picture(net_path, width=Inches(IMAGE_WIDTH_INCHES))
            except Exception as e:
                print(f'[WARN] 插入网络拓扑图失败: {e}', file=sys.stderr)
            net_target._element.addnext(net_p._element)

    # ─── 部署图 ───
    deploy_target = _find_paragraph_by_text(doc, '部署图', level=2)
    if deploy_target is not None:
        # 先清旧图
        _clear_drawings_between_headings(deploy_target)
        if deploy_desc:
            doc_formatter.insert_caption_paragraph(doc, deploy_target, deploy_desc)
        if os.path.exists(deploy_path):
            deploy_p = doc.add_paragraph()
            deploy_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = deploy_p.add_run()
            try:
                # 部署图图标大小：宽度 5 英寸（原图可能过大）
                run.add_picture(deploy_path, width=Inches(IMAGE_WIDTH_INCHES))
            except Exception as e:
                print(f'[WARN] 插入部署图失败: {e}', file=sys.stderr)
            deploy_target._element.addnext(deploy_p._element)


def _build_architecture_caption(doc, diagram_name):
    """动态生成架构图/网络图/部署图描述

    从 doc 中提取 subsystem 数量（如不可得则用通用文本），不硬编码业务。
    """
    # 通用描述前缀（参数化）
    preamble = DIAGRAM_DESC_PREAMBLE
    # 优先以"图名 + 描述"形式
    # 通用：基于章节名构建描述
    return f'{preamble} - {diagram_name}。展示系统关键模块、组件关系及部署形态。'


def _insert_er_diagrams(doc, er_png_paths, h1_style, h2_style):
    """在文档末尾（数据库设计位置）插入 ER 图

    插入新图前先删除标题和下一标题之间的所有 w:drawing 和 w:pict 元素。
    """
    target = _find_paragraph_by_text(doc, CHAPTER_DATABASE, level=1)
    if target is None:
        target = _find_paragraph_by_text(doc, CHAPTER_APPENDIX, level=1)
    if target is None:
        return

    # 先清旧图
    _clear_drawings_between_headings(target)

    for png_path in er_png_paths:
        if not png_path or not os.path.exists(png_path):
            continue
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        try:
            run.add_picture(png_path, width=Inches(IMAGE_WIDTH_INCHES))
        except Exception as e:
            print(f'[WARN] 插入 ER 图失败: {e}', file=sys.stderr)
        target._element.addprevious(p._element)


def _clean_design_constraint_chapter(doc, module_name):
    """清理"设计约束"标题下与业务无关的内容。

    设计原则：
    - 业务关键词从 module_name 提取 + 通用通用术语
    - 不相关段落被删除；如果整个章节清空，插入"不涉及"占位
    - 不影响"设计约束"标题本身，也不影响后续章节
    - 通用术语列表优先从 doc_rules.yaml 读取（design_constraint.generic_terms）
    - 增强：如果设计约束章节内容超过20段，说明包含模板原始占位内容，应全部清除
    - 增强：如果包含"设计策略"等窜入内容，全部清除

    返回实际删除的段落数。
    """
    if doc is None or not module_name:
        return 0

    body_elems = _iter_body_elements(doc)
    # 定位"设计约束"标题
    heading_idx = None
    for i, elem in enumerate(body_elems):
        if not _is_heading_element(elem):
            continue
        text = _heading_text_of_element(elem)
        if '设计约束' in text:
            heading_idx = i
            break
    if heading_idx is None:
        return 0

    # 找到下一标题
    next_idx = None
    for j in range(heading_idx + 1, len(body_elems)):
        if _is_heading_element(body_elems[j]):
            next_idx = j
            break
    end_idx = next_idx if next_idx is not None else len(body_elems)

    # 收集"设计约束"标题下的所有段落元素（不含标题本身）
    all_paras_in_range = []
    for j in range(heading_idx + 1, end_idx):
        elem = body_elems[j]
        if _is_heading_element(elem):
            break
        if not elem.tag.endswith('}p'):
            continue
        all_paras_in_range.append(elem)

    # 增强：如果段落数超过阈值，说明是模板原始占位内容，全部清除
    PARAS_THRESHOLD = 20
    if len(all_paras_in_range) > PARAS_THRESHOLD:
        removed = 0
        for elem in all_paras_in_range:
            parent = elem.getparent()
            if parent is None:
                continue
            parent.remove(elem)
            removed += 1
        # 清除后插入"不涉及"
        heading = _find_paragraph_by_text(doc, '设计约束', level=None)
        if heading is not None:
            _insert_paragraph_after_element(heading._element, '不涉及')
        return removed

    # 检查是否包含"设计策略"等属于其他章节的窜入内容
    stray_keywords = {'设计策略', '设计原则'}
    has_stray = False
    for elem in all_paras_in_range:
        text = ''
        for t in elem.findall('.//' + qn('w:t')):
            if t.text:
                text += t.text
        if any(kw in text for kw in stray_keywords):
            has_stray = True
            break

    # 如果存在窜入内容，全部清除
    if has_stray:
        removed = 0
        for elem in all_paras_in_range:
            parent = elem.getparent()
            if parent is None:
                continue
            parent.remove(elem)
            removed += 1
        heading = _find_paragraph_by_text(doc, '设计约束', level=None)
        if heading is not None and _is_chapter_empty_after_heading(doc, '设计约束'):
            _insert_paragraph_after_element(heading._element, '不涉及')
        return removed

    # 常规过滤：按关键词删除与业务无关的段落
    business_keywords = set()
    if module_name:
        business_keywords.add(module_name)
    # 优先使用 doc_rules.yaml 中的 generic_terms
    _rules = _load_doc_rules()
    _dc_cfg = _rules.get('design_constraint', {}) if isinstance(_rules, dict) else {}
    yaml_terms = _dc_cfg.get('generic_terms', []) if isinstance(_dc_cfg, dict) else []
    generic_terms = set(yaml_terms) if yaml_terms else {
        '设计目标', '设计原则', '设计约束', '非功能性', '可用性', '可靠性',
        '安全性', '可维护性', '可扩展性', '性能', '容量', '接口',
        '部署', '运维', '监控', '日志', '审计', '权限', '数据一致性',
    }
    business_keywords.update(generic_terms)

    paras_to_remove = []
    for elem in all_paras_in_range:
        text = ''
        for t in elem.findall('.//' + qn('w:t')):
            if t.text:
                text += t.text
        if not text.strip():
            continue
        is_relevant = any(kw in text for kw in business_keywords)
        if not is_relevant:
            paras_to_remove.append(elem)

    removed = 0
    for elem in paras_to_remove:
        parent = elem.getparent()
        if parent is None:
            continue
        parent.remove(elem)
        removed += 1

    # 如果整个设计约束章节都为空，插入"不涉及"占位
    if removed > 0 or _is_chapter_empty_after_heading(doc, '设计约束'):
        heading = _find_paragraph_by_text(doc, '设计约束', level=None)
        if heading is not None and _is_chapter_empty_after_heading(doc, '设计约束'):
            _insert_paragraph_after_element(heading._element, '不涉及')
            return removed
    return removed


def _is_chapter_empty_after_heading(doc, heading_text):
    """判断指定标题下到下一标题之间是否无内容。"""
    paragraphs = list(doc.paragraphs)
    target_idx = None
    for i, p in enumerate(paragraphs):
        text = (p.text or '').strip()
        if text == heading_text or (heading_text in text and len(text) <= len(heading_text) + 6):
            target_idx = i
            break
    if target_idx is None:
        return False
    for j in range(target_idx + 1, len(paragraphs)):
        p = paragraphs[j]
        if p.style and p.style.name.startswith('Heading'):
            return False
        if (p.text or '').strip():
            return False
    return True


def _build_uml_placeholder(diagram_name):
    """生成 UML 图表占位说明文本。

    设计原则：
    - 不硬编码业务模块名
    - 返回通用提示语，告知读者"待补充"并建议补充位置
    """
    return (f'【{diagram_name}待补充】请在详细设计阶段补充{diagram_name}。'
            f'建议使用工具（如 Visio/draw.io/PlantUML）绘制后插入此位置。')


def _insert_uml_placeholders(doc, h2_style=None):
    """在 UML 相关章节标题下插入占位段（如该标题下无图片）。

    章节关键词：类图、顺序图、活动图、状态图、组件图。
    - 仅处理 Heading2/Heading3 层级（避免误匹配到正文中的"类图"等词）
    - 检查标题下是否已有 w:drawing/w:pict 元素；有则跳过
    - 没有则插入"待补充"占位段
    - 增强：如果模板中不存在"类图"/"顺序图"/"活动图"标题，在"系统组件"章节末尾、
      "模块复用分析"之前自动创建 H2 级别标题 + 占位说明
    """
    if doc is None:
        return 0
    inserted = 0
    body_elems = _iter_body_elements(doc)

    # 先检查哪些 UML 图表标题已存在
    existing_uml_headings = set()
    for i, elem in enumerate(body_elems):
        if not _is_heading_element(elem):
            continue
        text = _heading_text_of_element(elem)
        if not text:
            continue
        for kw in UML_DIAGRAM_KEYWORDS:
            if kw in text:
                existing_uml_headings.add(kw)

    # 需要确保存在的 UML 图表标题（类图、顺序图、活动图为必选项）
    REQUIRED_UML_HEADINGS = ('类图', '顺序图', '活动图')
    missing_headings = [kw for kw in REQUIRED_UML_HEADINGS if kw not in existing_uml_headings]

    # 为缺失的 UML 标题创建 H2 标题 + 占位说明
    if missing_headings:
        # 找到"模块复用分析"标题作为插入锚点
        reuse_heading = None
        for i, elem in enumerate(body_elems):
            if not _is_heading_element(elem):
                continue
            text = _heading_text_of_element(elem)
            if CHAPTER_MODULE_REUSE in text:
                reuse_heading = elem
                break

        if reuse_heading is not None:
            # 从后往前插入（addprevious 保证顺序）
            for kw in reversed(missing_headings):
                # 创建 H2 标题
                h2_elem = _new_heading(doc, kw, level=2, ref_p=h2_style, style_id='2')
                reuse_heading.addprevious(h2_elem)
                # 在标题后插入占位说明
                placeholder_text = _build_uml_placeholder(kw)
                _insert_paragraph_after_element(h2_elem, placeholder_text)
                inserted += 1
            # 重建 body_elems 因为结构已变化
            body_elems = _iter_body_elements(doc)

    # 处理已存在的 UML 标题
    for i, elem in enumerate(body_elems):
        if not _is_heading_element(elem):
            continue
        text = _heading_text_of_element(elem)
        if not text:
            continue
        # 必须是 UML 章节标题（按关键词匹配）
        if not any(kw in text for kw in UML_DIAGRAM_KEYWORDS):
            continue
        # 标题级别判断：只处理 H2/H3 级别
        pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
        if pPr is None:
            continue
        style_val = pPr.get(qn('w:val'), '') or ''
        if style_val not in {'2', '3', 'Heading2', 'Heading3', 'heading2', 'heading3',
                             'heading 2', 'heading 3'}:
            continue

        # 找到下一标题
        next_idx = None
        for j in range(i + 1, len(body_elems)):
            if _is_heading_element(body_elems[j]):
                next_idx = j
                break
        end_idx = next_idx if next_idx is not None else len(body_elems)

        # 检查此范围内是否已有图片
        has_drawing = False
        for j in range(i + 1, end_idx):
            e = body_elems[j]
            if e.find('.//' + qn('w:drawing')) is not None or e.find('.//' + qn('w:pict')) is not None:
                has_drawing = True
                break
        if has_drawing:
            continue

        # 检查是否已有非空段落（避免重复插入）
        has_text = False
        for j in range(i + 1, end_idx):
            e = body_elems[j]
            if not e.tag.endswith('}p'):
                continue
            t_text = ''
            for t in e.findall('.//' + qn('w:t')):
                if t.text:
                    t_text += t.text
            if t_text.strip():
                has_text = True
                break
        if has_text:
            continue

        # 提取图表名（取标题中匹配 UML 关键词的部分）
        diagram_name = next((kw for kw in UML_DIAGRAM_KEYWORDS if kw in text), text)
        placeholder_text = _build_uml_placeholder(diagram_name)
        _insert_paragraph_after_element(elem, placeholder_text)
        inserted += 1
    return inserted


def _ensure_toc_heading(doc):
    """确保文档中存在"目录"标题。

    - 若文档主体首段就是目录标题，跳过
    - 若存在"目录"/"目 录"标题，标准化其文本
    - 否则在文档顶部（封面之后）插入"目录"标题

    返回目录标题段落对象。
    """
    if doc is None:
        return None
    # 优先复用已有的"目录"标题
    for p in doc.paragraphs:
        text = (p.text or '').strip().replace(' ', '')
        if text == '目录' or text == '目錄':
            return p
    # 找封面后的合适插入点：第一个 H1 标题之前
    body = doc.element.body
    insert_anchor = None
    for child in body:
        if child.tag.endswith('}p'):
            pPr = child.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '') or ''
                if style_val in {'1', 'Heading1', 'heading1', 'heading 1'}:
                    insert_anchor = child
                    break
    # 构造"目录"标题（H1 样式）
    new_p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    pStyle = OxmlElement('w:pStyle')
    pStyle.set(qn('w:val'), '1')
    pPr.append(pStyle)
    new_p.append(pPr)
    r = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = TOC_HEADING_TEXT
    t.set(qn('xml:space'), 'preserve')
    r.append(t)
    new_p.append(r)

    if insert_anchor is not None:
        insert_anchor.addprevious(new_p)
    else:
        # 兜底：插入到正文开头
        first = body[0] if len(body) > 0 else None
        if first is not None:
            first.addprevious(new_p)
        else:
            body.append(new_p)

    # 重新解析以返回段落对象
    from docx.text.paragraph import Paragraph
    return Paragraph(new_p, doc.paragraphs[0]._parent)


# ═══════════════════════════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════════════════════════

def generate_outline_design(template_path, scan_data_path, output_path,
                            er_data_path=None, diagram_dir=None, er_png_paths=None):
    """主入口：复制模板 → 蓝色清理 → 章节填充 → 插入业务子模块 → 修订记录 → 保存 → 目录更新

    增强流程（按需求）：
    - 步骤 6.4：窜行表格移动（_detect_misplaced_tables + _move_table_after_heading）
    - 步骤 6.5：目录标题确保（_ensure_toc_heading）+ TOC 域检查（force_insert_toc）
    - 步骤 7.5：术语表空表格移除（_remove_empty_table）
    - 步骤 11.5：所有正文段落添加首行缩进（apply_body_indent_to_doc）
    - 步骤 11.6：空章节兜底（fill_empty_chapter）
    - 步骤 11.7：设计约束清理（_clean_design_constraint_chapter）
    - 步骤 11.8：UML 图表占位插入（_insert_uml_placeholders）
    - 步骤 13：调用 _inject_update_fields 让 Word 打开时自动更新目录
    """
    # 1. 复制模板
    shutil.copy2(template_path, output_path)
    doc = Document(output_path)

    # 2. 读 scan_data
    with open(scan_data_path, 'r', encoding='utf-8-sig') as f:
        scan = json.load(f)

    project_name = scan.get('projectName') or scan.get('bankName') or '本项目'
    module_name = scan.get('requirementModuleName') or project_name
    bank_name = scan.get('bankName', project_name)

    # 3. 提取模板样式
    h1_style, h2_style, h3_style = _get_template_styles(doc)

    # 4. 替换封面信息
    for p in doc.paragraphs:
        txt = p.text
        if any(pat in txt for pat in PLACEHOLDER_PATTERNS):
            _replace_placeholder_paragraph(p, f'{project_name}概要设计说明书')
        elif 'XXX' in txt and '信息' in txt and p.style and p.style.name == 'Normal':
            _replace_placeholder_paragraph(p, project_name)

    # 5. 替换系统名/产品名占位
    for p in doc.paragraphs:
        txt = p.text
        if all(kw in txt for kw in SYSTEM_NAME_KEYWORDS):
            _replace_placeholder_paragraph(p, f'系统名：{project_name}')

    # 6. 第一遍扫描：使用增强版模板清理流程
    # 分阶段执行：蓝色文本清理 → 示例内容清除 → 模板备注清除
    try:
        cleanup_stats = doc_formatter.full_template_cleanup(doc, aggressive=False)
        print(f'[INFO] 模板清理完成: 蓝色={cleanup_stats.get("blue", {})}, '
              f'示例={cleanup_stats.get("example", {})}, 备注={cleanup_stats.get("remarks", {})}',
              file=sys.stderr)
    except Exception as e:
        print(f'[WARN] 增强模板清理失败，回退: {e}', file=sys.stderr)
        _clean_template_content(doc)
        _secondary_clean_blue_runs(doc)

    # 6.1 二次清理蓝色 run：增强清理可能遗漏表格中的蓝色 run
    _secondary_clean_blue_runs(doc)

    # 6.4 窜行修复：把"适用范围"标题下属于"设计目标"的表格移动到"设计目标"下
    try:
        misplaced = _detect_misplaced_tables(
            doc,
            source_keywords=['适用范围', '使用范围'],
            target_keywords=['设计目标', '设计原则'],
        )
        for tbl_elem, target_heading in misplaced:
            _move_table_after_heading(tbl_elem, target_heading)
    except Exception as e:
        print(f'[WARN] 窜行修复失败: {e}', file=sys.stderr)

    # 6.5 目录：先确保有"目录"标题，再插入/校验 TOC 域
    _ensure_toc_heading(doc)
    toc_inserted = False
    if not doc_formatter.has_toc_field(doc):
        toc_inserted = doc_formatter.force_insert_toc(doc, levels='1-3')
    else:
        toc_inserted = False  # 已存在 TOC 域

    # 7. 第二遍扫描：各章节内容填充
    _fill_chapter_content(doc, scan, module_name)

    # 7.5 术语表空表格清理：若术语定义标题下表格只有表头无数据，则移除并插入占位
    try:
        _cleanup_empty_glossary_table(doc)
    except Exception as e:
        print(f'[WARN] 术语表空表格清理失败: {e}', file=sys.stderr)

    # 8. 在第5章"系统组件"中插入业务子模块
    _insert_business_submodules(doc, scan, module_name, h1_style, h2_style, h3_style)

    # 9. 在第4章"系统总体框架"后插入架构图（如果提供）
    if diagram_dir and os.path.isdir(diagram_dir):
        _insert_architecture_diagrams(doc, diagram_dir, h2_style)

    # 10. 替换 ER 图占位（如有）
    if er_png_paths and any(er_png_paths):
        _insert_er_diagrams(doc, er_png_paths, h1_style, h2_style)

    # 11. 修订记录表格更新
    _update_revision_table(doc)

    # 11.5 为所有正文段落添加首行缩进（2字符），跳过标题和表格
    indent_count = doc_formatter.apply_body_indent_to_doc(doc, chars=2,
                                                          skip_headings=True,
                                                          skip_tables=True)

    # 11.6 空章节兜底：统一通过 EMPTY_CHECK_KEYWORDS 入口，skip_if_has_content=True
    # 避免"适用范围"已正确填充后被重复标注"不涉及"
    # 优先从 doc_rules.yaml 读取 empty_chapter_keywords（若存在），与默认列表合并
    _rules = _load_doc_rules()
    _extra_keywords = _rules.get('empty_chapter_keywords', []) if isinstance(_rules, dict) else []
    _empty_keywords = list(EMPTY_CHECK_KEYWORDS) + [k for k in _extra_keywords
                                                    if k and k not in EMPTY_CHECK_KEYWORDS]
    _apply_fill_empty_chapter_for_keywords(doc, _empty_keywords, placeholder='不涉及')

    # 11.7 设计约束清理：删除与业务无关的段落，必要时插入"不涉及"
    try:
        _clean_design_constraint_chapter(doc, module_name)
    except Exception as e:
        print(f'[WARN] 设计约束清理失败: {e}', file=sys.stderr)

    # 11.8 UML 图表占位：在空 UML 标题下插入"待补充"提示，缺失标题自动创建
    try:
        _insert_uml_placeholders(doc, h2_style=h2_style)
    except Exception as e:
        print(f'[WARN] UML 图表占位失败: {e}', file=sys.stderr)

    # 12. 保存
    doc.save(output_path)

    # 13. 目录更新（注入 updateFields）
    toc_updated = _inject_update_fields(output_path)

    return {
        'success': True,
        'outputPath': output_path,
        'projectName': project_name,
        'moduleName': module_name,
        'tocUpdated': toc_updated,
        'tocInserted': toc_inserted,
        'indentCount': indent_count,
    }


def _apply_fill_empty_chapter_safe(doc, keywords, placeholder='不涉及'):
    """安全调用 doc_formatter.fill_empty_chapter，异常时不影响主流程"""
    try:
        doc_formatter.fill_empty_chapter_compat(
            doc, list(keywords), placeholder=placeholder, skip_if_has_content=True
        )
    except Exception as e:
        print(f'[WARN] fill_empty_chapter 失败 ({keywords}): {e}', file=sys.stderr)


def _apply_fill_empty_chapter_for_keywords(doc, keywords, placeholder='不涉及'):
    """统一的空章节兜底：按关键词列表逐个调用 fill_empty_chapter。

    设计要点：
    - 跳过已有内容的章节（skip_if_has_content=True），避免覆盖已填充内容
    - 单个关键词失败不影响其他关键词
    - 跳过已由 _fill_chapter_content 处理的章节（术语/外部接口/组件汇总等），
      因为这些章节可能包含表格内容，fill_empty_chapter 会误判为空并覆盖
    """
    # 已由 _fill_chapter_content 步骤7处理的章节，不应被 fill_empty_chapter 覆盖
    SKIP_FILL_EMPTY_KEYWORDS = {'术语', '术语和缩写', '术语定义', '外部接口', '组件汇总', '组件汇总表'}
    for kw in keywords:
        if any(skip_kw in kw for skip_kw in SKIP_FILL_EMPTY_KEYWORDS):
            continue
        _apply_fill_empty_chapter_safe(doc, [kw], placeholder=placeholder)


def _cleanup_empty_glossary_table(doc):
    """术语表空表格清理：在"术语定义"或"术语和缩写"标题下，
    若表格只有表头无数据行，移除表格并插入"本章节不涉及相关内容"占位。
    """
    if doc is None:
        return 0
    body_elems = _iter_body_elements(doc)
    removed = 0
    for i, elem in enumerate(body_elems):
        if not _is_heading_element(elem):
            continue
        text = _heading_text_of_element(elem)
        if not text:
            continue
        # 匹配术语章节
        if not ('术语' in text and ('定义' in text or '缩写' in text)):
            continue
        # 找到下一标题
        next_idx = None
        for j in range(i + 1, len(body_elems)):
            if _is_heading_element(body_elems[j]):
                next_idx = j
                break
        end_idx = next_idx if next_idx is not None else len(body_elems)
        # 检查此范围内是否有空表格
        for j in range(i + 1, end_idx):
            e = body_elems[j]
            if not _is_table_element(e):
                continue
            if _table_is_effectively_empty(e):
                if _remove_empty_table(e):
                    removed += 1
        # 若术语表格被移除且章节无其他内容，插入占位
        # 仅当表格确实为空并被移除时（removed > 0）才检查，避免含有数据的表格被误判
        if removed > 0 and _is_chapter_empty_after_heading(doc, text):
            _insert_paragraph_after_element(elem, '本章节不涉及相关内容')
    return removed


def main():
    if len(sys.argv) < 4:
        print(json.dumps({'success': False, 'error': '参数不足：需要 template scan output'}))
        sys.exit(1)
    template_path = sys.argv[1]
    scan_data_path = sys.argv[2]
    output_path = sys.argv[3]
    er_data_path = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
    diagram_dir = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else None
    er_png_paths = sys.argv[6].split(';') if len(sys.argv) > 6 and sys.argv[6] else []

    try:
        result = generate_outline_design(
            template_path, scan_data_path, output_path,
            er_data_path, diagram_dir, er_png_paths
        )
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback
        print(json.dumps({'success': False, 'error': str(e), 'trace': traceback.format_exc()[-2000:]}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    # Windows 控制台默认 GBK，强制 UTF-8 输出避免编码错误
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    main()
