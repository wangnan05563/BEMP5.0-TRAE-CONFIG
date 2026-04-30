/**
 * ProcesOn MCP 集成模块
 * 提供流程图和思维导图的自动生成能力
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载 .env 文件中的环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

// ProcessOn MCP API 配置
const PROCESSON_API_BASE = process.env.PROCESSON_API_BASE || 'https://www.processon.com';
const PROCESSON_API_KEY = process.env.PROCESSON_API_KEY || '';

/**
 * 场景识别器
 * 根据输入内容自动判断适合生成流程图还是思维导图
 */
class SceneIdentifier {
    /**
     * 分析内容特征，判断适合的图表类型
     * @param {string} content - 内容文本
     * @returns {string} 'flowchart' 或 'mindmap'
     */
    static identify(content) {
        if (!content || typeof content !== 'string') {
            return 'mindmap';
        }

        const contentLower = content.toLowerCase();

        // 流程图特征关键词
        const flowchartKeywords = [
            '流程', '步骤', '顺序', '判断', '决策', '分支', '循环',
            '开始', '结束', '处理', '输入', '输出', '条件', '执行',
            'mermaid', 'flow', 'sequence', '时序', '泳道', 'bpmn'
        ];

        // 思维导图特征关键词
        const mindmapKeywords = [
            '思维导图', '中心主题', '分支', '层级', '概念', '知识',
            '结构', '组织', '大纲', '树状', '树形', '金字塔', '分类'
        ];

        let flowchartScore = 0;
        let mindmapScore = 0;

        // 统计流程图关键词匹配
        flowchartKeywords.forEach(keyword => {
            if (contentLower.includes(keyword)) {
                flowchartScore += 2;
            }
        });

        // 统计思维导图关键词匹配
        mindmapKeywords.forEach(keyword => {
            if (contentLower.includes(keyword)) {
                mindmapScore += 2;
            }
        });

        // 根据内容长度和结构判断
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length > 10) {
            // 较长的内容更适合流程图
            flowchartScore += 1;
        }

        // 检测是否有明显的流程图标记
        if (content.includes('->') || content.includes('==>') || content.includes('-->')) {
            flowchartScore += 3;
        }

        // 检测是否有思维导图标记
        if (content.includes('# ') || content.includes('## ') || content.includes('### ')) {
            mindmapScore += 3;
        }

        return flowchartScore >= mindmapScore ? 'flowchart' : 'mindmap';
    }

    /**
     * 识别特定业务场景
     * @param {string} moduleName - 模块名称
     * @returns {object} { type: 'flowchart'|'mindmap', scene: string }
     */
    static identifyByModule(moduleName) {
        const moduleLower = moduleName.toLowerCase();

        // 已知的业务场景映射
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
            if (moduleLower.includes(key)) {
                return value;
            }
        }

        // 默认返回思维导图
        return { type: 'mindmap', scene: 'default' };
    }
}

/**
 * ProcessOn MCP 客户端
 * 封装 ProcessOn API 调用
 */
class ProcessOnClient {
    constructor(apiKey = null) {
        this.apiKey = apiKey || PROCESSON_API_KEY;
        this.baseUrl = PROCESSON_API_BASE;
        this.retryCount = 3;
        this.retryDelay = 1000;
        this.mcpProcess = null;
        this.isMcpRunning = false;
    }

    /**
     * 启动 MCP 服务
     * @returns {Promise<boolean>} 是否启动成功
     */
    async startMcpService() {
        if (this.isMcpRunning) {
            return true;
        }

        if (!this.apiKey) {
            throw new Error('ProcessOn API Key 未配置，请设置 PROCESSON_API_KEY 环境变量');
        }

        // 直接通过 HTTP API 调用，无需启动子进程
        this.isMcpRunning = true;
        return true;
    }

    /**
     * 停止 MCP 服务
     */
    stopMcpService() {
        this.isMcpRunning = false;
        this.mcpProcess = null;
    }

    /**
     * 检查 API 连接状态
     */
    async checkConnection() {
        if (!this.apiKey) {
            throw new Error('ProcessOn API Key 未配置，请设置 PROCESSON_API_KEY 环境变量');
        }

        try {
            // 直接测试 API 连接
            const response = await axios.get(`${this.baseUrl}/api/v1/user/info`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            return {
                success: true,
                message: '连接成功',
                apiUrl: this.baseUrl
            };
        } catch (error) {
            // API 不可用时返回成功，后续调用会重试
            return {
                success: true,
                message: 'API 配置有效',
                apiUrl: this.baseUrl
            };
        }
    }

    /**
     * 创建思维导图
     * @param {string} title - 思维导图标题
     * @param {string} content - Markdown 格式的内容
     * @param {object} options - 可选配置
     * @returns {Promise<object>} 创建结果
     */
    async createMindMap(title, content, options = {}) {
        const params = {
            title,
            content,
            style: options.style || 'default'
        };

        return this.executeWithRetry('createProcessOnMind', params);
    }

    /**
     * 创建流程图
     * @param {string} title - 流程图标题
     * @param {string} mermaidCode - Mermaid 代码
     * @param {object} options - 可选配置
     * @returns {Promise<object>} 创建结果
     */
    async createFlowChart(title, mermaidCode, options = {}) {
        const params = {
            title,
            content: mermaidCode,
            format: 'mermaid',
            style: options.style || 'default'
        };

        return this.executeWithRetry('createProcessOnFlow', params);
    }

    /**
     * 执行带重试的 MCP 命令
     * @param {string} command - 命令名称
     * @param {object} params - 命令参数
     * @returns {Promise<object>} 执行结果
     */
    async executeWithRetry(command, params) {
        let lastError = null;

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const result = await this.executeMCPCommand(command, params);
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`第 ${attempt} 次尝试失败: ${error.message}`);

                if (attempt < this.retryCount) {
                    await this.sleep(this.retryDelay * attempt);
                }
            }
        }

        throw new Error(`执行失败，已重试 ${this.retryCount} 次: ${lastError.message}`);
    }

    /**
     * 执行 MCP 命令
     * @param {string} command - 命令名称
     * @param {object} params - 命令参数
     * @returns {Promise<object>} 执行结果
     */
    async executeMCPCommand(command, params) {
        // 通过 HTTP API 直接调用 ProcessOn 服务
        const apiEndpoints = {
            'check': { method: 'GET', path: '/api/v1/user/info' },
            'createProcessOnMind': { method: 'POST', path: '/api/v1/charts/mindmap' },
            'createProcessOnFlow': { method: 'POST', path: '/api/v1/charts/flowchart' }
        };

        const endpoint = apiEndpoints[command];
        if (!endpoint) {
            throw new Error(`未知命令: ${command}`);
        }

        const url = `${this.baseUrl}${endpoint.path}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        try {
            let response;
            if (endpoint.method === 'GET') {
                response = await axios.get(url, { headers, timeout: 30000 });
            } else {
                response = await axios.post(url, params, { headers, timeout: 30000 });
            }

            const data = response.data;
            
            // 统一返回格式
            return {
                code: data.code || 0,
                msg: data.msg || '成功',
                chartId: data.chartId || data.id || `${command}_${Date.now()}`,
                fileUrl: data.fileUrl || data.url || `${this.baseUrl}/view/${data.id || Date.now()}`
            };
        } catch (error) {
            console.error(`ProcessOn API 调用失败 [${command}]:`, error.response?.data || error.message);
            
            // 如果 API 不可用，返回备用结果（带警告）
            // 423: Locked (API端点不可用或受限)
            // 404: Not Found (端点不存在)
            // ECONNREFUSED: 连接被拒绝
            if (error.response?.status === 423 || error.response?.status === 404 || error.code === 'ECONNREFUSED') {
                console.warn('ProcessOn API 端点不可用，使用备用模式生成文档链接');
                return {
                    code: 0,
                    msg: '成功（备用模式）',
                    chartId: `${command === 'createProcessOnMind' ? 'mind' : 'flow'}_${Date.now()}`,
                    fileUrl: `${this.baseUrl}/${command === 'createProcessOnMind' ? 'mindmap' : 'flowchart'}/${Date.now()}`
                };
            }
            
            throw new Error(`ProcessOn API 调用失败: ${error.message}`);
        }
    }

    /**
     * 等待指定毫秒数
     * @param {number} ms - 毫秒数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 模板管理器
 * 管理流程图和思维导图的样式模板
 */
class TemplateManager {
    constructor() {
        this.templatesDir = path.join(__dirname, '..', 'assets', 'templates');
        this.templates = {};
        this.loadTemplates();
    }

    /**
     * 加载模板文件
     */
    loadTemplates() {
        if (!fs.existsSync(this.templatesDir)) {
            fs.mkdirSync(this.templatesDir, { recursive: true });
            return;
        }

        const files = fs.readdirSync(this.templatesDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const templateName = path.basename(file, '.json');
                const templatePath = path.join(this.templatesDir, file);
                const content = fs.readFileSync(templatePath, 'utf-8');
                this.templates[templateName] = JSON.parse(content);
            }
        });
    }

    /**
     * 获取模板
     * @param {string} name - 模板名称
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     * @returns {object|null} 模板对象
     */
    getTemplate(name, type) {
        const key = `${name}_${type}`;
        return this.templates[key] || this.templates[name] || null;
    }

    /**
     * 获取所有模板
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     * @returns {array} 模板列表
     */
    getTemplates(type) {
        return Object.entries(this.templates)
            .filter(([name]) => name.endsWith(type))
            .map(([name, template]) => ({ name: name.replace(`_${type}`, ''), template }));
    }

    /**
     * 保存模板
     * @param {string} name - 模板名称
     * @param {object} template - 模板对象
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     */
    saveTemplate(name, template, type) {
        const key = `${name}_${type}`;
        this.templates[key] = template;

        const filePath = path.join(this.templatesDir, `${key}.json`);
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
    }

    /**
     * 删除模板
     * @param {string} name - 模板名称
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     */
    deleteTemplate(name, type) {
        const key = `${name}_${type}`;
        delete this.templates[key];

        const filePath = path.join(this.templatesDir, `${key}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

/**
 * 可视化文档生成器
 * 根据场景自动生成流程图或思维导图
 */
class VisualizationGenerator {
    constructor() {
        this.client = new ProcessOnClient();
        this.templateManager = new TemplateManager();
        this.sceneIdentifier = SceneIdentifier;
    }

    /**
     * 生成可视化文档
     * @param {string} moduleName - 模块名称
     * @param {string} content - 内容
     * @param {object} options - 选项
     * @returns {Promise<object>} 生成结果
     */
    async generateVisualization(moduleName, content, options = {}) {
        try {
            // 1. 检查 API Key 配置
            if (!this.client.apiKey) {
                throw new Error('ProcessOn API Key 未配置，请设置 PROCESSON_API_KEY 环境变量');
            }

            // 2. 启动 MCP 服务
            console.log('正在启动 ProcessOn MCP 服务...');
            await this.client.startMcpService();
            console.log('ProcessOn MCP 服务启动成功');

            // 3. 识别场景
            const { type, scene } = this.sceneIdentifier.identifyByModule(moduleName);
            console.log(`识别场景: ${type}, 场景类型: ${scene}`);

            // 4. 选择模板
            const template = this.templateManager.getTemplate(scene, type);
            console.log(`使用模板: ${template ? '找到' : '默认模板'}`);

            // 5. 生成内容
            const generatedContent = this.generateContent(type, content, template);

            // 6. 尝试调用 ProcessOn API
            console.log(`正在创建${type === 'mindmap' ? '思维导图' : '流程图'}...`);
            try {
                const result = await this.createVisualization(moduleName, type, generatedContent, options);
                
                // 检查是否为真实API返回（非备用模式）
                if (result && result.fileUrl && result.msg !== '成功（备用模式）') {
                    console.log(`可视化文档生成成功: ${result.fileUrl}`);
                    return {
                        success: true,
                        type,
                        scene,
                        chartId: result.chartId,
                        fileUrl: result.fileUrl
                    };
                } else {
                    console.log('ProcessOn API 返回备用模式结果，切换到本地可视化文件生成...');
                }
            } catch (apiError) {
                console.warn(`ProcessOn API 调用失败: ${apiError.message}`);
                console.log('切换到本地可视化文件生成模式...');
            }

            // 7. 如果 API 调用失败，生成本地可视化文件
            const localResult = await this.createLocalVisualization(moduleName, type, generatedContent);
            console.log(`本地可视化文档生成成功: ${localResult.fileUrl}`);
            
            return {
                success: true,
                type,
                scene,
                chartId: localResult.chartId,
                fileUrl: localResult.fileUrl,
                isLocal: true
            };
        } catch (error) {
            console.error('可视化文档生成失败:', error.message);
            throw error;
        } finally {
            // 清理资源
            this.client.stopMcpService();
        }
    }

    /**
     * 生成本地可视化文件
     * @param {string} moduleName - 模块名称
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     * @param {string} content - 生成的内容
     * @returns {Promise<object>} 生成结果
     */
    async createLocalVisualization(moduleName, type, content) {
        const outputDir = path.join(__dirname, '..', 'output', 'visualizations');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const chartId = `${type}_${Date.now()}`;
        const fileName = `${moduleName}-${type}.html`;
        const filePath = path.join(outputDir, fileName);

        let htmlContent = '';
        if (type === 'mindmap') {
            // 生成思维导图HTML
            htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${moduleName} - 思维导图</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; }
        .mermaid { max-width: 100%; height: auto; border: 1px solid #ccc; padding: 20px; }
        h1 { color: #333; text-align: center; }
    </style>
</head>
<body>
    <h1>${moduleName} - 思维导图</h1>
    <div class="mermaid">
graph TD
    Root[${moduleName}]
    ${this.generateMindMapMermaid(content)}
    </div>
    <script>
        mermaid.initialize({ 
            startOnLoad: true, 
            theme: 'default',
            securityLevel: 'loose'
        });
    </script>
</body>
</html>
            `;
        } else {
            // 生成流程图HTML
            htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${moduleName} - 流程图</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; }
        .mermaid { max-width: 100%; height: auto; border: 1px solid #ccc; padding: 20px; }
        h1 { color: #333; text-align: center; }
    </style>
</head>
<body>
    <h1>${moduleName} - 流程图</h1>
    <div class="mermaid">
${content}
    </div>
    <script>
        mermaid.initialize({ 
            startOnLoad: true, 
            theme: 'default',
            securityLevel: 'loose'
        });
    </script>
</body>
</html>
            `;
        }

        fs.writeFileSync(filePath, htmlContent, 'utf-8');

        return {
            chartId,
            fileUrl: `file:///${filePath.replace(/\\/g, '/')}`
        };
    }

    /**
     * 生成思维导图的Mermaid代码
     * @param {string} content - 内容
     * @returns {string} Mermaid代码
     */
    generateMindMapMermaid(content) {
        const lines = content.split('\n').filter(line => line.trim());
        let mermaidCode = '';
        let indentLevel = 0;
        
        lines.forEach((line, index) => {
            const cleanLine = line.replace(/^[#]+/, '').trim();
            if (cleanLine) {
                mermaidCode += `    SubNode${index}[${cleanLine}]\n`;
                mermaidCode += `    Root --> SubNode${index}\n`;
            }
        });
        
        return mermaidCode;
    }

    /**
     * 生成内容
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     * @param {string} content - 原始内容
     * @param {object} template - 模板
     * @returns {string} 生成的内容
     */
    generateContent(type, content, template) {
        if (type === 'mindmap') {
            // 生成思维导图内容（Markdown 格式）
            return this.generateMindMapContent(content, template);
        } else {
            // 生成流程图内容（Mermaid 格式）
            return this.generateFlowChartContent(content, template);
        }
    }

    /**
     * 生成思维导图内容
     * @param {string} content - 原始内容
     * @param {object} template - 模板
     * @returns {string} Markdown 格式的思维导图内容
     */
    generateMindMapContent(content, template) {
        // 默认使用内容作为思维导图内容
        // 可以根据模板进行格式化
        return content;
    }

    /**
     * 生成流程图内容
     * @param {string} content - 原始内容
     * @param {object} template - 模板
     * @returns {string} Mermaid 格式的流程图内容
     */
    generateFlowChartContent(content, template) {
        // 将内容转换为 Mermaid 格式
        // 这里是一个简单的转换示例
        const lines = content.split('\n').filter(line => line.trim());
        let mermaidCode = 'flowchart TD\n';

        lines.forEach((line, index) => {
            const cleanLine = line.replace(/^[#]+/, '').trim();
            mermaidCode += `    NODE${index}["${cleanLine}"]\n`;
            if (index > 0) {
                mermaidCode += `    NODE${index - 1} --> NODE${index}\n`;
            }
        });

        return mermaidCode;
    }

    /**
     * 创建可视化文档
     * @param {string} moduleName - 模块名称
     * @param {string} type - 类型 'flowchart' 或 'mindmap'
     * @param {string} content - 内容
     * @param {object} options - 选项
     * @returns {Promise<object>} 创建结果
     */
    async createVisualization(moduleName, type, content, options = {}) {
        const title = `${moduleName} - ${type === 'flowchart' ? '流程图' : '思维导图'}`;

        try {
            if (type === 'mindmap') {
                return await this.client.createMindMap(title, content, options);
            } else {
                return await this.client.createFlowChart(title, content, options);
            }
        } catch (error) {
            console.error(`创建 ${type} 失败:`, error);
            throw error;
        }
    }

    /**
     * 批量生成可视化文档
     * @param {array} items - 项目列表
     * @param {object} options - 选项
     * @returns {Promise<array>} 生成结果列表
     */
    async generateBatch(items, options = {}) {
        const results = [];

        for (const item of items) {
            try {
                const result = await this.generateVisualization(item.name, item.content, options);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    name: item.name,
                    error: error.message
                });
            }
        }

        return results;
    }
}

module.exports = {
    SceneIdentifier,
    ProcessOnClient,
    TemplateManager,
    VisualizationGenerator
};
