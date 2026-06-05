import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os
import sys
import json
import math

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

ENTITY_COLORS = {
    'PK': '#1565C0',
    'FK': '#E65100',
    'NORMAL': '#424242',
    'HEADER_BG': '#E3F2FD',
    'HEADER_BORDER': '#1565C0',
    'BODY_BG': '#FFFFFF',
    'BODY_BORDER': '#BDBDBD',
    'RELATION_LINE': '#757575',
    'RELATION_ARROW': '#D32F2F',
}

MAX_FIELDS_PER_ENTITY = 8


def _calculate_layout(table_count, fig_width, fig_height):
    cols = max(1, min(5, int(math.ceil(math.sqrt(table_count * fig_width / fig_height)))))
    rows = max(1, int(math.ceil(table_count / cols)))
    return rows, cols


def _draw_entity(ax, x, y, table_name, columns, primary_keys, box_width, box_height):
    header_height = 0.35
    header_rect = FancyBboxPatch(
        (x, y + box_height - header_height), box_width, header_height,
        boxstyle="round,pad=0.02",
        facecolor=ENTITY_COLORS['HEADER_BG'],
        edgecolor=ENTITY_COLORS['HEADER_BORDER'],
        linewidth=1.2
    )
    ax.add_patch(header_rect)
    ax.text(x + box_width / 2, y + box_height - header_height / 2, table_name,
            fontsize=7, fontweight='bold', ha='center', va='center',
            color=ENTITY_COLORS['HEADER_BORDER'])

    body_height = box_height - header_height
    body_rect = FancyBboxPatch(
        (x, y), box_width, body_height,
        boxstyle="round,pad=0.02",
        facecolor=ENTITY_COLORS['BODY_BG'],
        edgecolor=ENTITY_COLORS['BODY_BORDER'],
        linewidth=0.8
    )
    ax.add_patch(body_rect)

    display_cols = columns[:MAX_FIELDS_PER_ENTITY]
    if len(columns) > MAX_FIELDS_PER_ENTITY:
        display_cols = display_cols[:-1]
        display_cols.append({'name': f'... ({len(columns)} fields)', 'dataType': '', 'comment': '', 'is_pk': False})

    line_height = body_height / (MAX_FIELDS_PER_ENTITY + 0.5)
    for idx, col in enumerate(display_cols):
        col_name = col.get('name', '')
        col_type = col.get('dataType', '')
        is_pk = col.get('is_pk', False) or col_name in primary_keys

        cy = y + body_height - (idx + 0.8) * line_height
        if cy < y + 0.02:
            break

        prefix = 'PK ' if is_pk else '   '
        color = ENTITY_COLORS['PK'] if is_pk else ENTITY_COLORS['NORMAL']
        weight = 'bold' if is_pk else 'normal'

        type_str = f' {col_type}' if col_type else ''
        field_text = f'{prefix}{col_name}{type_str}'
        ax.text(x + 0.08, cy, field_text,
                fontsize=5, fontweight=weight, va='center',
                color=color, family='monospace')


def _draw_relation(ax, x1, y1, x2, y2, label='', w1=0, h1=0, w2=0, h2=0):
    cx1 = x1 + w1 / 2
    cy1 = y1 + h1 / 2
    cx2 = x2 + w2 / 2
    cy2 = y2 + h2 / 2

    if abs(cx1 - cx2) > abs(cy1 - cy2):
        if cx1 < cx2:
            sx, sy = x1 + w1, cy1
            ex, ey = x2, cy2
        else:
            sx, sy = x1, cy1
            ex, ey = x2 + w2, cy2
    else:
        if cy1 > cy2:
            sx, sy = cx1, y1 + h1
            ex, ey = cx2, y2
        else:
            sx, sy = cx1, y1
            ex, ey = cx2, cy2 + h2

    ax.annotate('', xy=(ex, ey), xytext=(sx, sy),
                arrowprops=dict(
                    arrowstyle='->',
                    color=ENTITY_COLORS['RELATION_ARROW'],
                    lw=0.8,
                    connectionstyle='arc3,rad=0.1',
                    shrinkA=2, shrinkB=2
                ))
    if label:
        mid_x = (sx + ex) / 2
        mid_y = (sy + ey) / 2
        ax.text(mid_x, mid_y + 0.15, label,
                fontsize=4, ha='center', va='bottom',
                color=ENTITY_COLORS['RELATION_LINE'],
                style='italic',
                bbox=dict(boxstyle='round,pad=0.1', facecolor='white', edgecolor='none', alpha=0.8))


def _compute_hash(content):
    """2026-06-03 优化：ER图缓存 - mermaidCode hash 命中时复用PNG"""
    import hashlib
    return hashlib.md5(content.encode('utf-8')).hexdigest()[:16]


def render_er_diagram(er_data, output_path, project_name='本项目'):
    group_label = er_data.get('label', er_data.get('groupName', 'ER Diagram'))
    table_count = er_data.get('tableCount', 0)
    tables = er_data.get('tables', [])
    mermaid_code = er_data.get('mermaidCode', '')

    # 2026-06-03 优化：缓存命中检测 - hash + PNG 存在则直接复制返回
    if mermaid_code:
        hash_val = _compute_hash(mermaid_code + '|' + group_label)
        base_name = os.path.basename(output_path).replace('.png', '')
        cache_png = os.path.join(os.path.dirname(output_path), f'{base_name}#{hash_val}.png')
        if os.path.exists(cache_png) and os.path.getsize(cache_png) > 1024:
            import shutil
            shutil.copy(cache_png, output_path)
            return output_path

    columns_map = _parse_mermaid_columns(mermaid_code)
    relations = _parse_mermaid_relations(mermaid_code)

    if table_count <= 0:
        return None

    if table_count <= 5:
        fig_w, fig_h = 14, 8
    elif table_count <= 15:
        fig_w, fig_h = 18, 12
    elif table_count <= 30:
        fig_w, fig_h = 22, 16
    else:
        fig_w, fig_h = 28, 20

    rows, cols = _calculate_layout(table_count, fig_w, fig_h)

    fig, ax = plt.subplots(1, 1, figsize=(fig_w, fig_h))
    ax.set_xlim(0, fig_w)
    ax.set_ylim(0, fig_h)
    ax.axis('off')
    ax.set_title(f'{project_name} - {group_label}', fontsize=14, fontweight='bold', pad=15)

    margin_x = 0.5
    margin_y = 0.8
    cell_w = (fig_w - 2 * margin_x) / cols
    cell_h = (fig_h - 2 * margin_y - 1.0) / rows

    box_width = min(cell_w * 0.9, 3.5)
    max_fields = MAX_FIELDS_PER_ENTITY
    box_height = min(cell_h * 0.85, 0.35 + max_fields * 0.28)

    entity_positions = {}

    for idx, table_name in enumerate(tables):
        row = idx // cols
        col = idx % cols
        x = margin_x + col * cell_w + (cell_w - box_width) / 2
        y = fig_h - margin_y - 0.5 - row * cell_h - (cell_h - box_height) / 2 - box_height

        cols_data = columns_map.get(table_name, [])
        pks = [c['name'] for c in cols_data if c.get('is_pk', False)]

        _draw_entity(ax, x, y, table_name, cols_data, pks, box_width, box_height)
        entity_positions[table_name] = (x, y, box_width, box_height)

    for rel in relations[:50]:
        t1 = rel['from']
        t2 = rel['to']
        label = rel.get('label', '')
        if t1 in entity_positions and t2 in entity_positions:
            x1, y1, w1, h1 = entity_positions[t1]
            x2, y2, w2, h2 = entity_positions[t2]
            _draw_relation(ax, x1, y1, x2, y2, label, w1, h1, w2, h2)

    info_text = f'共 {table_count} 个数据表 | {len(relations)} 个关联关系'
    ax.text(fig_w - margin_x, margin_y - 0.3, info_text,
            fontsize=7, ha='right', va='center', color='#9E9E9E')

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)

    # 2026-06-03 优化：缓存保存 - 将渲染结果按 hash 复制到缓存文件
    if mermaid_code:
        try:
            import shutil
            hash_val = _compute_hash(mermaid_code + '|' + group_label)
            base_name = os.path.basename(output_path).replace('.png', '')
            cache_png = os.path.join(os.path.dirname(output_path), f'{base_name}#{hash_val}.png')
            shutil.copy(output_path, cache_png)
        except Exception:
            pass
    return output_path


def _parse_mermaid_columns(mermaid_code):
    columns_map = {}
    current_table = None
    in_entity = False

    for line in mermaid_code.split('\n'):
        stripped = line.strip()
        if not stripped or stripped == 'erDiagram':
            continue

        if ' {' in stripped and not stripped.startswith('}'):
            parts = stripped.split(' {')
            current_table = parts[0].strip()
            columns_map[current_table] = []
            in_entity = True
            continue

        if stripped == '}':
            current_table = None
            in_entity = False
            continue

        if in_entity and current_table:
            parts = stripped.split()
            if len(parts) >= 2:
                data_type = parts[0]
                col_name = parts[1]
                is_pk = 'PK' in stripped
                comment = ''
                if '"' in stripped:
                    comment = stripped[stripped.index('"') + 1:stripped.rindex('"')]
                columns_map[current_table].append({
                    'name': col_name,
                    'dataType': data_type,
                    'comment': comment,
                    'is_pk': is_pk
                })

    return columns_map


def _parse_mermaid_relations(mermaid_code):
    relations = []
    relation_patterns = [
        (r'(\w+)\s+\|\|--o\{\s+(\w+)\s*:\s*"([^"]*)"', '1:N'),
        (r'(\w+)\s+\|\|--\|\|\s+(\w+)\s*:\s*"([^"]*)"', '1:1'),
        (r'(\w+)\s+\}o--o\{\s+(\w+)\s*:\s*"([^"]*)"', 'N:M'),
        (r'(\w+)\s+\}o--\|\|\s+(\w+)\s*:\s*"([^"]*)"', 'N:1'),
    ]

    import re
    for line in mermaid_code.split('\n'):
        stripped = line.strip()
        for pattern, rel_type in relation_patterns:
            match = re.match(pattern, stripped)
            if match:
                relations.append({
                    'from': match.group(1),
                    'to': match.group(2),
                    'label': match.group(3),
                    'type': rel_type
                })
                break

    return relations


if __name__ == '__main__':
    # Windows 控制台默认 GBK，强制 UTF-8 输出避免编码错误
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if len(sys.argv) < 3:
        print('Usage: python er-diagram-renderer.py <er_diagrams.json> <output_dir> [project_name]', file=sys.stderr)
        sys.exit(1)

    er_json_path = sys.argv[1]
    output_dir = sys.argv[2]
    project_name = sys.argv[3] if len(sys.argv) > 3 else '本项目'

    os.makedirs(output_dir, exist_ok=True)

    with open(er_json_path, 'r', encoding='utf-8') as f:
        er_diagrams = json.load(f)

    results = []
    for idx, er in enumerate(er_diagrams):
        group_label = er.get('label', er.get('groupName', f'Group_{idx + 1}'))
        safe_label = group_label.replace(' ', '_').replace('/', '_').replace('\\', '_')
        png_filename = f'ER_{str(idx + 1).zfill(2)}_{safe_label}.png'
        png_path = os.path.join(output_dir, png_filename)

        try:
            result = render_er_diagram(er, png_path, project_name)
            if result:
                results.append({
                    'groupLabel': group_label,
                    'pngPath': result,
                    'tableCount': er.get('tableCount', 0)
                })
                print(f'  ER图PNG: {result}', file=sys.stderr)
        except Exception as e:
            print(f'  ⚠ ER图渲染失败 [{group_label}]: {e}', file=sys.stderr)

    print(json.dumps({'success': True, 'images': results}, ensure_ascii=False))
