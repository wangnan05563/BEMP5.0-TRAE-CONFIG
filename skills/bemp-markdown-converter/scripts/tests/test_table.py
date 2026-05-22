#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
clean_duplicate_numbers 单元测试
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from clean_duplicate_numbers import clean_duplicate_numbers


def test_simple_duplicate():
    content = "## 2.1 2.1 标题"
    result = clean_duplicate_numbers(content)
    assert "## 2.1 标题" in result
    assert result.count("2.1") == 1


def test_triple_duplicate():
    content = "## 2.1 2.1 2.1 标题"
    result = clean_duplicate_numbers(content)
    assert "## 2.1 标题" in result


def test_no_duplicate():
    content = "## 2.1 标题"
    result = clean_duplicate_numbers(content)
    assert result == content


def test_non_heading_preserved():
    content = "Some text 2.1 2.1 here"
    result = clean_duplicate_numbers(content)
    assert result == content


def test_mixed_content():
    content = "# 1. 标题\n## 2.1 2.1 子标题\n普通文本"
    result = clean_duplicate_numbers(content)
    assert "# 1. 标题" in result
    assert "## 2.1 子标题" in result
    assert "普通文本" in result


def test_empty_content():
    result = clean_duplicate_numbers("")
    assert result == ""


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
