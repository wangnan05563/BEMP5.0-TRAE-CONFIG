import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import os
import sys
import json

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

LAYER_COLORS = {
    '客户端层': '#E3F2FD',
    '接入层': '#FFF3E0',
    '前端应用层': '#F3E5F5',
    '后端服务层': '#E8F5E9',
    '服务治理层': '#FFFDE7',
    '缓存层': '#FFF9C4',
    '数据层': '#FCE4EC',
    '外部系统层': '#F5F5F5',
    '终端区': '#E3F2FD',
    'DMZ区': '#FFF3E0',
    '应用服务区': '#E8F5E9',
    '中间件区': '#FFFDE7',
    '数据存储区': '#FCE4EC',
    '外部专线区': '#F5F5F5',
    '应用服务器': '#E8F5E9',
    '前端服务器': '#F3E5F5',
    '缓存服务器': '#FFF9C4',
    '注册中心': '#FFFDE7',
    '数据库服务器': '#FCE4EC',
    '文件服务器': '#E3F2FD',
}

LAYER_BORDER_COLORS = {
    '客户端层': '#1565C0',
    '接入层': '#E65100',
    '前端应用层': '#6A1B9A',
    '后端服务层': '#2E7D32',
    '服务治理层': '#F57F17',
    '缓存层': '#F9A825',
    '数据层': '#C62828',
    '外部系统层': '#616161',
    '终端区': '#1565C0',
    'DMZ区': '#E65100',
    '应用服务区': '#2E7D32',
    '中间件区': '#F57F17',
    '数据存储区': '#C62828',
    '外部专线区': '#616161',
    '应用服务器': '#2E7D32',
    '前端服务器': '#6A1B9A',
    '缓存服务器': '#F9A825',
    '注册中心': '#F57F17',
    '数据库服务器': '#C62828',
    '文件服务器': '#1565C0',
}


def generate_architecture_diagram(output_path, project_name=None):
    """系统架构图 - 分层架构+组件交互箭头+数据流向"""
    fig, ax = plt.subplots(1, 1, figsize=(20, 16))
    ax.set_xlim(0, 20)
    ax.set_ylim(0, 16)
    ax.axis('off')
    ax.set_title(f'{project_name} 系统架构图', fontsize=20, fontweight='bold', pad=25)

    layers = [
        ('客户端层', ['Chrome浏览器', 'IE11+浏览器', 'Edge浏览器'], 14.0),
        ('接入层', ['Nginx主节点', 'Nginx备节点'], 12.2),
        ('前端应用层', ['Vue.js SPA', 'Element UI', 'Axios HTTP'], 10.4),
        ('后端服务层', ['sm系统管理', 'pc公共', 'bm业务管理', 'ce票据承兑',
                     'pe票据到期', 'be场内交易', 'pl场所管理', 'pb担保管理',
                     'cs渠道管理', 'tk任务调度', 'shcpe票交所对接', 'conf配置管理'], 7.6),
        ('服务治理层', ['Dubbo RPC', 'ZooKeeper注册', 'Spring Boot'], 5.4),
        ('缓存层', ['Redis Sentinel×3'], 3.8),
        ('数据层', ['Oracle主库', 'Oracle从库', 'MySQL'], 2.2),
        ('外部系统层', ['票交所ECDS/CPES', '核心银行系统', 'ECIF', '信贷系统'], 0.4),
    ]

    # 绘制分层结构
    layer_centers = {}
    for layer_name, items, y_pos in layers:
        bg_color = LAYER_COLORS.get(layer_name, '#F5F5F5')
        border_color = LAYER_BORDER_COLORS.get(layer_name, '#616161')

        layer_rect = FancyBboxPatch(
            (0.5, y_pos - 0.5), 19, 1.3,
            boxstyle="round,pad=0.05",
            facecolor=bg_color, edgecolor=border_color, linewidth=1.5,
            alpha=0.8
        )
        ax.add_patch(layer_rect)

        ax.text(0.8, y_pos + 0.55, layer_name, fontsize=11, fontweight='bold',
                color=border_color, va='top')

        if layer_name == '后端服务层':
            n = len(items)
            cols = 4
            for idx, item in enumerate(items):
                row = idx // cols
                col = idx % cols
                x = 2.2 + col * 4.2
                y = y_pos + 0.2 - row * 0.45
                item_box = FancyBboxPatch(
                    (x - 0.1, y - 0.16), 3.7, 0.36,
                    boxstyle="round,pad=0.03",
                    facecolor='white', edgecolor=border_color, linewidth=0.8
                )
                ax.add_patch(item_box)
                ax.text(x + 1.75, y + 0.02, item, fontsize=8, ha='center', va='center')
                layer_centers[item] = (x + 1.75, y + 0.02)
        else:
            n = len(items)
            total_width = 17.5
            item_width = min(4.5, total_width / n)
            start_x = 1.2 + (total_width - n * item_width) / 2
            for idx, item in enumerate(items):
                x = start_x + idx * item_width
                item_box = FancyBboxPatch(
                    (x, y_pos - 0.25), item_width - 0.2, 0.5,
                    boxstyle="round,pad=0.03",
                    facecolor='white', edgecolor=border_color, linewidth=0.8
                )
                ax.add_patch(item_box)
                ax.text(x + (item_width - 0.2) / 2, y_pos, item,
                        fontsize=8, ha='center', va='center')

    # 差异化：增加组件间交互箭头和数据流向（左侧标注调用协议，右侧标注数据流）
    arrow_props = dict(arrowstyle='->', color='#424242', lw=1.3)
    flow_labels = [
        (10.0, 15.3, 10.0, 12.85, 'HTTPS/TLS', '#1565C0'),
        (10.0, 11.6, 10.0, 11.05, '静态资源', '#6A1B9A'),
        (10.0, 9.7, 10.0, 9.05, 'HTTP/REST API', '#2E7D32'),
        (10.0, 7.0, 10.0, 5.95, 'Dubbo RPC', '#F57F17'),
        (10.0, 4.9, 10.0, 4.35, 'Jedis/Sentinel', '#F9A825'),
        (10.0, 3.3, 10.0, 2.75, 'MyBatis/JDBC', '#C62828'),
    ]
    for x1, y1, x2, y2, label, color in flow_labels:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(
            arrowstyle='->', color=color, lw=1.5, connectionstyle='arc3,rad=0'))
        ax.text(x1 - 0.3, (y1 + y2) / 2, label, fontsize=7, color=color,
                va='center', ha='right', fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.15', facecolor='white', edgecolor=color, alpha=0.9))

    # 差异化：右侧增加双向交互箭头（请求/响应）
    bidir_flows = [
        (18.0, 14.0, 18.0, 12.2, '请求→\n←响应', '#1565C0'),
        (18.0, 10.4, 18.0, 7.6, 'API调用→\n←JSON数据', '#2E7D32'),
        (18.0, 5.4, 18.0, 3.8, '缓存读写→\n←命中/穿透', '#F9A825'),
    ]
    for x1, y1, x2, y2, label, color in bidir_flows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='<->', color=color, lw=1.2, linestyle='dashed'))
        ax.text(x1 + 0.3, (y1 + y2) / 2, label, fontsize=6, color=color,
                va='center', ha='left', fontweight='bold')

    # 差异化：增加外部系统交互标注
    ax.annotate('', xy=(16.5, 1.1), xytext=(16.5, 1.7),
                arrowprops=dict(arrowstyle='<->', color='#9E9E9E', lw=1.0, linestyle='dotted'))
    ax.text(17.0, 1.4, 'MQ/专线\n双向通信', fontsize=7, color='#757575', va='center')

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return output_path


def generate_network_diagram(output_path, project_name=None):
    """网络拓扑图 - 真正的网络拓扑布局，含路由器/交换机/VLAN/IP段"""
    fig, ax = plt.subplots(1, 1, figsize=(20, 14))
    ax.set_xlim(0, 20)
    ax.set_ylim(0, 14)
    ax.axis('off')
    ax.set_title(f'{project_name} 网络拓扑图', fontsize=20, fontweight='bold', pad=25)

    # 差异化：使用网络设备图标而非简单矩形框
    def draw_router(ax, x, y, label, color='#E65100'):
        """绘制路由器图标（圆形+十字）"""
        circle = Circle((x, y), 0.35, facecolor='#FFF3E0', edgecolor=color, linewidth=2.0)
        ax.add_patch(circle)
        ax.plot([x - 0.2, x + 0.2], [y, y], color=color, linewidth=1.5)
        ax.plot([x, x], [y - 0.2, y + 0.2], color=color, linewidth=1.5)
        ax.text(x, y - 0.55, label, fontsize=7, ha='center', va='top', color=color, fontweight='bold')

    def draw_switch(ax, x, y, label, color='#1565C0'):
        """绘制交换机图标（矩形+箭头）"""
        rect = FancyBboxPatch((x - 0.4, y - 0.2), 0.8, 0.4,
                              boxstyle="round,pad=0.03",
                              facecolor='#E3F2FD', edgecolor=color, linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x, y, '<->', fontsize=8, ha='center', va='center', color=color)
        ax.text(x, y - 0.4, label, fontsize=7, ha='center', va='top', color=color, fontweight='bold')

    def draw_firewall(ax, x1, x2, y, label='FW'):
        """绘制防火墙（锯齿线）"""
        import numpy as np
        xs = np.linspace(x1, x2, 40)
        ys = y + 0.1 * np.sin(np.linspace(0, 6 * np.pi, 40))
        ax.plot(xs, ys, color='#D32F2F', linewidth=2.0, alpha=0.8)
        ax.text(x2 + 0.3, y, label, fontsize=8, ha='left', va='center',
                color='#D32F2F', fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.1', facecolor='#FFEBEE', edgecolor='#D32F2F'))

    # VLAN分区（使用不同底色和虚线边框区分）
    vlan_zones = [
        ('VLAN10 终端区', 0.3, 11.5, 19.4, 2.0, '#E3F2FD', '#1565C0', '10.0.10.0/24'),
        ('VLAN20 DMZ区', 0.3, 9.0, 19.4, 2.0, '#FFF3E0', '#E65100', '10.0.20.0/24'),
        ('VLAN30 应用区', 0.3, 6.0, 19.4, 2.5, '#E8F5E9', '#2E7D32', '10.0.30.0/24'),
        ('VLAN40 中间件区', 0.3, 3.5, 19.4, 2.0, '#FFFDE7', '#F57F17', '10.0.40.0/24'),
        ('VLAN50 数据区', 0.3, 1.2, 19.4, 1.8, '#FCE4EC', '#C62828', '10.0.50.0/24'),
    ]

    for zone_name, x, y, w, h, bg, border, ip_segment in vlan_zones:
        zone_rect = FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.08",
            facecolor=bg, edgecolor=border, linewidth=2.0, linestyle='--',
            alpha=0.5
        )
        ax.add_patch(zone_rect)
        ax.text(x + 0.3, y + h - 0.3, zone_name, fontsize=10, fontweight='bold',
                color=border, va='top')
        ax.text(x + w - 0.3, y + h - 0.3, ip_segment, fontsize=8,
                color=border, va='top', ha='right', fontstyle='italic')

    # 终端区设备
    terminals = [('PC终端A', 3, 12.5), ('PC终端B', 7, 12.5), ('管理员终端', 11, 12.5)]
    for label, x, y in terminals:
        box = FancyBboxPatch((x - 0.8, y - 0.25), 1.6, 0.5,
                             boxstyle="round,pad=0.03",
                             facecolor='white', edgecolor='#1565C0', linewidth=1.0)
        ax.add_patch(box)
        ax.text(x, y, label, fontsize=8, ha='center', va='center')

    # DMZ区 - 路由器和负载均衡
    draw_router(ax, 5, 10.3, '核心路由器')
    draw_switch(ax, 10, 10.3, '核心交换机')
    lb_items = [('Nginx主(SSL)', 14, 10.3), ('Nginx备(SSL)', 17, 10.3)]
    for label, x, y in lb_items:
        box = FancyBboxPatch((x - 1.0, y - 0.25), 2.0, 0.5,
                             boxstyle="round,pad=0.03",
                             facecolor='white', edgecolor='#E65100', linewidth=1.0)
        ax.add_patch(box)
        ax.text(x, y, label, fontsize=8, ha='center', va='center')

    # 应用区 - 微服务集群
    app_clusters = [
        ('Spring Boot集群', 4, 7.5, ['sm系统管理', 'pc公共', 'bm业务管理', 'ce票据承兑']),
        ('交易服务集群', 12, 7.5, ['be场内交易', 'pl场所管理', 'pe票据到期', 'pb担保管理']),
        ('渠道/调度集群', 17, 7.5, ['cs渠道管理', 'tk任务调度', 'shcpe票交所', 'conf配置']),
    ]
    for cluster_name, cx, cy, services in app_clusters:
        cluster_box = FancyBboxPatch((cx - 2.0, cy - 1.0), 4.0, 2.0,
                                     boxstyle="round,pad=0.05",
                                     facecolor='white', edgecolor='#2E7D32', linewidth=1.5)
        ax.add_patch(cluster_box)
        ax.text(cx, cy + 0.7, cluster_name, fontsize=9, ha='center', va='center',
                fontweight='bold', color='#2E7D32')
        for idx, svc in enumerate(services):
            sy = cy + 0.2 - idx * 0.35
            ax.text(cx, sy, f'- {svc}', fontsize=7, ha='center', va='center', color='#424242')

    # 中间件区
    mw_items = [
        ('Redis Sentinel×3', 5, 4.5, '#F9A825'),
        ('ZooKeeper×3', 10, 4.5, '#F57F17'),
        ('Dubbo Admin', 15, 4.5, '#FF8F00'),
    ]
    for label, x, y, color in mw_items:
        box = FancyBboxPatch((x - 1.5, y - 0.3), 3.0, 0.6,
                             boxstyle="round,pad=0.03",
                             facecolor='white', edgecolor=color, linewidth=1.2)
        ax.add_patch(box)
        ax.text(x, y, label, fontsize=8, ha='center', va='center', fontweight='bold')

    # 数据区
    db_items = [
        ('Oracle主库', 3, 2.1, '#C62828'),
        ('Oracle从库1', 7, 2.1, '#C62828'),
        ('Oracle从库2', 11, 2.1, '#C62828'),
        ('MySQL', 15, 2.1, '#1565C0'),
    ]
    for label, x, y, color in db_items:
        # 差异化：数据库用圆柱体图标
        from matplotlib.patches import Ellipse
        cylinder_body = FancyBboxPatch((x - 0.8, y - 0.25), 1.6, 0.5,
                                       boxstyle="round,pad=0.03",
                                       facecolor='white', edgecolor=color, linewidth=1.2)
        ax.add_patch(cylinder_body)
        top_ellipse = Ellipse((x, y + 0.25), 1.6, 0.2, facecolor='white', edgecolor=color, linewidth=1.0)
        ax.add_patch(top_ellipse)
        ax.text(x, y, label, fontsize=7, ha='center', va='center', fontweight='bold')

    # 防火墙
    draw_firewall(ax, 1.0, 19.0, 11.3, 'FW-1')
    draw_firewall(ax, 1.0, 19.0, 8.8, 'FW-2')
    draw_firewall(ax, 1.0, 19.0, 5.8, 'FW-3')
    draw_firewall(ax, 1.0, 19.0, 3.3, 'FW-4')

    # 外部系统（底部）
    ext_box = FancyBboxPatch((0.5, 0.2), 19, 0.8,
                             boxstyle="round,pad=0.05",
                             facecolor='#F5F5F5', edgecolor='#616161', linewidth=1.5, linestyle='dashed')
    ax.add_patch(ext_box)
    ext_items = ['票交所ECDS/CPES', '核心银行系统', 'ECIF客户系统', '信贷系统']
    for idx, item in enumerate(ext_items):
        x = 3 + idx * 4.2
        ax.text(x, 0.6, item, fontsize=8, ha='center', va='center', color='#616161')
    ax.text(1.0, 0.6, '外部专线:', fontsize=8, ha='left', va='center', color='#616161', fontweight='bold')

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return output_path


def generate_deployment_diagram(output_path, project_name=None):
    """部署架构图 - 服务器机架视图+集群标识+高可用连线

    关键修复(2026-06-06)：从 deployment-style.yaml 加载配置，
    杜绝硬编码的 figsize/rack 数/items/连线。
    """
    import yaml
    cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deployment-style.yaml')
    try:
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = yaml.safe_load(f) or {}
    except Exception as e:
        print(f'[WARN] 加载 deployment-style.yaml 失败: {e}', file=sys.stderr)
        cfg = {}

    style = cfg.get('diagram_style', {}).get('deployment', {})
    figsize = tuple(style.get('figsize', [12, 7.5]))
    rack_w = style.get('rack_width', 4.5)
    rack_h = style.get('rack_height', 2.8)
    title_fs = style.get('title_fontsize', 18)
    item_fs = style.get('item_fontsize', 8)
    ha_fs = style.get('ha_mode_fontsize', 7)

    colors = cfg.get('diagram_style', {}).get('colors', {})
    ha_color_map = cfg.get('ha_mode_color', {})

    racks = cfg.get('default_racks', [])
    crosses = cfg.get('cross_connections', [])

    n_racks = max(len(racks), 1)
    # 动态计算画布尺寸（机架越多越宽）
    fig_w = max(figsize[0], rack_w * n_racks * 0.6 + 2)
    fig_h = max(figsize[1], rack_h * 1.2 + 1.5)
    fig, ax = plt.subplots(1, 1, figsize=(fig_w, fig_h))
    ax.set_xlim(0, fig_w)
    ax.set_ylim(0, fig_h)
    ax.axis('off')
    ax.set_title(f'{project_name or "系统"} 部署架构图',
                 fontsize=title_fs, fontweight='bold', pad=25)

    col_w = fig_w / n_racks
    ha_color_map_full = {
        '集群': ha_color_map.get('集群', '#2E7D32'),
        '主备': ha_color_map.get('主备', '#E65100'),
        '主从': ha_color_map.get('主从', '#6A1B9A'),
        '单点': ha_color_map.get('单点', '#9E9E9E'),
    }

    rack_centers = {}
    for idx, r in enumerate(racks):
        title = r.get('title', f'机架{idx+1}')
        category = r.get('category', '应用服务器')
        ha_mode = r.get('ha_mode', '集群')
        items = r.get('items', [])

        x0 = idx * col_w + 0.3
        y0 = 1.0
        w = col_w - 0.6
        h = fig_h - 2.0

        bg = colors.get(category, colors.get('应用服务器', '#E8F5E9'))
        ha_color = ha_color_map_full.get(ha_mode, '#2E7D32')

        rack = FancyBboxPatch(
            (x0, y0), w, h,
            boxstyle="round,pad=0.08",
            facecolor=bg, edgecolor=ha_color, linewidth=2.5,
            alpha=0.65
        )
        ax.add_patch(rack)

        ax.text(x0 + w/2, y0 + h - 0.25, title,
                ha='center', va='top',
                fontsize=item_fs + 1.5, fontweight='bold', color='#212121')

        ax.text(x0 + 0.2, y0 + h - 0.55, f'【{ha_mode}】',
                ha='left', va='top',
                fontsize=ha_fs, fontweight='bold',
                color='white', bbox=dict(
                    boxstyle='round,pad=0.2',
                    facecolor=ha_color, edgecolor=ha_color, alpha=0.9))

        for j, item in enumerate(items):
            item_y = y0 + h - 0.9 - j * 0.28
            if item_y < y0 + 0.1:
                break
            ax.text(x0 + 0.15, item_y, f'• {item}',
                    ha='left', va='top', fontsize=item_fs, color='#212121')

        rack_centers[title] = (x0 + w/2, y0 + h/2)

    # 跨机架连线
    for c in crosses:
        src_title = c.get('from', '')
        dst_title = c.get('to', '')
        if src_title not in rack_centers or dst_title not in rack_centers:
            continue
        x1, y1 = rack_centers[src_title]
        x2, y2 = rack_centers[dst_title]
        color = c.get('color', '#1565C0')
        label = c.get('label', '')
        line_style = '-' if c.get('style', 'solid') == 'solid' else '--'
        ax.annotate(
            '', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle='->', color=color,
                            linestyle=line_style, linewidth=1.5, alpha=0.7)
        )
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my + 0.15, label, ha='center', va='center',
                fontsize=item_fs, color=color, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='white',
                          edgecolor=color, alpha=0.9))

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return output_path


if __name__ == '__main__':
    output_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    project_name = sys.argv[2] if len(sys.argv) > 2 else 'BEMP'

    os.makedirs(output_dir, exist_ok=True)

    arch_path = os.path.join(output_dir, 'architecture-diagram.png')
    net_path = os.path.join(output_dir, 'network-topology.png')
    deploy_path = os.path.join(output_dir, 'deployment-diagram.png')

    generate_architecture_diagram(arch_path, project_name)
    print(f'架构图: {arch_path}')

    generate_network_diagram(net_path, project_name)
    print(f'网络拓扑图: {net_path}')

    generate_deployment_diagram(deploy_path, project_name)
    print(f'部署架构图: {deploy_path}')

    result = {
        'architecture': arch_path,
        'network': net_path,
        'deployment': deploy_path,
    }
    print(json.dumps(result, ensure_ascii=False))
