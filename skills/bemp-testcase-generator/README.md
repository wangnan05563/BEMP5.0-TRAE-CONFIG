# BEMP 测试用例生成器

基于五步方法论的 BEMP 票据系统测试用例生成技能。配置驱动，支持多银行环境。融合11种测试类型与10种组件测试设计方法。

## 职责边界

本技能**负责测试用例编写**，测试执行由 `bemp-webapp-testing` 技能负责：

| 职责 | 技能 | 说明 |
|:---|:---|:---|
| 用例编写 | `bemp-testcase-generator`（本技能） | 功能地图、优先级矩阵、P0用例设计、测试数据准备 |
| 用例执行 | `bemp-webapp-testing` | 健康检查、登录、页面验证、报告生成 |

## 五步方法论

```
① 功能地图 → ② 优先级矩阵 → ③ P0用例设计 → ④ 案例集扩展 → ⑤ 测试数据准备
```

## 按需加载机制

采用六级加载架构，按需加载参考文档，避免一次性加载全部内容：

| 级别 | 内容 | 加载时机 | 文件 |
|------|------|----------|------|
| Level 1 | SKILL.md | 始终加载 | 核心概要 |
| Level 2 | 指令映射表 | 按需加载 | references/instruction-mapping.md |
| Level 3 | 测试用例模板 | 按需加载 | references/general-test-cases.md |
| Level 4 | 组件测试设计 | 按需加载 | references/component-test.md |
| Level 5 | 输出示例 | 按需加载 | references/output-examples.md |
| Level 6 | 审查报告模板 | 按需加载 | references/review-report-template.md |

## 目录结构

```
bemp-testcase-generator/
├── SKILL.md                          AI Agent 入口文档
├── README.md                         本文件
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
│   ├── website-functional-map.md     功能地图：6子系统 285+ 页面清单
│   ├── test-priority-matrix.md       优先级矩阵：P0-P3 分级
│   ├── testing-standards.md          用例编写标准、BEMP 特有验证点
│   └── test-data-management.md       Oracle MCP 测试数据管理
├── test-cases/                       用例文档（common/sm/bm/be/ce）
│   ├── common/                       通用/登录
│   ├── sm/                           系统管理
│   ├── bm/                           业务管理
│   ├── be/                           场内交易
│   └── ce/                           场外交易
└── assets/templates/
    ├── functional-map.md             功能地图模板
    ├── priority-matrix.md            优先级矩阵模板
    ├── test-case-P0.md               P0 测试用例模板
    ├── test_case_template.md         标准测试用例模板
    └── test-data.md                  测试数据文档模板
```

## 前置条件

- BEMP 系统运行中（后端 8010 + 前端 8091）
- Playwright MCP 可用（功能地图探索）
- Oracle MCP / MySQL MCP 可用（测试数据准备）

## 快速开始

```powershell
# 1. 配置目标地址（默认已配置 127.0.0.1:8091）
#    编辑 config/generator-config.json → target 节点

# 2. 生成功能地图（通过 Playwright MCP 探索）
python scripts/generate_functional_map.py

# 3. 生成 P0 测试用例
python scripts/generate_test_cases.py --module acceptance --priority P0
python scripts/generate_test_cases.py --module all --priority P0 --bank hnnxbank

# 4. 准备测试数据
python scripts/prepare_test_data.py --module acceptance --db oracle
```

## 配置说明

`config/generator-config.json` 关键配置项：

| 节点 | 说明 | 默认值 |
|:---|:---|:---|
| `target.base_url` | 目标网站地址 | `http://127.0.0.1:8091` |
| `target.backend_url` | 后端地址 | `http://127.0.0.1:8010` |
| `database.type` | 数据库类型 | `oracle` |
| `priority` | P0-P3 优先级定义 | 内置 |
| `banks.active_bank` | 当前激活银行 | `hnnxbank` |
| `case_id_prefixes` | 24 个模块缩写 | 内置 |
| `output` | 输出路径配置 | `aotutests-playwright/` |

## 模板说明

| 模板 | 用途 | 产出阶段 |
|:---|:---|:---|
| `functional-map.md` | 网站功能地图 | 第一步 |
| `priority-matrix.md` | 优先级矩阵 | 第二步 |
| `test-case-P0.md` | P0 测试用例 | 第三步 |
| `test_case_template.md` | 标准测试用例（完整字段） | 第三步/第四步 |
| `test-data.md` | 测试数据文档 | 第五步 |

## 参考文档

### 按需加载文档（来自 test-case-generator-main 整合）

| 文档 | 说明 | 加载级别 |
|:---|:---|:---|
| `references/instruction-mapping.md` | 指令映射表：关键词→测试类型映射 | Level 2 |
| `references/general-test-cases.md` | 通用测试用例模板（11种测试类型，300+模板） | Level 3 |
| `references/component-test.md` | 组件测试设计方法（10种组件 + BEMP特有组件） | Level 4 |
| `references/output-examples.md` | 输出示例（含接口测试专用格式） | Level 5 |
| `references/review-report-template.md` | 审查报告模板（评分标准+检查清单） | Level 6 |

### BEMP 专项文档

| 文档 | 说明 |
|:---|:---|
| `references/website-functional-map.md` | 功能地图：6子系统 285+ 页面清单、路由映射 |
| `references/test-priority-matrix.md` | 优先级矩阵：P0-P3 分级、高风险场景 |
| `references/testing-standards.md` | 用例编写标准、BEMP 特有验证点 |
| `references/test-data-management.md` | Oracle MCP 测试数据准备流程、核心表结构 |
| `references/methodology.md` | 五步方法论完整说明 |
| `references/case-id-rules.md` | 用例编号与模块缩写对照表 |

## 用例编号规则

格式：`TC-{模块缩写}-{三位序号}`

| 缩写 | 模块 | 缩写 | 模块 |
|:---|:---|:---|:---|
| COMMON | 通用/登录 | CUSTSIGN | 企业报备 |
| BRANCH | 机构管理 | APPROVAL | 审批记账 |
| ROLE | 角色权限 | PAYMENT | 支付管理 |
| ACCEPT | 场外承兑 | DISCOUNT | 场外贴现 |
| PLEDGE | 场外质押 | TRUST | 场内托管 |
| MARKET | 场内交易 | CREDITBATCH | 额度批次 |

> 完整 24 个模块缩写见 `references/case-id-rules.md`

## 关联技能

| 技能 | 关系 |
|:---|:---|
| `bemp-webapp-testing` | 用例执行验证；提供 LoginManager、组件交互参考 |
| `bemp-implementation-engineer` | Oracle/MySQL MCP 数据库操作 |
| `bemp-personalized-developer` | 功能开发 → 用例编写环节 |
