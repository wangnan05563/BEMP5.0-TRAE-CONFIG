---
name: "bemp-backend-code-review"
description: "专门用于审查BEMP工程后端代码的技能。审查河南农信个性化后端代码是否符合项目规范，包括代码结构、注解使用、参数传递、国际化等。在后端代码编写完成后调用此技能进行自动化审查。"
---

# BEMP后端代码审查技能

## 功能说明

本技能专门用于审查BEMP工程（河南农信个性化模块）的后端代码，确保代码符合项目既定规范和最佳实践。

## 审查范围

### 1. 目录结构规范
- 【强制】所有后端代码必须在 `banks/ext-hnnxbank` 目录下开发
- 检查包结构是否遵循项目规范：`com.hundsun.bemp.hnnxbank.{module}.{layer}.{component}`
- 检查模块划分是否合理（adapter、biz、common、conf等）

### 2. 个性化类开发规范
- 【强制】检查是否使用 `@CustomizedBean` 注解标注个性化类（仅适用于Service/Atom等业务层实现类）
- 【强制】检查类名是否遵循命名规则：在原类名基础上添加 `HnnxBank` 前缀
  - 例如：`HnnxBankRebuyBillAtomImpl extends RebuyBillAtomImpl`
- 【强制】检查是否在 `banks/ext-hnnxbank` 目录下开发，禁止在其他目录开发
- 【强制】个性化Controller不应添加@CustomizedBean注解，应继承BaseController，与产品化Controller并存

### 3. Controller层规范
- 【强制】个性化Controller应继承BaseController，不应添加@CustomizedBean注解
- 【强制】个性化Controller与产品化Controller应为并存关系
- 【强制】Controller类必须添加 `@RestController` 注解
- 【强制】请求映射路径必须以 `/hnnx/` 或 `/hnnxbank/` 开头
- 【强制】Controller与Service层交互必须使用 `BaseRequest` 作请求参数类
- 检查方法是否添加 `@RequestMapping` 注解并指定method
- 检查返回值是否使用 `CommonResp` 或 `void`（导出场景）

### 4. Service层规范
- 【强制】Service实现类必须使用 `@CloudComponent` 注解
- 【强制】Service接口必须使用 `@CloudService` 注解
- 【强制】Service方法必须使用 `@CloudFunction` 注解
- 检查是否正确使用 `BaseRequest`、`BasePageRequest` 等参数类型
- 检查是否正确使用 `ResultData`、`CommonResp` 等返回类型

### 5. 参数传递与获取规范（基于实际开发经验）

#### 参数接收方式选择

| 场景 | 推荐方式 | 前端格式 | 说明 |
|------|---------|---------|------|
| 简单参数（1-5个） | DTO 对象 | 直接传递对象 | Spring MVC 自动绑定 form-data |
| 复杂参数（嵌套对象） | @RequestBody + DTO | JSON | 需要前端设置 Content-Type |
| 文件上传 | MultipartFile + DTO | form-data | 处理文件流 |
| 兼容旧代码 | BaseRequest<T> | requestDto 格式 | 兼容现有产品化代码 |

#### 方式1：DTO 对象接收参数（推荐用于新功能）

✅ **正确示例：**
```java
@RequestMapping(value = "/func_batchCopyRole", method = {RequestMethod.POST})
@ResponseBody
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    // Spring MVC 自动将 form-data 参数绑定到 DTO 属性
    String sourceUserNo = req.getSourceUserNo();
    String targetUserNos = req.getTargetUserNos();
    
    // 参数校验
    if (StringUtils.isBlank(sourceUserNo)) {
        throw new BempRuntimeException(..., "源用户号不能为空");
    }
    
    // 业务逻辑...
}
```

**DTO 定义：**
```java
public class HnnxBatchCopyRoleReq implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String sourceUserNo;      // 与前端参数名一致
    private String targetUserNos;     // 与前端参数名一致
    
    // 必须提供 getter/setter
    public String getSourceUserNo() { return sourceUserNo; }
    public void setSourceUserNo(String sourceUserNo) { this.sourceUserNo = sourceUserNo; }
    
    @Override
    public String toString() {
        return "HnnxBatchCopyRoleReq{sourceUserNo='" + sourceUserNo + "', targetUserNos='" + targetUserNos + "'}";
    }
}
```

**前端调用：**
```javascript
let params = {
  sourceUserNo: this.form.sourceUserNo,
  targetUserNos: this.form.targetUserNos
};
post(params, "/hnnx/sm/auth/branch/branchAdmin/func_batchCopyRole");
```

#### 方式2：BaseRequest 接收参数（兼容旧代码）

✅ **正确示例：**
```java
@RequestMapping(value = "/func_queryList", method = {RequestMethod.POST})
@ResponseBody
public CommonResp queryList(BaseRequest<QryDto> req) {
    BempValidUtil.validBaseRequest(req);
    QryDto qryDto = req.getRequestDto();
    
    // 业务逻辑...
}
```

**前端调用：**
```javascript
let req = {
  requestDto: {
    param1: value1,
    param2: value2
  }
};
post(req, "/hnnx/.../func_queryList");
```

#### 方式3：@RequestBody 接收 JSON（需要前端配合）

⚠️ **注意：** 前端默认使用 `application/x-www-form-urlencoded`，需要修改为 `application/json`

```java
@RequestMapping(value = "/func_batchCopyRole", method = {RequestMethod.POST})
@ResponseBody
public CommonResp batchCopyRole(@RequestBody HnnxBatchCopyRoleReq req) {
    // 接收 JSON 格式数据
}
```

❌ **不推荐的实现：**
```java
// 仅支持单一格式，容易导致参数获取失败
public CommonResp batchCopyRole(BaseRequest req) {
    Map<String, Object> extParam = req.getExtParam();  // 仅支持extParam格式
    String sourceUserNo = (String) extParam.get("sourceUserNo");
}
```

#### 参数传递检查清单

- [ ] 确认前端参数传递格式（直接对象 / requestDto / JSON）
- [ ] 确认后端参数接收方式（DTO / BaseRequest / @RequestBody）
- [ ] 前后端参数名完全一致（区分大小写）
- [ ] DTO 提供了必需的 getter/setter 方法
- [ ] 对获取到的参数进行了空值校验
- [ ] 基本类型使用包装类（Integer 而非 int）

### 6. DTO 设计与使用规范

#### DTO 命名规范
- 请求 DTO：`Hnnx` + `功能名` + `Req`
- 响应 DTO：`Hnnx` + `功能名` + `Resp`
- 查询 DTO：`Hnnx` + `功能名` + `QueryDto`

#### DTO 存放位置
- `banks/ext-hnnxbank/hnnxbank-biz-api/src/main/java/.../dto/`

#### DTO 必备元素
```java
public class HnnxXxxReq implements Serializable {
    private static final long serialVersionUID = 1L;
    
    // 字段定义
    private String fieldName;
    
    // 无参构造（默认即可）
    
    // getter/setter 方法
    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }
    
    // toString 方法（便于日志输出）
    @Override
    public String toString() {
        return "HnnxXxxReq{fieldName='" + fieldName + "'}";
    }
}
```

### 6. 依赖注入规范
- 检查Service依赖是否使用 `@CloudReference` 注解
- 检查本地Bean是否使用 `@Resource` 注解
- 检查是否正确注入所需服务

### 7. 服务调用与数据完整性规范（基于实际开发经验）

#### 服务调用前数据准备

在调用产品化服务方法前，必须确保传入的 DTO 对象包含所有必需字段：

✅ **正确示例：**
```java
UserDto userDto = new UserDto();
userDto.setUserNo(targetUserNo);              // 必需：用户号
userDto.setRoleIds(roleIds.toString());       // 必需：角色ID列表
userDto.setRoleNames(roleNames.toString());   // 必需：角色名称
userDto.setUserType(PbConstants.USER_TYPE_TWO); // 必需：用户类型
userDto.setLegalNo(userInfo.getLegalNo());    // 必需：法人编号
userDto.setBrchNo(targetUser.getBrchNo());    // 必需：机构号（用于查询机构信息）

// 调用服务
branchUserService.distributeUserRole(userDto, userDto.getRoleIds());
```

#### 数据完整性检查清单

在调用服务方法前，检查以下要素：

- [ ] **主键字段**：如 userNo、roleId 等已设置
- [ ] **外键字段**：如 legalNo、brchNo 等已设置
- [ ] **业务必需字段**：如 roleIds、userType 等已设置
- [ ] **关联查询字段**：如 brchNo 用于查询机构信息
- [ ] **类型标识字段**：如 userType、status 等已设置

#### 服务方法调研流程

在调用不熟悉的 service 方法前：

1. **查看接口定义**：了解参数要求和返回值
2. **查看实现逻辑**：了解内部调用的其他服务和必需的字段
3. **查看示例代码**：参考项目中已有的调用示例
4. **测试验证**：单元测试验证参数完整性

#### 常见服务调用问题

| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| "法人编号和机构号都不能为空" | 调用服务时未设置 brchNo 或 legalNo | 检查 DTO 对象是否设置了所有必需字段 |
| "用户名或密码错误" | 参数传递格式不匹配 | 检查前后端参数格式一致性 |
| NullPointerException | 传入的 DTO 为 null 或必需字段为 null | 添加空值检查 |
| 类型转换异常 | 参数类型不匹配 | 检查参数类型一致性 |

### 8. 日志记录规范

#### 日志级别使用
- **ERROR**：系统错误、业务异常、关键操作失败
- **WARN**：警告信息、非关键错误、潜在问题
- **INFO**：重要业务操作、流程节点、参数信息
- **DEBUG**：调试信息、详细流程（生产环境关闭）

#### 日志内容规范
```java
// 方法入口日志
LOGGER.info("开始执行批量复制角色操作");

// 参数日志（关键参数）
LOGGER.info("获取到的参数 - sourceUserNo: {}, targetUserNos: {}", sourceUserNo, targetUserNos);

// 成功日志
LOGGER.info("批量复制角色成功，源用户：{}，目标用户：{}", sourceUserNo, targetUserNo);

// 错误日志
LOGGER.error("批量复制角色失败，目标用户号：{}，错误：{}", targetUserNo, e.getMessage());
```

#### 日志注意事项
- 敏感信息（密码、密钥）禁止记录
- 大对象（List/Map）使用 toString() 前考虑大小
- 异常日志必须包含异常对象：`LOGGER.error("msg", e)`
- 生产环境 DEBUG 日志需关闭

### 9. 代码质量规范
- 检查是否添加必要的中文注释（关键逻辑和可能造成理解困难的部分）
- 检查日志记录是否使用 `LOGGER` 并符合规范
- 检查异常处理是否使用 `BempRuntimeException`
- 检查是否正确处理空值和边界情况
- 检查代码缩进和格式化是否符合项目规范

### 8. 国际化规范
- 检查前端调用的API路径是否与后端映射路径一致
- 检查国际化资源文件是否正确配置

### 9. Maven依赖规范
- 【强制】检查 `pom.xml` 中的版本号是否参考 `bom/import-bom/pom.xml`
- 检查是否添加了必要的依赖包
- 检查依赖范围（scope）是否正确

### 10. 编码规范
- 【强制】使用 Java 1.8 语法
- 检查是否使用了Java 1.8特性（如Optional、Lambda等）
- 检查类、方法、变量命名是否符合Java命名规范

## 审查流程（系统化执行步骤）

### 第一阶段：前置检查

1. **文件位置检查**
   - [ ] 文件是否位于 `banks/ext-hnnxbank` 目录下
   - [ ] 包结构是否符合规范：`com.hundsun.bemp.hnnxbank.{module}.{layer}.{component}`
   - [ ] 类名是否符合命名规范

2. **注解检查**
   - [ ] Service/Atom 类是否添加 `@CustomizedBean` 注解
   - [ ] Controller 类是否继承 BaseController（不添加 @CustomizedBean）
   - [ ] 依赖注入是否使用正确的注解（@CloudReference / @Resource）

### 第二阶段：代码规范检查

3. **Controller 层检查**
   - [ ] 请求映射路径是否以 `/hnnx/` 开头
   - [ ] 参数接收方式是否正确（DTO / BaseRequest / @RequestBody）
   - [ ] 返回值是否使用 CommonResp
   - [ ] 是否添加必要的中文注释

4. **参数传递检查**
   - [ ] 前后端参数格式是否匹配
   - [ ] 参数名是否一致（区分大小写）
   - [ ] DTO 是否提供 getter/setter
   - [ ] 是否进行参数空值校验

5. **服务调用检查**
   - [ ] 调用前是否设置所有必需字段
   - [ ] 是否查看服务方法实现了解必需参数
   - [ ] 是否正确处理返回值和异常

### 第三阶段：质量检查

6. **日志记录检查**
   - [ ] 是否使用 LOGGER 记录关键操作
   - [ ] 日志级别使用是否正确
   - [ ] 是否记录敏感信息

7. **异常处理检查**
   - [ ] 是否使用 BempRuntimeException
   - [ ] 异常信息是否清晰准确
   - [ ] 是否正确处理边界情况

### 第四阶段：编译验证

8. **Maven 编译**
   - [ ] 执行 `mvn compile` 确保编译通过
   - [ ] 检查是否有编译警告
   - [ ] 确认生成的 class 文件正确

### 第五阶段：输出审查报告

9. **生成审查报告**
   - 汇总所有问题
   - 按严重程度分类
   - 提供具体的改进建议

## 审查判断标准

### 严重程度分级

| 级别 | 说明 | 处理方式 |
|------|------|----------|
| 🔴 **阻塞** | 违反强制规范，会导致功能异常或编译失败 | 必须修复，否则不予通过 |
| 🟠 **严重** | 可能导致潜在问题或不符合最佳实践 | 强烈建议修复 |
| 🟡 **警告** | 代码风格或轻微规范问题 | 建议修复 |
| 🟢 **提示** | 优化建议或可选改进 | 可选修复 |

### 阻塞级问题清单（必须修复）

- [ ] 文件不在 `banks/ext-hnnxbank` 目录下开发
- [ ] Service/Atom 类未添加 `@CustomizedBean` 注解
- [ ] Controller 添加了 `@CustomizedBean` 注解（不应添加）
- [ ] 请求映射路径未以 `/hnnx/` 开头
- [ ] 参数名与前端不一致
- [ ] DTO 未提供 getter/setter 方法
- [ ] Maven 编译失败
- [ ] 存在语法错误或编译错误

### 严重级问题清单（强烈建议修复）

- [ ] 调用服务时未设置必需字段（如 brchNo、legalNo）
- [ ] 未查看服务方法实现了解参数要求
- [ ] 缺少必要的中文注释
- [ ] 异常处理不完善
- [ ] 存在潜在的空指针风险
- [ ] 日志记录不规范

### 警告级问题清单（建议修复）

- [ ] 代码缩进或格式化不规范
- [ ] 变量命名不规范
- [ ] 存在冗余代码
- [ ] 注释不清晰或不完整
- [ ] 未使用 try-catch 处理可能的异常

## 审查结果呈现形式

### 审查报告模板

```markdown
# 后端代码审查报告

## 基本信息
- **审查文件**：`banks/ext-hnnxbank/.../HnnxXxxController.java`
- **审查时间**：202X-XX-XX
- **审查人**：bemp-backend-code-review Skill

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
     ```java
     // 问题代码示例
     ```
   - **修复建议**：
     ```java
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
| "法人编号和机构号都不能为空" | 调用服务时未设置 brchNo | 服务调用前的 DTO 设置 | 添加 `userDto.setBrchNo(targetUser.getBrchNo())` |
| "用户名或密码错误" | 参数传递格式不匹配 | Controller 参数接收方式 | 检查前后端参数格式一致性 |
| 参数获取为 null | 参数名不一致 | 前后端参数名对比 | 确保参数名完全一致（区分大小写） |
| Maven 编译失败 | Java 版本或依赖问题 | pom.xml | 确认使用 Java 1.8，检查依赖版本 |
| NullPointerException | 未进行空值检查 | 参数使用处 | 添加空值判断逻辑 |

## 审查示例

### ✅ 正确示例
```java
@CloudComponent
@CustomizedBean
public class HnnxBankBranchServiceImpl extends BranchServiceImpl implements BranchService {
    @CloudReference
    private BranchService branchService;
    
    @Override
    public List<BranchDto> querySubBranchAndSelf(BaseRequest<QryBranchDto> req) {
        BempValidUtil.validBaseRequest(req);
        // 业务逻辑
        return branchService.querySubBranchAndSelf(req);
    }
}
```

### ❌ 错误示例
```java
// 缺少 @CustomizedBean 注解
public class BranchServiceImpl extends BranchServiceImpl {
    // 使用了错误的注解
    @Autowired
    private BranchService branchService;
    
    // 参数类型错误
    public List<BranchDto> querySubBranchAndSelf(QryBranchDto req) {
        // 缺少参数校验
        return branchService.querySubBranchAndSelf(req);
    }
}
```

## 重要提醒

1. 【强制】Service/Atom等业务层个性化类必须添加 `@CustomizedBean` 注解
2. 【强制】个性化Controller不应添加@CustomizedBean注解，应继承BaseController
3. 【强制】个性化Controller与产品化Controller应为并存关系
4. 【强制】Controller与Service层交互必须使用 `BaseRequest`
5. 【强制】所有代码必须在 `banks/ext-hnnxbank` 目录下开发
6. 【强制】编码后必须maven打包确保编译通过
7. 完成编码后必须调用此技能进行代码走查

## 常见问题排查（基于实际开发经验）

### 1. "法人编号和机构号都不能为空"问题

**问题现象：**
调用服务方法时报错："根据机构号查询机构信息时，法人编号和机构号都不能为空"

**根本原因：**
调用 `branchUserService.distributeUserRole` 等服务方法时，传入的 DTO 对象缺少 `brchNo`（机构号）字段。

**排查步骤：**
1. 查看服务方法实现，了解需要哪些字段
2. 检查调用前是否设置了所有必需字段
3. 确认字段值不为 null

**解决方案：**
```java
UserDto userDto = new UserDto();
userDto.setUserNo(targetUserNo);
userDto.setRoleIds(roleIds.toString());
userDto.setRoleNames(roleNames.toString());
userDto.setUserType(PbConstants.USER_TYPE_TWO);
userDto.setLegalNo(userInfo.getLegalNo());
userDto.setBrchNo(targetUser.getBrchNo());  // 必须设置机构号！

branchUserService.distributeUserRole(userDto, userDto.getRoleIds());
```

**预防措施：**
- 调用服务前查看服务方法实现
- 使用数据完整性检查清单
- 单元测试验证参数完整性

### 2. "用户名或密码错误"问题

**问题现象：**
前端调用后端接口时，系统错误地提示"用户名或密码错误"

**根本原因：**
前后端参数传递格式不匹配，导致后端获取参数失败，触发认证异常。

**排查步骤：**
1. 检查前端参数传递格式（直接对象 / requestDto / JSON）
2. 检查后端参数接收方式（DTO / BaseRequest / @RequestBody）
3. 确认参数名是否一致（区分大小写）
4. 查看后端日志，确认具体报错位置

**解决方案：**

**方案A：使用 DTO 对象接收（推荐）**
```java
// 后端
@RequestMapping(value = "/func_batchCopyRole", method = {RequestMethod.POST})
@ResponseBody
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    String sourceUserNo = req.getSourceUserNo();
    // ...
}

// 前端
let params = {
  sourceUserNo: this.form.sourceUserNo,
  targetUserNos: this.form.targetUserNos
};
post(params, "/hnnx/.../func_batchCopyRole");
```

**方案B：使用 BaseRequest 接收（兼容旧代码）**
```java
// 后端
public CommonResp batchCopyRole(BaseRequest req) {
    Map<String, Object> params = (Map<String, Object>) req.getRequestDto();
    String sourceUserNo = (String) params.get("sourceUserNo");
    // ...
}

// 前端
let req = {
  requestDto: {
    sourceUserNo: this.form.sourceUserNo
  }
};
post(req, "/hnnx/.../func_batchCopyRole");
```

### 3. "Content type 'application/x-www-form-urlencoded' not supported"问题

**问题现象：**
后端使用 `@RequestBody` 注解，但前端发送的是 form-data 格式

**根本原因：**
`@RequestBody` 期望接收 JSON 格式数据，但前端 axios 默认使用 `application/x-www-form-urlencoded`

**解决方案：**

**方案A：后端不使用 @RequestBody（推荐）**
```java
// 直接使用 DTO 对象接收 form-data 参数
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    // Spring MVC 自动绑定 form-data 参数
}
```

**方案B：前端修改 Content-Type**
```javascript
post(params, "/hnnx/.../func_batchCopyRole", {
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### 4. "java.lang.Object cannot be cast to XxxReq"问题

**问题现象：**
类型转换异常，无法将 Object 转换为具体的 DTO 类型

**根本原因：**
前端传递的参数格式与后端期望的格式不匹配

**解决方案：**
确保前后端参数格式一致：
- 后端使用 DTO 对象接收 → 前端直接传递对象
- 后端使用 BaseRequest → 前端使用 requestDto 格式
- 后端使用 @RequestBody → 前端发送 JSON 格式

### 5. Maven编译失败

**常见原因：**
- Java版本不匹配（项目要求Java 1.8）
- 依赖包版本冲突
- 缺少必要的import语句
- DTO 类缺少 getter/setter 方法

**解决方案：**
```bash
# 确认使用Java 1.8编译
mvn compile -DskipTests -q

# 检查pom.xml中的版本号是否参考bom/import-bom/pom.xml
# 添加缺失的import语句
# 为DTO类添加getter/setter方法
```

### 6. 参数获取为 null

**问题现象：**
后端获取到的参数值为 null

**可能原因：**
1. 参数名不一致（区分大小写）
2. 前端未传递该参数
3. DTO 未提供 setter 方法
4. 参数类型不匹配

**排查清单：**
- [ ] 前后端参数名完全一致（包括大小写）
- [ ] DTO 提供了 public 的 setter 方法
- [ ] 前端确实传递了该参数
- [ ] 参数类型匹配（String、Integer 等）

### 7. 服务调用无响应或超时

**问题现象：**
调用服务方法后长时间无响应

**可能原因：**
- 服务方法内部死循环
- 数据库查询未加索引导致慢查询
- 事务未正确提交或回滚
- 服务依赖未正确注入

**排查步骤：**
1. 查看服务方法实现，检查是否有循环依赖
2. 检查数据库查询语句，确认是否加索引
3. 检查事务配置
4. 确认服务依赖正确注入
