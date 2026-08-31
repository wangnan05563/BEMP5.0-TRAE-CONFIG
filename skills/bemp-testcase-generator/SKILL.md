---
name: "bemp-testcase-generator"
version: "2.1.0"
description: "BEMP 票据系统测试用例生成技能。基于五步方法论（功能地图→优先级矩阵→P0用例设计→案例集扩展→测试数据准备），融合11种测试类型与10种组件测试设计，通过 Playwright MCP 自动探索网站、Oracle/MySQL MCP 准备数据，生成高质量测试用例。支持代码审查类用例生成（注解值/错误文案/逻辑验证/配置验证4种模板）与测试方式自动选择判断（代码审查/Playwright/数据库查询/运行时测试）。"
whenToUse: "需要编写/设计/生成测试用例、制作功能地图、构建优先级矩阵、准备测试数据、审查测试用例、生成代码审查类用例、判断测试方式时调用"
triggers:
  - "测试用例 编写/设计/生成"
  - "功能地图 制作/生成"
  - "优先级矩阵 构建/生成"
  - "测试数据 准备/梳理"
  - "用例/案例 编写/设计"
  - "审查/评审 测试用例"
  - "接口测试/UI测试/安全测试/性能测试"
  - "输入框/表单/弹窗/列表 组件测试"
  - "代码审查用例/注解验证/错误文案验证/逻辑验证/配置验证"
  - "测试方式选择/代码审查 vs Playwright"
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

## 技能职责

本技能**负责测试用例编写**，测试执行由 `bemp-webapp-testing` 技能负责。共享资源（功能地图、优先级矩阵、测试标准、用例文档、用例索引）由 `bemp-test-common` 统一管理：

```
bemp-test-common（共享资源：用例文档 + 参考指南 + 用例索引）
    ├── bemp-testcase-generator（用例编写，引用 common 资源）
    └── bemp-webapp-testing（用例执行，引用 common 资源）
```

- **需要编写用例** → 调用本技能
- **需要执行测试** → 调用 `bemp-webapp-testing`
- **需要查阅共享资源** → 调用 `bemp-test-common`

## 按需加载机制

本技能采用七级加载架构，避免一次性加载全部参考文档。Level 0 为来自 `bemp-test-common` 的共享资源：

| 级别 | 内容 | 加载时机 | 文件 |
|------|------|----------|------|
| Level 0 | 共享资源（功能地图/优先级矩阵/测试标准/数据管理） | 按需加载 | bemp-test-common/references/*.md |
| Level 1 | SKILL.md | 始终加载 | 本文件 |
| Level 2 | 指令映射表 | 按需加载 | references/instruction-mapping.md |
| Level 3 | 通用测试用例模板 | 按需加载 | references/general-test-cases.md |
| Level 4 | 组件测试设计方法 | 按需加载 | references/component-test.md |
| Level 5 | 输出示例 | 按需加载 | references/output-examples.md |
| Level 6 | 审查报告模板 | 按需加载 | references/review-report-template.md |

### 加载决策流程

```
用户提出需求
    ↓
读取 SKILL.md（Level 1）
    ↓
需要功能地图/优先级矩阵/测试标准/数据管理？ → 加载 bemp-test-common/references/（Level 0）
    ↓
匹配 instruction-mapping.md（Level 2）→ 确定需要加载的测试类型
    ↓
涉及代码内部逻辑验证？ → 加载 config/testcase-templates.json（代码审查类模板）
    ↓
加载对应测试用例模板（Level 3/4）
    ↓
生成/审查测试用例 → 参考 output-examples.md 格式
    ↓
每条用例标注测试方式 → 加载 config/test-method-rules.json（测试方式判断规则）
```

**禁止**：不要一次性读取所有 references 文件

## 核心工作流：五步方法论

基于五步方法论，系统性生成 BEMP 票据系统的高质量测试用例：

1. **功能地图**：Playwright MCP 自动探索网站，生成页面清单与关系图谱
2. **优先级矩阵**：基于功能地图分析核心流程与风险点，确定测试优先级
3. **P0 用例设计**：针对 P0 级别功能，设计正常/异常/边界/用户体验用例
4. **案例集扩展**：需求影响性分析 + 边缘场景 + 并发场景补充
5. **测试数据准备**：Oracle/MySQL MCP 查询数据库，生成标准化测试数据

### 第一步：网站功能地图制作

**输入**：`config/generator-config.json` → `target.base_url`

1. 启动浏览器，访问 `{base_url}/{hash_route}`
2. 登录系统（⚠️ 前置步骤：须先通过智能体调度 `bemp-webapp-testing` 的 LoginManager 完成登录，再继续遍历菜单）
3. 遍历主菜单 + 子菜单，记录页面路由
4. 每个页面：截图 + 提取关键元素（选择器/功能描述）
5. 记录页面间跳转关系和状态流转
6. 输出功能地图 MD 文件（按 `assets/templates/functional-map.md` 模板）

> 已有功能地图：`bemp-test-common/references/website-functional-map.md`（6子系统 285+ 页面），可直接复用
> 判断条件：当 common 中已有功能地图且距上次生成不足 30 天、页面结构无重大变更时直接复用；否则重新生成。

### 第二步：测试范围与优先级矩阵构建

**输入**：网站功能地图

1. 核心流程识别：确定用户必用且对项目至关重要的功能模块
2. 风险点评估：识别高风险区域（输入边界、状态改变、权限校验等）
3. 输出优先级矩阵 MD 文件（按 `assets/templates/priority-matrix.md` 模板）

> 已有优先级矩阵：`bemp-test-common/references/test-priority-matrix.md`，可直接复用
> 判断条件：当功能地图未重新生成（即页面结构未变）时直接复用；功能地图重新生成后必须同步重建优先级矩阵。

**优先级定义**：

| 优先级 | 含义 | 测试策略 |
|:---|:---|:---|
| P0 | 核心资金流程 | 全量测试，覆盖所有边界和异常 |
| P1 | 核心业务流程 | 主流程 + 关键异常分支 |
| P2 | 辅助功能 | 常规测试主流程和常见异常 |
| P3 | 管理类功能 | 基础功能验证 |

### 第三步：P0 级别功能用例设计

**输入**：优先级矩阵 P0 行

1. 每个功能模块：至少 1 个正常流程 + 1 个异常流程
2. 边界测试：最大/最小输入值、空值、特殊符号
3. 用户体验：模拟真实用户操作习惯
4. 输出用例 MD 文件（按 `assets/templates/test-case-P0.md` 或 `test_case_template.md` 模板）

**用例编号**：`TC-{模块缩写}-{三位序号}`（缩写见 `config/generator-config.json` → `case_id_prefixes`）

**测试类型覆盖**：根据 `references/instruction-mapping.md` 确定需要覆盖的测试类型，参考 `references/general-test-cases.md` 中对应模板设计用例。P0 用例至少覆盖功能测试 + 安全测试 + 联动测试。

> 断言锚点背书：预期文案/顺序/字段名断言必须引用代码锚点（文件:行号、DAO 列清单、单测实测拼接形态），自检规则见 `references/assertion-anchoring.md`

### 第四步：测试案例集扩展

**输入**：P0 用例集 + 用户需求

1. 需求影响性分析：评估用户输入需求对系统各模块的潜在影响
2. 案例集补充：扩展测试案例以覆盖潜在影响区域
3. 场景覆盖增强：添加边缘场景、并发场景等特殊测试案例
4. 组件级补充：根据页面涉及的 UI 组件，参考 `references/component-test.md` 补充组件测试用例

### 第五步：测试数据准备

**输入**：完整测试用例集

1. 读取用例文件，提取数据需求
2. 通过 Oracle MCP / MySQL MCP 查询现有数据
3. 识别数据缺口，生成补充 SQL
4. 执行补充 + 验证就绪
5. 输出测试数据 MD 文件（按 `assets/templates/test-data.md` 模板）

> 通过 `bemp-implementation-engineer` 智能体调用 Oracle MCP / MySQL MCP 工具
> 数据库操作指南见 `bemp-test-common/references/test-data-management.md`
> 例行自检：数据直插前表结构核对 / 应用读取表声明 / 清理闭环契约三项，按 `config/test-data-check.json` → `checkItems` 清单逐项执行

## 目录结构

```
bemp-testcase-generator/
├── SKILL.md                          本文件
├── README.md                         开发者入口文档
├── config/
│   ├── generator-config.json         配置（目标地址/优先级/输出路径/银行/编号前缀）
│   ├── testcase-prefix-coordination.json  编号协调规则（防冲突+模块缩写）
│   ├── testcase-quantify-templates.json   预期结果量化模板（6类+禁止模式）
│   ├── testcase-templates.json       代码审查类用例模板（4种验证类型+自校验规则）
│   ├── test-method-rules.json        测试方式选择判断规则（代码审查/Playwright/数据库查询/运行时测试）
│   ├── test-case-schema.yaml         用例Schema
│   ├── test-data-check.json          数据校验配置
│   └── test-cases/                   用例YAML配置
├── scripts/
│   ├── generate_functional_map.py    功能地图生成指令
│   ├── generate_test_cases.py        测试用例生成指令
│   └── prepare_test_data.py          测试数据准备指令
├── references/                       本技能独有参考文档
│   ├── instruction-mapping.md        指令映射表：关键词→测试类型/组件映射
│   ├── general-test-cases.md         通用测试用例模板（11种测试类型，300+模板）
│   ├── component-test.md             组件测试设计方法（10种组件 + BEMP特有组件）
│   ├── output-examples.md            输出示例（含接口测试专用格式）
│   ├── review-report-template.md     审查报告模板（评分标准+检查清单）
│   ├── methodology.md                五步方法论完整说明
│   └── case-id-rules.md              用例编号与模块缩写对照表
└── assets/templates/
    ├── functional-map.md             功能地图模板
    ├── priority-matrix.md            优先级矩阵模板
    ├── test-case-P0.md               P0 测试用例模板
    ├── test_case_template.md         标准测试用例模板（完整字段）
    └── test-data.md                  测试数据文档模板
```

> 以下资源已迁移至 `bemp-test-common/`，由 common 统一管理：
> - `references/website-functional-map.md` → `bemp-test-common/references/website-functional-map.md`
> - `references/test-priority-matrix.md` → `bemp-test-common/references/test-priority-matrix.md`
> - `references/testing-standards.md` → `bemp-test-common/references/testing-standards.md`
> - `references/test-data-management.md` → `bemp-test-common/references/test-data-management.md`
> - `test-cases/` → `bemp-test-common/test-cases/`
> - `test-index.json` → `bemp-test-common/test-index.json`

## BEMP 特有验证点

所有用例须包含以下验证维度（详见 `bemp-test-common/references/testing-standards.md`）：

1. **个性化路径**：API 请求使用当前银行 `url_prefix` 前缀
2. **组件覆盖**：个性化组件正确覆盖产品化组件
3. **控制台错误**：无 TypeError/ReferenceError/ChunkLoadError
4. **数据隔离**：查询结果仅包含本机构及下级机构数据
5. **弹窗关闭**：X按钮/关闭按钮/重置按钮三通道验证

## 输出规范

| 产出物 | 路径 | 格式 |
|:---|:---|:---|
| 功能地图 | `bemp-test-common/references/website-functional-map.md` | MD（按模板） |
| 优先级矩阵 | `bemp-test-common/references/test-priority-matrix.md` | MD（按模板） |
| P0 用例 | `bemp-test-common/test-cases/{子系统}/{模块}.md` | MD（按模板） |
| 扩展用例 | 追加到对应模块 MD 文件 | MD |
| 测试数据 | `bemp-test-common/test-data/{模块}-test-data.md` | MD（按模板） |
| 用例索引 | `bemp-test-common/test-index.json` | JSON |
| 审查报告 | 按需生成 | MD（按 review-report-template.md） |

## 已有测试用例基准

> 完整用例索引（含脚本覆盖/缺失标注、用例数、覆盖范围）详见 `bemp-test-common/test-index.json`。
> 用例文件位于 `bemp-test-common/test-cases/` 目录下，按子系统（common/sm/bm/be/ce）组织。
> 用例合计约 288 条，25 条目。详细条目以 test-index.json 为准，不在本文件重复列举。

## 配置说明

`config/generator-config.json` 关键节点：

| 节点 | 说明 |
|:---|:---|
| `target` | 目标网站地址（base_url/backend_url/hash_route/login_path） |
| `database` | 数据库类型（oracle/mysql），通过 MCP 操作 |
| `priority` | P0-P3 优先级定义 |
| `risk_levels` | 高/中/低风险等级定义 |
| `output` | 输出路径配置 |
| `excel_output` | Excel 输出配置（enabled/doc_type/auto_generate/output_dir/filename_pattern/cli_command） |
| `banks` | 多银行配置（active_bank + 各银行 url_prefix） |
| `case_id_prefixes` | 24 个模块缩写与编号规则 |

> ⚠️ **银行环境同步**：`generator-config.json` 与 `bemp-webapp-testing/config/test_config.json` 各自维护 `active_bank` 字段。编写用例前应读取 `test_config.json` 确认当前测试环境的 `active_bank`，确保生成的用例与执行环境一致。切换银行时两个配置需同步更新。

`config/testcase-templates.json` 关键节点：

| 节点 | 说明 |
|:---|:---|
| `templates` | 4 种代码审查验证模板（annotation/error_message/logic/config） |
| `templates.*.case_id_rule` | 各模板的用例编号规则（如 TC-CODE-ANN-{SEQ}） |
| `templates.*.verification_steps` | 验证步骤模板（指令式动作序列） |
| `templates.*.expected_result_format` | 预期结果格式（pass/fail/missing 三种模式） |
| `templates.*.review_file_scope` | 审查文件范围（file_patterns + search_strategy） |
| `self_check_rules` | 代码审查类用例自校验规则（4 项检查） |
| `config_inheritance` | 三级配置继承机制（skill → project → bank） |

`config/test-method-rules.json` 关键节点：

| 节点 | 说明 |
|:---|:---|
| `test_methods` | 4 种测试方式定义（code_review/playwright/database_query/runtime_test） |
| `selection_rules.rules` | 11 条选择规则（含关键词/模式匹配/优先级/置信度） |
| `selection_rules.default_method` | 默认测试方式（未命中规则时使用） |
| `selection_rules.multi_method_strategy` | 多方式组合策略（parallel/sequential/primary_first） |
| `selection_workflow` | 选择判断流程（5 步） |
| `self_check_rules` | 测试方式标注自校验规则（3 项检查） |
| `config_inheritance` | 三级配置继承机制（skill → project → bank） |

## 智能体操作指南

### A. 编号协调机制

编制用例前，自动执行编号协调，避免与已有用例编号冲突：

1. **读取配置**：加载 `config/testcase-prefix-coordination.json`
2. **扫描已有编号**：读取 `bemp-test-common/test-index.json`，提取所有已有编号前缀
3. **确定需求标识**：按优先级从 `requirement_identifier_source.sources` 中提取（用户指定 > PRD文件名 > 自动推断）
4. **分配编号**：扫描 TC-{MODULE}-{REQUIREMENT}-* 的最大SEQ，从 max+1 开始
5. **冲突检测**：编制完成后，按 `conflict_detection.rules` 检查编号唯一性
6. **更新索引**：编制完成后更新 `bemp-test-common/test-index.json`

### B. 预期结果量化检查

用例编制完成后，自动执行预期结果量化检查：

1. **读取配置**：加载 `config/testcase-quantify-templates.json`
2. **分类用例**：根据用例内容判断类型（ui_operation / data_operation / api_call / scheduled_task / validation_check / permission_control）
3. **量化检查**：逐条验证
   - QUANTIFY-01：预期结果不得包含 `forbidden_patterns` 中的模糊描述
   - QUANTIFY-02：必须包含对应类型的 `required_indicators` 中的至少1项
   - QUANTIFY-03：数值/字符串必须具体，不得使用变量占位
4. **输出结果**：将不合规项列出自校验报告中，severity=major 的必须修复

### C. 页面元素预验证（可选）

用例编制完成后，若服务可用，可执行轻量级页面快照验证：

1. **登录系统**（法人管理员）
2. **导航到关键页面**，截图获取按钮实际文本、弹窗结构
3. **对比用例中的元素名称**与实际页面元素
4. **输出差异报告**：标注名称不一致、元素缺失、组件类型差异
5. **用例自动修正**：根据差异报告修正用例中的元素名称和交互方式

> 页面元素预验证为可选步骤，需服务已启动。若服务不可用则跳过，在用例评审阶段补充验证。

### D. 代码审查类用例生成

当需求涉及代码内部逻辑验证（注解值、错误文案、调用链、配置引用）时，生成代码审查类用例：

1. **读取配置**：加载 `config/testcase-templates.json`
2. **选择验证模板**：根据验证目标从 4 种模板中选择对应类型
   - `annotation_verification`：验证 @CloudFunction、@CloudComponent 等注解属性值
   - `error_message_verification`：验证错误信息文案与规格文档一致性
   - `logic_verification`：验证方法调用链、条件分支、返回值正确性
   - `config_verification`：验证配置 key 引用、默认值、降级逻辑
3. **填充模板**：按模板的 `verification_steps` 编写具体步骤，按 `expected_result_format` 编写预期结果
4. **确定审查文件**：按模板的 `review_file_scope.file_patterns` 确定需要 Read 的源文件范围
5. **编号分配**：按模板的 `case_id_rule.format` 分配编号（如 `TC-CODE-ANN-001`）
6. **自校验**：用例编制完成后，按 `self_check_rules` 逐条检查

**适用场景**：服务未启动时仍可执行的验证、代码内部逻辑无法通过 UI 观察的验证、注解/常量等编译期确定的验证。

**用例格式示例**：

```markdown
| 用例编号 | TC-CODE-ANN-001 |
| 用例名称 | 验证机构同步Controller的@CloudFunction注解funcCode值 |
| 测试方式 | 代码审查 |
| 前置条件 | 源代码已拉取到本地工作区 |

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | rg '@CloudFunction' --type java -l 定位文件 | 定位到 OrgSyncController.java |
| 2 | Read OrgSyncController.java，提取注解属性值 | @CloudFunction(funcCode='orgSync001') |
| 3 | 与接口定义文档比对 funcCode 值 | funcCode='orgSync001' 与规格一致 |
```

### E. 测试方式选择判断

每条用例编制完成后，自动判断并标注推荐的测试方式：

1. **读取配置**：加载 `config/test-method-rules.json`
2. **提取用例特征**：从用例名称、测试步骤、验证点中提取关键词
3. **规则匹配**：将特征与 `selection_rules.rules` 中的 `match_keywords` 和 `match_patterns` 比对，按 `priority` 从小到大排序取首个命中
4. **确定测试方式**：取命中规则的 `recommended_method`；未命中则使用 `default_method`（默认 Playwright）
5. **多方式处理**：若推荐多种方式（如代码审查+数据库查询），按 `multi_method_strategy.default_option` 策略执行
6. **标注用例**：在用例"测试方式"字段标注推荐结果，附注规则 ID 和置信度
7. **自校验**：按 `self_check_rules` 检查测试方式标注的完整性和合理性

**测试方式速查**：

| 验证特征 | 推荐测试方式 | 规则ID |
|:---|:---|:---|
| 方法调用链/条件分支/返回值 | 代码审查 | RULE-01 |
| 注解值（@CloudFunction 等） | 代码审查 | RULE-02 |
| 错误文案/提示信息 | 代码审查 | RULE-03 |
| 配置 key/默认值/降级逻辑 | 代码审查 | RULE-04 |
| DAO/Mapper SQL | 代码审查 + 数据库查询 | RULE-05 |
| 表结构/字段类型/索引 | 数据库查询 | RULE-06 |
| 原有功能不受影响 | Playwright | RULE-07 |
| 页面加载/路由 | Playwright | RULE-08 |
| UI 交互/按钮/表单/弹窗 | Playwright | RULE-09 |
| 定时任务实际执行 | 运行时测试 | RULE-10 |
| 文件系统操作 | 运行时测试 | RULE-11 |

### 新增配置文件

| 文件 | 说明 |
|------|------|
| `config/testcase-prefix-coordination.json` | 编号协调规则 + 模块缩写 + 冲突检测 |
| `config/testcase-quantify-templates.json` | 预期结果量化模板 + 禁止模式 + 自校验规则 |
| `config/testcase-templates.json` | 代码审查类用例模板（4种验证类型）+ 自校验规则 + 配置继承机制 |
| `config/test-method-rules.json` | 测试方式选择判断规则（11条规则）+ 多方式策略 + 自校验规则 + 配置继承机制 |

> 新增模块缩写时，只需在 `testcase-prefix-coordination.json` 的 `module_codes` 中追加条目。
> 新增用例类型时，只需在 `testcase-quantify-templates.json` 的 `quantify_templates` 中追加条目。
> 新增代码审查验证类型时，只需在 `testcase-templates.json` 的 `templates` 中追加条目。
> 新增测试方式判断规则时，只需在 `test-method-rules.json` 的 `selection_rules.rules` 中追加条目。

### 配置继承机制

`testcase-templates.json` 和 `test-method-rules.json` 支持三级配置继承：

```
技能级配置（默认）                          项目级配置（覆盖）                    银行级配置（覆盖）
bemp-testcase-generator/config/      →    bemp-test-common/config/       →    bemp-test-common/config/{bank_id}/
  testcase-templates.json                   testcase-templates-override.json     testcase-templates-override.json
  test-method-rules.json                   test-method-rules-override.json      test-method-rules-override.json
```

- **合并策略**：同路径配置项按层级递进覆盖，数组类型追加而非替换，对象类型逐字段合并
- **项目级覆盖**（可选）：在 `bemp-test-common/config/` 下放置 override 文件，针对当前项目定制
- **银行级覆盖**（可选）：在 `bemp-test-common/config/{bank_id}/` 下放置 override 文件，针对特定银行定制

## 关联技能

| 技能 | 关系 |
|:---|:---|
| `bemp-test-common` | 共享资源层：提供功能地图、优先级矩阵、测试标准、用例文档、用例索引 |
| `bemp-webapp-testing` | 用例执行验证；提供 LoginManager、组件交互参考 |
| `bemp-implementation-engineer` | Oracle/MySQL MCP 数据库操作 |
| `bemp-personalized-developer` | 功能开发 → 用例编写环节 |
| `bemp-advanced-doc-generator` | Excel 输出：将 MD 测试用例转为格式化 Excel（excel-custom 管线） |

## Excel 输出协作流程

测试用例编写完成后，可通过 `bemp-advanced-doc-generator` 的 `excel-custom` 管线将 MD 用例转为格式化 Excel。

### 自动触发条件

当 `config/generator-config.json` 中 `excel_output.enabled=true` 且 `excel_output.auto_generate=true` 时，用例编写完成后自动调用 Excel 生成。

### 手动调用方式

```bash
node scripts/cli.js \
  -t excel-custom \
  --excel-doc-type test-case-custom \
  --md-files "用例文件1.md" "用例文件2.md" \
  -m "模块名称" --json
```

### 输出规范

| 产出物 | 路径 | 格式 |
|:---|:---|:---|
| 测试用例 Excel | `bemp-test-common/test-cases/excel/{module}-SIT测试用例-{date}.xlsx` | xlsx |
| Excel 内 Sheet | 测试用例明细 + 测试用例汇总 | 双 Sheet |
