#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown转换质量检查工具
用于检查转换后的Markdown文档的格式准确性、内容完整性
"""

import re
import sys
from pathlib import Path

def check_markdown_quality(md_path):
    """
    检查Markdown文档质量
    """
    if not Path(md_path).exists():
        print(f"❌ 错误：文件 {md_path} 不存在")
        return False
    
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 统计各项指标
    stats = {
        "总字符数": len(content),
        "一级标题数": len(re.findall(r'^# .+$', content, re.M)),
        "二级标题数": len(re.findall(r'^## .+$', content, re.M)),
        "三级标题数": len(re.findall(r'^### .+$', content, re.M)),
        "四级标题数": len(re.findall(r'^#### .+$', content, re.M)),
        "五级标题数": len(re.findall(r'^##### .+$', content, re.M)),
        "六级标题数": len(re.findall(r'^###### .+$', content, re.M)),
        "有序列表项数": len(re.findall(r'^\d+\. .+$', content, re.M)),
        "无序列表项数": len(re.findall(r'^[\*\-\+] .+$', content, re.M)),
        "表格数量": len(re.findall(r'^\|.*\|$', content, re.M)) // 3,  # 表头+分隔+数据
        "图片数量": len(re.findall(r'!\[.*?\]\(.*?\)', content)),
        "链接数量": len(re.findall(r'\[.*?\]\(.*?\)', content)) - len(re.findall(r'!\[.*?\]\(.*?\)', content)),
        "代码块数量": len(re.findall(r'```[\s\S]*?```', content)),
    }
    
    # 质量评估
    score = 100
    issues = []
    
    # 检查标题结构
    if stats["一级标题数"] == 0:
        score -= 20
        issues.append("❌ 缺失一级标题")
    elif stats["一级标题数"] > 5:
        score -= 5
        issues.append("⚠️ 一级标题数量过多，可能结构不合理")
    
    # 检查表格
    if stats["表格数量"] == 0:
        issues.append("ℹ️ 文档中没有表格")
    
    # 检查图片
    if stats["图片数量"] == 0:
        issues.append("ℹ️ 文档中没有图片")
    
    # 检查内容长度
    if stats["总字符数"] < 1000:
        score -= 10
        issues.append("⚠️ 文档内容过短，可能存在内容丢失")
    
    # 输出检查结果
    print("=" * 60)
    print("📊 Markdown转换质量检查报告")
    print("=" * 60)
    print(f"📄 检查文件：{md_path}")
    print("-" * 60)
    
    for k, v in stats.items():
        print(f"{k}: {v}")
    
    print("-" * 60)
    print(f"🎯 质量评分：{score}/100")
    
    if issues:
        print("\n🔍 检查发现：")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ 检查通过，没有发现问题！")
    
    print("=" * 60)
    return score >= 60

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("用法：python check_quality.py <Markdown文件路径>")
        sys.exit(1)
    
    md_path = sys.argv[1]
    success = check_markdown_quality(md_path)
    sys.exit(0 if success else 1)