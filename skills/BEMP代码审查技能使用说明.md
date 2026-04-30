# BEMP代码审查技能使用说明

## 概述

已成功创建两个专门针对BEMP工程（河南农信个性化模块）的代码审查技能：

1. **bemp-backend-code-review** - 后端代码审查技能
2. **bemp-frontend-code-review** - 前端代码审查技能

## 技能位置

```
.trae/skills/
├── bemp-backend-code-review/
│   └── SKILL.md
├── bemp-frontend-code-review/
│   └── SKILL.md
└── hnnx-personalized-dev/
    ├── SKILL.md
    ├── README.md
    ├── assets/
    │   ├── 开发指南/
    │   │   ├── README.md
    │   │   ├── 前端开发规范.md
    │   │   ├── 前端开发模板.md
    │   │   ├── 后端开发规范.md
    │   │   ├── 后端开发模板.md
    │   │   └── 综合开发指南.md
    │   └── templates/
    │       ├── Hnnx.java
    │       ├── HnnxDtoTemplate.java
    │       └── HnnxServiceTemplate.java
    └── references/
        ├── bemprule.md
        ├── best-practices.md
        └── common-issues.md
```

## 技能功能

### bemp-backend-code-review（后端代码审查）

**功能描述：**
- 专门用于审查BEMP工程后端代码
- 审查河南农信个性化后端代码是否符合项目规范
- 包括代码结构、注解使用、参数传递、国际化等

**主要审查内容：**
1. 目录结构规范（必须在 `banks/ext-hnnxbank` 目录下）
2. 个性化类开发规范（@CustomizedBean注解、类名命名规则）
3. Controller层规范（继承关系、注解使用、参数传递）
4. Service层规范（@CloudComponent、@CloudService、@CloudFunction注解）
5. 参数传递规范（BaseRequest、BasePageRequest使用）
6. 依赖注入规范（@CloudReference、@Resource注解）
7. 代码质量规范（注释、日志、异常处理）
8. 国际化规范（API路径一致性）
9. Maven依赖规范（版本号参考bom）
10. 编码规范（Java 1.8语法）

**使用时机：**
- 后端代码编写完成后立即执行
- Maven打包编译前进行代码走查
- 提交代码前进行规范检查

### bemp-frontend-code-review（前端代码审查）

**功能描述：**
- 专门用于审查BEMP工程前端代码
- 审查河南农信个性化前端代码是否符合项目规范
- 包括目录结构、组件复用、国际化、API调用等

**主要审查内容：**
1. 目录结构规范（必须在 `frontend/src/views/bizViews/banks/hnnxbank` 目录下）
2. 个性化文件开发规范（vue文件复用、映射关系维护）
3. 国际化规范（按钮名称、文本国际化）
4. API调用规范（路径一致性、HTTP方法）
5. 组件使用规范（复用已有组件、组件命名）
6. 代码质量规范（注释、格式化）
7. 模板规范（v-bind、v-if、v-for等）
8. UI组件规范（h_ui组件库使用）
9. 路由规范（路由注册、路径映射）
10. 状态管理规范（Vuex使用）

**使用时机：**
- 前端代码编写完成后立即执行
- npm run dev开发前进行代码走查
- 提交代码前进行规范检查

## 使用方法

### 后端代码审查

在完成后端代码编写后，调用技能：

```
调用 bemp-backend-code-review 技能
```

技能将自动审查代码是否符合以下规范：

1. ✅ 所有代码在 `banks/ext-hnnxbank` 目录下
2. ✅ 个性化类使用 `@CustomizedBean` 注解
3. ✅ 类名遵循 `HnnxBank` 前缀命名规则
4. ✅ Controller继承 `BaseServiceController` 或 `BaseController`
5. ✅ Controller使用 `@RestController` 注解
6. ✅ Controller与Service使用 `BaseRequest` 交互
7. ✅ Service实现类使用 `@CloudComponent` 注解
8. ✅ Service接口使用 `@CloudService` 注解
9. ✅ Service方法使用 `@CloudFunction` 注解
10. ✅ Maven依赖版本号参考 `bom/import-bom/pom.xml`

### 前端代码审查

在完成前端代码编写后，调用技能：

```
调用 bemp-frontend-code-review 技能
```

技能将自动审查代码是否符合以下规范：

1. ✅ 所有代码在 `frontend/src/views/bizViews/banks/hnnxbank` 目录下
2. ✅ 个性化vue文件与产品化文件保持一致
3. ✅ 路径映射在 `hnnxbankIndex.js` 中维护
4. ✅ 按钮名称使用国际化文本
5. ✅ API路径与后端映射路径一致
6. ✅ 优先复用已有组件
7. ✅ 代码添加必要中文注释
8. ✅ 使用Vue 2.6.12推荐编码风格
9. ✅ 正确使用 `$t()` 方法调用国际化
10. ✅ 正确使用h_ui组件库

## 参考文档

### hnnx-personalized-dev 技术文档

`hnnx-personalized-dev` 技术文档提供了完整的开发指南和模板，位于：

```
.trae/skills/hnnx-personalized-dev/
├── SKILL.md                          # Skill 定义文件
├── README.md                         # 使用说明
├── assets/
│   ├── 开发指南/                     # 开发指南文档
│   │   ├── README.md                 # 开发指南说明
│   │   ├── 前端开发规范.md           # 前端开发规范文档
│   │   ├── 前端开发模板.md           # 前端开发模板文档
│   │   ├── 后端开发规范.md           # 后端开发规范文档
│   │   ├── 后端开发模板.md           # 后端开发模板文档
│   │   └── 综合开发指南.md           # 综合开发指南
│   └── templates/                    # 代码模板
│       ├── Hnnx.java                 # 基础模板
│       ├── HnnxDtoTemplate.java      # DTO模板
│       └── HnnxServiceTemplate.java  # Service模板
└── references/                       # 参考文档
    ├── bemprule.md                   # BEMP项目规则
    ├── best-practices.md             # 最佳实践指南
    └── common-issues.md              # 常见问题解决方案
```

**使用建议**：
1. 开发前阅读 [综合开发指南](.trae/skills/hnnx-personalized-dev/assets/开发指南/综合开发指南.md) 了解整体规范
2. 根据开发需求查阅对应的前端或后端开发规范
3. 参考对应的开发模板进行代码编写
4. 参考 [bemprule.md](.trae/skills/hnnx-personalized-dev/references/bemprule.md) 了解项目强制规范
5. 参考 [best-practices.md](.trae/skills/hnnx-personalized-dev/references/best-practices.md) 了解最佳实践
6. 参考 [common-issues.md](.trae/skills/hnnx-personalized-dev/references/common-issues.md) 解决常见问题

## 审查示例

### 后端审查示例

**✅ 正确示例：**
```java
@CloudComponent
@CustomizedBean
public class HnnxBankBranchServiceImpl extends BranchServiceImpl implements BranchService {
    @CloudReference
    private BranchService branchService;
    
    @Override
    public List<BranchDto> querySubBranchAndSelf(BaseRequest<QryBranchDto> req) {
        BempValidUtil.validBaseRequest(req);
        return branchService.querySubBranchAndSelf(req);
    }
}
```

**❌ 错误示例：**
```java
// 缺少 @CustomizedBean 注解
public class BranchServiceImpl extends BranchServiceImpl {
    // 使用了错误的注解
    @Autowired
    private BranchService branchService;
    
    // 参数类型错误
    public List<BranchDto> querySubBranchAndSelf(QryBranchDto req) {
        return branchService.querySubBranchAndSelf(req);
    }
}
```

### 前端审查示例

**✅ 正确示例：**
```vue
<template>
  <div class="layout">
    <h-button type="primary" @click="handleSubmit">
      {{$t("m.i.common.commit")}}
    </h-button>
  </div>
</template>

<script>
  export default {
    name: "branch",
    methods: {
      handleSubmit() {
        // 提交逻辑
      }
    }
  }
</script>
```

**❌ 错误示例：**
```vue
<template>
  <div class="layout">
    <!-- 硬编码文本，违反国际化规范 -->
    <h-button type="primary" @click="handleSubmit">
      提交
    </h-button>
  </div>
</template>

<script>
  export default {
    // 缺少name属性
    methods: {
      handleSubmit: function() {
        // 提交逻辑
      }
    }
  }
</script>
```

## 重要提醒

### 后端开发规范（强制）

1. 【强制】所有后端代码必须在 `banks/ext-hnnxbank` 目录下开发
2. 【强制】个性化类必须添加 `@CustomizedBean` 注解
3. 【强制】类名遵循 `HnnxBank` 前缀命名规则
4. 【强制】Controller与Service层交互必须使用 `BaseRequest`
5. 【强制】编码后maven打包确保编译通过
6. 【强制】完成编码后必须调用 `bemp-backend-code-review` 技能进行代码走查

### 前端开发规范（强制）

1. 【强制】所有前端代码必须在 `frontend/src/views/bizViews/banks/hnnxbank` 目录下开发
2. 【强制】所有按钮名称必须使用国际化文本，禁止硬编码
3. 【强制】前端调用后端API路径必须与后端映射路径一致
4. 【强制】个性化vue文件必须在 `hnnxbankIndex.js` 中维护映射关系
5. 【强制】完成编码后必须调用 `bemp-frontend-code-review` 技能进行代码走查

## 技能特点

### bemp-backend-code-review 特点

1. **针对性强**：专门针对BEMP工程的后端代码规范
2. **自动化审查**：自动检查代码是否符合规范要求
3. **详细反馈**：提供详细的改进建议和示例
4. **规范全面**：涵盖目录结构、注解使用、参数传递等10大方面
5. **强制规范**：明确标注所有强制性规范要求

### bemp-frontend-code-review 特点

1. **针对性强**：专门针对BEMP工程的前端代码规范
2. **自动化审查**：自动检查代码是否符合规范要求
3. **详细反馈**：提供详细的改进建议和示例
4. **规范全面**：涵盖目录结构、国际化、API调用等10大方面
5. **强制规范**：明确标注所有强制性规范要求

## 技术栈适配

### 后端技术栈

- Java 1.8
- Spring Boot 2.7.11
- Spring 5.3.27
- JresCloud 3.1.2.1
- Maven 3.x
- MyBatis/MyBatis-Plus

### 前端技术栈

- Vue 2.6.12
- Vue Router 3.0.1
- Vuex 3.0.1
- Vue I18n 5.0.3
- Axios 0.27.1
- Webpack 4.39.3
- h_ui 1.14.0

## 总结

两个代码审查技能已成功创建并配置完成：

- ✅ **bemp-backend-code-review** - 后端代码审查技能
- ✅ **bemp-frontend-code-review** - 前端代码审查技能

这两个技能能够：
1. 分别识别并适配前后端不同的技术栈
2. 提供针对性的代码质量评估
3. 确保代码符合BEMP工程规范
4. 提高代码质量和可维护性
5. 减少代码审查的人工成本

在日常开发中，建议在完成编码后立即调用相应的代码审查技能，确保代码质量符合项目规范要求。
