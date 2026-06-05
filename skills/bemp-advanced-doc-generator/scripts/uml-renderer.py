"""
UML 图表降级渲染脚本（matplotlib fallback）
当 AntV 不可用时，使用 matplotlib 绘制简单方块+箭头的图。

不依赖 mermaid-py 等外部库，只用 matplotlib + 矩形/文本/箭头，确保降级路径可用。
"""
import os
import re
import sys
import json

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib import font_manager

# 2026-06-04 新增：尝试设置中文字体（避免乱码）
_CJK_FONTS = ['Microsoft YaHei', 'SimHei', 'PingFang SC', 'Heiti SC', 'WenQuanYi Zen Hei', 'Noto Sans CJK SC', 'Source Han Sans CN']
def _setup_cjk_font():
    try:
        available = {f.name for f in font_manager.fontManager.ttflist}
        for fn in _CJK_FONTS:
            if fn in available:
                plt.rcParams['font.sans-serif'] = [fn, 'DejaVu Sans']
                plt.rcParams['axes.unicode_minus'] = False
                return fn
    except Exception:
        pass
    return None
_SETUP_FONT = _setup_cjk_font()


def _parse_class_diagram(code):
    """解析 classDiagram 文本，提取 className -> [(vis, type, name)]"""
    classes = {}
    current = None
    for line in code.splitlines():
        line = line.strip()
        if line.startswith('class '):
            m = re.match(r'class\s+(\S+)\s*\{?', line)
            if m:
                current = m.group(1)
                classes.setdefault(current, [])
            elif '{' in line:
                m = re.match(r'class\s+(\S+)\s*\{?', line)
                if m:
                    current = m.group(1)
                    classes.setdefault(current, [])
        elif line == '}':
            current = None
        elif current and line and not line.startswith('classDiagram'):
            m = re.match(r'([+\-#]+)?\s*(\S+)\s*\(\s*([^)]*)\s*\)\s*:\s*(\S+)', line)
            if m:
                vis, name, params, ret = m.group(1) or '+', m.group(2), m.group(3), m.group(4)
                classes[current].append(('method', f'{name}({params}): {ret}'))
                continue
            m = re.match(r'([+\-#]+)?\s*(\S+)\s*:\s*(\S+)', line)
            if m:
                vis, name, typ = m.group(1) or '+', m.group(2), m.group(3)
                classes[current].append(('attr', f'{name}: {typ}'))
    return classes


def _parse_sequence_diagram(code):
    """解析 sequenceDiagram 文本，提取 participants 与 steps"""
    participants = []
    steps = []
    for line in code.splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.match(r'participant\s+(\S+)(?:\s+as\s+(\S+))?', line)
        if m:
            participants.append(m.group(2) or m.group(1))
            continue
        m = re.match(r'(\S+)\s*(-->>|->>)\s*(\S+)\s*:\s*(.+)', line)
        if m:
            steps.append((m.group(1), m.group(2), m.group(3), m.group(4)))
    return participants, steps


def _parse_flowchart(code):
    """解析 flowchart 文本，提取 nodes 与 edges"""
    nodes = {}
    edges = []
    for line in code.splitlines():
        line = line.strip()
        if not line or line.startswith('flowchart'):
            continue
        m = re.match(r'(\w+)\s*(\[\([\w\s\d\u4e00-\u9fa5]+\)\]|\{[\w\s\d\u4e00-\u9fa5]+\}|\[[\w\s\d\u4e00-\u9fa5]+\])\s*$', line)
        if m:
            nid, raw = m.group(1), m.group(2)
            text = re.sub(r'[\[\]\{\}\(\)]', '', raw).strip()
            if raw.startswith('[(') and raw.endswith(')]'):
                kind = 'startend'
            elif raw.startswith('{') and raw.endswith('}'):
                kind = 'decision'
            else:
                kind = 'action'
            nodes[nid] = (kind, text)
            continue
        m = re.match(r'(\w+)\s*-->\s*(\w+)', line)
        if m:
            edges.append((m.group(1), m.group(2), None))
            continue
        m = re.match(r'(\w+)\s*-->\|(.+)\|\s*(\w+)', line)
        if m:
            edges.append((m.group(1), m.group(3), m.group(2).strip()))
    return nodes, edges


def _draw_class_diagram(classes, dest):
    fig, ax = plt.subplots(figsize=(10, max(4, 1.2 * len(classes))))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, max(4, 1.2 * len(classes)))
    ax.axis('off')
    n = len(classes)
    if n == 0:
        ax.text(5, 2, '(空类图)', ha='center', va='center', fontsize=14)
        plt.savefig(dest, dpi=120, bbox_inches='tight')
        plt.close()
        return
    box_h = 1.0
    for i, (cname, members) in enumerate(classes.items()):
        y = n - i - 1
        ax.add_patch(FancyBboxPatch((0.5, y), 4, box_h, boxstyle='round,pad=0.05', edgecolor='#2c3e50', facecolor='#d9e2f3'))
        ax.text(2.5, y + box_h - 0.15, cname, ha='center', va='top', fontsize=12, fontweight='bold')
        for j, (kind, text) in enumerate(members[:8]):
            ax.text(0.7, y + box_h - 0.4 - 0.13 * (j + 1), f'{"  " if kind == "method" else "+ "}{text}', ha='left', va='top', fontsize=8, family='monospace')
    plt.savefig(dest, dpi=120, bbox_inches='tight')
    plt.close()


def _draw_sequence_diagram(participants, steps, dest):
    if not participants:
        participants = ['User', 'Server']
    if not steps:
        steps = [('User', '->>', 'Server', '请求')]
    fig, ax = plt.subplots(figsize=(10, max(5, 0.6 * len(steps) + 2)))
    n = len(participants)
    xs = [1 + i * 2 for i in range(n)]
    ax.set_xlim(0, max(2 * n, 6))
    ax.set_ylim(0, max(5, 0.6 * len(steps) + 2))
    ax.axis('off')
    for i, p in enumerate(participants):
        ax.text(xs[i], max(5, 0.6 * len(steps) + 2) - 0.5, p, ha='center', va='center', fontsize=11, fontweight='bold', bbox=dict(boxstyle='round', facecolor='#d9e2f3', edgecolor='#2c3e50'))
    for j, (frm, arrow, to, msg) in enumerate(steps):
        y = max(5, 0.6 * len(steps) + 2) - 1.5 - 0.5 * j
        if frm in participants and to in participants:
            fi = participants.index(frm)
            ti = participants.index(to)
            linestyle = '--' if '--' in arrow else '-'
            ax.annotate('', xy=(xs[ti], y), xytext=(xs[fi], y), arrowprops=dict(arrowstyle='->', color='#2c3e50', linestyle=linestyle))
        ax.text(5, y + 0.1, msg, ha='center', va='bottom', fontsize=8, style='italic', color='#34495e')
    plt.savefig(dest, dpi=120, bbox_inches='tight')
    plt.close()


def _draw_flowchart(nodes, edges, dest):
    if not nodes:
        nodes = {'Start': ('startend', '开始'), 'End': ('startend', '结束')}
        edges = [('Start', 'End', None)]
    fig, ax = plt.subplots(figsize=(10, max(5, 0.8 * len(nodes) + 1)))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, max(5, 0.8 * len(nodes) + 1))
    ax.axis('off')
    positions = {}
    keys = list(nodes.keys())
    n = len(keys)
    for i, k in enumerate(keys):
        y = max(5, 0.8 * n + 1) - 0.5 - 0.8 * i
        positions[k] = (5, y)
        kind, text = nodes[k]
        if kind == 'decision':
            ax.add_patch(plt.Polygon([(5, y + 0.3), (5.6, y), (5, y - 0.3), (4.4, y)], closed=True, facecolor='#fdebd0', edgecolor='#2c3e50'))
        elif kind == 'startend':
            ax.add_patch(FancyBboxPatch((3.8, y - 0.3), 2.4, 0.6, boxstyle='round,pad=0.1', facecolor='#d5f5e3', edgecolor='#2c3e50'))
        else:
            ax.add_patch(FancyBboxPatch((3.8, y - 0.3), 2.4, 0.6, boxstyle='round,pad=0.05', facecolor='#d9e2f3', edgecolor='#2c3e50'))
        ax.text(5, y, text[:24], ha='center', va='center', fontsize=9)
    for (a, b, label) in edges:
        if a in positions and b in positions:
            ax.annotate('', xy=positions[b], xytext=positions[a], arrowprops=dict(arrowstyle='->', color='#2c3e50'))
            if label:
                ax.text((positions[a][0] + positions[b][0]) / 2 + 0.2, (positions[a][1] + positions[b][1]) / 2, label, fontsize=8, color='#7f8c8d')
    plt.savefig(dest, dpi=120, bbox_inches='tight')
    plt.close()


def main():
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'errorMessage': '参数不足'}))
        sys.exit(1)
    mmd_path = sys.argv[1]
    dest = sys.argv[2]
    if not os.path.exists(mmd_path):
        print(json.dumps({'success': False, 'errorMessage': f'输入文件不存在: {mmd_path}'}))
        sys.exit(1)
    code = open(mmd_path, 'r', encoding='utf-8').read()
    try:
        if code.lstrip().startswith('classDiagram'):
            classes = _parse_class_diagram(code)
            _draw_class_diagram(classes, dest)
        elif code.lstrip().startswith('sequenceDiagram'):
            participants, steps = _parse_sequence_diagram(code)
            _draw_sequence_diagram(participants, steps, dest)
        else:
            nodes, edges = _parse_flowchart(code)
            _draw_flowchart(nodes, edges, dest)
        print(json.dumps({'success': True, 'output': dest}))
    except Exception as e:
        print(json.dumps({'success': False, 'errorMessage': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
