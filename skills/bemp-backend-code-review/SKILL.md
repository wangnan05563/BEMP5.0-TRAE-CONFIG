---
name: "bemp-backend-code-review"
description: "审查BEMP银行个性化后端代码是否符合项目规范，含代码结构、注解、参数传递、安全性、性能等检查。支持多银行配置切换。"
whenToUse: "需要审查BEMP工程各银行个性化后端代码是否符合项目规范"
triggers: "代码/规范/code 走查/审查/审核/把关/review"
version: "2.2.0"
updated: "2026-05-16"
config: "config/bank-config.json"
scripts: "scripts/auto-scan.ps1"
template: "templates/report-template.md"
---

# BEMP后端代码审查

## 银行配置

银行参数在 `config/bank-config.json` 中管理。切换银行时修改 `currentBank` 即可，无需改本文档。

| 占位符 | 当前值 | 说明 |
|--------|--------|------|
| `{bankName}` | 河南农信 | 中文名称 |
| `{bankCode}` | hnnxbank | 目录/包名 |
| `{sourceDir}` | banks/ext-hnnxbank | 源码根目录 |
| `{packagePath}` | com.hundsun.bemp.hnnxbank | 包路径 |
| `{classPrefix}` | HnnxBank | 类名前缀 |
| `{dtoPrefix}` | Hnnx | DTO前缀 |
| `{urlPrefixes}` | /hnnx/, /hnnxbank/ | 请求路径前缀 |

> 切换指南见 [附录B](#附录b银行配置切换指南)

## 审查模式

| 模式 | 扫描范围 | 触发 |
|------|---------|------|
| 快速自检 | 仅阻塞级 | `pwsh scripts/auto-scan.ps1` |
| 增量审查 | `git diff --name-only` 变更文件 | 粘贴变更文件列表 |
| 全量审查 | `{sourceDir}/**/*.java` | 默认 |

---

## 审查规则

### 1. 目录与包结构
- 【强制】代码必须在 `{sourceDir}` 下，包路径 `{packagePath}.{module}.{layer}`

### 2. 个性化类开发
- 【强制】Service/Atom 实现类加 `@CustomizedBean`
- 【强制】类名加 `{classPrefix}` 前缀，如 `HnnxBankRebuyBillAtomImpl extends RebuyBillAtomImpl`
- 【强制】Controller 不加 `@CustomizedBean`，应继承 BaseController

### 3. Controller 规范
- 【强制】`@RestController` + 路径以 `{urlPrefixes}` 任一开头
- 【推荐】新功能用 DTO 对象接收参数，兼容旧代码可用 `BaseRequest`（参见第5节）
- 返回值：`CommonResp` 或 `void`（导出），方法加 `@RequestMapping` 指定 method

### 4. Service 规范
- 【强制】实现类 `@CloudComponent`，接口 `@CloudService`，方法 `@CloudFunction`

### 5. 参数传递

**优先级：新功能→DTO对象 ⭐ | 兼容旧代码→BaseRequest | 少用@RequestBody**

| 场景 | 参数接收方式 | 关键约束 |
|------|------------|---------|
| 新功能 | `public CommonResp xxx(HnnxXxxReq req)` | DTO 属性名=前端参数名，Spring MVC 自动绑定 form-data |
| 兼容旧代码 | `public CommonResp xxx(BaseRequest<QryDto> req)` | 前端用 `requestDto: {...}` 格式 |
| JSON场景 | `public CommonResp xxx(@RequestBody HnnxXxxReq req)` | 需前端改 `Content-Type: application/json` |

```java
// 推荐：DTO对象（Spring MVC自动绑定form-data）
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    BempValidUtil.validBaseRequest(req); // 或手动判空
}

// 备选：BaseRequest（兼容旧代码）
public CommonResp queryList(BaseRequest<QryDto> req) {
    BempValidUtil.validBaseRequest(req);
}
```

❌ 不推荐：仅支持 extParam 格式的单一方式

**DTO 定义**（`implements Serializable` + getter/setter + toString）：

```java
public class HnnxXxxReq implements Serializable {
    private static final long serialVersionUID = 1L;
    private String fieldName;
    // getter / setter / toString
}
```

**检查清单**：前后端参数名一致(fieldName=filedName)、DTO有getter/setter、空值校验、基本类型用包装类(Integer非int)

### 6. DTO 设计
- 命名：`{dtoPrefix}` + 功能名 + `Req/Resp/QueryDto`
- 存放：`{sourceDir}/{bankCode}-biz-api/src/main/java/.../dto/`

### 7. 依赖注入
- 远程服务：`@CloudReference` | 本地Bean：`@Resource`

### 8. 服务调用与数据完整性

调用产品化服务前，确保 DTO 设置了所有必需字段（userNo、legalNo、brchNo、roleIds、userType等）。

> 排查方案参见 [附录A](#附录a常见问题排查表)

**检查清单**：主键✓ 外键✓ 业务必需字段✓ 关联查询字段✓ 类型标识字段✓

**调研流程**：查看接口定义 → 查看实现逻辑 → 参考已有示例 → 测试验证

### 9. 日志记录
- ERROR：异常/失败 | WARN：潜在问题 | INFO：关键操作 | DEBUG：调试(生产关闭)
- 禁止记录密码/密钥；异常必须包含异常对象 `LOGGER.error("msg", e)`

### 10. 代码质量
- 中文注释（关键逻辑）、`BempRuntimeException` 异常、空值边界处理

### 11. 安全性 🆕v2.0
- [ ] 禁止日志输出密码/密钥/Token
- [ ] 禁止硬编码密钥/连接字符串
- [ ] SQL使用参数化查询（`#{}`），禁止字符串拼接
- [ ] 服务端二次校验输入；文件上传限制类型和大小
- [ ] 敏感操作校验权限；排查越权风险

### 12. 性能 🆕v2.0
- [ ] 无N+1查询；批量操作用批量接口
- [ ] 循环内不调用远程服务；大对象及时释放
- [ ] 资源在 try-with-resources/finally 中关闭

### 13. 事务与并发 🆕v2.0
- [ ] `@Transactional(rollbackFor = Exception.class)`，边界合理
- [ ] 无自调用导致事务失效；共享状态有同步机制
- [ ] SimpleDateFormat用局部变量/ThreadLocal；HashMap→ConcurrentHashMap

### 14. 国际化与Maven
- API路径前后端一致；`pom.xml` 版本参考 `bom/import-bom/pom.xml`
- Java 1.8语法，命名规范

---

## 快速自检

执行 `pwsh .trae/skills/bemp-backend-code-review/scripts/auto-scan.ps1` 自动检查以下阻塞项：

1. Service/Atom 类是否缺少 `@CustomizedBean`
2. Controller 是否误加 `@CustomizedBean`
3. 请求映射路径是否以配置的 URL 前缀开头
4. Controller 是否缺少 `@RestController`
5. DTO 是否实现 `Serializable`
6. Controller 返回值是否为 `CommonResp`/`void`
7. DTO 命名前缀是否符合 `{dtoPrefix}` 规范

---

## 审查流程

### 阶段1：前置检查
- 文件位置 `{sourceDir}` ✓ → 包结构 `{packagePath}.{module}.{layer}` ✓ → 类名前缀 `{classPrefix}` ✓
- `@CustomizedBean`(Service/Atom) / `@RestController`(Controller) / `@CloudReference`(依赖注入)
- 路径以 `{urlPrefixes}` 开头 ✓ → DTO 实现 `Serializable` ✓ → DTO 前缀 `{dtoPrefix}` ✓

### 阶段2：代码规范
- Controller：参数方式(DTO优先) → 返回CommonResp → 中文注释
- 参数：前后端格式匹配 → 参数名一致 → getter/setter → 空值校验
- 服务调用：必需字段全设置 → 查看过实现 → 正确处理返回值

### 阶段3：质量与安全
- 日志：LOGGER✓ 级别✓ 无敏感信息✓
- 安全：服务端校验✓ 参数化查询✓ 权限校验✓
- 性能：无N+1✓ 事务边界✓ 资源释放✓
- 异常：BempRuntimeException✓ 信息清晰✓ 边界处理✓

### 阶段4：Maven编译 → 阶段5：输出报告（模板见 `templates/report-template.md`）

---

## 审查判断标准

| 🟠阻塞(必须修复) | 🟠严重(强烈建议) | 🟡警告(建议) |
|-----------------|-----------------|-------------|
| 文件不在 `{sourceDir}` | 服务调用缺必需字段 | 格式化不规范 |
| Service/Atom缺 `@CustomizedBean` | 未查看服务方法实现 | 变量命名不规范 |
| Controller加 `@CustomizedBean` | 缺中文注释 | 冗余代码 |
| 路径不以 `{urlPrefixes}` 开头 | 异常处理不完善 | 注释不清晰 |
| DTO缺getter/setter | 空指针风险 | DTO未实现Serializable |
| Maven编译失败 | 日志不规范 | 非线程安全类误用 |
| 硬编码密码/密钥 | 日志含敏感信息 | |
| SQL字符串拼接 | N+1查询/循环调远程 | |
| DTO前缀不符合 `{dtoPrefix}` | 事务边界不合理 | |
| 参数名与前端不一致 | 资源未关闭 | |

---

## 审查报告

使用模板 `templates/report-template.md`，关键字段：审查版本v2.2.0、审查模式、目标银行 `{bankName}({bankCode})`、文件数、时间戳、与上次对比(🆕新增/✅已修复/⚠️仍存在)、四级问题汇总、审查结论。

报告保存路径：`.trae/skills/bemp-backend-code-review/reports/{bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md`

---

## 审查示例

```java
// ✅ 正确
@CloudComponent @CustomizedBean
public class HnnxBankBranchServiceImpl extends BranchServiceImpl implements BranchService {
    @CloudReference private BranchService branchService;
    public List<BranchDto> query(BaseRequest<QryBranchDto> req) {
        BempValidUtil.validBaseRequest(req);
        return branchService.query(req);
    }
}

// ❌ 错误：缺@CustomizedBean + 错用@Autowired + 参数类型错误 + 缺校验
public class BranchServiceImpl extends BranchServiceImpl {
    @Autowired private BranchService branchService;
    public List<BranchDto> query(QryBranchDto req) {
        return branchService.query(req);
    }
}
```

---

## 重要提醒

1. 【强制】Service/Atom加 `@CustomizedBean`；Controller不加、继承BaseController
2. 【推荐】新功能参数用DTO对象，兼容旧代码用BaseRequest（见第5节）
3. 【强制】代码在 `{sourceDir}` 下；DTO前缀 `{dtoPrefix}`；编译通过
4. 【强制】提交前执行 `auto-scan.ps1`；完成后调用本技能走查

---

## 快速问题定位

| 现象 | 原因 | 方案 |
|------|------|------|
| "法人编号和机构号都不能为空" | 调用服务未设brchNo | `userDto.setBrchNo(...)` |
| "用户名或密码错误" | 前后端参数格式不匹配 | 对齐DTO/requestDto/JSON格式 |
| 参数为null | 参数名不一致 | 确保大小写一致 |
| Content type not supported | @RequestBody vs form-data冲突 | 去@RequestBody或前端改JSON |
| 类型转换异常 | 参数格式不匹配 | DTO↔直接对象 / BaseRequest↔requestDto |
| Maven编译失败 | Java版本/依赖 | `mvn compile -DskipTests` |
| DTO前缀不符 | 切换银行后未更新命名 | 改为 `{dtoPrefix}`+功能名 |

---

## 附录A：常见问题排查表

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| "法人编号和机构号都不能为空" | 调用服务时DTO缺brchNo | `setBrchNo()`，详见第8节数据完整性清单 |
| "用户名或密码错误" | 前后端参数格式不匹配 | 对齐格式，选DTO/BaseRequest之一（见第5节方式选择） |
| Content type not supported | @RequestBody vs form-data冲突 | 去@RequestBody(推荐) 或 前端改为JSON |
| Object cannot be cast to XxxReq | 前后端参数结构不一致 | DTO→传对象，BaseRequest→requestDto，JSON→@RequestBody |
| Maven编译失败 | Java版本/依赖/缺少import | `mvn compile -DskipTests`；检查pom.xml |
| 参数获取为null | 参数名不一致/DTO缺setter/前端未传 | 确保大小写一致、有setter、前端传值 |
| 服务调用超时 | 死循环/慢查询/事务未提交/依赖未注入 | 逐项排查循环依赖、SQL索引、事务、注入 |

---

## 附录B：银行配置切换指南

**切换步骤**：
1. 编辑 `config/bank-config.json`
2. 改 `currentBank` 为目标 bankCode
3. 若无该银行配置，参照 `example` 模板在 `banks` 中添加

**配置参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `bankName` | 是 | 中文名称 |
| `bankCode` | 是 | 目录名/包名（如 hnnxbank） |
| `bankCodeShort` | 是 | URL前缀简码（如 hnnx） |
| `sourceDir` | 是 | 源码根目录（如 banks/ext-hnnxbank） |
| `packagePath` | 是 | 包路径（如 com.hundsun.bemp.hnnxbank） |
| `classPrefix` | 是 | 类名前缀（如 HnnxBank） |
| `dtoPrefix` | 是 | DTO前缀（如 Hnnx） |
| `urlPrefixes` | 是 | URL前缀数组（如 ["/hnnx/","/hnnxbank/"]） |
| `dtoSourceDir` | 是 | DTO源码目录 |
| `enableAutoScan` | 是 | 是否启用自动扫描 |

**切换后检查**：`sourceDir` 存在✓ `dtoSourceDir` 存在✓ 运行 `auto-scan.ps1` 通过✓ 报告银行名正确✓