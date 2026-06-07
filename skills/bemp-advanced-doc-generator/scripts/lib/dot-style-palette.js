/**
 * Graphviz DOT 风格与布局模板库
 *
 * 设计目标：
 * - 行业标准配色：参考 IBM Carbon、Material Design、PlantUML 默认主题
 * - 5 种图表（类图/顺序图/活动图/业务流程图/时序图）各有专业模板
 * - 字体优先级：SimHei/Microsoft YaHei/Arial（中文优先）
 * - 节点形状遵循 UML 2.5 规范
 *
 * 不硬编码业务：所有节点名/字段/消息均由调用方传入
 */

// =====================================================================
// 配色方案 - 行业标准色板
// =====================================================================

/**
 * 浅色专业主题（默认）
 * - 背景：纯白
 * - 边框：#1F2937（深石板灰）
 * - 字体：#1F2937
 * - 强调色：#1976D2（IBM蓝）
 */
const PALETTE_LIGHT = {
    background: '#FFFFFF',
    border: '#1F2937',
    text: '#1F2937',
    textMuted: '#6B7280',
    font: 'Microsoft YaHei,SimHei,Arial,sans-serif',

    // 类图配色（UML 2.5 标准三段式）
    class: {
        classNameBg: '#DBEAFE',       // 淡蓝 - 类名段
        attributeBg: '#FFFFFF',        // 白 - 属性段
        methodBg: '#F0F9FF',           // 极淡蓝 - 方法段
        border: '#1E40AF',             // 深蓝边框
        abstract: '#7C3AED',           // 紫色 - 抽象类
        interface: '#059669',          // 绿色 - 接口
        stereotype: '#6B7280',         // 灰 - 构造型
    },

    // 顺序图配色（PlantUML 默认主题）
    sequence: {
        actorBg: '#FFE0B2',            // 橙色 - 参与者
        actorBorder: '#E65100',
        lifeline: '#9E9E9E',           // 灰 - 生命线
        message: '#1F2937',            // 深 - 同步消息
        returnMsg: '#6B7280',          // 灰 - 返回消息
        asyncMsg: '#7C3AED',           // 紫 - 异步消息
        selfMsg: '#059669',            // 绿 - 自调用
        activation: '#FEF3C7',         // 淡黄 - 激活条
        note: '#FEF9C3',               // 淡黄 - 注释
    },

    // 活动图配色（UML Activity Diagram）
    activity: {
        startEnd: '#10B981',           // 绿 - 开始/结束
        startEndBorder: '#047857',
        action: '#DBEAFE',             // 淡蓝 - 操作
        actionBorder: '#1E40AF',
        decision: '#FEF3C7',           // 淡黄 - 判断
        decisionBorder: '#B45309',
        fork: '#1F2937',               // 黑 - 分叉/汇合
        swimlane: '#F3F4F6',           // 浅灰 - 泳道
    },

    // 业务流程图配色（带角色泳道）
    businessFlow: {
        lane1: '#EFF6FF',              // 极淡蓝 - 角色1
        lane2: '#F0FDF4',              // 极淡绿 - 角色2
        lane3: '#FFF7ED',              // 极淡橙 - 角色3
        lane4: '#FAF5FF',              // 极淡紫 - 角色4
        taskBg: '#FFFFFF',             // 白 - 任务
        taskBorder: '#1E40AF',
        gateway: '#FEF3C7',            // 淡黄 - 网关
        startEnd: '#10B981',
    },

    // 时序图配色（基于时间轴）
    timing: {
        state0: '#10B981',             // 绿 - 状态0（激活）
        state1: '#9CA3AF',             // 灰 - 状态1（空闲）
        state2: '#3B82F6',             // 蓝 - 状态2
        transition: '#1F2937',
        timeAxis: '#1F2937',
    },

    // 边（关系）配色
    edge: {
        inheritance: '#1E40AF',        // 深蓝 - 泛化
        implementation: '#059669',     // 绿 - 实现
        association: '#1F2937',        // 黑 - 关联
        aggregation: '#7C3AED',        // 紫 - 聚合
        composition: '#DC2626',        // 红 - 组合
        dependency: '#6B7280',         // 灰 - 依赖
        flow: '#1F2937',               // 黑 - 控制流
    },

    // 网络拓扑图配色（VLAN/网络设备区分）
    network: {
        router: '#FEF3C7',             // 淡黄 - 路由器
        routerBorder: '#B45309',
        switch: '#DBEAFE',             // 淡蓝 - 交换机
        switchBorder: '#1E40AF',
        firewall: '#FEE2E2',           // 淡红 - 防火墙
        firewallBorder: '#DC2626',
        server: '#F0FDF4',             // 淡绿 - 服务器
        serverBorder: '#15803D',
        database: '#FAF5FF',           // 淡紫 - 数据库
        databaseBorder: '#7C3AED',
        internet: '#FFFFFF',           // 白 - 互联网/外部
        internetBorder: '#1F2937',
        vlan1: '#EFF6FF',              // 极淡蓝 - VLAN1
        vlan2: '#F0FDF4',              // 极淡绿 - VLAN2
        vlan3: '#FFF7ED',              // 极淡橙 - VLAN3
        vlan4: '#FAF5FF',              // 极淡紫 - VLAN4
        vlan5: '#FEF9C3',              // 极淡黄 - VLAN5
        link: '#6B7280',               // 灰 - 物理链路
        virtualLink: '#7C3AED',        // 紫 - 虚拟链路
    },

    // 部署图配色（机架/HA集群）
    deployment: {
        rack: '#F3F4F6',               // 浅灰 - 机柜背景
        rackBorder: '#1F2937',
        node: '#DBEAFE',               // 淡蓝 - 普通节点
        nodeBorder: '#1E40AF',
        activeNode: '#10B981',         // 绿 - Active 节点
        activeNodeBorder: '#047857',
        standbyNode: '#FEF3C7',        // 淡黄 - Standby 节点
        standbyNodeBorder: '#B45309',
        loadbalancer: '#FAF5FF',       // 淡紫 - 负载均衡
        loadbalancerBorder: '#7C3AED',
        sharedStorage: '#FEE2E2',      // 淡红 - 共享存储
        sharedStorageBorder: '#DC2626',
        client: '#FFFFFF',             // 白 - 客户端
        clientBorder: '#1F2937',
        heartbeat: '#DC2626',          // 红 - 心跳线
        replication: '#7C3AED',        // 紫 - 数据复制
    }
};

/**
 * 深色主题（备用）
 */
const PALETTE_DARK = {
    ...PALETTE_LIGHT,
    background: '#1F2937',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    border: '#F3F4F6',
};

// =====================================================================
// 5种图表的DOT头部（Graphviz 属性）
// =====================================================================

/**
 * 通用 DOT 图属性
 * @param {string} title - 图标题
 * @param {object} opts - { rankdir, bgcolor, splines, nodesep, ranksep, dpi }
 */
function buildGraphHeader(title, opts = {}) {
    const bg = opts.bgcolor || PALETTE_LIGHT.background;
    const font = PALETTE_LIGHT.font;
    const rankdir = opts.rankdir || 'TB';
    const splines = opts.splines || 'spline';  // 平滑曲线
    const nodesep = opts.nodesep || 0.6;
    const ranksep = opts.ranksep || 0.8;
    const dpi = opts.dpi || 110;
    const fontSize = opts.fontSize || 13;

    return [
        `// Generated by BEMP bemp-advanced-doc-generator graphviz-generator`,
        `// 标题: ${_safe(title)}`,
        `digraph G {`,
        `  graph [`,
        `    rankdir=${rankdir},`,
        `    bgcolor="${bg}",`,
        `    splines=${splines},`,
        `    nodesep=${nodesep},`,
        `    ranksep=${ranksep},`,
        `    dpi=${dpi},`,
        `    fontname="${font}",`,
        `    fontcolor="${PALETTE_LIGHT.text}",`,
        `    label="${_safe(title || '')}",`,
        `    labelloc="t",`,
        `    fontsize=${fontSize + 2},`,
        `    pad="0.5,0.5"`,
        `  ];`,
        `  node [`,
        `    fontname="${font}",`,
        `    fontsize=${fontSize},`,
        `    fontcolor="${PALETTE_LIGHT.text}",`,
        `    color="${PALETTE_LIGHT.border}"`,
        `  ];`,
        `  edge [`,
        `    fontname="${font}",`,
        `    fontsize=${fontSize - 1},`,
        `    fontcolor="${PALETTE_LIGHT.text}",`,
        `    color="${PALETTE_LIGHT.border}"`,
        `  ];`,
    ].join('\n');
}

/**
 * DOT 图结束
 */
function buildGraphFooter() {
    return '}\n';
}

// =====================================================================
// 类图模板（UML 2.5 Class Diagram）
// =====================================================================

/**
 * 生成类图DOT代码
 * @param {Array} classes - [{name, stereotype, attributes:[{name,type,visibility}], methods:[{name,params,returnType,visibility}], abstract}]
 * @param {Array} relations - [{from, to, type: 'inheritance'|'implementation'|'association'|'aggregation'|'composition'|'dependency', label, fromMultiplicity, toMultiplicity}]
 * @param {object} opts - { title, rankdir }
 * @returns {string} DOT代码
 */
function buildClassDiagram(classes, relations = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '类图', { rankdir: opts.rankdir || 'TB', ...opts })];
    const palette = PALETTE_LIGHT.class;
    const edgePalette = PALETTE_LIGHT.edge;

    // 1. 类节点
    const classNames = new Set();
    for (const c of classes || []) {
        if (!c || !c.name) continue;
        if (classNames.has(c.name)) continue;
        classNames.add(c.name);

        const isAbstract = c.abstract || (c.stereotype && /abstract/i.test(c.stereotype));
        const isInterface = c.stereotype === 'interface' || c.stereotype === '«interface»';
        const stereotypeLabel = c.stereotype ? `\\n\\n«${_safe(c.stereotype)}»` : '';
        const titleColor = isInterface ? palette.interface : (isAbstract ? palette.abstract : PALETTE_LIGHT.text);

        lines.push(`  "${_safe(c.name)}" [`);
        lines.push(`    shape=plain,`);
        lines.push(`    label=<`);
        lines.push(`      <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="${palette.border}">`);
        // 类名段（带背景色）
        lines.push(`        <TR><TD COLSPAN="2" BGCOLOR="${palette.classNameBg}" COLOR="${titleColor}"><B><FONT POINT-SIZE="14">${_safe(c.name)}</FONT></B>${stereotypeLabel}</TD></TR>`);

        // 属性段
        const attrs = c.attributes || [];
        if (attrs.length > 0) {
            for (const a of attrs) {
                const visSym = _visibilitySymbol(a.visibility);
                const attrType = a.type ? `: ${_safe(a.type)}` : '';
                lines.push(`        <TR><TD ALIGN="LEFT" BGCOLOR="${palette.attributeBg}"><FONT COLOR="${PALETTE_LIGHT.textMuted}">${visSym}</FONT> ${_safe(a.name || 'attr')}${attrType}</TD></TR>`);
            }
        } else if (opts.showEmpty) {
            lines.push(`        <TR><TD ALIGN="LEFT" BGCOLOR="${palette.attributeBg}" COLOR="${PALETTE_LIGHT.textMuted}"><I>（无属性）</I></TD></TR>`);
        }

        // 方法段
        const methods = c.methods || [];
        if (methods.length > 0) {
            for (const m of methods) {
                const visSym = _visibilitySymbol(m.visibility);
                const params = (m.params || []).map(p => `${_safe(p.name || 'arg')}: ${_safe(p.type || 'String')}`).join(', ');
                const retType = m.returnType ? `: ${_safe(m.returnType)}` : '';
                const mName = m.abstract ? `<I>${_safe(m.name || 'method')}</I>` : _safe(m.name || 'method');
                lines.push(`        <TR><TD ALIGN="LEFT" BGCOLOR="${palette.methodBg}"><FONT COLOR="${PALETTE_LIGHT.textMuted}">${visSym}</FONT> ${mName}(${params})${retType}</TD></TR>`);
            }
        } else if (opts.showEmpty) {
            lines.push(`        <TR><TD ALIGN="LEFT" BGCOLOR="${palette.methodBg}" COLOR="${PALETTE_LIGHT.textMuted}"><I>（无方法）</I></TD></TR>`);
        }

        lines.push(`      </TABLE>`);
        lines.push(`    >`);
        lines.push(`  ];`);
    }

    // 2. 关系边
    for (const r of relations || []) {
        if (!r || !r.from || !r.to) continue;
        if (!classNames.has(r.from) || !classNames.has(r.to)) continue;
        const style = _relationStyle(r.type || 'association', edgePalette);
        const label = r.label ? `label="${_safe(r.label)}",` : '';
        const fromMult = r.fromMultiplicity ? `taillabel="${_safe(r.fromMultiplicity)}",` : '';
        const toMult = r.toMultiplicity ? `headlabel="${_safe(r.toMultiplicity)}",` : '';
        const styleAttrs = [
            `color="${style.color}"`,
            `style="${style.style}"`,
            `arrowhead=${style.arrowhead}`,
            `arrowtail=${style.arrowtail}`,
            `penwidth=1.2`,
        ].join(', ');
        lines.push(`  "${_safe(r.from)}" -> "${_safe(r.to)}" [${label} ${fromMult} ${toMult} ${styleAttrs}];`);
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 顺序图模板（Sequence Diagram）
// =====================================================================

/**
 * 生成顺序图DOT代码
 *
 * 实现策略：用 subgraph + rank=same 模拟参与者头部；用 invisible 边串联生命线
 * @param {Array} actors - [{id, label, type: 'user'|'system'|'database'|'external'}]
 * @param {Array} messages - [{from, to, label, type: 'sync'|'async'|'return'|'self', order}]
 * @param {Array} notes - [{at, text}]
 * @param {object} opts - { title }
 */
function buildSequenceDiagram(actors, messages, notes = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '顺序图', { rankdir: 'TB', nodesep: 0.3, ranksep: 0.4, splines: 'line', ...opts })];
    const palette = PALETTE_LIGHT.sequence;

    if (!actors || actors.length === 0) actors = [{ id: 'User', label: '用户' }, { id: 'System', label: '系统' }];

    // 1. 参与者节点
    lines.push('  // 参与者');
    for (const a of actors) {
        const fill = palette.actorBg;
        const border = palette.actorBorder;
        const type = a.type || 'user';
        let shape = 'box';
        if (type === 'database' || type === 'db') shape = 'cylinder';
        else if (type === 'external' || type === 'external_system') shape = 'component';
        lines.push(`  "${a.id}" [label="${_safe(a.label || a.id)}", shape=${shape}, style="filled,rounded", fillcolor="${fill}", color="${border}", fontsize=13, fontcolor="${PALETTE_LIGHT.text}"];`);
    }

    // 2. 生命线（用 invisible 节点）
    lines.push('  // 生命线');
    for (const a of actors) {
        const lifelineId = `_life_${a.id}`;
        lines.push(`  "${lifelineId}" [shape=point, width=0.01, height=0.01, style=invis];`);
    }

    // 3. 参与者 → 生命线（同 rank）
    for (const a of actors) {
        const lifelineId = `_life_${a.id}`;
        lines.push(`  { rank=same; "${a.id}"; "${lifelineId}"; }`);
    }

    // 4. 消息
    let msgOrder = 0;
    for (const m of messages || []) {
        msgOrder++;
        const type = m.type || 'sync';
        const isSelf = m.from === m.to;
        if (isSelf) {
            // 自调用：用 invisible 偏移模拟
            const fromId = m.from;
            const loopId = `_loop_${msgOrder}`;
            lines.push(`  "${loopId}" [shape=point, width=0.01, style=invis];`);
            lines.push(`  "${fromId}" -> "${loopId}" [label="${_safe(m.label || '')}", style=solid, color="${palette.message}", arrowhead=normal, fontsize=11, fontcolor="${palette.message}"];`);
            lines.push(`  "${loopId}" -> "${fromId}" [style=invis];`);
        } else {
            let color = palette.message;
            let style = 'solid';
            let arrowhead = 'normal';
            let fontColor = palette.message;
            if (type === 'return') {
                color = palette.returnMsg;
                style = 'dashed';
                fontColor = palette.returnMsg;
            } else if (type === 'async') {
                color = palette.asyncMsg;
                arrowhead = 'open';
                fontColor = palette.asyncMsg;
            }
            const fromLife = `"_life_${m.from}"`;
            const toLife = `"_life_${m.to}"`;
            const labelPart = m.label ? `label="${_safe(m.label)}",` : '';
            lines.push(`  ${fromLife} -> ${toLife} [${labelPart} color="${color}", style="${style}", arrowhead=${arrowhead}, fontsize=11, fontcolor="${fontColor}", penwidth=1.4];`);
        }
    }

    // 5. 注释
    for (const n of notes || []) {
        const lifelineId = `_life_${n.at}`;
        const noteId = `_note_${Math.random().toString(36).slice(2, 8)}`;
        lines.push(`  "${noteId}" [label="${_safe(n.text || '')}", shape=note, style=filled, fillcolor="${palette.note}", color="${PALETTE_LIGHT.border}", fontsize=10, fontcolor="${PALETTE_LIGHT.text}"];`);
        lines.push(`  "${lifelineId}" -> "${noteId}" [style=dotted, arrowhead=none, color="${PALETTE_LIGHT.textMuted}"];`);
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 活动图模板（UML Activity Diagram）
// =====================================================================

/**
 * 生成活动图DOT代码
 * @param {Array} nodes - [{id, label, type: 'start'|'action'|'decision'|'fork'|'end', branches?: [{label, target}]}]
 * @param {Array} edges - [{from, to, label}]
 * @param {object} opts - { title }
 */
function buildActivityDiagram(nodes, edges = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '活动图', { rankdir: 'TB', nodesep: 0.5, ranksep: 0.6, ...opts })];
    const palette = PALETTE_LIGHT.activity;

    // 1. 节点
    for (const n of nodes || []) {
        if (!n || !n.id) continue;
        const type = n.type || 'action';
        let shape, fill, border, fontSize = 13;
        if (type === 'start' || type === 'end') {
            shape = 'oval';
            fill = palette.startEnd;
            border = palette.startEndBorder;
            fontSize = 12;
        } else if (type === 'decision') {
            shape = 'diamond';
            fill = palette.decision;
            border = palette.decisionBorder;
        } else if (type === 'fork' || type === 'join') {
            shape = 'rectangle';
            fill = palette.fork;
            border = palette.fork;
            // fork/join 用粗矩形条
            lines.push(`  "${_safe(n.id)}" [label="${_safe(n.label || n.id)}", shape=rectangle, style="filled,bold", fillcolor="${fill}", color="${border}", width=0.3, height=0.05, fixedsize=true, fontsize=${fontSize}];`);
            continue;
        } else {
            shape = 'box';
            fill = palette.action;
            border = palette.actionBorder;
        }
        const styleExt = (type === 'start' || type === 'end') ? 'filled,rounded' : 'filled';
        lines.push(`  "${_safe(n.id)}" [label="${_safe(n.label || n.id)}", shape=${shape}, style="${styleExt}", fillcolor="${fill}", color="${border}", fontsize=${fontSize}];`);
    }

    // 2. 边
    for (const e of edges || []) {
        if (!e || !e.from || !e.to) continue;
        const label = e.label ? `label="${_safe(e.label)}",` : '';
        const fontColor = e.label ? `fontcolor="${PALETTE_LIGHT.textMuted}",` : '';
        lines.push(`  "${_safe(e.from)}" -> "${_safe(e.to)}" [${label} ${fontColor} color="${PALETTE_LIGHT.edge.flow}", arrowhead=normal, penwidth=1.2];`);
    }

    // 3. 判断分支（从节点.branches 自动生成）
    for (const n of nodes || []) {
        if ((n.type === 'decision') && Array.isArray(n.branches)) {
            for (const br of n.branches) {
                const label = br.label ? `label="${_safe(br.label)}",` : '';
                lines.push(`  "${_safe(n.id)}" -> "${_safe(br.target)}" [${label} color="${PALETTE_LIGHT.edge.flow}", style=dashed, arrowhead=normal, fontcolor="${PALETTE_LIGHT.textMuted}"];`);
            }
        }
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 业务流程图模板（带角色泳道）
// =====================================================================

/**
 * 生成业务流程图DOT代码（泳道图）
 * @param {Array} lanes - [{id, label, role, color?}]
 * @param {Array} tasks - [{id, label, lane, type?: 'task'|'gateway'|'start'|'end'}]
 * @param {Array} flows - [{from, to, label}]
 * @param {object} opts - { title }
 */
function buildBusinessFlowDiagram(lanes, tasks, flows = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '业务流程图', { rankdir: 'LR', nodesep: 0.4, ranksep: 0.7, ...opts })];
    const palette = PALETTE_LIGHT.businessFlow;

    // 1. 泳道（subgraph cluster）
    for (let i = 0; i < (lanes || []).length; i++) {
        const lane = lanes[i];
        const laneColor = lane.color || palette[`lane${(i % 4) + 1}`] || palette.lane1;
        lines.push(`  subgraph "cluster_${_safe(lane.id)}" {`);
        lines.push(`    label="${_safe(lane.label || lane.id)}";`);
        lines.push(`    style="filled,rounded";`);
        lines.push(`    fillcolor="${laneColor}";`);
        lines.push(`    color="${PALETTE_LIGHT.border}";`);
        lines.push(`    fontname="${PALETTE_LIGHT.font}";`);
        lines.push(`    fontsize=14;`);
        lines.push(`    fontcolor="${PALETTE_LIGHT.text}";`);
        lines.push(`    labeljust="l";`);
        lines.push(`    margin=18;`);
        // 泳道内的任务
        const laneTasks = (tasks || []).filter(t => t.lane === lane.id);
        for (const t of laneTasks) {
            const type = t.type || 'task';
            let shape, fill, border, fontSize = 12;
            if (type === 'start' || type === 'end') {
                shape = 'oval';
                fill = palette.startEnd;
                border = '#047857';
            } else if (type === 'gateway') {
                shape = 'diamond';
                fill = palette.gateway;
                border = '#B45309';
            } else {
                shape = 'box';
                fill = palette.taskBg;
                border = palette.taskBorder;
            }
            const styleExt = (type === 'start' || type === 'end') ? 'filled,rounded' : 'filled';
            lines.push(`    "${_safe(t.id)}" [label="${_safe(t.label || t.id)}", shape=${shape}, style="${styleExt}", fillcolor="${fill}", color="${border}", fontsize=${fontSize}];`);
        }
        lines.push(`  }`);
    }

    // 2. 流程连线（横跨泳道）
    for (const f of flows || []) {
        if (!f || !f.from || !f.to) continue;
        const label = f.label ? `label="${_safe(f.label)}",` : '';
        const fontColor = f.label ? `fontcolor="${PALETTE_LIGHT.textMuted}",` : '';
        lines.push(`  "${_safe(f.from)}" -> "${_safe(f.to)}" [${label} ${fontColor} color="${PALETTE_LIGHT.edge.flow}", arrowhead=normal, penwidth=1.4, constraint=true];`);
    }

    // 3. 强制泳道横向对齐（rank=same）
    for (const lane of lanes || []) {
        const laneTasks = (tasks || []).filter(t => t.lane === lane.id);
        if (laneTasks.length > 0) {
            const ids = laneTasks.map(t => `"${_safe(t.id)}"`).join('; ');
            lines.push(`  { rank=same; ${ids} }`);
        }
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 时序图模板（Timing Diagram - 基于时间轴）
// =====================================================================

/**
 * 生成时序图DOT代码（UML Timing Diagram）
 *
 * 区别于顺序图：时序图强调"状态随时间变化"，横轴是时间
 * @param {Array} participants - [{id, label, states: [{from: 0, to: 5, state: 'idle'|'active'|'waiting'}]}]
 * @param {Array} timeMarkers - [{time, label, event?}]
 * @param {object} opts - { title, maxTime }
 */
function buildTimingDiagram(participants, timeMarkers = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '时序图', { rankdir: 'LR', nodesep: 0.1, ranksep: 0.2, splines: 'line', ...opts })];
    const palette = PALETTE_LIGHT.timing;

    if (!participants || participants.length === 0) {
        lines.push(buildGraphFooter());
        return lines.join('\n');
    }

    // 1. 时间轴上的状态条
    for (const p of participants) {
        const stateColor = palette.state0;
        // 每个状态条作为一个节点
        const states = p.states || [];
        let prevId = null;
        for (let i = 0; i < states.length; i++) {
            const s = states[i];
            const stateId = `${_safe(p.id)}_s${i}`;
            const labelText = s.state || 'state';
            const width = (s.to - s.from) * 1.0;
            const color = (s.state === 'active' || s.state === '激活') ? palette.state0 :
                          (s.state === 'waiting' || s.state === '等待') ? palette.state2 :
                          palette.state1;
            lines.push(`  "${stateId}" [label="${_safe(labelText)}", shape=rect, style="filled,bold", fillcolor="${color}", color="${color}", width=${width.toFixed(2)}, height=0.4, fixedsize=true, fontsize=10, fontcolor="#FFFFFF"];`);

            if (prevId) {
                lines.push(`  "${prevId}" -> "${stateId}" [style=invis];`);
            } else {
                // 第一段，连接到参与者标签
                lines.push(`  "${_safe(p.id)}_head" -> "${stateId}" [style=invis];`);
            }
            prevId = stateId;
        }

        // 参与者标签
        lines.push(`  "${_safe(p.id)}_head" [label="${_safe(p.label || p.id)}", shape=plaintext, fontsize=12, fontcolor="${PALETTE_LIGHT.text}"];`);
    }

    // 2. 时间标记
    for (const tm of timeMarkers || []) {
        const tmId = `_tm_${tm.time}`;
        lines.push(`  "${tmId}" [label="${_safe(tm.label || ('t=' + tm.time))}", shape=plaintext, fontsize=9, fontcolor="${PALETTE_LIGHT.textMuted}"];`);
        // 同一时间点所有参与者对齐（rank=same 隐含实现）
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 网络拓扑图模板（VLAN/网络设备/防火墙）
// =====================================================================

/**
 * 生成网络拓扑图DOT代码
 * @param {Array} zones - [{id, label, type: 'internet'|'dmz'|'intranet'|'vlan'|'cloud', color?}]
 * @param {Array} devices - [{id, label, type: 'router'|'switch'|'firewall'|'server'|'database'|'client', zone}]
 * @param {Array} links - [{from, to, label?, type: 'physical'|'virtual'}]
 * @param {object} opts - { title }
 */
function buildNetworkTopologyDiagram(zones, devices, links = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '网络拓扑图', { rankdir: 'TB', nodesep: 0.6, ranksep: 0.9, splines: 'spline', ...opts })];
    const palette = PALETTE_LIGHT.network;

    // 1. 安全区域/子网（用 cluster 模拟）
    for (let i = 0; i < (zones || []).length; i++) {
        const zone = zones[i];
        // VLAN/区域配色循环
        const defaultColor = palette[`vlan${(i % 5) + 1}`] || palette.vlan1;
        const fillColor = zone.color || defaultColor;
        lines.push(`  subgraph "cluster_zone_${_safe(zone.id)}" {`);
        lines.push(`    label="${_safe(zone.label || zone.id)}";`);
        lines.push(`    style="filled,rounded,dashed";`);
        lines.push(`    fillcolor="${fillColor}";`);
        lines.push(`    color="${PALETTE_LIGHT.border}";`);
        lines.push(`    fontname="${PALETTE_LIGHT.font}";`);
        lines.push(`    fontsize=14;`);
        lines.push(`    fontcolor="${PALETTE_LIGHT.text}";`);
        lines.push(`    labeljust="l";`);
        lines.push(`    margin=20;`);
        // 区域内的设备
        const zoneDevices = (devices || []).filter(d => d.zone === zone.id);
        for (const d of zoneDevices) {
            const type = d.type || 'switch';
            const paletteKey = type in palette ? type : 'switch';
            const fill = palette[paletteKey] || palette.switch;
            const border = palette[paletteKey + 'Border'] || palette.switchBorder;
            let shape = 'box';
            if (type === 'router') shape = 'octagon';
            else if (type === 'firewall') shape = 'hexagon';
            else if (type === 'switch') shape = 'box3d';
            else if (type === 'server') shape = 'box';
            else if (type === 'database') shape = 'cylinder';
            else if (type === 'client') shape = 'desktop';
            else if (type === 'internet') shape = 'cloud';
            lines.push(`    "${_safe(d.id)}" [label="${_safe(d.label || d.id)}", shape=${shape}, style="filled,rounded", fillcolor="${fill}", color="${border}", fontsize=12, fontcolor="${PALETTE_LIGHT.text}", penwidth=1.2];`);
        }
        lines.push(`  }`);
    }

    // 2. 物理/虚拟链路
    for (const l of links || []) {
        if (!l || !l.from || !l.to) continue;
        const isVirtual = (l.type === 'virtual');
        const color = isVirtual ? palette.virtualLink : palette.link;
        const style = isVirtual ? 'dashed' : 'solid';
        const arrowhead = isVirtual ? 'onormal' : 'normal';
        const label = l.label ? `label="${_safe(l.label)}",` : '';
        lines.push(`  "${_safe(l.from)}" -> "${_safe(l.to)}" [${label} color="${color}", style="${style}", arrowhead=${arrowhead}, penwidth=${isVirtual ? 1.3 : 1.6}, fontcolor="${PALETTE_LIGHT.textMuted}", fontsize=10];`);
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 部署图模板（机架/HA集群/负载均衡/共享存储）
// =====================================================================

/**
 * 生成部署图DOT代码
 * @param {Array} racks - [{id, label, location?, color?}]
 * @param {Array} nodes - [{id, label, rack, role: 'active'|'standby'|'normal'|'loadbalancer'|'sharedStorage'|'client', software?, host?}]
 * @param {Array} connections - [{from, to, label?, type: 'network'|'heartbeat'|'replication'}]
 * @param {object} opts - { title }
 */
function buildDeploymentDiagram(racks, nodes, connections = [], opts = {}) {
    const lines = [buildGraphHeader(opts.title || '部署图', { rankdir: 'TB', nodesep: 0.6, ranksep: 0.9, splines: 'spline', ...opts })];
    const palette = PALETTE_LIGHT.deployment;

    // 1. 机柜/机房（cluster）
    for (const rack of racks || []) {
        const fill = rack.color || palette.rack;
        lines.push(`  subgraph "cluster_rack_${_safe(rack.id)}" {`);
        lines.push(`    label="${_safe(rack.label || rack.id)}${rack.location ? '\\n[' + _safe(rack.location) + ']' : ''}";`);
        lines.push(`    style="filled,rounded";`);
        lines.push(`    fillcolor="${fill}";`);
        lines.push(`    color="${palette.rackBorder}";`);
        lines.push(`    fontname="${PALETTE_LIGHT.font}";`);
        lines.push(`    fontsize=14;`);
        lines.push(`    fontcolor="${PALETTE_LIGHT.text}";`);
        lines.push(`    labeljust="l";`);
        lines.push(`    margin=22;`);
        // 机柜内的节点
        const rackNodes = (nodes || []).filter(n => n.rack === rack.id);
        for (const n of rackNodes) {
            const role = n.role || 'normal';
            let fillColor, borderColor, shape = 'box', style = 'filled,rounded';
            if (role === 'active') {
                fillColor = palette.activeNode;
                borderColor = palette.activeNodeBorder;
                shape = 'box3d';
            } else if (role === 'standby') {
                fillColor = palette.standbyNode;
                borderColor = palette.standbyNodeBorder;
                shape = 'box3d';
            } else if (role === 'loadbalancer') {
                fillColor = palette.loadbalancer;
                borderColor = palette.loadbalancerBorder;
                shape = 'hexagon';
            } else if (role === 'sharedStorage') {
                fillColor = palette.sharedStorage;
                borderColor = palette.sharedStorageBorder;
                shape = 'cylinder';
            } else if (role === 'client') {
                fillColor = palette.client;
                borderColor = palette.clientBorder;
                shape = 'desktop';
            } else {
                fillColor = palette.node;
                borderColor = palette.nodeBorder;
                shape = 'box3d';
            }
            // HA 角色标签
            const roleTag = role === 'active' ? '\\n[Active]' : role === 'standby' ? '\\n[Standby]' : '';
            const softwareTag = n.software ? `\\n<${_safe(n.software)}>` : '';
            const hostTag = n.host ? `\\n${_safe(n.host)}` : '';
            const fullLabel = `${_safe(n.label || n.id)}${roleTag}${softwareTag}${hostTag}`;
            const fontColor = (role === 'active' || role === 'standby') ? '#FFFFFF' : PALETTE_LIGHT.text;
            lines.push(`    "${_safe(n.id)}" [label="${fullLabel}", shape=${shape}, style="${style}", fillcolor="${fillColor}", color="${borderColor}", fontsize=11, fontcolor="${fontColor}", penwidth=${role === 'active' || role === 'standby' ? 2 : 1.2}];`);
        }
        lines.push(`  }`);
    }

    // 2. 连接（网络/心跳/数据复制）
    for (const c of connections || []) {
        if (!c || !c.from || !c.to) continue;
        const type = c.type || 'network';
        let color, style, arrowhead = 'normal', penwidth = 1.4;
        if (type === 'heartbeat') {
            color = palette.heartbeat;
            style = 'dashed';
            arrowhead = 'none';
            penwidth = 1.6;
        } else if (type === 'replication') {
            color = palette.replication;
            style = 'dashed';
            arrowhead = 'vee';
            penwidth = 1.5;
        } else {
            color = PALETTE_LIGHT.edge.flow;
            style = 'solid';
            penwidth = 1.4;
        }
        const label = c.label ? `label="${_safe(c.label)}",` : '';
        lines.push(`  "${_safe(c.from)}" -> "${_safe(c.to)}" [${label} color="${color}", style="${style}", arrowhead=${arrowhead}, penwidth=${penwidth}, fontcolor="${PALETTE_LIGHT.textMuted}", fontsize=10];`);
    }

    lines.push(buildGraphFooter());
    return lines.join('\n');
}

// =====================================================================
// 工具函数
// =====================================================================

function _safe(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '\\"')
        .replace(/\\\\/g, '\\\\\\\\');
}

function _visibilitySymbol(vis) {
    switch ((vis || 'public').toLowerCase()) {
        case 'private': return '-';
        case 'protected': return '#';
        case 'package': return '~';
        case 'public':
        default: return '+';
    }
}

function _relationStyle(type, palette) {
    const t = (type || 'association').toLowerCase();
    switch (t) {
        case 'inheritance':
        case '泛化':
        case 'generalization':
            return { color: palette.inheritance, style: 'solid', arrowhead: 'empty', arrowtail: 'none' };
        case 'implementation':
        case '实现':
            return { color: palette.implementation, style: 'dashed', arrowhead: 'empty', arrowtail: 'none' };
        case 'aggregation':
        case '聚合':
            return { color: palette.aggregation, style: 'solid', arrowhead: 'odiamond', arrowtail: 'none' };
        case 'composition':
        case '组合':
            return { color: palette.composition, style: 'solid', arrowhead: 'diamond', arrowtail: 'none' };
        case 'dependency':
        case '依赖':
            return { color: palette.dependency, style: 'dashed', arrowhead: 'open', arrowtail: 'none' };
        case 'association':
        case '关联':
        default:
            return { color: palette.association, style: 'solid', arrowhead: 'vee', arrowtail: 'none' };
    }
}

module.exports = {
    PALETTE_LIGHT,
    PALETTE_DARK,
    buildGraphHeader,
    buildGraphFooter,
    buildClassDiagram,
    buildSequenceDiagram,
    buildActivityDiagram,
    buildBusinessFlowDiagram,
    buildTimingDiagram,
    buildNetworkTopologyDiagram,
    buildDeploymentDiagram,
};
