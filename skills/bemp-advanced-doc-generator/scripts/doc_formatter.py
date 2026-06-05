"""
文档通用格式化工具：段落缩进、表格样式、空章节占位、TOC域注入等。
所有"先A后B"的串行操作使用临时文件+重命名，避免 zipfile 追加。
"""
import os
import re
import sys
import shutil
import zipfile

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

# 从 doc_utils 导入蓝色检测和超链接检测工具
from doc_utils import is_blue_color, is_hyperlink_run


HEADING_STYLE_VALS = {
    '1', '2', '3', '4', '5', '6',
    'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6',
    'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
    'heading 1', 'heading 2', 'heading 3', 'heading 4', 'heading 5', 'heading 6',
}


def _is_heading_paragraph(paragraph):
    """判断段落是否为标题样式"""
    if paragraph is None or paragraph.style is None:
        return False
    name = paragraph.style.name or ''
    return name.startswith('Heading')


def apply_paragraph_indent(paragraph, chars=2):
    """为首行缩进设置段落格式（单位：字符数，对应 w:firstLineChars / w:firstLine）

    chars=2 表示首行缩进2字符，符合中文文档常规排版。
    """
    if paragraph is None:
        return
    p_elem = paragraph._element
    pPr = p_elem.find(qn('w:pPr'))
    if pPr is None:
        pPr = OxmlElement('w:pPr')
        p_elem.insert(0, pPr)
    # 清理旧的缩进设置
    existing_ind = pPr.find(qn('w:ind'))
    if existing_ind is not None:
        pPr.remove(existing_ind)
    ind = OxmlElement('w:ind')
    # firstLineChars 以百分之一字符为单位，200 表示 2 字符
    ind.set(qn('w:firstLineChars'), str(int(chars * 100)))
    # 兜底：也设置 firstLine 磅值（按 10.5pt 字号换算近似）
    ind.set(qn('w:firstLine'), str(int(chars * 210)))
    pPr.append(ind)


def apply_body_indent_to_doc(doc, chars=2, skip_headings=True, skip_tables=True):
    """遍历文档中所有正文段落，对非标题段落应用首行缩进

    跳过：标题（Heading* 样式）、表格内段落。
    """
    if doc is None:
        return 0
    count = 0
    for p in doc.paragraphs:
        if _is_heading_paragraph(p):
            if skip_headings:
                continue
        apply_paragraph_indent(p, chars=chars)
        count += 1
    if not skip_tables:
        for tbl in doc.tables:
            for row in tbl.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        apply_paragraph_indent(p, chars=chars)
                        count += 1
    return count


def apply_table_style(table, style_name='Table Grid', font_size=None, header_bold=True):
    """统一表格样式：边框 + 字体 + 表头加粗

    style_name: 内置表格样式名（默认 Table Grid）
    font_size: 字号（docx.shared.Pt），默认 10.5pt
    header_bold: 表头是否加粗
    """
    if table is None:
        return
    if font_size is None:
        font_size = Pt(10.5)
    tbl = table._tbl
    tblPr = tbl.find(qn('w:tblPr'))
    if tblPr is None:
        tblPr = OxmlElement('w:tblPr')
        tbl.insert(0, tblPr)
    # 设置表格样式
    existing_style = tblPr.find(qn('w:tblStyle'))
    if existing_style is None:
        tbl_style = OxmlElement('w:tblStyle')
        tbl_style.set(qn('w:val'), style_name)
        tblPr.insert(0, tbl_style)
    else:
        existing_style.set(qn('w:val'), style_name)
    # 设置边框（防止模板未定义时缺失）
    existing_borders = tblPr.find(qn('w:tblBorders'))
    if existing_borders is not None:
        tblPr.remove(existing_borders)
    tblBorders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement('w:' + border_name)
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), '000000')
        tblBorders.append(border)
    tblPr.append(tblBorders)
    # 单元格字体+加粗
    for ri, row in enumerate(table.rows):
        for cell in row.cells:
            for p in cell.paragraphs:
                for run in p.runs:
                    if run.font.size is None or run.font.size != font_size:
                        run.font.size = font_size
                    if header_bold and ri == 0:
                        run.font.bold = True
            # 表头底色
            if ri == 0:
                tcPr = cell._tc.find(qn('w:tcPr'))
                if tcPr is None:
                    tcPr = OxmlElement('w:tcPr')
                    cell._tc.insert(0, tcPr)
                existing_shd = tcPr.find(qn('w:shd'))
                if existing_shd is not None:
                    tcPr.remove(existing_shd)
                shd = OxmlElement('w:shd')
                shd.set(qn('w:val'), 'clear')
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:fill'), 'D9D9D9')
                tcPr.append(shd)


def has_toc_field(doc):
    """检查文档正文是否已包含 TOC 域（fldChar begin 或 instrText 'TOC'）"""
    if doc is None:
        return False
    for el in doc.element.iter():
        tag = el.tag
        if tag.endswith('}instrText') and el.text and 'TOC' in el.text.upper():
            return True
    return False


def insert_toc_field_after(heading_paragraph, title='目录'):
    """在指定标题段落下插入 Word TOC 域（含 begin/separate/end 三段）"""
    if heading_paragraph is None:
        return None
    parent = heading_paragraph._element.getparent()
    if parent is None:
        return None
    # 创建空段落承载 TOC
    p = OxmlElement('w:p')
    # begin
    r1 = OxmlElement('w:r')
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    r1.append(fldChar1)
    p.append(r1)
    # instrText
    r2 = OxmlElement('w:r')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '
    r2.append(instr)
    p.append(r2)
    # separate
    r3 = OxmlElement('w:r')
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    r3.append(fldChar2)
    p.append(r3)
    # 占位文字（Word 更新前可见）
    r4 = OxmlElement('w:r')
    t4 = OxmlElement('w:t')
    t4.set(qn('xml:space'), 'preserve')
    t4.text = '请在 Word 中按 F9 或右键更新域以生成目录'
    r4.append(t4)
    p.append(r4)
    # end
    r5 = OxmlElement('w:r')
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    r5.append(fldChar3)
    p.append(r5)
    heading_paragraph._element.addnext(p)
    return p


def inject_update_fields(output_path):
    """在 docx 的 settings.xml 中注入 updateFields=true（临时文件+重命名模式）

    使用"读全部 → 改 → 写全部"的 ZIP 重写方式，避免 zipfile 追加重复条目。
    先写到临时文件，再原子重命名。
    """
    if not output_path or not os.path.exists(output_path):
        return
    try:
        settings_xml = None
        with zipfile.ZipFile(output_path, 'r') as zf_in:
            if 'word/settings.xml' not in zf_in.namelist():
                return
            settings_xml = zf_in.read('word/settings.xml').decode('utf-8')
        if settings_xml is None or 'updateFields' in settings_xml:
            return
        insert_tag = '<w:updateFields w:val="true"/>'
        settings_xml = settings_xml.replace('</w:settings>', insert_tag + '</w:settings>')
        # 写临时文件后重命名
        tmp_path = output_path + '.tmp'
        with zipfile.ZipFile(output_path, 'r') as zf_in:
            entries = []
            for item in zf_in.infolist():
                data = settings_xml.encode('utf-8') if item.filename == 'word/settings.xml' else zf_in.read(item.filename)
                entries.append((item, data))
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zf_out:
            for item, data in entries:
                zf_out.writestr(item, data)
        shutil.move(tmp_path, output_path)
    except Exception as e:
        print(f'[WARN] 注入 updateFields 失败: {e}', file=sys.stderr)


def clear_all_blue_runs(paragraph):
    """彻底清除段落中所有蓝色 run 的内容并变黑，仅对非超链接 run 处理

    只清空 r.text = '' 但不修改颜色属性会导致24处蓝色run残留（文本为空但颜色仍为蓝色），
    因此在清空文本后同时将颜色设为黑色。
    """
    if paragraph is None:
        return
    from doc_utils import _is_hyperlink_style_run
    for r in list(paragraph.runs):
        if _is_hyperlink_style_run(r):
            continue
        try:
            color = r.font.color.rgb if r.font.color else None
        except Exception:
            color = None
        if color and is_blue_color(color):
            r.text = ''
            try:
                r.font.color.rgb = RGBColor(0, 0, 0)
            except Exception:
                pass


def enforce_business_alignment(paragraph, business_keywords):
    """检查段落是否与业务模块名相关；不相关时返回 True 表示可删除

    business_keywords: 业务模块关键词集合（如 {"账户", "票据", "贴现"}）
    """
    if paragraph is None:
        return False
    text = (paragraph.text or '').strip()
    if not text:
        return False
    for kw in business_keywords:
        if kw in text:
            return False
    # 命中通用术语关键词也不算业务相关（保留）
    generic_terms = {'设计目标', '设计原则', '设计约束', '非功能性', '可用性', '可靠性', '安全性', '可维护性', '可扩展性'}
    for g in generic_terms:
        if g in text:
            return False
    return True


def remove_design_constraint_irrelevant(paragraphs, business_keywords):
    """在"设计约束"标题下，删除与业务无关的段落

    找到"设计约束"标题，遍历其下到下一标题间的段落，
    若段落内容与业务关键词无关，则标记删除。
    """
    if not paragraphs or not business_keywords:
        return []
    target_idx = None
    for i, p in enumerate(paragraphs):
        text = (p.text or '').strip()
        if text == '设计约束' or (text and '设计约束' in text and len(text) <= 10):
            target_idx = i
            break
    if target_idx is None:
        return []
    next_idx = None
    for j in range(target_idx + 1, len(paragraphs)):
        if _is_heading_paragraph(paragraphs[j]):
            next_idx = j
            break
    end_idx = next_idx if next_idx is not None else len(paragraphs)
    to_remove = []
    for j in range(target_idx + 1, end_idx):
        p = paragraphs[j]
        if _is_heading_paragraph(p):
            break
        if enforce_business_alignment(p, business_keywords):
            to_remove.append(p)
    for p in to_remove:
        try:
            parent = p._element.getparent()
            if parent is not None:
                parent.remove(p._element)
        except Exception:
            pass
    return to_remove


def format_ui_paragraph(paragraph, max_chars=40):
    """对界面段落做软换行处理：每行不超过 max_chars 字符

    改造方式：在 run 内的 w:t 节点之后插入 w:br 元素，达到换行效果。
    避免改变段落数（仍属同一段落）。
    """
    if paragraph is None:
        return
    text = paragraph.text or ''
    if not text:
        return
    if len(text) <= max_chars:
        return
    # 清空所有 run
    for r in paragraph.runs:
        r.text = ''
    if not paragraph.runs:
        paragraph.add_run('')
    first_run = paragraph.runs[0]
    # 按 max_chars 切分
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i + max_chars])
        i += max_chars
    first_run.text = chunks[0]
    insert_after = first_run._element
    for chunk in chunks[1:]:
        br = OxmlElement('w:br')
        insert_after.addnext(br)
        new_r = OxmlElement('w:r')
        rPr = first_run._element.find(qn('w:rPr'))
        if rPr is not None:
            from copy import deepcopy
            new_r.append(deepcopy(rPr))
        t = OxmlElement('w:t')
        t.set(qn('xml:space'), 'preserve')
        t.text = chunk
        new_r.append(t)
        br.addnext(new_r)
        insert_after = new_r


# ═══════════════════════════════════════════════════════════════
# 扩展 API（按 outline-design-generator.py 需求新增）
# 目的：与 outline-design-generator.py 中 doc_formatter.* 调用兼容
# ═══════════════════════════════════════════════════════════════

def insert_caption_paragraph(doc, heading_para, caption_text, style_name='Caption',
                              alignment=None):
    """在标题段落后插入图表说明段落

    设计原则：
    - 通用工具函数，不硬编码任何业务
    - style_name 不存在时降级为 Normal
    - alignment 缺省时使用居中

    Args:
        doc: docx Document 对象
        heading_para: 标题段落（Paragraph）
        caption_text: 说明文本
        style_name: 段落样式名（默认 'Caption'）
        alignment: 对齐方式（None → 居中）

    Returns:
        新插入的段落对象
    """
    if heading_para is None:
        return None
    new_p = doc.add_paragraph()
    try:
        new_p.style = doc.styles[style_name]
    except KeyError:
        try:
            new_p.style = doc.styles['Normal']
        except KeyError:
            pass
    if alignment is None:
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        alignment = WD_ALIGN_PARAGRAPH.CENTER
    new_p.alignment = alignment
    run = new_p.add_run(caption_text)
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    heading_para._element.addnext(new_p._element)
    return new_p


def force_insert_toc(doc, after_paragraph=None, levels='1-3'):
    """强制插入/刷新动态目录域

    - 若文档已包含 TOC 域：跳过（避免重复插入）
    - 若 after_paragraph 指定：在其后插入
    - 否则：插入到文档正文开头

    Args:
        doc: docx Document 对象
        after_paragraph: 在该段落后插入；None 则插入到正文开头
        levels: TOC 层级范围（如 '1-3'）

    Returns:
        bool: 是否成功插入（False 表示已存在 TOC）
    """
    if has_toc_field(doc):
        return False

    # 构造 TOC 域段落
    p_elem = OxmlElement('w:p')

    r_begin = OxmlElement('w:r')
    fld_begin = OxmlElement('w:fldChar')
    fld_begin.set(qn('w:fldCharType'), 'begin')
    r_begin.append(fld_begin)
    p_elem.append(r_begin)

    r_instr = OxmlElement('w:r')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = f' TOC \\o "{levels}" \\h \\z \\u '
    r_instr.append(instr)
    p_elem.append(r_instr)

    r_sep = OxmlElement('w:r')
    fld_sep = OxmlElement('w:fldChar')
    fld_sep.set(qn('w:fldCharType'), 'separate')
    r_sep.append(fld_sep)
    p_elem.append(r_sep)

    r_placeholder = OxmlElement('w:r')
    t_placeholder = OxmlElement('w:t')
    t_placeholder.set(qn('xml:space'), 'preserve')
    t_placeholder.text = '请在 Word 中按 F9 或右键更新域以生成目录'
    r_placeholder.append(t_placeholder)
    p_elem.append(r_placeholder)

    r_end = OxmlElement('w:r')
    fld_end = OxmlElement('w:fldChar')
    fld_end.set(qn('w:fldCharType'), 'end')
    r_end.append(fld_end)
    p_elem.append(r_end)

    if after_paragraph is not None:
        after_paragraph._element.addnext(p_elem)
    else:
        body = doc.element.body
        first_child = body[0] if len(body) > 0 else None
        if first_child is not None:
            first_child.addprevious(p_elem)
        else:
            body.append(p_elem)
    return True


# ═══════════════════════════════════════════════════════════════
# 配置化规则层（YAML 驱动）
# ----------------------------------------------------------------
# 设计目标：
#   1. 把 doc_formatter 中硬编码的关键词/字号/填充规则全部抽到
#      doc_rules.yaml，运行时按需加载。
#   2. YAML 缺失或解析失败 → 使用 _DEFAULT_RULES 内置默认值。
#   3. 现有 11 个公共函数签名保持不变（向后兼容），新增的 rules
#      参数全部为可选；调用方无需感知配置层。
#   4. 预留 _register_generator() hook，让 outline-design-generator.py
#      / design-generator.py 注入自定义 generator（按 type 路由）。
# ═══════════════════════════════════════════════════════════════

import copy as _copy
import threading as _threading

try:
    import yaml as _yaml  # PyYAML；缺失时降级为内置 dict
    _YAML_AVAILABLE = True
except ImportError:
    _yaml = None
    _YAML_AVAILABLE = False


# 内置默认规则：当 doc_rules.yaml 缺失/解析失败时使用
_DEFAULT_RULES = {
    'toc': {
        'levels': '1-3',
        'title_size_pt': 14,
        'indent_chars': 0,
        'placeholder_text': '请在 Word 中按 F9 或右键更新域以生成目录',
    },
    'empty_chapter_keywords': [
        '设计目标', '设计原则', '输入项', '输出项', '代码示例',
        '性能优化', '附录', '错误码', '模块复用分析',
        '组件内部的模块列表及说明', 'API 接口清单', '备注',
        '模块划分', '设计约束', '外部接口',
        '术语和缩写', '术语定义', '参考资料', '参考文档',
    ],
    'fill_chapters': {
        '概要设计': [
            {'keywords': ['设计目标', '设计原则'], 'type': 'text',
             'generator': '_build_design_goal_text'},
            {'keywords': ['术语和缩写', '术语定义'], 'type': 'table',
             'generator': '_build_glossary_data'},
            {'keywords': ['参考资料', '参考文献', '参考文档'], 'type': 'table',
             'generator': '_build_references_table'},
            {'keywords': ['类图', '顺序图', '活动图', '状态图'],
             'type': 'uml_placeholder', 'generator': '_build_uml_placeholder'},
        ],
        '详细设计': [
            {'keywords': ['概述', '项目概述', '系统概述'], 'type': 'text',
             'generator': '_build_overview_text'},
            {'keywords': ['系统组件', '组件结构图'], 'type': 'component_renumber',
             'generator': '_renumber_components'},
            {'keywords': ['关键技术'], 'type': 'component_specific',
             'generator': '_build_component_specific_tech'},
        ],
    },
    'table_style': {
        'font_name': '宋体',
        'font_size_pt': 10.5,
        'header_bold': True,
        'border': 'Table Grid',
        'align': 'left',
        'header_fill': 'D9D9D9',
        'border_color': '000000',
        'border_size_eighths': 4,
    },
    'paragraph': {
        'first_line_indent_chars': 2,
        'font_name': '宋体',
        'font_size_pt': 12,
        'line_spacing': 1.5,
        'apply_to_body': True,
        'skip_headings': True,
        'skip_tables': True,
    },
    'chapter_content_correction': [
        {'source_keywords': ['范围说明'],
         'target_keywords': ['设计目标'],
         'type': 'move_table'},
    ],
    'heading_numbering': {
        'skip_h1': False,
        'separator': '.',
        'start_at': 1,
    },
    'design_constraint': {
        'enable': True,
        'generic_terms': [
            '设计目标', '设计原则', '设计约束', '非功能性',
            '可用性', '可靠性', '安全性', '可维护性', '可扩展性',
        ],
    },
    'ui_paragraph': {
        'enable': True,
        'max_chars_per_line': 40,
    },
    'placeholder': {
        'empty_chapter': '不涉及',
        'ui_soft_break_keep': '（保持换行展示）',
    },
    'blue_runs': {
        'enable': True,
        'preserve_hyperlinks': True,
        'preserve_underline_runs': True,
    },
}


_RULES_LOCK = _threading.RLock()
_RULES_CACHE = {}                  # path -> dict
_GENERATOR_REGISTRY = {}           # (doc_type, type) -> callable
_GENERATOR_BY_NAME = {}            # generator_name -> callable


def _rules_path_default():
    """计算 doc_rules.yaml 的默认路径：与 doc_formatter.py 同目录"""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'doc_rules.yaml')


def _merge_defaults(loaded):
    """把 loaded 字典与 _DEFAULT_RULES 深度合并，缺失键自动补齐"""
    if not isinstance(loaded, dict):
        return _copy.deepcopy(_DEFAULT_RULES)
    result = _copy.deepcopy(_DEFAULT_RULES)
    for k, v in loaded.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k].update(v)
        else:
            result[k] = _copy.deepcopy(v)
    return result


def load_doc_rules(yaml_path=None):
    """加载 doc_rules.yaml；缺失/解析失败时返回 _DEFAULT_RULES 深拷贝

    Args:
        yaml_path: 自定义 YAML 路径；None 时使用与本文件同目录的
                   doc_rules.yaml

    Returns:
        dict: 合并后的规则字典（始终包含 _DEFAULT_RULES 中所有顶层键）
    """
    path = yaml_path or _rules_path_default()
    with _RULES_LOCK:
        if path in _RULES_CACHE:
            return _copy.deepcopy(_RULES_CACHE[path])
        if not os.path.exists(path):
            _RULES_CACHE[path] = _copy.deepcopy(_DEFAULT_RULES)
            return _copy.deepcopy(_DEFAULT_RULES)
        if not _YAML_AVAILABLE:
            print(f'[WARN] PyYAML 未安装，使用内置 _DEFAULT_RULES: {path}',
                  file=sys.stderr)
            _RULES_CACHE[path] = _copy.deepcopy(_DEFAULT_RULES)
            return _copy.deepcopy(_DEFAULT_RULES)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                loaded = _yaml.safe_load(f) or {}
        except Exception as e:
            print(f'[WARN] 解析 {path} 失败，使用内置 _DEFAULT_RULES: {e}',
                  file=sys.stderr)
            _RULES_CACHE[path] = _copy.deepcopy(_DEFAULT_RULES)
            return _copy.deepcopy(_DEFAULT_RULES)
        merged = _merge_defaults(loaded)
        _RULES_CACHE[path] = _copy.deepcopy(merged)
        return _copy.deepcopy(merged)


def clear_rules_cache(yaml_path=None):
    """清空已缓存的规则；测试场景或热重载配置时使用

    Args:
        yaml_path: 仅清空该路径；None 时清空全部缓存
    """
    with _RULES_LOCK:
        if yaml_path is None:
            _RULES_CACHE.clear()
        else:
            _RULES_CACHE.pop(yaml_path, None)


def register_generator(generator_name, callable_obj=None, doc_type=None,
                       gen_type=None):
    """注册自定义 generator（hook 点）

    两种调用方式：
      1. 按名称注册：register_generator('_build_x', fn)
         → 后续 apply_yaml_rules_to_doc 命中该 generator_name 时调用 fn
      2. 按 (doc_type, type) 路由注册：
         register_generator(callable_obj, doc_type='详细设计',
                            gen_type='table')
         → 优先于按名称注册

    Args:
        generator_name: 字符串名（与 YAML 中 generator 字段一致）
        callable_obj:   可调用对象
        doc_type:       章节类型（可选，用于精确路由）
        gen_type:       内容类型（可选，用于精确路由）
    """
    if doc_type is not None and gen_type is not None:
        _GENERATOR_REGISTRY[(doc_type, gen_type)] = callable_obj
        return
    if generator_name is not None and callable_obj is not None:
        _GENERATOR_BY_NAME[generator_name] = callable_obj
    elif generator_name is not None and generator_name in _GENERATOR_BY_NAME:
        # 仅做解绑
        _GENERATOR_BY_NAME.pop(generator_name, None)


def _resolve_generator(generator_name, doc_type, gen_type):
    """根据规则项解析真实可调用对象，遵循 (doc_type,type) > name > None"""
    if doc_type and gen_type:
        fn = _GENERATOR_REGISTRY.get((doc_type, gen_type))
        if fn is not None:
            return fn
    if generator_name:
        fn = _GENERATOR_BY_NAME.get(generator_name)
        if fn is not None:
            return fn
    return None


def get_default_empty_keywords(rules=None):
    """从规则中提取空章节关键词列表（供 fill_empty_chapter_* 默认值）"""
    rules = rules or _DEFAULT_RULES
    return list(rules.get('empty_chapter_keywords', []))


def get_table_style_params(rules=None):
    """从规则中提取表格样式参数，返回 dict（与 apply_table_style 参数对齐）"""
    rules = rules or _DEFAULT_RULES
    ts = rules.get('table_style', {}) or {}
    return {
        'style_name': ts.get('border', 'Table Grid'),
        'font_size': Pt(ts.get('font_size_pt', 10.5)),
        'header_bold': ts.get('header_bold', True),
        'header_fill': ts.get('header_fill', 'D9D9D9'),
        'border_color': ts.get('border_color', '000000'),
        'border_size_eighths': ts.get('border_size_eighths', 4),
    }


def get_paragraph_params(rules=None):
    """从规则中提取段落格式参数"""
    rules = rules or _DEFAULT_RULES
    p = rules.get('paragraph', {}) or {}
    return {
        'chars': p.get('first_line_indent_chars', 2),
        'font_name': p.get('font_name', '宋体'),
        'font_size_pt': p.get('font_size_pt', 12),
        'line_spacing': p.get('line_spacing', 1.5),
        'apply_to_body': p.get('apply_to_body', True),
        'skip_headings': p.get('skip_headings', True),
        'skip_tables': p.get('skip_tables', True),
    }


def get_toc_params(rules=None):
    """从规则中提取 TOC 参数"""
    rules = rules or _DEFAULT_RULES
    t = rules.get('toc', {}) or {}
    return {
        'levels': t.get('levels', '1-3'),
        'placeholder_text': t.get('placeholder_text',
                                  '请在 Word 中按 F9 或右键更新域以生成目录'),
    }


def _is_element_between(elem, start_elem, end_elem):
    """检查 elem 是否在 start_elem 和 end_elem 之间（按文档顺序）"""
    parent = start_elem.getparent()
    if parent is None:
        return False
    siblings = list(parent)
    try:
        start_idx = siblings.index(start_elem)
    except ValueError:
        return False
    if end_elem is not None:
        try:
            end_idx = siblings.index(end_elem)
        except ValueError:
            end_idx = len(siblings)
    else:
        end_idx = len(siblings)
    try:
        elem_idx = siblings.index(elem)
    except ValueError:
        return False
    return start_idx < elem_idx < end_idx


def fill_empty_chapter(doc, keywords=None, placeholder='不涉及', rules=None):
    """[向后兼容] 检查指定章节关键词之间的内容；如为空则插入占位段落

    新增 rules 参数：
        - 当 keywords=None 时，使用 rules['empty_chapter_keywords']
        - 当 placeholder 仍是默认 '不涉及' 且 rules 含
          rules['placeholder']['empty_chapter'] 时，后者优先
    """
    if rules is None:
        rules = _DEFAULT_RULES
    if not keywords:
        kws = list(rules.get('empty_chapter_keywords', []))
    else:
        kws = [k if isinstance(k, str) else k[0] for k in keywords]
    ph_default = rules.get('placeholder', {}).get('empty_chapter', placeholder)
    effective_placeholder = ph_default if placeholder == '不涉及' else placeholder
    if doc is None or not kws:
        return 0
    paragraphs = list(doc.paragraphs)
    filled = 0
    for kw in kws:
        target_idx = None
        for i, p in enumerate(paragraphs):
            if not _is_heading_paragraph(p):
                continue
            text = (p.text or '').strip()
            if not text:
                continue
            if text == kw or kw in text:
                target_idx = i
                break
        if target_idx is None:
            continue
        target_p = paragraphs[target_idx]
        next_heading_idx = None
        for j in range(target_idx + 1, len(paragraphs)):
            if _is_heading_paragraph(paragraphs[j]):
                next_heading_idx = j
                break
        end_idx = next_heading_idx if next_heading_idx is not None else len(paragraphs)
        is_empty = True
        for j in range(target_idx + 1, end_idx):
            t = (paragraphs[j].text or '').strip()
            if t:
                is_empty = False
                break
        # 2026-06-05 修复：段落检查通过后，还需检查是否包含表格内容。
        # fill_empty_chapter 原先只检查段落文本，不检查表格，导致仅有表格的章节被误判为空。
        if is_empty and doc and doc.tables:
            target_elem = target_p._element
            next_heading_elem = paragraphs[next_heading_idx]._element if next_heading_idx is not None else None
            for table in doc.tables:
                tbl_elem = table._tbl
                if _is_element_between(tbl_elem, target_elem, next_heading_elem):
                    if any(cell.text.strip() for row in table.rows for cell in row.cells):
                        is_empty = False
                        break
        if not is_empty:
            continue
        parent = target_p._element.getparent()
        if parent is None:
            continue
        new_p = OxmlElement('w:p')
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        color = OxmlElement('w:color')
        color.set(qn('w:val'), '000000')
        rPr.append(color)
        r.append(rPr)
        t_elem = OxmlElement('w:t')
        t_elem.set(qn('xml:space'), 'preserve')
        t_elem.text = effective_placeholder
        r.append(t_elem)
        new_p.append(r)
        target_elem = target_p._element
        target_elem.addnext(new_p)
        filled += 1
        paragraphs = list(doc.paragraphs)
    return filled


def fill_empty_chapter_compat(doc, keywords=None, placeholder='不涉及',
                              skip_if_has_content=True, rules=None):
    """[向后兼容] fill_empty_chapter_compat 的规则化版本

    行为同 doc_formatter.fill_empty_chapter_compat；新增 rules 参数。
    """
    if rules is None:
        rules = _DEFAULT_RULES
    if not keywords:
        kws = list(rules.get('empty_chapter_keywords', []))
    else:
        kws = list(keywords)
    ph_default = rules.get('placeholder', {}).get('empty_chapter', placeholder)
    effective_placeholder = ph_default if placeholder == '不涉及' else placeholder
    if doc is None or not kws:
        return 0
    paragraphs = list(doc.paragraphs)
    filled = 0
    for kw in kws:
        target_p = None
        for p in paragraphs:
            if not _is_heading_paragraph(p):
                continue
            text = (p.text or '').strip()
            if not text:
                continue
            if text == kw or kw in text:
                target_p = p
                break
        if target_p is None:
            continue
        target_idx = paragraphs.index(target_p)
        next_heading_idx = None
        for j in range(target_idx + 1, len(paragraphs)):
            if _is_heading_paragraph(paragraphs[j]):
                next_heading_idx = j
                break
        end_idx = next_heading_idx if next_heading_idx is not None else len(paragraphs)
        if skip_if_has_content:
            is_empty = True
            for j in range(target_idx + 1, end_idx):
                t = (paragraphs[j].text or '').strip()
                if t:
                    is_empty = False
                    break
            if not is_empty:
                continue
        parent = target_p._element.getparent()
        if parent is None:
            continue
        new_p = OxmlElement('w:p')
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        color = OxmlElement('w:color')
        color.set(qn('w:val'), '000000')
        rPr.append(color)
        r.append(rPr)
        t_elem = OxmlElement('w:t')
        t_elem.set(qn('xml:space'), 'preserve')
        t_elem.text = effective_placeholder
        r.append(t_elem)
        new_p.append(r)
        target_p._element.addnext(new_p)
        filled += 1
        paragraphs = list(doc.paragraphs)
    return filled


def apply_yaml_rules_to_doc(doc, doc_type, rules=None,
                            generators=None, dry_run=False):
    """按 doc_type（'概要设计' / '详细设计' / '单元测试报告' / ...）
    应用 doc_rules.yaml 中定义的 fill_chapters 规则

    流程：
      1. 遍历 rules['fill_chapters'][doc_type] 中每条规则
      2. 找到匹配标题的章节
      3. 若该章节空（无内容）→ 调用对应 generator 生成内容并插入
      4. 若未注册 generator 或 generator 返回 None → 退化为
         fill_empty_chapter（写入"不涉及"占位）

    Args:
        doc:       docx Document
        doc_type:  章节类型，必须在 rules['fill_chapters'] 中
        rules:     规则字典（None 时自动 load_doc_rules()）
        generators:dict，key=generator_name，value=callable；临时覆盖
                    此次调用的 generator 解析表（不影响全局 registry）
        dry_run:   True 时只统计将要操作的章节，不实际改动文档

    Returns:
        dict: {'matched': N, 'filled': M, 'skipped': K, 'dry_run': bool}
    """
    if rules is None:
        rules = load_doc_rules()
    fill_map = rules.get('fill_chapters', {}) or {}
    rule_list = fill_map.get(doc_type, []) or []
    if not rule_list:
        return {'matched': 0, 'filled': 0, 'skipped': 0, 'dry_run': bool(dry_run)}

    result = {'matched': 0, 'filled': 0, 'skipped': 0, 'dry_run': bool(dry_run)}
    paragraphs = list(doc.paragraphs)

    for rule in rule_list:
        keywords = rule.get('keywords', []) or []
        gen_type = rule.get('type', 'text')
        gen_name = rule.get('generator')
        target_p = None
        target_idx = None
        for i, p in enumerate(paragraphs):
            if not _is_heading_paragraph(p):
                continue
            text = (p.text or '').strip()
            if not text:
                continue
            for kw in keywords:
                if text == kw or kw in text:
                    target_p = p
                    target_idx = i
                    break
            if target_p is not None:
                break
        if target_p is None:
            continue
        result['matched'] += 1
        next_idx = None
        for j in range(target_idx + 1, len(paragraphs)):
            if _is_heading_paragraph(paragraphs[j]):
                next_idx = j
                break
        end_idx = next_idx if next_idx is not None else len(paragraphs)
        has_content = any(
            (paragraphs[j].text or '').strip()
            for j in range(target_idx + 1, end_idx)
        )
        if has_content:
            result['skipped'] += 1
            continue
        if dry_run:
            result['filled'] += 1
            continue
        # 解析 generator
        gen_fn = None
        if generators and gen_name and gen_name in generators:
            gen_fn = generators[gen_name]
        if gen_fn is None:
            gen_fn = _resolve_generator(gen_name, doc_type, gen_type)
        if gen_fn is not None:
            try:
                gen_fn(doc, target_p, rule)
                result['filled'] += 1
                paragraphs = list(doc.paragraphs)
                continue
            except Exception as e:
                print(f'[WARN] generator {gen_name} 失败: {e}', file=sys.stderr)
        # 退化：写"不涉及"占位
        ph = rules.get('placeholder', {}).get('empty_chapter', '不涉及')
        new_p = OxmlElement('w:p')
        r = OxmlElement('w:r')
        t = OxmlElement('w:t')
        t.set(qn('xml:space'), 'preserve')
        t.text = ph
        r.append(t)
        new_p.append(r)
        target_p._element.addnext(new_p)
        result['filled'] += 1
        paragraphs = list(doc.paragraphs)
    return result


def apply_global_styles_from_rules(doc, rules=None):
    """应用 rules['paragraph'] + rules['table_style'] 的全局样式

    作用：根据 YAML 规则一次性调用：
      - apply_body_indent_to_doc（缩进）
      - 遍历 doc.tables → apply_table_style（表样式）

    Args:
        doc:   docx Document
        rules: 规则字典（None 时 load_doc_rules()）

    Returns:
        dict: {'paragraphs_indented': N, 'tables_styled': M}
    """
    if rules is None:
        rules = load_doc_rules()
    p_params = get_paragraph_params(rules)
    n_indent = apply_body_indent_to_doc(
        doc,
        chars=p_params.get('chars', 2),
        skip_headings=p_params.get('skip_headings', True),
        skip_tables=p_params.get('skip_tables', True),
    )
    ts = get_table_style_params(rules)
    n_tbl = 0
    for tbl in doc.tables:
        apply_table_style(
            tbl,
            style_name=ts.get('style_name', 'Table Grid'),
            font_size=ts.get('font_size'),
            header_bold=ts.get('header_bold', True),
        )
        n_tbl += 1
    return {'paragraphs_indented': n_indent, 'tables_styled': n_tbl}


# ═══════════════════════════════════════════════════════════════
# 示例内容识别与清除（Template Example Content Clearing）
# ────────────────────────────────────────────────────────────────
# 设计目标：
#   模板中常有"示例内容"用于说明填写方式，这些内容需在填充前清除。
#   识别策略：
#     1. 文本前缀匹配：如"示例："、"样例："、"如："等
#     2. 占位符模式：如"XXX"、"YYY"、"【请填写】"等
#     3. 模板说明段落：如"以下为示例"、"请根据实际情况修改"等
#     4. 灰色/浅色字体段落：模板中用于区分正式内容的说明文字
#   清除策略：
#     - 整个段落匹配示例内容 → 删除段落
#     - 段落部分匹配 → 仅清除匹配部分
#     - 表格中的示例内容 → 清空单元格
# ═══════════════════════════════════════════════════════════════

# 示例内容识别关键词（可配置，通过 doc_rules.yaml 扩展）
_EXAMPLE_CONTENT_PREFIXES = [
    '示例：', '示例:', '样例：', '样例:', '例如：', '例如:', '如：',
    '举例：', '举例:', '说明：', '说明:', '注：', '注:', '备注：',
    '注意：', '注意:', '提示：', '提示:', '※', '★',
]

_EXAMPLE_CONTENT_WHOLE_LINE = [
    '以下为示例', '以下为样例', '示例内容', '样例内容',
    '请根据实际情况', '请根据实际需求', '请修改为实际', '请替换为实际',
    '此处填写', '此处填入', '请在此处', '模板内容', '占位内容',
    '以下内容仅供参考', '实际内容请根据', '请自行补充',
]

_EXAMPLE_PLACEHOLDER_PATTERNS = [
    '【请填写', '【请补充', '【待填写', '【待补充',
    'XXX', 'YYY', 'ZZZ', '...', '……',
    '{{', '}}', '<<', '>>',
]

# 灰色/浅色字体阈值（RGB各分量 > 128 视为浅色，一般用于说明文字）
_LIGHT_COLOR_THRESHOLD = 128


def _is_example_prefix(text):
    """检查文本是否以示例前缀开头"""
    if not text:
        return False
    text_stripped = text.strip()
    for prefix in _EXAMPLE_CONTENT_PREFIXES:
        if text_stripped.startswith(prefix):
            return True
    return False


def _is_example_whole_line(text):
    """检查整行文本是否属于示例内容"""
    if not text:
        return False
    text_stripped = text.strip()
    for keyword in _EXAMPLE_CONTENT_WHOLE_LINE:
        if keyword in text_stripped:
            return True
    return False


def _is_placeholder_text(text):
    """检查文本是否包含占位符模式"""
    if not text:
        return False
    for pattern in _EXAMPLE_PLACEHOLDER_PATTERNS:
        if pattern in text:
            return True
    return False


def _is_light_color_run(run):
    """检查 run 的颜色是否为浅色（说明文字）"""
    try:
        color = run.font.color.rgb if run.font.color else None
    except Exception:
        return False
    if color is None:
        return False
    # 排除蓝色（已由 clear_all_blue_runs 处理）
    if is_blue_color(color):
        return False
    r_val = (color >> 16) & 0xFF
    g_val = (color >> 8) & 0xFF
    b_val = color & 0xFF
    return (r_val > _LIGHT_COLOR_THRESHOLD and
            g_val > _LIGHT_COLOR_THRESHOLD and
            b_val > _LIGHT_COLOR_THRESHOLD)


def clear_example_content(doc, aggressive=False):
    """识别并清除模板中的示例内容

    清除策略：
      1. 整段匹配示例关键词 → 删除整个段落
      2. 段落含占位符模式 → 清除段落内容
      3. 段落含浅色文字 → 若 aggressive=True 则清除
      4. 表格单元格含示例内容 → 清空单元格

    Args:
        doc: docx Document 对象
        aggressive: 是否激进模式（清除浅色文字段落）

    Returns:
        dict: 统计信息
    """
    stats = {
        'paragraphs_removed': 0,
        'paragraphs_cleared': 0,
        'cells_cleared': 0,
        'placeholder_count': 0,
    }

    # 处理段落
    paragraphs_to_remove = []
    for p in doc.paragraphs:
        if _is_heading_paragraph(p):
            continue
        text = (p.text or '').strip()
        if not text:
            continue

        # 整段匹配示例内容 → 删除
        if _is_example_whole_line(text):
            paragraphs_to_remove.append(p)
            stats['paragraphs_removed'] += 1
            continue

        # 占位符文本 → 清除段落
        if _is_placeholder_text(text):
            for run in p.runs:
                run.text = ''
            stats['placeholder_count'] += 1
            stats['paragraphs_cleared'] += 1
            continue

        # 示例前缀 → 清除段落
        if _is_example_prefix(text):
            for run in p.runs:
                run.text = ''
            stats['paragraphs_cleared'] += 1
            continue

        # 激进模式：清除浅色文字段落
        if aggressive:
            has_light = False
            for run in p.runs:
                if _is_light_color_run(run):
                    has_light = True
                    break
            if has_light:
                for run in p.runs:
                    if not is_hyperlink_run(run):
                        run.text = ''
                stats['paragraphs_cleared'] += 1

    for p in paragraphs_to_remove:
        try:
            parent = p._element.getparent()
            if parent is not None:
                parent.remove(p._element)
        except Exception:
            pass

    # 处理表格
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_text = cell.text.strip()
                if not cell_text:
                    continue
                if _is_example_whole_line(cell_text) or _is_placeholder_text(cell_text):
                    for para in cell.paragraphs:
                        for run in para.runs:
                            run.text = ''
                    stats['cells_cleared'] += 1

    return stats


def clean_template_remarks(doc):
    """清理模板中的备注说明段落

    模板中常有以下类型的备注说明：
      - "以下内容为模板说明，请根据实际情况修改"
      - "此处为示例，请替换为实际内容"
      - 蓝色字体的备注说明（已由 clear_all_blue_runs 处理）
      - 括号内的填写说明，如"（请填写项目名称）"

    本函数识别并清除这些备注说明，为内容填充做准备。
    """
    REMARK_KEYWORDS = [
        '模板说明', '模板备注', '填写说明', '填写指南',
        '请根据实际情况', '请根据项目实际', '请替换为',
        '以下为示例', '以下内容仅', '本模板',
        '说明：以下', '备注：以下',
    ]

    stats = {'paragraphs_removed': 0, 'cells_cleared': 0}

    # 清理段落中的备注说明
    paragraphs_to_remove = []
    for p in doc.paragraphs:
        if _is_heading_paragraph(p):
            # 标题中的括号说明 → 清除括号内容
            text = (p.text or '').strip()
            if '（' in text and '）' in text:
                # 保留标题，清除括号内的备注
                new_text = re.sub(r'（[^）]*请[^）]*）', '', text)
                new_text = re.sub(r'【[^】]*请[^】]*】', '', new_text)
                if new_text != text:
                    for run in p.runs:
                        run.text = ''
                    if p.runs:
                        p.runs[0].text = new_text.strip()
            continue

        text = (p.text or '').strip()
        if not text:
            continue

        for kw in REMARK_KEYWORDS:
            if kw in text:
                paragraphs_to_remove.append(p)
                stats['paragraphs_removed'] += 1
                break

    for p in paragraphs_to_remove:
        try:
            parent = p._element.getparent()
            if parent is not None:
                parent.remove(p._element)
        except Exception:
            pass

    # 清理表格中的备注说明
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_text = cell.text.strip()
                if not cell_text:
                    continue
                for kw in REMARK_KEYWORDS:
                    if kw in cell_text:
                        for para in cell.paragraphs:
                            for run in para.runs:
                                run.text = ''
                        stats['cells_cleared'] += 1
                        break

    return stats


def enhanced_blue_cleanup(doc):
    """增强版蓝色文本清理：分阶段处理

    阶段1：段落级蓝色清理（含标题、正文、占位符）
    阶段2：表格级蓝色清理（含单元格）
    阶段3：残留蓝色 run 清理（二次扫描）

    相比 clear_all_blue_runs 的单次处理，此函数更彻底。
    """
    stats = {'paragraphs_cleared': 0, 'cells_cleared': 0, 'runs_cleared': 0}

    # 阶段1：段落级清理
    paragraphs_to_remove = []
    for p in doc.paragraphs:
        text = (p.text or '').strip()
        is_heading = _is_heading_paragraph(p)

        # 蓝色空标题 → 删除
        if is_heading and not text:
            has_blue = False
            for run in p.runs:
                if not (run.font.color and run.font.color.rgb):
                    continue
                if is_blue_color(run.font.color.rgb):
                    has_blue = True
                    break
            if has_blue:
                paragraphs_to_remove.append(p)
                continue

        # 蓝色非标题段落 → 检查是否占位符
        if not is_heading:
            has_blue = False
            for run in p.runs:
                if not (run.font.color and run.font.color.rgb):
                    continue
                if is_blue_color(run.font.color.rgb) and not is_hyperlink_run(run):
                    has_blue = True
                    break
            if has_blue:
                # 占位符文本 → 删除整段
                if _is_placeholder_text(text) or _is_example_prefix(text):
                    paragraphs_to_remove.append(p)
                else:
                    # 非占位符 → 清空蓝色 run 内容
                    clear_all_blue_runs(p)
                    stats['paragraphs_cleared'] += 1

    for p in paragraphs_to_remove:
        try:
            parent = p._element.getparent()
            if parent is not None:
                parent.remove(p._element)
        except Exception:
            pass

    # 阶段2：表格级清理
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    has_blue = False
                    for run in para.runs:
                        if not (run.font.color and run.font.color.rgb):
                            continue
                        if is_blue_color(run.font.color.rgb) and not is_hyperlink_run(run):
                            has_blue = True
                            break
                    if has_blue:
                        for run in para.runs:
                            if is_hyperlink_run(run):
                                continue
                            if run.font.color and run.font.color.rgb and is_blue_color(run.font.color.rgb):
                                run.text = ''
                                try:
                                    run.font.color.rgb = RGBColor(0, 0, 0)
                                except Exception:
                                    pass
                        stats['cells_cleared'] += 1

    # 阶段3：残留检查（二次扫描确保无遗漏）
    for p in doc.paragraphs:
        for run in p.runs:
            if not (run.font.color and run.font.color.rgb):
                continue
            if is_blue_color(run.font.color.rgb) and not is_hyperlink_run(run):
                if run.text.strip():
                    run.text = ''
                    stats['runs_cleared'] += 1

    return stats


def full_template_cleanup(doc, aggressive=False):
    """完整的模板清理流程（一键调用）

    按顺序执行：
      1. 蓝色文本清理（enhanced_blue_cleanup）
      2. 示例内容清除（clear_example_content）
      3. 模板备注清除（clean_template_remarks）

    Args:
        doc: docx Document 对象
        aggressive: 是否激进模式

    Returns:
        dict: 各阶段清理统计
    """
    stats = {}
    stats['blue'] = enhanced_blue_cleanup(doc)
    stats['example'] = clear_example_content(doc, aggressive=aggressive)
    stats['remarks'] = clean_template_remarks(doc)
    return stats

