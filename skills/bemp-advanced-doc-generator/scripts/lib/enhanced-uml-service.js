/**
 * 增强版 UML 服务（一站式入口）
 *
 * 替代旧的 UmlGenerator（基于 Mermaid）
 * 新版基于 Graphviz DOT，输出更专业：
 * 1. 类图（UML 2.5 标准三段式：类名/属性/方法）
 * 2. 顺序图（UML 顺序图标准：参与者头部 + 生命线 + 同步/异步/返回消息）
 * 3. 活动图（UML 活动图：开始/操作/判断菱形/分叉/结束）
 * 4. 业务流程图（带角色泳道：用户/前端/后端/存储）
 * 5. 时序图（UML 时序图：状态随时间变化）
 *
 * 用法：
 *   const service = new EnhancedUmlService({ outputDir });
 *   const result = await service.generateFromRequirement(requirementText);
 *   // result.classDiagram, result.sequenceDiagrams, ...
 *
 * 与旧 UmlGenerator 兼容：保留 generateClassDiagram / generateSequenceDiagram / generateActivityDiagram
 */

const fs = require('fs');
const path = require('path');
const { GraphvizGenerator } = require('./graphviz-generator');
const { GraphvizRenderer } = require('./graphviz-renderer');
const palette = require('./dot-style-palette');
const { RequirementUmlExtractor } = require('./requirement-uml-extractor');

class EnhancedUmlService {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output', 'diagrams', 'uml');
        this.projectName = options.projectName || '本项目';
        this.engine = options.engine || 'graphviz';  // 'graphviz' or 'mermaid'（保留兼容）
        this.diagramPrefix = options.diagramPrefix || 'uml';

        this.generator = new GraphvizGenerator({
            outputDir: this.outputDir,
            projectName: this.projectName,
            diagramPrefix: this.diagramPrefix,
        });
        this.renderer = new GraphvizRenderer({
            outputDir: this.outputDir,
            timeout: options.timeout || 30000,
            fallbackToPython: options.fallbackToPython !== false,
        });
    }

    /**
     * 一站式：需求文本 → 5 种图表 PNG
     * @param {string} requirementText
     * @returns {Promise<Object>} { classDiagram: {png, dot, ...}, sequenceDiagrams: [{png, dot, name}], ... }
     */
    async generateFromRequirement(requirementText) {
        const generated = this.generator.generateAll(requirementText);
        const result = {
            classDiagram: null,
            sequenceDiagrams: [],
            activityDiagrams: [],
            businessFlows: [],
            timingDiagrams: [],
            healthCheck: this.renderer.healthCheck(),
        };

        // 渲染类图
        if (generated.classDiagram) {
            const png = await this.renderer.renderDotToPng(generated.classDiagram.file, 'class-diagram.png');
            result.classDiagram = { ...generated.classDiagram, png };
        }

        // 渲染顺序图
        for (const seq of generated.sequenceDiagrams) {
            const safeName = (seq.name || 'sequence').replace(/[\\/:*?"<>|]/g, '_');
            const png = await this.renderer.renderDotToPng(seq.file, `sequence-${safeName}.png`);
            result.sequenceDiagrams.push({ ...seq, png });
        }

        // 渲染活动图
        for (const act of generated.activityDiagrams) {
            const safeName = (act.name || 'activity').replace(/[\\/:*?"<>|]/g, '_');
            const png = await this.renderer.renderDotToPng(act.file, `activity-${safeName}.png`);
            result.activityDiagrams.push({ ...act, png });
        }

        // 渲染业务流程图
        for (const bf of generated.businessFlows) {
            const safeName = (bf.title || 'flow').replace(/[\\/:*?"<>|]/g, '_');
            const png = await this.renderer.renderDotToPng(bf.file, `business-flow-${safeName}.png`);
            result.businessFlows.push({ ...bf, png });
        }

        // 渲染时序图
        for (const tm of generated.timingDiagrams) {
            const safeName = (tm.title || 'timing').replace(/[\\/:*?"<>|]/g, '_');
            const png = await this.renderer.renderDotToPng(tm.file, `timing-${safeName}.png`);
            result.timingDiagrams.push({ ...tm, png });
        }

        return result;
    }

    /**
     * 与旧 UmlGenerator 兼容的方法（返回 DOT 源码字符串）
     */
    generateClassDiagram(moduleData) {
        return palette.buildClassDiagram(
            moduleData.modules || [],
            moduleData.dependencies || [],
            { title: moduleData.title || '类图' }
        );
    }

    generateSequenceDiagram(operation) {
        return palette.buildSequenceDiagram(
            (operation.actors || []).map(a => ({ id: a, label: a })),
            operation.steps || [],
            operation.notes || [],
            { title: operation.name }
        );
    }

    generateActivityDiagram(flow) {
        return palette.buildActivityDiagram(
            flow.nodes || flow.steps || [],
            flow.edges || [],
            { title: flow.name }
        );
    }

    /**
     * 健康检查
     */
    healthCheck() {
        return this.renderer.healthCheck();
    }

    getOutputDir() {
        return this.outputDir;
    }
}

module.exports = {
    EnhancedUmlService,
    RequirementUmlExtractor,
    GraphvizGenerator,
    GraphvizRenderer,
    palette,
};
