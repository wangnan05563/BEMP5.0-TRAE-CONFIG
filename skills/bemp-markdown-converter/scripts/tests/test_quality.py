#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_quality 单元测试
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from check_quality import _scan_content, _evaluate_rules


def test_scan_headings():
    content = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6"
    stats = _scan_content(content)
    assert stats["h1_count"] == 1
    assert stats["h2_count"] == 1
    assert stats["h3_count"] == 1
    assert stats["h4_count"] == 1
    assert stats["h5_count"] == 1
    assert stats["h6_count"] == 1


def test_scan_tables():
    content = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
    stats = _scan_content(content)
    assert stats["table_count"] >= 1


def test_scan_images_links():
    content = "![img](a.png) [link](b.html)"
    stats = _scan_content(content)
    assert stats["image_count"] == 1
    assert stats["link_count"] == 1


def test_scan_code_blocks():
    content = "```python\nprint('hi')\n```"
    stats = _scan_content(content)
    assert stats["code_block_count"] == 1


def test_scan_skip_code_block_headings():
    content = "```\n# not a heading\n```"
    stats = _scan_content(content)
    assert stats["h1_count"] == 0


def test_evaluate_missing_h1():
    stats = {"h1_count": 0, "total_chars": 5000, "table_count": 1, "image_count": 1}
    rules = [
        {"id": "missing_h1", "check": "h1_count == 0", "deduction": 20, "level": "error", "message": "缺失一级标题"}
    ]
    score, issues = _evaluate_rules(stats, rules)
    assert score == 80
    assert len(issues) == 1


def test_evaluate_all_pass():
    stats = {"h1_count": 2, "total_chars": 5000, "table_count": 3, "image_count": 2}
    rules = [
        {"id": "missing_h1", "check": "h1_count == 0", "deduction": 20, "level": "error", "message": "缺失一级标题"},
        {"id": "content_short", "check": "total_chars < 1000", "deduction": 10, "level": "warning", "message": "内容过短"},
    ]
    score, issues = _evaluate_rules(stats, rules)
    assert score == 100
    assert len(issues) == 0


def test_empty_content():
    stats = _scan_content("")
    assert stats["total_chars"] == 0
    assert stats["h1_count"] == 0


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            print(f"✅ {t.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"❌ {t.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"💥 {t.__name__}: {e}")
            failed += 1

    print(f"\n结果: {passed} 通过, {failed} 失败")
    sys.exit(0 if failed == 0 else 1)
