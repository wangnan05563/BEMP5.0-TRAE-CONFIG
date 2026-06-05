/**
 * UML 图表生成器
 *
 * 基于业务数据动态生成 Mermaid 格式的 UML 图表源码，并支持渲染为 PNG：
 * 1. 类图（classDiagram）：基于 modules 列表提取 className、attribute、method
 * 2. 顺序图（sequenceDiagram）：基于 businessModule.operations 提取 actor/操作
 * 3. 活动图（flowchart）：基于 businessModule.flow 步骤生成
 *
 * 渲染策略：
 * - 优先调用 mcp-server-chart（外部 MCP 服务）
 * - 失败时降级使用 matplotlib（通过 Python 脚本）
 * - 最终 PNG 输出到 output/diagrams/uml/ 目录
 *
 * 不硬编码业务内容：所有节点名、字段、操作步骤均来自 scanData。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { AntVClient } = require('./antv-client');

class UmlGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output');
        this.umlDir = path.join(this.outputDir, 'diagrams', 'uml');
        this.projectName = options.projectName || '本项目';
        this.useAntV = options.useAntV !== false;
        this.fallbackToMatplotlib = options.fallbackToMatplotlib !== false;
        this.antv = new AntVClient({ timeout: options.timeout || 60000 });

        if (!fs.existsSync(this.umlDir)) {
            fs.mkdirSync(this.umlDir, { recursive: true });
        }
    }

    /**
     * 生成类图 Mermaid 源码
     * @param {Object} moduleData - {projectName, modules: [{name, attributes:[], methods:[]}]}
     * @returns {string} Mermaid 字符串
     */
    generateClassDiagram(moduleData) {
        const modules = (moduleData && Array.isArray(moduleData.modules)) ? moduleData.modules : [];
        if (modules.length === 0) {
            return 'classDiagram\nclass EmptyModule {\n  +placeholder: String\n}';
        }
        const lines = ['classDiagram'];
        const classNames = new Set();
        for (const m of modules) {
            const cn = _safeClassName(m.name || m.className || 'Module');
            if (classNames.has(cn)) continue;
            classNames.add(cn);
            lines.push(`class ${cn} {`);
            const attrs = Array.isArray(m.attributes) ? m.attributes : [];
            for (const a of attrs.slice(0, 10)) {
                lines.push(`  +${_safeIdent(a.name || a)}: ${_safeType(a.type || 'String')}`);
            }
            const methods = Array.isArray(m.methods) ? m.methods : [];
            for (const fn of methods.slice(0, 10)) {
                lines.push(`  +${_safeIdent(fn.name || fn)}(${_safeParams(fn.params || [])}): ${_safeType(fn.returnType || 'void')}`);
            }
            lines.push('}');
        }
        // 模块依赖关系（如果提供）
        const deps = (moduleData && Array.isArray(moduleData.dependencies)) ? moduleData.dependencies : [];
        for (const d of deps.slice(0, 20)) {
            const from = _safeClassName(d.from || d.source || '');
            const to = _safeClassName(d.to || d.target || '');
            if (classNames.has(from) && classNames.has(to) && from !== to) {
                lines.push(`${from} --> ${to}`);
            }
        }
        return lines.join('\n');
    }

    /**
     * 生成顺序图 Mermaid 源码
     * @param {Object} operation - {module, name, actors:[], steps:[{from,to,message}]}
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
            lines.push(`participant ${_safeIdent(a)} as ${_safeIdent(a)}`);
        }
        const steps = Array.isArray(operation.steps) ? operation.steps : [];
        if (steps.length === 0) {
            // 默认流程：User -> Controller -> Service -> DB
            lines.push(`${actors[0]}->>${actors[1] || 'Controller'}: ${operation.name || '请求'}`);
            if (actors[2]) lines.push(`${actors[1] || 'Controller'}->>${actors[2]}: 业务处理`);
            if (actors[3]) lines.push(`${actors[2] || 'Service'}->>${actors[3]}: 数据访问`);
            if (actors[2]) lines.push(`${actors[3] || 'DB'}-->>${actors[2]}: 返回结果`);
            lines.push(`${actors[1] || 'Controller'}-->>${actors[0]}: 响应`);
        } else {
            for (const s of steps.slice(0, 15)) {
                const from = _safeIdent(s.from || actors[0]);
                const to = _safeIdent(s.to || actors[1] || actors[0]);
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
     * 生成活动图（flowchart）Mermaid 源码
     * @param {Object} flow - {name, steps:[{id,text,type,next}]}
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
        steps.forEach((s, i) => {
            idMap[s.id || `S${i}`] = i;
        });
        // 起始节点
        lines.push('  Start([开始])');
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const sid = _safeIdent(s.id || `S${i}`);
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
        // 连线
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const sid = _safeIdent(s.id || `S${i}`);
            if (i === 0) {
                lines.push(`  Start --> ${sid}`);
            }
            const next = Array.isArray(s.next) ? s.next : (s.next ? [s.next] : []);
            if (next.length === 0 && i < steps.length - 1) {
                lines.push(`  ${sid} --> ${_safeIdent(steps[i + 1].id || `S${i + 1}`)}`);
            } else {
                for (const nx of next) {
                    const tid = _safeIdent(nx);
                    if (idMap[nx] !== undefined) {
                        lines.push(`  ${sid} --> ${tid}`);
                    }
                }
            }
            // 决策分支：yes/no
            if ((s.type === 'decision' || s.type === 'condition') && s.yes && s.no) {
                lines.push(`  ${sid} -->|是| ${_safeIdent(s.yes)}`);
                lines.push(`  ${sid} -->|否| ${_safeIdent(s.no)}`);
            }
        }
        return lines.join('\n');
    }

    /**
     * 从 scanData 抽取所有业务子模块的"操作"列表（用于顺序图）
     * @param {Object} scanData
     * @returns {Array<{module, name, actors, steps}>}
     */
    extractOperations(scanData) {
        if (!scanData) return [];
        const subs = Array.isArray(scanData.businessSubsystems) ? scanData.businessSubsystems : [];
        const ops = [];
        for (const sub of subs) {
            const subs2 = Array.isArray(sub.subModules) ? sub.subModules : [];
            for (const sm of subs2) {
                const actions = Array.isArray(sm.actions) ? sm.actions : [];
                for (const a of actions) {
                    const isCrud = ['新增', '修改', '删除', '查询', 'add', 'update', 'delete', 'query', 'create'].includes(
                        (a.name || a.action || '').toLowerCase()
                    );
                    if (isCrud) {
                        ops.push({
                            module: sm.name || sub.name || '',
                            name: a.name || a.action || '操作',
                            actors: [sm.actors ? sm.actors[0] : '用户', 'Controller', 'Service', 'DB'],
                            steps: [
                                { from: sm.actors ? sm.actors[0] : '用户', to: 'Controller', message: `发起${a.name || a.action}请求` },
                                { from: 'Controller', to: 'Service', message: `调用${a.name || a.action}业务方法` },
                                { from: 'Service', to: 'DB', message: '执行数据操作' },
                                { from: 'DB', to: 'Service', message: '返回结果', type: 'return' },
                                { from: 'Service', to: 'Controller', message: '业务结果', type: 'return' },
                                { from: 'Controller', to: sm.actors ? sm.actors[0] : '用户', message: '响应客户端', type: 'return' },
                            ],
                        });
                    }
                }
            }
        }
        return ops;
    }

    /**
     * 从 scanData 抽取业务流程（用于活动图）
     * @param {Object} scanData
     * @returns {Array<{name, steps}>}
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
                if (steps.length > 0) {
                    flows.push({ name: bp.name || '业务流程', steps });
                }
            }
        }
        return flows;
    }

    /**
     * 保存 Mermaid 源码到文件
     * @param {string} code
     * @param {string} fileName
     * @returns {string} 完整文件路径
     */
    saveMermaidFile(code, fileName) {
        const filePath = path.join(this.umlDir, fileName);
        fs.writeFileSync(filePath, code, 'utf-8');
        return filePath;
    }

    /**
     * 渲染 Mermaid 文件为 PNG
     * 策略：AntV → matplotlib 降级
     * @param {string} mermaidCode
     * @param {string} destName - 输出 PNG 文件名（含扩展名）
     * @returns {Promise<{success:boolean, filePath?:string, errorMessage?:string, fallback?:string}>}
     */
    async renderMermaidToPng(mermaidCode, destName) {
        const destPath = path.join(this.umlDir, destName);
        // 1. 优先 AntV（mermaid 字符串通过 type=flow-diagram 投递）
        if (this.useAntV) {
            try {
                const result = await this.antv.generateAndDownload(
                    {
                        type: 'flow-diagram',
                        data: { mermaid: mermaidCode },
                        title: destName.replace('.png', ''),
                        width: 1000,
                        height: 700,
                    },
                    destPath
                );
                if (result.success && result.size > 5 * 1024) {
                    return { success: true, filePath: result.filePath, source: 'AntV' };
                }
            } catch (_) { /* 降级 */ }
        }
        // 2. matplotlib 降级
        if (this.fallbackToMatplotlib) {
            return await this._fallbackToMatplotlib(mermaidCode, destPath);
        }
        return { success: false, errorMessage: '无可用渲染器' };
    }

    async _fallbackToMatplotlib(mermaidCode, destPath) {
        // 写入临时 .mmd 文件，由 Python 脚本读取并渲染
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
     * @param {Object} scanData
     * @returns {Promise<{results: Array, outputDir: string, classDiagram: string, sequenceDiagrams: string[], activityDiagrams: string[]}>}
     */
    async generateAll(scanData) {
        const results = [];
        // 1. 类图
        const classCode = this.generateClassDiagram(scanData);
        this.saveMermaidFile(classCode, 'class-diagram.mmd');
        const classPng = await this.renderMermaidToPng(classCode, 'class-diagram.png');
        results.push({ type: 'class', mermaid: classCode, png: classPng });

        // 2. 顺序图（每个"新增"/"修改"/"删除"/"查询"操作一张）
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

        // 3. 活动图（每个业务流程一张）
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

// 工具函数：避免 Mermaid 关键字冲突
function _safeIdent(s) {
    if (s === undefined || s === null) return 'X';
    let str = String(s).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
    if (/^\d/.test(str)) str = '_' + str;
    return str;
}

function _safeClassName(s) {
    let str = _safeIdent(s);
    if (!str) str = 'Module';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function _safeType(s) {
    const t = String(s || 'String').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    return t || 'String';
}

function _safeParams(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.slice(0, 6).map(p => {
        if (typeof p === 'string') return _safeIdent(p);
        return `${_safeIdent(p.name || 'arg')}: ${_safeType(p.type || 'String')}`;
    }).join(', ');
}

function _safeMessage(s) {
    if (!s) return '';
    return String(s).replace(/[\n\r:;,]/g, ' ').slice(0, 80);
}

module.exports = { UmlGenerator, _safeIdent, _safeClassName, _safeType };
