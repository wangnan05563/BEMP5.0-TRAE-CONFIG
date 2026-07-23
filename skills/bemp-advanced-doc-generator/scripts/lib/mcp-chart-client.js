const fs = require('fs');
const path = require('path');

/**
 * MCP 图表客户端 - 通过 mcp-server-chart 生成图表
 *
 * 工作原理：
 * 1. 将项目扫描数据转换为 mcp-server-chart 工具所需的输入参数
 * 2. 生成 MCP 调用配置文件（JSON），供 AI agent 读取并通过 run_mcp 执行
 * 3. AI agent 执行 run_mcp 后，图表图片保存到 output/diagrams 目录
 * 4. 如果 MCP 不可用，降级到 AntV → Graphviz → Matplotlib
 *
 * 图表类型映射：
 *   network     → generate_network_graph  (网络结构图)
 *   architecture → generate_flow_diagram   (组件结构图/系统架构图)
 *   deployment  → generate_organization_chart (部署图)
 *
 * 使用方式（AI agent 侧）：
 *   const config = mcpClient.generateCallConfig(scanData, 'network');
 *   // config 包含 server_name, tool_name, args
 *   // AI agent 通过 run_mcp 调用：
 *   // run_mcp({ server_name: "mcp_mcp-server-chart", tool_name: "generate_network_graph", args: config.args })
 */
class McpChartClient {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output');
        this.diagramDir = path.join(this.outputDir, 'diagrams');
        this.configDir = path.join(this.outputDir, 'mcp-chart-configs');
        this.projectName = options.projectName || '本项目';
        this.serverName = 'mcp_mcp-server-chart';

        // 图表类型 → mcp-server-chart 工具名映射
        this.TOOL_MAP = {
            network: 'generate_network_graph',
            architecture: 'generate_flow_diagram',
            deployment: 'generate_organization_chart',
        };

        // 图表类型 → 输出文件名映射（与 DiagramService.FILE_NAME_MAP 一致）
        this.FILE_NAME_MAP = {
            network: 'network-topology.png',
            architecture: 'architecture-diagram.png',
            deployment: 'deployment-diagram.png',
        };

        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    /**
     * 生成 MCP 调用配置
     * @param {Object} scanData - 项目扫描数据
     * @param {string} diagramType - 图表类型: 'network' | 'architecture' | 'deployment'
     * @returns {Object|null} MCP 调用配置，包含 server_name, tool_name, args, outputFile
     */
    generateCallConfig(scanData, diagramType) {
        const toolName = this.TOOL_MAP[diagramType];
        if (!toolName) {
            console.warn(`[McpChartClient] 不支持的图表类型: ${diagramType}`);
            return null;
        }

        const fileName = this.FILE_NAME_MAP[diagramType];
        const outputFile = path.join(this.diagramDir, fileName);

        let args;
        switch (diagramType) {
            case 'network':
                args = this._buildNetworkGraphArgs(scanData);
                break;
            case 'architecture':
                args = this._buildFlowDiagramArgs(scanData);
                break;
            case 'deployment':
                args = this._buildOrgChartArgs(scanData);
                break;
            default:
                return null;
        }

        const config = {
            server_name: this.serverName,
            tool_name: toolName,
            args: args,
            outputFile: outputFile,
            diagramType: diagramType,
            fileName: fileName,
        };

        // 保存配置文件供 AI agent 读取
        const configPath = path.join(this.configDir, `${diagramType}-mcp-config.json`);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        return config;
    }

    /**
     * 构建网络结构图参数
     * 映射到 mcp-server-chart: generate_network_graph
     */
    _buildNetworkGraphArgs(scanData) {
        const nodes = [];
        const edges = [];

        // 从扫描数据提取网络节点
        const services = scanData.services || {};
        for (const [name, info] of Object.entries(services)) {
            nodes.push({
                id: name,
                label: name,
                category: info.type || 'service',
                port: info.port,
            });
        }

        // 从扫描数据提取连接关系
        const connections = scanData.connections || [];
        for (const conn of connections) {
            edges.push({
                source: conn.from,
                target: conn.to,
                label: conn.protocol || '',
            });
        }

        return {
            title: `${scanData.projectName || this.projectName} - 网络拓扑图`,
            nodes: nodes.length > 0 ? nodes : this._defaultNetworkNodes(scanData),
            edges: edges.length > 0 ? edges : this._defaultNetworkEdges(),
            width: 1000,
            height: 700,
        };
    }

    /**
     * 构建组件结构图参数
     * 映射到 mcp-server-chart: generate_flow_diagram
     */
    _buildFlowDiagramArgs(scanData) {
        const nodes = [];
        const edges = [];

        // 从扫描数据提取模块/组件
        const modules = scanData.modules || [];
        for (const mod of modules) {
            nodes.push({
                id: mod.name,
                label: mod.name,
                type: mod.type || 'module',
            });
        }

        // 从扫描数据提取组件间调用关系
        const dependencies = scanData.dependencies || [];
        for (const dep of dependencies) {
            edges.push({
                source: dep.from,
                target: dep.to,
                label: dep.description || '',
            });
        }

        return {
            title: `${scanData.projectName || this.projectName} - 系统架构图`,
            nodes: nodes.length > 0 ? nodes : this._defaultArchNodes(scanData),
            edges: edges.length > 0 ? edges : this._defaultArchEdges(),
            direction: 'TB',
            width: 1000,
            height: 700,
        };
    }

    /**
     * 构建部署图参数
     * 映射到 mcp-server-chart: generate_organization_chart
     */
    _buildOrgChartArgs(scanData) {
        const nodes = [];

        // 从扫描数据提取部署层级
        const deployInfo = scanData.deployment || {};
        nodes.push({
            id: 'root',
            label: scanData.projectName || this.projectName,
            type: 'root',
        });

        const layers = deployInfo.layers || ['基础设施层', '应用层'];
        for (const layer of layers) {
            const layerId = layer.replace(/\s/g, '_');
            nodes.push({
                id: layerId,
                label: layer,
                parentId: 'root',
                type: 'layer',
            });

            const components = deployInfo[layer] || [];
            for (const comp of components) {
                nodes.push({
                    id: `${layerId}_${comp.name}`,
                    label: comp.name,
                    parentId: layerId,
                    type: 'component',
                    port: comp.port,
                });
            }
        }

        return {
            title: `${scanData.projectName || this.projectName} - 部署架构图`,
            nodes: nodes.length > 1 ? nodes : this._defaultDeployNodes(scanData),
            width: 1000,
            height: 700,
        };
    }

    // 默认网络节点（当扫描数据不足时使用）
    _defaultNetworkNodes(scanData) {
        const projectName = scanData.projectName || this.projectName;
        return [
            { id: 'frontend', label: '前端服务', category: 'web', port: 8091 },
            { id: 'backend', label: '后端服务', category: 'api', port: 8010 },
            { id: 'adapter', label: '适配器服务', category: 'api', port: 8090 },
            { id: 'redis', label: 'Redis', category: 'cache', port: 6379 },
            { id: 'zookeeper', label: 'ZooKeeper', category: 'coordinator', port: 2181 },
            { id: 'oracle', label: 'Oracle DB', category: 'database', port: 1521 },
        ];
    }

    _defaultNetworkEdges() {
        return [
            { source: 'frontend', target: 'backend', label: 'HTTP' },
            { source: 'backend', target: 'adapter', label: 'HTTP' },
            { source: 'backend', target: 'redis', label: 'TCP' },
            { source: 'backend', target: 'zookeeper', label: 'TCP' },
            { source: 'backend', target: 'oracle', label: 'JDBC' },
            { source: 'adapter', target: 'oracle', label: 'JDBC' },
        ];
    }

    _defaultArchNodes(scanData) {
        const projectName = scanData.projectName || this.projectName;
        return [
            { id: 'ui', label: '前端 UI 层', type: 'layer' },
            { id: 'api', label: 'API 接口层', type: 'layer' },
            { id: 'biz', label: '业务逻辑层', type: 'layer' },
            { id: 'dao', label: '数据访问层', type: 'layer' },
            { id: 'db', label: '数据库', type: 'storage' },
        ];
    }

    _defaultArchEdges() {
        return [
            { source: 'ui', target: 'api', label: '调用' },
            { source: 'api', target: 'biz', label: '调用' },
            { source: 'biz', target: 'dao', label: '调用' },
            { source: 'dao', target: 'db', label: '读写' },
        ];
    }

    _defaultDeployNodes(scanData) {
        const projectName = scanData.projectName || this.projectName;
        return [
            { id: 'root', label: projectName, type: 'root' },
            { id: 'infra', label: '基础设施层', parentId: 'root', type: 'layer' },
            { id: 'app', label: '应用层', parentId: 'root', type: 'layer' },
            { id: 'infra_redis', label: 'Redis', parentId: 'infra', type: 'component', port: 6379 },
            { id: 'infra_zk', label: 'ZooKeeper', parentId: 'infra', type: 'component', port: 2181 },
            { id: 'app_backend', label: 'SpringBoot', parentId: 'app', type: 'component', port: 8010 },
            { id: 'app_frontend', label: 'Frontend', parentId: 'app', type: 'component', port: 8091 },
        ];
    }

    /**
     * 检查 MCP 图表配置是否已生成
     * @param {string} diagramType - 图表类型
     * @returns {boolean}
     */
    hasConfig(diagramType) {
        const configPath = path.join(this.configDir, `${diagramType}-mcp-config.json`);
        return fs.existsSync(configPath);
    }

    /**
     * 读取 MCP 图表配置
     * @param {string} diagramType - 图表类型
     * @returns {Object|null}
     */
    readConfig(diagramType) {
        const configPath = path.join(this.configDir, `${diagramType}-mcp-config.json`);
        if (!fs.existsSync(configPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (e) {
            return null;
        }
    }

    /**
     * 检查图表文件是否已生成（MCP 调用后）
     * @param {string} diagramType - 图表类型
     * @returns {boolean}
     */
    isGenerated(diagramType) {
        const fileName = this.FILE_NAME_MAP[diagramType];
        if (!fileName) return false;
        const filePath = path.join(this.diagramDir, fileName);
        if (!fs.existsSync(filePath)) return false;
        // 质量门禁：文件必须 > 10KB
        const stat = fs.statSync(filePath);
        return stat.size > 10240;
    }

    /**
     * 获取支持的图表类型列表
     * @returns {string[]}
     */
    getSupportedTypes() {
        return Object.keys(this.TOOL_MAP);
    }
}

module.exports = { McpChartClient };
