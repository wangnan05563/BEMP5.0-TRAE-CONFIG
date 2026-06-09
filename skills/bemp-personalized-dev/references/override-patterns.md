# BEMP 子类Override模式知识库

> **配置变量**：本文件中银行相关变量均引用 `_shared/env-config.json`：`{BANK_CODE}` → `${ENV:BANK_CODE}`，`{BANK_CLASS_PREFIX}` → `${ENV:BANK_CLASS_PREFIX}`，`{BANK_NAME}` → `${ENV:BANK_NAME}`。切换银行时仅需修改 env-config.json。

## 模式1：响应DTO字段传递

### 问题描述
子类override父类方法时，需要将自定义校验信息传递到响应DTO。但父类方法通常创建新的响应DTO对象，不会自动携带requestDto的扩展字段。

### 错误方式
```java
@Override
public ResDto someMethod(BaseRequest<ReqDto> baseRequest) {
    // 自定义校验
    checkSomething(baseRequest);
    // 将信息设置在requestDto上 ← 错误！super返回的ResDto不会携带这个值
    baseRequest.getRequestDto().setReserve1(warnMsg);
    return super.someMethod(baseRequest);
}
```

### 正确方式
```java
@Override
public ResDto someMethod(BaseRequest<ReqDto> baseRequest) {
    // 自定义校验，返回警告信息
    String warnMsg = checkSomething(baseRequest);
    // 调用父类方法
    ResDto resDto = super.someMethod(baseRequest);
    // 在super返回后，将信息设置到响应DTO上 ← 正确！
    if (warnMsg != null && resDto != null) {
        resDto.setSomeField(warnMsg);
    }
    return resDto;
}
```

### 判断逻辑
1. 如果父类方法创建新的响应DTO对象 → 必须在super返回后设置
2. 如果父类方法复用传入的DTO → 可以在super调用前设置
3. 如果不确定 → 读取父类源码确认

## 模式2：Bean注入方式选择

### @Autowired vs @CloudReference

| 场景 | 注入方式 | 原因 |
|------|---------|------|
| 同模块内的Atom/Service | @Autowired | 同一Spring容器内直接注入 |
| 跨模块的Service | @CloudReference | 需要通过Dubbo/SOFA RPC远程调用 |
| 同模块但不同包的Atom | @Autowired | 仍在同一容器内 |

### 判断逻辑
1. 检查被注入类的包路径是否与当前类在同一模块
2. 同模块 → @Autowired
3. 跨模块 → @CloudReference
4. 如果@Autowired注入失败，检查是否缺少@ComponentScan配置

## 模式3：编译→部署→重启闭环

### 问题描述
修改Java源代码后，仅编译不够，还需要将class文件部署到WAR包并重启服务。

### 完整步骤
1. javac编译源文件 → target/classes/
2. 复制class文件 → WAR包的WEB-INF/classes/
3. 重启SpringBoot服务

### 常见遗漏
- 只编译未复制class → 旧代码仍在运行
- 只复制class未重启 → JVM仍加载旧class
- 只重启未编译 → 运行的还是旧代码

### 自动化检查
编译后自动比较源文件和class文件的修改时间：
- 如果源文件比class新 → 需要重新编译
- 如果target/classes比WAR/classes新 → 需要复制
- 如果class已更新但服务未重启 → 需要重启
