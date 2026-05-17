# JMeter Result Analysis Script (PowerShell)
# Supports both CSV and XML format result files

param(
    [Parameter(Mandatory = $true)]
    [string]$ResultFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "",

    [Parameter(Mandatory = $false)]
    [string]$ExpectedDuration = ""
)

$ErrorActionPreference = "Stop"

function Parse-CSVResults {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $lines = $content -split "`n" | Where-Object { $_ -match '\S' }
    
    if ($lines.Count -lt 2) {
        throw "CSV file has no data"
    }
    
    $header = $lines[0] -split ','
    $results = @()
    
    for ($i = 1; $i -lt $lines.Count; $i++) {
        $values = $lines[$i] -split ','
        if ($values.Count -ge $header.Count) {
            $record = @{}
            for ($j = 0; $j -lt $header.Count; $j++) {
                $record[$header[$j]] = $values[$j]
            }
            
            $results += @{
                TimeStamp    = [long]$record['timeStamp']
                Elapsed      = [int]$record['elapsed']
                Label        = $record['label']
                ResponseCode = $record['responseCode']
                Success      = ($record['success'] -eq 'true')
                Bytes        = [int]$record['bytes']
                ThreadName   = $record['threadName']
            }
        }
    }
    
    return $results
}

function Parse-XMLResults {
    param([string]$FilePath)
    
    [xml]$xml = Get-Content $FilePath
    $samples = $xml.testResults.httpSample
    
    $results = @()
    foreach ($sample in $samples) {
        $results += @{
            TimeStamp    = [long]$sample.ts
            Elapsed      = [int]$sample.t
            Label        = $sample.lb
            ResponseCode = $sample.rc
            Success      = [bool]($sample.s -eq "true")
            Bytes        = [int]$sample.by
            ThreadName   = $sample.tn
        }
    }
    
    return $results
}

function Calculate-Metrics {
    param(
        [array]$Results,
        [string]$ExpectedDuration = ""
    )
    
    if ($Results.Count -eq 0) {
        return $null
    }
    
    $totalRequests = $Results.Count
    $successCount = ($Results | Where-Object { $_.Success }).Count
    $failCount = $totalRequests - $successCount
    $errorRate = if ($totalRequests -gt 0) { [math]::Round(($failCount / $totalRequests) * 100, 2) } else { 0 }
    
    $responseTimes = $Results | ForEach-Object { $_.Elapsed } | Sort-Object
    $avgResponseTime = [math]::Round(($responseTimes | Measure-Object -Average).Average, 2)
    $minResponseTime = ($responseTimes | Measure-Object -Minimum).Minimum
    $maxResponseTime = ($responseTimes | Measure-Object -Maximum).Maximum
    
    $totalRequestsForCalc = if ($responseTimes.Count -gt 0) { $responseTimes.Count } else { 1 }
    $p90Index = [math]::Floor($totalRequestsForCalc * 0.90)
    $p95Index = [math]::Floor($totalRequestsForCalc * 0.95)
    $p99Index = [math]::Floor($totalRequestsForCalc * 0.99)
    
    $p90ResponseTime = if ($p90Index -gt 0 -and $p90Index -lt $responseTimes.Count) { $responseTimes[$p90Index] } else { $maxResponseTime }
    $p95ResponseTime = if ($p95Index -gt 0 -and $p95Index -lt $responseTimes.Count) { $responseTimes[$p95Index] } else { $maxResponseTime }
    $p99ResponseTime = if ($p99Index -gt 0 -and $p99Index -lt $responseTimes.Count) { $responseTimes[$p99Index] } else { $maxResponseTime }
    
    $sortedByTime = $Results | Sort-Object TimeStamp
    $startTime = $sortedByTime[0].TimeStamp
    $endTime = ($sortedByTime | Select-Object -Last 1).TimeStamp
    $durationMs = $endTime - $startTime
    $durationSeconds = [math]::Round($durationMs / 1000, 2)
    
    if ($durationSeconds -le 0 -or $durationSeconds -gt 3600) {
        $durationSeconds = if ($ExpectedDuration -ne "") { [double]$ExpectedDuration } else { 20 }
    }
    
    $tps = if ($durationSeconds -gt 0) { [math]::Round($totalRequests / $durationSeconds, 2) } else { 0 }
    
    $totalBytes = ($Results | ForEach-Object { $_.Bytes } | Measure-Object -Sum).Sum
    $throughput = if ($durationSeconds -gt 0) { [math]::Round($totalBytes / $durationSeconds, 2) } else { 0 }
    
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
    }
}

function Get-Rating {
    param([double]$Value, [string]$Type)
    if ($Type -eq "TPS") {
        if ($Value -gt 100) { return "Excellent" }
        elseif ($Value -gt 50) { return "Good" }
        elseif ($Value -gt 10) { return "Fair" }
        else { return "Poor" }
    } elseif ($Type -eq "RT") {
        if ($Value -lt 200) { return "Excellent" }
        elseif ($Value -lt 500) { return "Good" }
        elseif ($Value -lt 1000) { return "Fair" }
        else { return "Poor" }
    } else {
        if ($Value -lt 1) { return "Excellent" }
        elseif ($Value -lt 5) { return "Good" }
        elseif ($Value -lt 10) { return "Fair" }
        else { return "Poor" }
    }
}

$fileExt = [System.IO.Path]::GetExtension($ResultFile).ToLower()
$firstLine = (Get-Content $ResultFile -TotalCount 1)

Write-Host "==========================================" 
Write-Host "JMeter Performance Test - Result Analysis"
Write-Host "=========================================="

Write-Host "Step 1/3: Loading result file..."
if ($fileExt -eq ".csv" -or $firstLine -match "^timeStamp") {
    Write-Host "Detected CSV format"
    $results = Parse-CSVResults -FilePath $ResultFile
} elseif ($fileExt -eq ".jtl" -or $fileExt -eq ".xml") {
    Write-Host "Detected XML format"
    $results = Parse-XMLResults -FilePath $ResultFile
} else {
    throw "Unsupported file format: $fileExt"
}
Write-Host "Parsed $($results.Count) result records"

Write-Host "Step 2/3: Calculating metrics..."
$metrics = Calculate-Metrics -Results $results -ExpectedDuration $ExpectedDuration

Write-Host "==========================================" 
Write-Host "          Performance Test Report"
Write-Host "=========================================="
Write-Host "Test Target: https://www.baidu.com"
Write-Host "Config: 20 threads, 20 seconds duration"
Write-Host "=========================================="

Write-Host ""
Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|                      Key Metrics                            |" -ForegroundColor Cyan
Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ("| TPS:                 " + [string]::Format("{0,10:N2}", $metrics.TPS) + " req/s    " + (Get-Rating $metrics.TPS "TPS") + "         |") -ForegroundColor Yellow
Write-Host ("| Avg Response Time:  " + [string]::Format("{0,10:N2}", $metrics.AvgResponseTime) + " ms       " + (Get-Rating $metrics.AvgResponseTime "RT") + "         |") -ForegroundColor Yellow
Write-Host ("| P90 Response Time:  " + [string]::Format("{0,10:N0}", $metrics.P90ResponseTime) + " ms       -           |")
Write-Host ("| P95 Response Time:  " + [string]::Format("{0,10:N0}", $metrics.P95ResponseTime) + " ms       -           |")
Write-Host ("| P99 Response Time:  " + [string]::Format("{0,10:N0}", $metrics.P99ResponseTime) + " ms       -           |")
Write-Host ("| Min Response Time:  " + [string]::Format("{0,10:N0}", $metrics.MinResponseTime) + " ms       -           |")
Write-Host ("| Max Response Time:  " + [string]::Format("{0,10:N0}", $metrics.MaxResponseTime) + " ms       -           |")
Write-Host ("| Error Rate:         " + [string]::Format("{0,10:N2}", $metrics.ErrorRate) + " %        " + (Get-Rating $metrics.ErrorRate "ERR") + "         |") -ForegroundColor Yellow
Write-Host ("| Throughput:         " + [string]::Format("{0,10:N2}", $metrics.Throughput / 1024) + " KB/s     -           |")
Write-Host ("| Total Requests:    " + [string]::Format("{0,10:N0}", $metrics.TotalRequests) + "          -           |")
Write-Host ("| Duration:          " + [string]::Format("{0,10:N2}", $metrics.DurationSeconds) + " seconds   -           |")
Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan

$report = @"
# Baidu Homepage Performance Test Report

## Test Overview
- Test Target: https://www.baidu.com
- Test Time: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- Config: 20 threads, 5s ramp-up, 20s duration
- Result File: $([System.IO.Path]::GetFileName($ResultFile))

## Key Metrics

| Metric | Value | Rating |
|--------|-------|--------|
| TPS | $($metrics.TPS) | $(Get-Rating $metrics.TPS "TPS") |
| Avg Response Time | $($metrics.AvgResponseTime) ms | $(Get-Rating $metrics.AvgResponseTime "RT") |
| P90 Response Time | $($metrics.P90ResponseTime) ms | - |
| P95 Response Time | $($metrics.P95ResponseTime) ms | - |
| P99 Response Time | $($metrics.P99ResponseTime) ms | - |
| Min Response Time | $($metrics.MinResponseTime) ms | - |
| Max Response Time | $($metrics.MaxResponseTime) ms | - |
| Error Rate | $($metrics.ErrorRate)% | $(Get-Rating $metrics.ErrorRate "ERR") |
| Throughput | $([math]::Round($metrics.Throughput / 1024, 2)) KB/s | - |

## Statistics
- Total Requests: $($metrics.TotalRequests)
- Success: $($metrics.SuccessCount)
- Failed: $($metrics.FailCount)
- Duration: $($metrics.DurationSeconds) seconds
"@

if ($OutputFile -ne "") {
    $report | Out-File -FilePath $OutputFile -Encoding UTF8
    Write-Host "Report saved to: $OutputFile"
}

Write-Host "=========================================="
Write-Host "Analysis Complete!"
