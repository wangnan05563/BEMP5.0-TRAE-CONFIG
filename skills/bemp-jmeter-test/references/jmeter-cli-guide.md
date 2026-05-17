# JMeter CLI 使用指南

## 命令行参数说明

### 基本参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `-n` | 非 GUI 模式运行 | `jmeter -n` |
| `-t` | 指定测试计划文件 | `jmeter -n -t test.jmx` |
| `-l` | 指定结果文件 | `jmeter -n -t test.jmx -l results.jtl` |
| `-j` | 指定日志文件 | `jmeter -n -t test.jmx -j jmeter.log` |
| `-e` | 测试后生成 HTML 报告 | `jmeter -n -t test.jmx -l results.jtl -e` |
| `-o` | 指定 HTML 报告输出目录 | `jmeter -n -t test.jmx -l results.jtl -e -o reports/` |

### 参数覆盖

| 参数 | 说明 | 示例 |
|------|------|------|
| `-J<name>=<value>` | 设置 JMeter 属性 | `jmeter -Jthreads=100` |
| `-G<name>=<value>` | 设置全局属性（分布式） | `jmeter -Gthreads=100` |
| `-D<name>=<value>` | 设置系统属性 | `jmeter -Djava.net.preferIPv4Stack=true` |

### 日志控制

| 参数 | 说明 | 示例 |
|------|------|------|
| `-L<category>=<level>` | 设置日志级别 | `jmeter -Ljmeter=INFO` |
| `-LDEBUG` | 设置全局 DEBUG 级别 | `jmeter -LDEBUG` |

## 常用命令示例

### 1. 基础压测

```bash
jmeter -n -t test.jmx -l results.jtl -j jmeter.log
```

### 2. 压测 + HTML 报告

```bash
jmeter -n -t test.jmx -l results.jtl -e -o reports/
```

### 3. 带参数覆盖

```bash
jmeter -n -t test.jmx -l results.jtl -e -o reports/ -Jthreads=200 -JrampUp=20 -Jduration=600
```

### 4. 分布式压测

```bash
jmeter -n -t test.jmx -l results.jtl -R slave1,slave2,slave3
```

### 5. 指定日志级别

```bash
jmeter -n -t test.jmx -l results.jtl -j jmeter.log -LINFO
```

## JTL 结果文件格式

### CSV 格式字段

| 列名 | 说明 |
|------|------|
| timeStamp | 请求开始时间戳（毫秒） |
| elapsed | 响应时间（毫秒） |
| label | 采样器名称 |
| responseCode | 响应码（如 200） |
| responseMessage | 响应消息（如 OK） |
| threadName | 线程名称 |
| success | 是否成功（true/false） |
| failureMessage | 失败消息 |
| bytes | 接收字节数 |
| sentBytes | 发送字节数 |
| grpThreads | 当前线程组活跃线程数 |
| allThreads | 所有线程组活跃线程数 |
| URL | 请求 URL |
| Latency | 延迟时间（毫秒） |
| IdleTime | 空闲时间（毫秒） |
| Connect | 连接时间（毫秒） |

## 性能指标计算方法

### TPS (Transactions Per Second)

```
TPS = 总请求数 / 总时间（秒）
```

### 响应时间百分位

```
P90 = 排序后的第 90% 位置的值
P95 = 排序后的第 95% 位置的值
P99 = 排序后的第 99% 位置的值
```

### 错误率

```
错误率 = 失败请求数 / 总请求数 × 100%
```

### 吞吐量

```
吞吐量 = 总数据量（字节） / 总时间（秒）
```

## 最佳实践

### 1. 压测前准备

- 确认测试环境独立
- 准备充足的测试数据
- 关闭不必要的日志输出
- 禁用"查看结果树"等调试组件

### 2. 压测过程

- 从小并发开始逐步增加
- 监控服务器资源使用
- 记录每次压测的配置和结果
- 避免在同一时间段进行其他操作

### 3. 压测后分析

- 及时保存结果文件
- 生成 HTML 报告
- 计算关键性能指标
- 识别性能瓶颈
- 提出优化建议

## 常见问题排查

### Q1: 压测时内存溢出

**解决方案**:
```bash
# 修改 jmeter.bat/jmeter.sh 中的 HEAP 参数
set HEAP=-Xms512m -Xmx2048m
```

### Q2: 结果文件过大

**解决方案**:
- 使用 CSV 格式代替 XML 格式
- 禁用不必要的字段保存
- 定期清理历史结果文件

### Q3: 分布式压测连接失败

**解决方案**:
- 确认 Slave 机器防火墙已开放 1099 端口
- 确认 Master 和 Slave 的 JMeter 版本一致
- 检查网络连接是否正常
