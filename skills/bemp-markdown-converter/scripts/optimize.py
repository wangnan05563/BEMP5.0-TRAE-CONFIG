#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown 文档后处理优化工具
整合所有优化功能，提供一键式文档优化
"""

import sys
import os
from pathlib import Path

# 添加当前目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fix_heading_numbers import fix_heading_numbers
from clean_duplicate_numbers import clean_duplicate_numbers
from fix_invoice_table import fix_invoice_tables
from check_quality import check_markdown_quality

def optimize_markdown_file(input_file, output_file=None, optimize_all=True):
    """
    优化 Markdown 文件
    
    Args:
        input_file: 输入文件路径
        output_file: 输出文件路径（默认覆盖原文件）
        optimize_all: 是否执行所有优化步骤
    
    Returns:
        优化后的文件路径
    """
    if output_file is None:
        output_file = input_file
    
    print("=" * 60)
    print("🚀 Markdown 文档后处理优化")
    print("=" * 60)
    print(f"📄 输入文件：{input_file}")
    print(f"📝 输出文件：{output_file}")
    print("-" * 60)
    
    # 读取文件
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 执行优化步骤
    if optimize_all:
        print("\n📝 步骤 1: 清理重复序号...")
        content = clean_duplicate_numbers(content)
        print("✅ 重复序号清理完成")
        
        print("\n📝 步骤 2: 修复标题序号...")
        content = fix_heading_numbers(content)
        print("✅ 标题序号修复完成")
        
        print("\n📝 步骤 3: 修复发票相关表格...")
        content = fix_invoice_tables(content)
        print("✅ 发票相关表格格式修复完成")
    else:
        print("\nℹ️ 跳过自动优化，仅进行质量检查")
    
    # 保存优化后的文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n✅ 文档优化完成！")
    
    # 执行质量检查
    print("\n📊 执行质量检查...")
    success = check_markdown_quality(output_file)
    
    if success:
        print("\n🎉 优化流程完成，文档质量合格！")
    else:
        print("\n⚠️ 优化流程完成，但文档质量检查未通过，请手动检查。")
    
    return output_file

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Markdown 文档后处理优化工具')
    parser.add_argument('input_file', help='输入的 Markdown 文件路径')
    parser.add_argument('-o', '--output', help='输出的 Markdown 文件路径（默认覆盖原文件）')
    parser.add_argument('--skip-auto-optimize', action='store_true', help='跳过自动优化步骤，仅进行质量检查')
    
    args = parser.parse_args()
    
    # 检查输入文件是否存在
    if not Path(args.input_file).exists():
        print(f"❌ 错误：输入文件 {args.input_file} 不存在")
        sys.exit(1)
    
    # 执行优化
    output_file = args.output if args.output else args.input_file
    optimize_all = not args.skip_auto_optimize
    
    optimize_markdown_file(args.input_file, output_file, optimize_all)

if __name__ == "__main__":
    main()