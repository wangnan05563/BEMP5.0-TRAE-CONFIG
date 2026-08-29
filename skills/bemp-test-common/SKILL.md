---
name: "bemp-test-common"
version: "1.0.0"
description: "BEMP 测试体系共享资源层。为 bemp-testcase-generator（用例编写）和 bemp-webapp-testing（用例执行）提供统一的参考文档、用例文件和用例索引，确保单一数据源。"
whenToUse: "需要查阅 BEMP 系统功能地图、测试优先级矩阵、用例编写标准、测试数据管理指南，或需要访问 test-cases/ 目录中的用例文档时"
triggers:
  - "功能地图"
  - "优先级矩阵"
  - "用例标准"
  - "test-cases/"
  - "test-index.json"
  - "测试数据管理"
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

## 职责定位

本技能是 BEMP 测试体系的基础设施层，不独立执行任务，而是为上层两个技能提供统一的数据资源：

```
bemp-test-common（共享资源：用例文档 + 参考指南 + 用例索引）
    ├── bemp-testcase-generator（用例编写，引用 common 资源）
    └── bemp-webapp-testing（用例执行，引用 common 资源）
```

**核心原则**：功能地图、优先级矩阵、测试标准、数据管理指南、用例文档和用例索引只有一份，由本技能统一管理，避免多头维护导致版本分歧。

## 目录结构

```
bemp-test-common/
├── SKILL.md                          本文件
├── references/                       共享参考文档
│   ├── website-functional-map.md     功能地图：6子系统 285+ 页面清单、路由映射
│   ├── test-priority-matrix.md       优先级矩阵：P0-P3 分级、高风险场景
│   ├── testing-standards.md          用例编写标准、BEMP 特有验证点
│   └── test-data-management.md       Oracle MCP 测试数据准备流程、核心表结构
├── test-cases/                       用例文档（按 common/sm/bm/be/ce 子系统）
│   ├── common/                       通用/登录
│   ├── sm/                           系统管理
│   ├── bm/                           业务管理
│   ├── be/                           场内交易
│   └── ce/                           场外交易
├── test-data/                        测试数据（由 generator 第五步生成）
│   └── {模块}-test-data.md           按模块命名的测试数据文件
└── test-index.json                   用例索引：test-cases ↔ scripts 双向映射
```

## 关联技能

| 技能 | 关系 |
|:---|:---|
| `bemp-testcase-generator` | 引用本技能的 references、test-cases、test-index.json 进行用例编写 |
| `bemp-webapp-testing` | 引用本技能的 references、test-cases、test-index.json 进行用例执行 |
| `bemp-chrome-devtools-test` | 二轮验证时引用本技能的 test-cases 和 references 进行缺陷确认和回归验证 |
| `bemp-implementation-engineer` | 通过 Oracle/MySQL MCP 操作数据库，配合 test-data-management.md 准备测试数据 |

## 共享操作模式

以下操作模式从实战复盘中提炼，适用于所有测试技能（Playwright 和 Chrome DevTools），确保一致性：

### 登录流程（配置驱动 + 多策略降级）

```
Step 1: 从配置读取账号密码（优先环境变量 → 配置文件 → 默认值，禁止硬编码）
Step 2: 策略A - 原生setter + dispatchEvent（首选）
Step 3: 检测强制登录弹窗 → 如有则确认
Step 4: 验证登录态
Step 5: 若策略A失败 → 降级策略B/C
```

### 菜单导航（精确匹配 + 逐级展开）

```
Step 1: 从配置读取菜单树层级
Step 2: 精确文本匹配菜单项（非模糊搜索，避免歧义）
Step 3: 逐级点击 → 每步等待加载完成
Step 4: 确认目标页面已渲染
```

### DataGrid 行选中（全属性设置 + 双重验证）

```
Step 1: 定位目标行
Step 2: 尝试 click checkbox/radio
Step 3: 等待 500ms 后验证选中状态
Step 4: 若选中无效 → 同时设置 selects + selectIds + currentSelectList + currentSelect
Step 5: 触发 $forceUpdate → 再次验证
```

### v-if 条件字段（先条件后验证）

```
Step 1: 检测字段是否可见
Step 2: 若不可见 → 先设置触发条件值（如交易类型）
Step 3: 等待 500ms → 再次检测可见性
Step 4: 字段可见后设置值并验证
```

> ⚠️ **已知设计权衡**：银行基础信息（`name`、`url_prefix`）在 `bemp-testcase-generator/config/generator-config.json` 和 `bemp-webapp-testing/config/test_config.json` 中各自维护，目前未提取到本技能。原因是两个配置的银行字段用途不同（generator 仅需 name/url_prefix，testing 还需 login/pages/component_base 等运行时字段），强行合并会导致配置臃肿。后续如冲突加剧可考虑将 name/url_prefix/active_bank 提取到本技能统一管理。