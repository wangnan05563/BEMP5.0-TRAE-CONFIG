// 直接测试 RequirementAnalyzer.analyzeForDesign 的输出
const fs = require('fs');
const path = require('path');
const { RequirementAnalyzer } = require('./lib/requirement-analyzer');

const prdPath = 'd:/code/QJ/BEMP5.0DEV/docs/prd/02-机构管理和管理员管理功能优化.md';
const mdContent = fs.readFileSync(prdPath, 'utf-8');

const analyzer = new RequirementAnalyzer({});
const result = analyzer.analyzeForDesign(mdContent, '机构管理和管理员管理功能优化');

console.log('=== 顶层字段 ===');
console.log(Object.keys(result).join(', '));
console.log('\n=== chapters ===');
console.log('数量:', (result.chapters || []).length);
(result.chapters || []).forEach((ch, i) => {
    console.log(`  [${i}] id=${ch.id} title=${ch.title}, sections=${(ch.sections || []).length}`);
});
console.log('\n=== businessSubmodules ===');
console.log('数量:', (result.businessSubmodules || []).length);
(result.businessSubmodules || []).forEach((s, i) => {
    console.log(`  [${i}] name=${s.name}, desc=${(s.description || '').substring(0, 60)}`);
});

// 保存到临时文件
const outPath = path.join(__dirname, '..', 'output', '_debug-design-data.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n已保存到: ${outPath}`);
