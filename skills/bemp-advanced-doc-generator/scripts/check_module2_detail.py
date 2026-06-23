"""检查模块2的详细结构"""
from docx import Document

doc_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化-详细设计文档-20260617.docx"
doc = Document(doc_path)

print("=" * 70)
print("模块2详细检查")
print("=" * 70)

in_module2 = False
module2_content = []

for i, para in enumerate(doc.paragraphs):
    text = para.text.strip()
    style_name = para.style.name if para.style else 'None'
    
    # 检测进入模块2
    if style_name == 'Heading 1' and '模块2' in text:
        in_module2 = True
        print(f"\n[{i}] 进入模块2: {text} (style={style_name})")
        continue
    
    # 检测离开模块2（遇到下一个H1）
    if in_module2 and style_name == 'Heading 1':
        print(f"[{i}] 离开模块2，遇到: {text}")
        break
    
    # 记录模块2下的内容
    if in_module2:
        module2_content.append({
            'index': i,
            'style': style_name,
            'text': text[:100] if text else '(空)'
        })
        
        # 只打印前20个元素
        if len(module2_content) <= 20:
            print(f"  [{i}] {style_name}: {text[:80] if text else '(空)'}")

print(f"\n模块2总元素数: {len(module2_content)}")

# 统计H2数量
h2_count = sum(1 for item in module2_content if item['style'] == 'Heading 2')
print(f"模块2中H2数量: {h2_count}")

if h2_count == 0:
    print("\n❌ 模块2下没有H2标题！")
else:
    print(f"\n✅ 模块2下有 {h2_count} 个H2标题")
