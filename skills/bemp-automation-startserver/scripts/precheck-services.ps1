# BEMP PreCheck Environment Check
# Run from any shell: powershell.exe -ExecutionPolicy Bypass -File precheck-services.ps1

$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot
$SharedDir = Join-Path $PSScriptRoot '..\..\_shared'

# Set encoding to UTF-8 to handle Chinese text
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

. (Join-Path $SharedDir "Resolve-EnvConfig.ps1")
$globalConfig = Get-GlobalEnvConfig
$envDefaults = $globalConfig.environmentDefaults

function Get-EffectiveValue {
    param([string]$VarName)
    $val = [System.Environment]::GetEnvironmentVariable($VarName)
    if ([string]::IsNullOrEmpty($val)) {
        $prop = $envDefaults.PSObject.Properties | Where-Object { $_.Name -eq $VarName } | Select-Object -First 1
        if ($prop) { $val = $prop.Value }
    }
    return $val
}

$results = @()

function Add-Check {
    param(
        [string]$Service,
        [string]$CheckName,
        [string]$Status,
        [string]$Detail,
        [string]$Fix = ""
    )
    $script:results += [PSCustomObject]@{
        Service = $Service
        Check   = $CheckName
        Status  = $Status
        Detail  = $Detail
        Fix     = $Fix
    }
}

# General
Add-Check -Service "GLOBAL" -CheckName "BEMP_WORKSPACE_ROOT" -Status $(if (Test-Path $envDefaults.BEMP_WORKSPACE_ROOT) {"PASS"} else {"FAIL"}) -Detail $envDefaults.BEMP_WORKSPACE_ROOT
Add-Check -Service "GLOBAL" -CheckName "BANK_PROJECT_DIR" -Status "INFO" -Detail $envDefaults.BANK_PROJECT_DIR
Add-Check -Service "GLOBAL" -CheckName "BANK_MODULE_PREFIX" -Status "INFO" -Detail $envDefaults.BANK_MODULE_PREFIX

# Redis
$redisExe = Get-EffectiveValue "REDIS_EXE"
Add-Check -Service "redis" -CheckName "REDIS_EXE exists" -Status $(if (Test-Path $redisExe) {"PASS"} else {"FAIL"}) -Detail $redisExe
$redisPort = 6379
$redisListen = Get-NetTCPConnection -LocalPort $redisPort -State Listen -ErrorAction SilentlyContinue
$redisStatus = if ($redisListen) {"PASS - Running"} else {"WARN - Not running"}
Add-Check -Service "redis" -CheckName "Port 6379" -Status $(if ($redisListen) {"PASS"} else {"WARN"}) -Detail $redisStatus

# ZooKeeper
$zkExe = Get-EffectiveValue "ZOOKEEPER_EXE"
Add-Check -Service "zookeeper" -CheckName "ZOOKEEPER_EXE exists" -Status $(if (Test-Path $zkExe) {"PASS"} else {"FAIL"}) -Detail $zkExe
$javaHome = Get-EffectiveValue "JAVA_HOME"
$javaBin = Join-Path $javaHome "bin\java.exe"
Add-Check -Service "zookeeper" -CheckName "JAVA_HOME\bin\java.exe" -Status $(if (Test-Path $javaBin) {"PASS"} else {"FAIL"}) -Detail $javaBin
$zkPort = 2181
$zkListen = Get-NetTCPConnection -LocalPort $zkPort -State Listen -ErrorAction SilentlyContinue
$zkStatus = if ($zkListen) {"PASS - Running"} else {"WARN - Not running"}
Add-Check -Service "zookeeper" -CheckName "Port 2181" -Status $(if ($zkListen) {"PASS"} else {"WARN"}) -Detail $zkStatus

# Served
$servedPort = 8010
$servedListen = Get-NetTCPConnection -LocalPort $servedPort -State Listen -ErrorAction SilentlyContinue
Add-Check -Service "served" -CheckName "JAVA_HOME\bin\java.exe" -Status $(if (Test-Path $javaBin) {"PASS"} else {"FAIL"}) -Detail $javaBin
Add-Check -Service "served" -CheckName "MAVEN_PATH exists" -Status $(if (Test-Path $envDefaults.MAVEN_PATH) {"PASS"} else {"WARN"}) -Detail $envDefaults.MAVEN_PATH
$depCheck = if ($redisListen -and $zkListen) {"PASS"} else {"FAIL"}
$redisMark = if ($redisListen) {"OK"} else {"DOWN"}
$zkMark = if ($zkListen) {"OK"} else {"DOWN"}
Add-Check -Service "served" -CheckName "Dependencies (Redis+ZK)" -Status $depCheck -Detail "Redis:$redisMark ZK:$zkMark"
$warFile = "d:\code\QJ\BEMP5.0DEV\banks\$($envDefaults.BANK_PROJECT_DIR)\$($envDefaults.BANK_MODULE_PREFIX)served-deploy\target\bemp-served\webapps\bemp-served.war"
Add-Check -Service "served" -CheckName "bemp-served.war exists" -Status $(if (Test-Path $warFile) {"PASS"} else {"WARN"}) -Detail $warFile
Add-Check -Service "served" -CheckName "Port 8010" -Status $(if ($servedListen) {"WARN"} else {"PASS"}) -Detail $(if ($servedListen) {"Port occupied"} else {"Port free"})

# Adapter
$adapterPort = 8090
$adapterListen = Get-NetTCPConnection -LocalPort $adapterPort -State Listen -ErrorAction SilentlyContinue
Add-Check -Service "adapter" -CheckName "JAVA_HOME\bin\java.exe" -Status $(if (Test-Path $javaBin) {"PASS"} else {"FAIL"}) -Detail $javaBin
Add-Check -Service "adapter" -CheckName "MAVEN_PATH exists" -Status $(if (Test-Path $envDefaults.MAVEN_PATH) {"PASS"} else {"WARN"}) -Detail $envDefaults.MAVEN_PATH
Add-Check -Service "adapter" -CheckName "Dependencies (Redis+ZK)" -Status $depCheck -Detail "Redis:$redisMark ZK:$zkMark"
$warFileA = "d:\code\QJ\BEMP5.0DEV\banks\$($envDefaults.BANK_PROJECT_DIR)\$($envDefaults.BANK_MODULE_PREFIX)adapter-deploy\target\bemp-adapter\webapps\bemp-adapter.war"
Add-Check -Service "adapter" -CheckName "bemp-adapter.war exists" -Status $(if (Test-Path $warFileA) {"PASS"} else {"WARN"}) -Detail $warFileA
Add-Check -Service "adapter" -CheckName "Port 8090" -Status $(if ($adapterListen) {"WARN"} else {"PASS"}) -Detail $(if ($adapterListen) {"Port occupied"} else {"Port free"})

# Frontend
$nodePath = Get-EffectiveValue "NODE_PATH"
$nodeHome = Get-EffectiveValue "NODE_HOME"
Add-Check -Service "frontend" -CheckName "NODE_PATH exists" -Status $(if (Test-Path $nodePath) {"PASS"} else {"FAIL"}) -Detail $nodePath
$npmCmd = Join-Path $nodeHome "npm.cmd"
Add-Check -Service "frontend" -CheckName "npm.cmd exists" -Status $(if (Test-Path $npmCmd) {"PASS"} else {"FAIL"}) -Detail $npmCmd
$packageJson = "d:\code\QJ\BEMP5.0DEV\frontend\package.json"
Add-Check -Service "frontend" -CheckName "package.json exists" -Status $(if (Test-Path $packageJson) {"PASS"} else {"FAIL"}) -Detail $packageJson
$nodeModules = "d:\code\QJ\BEMP5.0DEV\frontend\node_modules"
Add-Check -Service "frontend" -CheckName "node_modules exists" -Status $(if (Test-Path $nodeModules) {"PASS"} else {"WARN"}) -Detail $nodeModules
$frontendPort = 8091
$frontendListen = Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue
Add-Check -Service "frontend" -CheckName "Port 8091" -Status $(if ($frontendListen) {"WARN"} else {"PASS"}) -Detail $(if ($frontendListen) {"Port occupied"} else {"Port free"})

# DB
$oracleHost = $envDefaults.ORACLE_HOST
$oraclePort = 1521
$tcpTest = Test-NetConnection -ComputerName $oracleHost -Port $oraclePort -InformationLevel Quiet -WarningAction SilentlyContinue
Add-Check -Service "served/adapter" -CheckName "Oracle $oracleHost`:$oraclePort" -Status $(if ($tcpTest) {"PASS"} else {"WARN"}) -Detail $(if ($tcpTest) {"Reachable"} else {"Unreachable - check VPN"})

# Output report
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BEMP PreCheck Environment Report" -ForegroundColor Cyan
Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$results | Group-Object Service | ForEach-Object {
    Write-Host "[$($_.Name)]" -ForegroundColor Yellow
    foreach ($r in $_.Group) {
        $color = switch ($r.Status) {
            "PASS" { "Green" }
            "WARN" { "Yellow" }
            "FAIL" { "Red" }
            default { "Gray" }
        }
        $fixText = if ($r.Fix) { " | Fix: $($r.Fix)" } else { "" }
        Write-Host ("  [{0,-4}] {1,-30} {2}{3}" -f $r.Status, $r.Check, $r.Detail, $fixText) -ForegroundColor $color
    }
    Write-Host ""
}

# Stats
$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$warnCount = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $results.Count
Write-Host "==========================================" -ForegroundColor Cyan
$summaryColor = if ($failCount -gt 0) {"Red"} elseif ($warnCount -gt 0) {"Yellow"} else {"Green"}
Write-Host "  Summary: PASS=$passCount  WARN=$warnCount  FAIL=$failCount  /  TOTAL=$totalCount" -ForegroundColor $summaryColor
Write-Host "==========================================" -ForegroundColor Cyan

# Save report
$reportDir = Join-Path $PSScriptRoot '..\..\..\specs\add-ecif-cust-merge-pice070701'
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir -Force | Out-Null }
$reportPath = Join-Path $reportDir "precheck-report.txt"
$results | Format-Table -AutoSize | Out-String | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host ""
Write-Host "Report saved to: $reportPath" -ForegroundColor Gray
