"""检查模板中的模块H1数量和结构"""
from docx import Document

template_path = r"d:\code\QJ\BEMP5.0DEV\docs\07【模板】详细设计说明书.docx"
doc = Document(template_path)

print("=" * 80)
print("模板结构分析")
print("=" * 80)

module_h1_list = []
all_h1_list = []

for para in doc.paragraphs:
    style_name = para.style.name if para.style else ''
    text = para.text.strip()
    
    if not text:
        continue
    
    if 'Heading 1' in style_name or style_name == '1':
        all_h1_list.append(text)
        if '模块' in text and '设计说明' in text:
            module_h1_list.append(text)
            print(f"【模块H1】{text}")
        else:
            print(f"【H1】{text}")

print("\n" + "=" * 80)
print(f"模板中模块H1总数: {len(module_h1_list)}")
for i, m in enumerate(module_h1_list):
    print(f"  {i+1}. {m}")
print("=" * 80)
