#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 Markdown 中界面设计表格的标题行缺失问题
当 markitdown 将 Word 中带背景色的标题单元格转换为普通行时，
自动识别并插入粗体标题行作为首行。
"""

import re
import sys
from pathlib import Path
from typing import List, Optional

sys.path.append(str(Path(__file__).resolve().parent))
from utils.file_io import safe_read, safe_write
from utils.logger import get_logger

logger = get_logger(__name__)

_UI_DESIGN_RE = re.compile(r'^\*?\s*界面设计\s*$')
# 匹配 Markdown 表格分隔线，支持多列（如 | --- | --- |）
_TABLE_SEP_RE = re.compile(r'^\|(\s*[\-:]+\s*\|)+$')
_TABLE_ROW_RE = re.compile(r'^\|.*\|$')


def _extract_table_title(lines: List[str], region_start: int) -> Optional[str]:
    """
    从界面设计表格之前的上下文提取界面名称。
    策略：向前查找最近的非空行，优先返回章节标题（如"查询"、"新增"、"删除确认"等）。
    如果最近的有效行是描述性文本（非章节标题），则继续向前查找章节标题。
    """
    # 定义有效的章节标题（界面名称）
    valid_titles = {
        '查询', '新增', '修改', '删除', '批复明细',
        '删除确认', '提交复核确认', '撤销复核确认',
        '新增额度批复明细', '修改额度批复明细'
    }
    # 描述性文本模式——这些不是界面名称
    description_patterns = [
        r'^.+客户额度申请信息$',  # "查询客户额度申请信息"
        r'^.+客户额度授信申请明细$',  # "新建客户额度授信申请明细"
        r'^.+授信信息$',  # "详细授信信息"
        r'^.+额度复核信息$',  # "查询额度复核信息"
        r'^痛【.+】功能；$',  # "痛【新增额度批复明细】功能；"
    ]

    for j in range(region_start - 1, -1, -1):
        line = lines[j].strip()
        if not line:
            continue
        # 跳过表格行和列表项行（但不是标题行）
        if line.startswith('|') or line.startswith('* '):
            continue
        # 跳过纯数字序号行
        if re.match(r'^\d+\.', line):
            continue
        # 跳过业务规则/栏位描述等标记
        if line in ('业务规则', '栏位描述'):
            continue
        # 处理 Markdown 标题行（如 ###### 查询）——提取标题文本
        if line.startswith('#'):
            title_text = re.sub(r'^#+\s*', '', line).strip()
            if title_text in valid_titles:
                return title_text
            # 标题文本不是有效标题，继续向前查找
            continue
        # 如果当前行是有效的章节标题，直接返回
        if line in valid_titles:
            return line
        # 如果当前行匹配描述性文本模式，跳过继续向前查找
        if any(re.match(pattern, line) for pattern in description_patterns):
            continue
        # 对于其他行，如果长度较短（<=10字符）且看起来像标题，也返回
        if len(line) <= 10 and not any(c in line for c in ['，', '。', '；', '：']):
            return line
        # 否则继续向前查找
        continue
    return None


def _has_bold_header_row(table_lines: List[str]) -> bool:
    """检查表格中是否已有粗体标题行（在分隔线之前的表头行）。"""
    for line in table_lines:
        if _TABLE_SEP_RE.match(line):
            break
        if _TABLE_ROW_RE.match(line) and '**' in line:
            return True
    return False


def _get_col_count(sep_line: str) -> int:
    """从分隔线计算列数。"""
    return sep_line.count('|') - 1


def _build_header_row(title: str, col_count: int) -> str:
    """构建粗体标题行，跨所有列。"""
    cells = [''] * col_count
    cells[0] = f'**{title}**'
    return '| ' + ' | '.join(cells) + ' |'


def fix_table_headers(content: str) -> str:
    lines = content.split('\n')
    result_lines: List[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # 检查是否是 * 界面设计 行
        if not _UI_DESIGN_RE.match(line):
            result_lines.append(line)
            i += 1
            continue

        # 找到当前界面设计区块的所有行
        ui_start = i
        ui_lines: List[str] = [line]
        i += 1
        while i < len(lines) and (_TABLE_ROW_RE.match(lines[i]) or _TABLE_SEP_RE.match(lines[i]) or lines[i].strip() == ''):
            ui_lines.append(lines[i])
            i += 1

        # 检查是否已有粗体标题行
        if _has_bold_header_row(ui_lines):
            result_lines.extend(ui_lines)
            continue

        # 提取界面名称（使用原始 lines 数组和 ui_start）
        title = _extract_table_title(lines, ui_start)
        if not title:
            result_lines.extend(ui_lines)
            continue

        # 找到分隔线位置
        sep_idx = None
        for offset, ui_line in enumerate(ui_lines):
            if _TABLE_SEP_RE.match(ui_line):
                sep_idx = offset
                break

        if sep_idx is None:
            result_lines.extend(ui_lines)
            continue

        col_count = _get_col_count(ui_lines[sep_idx])
        header_row = _build_header_row(title, col_count)

        # 将标题行插入到分隔线之前
        for offset, ui_line in enumerate(ui_lines):
            if offset == sep_idx:
                result_lines.append(header_row)
            result_lines.append(ui_line)

        logger.info("插入标题行 [%s] 到界面设计表格", title)

    return '\n'.join(result_lines)


def fix_table_headers_in_file(file_path: str, dry_run: bool = False) -> None:
    try:
        content = safe_read(file_path)
        new_content = fix_table_headers(content)
        safe_write(file_path, new_content, dry_run=dry_run)
        logger.info("表格标题行修复完成: %s", file_path)
    except Exception as e:
        logger.error("表格标题行修复失败: %s - %s", file_path, e)
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python fix_table_headers.py <input_file> [--dry-run]")
        sys.exit(1)

    _dry_run = '--dry-run' in sys.argv
    fix_table_headers_in_file(sys.argv[1], dry_run=_dry_run)
