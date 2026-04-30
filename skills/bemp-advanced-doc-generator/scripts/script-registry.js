/**
 * BEMP 脚本注册与复用管理模块
 * 实现脚本的发现、分类、版本管理和复用统计
 * 
 * 功能：
 * 1. 自动扫描项目scripts目录下的可复用脚本
 * 2. 实现脚本分类与智能匹配
 * 3. 版本管理和冲突处理
 * 4. 复用统计和质量评估
 * 
 * @author BEMP开发团队
 * @date 2026-04-18
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class ScriptRegistry {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..');
        this.scriptsDir = path.join(this.projectRoot, 'scripts');
        this.registryPath = path.join(this.scriptsDir, 'script-registry.json');
        this.statsPath = path.join(this.scriptsDir, 'script-stats.json');
        this.registry = this.loadRegistry();
        this.stats = this.loadStats();
    }

    /**
     * 加载脚本注册表
     */
    loadRegistry() {
        if (fs.existsSync(this.registryPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
            } catch (error) {
                console.warn('脚本注册表加载失败，将创建新的注册表');
            }
        }
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            scripts: []
        };
    }

    /**
     * 加载脚本统计信息
     */
    loadStats() {
        if (fs.existsSync(this.statsPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.statsPath, 'utf-8'));
            } catch (error) {
                console.warn('脚本统计信息加载失败，将创建新的统计信息');
            }
        }
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            totalReuses: 0,
            scripts: {}
        };
    }

    /**
     * 扫描项目根目录scripts文件夹
     */
    scanScriptsDirectory() {
        const discovered = [];
        
        if (!fs.existsSync(this.scriptsDir)) {
            console.log(`Scripts目录不存在: ${this.scriptsDir}`);
            return discovered;
        }

        const files = fs.readdirSync(this.scriptsDir, { recursive: true });
        
        for (const file of files) {
            const fullPath = path.join(this.scriptsDir, file);
            
            if (fs.statSync(fullPath).isFile() && file.endsWith('.js')) {
                const relativePath = path.relative(this.scriptsDir, fullPath);
                const scriptInfo = this.analyzeScript(fullPath, relativePath);
                if (scriptInfo) {
                    discovered.push(scriptInfo);
                }
            }
        }
        
        return discovered;
    }

    /**
     * 分析单个脚本文件
     */
    analyzeScript(fullPath, relativePath) {
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const stats = fs.statSync(fullPath);
            
            const scriptInfo = {
                name: path.basename(fullPath, '.js'),
                relativePath,
                fullPath,
                size: stats.size,
                createdTime: stats.birthtime.toISOString(),
                modifiedTime: stats.mtime.toISOString(),
                category: this.categorizeScript(content, relativePath),
                description: this.extractDescription(content),
                version: this.extractVersion(content),
                dependencies: this.extractDependencies(content),
                exports: this.extractExports(content),
                tags: this.extractTags(content)
            };
            
            return scriptInfo;
        } catch (error) {
            console.warn(`分析脚本失败: ${relativePath}`, error.message);
            return null;
        }
    }

    /**
     * 脚本分类规则
     */
    categorizeScript(content, relativePath) {
        const categories = {
            'doc-generator': {
                keywords: ['文档生成', 'document', 'generate', 'docx', 'markdown', '设计文档', '测试用例'],
                patterns: [/generateDocument/i, /createDoc/i, /DocumentGenerator/i]
            },
            'doc-template': {
                keywords: ['模板', 'template', 'format', '样式', 'formatting'],
                patterns: [/template/i, /formatStyle/i, /styleConfig/i]
            },
            'visualization': {
                keywords: ['可视化', 'visualization', 'chart', 'graph', '流程图', '思维导图'],
                patterns: [/visualization/i, /chart/i, /processon/i, /mermaid/i]
            },
            'code-analyzer': {
                keywords: ['代码分析', 'analyzer', 'scanner', 'parser', '扫描'],
                patterns: [/analyze/i, /scan/i, /parse/i, /CodeAnalyzer/i]
            },
            'data-extractor': {
                keywords: ['数据提取', 'extractor', 'extract', '解析', '提取'],
                patterns: [/extract/i, /parse/i, /DataExtractor/i]
            },
            'utility': {
                keywords: ['工具', 'utility', 'helper', 'utils', '辅助'],
                patterns: [/utility/i, /helper/i, /util/i]
            },
            'report-generator': {
                keywords: ['报告', 'report', '生成报告', '报表'],
                patterns: [/report/i, /ReportGenerator/i]
            },
            'test-generator': {
                keywords: ['测试生成', 'test case', '测试用例', 'test generator'],
                patterns: [/test.*generate/i, /TestCase/i]
            }
        };

        let bestMatch = 'utility';
        let bestScore = 0;

        for (const [category, rules] of Object.entries(categories)) {
            let score = 0;
            
            for (const keyword of rules.keywords) {
                if (content.includes(keyword) || relativePath.includes(keyword)) {
                    score += 1;
                }
            }
            
            for (const pattern of rules.patterns) {
                if (pattern.test(content)) {
                    score += 2;
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = category;
            }
        }

        return bestMatch;
    }

    /**
     * 提取脚本描述信息
     */
    extractDescription(content) {
        const patterns = [
            /\/\*\*[\s\S]*?@description\s+([^\n*]+)/i,
            /\/\*\*[\s\S]*?描述[：:]\s*([^\n*]+)/i,
            /\/\*\*[\s\S]*?\*[\s]*([^\n*]{10,})/,
            /\/\/\s+Description[：:]\s*(.+)/i,
            /\/\/\s+描述[：:]\s*(.+)/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return '未提供描述信息';
    }

    /**
     * 提取脚本版本
     */
    extractVersion(content) {
        const patterns = [
            /@version\s+([^\s*]+)/i,
            /版本[：:]\s*([^\s\n]+)/i,
            /version[：:]\s*["']?([^\s"']+)/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return '1.0.0';
    }

    /**
     * 提取脚本依赖
     */
    extractDependencies(content) {
        const deps = new Set();
        
        const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        let match;
        
        while ((match = requirePattern.exec(content)) !== null) {
            const dep = match[1];
            if (!dep.startsWith('.') && !dep.startsWith('/')) {
                deps.add(dep);
            }
        }
        
        return Array.from(deps);
    }

    /**
     * 提取脚本导出信息
     */
    extractExports(content) {
        const exports = [];
        
        const patterns = [
            /module\.exports\s*=\s*\{([^}]+)\}/,
            /exports\.(\w+)\s*=/g,
            /class\s+(\w+)\s+extends/g,
            /function\s+(\w+)\s*\(/g
        ];
        
        const classPattern = /class\s+(\w+)/g;
        let match;
        
        while ((match = classPattern.exec(content)) !== null) {
            exports.push({ type: 'class', name: match[1] });
        }
        
        const funcPattern = /^(?:async\s+)?function\s+(\w+)/gm;
        while ((match = funcPattern.exec(content)) !== null) {
            exports.push({ type: 'function', name: match[1] });
        }
        
        return exports;
    }

    /**
     * 提取脚本标签
     */
    extractTags(content) {
        const tags = [];
        const tagPattern = /@(\w+)/g;
        let match;
        
        while ((match = tagPattern.exec(content)) !== null) {
            const tag = match[1];
            if (!['param', 'return', 'throws', 'author', 'date', 'version', 'description'].includes(tag)) {
                tags.push(tag);
            }
        }
        
        return tags;
    }

    /**
     * 更新注册表
     */
    updateRegistry(discoveredScripts) {
        const existingScripts = new Map();
        
        for (const script of this.registry.scripts) {
            existingScripts.set(script.name, script);
        }
        
        for (const discovered of discoveredScripts) {
            const existing = existingScripts.get(discovered.name);
            
            if (!existing) {
                this.registry.scripts.push({
                    ...discovered,
                    registeredAt: new Date().toISOString(),
                    status: 'available'
                });
            } else if (existing.modifiedTime !== discovered.modifiedTime) {
                existing.version = this.handleVersionUpgrade(existing, discovered);
                existing.modifiedTime = discovered.modifiedTime;
                existing.description = discovered.description;
                existing.category = discovered.category;
                existing.tags = discovered.tags;
                existing.dependencies = discovered.dependencies;
                existing.exports = discovered.exports;
                existing.lastUpdated = new Date().toISOString();
            }
        }
        
        this.registry.lastUpdated = new Date().toISOString();
        this.saveRegistry();
    }

    /**
     * 处理版本升级
     */
    handleVersionUpgrade(existing, discovered) {
        const currentVersion = existing.version || '1.0.0';
        const parts = currentVersion.split('.').map(Number);
        
        if (parts.length === 3) {
            parts[2]++;
            return parts.join('.');
        }
        
        return '1.0.1';
    }

    /**
     * 保存注册表
     */
    saveRegistry() {
        const dir = path.dirname(this.registryPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2), 'utf-8');
    }

    /**
     * 保存统计信息
     */
    saveStats() {
        const dir = path.dirname(this.statsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.statsPath, JSON.stringify(this.stats, null, 2), 'utf-8');
    }

    /**
     * 根据任务类型匹配最适用的脚本
     */
    matchScriptsForTask(taskType, taskDescription) {
        const categoryMap = {
            'design': ['doc-generator', 'doc-template', 'code-analyzer', 'data-extractor'],
            'testcase': ['test-generator', 'doc-generator', 'doc-template'],
            'visualization': ['visualization', 'doc-generator'],
            'report': ['report-generator', 'doc-generator', 'doc-template']
        };

        const preferredCategories = categoryMap[taskType] || ['utility'];
        const matches = [];

        for (const script of this.registry.scripts) {
            if (script.status !== 'available') continue;

            let score = 0;

            if (preferredCategories.includes(script.category)) {
                score += 10;
            }

            if (taskDescription) {
                const descLower = taskDescription.toLowerCase();
                const scriptDescLower = script.description.toLowerCase();
                
                if (descLower.includes(script.name.toLowerCase())) {
                    score += 5;
                }
                
                for (const tag of script.tags) {
                    if (descLower.includes(tag.toLowerCase())) {
                        score += 3;
                    }
                }
            }

            if (score > 0) {
                matches.push({ script, score });
            }
        }

        matches.sort((a, b) => b.score - a.score);
        return matches.map(m => m.script);
    }

    /**
     * 记录脚本复用
     */
    recordScriptReuse(scriptName, documentType, qualityScore = 1.0) {
        if (!this.stats.scripts[scriptName]) {
            this.stats.scripts[scriptName] = {
                name: scriptName,
                reuseCount: 0,
                documents: {},
                avgQualityScore: 0,
                firstUsed: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
        }

        const scriptStats = this.stats.scripts[scriptName];
        scriptStats.reuseCount++;
        scriptStats.lastUsed = new Date().toISOString();

        if (!scriptStats.documents[documentType]) {
            scriptStats.documents[documentType] = 0;
        }
        scriptStats.documents[documentType]++;

        scriptStats.avgQualityScore = (
            (scriptStats.avgQualityScore * (scriptStats.reuseCount - 1) + qualityScore) / 
            scriptStats.reuseCount
        ).toFixed(2);

        this.stats.totalReuses++;
        this.stats.lastUpdated = new Date().toISOString();
        this.saveStats();
    }

    /**
     * 获取脚本复用统计
     */
    getReuseStats() {
        const topScripts = Object.values(this.stats.scripts)
            .sort((a, b) => b.reuseCount - a.reuseCount)
            .slice(0, 10);

        return {
            totalReuses: this.stats.totalReuses,
            totalScripts: Object.keys(this.stats.scripts).length,
            lastUpdated: this.stats.lastUpdated,
            topScripts: topScripts.map(s => ({
                name: s.name,
                reuseCount: s.reuseCount,
                avgQualityScore: s.avgQualityScore,
                lastUsed: s.lastUsed
            }))
        };
    }

    /**
     * 处理同名脚本冲突
     */
    handleConflict(newScript, conflictStrategy = 'version') {
        const existing = this.registry.scripts.find(s => s.name === newScript.name);
        
        if (!existing) {
            return { action: 'register', script: newScript };
        }

        switch (conflictStrategy) {
            case 'overwrite':
                return { action: 'overwrite', script: newScript, existing };
            
            case 'rename':
                const newName = `${newScript.name}_${Date.now()}`;
                const renamedScript = { ...newScript, name: newName };
                return { action: 'rename', script: renamedScript, existing };
            
            case 'version':
            default:
                newScript.version = this.handleVersionUpgrade(existing, newScript);
                return { action: 'version-upgrade', script: newScript, existing };
        }
    }

    /**
     * 验证脚本有效性
     */
    async validateScript(script) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        try {
            if (!fs.existsSync(script.fullPath)) {
                result.valid = false;
                result.errors.push(`脚本文件不存在: ${script.fullPath}`);
                return result;
            }

            const content = fs.readFileSync(script.fullPath, 'utf-8');
            
            if (!content.trim()) {
                result.valid = false;
                result.errors.push('脚本文件为空');
                return result;
            }

            try {
                require(script.fullPath);
            } catch (requireError) {
                if (requireError.code !== 'MODULE_NOT_FOUND') {
                    result.warnings.push(`脚本加载可能存在问题: ${requireError.message}`);
                }
            }

            for (const dep of script.dependencies) {
                try {
                    require.resolve(dep);
                } catch (e) {
                    result.warnings.push(`依赖可能未安装: ${dep}`);
                }
            }

        } catch (error) {
            result.valid = false;
            result.errors.push(`验证失败: ${error.message}`);
        }

        return result;
    }

    /**
     * 生成复用报告
     */
    generateReuseReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            summary: this.getReuseStats(),
            scripts: this.registry.scripts.map(s => ({
                name: s.name,
                category: s.category,
                version: s.version,
                description: s.description,
                status: s.status,
                stats: this.stats.scripts[s.name] || null
            }))
        };

        return report;
    }
}

module.exports = { ScriptRegistry };
