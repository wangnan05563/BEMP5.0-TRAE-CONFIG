/**
 * BEMP 高级文档生成器 - 命令行接口
 * 支持命令行参数和交互式两种模式
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载 .env 文件中的环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

const { VisualizationGenerator } = require('./processon-integration');

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        type: 'design',
        module: '业务功能',
        format: 'both',
        visualization: true,
        template: 'default',
        interactive: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--type' && args[i + 1]) {
            options.type = args[++i];
        } else if (arg === '--module' && args[i + 1]) {
            options.module = args[++i];
        } else if (arg === '--format' && args[i + 1]) {
            options.format = args[++i];
        } else if (arg === '--visualization') {
            options.visualization = args[++i] !== 'false';
        } else if (arg === '--template' && args[i + 1]) {
            options.template = args[++i];
        } else if (arg === '--interactive' || arg === '-i') {
            options.interactive = true;
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        }
    }

    return options;
}

// 显示帮助信息
function showHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     BEMP 高级文档生成器 - 命令行帮助                      ║
╚═══════════════════════════════════════════════════════════╝

用法:
  node cli.js [选项]

选项:
  --type <type>           文档类型 (design | testcase)
                          默认: design
  --module <name>         模块名称
                          默认: 业务功能
  --format <format>       输出格式 (both | docx | md)
                          默认: both
  --visualization <bool>  是否生成可视化文档 (true | false)
                          默认: true
  --template <name>       使用的模板名称
                          默认: default
  --interactive, -i       启动交互式界面
  --help, -h              显示帮助信息

示例:
  # 生成详细设计文档（双格式）
  node cli.js --type design --module "机构批量导入"

  # 仅生成 Word 格式的测试用例文档
  node cli.js --type testcase --module "机构批量导入" --format docx

  # 启动交互式界面
  node cli.js --interactive

  # 生成文档但不生成可视化
  node cli.js --type design --module "测试" --visualization false
`);
}

// 生成文档
async function generateDocument(options) {
    const results = [];
    
    // 尝试使用智能文档生成器
    try {
        const { SmartDocumentGenerator } = require('./smart-doc-generator');
        const smartGen = new SmartDocumentGenerator({
            projectRoot: path.resolve(__dirname, '..', '..', '..', '..')
        });
        
        const genResult = await smartGen.generateDocument(
            options.module, 
            options.type, 
            options.format
        );
        
        results.push(...genResult.results);
        
        if (genResult.reusedScripts.length > 0) {
            console.log('\n脚本复用信息:');
            genResult.reusedScripts.forEach(script => {
                console.log(`  ✓ 复用脚本: ${script.name} v${script.version} - ${script.description}`);
            });
        }
        
        return results;
    } catch (error) {
        console.warn('智能文档生成器不可用，使用标准生成器...');
    }
    
    // 回退到标准文档生成器
    const { DocumentGenerator } = require('./generate-doc.js');
    
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const generator = new DocumentGenerator('详细设计文档模板.json');

    // 生成详细设计文档
    if (options.type === 'design') {
        if (options.format === 'both' || options.format === 'docx') {
            const docxPath = path.join(outputDir, `${options.module}-详细设计.docx`);
            await generator.generateDesignDocument(options.module, docxPath);
            results.push(`✓ Word 详细设计文档已生成: ${docxPath}`);
        }

        if (options.format === 'both' || options.format === 'md') {
            const mdPath = path.join(outputDir, `${options.module}-详细设计.md`);
            await generator.generateMarkdown(options.module, mdPath, 'design');
            results.push(`✓ Markdown 详细设计文档已生成: ${mdPath}`);
        }
    }

    // 生成测试用例文档
    if (options.type === 'testcase') {
        if (options.format === 'both' || options.format === 'docx') {
            const docxPath = path.join(outputDir, `${options.module}-测试用例.docx`);
            await generator.generateTestCaseDocument(options.module, docxPath);
            results.push(`✓ Word 测试用例文档已生成: ${docxPath}`);
        }

        if (options.format === 'both' || options.format === 'md') {
            const mdPath = path.join(outputDir, `${options.module}-测试用例.md`);
            await generator.generateMarkdown(options.module, mdPath, 'testcase');
            results.push(`✓ Markdown 测试用例文档已生成: ${mdPath}`);
        }
    }

    return results;
}

// 主函数
async function main() {
    const options = parseArgs();

    if (options.interactive) {
        const InteractiveCLI = require('./interactive-cli');
        const cli = new InteractiveCLI();
        await cli.start();
    } else {
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║     BEMP 高级文档生成器                                   ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        console.log('配置信息:');
        console.log(`  文档类型: ${options.type === 'design' ? '详细设计' : '测试用例'}`);
        console.log(`  模块名称: ${options.module}`);
        console.log(`  输出格式: ${options.format}`);
        console.log(`  生成可视化: ${options.visualization ? '是' : '否'}`);
        console.log(`  模板名称: ${options.template}`);
        console.log('');

        try {
            const results = await generateDocument(options);
            
            console.log('\n生成完成！\n');
            results.forEach(result => console.log(result));
            
        } catch (error) {
            console.error('\n✗ 生成失败:', error.message);
            process.exit(1);
        }
    }
}

// 运行主函数
main().catch(console.error);
