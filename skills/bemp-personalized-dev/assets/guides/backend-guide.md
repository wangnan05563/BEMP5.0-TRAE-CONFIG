# 后端开发指南

> 本文档整合了后端开发规范与代码模板，是 BEMP 个性化后端开发的完整参考。

---

## 一、开发规范

# 河南农信 BEMP 后端个性化开发规范

## 目录

- [1. 概述](#1-概述)
- [2. 工程规约](#2-工程规约)
- [3. 命名约定](#3-命名约定)
- [4. 代码风格](#4-代码风格)
- [5. 应用分层规范](#5-应用分层规范)
- [6. 组件设计规范](#6-组件设计规范)
- [7. 异常处理规范](#7-异常处理规范)
- [8. 日志规约](#8-日志规约)
- [9. 服务接口规范](#9-服务接口规范)
- [10. 个性化开发规范](#10-个性化开发规范)
- [11. 数据库交互规范](#11-数据库交互规范)
- [12. 缓存规约](#12-缓存规约)
- [13. 无效引用控制规范](#13-无效引用控制规范)
- [14. 安全规约](#14-安全规约)
- [15. 性能规范](#15-性能规范)
- [16. 最佳实践](#16-最佳实践)

---

## 1. 概述

### 1.1 文档目的

本文档旨在规范河南农信 BEMP 系统后端个性化开发流程，确保代码质量、可维护性和与产品化代码的兼容性。

### 1.2 适用范围

- 河南农信 BEMP 系统所有后端个性化功能开发
- 后端代码修改和优化
- 后端服务开发和集成

### 1.3 核心原则

- **增量开发**：继承产品化类，不修改产品化代码
- **目录隔离**：个性化代码必须在 `banks/ext-hnnxbank` 目录下
- **向后兼容**：保持与产品化代码的兼容性
- **规范编码**：遵循统一的编码规范和命名规则

---

## 2. 工程规约

### 2.1 Maven 命名规范

**Group ID：**

```
【企业前缀】.【产品】
```

示例：`com.hundsun.bemp` / `com.qijin.scbp`

**Artifact ID：**

```
【产品】-【子系统】
```

示例：`bemp-pb` 为票据产品公共子系统

**Version：**

```
5.20230201.0.0-SNAPSHOT
```

### 2.2 模块包名命名规范

**推荐模块包名命名规范为：**

```
【企业前缀】.【产品】.【子系统】.【模块】
```

**示例：**

```
com.hundsun.bemp.be.market
```

含义：`com.hundsun` 为企业前缀，`bemp` 代表票据产品，`be` 代表同业交易子系统，`market` 代表市场交易模块

**【强制】** 模块的命名建议不要超过 32 个字符

**【强制】** 模块的命名要体现当前模块的业务属性以及功能属性

### 2.3 配置文件规范

**【强制】** Spring 相关均采用注解方式配置，如：`@Component`、`@Autowired`。`@Resource` 方式后续不再使用（Spring 6 升级不兼容）

**【强制】** 所有 bean 的显式定义均通过 Configuration 模式

**【强制】** 所有需要内置在 jar 包中的 properties 配置文件，统一放置 class path：`/properties` 目录下，文件名为 `xxx.properties`

**【强制】** 个性化基于此配置的个性化命名为 `xxx.extResources.properties`

---

## 3. 命名约定

### 3.1 包命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 基础包 | `com.hundsun.bemp.hnnxbank.biz` | `com.hundsun.bemp.hnnxbank.biz.sm` |
| 子包 | 模块名 | `controller`、`service`、`service/impl`、`service/dto`、`dao` |

### 3.2 类命名

**【强制】** 代码中的命名均不能以下划线或美元符号开始，也不能以下划线或美元符号结束

**【强制】** 代码中的命名严禁使用拼音与英文混合的方式，更不允许直接使用中文的方式

**【强制】** 类名使用 UpperCamelCase 风格，必须遵从驼峰形式

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| Controller | `Hnnx[原类名]Controller` | `HnnxBankBranchRoleController` |
| Service 接口 | `Hnnx[原类名]Service` | `HnnxRoleService` |
| Service 实现 | `Hnnx[原类名]ServiceImpl` | `HnnxRoleServiceImpl` |
| DTO | `Hnnx[原类名]Dto` | `HnnxRoleDto` |
| DAO | `Hnnx[原类名]Dao` | `HnnxRoleDao` |
| DO/BO | 领域模型相关命名 | `UserDO`、`XmlService` |

### 3.3 方法命名

**【强制】** 方法名、参数名、成员变量、局部变量都统一使用 lowerCamelCase 风格

**【参考】** 各层方法命名规约：

1. 获取单个对象的方法用 `get` 做前缀
2. 获取多个对象的方法用 `query/find` 做前缀
3. 获取统计值的方法用 `count` 做前缀
4. 插入的方法用 `save`（推荐）或 `insert` 或者 `add` 做前缀
5. 删除的方法用 `remove`（推荐）或 `delete` 做前缀
6. 修改的方法用 `update` 做前缀

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| Controller 方法 | 驼峰命名 | `copyAssignBranchRole`、`addBranchRole` |
| Service 方法 | 驼峰命名 | `copyAssignBranchRole`、`addRole` |
| DAO 方法 | 驼峰命名 | `selectByExample`、`insert` |

### 3.4 变量命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 局部变量 | 驼峰命名 | `sourceBrchNo`、`targetBrchNos` |
| 常量 | 大写 + 下划线 | `COMMON_CONSTANT`、`MAX_LENGTH` |
| 集合变量 | 复数形式 | `roleList`、`branchList` |

### 3.5 参数命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 请求参数 | req | `BaseRequest req` |
| 响应参数 | resp | `CommonResp resp` |
| DTO 参数 | [Dto名]Dto | `HnnxRoleDto roleDto` |

### 3.6 接口编号命名规范

**【强制】** 接口编号规则：是否产品接口（一位）+方向（一位）+一级模块（两位字母）+二级模块（两位数字）+API类编号（两位数字）+方法编号（两位数字）=8位

- **第一位**：P 表示产品，B 表示个性化
- **第二位**：I 表示我方为 server 方，O 表示我方为 client 方

**产品的接口样例：**

- `PISM010101`
- `POPC010303`

**个性化的接口样例：**

- `BISM010101`
- `BOPC010303`

---

## 4. 代码风格

### 4.1 类结构规范

#### 4.1.1 Controller 基本结构

```java
package com.hundsun.bemp.hnnxbank.biz.sm.controller.role;

import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.BaseServiceController;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.sm.common.AuthConstant;
import com.hundsun.jrescloud.rpc.annotation.CloudReference;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 机构角色控制层
 * @author [作者]
 * @date [日期]
 */
@RestController()
@RequestMapping("/hnnx/")
public class HnnxBankBranchRoleController extends BaseServiceController {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxBankBranchRoleController.class);

    @CloudReference
    private HnnxRoleService hnnxRoleService;

    /**
     * [方法描述]
     * @param req 请求参数
     * @param [Dto名]Dto 数据传输对象
     * @return 操作结果
     */
    @RequestMapping("[方法路径]")
    @ResponseBody
    public CommonResp [方法名](BaseRequest<[Dto名]Dto> req, [Dto名]Dto [Dto名]Dto) {
        // 实现代码
    }
}
```

#### 4.1.2 ServiceImpl 基本结构

```java
package com.hundsun.bemp.hnnxbank.biz.sm.service.impl.role;

import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.dto.HnnxRoleDto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.List;

/**
 * 角色服务实现
 * @author [作者]
 * @date [日期]
 */
@CloudComponent
public class HnnxRoleServiceImpl implements HnnxRoleService {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxRoleServiceImpl.class);

    @Resource
    private RoleDao roleDao;

    /**
     * [方法描述]
     * @param req 请求参数
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void [方法名](BaseRequest<HnnxRoleDto> req) {
        // 实现代码
    }
}
```

### 4.2 注释规范

#### 4.2.1 类注释

```java
/**
 * 机构角色控制层
 * @author wangsw25320
 * @date 2019年8月18日
 * @modify
 * -----------------------------------------------------------------------------------------------------
 * |		修改单号	|		修改人员	|		修改日期	|		评审人员	|		修改说明
 * -----------------------------------------------------------------------------------------------------
 * |	  				|	   				| 	 				|					|
 * -----------------------------------------------------------------------------------------------------
 */
```

#### 4.2.2 方法注释

```java
/**
 * 批量复制机构角色分配
 * 核心业务逻辑：从源机构复制角色分配到目标机构列表
 * 实现步骤：
 * 1. 查询源机构的已分配角色 ID 列表
 * 2. 遍历每个目标机构，计算差异（需新增和需删除的角色）
 * 3. 批量插入新增角色，批量删除不需要的角色
 * 
 * @param req 请求参数，包含源机构号和目标机构号列表
 * @throws BempRuntimeException 当源机构不存在或目标机构号重复时抛出
 */
@Override
@Transactional(rollbackFor = Exception.class)
public void copyAssignBranchRole(BaseRequest<HnnxRoleDto> req) {
    // 实现代码
}
```

### 4.3 代码格式

| 项目 | 规范 | 说明 |
|------|------|------|
| 缩进 | 4 个空格 | 不使用 Tab |
| 行长度 | ≤ 120 字符 | 超长时进行换行 |
| 大括号 | K&R 风格 | 左括号不换行 |
| 空行 | 方法间空一行 | 提高可读性 |

---

## 5. 应用分层规范

### 5.1 分层架构

**【强制】** 应用分层遵循以下架构：

```
┌─────────────────────────────────────┐
│          Web 层 (Controller)         │
├─────────────────────────────────────┤
│        Service 层 (业务逻辑)          │
├─────────────────────────────────────┤
│         Atom 层 (原子操作)           │
├─────────────────────────────────────┤
│           DAO 层 (数据访问)          │
└─────────────────────────────────────┘
```

### 5.2 分层职责

| 层次 | 职责 | 说明 |
|------|------|------|
| Web 层 | 处理 HTTP 请求，参数校验，返回响应 | 不包含业务逻辑 |
| Service 层 | 业务逻辑处理，事务管理 | 可调用多个 Atom 层 |
| Atom 层 | 原子操作，单一业务逻辑 | 可调用多个 DAO |
| DAO 层 | 数据库访问操作 | 仅包含 SQL 操作 |

### 5.3 组件调用规范

**【强制】** 组件调用遵循以下规则：

1. **Web 层调用规范**：只能调用 Service 层
2. **Controller 层调用规范**：只能调用 Service 层
3. **Service 层调用规范**：可调用 Service 层、Atom 层
4. **Atom 层调用规范**：可调用 Atom 层、DAO 层
5. **DAO 调用规范**：只能进行数据库操作

**【强制】** 禁止跨层调用

---

## 6. 组件设计规范

### 6.1 Controller 设计规范

**【强制】** Controller 层职责：

1. 接收请求参数
2. 参数校验
3. 调用 Service 层
4. 返回响应结果

**【强制】** Controller 不包含业务逻辑

**【强制】** Controller 使用 `BaseRequest` 作为请求参数

### 6.2 Service 设计规范

**【强制】** Service 层职责：

1. 业务逻辑处理
2. 事务管理
3. 调用 Atom 层

**【强制】** Service 方法必须使用 `@Transactional(rollbackFor = Exception.class)` 注解

### 6.3 Atom 设计规范

**【强制】** Atom 层职责：

1. 单一业务逻辑
2. 原子操作
3. 调用 DAO 层

### 6.4 DAO 设计规范

**【强制】** DAO 层职责：

1. 数据库访问操作
2. SQL 执行

**【强制】** DAO 不包含业务逻辑

### 6.5 DTO 设计规范

**【强制】** DTO 用于层间数据传输

**【强制】** DTO 必须实现 `Serializable` 接口

```java
public class BaseDto implements Serializable {
    private static final long serialVersionUID = 1988052246401885570L;
    
    private String reserve1; // 保留字段。个性化开发使用，产品部代码逻辑不使用。
    private String reserve2; // 保留字段。个性化开发使用，产品部代码逻辑不使用。
    private String reserve3; // 保留字段。个性化开发使用，产品部代码逻辑不使用。
}
```

### 6.6 DO 设计规范

**【强制】** DO 用于数据库表映射

**【强制】** DO 必须与数据库表字段一一对应

---

## 7. 异常处理规范

### 7.1 异常处理原则

**【强制】** 不要捕获 Java 类库中定义的继承自 RuntimeException 的运行时异常类，如：`IndexOutOfBoundsException` / `NullPointerException`，这类异常由程序员预检查来规避

**【强制】** 异常不要用来做流程控制，条件控制

**【强制】** 对大段代码进行 try-catch，这是不负责任的表现

**【强制】** 捕获异常是为了处理它，不要捕获了却什么都不处理而抛弃之

**【强制】** 有 try 块放到了事务代码中，catch 异常后，如果需要回滚事务，一定要注意手动回滚事务

**【强制】** finally 块必须对资源对象、流对象进行关闭，有异常也要做 try-catch

**【强制】** 不能在 finally 块中使用 return

**【强制】** 捕获异常与抛异常，必须是完全匹配，或者捕获异常是抛异常的父类

### 7.2 异常码规范

**【强制】** 异常码定义规范：

- 产品异常码：P 开头
- 个性化异常码：B 开头

**【强制】** 系统间异常转码时，找不到对应中文或其他转码内容时，保留原有编码

### 7.3 异常使用场景

**【推荐】** 在代码中使用"抛异常"还是"返回错误码"：

- 对于公司外的 http/api 开放接口必须使用"错误码"
- 应用内部推荐异常抛出
- 跨应用间 RPC 调用优先考虑使用 Result 方式

---

## 8. 日志规约

### 8.1 日志框架

**【强制】** 应用中不可直接使用日志系统（Log4j、Logback）中的 API，而应依赖系统的日志框架

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger logger = LoggerFactory.getLogger(Abc.class);
```

### 8.2 日志级别

**【强制】** 日志级别划分：

| 级别 | 说明 | 应用场景 |
|------|------|---------|
| DEBUG | 系统每一步的运行状态进行精确的记录 | 开发、测试环境调试 |
| INFO | 系统的正常运行状态 | 关键分支、函数调用、性能日志 |
| WARN | 系统可能出现问题 | 用户输入参数错误 |
| ERROR | 系统出现异常，需要马上处理 | 异常分支、自动任务中断 |

### 8.3 日志记录规范

**【强制】** 对 trace/debug/info/error 级别的日志输出，必须使用条件输出形式或者使用占位符的方式

**【强制】** 异常信息应该包括两类信息：案发现场信息和异常堆栈信息

```java
logger.error("场景简要描述_" + e.getMessage(), e);
```

**【强制】** 不允许使用 `System.out.println()` 及 `e.printStackTrace()` 打印日志

**【强制】** 日志文件推荐至少保存 15 天

### 8.4 ERROR 日志记录

**【强制】** 以下场景应记录 ERROR 日志：

1. 分支判断与预期不符合（switch case 的 default、if-else 的 else、try-catch 的 catch）
2. 自动执行的任务意外中断，且无法恢复的场景
3. 代码抛出预料之外，未被处理的异常
4. 进程创建失败等资源不足的场景
5. 读取配置文件失败
6. 业务系统或者组件之间发生连接断开
7. 与数据库交互的地方出现异常
8. 业务系统中存在异常的数据记录

### 8.5 INFO 日志记录

**【强制】** 以下场景应记录 INFO 日志：

1. 服务内部关键的分支、函数调用、函数传参、函数返回
2. 服务返回记录性能日志（耗时）
3. 各个组件初始化，加载的参数
4. 服务启动，进程创建，以及本次启动之后的状态
5. 重要状态的变更记录
6. 与三方系统交互时，记录操作类的请求及应答完整信息
7. 批量操作时，记录执行的进度
8. 批量操作时，需要打印处理的数量

### 8.6 不良习惯

**【强制】** 禁止记录日志的代码抛出异常

**【强制】** 禁止直接输出日志到控制台

**【强制】** 禁止在循环体内打印 Info 日志

**【强制】** 避免同一个异常多次处理，并且多次记录日志

**【强制】** 记录日志不推荐字符串拼接。建议使用占位符

---

## 9. 服务接口规范

### 9.1 接口命名规范

**【强制】** 接口名称命名遵循 JAVA 开发规范

### 9.2 接口参数规范

#### 9.2.1 请求报文格式

**通用报文头信息：**

| 字段名称 | 字段 | 数据类型 | 数据长度 | 必输项 | 备注 |
|---------|------|---------|---------|--------|------|
| 交易码 | opCode | String | 30 | Y | |
| 版本号 | version | String | 10 | Y | |
| 交易流水 | reqFlowNo | String | 32 | Y | |
| 渠道号 | channelNo | String | 10 | Y | |
| 法人编号 | reqLegalNo | String | 30 | N | |
| 操作员号 | reqUserNo | String | 30 | N | |
| 机构号 | reqBrchNo | String | 30 | N | |
| 备注1 | | String | 250 | N | |
| 备注2 | | String | 250 | N | |
| 备注3 | | String | 250 | N | |

#### 9.2.2 应答报文格式

**【强制】** retCode 为 "000000" 表示成功；否则为失败

### 9.3 接口校验规约

**【强制】** 接口校验包括：

1. **非空判断（null-valid）**：如：提示"{xxx}不能为空"
2. **字段长度判断（length-valid）**：如：提示"{xxx}长度不能超过{xxx}位"
3. **定字段长度判断（length-valid）**：如：提示"XXX必须{XXX}位"
4. **金额判断（num-accuracy-valid）**：如：提示"xxx金额格式：最多16位整数,2位小数"
5. **枚举判断（enum-valid）**：如：提示"xxx:取值非法，正确的取值范围：[xxx]"
6. **比较值判断（cmp-valid）**：如：提示"xxx大于xxx"
7. **数字判断（num-valid）**：如：提示"xxx只能为数字串"
8. **自定义判断（individualization-valid）**

### 9.4 接口发布规范

**【强制】** 接口注解 `@CloudService` 注解用于服务生产者声明微服务。该注解声明位于服务接口类上

**【强制】** 实现注解 `@CloudComponent` 注解用于服务生产者声明微服务实现。该注解声明位于服务实现类上

### 9.5 API 调用规范

**【强制】** API 中参数的定义需要统一元数据定义

**【推荐】** 数据交互一般是直接 API 调用，但 API 调用数据量不宜过大：

- 当数据包大小为 10M 内，或者记录数在 1W 条内时，建议使用 API 调用
- 当数据包大于 10M，或者记录数超过 1W 条时，建议通过文件传输或者分段接口多次调用

---

## 10. 个性化开发规范

### 10.1 个性化开发目录

**【强制】** 所有后端代码仅允许在 `banks/ext-hnnxbank` 目录开发

**【强制】** 禁止在其他目录开发后端代码

### 10.2 个性化类开发

**【强制】** 检查 `banks/ext-hnnxbank` 目录，若有带 `@CustomizedBean` 注解的个性化类，在其基础上新增或复写功能

**【强制】** `@CustomizedBean` 注解仅用于标注 Service/Atom 等业务层实现类的个性化类

**【强制】** 无复用个性化类时，新增类并添加 `@CustomizedBean` 注解

**【强制】** 类名规则：原有类名加 HnnxBank 并继承原有类

**示例：**

```java
@CustomizedBean
@CloudComponent
public class HnnxBankRebuyReplyServiceImpl extends RebuyReplyServiceImpl implements RebuyReplyService {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxBankRebuyReplyServiceImpl.class);
    
    @Override
    public CommonResp sendQuoteAgree(BaseRequest<RebuyReplyDto> req, RebuyReplyDto replyDto) {
        // 个性化逻辑
        return super.sendQuoteAgree(req, replyDto);
    }
}
```

### 10.3 个性化服务命名

**【强制】** 个性化服务命名时基于产品化服务增加前缀 xxBank（与 git 仓库 banks/extBank 的具体简称一致）

**示例：**

```java
public class XxbankBookServiceImpl extends DemoBookServiceImpl {
    // 个性化实现
}
```

### 10.4 Controller 与 Service 交互

**【强制】** Controller 与 Service 层交互必须使用 BaseRequest 作为请求参数类，禁止直接传值

### 10.5 配置生效原则

**【强制】** 配置生效原则：

```
个性化功能点配置 > 产品功能点配置 > 个性化模块配置 > 产品模块配置 > 个性化全局配置 > 产品全局配置
```

---

## 11. 数据库交互规范

### 11.1 MyBatis 规范

**【强制】** MyBatis 配置遵循以下规范：

1. Mapper 接口与 XML 文件一一对应
2. SQL 语句写在 XML 文件中
3. 参数使用 `#{}` 占位符

### 11.2 SQL 规范

**【强制】** SQL 编写遵循以下规范：

1. 不使用 `SELECT *`
2. 使用表别名
3. 避免子查询，使用 JOIN
4. 使用索引优化查询

### 11.3 ORM 规范

**【强制】** ORM 遵循以下规范：

1. DO 与数据库表字段一一对应
2. 使用 `@Table`、`@Column` 注解
3. 避免 N+1 查询

---

## 12. 缓存规约

### 12.1 缓存使用原则

**【推荐】** 缓存使用遵循以下原则：

1. 热点数据使用缓存
2. 缓存设置过期时间
3. 缓存更新时注意一致性

### 12.2 缓存规范

**【强制】** 缓存规范：

1. 缓存 key 命名规范：`业务模块:功能:标识`
2. 缓存 value 使用 JSON 序列化
3. 缓存异常降级处理

---

## 13. 无效引用控制规范

### 13.1 概述

无效引用是指代码中存在但无法产生实际作用或指向不存在资源的引用。这类引用会导致代码冗余、编译警告、运行时错误，严重影响代码质量和系统稳定性。本规范旨在明确无效引用的定义、检测方法及处理要求，确保代码库的健康性。

### 13.2 无效引用的定义与分类

#### 13.2.1 未使用的导入（Unused Import）

**定义**：已导入但在整个文件中未被使用的类、方法或变量。

**常见情形**：

1. 导入的类在代码中未被任何地方引用
2. 导入的静态方法未被调用
3. 导入的整个包路径下的内容均未被使用

**示例**：
```java
import com.hundsun.bemp.utils.StringUtils;  // 未使用
import com.hundsun.bemp.constant.CommonConstant;  // 未使用
import java.util.List;  // 虽然声明了变量但未使用
```

#### 13.2.2 指向不存在资源的引用

**定义**：代码中引用的文件、路径、配置项、数据库表、接口等资源在目标位置不存在。

**常见情形**：

1. 文件路径引用指向不存在的文件
2. 数据库表名或字段名引用不存在的表或字段
3. 配置文件中的配置项key不存在
4. 远程服务或API URL不可达
5. 类引用指向不存在的类或已删除的类

**示例**：
```java
// 配置文件引用
@Value("${custom.config.not-exist-key}")  // 该配置项不存在
private String configValue;

// 文件路径引用
File file = new File("/data/bemp/not-exist-file.txt");  // 文件不存在

// 类引用
import com.hundsun.bemp.hnnxbank.biz.DeletedClass;  // 类已被删除
```

#### 13.2.3 循环引用（Circular Reference）

**定义**：两个或多个模块/类之间相互依赖，形成闭环，导致耦合度过高。

**常见情形**：

1. 类A依赖类B，同时类B依赖类A
2. 服务A调用服务B，服务B又调用服务A
3. Maven模块之间的循环依赖

**示例**：
```java
// 模块A依赖模块B，模块B又依赖模块A
// ServiceA.java
@Autowired
private ServiceB serviceB;

// ServiceB.java
@Autowired
private ServiceA serviceA;
```

#### 13.2.4 无效的继承与实现

**定义**：类继承或接口实现关系无效，包括泛型参数不匹配、实现方法签名错误等。

**常见情形**：

1. 抽象方法未实现
2. 接口方法签名与实现类不匹配
3. 泛型类型参数不一致

**示例**：
```java
public class CustomServiceImpl extends BaseService<String> {
    // 父类方法签名不一致
    @Override
    public void process(Integer param) {  // 与父类方法签名不匹配
        // 实现
    }
}
```

#### 13.2.5 死代码（Dead Code）

**定义**：永远不会执行的代码，包括无法到达的分支、未调用的私有方法、常量定义后未使用等。

**常见情形**：

1. if条件永远为true或false的分支
2. 未被调用的私有方法
3. 已被注释掉的业务代码
4. 定义后从未使用的常量

**示例**：
```java
// 永远为true的条件
if (true) {
    doSomething();  // 永远执行
}

// 未被调用的方法
private void unusedMethod() {  // 整个项目未调用
    // 实现
}
```

### 13.3 识别与检测方法

#### 13.3.1 IDE 自动检测

**【强制】** 开发人员必须启用IDE的实时检测功能：

1. **Eclipse/IDEA**：
   - 开启 "Inspections" 中的 Unused declaration 检查
   - 开启 "Resolve const" 检查
   - 开启 "Spelling" 检查

2. **IDEA 特色检测**：
   - 启用 "Unused import"
   - 启用 "Unused field"
   - 启用 "Unused method"
   - 启用 "Unused parameter"

#### 13.3.2 编译检测

**【强制】** 提交代码前必须通过编译检测：

```bash
# Maven 编译检测
mvn clean compile -DskipTests

# 开启编译器严格检查
<compilerArgs>
    <arg>-Xlint:all</arg>
    <arg>-Xlint:-options</arg>
</compilerArgs>
```

#### 13.3.3 代码审查工具

**【强制】** 必须使用代码审查工具检测无效引用：

1. **SonarQube**：
   - 规则：squid:S1130（未使用的私有方法）
   - 规则：squid:UselessImportCheck（未使用的导入）
   - 规则：squid:S1144（未使用的私有字段）

2. **Checkstyle**：
   - 检查未使用的imports
   - 检查未使用的fields

#### 13.3.4 运行时检测

**【强制】** 对于资源引用类无效引用，必须进行运行时验证：

1. 启动应用时检查配置项是否存在
2. 访问资源前验证资源可访问性
3. 定期巡检日志中的ClassNotFoundException、FileNotFoundException等

### 13.4 处理规范与整改要求

#### 13.4.1 未使用导入的处理

**【强制】** 立即清理未使用的导入：

1. IDE自动清理：使用"Optimize Imports"功能
2. 手动清理：删除未使用的import语句
3. 静态导入特殊处理：检查静态方法是否被调用

**正确示例**：
```java
// 清理前
import com.hundsun.bemp.utils.StringUtils;
import com.hundsun.bemp.utils.DateUtils;
import com.hundsun.bemp.constant.ErrorCode;

public class TestService {
    public void process() {
        String result = DateUtils.format(new Date());  // 只使用了DateUtils
    }
}

// 清理后
import com.hundsun.bemp.utils.DateUtils;

public class TestService {
    public void process() {
        String result = DateUtils.format(new Date());
    }
}
```

#### 13.4.2 指向不存在资源引用的处理

**【强制】** 资源引用必须在使用前验证存在性：

1. **配置文件**：
   - 使用 `@Value` 注解时确保配置项存在
   - 使用配置中心时确保配置项已注册
   - 新增配置项必须同步更新配置文档

2. **文件路径**：
   - 使用相对路径引用内部资源
   - 使用Spring Resource接口加载资源
   - 必要时进行存在性检查

3. **数据库引用**：
   - 确保SQL中引用的表、字段存在
   - 使用MyBatis/BoneCP等框架时确保实体类与表对应
   - 定期同步数据库DDL与实体类

4. **类引用**：
   - 确保引用的类存在于classpath中
   - 检查pom.xml依赖是否正确配置

#### 13.4.3 循环引用的处理

**【强制】** 必须消除模块间的循环依赖：

1. **重构策略**：
   - 提取公共依赖到独立模块
   - 使用依赖倒置原则，通过接口解耦
   - 合并功能相近的类

2. **Maven模块循环依赖检测**：
```bash
mvn dependency:tree -Dverbose | grep "cycles"
```

3. **服务间循环调用处理**：
   - 使用消息队列解耦
   - 异步调用替代同步调用
   - 提取公共服务层

#### 13.4.4 死代码的处理

**【强制】** 必须清理所有死代码：

1. **未使用的方法和字段**：
   - 删除未被调用的private方法
   - 删除定义后未使用的常量
   - 删除未使用的成员变量

2. **永远执行的分支**：
   - 删除条件永远为true的if分支
   - 删除条件永远为false的else分支

3. **已注释代码**：
   - 直接删除注释掉的代码
   - 使用版本控制系统管理历史代码

### 13.5 违规处理措施

#### 13.5.1 代码提交管控

**【强制】** 代码提交必须满足以下条件：

1. **提交前检查**：
   - IDE无黄色/红色警告
   - SonarQube无可信度为BLOCKER的无效引用问题
   - 编译通过无警告

2. **CI/CD拦截**：
   - 构建失败时阻止合并
   - SonarQube质量门禁拦截
   - 单元测试覆盖率达标

#### 13.5.2 问题等级定义

| 等级 | 定义 | 处理时限 |
|------|------|---------|
| **P0-紧急** | 运行时ClassNotFoundException、FileNotFoundException等导致服务不可用 | 立即修复 |
| **P1-高** | 循环依赖导致模块无法启动 | 24小时内修复 |
| **P2-中** | 未使用的导入、死代码等影响代码可读性 | 3天内修复 |
| **P3-低** | IDE警告级别的轻微引用问题 | 周版本修复 |

#### 13.5.3 违规处罚

**【强制】** 无效引用问题的处罚措施：

1. **P0问题**：
   - 回滚代码
   - 立即组织代码审查
   - 记录问题根因

2. **P1问题**：
   - 限制代码合并
   - 要求提供解决方案
   - 纳入代码质量考核

3. **P2/P3问题**：
   - 纳入代码review要点
   - 记录到代码质量报告
   - 作为开发人员绩效考核参考

#### 13.5.4 定期巡检

**【强制】** 建立定期巡检机制：

1. **每日**：CI构建失败告警检查
2. **每周**：SonarQube问题汇总分析
3. **每月**：代码质量报告输出
4. **每季度**：无效引用问题趋势分析

---

## 15. 安全规约

### 15.1 参数校验

**【强制】** 所有外部输入参数必须进行校验

### 15.2 SQL 注入防护

**【强制】** 使用 `#{}` 占位符，禁止使用 `${}` 拼接 SQL

### 15.3 敏感信息保护

**【强制】** 敏感信息必须加密存储

**【强制】** 日志中敏感信息必须脱敏

---

## 16. 性能规范

### 16.1 查询优化

**【推荐】** 查询优化：

1. 使用索引
2. 避免全表扫描
3. 分页查询

### 16.2 批量操作

**【推荐】** 批量操作：

1. 批量插入使用 `INSERT INTO ... VALUES (...), (...), ...`
2. 批量更新使用 `UPDATE ... WHERE ... IN (...)`
3. 批量删除使用 `DELETE FROM ... WHERE ... IN (...)`

### 16.3 事务优化

**【推荐】** 事务优化：

1. 事务范围尽量小
2. 避免长事务
3. 避免大事务

---

## 17. 最佳实践

### 17.1 变量作用范围

**【推荐】** 任何类、方法、参数、变量，严控访问范围：

- 方法内使用的变量不要定义为类变量
- For 循环内使用的不要定义在 for 循环以外

### 15.2 防止 NPE

**【推荐】** 防止 NPE，是程序员的基本修养，注意 NPE 产生的场景：

1. 返回类型为包装数据类型，有可能是 null，返回 int 值时注意判空
2. 数据库的查询结果可能为 null
3. 集合里的元素即使 isNotEmpty，取出的数据元素也可能为 null
4. 远程调用返回对象，一律要求进行 NPE 判断
5. 对于 Session 中获取的数据，建议 NPE 检查
6. 级联调用 `obj.getA().getB().getC()`，一连串调用，易产生 NPE

### 15.3 代码复用

**【参考】** 避免出现重复的代码（Don't Repeat Yourself），即 DRY 原则

### 15.4 国际化

**【强制】** 所有面向用户的文本必须使用国际化

### 15.5 菜单鉴权

**【强制】** 菜单鉴权遵循系统权限规范

### 15.6 日终规范

**【强制】** 日终任务遵循以下规范：

1. 记录执行进度
2. 记录处理数量
3. 异常数据记录日志
4. 支持重试机制

---

## 附录 A. 恒生电子 Java 编码规范补充

本章节内容来源于恒生电子 Java 编码规范，作为河南农信 BEMP 后端开发规范的补充。

### A.1 约束等级定义

| 约束等级 | 约束效力 | 强制性 |
|---------|---------|--------|
| 【强制】 | 违反该项将被认为代码存在严重缺陷 | 全公司所有 Java 编码团队必须遵守 |
| 【推荐】 | 违反该项即被认为代码存在轻微缺陷 | 各 Java 编码团队根据具体产品特性的不同，选择性地遵守 |
| 【参考】 | 违反该项可被认为代码存在优化空间 | 各 Java 编码团队从产品持续优化及人员技能提升的角度，参考使用 |

### A.2 命名风格补充

#### A.2.1 基本命名规则

**【强制】** 代码中的命名均不能以下划线或美元符号开始，也不能以下划线或美元符号结束。

反例：`_name` / `__name` / `$name` / `name_` / `name$` / `name__`

**【强制】** 代码中的命名严禁使用拼音与英文混合的方式，更不允许直接使用中文的方式。

正例：`hundsun` / `hangzhou` 等国际通用的名称，可视同英文。

反例：`DaZhePromotion` [打折] / `getPingfenByName()` [评分] / `int 某变量 = 3`

**【强制】** 类名使用 UpperCamelCase 风格，但以下情形例外：DTO/UID/DO/VO/DAO/BO/DAOImpl/YunOS/AP/PO 等。

正例：`MarcoPolo` / `UserDTO` / `XmlService` / `TcpUdpDeal` / `TaPromotion`

反例：`macroPolo` / `UserDto` / `XMLService` / `TCPUDPDeal` / `TAPromotion`

**【强制】** 方法名、参数名、成员变量、局部变量都统一使用 lowerCamelCase 风格，必须遵从驼峰形式。

正例：`localValue` / `getHttpMessage()` / `inputUserId`

**【强制】** 常量命名全部大写，单词间用下划线隔开，力求语义表达完整清楚，不要嫌名字长。

正例：`MAX_STOCK_COUNT`

反例：`MAX_COUNT`

#### A.2.2 特殊类型命名

**【推荐】** 抽象类命名使用 Abstract 开头；异常类命名使用 Exception 结尾；测试类命名以它要测试的类的名称开始，以 Test 结尾。

**【强制】** 类型与中括号紧挨相连来表示数组。

正例：定义整形数组 `int[] arrayDemo;`

反例：在 main 参数中，使用 `String args[]` 来定义。

**【强制】** POJO 类中布尔类型的变量，都不要加 is 前缀，否则部分框架解析会引起序列化错误。

反例：定义为基本数据类型 Boolean isDeleted 的属性，它的方法也是 isDeleted()，RPC 框架在反向解析的时候，"误以为"对应的属性名称是 deleted，导致属性获取不到，进而抛出异常。

**【强制】** 包名统一使用小写，点分隔符之间有且仅有一个自然语义的英语单词。包名统一使用单数形式，但是类名如果有复数含义，类名可以使用复数形式。

正例：应用工具类包名为 `com.hundsun.jres.util`、类名为 `MessageUtils`（此规则参考 spring 的框架结构）

**【强制】** 杜绝不规范的缩写，避免望文不知义。

反例：AbstractClass "缩写"命名成 AbsClass；condition "缩写"命名成 condi，此类随意缩写严重降低了代码的可阅读性。

#### A.2.3 设计模式命名

**【推荐】** 如果模块、接口、类、方法使用了设计模式，在命名时需体现出具体模式。

正例：
```java
public class OrderFactory;
public class LoginProxy;
public class ResourceObserver;
```

**【推荐】** 接口类中的方法和属性不要加任何修饰符号（public 也不要加），保持代码的简洁性，并加上有效的 Javadoc 注释。

正例：接口方法签名 `void commit();` 接口基础常量 `String COMPANY = "hundsun";`

反例：接口方法定义 `public abstract void f();`

#### A.2.4 枚举命名

**【参考】** 枚举类名建议带上 Enum 后缀，枚举成员名称需要全大写，单词间用下划线隔开。

正例：枚举名字为 ProcessStatusEnum 的成员名称：`SUCCESS` / `UNKNOWN_REASON`。

#### A.2.5 各层命名规约

**【参考】** 各层命名规约：

**Service 层方法命名规约**，服务接口的名称按照"动作+资源(表)+业务标识"进行标识，采用驼峰风格：

- 获取单个对象的方法用 get 做前缀
- 获取多个对象的方法用 get 做前缀，复数形式结尾如：getObjects
- 插入的方法用 post 做前缀
- 删除的方法用 delete 做前缀
- 修改的方法用 put 做前缀

**DAO 层方法命名规约**：

- 获取单个对象的方法用 get 做前缀
- 获取多个对象的方法用 list 做前缀，复数形式结尾如：listObjects
- 获取统计值的方法用 count 做前缀
- 插入的方法用 insert 做前缀
- 删除的方法用 delete 做前缀
- 修改的方法用 update 做前缀

### A.3 常量定义补充

**【强制】** 条件判断语句里不允许任何魔法值（即未经预先定义的常量）直接出现在代码中。

**【强制】** 在 long 或者 Long 赋值时，数值后使用大写的 L，不能是小写的英文字母 l，因为它容易跟数字 1 混淆，造成误解。

**【推荐】** 不要使用一个常量类维护所有常量，要按常量功能进行归类，分开维护。

正例：缓存相关常量放在类 CacheConsts 下；系统配置相关常量放在类 ConfigConsts 下。

**【推荐】** 常量的复用层次有五层：跨应用共享常量、应用内共享常量、子工程内共享常量、包内共享常量、类内共享常量。

- 跨应用共享常量：放置在二方库中，通常是 client.jar 中的 constant 目录下
- 应用内共享常量：放置在一方库中，通常是子模块中的 constant 目录下
- 子工程内部共享常量：即在当前子工程的 constant 目录下
- 包内共享常量：即在当前包下单独的 constant 目录下
- 类内共享常量：直接在类内部 private static final 定义

**【推荐】** 如果变量值仅在一个固定范围内变化用 enum 类型来定义。

### A.4 代码格式补充

**【强制】** 采用 4 个空格缩进，禁止使用 tab 字符。

**【推荐】** 单行字符数限制不超过 120 个，超出需要换行，换行时遵循如下原则：

- 第二行相对第一行缩进 4 个空格，从第三行开始，不再继续缩进
- 运算符与下文一起换行
- 方法调用的点符号与下文一起换行
- 方法调用中的多个参数需要换行时，在逗号后进行
- 在括号前不要换行

**【强制】** 方法参数在定义和传入时，多个参数逗号后边必须加空格。

正例：`method(args1, args2, args3);`

**【强制】** IDE 的 text file encoding 设置为 UTF-8；IDE 中文件的换行符使用 Unix 格式，不要使用 Windows 格式。

**【推荐】** 单个方法的总行数不超过 120 行。

**【强制】** 一行内不能有多条语句。

**【强制】** Dot（.）前不允许有空格，可以换行。

### A.5 OOP 规约补充

**【强制】** 避免通过一个类的对象引用访问此类的静态变量或静态方法，无谓增加编译器解析成本，直接用类名来访问即可。

**【强制】** 所有的覆写方法，必须加 @Override 注解。

**【强制】** 相同参数类型，相同业务含义，才可以使用 Java 的可变参数，避免使用 Object。

**【强制】** 外部正在调用或者二方库依赖的接口，不允许修改方法签名，避免对接口调用方产生影响。接口过时必须加 @Deprecated 注解，并清晰地说明采用的新接口或者新服务是什么。

**【强制】** 不能使用过时的类或方法。

**【强制】** Object 的 equals 方法容易抛空指针异常，应使用常量或确定有值的对象来调用 equals。

正例：`"test".equals(object);`

反例：`object.equals("test");`

**【强制】** 所有的相同类型的包装类对象之间值的比较，全部使用 equals 方法比较。

**【强制】** String 类型之间值的比较，必须使用 equals 方法比较，禁止使用 == 或 != 进行比较。

**【强制】** 关于基本数据类型与包装数据类型的使用标准：

- 所有的 POJO 类属性必须使用包装数据类型
- RPC 方法的返回值和参数必须使用包装数据类型
- 所有的局部变量使用基本数据类型

**【参考】** 定义 DO/DTO/VO 等 POJO 类时，不要设定任何属性默认值。

**【强制】** 序列化类新增属性时，请不要修改 serialVersionUID 字段，避免反序列失败。

**【强制】** 构造方法里面禁止加入任何业务逻辑（只能用来做注入），如果有初始化逻辑，请放在 init 方法中。

**【强制】** POJO 类必须写 toString 方法。

**【推荐】** 循环体内，字符串的连接方式，使用 StringBuilder 的 append 方法进行扩展。

**【推荐】** 类成员与方法访问控制从严：

- 如果不允许外部直接通过 new 来创建对象，那么构造方法必须是 private
- 工具类不允许有 public 或 default 构造方法
- 类非 static 成员变量并且与子类共享，必须是 protected
- 类非 static 成员变量并且仅在本类使用，必须是 private
- 类 static 成员变量如果仅在本类使用，必须是 private
- 若是 static 成员变量，考虑是否为 final
- 类成员方法只供类内部调用，必须是 private
- 类成员方法只对继承类公开，那么限制为 protected

**【强制】** 禁止重复 import 同一个类。

**【强制】** 禁止 import 没用的包。

**【强制】** 禁止在方法内对引用类型的入参赋值。

**【强制】** 禁止 import 以下类：`java.sql.Date`, `java.sql.Time`, `java.sql.Timestamp`

**【强制】** 禁止使用 `System.out.*` 或者 `System.err.*`。

**【强制】** 禁止代码中出现类型强转编码，如果确实无法避免，必须在转换前增加类型判断。

**【强制】** 枚举类做为常量的一种实现方式，要求所有枚举成员属性只读，确保枚举实例内部属性不被外部修改。

**【推荐】** 尽量少用 @Resource 来注入 Bean。如果必须使用 @Resource 注解，请指定 type 参数。如非必要，一般建议使用 @Autowired 进行注入。

### A.6 集合处理补充

**【强制】** 关于 hashCode 和 equals 的处理，遵循如下规则：

- 只要重写 equals，就必须重写 hashCode
- 因为 Set 存储的是不重复的对象，依据 hashCode 和 equals 进行判断，所以 Set 存储的对象必须重写这两个方法
- 如果自定义对象作为 Map 的键，那么必须重写 hashCode 和 equals

**【强制】** ArrayList 的 subList 结果不可强转成 ArrayList，否则会抛出 ClassCastException 异常。

**【强制】** 在 subList 场景中，高度注意对原集合元素的增加或删除，均会导致子列表的遍历、增加、删除产生 ConcurrentModificationException 异常。

**【强制】** 使用集合转数组的方法，必须使用集合的 toArray(T[] array)。

**【强制】** 使用工具类 Arrays.asList() 把数组转换成集合时，不能使用其修改集合相关的方法，它的 add/remove/clear 方法会抛出 UnsupportedOperationException 异常。

**【强制】** 不要在 foreach 循环里进行元素的 remove/add 操作。remove 元素请使用 Iterator 方式，如果并发操作，需要对 Iterator 对象加锁。

**【推荐】** 集合初始化时，指定集合初始值大小。

**【推荐】** 使用 entrySet 遍历 Map 类集合 KV，而不是 keySet 方式进行遍历。

**【推荐】** 高度注意 Map 类集合 K/V 能不能存储 null 值的情况：

| 集合类 | Key | Value | Super | 说明 |
|--------|-----|-------|-------|------|
| Hashtable | 不允许为 null | 不允许为 null | Dictionary | 线程安全 |
| ConcurrentHashMap | 不允许为 null | 不允许为 null | AbstractMap | 锁分段技术（JDK8:CAS） |
| TreeMap | 不允许为 null | 允许为 null | AbstractMap | 线程不安全 |
| HashMap | 允许为 null | 允许为 null | AbstractMap | 线程不安全 |

### A.7 并发处理补充

**【强制】** 获取单例对象需要保证线程安全，其中的方法也要保证线程安全。

**【强制】** 创建线程或线程池时请指定有意义的线程名称，方便出错时回溯。

**【强制】** 线程资源必须通过线程池提供，不允许在应用中自行显式创建线程。

**【强制】** 线程池不允许使用 Executors 去创建，而是通过 ThreadPoolExecutor 的方式，这样的处理方式让写的同学更加明确线程池的运行规则，规避资源耗尽的风险。

**【强制】** SimpleDateFormat 是线程不安全的类，一般不要定义为 static 变量，如果定义为 static，必须加锁，或者使用 DateUtils 工具类。

**【强制】** 高并发时，同步调用应该去考量锁的性能损耗。能用无锁数据结构，就不要用锁；能锁区块，就不要锁整个方法体；能用对象锁，就不要用类锁。

**【强制】** 对多个资源、数据库表、对象同时加锁时，需要保持一致的加锁顺序，否则可能会造成死锁。

**【强制】** 并发修改同一记录时，避免更新丢失，需要加锁。要么在应用层加锁，要么在缓存加锁，要么在数据库层使用乐观锁，使用 version 作为更新依据。

**【推荐】** 使用 CountDownLatch 进行异步转同步操作，每个线程退出前必须调用 countDown 方法，线程执行代码注意 catch 异常，确保 countDown 方法被执行到。

**【推荐】** 避免 Random 实例被多线程使用，虽然共享该实例是线程安全的，但会因竞争同一 seed 导致的性能下降。

**【参考】** volatile 解决多线程内存不可见问题。对于一写多读，是可以解决变量同步问题，但是如果多写，同样无法解决线程安全问题。

**【推荐】** ThreadLocal 无法解决共享对象的更新问题，ThreadLocal 对象建议使用 static 修饰。

### A.8 控制语句补充

**【强制】** 在一个 switch 块内，每个 case 要么通过 break/return 等来终止，要么注释说明程序将继续执行到哪一个 case 为止；在一个 switch 块内，都必须包含一个 default 语句并且放在最后，即使空代码。

**【强制】** 在 if/else/for/while/do 语句中必须使用大括号。即使只有一行代码，避免采用单行的编码方式。

**【强制】** 在高并发场景中，避免使用"等于"判断作为中断或退出的条件。

**【推荐】** 表达异常的分支时，少用 if-else 方式，这种方式可以改写成：

```java
if (condition) {
    ...
    return obj;
}
// 接着写 else 的业务逻辑代码;
```

**【强制】** 超过 3 层的 if-else 的逻辑判断代码可以使用卫语句、策略模式、状态模式等来实现。

**【强制】** 禁止超过 3 层以上的 try 嵌套。

**【强制】** 禁止超过 3 层以上的 for 嵌套。

### A.9 注释规约补充

**【强制】** 类、类属性、类方法的注释必须使用 Javadoc 规范，使用 `/**内容*/` 格式，不得使用 `// xxx` 方式。

**【强制】** 所有的抽象方法（包括接口中的方法）必须要有 Javadoc 注释、除了返回值、参数、异常说明外，还必须指出该方法做什么事情，实现什么功能。

**【强制】** 所有的类都必须添加创建者和创建日期。

**【推荐】** 方法内部单行注释，在被注释语句上方另起一行，使用 `//` 注释。方法内部多行注释使用 `/* */` 注释，注意与代码对齐。

**【强制】** 所有的枚举类型字段必须要有注释，说明每个数据项的用途。

**【推荐】** 与其"半吊子"英文来注释，不如用中文注释把问题说清楚。专有名词与关键字保持英文原文即可。

**【推荐】** 代码修改的同时，注释也要进行相应的修改，尤其是参数、返回值、异常、核心逻辑等的修改。

### A.10 二方库依赖

**【强制】** 定义 GAV 遵从以下规则：

- GroupID 格式：`com.{公司/BU}.业务线[.子业务线]`，最多 4 级
- ArtifactID 格式：产品线名-模块名。语义不重复不遗漏
- Version：详细规定参考下方

**【强制】** 二方库版本号命名方式：主版本号.次版本号.修订号

- 主版本号：产品方向改变，或者大规模 API 不兼容，或者架构不兼容升级
- 次版本号：保持相对兼容性，增加主要功能特性，影响范围极小的 API 不兼容修改
- 修订号：保持完全兼容性，修复 BUG、新增次要功能特性等

**【强制】** 线上应用不要依赖 SNAPSHOT 版本（安全包除外）。

**【强制】** 二方库的新增或升级，保持除功能点之外的其它 jar 包仲裁结果不变。

**【强制】** 二方库里可以定义枚举类型，参数可以使用枚举类型，但是接口返回值不允许使用枚举类型或者包含枚举类型的 POJO 对象。

**【强制】** 依赖于一个二方库群时，必须定义一个统一的版本变量，避免版本号不一致。

**【强制】** 禁止在子项目的 pom 依赖中出现相同的 GroupId，相同的 ArtifactId，但是不同的 Version。

### A.11 其它规范

**【强制】** 在使用正则表达式时，利用好其预编译功能，可以有效加快正则匹配速度。

**【强制】** 获取当前毫秒数 `System.currentTimeMillis();` 而不是 `new Date().getTime();`

**【推荐】** 任何数据结构的构造或初始化，都应指定大小，避免数据结构无限增长吃光内存。

**【推荐】** 及时清理不再使用的代码段或配置信息。

**【强制】** 日期格式转换禁止使用大写 YYYY（即 new SimpleDateFormat(pattern) 中 pattern 不能用 YYYY）。

**【参考】** 分层领域模型规约：

- DO（Data Object）：此对象与数据库表结构一一对应，通过 DAO 层向上传输数据源对象
- DTO（Data Transfer Object）：数据传输对象，Service 或 Manager 向外传输的对象
- BO（Business Object）：业务对象，由 Service 层输出的封装业务逻辑的对象
- VO（View Object）：显示层对象，通常是 Web 向模板渲染引擎层传输的对象
- Query：数据查询对象，各层接收上层的查询请求。注意超过 2 个参数的查询封装，禁止使用 Map 类来传输


---

## 二、代码模板

# 河南农信 BEMP 后端开发模板

## 目录

- [1. Controller 模板](#1-controller-模板)
- [2. Service 模板](#2-service-模板)
- [3. DTO 模板](#3-dto-模板)
- [4. DAO 模板](#4-dao-模板)
- [5. 异常处理模板](#5-异常处理模板)
- [6. 事务处理模板](#6-事务处理模板)
- [7. 日志处理模板](#7-日志处理模板)
- [8. 测试用例模板](#8-测试用例模板)

---

## 1. Controller 模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.controller.role;

import com.hundsun.bemp.fw.common.constant.CommonConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.BaseServiceController;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.sm.common.AuthConstant;
import com.hundsun.bemp.sm.common.RoleConstants;
import com.hundsun.bemp.sm.service.role.RoleService;
import com.hundsun.bemp.sm.service.role.dto.RoleDto;
import com.hundsun.jrescloud.rpc.annotation.CloudReference;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * 机构角色控制层
 * @author [作者姓名]
 * @date [创建日期]
 */
@RestController()
@RequestMapping("/hnnx/")
public class HnnxBankBranchRoleController extends BaseServiceController {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxBankBranchRoleController.class);

    @CloudReference
    private RoleService roleService;
    
    @CloudReference
    private HnnxRoleService hnnxRoleService;

    /**
     * 新增机构角色
     * 核心业务逻辑：新增机构角色并保存到数据库
     * 实现步骤：
     * 1. 获取当前用户信息
     * 2. 设置角色类型和机构号
     * 3. 检查复核模式
     * 4. 执行角色新增操作
     *
     * @param req 请求参数
     * @param requestDto 角色数据传输对象
     * @return 操作结果
     */
    @RequestMapping("sm/auth/role/role/func_addBranchRole")
    public CommonResp addBranchRole(BaseRequest req, RoleDto requestDto) {
        // 0. 输入参数非空校验（防御性编程，提前拦截非法请求）
        if (requestDto == null) {
            throw new BempRuntimeException("请求参数不能为空");
        }

        // 1. 获取当前用户信息
        UserInfo userInfo = UserContext.get();
        requestDto.setRoleType(AuthConstant.S_ONE);
        requestDto.setReserve1(userInfo.getLegalNo());

        // 2. 机构角色复核模式检查
        String roleCheckMode = getParamValue(userInfo.getLegalNo(), RoleConstants.ROLE_BIND_CHECK_MODE,
                CommonConst.LOGIC_NO);
        LOGGER.info("当前复核模式：" + roleCheckMode + "(1-双岗需复核，0-单岗无需复核);当前执行操作：新增机构角色[" + requestDto.getRoleName() + "]");

        if (CommonConst.LOGIC_YES.equals(roleCheckMode)) {
            // 双岗模式：写入复核表
            // TODO: 实现双岗复核逻辑
        } else {
            // 单岗模式：直接执行新增
            req.setRequestDto(requestDto);
            roleService.addRole(req);
        }

        return resultCommonResp(true);
    }

    /**
     * 修改机构角色
     * 核心业务逻辑：修改机构角色信息并保存到数据库
     *
     * @param req 请求参数
     * @param requestDto 角色数据传输对象
     * @return 操作结果
     */
    @RequestMapping("sm/auth/role/role/func_updateBranchRole")
    public CommonResp updateBranchRole(BaseRequest req, RoleDto requestDto) {
        // 0. 输入参数非空校验
        if (requestDto == null) {
            throw new BempRuntimeException("请求参数不能为空");
        }
        if (StringUtils.isBlank(requestDto.getId())) {
            throw new BempRuntimeException("角色ID不能为空");
        }

        // 1. 获取当前用户信息
        UserInfo userInfo = UserContext.get();
        BaseIDRequest baseRequest = new BaseIDRequest();
        baseRequest.setId(requestDto.getId());
        RoleDto role = roleService.viewRole(baseRequest);
        role.setRoleName(requestDto.getRoleName());
        role.setDescription(requestDto.getDescription());
        role.setReserve1(userInfo.getLegalNo());
        role.setReserve2(requestDto.getReserve2());

        // 2. 机构角色复核模式检查
        String roleCheckMode = getParamValue(role.getLegalNo(), RoleConstants.ROLE_BIND_CHECK_MODE,
                CommonConst.LOGIC_NO);
        LOGGER.info("当前复核模式：" + roleCheckMode + "(1-双岗需复核，0-单岗无需复核);当前执行操作：修改机构角色[" + requestDto.getRoleName() + "]");

        if (CommonConst.LOGIC_YES.equals(roleCheckMode)) {
            // 双岗模式：写入复核表
            // TODO: 实现双岗复核逻辑
        } else {
            // 单岗模式：直接执行修改
            req.setRequestDto(role);
            roleService.updateRoleById(req);
        }

        return resultCommonResp(true);
    }

    /**
     * 批量复制机构角色分配
     * 核心业务逻辑：从源机构复制角色分配到目标机构列表
     * 实现步骤：
     * 1. 参数校验
     * 2. 获取当前用户信息
     * 3. 用户类型校验
     * 4. 检查机构绑定复核模式
     * 5. 执行复制逻辑
     *
     * @param req 请求参数（包含源机构号 brchNo 和目标机构号列表 targetBrchNos）
     * @param roleDto 角色数据传输对象
     * @return 操作结果
     */
    @RequestMapping("sm/auth/branch/roleDistribute/func_copyAssignBranchRole")
    @ResponseBody
    public CommonResp copyAssignBranchRole(BaseRequest<HnnxRoleDto> req, HnnxRoleDto roleDto) {
        // 0. 输入参数非空校验（防御性编程，提前拦截非法请求）
        if (roleDto == null) {
            throw new BempRuntimeException("请求参数不能为空");
        }
        if (StringUtils.isBlank(roleDto.getBrchNo())) {
            throw new BempRuntimeException("源机构号不能为空");
        }
        if (roleDto.getTargetBrchNos() == null || roleDto.getTargetBrchNos().isEmpty()) {
            throw new BempRuntimeException("目标机构号列表不能为空");
        }

        // 1. 获取当前用户信息
        UserInfo userInfo = UserContext.get();
        String legalNo = userInfo.getLegalNo();

        // 2. 用户类型校验（只有总行和市办用户可以执行此操作）
        if (!AuthConstant.S_TWO.equals(userInfo.getUserType())
                && !AuthConstant.S_FOUR.equals(userInfo.getUserType())) {
            throw new BempRuntimeException("无权限执行批量复制操作");
        }

        // 3. 设置操作员信息
        roleDto.setLegalNo(legalNo);
        req.setRequestDto(roleDto);

        // 4. 检查机构绑定复核模式参数
        String branchCheckMode = BranchHisServiceUtil.getParamValue(legalNo, BranchConst.BRANCH_BIND_CHECK_MODE,
                CommonConst.LOGIC_NO);
        LOGGER.info("当前复核模式：" + branchCheckMode + "(1-双岗需复核，0-单岗无需复核);当前执行操作：批量复制机构角色分配");

        if (CommonConst.LOGIC_YES.equals(branchCheckMode)) {
            // 双岗模式：写入复核表
            // TODO: 实现双岗复核逻辑
        } else {
            // 单岗模式：直接执行复制逻辑
            hnnxRoleService.copyAssignBranchRole(req);
        }

        return resultCommonResp(true, "操作成功");
    }

    /**
     * 多法人参数查询
     * 核心业务逻辑：根据法人编号和参数键查询参数值
     *
     * @param legalNo 法人编号
     * @param paramKey 参数键
     * @param defaultValue 默认值
     * @return 参数值
     */
    private String getParamValue(String legalNo, String paramKey, String defaultValue) {
        BaseRequest<BusiParamQueryDto> paramReq = new BaseRequest<>();
        BusiParamQueryDto busiParamQueryDto = new BusiParamQueryDto();
        busiParamQueryDto.setLegalNo(legalNo);
        busiParamQueryDto.setParamKey(paramKey);
        paramReq.setRequestDto(busiParamQueryDto);
        String value = businessParameterService.findParamValueByParamKey(paramReq);
        if (StringUtils.isNotBlank(value)) {
            return value;
        }
        return defaultValue;
    }
}
```

---

## 2. Service 模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.service.impl.role;

import com.github.pagehelper.Page;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.hnnxbank.biz.sm.dao.role.HnnxRoleDao;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.sm.common.AuthConstant;
import com.hundsun.bemp.sm.common.constant.exception.RoleExceptionCodeConstant;
import com.hundsun.bemp.sm.common.util.StringUtils;
import com.hundsun.bemp.sm.dao.legalpersonvirtual.LegalPersonVirtualDao;
import com.hundsun.bemp.sm.dao.legalpersonvirtual.entity.LegalPersonVirtual;
import com.hundsun.bemp.sm.dao.legalpersonvirtual.entity.LegalPersonVirtualExample;
import com.hundsun.bemp.sm.dao.role.BranchRoleDao;
import com.hundsun.bemp.sm.dao.role.RoleDao;
import com.hundsun.bemp.sm.dao.role.entity.*;
import com.hundsun.bemp.sm.service.branch.dto.QryBranchDto;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.dto.HnnxRoleDto;
import com.hundsun.bemp.sm.service.role.dto.*;
import com.hundsun.bemp.sm.service.role.request.QueryRoleDto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import com.hundsun.jrescloud.rpc.annotation.CloudFunction;
import com.hundsun.jrescloud.rpc.annotation.CloudReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 角色服务实现
 * @author [作者姓名]
 * @date [创建日期]
 */
@CloudComponent
public class HnnxRoleServiceImpl implements HnnxRoleService {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxRoleServiceImpl.class);

    @Resource
    private RoleDao roleDao;
    
    @Resource
    private LegalPersonVirtualDao legalPersonVirtualDao;
    
    @Resource
    private HnnxRoleDao hnnxRoleDao;
    
    @Resource
    private BranchRoleDao branchRoleDao;

    /**
     * 查询所有系统角色
     * 核心业务逻辑：根据机构编号和法人编号查询角色列表
     *
     * @param req 请求参数
     * @return 角色列表
     */
    @Override
    public List<RoleDto> queryAllSysRole(BaseRequest<QryBranchDto> req) {
        QryBranchDto qryBranchDto = req.getRequestDto();
        RoleExample example = new RoleExample();
        RoleExample.Criteria criteria = example.createCriteria();
        
        if (StringUtils.isNotEmpty(qryBranchDto.getLegalNo())) {
            criteria.andLegalNoEqualTo(qryBranchDto.getLegalNo());
        }
        criteria.andRoleTypeEqualTo("1");
        if (StringUtils.isNotEmpty(qryBranchDto.getBrchNo())) {
            criteria.andReserve1EqualTo(qryBranchDto.getBrchNo());
        }
        
        List<Role> roleList = roleDao.selectByExample(example);
        return transRoleListToDtoList(roleList);
    }

    /**
     * 检查机构角色分配
     * 核心业务逻辑：检查是否对自己机构进行角色分配
     *
     * @param baseRequest 请求参数
     * @return 提示信息
     */
    @Override
    public String chekcDistributeBranchRole(BaseRequest<RoleDto> baseRequest){
        UserInfo userInfo = UserContext.get();
        String branchNo = baseRequest.getRequestDto().getBrchNo();
        
        LegalPersonVirtualExample example1 = new LegalPersonVirtualExample();
        LegalPersonVirtualExample.Criteria criteria1 = example1.createCriteria();
        criteria1.andBrchNoEqualTo(userInfo.getBrchNo());
        
        List<LegalPersonVirtual> legalPersonVirtuals = legalPersonVirtualDao.selectByExample(example1);
        if(null != legalPersonVirtuals && legalPersonVirtuals.size() > 0){
            if(!"0".equals(legalPersonVirtuals.get(0).getLegalType())){
                if(userInfo.getBrchNo().equals(branchNo)){
                    return "确定对自己机构进行角色分配，上级机构对本机构分配的角色会失效";
                }
            }
        }
        return null;
    }

    /**
     * 分页查询审计角色
     * 核心业务逻辑：根据机构编号和排除角色ID列表分页查询角色
     *
     * @param req 请求参数
     * @return 分页结果
     */
    @Override
    public ResultData<RoleDto> pageQueryHnnxAuditRolesByBranchNoAndNotRoleIds(BasePageRequest<QueryRoleDto> req) {
        Page<Role> page = hnnxRoleDao.pageQueryHnnxAuditRolesByBranchNoAndNotRoleIds(req.getRequestDto(), req.getPageInfo());
        return RoleServiceImplUtil.transPageToResultData(req.getPageInfo(), page);
    }

    /**
     * 批量复制机构角色分配
     * 核心业务逻辑：从源机构复制角色分配到目标机构列表
     * 实现步骤：
     * 1. 查询源机构的已分配角色ID列表
     * 2. 遍历每个目标机构，计算差异（需新增和需删除的角色）
     * 3. 校验待删除的角色是否被柜员使用
     * 4. 执行删除和新增操作
     *
     * @param req 请求参数（包含源机构号 brchNo 和目标机构号列表 targetBrchNos）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)  // 添加事务管理，确保批量操作的原子性
    public void copyAssignBranchRole(BaseRequest<HnnxRoleDto> req) {
        HnnxRoleDto roleDto = req.getRequestDto();
        String sourceBrchNo = roleDto.getBrchNo();  // 源机构号
        List<String> targetBrchNos = roleDto.getTargetBrchNos();  // 目标机构号列表
        String legalNo = roleDto.getLegalNo();

        // 参数校验
        if (StringUtils.isBlank(sourceBrchNo)) {
            throw new BempRuntimeException("源机构号不能为空");
        }
        if (targetBrchNos == null || targetBrchNos.isEmpty()) {
            throw new BempRuntimeException("目标机构号列表不能为空");
        }

        LOGGER.info("开始批量复制角色分配，源机构号：{}，目标机构数量：{}", sourceBrchNo, targetBrchNos.size());

        // 1. 查询源机构的已分配角色ID列表
        List<Long> sourceRoleIds = queryAssignedRoleIds(sourceBrchNo);

        // 2. 遍历每个目标机构
        for (String targetBrchNo : targetBrchNos) {
            LOGGER.info("正在处理目标机构：{}", targetBrchNo);

            // 2.1 查询目标机构的已分配角色ID列表
            List<Long> targetRoleIds = queryAssignedRoleIds(targetBrchNo);

            // 2.2 计算需要新增的角色（源有 + 目标没有）
            List<Long> rolesToAdd = new ArrayList<>(sourceRoleIds);
            rolesToAdd.removeAll(targetRoleIds);

            // 2.3 计算需要删除的角色（目标有 + 源没有）
            List<Long> rolesToRemove = new ArrayList<>(targetRoleIds);
            rolesToRemove.removeAll(sourceRoleIds);

            LOGGER.info("目标机构【{}】需要新增角色数：{}，需要删除角色数：{}", targetBrchNo, rolesToAdd.size(), rolesToRemove.size());

            // 2.4 优化：批量查询该机构的用户角色列表，避免N+1查询问题
            // 在循环外一次性查询该机构所有用户角色关联，转换为Set提升查找效率
            List<Long> allUserRoleIds = branchRoleDao.queryUserRoleWithBranchNo(targetBrchNo);
            Set<Long> userRoleSet = allUserRoleIds != null ? new HashSet<>(allUserRoleIds) : new HashSet<>();

            // 校验待删除的角色是否被柜员使用（使用内存中的Set进行判断，避免重复数据库查询）
            for (Long roleId : rolesToRemove) {
                // 查询角色名称
                String roleName = getRoleNameById(roleId);
                // 使用Set的contains方法判断，时间复杂度O(1)，性能更优
                if (userRoleSet.contains(roleId)) {
                    // 抛出精确的业务异常，提示信息必须匹配规范要求
                    throw new BempRuntimeException(RoleExceptionCodeConstant.ROLE_IS_OWNED_BY_BRANCH_ERROR, roleName);
                }
            }

            // 2.5 执行删除操作：先删除目标机构与角色的关联关系
            for (Long roleId : rolesToRemove) {
                removeBranchRoleRelation(targetBrchNo, roleId, legalNo);
                LOGGER.info("已删除目标机构【{}】与角色【{}】的关联关系", targetBrchNo, roleId);
            }

            // 2.6 执行新增操作：建立目标机构与角色的关联关系
            for (Long roleId : rolesToAdd) {
                addBranchRoleRelation(targetBrchNo, roleId, legalNo);
                LOGGER.info("已新增目标机构【{}】与角色【{}】的关联关系", targetBrchNo, roleId);
            }
        }

        LOGGER.info("批量复制角色分配完成，源机构号：{}，共处理目标机构数：{}", sourceBrchNo, targetBrchNos.size());
    }

    /**
     * 查询指定机构的已分配角色ID列表
     *
     * @param brchNo 机构号
     * @return 已分配的角色ID列表
     */
    private List<Long> queryAssignedRoleIds(String brchNo) {
        // 通过 BranchRoleDao 查询机构角色关联表，获取该机构已分配的所有角色ID
        BranchRoleExample example = new BranchRoleExample();
        BranchRoleExample.Criteria criteria = example.createCriteria();
        criteria.andBrchNoEqualTo(brchNo);
        List<BranchRole> branchRoles = branchRoleDao.selectByExample(example);

        List<Long> roleIds = new ArrayList<>();
        if (branchRoles != null && !branchRoles.isEmpty()) {
            for (BranchRole branchRole : branchRoles) {
                roleIds.add(branchRole.getRoleId());
            }
        }
        return roleIds;
    }

    /**
     * 根据角色ID查询角色名称
     *
     * @param roleId 角色ID
     * @return 角色名称
     */
    private String getRoleNameById(Long roleId) {
        // 优化：避免重复查询数据库，将查询结果存储到变量中
        Role role = roleDao.selectById(roleId);
        return role != null ? role.getRoleName() : "未知角色";
    }

    /**
     * 删除机构与角色的关联关系
     *
     * @param brchNo  机构号
     * @param roleId 角色ID
     * @param legalNo 法人编号
     */
    private void removeBranchRoleRelation(String brchNo, Long roleId, String legalNo) {
        // 构造删除条件并执行删除
        BranchRoleExample example = new BranchRoleExample();
        BranchRoleExample.Criteria criteria = example.createCriteria();
        criteria.andBrchNoEqualTo(brchNo);
        criteria.andRoleIdEqualTo(roleId);
        branchRoleDao.deleteByExample(example);
    }

    /**
     * 新增机构与角色的关联关系
     *
     * @param brchNo  机构号
     * @param roleId 角色ID
     * @param legalNo 法人编号
     */
    private void addBranchRoleRelation(String brchNo, Long roleId, String legalNo) {
        // 创建新的机构角色关联记录
        BranchRole branchRole = new BranchRole();
        branchRole.setBrchNo(brchNo);
        branchRole.setLegalNo(legalNo);
        branchRole.setRoleId(roleId);
        branchRole.setReviewStatus(AuthConstant.S_ONE);  // 设置复核状态为已复核
        branchRoleDao.insert(branchRole);
    }
}
```

---

## 3. DTO 模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.service.role.dto;

import com.hundsun.bemp.sm.service.role.dto.RoleDto;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * 河南农信角色DTO
 * 扩展自产品化 RoleDto，添加个性化功能所需的字段
 * @author [作者姓名]
 * @date [创建日期]
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class HnnxRoleDto extends RoleDto {
    /**
     * 目标机构号列表
     */
    private List<String> targetBrchNos;
    
    /**
     * 源机构号
     */
    private String brchNo;
    
    /**
     * 法人编号
     */
    private String legalNo;
    
    /**
     * 角色ID列表
     */
    private List<Long> roleIds;
}
```

---

## 4. DAO 模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.dao.role;

import com.hundsun.bemp.sm.dao.role.entity.Role;
import com.hundsun.bemp.sm.service.role.request.QueryRoleDto;
import com.github.pagehelper.Page;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 河南农信角色DAO
 * @author [作者姓名]
 * @date [创建日期]
 */
public interface HnnxRoleDao {
    /**
     * 分页查询审计角色
     * 根据机构编号和排除角色ID列表分页查询角色
     *
     * @param dto 查询参数
     * @param pageInfo 分页信息
     * @return 分页结果
     */
    Page<Role> pageQueryHnnxAuditRolesByBranchNoAndNotRoleIds(
            @Param("dto") QueryRoleDto dto, 
            @Param("pageInfo") com.github.pagehelper.PageInfo pageInfo);
    
    /**
     * 查询机构已分配的角色ID列表
     *
     * @param brchNo 机构号
     * @return 角色ID列表
     */
    List<Long> queryAssignedRoleIds(@Param("brchNo") String brchNo);
}
```

---

## 5. 异常处理模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.common.exception;

/**
 * 河南农信业务异常常量
 * @author [作者姓名]
 * @date [创建日期]
 */
public class HnnxBankExceptionCodeConstant {
    
    /** 机构不存在 */
    public static final String BRANCH_NOT_FOUND_ERROR = "HNNX_001";
    
    /** 机构已存在 */
    public static final String BRANCH_ALREADY_EXISTS_ERROR = "HNNX_002";
    
    /** 角色被机构使用 */
    public static final String ROLE_IS_OWNED_BY_BRANCH_ERROR = "HNNX_003";
    
    /** 用户不存在 */
    public static final String USER_NOT_FOUND_ERROR = "HNNX_004";
    
    /** 权限不足 */
    public static final String PERMISSION_DENIED_ERROR = "HNNX_005";
    
    /** 数据不存在 */
    public static final String DATA_NOT_FOUND_ERROR = "HNNX_006";
    
    /** 数据已存在 */
    public static final String DATA_ALREADY_EXISTS_ERROR = "HNNX_007";
    
    /** 参数错误 */
    public static final String PARAMETER_ERROR = "HNNX_008";
    
    /** 操作失败 */
    public static final String OPERATION_FAILED_ERROR = "HNNX_009";
    
    /** 系统错误 */
    public static final String SYSTEM_ERROR = "HNNX_010";
}
```

---

## 6. 事务处理模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.service.impl;

import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.hnnxbank.biz.sm.service.HnnxService;
import com.hundsun.bemp.hnnxbank.biz.sm.service.dto.HnnxDto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

/**
 * 事务处理示例
 * @author [作者姓名]
 * @date [创建日期]
 */
@CloudComponent
public class HnnxServiceImpl implements HnnxService {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxServiceImpl.class);

    /**
     * 批量操作示例
     * 核心业务逻辑：批量执行多个操作
     * 实现步骤：
     * 1. 参数校验
     * 2. 执行批量操作
     * 3. 提交事务
     *
     * @param req 请求参数
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchOperation(BaseRequest<HnnxDto> req) {
        HnnxDto dto = req.getRequestDto();
        
        // 参数校验
        if (dto == null) {
            throw new BempRuntimeException("请求参数不能为空");
        }
        
        LOGGER.info("开始执行批量操作，参数：{}", dto);
        
        try {
            // 执行批量操作1
            operation1(dto);
            
            // 执行批量操作2
            operation2(dto);
            
            // 执行批量操作3
            operation3(dto);
            
            LOGGER.info("批量操作完成");
        } catch (Exception e) {
            LOGGER.error("批量操作失败", e);
            throw new BempRuntimeException("批量操作失败，请稍后重试");
        }
    }

    /**
     * 操作1
     *
     * @param dto 数据传输对象
     */
    private void operation1(HnnxDto dto) {
        // 实现操作1
    }

    /**
     * 操作2
     *
     * @param dto 数据传输对象
     */
    private void operation2(HnnxDto dto) {
        // 实现操作2
    }

    /**
     * 操作3
     *
     * @param dto 数据传输对象
     */
    private void operation3(HnnxDto dto) {
        // 实现操作3
    }
}
```

---

## 7. 日志处理模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.service.impl;

import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.hnnxbank.biz.sm.service.HnnxService;
import com.hundsun.bemp.hnnxbank.biz.sm.service.dto.HnnxDto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

/**
 * 日志处理示例
 * @author [作者姓名]
 * @date [创建日期]
 */
@CloudComponent
public class HnnxLogServiceImpl implements HnnxService {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxLogServiceImpl.class);

    /**
     * 批量复制机构角色分配
     * 核心业务逻辑：从源机构复制角色分配到目标机构列表
     * 实现步骤：
     * 1. 查询源机构的已分配角色ID列表
     * 2. 遍历每个目标机构，计算差异（需新增和需删除的角色）
     * 3. 校验待删除的角色是否被柜员使用
     * 4. 执行删除和新增操作
     *
     * @param req 请求参数
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void copyAssignBranchRole(BaseRequest<HnnxDto> req) {
        HnnxDto dto = req.getRequestDto();
        String sourceBrchNo = dto.getBrchNo();
        List<String> targetBrchNos = dto.getTargetBrchNos();

        // 参数校验
        if (StringUtils.isBlank(sourceBrchNo)) {
            throw new BempRuntimeException("源机构号不能为空");
        }
        if (targetBrchNos == null || targetBrchNos.isEmpty()) {
            throw new BempRuntimeException("目标机构号列表不能为空");
        }

        // INFO 级别：关键业务流程、重要状态变化
        LOGGER.info("开始批量复制角色分配，源机构号：{}，目标机构数量：{}", sourceBrchNo, targetBrchNos.size());

        // 1. 查询源机构的已分配角色ID列表
        List<Long> sourceRoleIds = queryAssignedRoleIds(sourceBrchNo);
        LOGGER.debug("源机构【{}】的已分配角色数：{}", sourceBrchNo, sourceRoleIds.size());

        // 2. 遍历每个目标机构
        for (String targetBrchNo : targetBrchNos) {
            LOGGER.info("正在处理目标机构：{}", targetBrchNo);

            // 2.1 查询目标机构的已分配角色ID列表
            List<Long> targetRoleIds = queryAssignedRoleIds(targetBrchNo);
            LOGGER.debug("目标机构【{}】的已分配角色数：{}", targetBrchNo, targetRoleIds.size());

            // 2.2 计算需要新增的角色
            List<Long> rolesToAdd = new ArrayList<>(sourceRoleIds);
            rolesToAdd.removeAll(targetRoleIds);

            // 2.3 计算需要删除的角色
            List<Long> rolesToRemove = new ArrayList<>(targetRoleIds);
            rolesToRemove.removeAll(sourceRoleIds);

            LOGGER.info("目标机构【{}】需要新增角色数：{}，需要删除角色数：{}", 
                targetBrchNo, rolesToAdd.size(), rolesToRemove.size());

            // 2.4 校验待删除的角色是否被柜员使用
            for (Long roleId : rolesToRemove) {
                String roleName = getRoleNameById(roleId);
                if (checkRoleUsedByUser(targetBrchNo, roleId)) {
                    throw new BempRuntimeException("角色【" + roleName + "】为机构下用户使用不能去除与当前机构的关系");
                }
                LOGGER.debug("角色【{}】未被机构【{}】的用户使用", roleName, targetBrchNo);
            }

            // 2.5 执行删除操作
            for (Long roleId : rolesToRemove) {
                removeBranchRoleRelation(targetBrchNo, roleId, dto.getLegalNo());
                LOGGER.info("已删除目标机构【{}】与角色【{}】的关联关系", targetBrchNo, roleId);
            }

            // 2.6 执行新增操作
            for (Long roleId : rolesToAdd) {
                addBranchRoleRelation(targetBrchNo, roleId, dto.getLegalNo());
                LOGGER.info("已新增目标机构【{}】与角色【{}】的关联关系", targetBrchNo, roleId);
            }
        }

        // INFO 级别：操作完成
        LOGGER.info("批量复制角色分配完成，源机构号：{}，共处理目标机构数：{}", sourceBrchNo, targetBrchNos.size());
    }

    /**
     * 查询指定机构的已分配角色ID列表
     *
     * @param brchNo 机构号
     * @return 已分配的角色ID列表
     */
    private List<Long> queryAssignedRoleIds(String brchNo) {
        // 通过 BranchRoleDao 查询机构角色关联表，获取该机构已分配的所有角色ID
        BranchRoleExample example = new BranchRoleExample();
        BranchRoleExample.Criteria criteria = example.createCriteria();
        criteria.andBrchNoEqualTo(brchNo);
        List<BranchRole> branchRoles = branchRoleDao.selectByExample(example);

        List<Long> roleIds = new ArrayList<>();
        if (branchRoles != null && !branchRoles.isEmpty()) {
            for (BranchRole branchRole : branchRoles) {
                roleIds.add(branchRole.getRoleId());
            }
        }
        return roleIds;
    }

    /**
     * 根据角色ID查询角色名称
     *
     * @param roleId 角色ID
     * @return 角色名称
     */
    private String getRoleNameById(Long roleId) {
        // 优化：避免重复查询数据库，将查询结果存储到变量中
        Role role = roleDao.selectById(roleId);
        return role != null ? role.getRoleName() : "未知角色";
    }

    /**
     * 检查角色是否被指定机构的柜员使用
     *
     * @param brchNo 机构号
     * @param roleId 角色ID
     * @return true-被使用，false-未被使用
     */
    private boolean checkRoleUsedByUser(String brchNo, Long roleId) {
        // 查询该机构下使用此角色的用户
        List<Long> userRoleIds = branchRoleDao.queryUserRoleWithBranchNo(brchNo);
        return userRoleIds != null && userRoleIds.contains(roleId);
    }

    /**
     * 删除机构与角色的关联关系
     *
     * @param brchNo  机构号
     * @param roleId 角色ID
     * @param legalNo 法人编号
     */
    private void removeBranchRoleRelation(String brchNo, Long roleId, String legalNo) {
        // 构造删除条件并执行删除
        BranchRoleExample example = new BranchRoleExample();
        BranchRoleExample.Criteria criteria = example.createCriteria();
        criteria.andBrchNoEqualTo(brchNo);
        criteria.andRoleIdEqualTo(roleId);
        branchRoleDao.deleteByExample(example);
    }

    /**
     * 新增机构与角色的关联关系
     *
     * @param brchNo  机构号
     * @param roleId 角色ID
     * @param legalNo 法人编号
     */
    private void addBranchRoleRelation(String brchNo, Long roleId, String legalNo) {
        // 创建新的机构角色关联记录
        BranchRole branchRole = new BranchRole();
        branchRole.setBrchNo(brchNo);
        branchRole.setLegalNo(legalNo);
        branchRole.setRoleId(roleId);
        branchRole.setReviewStatus(AuthConstant.S_ONE);
        branchRoleDao.insert(branchRole);
    }
}
```

---

## 8. 测试用例模板

```java
package com.hundsun.bemp.hnnxbank.biz.sm.service.impl.role;

import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.hnnxbank.biz.sm.dao.role.HnnxRoleDao;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.hnnxbank.biz.sm.service.role.dto.HnnxRoleDto;
import com.hundsun.bemp.sm.dao.role.BranchRoleDao;
import com.hundsun.bemp.sm.dao.role.RoleDao;
import com.hundsun.bemp.sm.dao.role.entity.BranchRole;
import com.hundsun.bemp.sm.dao.role.entity.BranchRoleExample;
import com.hundsun.bemp.sm.dao.role.entity.Role;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 角色服务测试用例
 * @author [作者姓名]
 * @date [创建日期]
 */
@RunWith(MockitoJUnitRunner.class)
public class HnnxRoleServiceImplTest {
    
    @Mock
    private RoleDao roleDao;
    
    @Mock
    private HnnxRoleDao hnnxRoleDao;
    
    @Mock
    private BranchRoleDao branchRoleDao;
    
    @InjectMocks
    private HnnxRoleServiceImpl hnnxRoleServiceImpl;

    @Before
    public void setUp() {
        // 初始化测试数据
    }

    /**
     * 测试批量复制机构角色分配
     */
    @Test
    public void testCopyAssignBranchRole() {
        // 准备测试数据
        HnnxRoleDto roleDto = new HnnxRoleDto();
        roleDto.setBrchNo("100001");
        roleDto.setLegalNo("1000");
        roleDto.setTargetBrchNos(Arrays.asList("100002", "100003"));

        BaseRequest<HnnxRoleDto> req = new BaseRequest<>();
        req.setRequestDto(roleDto);

        // 模拟查询源机构角色
        List<Long> sourceRoleIds = Arrays.asList(1L, 2L, 3L);
        when(branchRoleDao.selectByExample(any(BranchRoleExample.class)))
            .thenReturn(createBranchRoles(sourceRoleIds));

        // 模拟查询目标机构角色
        List<Long> targetRoleIds1 = Arrays.asList(1L, 2L);
        List<Long> targetRoleIds2 = Arrays.asList(1L, 2L, 4L);
        
        List<BranchRole> targetBranchRoles1 = createBranchRoles(targetRoleIds1);
        List<BranchRole> targetBranchRoles2 = createBranchRoles(targetRoleIds2);
        
        when(branchRoleDao.selectByExample(any(BranchRoleExample.class)))
            .thenReturn(targetBranchRoles1)
            .thenReturn(targetBranchRoles2);

        // 模拟查询用户角色
        List<Long> userRoleIds1 = Arrays.asList(1L, 2L);
        List<Long> userRoleIds2 = Arrays.asList(1L, 2L, 4L);
        
        when(branchRoleDao.queryUserRoleWithBranchNo("100002"))
            .thenReturn(userRoleIds1);
        when(branchRoleDao.queryUserRoleWithBranchNo("100003"))
            .thenReturn(userRoleIds2);

        // 模拟查询角色名称
        Role role1 = new Role();
        role1.setRoleId(1L);
        role1.setRoleName("角色1");
        
        Role role3 = new Role();
        role3.setRoleId(3L);
        role3.setRoleName("角色3");
        
        when(roleDao.selectById(1L)).thenReturn(role1);
        when(roleDao.selectById(3L)).thenReturn(role3);

        // 执行测试
        hnnxRoleServiceImpl.copyAssignBranchRole(req);

        // 断言结果
        // TODO: 添加断言验证
    }

    /**
     * 测试批量复制机构角色分配 - 参数为空
     */
    @Test(expected = BempRuntimeException.class)
    public void testCopyAssignBranchRoleWithNullDto() {
        BaseRequest<HnnxRoleDto> req = new BaseRequest<>();
        req.setRequestDto(null);

        hnnxRoleServiceImpl.copyAssignBranchRole(req);
    }

    /**
     * 测试批量复制机构角色分配 - 源机构号为空
     */
    @Test(expected = BempRuntimeException.class)
    public void testCopyAssignBranchRoleWithEmptySourceBrchNo() {
        HnnxRoleDto roleDto = new HnnxRoleDto();
        roleDto.setBrchNo("");
        roleDto.setLegalNo("1000");
        roleDto.setTargetBrchNos(Arrays.asList("100002"));

        BaseRequest<HnnxRoleDto> req = new BaseRequest<>();
        req.setRequestDto(roleDto);

        hnnxRoleServiceImpl.copyAssignBranchRole(req);
    }

    /**
     * 测试批量复制机构角色分配 - 目标机构号为空
     */
    @Test(expected = BempRuntimeException.class)
    public void testCopyAssignBranchRoleWithEmptyTargetBrchNos() {
        HnnxRoleDto roleDto = new HnnxRoleDto();
        roleDto.setBrchNo("100001");
        roleDto.setLegalNo("1000");
        roleDto.setTargetBrchNos(new ArrayList<>());

        BaseRequest<HnnxRoleDto> req = new BaseRequest<>();
        req.setRequestDto(roleDto);

        hnnxRoleServiceImpl.copyAssignBranchRole(req);
    }

    /**
     * 创建机构角色列表
     *
     * @param roleIds 角色ID列表
     * @return 机构角色列表
     */
    private List<BranchRole> createBranchRoles(List<Long> roleIds) {
        List<BranchRole> branchRoles = new ArrayList<>();
        for (Long roleId : roleIds) {
            BranchRole branchRole = new BranchRole();
            branchRole.setBrchNo("100001");
            branchRole.setRoleId(roleId);
            branchRoles.add(branchRole);
        }
        return branchRoles;
    }
}
```
