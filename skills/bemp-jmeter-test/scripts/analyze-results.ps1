# JMeter 结果分析脚本 (PowerShell)
# 用途：解析 JTL 结果文件并计算性能指标
# 用法：.\analyze-results.ps1 -ResultFile "results.jtl"

param(
    [Parameter(Mandatory = $true)]
    [string]$ResultFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "",

    [Parameter(Mandatory = $false)]
    [switch]$Detailed = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

# 检查结果文件
function Test-ResultFile {
    if (-not (Test-Path $ResultFile)) {
        Write-Log "错误：未找到结果文件：$ResultFile" "ERROR"
        exit 1
    }
    Write-Log "结果文件验证通过：$ResultFile"
}

# 解析 JTL 文件（CSV 格式）
function Parse-JTLCSV {
    param([string]$FilePath)
    
    $results = @()
    $lines = Get-Content $FilePath
    
    # 跳过标题行
    for ($i = 1; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        $fields = $line -split ','
        
        if ($fields.Length -ge 10) {
            $result = @{
                TimeStamp      = [long]$fields[0]
                Elapsed        = [int]$fields[1]
                Label          = $fields[2]
                ResponseCode   = $fields[3]
                ResponseMessage = $fields[4]
                ThreadName     = $fields[5]
                Success        = [bool]($fields[6] -eq "true")
                FailureMessage = $fields[7]
                Bytes          = [long]$fields[8]
                SentBytes      = [long]$fields[9]
                URL            = if ($fields.Length -gt 10) { $fields[10] } else { "" }
                Latency        = if ($fields.Length -gt 11) { [int]$fields[11] } else { 0 }
                ConnectTime    = if ($fields.Length -gt 13) { [int]$fields[13] } else { 0 }
            }
            $results += $result
        }
    }
    
    return $results
}

# 计算性能指标
function Calculate-Metrics {
    param([array]$Results)
    
    if ($Results.Count -eq 0) {
        Write-Log "警告：没有结果数据可分析" "WARN"
        return $null
    }
    
    # 基本统计
    $totalRequests = $Results.Count
    $successCount = ($Results | Where-Object { $_.Success }).Count
    $failCount = $totalRequests - $successCount
    $errorRate = [math]::Round(($failCount / $totalRequests) * 100, 2)
    
    # 响应时间统计
    $responseTimes = $Results | ForEach-Object { $_.Elapsed } | Sort-Object
    $avgResponseTime = [math]::Round(($responseTimes | Measure-Object -Average).Average, 2)
    $minResponseTime = ($responseTimes | Measure-Object -Minimum).Minimum
    $maxResponseTime = ($responseTimes | Measure-Object -Maximum).Maximum
    
    # 百分位计算
    $p90Index = [math]::Floor($totalRequests * 0.90)
    $p95Index = [math]::Floor($totalRequests * 0.95)
    $p99Index = [math]::Floor($totalRequests * 0.99)
    
    $p90ResponseTime = $responseTimes[$p90Index]
    $p95ResponseTime = $responseTimes[$p95Index]
    $p99ResponseTime = $responseTimes[$p99Index]
    
    # 时间范围计算
    $startTime = $Results[0].TimeStamp
    $endTime = $Results[-1].TimeStamp
    $durationSeconds = [math]::Round(($endTime - $startTime) / 1000, 2)
    
    # TPS 计算
    $tps = if ($durationSeconds -gt 0) {
        [math]::Round($totalRequests / $durationSeconds, 2)
    } else {
        0
    }
    
    # 吞吐量计算（字节/秒）
    $totalBytes = ($Results | ForEach-Object { $_.Bytes } | Measure-Object -Sum).Sum
    $throughput = if ($durationSeconds -gt 0) {
        [math]::Round($totalBytes / $durationSeconds, 2)
    } else {
        0
    }
    
    # 延迟统计
    $latencies = $Results | ForEach-Object { $_.Latency }
    $avgLatency = [math]::Round(($latencies | Measure-Object -Average).Average, 2)
    
    return @{
        TotalRequests    = $totalRequests
        SuccessCount     = $successCount
        FailCount        = $failCount
        ErrorRate        = $errorRate
        AvgResponseTime  = $avgResponseTime
        MinResponseTime  = $minResponseTime
        MaxResponseTime  = $maxResponseTime
        P90ResponseTime  = $p90ResponseTime
        P95ResponseTime  = $p95ResponseTime
        P99ResponseTime  = $p99ResponseTime
        DurationSeconds  = $durationSeconds
        TPS              = $tps
        Throughput       = $throughput
        AvgLatency       = $avgLatency
    }
}

# 生成分析报告
function Generate-Report {
    param([hashtable]$Metrics, [bool]$Detailed)
    
    $report = @"
# JMeter 性能测试分析报告

## 测试概述
- 分析时间：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- 结果文件：$ResultFile
- 总请求数：$($Metrics.TotalRequests)

## 关键指标

| 指标 | 值 | 评级 |
|------|-----|------|
| TPS | $($Metrics.TPS) | $(Get-TPSRating $Metrics.TPS) |
| 平均响应时间 | $($Metrics.AvgResponseTime) ms | $(Get-ResponseTimeRating $Metrics.AvgResponseTime) |
| P90 响应时间 | $($Metrics.P90ResponseTime) ms | $(Get-ResponseTimeRating $Metrics.P90ResponseTime) |
| P95 响应时间 | $($Metrics.P95ResponseTime) ms | $(Get-ResponseTimeRating $Metrics.P95ResponseTime) |
| P99 响应时间 | $($Metrics.P99ResponseTime) ms | $(Get-ResponseTimeRating $Metrics.P99ResponseTime) |
| 错误率 | $($Metrics.ErrorRate)% | $(Get-ErrorRateRating $Metrics.ErrorRate) |
| 吞吐量 | $([math]::Round($Metrics.Throughput / 1024, 2)) KB/s | - |
| 平均延迟 | $($Metrics.AvgLatency) ms | - |

## 响应时间分布
- 最小值：$($Metrics.MinResponseTime) ms
- 平均值：$($Metrics.AvgResponseTime) ms
- 最大值：$($Metrics.MaxResponseTime) ms
- P90：$($Metrics.P90ResponseTime) ms
- P95：$($Metrics.P95ResponseTime) ms
- P99：$($Metrics.P99ResponseTime) ms

## 成功率
- 成功请求：$($Metrics.SuccessCount)
- 失败请求：$($Metrics.FailCount)
- 错误率：$($Metrics.ErrorRate)%
"@

    if ($Detailed) {
        $report += @"

## 详细分析

### 按标签统计
"@
        # 这里可以添加按标签分组的详细统计
    }

    return $report
}

# 评级函数
function Get-TPSRating {
    param([double]$TPS)
    if ($TPS -gt 1000) { return "优秀" }
    elseif ($TPS -gt 500) { return "良好" }
    elseif ($TPS -gt 100) { return "一般" }
    else { return "较差" }
}

function Get-ResponseTimeRating {
    param([double]$RT)
    if ($RT -lt 200) { return "优秀" }
    elseif ($RT -lt 500) { return "良好" }
    elseif ($RT -lt 1000) { return "一般" }
    else { return "较差" }
}

function Get-ErrorRateRating {
    param([double]$ErrorRate)
    if ($ErrorRate -lt 1) { return "优秀" }
    elseif ($ErrorRate -lt 5) { return "良好" }
    elseif ($ErrorRate -lt 10) { return "一般" }
    else { return "较差" }
}

# 主流程
function Main {
    Write-Log "==========================================" 
    Write-Log "JMeter 性能测试技能 - 结果分析"
    Write-Log "=========================================="
    
    # 1. 检查结果文件
    Write-Log "步骤 1/3: 检查结果文件..."
    Test-ResultFile
    
    # 2. 解析结果
    Write-Log "步骤 2/3: 解析 JTL 结果..."
    $results = Parse-JTLCSV -FilePath $ResultFile
    Write-Log "共解析 $($results.Count) 条结果记录"
    
    # 3. 计算指标
    Write-Log "步骤 3/3: 计算性能指标..."
    $metrics = Calculate-Metrics -Results $results
    
    if ($null -eq $metrics) {
        Write-Log "分析失败" "ERROR"
        exit 1
    }
    
    # 4. 生成报告
    $report = Generate-Report -Metrics $metrics -Detailed $Detailed
    
    # 5. 输出报告
    if ($OutputFile -ne "") {
        $report | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Log "报告已保存到：$OutputFile"
    } else {
        Write-Log $report
    }
    
    Write-Log "==========================================" 
    Write-Log "分析完成！"
    Write-Log "==========================================" 
}

# 执行主流程
Main
