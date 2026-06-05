"""
详细设计文档生成器 - 基于 .docx 模板填充
复用 outline-design-generator.py 的模板处理基础设施（蓝色文本清理、封面替换等）
填充详细设计专用的章节内容（系统概述、功能模块、接口设计、数据库设计等）
"""
import sys
import json
import re
import os
import shutil
import zipfile
from copy import deepcopy
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import datetime

# 2026-06-04 新增：调试日志开关（排查章节窜行问题时开启）
DEBUG_LAYOUT = os.environ.get('BEMP_DESIGN_DEBUG', '').lower() in ('1', 'true', 'yes')

# 2026-06-04 新增：doc_rules.yaml 规则加载（由其他子任务创建，存在时生效）
try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover - 缺 PyYAML 时优雅降级
    yaml = None

_RULES_CACHE = None


def _load_doc_rules():
    """从 doc_rules.yaml 加载规则，文件不存在或解析失败时返回空 dict

    规则示例（非硬编码业务）：
    ```yaml
    overview_keywords: ['概述', '项目概述', '系统概述']
    non_functional_chapters: ['界面', '性能', '安全性', '可靠性']
    empty_check_extra: ['模块复用分析', '设计约束']
    toc_levels: '1-3'
    debug_layout: false
    ```
    """
    global _RULES_CACHE
    if _RULES_CACHE is not None:
        return _RULES_CACHE
    if yaml is None:
        _RULES_CACHE = {}
        return _RULES_CACHE
    # 规则文件与本脚本同目录
    rule_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'doc_rules.yaml')
    if not os.path.isfile(rule_path):
        _RULES_CACHE = {}
        return _RULES_CACHE
    try:
        with open(rule_path, 'r', encoding='utf-8') as f:
            _RULES_CACHE = yaml.safe_load(f) or {}
    except Exception as e:  # 解析失败时降级
        print(f'[WARN] 加载 doc_rules.yaml 失败，使用内置默认: {e}', file=sys.stderr)
        _RULES_CACHE = {}
    return _RULES_CACHE


from doc_utils import (
    BLACK, BLUE, TABLE_FONT_SIZE_PT, is_blue_color,
    is_blue_paragraph, is_blue_cell, is_hyperlink_run, has_non_hyperlink_blue,
    is_blue_placeholder_text,
    set_black, clear_paragraph, write_paragraph, write_as_normal,
    content_hash, write_with_dedup, write_as_normal_with_dedup,
    add_paragraph_text, fill_cell_text, add_table_row, clear_blue_cell,
    remove_paragraph, format_table_styled, get_heading_context
)

# 2026-06-04 新增：引入统一格式化工具（缩进、表格样式、空章节占位、TOC域）
# 2026-06-04 优化：导入 force_insert_toc 与 doc_formatter 兼容接口
from doc_formatter import (
    apply_paragraph_indent,
    apply_body_indent_to_doc,
    apply_table_style,
    fill_empty_chapter,
    fill_empty_chapter_compat,
    has_toc_field,
    insert_toc_field_after,
    force_insert_toc,
    inject_update_fields,
    clear_all_blue_runs,
    remove_design_constraint_irrelevant,
    format_ui_paragraph,
)

TABLE_FONT_SIZE = Pt(TABLE_FONT_SIZE_PT)

# 2026-06-04 新增：需检查的空章节关键词（H2/H3标题）
EMPTY_CHECK_KEYWORDS = [
    ('设计目标', '设计目标描述'),
    ('输入项', '输入项说明'),
    ('输出项', '输出项说明'),
    ('代码示例', '代码示例'),
    ('性能优化', '性能优化措施'),
    ('附录', '附录说明'),
    ('错误码', '错误码定义'),
    ('接口设计', '接口设计'),
    ('开发规范', '开发规范'),
    # 2026-06-05 移除以下关键词：它们由特殊处理函数填充（可能插入表格），
    # fill_empty_chapter 只检查段落文本不检查表格，会误判为空并覆盖为"不涉及"
    # ('使用范围', '使用范围'),
    # ('术语定义', '术语定义'),
    # ('参考资料', '参考资料'),
    # ('开发环境', '开发环境'),
    # ('界面', '界面'),
    # ('性能', '性能'),
    # ('目的', '目的'),
    # ('适用范围', '适用范围'),
    # 2026-06-05 新增：模块设计说明下的H2子节关键词（解决空章节问题）
    ('功能描述', '功能描述说明'),
    ('类图', '类图描述'),
    ('顺序图', '顺序图描述'),
    ('活动图', '活动图描述'),
    ('备注', '备注说明'),
]

# 2026-06-04 新增：扩展空章节关键词（含系统概述、设计约束、模块复用分析）
# 由 doc_rules.yaml 中 empty_check_extra 覆盖（如有）
EMPTY_CHECK_EXTRA = [
    ('系统概述', '系统概述'),
    ('设计约束', '设计约束'),
    ('模块复用分析', '模块复用分析'),
    ('组件结构图', '组件结构图'),
    ('系统组件', '系统组件'),
]

# 2026-06-04 新增：非功能属性章节标准命名（用于 fill_empty_chapter 兜底）
NON_FUNCTIONAL_CHAPTERS = [
    '界面', '性能', '安全性', '可靠性', '易用性',
    '可调试性', '可移植性', '可维护性',
]

# 2026-06-04 新增：概述章节的关键词集合（用于章节内容匹配）
# 含 "概述"、"项目概述"、"系统概述" 等多种写法
CHAPTER_KEYWORDS_OVERVIEW = ('概述', '项目概述', '系统概述')

# 2026-06-04 新增：通用错误码（用于错误码章节为空时兜底）
DEFAULT_ERROR_CODES = [
    ('E0000', '成功'),
    ('E0001', '系统异常'),
    ('E0002', '参数错误'),
    ('E0003', '鉴权失败'),
    ('E0004', '数据不存在'),
    ('E0005', '数据已存在'),
]

# 2026-06-04 新增：组件关键字（用于检测"系统组件"标题下的子组件标题）
COMPONENT_SUBHEADING_KEYWORDS = ('组件',)

# 模板标题 → JSON章节标题的映射关系（支持H1+H2组合匹配）
# 键格式: "H1标题" 或 "H1标题|H2标题"
# 值: JSON中对应的章节标题列表（按优先级排序）
TEMPLATE_CHAPTER_MAP = {
    # 概述下的H2映射
    '概述|目的': ['1.1 业务背景', '业务背景', '编写目的'],
    '概述|编写目的': ['1.1 业务背景', '业务背景', '编写目的'],
    '概述|读者对象': ['读者对象', '目标读者'],
    '概述|适用范围': ['1.3 范围说明', '范围说明', '使用范围'],
    '概述|术语定义': [],  # 从appendix.glossary填充
    '概述|开发环境': [],  # 通用内容
    '概述|参考资料': [],  # 从appendix.references填充
    # H1级别映射
    '概述': ['概述'],
    '设计目标': ['设计目标'],
    '设计策略': ['设计策略'],
    '设计原则': ['设计原则'],
    '设计约束': ['设计约束'],
    '外部接口': ['外部接口', '接口设计'],
    '组件内部的模块列表及说明': ['组件汇总', '组件内部的模块列表及说明', '模块列表及说明'],
    '组件汇总': ['组件汇总', '组件内部的模块列表及说明', '模块列表及说明'],
    '技术实现': ['技术实现', '技术方案'],
    '关键技术': ['关键技术', '关键技术难点'],
    '非功能性': ['非功能性设计', '非功能性要求', '非功能性'],
    '模块复用': ['模块复用分析', '模块复用'],
    # 4个业务模块的H1+H2映射（按H2序号前缀精确匹配section）
    # 模板H2是"4.1 功能描述"/"5.1 功能描述"等带编号的，section也用对应编号
    # 这里返回空列表走特殊处理（在主循环中H1匹配后由_fill_chapter_h1_sections处理）
    # 业务模块H1标题由_find_matching_chapter中的模式匹配动态识别（含"模块设计说明"），
    # 无需在此硬编码具体模块名
    # 附录
    '附录': ['附录'],
}

# 模块级H2映射：模板H2标题（去除编号前缀）→ JSON section标题（用于模块章节下的子节匹配）
# 2026-06-05 新增：解决"模块1设计说明"下H2子节无法匹配JSON章节数据的问题
MODULE_H2_SECTION_MAP = {
    '功能描述': ['模块职责', '功能描述', '模块划分'],
    '输入项': ['接口边界', '接口定义', '参数说明'],
    '输出项': ['接口边界', '接口定义', '参数说明'],
    '接口': ['接口边界', '接口定义', '接口列表'],
    '类图': [],  # 由UML图表生成器填充
    '顺序图': [],  # 由UML图表生成器填充
    '活动图': [],  # 由UML图表生成器填充
    '备注': [],  # 一般不需要填充
}


def _find_matching_chapter(h1_title, h2_title, chapter_map):
    """根据模板H1+H2标题组合查找匹配的JSON章节

    优先级：
    1. H1+H2组合精确匹配映射表（空列表=有映射但无JSON对应，返回None交由特殊处理）
    2. H1精确匹配映射表
    3. H2单独匹配映射表
    4. 模糊匹配（去除编号前缀后比较）

    2026-06-04 优化：模板标题可能带编号前缀（如"1.1 编写目的"），
    去除编号后再查映射表，避免因编号导致精确匹配失败。
    """
    # 预处理：去除编号前缀（如"1.1 "、"2.3 "等），生成 clean 版本
    h1_clean = re.sub(r'^\d+(\.\d+)*\s*', '', h1_title) if h1_title else h1_title
    h2_clean = re.sub(r'^\d+(\.\d+)*\s*', '', h2_title) if h2_title else h2_title

    # 1. H1+H2组合匹配（同时尝试原始标题和去编号标题）
    if h2_title:
        for combo_key in [f'{h1_title}|{h2_title}', f'{h1_clean}|{h2_clean}',
                          f'{h1_title}|{h2_clean}', f'{h1_clean}|{h2_title}']:
            if combo_key in TEMPLATE_CHAPTER_MAP:
                aliases = TEMPLATE_CHAPTER_MAP[combo_key]
                # 空列表=有映射但无JSON对应，返回None交由特殊处理逻辑
                if not aliases:
                    return None
                for alias in aliases:
                    if alias in chapter_map:
                        return chapter_map[alias]

    # 2. H1精确匹配（同时尝试原始标题和去编号标题）
    for h1_key in [h1_title, h1_clean]:
        if h1_key:
            h1_aliases = TEMPLATE_CHAPTER_MAP.get(h1_key, [])
            for alias in h1_aliases:
                if alias in chapter_map:
                    return chapter_map[alias]

    # 2.5 业务模块H1标题含"模块设计说明"时，不走后续模糊匹配，交由H1级别逻辑处理
    if h1_title and '模块设计说明' in h1_title:
        return None

    # 3. H2单独匹配（当H1+H2组合无映射时，同时尝试原始标题和去编号标题）
    if h2_title:
        for h2_key in [h2_title, h2_clean]:
            if h2_key:
                h2_aliases = TEMPLATE_CHAPTER_MAP.get(h2_key, [])
                for alias in h2_aliases:
                    if alias in chapter_map:
                        return chapter_map[alias]

    # 4. 模糊匹配：去掉"第X章 "前缀和编号前缀后比较
    search_title = h2_title or h1_title
    # 对 search_title 也去除编号前缀（模板标题可能带编号如"4.7 类图"）
    search_clean = re.sub(r'^\d+(\.\d+)*\s*', '', search_title)
    for ch_title, ch_data in chapter_map.items():
        clean_title = re.sub(r'^第[一二三四五六七八九十]+章\s*', '', ch_title)
        # 去掉编号前缀（如"3.1 "、"4.7 "等）
        clean_title = re.sub(r'^\d+(\.\d+)*\s*', '', clean_title)
        if clean_title == search_clean or search_clean in clean_title or clean_title in search_clean:
            return ch_data

    return None


def generate_design_from_template(template_path, design_data_path, output_path, diagram_dir=None):
    """基于 .docx 模板生成详细设计文档"""
    shutil.copy2(template_path, output_path)
    doc = Document(output_path)

    with open(design_data_path, 'r', encoding='utf-8') as f:
        design_data = json.load(f)

    module_name = design_data.get('moduleName', '本项目')
    chapters = design_data.get('chapters', [])
    cover_page = design_data.get('coverPage', {})
    revision_history = design_data.get('revisionHistory', {})

    # 2026-06-04 新增：加载 doc_rules.yaml 配置（rules.debug_layout 控制调试日志）
    rules = _load_doc_rules()
    if rules.get('debug_layout'):
        global DEBUG_LAYOUT
        DEBUG_LAYOUT = True

    # 2026-06-04 新增：统一目录标题（去除全角/半角空格），防止模板使用"目  录"导致匹配失败
    _normalize_toc_heading(doc)

    filled_contexts = set()
    paragraphs = doc.paragraphs
    total = len(paragraphs)

    # 第一遍：封面替换 + 蓝色文本清理
    cover_replaced = False
    for i, p in enumerate(paragraphs):
        text = p.text.strip()

        # 封面标题替换（只替换第一个含XXX或详细设计的非标题段落）
        if not cover_replaced and ('XXX' in text or '/项目' in text):
            if not p.style or not p.style.name.startswith('Heading'):
                if cover_page.get('title'):
                    write_paragraph(p, cover_page['title'])
                else:
                    write_paragraph(p, f'{module_name} 详细设计文档')
                cover_replaced = True
                continue

        # 封面副标题"详细设计说明书"保留不变
        # 部门替换（匹配模板中的部门占位文字）
        _DEPT_PLACEHOLDERS = ('信息科技部', '技术开发部', '研发部', '技术部')
        if any(ph in text for ph in _DEPT_PLACEHOLDERS):
            dept = cover_page.get('department', '业务部门')
            write_paragraph(p, dept)
            continue

        # 日期替换
        if re.match(r'\d{4}年\d+月', text):
            write_paragraph(p, datetime.now().strftime('%Y年%m月'))
            continue

        # 清理蓝色占位段落
        is_heading = p.style and p.style.name.startswith('Heading')
        if is_heading and is_blue_paragraph(p) and not text:
            remove_paragraph(p)
            continue

        # 清理蓝色占位文本（非标题）
        if is_blue_paragraph(p) and is_blue_placeholder_text(text) and not is_heading:
            remove_paragraph(p)
            continue

        # 蓝色标题保留但变黑
        if is_heading and is_blue_paragraph(p) and text and not is_blue_placeholder_text(text):
            set_black(p)

        # 2026-06-04 增强：彻底清除蓝色 run 内容（非超链接、非占位的蓝色文字变黑且清空）
        if not is_heading and is_blue_paragraph(p) and text:
            # 表格内 run 由后续 _clear_blue_table_cells 处理
            if p._element.getparent() is not None and p._element.getparent().tag.endswith('}tc'):
                pass
            else:
                clear_all_blue_runs(p)
                # 清除后如段落为空，移除整段
                if not p.text.strip():
                    remove_paragraph(p)
                    continue

    # 第二遍：根据标题上下文填充内容
    # 构建章节内容映射：标题 → 内容
    chapter_map = {}
    for ch in chapters:
        ch_title = ch.get('title', '')
        chapter_map[ch_title] = ch
        if ch.get('sections'):
            for sec in ch['sections']:
                sec_title = sec.get('title', '')
                chapter_map[sec_title] = sec

    # 获取附录数据
    appendix = design_data.get('appendix', {})
    glossary = appendix.get('glossary', [])
    references = appendix.get('references', [])

    paragraphs = doc.paragraphs
    total = len(paragraphs)

    # 收集所有已匹配的JSON章节标题
    matched_json_chapters = set()

    for i, p in enumerate(paragraphs):
        text = p.text.strip()
        h1, h2, h3 = get_heading_context(paragraphs, i)
        context_key = f'{h1}|{h2}|{h3}'

        if context_key in filled_contexts:
            continue

        is_heading = p.style and p.style.name.startswith('Heading')

        if is_heading and text:
            # H1匹配chapter：进入"按H2循环填充模式"
            if p.style.name == 'Heading 1':
                chapter_data = None
                # 1. 精确标题匹配
                for ch in chapters:
                    if ch.get('title') == h1:
                        chapter_data = ch
                        break
                # 2. 2026-06-05 新增：模块级标题关键词匹配（如"模块1设计说明"）
                #    模板的"模块1设计说明"不直接对应JSON的章节标题，需要匹配到包含模块数据的章节
                if not chapter_data and '模块' in h1 and '设计说明' in h1:
                    for ch in chapters:
                        ch_title = ch.get('title', '')
                        # 匹配"功能模块划分"、"模块划分"等含模块相关数据的章节
                        if '模块' in ch_title or '功能模块' in ch_title:
                            chapter_data = ch
                            break
                if chapter_data and chapter_data.get('sections'):
                    filled_contexts.add(context_key)
                    matched_json_chapters.add(chapter_data.get('title', ''))
                    # 2026-06-05 修复：先插入业务子模块（如承兑行额度管理），再填充H2子节
                    _fill_business_submodules(doc, p, design_data)
                    _fill_chapter_h1_sections(doc, p, chapter_data, design_data, chapters)
                    # 2026-06-05 修复：将H1下所有H2的context_key也加入filled_contexts，
                    # 防止后续主循环中重复处理这些H2并覆盖已填充的内容
                    for j in range(i + 1, total):
                        pp = paragraphs[j]
                        if pp.style and pp.style.name.startswith('Heading'):
                            if pp.style.name == 'Heading 1':
                                break
                            if pp.style.name == 'Heading 2':
                                h1c, h2c, h3c = get_heading_context(paragraphs, j)
                                ctx_key = f'{h1c}|{h2c}|{h3c}'
                                filled_contexts.add(ctx_key)
                    continue

            # 2026-06-05 修复：特殊处理必须在 _find_matching_chapter 之前，
            # 否则模糊匹配会抢占特殊处理的优先级（如"适用范围"被匹配到"1.3 范围说明"）
            text_clean = re.sub(r'^\d+(\.\d+)*\s*', '', text)

            # 特殊处理：概述/项目概述/系统概述 → 内容插入位置在标题紧接的下一行
            if text in CHAPTER_KEYWORDS_OVERVIEW or any(kw in text for kw in CHAPTER_KEYWORDS_OVERVIEW if text != kw):
                overview_data = _find_overview_chapter_data(chapters, chapter_map)
                if overview_data:
                    filled_contexts.add(context_key)
                    matched_json_chapters.add(overview_data.get('title', ''))
                    _fill_chapter_content(doc, p, i, overview_data, paragraphs)
                    continue

            # 特殊处理：术语定义 → 从appendix.glossary填充（空时生成默认术语）
            if text_clean in ('术语定义', '术语和缩写', '术语'):
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_glossary_table(doc, p, glossary)
                continue

            # 特殊处理：参考资料 → 从appendix.references填充（空时生成默认参考文档）
            if text_clean in ('参考资料', '参考文档'):
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_references(doc, p, references)
                continue

            # 特殊处理：开发环境 → 通用内容
            if text_clean == '开发环境':
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_dev_environment(doc, p, design_data)
                continue

            # 特殊处理：界面 → 从需求文档提取
            if text_clean == '界面':
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_ui_description(doc, p, design_data)
                continue

            # 特殊处理：性能 → 通用内容
            if text_clean == '性能':
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_performance(doc, p, design_data)
                continue

            # 特殊处理：目的/编写目的 → 从1.1业务背景提取
            if text_clean in ('目的', '编写目的'):
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_purpose(doc, p, chapter_map, module_name)
                continue

            # 特殊处理：适用范围/使用范围 → 从1.3范围说明提取
            if text_clean in ('适用范围', '使用范围', '范围'):
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_scope(doc, p, chapter_map, module_name)
                continue

            # 特殊处理：读者对象 → 通用内容
            if text_clean in ('读者对象', '目标读者'):
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_reader_audience(doc, p, module_name)
                continue

            # 特殊处理：组件内部的模块列表及说明 → 从chapters提取组件汇总表
            if text == '组件内部的模块列表及说明' or '组件内部的模块列表' in text:
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_component_module_list(doc, p, chapters, design_data)
                continue

            # 特殊处理：模块1设计说明 → 插入业务子模块 + 填充H2子节
            if text and '模块1设计说明' in text:
                filled_contexts.add(context_key)
                _fill_business_submodules(doc, p, design_data)
                # 2026-06-05 修复：同时填充H2子节（功能描述/输入项/输出项等）
                # 找到匹配的章节数据（如"第二章 功能模块划分"）
                module_chapter = None
                for ch in chapters:
                    ch_title = ch.get('title', '')
                    if '模块' in ch_title or '功能模块' in ch_title:
                        module_chapter = ch
                        break
                if module_chapter and module_chapter.get('sections'):
                    _fill_chapter_h1_sections(doc, p, module_chapter, design_data, chapters)
                # 标记H1下所有H2为已处理，防止后续主循环重复处理
                # 2026-06-05 修复：对"界面"/"性能"H2也显式处理，然后统一标记为已填充
                _refresh_paragraphs = doc.paragraphs
                for j in range(i + 1, len(_refresh_paragraphs)):
                    pp = _refresh_paragraphs[j]
                    if pp.style and pp.style.name.startswith('Heading'):
                        if pp.style.name == 'Heading 1':
                            break
                        if pp.style.name == 'Heading 2':
                            h1c, h2c, h3c = get_heading_context(_refresh_paragraphs, j)
                            ctx_key = f'{h1c}|{h2c}|{h3c}'
                            h2_text = h2c or ''
                            h2_clean = re.sub(r'^\d+(\.\d+)*\s*', '', h2_text)
                            # 显式处理"界面"和"性能"（它们有独立的特殊处理逻辑）
                            if h2_clean == '界面':
                                _clear_content_between_headings(pp, _refresh_paragraphs)
                                _fill_ui_description(doc, pp, design_data)
                            elif h2_clean == '性能':
                                _clear_content_between_headings(pp, _refresh_paragraphs)
                                _fill_performance(doc, pp, design_data)
                            filled_contexts.add(ctx_key)
                continue

            # 特殊处理：附录 → 从chapters汇总生成附录内容
            if text_clean == '附录' or '附录' in text_clean:
                filled_contexts.add(context_key)
                _clear_content_between_headings(p, paragraphs)
                _fill_appendix(doc, p, design_data, chapters)
                continue

            # H1+H2组合或H2匹配：使用_find_matching_chapter（兜底匹配）
            matched_chapter = _find_matching_chapter(h1, text, chapter_map)
            if matched_chapter:
                filled_contexts.add(context_key)
                # 记录已匹配的JSON章节标题
                if 'sections' in matched_chapter:
                    matched_json_chapters.add(matched_chapter.get('title', ''))
                # 2026-06-04 优化：仅在 content 存在时调用 _fill_chapter_content，
                # 否则可能误用其他章节的 data 导致窜行
                if _has_meaningful_content(matched_chapter):
                    _fill_chapter_content(doc, p, i, matched_chapter, paragraphs)
                else:
                    _clear_content_between_headings(p, paragraphs)
                    _insert_placeholder_after(p, '不涉及')
                continue

    # 第三遍：将未匹配的JSON章节内容填充到"模块2设计说明"下
    unmatched_chapters = []
    for ch in chapters:
        ch_title = ch.get('title', '')
        if ch_title not in matched_json_chapters:
            unmatched_chapters.append(ch)

    if unmatched_chapters:
        paragraphs = doc.paragraphs
        for i, p in enumerate(paragraphs):
            text = p.text.strip()
            is_heading = p.style and p.style.name.startswith('Heading')

            # 找到"模块2设计说明"，填充未匹配的章节
            if is_heading and text and '模块2' in text:
                context_key = f'{p.style.name}|{text}'
                if context_key not in filled_contexts:
                    for ch in unmatched_chapters:
                        _fill_chapter_content(doc, p, i, ch, paragraphs)
                    filled_contexts.add(context_key)
                break

    # 第四遍：处理表格中的蓝色占位文本 + 表格内蓝色 run 清除
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if is_blue_cell(cell):
                    clear_blue_cell(cell)
                # 2026-06-04 增强：彻底清除表格内蓝色 run 内容
                for para in cell.paragraphs:
                    clear_all_blue_runs(para)

    # 2026-06-04 新增：处理"设计约束"标题下与业务无关的内容
    business_keywords = _extract_business_keywords(design_data, module_name)
    if business_keywords:
        remove_design_constraint_irrelevant(list(doc.paragraphs), business_keywords)
        # 删除后若整个"设计约束"章节为空，补充"不涉及"占位
        _ensure_design_constraint_placeholder(doc, placeholder='不涉及')

    # 2026-06-04 新增：检查错误码章节，缺失则插入"本系统统一错误码定义"+ 示例表
    # 必须在 fill_empty_chapter 之前执行，避免被"不涉及"占位覆盖
    _ensure_error_code_section(doc, design_data)

    # 2026-06-04 新增：界面段落格式化（每行不超过40字符）
    # 必须在 fill_empty_chapter 之前执行，否则原文会被"不涉及"覆盖
    _format_ui_paragraphs(doc)

    # 2026-06-04 新增：删除指定章节范围内的空表格（组件结构图、系统组件、模块复用分析等）
    for kw, _label in EMPTY_CHECK_EXTRA:
        _remove_empty_table_between_headings(doc, start_keyword=kw, end_keyword=None,
                                             placeholder='不涉及')

    # 2026-06-04 新增：检查并填充空子标题（设计目标、输入项、输出项、代码示例、性能优化、附录等）
    fill_empty_chapter(doc, EMPTY_CHECK_KEYWORDS, placeholder='不涉及')

    # 2026-06-04 新增：扩展空章节检查（系统概述、设计约束、模块复用分析、组件结构图、系统组件）
    fill_empty_chapter(doc, EMPTY_CHECK_EXTRA, placeholder='不涉及')

    # 2026-06-04 新增：非功能属性章节兜底（界面、性能、安全性、可靠性、易用性、可调试性、可移植性、可维护性）
    fill_empty_chapter(doc, [(kw, kw) for kw in NON_FUNCTIONAL_CHAPTERS], placeholder='不涉及')

    # 2026-06-04 新增：检查 TOC 域，无则插入（含 H1-H3 全层级）
    _ensure_toc_field(doc, levels=rules.get('toc_levels', '1-3'))

    # 2026-06-04 新增：系统组件章节下的子标题重新编号（组件1/组件2/...）
    _renumber_component_subheadings(doc)

    # 2026-06-04 新增：每个组件的"关键技术"章节按 component_name 动态生成（避免通用模板内容一致）
    _build_component_specific_tech(doc, design_data)

    # 2026-06-04 新增：正文段落首行缩进2字符（跳过标题、表格内）
    apply_body_indent_to_doc(doc, chars=2, skip_headings=True, skip_tables=True)

    # 2026-06-04 新增：所有表格统一样式（边框+字号+表头加粗+底色）
    for table in doc.tables:
        apply_table_style(table, style_name='Table Grid', font_size=TABLE_FONT_SIZE, header_bold=True)

    # 第五遍：插入架构图/网络图/部署图/UML图
    print(f'[INFO] diagram_dir 参数: {diagram_dir}', file=sys.stderr)
    if diagram_dir:
        print(f'[INFO] diagram_dir 是否为目录: {os.path.isdir(diagram_dir)}', file=sys.stderr)
        if os.path.isdir(diagram_dir):
            png_count = sum(1 for root, _, files in os.walk(diagram_dir) for f in files if f.lower().endswith('.png'))
            print(f'[INFO] diagram_dir 中 PNG 文件数: {png_count}', file=sys.stderr)
    if diagram_dir and os.path.isdir(diagram_dir):
        _insert_diagrams(doc, diagram_dir)
    else:
        print('[WARN] diagram_dir 为空或不是有效目录，跳过图表插入', file=sys.stderr)

    # 第六遍：更新修订记录表格
    _update_revision_table(doc, module_name, revision_history)

    # 保存文档
    doc.save(output_path)

    # 注入 updateFields=true 使 Word 打开时自动更新目录
    # 2026-06-04 优化：使用临时文件+重命名模式，避免 zipfile 追加条目
    inject_update_fields(output_path)

    return output_path


def _fill_chapter_h1_sections(doc, h1_para, chapter_data, design_data=None, chapters=None):
    """为H1下的每个H2子节，按section内容填充

    工作流程：
    1. 遍历H1下所有H2子标题
    2. 找到H1的XML元素
    3. 依次处理每个H2：清理H2下原占位内容，填充对应section的内容

    2026-06-05 新增：design_data 和 chapters 参数，用于在无匹配section时
    从需求数据中提取"输入项"/"输出项"/"接口"的具体内容，避免回退到"不涉及"占位。
    """
    h1_elem = h1_para._element
    h1_parent = h1_elem.getparent()
    if h1_parent is None:
        return

    # 构建section标题→内容映射（支持多种匹配方式）
    sections = chapter_data.get('sections', [])
    section_map = {}  # 按H2标题精确匹配
    for sec in sections:
        sec_title = sec.get('title', '')
        section_map[sec_title] = sec

    # 找到所有H1下的H2标题
    h1_idx_in_parent = list(h1_parent).index(h1_elem)

    # 找到下一个H1的位置作为边界
    next_h1_elem = None
    for j in range(h1_idx_in_parent + 1, len(list(h1_parent))):
        elem = list(h1_parent)[j]
        if elem.tag.endswith('}p'):
            pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '')
                if style_val in ['1', 'Heading1', 'heading1', 'heading 1', 'Heading 1']:
                    next_h1_elem = elem
                    break

    # 遍历H1下的所有段落
    elem = h1_elem.getnext()
    h2_elems = []  # 收集所有H2元素
    while elem is not None and elem is not next_h1_elem:
        if elem.tag.endswith('}p'):
            pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '')
                if style_val in ['2', 'Heading2', 'heading2', 'heading 2', 'Heading 2']:
                    # 提取文本
                    text_elems = elem.findall('.//' + qn('w:t'))
                    h2_text = ''.join(t.text or '' for t in text_elems).strip()
                    h2_elems.append((elem, h2_text))
        elem = elem.getnext()

    # 依次为每个H2填充内容
    for h2_elem, h2_text in h2_elems:
        # 1. 优先精确匹配（含编号的完整标题）
        matched_section = section_map.get(h2_text)

        # 2. 规范化匹配：去掉编号前缀和空白后比较
        #    模板 H2 可能带编号前缀如"4.7 类图"，JSON section 标题通常为"类图"
        if not matched_section:
            h2_normalized = re.sub(r'^\d+(\.\d+)*\s*', '', h2_text)  # 去掉编号前缀
            h2_normalized = re.sub(r'\s+', '', h2_normalized)
            for sec_title, sec in section_map.items():
                sec_normalized = re.sub(r'^\d+(\.\d+)*\s*', '', sec_title)
                sec_normalized = re.sub(r'\s+', '', sec_normalized)
                if sec_normalized == h2_normalized:
                    matched_section = sec
                    break

        # 3. 2026-06-05 新增：模块级H2映射（解决"模块1设计说明"下子节匹配问题）
        if not matched_section and h2_normalized in MODULE_H2_SECTION_MAP:
            aliases = MODULE_H2_SECTION_MAP[h2_normalized]
            for alias in aliases:
                if alias in section_map:
                    matched_section = section_map[alias]
                    break
                # 也尝试规范化匹配
                for sec_title, sec in section_map.items():
                    sec_normalized = re.sub(r'^\d+(\.\d+)*\s*', '', sec_title)
                    sec_normalized = re.sub(r'\s+', '', sec_normalized)
                    if sec_normalized == alias:
                        matched_section = sec
                        break
                if matched_section:
                    break

        if not matched_section:
            # 2026-06-05 新增：无匹配section时的H2兜底填充
            # 界面/性能/接口/类图/顺序图/活动图/备注 等H2在JSON中可能没有对应section
            # 需要插入合理的默认内容，避免文档中出现空章节
            h2_clean = re.sub(r'^\d+(\.\d+)*\s*', '', h2_text)
            from docx.text.paragraph import Paragraph
            h2_para = Paragraph(h2_elem, h1_para._parent)
            _clear_content_between_h2_heading(h2_para)

            if h2_clean == '界面':
                placeholder = '界面设计详见需求文档中的界面原型图；界面布局主要包括查询区、列表区、操作区三个部分，菜单位置与查询条件以原型图为准。'
                new_p_elem = _create_paragraph_xml(placeholder)
                h2_elem.addnext(new_p_elem)
            elif h2_clean == '性能':
                perf_items = [
                    '核心操作响应时间：< 500ms',
                    '列表查询响应时间：< 1s',
                    '并发用户数：支持50+并发',
                    '数据量：支持10万+记录查询',
                ]
                insert_anchor = h2_elem
                for item in perf_items:
                    new_p_elem = _create_paragraph_xml(item)
                    insert_anchor.addnext(new_p_elem)
                    insert_anchor = new_p_elem
            elif h2_clean == '输入项':
                # 2026-06-05 修复：从chapters中提取栏位描述表中的"输入"字段，
                # 避免回退到"不涉及"占位（fill_empty_chapter 兜底）
                input_items = _extract_field_items(chapters, '输入')
                if input_items:
                    insert_anchor = h2_elem
                    for item in input_items:
                        new_p_elem = _create_paragraph_xml(item)
                        insert_anchor.addnext(new_p_elem)
                        insert_anchor = new_p_elem
                else:
                    placeholder = '本模块输入项主要包括查询条件、表单输入字段等，具体定义详见需求文档中的栏位描述表。'
                    new_p_elem = _create_paragraph_xml(placeholder)
                    h2_elem.addnext(new_p_elem)
            elif h2_clean == '输出项':
                # 2026-06-05 修复：从chapters中提取栏位描述表中的"输出"字段
                output_items = _extract_field_items(chapters, '输出')
                if output_items:
                    insert_anchor = h2_elem
                    for item in output_items:
                        new_p_elem = _create_paragraph_xml(item)
                        insert_anchor.addnext(new_p_elem)
                        insert_anchor = new_p_elem
                else:
                    placeholder = '本模块输出项主要包括列表展示、详情展示等结果数据，具体定义详见需求文档中的栏位描述表。'
                    new_p_elem = _create_paragraph_xml(placeholder)
                    h2_elem.addnext(new_p_elem)
            elif h2_clean == '接口':
                # 2026-06-05 修复：从chapters中提取接口相关数据，而非仅填充占位文本
                interface_items = _extract_interface_items(chapters, design_data)
                if interface_items:
                    insert_anchor = h2_elem
                    for item in interface_items:
                        new_p_elem = _create_paragraph_xml(item)
                        insert_anchor.addnext(new_p_elem)
                        insert_anchor = new_p_elem
                else:
                    placeholder = '本模块接口设计详见接口文档，主要接口包括查询、新增、修改、删除等标准CRUD操作，具体接口定义参见各子模块设计说明。'
                    new_p_elem = _create_paragraph_xml(placeholder)
                    h2_elem.addnext(new_p_elem)
            elif h2_clean in ('类图', '顺序图', '活动图'):
                placeholder = f'（{h2_clean}详见UML设计文档，此处为占位说明）'
                new_p_elem = _create_paragraph_xml(placeholder)
                h2_elem.addnext(new_p_elem)
            elif h2_clean == '备注':
                new_p_elem = _create_paragraph_xml('暂无')
                h2_elem.addnext(new_p_elem)
            continue

        # 清理H2下的原占位内容（仅当有匹配内容时才清理）
        from docx.text.paragraph import Paragraph
        h2_para = Paragraph(h2_elem, h1_para._parent)
        _clear_content_between_h2_heading(h2_para)

        # 填充section内容
        content = matched_section.get('content', {})

        # 找到H2元素在parent中的位置，新内容插在H2后
        insert_anchor = h2_elem

        if isinstance(content, dict):
            description = content.get('description', '')
            if description:
                new_p_elem = _create_paragraph_xml(description)
                insert_anchor.addnext(new_p_elem)
                insert_anchor = new_p_elem

            # 表格
            headers = content.get('headers', [])
            rows = content.get('rows', [])
            if headers and rows:
                # 在H2后插入表格
                # 2026-06-05 修复：若只有表格无描述段落，先插入一个描述段落。
                # fill_empty_chapter 只检查段落文本不检查表格，无描述段落时会被误判为空并覆盖。
                if not description:
                    table_desc = f'以下表格列出了{matched_section.get("title", "")}的相关信息：'
                    new_p_elem = _create_paragraph_xml(table_desc)
                    insert_anchor.addnext(new_p_elem)
                    insert_anchor = new_p_elem
                _add_table_after_h2(insert_anchor, headers, rows)


def _extract_field_items(chapters, field_type):
    """从chapters中提取指定类型（'输入'/'输出'）的栏位描述字段

    遍历所有章节的section数据，查找包含field_type关键字的表格行，
    以"字段名 | 类型 | 说明"格式返回，用于填充"输入项"/"输出项"章节。
    如果chapters为None则返回空列表。
    """
    if not chapters:
        return []
    items = []
    for ch in chapters:
        for sec in ch.get('sections', []):
            content = sec.get('content', {})
            if isinstance(content, dict):
                headers = content.get('headers', [])
                rows = content.get('rows', [])
                if headers and rows:
                    # 查找标题行中包含field_type关键字的列索引
                    target_cols = []
                    for j, h in enumerate(headers):
                        if field_type in str(h):
                            target_cols.append(j)
                    if target_cols:
                        # 提取所有行中对应列的内容
                        for row in rows:
                            row_parts = []
                            for j, cell in enumerate(row):
                                cell_str = str(cell).strip()
                                if cell_str and cell_str != 'None':
                                    row_parts.append(f'{headers[j] if j < len(headers) else ""}: {cell_str}')
                            if row_parts:
                                items.append('；'.join(row_parts))
                    else:
                        # 无明确列标题匹配时，检查整行是否包含field_type关键字
                        for row in rows:
                            row_str = ' | '.join(str(c) for c in row if str(c).strip())
                            if field_type in row_str and row_str not in items:
                                items.append(row_str)
    return items


def _extract_interface_items(chapters, design_data):
    """从chapters中提取接口相关数据

    遍历所有章节的section数据，查找标题含"接口"/"API"/"方法"的表格，
    以"接口名 | 说明"格式返回。如果无数据则返回空列表。
    """
    if not chapters:
        return []
    items = []
    for ch in chapters:
        for sec in ch.get('sections', []):
            sec_title = sec.get('title', '')
            content = sec.get('content', {})
            if isinstance(content, dict):
                headers = content.get('headers', [])
                rows = content.get('rows', [])
                # 匹配section标题或表格标题含接口关键字
                if headers and any(
                    '接口' in str(h) or 'API' in str(h) or '方法' in str(h) or 'URL' in str(h)
                    for h in headers
                ):
                    if len(headers) >= 2:
                        # 多列表格：提取前两列作为接口名和说明
                        for row in rows:
                            name = str(row[0]).strip() if len(row) > 0 else ''
                            desc = str(row[1]).strip() if len(row) > 1 else ''
                            if name:
                                items.append(f'{name}：{desc}' if desc else name)
                    else:
                        # 单列表格
                        for row in rows:
                            items.append(' | '.join(str(c) for c in row))
    return items


def _clear_content_between_h2_heading(h2_para):
    """清理H2标题和下一个H2之间的所有非标题段落"""
    h2_elem = h2_para._element
    parent = h2_elem.getparent()
    if parent is None:
        return

    heading_style_vals = {
        '1', '2', '3', '4', '5', '6',
        'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6',
        'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
        'heading 1', 'heading 2', 'heading 3', 'heading 4', 'heading 5', 'heading 6',
        'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6',
    }

    to_remove = []
    found = False
    for elem in list(parent):
        if elem is h2_elem:
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

    for elem in to_remove:
        parent.remove(elem)


def _create_paragraph_xml(text):
    """创建普通段落XML元素"""
    new_p = OxmlElement('w:p')
    r = OxmlElement('w:r')
    # 设置黑色字体
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
    return new_p


def _add_table_after_h2(h2_elem, headers, rows):
    """在H2元素后插入表格"""
    parent = h2_elem.getparent()
    if parent is None:
        return

    # 创建表格XML
    tbl = OxmlElement('w:tbl')

    # 表格属性
    tblPr = OxmlElement('w:tblPr')
    tblW = OxmlElement('w:tblW')
    tblW.set(qn('w:w'), '0')
    tblW.set(qn('w:type'), 'auto')
    tblPr.append(tblW)
    tblBorders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement('w:' + border_name)
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:color'), '000000')
        tblBorders.append(border)
    tblPr.append(tblBorders)
    tbl.append(tblPr)

    # 表格网格
    num_cols = len(headers)
    tblGrid = OxmlElement('w:tblGrid')
    for _ in range(num_cols):
        gridCol = OxmlElement('w:gridCol')
        tblGrid.append(gridCol)
    tbl.append(tblGrid)

    # 表头行
    header_tr = OxmlElement('w:tr')
    for h in headers:
        tc = OxmlElement('w:tc')
        tcPr = OxmlElement('w:tcPr')
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), 'D9D9D9')
        tcPr.append(shd)
        tc.append(tcPr)
        p = OxmlElement('w:p')
        r = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        b = OxmlElement('w:b')
        rPr.append(b)
        sz = OxmlElement('w:sz')
        sz.set(qn('w:val'), '21')  # 10.5pt
        rPr.append(sz)
        r.append(rPr)
        t = OxmlElement('w:t')
        t.text = str(h)
        t.set(qn('xml:space'), 'preserve')
        r.append(t)
        p.append(r)
        tc.append(p)
        header_tr.append(tc)
    tbl.append(header_tr)

    # 数据行
    for row in rows:
        tr = OxmlElement('w:tr')
        for cell in row:
            tc = OxmlElement('w:tc')
            p = OxmlElement('w:p')
            r = OxmlElement('w:r')
            rPr = OxmlElement('w:rPr')
            sz = OxmlElement('w:sz')
            sz.set(qn('w:val'), '21')
            rPr.append(sz)
            r.append(rPr)
            t = OxmlElement('w:t')
            t.text = str(cell)
            t.set(qn('xml:space'), 'preserve')
            r.append(t)
            p.append(r)
            tc.append(p)
            tr.append(tc)
        tbl.append(tr)

    # 插入到H2元素之后
    h2_elem.addnext(tbl)
    # 在表格后加一个空段落（Word要求）
    empty_p = OxmlElement('w:p')
    tbl.addnext(empty_p)
    # 2026-06-04 优化：表格插入后应用统一样式（边框+字号+表头加粗+底色）
    # 注意：此处 tbl 是 OxmlElement，构建 Table 对象需要 parent；为简化，统一在主流程末尾 apply_table_style 兜底处理所有 doc.tables


def _insert_paragraph_after(paragraph, text, style=None):
    new_p = OxmlElement('w:p')
    # 设置段落样式
    if style:
        pPr = OxmlElement('w:pPr')
        pStyle = OxmlElement('w:pStyle')
        pStyle.set(qn('w:val'), style)
        pPr.append(pStyle)
        new_p.append(pPr)
    # 添加文本run
    r = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    r.append(t)
    new_p.append(r)
    # 插入到文档
    paragraph._element.addnext(new_p)
    # 返回python-docx段落对象
    from docx.text.paragraph import Paragraph
    return Paragraph(new_p, paragraph._parent)


def _get_diagram_filename_keywords(keywords):
    """根据中文图表标题关键词，返回用于文件名模糊匹配的英文关键词列表

    2026-06-05 新增：解决实际图片文件名不符合预期命名规范时（如
    class_diagram.png 而非 class-diagram.png），精确匹配失败的问题。
    """
    keyword_map = {
        '系统架构': ['architecture', 'arch', 'system'],
        '组件结构图': ['component', 'comp', 'struct', 'architecture'],
        '架构图': ['architecture', 'arch'],
        '网络结构图': ['network', 'topology', 'net'],
        '网络拓扑': ['network', 'topology', 'net'],
        '网络图': ['network', 'net'],
        '部署图': ['deploy', 'deployment'],
        '部署架构': ['deploy', 'deployment'],
        '类图': ['class', 'uml'],
        '类图设计': ['class', 'uml'],
        '顺序图': ['sequence', 'seq', 'uml'],
        '时序图': ['sequence', 'seq', 'uml'],
        '序列图': ['sequence', 'seq', 'uml'],
        '活动图': ['activity', 'flow', 'uml'],
        '流程图': ['activity', 'flow', 'flowchart'],
        'ER图': ['er', 'entity', 'entity-relationship'],
        'E-R图': ['er', 'entity', 'entity-relationship'],
        '实体关系': ['er', 'entity', 'entity-relationship'],
        '数据流图': ['dataflow', 'data-flow', 'dfd'],
        '数据流': ['dataflow', 'data-flow', 'dfd'],
        '状态图': ['state', 'statechart', 'uml'],
        '状态机': ['state', 'statechart', 'uml'],
    }
    result = []
    for kw in keywords:
        if kw in keyword_map:
            result.extend(keyword_map[kw])
    return result


def _insert_diagrams(doc, diagram_dir):
    """在文档中插入架构图、网络拓扑图、部署图、UML图（类图/顺序图/活动图）

    查找"系统架构"/"组件结构图"/"部署图"/"类图"/"顺序图"/"活动图"等标题，
    在标题下插入对应图片。支持在 diagram_dir 子目录中查找图片文件。
    支持多种图片格式：.png, .jpg, .jpeg。
    插入前先清除标题下的旧图片元素。

    2026-06-04 优化：
    - 支持 .jpg/.jpeg 格式（不仅限于 .png）
    - 查找图片时同时搜索多种扩展名，优先使用 .png
    - 标题匹配时也去除编号前缀（如"4.7 类图"）
    - 增加 ER 图、数据流图等常见图表类型
    """
    # 日志：确认图表目录和文件是否存在
    print(f'[INFO] _insert_diagrams: diagram_dir={diagram_dir}', file=sys.stderr)
    if not os.path.isdir(diagram_dir):
        print(f'[WARN] _insert_diagrams: 目录不存在: {diagram_dir}', file=sys.stderr)
        return

    # 递归收集 diagram_dir 及其子目录中的所有图片文件（支持 .png/.jpg/.jpeg）
    SUPPORTED_EXTS = ('.png', '.jpg', '.jpeg')
    all_images = {}  # filename → filepath，同文件名优先 .png
    for root, _dirs, files in os.walk(diagram_dir):
        for f in files:
            f_lower = f.lower()
            if f_lower.endswith(SUPPORTED_EXTS):
                # 同名文件优先保留 .png（后处理的覆盖先处理的）
                all_images[f] = os.path.join(root, f)
    print(f'[INFO] _insert_diagrams: 找到 {len(all_images)} 个图片文件: {list(all_images.keys())}', file=sys.stderr)

    # 标题关键词 → 对应图片文件名的映射（含 UML 图表）
    # 每个映射项支持多个候选文件名（按优先级排序，找到第一个即用）
    diagram_map = [
        (['系统架构', '组件结构图', '架构图'], ['architecture-diagram.png', 'architecture-diagram.jpg']),
        (['网络结构图', '网络拓扑', '网络图'], ['network-topology.png', 'network-topology.jpg']),
        (['部署图', '部署架构'], ['deployment-diagram.png', 'deployment-diagram.jpg']),
        (['类图', '类图设计'], ['class-diagram.png', 'class-diagram.jpg']),
        (['顺序图', '时序图', '序列图'], ['sequence-diagram.png', 'sequence-diagram.jpg']),
        (['活动图', '流程图'], ['activity-diagram.png', 'activity-diagram.jpg']),
        (['ER图', 'E-R图', '实体关系'], ['er-diagram.png', 'er-diagram.jpg']),
        (['数据流图', '数据流'], ['data-flow-diagram.png', 'data-flow-diagram.jpg']),
        (['状态图', '状态机'], ['state-diagram.png', 'state-diagram.jpg']),
    ]

    inserted_count = 0
    # 记录已使用的图片文件路径，避免同一张图重复插入
    used_images = set()

    for keywords, filenames in diagram_map:
        # 按优先级查找图片文件（精确文件名匹配）
        img_path = None
        matched_filename = None
        for filename in filenames:
            if filename in all_images:
                img_path = all_images[filename]
                matched_filename = filename
                break

        # 2026-06-05 修复：精确文件名匹配失败时，回退到关键字模糊匹配
        # 实际图片目录中的文件名可能不符合预期命名规范（如 class_diagram.png 而非 class-diagram.png）
        if not img_path:
            # 从keywords中提取用于文件名匹配的关键词（英文）
            keyword_patterns = _get_diagram_filename_keywords(keywords)
            for fname, fpath in all_images.items():
                if fpath in used_images:
                    continue
                fname_lower = fname.lower()
                if any(kw in fname_lower for kw in keyword_patterns):
                    img_path = fpath
                    matched_filename = fname
                    print(f'[INFO] _insert_diagrams: 模糊匹配 {fname} → {keywords}', file=sys.stderr)
                    break

        if not img_path or not os.path.exists(img_path):
            # 仅对必要图表输出警告
            if any(fn in ('architecture-diagram.png', 'network-topology.png', 'deployment-diagram.png')
                   for fn in filenames):
                print(f'[WARN] _insert_diagrams: 必要图表缺失: {filenames}', file=sys.stderr)
            continue

        used_images.add(img_path)

        # 查找匹配关键词的标题段落（同时支持带编号前缀的标题）
        target_para = None
        for p in doc.paragraphs:
            if p.style and p.style.name.startswith('Heading'):
                p_text = p.text.strip()
                # 去除编号前缀后比较，支持"4.7 类图"等格式
                p_text_clean = re.sub(r'^\d+(\.\d+)*\s*', '', p_text)
                if any(kw in p_text or kw in p_text_clean for kw in keywords):
                    target_para = p
                    break

        if target_para is None:
            print(f'[WARN] _insert_diagrams: 未找到匹配标题 {keywords}，跳过图片 {matched_filename}', file=sys.stderr)
            continue

        # 清除标题下的旧图片
        _clear_images_between_headings(target_para)

        # 插入新图片
        try:
            img_p = doc.add_paragraph()
            img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = img_p.add_run()
            run.add_picture(img_path, width=Inches(6))
            target_para._element.addnext(img_p._element)
            inserted_count += 1
            print(f'[INFO] _insert_diagrams: 已插入 {matched_filename} 到标题 "{target_para.text.strip()}"', file=sys.stderr)
        except Exception as e:
            print(f'[WARN] 插入图表 {matched_filename} 失败: {e}', file=sys.stderr)

    print(f'[INFO] _insert_diagrams: 共插入 {inserted_count} 张图片', file=sys.stderr)


def _clear_images_between_headings(heading_para):
    """清除标题段落与下一个标题之间的旧图片元素（w:drawing 和 w:pict）"""
    heading_elem = heading_para._element
    parent = heading_elem.getparent()
    if parent is None:
        return

    heading_style_vals = {
        '1', '2', '3', '4', '5', '6',
        'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6',
        'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
        'heading 1', 'heading 2', 'heading 3', 'heading 4', 'heading 5', 'heading 6',
        'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6',
    }

    found_heading = False
    to_remove = []
    for elem in list(parent):
        if elem is heading_elem:
            found_heading = True
            continue
        if not found_heading:
            continue
        # 遇到下一个标题则停止
        if elem.tag.endswith('}p'):
            pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '')
                if style_val in heading_style_vals:
                    break
            # 检查段落中是否包含 w:drawing 或 w:pict（即图片）
            if elem.findall('.//' + qn('w:drawing')) or elem.findall('.//' + qn('w:pict')):
                to_remove.append(elem)

    for elem in to_remove:
        parent.remove(elem)


def _update_revision_table(doc, module_name, revision_history):
    """更新修订记录表格的第一行

    如果文档中存在修订记录表格，更新第一行数据行的版本号、日期、作者和描述。
    """
    for table in doc.tables:
        # 通过表头判断是否为修订记录表
        first_row_text = ''
        if table.rows:
            for cell in table.rows[0].cells:
                first_row_text += cell.text.strip()
        if '版本' not in first_row_text and '修订' not in first_row_text:
            continue

        # 找到数据行（跳过表头）
        if len(table.rows) < 2:
            continue

        data_row = table.rows[1]
        today = datetime.now().strftime('%Y-%m-%d')
        author = revision_history.get('author', '') if isinstance(revision_history, dict) else ''
        description = revision_history.get('description', '') if isinstance(revision_history, dict) else ''

        # 根据列数填充
        cells = data_row.cells
        if len(cells) >= 1:
            _set_cell_text(cells[0], 'V1.0')
        if len(cells) >= 2:
            _set_cell_text(cells[1], today)
        if len(cells) >= 3:
            _set_cell_text(cells[2], author or '开发组')
        if len(cells) >= 4:
            _set_cell_text(cells[3], description or f'{module_name}详细设计文档初稿')
        break


def _set_cell_text(cell, text):
    """设置单元格文本（保留格式）"""
    for para in cell.paragraphs:
        for r in para.runs:
            r.text = ''
    if cell.paragraphs and cell.paragraphs[0].runs:
        cell.paragraphs[0].runs[0].text = text
    elif cell.paragraphs:
        cell.paragraphs[0].add_run(text)


# 注意：_inject_update_fields 委托给 doc_formatter.inject_update_fields（见文件末尾）


def _fill_glossary_table(doc, heading_para, glossary):
    """填充术语定义表格（glossary 为空时生成通用默认术语）"""
    if not glossary:
        glossary = [
            {'term': 'API', 'definition': 'Application Programming Interface，应用程序编程接口'},
            {'term': 'CRUD', 'definition': 'Create/Read/Update/Delete，增删改查操作'},
            {'term': 'DAO', 'definition': 'Data Access Object，数据访问对象'},
            {'term': 'DTO', 'definition': 'Data Transfer Object，数据传输对象'},
            {'term': 'RPC', 'definition': 'Remote Procedure Call，远程过程调用'},
        ]
    headers = ['术语/缩写', '全称', '说明']
    rows = []
    for item in glossary:
        term = item.get('term', '')
        definition = item.get('definition', '')
        rows.append([term, '', definition])
    if rows:
        _add_table_after_paragraph(heading_para, headers, rows)


def _fill_references(doc, heading_para, references):
    """填充参考资料（references 为空时生成通用默认参考文档）"""
    if not references:
        references = [
            '《需求规格说明书》',
            '《概要设计说明书》',
            '《系统接口规范》',
            '《数据库设计文档》',
        ]
    for i, ref in enumerate(references, 1):
        new_p = _insert_paragraph_after(heading_para, f'[{i}] {ref}')
        set_black(new_p)
        heading_para = new_p


def _fill_dev_environment(doc, heading_para, design_data):
    """填充开发环境信息"""
    # 优先从JSON配置读取，未配置时使用通用默认值
    default_env = [
        '开发语言：Java',
        '框架：Spring Boot',
        '前端框架：Vue.js',
        '数据库：Oracle / MySQL',
        '构建工具：Maven',
        '版本管理：Git',
    ]
    env_items = design_data.get('devEnvironment', default_env)
    insert_after = heading_para
    for item in env_items:
        new_p = _insert_paragraph_after(insert_after, item)
        set_black(new_p)
        insert_after = new_p


def _fill_ui_description(doc, heading_para, design_data):
    """填充界面描述"""
    # 从chapters中提取界面相关信息
    chapters = design_data.get('chapters', [])
    ui_info = ''
    for ch in chapters:
        sections = ch.get('sections', [])
        for sec in sections:
            content = sec.get('content', {})
            if isinstance(content, dict):
                desc = content.get('description', '')
                if '界面' in desc or '菜单位置' in desc or '查询条件' in desc:
                    ui_info += desc + '\n'

    if ui_info:
        new_p = _insert_paragraph_after(heading_para, ui_info.strip())
        set_black(new_p)
    else:
        # 2026-06-04 优化：占位文本保持一定长度（>40字符）以触发 _format_ui_paragraphs 软换行
        placeholder = '界面设计详见需求文档中的界面原型图；界面布局主要包括查询区、列表区、操作区三个部分，菜单位置与查询条件以原型图为准。'
        new_p = _insert_paragraph_after(heading_para, placeholder)
        set_black(new_p)


def _fill_performance(doc, heading_para, design_data):
    """填充性能要求"""
    # 优先从JSON配置读取，未配置时使用通用占位
    default_perf = [
        '核心操作响应时间：< 500ms',
        '列表查询响应时间：< 1s',
        '并发用户数：支持50+并发',
        '数据量：支持10万+记录查询',
    ]
    perf_items = design_data.get('performance', default_perf)
    insert_after = heading_para
    for item in perf_items:
        new_p = _insert_paragraph_after(insert_after, item)
        set_black(new_p)
        insert_after = new_p


def _fill_purpose(doc, heading_para, chapter_map, module_name='本项目'):
    """填充目的章节，从1.1业务背景提取。检测模板占位文本并替换为有意义的内容。"""
    TEMPLATE_PLACEHOLDER_PREFIX = '描述当前业务痛点或需求来源'
    for key in ['1.1 业务背景', '业务背景']:
        if key in chapter_map:
            ch = chapter_map[key]
            content = ch.get('content', {})
            if isinstance(content, dict) and content.get('description'):
                desc = content['description']
                # 检测模板占位文本，替换为基于模块名的有意义的默认内容
                if desc.startswith(TEMPLATE_PLACEHOLDER_PREFIX):
                    desc = (f'{module_name}旨在实现相关业务功能，'
                            f'满足业务管理子系统的管控需求，'
                            f'确保数据一致性和操作完整性。')
                new_p = _insert_paragraph_after(heading_para, desc)
                set_black(new_p)
                return
    # 默认内容
    new_p = _insert_paragraph_after(heading_para, f'本文档详细描述{module_name}的设计方案，为开发、测试和维护提供技术依据。')
    set_black(new_p)


def _fill_scope(doc, heading_para, chapter_map, module_name='本项目'):
    """填充适用范围章节，从1.3范围说明提取"""
    for key in ['1.3 范围说明', '范围说明']:
        if key in chapter_map:
            ch = chapter_map[key]
            content = ch.get('content', {})
            if isinstance(content, dict):
                if content.get('headers') and content.get('rows'):
                    _add_table_after_paragraph(heading_para, content['headers'], content['rows'])
                    return
                if content.get('description'):
                    new_p = _insert_paragraph_after(heading_para, content['description'])
                    set_black(new_p)
                    return
    # 默认内容
    new_p = _insert_paragraph_after(heading_para, f'本文档适用于{module_name}的设计与开发。')
    set_black(new_p)


def _fill_reader_audience(doc, heading_para, module_name='本项目'):
    """填充读者对象章节（详细设计模板专用）

    2026-06-04 新增：详细设计模板中"读者对象"章节的默认内容。
    """
    default_readers = [
        f'{module_name}的开发人员',
        f'{module_name}的测试人员',
        f'{module_name}的项目经理',
        '系统架构师',
    ]
    for reader in default_readers:
        new_p = _insert_paragraph_after(heading_para, reader)
        set_black(new_p)
        heading_para = new_p


def _fill_component_module_list(doc, heading_para, chapters, design_data):
    """填充"组件内部的模块列表及说明"章节

    从 design_data 的 chapters 和 businessSubmodules 中提取模块列表，
    生成模块汇总表格。若无可提取数据则插入"不涉及"占位。
    """
    module_name = design_data.get('moduleName', '')
    business_submodules = design_data.get('businessSubmodules') or []

    # 收集模块条目：优先从 businessSubmodules 提取，其次从 chapters 提取
    rows = []
    if business_submodules:
        for idx, sub in enumerate(business_submodules, 1):
            if isinstance(sub, dict):
                name = sub.get('name') or sub.get('title') or f'子模块{idx}'
                desc = sub.get('description') or ''
                if isinstance(desc, dict):
                    desc = desc.get('description', '')
            elif isinstance(sub, str):
                name = sub
                desc = ''
            else:
                continue
            rows.append([str(idx), name, desc or f'{name}功能模块'])
    elif chapters:
        for idx, ch in enumerate(chapters, 1):
            title = ch.get('title', f'模块{idx}')
            desc = ''
            content = ch.get('content', {})
            if isinstance(content, dict):
                desc = content.get('description', '')
            rows.append([str(idx), title, desc or f'{title}功能模块'])

    if rows:
        headers = ['序号', '模块名称', '说明']
        _add_table_after_paragraph(heading_para, headers, rows)
    else:
        new_p = _insert_paragraph_after(heading_para, f'{module_name}组件内部的模块列表详见各模块设计说明。')
        set_black(new_p)


def _fill_business_submodules(doc, heading_para, design_data):
    """在"模块1设计说明"下插入业务子模块（H2级别标题+描述）

    从 design_data 的 businessSubmodules 中提取业务子模块，
    在标题后依次插入 H2 级别的子模块标题和简要描述。
    不清除模板中已有的 H2 子标题（功能描述/界面/性能等），子模块插入在它们之前。
    """
    business_submodules = design_data.get('businessSubmodules') or []
    if not business_submodules:
        return

    insert_after = heading_para
    for sub in business_submodules:
        if isinstance(sub, dict):
            sub_name = sub.get('name') or sub.get('title') or ''
            sub_desc = sub.get('description') or ''
            if isinstance(sub_desc, dict):
                sub_desc = sub_desc.get('description', '')
        elif isinstance(sub, str):
            sub_name = sub
            sub_desc = ''
        else:
            continue

        if not sub_name:
            continue

        # 插入 H2 级别子模块标题
        new_heading = _insert_paragraph_after(insert_after, sub_name, style='Heading2')
        set_black(new_heading)
        insert_after = new_heading

        # 插入子模块描述
        if sub_desc:
            new_p = _insert_paragraph_after(insert_after, sub_desc)
            set_black(new_p)
            insert_after = new_p


def _clear_content_between_headings(heading_para, paragraphs):
    """清理目标标题与下一标题之间的所有非标题段落（模板原始占位内容）

    2026-06-04 优化：
    - 仅清除"目标标题 → 下一标题"区间内的内容，避免越界
    - 表格（w:tbl）也一并删除，因为模板中的占位表格会导致内容窜行
    - DEBUG_LAYOUT=True 时输出每一步清理的标题/段落/表格，便于排查窜行
    """
    heading_element = heading_para._element
    parent = heading_element.getparent()
    if parent is None:
        return

    # Word XML中标题样式的pStyle值：1=Heading1, 2=Heading2, 3=Heading3等
    # 包含多种写法变体，确保正确识别所有级别的标题边界
    heading_style_vals = {
        '1', '2', '3', '4', '5', '6',
        'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6',
        'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
        'heading 1', 'heading 2', 'heading 3', 'heading 4', 'heading 5', 'heading 6',
        'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6',
    }

    heading_text = (heading_para.text or '').strip()
    if DEBUG_LAYOUT:
        print(f'[DEBUG] _clear_content_between_headings start: "{heading_text}"', file=sys.stderr)

    # 从标题下一个元素开始，删除直到遇到下一个标题
    to_remove = []
    found_heading = False
    next_heading_text = None
    tbl_count = 0
    for elem in list(parent):
        if elem is heading_element:
            found_heading = True
            continue
        if not found_heading:
            continue
        # 检查是否是标题段落
        if elem.tag.endswith('}p'):
            pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            if pPr is not None:
                style_val = pPr.get(qn('w:val'), '')
                if style_val in heading_style_vals:
                    # 取出下一标题文本以便调试
                    t_elems = elem.findall('.//' + qn('w:t'))
                    next_heading_text = ''.join(t.text or '' for t in t_elems).strip()
                    break  # 遇到下一个标题，停止
            # 非标题段落，标记删除
            to_remove.append(elem)
        elif elem.tag.endswith('}tbl'):
            # 模板中的占位表格也需要删除，否则会导致内容窜行
            # 后续 _fill_chapter_content 会重新插入正确的表格
            to_remove.append(elem)
            tbl_count += 1

    if DEBUG_LAYOUT:
        print(f'[DEBUG]   next heading: "{next_heading_text}", will remove {len(to_remove)} elements (incl. {tbl_count} tables)', file=sys.stderr)

    for elem in to_remove:
        parent.remove(elem)


def _fill_chapter_content(doc, heading_para, heading_idx, chapter_data, paragraphs):
    """在标题后插入章节内容，支持chapter和section两种数据格式"""
    # 先清理模板原始占位内容
    _clear_content_between_headings(heading_para, paragraphs)
    
    sections = chapter_data.get('sections', [])
    body_texts = chapter_data.get('bodyTexts', [])
    tables = chapter_data.get('tables', [])
    content = chapter_data.get('content', None)

    # 当前插入位置参考段落
    insert_after = heading_para

    # 处理section级别的数据（只有content字段，没有sections字段）
    if not sections and content:
        if isinstance(content, str) and content:
            new_p = _insert_paragraph_after(insert_after, content)
            set_black(new_p)
            insert_after = new_p
        elif isinstance(content, dict):
            if content.get('description'):
                new_p = _insert_paragraph_after(insert_after, content['description'])
                set_black(new_p)
                insert_after = new_p
            if content.get('headers') and content.get('rows'):
                _add_table_after_paragraph(insert_after, content['headers'], content['rows'])
        return

    # 处理chapter级别的数据（有sections字段）
    # 插入正文文本
    for bt in body_texts:
        if bt:
            new_p = _insert_paragraph_after(insert_after, bt)
            set_black(new_p)
            insert_after = new_p

    # 插入表格
    for tbl_data in tables:
        headers = tbl_data.get('headers', [])
        rows = tbl_data.get('rows', [])
        if headers and rows:
            _add_table_after_paragraph(insert_after, headers, rows)

    # 插入子节
    for sec in sections:
        sec_title = sec.get('title', '')
        sec_content = sec.get('content', '')

        # 添加子节标题（Heading 2级别）
        new_heading = _insert_paragraph_after(insert_after, sec_title, style='Heading2')
        insert_after = new_heading

        # 添加子节内容
        if isinstance(sec_content, str) and sec_content:
            new_p = _insert_paragraph_after(insert_after, sec_content)
            set_black(new_p)
            insert_after = new_p
        elif isinstance(sec_content, dict):
            if sec_content.get('description'):
                new_p = _insert_paragraph_after(insert_after, sec_content['description'])
                set_black(new_p)
                insert_after = new_p
            if sec_content.get('headers') and sec_content.get('rows'):
                _add_table_after_paragraph(
                    insert_after,
                    sec_content['headers'],
                    sec_content['rows']
                )


def _add_table_after_paragraph(paragraph, headers, rows):
    """在段落后插入表格"""
    try:
        parent = paragraph._element.getparent()
        if parent is None:
            return
        idx = list(parent).index(paragraph._element)

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
            b = OxmlElement('w:b')
            rPr.append(b)
            r.append(rPr)
            t = OxmlElement('w:t')
            t.text = str(h)
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
                r.append(t)
                p.append(r)
                tc.append(p)
                tr.append(tc)
            tbl.append(tr)

        parent.insert(idx + 1, tbl)
    except Exception as e:
        print(f'[WARN] 表格插入失败: {e}', file=sys.stderr)


# ==================== 2026-06-04 新增辅助函数 ====================

def _extract_business_keywords(design_data, module_name):
    """从 design_data 提取业务关键词集合（用于"设计约束"业务相关性判定）

    来源：
    - moduleName
    - chapter.title / section.title 中的中文名词
    - 显式字段 businessKeywords
    """
    if not isinstance(design_data, dict):
        return set()
    keywords = set()
    if module_name and isinstance(module_name, str):
        keywords.add(module_name)
    explicit = design_data.get('businessKeywords') or []
    for kw in explicit:
        if isinstance(kw, str) and kw.strip():
            keywords.add(kw.strip())
    # 从章节标题中提取2~6字的中文名词短语
    for ch in design_data.get('chapters', []) or []:
        title = ch.get('title', '')
        if title:
            keywords.add(title)
        for sec in ch.get('sections', []) or []:
            t = sec.get('title', '')
            if t:
                keywords.add(t)
    return {k for k in keywords if k}


def _ensure_design_constraint_placeholder(doc, placeholder='不涉及'):
    """在"设计约束"标题下若内容被清空，插入占位段落

    与 remove_design_constraint_irrelevant 配套使用：
    若业务相关性判定后整段被删除导致章节为空，则补一段"不涉及"。
    """
    if doc is None:
        return False
    paragraphs = list(doc.paragraphs)
    target_idx = None
    for i, p in enumerate(paragraphs):
        if not p.style or not p.style.name.startswith('Heading'):
            continue
        text = (p.text or '').strip()
        if text == '设计约束' or (text and '设计约束' in text and len(text) <= 10):
            target_idx = i
            break
    if target_idx is None:
        return False
    # 找到下一个标题
    next_idx = None
    for j in range(target_idx + 1, len(paragraphs)):
        if paragraphs[j].style and paragraphs[j].style.name.startswith('Heading'):
            next_idx = j
            break
    end_idx = next_idx if next_idx is not None else len(paragraphs)
    # 检查区间是否已有非空内容
    for j in range(target_idx + 1, end_idx):
        t = (paragraphs[j].text or '').strip()
        if t:
            return False
    # 区间为空 → 插入占位段落
    target_p = paragraphs[target_idx]
    parent = target_p._element.getparent()
    if parent is None:
        return False
    new_p = OxmlElement('w:p')
    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '000000')
    rPr.append(color)
    r.append(rPr)
    t_elem = OxmlElement('w:t')
    t_elem.set(qn('xml:space'), 'preserve')
    t_elem.text = placeholder
    r.append(t_elem)
    new_p.append(r)
    target_p._element.addnext(new_p)
    return True


def _ensure_error_code_section(doc, design_data):
    """确保错误码章节有内容：无则插入"不涉及"+ 示例错误码表"""
    if doc is None:
        return
    paragraphs = list(doc.paragraphs)
    target_idx = None
    for i, p in enumerate(paragraphs):
        if not p.style or not p.style.name.startswith('Heading'):
            continue
        text = (p.text or '').strip()
        # 兼容 "1.5 错误码"、"错误码定义"、"错误码" 等多种写法
        if text == '错误码' or '错误码定义' in text or text.endswith('错误码') or text.endswith('错误码定义'):
            target_idx = i
            break
    if target_idx is None:
        return
    # 找到下一个标题索引
    next_idx = None
    for j in range(target_idx + 1, len(paragraphs)):
        if paragraphs[j].style and paragraphs[j].style.name.startswith('Heading'):
            next_idx = j
            break
    end_idx = next_idx if next_idx is not None else len(paragraphs)
    # 检查区间内是否已有内容
    has_content = False
    for j in range(target_idx + 1, end_idx):
        t = (paragraphs[j].text or '').strip()
        if t:
            has_content = True
            break
    if has_content:
        return
    # 取 JSON 错误码定义
    error_codes = design_data.get('errorCodes') if isinstance(design_data, dict) else None
    if not error_codes:
        error_codes = [{'code': c, 'desc': d} for c, d in DEFAULT_ERROR_CODES]
    # 插入占位说明 + 表格
    target_p = paragraphs[target_idx]
    parent = target_p._element.getparent()
    if parent is None:
        return
    # 占位段落
    note = OxmlElement('w:p')
    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '000000')
    rPr.append(color)
    r.append(rPr)
    t = OxmlElement('w:t')
    t.set(qn('xml:space'), 'preserve')
    t.text = '本系统统一错误码定义如下：'
    r.append(t)
    note.append(r)
    target_p._element.addnext(note)
    # 错误码表
    headers = ['错误码', '说明']
    rows = [[ec.get('code', ''), ec.get('desc', '')] for ec in error_codes]
    from docx.text.paragraph import Paragraph as _P
    _add_table_after_paragraph(_P(note, doc), headers, rows)


def _ensure_toc_field(doc, levels='1-3'):
    """确保文档包含 TOC 域（含 H1-H3 全部层级）

    1. 检查是否已有 TOC 域（fldChar + instrText）
    2. 如有"目录"标题但无 TOC 域，在标题下插入动态 TOC 域
    3. 如无"目录"标题但也无 TOC 域，则在正文开头插入动态 TOC 域
       （2026-06-04 优化：使用 force_insert_toc 主动补全，不依赖模板"目录"标题）
    4. 2026-06-04 新增：levels 参数控制目录层级范围，默认 '1-3' 表示包含 H1/H2/H3
    """
    if doc is None:
        return False
    if has_toc_field(doc):
        return False
    # 优先查找"目录"标题
    target_para = None
    for p in doc.paragraphs:
        if not p.style or not p.style.name.startswith('Heading'):
            continue
        text = (p.text or '').strip()
        # 兼容"目录"/"目  录"/"目 录"等多种写法（空格由 _normalize_toc_heading 统一去除）
        if text == '目录' or text == '目  录' or text == '目 录':
            target_para = p
            break
    if target_para is not None:
        insert_toc_field_after(target_para)
        return True
    # 无"目录"标题时强制在正文开头插入 TOC 域
    return force_insert_toc(doc, after_paragraph=None, levels=levels)


def _format_ui_paragraphs(doc, max_chars=40):
    """遍历所有段落，对含"界面设计"标识的段落做软换行（每行不超过 max_chars 字符）"""
    if doc is None:
        return 0
    count = 0
    for p in doc.paragraphs:
        text = (p.text or '').strip()
        if not text:
            continue
        # 启发式匹配：段落含"界面"、"菜单"、"查询条件"、"按钮"等关键词时格式化
        if any(kw in text for kw in ['界面设计', '界面布局', '菜单位置', '查询条件', '按钮', '界面原型']):
            if len(text) > max_chars:
                format_ui_paragraph(p, max_chars=max_chars)
                count += 1
    return count
# 兼容旧引用：保留 _inject_update_fields 作为占位（实际已迁移到 doc_formatter）
def _inject_update_fields(output_path):
    """兼容旧引用：委托给 doc_formatter.inject_update_fields"""
    inject_update_fields(output_path)


# ═══════════════════════════════════════════════════════════════
# 2026-06-04 新增：详细设计文档质量优化函数
# ═══════════════════════════════════════════════════════════════

def _normalize_toc_heading(doc):
    """统一目录标题：去除全角/半角空格，保留"目录"作为标准标题

    模板中可能存在"目  录"/"目 录"/"目　录"等含空格的写法，
    去除后便于 _ensure_toc_field 命中匹配。
    """
    if doc is None:
        return False
    normalized = False
    for p in doc.paragraphs:
        if not p.style or not p.style.name.startswith('Heading'):
            continue
        text = (p.text or '').strip()
        # 去除内部所有空白（含全角空格 U+3000、半角空格 U+0020）
        compact = re.sub(r'[\s\u3000]+', '', text)
        if compact == '目录' and text != '目录':
            write_paragraph(p, '目录')
            normalized = True
    return normalized


def _has_meaningful_content(chapter_data):
    """判断章节数据是否包含可填充的实质内容"""
    if not isinstance(chapter_data, dict):
        return False
    sections = chapter_data.get('sections') or []
    if sections:
        return True
    body_texts = chapter_data.get('bodyTexts') or []
    if any(t for t in body_texts if t):
        return True
    tables = chapter_data.get('tables') or []
    if tables:
        return True
    content = chapter_data.get('content')
    if isinstance(content, str) and content.strip():
        return True
    if isinstance(content, dict):
        if content.get('description') or (content.get('headers') and content.get('rows')):
            return True
    return False


def _insert_placeholder_after(paragraph, placeholder='不涉及'):
    """在指定段落后插入占位段落（用于空章节兜底）"""
    if paragraph is None:
        return None
    new_p = _insert_paragraph_after(paragraph, placeholder)
    set_black(new_p)
    return new_p


def _find_overview_chapter_data(chapters, chapter_map):
    """从 JSON 章节列表中查找"概述"相关章节数据

    优先级：
    1. chapter.title 命中 CHAPTER_KEYWORDS_OVERVIEW
    2. chapter.sections 中含概述关键词
    """
    for ch in chapters or []:
        title = (ch.get('title') or '').strip()
        if title in CHAPTER_KEYWORDS_OVERVIEW:
            return ch
    # 次优：section 标题命中
    for ch in chapters or []:
        for sec in ch.get('sections', []) or []:
            sec_title = (sec.get('title') or '').strip()
            if sec_title in CHAPTER_KEYWORDS_OVERVIEW:
                return ch
    return None


def _remove_empty_table_between_headings(doc, start_keyword, end_keyword=None, placeholder='不涉及'):
    """在指定章节范围内删除空表格，并插入占位段落

    2026-06-04 新增：用于解决"组件结构图"/"系统组件"/"模块复用分析"等章节下空表格问题

    参数：
    - doc: docx Document 对象
    - start_keyword: 起始标题关键词（如"组件结构图"）
    - end_keyword: 结束标题关键词（None 表示到下一标题/文档末尾）
    - placeholder: 空表格删除后的占位文本

    返回：删除的表格数量
    """
    if doc is None or not start_keyword:
        return 0
    body = doc.element.body
    # 找到 start 与 end 之间的所有 w:tbl
    start_elem = None
    end_elem = None
    for child in list(body):
        if not child.tag.endswith('}p'):
            continue
        text_elems = child.findall('.//' + qn('w:t'))
        text = ''.join(t.text or '' for t in text_elems).strip()
        text_compact = re.sub(r'\s+', '', text)
        if start_elem is None and start_keyword in text_compact:
            start_elem = child
            continue
        if start_elem is not None and end_keyword and end_keyword in text_compact:
            end_elem = child
            break
    if start_elem is None:
        return 0
    # 收集区间内的所有 w:tbl
    in_range = False
    tables_to_check = []
    for child in list(body):
        if child is start_elem:
            in_range = True
            continue
        if end_elem is not None and child is end_elem:
            break
        if not in_range:
            continue
        if child.tag.endswith('}tbl'):
            tables_to_check.append(child)
    if not tables_to_check:
        return 0
    removed = 0
    inserted_placeholder = False
    for tbl in tables_to_check:
        # 判断表格是否为空（只有表头行，或所有单元格都为空）
        rows = tbl.findall('.//' + qn('w:tr'))
        if not rows or _is_table_empty(rows):
            # 找到一个安全位置插入占位段落：表格前的兄弟位置
            if not inserted_placeholder:
                # 在表格前插入一个占位段落
                new_p = OxmlElement('w:p')
                r = OxmlElement('w:r')
                rPr = OxmlElement('w:rPr')
                color = OxmlElement('w:color')
                color.set(qn('w:val'), '000000')
                rPr.append(color)
                r.append(rPr)
                t_elem = OxmlElement('w:t')
                t_elem.set(qn('xml:space'), 'preserve')
                t_elem.text = placeholder
                r.append(t_elem)
                new_p.append(r)
                tbl.addprevious(new_p)
                inserted_placeholder = True
            # 删除空表格
            tbl.getparent().remove(tbl)
            removed += 1
    if DEBUG_LAYOUT:
        print(f'[DEBUG] _remove_empty_table_between_headings "{start_keyword}": removed {removed} tables', file=sys.stderr)
    return removed


def _is_table_empty(rows):
    """判断表格行集合是否内容为空（只有 1 行或所有单元格都空白）"""
    if not rows or len(rows) <= 1:
        return True
    for row in rows:
        cells = row.findall('.//' + qn('w:tc'))
        for cell in cells:
            t_elems = cell.findall('.//' + qn('w:t'))
            cell_text = ''.join(t.text or '' for t in t_elems).strip()
            if cell_text:
                return False
    return True


def _renumber_component_subheadings(doc):
    """对"系统组件"标题下以"组件"开头的子标题按 H1/H2 顺序重新编号

    2026-06-04 新增：将"组件"/"组件1"/"组件N"等不同前缀的子标题统一为"组件1/组件2/..."

    返回：被重命名的子标题数量
    """
    if doc is None:
        return 0
    body = doc.element.body
    # 找到"系统组件"标题
    target_start = None
    target_style = None
    children = list(body)
    for child in children:
        if not child.tag.endswith('}p'):
            continue
        text_elems = child.findall('.//' + qn('w:t'))
        text = ''.join(t.text or '' for t in text_elems).strip()
        text_compact = re.sub(r'\s+', '', text)
        if text_compact == '系统组件':
            pPr = child.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
            target_style = pPr.get(qn('w:val'), '') if pPr is not None else ''
            target_start = child
            break
    if target_start is None:
        return 0
    # 确定标题的 H 级别（1/2/3）
    try:
        h_level = int(target_style)
    except (TypeError, ValueError):
        h_level = 1
    # 找到同一级别的下一个标题，作为章节边界
    sub_level_vals = {
        str(h_level + 1),
        f'Heading{h_level + 1}',
        f'heading{h_level + 1}',
        f'heading {h_level + 1}',
    }  # 子组件的样式应低一级
    boundary = None
    found = False
    for child in children:
        if child is target_start:
            found = True
            continue
        if not found:
            continue
        if not child.tag.endswith('}p'):
            continue
        pPr = child.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
        style_val = pPr.get(qn('w:val'), '') if pPr is not None else ''
        # 遇到同级或更高级标题 → 章节结束
        try:
            if pPr is not None and int(pPr.get(qn('w:val'), '0')) <= h_level:
                boundary = child
                break
        except (TypeError, ValueError):
            pass
    # 收集所有"组件"开头的子标题
    in_range = False
    found_start = False
    component_paras = []
    for child in children:
        if child is target_start:
            in_range = True
            continue
        if boundary is not None and child is boundary:
            break
        if not in_range:
            continue
        if not child.tag.endswith('}p'):
            continue
        pPr = child.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
        style_val = pPr.get(qn('w:val'), '') if pPr is not None else ''
        if style_val in sub_level_vals:
            t_elems = child.findall('.//' + qn('w:t'))
            text = ''.join(t.text or '' for t in t_elems).strip()
            # 匹配"组件"开头的标题（包括"组件1"、"组件:"等）
            if text.startswith('组件'):
                component_paras.append(child)
    # 按出现顺序重新编号
    renamed = 0
    for idx, para in enumerate(component_paras, start=1):
        _set_paragraph_text(para, f'组件{idx}')
        renamed += 1
    if DEBUG_LAYOUT:
        print(f'[DEBUG] _renumber_component_subheadings: renamed {renamed} component headings', file=sys.stderr)
    return renamed


def _set_paragraph_text(paragraph_elem, new_text):
    """将段落的文本内容替换为 new_text（保留首个 run 的样式，删除多余 run）"""
    if paragraph_elem is None:
        return
    runs = paragraph_elem.findall(qn('w:r'))
    if not runs:
        # 段落无 run，新建
        r = OxmlElement('w:r')
        t = OxmlElement('w:t')
        t.set(qn('xml:space'), 'preserve')
        t.text = new_text
        r.append(t)
        paragraph_elem.append(r)
        return
    # 清空除第一个 run 之外的所有 run 内容
    for r in runs[1:]:
        paragraph_elem.remove(r)
    # 设置第一个 run 文本
    first = runs[0]
    t_elems = first.findall(qn('w:t'))
    for t in t_elems[1:]:
        first.remove(t)
    if t_elems:
        t_elems[0].text = new_text
        t_elems[0].set(qn('xml:space'), 'preserve')
    else:
        t = OxmlElement('w:t')
        t.set(qn('xml:space'), 'preserve')
        t.text = new_text
        first.append(t)


def _build_component_specific_tech(doc, design_data):
    """为每个组件的"关键技术"章节按 component_name 动态生成内容

    2026-06-04 新增：避免使用通用模板导致所有组件"关键技术"内容一致

    数据来源：
    - design_data.requirementModuleName（业务子模块名）
    - design_data.componentTechMap（组件名→技术要点列表，优先）
    - 业务子模块的 subsections / sections 列表（fallback）

    若以上均无，使用业务子模块名构造"实现 X 子模块所需的关键技术"作为兜底。
    """
    if doc is None:
        return 0
    module_name = design_data.get('moduleName', '')
    req_module = design_data.get('requirementModuleName', module_name)
    tech_map = design_data.get('componentTechMap') or {}
    business_submodules = design_data.get('businessSubmodules') or []
    body = doc.element.body
    children = list(body)
    # 找到所有"组件N"开头的标题及其紧接的"关键技术"标题
    component_paras = []
    for child in children:
        if not child.tag.endswith('}p'):
            continue
        t_elems = child.findall('.//' + qn('w:t'))
        text = ''.join(t.text or '' for t in t_elems).strip()
        if re.match(r'^组件\d+$', text):
            component_paras.append((child, text))
    if not component_paras:
        return 0
    rewritten = 0
    for comp_para, comp_name in component_paras:
        # 找到该组件范围内的"关键技术"标题
        tech_para = _find_next_heading_in_range(body, comp_para, '关键技术',
                                                stop_headings={'组件', '关键', None})
        if tech_para is None:
            continue
        # 找到"关键技术"标题下的第一个非标题段落，作为待替换目标
        target_p = _find_first_para_after(tech_para)
        if target_p is None:
            continue
        # 按 component_name 查找对应的技术要点
        tech_items = _resolve_component_tech(comp_name, tech_map, business_submodules, req_module)
        if not tech_items:
            continue
        new_text = '；'.join(tech_items)
        _set_paragraph_text(target_p._element, new_text)
        rewritten += 1
    if DEBUG_LAYOUT:
        print(f'[DEBUG] _build_component_specific_tech: rewrote {rewritten} tech sections', file=sys.stderr)
    return rewritten


def _find_next_heading_in_range(body, start_para, heading_keyword, stop_headings=None):
    """在 start_para 之后查找第一个标题文本包含 heading_keyword 的段落

    stop_headings: 遇到标题文本以这些前缀开头则停止搜索（边界标题）
    返回 python-docx Paragraph 对象或 None
    """
    from docx.text.paragraph import Paragraph
    if body is None or start_para is None:
        return None
    found = False
    for child in list(body):
        if child is start_para:
            found = True
            continue
        if not found:
            continue
        if not child.tag.endswith('}p'):
            continue
        pPr = child.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
        style_val = pPr.get(qn('w:val'), '') if pPr is not None else ''
        # 仅匹配 H 样式
        is_heading_style = style_val in {
            '1', '2', '3', '4', '5', '6',
            'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6',
        }
        if not is_heading_style:
            continue
        t_elems = child.findall('.//' + qn('w:t'))
        text = ''.join(t.text or '' for t in t_elems).strip()
        if heading_keyword in text:
            return Paragraph(child, start_para.getparent())
        # 边界标题（如新组件开头"组件N"）
        if stop_headings:
            for stop in stop_headings:
                if stop and text.startswith(stop):
                    return None
    return None


def _find_first_para_after(heading_para):
    """查找 heading_para 之后的第一个非标题段落"""
    from docx.text.paragraph import Paragraph
    if heading_para is None:
        return None
    parent = heading_para._element.getparent()
    if parent is None:
        return None
    found = False
    for elem in list(parent):
        if elem is heading_para._element:
            found = True
            continue
        if not found:
            continue
        if not elem.tag.endswith('}p'):
            continue
        pPr = elem.find('.//' + qn('w:pPr') + '/' + qn('w:pStyle'))
        style_val = pPr.get(qn('w:val'), '') if pPr is not None else ''
        if style_val.startswith('Heading') or style_val in {
            '1', '2', '3', '4', '5', '6',
            'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6',
        }:
            return None
        return Paragraph(elem, parent)
    return None


def _resolve_component_tech(comp_name, tech_map, business_submodules, req_module):
    """根据组件名解析对应的关键技术要点列表

    解析优先级：
    1. tech_map[comp_name]（最精确）
    2. tech_map 中含 comp_name 数字序号的键（如"组件1"对应的 keys）
    3. business_submodules 中按索引匹配（comp_name='组件N' 取第 N-1 个）
    4. 使用 req_module + comp_name 构造通用兜底文案
    """
    # 1. 直接匹配
    if isinstance(tech_map, dict) and comp_name in tech_map:
        items = tech_map[comp_name]
        if isinstance(items, list) and items:
            return [str(x) for x in items if x]
    # 2. 序号推断（"组件1" → 第 1 个）
    m = re.match(r'^组件(\d+)$', comp_name)
    if m:
        idx = int(m.group(1)) - 1
        # 尝试在 business_submodules 中按索引取
        if isinstance(business_submodules, list) and 0 <= idx < len(business_submodules):
            sub = business_submodules[idx]
            if isinstance(sub, dict):
                techs = sub.get('keyTechnologies') or sub.get('techList') or []
                if isinstance(techs, list) and techs:
                    return [str(x) for x in techs if x]
                sub_name = sub.get('name') or sub.get('title') or ''
                if sub_name:
                    return _default_tech_for_submodule(sub_name, req_module)
            elif isinstance(sub, str) and sub:
                return _default_tech_for_submodule(sub, req_module)
    # 3. 兜底
    return _default_tech_for_submodule(comp_name, req_module)


def _default_tech_for_submodule(sub_name, req_module):
    """为指定子模块名生成通用关键技术描述（不硬编码具体业务）"""
    suffix = f'{req_module}的{sub_name}子模块' if sub_name else req_module
    return [
        f'{suffix}的业务流程建模与状态机设计',
        f'{suffix}涉及的数据表结构与索引设计',
        f'{suffix}的接口契约（入参/出参/错误码）定义',
        f'{suffix}的事务边界与并发控制策略',
    ]


def _fill_appendix(doc, heading_para, design_data, chapters):
    """填充附录章节：汇总各章节的关键信息作为附录内容

    2026-06-05 新增：解决详细设计文档"附录"章节为空的问题。
    从 design_data 和 chapters 中提取关键接口、数据表、错误码等汇总信息。

    2026-06-05 修复：附录内容过短（仅61字），增加栏位描述汇总、模块功能清单、
    业务规则等附录子节，从 chapters 中提取更丰富的数据。
    """
    module_name = design_data.get('moduleName', '本项目')
    insert_after = heading_para

    # 1. 附录A：接口清单
    sub_heading = _insert_paragraph_after(insert_after, '附录A：接口清单', style='Heading2')
    set_black(sub_heading)
    insert_after = sub_heading

    # 收集所有接口数据（复用 _extract_interface_items 逻辑，多关键字匹配）
    interface_rows = []
    interface_keywords = ('接口', 'API', '方法', 'URL', '请求', '服务')
    for ch in chapters:
        for sec in ch.get('sections', []):
            content = sec.get('content', {})
            if isinstance(content, dict):
                headers = content.get('headers', [])
                rows = content.get('rows', [])
                # 检测是否为接口相关表格（使用更宽松的关键字匹配）
                if headers and any(
                    any(kw in str(h) for kw in interface_keywords)
                    for h in headers
                ):
                    for row in rows:
                        interface_rows.append([str(c) for c in row])

    if interface_rows:
        headers = interface_rows[0] if len(interface_rows[0]) >= 2 else ['接口名称', '说明']
        data_rows = interface_rows[1:] if len(interface_rows) > 1 else []
        if len(headers) < 2:
            headers = ['接口名称', '说明']
        _add_table_after_paragraph(insert_after, headers, data_rows if data_rows else [['待补充', '']])
    else:
        new_p = _insert_paragraph_after(insert_after, f'{module_name}的接口清单详见各模块设计说明中的接口章节。')
        set_black(new_p)
        insert_after = new_p

    # 2. 附录B：数据表清单
    sub_heading2 = _insert_paragraph_after(insert_after, '附录B：数据表清单', style='Heading2')
    set_black(sub_heading2)
    insert_after = sub_heading2

    db_tables = design_data.get('dbTables') or []
    if db_tables:
        table_headers = ['表名', '说明']
        table_rows = [[t.get('name', ''), t.get('description', '')] for t in db_tables if isinstance(t, dict)]
        if table_rows:
            _add_table_after_paragraph(insert_after, table_headers, table_rows)
        else:
            new_p = _insert_paragraph_after(insert_after, '数据表清单详见数据库设计文档。')
            set_black(new_p)
            insert_after = new_p
    else:
        new_p = _insert_paragraph_after(insert_after, '数据表清单详见数据库设计文档。')
        set_black(new_p)
        insert_after = new_p

    # 3. 附录C：错误码清单
    sub_heading3 = _insert_paragraph_after(insert_after, '附录C：错误码清单', style='Heading2')
    set_black(sub_heading3)
    insert_after = sub_heading3

    error_codes = design_data.get('errorCodes') or []
    if error_codes:
        err_headers = ['错误码', '说明']
        err_rows = [[ec.get('code', ''), ec.get('desc', '')] for ec in error_codes]
        _add_table_after_paragraph(insert_after, err_headers, err_rows)
    else:
        new_p = _insert_paragraph_after(insert_after, '本系统统一错误码定义详见各模块设计说明。')
        set_black(new_p)
        insert_after = new_p

    # 4. 附录D：栏位描述汇总（2026-06-05 新增）
    sub_heading4 = _insert_paragraph_after(insert_after, '附录D：栏位描述汇总', style='Heading2')
    set_black(sub_heading4)
    insert_after = sub_heading4

    # 从 chapters 中收集所有栏位描述表格（含"字段"/"栏位"/"输入"/"输出"关键字的表格）
    field_tables = []
    field_keywords = ('字段', '栏位', '输入', '输出', '参数', '属性')
    for ch in chapters:
        for sec in ch.get('sections', []):
            content = sec.get('content', {})
            if isinstance(content, dict):
                headers = content.get('headers', [])
                rows = content.get('rows', [])
                if headers and any(
                    any(kw in str(h) for kw in field_keywords)
                    for h in headers
                ):
                    field_tables.append((sec.get('title', '未命名'), headers, rows))

    if field_tables:
        for tbl_title, tbl_headers, tbl_rows in field_tables:
            # 为每个栏位描述表添加子标题
            tbl_sub = _insert_paragraph_after(insert_after, tbl_title, style='Heading3')
            set_black(tbl_sub)
            insert_after = tbl_sub
            _add_table_after_paragraph(insert_after, tbl_headers, tbl_rows)
    else:
        new_p = _insert_paragraph_after(insert_after, '栏位描述详见各模块设计说明中的输入项/输出项章节。')
        set_black(new_p)
        insert_after = new_p

    # 5. 附录E：模块功能清单（2026-06-05 新增）
    sub_heading5 = _insert_paragraph_after(insert_after, '附录E：模块功能清单', style='Heading2')
    set_black(sub_heading5)
    insert_after = sub_heading5

    # 收集所有章节的标题和功能描述
    module_items = []
    for ch in chapters:
        ch_title = ch.get('title', '')
        ch_desc = ch.get('description', '')
        if ch_title:
            module_items.append([ch_title, ch_desc if ch_desc else '--'])
        for sec in ch.get('sections', []):
            sec_title = sec.get('title', '')
            sec_content = sec.get('content', '')
            if sec_title:
                sec_desc = ''
                if isinstance(sec_content, dict):
                    sec_desc = sec_content.get('description', '')
                elif isinstance(sec_content, str):
                    sec_desc = sec_content[:100]  # 截取前100字符作为摘要
                module_items.append([sec_title, sec_desc if sec_desc else '--'])

    if module_items:
        _add_table_after_paragraph(insert_after, ['功能模块', '说明'], module_items)
    else:
        new_p = _insert_paragraph_after(insert_after, '功能模块清单详见各模块设计说明。')
        set_black(new_p)
        insert_after = new_p

    # 6. 附录F：术语与缩略语（2026-06-05 新增）
    sub_heading6 = _insert_paragraph_after(insert_after, '附录F：术语与缩略语', style='Heading2')
    set_black(sub_heading6)
    insert_after = sub_heading6

    glossary = design_data.get('glossary') or []
    if glossary:
        gloss_headers = ['术语', '说明']
        gloss_rows = [[g.get('term', ''), g.get('definition', '')] for g in glossary if isinstance(g, dict)]
        if gloss_rows:
            _add_table_after_paragraph(insert_after, gloss_headers, gloss_rows)
        else:
            new_p = _insert_paragraph_after(insert_after, '术语与缩略语详见术语定义章节。')
            set_black(new_p)
    else:
        new_p = _insert_paragraph_after(insert_after, '术语与缩略语详见术语定义章节。')
        set_black(new_p)


if __name__ == '__main__':
    # Windows 控制台默认 GBK，强制 UTF-8 输出避免编码错误
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if len(sys.argv) < 4:
        print('Usage: python design-generator.py <template.docx> <design_data.json> <output.docx> [diagram_dir]', file=sys.stderr)
        sys.exit(1)
    diagram_dir = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
    result = generate_design_from_template(sys.argv[1], sys.argv[2], sys.argv[3], diagram_dir)
    print(json.dumps({'success': True, 'outputPath': result}, ensure_ascii=False))
