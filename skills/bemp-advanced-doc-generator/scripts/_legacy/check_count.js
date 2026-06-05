const fs = require('fs');
const path = require('path');
const { TestCaseMdScanner } = require('./lib/test-case-md-scanner');

const out = path.join(__dirname, '..', '..', '..', 'aotutests-devtools', 'count3.log');
console.log('OUT:', out);

const r = new TestCaseMdScanner().scan('d:/code/QJ/BEMP5.0DEV/.trae/skills/bemp-test-common/test-cases/bm/credit/credit-management.md');
const lines = [];
lines.push('cases=' + r.testCaseCount);
lines.push('chapters=' + r.chapterCount);
lines.push('priority=' + JSON.stringify(r.priorityStat));
lines.push('category=' + JSON.stringify(r.categoryStat));
lines.push('---chapter list---');
Object.keys(r.groupByChapter).sort().forEach(k => {
    lines.push(k + ': ' + r.groupByChapter[k].length + ' cases');
});
fs.writeFileSync(out, lines.join('\n'));
console.log('written:', out);
