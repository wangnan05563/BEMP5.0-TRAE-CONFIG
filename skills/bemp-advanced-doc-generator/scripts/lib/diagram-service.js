const fs = require('fs');
const path = require('path');
const { AntVClient } = require('./antv-client');
const { VisualizationGenerator } = require('./visualization');
const { McpChartClient } = require('./mcp-chart-client');

/**
 * 图表生成服务
 *
 * 图表生成优先级（高 → 低）：
 * 1. mcp-server-chart（通过 McpChartClient 生成配置，AI agent 通过 run_mcp 执行）
 * 2. AntV（通过 AntVClient 调用 antv-studio.alipay.com 接口渲染）
 * 3. Matplotlib（Python 降级方案）
 *
 * 工作流程：
 * 1. 优先通过 McpChartClient 生成 mcp-server-chart 调用配置
 * 2. 检查 MCP 图表是否已生成（AI agent 已通过 run_mcp 执行）
 * 3. MCP 图表未生成时，降级到 AntV 渲染
 * 4. AntV 失败时，降级到 Matplotlib
 * 5. 命名规则与 outline-design-generator.py 中 diagram_map 对应：
 *    - 网络结构图 → network-topology.png
 *    - 组件结构图 → architecture-diagram.png
 *    - 部署图 → deployment-diagram.png
 */
class DiagramService {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output');
        this.diagramDir = path.join(this.outputDir, 'diagrams');
        this.vizGen = new VisualizationGenerator();
        this.antv = new AntVClient({
            timeout: options.timeout || 60000,
            maxRetries: options.maxRetries || 2,
        });
        this.mcpClient = new McpChartClient({
            outputDir: this.outputDir,
            projectName: options.projectName,
        });
        this.useMcpChart = options.useMcpChart !== false;
        this.useAntV = options.useAntV !== false;
        this.fallbackToMatplotlib = options.fallbackToMatplotlib !== false;
        this.projectName = options.projectName || '本项目';

        // P2-3: 配置驱动的优先级链，支持从外部配置文件覆盖默认优先级
        // 默认优先级：mcp-server-chart → antv → matplotlib
        // 可通过 options.priorityChain 或 config/diagram-config.json 覆盖
        this.priorityChain = options.priorityChain || this._loadPriorityChain();

        if (!fs.existsSync(this.diagramDir)) {
            fs.mkdirSync(this.diagramDir, { recursive: true });
        }
    }

    /**
     * P2-3: 从配置文件加载图表生成优先级链
     * 配置文件路径：config/diagram-config.json
     * 配置格式：{ "priorityChain": ["mcp", "antv", "matplotlib"] }
     * @returns {string[]} 优先级链数组
     */
    _loadPriorityChain() {
        const configPath = path.join(__dirname, '..', '..', 'config', 'diagram-config.json');
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (Array.isArray(config.priorityChain) && config.priorityChain.length > 0) {
                    return config.priorityChain;
                }
            }
        } catch (e) {
            // 配置加载失败时使用默认优先级
        }
        return ['mcp', 'antv', 'matplotlib'];
    }

    static FILE_NAME_MAP = {
        network: 'network-topology.png',
        architecture: 'architecture-diagram.png',
        deployment: 'deployment-diagram.png',
    };

    /**
     * 一次生成所有图表（网络/组件/部署）
     * 优先级：mcp-server-chart → AntV → Matplotlib
     * @param {Object} scanData - 项目扫描数据
     * @param {Object} [options] - 配置项
     * @param {string[]} [options.onlyTypes] - 限定类型数组，例：['network']
     * @returns {Promise<{results: Array, success: boolean, fallbackUsed: boolean, mcpConfigs: Array}>}
     */
    async generateAll(scanData, options = {}) {
        const onlyTypes = options.onlyTypes || ['architecture', 'network', 'deployment'];
        const results = [];
        const mcpConfigs = [];
        let fallbackUsed = false;

        // 阶段1：优先尝试 mcp-server-chart
        if (this.useMcpChart) {
            for (const type of onlyTypes) {
                try {
                    // 生成 MCP 调用配置
                    const mcpConfig = this.mcpClient.generateCallConfig(scanData, type);
                    if (mcpConfig) {
                        mcpConfigs.push(mcpConfig);

                        // 检查图表是否已由 AI agent 通过 run_mcp 生成
                        if (this.mcpClient.isGenerated(type)) {
                            const fileName = DiagramService.FILE_NAME_MAP[type];
                            const filePath = path.join(this.diagramDir, fileName);
                            const stat = fs.statSync(filePath);
                            results.push({
                                type,
                                success: true,
                                filePath: filePath,
                                size: stat.size,
                                generatedBy: 'mcp-server-chart',
                            });
                            continue;
                        }
                    }
                    // MCP 配置已生成但图表未生成，标记需要 AI agent 执行
                    results.push({
                        type,
                        success: false,
                        pendingMcp: true,
                        mcpConfig: mcpConfig,
                        fallback: true,
                    });
                    fallbackUsed = true;
                } catch (err) {
                    results.push({
                        type,
                        success: false,
                        errorMessage: 'MCP config error: ' + err.message,
                        fallback: true,
                    });
                    fallbackUsed = true;
                }
            }
        }

        // 阶段2：MCP 未完成的图表，降级到 AntV
        const needAntV = onlyTypes.filter(
            (t) => !results.find((r) => r.type === t && r.success)
        );
        if (needAntV.length > 0 && this.useAntV) {
            for (const type of needAntV) {
                try {
                    const config = this.vizGen.generateMcpFlowDiagramConfig(
                        scanData.projectName || this.projectName,
                        type,
                        scanData
                    );
                    const result = await this._generateOne(type, config);
                    // 更新结果
                    const existingIdx = results.findIndex((r) => r.type === type);
                    if (existingIdx >= 0) {
                        if (result.success) {
                            result.generatedBy = result.generatedBy || 'antv';
                            results[existingIdx] = result;
                        } else {
                            results[existingIdx].antvError = result.errorMessage;
                        }
                    } else {
                        results.push(result);
                    }
                    if (result.fallback) fallbackUsed = true;
                } catch (err) {
                    const existingIdx = results.findIndex((r) => r.type === type);
                    if (existingIdx >= 0) {
                        results[existingIdx].antvError = err.message;
                    }
                }
            }
        }

        // 阶段3：AntV 仍失败的图表，降级到 Matplotlib
        const stillFailed = onlyTypes.filter(
            (t) => !results.find((r) => r.type === t && r.success)
        );
        if (stillFailed.length > 0 && this.fallbackToMatplotlib) {
            const pyResult = await this._fallbackToMatplotlib(scanData, stillFailed);
            if (pyResult.success) {
                results.forEach((r) => {
                    if (stillFailed.includes(r.type)) {
                        r.fallbackResolvedBy = 'matplotlib';
                        r.success = true;
                        r.generatedBy = 'matplotlib';
                    }
                });
            }
        }

        const success = results.every((r) => r.success);
        return { results, success, fallbackUsed, mcpConfigs };
    }

    /**
     * 获取待执行的 MCP 图表配置（供 AI agent 通过 run_mcp 执行）
     * @returns {Array} MCP 调用配置列表
     */
    getPendingMcpConfigs() {
        const configs = [];
        for (const type of this.mcpClient.getSupportedTypes()) {
            if (!this.mcpClient.isGenerated(type) && this.mcpClient.hasConfig(type)) {
                configs.push(this.mcpClient.readConfig(type));
            }
        }
        return configs;
    }

    async _generateOne(diagramType, config) {
        const fileName = DiagramService.FILE_NAME_MAP[diagramType];
        if (!fileName) {
            return { type: diagramType, success: false, errorMessage: '未知图表类型: ' + diagramType };
        }
        const destPath = path.join(this.diagramDir, fileName);

        const valid = this.antv.validateGraphData(config);
        if (!valid.valid) {
            return { type: diagramType, success: false, errorMessage: valid.error, fallback: true };
        }

        const result = await this.antv.generateAndDownload(
            {
                type: config.type || 'network-graph',
                data: { nodes: config.nodes, edges: config.edges },
                title: config.title,
                width: 1000,
                height: 700,
            },
            destPath
        );

        if (result.success) {
            return {
                type: diagramType,
                success: true,
                filePath: result.filePath,
                size: result.size,
            };
        }
        return {
            type: diagramType,
            success: false,
            errorMessage: result.errorMessage,
            fallback: true,
        };
    }

    async _fallbackToMatplotlib(scanData, types) {
        const { execFileSync } = require('child_process');
        const scriptPath = path.join(__dirname, '..', 'diagram-generator.py');
        if (!fs.existsSync(scriptPath)) {
            return { success: false, errorMessage: 'matplotlib降级脚本不存在: ' + scriptPath };
        }
        try {
            execFileSync(
                'python',
                [scriptPath, this.outputDir, scanData.moduleName || this.projectName],
                { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, cwd: path.dirname(scriptPath) }
            );
            return { success: true };
        } catch (e) {
            return { success: false, errorMessage: e.message };
        }
    }

    getDiagramDir() {
        return this.diagramDir;
    }
}

module.exports = { DiagramService };
