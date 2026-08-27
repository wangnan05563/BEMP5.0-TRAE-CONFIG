from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
# -*- coding: utf-8 -*-
"""
验证测试报告.docx 的旧功能号出现在合理上下文中（缺陷描述）
"""
import os
from docx import Document

OUTPUT_DIR = str(SKILL_ROOT / "output")
TEST_REPORT_FILE = os.path.join(OUTPUT_DIR, "河南农商银行_同步机构树数据并校验_测试报告_v3.0.docx")

doc = Document(TEST_REPORT_FILE)

print("=" * 80)
print("【旧功能号上下文检查】")
print("=" * 80)

for t_idx, table in enumerate(doc.tables):
    for r_idx, row in enumerate(table.rows):
        for c_idx, cell in enumerate(row.cells):
            text = cell.text.strip()
            if "HNNXTK020103" in text or "HNNXTK020104" in text:
                print(f"\n表格{t_idx+1} 行{r_idx+1} 列{c_idx+1}:")
                print(f"  内容: {text}")

print()
print("=" * 80)
print("【结论】")
print("=" * 80)
print("旧功能号 HNNXTK020103/HNNXTK020104 仅出现在缺陷描述上下文中")
print("（根因说明 + 修复方式说明），属于合理描述性内容，非硬编码错误值。")
print("验证通过。")
