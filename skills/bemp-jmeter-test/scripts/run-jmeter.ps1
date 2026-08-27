# JMeter Performance Test Execution Script (PowerShell)

param(
    [Parameter(Mandatory = $true)]
    [string]$TestPlan,

    [Parameter(Mandatory = $false)]
    [int]$Threads = -1,

    [Parameter(Mandatory = $false)]
    [int]$RampUp = -1,

    [Parameter(Mandatory = $false)]
    [int]$Duration = -1,

    [Parameter(Mandatory = $false)]
    [string]$JMeterPath = "",

    [Parameter(Mandatory = $false)]
    [string]$ConfigPath = "",

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory = $false)]
    [string]$TargetHost = "",

    [Parameter(Mandatory = $false)]
    [switch]$GenerateReport = $true,

    [Parameter(Mandatory = $false)]
    [string]$Preset = ""
)

. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

$ErrorActionPreference = "Stop"
$SkillRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

$script:SkillConfig = $null

function Load-SkillConfig {
    if ($script:SkillConfig) { return $script:SkillConfig }

    $searchPaths = @(
        (Join-Path $SkillRoot "config\jmeter-config.json")
    )
    if (-not [string]::IsNullOrEmpty($ConfigPath) -and (Test-Path $ConfigPath)) {
        $searchPaths = @($ConfigPath) + $searchPaths
    }

    foreach ($p in $searchPaths) {
        if (Test-Path $p) {
            $raw = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json
            $script:SkillConfig = Resolve-AllConfigPlaceholders $raw
            Write-Log "Loaded config: $p"
            return $script:SkillConfig
        }
    }

    Write-Log "No config file found, using parameter defaults" "WARN"
    return $null
}

function Test-SafetyCheck {
    param([string]$Host)

    if ([string]::IsNullOrEmpty($Host)) { return $true }

    $blacklist = @()
    if ($cfg -and $cfg.safety -and $cfg.safety.production_blacklist) {
        $blacklist = @($cfg.safety.production_blacklist)
    }

    foreach ($pattern in $blacklist) {
        if ($Host -match $pattern) {
            Write-Log "SAFETY BLOCKED: target '$Host' matches production blacklist pattern '$pattern'" "ERROR"
            Write-Log "If this is intentional, remove the pattern from config or use -TargetHost explicitly" "ERROR"
            return $false
        }
    }

    Write-Log "Safety check passed for target: $Host"
    return $true
}

function Resolve-JMeterPath {
    param([string]$ConfigPath)

    if (-not [string]::IsNullOrEmpty($ConfigPath) -and (Test-Path $ConfigPath)) {
        return $ConfigPath
    }

    $envVal = [Environment]::GetEnvironmentVariable("JMETER_PATH")
    if (-not [string]::IsNullOrEmpty($envVal) -and (Test-Path $envVal)) {
        return $envVal
    }

    $defaults = (Get-GlobalEnvConfig).environmentDefaults
    if ($defaults -and $defaults.JMETER_PATH -and (Test-Path $defaults.JMETER_PATH)) {
        return $defaults.JMETER_PATH
    }

    $commonPaths = @(
        "D:\code\Jmeter\apache-jmeter-5.6.3\bin\jmeter.bat",
        "D:\apache-jmeter-5.6.3\bin\jmeter.bat",
        "C:\apache-jmeter-5.6.3\bin\jmeter.bat"
    )
    foreach ($p in $commonPaths) {
        if (Test-Path $p) { return $p }
    }

    return ""
}

$cfg = Load-SkillConfig

if ($Preset -ne "" -and $cfg -and $cfg.test_presets) {
    $presetObj = $cfg.test_presets.PSObject.Properties | Where-Object { $_.Name -eq $Preset } | Select-Object -First 1
    if ($presetObj) {
        $p = $presetObj.Value
        if ($Threads -eq -1 -and $p.threads) { $Threads = $p.threads }
        if ($RampUp -eq -1 -and $p.ramp_up) { $RampUp = $p.ramp_up }
        if ($Duration -eq -1 -and $p.duration) { $Duration = $p.duration }
        Write-Log "Applied preset '$Preset': threads=$Threads, rampUp=$RampUp, duration=$Duration"
    } else {
        Write-Log "Preset '$Preset' not found in config, ignoring" "WARN"
    }
}

if ([string]::IsNullOrEmpty($JMeterPath)) {
    $JMeterPath = if ($cfg -and $cfg.jmeter -and $cfg.jmeter.path) { $cfg.jmeter.path } else { "" }
}
if ([string]::IsNullOrEmpty($JMeterPath) -or -not (Test-Path $JMeterPath)) {
    $JMeterPath = Resolve-JMeterPath -ConfigPath $JMeterPath
}

if ($Threads -eq -1) {
    $Threads = if ($cfg -and $cfg.test_defaults -and $cfg.test_defaults.threads) { $cfg.test_defaults.threads } else { 100 }
}
if ($RampUp -eq -1) {
    $RampUp = if ($cfg -and $cfg.test_defaults -and $cfg.test_defaults.ramp_up) { $cfg.test_defaults.ramp_up } else { 10 }
}
if ($Duration -eq -1) {
    $Duration = if ($cfg -and $cfg.test_defaults -and $cfg.test_defaults.duration) { $cfg.test_defaults.duration } else { 300 }
}
if ([string]::IsNullOrEmpty($OutputDir)) {
    $OutputDir = if ($cfg -and $cfg.results -and $cfg.results.output_dir) {
        Get-ResolvedPath $cfg.results.output_dir $SkillRoot
    } else {
        Join-Path $SkillRoot "output"
    }
} elseif (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir = Join-Path $SkillRoot $OutputDir
}

$LogDir = Join-Path $SkillRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Test-JMeterInstallation {
    if ([string]::IsNullOrEmpty($JMeterPath) -or -not (Test-Path $JMeterPath)) {
        Write-Log "JMeter not found. Searched: config, JMETER_PATH env, common paths" "ERROR"
        Write-Log "Install JMeter or set JMETER_PATH environment variable" "ERROR"
        exit 1
    }
    Write-Log "JMeter path verified: $JMeterPath"
}

function Test-TestPlan {
    if (-not (Test-Path $TestPlan)) {
        Write-Log "Test plan not found: $TestPlan" "ERROR"
        exit 1
    }
    Write-Log "Test plan verified: $TestPlan"
}

function New-OutputDirectory {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $resultDir = Join-Path $OutputDir "results_$timestamp"
    $reportDir = Join-Path $OutputDir "reports_$timestamp"

    if (-not (Test-Path $resultDir)) {
        New-Item -ItemType Directory -Path $resultDir -Force | Out-Null
    }
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }

    return @{
        ResultDir = $resultDir
        ReportDir = $reportDir
        Timestamp = $timestamp
    }
}

function Invoke-JMeterTest {
    param(
        [string]$TestPlan,
        [string]$ResultFile,
        [string]$ReportDir,
        [int]$Threads,
        [int]$RampUp,
        [int]$Duration
    )

    $jmeterPropsFile = Join-Path $SkillRoot "config\jmeter.properties"

    $jmeterArgs = @(
        "-n",
        "-t", $TestPlan,
        "-l", $ResultFile,
        "-Jthreads=$Threads",
        "-JrampUp=$RampUp",
        "-Jduration=$Duration",
        "-j", (Join-Path $LogDir "jmeter.log"),
        "-LINFO"
    )

    if (Test-Path $jmeterPropsFile) {
        $jmeterArgs += "-p", $jmeterPropsFile
        Write-Log "Using jmeter.properties: $jmeterPropsFile"
    } else {
        $jmeterArgs += "-Jjmeter.save.saveservice.output_format=csv"
        Write-Log "jmeter.properties not found, using -J fallback for CSV format" "WARN"
    }

    if ($GenerateReport) {
        $jmeterArgs += "-e", "-o", $ReportDir
    }

    if ($cfg -and $cfg.distributed -and $cfg.distributed.enabled -eq $true) {
        $slaves = $cfg.distributed.slaves | Where-Object { -not [string]::IsNullOrEmpty($_) }
        if ($slaves.Count -gt 0) {
            foreach ($slave in $slaves) {
                $jmeterArgs += "-R", $slave
            }
            Write-Log "Distributed mode: slaves = $($slaves -join ', ')"
        }
    }

    Write-Log "Starting JMeter test..."
    Write-Log "Args: $($jmeterArgs -join ' ')"

    $stdoutLog = Join-Path $LogDir "jmeter-stdout.log"
    $stderrLog = Join-Path $LogDir "jmeter-stderr.log"

    $process = Start-Process -FilePath $JMeterPath `
                             -ArgumentList $jmeterArgs `
                             -NoNewWindow `
                             -PassThru `
                             -RedirectStandardOutput $stdoutLog `
                             -RedirectStandardError $stderrLog

    Write-Log "JMeter started, PID: $($process.Id)"
    $maxWaitSeconds = ($Duration + 600)
    Write-Log "Waiting for completion (timeout: ${maxWaitSeconds}s)..."

    $elapsed = 0
    while (-not $process.HasExited) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Log "Running... ${elapsed}s elapsed (PID: $($process.Id))"
        if ($elapsed -ge $maxWaitSeconds) {
            Write-Log "JMeter timed out after ${maxWaitSeconds}s, killing process" "ERROR"
            try { $process.Kill() } catch {}
            return 1
        }
    }

    Write-Log "JMeter finished, exit code: $($process.ExitCode)"
    return $process.ExitCode
}

function Main {
    Write-Log "=========================================="
    Write-Log "JMeter Performance Test Script"
    Write-Log "=========================================="

    Write-Log "Step 1/5: Check JMeter installation..."
    Test-JMeterInstallation

    Write-Log "Step 2/5: Check test plan..."
    Test-TestPlan

    Write-Log "Step 3/5: Safety check..."
    if (-not (Test-SafetyCheck -Host $TargetHost)) {
        Write-Log "Aborting: target address blocked by safety policy" "ERROR"
        exit 1
    }

    Write-Log "Step 4/5: Create output directory..."
    $dirs = New-OutputDirectory
    $resultFile = Join-Path $dirs.ResultDir "results.jtl"

    Write-Log "Result dir: $($dirs.ResultDir)"
    Write-Log "Report dir: $($dirs.ReportDir)"

    Write-Log "Step 5/5: Execute JMeter test..."
    Write-Log "Config: threads=$Threads, rampUp=$RampUp, duration=$Duration"

    $exitCode = Invoke-JMeterTest -TestPlan $TestPlan `
                                  -ResultFile $resultFile `
                                  -ReportDir $dirs.ReportDir `
                                  -Threads $Threads `
                                  -RampUp $RampUp `
                                  -Duration $Duration

    if ($exitCode -eq 0) {
        Write-Log "=========================================="
        Write-Log "Test completed successfully!"
        Write-Log "Results: $resultFile"
        Write-Log "Report: $($dirs.ReportDir)"
        Write-Log "=========================================="
    } else {
        Write-Log "=========================================="
        Write-Log "Test failed, exit code: $exitCode"
        Write-Log "Check logs at: $LogDir"
        Write-Log "=========================================="
    }

    return @{ ExitCode = $exitCode; ResultFile = $resultFile; ReportDir = $dirs.ReportDir }
}

Main