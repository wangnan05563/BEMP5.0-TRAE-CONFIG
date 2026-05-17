<#
.SYNOPSIS
    MySQL CLI 执行封装脚本
.DESCRIPTION
    封装mysql命令行调用，处理编码、错误检测、输出格式化
    作为MySQL MCP的备选方案，支持大数据量脚本执行
.PARAMETER SqlFile
    要执行的SQL脚本文件路径
.PARAMETER Host
    MySQL数据库主机地址
.PARAMETER Port
    MySQL数据库端口（默认3306）
.PARAMETER Database
    目标数据库名
.PARAMETER Username
    数据库用户名
.PARAMETER Password
    数据库密码
.PARAMETER Charset
    字符集（默认utf8mb4）
.PARAMETER OutputDir
    输出目录（默认为脚本同目录下的output）
.PARAMETER DryRun
    仅检查语法，不实际执行
.EXAMPLE
    .\execute-mysql-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" -Host "127.0.0.1" -Database "bemp_hnnx" -Username "root" -Password "123456"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile,

    [Parameter(Mandatory=$false)]
    [string]$Host = "127.0.0.1",

    [Parameter(Mandatory=$false)]
    [int]$Port = 3306,

    [Parameter(Mandatory=$false)]
    [string]$Database = "bemp_hnnx",

    [Parameter(Mandatory=$false)]
    [string]$Username = "root",

    [Parameter(Mandatory=$false)]
    [string]$Password = "123456",

    [Parameter(Mandatory=$false)]
    [string]$Charset = "utf8mb4",

    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

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

$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlPath) {
    Write-Log -Level "ERROR" -Message "mysql客户端未找到，请确认MySQL客户端已安装并添加到PATH"
    Write-Log -Level "INFO"  -Message "可通过以下方式安装MySQL客户端:"
    Write-Log -Level "INFO"  -Message "  1. 下载MySQL Installer: https://dev.mysql.com/downloads/installer/"
    Write-Log -Level "INFO"  -Message "  2. 安装时选择MySQL Command Line Client"
    Write-Log -Level "INFO"  -Message "  3. 将MySQL bin目录添加到系统PATH环境变量"
    exit 1
}

$encodingSetupSql = "SET NAMES $Charset;`nSET CHARACTER_SET_CLIENT = $Charset;`nSET CHARACTER_SET_CONNECTION = $Charset;`nSET CHARACTER_SET_RESULTS = $Charset;`n"

$wrappedSqlFile = Join-Path $OutputDir "_wrapped_$sqlFileName"
$wrappedContent = $encodingSetupSql + $sqlContent

Set-Content -Path $wrappedSqlFile -Value $wrappedContent -Encoding UTF8

$mysqlArgs = @(
    "-h", $Host,
    "-P", $Port,
    "-u", $Username,
    "-p$Password",
    "--default-character-set=$Charset",
    "--database=$Database",
    "--verbose",
    "--show-warnings"
)

if ($DryRun) {
    $mysqlArgs += "--dry-run"
}

Write-Log -Level "INFO" -Message "========================================="
Write-Log -Level "INFO" -Message "MySQL CLI 执行"
Write-Log -Level "INFO" -Message "  数据库: ${Host}:${Port}/${Database}"
Write-Log -Level "INFO" -Message "  用户: $Username"
Write-Log -Level "INFO" -Message "  字符集: $Charset"
Write-Log -Level "INFO" -Message "  SQL文件: $SqlFile"
if ($DryRun) {
    Write-Log -Level "WARN" -Message "  模式: DRY RUN（仅检查语法）"
}
Write-Log -Level "INFO" -Message "========================================="

$startTime = Get-Date

try {
    $process = Start-Process -FilePath "mysql" `
        -ArgumentList ($mysqlArgs + @("-e", "source $wrappedSqlFile")) `
        -NoNewWindow -Wait -PassThru `
        -RedirectStandardOutput $resultFile `
        -RedirectStandardError $errorFile

    $exitCode = $process.ExitCode
}
catch {
    try {
        Get-Content $wrappedSqlFile -Raw | & mysql @mysqlArgs 2>&1 | Out-File $resultFile -Encoding UTF8
        $exitCode = $LASTEXITCODE
    }
    catch {
        Write-Log -Level "ERROR" -Message "mysql执行异常: $_"
        exit 1
    }
}
finally {
    if (Test-Path $wrappedSqlFile) {
        Remove-Item $wrappedSqlFile -Force
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

if ($exitCode -ne 0) {
    $hasError = $true
}

if ($resultContent -match "ERROR \d{4}") {
    $hasError = $true
    $matches = [regex]::Matches($resultContent, "ERROR \d{4}.*")
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
