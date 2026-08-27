# JMeter Result Analysis Script (PowerShell)
# Supports CSV and XML format, auto-detection, per-label stats, distribution histogram

param(
    [Parameter(Mandatory = $true)]
    [string]$ResultFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "",

    [Parameter(Mandatory = $false)]
    [switch]$Detailed = $false,

    [Parameter(Mandatory = $false)]
    [string]$TestTarget = ""
)

$ErrorActionPreference = "Stop"
$SkillRoot = if ($PSScriptRoot) { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path } else { $PWD.Path }

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Test-ResultFile {
    if (-not (Test-Path $ResultFile)) {
        Write-Log "Result file not found: $ResultFile" "ERROR"
        return $false
    }
    Write-Log "Result file verified: $ResultFile"
    return $true
}

function Detect-JTLFormat {
    param([string]$FilePath)

    $firstLine = ""
    $reader = [System.IO.StreamReader]::new($FilePath, [System.Text.Encoding]::UTF8)
    try {
        $firstLine = $reader.ReadLine()
    } finally {
        $reader.Close()
    }

    if ($firstLine -match "^<\?xml" -or $firstLine -match "^<testResults") {
        return "xml"
    }
    if ($firstLine -match "^timeStamp" -or $firstLine -match ",.*,.*,") {
        return "csv"
    }
    return "unknown"
}

function Parse-JTLCSV {
    param([string]$FilePath)

    $results = [System.Collections.ArrayList]::new()
    $reader = [System.IO.StreamReader]::new($FilePath, [System.Text.Encoding]::UTF8)
    try {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) { return @() }

        $headerFields = $headerLine -split ','
        $colMap = @{}
        for ($i = 0; $i -lt $headerFields.Length; $i++) {
            $colMap[$headerFields[$i].Trim()] = $i
        }
        Write-Log "CSV columns: $($headerFields.Count) fields detected"

        while ($null -ne ($line = $reader.ReadLine())) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }

            $fields = $line -split ','
            if ($fields.Length -lt $headerFields.Length) { continue }

            $successStr = if ($colMap.ContainsKey('success')) { $fields[$colMap['success']] } else { "true" }
            $result = @{
                TimeStamp       = if ($colMap.ContainsKey('timeStamp')) { [long]$fields[$colMap['timeStamp']] } else { 0 }
                Elapsed         = if ($colMap.ContainsKey('elapsed')) { [int]$fields[$colMap['elapsed']] } else { 0 }
                Label           = if ($colMap.ContainsKey('label')) { $fields[$colMap['label']] } else { "" }
                ResponseCode    = if ($colMap.ContainsKey('responseCode')) { $fields[$colMap['responseCode']] } else { "" }
                ResponseMessage = if ($colMap.ContainsKey('responseMessage')) { $fields[$colMap['responseMessage']] } else { "" }
                ThreadName      = if ($colMap.ContainsKey('threadName')) { $fields[$colMap['threadName']] } else { "" }
                Success         = ($successStr -eq 'true')
                FailureMessage  = if ($colMap.ContainsKey('failureMessage')) { $fields[$colMap['failureMessage']] } else { "" }
                Bytes           = if ($colMap.ContainsKey('bytes')) { [long]$fields[$colMap['bytes']] } else { 0 }
                SentBytes       = if ($colMap.ContainsKey('sentBytes')) { [long]$fields[$colMap['sentBytes']] } else { 0 }
                URL             = if ($colMap.ContainsKey('URL')) { $fields[$colMap['URL']] } else { "" }
                Latency         = if ($colMap.ContainsKey('Latency')) { [int]$fields[$colMap['Latency']] } else { 0 }
                ConnectTime     = if ($colMap.ContainsKey('Connect')) { [int]$fields[$colMap['Connect']] } else { 0 }
                IdleTime        = if ($colMap.ContainsKey('IdleTime')) { [int]$fields[$colMap['IdleTime']] } else { 0 }
            }
            [void]$results.Add($result)
        }
    } finally {
        $reader.Close()
    }

    return @($results)
}

function Parse-JTLXML {
    param([string]$FilePath)

    [xml]$xml = Get-Content $FilePath -Encoding UTF8
    $results = [System.Collections.ArrayList]::new()

    $samples = $xml.testResults.httpSample
    if (-not $samples) { return @() }

    foreach ($sample in $samples) {
        $result = @{
            TimeStamp       = [long]$sample.ts
            Elapsed         = [int]$sample.t
            Label           = $sample.lb
            ResponseCode    = $sample.rc
            ResponseMessage = $sample.rm
            ThreadName      = $sample.tn
            Success         = ($sample.s -eq "true")
            FailureMessage  = ""
            Bytes           = [long]$sample.by
            SentBytes       = 0
            URL             = if ($sample.nu) { $sample.nu } else { "" }
            Latency         = [int]$sample.lt
            ConnectTime     = [int]$sample.ct
            IdleTime        = 0
        }
        [void]$results.Add($result)
    }

    return @($results)
}

function Get-Percentile {
    param([array]$Sorted, [double]$P)
    if ($Sorted.Count -eq 0) { return 0 }
    $idx = [math]::Min([math]::Floor($Sorted.Count * $P), $Sorted.Count - 1)
    return $Sorted[[math]::Max(0, $idx)]
}

function Calculate-Metrics {
    param([array]$Results)

    if ($Results.Count -eq 0) { return $null }

    $totalRequests = $Results.Count
    $successCount = @($Results | Where-Object { $_.Success }).Count
    $failCount = $totalRequests - $successCount
    $errorRate = [math]::Round(($failCount / $totalRequests) * 100, 2)

    $responseTimes = @($Results | ForEach-Object { $_.Elapsed } | Sort-Object)
    $avgRT = [math]::Round(($responseTimes | Measure-Object -Average).Average, 2)
    $minRT = ($responseTimes | Measure-Object -Minimum).Minimum
    $maxRT = ($responseTimes | Measure-Object -Maximum).Maximum
    $p90RT = Get-Percentile -Sorted $responseTimes -P 0.90
    $p95RT = Get-Percentile -Sorted $responseTimes -P 0.95
    $p99RT = Get-Percentile -Sorted $responseTimes -P 0.99

    $timestamps = @($Results | ForEach-Object { $_.TimeStamp })
    $startTime = ($timestamps | Measure-Object -Minimum).Minimum
    $endTime = ($timestamps | Measure-Object -Maximum).Maximum
    $durationSeconds = [math]::Round(($endTime - $startTime) / 1000, 2)

    $tps = if ($durationSeconds -gt 0) { [math]::Round($totalRequests / $durationSeconds, 2) } else { 0 }

    $totalBytes = ($Results | ForEach-Object { $_.Bytes } | Measure-Object -Sum).Sum
    $throughput = if ($durationSeconds -gt 0) { [math]::Round($totalBytes / $durationSeconds, 2) } else { 0 }

    $avgLatency = [math]::Round(($Results | ForEach-Object { $_.Latency } | Measure-Object -Average).Average, 2)
    $avgConnect = [math]::Round(($Results | ForEach-Object { $_.ConnectTime } | Measure-Object -Average).Average, 2)
    $avgIdle = [math]::Round(($Results | ForEach-Object { $_.IdleTime } | Measure-Object -Average).Average, 2)

    # Response time distribution histogram
    $dist = @{
        "0-100ms"    = @($responseTimes | Where-Object { $_ -le 100 }).Count
        "100-200ms"  = @($responseTimes | Where-Object { $_ -gt 100 -and $_ -le 200 }).Count
        "200-500ms"  = @($responseTimes | Where-Object { $_ -gt 200 -and $_ -le 500 }).Count
        "500-1000ms" = @($responseTimes | Where-Object { $_ -gt 500 -and $_ -le 1000 }).Count
        ">1000ms"    = @($responseTimes | Where-Object { $_ -gt 1000 }).Count
    }

    # Error breakdown
    $errors = @($Results | Where-Object { -not $_.Success })
    $errorByCode = @{}
    foreach ($err in $errors) {
        $code = if (-not [string]::IsNullOrEmpty($err.ResponseCode)) { $err.ResponseCode } else { "unknown" }
        if (-not $errorByCode.ContainsKey($code)) { $errorByCode[$code] = 0 }
        $errorByCode[$code]++
    }

    return @{
        TotalRequests   = $totalRequests
        SuccessCount    = $successCount
        FailCount       = $failCount
        ErrorRate       = $errorRate
        AvgResponseTime = $avgRT
        MinResponseTime = $minRT
        MaxResponseTime = $maxRT
        P90ResponseTime = $p90RT
        P95ResponseTime = $p95RT
        P99ResponseTime = $p99RT
        DurationSeconds = $durationSeconds
        TPS             = $tps
        Throughput      = $throughput
        AvgLatency      = $avgLatency
        AvgConnect      = $avgConnect
        AvgIdle         = $avgIdle
        Distribution    = $dist
        ErrorByCode     = $errorByCode
    }
}

function Calculate-LabelMetrics {
    param([array]$Results)

    $groups = $Results | Group-Object { $_['Label'] }
    $labelMetrics = [System.Collections.ArrayList]::new()

    foreach ($g in $groups) {
        $labelResults = @($g.Group)
        $rts = @($labelResults | ForEach-Object { $_.Elapsed } | Sort-Object)
        $total = $labelResults.Count
        $fails = @($labelResults | Where-Object { -not $_.Success }).Count

        $lm = @{
            Label    = $g.Name
            Count    = $total
            Avg      = [math]::Round(($rts | Measure-Object -Average).Average, 2)
            Min      = ($rts | Measure-Object -Minimum).Minimum
            Max      = ($rts | Measure-Object -Maximum).Maximum
            P95      = Get-Percentile -Sorted $rts -P 0.95
            P99      = Get-Percentile -Sorted $rts -P 0.99
            ErrorPct = [math]::Round(($fails / $total) * 100, 2)
        }
        [void]$labelMetrics.Add($lm)
    }

    return @($labelMetrics | Sort-Object { $_.Count } -Descending)
}

function Get-TPSRating {
    param([double]$TPS)
    if ($TPS -gt 1000) { return "Excellent" }
    elseif ($TPS -gt 500) { return "Good" }
    elseif ($TPS -gt 100) { return "Fair" }
    else { return "Poor" }
}

function Get-ResponseTimeRating {
    param([double]$RT)
    if ($RT -lt 200) { return "Excellent" }
    elseif ($RT -lt 500) { return "Good" }
    elseif ($RT -lt 1000) { return "Fair" }
    else { return "Poor" }
}

function Get-ErrorRateRating {
    param([double]$ErrorRate)
    if ($ErrorRate -lt 1) { return "Excellent" }
    elseif ($ErrorRate -lt 5) { return "Good" }
    elseif ($ErrorRate -lt 10) { return "Fair" }
    else { return "Poor" }
}

function Save-Baseline {
    param([hashtable]$Metrics)

    $baselineDir = Join-Path $SkillRoot "output\baselines"
    if (-not (Test-Path $baselineDir)) {
        New-Item -ItemType Directory -Path $baselineDir -Force | Out-Null
    }

    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $baselineFile = Join-Path $baselineDir "baseline-$ts.json"

    $baseline = @{
        timestamp    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        test_target  = $TestTarget
        metrics      = @{
            tps       = $Metrics.TPS
            avg_ms    = $Metrics.AvgResponseTime
            p95_ms    = $Metrics.P95ResponseTime
            p99_ms    = $Metrics.P99ResponseTime
            error_pct = $Metrics.ErrorRate
        }
    }

    $baseline | ConvertTo-Json -Depth 3 | Out-File -FilePath $baselineFile -Encoding utf8
    Write-Log "Baseline saved: $baselineFile"
    return $baselineFile
}

function Get-LatestBaseline {
    $baselineDir = Join-Path $SkillRoot "output\baselines"
    if (-not (Test-Path $baselineDir)) { return $null }

    $files = Get-ChildItem -Path $baselineDir -Filter "baseline-*.json" | Sort-Object LastWriteTime -Descending
    if ($files.Count -lt 2) { return $null }

    return Get-Content $files[1].FullName -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Compare-Baseline {
    param([hashtable]$Current, [object]$Baseline)

    if (-not $Baseline) { return "" }

    $bm = $Baseline.metrics
    $section = @"

## Baseline Comparison

| Metric | Current | Baseline | Change |
|--------|---------|----------|--------|
| TPS | $($Current.TPS) | $($bm.tps) | $(if ($bm.tps -gt 0) { "$([math]::Round(($Current.TPS - $bm.tps) / $bm.tps * 100, 1))%" } else { "N/A" }) |
| Avg RT | $($Current.AvgResponseTime) ms | $($bm.avg_ms) ms | $(if ($bm.avg_ms -gt 0) { "$([math]::Round(($Current.AvgResponseTime - $bm.avg_ms) / $bm.avg_ms * 100, 1))%" } else { "N/A" }) |
| P95 RT | $($Current.P95ResponseTime) ms | $($bm.p95_ms) ms | $(if ($bm.p95_ms -gt 0) { "$([math]::Round(($Current.P95ResponseTime - $bm.p95_ms) / $bm.p95_ms * 100, 1))%" } else { "N/A" }) |
| Error Rate | $($Current.ErrorRate)% | $($bm.error_pct)% | $(if ($bm.error_pct -gt 0) { "$([math]::Round(($Current.ErrorRate - $bm.error_pct) / $bm.error_pct * 100, 1))%" } else { "N/A" }) |

> Threshold: TPS change > +/-10% or RT change > +/-20% = **Significant**; Error rate increase > 0.1% = **Needs Attention**
"@
    return $section
}

function Generate-Report {
    param(
        [hashtable]$Metrics,
        [array]$LabelMetrics,
        [bool]$Detailed,
        [string]$BaselineSection
    )

    $target = if ($TestTarget -ne "") { $TestTarget } else { "JMeter Test" }
    $analysisTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # Distribution table
    $distRows = ""
    $total = $Metrics.TotalRequests
    foreach ($key in @("0-100ms", "100-200ms", "200-500ms", "500-1000ms", ">1000ms")) {
        $count = $Metrics.Distribution[$key]
        $pct = [math]::Round(($count / $total) * 100, 2)
        $bar = "#" * [math]::Min([math]::Round($pct / 2), 50)
        $distRows += "| $key | $count | $pct% | $bar |`n"
    }

    # Error breakdown
    $errorSection = ""
    if ($Metrics.FailCount -gt 0 -and $Metrics.ErrorByCode.Count -gt 0) {
        $errorSection = "`n## Error Breakdown`n`n| Code | Count | Percentage |`n|------|-------|------------|`n"
        foreach ($code in ($Metrics.ErrorByCode.Keys | Sort-Object)) {
            $cnt = $Metrics.ErrorByCode[$code]
            $pct = [math]::Round(($cnt / $Metrics.FailCount) * 100, 2)
            $errorSection += "| $code | $cnt | $pct% |`n"
        }
    }

    # Per-label stats
    $labelSection = ""
    if ($Detailed -and $LabelMetrics.Count -gt 0) {
        $labelSection = "`n## Per-Label Statistics`n`n| Label | Count | Avg(ms) | Min(ms) | Max(ms) | P95(ms) | P99(ms) | Error% |`n|-------|-------|---------|---------|---------|---------|---------|--------|`n"
        foreach ($lm in $LabelMetrics) {
            $labelSection += "| $($lm.Label) | $($lm.Count) | $($lm.Avg) | $($lm.Min) | $($lm.Max) | $($lm.P95) | $($lm.P99) | $($lm.ErrorPct)% |`n"
        }
    }

    # Time breakdown per SKILL.md 4.1
    $serverProcessing = [math]::Round($Metrics.AvgResponseTime - $Metrics.AvgLatency, 2)
    $firstByteWait = [math]::Round($Metrics.AvgLatency - $Metrics.AvgConnect, 2)

    $report = @"
# Performance Test Analysis Report

## Test Overview
- Target: $target
- Analysis Time: $analysisTime
- Result File: $(Split-Path $ResultFile -Leaf)
- Total Requests: $($Metrics.TotalRequests)
- Test Duration: $($Metrics.DurationSeconds)s

## Key Metrics

| Metric | Value | Rating |
|--------|-------|--------|
| TPS | $($Metrics.TPS) req/s | $(Get-TPSRating $Metrics.TPS) |
| Avg Response Time | $($Metrics.AvgResponseTime) ms | $(Get-ResponseTimeRating $Metrics.AvgResponseTime) |
| P90 Response Time | $($Metrics.P90ResponseTime) ms | $(Get-ResponseTimeRating $Metrics.P90ResponseTime) |
| P95 Response Time | $($Metrics.P95ResponseTime) ms | $(Get-ResponseTimeRating $Metrics.P95ResponseTime) |
| P99 Response Time | $($Metrics.P99ResponseTime) ms | $(Get-ResponseTimeRating $Metrics.P99ResponseTime) |
| Error Rate | $($Metrics.ErrorRate)% | $(Get-ErrorRateRating $Metrics.ErrorRate) |
| Throughput | $([math]::Round($Metrics.Throughput / 1024, 2)) KB/s | - |

## Response Time Distribution

| Range | Count | Percentage | Histogram |
|-------|-------|------------|-----------|
$distRows

## Time Breakdown

| Phase | Avg Time | Description |
|-------|----------|-------------|
| Connect (TCP) | $($Metrics.AvgConnect) ms | TCP handshake |
| First Byte Wait | $firstByteWait ms | Server processing to first byte |
| Response Transfer | $serverProcessing ms | Data transfer after first byte |
| Idle (JMeter) | $($Metrics.AvgIdle) ms | JMeter scheduling wait |

## Success Rate
- Successful: $($Metrics.SuccessCount)
- Failed: $($Metrics.FailCount)
- Error Rate: $($Metrics.ErrorRate)%
$errorSection
$labelSection$BaselineSection

---
*Report generated by JMeter Performance Test Skill*
"@

    return $report
}

function Generate-CSVSUMMARY {
    param([hashtable]$Metrics)

    return @"
metric,value
total_requests,$($Metrics.TotalRequests)
success,$($Metrics.SuccessCount)
failed,$($Metrics.FailCount)
error_rate_pct,$($Metrics.ErrorRate)
tps,$($Metrics.TPS)
avg_rt_ms,$($Metrics.AvgResponseTime)
p95_rt_ms,$($Metrics.P95ResponseTime)
p99_rt_ms,$($Metrics.P99ResponseTime)
avg_latency_ms,$($Metrics.AvgLatency)
avg_connect_ms,$($Metrics.AvgConnect)
duration_s,$($Metrics.DurationSeconds)
"@
}

function Main {
    Write-Log "=========================================="
    Write-Log "JMeter Performance Test - Result Analysis"
    Write-Log "=========================================="

    Write-Log "Step 1/4: Checking result file..."
    if (-not (Test-ResultFile)) { exit 1 }

    Write-Log "Step 2/4: Detecting format and parsing..."
    $format = Detect-JTLFormat -FilePath $ResultFile
    Write-Log "Detected format: $format"

    $results = switch ($format) {
        "csv" { Parse-JTLCSV -FilePath $ResultFile }
        "xml" { Parse-JTLXML -FilePath $ResultFile }
        default {
            Write-Log "Unknown JTL format, attempting CSV parse..." "WARN"
            Parse-JTLCSV -FilePath $ResultFile
        }
    }
    Write-Log "Parsed $($results.Count) result records"

    Write-Log "Step 3/4: Calculating performance metrics..."
    $metrics = Calculate-Metrics -Results $results

    if ($null -eq $metrics) {
        Write-Log "Analysis failed: no data" "ERROR"
        exit 1
    }

    $labelMetrics = @()
    if ($Detailed) {
        $labelMetrics = Calculate-LabelMetrics -Results $results
        Write-Log "Calculated metrics for $($labelMetrics.Count) labels"
    }

    Write-Log "TPS: $($metrics.TPS), Avg RT: $($metrics.AvgResponseTime)ms, Error: $($metrics.ErrorRate)%"

    # Save baseline
    $baselineFile = Save-Baseline -Metrics $metrics

    # Load previous baseline for comparison
    $prevBaseline = Get-LatestBaseline
    $baselineSection = Compare-Baseline -Current $metrics -Baseline $prevBaseline

    Write-Log "Step 4/4: Generating report..."

    # Report fallback chain: Markdown -> CSV summary -> Console
    $reportSaved = $false

    if ($OutputFile -ne "") {
        try {
            $report = Generate-Report -Metrics $metrics -LabelMetrics $labelMetrics -Detailed $Detailed -BaselineSection $baselineSection
            $report | Out-File -FilePath $OutputFile -Encoding utf8
            Write-Log "Markdown report saved: $OutputFile"
            $reportSaved = $true
        } catch {
            Write-Log "Markdown report failed: $_" "WARN"
        }

        if (-not $reportSaved) {
            try {
                $csvFile = $OutputFile -replace '\.md$', '.csv'
                $csvSummary = Generate-CSVSUMMARY -Metrics $metrics
                $csvSummary | Out-File -FilePath $csvFile -Encoding utf8
                Write-Log "CSV summary report saved (fallback): $csvFile" "WARN"
                $reportSaved = $true
            } catch {
                Write-Log "CSV summary report also failed: $_" "ERROR"
            }
        }
    }

    if (-not $reportSaved) {
        $report = Generate-Report -Metrics $metrics -LabelMetrics $labelMetrics -Detailed $Detailed -BaselineSection $baselineSection
        Write-Host $report
    }

    Write-Log "=========================================="
    Write-Log "Analysis complete!"
    Write-Log "=========================================="

    return @{ Metrics = $metrics; LabelMetrics = $labelMetrics; BaselineFile = $baselineFile }
}

Main