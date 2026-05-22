---
name: "bemp-testcase-generator"
version: "2.0.0"
description: "BEMP 票据系统测试用例生成技能。基于五步方法论（功能地图→优先级矩阵→P0用例设计→案例集扩展→测试数据准备），融合11种测试类型与10种组件测试设计，通过 Playwright MCP 自动探索网站、Oracle/MySQL MCP 准备数据，生成高质量测试用例。"
whenToUse: "需要编写/设计/生成测试用例、制作功能地图、构建优先级矩阵、准备测试数据、审查测试用例时调用"
triggers:
  - "测试用例 编写/设计/生成"
  - "功能地图 制作/生成"
  - "优先级矩阵 构建/生成"
  - "测试数据 准备/梳理"
  - "用例/案例 编写/设计"
  - "审查/评审 测试用例"
  - "接口测试/UI测试/安全测试/性能测试"
  - "输入框/表单/弹窗/列表 组件测试"
---

## 技能职责

本技能**负责测试用例编写**，测试执行由 `bemp-webapp-testing` 技能负责。两者解耦，由智能体编排流程：

```
bemp-testcase-generator（用例编写） → bemp-webapp-testing（用例执行）
```

- **需要编写用例** → 调用本技能
- **需要执行测试** → 调用 `bemp-webapp-testing`

## 按需加载机制

本技能采用六级加载架构，避免一次性加载全部参考文档：

| 级别 | 内容 | 加载时机 | 文件 |
|------|------|----------|------|
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
匹配 instruction-mapping.md（Level 2）→ 确定需要加载的测试类型
    ↓
加载对应测试用例模板（Level 3/4）
    ↓
生成/审查测试用例 → 参考 output-examples.md 格式
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
2. 登录系统（复用 bemp-webapp-testing 的 LoginManager）
3. 遍历主菜单 + 子菜单，记录页面路由
4. 每个页面：截图 + 提取关键元素（选择器/功能描述）
5. 记录页面间跳转关系和状态流转
6. 输出功能地图 MD 文件（按 `assets/templates/functional-map.md` 模板）

> 已有功能地图：`references/website-functional-map.md`（6子系统 285+ 页面），可直接复用

### 第二步：测试范围与优先级矩阵构建

**输入**：网站功能地图

1. 核心流程识别：确定用户必用且对项目至关重要的功能模块
2. 风险点评估：识别高风险区域（输入边界、状态改变、权限校验等）
3. 输出优先级矩阵 MD 文件（按 `assets/templates/priority-matrix.md` 模板）

> 已有优先级矩阵：`references/test-priority-matrix.md`，可直接复用

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
> 数据库操作指南见 `references/test-data-management.md`

## 目录结构

```
bemp-testcase-generator/
├── SKILL.md                          本文件
├── README.md                         开发者入口文档
├── test-index.json                   用例索引：25 条目/207+ 用例 ↔ 脚本双向映射
├── config/
│   └── generator-config.json         配置（目标地址/优先级/输出路径/银行/编号前缀）
├── scripts/
│   ├── generate_functional_map.py    功能地图生成指令
│   ├── generate_test_cases.py        测试用例生成指令
│   └── prepare_test_data.py          测试数据准备指令
├── references/
│   ├── instruction-mapping.md        指令映射表：关键词→测试类型/组件映射
│   ├── general-test-cases.md         通用测试用例模板（11种测试类型，300+模板）
│   ├── component-test.md             组件测试设计方法（10种组件 + BEMP特有组件）
│   ├── output-examples.md            输出示例（含接口测试专用格式）
│   ├── review-report-template.md     审查报告模板（评分标准+检查清单）
│   ├── methodology.md                五步方法论完整说明
│   ├── case-id-rules.md              用例编号与模块缩写对照表
│   ├── website-functional-map.md     功能地图：6子系统 285+ 页面清单、路由映射
│   ├── test-priority-matrix.md       优先级矩阵：P0-P3 分级、高风险场景
│   ├── testing-standards.md          用例编写标准、BEMP 特有验证点
│   └── test-data-management.md       Oracle MCP 测试数据准备流程、核心表结构
├── test-cases/                       用例文档（按 common/sm/bm/be/ce 子系统）
│   ├── common/                       通用/登录
│   │   ├── login.md                  登录基础功能
│   │   └── login-session.md          登录与会话管理
│   ├── sm/                           系统管理
│   │   ├── branch/                   机构管理
│   │   │   ├── branch.md             机构管理
│   │   │   ├── simple-branch.md      简版机构
│   │   │   └── branch-batch-import.md 机构批量导入
│   │   ├── clearing/clearing.md      清算管理
│   │   └── role-permission.md        角色权限
│   ├── bm/                           业务管理
│   │   ├── approval/approval-accounting.md  审批与记账
│   │   ├── contract/contract-invoice.md     合同发票
│   │   ├── credit/credit-management.md      承兑行额度管理
│   │   ├── cust/                     客户管理
│   │   │   ├── custCorp.md           企业客户查询
│   │   │   ├── custAcct.md           企业账号同步
│   │   │   └── cust-optimize.md      客户管理优化
│   │   ├── payment/payment.md        支付管理
│   │   └── sign/                     企业报备
│   │       ├── custCorpSign.md       企业信息报备
│   │       ├── custCorpSignAudit.md  报备复核
│   │       └── custCorpSignRecord.md 报备记录
│   ├── be/                           场内交易
│   │   ├── market/                   市场交易
│   │   │   ├── market.md             市场交易
│   │   │   └── market-optimize.md    市场交易优化
│   │   └── trust/trust.md            托管业务
│   └── ce/                           场外交易
│       ├── acceptance/acceptance.md  承兑业务
│       ├── discount/discount.md      贴现业务
│       └── pledge/pledge.md          质押业务
└── assets/templates/
    ├── functional-map.md             功能地图模板
    ├── priority-matrix.md            优先级矩阵模板
    ├── test-case-P0.md               P0 测试用例模板
    ├── test_case_template.md         标准测试用例模板（完整字段）
    └── test-data.md                  测试数据文档模板
```

## BEMP 特有验证点

所有用例须包含以下验证维度（详见 `references/testing-standards.md`）：

1. **个性化路径**：API 请求使用当前银行 `url_prefix` 前缀
2. **组件覆盖**：个性化组件正确覆盖产品化组件
3. **控制台错误**：无 TypeError/ReferenceError/ChunkLoadError
4. **数据隔离**：查询结果仅包含本机构及下级机构数据
5. **弹窗关闭**：X按钮/关闭按钮/重置按钮三通道验证

## 输出规范

| 产出物 | 路径 | 格式 |
|:---|:---|:---|
| 功能地图 | `references/website-functional-map.md` | MD（按模板） |
| 优先级矩阵 | `references/test-priority-matrix.md` | MD（按模板） |
| P0 用例 | `test-cases/{子系统}/{模块}.md` | MD（按模板） |
| 扩展用例 | 追加到对应模块 MD 文件 | MD |
| 测试数据 | `test-data/{模块}-test-data.md` | MD（按模板） |
| 用例索引 | `test-index.json` | JSON |
| 审查报告 | 按需生成 | MD（按 review-report-template.md） |

## 已有测试用例基准

| 子系统 | 文件 | 用例数 | 覆盖 |
|:---|:---|:---|:---|
| 通用 | test-cases/common/login-session.md | 21 | 密码登录、强制登录、会话管理 |
| 系统管理 | test-cases/sm/role-permission.md | 12 | 角色分配、机构业务权限 |
| 系统管理 | test-cases/sm/clearing/clearing.md | 17 | 清算明细、排队管理、结算同步 |
| 系统管理 | test-cases/sm/branch/ | - | 机构管理、简版机构 |
| 业务管理 | test-cases/bm/approval/approval-accounting.md | 21 | 审批路线、分录配置、科目维护 |
| 业务管理 | test-cases/bm/payment/payment.md | 13 | 支付申请、支付复核 |
| 业务管理 | test-cases/bm/cust/ | - | 企业客户查询、账号同步 |
| 业务管理 | test-cases/bm/sign/ | - | 企业报备、复核、记录查询 |
| 业务管理 | test-cases/bm/credit/credit-management.md | 81 | 承兑行额度管理完整流程 |
| 场内交易 | test-cases/be/trust/trust.md | 32 | 提示付款、质押/解质押 |
| 场内交易 | test-cases/be/market/market.md | 32 | 买入、卖出、再贴现、回购、返售 |
| 场外交易 | test-cases/ce/acceptance/acceptance.md | 25 | 电票签发、承兑记账、付款登记、到期扣款 |
| 场外交易 | test-cases/ce/discount/discount.md | 19 | 贴现申请、贴现记账、计息复核 |
| 场外交易 | test-cases/ce/pledge/pledge.md | 15 | 提示付款、质押、解质押 |

> 详细索引（脚本覆盖/缺失标注）见 `test-index.json` | P0 用例合计约 207 条 | 25 条目

## 配置说明

`config/generator-config.json` 关键节点：

| 节点 | 说明 |
|:---|:---|
| `target` | 目标网站地址（base_url/backend_url/hash_route/login_path） |
| `database` | 数据库类型（oracle/mysql），通过 MCP 操作 |
| `priority` | P0-P3 优先级定义 |
| `risk_levels` | 高/中/低风险等级定义 |
| `output` | 输出路径配置 |
| `banks` | 多银行配置（active_bank + 各银行 url_prefix） |
| `case_id_prefixes` | 24 个模块缩写与编号规则 |

## 关联技能

| 技能 | 关系 |
|:---|:---|
| `bemp-webapp-testing` | 用例执行验证；提供 LoginManager、组件交互参考 |
| `bemp-implementation-engineer` | Oracle/MySQL MCP 数据库操作 |
| `bemp-personalized-developer` | 功能开发 → 用例编写环节 |
