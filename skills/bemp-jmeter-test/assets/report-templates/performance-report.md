# 性能测试报告

## 1. 测试概述

| 项目 | 内容 |
|------|------|
| 测试目标 | ${target_name} |
| 测试时间 | ${start_time} - ${end_time} |
| 测试环境 | ${test_environment} |
| 测试工具 | JMeter ${jmeter_version} |
| 测试人员 | ${tester} |

## 2. 测试配置

| 配置项 | 值 |
|--------|-----|
| 并发用户数 | ${threads} |
| Ramp-Up 时间 | ${ramp_up} 秒 |
| 测试持续时间 | ${duration} 秒 |
| 循环次数 | ${loops} |
| 请求总数 | ${total_requests} |

## 3. 关键指标

| 指标 | 值 | 评级 |
|------|-----|------|
| TPS/QPS | ${tps} | ${tps_rating} |
| 平均响应时间 | ${avg_response_time} ms | ${avg_rt_rating} |
| P90 响应时间 | ${p90_response_time} ms | ${p90_rt_rating} |
| P95 响应时间 | ${p95_response_time} ms | ${p95_rt_rating} |
| P99 响应时间 | ${p99_response_time} ms | ${p99_rt_rating} |
| 最小响应时间 | ${min_response_time} ms | - |
| 最大响应时间 | ${max_response_time} ms | - |
| 错误率 | ${error_rate}% | ${error_rate_rating} |
| 吞吐量 | ${throughput} KB/s | - |

## 4. 响应时间分布

```
响应时间分布图
[此处插入图表]
```

| 范围 | 数量 | 占比 |
|------|------|------|
| 0-100ms | ${count_0_100} | ${percent_0_100}% |
| 100-200ms | ${count_100_200} | ${percent_100_200}% |
| 200-500ms | ${count_200_500} | ${percent_200_500}% |
| 500-1000ms | ${count_500_1000} | ${percent_500_1000}% |
| >1000ms | ${count_1000_plus} | ${percent_1000_plus}% |

## 5. 趋势分析

### 5.1 TPS 趋势

```
TPS 趋势图
[此处插入图表]
```

### 5.2 响应时间趋势

```
响应时间趋势图
[此处插入图表]
```

### 5.3 错误率趋势

```
错误率趋势图
[此处插入图表]
```

## 6. 性能瓶颈分析

### 6.1 已识别的瓶颈

| 瓶颈 | 描述 | 影响程度 |
|------|------|---------|
| ${bottleneck_1} | ${description_1} | ${impact_1} |
| ${bottleneck_2} | ${description_2} | ${impact_2} |

### 6.2 资源使用情况

| 资源 | 平均值 | 峰值 | 阈值 |
|------|--------|------|------|
| CPU 使用率 | ${cpu_avg}% | ${cpu_max}% | ${cpu_threshold}% |
| 内存使用率 | ${mem_avg}% | ${mem_max}% | ${mem_threshold}% |
| 磁盘 I/O | ${io_avg} MB/s | ${io_max} MB/s | ${io_threshold} MB/s |
| 网络带宽 | ${net_avg} Mbps | ${net_max} Mbps | ${net_threshold} Mbps |

## 7. 优化建议

| 优先级 | 建议 | 预期效果 |
|--------|------|---------|
| P0 | ${suggestion_1} | ${expected_effect_1} |
| P1 | ${suggestion_2} | ${expected_effect_2} |
| P2 | ${suggestion_3} | ${expected_effect_3} |

## 8. 历史基线对比

| 指标 | 本次值 | 上次值 | 变化 | 判定 |
|------|--------|--------|------|------|
| TPS | ${current_tps} | ${baseline_tps} | ${tps_change}% | ${tps_verdict} |
| 平均响应时间 | ${current_avg_rt} ms | ${baseline_avg_rt} ms | ${avg_rt_change}% | ${avg_rt_verdict} |
| P95 响应时间 | ${current_p95} ms | ${baseline_p95} ms | ${p95_change}% | ${p95_verdict} |
| 错误率 | ${current_error_rate}% | ${baseline_error_rate}% | ${error_rate_change}% | ${error_rate_verdict} |

趋势判定规则：TPS变化>±10%或响应时间变化>±20%标记为**显著变化**，错误率上升>0.1%标记为**需关注**。

## 9. 结论

${conclusion}

## 10. 附录

### 10.1 测试脚本配置

```
测试脚本路径：${test_script_path}
脚本版本：${script_version}
```

### 10.2 环境配置

```
服务器配置：${server_config}
数据库配置：${db_config}
中间件配置：${middleware_config}
```

---

**报告生成时间**: ${report_time}  
**报告生成工具**: JMeter 性能测试技能 v1.0
