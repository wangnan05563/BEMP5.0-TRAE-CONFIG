# 后端开发指南

> 本文档整合了后端开发规范与代码模板，是 BEMP 个性化后端开发的完整参考。

> **约束等级说明**
> - 【强制】项目专有硬约束（含代码评审门禁），必须遵守；
> - 【通用-高频】模型已具备该通用知识、但工程实测高发违反，仍按强制门禁执行——单列以区别于项目专有约束；
> - 【推荐】建议采纳，可在有依据时变通；
> - 【参考】可选优化项。
>
> 通用语言/框架规范（业界标准实践）按行业标准与项目 lint 配置执行，本文不逐条展开。

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
- [12. 最佳实践](#12-最佳实践)

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
- **目录隔离**：个性化代码必须在 `banks/ext-{BANK_CODE}` 目录下
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

**【强制】** 版本一律走 `${}` 参数：个性化版本号禁止直接写死，须在个性化主 pom 中定义对应 version 参数，各模块引用 `${xxxBank.version}` 占位

**【强制】** 二方包版本必须在个性化主 pom 中重新明确最终版本号（避免产品主 bom 变更波及个性化）

**【强制】** 生产上线版本禁止依赖二方包 snapshot 快照版（快照随时会变，构建不可复现）

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

### 2.4 个性化工程模块职责与依赖方向

**【强制】** 每个个性化行一个工程，统一放在 `banks/ext-{BANK_CODE}`，模块切分与产品一致：

| 模块 | 职责 |
|------|------|
| `{BANK_CODE}-biz-api` | 业务接口定义（微服务接口只能放这里） |
| `{BANK_CODE}-biz-as` | 业务实现（原子层 atom 也定义在这里） |
| `{BANK_CODE}-adapter-api / adapter-as` | 渠道适配层接口与实现 |
| `{BANK_CODE}-common / conf` | 公共代码与行配置 |
| `{BANK_CODE}-served-boot-deploy` | 后端服务部署包 |
| `{BANK_CODE}-cpesmq-boot-deploy` | 报文前置部署包 |
| `{BANK_CODE}-adapter-boot-deploy` | 适配工程启动部署包 |

**【强制】** 依赖方向：向下依赖，向上不可见——个性化、插件挂在产品下面，产品永远不知道个性化存在：

1. banks 个性化可以依赖原业务的 as 与 api
2. plugins 插件可以依赖原业务的 as 与 api
3. 产品基础业务**不允许**依赖 plugins 与 banks
4. 业务模块间 as 互不依赖、api 互不依赖、api 不依赖 as
5. 微服务接口（`@CloudService`）只能定义在 api 工程，不得放 as / common / fw / deploy

---

## 3. 命名约定

### 3.1 包命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 基础包 | `com.hundsun.bemp.{BANK_CODE}.biz` | `com.hundsun.bemp.{BANK_CODE}.biz.sm` |
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

### 3.3 参数命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 请求参数 | req | `BaseRequest req` |
| 响应参数 | resp | `CommonResp resp` |
| DTO 参数 | [Dto名]Dto | `HnnxRoleDto roleDto` |

### 3.4 接口编号命名规范

**【强制】** 接口编号规则：是否产品接口（一位）+方向（一位）+一级模块（两位字母）+二级模块（两位数字）+API类编号（两位数字）+方法编号（两位数字）=8位

- **第一位**：P 表示产品，B 表示个性化
- **第二位**：I 表示我方为 server 方，O 表示我方为 client 方

**产品的接口样例：**

- `PISM010101`
- `POPC010303`

**个性化的接口样例：**

- `BISM010101`
- `BOPC010303`

**【强制】** 个性化服务编码采用 B 前缀替换规则，三类编号一一对应：

| 编号类型 | 产品化 | 个性化 |
|---------|--------|--------|
| 服务方接口 @CloudFunction 功能号 | `PICE070137` | `BICE070137` |
| 调用方接口 opCode | `POPE010101` | `BOPE010101` |
| 日终/定时任务 | `TK020157` / `TT020158` | `BTK020157` / `BTT020158` |

> 编号资源未来交由资源管理系统统一获取（筹划中），当前由个性化工程按上述规则申请登记。

---

## 4. 代码风格

### 4.1 类结构规范

#### 4.1.1 Controller 基本结构

```java
package com.hundsun.bemp.{BANK_CODE}.biz.sm.controller.role;

import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.BaseServiceController;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.HnnxRoleService;
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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.impl.role;

import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.dto.HnnxRoleDto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;

/**
 * 角色服务实现（仅implements个性化接口，无需@CustomizedBean）
 * @author [作者]
 * @date [日期]
 */
@CloudComponent
public class HnnxRoleServiceImpl implements HnnxRoleService {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxRoleServiceImpl.class);

    @Autowired
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

**【通用-高频】** Controller 不包含业务逻辑

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

**【通用-高频】** DAO 不包含业务逻辑

### 6.5 DTO 设计规范

**【强制】** DTO 用于层间数据传输

**【通用-高频】** DTO 必须实现 `Serializable` 接口

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

### 7.1 异常码规范

**【强制】** 错误码采用 12 位结构（个性化在产品规则前追加银行简称如 GXNX，目的是隔离产品化/个性化冲突，便于后续错误码映射统一扩展）：

| 编码段 | 含义 | 取值说明 |
| --- | --- | --- |
| 0 / B | 规范版本 | 产品化 / 个性化 |
| BE | 固定标识 | BEMP EXCEPTION |
| 1-4 | 错误类型 | 框架 / 扩展 / 业务 / 第三方 |
| 1-2 | 错误级别 | FATAL / ERROR |
| AA-ZZ | 一级模块 | 子系统：CE→01 BE→02 |
| AA-ZZ | 二级模块 | 按总体设计 3.2 节 |
| 000-999 | 错误编码 | 按子模块分段 |

示例：产品化 `0BE320201000` = 用户不存在；个性化 `GXNX0BE320801022` = 客户账号信息不能为空

**【强制】** 错误码使用五原则：

1. 新增前全局搜 `*zh_CN.properties`，检查是否重复
2. 错误码按归属模块分文件，不许跨模块混放
3. 子系统/子模块编码分配后及时在总体设计登记锁定
4. 不许不定义错误码直接抛中文异常
5. 避免滥用“通用异常”，否则银行对标无法一一对齐

**【强制】** 个性化适配方式：

- **描述适配**（复用错误码改内容）：个性化工程新建 `{BANK_CODE}_zh_CN.ext.properties` 重新定义原错误码的描述，系统启动时优先以个性化为准，产品文件不用动；适用于只改提示文案（如“非法”→“不成功”）、不动码值。**禁止直接改产品 `zh_CN.properties`**（升级冲突 + 加载顺序不确定性）
- **key 规范适配**（换映射）：错误码转换时，产品代码会检查是否存在个性化错误码转换钩子服务，有则先走个性化转换，把产品错误码映射为行内错误码（适用版本 >= BEMP5.0V202302.01）

**【禁止】** 常见反例：首字母数字 0 写成字母 o；直接在代码中编写错误信息、未定义 i18N 错误码；过度使用 [通用异常] 错误码导致银行错误码无法一一对标；未加个性化银行标志与产品隔离（未来可能冲突）。

**【强制】** 系统间异常转码时，找不到对应中文或其他转码内容时，保留原有编码

## 8. 日志规约

### 8.1 日志框架

**【强制】** 应用中不可直接使用日志系统（Log4j、Logback）中的 API，而应依赖系统的日志框架

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger logger = LoggerFactory.getLogger(Abc.class);
```

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

#### 9.4.1 api/as 工程分层契约（接口与 DTO 归属）

**【强制】** 契约与实现分离：对外服务接口、接口 DTO、对外常量放 `{BANK_CODE}-biz-api` 工程；业务实现放 `{BANK_CODE}-biz-as` 工程。禁止把接口/DTO 留在 as 工程导致 api 工程契约缺失。

**【强制】** 接口放所属业务域的 `service` 包（`biz/{域}/service/`），类上标 `@CloudService`；实现类放 as 工程同构包路径，标 `@CloudComponent`。

**【强制】** 接口 DTO 与接口同域就近存放：`biz/{域}/dto/`；接口存在子包时放 `{域}/service/{子域}/dto/`。DTO 规范见 6.5（实现 `Serializable`）。禁止跨域混放或集中散放。

**【强制】** 接口/DTO 从 as 迁移到 api 时保持原包名不变（api 与 as 包路径同构）。as 工程已依赖 biz-api，包名不变即可保证引用方零改动。

**【强制】** 契约迁移或新增后，api 与 as 两工程必须都执行编译验证（进入 `banks/ext-{BANK_CODE}` 目录：`mvn -pl {BANK_CODE}-biz-api,{BANK_CODE}-biz-as clean compile -DskipTests -B`），确认引用方零改动编译通过。

> 经验佐证（2026-09 AntiMoney 接口拆分）：5 个接口/DTO 文件保持包名不变从 as 迁入 api 后，as 工程 168 个引用文件零改动编译通过；上次增量编译失败被证实是与并发构建共用 target 导致状态损坏，clean 全量重编译即消除——迁移验证必须以 clean 全量编译结果为准。

### 9.5 API 调用规范

**【强制】** API 中参数的定义需要统一元数据定义

**【推荐】** 数据交互一般是直接 API 调用，但 API 调用数据量不宜过大：

- 当数据包大小为 10M 内，或者记录数在 1W 条内时，建议使用 API 调用
- 当数据包大于 10M，或者记录数超过 1W 条时，建议通过文件传输或者分段接口多次调用

---

## 10. 个性化开发规范

### 10.1 个性化开发目录

**【强制】** 所有后端代码仅允许在 `banks/ext-{BANK_CODE}` 目录开发

**【强制】** 禁止在其他目录开发后端代码

### 10.2 个性化类开发

**【强制】** 检查 `banks/ext-{BANK_CODE}` 目录，若有带 `@CustomizedBean` 注解的个性化类，在其基础上新增或复写功能

**【强制】** `@CustomizedBean` 注解仅用于标注 **extends 产品实现类** 的 Service/Atom 个性化类（替换产品化Bean）

**【强制】** 仅 **implements 个性化接口** 的 Service/Atom 不需要 `@CustomizedBean`，只需 `@CloudComponent`（新建Bean）

**【强制】** 无复用个性化类时：extends产品实现类则添加 `@CustomizedBean`；仅implements个性化接口则不加

**【强制】** 类名规则：原有类名加 {BANK_CLASS_PREFIX}Bank 并继承原有类

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

### 10.6 Service 定制四步法与最小化定制

**【强制】** 定制四步法：① 继承（新建类 `extends` 产品类，命名 `{BANK_CLASS_PREFIX}×ServiceImpl`）→ ② 标记（类上加 `@CustomizedBean`，框架据此用个性化 bean 替换产品 bean）→ ③ 注册（微服务加 `@CloudComponent`；普通服务加 `@Service`）→ ④ 重写（`@Override` 重写目标方法）

**【强制】** 发布微服务时必须显式写 `implements XxxService`，即使父类已经实现——否则接口暴露不生效

**【强制】** 容器里只能有一个实现：目标产品服务不可以横向定义多次，支持纵向深度定义 孙→父→祖，最终保留 1 个实现（孙）

**最小化定制三模式（按冲突面从小到大选择）：**

| 模式 | 写法 | 适用 |
|------|------|------|
| 前置个性化 | 先加工入参，再调 `super.xxx(req)` 交给产品逻辑 | 入参预处理 |
| 后置个性化 | 先 `super.xxx(req)` 走产品逻辑，再加工出参 | 出参加工，**最常用、冲突面最小** |
| 中间钩子 | 产品先升级拆出钩子方法（如 `customDeal` 空实现），个性化只重写钩子 | 大方法局部差异 |

**【禁止】** 把产品大方法整段拷到个性化里改——一处缺陷要改两份（产品 + 个性），永远改不齐；代码块太大拆不动时，正确路径是先提产品升级拆方法，再对拆好的代码做逻辑重组

**【强制】** 未变化的代码方法不要复制到个性化类

### 10.7 Controller 定制与菜单鉴权两种写法

**【强制】** Controller 定制注意点：

- `implements` 无需填写
- 采用定制模式时保留类 `@RequestMapping` 不变——若调整 `/banks/{BANK_CODE}/...` 路径，会导致原有 vue 页面的其他请求路径也变更
- 追加的方法需要附加个性化区分标识（`{BANK_CLASS_PREFIX}` 隔离），防止未来产品功能冲突、无法使用

**【强制】** 菜单鉴权/前端挂靠两种写法：

| 方式 | 类 `@RequestMapping` | 适用场景 |
|------|---------------------|---------|
| 方式 1：基于原 Controller 定制 | **不可**追加 `/banks/{BANK_CODE}/`（否则其他未定制的请求也变了） | 原菜单微调功能，或新增少量功能 |
| 方式 2：新写一个 Controller | **必须**追加 `/banks/{BANK_CODE}/`（否则可能存在两个重名请求） | 新增 1 个新菜单，菜单下包含当前业务的增删改查等请求 |

### 10.8 jta 整体事务

**【强制】** 整体事务通过 jta 配置文件声明：配置放在服务实现工程的 `src/main/resources/jta/` 下，文件名 `transaction-config-*.xml`：

```xml
<transaction>
  <whole>
    <bean interface="…IDemoUserService" method="ageAdd2WithTa" />
  </whole>
</transaction>
```

**【强制】** 切面只扫 `*ServiceImpl.*(..)` 与 `*AtomImpl.*(..)` 两个命名——命名不合规范 = 事务静默失效（如 `demoUserServcieImpl` 拼错不报错但事务不生效），排查事务问题先核对类名

**【技巧】** 通过后台日志观察方法是否有 `useTime` 日志，有则为代理对象（切面已生效）

**【强制】** Controller 不开数据库事务，也不直接调 Atom/DAO；锁必须加在事务外，否则并发控制不住；日终批量事务不能包含 for 循环——分组小事务 + 断点续作

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

### 11.4 批量数据补全模式（防 N+1 与口径漂移）

> 参数来源：[config.json](../../config/config.json) `developmentWorkflow.batchFillPattern`（含 `maxInClauseSize` 等阈值，禁止在代码中硬编码）。触发场景见同文件 `dataAvailabilityResearch.triggers`。
>
> **事务边界与失败策略**（本节只解决"批量查询 N+1"性能问题，不解决事务/容错）：批量写入的事务边界、单条失败跳过还是整批回滚、观测要求，见 [batch-fault-tolerance-patterns.md](../../references/batch-fault-tolerance-patterns.md) 与 [batch-execution-policy.json](../../config/batch-execution-policy.json)。

**【强制】** 循环体内禁止直接调用含 DB 查询的补全方法。批量补全统一按以下范式实现：

```java
// 第一步：一次收集缺失项（名称/代码任一为空即需补全）
List<QueryDto> queries = new ArrayList<>();
for (BizCheckItem item : items) {
    if (item == null || StringUtils.isBlank(item.getBillNo())) {
        continue;
    }
    if (isMissingAny(item)) {                       // 缺失判定集中一处
        queries.add(buildQuery(item));              // 数值转换用 null-safe 工具方法，
    }                                               // 空白串视同无值，非数字格式交由统一 catch 降级
}
if (queries.isEmpty()) {
    return;
}

// 第二步：按 maxInClauseSize 分片，一次 in 查询合并结果
Map<String, ResultDto> hitIndex = new HashMap<>();
for (List<QueryDto> batch : partition(queries, MAX_IN_CLAUSE_SIZE)) {
    for (ResultDto hit : dao.queryByKeys(batch)) {
        hitIndex.putIfAbsent(keyOf(hit), hit);      // 同 key 多行仅取第一条
    }
}

// 第三步：内存回填——【强制】仅覆盖空缺项，不覆盖调用方已提供的值
for (BizCheckItem item : items) {
    ResultDto hit = findHit(hitIndex, item);
    if (hit != null && StringUtils.isBlank(item.getFieldA())) {
        item.setFieldA(hit.getFieldA());
    }
}
```

**防漂移纪律：**

1. **单条入口委托批量实现**：保留单条签名时内部必须委托批量方法（size==1），禁止另写一份单条逻辑——双份实现是口径漂移的主因
2. **仅回填空缺项**：调用方已提供的值优先于查库结果；所有补全方法共用该语义并在 javadoc 显式声明
3. **降级不阻断**：查询异常/DAO 未注入时记录 warn 后保持原值返回，不得让补全异常中断主流程
4. **注释同步义务**：取数路径、字段名、表名口径变更时，方法 javadoc 必须与实现同步更新（注释即凭证）；历史口径差异通过版本修订记录溯源而非残留在活代码注释

---

## 12. 最佳实践

### 12.1 国际化

**【强制】** 所有面向用户的文本必须使用国际化

### 12.2 菜单鉴权

**【强制】** 菜单鉴权遵循系统权限规范

### 12.3 日终规范

**【强制】** 日终任务遵循以下规范：

1. 记录执行进度
2. 记录处理数量
3. 异常数据记录日志
4. 支持重试机制

### 12.4 导出规范

**【强制】** 导出个性化涉及列名/头、SHEET 名、文件名、扩展列、数据量等要素

**【强制】** `BempHome` 目录下的 `downLoadInfo.ext.xml` 优先级高于 `downLoadInfo.xml`，个性化新增或变更部分可仅在 ext 文件中配置（不强制）

**【强制】** `show_cond` 标签配合业务参数判断，可根据参数动态适配某家行是否显示

### 12.5 队列编号规范

**【强制】** 加载机制：检索并加载所有包下 `configProp/queuetask.properties` 文件资源信息，产品化、个性化均按此规则配置

**【强制】** 编写规范：KEY 为微服务编号，VALUE 为队列任务管理菜单的下拉值；微服务入参必须为 `QueueTaskParam`

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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.controller.role;

import com.hundsun.bemp.fw.common.constant.CommonConst;
import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.BaseServiceController;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.HnnxRoleService;
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
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求参数不能为空");
        }

        // 1. 获取当前用户信息
        UserInfo userInfo = UserContext.get();
        requestDto.setRoleType(AuthConstant.S_ONE);
        requestDto.setReserve1(userInfo.getLegalNo());

        // 2. 机构角色复核模式检查
        String roleCheckMode = getParamValue(userInfo.getLegalNo(), RoleConstants.ROLE_BIND_CHECK_MODE,
                CommonConst.LOGIC_NO);
        LOGGER.info("当前复核模式：{}(1-双岗需复核，0-单岗无需复核);当前执行操作：新增机构角色[{}]", roleCheckMode, requestDto.getRoleName());

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
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求参数不能为空");
        }
        if (StringUtils.isBlank(requestDto.getId())) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "角色ID不能为空");
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
        LOGGER.info("当前复核模式：{}(1-双岗需复核，0-单岗无需复核);当前执行操作：修改机构角色[{}]", roleCheckMode, requestDto.getRoleName());

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
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求参数不能为空");
        }
        if (StringUtils.isBlank(roleDto.getBrchNo())) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "源机构号不能为空");
        }
        if (roleDto.getTargetBrchNos() == null || roleDto.getTargetBrchNos().isEmpty()) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "目标机构号列表不能为空");
        }

        // 1. 获取当前用户信息
        UserInfo userInfo = UserContext.get();
        String legalNo = userInfo.getLegalNo();

        // 2. 用户类型校验（只有总行和市办用户可以执行此操作）
        if (!AuthConstant.S_TWO.equals(userInfo.getUserType())
                && !AuthConstant.S_FOUR.equals(userInfo.getUserType())) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "无权限执行批量复制操作");
        }

        // 3. 设置操作员信息
        roleDto.setLegalNo(legalNo);
        req.setRequestDto(roleDto);

        // 4. 检查机构绑定复核模式参数
        String branchCheckMode = BranchHisServiceUtil.getParamValue(legalNo, BranchConst.BRANCH_BIND_CHECK_MODE,
                CommonConst.LOGIC_NO);
        LOGGER.info("当前复核模式：{}(1-双岗需复核，0-单岗无需复核);当前执行操作：批量复制机构角色分配", branchCheckMode);

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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.impl.role;

import com.github.pagehelper.Page;
import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.*;
import com.hundsun.bemp.fw.controller.UserContext;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.dao.role.HnnxRoleDao;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.HnnxRoleService;
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
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.dto.HnnxRoleDto;
import com.hundsun.bemp.sm.service.role.dto.*;
import com.hundsun.bemp.sm.service.role.request.QueryRoleDto;
import com.hundsun.jrescloud.rpc.annotation.CloudComponent;
import com.hundsun.jrescloud.rpc.annotation.CloudFunction;
import com.hundsun.jrescloud.rpc.annotation.CloudReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 角色服务实现（仅implements个性化接口，无需@CustomizedBean）
 * @author [作者姓名]
 * @date [创建日期]
 */
@CloudComponent
public class HnnxRoleServiceImpl implements HnnxRoleService {
    private static final Logger LOGGER = LoggerFactory.getLogger(HnnxRoleServiceImpl.class);

    @Autowired
    private RoleDao roleDao;
    
    @Autowired
    private LegalPersonVirtualDao legalPersonVirtualDao;
    
    @Autowired
    private HnnxRoleDao hnnxRoleDao;
    
    @Autowired
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
    public String checkDistributeBranchRole(BaseRequest<RoleDto> baseRequest){
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
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "源机构号不能为空");
        }
        if (targetBrchNos == null || targetBrchNos.isEmpty()) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "目标机构号列表不能为空");
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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.dto;

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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.dao.role;

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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.common.exception;

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

> **先定形态再选模板**：批量处理按 [batch-execution-policy.json](../../config/batch-execution-policy.json) 的 `modeSelection` 定性——允许部分成功且批内条目互不依赖 → `batch-tolerant`（逐条独立、单条失败跳过，见第 6.2 节批量容错模板）；同一业务动作不可分割、要求全有或全无 → `atomic`（整批一个事务、失败整批回滚，见下方第 6.1 节模板）。禁止凭技术偏好选边，判据与骨架见 [batch-fault-tolerance-patterns.md](../../references/batch-fault-tolerance-patterns.md)（B1-B7）。

### 6.1 整批原子模板（atomic，全有或全无）

```java
package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.impl;

import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.HnnxService;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.dto.HnnxDto;
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
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "请求参数不能为空");
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
            throw new BempRuntimeException(CommonErrorNoConst.BIZ_FAIL, "批量操作失败，请稍后重试");
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

### 6.2 批量容错模板（batch-tolerant，单条失败隔离）

> 适用：定时任务/日终批量、批量补全等"允许部分成功、单条脏数据不应阻断整批"场景。与 6.1 的差别是【无外层整批事务】+【单条失败只记账不中断】。观测要求（三态结果/失败明细/error 留痕/批次日期）见 [batch-execution-policy.json](../../config/batch-execution-policy.json) 的 `observability`。

```java
    // 关键：循环体内【不加整批事务】；单条处理必须幂等（重跑不得重复追加）
    int successCount = 0;
    int failCount = 0;
    StringBuilder failDetails = new StringBuilder();
    for ({批内条目} candidate : candidates) {
        try {
            upsert(candidate);                                  // 单条独立处理
            successCount++;
        } catch (Exception e) {
            failCount++;
            String detail = keyOf(candidate) + "：" + e.getMessage();   // 明细含业务键+原因
            failDetails.append(detail).append("；");
            LOGGER.error("批量处理：单条失败，继续下一条：{}", detail, e);
            // 不 throw —— 单条脏数据不应阻断整批
        }
    }
    LOGGER.info("统计报告：日期{}，处理总数{}，成功{}，失败{}，耗时{}ms，结果状态：{}；失败明细：{}",
            batchDate, candidates.size(), successCount, failCount,
            System.currentTimeMillis() - startTime,
            resultState(successCount, failCount),
            failDetails.length() > 0 ? failDetails : "无");
```

---

## 7. 日志处理模板

```java
package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.impl;

import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.HnnxService;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.dto.HnnxDto;
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
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "源机构号不能为空");
        }
        if (targetBrchNos == null || targetBrchNos.isEmpty()) {
            throw new BempRuntimeException(CommonErrorNoConst.VALID_FAIL, "目标机构号列表不能为空");
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
                    throw new BempRuntimeException(CommonErrorNoConst.BIZ_FAIL, "角色【" + roleName + "】为机构下用户使用不能去除与当前机构的关系");
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
package com.hundsun.bemp.{BANK_CODE}.biz.sm.service.impl.role;

import com.hundsun.bemp.fw.common.constant.CommonErrorNoConst;
import com.hundsun.bemp.fw.common.exception.BempRuntimeException;
import com.hundsun.bemp.fw.common.pojo.BaseRequest;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.dao.role.HnnxRoleDao;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.HnnxRoleService;
import com.hundsun.bemp.{BANK_CODE}.biz.sm.service.role.dto.HnnxRoleDto;
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
