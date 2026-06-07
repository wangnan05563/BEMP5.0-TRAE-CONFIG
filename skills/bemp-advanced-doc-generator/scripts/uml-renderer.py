# -*- coding: utf-8 -*-
"""
BEMP 概要设计 - UML 图与部署图专业绘制脚本
使用 Graphviz + DOT 语言绘制专业 UML 图（类图/顺序图/活动图/状态图/部署图）。
通过 subprocess 调用 `dot` 命令生成 PNG。

配置文件：uml-style.yaml（节点样式、边样式、颜色、字体）
输入：DOT 描述字符串
输出：PNG 文件路径
"""
import os
import sys
import json
import subprocess
import shutil

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None


def _load_uml_style():
    """加载 uml-style.yaml 配置"""
    try:
        cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uml-style.yaml')
        if yaml and os.path.exists(cfg_path):
            with open(cfg_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
    except Exception as e:
        print(f'[WARN] 加载 uml-style.yaml 失败: {e}', file=sys.stderr)
    return {}


_STYLE = _load_uml_style()


def _check_graphviz():
    """检查系统是否安装 graphviz"""
    if shutil.which('dot') is None:
        return False
    return True


def _render_dot_to_png(dot_code, output_png, dpi=150):
    """调用 graphviz `dot` 命令把 DOT 代码转 PNG"""
    if not _check_graphviz():
        print('[WARN] Graphviz 未安装，UML 图无法生成。请安装 graphviz 并确保 dot 在 PATH 中。',
              file=sys.stderr)
        return False
    try:
        # 写入临时 dot 文件
        dot_file = output_png.replace('.png', '.dot')
        with open(dot_file, 'w', encoding='utf-8') as f:
            f.write(dot_code)
        # 调用 dot 渲染
        result = subprocess.run(
            ['dot', f'-Tpng', f'-Gdpi={dpi}', dot_file, '-o', output_png],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            print(f'[WARN] dot 渲染失败: {result.stderr}', file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f'[WARN] Graphviz 渲染异常: {e}', file=sys.stderr)
        return False


# ═══════════════════════════════════════════════════════════════
# 通用头
# ═══════════════════════════════════════════════════════════════

def _build_graph_header(rankdir='TB', **overrides):
    """构造 DOT 图全局属性头"""
    g = _STYLE.get('graphviz_global', {}) if _STYLE else {}
    rankdir = overrides.get('rankdir', rankdir)
    attrs = [
        f'rankdir="{rankdir}"',
        f'bgcolor="{g.get("bgcolor", "white")}"',
        f'fontname="{g.get("fontname", "Microsoft YaHei")}"',
        f'fontsize={g.get("fontsize", 12)}',
        f'pad="{g.get("pad", "0.5")}"',
        f'nodesep="{g.get("nodesep", "0.6")}"',
        f'ranksep="{g.get("ranksep", "0.8")}"',
        f'splines={g.get("splines", "ortho")}',
    ]
    return 'digraph G {\n  ' + '\n  '.join(attrs) + '\n'


def _node_default_attrs():
    n = (_STYLE.get('node_default', {}) if _STYLE else {})
    return (
        f'shape={n.get("shape", "box")} '
        f'style="{n.get("style", "rounded,filled")}" '
        f'fontname="{n.get("fontname", "Microsoft YaHei")}" '
        f'fontsize={n.get("fontsize", 11)} '
        f'fillcolor="{n.get("fillcolor", "#E3F2FD")}" '
        f'color="{n.get("color", "#1565C0")}" '
        f'width={n.get("width", 1.4)} '
        f'height={n.get("height", 0.5)}'
    )


def _edge_default_attrs():
    e = (_STYLE.get('edge_default', {}) if _STYLE else {})
    return (
        f'fontname="{e.get("fontname", "Microsoft YaHei")}" '
        f'fontsize={e.get("fontsize", 9)} '
        f'color="{e.get("color", "#424242")}" '
        f'arrowsize={e.get("arrowsize", 0.8)}'
    )


# ═══════════════════════════════════════════════════════════════
# 类图
# ═══════════════════════════════════════════════════════════════

def render_class_diagram(classes, relations, output_png, project_name=''):
    """渲染类图。

    Args:
        classes: list of dict, 每个 dict 包含:
            - name: 类名
            - attributes: 属性列表 [(vis, type, name), ...]
            - methods: 方法列表 [(vis, type, name), ...]
        relations: list of dict, 包含:
            - type: inheritance|association|aggregation|composition|dependency
            - src: 源类
            - dst: 目标类
            - label: 边的标签（可选）
        output_png: PNG 文件路径
    """
    cd = (_STYLE.get('class_diagram', {}) if _STYLE else {})
    node_cls = cd.get('node_class', {})
    node_intf = cd.get('node_interface', {})
    edges = {k: cd.get(f'edge_{k}', {}) for k in
             ('inheritance', 'association', 'aggregation', 'composition', 'dependency')}

    lines = [_build_graph_header(rankdir='TB')]

    # 节点：class 用 record 样式
    for c in classes:
        name = c.get('name', 'Class')
        attrs = c.get('attributes', [])
        methods = c.get('methods', [])
        is_interface = c.get('interface', False)

        if is_interface:
            style = node_intf
        else:
            style = node_cls

        # 构造 record 标签：name | fields | methods
        label_parts = [f'<<{name}>>' if is_interface else name]
        for vis, typ, aname in attrs:
            label_parts.append(f'+{aname}: {typ}' if vis == '+' else f'-{aname}: {typ}')
        for vis, ret, mname in methods:
            label_parts.append(f'+{mname}(): {ret}' if vis == '+' else f'-{mname}(): {ret}')
        label = '\\n'.join(label_parts)
        label = label.replace('"', '\\"')

        node_def = (
            f'  "{name}" [\n'
            f'    label="{{{label}}}"\n'
            f'    shape="{style.get("shape", "record")}"\n'
            f'    style="{style.get("style", "filled")}"\n'
            f'    fillcolor="{style.get("fillcolor", "#FFFDE7")}"\n'
            f'    color="{style.get("color", "#F57F17")}"\n'
            f'    fontname="Microsoft YaHei" fontsize=11\n'
            f'  ]'
        )
        lines.append(node_def)

    # 边
    for rel in relations:
        rtype = rel.get('type', 'association')
        e = edges.get(rtype, edges.get('association', {}))
        attrs = (
            f'arrowhead={e.get("arrowhead", "vee")} '
            f'color="{e.get("color", "#616161")}" '
            f'style={e.get("style", "solid")} '
            f'fontsize=9'
        )
        label = rel.get('label', '')
        if label:
            attrs += f' label="{label}"'
        lines.append(f'  "{rel.get("src")}" -> "{rel.get("dst")}" [{attrs}]')

    lines.append('}\n')
    dot_code = '\n'.join(lines)
    return _render_dot_to_png(dot_code, output_png)


# ═══════════════════════════════════════════════════════════════
# 顺序图
# ═══════════════════════════════════════════════════════════════

def render_sequence_diagram(actors, messages, output_png, project_name=''):
    """渲染顺序图（用 Graphviz 的横向布局模拟时间线）。

    Args:
        actors: list of str, 参与者名称（用户/Controller/Service/DAO ...）
        messages: list of dict, 每个消息包含:
            - src: 发送方
            - dst: 接收方
            - label: 消息文本
            - type: sync（实线）/ reply（虚线）/ async（斜体虚线）
        output_png: PNG 文件路径
    """
    sd = (_STYLE.get('sequence_diagram', {}) if _STYLE else {})
    actor_cfg = sd.get('node_actor', {})

    lines = [_build_graph_header(rankdir='LR')]

    # 强制所有 actor 同一 rank → 横向并排
    lines.append('  { rank=same; ' + ' '.join(f'"{a}"' for a in actors) + ' }')

    # 节点定义
    for a in actors:
        lines.append(
            f'  "{a}" [\n'
            f'    shape="{actor_cfg.get("shape", "box")}"\n'
            f'    style="{actor_cfg.get("style", "rounded,filled")}"\n'
            f'    fillcolor="{actor_cfg.get("fillcolor", "#F3E5F5")}"\n'
            f'    color="{actor_cfg.get("color", "#6A1B9A")}"\n'
            f'    fontname="Microsoft YaHei" fontsize=11\n'
            f'  ]'
        )

    # 消息（按时间顺序）
    edge_attrs_default = sd.get('edge_message', {})
    edge_attrs_reply = sd.get('edge_reply', {})
    edge_attrs_async = sd.get('edge_async', {})

    for i, msg in enumerate(messages):
        mtype = msg.get('type', 'sync')
        if mtype == 'reply':
            e = edge_attrs_reply
        elif mtype == 'async':
            e = edge_attrs_async
        else:
            e = edge_attrs_default
        attrs = (
            f'color="{e.get("color", "#1565C0")}" '
            f'arrowsize={e.get("arrowsize", 0.7)}'
        )
        if e.get('style'):
            attrs += f' style={e["style"]}'
        label = msg.get('label', '')
        if label:
            label = label.replace('"', '\\"')
            attrs += f' label="{label}"'
        lines.append(f'  "{msg.get("src")}" -> "{msg.get("dst")}" [{attrs}]')

    lines.append('}\n')
    dot_code = '\n'.join(lines)
    return _render_dot_to_png(dot_code, output_png)


# ═══════════════════════════════════════════════════════════════
# 活动图
# ═══════════════════════════════════════════════════════════════

def render_activity_diagram(nodes, transitions, output_png, project_name=''):
    """渲染活动图（业务流程图）。

    Args:
        nodes: list of dict, 每个节点包含:
            - id: 节点 ID
            - type: initial|final|action|decision|merge|fork|join
            - label: 节点标签
        transitions: list of dict:
            - src: 源节点
            - dst: 目标节点
            - label: 边标签（可选，用于决策分支）
        output_png: PNG 文件路径
    """
    ad = (_STYLE.get('activity_diagram', {}) if _STYLE else {})

    lines = [_build_graph_header(rankdir='TB')]

    for n in nodes:
        nid = n.get('id', 'n')
        ntype = n.get('type', 'action')
        label = n.get('label', '').replace('"', '\\"')

        if ntype == 'initial':
            cfg = ad.get('node_initial', {})
            lines.append(
                f'  "{nid}" [\n'
                f'    shape="{cfg.get("shape", "circle")}"\n'
                f'    style="{cfg.get("style", "filled")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#2E7D32")}"\n'
                f'    color="{cfg.get("color", "#2E7D32")}"\n'
                f'    label=""\n'
                f'    width={cfg.get("width", 0.3)}\n'
                f'  ]'
            )
        elif ntype == 'final':
            cfg = ad.get('node_final', {})
            lines.append(
                f'  "{nid}" [\n'
                f'    shape="{cfg.get("shape", "doublecircle")}"\n'
                f'    style="{cfg.get("style", "filled")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#C62828")}"\n'
                f'    color="{cfg.get("color", "#C62828")}"\n'
                f'    label=""\n'
                f'    width={cfg.get("width", 0.3)}\n'
                f'  ]'
            )
        elif ntype == 'decision':
            cfg = ad.get('node_decision', {})
            lines.append(
                f'  "{nid}" [\n'
                f'    shape="{cfg.get("shape", "diamond")}"\n'
                f'    style="{cfg.get("style", "filled")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#FFF3E0")}"\n'
                f'    color="{cfg.get("color", "#E65100")}"\n'
                f'    label="{label}"\n'
                f'    width={cfg.get("width", 1.2)}\n'
                f'    height={cfg.get("height", 0.8)}\n'
                f'    fontname="Microsoft YaHei" fontsize=11\n'
                f'  ]'
            )
        else:  # action / merge / fork / join
            cfg = ad.get('node_action', {})
            lines.append(
                f'  "{nid}" [\n'
                f'    shape="{cfg.get("shape", "box")}"\n'
                f'    style="{cfg.get("style", "rounded,filled")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#E3F2FD")}"\n'
                f'    color="{cfg.get("color", "#1565C0")}"\n'
                f'    label="{label}"\n'
                f'    fontname="Microsoft YaHei" fontsize=11\n'
                f'  ]'
            )

    # 边
    edge_cfg = ad.get('edge_default', {})
    for t in transitions:
        attrs = (
            f'color="{edge_cfg.get("color", "#424242")}" '
            f'arrowsize={edge_cfg.get("arrowsize", 0.7)}'
        )
        label = t.get('label', '')
        if label:
            label = label.replace('"', '\\"')
            attrs += f' label="{label}"'
        lines.append(f'  "{t.get("src")}" -> "{t.get("dst")}" [{attrs}]')

    lines.append('}\n')
    dot_code = '\n'.join(lines)
    return _render_dot_to_png(dot_code, output_png)


# ═══════════════════════════════════════════════════════════════
# 状态图
# ═══════════════════════════════════════════════════════════════

def render_state_diagram(states, transitions, output_png, project_name=''):
    """渲染状态图。"""
    sd = (_STYLE.get('state_diagram', {}) if _STYLE else {})

    lines = [_build_graph_header(rankdir='LR')]

    for s in states:
        sid = s.get('id', 's')
        stype = s.get('type', 'state')
        label = s.get('label', sid).replace('"', '\\"')

        if stype == 'initial':
            cfg = sd.get('node_initial', {})
            lines.append(
                f'  "{sid}" [shape=circle style=filled fillcolor="#2E7D32" color="#2E7D32" label="" width=0.3]'
            )
        elif stype == 'final':
            cfg = sd.get('node_final', {})
            lines.append(
                f'  "{sid}" [shape=doublecircle style=filled fillcolor="#C62828" color="#C62828" label="" width=0.3]'
            )
        else:
            cfg = sd.get('node_state', {})
            lines.append(
                f'  "{sid}" [\n'
                f'    shape="{cfg.get("shape", "record")}"\n'
                f'    style="{cfg.get("style", "rounded,filled")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#FFFDE7")}"\n'
                f'    color="{cfg.get("color", "#F57F17")}"\n'
                f'    label="{label}"\n'
                f'    fontname="Microsoft YaHei" fontsize=11\n'
                f'  ]'
            )

    edge_cfg = sd.get('edge_transition', {})
    for t in transitions:
        attrs = (
            f'color="{edge_cfg.get("color", "#1565C0")}" '
            f'arrowsize={edge_cfg.get("arrowsize", 0.7)}'
        )
        label = t.get('label', '')
        if label:
            label = label.replace('"', '\\"')
            attrs += f' label="{label}"'
        lines.append(f'  "{t.get("src")}" -> "{t.get("dst")}" [{attrs}]')

    lines.append('}\n')
    dot_code = '\n'.join(lines)
    return _render_dot_to_png(dot_code, output_png)


# ═══════════════════════════════════════════════════════════════
# 部署图
# ═══════════════════════════════════════════════════════════════

def render_deployment_diagram(nodes, connections, output_png, project_name=''):
    """渲染部署图（设备/节点/连接关系）。"""
    dd = (_STYLE.get('deployment_diagram', {}) if _STYLE else {})

    lines = [_build_graph_header(rankdir='TB')]

    for n in nodes:
        nid = n.get('id', 'n')
        ntype = n.get('type', 'device')
        label = n.get('label', nid).replace('"', '\\"')

        if ntype == 'zone':
            cfg = dd.get('node_zone', {})
            lines.append(
                f'  "{nid}" [\n'
                f'    shape="{cfg.get("shape", "box")}"\n'
                f'    style="{cfg.get("style", "rounded,filled,dashed")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#F5F5F5")}"\n'
                f'    color="{cfg.get("color", "#616161")}"\n'
                f'    label="{label}"\n'
                f'    fontname="Microsoft YaHei" fontsize=11\n'
                f'  ]'
            )
        else:
            cfg = dd.get('node_device', {})
            lines.append(
                f'  "{nid}" [\n'
                f'    shape="{cfg.get("shape", "box3d")}"\n'
                f'    style="{cfg.get("style", "filled")}"\n'
                f'    fillcolor="{cfg.get("fillcolor", "#E8F5E9")}"\n'
                f'    color="{cfg.get("color", "#2E7D32")}"\n'
                f'    label="{label}"\n'
                f'    fontname="Microsoft YaHei" fontsize=11\n'
                f'  ]'
            )

    edge_cfg = dd.get('edge_connection', {})
    for c in connections:
        attrs = (
            f'color="{edge_cfg.get("color", "#1565C0")}" '
            f'style={edge_cfg.get("style", "solid")} '
            f'arrowsize={edge_cfg.get("arrowsize", 0.7)}'
        )
        label = c.get('label', '')
        if label:
            label = label.replace('"', '\\"')
            attrs += f' label="{label}"'
        lines.append(f'  "{c.get("src")}" -> "{c.get("dst")}" [{attrs}]')

    lines.append('}\n')
    dot_code = '\n'.join(lines)
    return _render_dot_to_png(dot_code, output_png)


# ═══════════════════════════════════════════════════════════════
# 业务 UML 数据生成器（基于业务模块信息生成示例 UML）
# ═══════════════════════════════════════════════════════════════

def generate_class_diagram_data(business_module):
    """根据业务模块名生成类图数据（示例）。

    实际项目中应从 Java 代码扫描得到精确类结构；此处用业务模块名+约定类结构生成。
    """
    if not business_module:
        business_module = '业务模块'
    name = business_module.replace(' ', '') or 'Module'
    return {
        'classes': [
            {
                'name': f'{name}Controller',
                'attributes': [('-', 'Service', f'{name}Service')],
                'methods': [
                    ('+', 'Result', 'queryList(QueryDto)'),
                    ('+', 'Result', 'save(SaveDto)'),
                    ('+', 'Result', 'update(UpdateDto)'),
                    ('+', 'Result', 'delete(Long id)'),
                ],
            },
            {
                'name': f'{name}Service',
                'interface': True,
                'attributes': [],
                'methods': [
                    ('+', 'Page<T>', 'queryList(QueryDto)'),
                    ('+', 'boolean', 'save(SaveDto)'),
                    ('+', 'boolean', 'update(UpdateDto)'),
                    ('+', 'boolean', 'delete(Long id)'),
                ],
            },
            {
                'name': f'{name}ServiceImpl',
                'attributes': [('-', 'Mapper', f'{name}Mapper')],
                'methods': [
                    ('+', 'Page<T>', 'queryList(QueryDto)'),
                    ('+', 'boolean', 'save(SaveDto)'),
                    ('+', 'boolean', 'update(UpdateDto)'),
                    ('+', 'boolean', 'delete(Long id)'),
                ],
            },
            {
                'name': f'{name}Mapper',
                'interface': True,
                'attributes': [],
                'methods': [
                    ('+', 'List<T>', 'selectByQuery(QueryDto)'),
                    ('+', 'int', 'insert(T)'),
                    ('+', 'int', 'updateById(T)'),
                    ('+', 'int', 'deleteById(Long id)'),
                ],
            },
            {
                'name': f'{name}Entity',
                'attributes': [
                    ('-', 'Long', 'id'),
                    ('-', 'String', 'name'),
                    ('-', 'Long', 'orgId'),
                    ('-', 'String', 'status'),
                    ('-', 'Date', 'createTime'),
                ],
                'methods': [],
            },
        ],
        'relations': [
            {'type': 'dependency', 'src': f'{name}Controller', 'dst': f'{name}Service', 'label': 'uses'},
            {'type': 'inheritance', 'src': f'{name}ServiceImpl', 'dst': f'{name}Service', 'label': 'implements'},
            {'type': 'aggregation', 'src': f'{name}ServiceImpl', 'dst': f'{name}Mapper', 'label': 'has-a'},
            {'type': 'association', 'src': f'{name}Mapper', 'dst': f'{name}Entity', 'label': 'maps to'},
        ],
    }


def generate_sequence_diagram_data(business_module):
    """生成顺序图数据。"""
    if not business_module:
        business_module = '业务模块'
    name = business_module.replace(' ', '') or 'Module'
    return {
        'actors': ['用户', f'{name}Controller', f'{name}Service', f'{name}Mapper', 'MySQL'],
        'messages': [
            {'src': '用户', 'dst': f'{name}Controller', 'label': '1. 提交查询表单', 'type': 'sync'},
            {'src': f'{name}Controller', 'dst': f'{name}Service', 'label': '2. queryList(dto)', 'type': 'sync'},
            {'src': f'{name}Service', 'dst': f'{name}Mapper', 'label': '3. selectByQuery(dto)', 'type': 'sync'},
            {'src': f'{name}Mapper', 'dst': 'MySQL', 'label': '4. SELECT ... FROM ...', 'type': 'sync'},
            {'src': 'MySQL', 'dst': f'{name}Mapper', 'label': '5. ResultSet', 'type': 'reply'},
            {'src': f'{name}Mapper', 'dst': f'{name}Service', 'label': '6. List<Entity>', 'type': 'reply'},
            {'src': f'{name}Service', 'dst': f'{name}Controller', 'label': '7. Page<Entity>', 'type': 'reply'},
            {'src': f'{name}Controller', 'dst': '用户', 'label': '8. 渲染结果页面', 'type': 'reply'},
        ],
    }


def generate_activity_diagram_data(business_module):
    """生成活动图数据。"""
    if not business_module:
        business_module = '业务模块'
    name = business_module or '业务'
    return {
        'nodes': [
            {'id': 'start', 'type': 'initial', 'label': ''},
            {'id': 'a1', 'type': 'action', 'label': f'用户进入{name}列表'},
            {'id': 'd1', 'type': 'decision', 'label': '查询条件？'},
            {'id': 'a2', 'type': 'action', 'label': '构造查询参数'},
            {'id': 'a3', 'type': 'action', 'label': '调用 Service.queryList()'},
            {'id': 'd2', 'type': 'decision', 'label': '有数据？'},
            {'id': 'a4', 'type': 'action', 'label': '渲染列表'},
            {'id': 'a5', 'type': 'action', 'label': '显示空状态'},
            {'id': 'end', 'type': 'final', 'label': ''},
        ],
        'transitions': [
            {'src': 'start', 'dst': 'a1'},
            {'src': 'a1', 'dst': 'd1'},
            {'src': 'd1', 'dst': 'a2', 'label': '是'},
            {'src': 'a1', 'dst': 'a3', 'label': '否'},
            {'src': 'a2', 'dst': 'a3'},
            {'src': 'a3', 'dst': 'd2'},
            {'src': 'd2', 'dst': 'a4', 'label': '是'},
            {'src': 'd2', 'dst': 'a5', 'label': '否'},
            {'src': 'a4', 'dst': 'end'},
            {'src': 'a5', 'dst': 'end'},
        ],
    }


def generate_state_diagram_data(business_module):
    """生成状态图数据。"""
    if not business_module:
        business_module = '业务模块'
    name = business_module or '业务'
    return {
        'states': [
            {'id': 'init', 'type': 'initial'},
            {'id': 'draft', 'type': 'state', 'label': f'草稿（{name}已录入未提交）'},
            {'id': 'reviewing', 'type': 'state', 'label': '复核中'},
            {'id': 'approved', 'type': 'state', 'label': '已通过'},
            {'id': 'rejected', 'type': 'state', 'label': '已驳回'},
            {'id': 'closed', 'type': 'final'},
        ],
        'transitions': [
            {'src': 'init', 'dst': 'draft'},
            {'src': 'draft', 'dst': 'reviewing', 'label': '提交复核'},
            {'src': 'reviewing', 'dst': 'approved', 'label': '审核通过'},
            {'src': 'reviewing', 'dst': 'rejected', 'label': '审核驳回'},
            {'src': 'rejected', 'dst': 'draft', 'label': '重新编辑'},
            {'src': 'approved', 'dst': 'closed', 'label': '归档'},
        ],
    }


def generate_deployment_diagram_data():
    """生成部署图数据（基于 deployment-style.yaml）。"""
    try:
        cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deployment-style.yaml')
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = yaml.safe_load(f) if yaml else {}
    except Exception:
        cfg = {}

    racks = cfg.get('default_racks', [])
    crosses = cfg.get('cross_connections', [])

    nodes = []
    connections = []
    for r in racks:
        rack_id = r.get('title', '机架')
        items = r.get('items', [])
        # 创建一个 zone 节点作为分组
        nodes.append({
            'id': rack_id,
            'type': 'zone',
            'label': f"{r.get('title', '机架')}\\n[HA: {r.get('ha_mode', '集群')}]",
        })
        for i, item in enumerate(items):
            item_id = f"{rack_id}_{i}"
            nodes.append({
                'id': item_id,
                'type': 'device',
                'label': item,
            })
            # 设备到 zone 用同 rank 表达从属
            connections.append({
                'src': item_id, 'dst': rack_id,
                'label': '', 'style': 'dashed',
            })

    for c in crosses:
        connections.append({
            'src': c.get('from', ''),
            'dst': c.get('to', ''),
            'label': c.get('label', ''),
            'style': c.get('style', 'solid'),
        })

    return {'nodes': nodes, 'connections': connections}


# ═══════════════════════════════════════════════════════════════
# 统一入口
# ═══════════════════════════════════════════════════════════════

def render_uml_auto(diagram_type, output_png, business_module='', project_name=''):
    """统一入口：根据 diagram_type 自动生成对应 UML 图。

    Args:
        diagram_type: 类图/顺序图/活动图/状态图/部署图/类图（class）/顺序图（sequence）
                      /活动图（activity）/状态图（state）/部署图（deployment）
        output_png: PNG 输出路径
        business_module: 业务模块名（用于生成差异化内容）
        project_name: 项目名（用于标题）

    Returns:
        bool: 是否成功生成
    """
    if not _check_graphviz():
        return False

    dt = diagram_type.replace('图', '').lower()
    if dt in ('class', '类'):
        data = generate_class_diagram_data(business_module)
        return render_class_diagram(
            data['classes'], data['relations'], output_png, project_name
        )
    elif dt in ('sequence', '顺序'):
        data = generate_sequence_diagram_data(business_module)
        return render_sequence_diagram(
            data['actors'], data['messages'], output_png, project_name
        )
    elif dt in ('activity', '活动'):
        data = generate_activity_diagram_data(business_module)
        return render_activity_diagram(
            data['nodes'], data['transitions'], output_png, project_name
        )
    elif dt in ('state', '状态'):
        data = generate_state_diagram_data(business_module)
        return render_state_diagram(
            data['states'], data['transitions'], output_png, project_name
        )
    elif dt in ('deployment', '部署'):
        data = generate_deployment_diagram_data()
        return render_deployment_diagram(
            data['nodes'], data['connections'], output_png, project_name
        )
    return False


# ═══════════════════════════════════════════════════════════════
# CLI 入口
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python uml-renderer.py <type> <output.png> [business_module]')
        sys.exit(1)
    diagram_type = sys.argv[1]
    output = sys.argv[2]
    bm = sys.argv[3] if len(sys.argv) > 3 else ''
    success = render_uml_auto(diagram_type, output, bm)
    if not success:
        print(f'[FAIL] {diagram_type} 渲染失败（请检查 Graphviz 安装）', file=sys.stderr)
        sys.exit(2)
    print(f'[OK] {diagram_type} → {output}')
