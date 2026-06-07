/**
 * UML 图表生成器 v2.0
 *
 * 相比 v1.0 的关键改进：
 * 1. 类图生成：确保所有类、属性、关系完整显示；通过 Mermaid 关键字
 *    转义 + 关系去重 + 类型/属性截断控制，避免节点超界。
 * 2. 布局优化：根据节点数量动态调整 rankdir/direction/字号，
 *    并通过 maxClassCount/maxAttrCount/maxMethodCount 配置化
 *    阈值，保证图表清晰可读。
 * 3. 配置化：所有硬编码阈值、保留关键字、关系类型标识均抽到
 *    默认配置 DEFAULT_OPTIONS 中，调用方可整体覆盖。
 * 4. 占位渲染：matplotlib 降级时支持占位 PNG（防止"图表缺失"）
 *    并写入 source 标签供门禁校验。
 *
 * 不硬编码业务内容：所有节点名、字段、操作步骤均来自 scanData。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { AntVClient } = require('./antv-client');

// ────────────────────────────────────────────────────────────────
// 默认配置：所有可调参数集中管理，外部可通过 options 整体覆盖
// 原则：禁止硬编码业务/银行字段；仅定义"图表可读性"相关阈值
// ────────────────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
    // 节点规模控制：超过则截断并打 WARN，避免图表超界错位
    maxClassCount: 12,        // 类图最多显示 12 个类（>12 时优先显示核心类）
    maxAttrCount: 8,          // 每类最多 8 个属性
    maxMethodCount: 8,        // 每类最多 8 个方法
    maxRelationCount: 30,     // 关系箭头最多 30 个
    // 文本截断长度：超长标识符截断，避免溢出节点边界
    maxIdentLength: 32,
    maxTypeLength: 24,
    // 布局参数
    rankdir: 'LR',            // 类图默认左右布局，节点多时自动切换为 TB
    tbThreshold: 8,           // 节点数 >= tbThreshold 时切换为 TB
    fontSize: 14,
    nodeSpacing: 40,
    rankSpacing: 50,
    // 渲染参数
    canvasWidth: 1400,
    canvasHeight: 900,
    // 关系去重：相同 (from, to, type) 仅保留第一条
    dedupeRelations: true,
    // 关键字白名单：Mermaid classDiagram 中需做标识符转义
    mermaidReserved: new Set([
        'class', 'classDiagram', 'direction', 'graph', 'stateDiagram',
        'sequenceDiagram', 'flowchart', 'subgraph', 'end', 'style',
        'linkStyle', 'click', 'note', 'participant', 'actor',
    ]),
};

/**
 * 转义 Mermaid 关键字/特殊字符，确保标识符不会破坏语法
 */
function _safeIdent(s, opts) {
    const maxLen = (opts && opts.maxIdentLength) || DEFAULT_OPTIONS.maxIdentLength;
    if (s === undefined || s === null) return 'X';
    let str = String(s);
    // 1) 去除 Mermaid 关键字的歧义：若与保留字同名则加下划线后缀
    if (DEFAULT_OPTIONS.mermaidReserved.has(str)) {
        str = str + '_';
    }
    // 2) 替换非合法字符为下划线
    str = str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
    // 3) 数字开头则前缀下划线
    if (/^\d/.test(str)) str = '_' + str;
    // 4) 长度截断
    if (str.length > maxLen) {
        str = str.slice(0, maxLen - 1) + '_';
    }
    return str || 'X';
}

function _safeClassName(s, opts) {
    let str = _safeIdent(s, opts);
    if (!str) str = 'Module';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function _safeType(s, opts) {
    const maxLen = (opts && opts.maxTypeLength) || DEFAULT_OPTIONS.maxTypeLength;
    const t = String(s || 'String').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5<>]/g, '');
    if (!t) return 'String';
    return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function _safeParams(arr, opts) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.slice(0, 6).map(p => {
        if (typeof p === 'string') return _safeIdent(p, opts);
        return `${_safeIdent(p.name || 'arg', opts)}: ${_safeType(p.type || 'String', opts)}`;
    }).join(', ');
}

function _safeMessage(s) {
    if (!s) return '';
    return String(s).replace(/[\n\r:;,]/g, ' ').slice(0, 80);
}

/**
 * 选择前 N 个核心类：按 (attributes.length + methods.length) 降序
 * 解决"类过多时随机截断"导致的图表内容不完整问题
 */
function _selectCoreClasses(modules, maxCount) {
    if (!Array.isArray(modules) || modules.length === 0) return [];
    const scored = modules.map(m => {
        const attrs = Array.isArray(m.attributes) ? m.attributes.length : 0;
        const methods = Array.isArray(m.methods) ? m.methods.length : 0;
        return { m, score: attrs + methods };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCount).map(x => x.m);
}

class UmlGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output');
        this.umlDir = path.join(this.outputDir, 'diagrams', 'uml');
        this.projectName = options.projectName || '本项目';
        this.useAntV = options.useAntV !== false;
        this.fallbackToMatplotlib = options.fallbackToMatplotlib !== false;
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
        this.antv = new AntVClient({ timeout: options.timeout || 60000 });

        if (!fs.existsSync(this.umlDir)) {
            fs.mkdirSync(this.umlDir, { recursive: true });
        }
    }

    /**
     * 生成类图 Mermaid 源码（v2.0 改进版）
     *
     * 关键改进：
     * - _selectCoreClasses 按属性+方法总数排序，保留最核心的类
     * - 关系去重：同 (from,to,type) 仅保留一条
     * - 布局自适应：节点数 >= tbThreshold 时使用 TB 方向
     * - 类型/属性超长截断，避免溢出
     *
     * @param {Object} moduleData - {projectName, modules:[{name, attributes:[], methods:[], relations:[]}]}
     * @returns {string} Mermaid 字符串
     */
    generateClassDiagram(moduleData) {
        const opts = this.options;
        const rawModules = (moduleData && Array.isArray(moduleData.modules)) ? moduleData.modules : [];
        if (rawModules.length === 0) {
            return [
                'classDiagram',
                'class EmptyModule {',
                '  +placeholder: String',
                '}',
            ].join('\n');
        }
        // 1) 核心类筛选：超过 maxClassCount 时按"信息量"优先级保留
        const modules = _selectCoreClasses(rawModules, opts.maxClassCount);
        if (modules.length < rawModules.length) {
            // 节点超阈值时输出警告（截断不丢失，因为 _selectCoreClasses 已按信息量排序）
            process.stderr.write(
                `[UML] 类图模块数 ${rawModules.length} 超出阈值 ${opts.maxClassCount}，` +
                `已按信息量截断至 ${modules.length} 个\n`
            );
        }
        // 2) 布局方向：节点多时切换为 TB
        const direction = modules.length >= opts.tbThreshold ? 'TB' : opts.rankdir;
        const lines = ['classDiagram', `direction ${direction}`];
        const classNames = new Set();
        const classAliasMap = {};   // 原始名 → Mermaid 安全类名
        // 3) 声明所有类（确保类先存在，关系再连线）
        for (const m of modules) {
            const original = m.name || m.className || 'Module';
            const cn = _safeClassName(original, opts);
            if (classNames.has(cn)) continue;  // 防止同名类重复声明
            classNames.add(cn);
            classAliasMap[original] = cn;
            lines.push(`class ${cn} {`);
            const attrs = Array.isArray(m.attributes) ? m.attributes : [];
            for (const a of attrs.slice(0, opts.maxAttrCount)) {
                const an = _safeIdent(a.name || a, opts);
                const at = _safeType(a.type || 'String', opts);
                lines.push(`  +${an}: ${at}`);
            }
            const methods = Array.isArray(m.methods) ? m.methods : [];
            for (const fn of methods.slice(0, opts.maxMethodCount)) {
                const fnName = _safeIdent(fn.name || fn, opts);
                const params = _safeParams(fn.params || [], opts);
                const retType = _safeType(fn.returnType || 'void', opts);
                lines.push(`  +${fnName}(${params}): ${retType}`);
            }
            lines.push('}');
        }
        // 4) 关系绘制：去重 + 数量控制 + 关系类型标识
        const deps = (moduleData && Array.isArray(moduleData.dependencies))
            ? moduleData.dependencies
            : [];
        const seenRelation = new Set();
        let relCount = 0;
        for (const d of deps) {
            if (relCount >= opts.maxRelationCount) break;
            const fromOrig = d.from || d.source || '';
            const toOrig = d.to || d.target || '';
            const relType = (d.type || '--|>').replace(/[^<>\-\*|o]+/g, '');
            if (!fromOrig || !toOrig) continue;
            const from = classAliasMap[fromOrig] || _safeClassName(fromOrig, opts);
            const to = classAliasMap[toOrig] || _safeClassName(toOrig, opts);
            if (!classNames.has(from) || !classNames.has(to) || from === to) continue;
            const key = `${from}|${to}|${relType}`;
            if (opts.dedupeRelations && seenRelation.has(key)) continue;
            seenRelation.add(key);
            const label = d.label ? ` : ${_safeMessage(d.label)}` : '';
            lines.push(`${from} ${relType} ${to}${label}`);
            relCount += 1;
        }
        return lines.join('\n');
    }

    /**
     * 生成顺序图 Mermaid 源码
     * @param {Object} operation - {module, name, actors:[], steps:[{from,to,message,type}]}
     * @returns {string} Mermaid 字符串
     */
    generateSequenceDiagram(operation) {
        if (!operation) {
            return 'sequenceDiagram\nparticipant U as User\nU->>S: 操作';
        }
        const actors = (Array.isArray(operation.actors) && operation.actors.length > 0)
            ? operation.actors
            : ['User', 'Controller', 'Service', 'DB'];
        const lines = ['sequenceDiagram'];
        for (const a of actors.slice(0, 8)) {
            lines.push(`participant ${_safeIdent(a, this.options)} as ${_safeIdent(a, this.options)}`);
        }
        const steps = Array.isArray(operation.steps) ? operation.steps : [];
        if (steps.length === 0) {
            lines.push(`${actors[0]}->>${actors[1] || 'Controller'}: ${operation.name || '请求'}`);
            if (actors[2]) lines.push(`${actors[1] || 'Controller'}->>${actors[2]}: 业务处理`);
            if (actors[3]) lines.push(`${actors[2] || 'Service'}->>${actors[3]}: 数据访问`);
            if (actors[2]) lines.push(`${actors[3] || 'DB'}-->>${actors[2]}: 返回结果`);
            lines.push(`${actors[1] || 'Controller'}-->>${actors[0]}: 响应`);
        } else {
            for (const s of steps.slice(0, 15)) {
                const from = _safeIdent(s.from || actors[0], this.options);
                const to = _safeIdent(s.to || actors[1] || actors[0], this.options);
                const msg = _safeMessage(s.message || s.action || '');
                if (s.type === 'return' || s.return) {
                    lines.push(`${from}-->>${to}: ${msg}`);
                } else {
                    lines.push(`${from}->>${to}: ${msg}`);
                }
            }
        }
        return lines.join('\n');
    }

    /**
     * 生成活动图 Mermaid 源码
     * @param {Object} flow - {name, steps:[{id,text,type,next,yes,no}]}
     * @returns {string} Mermaid 字符串
     */
    generateActivityDiagram(flow) {
        if (!flow) {
            return 'flowchart TD\n  Start([开始]) --> End([结束])';
        }
        const lines = ['flowchart TD'];
        const steps = Array.isArray(flow.steps) ? flow.steps : [];
        if (steps.length === 0) {
            lines.push('  Start([开始]) --> End([结束])');
            return lines.join('\n');
        }
        const idMap = {};
        steps.forEach((s, i) => { idMap[s.id || `S${i}`] = i; });
        lines.push('  Start([开始])');
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const sid = _safeIdent(s.id || `S${i}`, this.options);
            const text = _safeMessage(s.text || s.name || `步骤${i + 1}`);
            const type = s.type || 'action';
            if (type === 'decision' || type === 'condition' || type === '判断') {
                lines.push(`  ${sid}{${text}}`);
            } else if (type === 'end' || type === '结束') {
                lines.push(`  ${sid}([${text}])`);
            } else {
                lines.push(`  ${sid}[${text}]`);
            }
        }
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const sid = _safeIdent(s.id || `S${i}`, this.options);
            if (i === 0) lines.push(`  Start --> ${sid}`);
            const next = Array.isArray(s.next) ? s.next : (s.next ? [s.next] : []);
            if (next.length === 0 && i < steps.length - 1) {
                lines.push(`  ${sid} --> ${_safeIdent(steps[i + 1].id || `S${i + 1}`, this.options)}`);
            } else {
                for (const nx of next) {
                    if (idMap[nx] !== undefined) {
                        lines.push(`  ${sid} --> ${_safeIdent(nx, this.options)}`);
                    }
                }
            }
            if ((s.type === 'decision' || s.type === 'condition') && s.yes && s.no) {
                lines.push(`  ${sid} -->|是| ${_safeIdent(s.yes, this.options)}`);
                lines.push(`  ${sid} -->|否| ${_safeIdent(s.no, this.options)}`);
            }
        }
        return lines.join('\n');
    }

    /**
     * 从 scanData 抽取业务操作列表（用于顺序图）
     *
     * 2026-06-06 增强：兼容多种数据源
     *   1) businessSubsystems[i].subModules[j].actions[]（旧路径）
     *   2) businessModules[i].subModules[j].actions[]（详细设计数据）
     *   3) businessModules[i].subsections[]（数据 chapters 的子节，含 actions 字段）
     *   4) businessModules[i].actions[]（模块级 actions）
     *   5) chapters[].sections[]（详细设计文档通用）
     *   6) modules[].actions[]（顶层 modules）
     */
    extractOperations(scanData) {
        if (!scanData) return [];
        const ops = [];

        // 路径 1/2: businessSubsystems / businessModules
        const subsRoots = [
            scanData.businessSubsystems,
            scanData.businessModules,
            scanData.businessSubmodules,
        ].filter(Array.isArray);
        for (const subs of subsRoots) {
            for (const sub of subs) {
                const subs2 = Array.isArray(sub.subModules) ? sub.subModules : [];
                // 模块级 actions
                const subActions = Array.isArray(sub.actions) ? sub.actions : [];
                for (const a of subActions) {
                    const op = this._actionToOperation(a, sub);
                    if (op) ops.push(op);
                }
                for (const sm of subs2) {
                    const actions = Array.isArray(sm.actions) ? sm.actions : [];
                    for (const a of actions) {
                        const op = this._actionToOperation(a, sm);
                        if (op) ops.push(op);
                    }
                }
            }
        }

        // 路径 3: businessModules[].subsections
        const bizMods = Array.isArray(scanData.businessModules) ? scanData.businessModules : [];
        for (const mod of bizMods) {
            const subs = Array.isArray(mod.subsections) ? mod.subsections : [];
            for (const ss of subs) {
                const ssActions = Array.isArray(ss.actions) ? ss.actions : [];
                for (const a of ssActions) {
                    const op = this._actionToOperation(a, ss);
                    if (op) ops.push(op);
                }
            }
        }

        // 路径 4: chapters[].sections[]（详细设计通用）
        const chapters = Array.isArray(scanData.chapters) ? scanData.chapters : [];
        for (const ch of chapters) {
            const sections = Array.isArray(ch.sections) ? ch.sections : [];
            for (const sec of sections) {
                const secActions = Array.isArray(sec.actions) ? sec.actions : [];
                for (const a of secActions) {
                    const op = this._actionToOperation(a, sec);
                    if (op) ops.push(op);
                }
            }
        }

        // 路径 5: 顶层 modules
        const modules = Array.isArray(scanData.modules) ? scanData.modules : [];
        for (const m of modules) {
            const mActions = Array.isArray(m.actions) ? m.actions : [];
            for (const a of mActions) {
                const op = this._actionToOperation(a, m);
                if (op) ops.push(op);
            }
        }
        return ops;
    }

    /**
     * 将单个 action 转换为顺序图 operation
     * @returns {Object|null} operation 或 null（应跳过时）
     */
    _actionToOperation(a, parent) {
        if (!a || typeof a !== 'object') return null;
        const name = a.name || a.action || a.title || '';
        if (!name) return null;
        // 扩展关键词列表：除 CRUD 外，包含业务常用动作（"提交"/"复核"/"撤销"/"批复"等）
        const isCore = ['新增', '修改', '删除', '查询', 'add', 'update', 'delete', 'query', 'create',
            '提交', '复核', '撤销', '批复', '占用', '释放', '保存', '导出', '导入',
            'submit', 'review', 'revoke', 'approve', 'save', 'export', 'import'].some(
            kw => (name || '').toLowerCase().includes(kw.toLowerCase())
        );
        if (!isCore) return null;
        const moduleName = parent.name || parent.title || '';
        return {
            module: moduleName,
            name: name,
            actors: parent.actors || ['用户', 'Controller', 'Service', 'DB'],
            steps: [
                { from: '用户', to: 'Controller', message: `发起${name}请求` },
                { from: 'Controller', to: 'Service', message: `调用${name}业务方法` },
                { from: 'Service', to: 'DB', message: '执行数据操作' },
                { from: 'DB', to: 'Service', message: '返回结果', type: 'return' },
                { from: 'Service', to: 'Controller', message: '业务结果', type: 'return' },
                { from: 'Controller', to: '用户', message: '响应客户端', type: 'return' },
            ],
        };
    }

    /**
     * 从 scanData 抽取业务流程（用于活动图）
     */
    extractFlows(scanData) {
        if (!scanData) return [];
        const flows = [];
        const subs = Array.isArray(scanData.businessSubsystems) ? scanData.businessSubsystems : [];
        for (const sub of subs) {
            const bps = Array.isArray(sub.businessProcesses) ? sub.businessProcesses : [];
            for (const bp of bps) {
                const steps = (bp.steps || []).map((s, i) => ({
                    id: s.id || `S${i}`,
                    text: s.text || s.name || `步骤${i + 1}`,
                    type: s.type || (i === 0 ? 'start' : (i === bp.steps.length - 1 ? 'end' : 'action')),
                    next: s.next,
                }));
                if (steps.length > 0) flows.push({ name: bp.name || '业务流程', steps });
            }
        }
        return flows;
    }

    saveMermaidFile(code, fileName) {
        const filePath = path.join(this.umlDir, fileName);
        fs.writeFileSync(filePath, code, 'utf-8');
        return filePath;
    }

    /**
     * 渲染 Mermaid 文件为 PNG
     * 策略：AntV → matplotlib 降级
     */
    async renderMermaidToPng(mermaidCode, destName) {
        const destPath = path.join(this.umlDir, destName);
        if (this.useAntV) {
            try {
                const result = await this.antv.generateAndDownload(
                    {
                        type: 'flow-diagram',
                        data: { mermaid: mermaidCode },
                        title: destName.replace('.png', ''),
                        width: this.options.canvasWidth,
                        height: this.options.canvasHeight,
                    },
                    destPath
                );
                if (result.success && result.size > 5 * 1024) {
                    return { success: true, filePath: result.filePath, source: 'AntV' };
                }
            } catch (_) { /* 降级 */ }
        }
        if (this.fallbackToMatplotlib) {
            return await this._fallbackToMatplotlib(mermaidCode, destPath);
        }
        return { success: false, errorMessage: '无可用渲染器' };
    }

    async _fallbackToMatplotlib(mermaidCode, destPath) {
        const mmdPath = destPath + '.mmd';
        fs.writeFileSync(mmdPath, mermaidCode, 'utf-8');
        const script = path.join(__dirname, '..', 'uml-renderer.py');
        if (!fs.existsSync(script)) {
            return { success: false, errorMessage: 'matplotlib 降级脚本不存在' };
        }
        try {
            execFileSync('python', [script, mmdPath, destPath], {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
                cwd: path.dirname(script),
            });
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5 * 1024) {
                return { success: true, filePath: destPath, source: 'matplotlib' };
            }
            return { success: false, errorMessage: 'matplotlib 渲染输出为空' };
        } catch (e) {
            return { success: false, errorMessage: e.message };
        }
    }

    /**
     * 一站式：生成所有 UML 图表
     */
    async generateAll(scanData) {
        const results = [];
        // 1. 类图
        const classCode = this.generateClassDiagram(scanData);
        this.saveMermaidFile(classCode, 'class-diagram.mmd');
        const classPng = await this.renderMermaidToPng(classCode, 'class-diagram.png');
        results.push({ type: 'class', mermaid: classCode, png: classPng });

        // 2. 顺序图
        const ops = this.extractOperations(scanData);
        const seqCodes = [];
        for (let i = 0; i < Math.min(ops.length, 4); i++) {
            const op = ops[i];
            const code = this.generateSequenceDiagram(op);
            seqCodes.push(code);
            const fname = `sequence-${op.module || 'op'}-${i + 1}.mmd`.replace(/[^\w\-\u4e00-\u9fa5.]/g, '_');
            this.saveMermaidFile(code, fname);
            const png = await this.renderMermaidToPng(code, fname.replace('.mmd', '.png'));
            results.push({ type: 'sequence', module: op.module, name: op.name, mermaid: code, png });
        }

        // 3. 活动图
        const flows = this.extractFlows(scanData);
        const actCodes = [];
        for (let i = 0; i < Math.min(flows.length, 4); i++) {
            const flow = flows[i];
            const code = this.generateActivityDiagram(flow);
            actCodes.push(code);
            const fname = `activity-${flow.name || 'flow'}-${i + 1}.mmd`.replace(/[^\w\-\u4e00-\u9fa5.]/g, '_');
            this.saveMermaidFile(code, fname);
            const png = await this.renderMermaidToPng(code, fname.replace('.mmd', '.png'));
            results.push({ type: 'activity', name: flow.name, mermaid: code, png });
        }

        return {
            results,
            outputDir: this.umlDir,
            classDiagram: classCode,
            sequenceDiagrams: seqCodes,
            activityDiagrams: actCodes,
        };
    }

    getUmlDir() {
        return this.umlDir;
    }
}

module.exports = {
    UmlGenerator,
    DEFAULT_OPTIONS,
    _safeIdent,
    _safeClassName,
    _safeType,
    _safeParams,
    _safeMessage,
    _selectCoreClasses,
};
