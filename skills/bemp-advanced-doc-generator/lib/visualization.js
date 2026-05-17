const fs = require('fs');
const path = require('path');
const { paths, processon, BempDocError, ERROR_CODES } = require('../config/default');

class SceneIdentifier {
    static identify(content) {
        if (!content || typeof content !== 'string') return 'mindmap';
        const flowchartKw = ['流程', '步骤', '判断', '分支', '循环', '开始', '结束', '处理', '条件', '执行', 'mermaid', 'flow', '时序', '泳道'];
        const mindmapKw = ['思维导图', '中心主题', '层级', '概念', '结构', '组织', '大纲', '树状', '分类'];
        let fScore = 0, mScore = 0;
        flowchartKw.forEach(kw => { if (content.includes(kw)) fScore += 2; });
        mindmapKw.forEach(kw => { if (content.includes(kw)) mScore += 2; });
        if (content.includes('->') || content.includes('==>')) fScore += 3;
        if (content.includes('# ')) mScore += 3;
        return fScore >= mScore ? 'flowchart' : 'mindmap';
    }

    static identifyByModule(moduleName) {
        const sceneMap = {
            '批量导入': { type: 'flowchart', scene: 'data_import_process' },
            '角色复制': { type: 'flowchart', scene: 'role_copy_process' },
            '机构管理': { type: 'flowchart', scene: 'organization_management' },
            '系统概述': { type: 'mindmap', scene: 'system_overview' },
            '功能模块': { type: 'mindmap', scene: 'module_structure' },
            '数据模型': { type: 'mindmap', scene: 'data_structure' },
            '接口定义': { type: 'mindmap', scene: 'api_structure' },
            '异常处理': { type: 'flowchart', scene: 'error_handling' },
            '安全策略': { type: 'mindmap', scene: 'security_framework' },
            '测试计划': { type: 'mindmap', scene: 'test_plan' },
            '测试用例': { type: 'mindmap', scene: 'test_cases' }
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

    async _callProcessOnMCP(moduleName, type, content) {
        const title = `${moduleName} - ${type === 'flowchart' ? '流程图' : '思维导图'}`;
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
        const mermaidContent = type === 'mindmap' ? `graph TD\n    Root[${moduleName}]\n${this._generateMindMapMermaid(content)}` : content;
        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${moduleName} - ${type === 'mindmap' ? '思维导图' : '流程图'}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; }
        .mermaid { max-width: 100%; height: auto; border: 1px solid #ccc; padding: 20px; }
        h1 { color: #333; text-align: center; }
    </style>
</head>
<body>
    <h1>${moduleName} - ${type === 'mindmap' ? '思维导图' : '流程图'}</h1>
    <div class="mermaid">
${mermaidContent}
    </div>
    <script>mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });</script>
</body>
</html>`;
        fs.writeFileSync(filePath, htmlContent, 'utf-8');
        return { chartId, fileUrl: `file:///${filePath.replace(/\\/g, '/')}` };
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
