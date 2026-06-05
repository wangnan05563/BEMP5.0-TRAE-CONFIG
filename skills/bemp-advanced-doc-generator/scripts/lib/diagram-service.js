const fs = require('fs');
const path = require('path');
const { AntVClient } = require('./antv-client');
const { VisualizationGenerator } = require('./visualization');

/**
 * 图表生成服务
 *
 * 工作流程：
 * 1. 调用 VisualizationGenerator 生成 AntV 格式的节点边数据
 * 2. 通过 AntVClient 调用 antv-studio.alipay.com 接口渲染图表
 * 3. 将返回的PNG图片下载到 output/diagrams 目录
 * 4. 命名规则与 outline-design-generator.py 中 diagram_map 对应：
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
        this.useAntV = options.useAntV !== false;
        this.fallbackToMatplotlib = options.fallbackToMatplotlib !== false;
        this.projectName = options.projectName || '本项目';

        if (!fs.existsSync(this.diagramDir)) {
            fs.mkdirSync(this.diagramDir, { recursive: true });
        }
    }

    static FILE_NAME_MAP = {
        network: 'network-topology.png',
        architecture: 'architecture-diagram.png',
        deployment: 'deployment-diagram.png',
    };

    /**
     * 一次生成所有图表（网络/组件/部署）
     * @param {Object} scanData - 项目扫描数据
     * @param {Object} [options] - 配置项
     * @param {string} [options.onlyTypes] - 限定类型数组，例：['network']
     * @returns {Promise<{results: Array, success: boolean, fallbackUsed: boolean}>}
     */
    async generateAll(scanData, options = {}) {
        const onlyTypes = options.onlyTypes || ['architecture', 'network', 'deployment'];
        const results = [];
        let fallbackUsed = false;

        if (this.useAntV) {
            for (const type of onlyTypes) {
                try {
                    const config = this.vizGen.generateMcpFlowDiagramConfig(
                        scanData.projectName || this.projectName,
                        type,
                        scanData
                    );
                    const result = await this._generateOne(type, config);
                    results.push(result);
                    if (result.fallback) fallbackUsed = true;
                } catch (err) {
                    results.push({
                        type,
                        success: false,
                        errorMessage: err.message,
                        fallback: false,
                    });
                }
            }
        }

        if (fallbackUsed && this.fallbackToMatplotlib) {
            const needPython = onlyTypes.filter(
                (t) => !results.find((r) => r.type === t && r.success)
            );
            if (needPython.length > 0) {
                const pyResult = await this._fallbackToMatplotlib(scanData, needPython);
                if (pyResult.success) {
                    results.forEach((r) => {
                        if (needPython.includes(r.type)) {
                            r.fallbackResolvedBy = 'matplotlib';
                            r.success = true;
                        }
                    });
                }
            }
        }

        const success = results.every((r) => r.success);
        return { results, success, fallbackUsed };
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
