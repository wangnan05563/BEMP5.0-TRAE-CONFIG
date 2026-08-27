<#
.SYNOPSIS
    数据库数据导出脚本
.DESCRIPTION
    从Oracle或MySQL数据库导出数据为MD/CSV/JSON格式文件
    支持时间范围筛选、条件过滤、分页导出
.PARAMETER TableName
    要导出的表名（必填）
.PARAMETER Schema
    目标Schema/数据库名（默认BEMP_HNNX）
.PARAMETER DbType
    数据库类型 oracle/mysql（默认oracle）
.PARAMETER TimeField
    时间字段名（默认CREATE_TIME）
.PARAMETER Days
    近N天数据（默认7）
.PARAMETER WhereClause
    额外WHERE条件（可选）
.PARAMETER Format
    导出格式 md/csv/json（默认md）
.PARAMETER OutputDir
    输出目录（默认当前目录）
.PARAMETER MaxRows
    最大导出行数（默认10000）
.PARAMETER ConfigFile
    db-config.json路径，自动读取连接参数
.EXAMPLE
    .\export-db-data.ps1 -TableName "TB_BILL_INFO" -DbType "oracle" -Days 7 -Format "md"
.EXAMPLE
    .\export-db-data.ps1 -TableName "TB_BILL_INFO" -DbType "oracle" -TimeField "CREATE_TIME" -Days 30 -Format "csv" -MaxRows 5000
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$TableName,

    [Parameter(Mandatory=$false)]
    [string]$Schema = "",

    [Parameter(Mandatory=$false)]
    [ValidateSet("oracle", "mysql")]
    [string]$DbType = "oracle",

    [Parameter(Mandatory=$false)]
    [string]$TimeField = "CREATE_TIME",

    [Parameter(Mandatory=$false)]
    [int]$Days = 7,

    [Parameter(Mandatory=$false)]
    [string]$WhereClause = "",

    [Parameter(Mandatory=$false)]
    [ValidateSet("md", "csv", "json")]
    [string]$Format = "md",

    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory=$false)]
    [int]$MaxRows = 10000,

    [Parameter(Mandatory=$false)]
    [string]$ConfigFile = "",

    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

if ([string]::IsNullOrEmpty($ConfigFile)) {
    $autoConfig = Join-Path $PSScriptRoot "..\config\db-config.json"
    if (Test-Path $autoConfig) { $ConfigFile = $autoConfig }
}

if (-not [string]::IsNullOrEmpty($ConfigFile)) {
    if (-not (Test-Path $ConfigFile)) {
        Write-Host "[ERROR] Config file not found: $ConfigFile" -ForegroundColor Red
        exit 1
    }
    $config = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $dbCfg = $config.databases.$DbType
    if ($dbCfg) {
        $envCfg = $dbCfg.environments.$Environment
        if ($envCfg) {
            $Script:DbHost = Resolve-EnvPlaceholder $envCfg.host
            $Script:Port = $envCfg.port
            $Script:Username = Resolve-EnvPlaceholder $envCfg.username
            $Script:Password = Resolve-EnvPlaceholder $envCfg.password
            if ($DbType -eq "oracle") {
                $Script:ServiceName = $envCfg.serviceName
                if (-not $Schema -and $envCfg.schema) { $Schema = Resolve-EnvPlaceholder $envCfg.schema }
            } else {
                $Script:Database = Resolve-EnvPlaceholder $envCfg.database
                if (-not $Schema -and $envCfg.database) { $Schema = Resolve-EnvPlaceholder $envCfg.database }
            }
        }
    }
} else {
    Write-Host "[ERROR] No config file specified and default not found" -ForegroundColor Red
    Write-Host "Please specify config file via -ConfigFile parameter" -ForegroundColor Yellow
    exit 1
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

if ([string]::IsNullOrEmpty($OutputDir)) {
    $OutputDir = $PWD.Path
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$dateTag = Get-Date -Format "yyyyMMdd"
$baseFileName = "${TableName}_${dateTag}_近${Days}天"
$ext = switch ($Format) {
    "md"   { ".md" }
    "csv"  { ".csv" }
    "json" { ".json" }
}
$outputFile = Join-Path $OutputDir "${baseFileName}${ext}"

if ($DbType -eq "oracle") {
    $sqlplusPath = Get-Command sqlplus -ErrorAction SilentlyContinue
    if (-not $sqlplusPath) {
        Write-Log -Level "ERROR" -Message "sqlplus未找到，请确认Oracle客户端已安装并添加到PATH"
        Write-Log -Level "INFO"  -Message "替代方案：委托bemp-implementation-engineer子智能体通过Oracle MCP执行查询"
        exit 1
    }

    $env:NLS_LANG = "AMERICAN_AMERICA.AL32UTF8"
    $env:NLS_DATE_FORMAT = "YYYY-MM-DD HH24:MI:SS"

    $connectStr = "$Script:Username/$Script:Password@${Script:DbHost}:${Script:Port}/${Script:ServiceName}"

    $timeCondition = "TO_DATE(TO_CHAR($TimeField), 'YYYYMMDDHH24MISSFF') >= SYSDATE - $Days"
    $fullWhere = $timeCondition
    if (-not [string]::IsNullOrWhiteSpace($WhereClause)) {
        $fullWhere += " AND $WhereClause"
    }

    $sqlContent = @"
SET PAGESIZE 0
SET FEEDBACK OFF
SET HEADING ON
SET LINESIZE 32767
SET TRIMSPOOL ON
SET TERMOUT OFF
ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';
ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF';
ALTER SESSION SET NLS_DATE_LANGUAGE = 'AMERICAN';
ALTER SESSION SET CURRENT_SCHEMA = $Schema;
SPOOL '$outputFile'
SELECT * FROM $TableName WHERE $fullWhere AND ROWNUM <= $MaxRows ORDER BY $TimeField DESC;
SPOOL OFF
EXIT;
"@

    $tempSqlFile = Join-Path $OutputDir "_export_${TableName}.sql"
    Set-Content -Path $tempSqlFile -Value $sqlContent -Encoding UTF8

    Write-Log -Level "INFO" -Message "Oracle数据导出"
    Write-Log -Level "INFO" -Message "  表: $Schema.$TableName"
    Write-Log -Level "INFO" -Message "  条件: 近${Days}天"
    Write-Log -Level "INFO" -Message "  格式: $Format"
    Write-Log -Level "INFO" -Message "  输出: $outputFile"

    try {
        $process = Start-Process -FilePath "sqlplus" `
            -ArgumentList "-S", "-L", $connectStr, "@`"$tempSqlFile`"" `
            -NoNewWindow -Wait -PassThru

        if ($process.ExitCode -ne 0) {
            Write-Log -Level "ERROR" -Message "sqlplus执行失败，退出码: $($process.ExitCode)"
            exit 1
        }
    }
    finally {
        if (Test-Path $tempSqlFile) {
            Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
        }
    }

} else {
    $mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
    if (-not $mysqlPath) {
        Write-Log -Level "ERROR" -Message "mysql客户端未找到，请确认MySQL客户端已安装并添加到PATH"
        exit 1
    }

    $timeCondition = "$TimeField >= DATE_SUB(NOW(), INTERVAL $Days DAY)"
    $fullWhere = $timeCondition
    if (-not [string]::IsNullOrWhiteSpace($WhereClause)) {
        $fullWhere += " AND $WhereClause"
    }

    $querySql = "SELECT * FROM $TableName WHERE $fullWhere ORDER BY $TimeField DESC LIMIT $MaxRows"

    $mysqlArgs = @(
        "-h", $Script:DbHost,
        "-P", $Script:Port,
        "-u", $Script:Username,
        "-p$Script:Password",
        "--default-character-set=utf8mb4",
        "--database=$Schema",
        "-e", $querySql
    )

    Write-Log -Level "INFO" -Message "MySQL数据导出"
    Write-Log -Level "INFO" -Message "  表: $Schema.$TableName"
    Write-Log -Level "INFO" -Message "  条件: 近${Days}天"
    Write-Log -Level "INFO" -Message "  格式: $Format"
    Write-Log -Level "INFO" -Message "  输出: $outputFile"

    $result = & mysql @mysqlArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log -Level "ERROR" -Message "mysql执行失败: $result"
        exit 1
    }

    if ($Format -eq "csv") {
        $result | Out-File $outputFile -Encoding UTF8
    } else {
        $result | Out-File $outputFile -Encoding UTF8
    }
}

if (Test-Path $outputFile) {
    $fileSize = (Get-Item $outputFile).Length
    Write-Log -Level "OK" -Message "导出完成: $outputFile ($fileSize bytes)"
} else {
    Write-Log -Level "WARN" -Message "导出文件未生成，可能无符合条件的数据"
}

exit 0
