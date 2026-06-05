const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

/**
 * AntV 图表生成客户端
 *
 * 通过调用 antv-studio.alipay.com/api/gpt-vis 服务，
 * 将 nodes/edges 节点边结构数据渲染为美观的网络图/流程图，返回公网PNG图片URL。
 *
 * 支持图表类型：
 *   - network-graph：网络关系图（适合架构图、组件关系图、部署图）
 *   - flow-diagram：流程图（适合业务流程、状态流转）
 *   - mind-map：思维导图
 *   - organization-chart：组织架构图
 *   - fishbone-diagram：鱼骨图
 */
class AntVClient {
    constructor(options = {}) {
        this.endpoint = options.endpoint || 'https://antv-studio.alipay.com/api/gpt-vis';
        this.timeout = options.timeout || 60000;
        this.maxRetries = options.maxRetries || 2;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * 调用AntV接口生成图表
     * @param {Object} options
     * @param {string} options.type - 图表类型（network-graph/flow-diagram/mind-map等）
     * @param {Object} options.data - 节点边数据 {nodes, edges}
     * @param {number} [options.width=800] - 图片宽度
     * @param {number} [options.height=600] - 图片高度
     * @param {string} [options.title] - 图表标题
     * @param {string} [options.theme='default'] - 主题（default/academy/dark）
     * @returns {Promise<{success: boolean, url?: string, errorMessage?: string}>}
     */
    async generateChart(options) {
        const payload = {
            type: options.type,
            width: options.width || 800,
            height: options.height || 600,
            data: options.data,
            theme: options.theme || 'default',
        };
        if (options.title) payload.title = options.title;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this._callApi(payload);
                if (result.success && result.url) {
                    return { success: true, url: result.url };
                }
                if (attempt < this.maxRetries) {
                    await this._sleep(this.retryDelay * attempt);
                    continue;
                }
                return result;
            } catch (err) {
                if (attempt < this.maxRetries) {
                    await this._sleep(this.retryDelay * attempt);
                    continue;
                }
                return { success: false, errorMessage: err.message };
            }
        }
        return { success: false, errorMessage: '已达最大重试次数' };
    }

    _callApi(payload) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const url = new URL(this.endpoint);
            const req = https.request(
                {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data),
                    },
                    timeout: this.timeout,
                },
                (res) => {
                    let body = '';
                    res.on('data', (c) => (body += c));
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.success && parsed.resultObj) {
                                resolve({ success: true, url: parsed.resultObj });
                            } else {
                                resolve({
                                    success: false,
                                    errorMessage: parsed.errorMessage || body.substring(0, 300),
                                });
                            }
                        } catch (e) {
                            reject(new Error(`响应解析失败: ${e.message}, 原始: ${body.substring(0, 200)}`));
                        }
                    });
                }
            );
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时（' + this.timeout + 'ms）'));
            });
            req.write(data);
            req.end();
        });
    }

    /**
     * 下载AntV返回的图片URL到本地文件
     * @param {string} imageUrl - 公网图片URL
     * @param {string} destPath - 本地保存路径
     * @returns {Promise<{success: boolean, filePath?: string, size?: number, errorMessage?: string}>}
     */
    async downloadImage(imageUrl, destPath) {
        return new Promise((resolve) => {
            const dir = path.dirname(destPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const file = fs.createWriteStream(destPath);
            const cleanup = () => {
                try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (_) {}
            };
            https
                .get(imageUrl, (res) => {
                    if (res.statusCode !== 200) {
                        cleanup();
                        file.close();
                        resolve({ success: false, errorMessage: `HTTP ${res.statusCode}` });
                        return;
                    }
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        try {
                            const stat = fs.statSync(destPath);
                            resolve({ success: true, filePath: destPath, size: stat.size });
                        } catch (e) {
                            resolve({ success: false, errorMessage: e.message });
                        }
                    });
                })
                .on('error', (err) => {
                    cleanup();
                    file.close();
                    resolve({ success: false, errorMessage: err.message });
                });
        });
    }

    /**
     * 一站式生成并下载图表
     * @param {Object} options - 同 generateChart
     * @param {string} destPath - 本地保存路径
     */
    async generateAndDownload(options, destPath) {
        const result = await this.generateChart(options);
        if (!result.success) {
            return { success: false, errorMessage: result.errorMessage };
        }
        return this.downloadImage(result.url, destPath);
    }

    /**
     * 校验节点边数据是否合法（避免AntV服务端报错）
     */
    validateGraphData(data) {
        if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
            return { valid: false, error: 'nodes必须是非空数组' };
        }
        const nodeNames = new Set();
        for (const n of data.nodes) {
            if (!n.name) return { valid: false, error: '每个node必须有name字段' };
            if (nodeNames.has(n.name)) return { valid: false, error: `节点名重复: ${n.name}` };
            nodeNames.add(n.name);
        }
        if (Array.isArray(data.edges)) {
            const seenPairs = new Set();
            for (const e of data.edges) {
                if (!e.source || !e.target) return { valid: false, error: 'edge必须有source和target' };
                if (!nodeNames.has(e.source)) return { valid: false, error: `边的source不存在: ${e.source}` };
                if (!nodeNames.has(e.target)) return { valid: false, error: `边的target不存在: ${e.target}` };
                const pair = `${e.source}-${e.target}`;
                if (seenPairs.has(pair)) return { valid: false, error: `边重复: ${pair}` };
                seenPairs.add(pair);
            }
        }
        return { valid: true };
    }

    _sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }
}

module.exports = { AntVClient };
