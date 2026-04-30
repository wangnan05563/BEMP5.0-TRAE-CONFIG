/**
 * BEMP 智能文档生成器
 * 集成脚本复用机制的增强版文档生成器
 * 
 * 特性：
 * 1. 自动扫描和复用项目scripts目录中的脚本
 * 2. 智能匹配最适合当前任务的脚本
 * 3. 版本管理和冲突处理
 * 4. 复用统计和质量评估
 * 
 * @author BEMP开发团队
 * @date 2026-04-18
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { ScriptRegistry } = require('./script-registry');

class SmartDocumentGenerator {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..', '..');
        this.scriptRegistry = new ScriptRegistry({ projectRoot: this.projectRoot });
        this.reusedScripts = [];
        this.scriptReports = [];
        
        console.log('智能文档生成器初始化完成');
        console.log(`项目根目录: ${this.projectRoot}`);
    }

    /**
     * 执行文档生成流程
     */
    async generateDocument(moduleName, type = 'design', format = 'both') {
        console.log('\n========================================');
        console.log('  BEMP 智能文档生成器 v2.0');
        console.log('========================================\n');

        const taskDescription = `${moduleName} - ${type === 'design' ? '详细设计文档' : '测试用例文档'}`;
        
        console.log('步骤 1: 扫描项目scripts目录...');
        const discoveredScripts = this.scriptRegistry.scanScriptsDirectory();
        console.log(`  发现 ${discoveredScripts.length} 个脚本\n`);

        console.log('步骤 2: 更新脚本注册表...');
        this.scriptRegistry.updateRegistry(discoveredScripts);
        console.log('  注册表已更新\n');

        console.log('步骤 3: 匹配适用脚本...');
        const matchedScripts = this.scriptRegistry.matchScriptsForTask(type, taskDescription);
        console.log(`  匹配到 ${matchedScripts.length} 个适用脚本\n`);

        if (matchedScripts.length > 0) {
            console.log('步骤 4: 验证并复用脚本...');
            for (const script of matchedScripts.slice(0, 3)) {
                const validation = await this.scriptRegistry.validateScript(script);
                
                if (validation.valid) {
                    console.log(`  ✓ 脚本 ${script.name} 验证通过，准备复用`);
                    this.reusedScripts.push(script);
                    
                    this.scriptRegistry.recordScriptReuse(script.name, type, 0.95);
                    
                    this.scriptReports.push({
                        scriptName: script.name,
                        version: script.version,
                        category: script.category,
                        description: script.description,
                        validation
                    });
                } else {
                    console.log(`  ✗ 脚本 ${script.name} 验证失败: ${validation.errors.join(', ')}`);
                }
            }
            console.log('');
        }

        console.log('步骤 5: 生成文档...');
        const { DocumentGenerator } = require('./generate-doc');
        const outputDir = path.join(__dirname, 'output');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const generator = new DocumentGenerator('详细设计文档模板.json');
        const results = [];

        if (type === 'design') {
            if (format === 'both' || format === 'docx') {
                const docxPath = path.join(outputDir, `${moduleName}-详细设计.docx`);
                await generator.generateDesignDocument(moduleName, docxPath);
                results.push(docxPath);
                console.log(`  ✓ Word 详细设计文档: ${docxPath}`);
            }

            if (format === 'both' || format === 'md') {
                const mdPath = path.join(outputDir, `${moduleName}-详细设计.md`);
                generator.generateMarkdown(moduleName, mdPath, 'design');
                results.push(mdPath);
                console.log(`  ✓ Markdown 详细设计文档: ${mdPath}`);
            }
        } else if (type === 'testcase') {
            if (format === 'both' || format === 'docx') {
                const docxPath = path.join(outputDir, `${moduleName}-测试用例.docx`);
                await generator.generateTestCaseDocument(moduleName, docxPath);
                results.push(docxPath);
                console.log(`  ✓ Word 测试用例文档: ${docxPath}`);
            }

            if (format === 'both' || format === 'md') {
                const mdPath = path.join(outputDir, `${moduleName}-测试用例.md`);
                generator.generateMarkdown(moduleName, mdPath, 'testcase');
                results.push(mdPath);
                console.log(`  ✓ Markdown 测试用例文档: ${mdPath}`);
            }
        }

        console.log('\n步骤 6: 生成脚本复用报告...');
        if (this.reusedScripts.length > 0) {
            const reuseReport = this.generateReuseReport();
            console.log('  复用报告已生成');
            console.log(`  复用脚本数量: ${this.reusedScripts.length}`);
            for (const report of this.scriptReports) {
                console.log(`    - ${report.scriptName} v${report.version}`);
            }
        } else {
            console.log('  本次未复用脚本，使用标准模板生成');
        }

        console.log('\n步骤 7: 生成统计信息...');
        const stats = this.scriptRegistry.getReuseStats();
        console.log(`  总复用次数: ${stats.totalReuses}`);
        console.log(`  已注册脚本: ${stats.totalScripts}`);

        console.log('\n========================================');
        console.log('  文档生成完成！');
        console.log('========================================\n');

        return {
            results,
            reusedScripts: this.reusedScripts,
            scriptReports: this.scriptReports,
            stats
        };
    }

    /**
     * 生成脚本复用报告
     */
    generateReuseReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            reusedScripts: this.scriptReports.map(r => ({
                name: r.scriptName,
                version: r.version,
                category: r.category,
                description: r.description,
                validation: {
                    valid: r.validation.valid,
                    warnings: r.validation.warnings
                }
            })),
            stats: this.scriptRegistry.getReuseStats()
        };

        const reportPath = path.join(__dirname, 'output', 'script-reuse-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

        return report;
    }

    /**
     * 注册新脚本到scripts目录
     */
    registerNewScript(scriptName, scriptContent, options = {}) {
        const scriptsDir = path.join(this.projectRoot, 'scripts');
        
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }

        const scriptPath = path.join(scriptsDir, `${scriptName}.js`);
        
        let finalPath = scriptPath;
        let conflictStrategy = options.conflictStrategy || 'version';

        if (fs.existsSync(scriptPath)) {
            const newScriptInfo = this.scriptRegistry.analyzeScript(scriptPath, `${scriptName}.js`);
            const conflictResult = this.scriptRegistry.handleConflict(newScriptInfo, conflictStrategy);
            
            switch (conflictResult.action) {
                case 'overwrite':
                    console.log(`覆盖现有脚本: ${scriptName}`);
                    break;
                case 'rename':
                    finalPath = path.join(scriptsDir, `${conflictResult.script.name}.js`);
                    console.log(`重命名脚本: ${conflictResult.script.name}`);
                    break;
                case 'version-upgrade':
                    console.log(`升级脚本版本: ${scriptName} -> ${conflictResult.script.version}`);
                    break;
            }
        }

        fs.writeFileSync(finalPath, scriptContent, 'utf-8');
        console.log(`脚本已保存: ${finalPath}`);

        return finalPath;
    }
}

module.exports = { SmartDocumentGenerator };
