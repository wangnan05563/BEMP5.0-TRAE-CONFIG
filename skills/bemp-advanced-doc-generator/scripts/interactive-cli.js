/**
 * BEMP 高级文档生成器 - 交互式命令行界面
 * 提供直观的场景选择和参数配置选项
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { VisualizationGenerator } = require('./processon-integration');

class InteractiveCLI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.visualizationGenerator = new VisualizationGenerator();
        
        this.options = {
            type: 'design',
            module: '',
            format: 'both',
            visualization: true,
            template: 'default'
        };
    }

    /**
     * 启动交互式界面
     */
    async start() {
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║     BEMP 高级文档生成器 - 交互式界面                      ║');
        console.log('║     Version 2.0.0                                         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        await this.showMainMenu();
    }

    /**
     * 显示主菜单
     */
    async showMainMenu() {
        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│ 主菜单                                                  │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 1. 生成详细设计文档                                      │');
        console.log('│ 2. 生成测试用例文档                                      │');
        console.log('│ 3. 高级配置                                              │');
        console.log('│ 4. 退出                                                  │');
        console.log('└─────────────────────────────────────────────────────────┘');

        const choice = await this.askQuestion('请选择操作 (1-4): ');

        switch (choice) {
            case '1':
                await this.generateDesignDocument();
                break;
            case '2':
                await this.generateTestCaseDocument();
                break;
            case '3':
                await this.advancedConfig();
                break;
            case '4':
                console.log('\n感谢使用 BEMP 高级文档生成器！\n');
                this.rl.close();
                break;
            default:
                console.log('\n无效选择，请重新输入。\n');
                await this.showMainMenu();
        }
    }

    /**
     * 高级配置菜单
     */
    async advancedConfig() {
        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│ 高级配置                                                │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 当前配置：                                              │');
        console.log(`│   - 文档类型: ${this.options.type === 'design' ? '详细设计' : '测试用例'}`);
        console.log(`│   - 模块名称: ${this.options.module || '未设置'}`);
        console.log(`│   - 输出格式: ${this.options.format}`);
        console.log(`│   - 生成可视化: ${this.options.visualization ? '是' : '否'}`);
        console.log(`│   - 模板名称: ${this.options.template}`);
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 1. 修改文档类型                                          │');
        console.log('│ 2. 修改模块名称                                          │');
        console.log('│ 3. 修改输出格式                                          │');
        console.log('│ 4. 切换可视化生成                                        │');
        console.log('│ 5. 修改模板                                              │');
        console.log('│ 6. 返回主菜单                                            │');
        console.log('└─────────────────────────────────────────────────────────┘');

        const choice = await this.askQuestion('请选择操作 (1-6): ');

        switch (choice) {
            case '1':
                await this.configureType();
                break;
            case '2':
                await this.configureModule();
                break;
            case '3':
                await this.configureFormat();
                break;
            case '4':
                this.options.visualization = !this.options.visualization;
                break;
            case '5':
                await this.configureTemplate();
                break;
            case '6':
                break;
            default:
                console.log('\n无效选择，请重新输入。\n');
        }

        await this.advancedConfig();
    }

    /**
     * 配置文档类型
     */
    async configureType() {
        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│ 选择文档类型                                            │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 1. 详细设计文档                                          │');
        console.log('│ 2. 测试用例文档                                          │');
        console.log('└─────────────────────────────────────────────────────────┘');

        const choice = await this.askQuestion('请选择 (1-2): ');

        if (choice === '1') {
            this.options.type = 'design';
            console.log('✓ 已设置为详细设计文档');
        } else if (choice === '2') {
            this.options.type = 'testcase';
            console.log('✓ 已设置为测试用例文档');
        } else {
            console.log('✗ 无效选择');
        }
    }

    /**
     * 配置模块名称
     */
    async configureModule() {
        const moduleName = await this.askQuestion('请输入模块名称: ');
        if (moduleName.trim()) {
            this.options.module = moduleName.trim();
            console.log(`✓ 模块名称已设置为: ${this.options.module}`);
        } else {
            console.log('✗ 模块名称不能为空');
        }
    }

    /**
     * 配置输出格式
     */
    async configureFormat() {
        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│ 选择输出格式                                            │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ 1. Markdown (.md) 和 Word (.docx) 双格式               │');
        console.log('│ 2. 仅 Word (.docx)                                      │');
        console.log('│ 3. 仅 Markdown (.md)                                    │');
        console.log('└─────────────────────────────────────────────────────────┘');

        const choice = await this.askQuestion('请选择 (1-3): ');

        if (choice === '1') {
            this.options.format = 'both';
            console.log('✓ 已设置为双格式输出');
        } else if (choice === '2') {
            this.options.format = 'docx';
            console.log('✓ 已设置为仅 Word 格式');
        } else if (choice === '3') {
            this.options.format = 'md';
            console.log('✓ 已设置为仅 Markdown 格式');
        } else {
            console.log('✗ 无效选择');
        }
    }

    /**
     * 配置模板
     */
    async configureTemplate() {
        const templatesDir = path.join(__dirname, '..', 'assets', 'templates');
        
        if (!fs.existsSync(templatesDir)) {
            console.log('\n✗ 模板目录不存在');
            return;
        }

        const files = fs.readdirSync(templatesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));

        if (files.length === 0) {
            console.log('\n✗ 没有可用的模板文件');
            return;
        }

        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│ 可用模板                                                │');
        console.log('├─────────────────────────────────────────────────────────┤');

        files.forEach((template, index) => {
            console.log(`│ ${index + 1}. ${template}`);
        });

        console.log('└─────────────────────────────────────────────────────────┘');

        const choice = await this.askQuestion('请选择模板编号: ');
        const index = parseInt(choice) - 1;

        if (index >= 0 && index < files.length) {
            this.options.template = files[index];
            console.log(`✓ 已选择模板: ${this.options.template}`);
        } else {
            console.log('✗ 无效选择');
        }
    }

    /**
     * 生成详细设计文档
     */
    async generateDesignDocument() {
        if (!this.options.module) {
            console.log('\n✗ 请先在高级配置中设置模块名称');
            return;
        }

        console.log(`\n正在生成 "${this.options.module}" 的详细设计文档...`);

        try {
            const { generateDoc } = require('./generate-doc.js');
            
            const results = [];
            
            if (this.options.format === 'both' || this.options.format === 'docx') {
                const docxPath = path.join(__dirname, '..', 'output', 
                    `${this.options.module}-详细设计.docx`);
                await generateDoc(this.options.type, this.options.module, docxPath);
                results.push(`✓ Word 文档已生成: ${docxPath}`);
            }

            if (this.options.format === 'both' || this.options.format === 'md') {
                const mdPath = path.join(__dirname, '..', 'output', 
                    `${this.options.module}-详细设计.md`);
                await generateDoc(this.options.type, this.options.module, mdPath, 'md');
                results.push(`✓ Markdown 文档已生成: ${mdPath}`);
            }

            if (this.options.visualization) {
                const visualizationResult = await this.generateVisualization();
                if (visualizationResult) {
                    results.push(`✓ 可视化文档已生成: ${visualizationResult.fileUrl}`);
                }
            }

            console.log('\n生成完成！\n');
            results.forEach(result => console.log(result));
            
        } catch (error) {
            console.error('\n✗ 生成失败:', error.message);
        }
    }

    /**
     * 生成测试用例文档
     */
    async generateTestCaseDocument() {
        if (!this.options.module) {
            console.log('\n✗ 请先在高级配置中设置模块名称');
            return;
        }

        console.log(`\n正在生成 "${this.options.module}" 的测试用例文档...`);

        try {
            const { generateDoc } = require('./generate-doc.js');
            
            const results = [];
            
            if (this.options.format === 'both' || this.options.format === 'docx') {
                const docxPath = path.join(__dirname, '..', 'output', 
                    `${this.options.module}-测试用例.docx`);
                await generateDoc(this.options.type, this.options.module, docxPath);
                results.push(`✓ Word 文档已生成: ${docxPath}`);
            }

            if (this.options.format === 'both' || this.options.format === 'md') {
                const mdPath = path.join(__dirname, '..', 'output', 
                    `${this.options.module}-测试用例.md`);
                await generateDoc(this.options.type, this.options.module, mdPath, 'md');
                results.push(`✓ Markdown 文档已生成: ${mdPath}`);
            }

            if (this.options.visualization) {
                const visualizationResult = await this.generateVisualization();
                if (visualizationResult) {
                    results.push(`✓ 可视化文档已生成: ${visualizationResult.fileUrl}`);
                }
            }

            console.log('\n生成完成！\n');
            results.forEach(result => console.log(result));
            
        } catch (error) {
            console.error('\n✗ 生成失败:', error.message);
        }
    }

    /**
     * 生成可视化文档
     */
    async generateVisualization() {
        console.log('\n正在生成可视化文档...');

        try {
            const content = this.options.type === 'design' 
                ? `系统概述\n功能模块划分\n核心业务流程\n数据模型设计\n接口定义\n异常处理机制\n安全策略\n技术实现细节`
                : `测试计划\n测试环境\n功能测试用例\n性能测试用例\n安全测试用例\n测试执行结果`;

            const result = await this.visualizationGenerator.generateVisualization(
                this.options.module,
                content,
                { template: this.options.template }
            );

            return result;
        } catch (error) {
            console.error('可视化文档生成失败:', error.message);
            return null;
        }
    }

    /**
     * 询问问题并等待用户输入
     */
    askQuestion(question) {
        return new Promise(resolve => {
            this.rl.question(question, answer => {
                resolve(answer.trim());
            });
        });
    }
}

// 导出类
module.exports = InteractiveCLI;

// 如果直接运行此文件，启动交互式界面
if (require.main === module) {
    const cli = new InteractiveCLI();
    cli.start().catch(console.error);
}
