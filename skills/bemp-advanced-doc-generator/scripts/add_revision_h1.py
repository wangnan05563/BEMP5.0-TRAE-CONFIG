"""在文档前面添加'修订记录'H1"""
import paths
from docx import Document
from docx.oxml.ns import qn
from copy import deepcopy

path = str(paths.detail_design_template())
doc = Document(path)

# 找到"概述"H1作为H1模板
overview_h1 = None
for p in doc.paragraphs:
    if p.style and p.style.name == 'Heading 1' and p.text.strip() == '概述':
        overview_h1 = p
        break

if overview_h1 is None:
    print("未找到概述H1")
    exit(1)

# 构造"修订记录"H1
h1_elem = deepcopy(overview_h1._element)
for r in list(h1_elem.findall(qn('w:r'))):
    h1_elem.remove(r)
new_r = h1_elem.makeelement(qn('w:r'), {})
new_t = new_r.makeelement(qn('w:t'), {})
new_t.text = "修订记录"
new_t.set(qn('xml:space'), 'preserve')
new_r.append(new_t)
h1_elem.append(new_r)

# 插入到"概述"H1之前
overview_h1._element.addprevious(h1_elem)

doc.save(path)
print("已添加'修订记录'H1")
