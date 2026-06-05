"""列出文档中所有标题"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import paths
from docx import Document

docs = [
    ('概要设计', paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260604.docx'),
    ('详细设计', paths.OUTPUT_DIR / '河南农商-详细设计文档-20260604.docx'),
]

for label, doc_path in docs:
    if not doc_path.exists():
        continue
    doc = Document(str(doc_path))
    print(f'\n{"="*60}')
    print(f'{label} - 所有标题')
    print(f'{"="*60}')
    for p in doc.paragraphs:
        if p.style and p.style.name and p.style.name.startswith('Heading'):
            level = p.style.name.replace('Heading ', '').replace('Heading', '')
            text = p.text.strip()
            if text:
                print(f'  H{level}: {text}')
