#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown转换质量检查工具
配置驱动版 + 单次扫描优化
"""

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

sys.path.append(str(Path(__file__).resolve().parent))
from utils.file_io import safe_read
from utils.logger import get_logger

logger = get_logger(__name__)

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "quality_rules.json"

_LEVEL_ICONS = {"error": "❌", "warning": "⚠️", "info": "ℹ️"}


def _load_rules() -> Dict[str, Any]:
    if not _CONFIG_PATH.exists():
        logger.warning("质量规则配置不存在: %s", _CONFIG_PATH)
        return {"pass_score": 60, "rules": []}
    with open(_CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def _scan_content(content: str) -> Dict[str, int]:
    stats: Dict[str, int] = {"total_chars": len(content)}

    heading_counts = [0] * 6
    table_rows = 0
    images = 0
    links = 0
    ordered_list = 0
    unordered_list = 0
    code_blocks = 0

    in_code_block = False

    for line in content.split('\n'):
        if line.startswith('```'):
            in_code_block = not in_code_block
            if not in_code_block:
                code_blocks += 1
            continue

        if in_code_block:
            continue

        for i in range(6, 0, -1):
            prefix = '#' * i + ' '
            if line.startswith(prefix):
                heading_counts[i - 1] += 1
                break
        else:
            if re.match(r'^\|.*\|$', line):
                table_rows += 1
            elif re.match(r'^\d+\.\s+', line):
                ordered_list += 1
            elif re.match(r'^[\*\-\+]\s+', line):
                unordered_list += 1

    img_link_pattern = re.compile(r'(!?)\[(.*?)\]\((.*?)\)')

    in_code = False
    for line in content.split('\n'):
        if line.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            continue
        for m in img_link_pattern.finditer(line):
            if m.group(1) == '!':
                images += 1
            else:
                links += 1

    for i, count in enumerate(heading_counts):
        stats[f"h{i + 1}_count"] = count

    stats["table_count"] = max(table_rows // 3, 0) if table_rows > 0 else 0
    stats["image_count"] = images
    stats["link_count"] = links
    stats["ordered_list_count"] = ordered_list
    stats["unordered_list_count"] = unordered_list
    stats["code_block_count"] = code_blocks

    return stats


def _evaluate_rules(stats: Dict[str, int], rules: List[Dict[str, Any]]) -> Tuple[int, List[Dict[str, Any]]]:
    score = 100
    issues: List[Dict[str, Any]] = []

    for rule in rules:
        check_expr = rule.get("check", "")
        try:
            if eval(check_expr, {"__builtins__": {}}, stats):
                deduction = rule.get("deduction", 0)
                score -= deduction
                issues.append({
                    "level": rule.get("level", "info"),
                    "message": rule.get("message", ""),
                    "deduction": deduction,
                })
        except Exception:
            logger.debug("规则评估跳过: %s", rule.get("id"))

    return max(score, 0), issues


def check_markdown_quality(md_path: str) -> bool:
    try:
        content = safe_read(md_path)
    except Exception as e:
        logger.error("质量检查失败: %s - %s", md_path, e)
        return False

    config = _load_rules()
    stats = _scan_content(content)
    score, issues = _evaluate_rules(stats, config.get("rules", []))
    pass_score = config.get("pass_score", 60)

    print("=" * 60)
    print("📊 Markdown转换质量检查报告")
    print("=" * 60)
    print(f"📄 检查文件: {md_path}")
    print("-" * 60)

    for k, v in stats.items():
        print(f"  {k}: {v}")

    print("-" * 60)
    print(f"🎯 质量评分: {score}/100")

    if issues:
        print("\n🔍 检查发现:")
        for issue in issues:
            icon = _LEVEL_ICONS.get(issue["level"], "•")
            ded = f" (-{issue['deduction']})" if issue['deduction'] > 0 else ""
            print(f"  {icon} {issue['message']}{ded}")
    else:
        print("\n✅ 检查通过，没有发现问题！")

    print("=" * 60)
    return score >= pass_score


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python check_quality.py <Markdown文件路径>")
        sys.exit(1)

    success = check_markdown_quality(sys.argv[1])
    sys.exit(0 if success else 1)
