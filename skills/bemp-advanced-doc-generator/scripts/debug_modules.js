const fs = require('fs');
const path = require('path');

// 读取需求文档
const prdPath = 'd:\\code\\QJ\\BEMP5.0DEV\\docs\\prd\\02-机构管理和管理员管理功能优化.md';
const mdContent = fs.readFileSync(prdPath, 'utf-8');

// 导入 RequirementAnalyzer
const { RequirementAnalyzer } = require('d:\\code\\QJ\\BEMP5.0DEV\\.trae\\skills\\bemp-advanced-doc-generator\\scripts\\lib\\requirement-analyzer.js');

const analyzer = new RequirementAnalyzer();

// 调用 analyzeForDesign
const result = analyzer.analyzeForDesign(mdContent, '机构管理和管理员管理功能优化');

console.log('=== businessSubmodules ===');
console.log(JSON.stringify(result.businessSubmodules, null, 2));

console.log('\n=== chapters[1] (功能模块划分) ===');
if (result.chapters && result.chapters[1]) {
    console.log('Title:', result.chapters[1].title);
    console.log('Sections:', result.chapters[1].sections.length);
    if (result.chapters[1].sections[0]) {
        console.log('First section:', result.chapters[1].sections[0].title);
        console.log('Content:', JSON.stringify(result.chapters[1].sections[0].content, null, 2));
    }
}
