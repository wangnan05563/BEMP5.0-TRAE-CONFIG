#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_heading_numbers 单元测试
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fix_heading_numbers import fix_heading_numbers


def test_basic_numbering():
    content = "# Title\n## Sub\n### Detail"
    result = fix_heading_numbers(content)
    assert "# 1. Title" in result
    assert "## 1.1 Sub" in result
    assert "### 1.1.1 Detail" in result


def test_multi_h1():
    content = "# First\n## Sub1\n# Second\n## Sub2"
    result = fix_heading_numbers(content)
    assert "# 1. First" in result
    assert "## 1.1 Sub1" in result
    assert "# 2. Second" in result
    assert "## 2.1 Sub2" in result


def test_counter_reset():
    content = "# A\n## A1\n## A2\n# B\n## B1"
    result = fix_heading_numbers(content)
    assert "## 1.1 A1" in result
    assert "## 1.2 A2" in result
    assert "## 2.1 B1" in result


def test_remove_old_numbers():
    content = "# 3. Title\n## 2.1 Sub Title"
    result = fix_heading_numbers(content)
    assert "# 1. Title" in result
    assert "## 1.1 Sub Title" in result


def test_deep_heading():
    content = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6"
    result = fix_heading_numbers(content)
    assert "# 1. H1" in result
    assert "## 1.1 H2" in result
    assert "### 1.1.1 H3" in result
    assert "#### 1.1.1.1 H4" in result
    assert "##### 1.1.1.1.1 H5" in result
    assert "###### 1.1.1.1.1.1 H6" in result


def test_non_heading_preserved():
    content = "# Title\nSome text\n- list item\n```code```"
    result = fix_heading_numbers(content)
    assert "Some text" in result
    assert "- list item" in result
    assert "```code```" in result


def test_empty_content():
    result = fix_heading_numbers("")
    assert result == ""


def test_no_headings():
    content = "Just some text\nNo headings here"
    result = fix_heading_numbers(content)
    assert result == content


def test_offset_from_h3():
    """文档从三级标题开始，编号应从1开始而非0.0.1"""
    content = "### Title\n#### Sub\n##### Detail"
    result = fix_heading_numbers(content)
    assert "### 1. Title" in result
    assert "#### 1.1 Sub" in result
    assert "##### 1.1.1 Detail" in result


def test_offset_from_h2():
    """文档从二级标题开始"""
    content = "## Title\n### Sub\n#### Detail"
    result = fix_heading_numbers(content)
    assert "## 1. Title" in result
    assert "### 1.1 Sub" in result
    assert "#### 1.1.1 Detail" in result


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
