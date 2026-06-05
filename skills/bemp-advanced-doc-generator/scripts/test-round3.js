// TC-NEW-I2: 验证 scripts/ 目录结构符合 I2 物理迁移后的状态
// TC-NEW-I3: 验证智能体提示词含 5.3 变更追踪 / 5.4 交付自检

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const skillsRoot = path.resolve(root, '..', '..');
const scriptsDir = path.join(root, 'scripts');
const legacyDir = path.join(scriptsDir, '_legacy');
const agentPrompt = path.join(skillsRoot, 'promote-bemp-agents', 'BEMP文档交付工程师.md');

const out = (s) => process.stdout.write(s + '\n');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok, detail: detail || '' });
    out(`${ok ? '[OK]' : '[FAIL]'} ${name}${detail ? ' — ' + detail : ''}`);
}

// ============ TC-NEW-I2 ============
out('--- I2 物理迁移验证 ---');
check('TC-NEW-I2-1: _legacy 目录存在', fs.existsSync(legacyDir));
const legacyEntries = fs.existsSync(legacyDir) ? fs.readdirSync(legacyDir) : [];
out(`  _legacy/ 包含 ${legacyEntries.length} 个条目：${legacyEntries.slice(0, 5).join(', ')}...`);

const mustInLegacy = ['cli.js', 'package.json', 'antv-test-result.txt'];
const mustInLegacyAll = mustInLegacy.every(f => legacyEntries.includes(f));
check('TC-NEW-I2-2: _legacy/ 含 cli.js / package.json / antv-test-result.txt', mustInLegacyAll,
    mustInLegacyAll ? '' : `缺失: ${mustInLegacy.filter(f => !legacyEntries.includes(f)).join(', ')}`);

check('TC-NEW-I2-3: _legacy/config/ 目录存在', fs.existsSync(path.join(legacyDir, 'config')));
check('TC-NEW-I2-4: _legacy/lib/ 目录存在', fs.existsSync(path.join(legacyDir, 'lib')));

const scriptsTopLevel = fs.readdirSync(scriptsDir).filter(f => f !== '_legacy' && f !== 'output');
out(`  scripts/ 顶层（除 _legacy/output）共 ${scriptsTopLevel.length} 项：${scriptsTopLevel.join(', ')}`);

const validPy = ['diagram-generator.py', 'document-validator.py', 'outline-design-generator.py', 'er-diagram-renderer.py', 'doc_utils.py'];
const allValidPyPresent = validPy.every(f => scriptsTopLevel.includes(f));
check('TC-NEW-I2-5: 顶层含 5 个有效 .py', allValidPyPresent,
    allValidPyPresent ? '' : `缺失: ${validPy.filter(f => !scriptsTopLevel.includes(f)).join(', ')}`);

const mustNotInTop = ['cli.js', 'config', 'lib', 'package.json', 'package-lock.json', 'antv-test-result.txt'];
const allMustNotInTopAbsent = mustNotInTop.every(f => !scriptsTopLevel.includes(f));
check('TC-NEW-I2-6: 顶层不含 cli.js/config/lib/package.json/antv-test-result.txt', allMustNotInTopAbsent,
    allMustNotInTopAbsent ? '' : `仍在顶层: ${mustNotInTop.filter(f => scriptsTopLevel.includes(f)).join(', ')}`);

const orphanPy = ['convert_docx.py', 'convert_docx_v2.py', 'debug_dedup.py', 'document_validator.py', 'verify_output.py'];
const allOrphanInLegacy = orphanPy.every(f => legacyEntries.includes(f));
check('TC-NEW-I2-7: 孤儿 .py 全部在 _legacy/', allOrphanInLegacy,
    allOrphanInLegacy ? '' : `仍在顶层: ${orphanPy.filter(f => !legacyEntries.includes(f)).join(', ')}`);

// ============ TC-NEW-I3 ============
out('\n--- I3 智能体提示词验证 ---');
const agentContent = fs.readFileSync(agentPrompt, 'utf-8');
check('TC-NEW-I3-1: 提示词含"5.3 变更追踪核对"', agentContent.includes('5.3 变更追踪核对'));
check('TC-NEW-I3-2: 提示词含"5.4 交付前自检清单"', agentContent.includes('5.4 交付前自检清单'));
check('TC-NEW-I3-3: 5.3 含 git log --oneline 命令示例', agentContent.includes('git log --oneline'));
check('TC-NEW-I3-4: 5.4 含 8 项自检表', agentContent.includes('| 8 | 跨格式一致性'));
check('TC-NEW-I3-5: 5.4 含自检输出模板', agentContent.includes('## 交付自检'));
check('TC-NEW-I3-6: 5.4 含"中止交付"失败处理', agentContent.includes('中止交付'));
check('TC-NEW-I3-7: 5.3 含"git-commit-message"规则引用', agentContent.includes('git-commit-message'));

// ============ 汇总 ============
out('\n=== 汇总 ===');
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
out(`${pass} pass / ${fail} fail / ${results.length} total`);
process.exit(fail > 0 ? 1 : 0);
