// 诊断：检查 requirement-analyzer.js 的输出
const fs = require('fs');
const path = require('path');

// 读取需求文档
const prdPath = 'd:\\code\\QJ\\BEMP5.0DEV\\docs\\prd\\02-机构管理和管理员管理功能优化.md';
const prdContent = fs.readFileSync(prdPath, 'utf-8');

console.log('='.repeat(70));
console.log('需求文档检查');
console.log('='.repeat(70));
console.log(`文件路径: ${prdPath}`);
console.log(`文件长度: ${prdContent.length} 字符`);
console.log(`前500字符:\n${prdContent.substring(0, 500)}`);

// 加载 RequirementAnalyzer
const { RequirementAnalyzer } = require('./lib/requirement-analyzer');

const analyzer = new RequirementAnalyzer();
const designData = analyzer.analyzeForDesign(prdContent, '机构管理和管理员管理功能优化');

console.log('\n' + '='.repeat(70));
console.log('analyzeForDesign 输出检查');
console.log('='.repeat(70));
console.log(`chapters 数量: ${(designData.chapters || []).length}`);
console.log(`businessSubmodules 数量: ${(designData.businessSubmodules || []).length}`);

if (designData.chapters && designData.chapters.length > 0) {
    console.log('\nchapters 内容:');
    designData.chapters.forEach((ch, idx) => {
        console.log(`  [${idx}] ${ch.title} | sections: ${(ch.sections || []).length}`);
    });
} else {
    console.log('\n⚠️ chapters 为空！');
}

if (designData.businessSubmodules && designData.businessSubmodules.length > 0) {
    console.log('\nbusinessSubmodules 内容:');
    designData.businessSubmodules.forEach((sub, idx) => {
        console.log(`  [${idx}] ${sub.name || sub.title}`);
    });
} else {
    console.log('\n⚠️ businessSubmodules 为空！');
}

// 检查 _extractModules 的输入
const lines = prdContent.split('\n');
const sections = analyzer._splitBySubFeatureHeadings(lines);

console.log('\n' + '='.repeat(70));
console.log('_splitBySubFeatureHeadings 输出检查');
console.log('='.repeat(70));
console.log(`sections 数量: ${sections.length}`);

const h3Sections = sections.filter(s => s.level === 3);
console.log(`H3 级别 sections 数量: ${h3Sections.length}`);
h3Sections.forEach((sec, idx) => {
    console.log(`  [${idx}] level=${sec.level}, title="${sec.title}", hasSubsection=${sec.hasSubsection}, content长度=${(sec.content || '').length}`);
});

const modules = analyzer._extractModules(sections, {});
console.log(`\n_extractModules 输出数量: ${modules.length}`);
modules.forEach((mod, idx) => {
    console.log(`  [${idx}] ${mod[0]} | ${mod[2]}`);
});
