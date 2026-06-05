const fs = require('fs');
const path = require('path');
const { paths, processon, BempDocError, ERROR_CODES } = require('../config/default');

class SceneIdentifier {
    static identify(content) {
        if (!content || typeof content !== 'string') return 'mindmap';
        const flowchartKw = ['流程', '步骤', '判断', '分支', '循环', '开始', '结束', '处理', '条件', '执行', 'mermaid', 'flow', '时序', '泳道'];
        const mindmapKw = ['思维导图', '中心主题', '层级', '概念', '结构', '组织', '大纲', '树状', '分类'];
        const archKw = ['架构', '层', '组件', '部署', '拓扑', '集群', '节点', '子系统', '模块', '服务'];
        const erKw = ['表', '实体', '关系', 'ER', '字段', '主键', '外键', '关联'];
        let fScore = 0, mScore = 0, aScore = 0, eScore = 0;
        flowchartKw.forEach(kw => { if (content.includes(kw)) fScore += 2; });
        mindmapKw.forEach(kw => { if (content.includes(kw)) mScore += 2; });
        archKw.forEach(kw => { if (content.includes(kw)) aScore += 2; });
        erKw.forEach(kw => { if (content.includes(kw)) eScore += 2; });
        if (content.includes('->') || content.includes('==>')) fScore += 3;
        if (content.includes('# ')) mScore += 3;

        const scores = { flowchart: fScore, mindmap: mScore, architecture: aScore, er: eScore };
        const maxType = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        return maxType;
    }

    static identifyByModule(moduleName) {
        const sceneMap = {
            '批量导入': { type: 'flowchart', scene: 'data_import_process' },
            '角色复制': { type: 'flowchart', scene: 'role_copy_process' },
            '机构管理': { type: 'flowchart', scene: 'organization_management' },
            '系统概述': { type: 'mindmap', scene: 'system_overview' },
            '功能模块': { type: 'mindmap', scene: 'module_structure' },
            '数据模型': { type: 'er', scene: 'data_model' },
            '接口定义': { type: 'mindmap', scene: 'api_structure' },
            '异常处理': { type: 'flowchart', scene: 'error_handling' },
            '安全策略': { type: 'mindmap', scene: 'security_framework' },
            '测试计划': { type: 'mindmap', scene: 'test_plan' },
            '测试用例': { type: 'mindmap', scene: 'test_cases' },
            '数据库': { type: 'er', scene: 'database_design' },
            '架构': { type: 'architecture', scene: 'system_architecture' },
            '部署': { type: 'architecture', scene: 'deployment' },
            '流程': { type: 'flowchart', scene: 'business_process' },
        };
        for (const [key, value] of Object.entries(sceneMap)) {
            if (moduleName.includes(key)) return value;
        }
        return { type: 'mindmap', scene: 'default' };
    }
}

class VisualizationGenerator {
    constructor() {
        this.apiKey = processon.apiKey;
        this.apiBase = processon.apiBase;
        this.retryCount = processon.retryCount;
        this.retryDelay = processon.retryDelay;
    }

    async generateVisualization(moduleName, content, options = {}) {
        try {
            const { type, scene } = SceneIdentifier.identifyByModule(moduleName);
            console.log(`[可视化] 场景识别: ${type}, 场景: ${scene}`);
            const generatedContent = this._generateContent(type, content);

            if (this.apiKey) {
                try {
                    const result = await this._callProcessOnMCP(moduleName, type, generatedContent);
                    if (result && result.fileUrl && !result.isFallback) {
                        console.log(`[可视化] ProcessOn生成成功: ${result.fileUrl}`);
                        return { success: true, type, scene, chartId: result.chartId, fileUrl: result.fileUrl };
                    }
                } catch (apiError) {
                    console.warn(`[可视化] ProcessOn API调用失败: ${apiError.message}`);
                }
            }

            console.log('[可视化] 使用本地HTML生成模式...');
            const localResult = this._createLocalVisualization(moduleName, type, generatedContent);
            return { success: true, type, scene, chartId: localResult.chartId, fileUrl: localResult.fileUrl, isLocal: true };
        } catch (error) {
            throw new BempDocError(ERROR_CODES.GENERATION_FAILED, `可视化生成失败: ${error.message}`, error.stack);
        }
    }

    generateArchitectureDiagram(projectName, subsystems, layers) {
        const middlewares = layers?.middlewares || ['Redis', 'ZooKeeper'];
        const databases = layers?.databases || ['Oracle', 'MySQL'];
        const externalSystems = layers?.externalSystems || ['ECDS', 'CPES', '核心银行', 'ECIF', '信贷'];

        const subsystemList = subsystems && subsystems.length > 0
            ? subsystems.map(s => s.name || s).slice(0, 8)
            : ['系统管理', '公共', '业务管理', '票据承兑', '票据到期', '场内交易', '渠道管理', '任务调度'];

        const lines = ['graph TB'];
        lines.push('    subgraph 客户端层[客户端层]');
        lines.push('        Browser[浏览器 Chrome/IE11+]');
        lines.push('        Nginx[Nginx 反向代理]');
        lines.push('    end');
        lines.push('');
        lines.push('    subgraph 前端层[前端层]');
        lines.push('        Vue[Vue.js 静态资源]');
        lines.push('    end');
        lines.push('');
        lines.push('    subgraph 应用层[应用层 Spring Boot 微服务集群]');
        subsystemList.forEach((sub, i) => {
            lines.push(`        S${i}[${sub}]`);
        });
        lines.push('    end');
        lines.push('');
        lines.push('    subgraph 中间件层[中间件层]');
        middlewares.forEach(mw => {
            lines.push(`        ${mw}[${mw}集群]`);
        });
        lines.push('    end');
        lines.push('');
        lines.push('    subgraph 数据层[数据层]');
        databases.forEach(db => {
            lines.push(`        ${db}[${db}数据库]`);
        });
        lines.push('    end');
        lines.push('');
        lines.push('    subgraph 外部系统层[外部系统层]');
        externalSystems.forEach((es, i) => {
            lines.push(`        EXT${i}[${es}]`);
        });
        lines.push('    end');
        lines.push('');
        lines.push('    Browser --> Nginx');
        lines.push('    Nginx --> Vue');
        lines.push('    Nginx --> S0');
        lines.push('    Vue --> Nginx');
        subsystemList.forEach((_, i) => {
            if (i > 0) lines.push(`    S${i - 1} <--> S${i}`);
        });
        middlewares.forEach((mw, i) => {
            lines.push(`    S${i % subsystemList.length} --> ${mw}`);
        });
        databases.forEach((db, i) => {
            lines.push(`    S${i % subsystemList.length} --> ${db}`);
        });
        externalSystems.forEach((es, i) => {
            lines.push(`    S${i % subsystemList.length} --> EXT${i}`);
        });

        return lines.join('\n');
    }

    generateLogicFlowchart(processName, steps) {
        const lines = ['flowchart TD'];
        lines.push(`    Start([开始: ${processName}])`);

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const nodeId = `Step${i + 1}`;
            const shape = step.type === 'decision' ? '{' : '[';
            const shapeEnd = step.type === 'decision' ? '}' : ']';
            const label = step.label || `步骤${i + 1}`;
            lines.push(`    ${nodeId}${shape}${label}${shapeEnd}`);
            if (i === 0) {
                lines.push(`    Start --> ${nodeId}`);
            } else {
                const prevNode = `Step${i}`;
                lines.push(`    ${prevNode} --> ${nodeId}`);
            }
            if (step.type === 'decision') {
                lines.push(`    ${nodeId} -->|是| ${nodeId}_Yes[${step.yesLabel || '继续'}]`);
                lines.push(`    ${nodeId} -->|否| ${nodeId}_No[${step.noLabel || '返回'}]`);
            }
        }

        const lastIdx = steps.length;
        lines.push(`    Step${lastIdx} --> End([结束])`);

        return lines.join('\n');
    }

    generateChartViaMCP(chartType, data, chartOptions = {}) {
        const chartConfigs = {
            'bar': this._buildBarChartConfig(data, chartOptions),
            'line': this._buildLineChartConfig(data, chartOptions),
            'column': this._buildColumnChartConfig(data, chartOptions),
            'area': this._buildAreaChartConfig(data, chartOptions),
            'pie': this._buildPieChartConfig(data, chartOptions),
        };

        const config = chartConfigs[chartType];
        if (!config) {
            throw new BempDocError(ERROR_CODES.GENERATION_FAILED, `不支持的图表类型: ${chartType}`);
        }

        return config;
    }

    _buildBarChartConfig(data, options) {
        return {
            title: options.title || '柱状图',
            xAxis: { data: data.labels || [], name: options.xLabel || '' },
            yAxis: { name: options.yLabel || '' },
            series: (data.series || []).map(s => ({
                name: s.name || '',
                data: s.data || [],
            })),
        };
    }

    _buildLineChartConfig(data, options) {
        return {
            title: options.title || '折线图',
            xAxis: { data: data.labels || [], name: options.xLabel || '' },
            yAxis: { name: options.yLabel || '' },
            series: (data.series || []).map(s => ({
                name: s.name || '',
                data: s.data || [],
                type: 'line',
            })),
        };
    }

    _buildColumnChartConfig(data, options) {
        return this._buildBarChartConfig(data, { ...options, title: options.title || '柱状图' });
    }

    _buildAreaChartConfig(data, options) {
        return {
            title: options.title || '面积图',
            xAxis: { data: data.labels || [], name: options.xLabel || '' },
            yAxis: { name: options.yLabel || '' },
            series: (data.series || []).map(s => ({
                name: s.name || '',
                data: s.data || [],
                type: 'area',
            })),
        };
    }

    _buildPieChartConfig(data, options) {
        return {
            title: options.title || '饼图',
            series: [{
                name: options.seriesName || '数据',
                data: (data.items || []).map(item => ({
                    name: item.name || '',
                    value: item.value || 0,
                })),
            }],
        };
    }

    async _callProcessOnMCP(moduleName, type, content) {
        const typeLabels = {
            'mindmap': '思维导图',
            'flowchart': '流程图',
            'architecture': '架构图',
            'er': 'ER关系图',
        };
        const typeLabel = typeLabels[type] || '图表';
        const title = `${moduleName} - ${typeLabel}`;
        let lastError = null;
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const axios = require('axios');
                const endpoint = type === 'mindmap' ? '/api/v1/charts/mindmap' : '/api/v1/charts/flowchart';
                const response = await axios.post(`${this.apiBase}${endpoint}`, { title, content, style: 'default' }, {
                    headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                    timeout: 30000
                });
                const data = response.data;
                return { chartId: data.chartId || data.id || `${type}_${Date.now()}`, fileUrl: data.fileUrl || data.url || `${this.apiBase}/view/${data.id || Date.now()}` };
            } catch (error) {
                lastError = error;
                if (error.response?.status === 423 || error.response?.status === 404 || error.code === 'ECONNREFUSED') {
                    return { chartId: `${type}_${Date.now()}`, fileUrl: '', isFallback: true };
                }
                if (attempt < this.retryCount) await new Promise(r => setTimeout(r, this.retryDelay * attempt));
            }
        }
        throw lastError;
    }

    _createLocalVisualization(moduleName, type, content) {
        const outputDir = path.join(paths.outputDir, 'visualizations');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const chartId = `${type}_${Date.now()}`;
        const fileName = `${moduleName}-${type}.html`;
        const filePath = path.join(outputDir, fileName);

        const typeLabels = {
            'mindmap': '思维导图',
            'flowchart': '流程图',
            'architecture': '架构图',
            'er': 'ER关系图',
        };
        const typeLabel = typeLabels[type] || '图表';

        const mermaidContent = this._buildMermaidForType(type, moduleName, content);
        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${moduleName} - ${typeLabel}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; background: #f5f5f5; }
        .chart-container { margin: 20px auto; max-width: 1400px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .mermaid { max-width: 100%; height: auto; display: flex; justify-content: center; overflow-x: auto; }
        h1 { color: #333; text-align: center; margin-bottom: 20px; }
        .info-bar { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="chart-container">
        <h1>${moduleName} - ${typeLabel}</h1>
        <div class="mermaid">
${mermaidContent}
        </div>
        <div class="info-bar">
            生成时间: ${new Date().toLocaleString('zh-CN')} | 类型: ${typeLabel} | 关联模块: ${moduleName}
        </div>
    </div>
</body>
</html>`;
        fs.writeFileSync(filePath, htmlContent, 'utf-8');
        return { chartId, fileUrl: `file:///${filePath.replace(/\\/g, '/')}` };
    }

    _buildMermaidForType(type, moduleName, content) {
        switch (type) {
            case 'mindmap':
                return `graph TD\n    Root[${moduleName}]\n${this._generateMindMapMermaid(content)}`;
            case 'flowchart':
                return content;
            case 'architecture':
                return content;
            case 'er':
                return content;
            default:
                return content;
        }
    }

    _generateContent(type, content) {
        if (type === 'mindmap') return content;
        const lines = content.split('\n').filter(line => line.trim());
        let mermaidCode = 'flowchart TD\n';
        lines.forEach((line, index) => {
            const cleanLine = line.replace(/^[#]+/, '').trim();
            mermaidCode += `    NODE${index}["${cleanLine}"]\n`;
            if (index > 0) mermaidCode += `    NODE${index - 1} --> NODE${index}\n`;
        });
        return mermaidCode;
    }

    _generateMindMapMermaid(content) {
        const lines = content.split('\n').filter(line => line.trim());
        let code = '';
        lines.forEach((line, index) => {
            const cleanLine = line.replace(/^[#]+/, '').trim();
            if (cleanLine) code += `    SubNode${index}[${cleanLine}]\n    Root --> SubNode${index}\n`;
        });
        return code;
    }

    async generateBatch(items, options = {}) {
        const results = [];
        for (const item of items) {
            try {
                results.push(await this.generateVisualization(item.name, item.content, options));
            } catch (error) {
                results.push({ success: false, name: item.name, error: error.message });
            }
        }
        return results;
    }
}

module.exports = { SceneIdentifier, VisualizationGenerator };