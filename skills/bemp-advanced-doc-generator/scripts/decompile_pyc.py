"""提取 pyc 中每个函数的字节码 (dis)"""
import paths
import marshal, types, dis, io

pyc = str(paths.SCRIPTS_DIR / '__pycache__' / 'outline-design-generator.cpython-314.pyc')
log = str(paths.OUTPUT_DIR / '_decompile.log')

with open(pyc, 'rb') as f:
    f.read(16)
    code = marshal.load(f)

# 提取 generate_outline_design 的字节码
target_funcs = {'generate_outline_design', '_insert_er_chapter', 'build_content_map', 'build_subsystem_descriptions', '_load_json_config', '_insert_er_attachments', '_insert_er_summary_table', '_insert_normal_paragraph_after'}

def walk(co):
    for c in co.co_consts:
        if isinstance(c, types.CodeType):
            if c.co_name in target_funcs:
                yield c
            yield from walk(c)

lines = []
for fc in walk(code):
    lines.append(f'\n========== {fc.co_name} (L{fc.co_firstlineno}, args={fc.co_argcount}) ==========')
    lines.append(f'  varnames: {list(fc.co_varnames)}')
    lines.append(f'  names: {list(fc.co_names)}')
    buf = io.StringIO()
    dis.dis(fc, file=buf)
    # 只保留前2000字避免太大
    text = buf.getvalue()
    lines.append(text[:3000])

with open(log, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f'OK: {log}  size={sum(len(l) for l in lines)}')


