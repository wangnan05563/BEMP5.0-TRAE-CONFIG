<#
.SYNOPSIS
配置读取与验证工具
.DESCRIPTION
读取config/config.properties，自动检测项目根目录，验证配置有效性
#>

function Read-PropertiesFile {
    param([string]$Path)
    $result = New-Object System.Collections.Specialized.OrderedDictionary
    if (!(Test-Path $Path)) { return $result }
    foreach ($line in Get-Content $Path -Encoding UTF8) {
        $trimmed = $line.Trim()
        if ($trimmed -and !$trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
            $parts = $trimmed.Split("=", 2)
            $result[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $result
}

function Get-BuildConfig {
    $skillRoot = $env:BEMP_SKILL_ROOT
    if (!$skillRoot -and $MyInvocation.PSScriptRoot) {
        $skillRoot = Split-Path -Parent $MyInvocation.PSScriptRoot
    }
    if (!$skillRoot) {
        $skillRoot = "d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-git-maven-automation"
    }

    $configFile = Join-Path $skillRoot "config\config.properties"
    $config = Read-PropertiesFile $configFile

    $env:BEMP_SKILL_ROOT = $skillRoot

    $defaultPairs = @(
        "BUILD_TYPE=incremental",
        "BANKS_BUILD_DIRS=ext-hnnxbank",
        "BANKS_BUILD_DEPENDENCIES=true",
        "MAVEN_OPTS=-Xmx2048m -XX:MaxPermSize=512m",
        "SKIP_DIRS=node_modules,target,.idea,log,logs",
        "CONFLICT_ACTION=stop",
        "PARALLEL_BUILD=false",
        "BUILD_THREADS=4",
        "GIT_RETRY_COUNT=3",
        "ENABLE_BUILD_REPORT=true",
        "BUILD_ORDER=bom,framework,adapter,banks,served",
        "SKIP_BUILD_EXTENSIONS=.md,.txt,.gitignore,.gitattributes,.properties"
    )
    foreach ($pair in $defaultPairs) {
        $parts = $pair.Split("=", 2)
        $key = $parts[0]
        $val = $parts[1]
        if (!$config.Contains($key) -or [string]::IsNullOrWhiteSpace($config[$key])) {
            $config[$key] = $val
        }
    }

    foreach ($key in @([string[]]$config.Keys)) {
        $envVal = [Environment]::GetEnvironmentVariable($key)
        if ($envVal) { $config[$key] = $envVal }
    }

    $projectRoot = (Get-Item (Join-Path $skillRoot "..\..\..")).FullName
    $config["PROJECT_ROOT"] = $projectRoot

    $banksRoot = Join-Path $projectRoot "banks"
    if (Test-Path $banksRoot) {
        $config["BANKS_ROOT_DIR"] = $banksRoot
    }

    return $config
}

function Test-BuildConfig {
    param($Config)
    $errors = @()

    if (!$Config["PROJECT_ROOT"] -or !(Test-Path $Config["PROJECT_ROOT"])) {
        $errors += "PROJECT_ROOT invalid: $($Config['PROJECT_ROOT'])"
    }

    if ($Config["BANKS_BUILD_DIRS"] -and $Config["BANKS_ROOT_DIR"]) {
        foreach ($dir in ($Config["BANKS_BUILD_DIRS"] -split "," | ForEach-Object { $_.Trim() })) {
            if (!(Test-Path (Join-Path $Config["BANKS_ROOT_DIR"] $dir))) {
                $errors += "BANKS_BUILD_DIRS dir not found: $dir"
            }
        }
    }

    if (@("full", "incremental") -notcontains $Config["BUILD_TYPE"]) {
        $errors += "BUILD_TYPE invalid: $($Config['BUILD_TYPE'])"
    }

    if (@("stop", "warn", "skip") -notcontains $Config["CONFLICT_ACTION"]) {
        $errors += "CONFLICT_ACTION invalid: $($Config['CONFLICT_ACTION'])"
    }

    if ($Config["BUILD_ORDER"]) {
        $orderModules = ($Config["BUILD_ORDER"] -split "," | ForEach-Object { $_.Trim() })
        if ($orderModules.Count -eq 0) {
            $errors += "BUILD_ORDER is empty"
        }
    }

    return $errors
}

function Split-ConfigList {
    param([string]$Value)
    if (!$Value) { return @() }
    return $Value.Split(",", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }
}
