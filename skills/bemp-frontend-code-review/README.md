# BEMP 前端代码审查技能（使用卡）

> 审查BEMP工程各银行个性化模块的前端代码。自动化脚本一键扫描 + 人工逐项审查双模式，支持 12 家银行配置切换。
> 完整规范（16项条款/代码示例/排查表）见 [SKILL.md](SKILL.md) 与 [references/review-rules.md](references/review-rules.md)，本文件不重复，仅作快速使用入口。

## 目录结构

```
bemp-frontend-code-review/
├── SKILL.md                              # 技能规范入口（流程骨架 + 16项规范索引）
├── README.md                             # 使用说明（本文件，纯使用卡）
├── references/
│   └── review-rules.md                   # 16项规范完整条款 + 代码示例 + 排查表（人工审查阶段按需读取）
├── report-template.md                    # 审查报告模板（四级别问题 + 修复验证）
└── scripts/
    ├── review-config.json                # 前端审查特有配置：路径模板、可用银行白名单、检查规则阈值
    ├── config-loader.js                  # 共享配置加载模块（--bank=xxx CLI覆盖）
    ├── check-all.js                      # 一键全量检查：串行执行4个脚本 + 汇总结果
    ├── check-hardcode.js                 # 硬编码中文检测：按钮/表单/弹窗标题的中文
    ├── check-routes.js                   # 路由注册完整性：Vue文件↔路由映射 双向校验
    ├── check-i18n.js                     # $t() 国际化覆盖：多语言同步 + 逐文件覆盖率
    ├── check-dialog-component.js         # 弹窗组件规约（W8沉淀）：弹窗内datagrid v-if/autoLoad、scoped样式命中
    ├── package.json                      # npm 配置
    └── examples/
        └── async-patterns.js             # 异步处理代码模板（正确示例 + 错误示例）
```

## 快速开始

```bash
# 默认银行（由 _shared/env-config.json environmentDefaults.BANK_CODE 决定）
node scripts/check-all.js

# 指定银行（临时切换，不修改任何配置）
node scripts/check-all.js --bank=jinzbank

# 单独运行某个检查
node scripts/check-hardcode.js
node scripts/check-routes.js
node scripts/check-i18n.js
node scripts/check-dialog-component.js

# 完整逐行输出（默认为紧凑模式：终端只显示状态+问题行，完整明细落盘 reports/scan-{bank}-{date}.json）
node scripts/check-all.js --verbose
```

### 银行切换（单一入口）

- **永久切换**：编辑 `_shared/env-config.json` 的 `environmentDefaults.BANK_CODE`（所有技能共用）
- **会话级**：`$env:BANK_CODE = 'xxx'`
- **临时指定**：命令行加 `--bank=xxx`（优先级最高）
- 可用银行白名单见 `scripts/review-config.json` 的 `availableBanks`

## 审查工作流

```
编码完成 → 运行 check-all.js → 修复 🔴阻塞问题 → 人工逐项审查 → 输出审查报告
```

- 问题四级分级：🔴阻塞（必须修复）/ 🟠严重（强烈建议）/ 🟡警告（建议）/ 🟢提示（可选）
- 报告模板：[report-template.md](report-template.md)

## 参考文件

- [技能规范入口](SKILL.md) — 配置加载铁律 + 4阶段流程 + 16项规范索引 + 判断标准
- [规范完整条款](references/review-rules.md) — 16项规范详情、代码示例、常见问题排查
- [审查报告模板](report-template.md) — 标准化审查报告格式
- [异步代码模板](scripts/examples/async-patterns.js) — async/await + .then() 正确示例与常见错误
