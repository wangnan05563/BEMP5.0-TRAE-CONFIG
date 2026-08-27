<#
.SYNOPSIS
    Oracle SQL*Plus 执行封装脚本
.DESCRIPTION
    封装sqlplus命令行调用，处理编码、错误检测、输出格式化
    支持单文件执行，自动设置NLS_LANG环境变量
.PARAMETER SqlFile
    要执行的SQL脚本文件路径
.PARAMETER DbHost
    Oracle数据库主机地址
.PARAMETER Port
    Oracle数据库端口（默认1521）
.PARAMETER ServiceName
    Oracle服务名
.PARAMETER Username
    数据库用户名
.PARAMETER Password
    数据库密码
.PARAMETER Schema
    目标Schema名称
.PARAMETER OutputDir
    输出目录（默认为脚本同目录下的output）
.PARAMETER Timeout
    执行超时秒数（默认300）
.PARAMETER ConfigFile
    db-config.json路径，自动读取连接参数（DbHost/Port/ServiceName/Username/Password/Schema）
.EXAMPLE
    .\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" -DbHost "10.20.18.177" -ServiceName "orcl" -Username "bemp_hnnx" -Password "123456" -Schema "BEMP_HNNX"
.EXAMPLE
    .\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" -ConfigFile "..\config\db-config.json"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile,

    [Parameter(Mandatory=$false)]
    [string]$DbHost = "",

    [Parameter(Mandatory=$false)]
    [int]$Port = 1521,

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "orcl",

    [Parameter(Mandatory=$false)]
    [string]$Username = "",

    [Parameter(Mandatory=$false)]
    [string]$Password = "",

    [Parameter(Mandatory=$false)]
    [string]$Schema = "",

    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory=$false)]
    [int]$Timeout = 300,

    [Parameter(Mandatory=$false)]
    [string]$ConfigFile = "",

    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrEmpty($ConfigFile)) {
    $autoConfig = Join-Path $PSScriptRoot "..\config\db-config.json"
    if (Test-Path $autoConfig) { $ConfigFile = $autoConfig }
}

. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

if (-not [string]::IsNullOrEmpty($ConfigFile)) {
    if (-not (Test-Path $ConfigFile)) {
        Write-Host "[ERROR] Config file not found: $ConfigFile" -ForegroundColor Red
        exit 1
    }
    $config = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $oracleCfg = $config.databases.oracle.environments.$Environment
    if ($oracleCfg) {
        if ([string]::IsNullOrEmpty($DbHost) -and $oracleCfg.host) { $DbHost = Resolve-EnvPlaceholder $oracleCfg.host }
        if ($Port -eq 1521 -and $oracleCfg.port) { $Port = $oracleCfg.port }
        if ($ServiceName -eq "orcl" -and $oracleCfg.serviceName) { $ServiceName = $oracleCfg.serviceName }
        if ([string]::IsNullOrEmpty($Username) -and $oracleCfg.username) { $Username = Resolve-EnvPlaceholder $oracleCfg.username }
        if ([string]::IsNullOrEmpty($Password) -and $oracleCfg.password) { $Password = Resolve-EnvPlaceholder $oracleCfg.password }
        if ([string]::IsNullOrEmpty($Schema) -and $oracleCfg.schema) { $Schema = Resolve-EnvPlaceholder $oracleCfg.schema }
    }
}

function Set-TerminalEncoding {
    chcp 65001 > $null 2>&1
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
}

function Write-Log {
    param([string]$Level, [string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO"  { "Cyan" }
        "OK"    { "Green" }
        "WARN"  { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

Set-TerminalEncoding

if (-not (Test-Path $SqlFile)) {
    Write-Log -Level "ERROR" -Message "SQL文件不存在: $SqlFile"
    exit 1
}

$sqlFileName = Split-Path $SqlFile -Leaf
$sqlContent = Get-Content $SqlFile -Raw -Encoding UTF8

if ([string]::IsNullOrWhiteSpace($sqlContent)) {
    Write-Log -Level "ERROR" -Message "SQL文件内容为空: $SqlFile"
    exit 1
}

if ([string]::IsNullOrEmpty($OutputDir)) {
    $OutputDir = Join-Path (Split-Path $SqlFile -Parent) "output"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$resultFile = Join-Path $OutputDir "$($sqlFileName)_$timestamp.log"
$errorFile = Join-Path $OutputDir "$($sqlFileName)_${timestamp}_err.log"

$sqlplusPath = Get-Command sqlplus -ErrorAction SilentlyContinue
if (-not $sqlplusPath) {
    Write-Log -Level "ERROR" -Message "sqlplus未找到，请确认Oracle客户端已安装并添加到PATH"
    Write-Log -Level "INFO"  -Message "可通过以下方式安装Oracle Instant Client:"
    Write-Log -Level "INFO"  -Message "  1. 下载Oracle Instant Client: https://www.oracle.com/database/technologies/instant-client.html"
    Write-Log -Level "INFO"  -Message "  2. 解压到本地目录（如 C:\oracle\instantclient_19c）"
    Write-Log -Level "INFO"  -Message "  3. 将该目录添加到系统PATH环境变量"
    exit 1
}

$env:NLS_LANG = "AMERICAN_AMERICA.AL32UTF8"
$env:NLS_DATE_FORMAT = "YYYY-MM-DD HH24:MI:SS"

$connectStr = "$Username/$Password@${DbHost}:${Port}/${ServiceName}"

$wrappedSqlFile = Join-Path $OutputDir "_wrapped_$sqlFileName"
$wrappedContent = @"
ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';
ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF';
ALTER SESSION SET NLS_DATE_LANGUAGE = 'AMERICAN';
ALTER SESSION SET NLS_LANGUAGE = 'AMERICAN';
ALTER SESSION SET CURRENT_SCHEMA = $Schema;

$sqlContent

EXIT;
"@

Set-Content -Path $wrappedSqlFile -Value $wrappedContent -Encoding UTF8

Write-Log -Level "INFO" -Message "========================================="
Write-Log -Level "INFO" -Message "Oracle SQL*Plus 执行"
Write-Log -Level "INFO" -Message "  数据库: ${DbHost}:${Port}/${ServiceName}"
Write-Log -Level "INFO" -Message "  Schema: $Schema"
Write-Log -Level "INFO" -Message "  SQL文件: $SqlFile"
Write-Log -Level "INFO" -Message "  NLS_LANG: $env:NLS_LANG"
Write-Log -Level "INFO" -Message "  超时: ${Timeout}s"
Write-Log -Level "INFO" -Message "========================================="

$startTime = Get-Date

try {
    $process = Start-Process -FilePath "sqlplus" `
        -ArgumentList "-S", "-L", $connectStr, "@`"$wrappedSqlFile`"" `
        -NoNewWindow -Wait -PassThru `
        -RedirectStandardOutput $resultFile `
        -RedirectStandardError $errorFile

    $exited = $process.WaitForExit($Timeout * 1000)
    if (-not $exited) {
        $process.Kill()
        Write-Log -Level "ERROR" -Message "sqlplus执行超时（${Timeout}s），已终止进程"
        exit 1
    }

    $exitCode = $process.ExitCode
}
catch {
    Write-Log -Level "ERROR" -Message "sqlplus执行异常: $_"
    exit 1
}
finally {
    if (Test-Path $wrappedSqlFile) {
        Remove-Item $wrappedSqlFile -Force -ErrorAction SilentlyContinue
    }
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMilliseconds

$resultContent = ""
if (Test-Path $resultFile) {
    $resultContent = Get-Content $resultFile -Raw -Encoding UTF8
}

$errorContent = ""
if (Test-Path $errorFile) {
    $errorContent = Get-Content $errorFile -Raw -Encoding UTF8
}

$hasError = $false
$errorList = @()

if ($resultContent -match "(ORA|TNS)-\d{5}") {
    $hasError = $true
    $matches = [regex]::Matches($resultContent, "(ORA|TNS)-\d{5}[:\s].*")
    foreach ($m in $matches) {
        $errorList += $m.Value.Trim()
    }
}

if ($resultContent -match "SP2-\d{4}") {
    $hasError = $true
    $matches = [regex]::Matches($resultContent, "SP2-\d{4}[:\s].*")
    foreach ($m in $matches) {
        $errorList += $m.Value.Trim()
    }
}

if (-not [string]::IsNullOrWhiteSpace($errorContent)) {
    $hasError = $true
    $errorList += $errorContent.Trim()
}

Write-Log -Level "INFO" -Message "-----------------------------------------"
Write-Log -Level "INFO" -Message "执行结果:"
Write-Log -Level "INFO" -Message "  退出码: $exitCode"
Write-Log -Level "INFO" -Message "  耗时: $([math]::Round($duration))ms"

if ($hasError) {
    Write-Log -Level "ERROR" -Message "  状态: 执行失败"
    foreach ($err in $errorList) {
        Write-Log -Level "ERROR" -Message "  错误: $err"
    }
    Write-Log -Level "INFO" -Message "  日志文件: $resultFile"
    Write-Log -Level "INFO" -Message "  错误日志: $errorFile"
    exit 1
}
else {
    Write-Log -Level "OK" -Message "  状态: 执行成功"

    if (-not [string]::IsNullOrWhiteSpace($resultContent)) {
        Write-Log -Level "INFO" -Message "  输出内容:"
        $lines = $resultContent -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        foreach ($line in $lines) {
            Write-Host "    $($line.TrimEnd())"
        }
    }
}

if (-not $hasError -and (Test-Path $resultFile)) {
    Remove-Item $resultFile -Force -ErrorAction SilentlyContinue
}
if (Test-Path $errorFile) {
    if (-not $hasError) {
        Remove-Item $errorFile -Force -ErrorAction SilentlyContinue
    }
}

exit 0
