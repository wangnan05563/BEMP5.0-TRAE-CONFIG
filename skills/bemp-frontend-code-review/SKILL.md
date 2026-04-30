---
name: "bemp-frontend-code-review"
description: "专门用于审查BEMP工程前端代码的技能。审查河南农信个性化前端代码是否符合项目规范，包括目录结构、组件复用、国际化、API调用等。在前端代码编写完成后调用此技能进行自动化审查。"
---

# BEMP前端代码审查技能

## 功能说明

本技能专门用于审查BEMP工程（河南农信个性化模块）的前端代码，确保代码符合项目既定规范和最佳实践。

## 审查范围

### 1. 目录结构规范
- 【强制】所有前端代码必须在 `frontend/src/views/bizViews/banks/hnnxbank` 目录下开发
- 检查目录结构是否与产品化文件保持一致
- 检查是否在正确的模块目录下开发（be、bm、ce、pc、pe、pl、sm等）

### 2. 个性化文件开发规范
- 【强制】检查 `frontend/src/views/bizViews/banks/hnnxbank` 目录下是否有产品化vue对应的个性化vue文件
- 【强制】若无可复用的个性化vue文件，必须新增一个vue文件，名称和目录结构与原产品化文件保持一致
- 【强制】个性化路径与产品化路径必须在 `frontend/src/api/bank/hnnxbankIndex.js` 文件中维护映射关系
- 检查路由映射是否正确配置

### 3. 国际化规范
- 【强制】所有按钮名称必须遵循项目既定风格
- 【强制】按钮名称与文本必须写入国际化文件
- 【强制】按钮文本和标签文本必须使用 `$t()` 方法进行国际化
- 【强制】placeholder 和提示信息保持硬编码，无需国际化
- 【强制】弹窗标题、确认对话框标题等UI元素文本必须国际化
- 【强制】检查 `frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js` 中是否已有对应文本
- 【强制】若有可复用属性，必须复用，禁止在模板文件中直接硬编码按钮或标签文本
- 检查国际化键值（key）的命名规范是否一致
- 检查是否正确使用 `$t()` 方法调用国际化文本

#### 国际化范围清单（基于实际开发经验）

| 元素类型 | 是否需要国际化 | 示例 |
|---------|--------------|------|
| 按钮文本 | ✅ 必须 | `{{$t("m.i.common.commit")}}` |
| 表单标签 | ✅ 必须 | `:label="$t('hnnxbank.m.i.auth.sourceUserNo')"` |
| 弹窗标题 | ✅ 必须 | `:title="$t('hnnxbank.m.i.auth.batchCopyRole')"` |
| placeholder | ❌ 硬编码 | `placeholder="请输入源用户号"` |
| 提示信息 | ❌ 硬编码 | `info: "请输入源用户号"` |
| 确认对话框内容 | ❌ 硬编码 | `content: "确定要批量复制角色吗？"` |
| 成功/错误提示 | ❌ 硬编码 | `info: "批量复制角色成功"` |

#### 国际化实现流程
1. 先在 `zh-CN.js` 中添加国际化键值对
2. 在Vue模板中使用 `$t()` 调用
3. 检查是否已有可复用的国际化文本

### 4. API调用规范
- 【强制】前端调用后端新增的API路径需做核对，确保路径正确
- 【强制】参数传递格式必须与后端接收方式匹配
- 检查API路径是否与后端 `@RequestMapping` 注解路径一致
- 检查API调用是否使用正确的HTTP方法（POST/GET）
- 检查是否正确传递请求参数

#### 参数传递格式（基于实际开发经验）

##### 场景1：后端使用 DTO 对象接收参数（推荐）

当后端使用 `public CommonResp method(HnnxXxxReq req)` 方式接收参数时：

✅ **正确格式（直接传递对象）：**
```javascript
let params = {
  sourceUserNo: this.copyRoleForm.sourceUserNo,
  targetUserNos: this.copyRoleForm.targetUserNos
};
// 直接传递参数对象，Spring MVC 自动绑定到 DTO
post(params, "/hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole")
```

后端代码：
```java
@RequestMapping(value = "/func_batchCopyRole", method = {RequestMethod.POST})
@ResponseBody
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    String sourceUserNo = req.getSourceUserNo();
    String targetUserNos = req.getTargetUserNos();
}
```

##### 场景2：后端使用 BaseRequest 接收参数（兼容旧代码）

当后端使用 `public CommonResp method(BaseRequest req)` 方式接收参数时：

✅ **正确格式（使用 requestDto）：**
```javascript
let params = {
  sourceUserNo: this.copyRoleForm.sourceUserNo,
  targetUserNos: this.copyRoleForm.targetUserNos
};
let req = {
  requestDto: params  // 使用 requestDto 格式
};
post(req, "/hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole")
```

后端代码：
```java
@RequestMapping(value = "/func_batchCopyRole", method = {RequestMethod.POST})
@ResponseBody
public CommonResp batchCopyRole(BaseRequest req) {
    Map<String, Object> params = (Map<String, Object>) req.getRequestDto();
    String sourceUserNo = (String) params.get("sourceUserNo");
}
```

##### 场景3：后端使用 @RequestBody 接收 JSON 参数

当后端使用 `@RequestBody` 注解时：

⚠️ **注意：** 前端默认使用 `application/x-www-form-urlencoded`，需要修改为 `application/json`

```javascript
let params = {
  sourceUserNo: this.copyRoleForm.sourceUserNo,
  targetUserNos: this.copyRoleForm.targetUserNos
};
post(params, "/hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole", {
  headers: {
    'Content-Type': 'application/json'
  }
})
```

❌ **错误格式（已废弃）：**
```javascript
let req = {
  extParam: {  // 禁止使用 extParam 格式
    sourceUserNo: this.copyRoleForm.sourceUserNo
  }
};
```

#### 参数传递检查清单

- [ ] 确认后端参数接收方式（DTO / BaseRequest / @RequestBody）
- [ ] 前端参数名与后端 DTO 属性名完全一致（区分大小写）
- [ ] 参数值为空时处理（null / undefined / 空字符串）
- [ ] 数组/列表参数格式正确（逗号分隔字符串或 JSON 数组）
- [ ] 日期参数格式与后端一致（yyyy-MM-dd / yyyyMMdd）

### 5. 组件使用规范
- 【强制】检查是否优先复用已有组件与工具类
- 【强制】UI风格必须与现有组件保持一致（如超链接风格、输入框风格等）
- 检查是否遵循现有组件结构与编码范式
- 检查组件命名是否符合Vue组件命名规范
- 检查组件props、events是否正确使用

#### UI风格一致性检查清单

##### 输入框风格一致性
- [ ] 普通输入框：使用 `h-input` 组件，保持相同的高度、边框样式
- [ ] 带搜索图标的输入框：参考【机构名称】实现方式
  ```vue
  <!-- 正确示例 -->
  <h-input v-model="form.brchName" readonly>
    <h-icon name="android-search" slot="append" @click="selectBranch"></h-icon>
  </h-input>
  ```
- [ ] 选择型输入框：使用统一的搜索图标和点击事件处理方式
- [ ] 只读输入框：使用 `readonly` 属性，样式与可编辑输入框区分

##### 超链接/按钮风格一致性
- [ ] 超链接颜色：使用项目统一的主题色（如 `#2d8cf0`）
- [ ] 超链接悬停效果：与现有超链接保持一致
- [ ] 操作按钮：使用 `h-button` 组件，保持相同的大小和样式
- [ ] 图标按钮：使用 `h-icon` 组件，保持相同的图标风格

##### 弹窗风格一致性
- [ ] 弹窗宽度：与同类弹窗保持一致（如 600px、800px）
- [ ] 弹窗标题：使用 `h-modal` 的 `title` 属性，保持标题样式一致
- [ ] 表单布局：标签右对齐，输入框左对齐，保持相同间距
- [ ] 按钮位置：确定/取消按钮统一放在右下角
- [ ] 表单验证：错误提示样式与系统其他表单一致

##### 表格风格一致性
- [ ] 表格列宽：根据内容类型设置合适的默认宽度
- [ ] 操作列：使用统一的编辑/删除图标和样式
- [ ] 分页组件：使用 `h-page` 组件，保持相同的分页样式
- [ ] 空数据提示：使用统一的空数据展示样式

#### 组件复用检查清单

##### 已有组件检查
在开发新功能前，必须检查以下目录是否有可复用的组件：
- [ ] `frontend/src/views/bizViews/banks/hnnxbank/components/` - 个性化组件
- [ ] `frontend/src/components/` - 公共组件
- [ ] 同模块下的其他 Vue 文件 - 类似功能组件

##### 常见可复用组件类型
- [ ] **选择机构组件**：`hnnxbankSelectBranch.vue`
- [ ] **选择用户组件**：`hnnxbankSelectUser.vue`
- [ ] **日期范围选择**：使用项目统一的日期组件
- [ ] **文件上传**：使用项目统一的文件上传组件
- [ ] **表格操作列**：参考现有表格的操作列实现

##### 组件复用决策流程
1. **需求分析**：明确需要实现的功能和UI效果
2. **组件搜索**：在项目中搜索类似功能的组件
3. **代码审查**：查看已有组件的实现方式和接口定义
4. **复用评估**：判断是否可以直接复用或需要扩展
5. **复用/新建**：优先复用，必要时在已有组件基础上扩展

### 6. 代码质量规范
- 检查是否添加必要的中文注释（关键逻辑和可能造成理解困难的部分）
- 检查代码缩进和格式化是否符合项目规范
- 检查是否使用Vue 2.6.12推荐的编码风格
- 检查是否正确使用Vue生命周期钩子

### 7. 模板规范
- 检查模板语法是否正确（`v-bind`、`v-if`、`v-for`等）
- 检查表单验证规则是否正确配置
- 检查数据绑定是否正确
- 检查事件处理函数是否正确绑定

### 8. UI组件规范
- 检查是否使用项目统一的UI组件库（h_ui）
- 检查组件属性是否符合组件库要求
- 检查布局是否符合项目设计规范
- 检查响应式设计是否正确实现

### 9. 路由规范
- 检查路由配置是否在 `frontend/src/router/index.js` 中正确注册
- 检查路由路径是否与 `hnnxbankIndex.js` 中的映射路径一致
- 检查路由元信息（meta）是否正确配置

### 10. 状态管理规范
- 检查是否正确使用Vuex进行状态管理
- 检查store模块划分是否合理
- 检查actions、mutations、getters是否正确使用

## 审查流程（系统化执行步骤）

### 第一阶段：前置检查

1. **文件位置检查**
   - [ ] 文件是否位于 `frontend/src/views/bizViews/banks/hnnxbank` 目录下
   - [ ] 目录结构是否与产品化文件保持一致
   - [ ] 文件名是否符合命名规范

2. **映射关系检查**
   - [ ] 是否在 `hnnxbankIndex.js` 中注册了路由映射
   - [ ] 映射路径是否正确
   - [ ] 组件路径是否正确

### 第二阶段：代码规范检查

3. **国际化检查**
   - [ ] 按钮文本是否使用 `$t()` 方法
   - [ ] 标签文本是否使用 `$t()` 方法
   - [ ] 是否在 `zh-CN.js` 中定义了国际化键值
   - [ ] placeholder 和提示信息是否保持硬编码

4. **API调用检查**
   - [ ] API路径是否与后端一致
   - [ ] 参数格式是否与后端接收方式匹配
   - [ ] HTTP方法是否正确（POST/GET）
   - [ ] 参数名是否与后端 DTO 属性名一致

5. **UI风格检查**
   - [ ] 是否复用了已有组件
   - [ ] 输入框风格是否与现有组件一致
   - [ ] 弹窗样式是否与系统其他弹窗一致
   - [ ] 按钮样式是否统一

### 第三阶段：质量检查

6. **代码质量检查**
   - [ ] 是否添加必要的中文注释
   - [ ] 代码缩进和格式化是否规范
   - [ ] 是否使用 Vue 2.6.12 推荐的编码风格
   - [ ] 是否存在冗余代码

7. **功能逻辑检查**
   - [ ] 表单验证规则是否正确
   - [ ] 事件处理函数是否正确绑定
   - [ ] 数据绑定是否正确
   - [ ] 错误处理是否完善

### 第四阶段：输出审查报告

8. **生成审查报告**
   - 汇总所有问题
   - 按严重程度分类
   - 提供具体的改进建议
   - 标记必须修复项和可选优化项

## 审查判断标准

### 严重程度分级

| 级别 | 说明 | 处理方式 |
|------|------|----------|
| 🔴 **阻塞** | 违反强制规范，会导致功能异常 | 必须修复，否则不予通过 |
| 🟠 **严重** | 可能导致潜在问题或不符合最佳实践 | 强烈建议修复 |
| 🟡 **警告** | 代码风格或轻微规范问题 | 建议修复 |
| 🟢 **提示** | 优化建议或可选改进 | 可选修复 |

### 阻塞级问题清单（必须修复）

- [ ] 文件不在 `hnnxbank` 目录下开发
- [ ] 未在 `hnnxbankIndex.js` 中注册路由映射
- [ ] 按钮或标签文本硬编码（未国际化）
- [ ] API路径与后端不一致
- [ ] 参数格式与后端接收方式不匹配
- [ ] 使用了已废弃的 `extParam` 格式
- [ ] 存在语法错误或编译错误

### 严重级问题清单（强烈建议修复）

- [ ] 未复用已有组件而重复实现
- [ ] UI风格与现有组件不一致
- [ ] 缺少必要的中文注释
- [ ] 表单验证规则不完整
- [ ] 错误处理不完善
- [ ] 存在潜在的空指针风险

### 警告级问题清单（建议修复）

- [ ] 代码缩进或格式化不规范
- [ ] 变量命名不规范
- [ ] 存在冗余代码
- [ ] 注释不清晰或不完整

## 审查结果呈现形式

### 审查报告模板

```markdown
# 前端代码审查报告

## 基本信息
- **审查文件**：`frontend/src/views/bizViews/banks/hnnxbank/.../xxx.vue`
- **审查时间**：202X-XX-XX
- **审查人**：bemp-frontend-code-review Skill

## 审查结果摘要
- 🔴 阻塞问题：X 个
- 🟠 严重问题：X 个
- 🟡 警告问题：X 个
- 🟢 优化建议：X 个

## 详细问题列表

### 🔴 阻塞问题（必须修复）

1. **问题描述**：[具体问题描述]
   - **位置**：第 X 行
   - **当前代码**：
     ```javascript
     // 问题代码示例
     ```
   - **修复建议**：
     ```javascript
     // 修复后的代码示例
     ```
   - **参考规范**：[对应规范章节]

### 🟠 严重问题（强烈建议修复）

1. **问题描述**：[具体问题描述]
   - **位置**：第 X 行
   - **修复建议**：[具体建议]

### 🟡 警告问题（建议修复）

1. **问题描述**：[具体问题描述]
   - **位置**：第 X 行
   - **修复建议**：[具体建议]

### 🟢 优化建议（可选）

1. **建议描述**：[具体建议]
   - **位置**：第 X 行
   - **优化方案**：[具体方案]

## 审查结论

- [ ] 通过（无阻塞问题）
- [ ] 有条件通过（仅警告和提示级别问题）
- [ ] 不通过（存在阻塞或严重问题）

## 修复验证

修复完成后，请重新运行审查确认问题已解决。
```

### 快速问题定位指南

| 问题现象 | 可能原因 | 检查位置 | 解决方案 |
|---------|---------|---------|---------|
| 国际化文本不显示 | 未在 zh-CN.js 中定义 | `zh-CN.js` | 添加国际化键值对 |
| API 调用 404 | 路径拼写错误 | `hnnxbankIndex.js`、后端 Controller | 核对路径一致性 |
| 参数传递失败 | 参数名不一致或格式错误 | 前端调用代码、后端 DTO | 检查参数名和格式 |
| UI 风格不一致 | 未复用已有组件 | 同目录下其他组件 | 参考现有组件实现 |
| 表单验证不生效 | 验证规则配置错误 | 表单组件的 `rules` 属性 | 检查验证规则配置 |

## 审查示例

### ✅ 正确示例
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
    data() {
      return {
        formItem: {
          brchName: "",
          brchNo: ""
        }
      }
    },
    methods: {
      handleSubmit() {
        // 提交逻辑
      }
    }
  }
</script>
```

**路由映射（hnnxbankIndex.js）：**
```javascript
export default {
  '/sm/auth/branch/branch': () => import(/* webpackChunkName: "banks/hnnxbank/sm/auth/branch/branch" */`@/views/bizViews/banks/hnnxbank/sm/auth/branch/branch.vue`),
}
```

### ❌ 错误示例
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
    data() {
      return {
        formItem: {
          brchName: "",
          brchNo: ""
        }
      }
    },
    methods: {
      // 方法缺少.bind(this)绑定
      handleSubmit: function() {
        // 提交逻辑
      }
    }
  }
</script>
```

## 重要提醒

1. 【强制】所有前端代码必须在 `frontend/src/views/bizViews/banks/hnnxbank` 目录下开发
2. 【强制】所有按钮名称和标签必须使用国际化文本，禁止硬编码
3. 【强制】placeholder 和提示信息保持硬编码，无需国际化
4. 【强制】前端调用后端API路径必须与后端映射路径一致
5. 【强制】参数传递必须使用 `requestDto` 格式，禁止使用 `extParam`
6. 【强制】个性化vue文件必须在 `hnnxbankIndex.js` 中维护映射关系
7. 【强制】UI风格必须与现有组件保持一致（参考同类组件实现）
8. 完成编码后必须调用此技能进行代码走查

## 常见问题排查（基于实际开发经验）

### 1. 国际化文本不显示

**可能原因：**
- 未在 zh-CN.js 中添加国际化键值对
- 键值命名不规范或拼写错误
- 使用了 `$t()` 但未正确绑定

**解决方案：**
1. 先在 zh-CN.js 中添加：`batchCopyRole: "批量复制角色"`
2. 在Vue中使用：`{{$t("hnnxbank.m.i.auth.batchCopyRole")}}`
3. 检查是否遵循现有命名规范

### 2. UI风格不一致

**可能原因：**
- 新建组件时未参考现有实现
- 直接使用原生HTML而非项目UI组件库
- 样式未复用已有CSS类

**解决方案：**
1. 查看同目录下类似功能的组件实现
2. 复用已有的组件（如 hnnxbankSelectBranchManager）
3. 保持输入框、超链接等元素风格一致

### 3. API调用报错

**可能原因：**
- 参数传递格式错误（使用了 extParam）
- API路径拼写错误
- HTTP方法不匹配（POST/GET）

**解决方案：**
```javascript
// 正确的参数格式
let req = {
  requestDto: {  // 必须是 requestDto
    param1: value1,
    param2: value2
  }
};
```

## 国际化资源配置

### 国际化文件位置
- `frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js`

### 国际化键值命名规范
- 采用模块化命名：`{module}.{i}.{feature}.{action}`
- 例如：`hnnxbank.m.i.auth.batchCopyRole`
- 保持与项目现有风格一致

### 国际化使用示例
```javascript
// zh-CN.js
export default {
  hnnxbank: {
    m: {
      i: {
        auth: {
          batchCopyRole: "批量复制角色"
        }
      }
    }
  }
}

// Vue模板中使用
{{$t("hnnxbank.m.i.auth.batchCopyRole")}}
```
