/**
 * Graphviz DOT 图表生成器（编排层）
 *
 * 职责：
 * 1. 调用 RequirementUmlExtractor 从需求文本抽取 5 要素
 * 2. 调用 DotStylePalette 渲染为 DOT 源码
 * 3. 一站式生成 5 种图表（类图/顺序图/活动图/业务流程图/时序图）
 *
 * 输出：{ dot, mmd/placeholder, json, results } 给 GraphvizRenderer
 */

const fs = require('fs');
const path = require('path');
const palette = require('./dot-style-palette');
const { RequirementUmlExtractor } = require('./requirement-uml-extractor');
// v7.1：统一从 doc_rules.yaml 读取兜底配置（零硬编码）
const yamlLoader = require('./yaml-loader');

class GraphvizGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output', 'diagrams', 'uml');
        this.projectName = options.projectName || '本项目';
        this.diagramPrefix = options.diagramPrefix || 'uml';
        this.extractor = new RequirementUmlExtractor(options);
        // v7.1：缓存兜底配置
        this._umlRules = yamlLoader.getUmlRules();

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * 主入口：生成全部 5 种图表的 DOT 源码
     * @param {string} requirementText - 需求 Markdown 文本
     * @returns {Object} { classDiagram, sequenceDiagrams, activityDiagrams, businessFlows, timingDiagrams, dotFiles }
     */
    generateAll(requirementText) {
        if (!requirementText) {
            return { dotFiles: [], classDiagram: null, sequenceDiagrams: [], activityDiagrams: [], businessFlows: [], timingDiagrams: [] };
        }

        const extracted = this.extractor.extract(requirementText);
        const dotFiles = [];

        // 1. 类图：即使 classes 为空也生成基础类图（兜底）
        let classDiagram = null;
        const effectiveClasses = (extracted.classDiagram && extracted.classDiagram.classes.length > 0)
            ? extracted.classDiagram
            : this._fallbackClassDiagram(this.projectName || '业务系统');
        const dot = palette.buildClassDiagram(
            effectiveClasses.classes,
            effectiveClasses.relations,
            { title: effectiveClasses.title || '业务实体类图', showEmpty: false }
        );
        const file = this._saveDotFile('class-diagram.dot', dot);
        dotFiles.push({ type: 'classDiagram', name: effectiveClasses.title || '业务实体类图', dot, file, title: effectiveClasses.title });
        classDiagram = { dot, file, ...effectiveClasses };

        // 2. 顺序图：兜底生成"登录鉴权顺序图"
        const sequenceDiagrams = [];
        const effectiveSequences = extracted.sequenceDiagrams.length > 0
            ? extracted.sequenceDiagrams
            : this._fallbackSequenceDiagrams(this.projectName || '业务系统');
        for (let i = 0; i < effectiveSequences.length; i++) {
            const seq = effectiveSequences[i];
            const dot = palette.buildSequenceDiagram(
                seq.actors,
                seq.messages,
                seq.notes,
                { title: seq.title }
            );
            const safeName = (seq.name || `sequence-${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
            const file = this._saveDotFile(`sequence-${safeName}.dot`, dot);
            dotFiles.push({ type: 'sequenceDiagram', name: seq.name, dot, file, title: seq.title });
            sequenceDiagrams.push({ dot, file, ...seq });
        }

        // 3. 活动图：兜底生成"业务处理流程活动图"
        const activityDiagrams = [];
        const effectiveActivities = extracted.activityDiagrams.length > 0
            ? extracted.activityDiagrams
            : this._fallbackActivityDiagrams(this.projectName || '业务系统');
        for (let i = 0; i < effectiveActivities.length; i++) {
            const act = effectiveActivities[i];
            const dot = palette.buildActivityDiagram(
                act.nodes,
                act.edges,
                { title: act.title }
            );
            const safeName = (act.name || `activity-${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
            const file = this._saveDotFile(`activity-${safeName}.dot`, dot);
            dotFiles.push({ type: 'activityDiagram', name: act.name, dot, file, title: act.title });
            activityDiagrams.push({ dot, file, ...act });
        }

        // 4. 业务流程图（泳道）
        const businessFlows = [];
        for (let i = 0; i < extracted.businessFlows.length; i++) {
            const bf = extracted.businessFlows[i];
            const dot = palette.buildBusinessFlowDiagram(
                bf.lanes,
                bf.tasks,
                bf.flows,
                { title: bf.title }
            );
            const safeName = (bf.title || `business-flow-${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
            const file = this._saveDotFile(`business-flow-${safeName}.dot`, dot);
            dotFiles.push({ type: 'businessFlow', name: bf.title, dot, file, title: bf.title });
            businessFlows.push({ dot, file, ...bf });
        }

        // 5. 时序图
        const timingDiagrams = [];
        for (let i = 0; i < extracted.timingDiagrams.length; i++) {
            const tm = extracted.timingDiagrams[i];
            const dot = palette.buildTimingDiagram(
                tm.participants,
                tm.timeMarkers,
                { title: tm.title }
            );
            const safeName = (tm.title || `timing-${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
            const file = this._saveDotFile(`timing-${safeName}.dot`, dot);
            dotFiles.push({ type: 'timingDiagram', name: tm.title, dot, file, title: tm.title });
            timingDiagrams.push({ dot, file, ...tm });
        }

        return {
            dotFiles,
            classDiagram,
            sequenceDiagrams,
            activityDiagrams,
            businessFlows,
            timingDiagrams,
        };
    }

    /**
     * 保存 DOT 源码到文件
     */
    _saveDotFile(name, dot) {
        const filePath = path.join(this.outputDir, name);
        fs.writeFileSync(filePath, dot, 'utf-8');
        return filePath;
    }

    /**
     * 兜底类图（需求文档无业务实体关键词时使用）
     * v7.1：从 doc_rules.yaml 的 uml.fallback_class_diagram 读取，无硬编码
     */
    _fallbackClassDiagram(projectName) {
        const cfg = this._umlRules.fallback_class_diagram || {};
        const baseClasses = (cfg.classes || []).map(c => ({
            name: c.name,
            stereotype: c.stereotype,
            attributes: [
                { name: 'logger', type: 'Logger', visibility: 'private' },
            ],
            methods: [
                { name: 'handleRequest', params: [{ name: 'req', type: 'HttpRequest' }], returnType: 'Response', visibility: 'public' },
                { name: 'validate', params: [{ name: 'data', type: 'Object' }], returnType: 'boolean', visibility: 'public' },
            ],
        }));
        return {
            title: cfg.title ? `${projectName}${cfg.title}` : `${projectName}业务实体类图`,
            classes: baseClasses.length > 0 ? baseClasses : [
                { name: 'Controller', stereotype: 'control' },
                { name: 'Service', stereotype: 'service' },
                { name: 'Repository', stereotype: 'data' },
                { name: 'Entity', stereotype: 'entity' },
            ],
            relations: cfg.relations || [],
        };
    }

    /**
     * 兜底顺序图（需求文档无操作关键词时使用）
     * v7.1：从 doc_rules.yaml 的 uml.fallback_sequence_diagram 读取
     */
    _fallbackSequenceDiagrams(projectName) {
        const cfg = this._umlRules.fallback_sequence_diagram || {};
        return [{
            name: cfg.name || '登录鉴权',
            title: cfg.title ? `${projectName}${cfg.title}` : `${projectName}登录鉴权顺序图`,
            actors: cfg.actors || [
                { id: '用户', label: '用户' },
                { id: '前端UI', label: '前端UI' },
                { id: 'AuthController', label: 'AuthController' },
                { id: 'AuthService', label: 'AuthService' },
                { id: 'TokenManager', label: 'TokenManager' },
                { id: 'UserRepository', label: 'UserRepository' },
                { id: '数据库', label: '数据库' },
            ],
            messages: cfg.messages || [
                { from: '用户', to: '前端UI', message: '输入账号密码' },
                { from: '前端UI', to: 'AuthController', message: 'POST /auth/login' },
            ],
            notes: cfg.notes || [],
        }];
    }

    /**
     * 兜底活动图（需求文档无活动关键词时使用）
     * v7.1：从 doc_rules.yaml 的 uml.fallback_activity_diagram 读取
     */
    _fallbackActivityDiagrams(projectName) {
        const cfg = this._umlRules.fallback_activity_diagram || {};
        return [{
            name: cfg.name || '业务处理流程',
            title: cfg.title ? `${projectName}${cfg.title}` : `${projectName}业务处理活动图`,
            nodes: cfg.nodes || [
                { id: 'start', label: '开始', type: 'start' },
                { id: 'process', label: '业务处理', type: 'action' },
                { id: 'end', label: '结束', type: 'end' },
            ],
            edges: cfg.edges || [
                { from: 'start', to: 'process' },
                { from: 'process', to: 'end' },
            ],
        }];
    }

    /**
     * 从需求文档文件加载文本
     */
    static loadRequirementText(filePath) {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf-8');
    }
}

module.exports = { GraphvizGenerator };
