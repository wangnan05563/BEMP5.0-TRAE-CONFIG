# ============================================================================
# run-oracle-jdbc.ps1 - Oracle JDBC write channel (DML/DDL)
# Usage:
#   .\run-oracle-jdbc.ps1 -SqlFile "D:\xxx.ddl.sql"          # execute sql file
#   .\run-oracle-jdbc.ps1 -SqlFile "D:\xxx.ddl.sql" -Schema "BEMP_HNNX"
#   .\run-oracle-jdbc.ps1 -TestOnly                          # connection test
# Params priority: explicit args > db-config.json > env-config.json(environmentDefaults)
# Env placeholder ${ENV:VAR} resolved via _shared Resolve-EnvConfig.ps1
# This uses ojdbc8 JDBC to bypass ORA-28040 (old sqlplus client auth protocol).
# ============================================================================

param(
    [string]$SqlFile = "",
    [switch]$TestOnly,
    [string]$DbHost = "",
    [int]$Port = 0,
    [string]$ServiceName = "",
    [string]$Username = "",
    [string]$Password = "",
    [string]$Schema = "",
    [string]$ConfigFile = "",
    [string]$Environment = "dev",
    [int]$Timeout = 600
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. load shared env-config resolver
# ---------------------------------------------------------------------------
$sharedResolver = Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1"
if (Test-Path $sharedResolver) {
    . $sharedResolver
} else {
    Write-Host "[ERROR] shared resolver not found: $sharedResolver" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# 2. parse db-config.json (resolve ${ENV:...} placeholders)
# ---------------------------------------------------------------------------
if ([string]::IsNullOrEmpty($ConfigFile)) {
    $autoConfig = Join-Path $PSScriptRoot "..\config\db-config.json"
    if (Test-Path $autoConfig) { $ConfigFile = $autoConfig }
}

if (-not [string]::IsNullOrEmpty($ConfigFile) -and (Test-Path $ConfigFile)) {
    $config = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $oc = $config.databases.oracle.environments.$Environment
    if ($oc) {
        if ([string]::IsNullOrEmpty($DbHost) -and $oc.host) { $DbHost = Resolve-EnvPlaceholder $oc.host }
        if ($Port -eq 0 -and $oc.port) { $Port = $oc.port }
        if ([string]::IsNullOrEmpty($ServiceName) -and $oc.serviceName) { $ServiceName = Resolve-EnvPlaceholder $oc.serviceName }
        if ([string]::IsNullOrEmpty($Username) -and $oc.username) { $Username = Resolve-EnvPlaceholder $oc.username }
        if ([string]::IsNullOrEmpty($Password) -and $oc.password) { $Password = Resolve-EnvPlaceholder $oc.password }
        if ([string]::IsNullOrEmpty($Schema) -and $oc.schema) { $Schema = Resolve-EnvPlaceholder $oc.schema }
    }
}

# ---------------------------------------------------------------------------
# 3. fallback to env-config.json top-level database.oracle
# ---------------------------------------------------------------------------
if ([string]::IsNullOrEmpty($DbHost) -or [string]::IsNullOrEmpty($Username) -or [string]::IsNullOrEmpty($Password)) {
    $globalEnv = Get-GlobalEnvConfig
    if ($globalEnv -and $globalEnv.database -and $globalEnv.database.oracle) {
        $go = $globalEnv.database.oracle
        if ([string]::IsNullOrEmpty($DbHost) -and $go.host) { $DbHost = Resolve-EnvPlaceholder $go.host }
        if ($Port -eq 0 -and $go.port) { $Port = [int](Resolve-EnvPlaceholder "$($go.port)") }
        if ([string]::IsNullOrEmpty($ServiceName) -and $go.serviceName) { $ServiceName = Resolve-EnvPlaceholder $go.serviceName }
        if ([string]::IsNullOrEmpty($Username) -and $go.username) { $Username = Resolve-EnvPlaceholder $go.username }
        if ([string]::IsNullOrEmpty($Password) -and $go.password) { $Password = Resolve-EnvPlaceholder $go.password }
        if ([string]::IsNullOrEmpty($Schema) -and $go.schema) { $Schema = Resolve-EnvPlaceholder $go.schema }
    }
}

if ($Port -eq 0) { $Port = 1521 }
if ([string]::IsNullOrEmpty($ServiceName)) { $ServiceName = "orcl" }

# ---------------------------------------------------------------------------
# 4. locate ojdbc8 jar
# ---------------------------------------------------------------------------
$ojdbcCandidates = @(
    "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-served-deploy\target\bemp-served\WEB-INF\lib\ojdbc8-12.2.0.1.jar",
    "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-adapter-deploy\target\bemp-adapter\WEB-INF\lib\ojdbc8-12.2.0.1.jar",
    "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-cpesmq-deploy\target\bemp-cpesmq\WEB-INF\lib\ojdbc8-12.2.0.1.jar"
)
$ojdbc = $ojdbcCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ([string]::IsNullOrEmpty($ojdbc)) {
    Write-Host "[ERROR] ojdbc8 jar not found" -ForegroundColor Red
    exit 1
}

$javaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "D:\code\Java\jdk1.8.0_341" }
$classDir = $PSScriptRoot
$templatePath = Join-Path $classDir "OracleExec.template.java"

# ---------------------------------------------------------------------------
# 5. read SQL file content (UTF8, strip comments) and base64-encode it
# ---------------------------------------------------------------------------
$sqlB64 = ""
if (-not $TestOnly) {
    if ([string]::IsNullOrEmpty($SqlFile)) {
        Write-Host "[ERROR] -SqlFile required (or use -TestOnly)" -ForegroundColor Red
        exit 1
    }
    $absSql = [System.IO.Path]::GetFullPath($SqlFile)
    if (-not (Test-Path $absSql)) {
        Write-Host "[ERROR] SQL file not found: $absSql" -ForegroundColor Red
        exit 1
    }
    # read as UTF8; SQL scripts are saved as UTF-8
    $sqlContent = [System.IO.File]::ReadAllText($absSql, [System.Text.Encoding]::UTF8)
    # strip line comments and block comments (approximate)
    $sqlContent = [regex]::Replace($sqlContent, '(?m)^\s*--.*$', '')
    $sqlContent = [regex]::Replace($sqlContent, '(?s)/\*.*?\*/', '')
    $sqlBytes = [System.Text.Encoding]::UTF8.GetBytes($sqlContent)
    $sqlB64 = [Convert]::ToBase64String($sqlBytes)
}

# ---------------------------------------------------------------------------
# 6. build OracleExec.java from template, compile, run
# ---------------------------------------------------------------------------
if (-not (Test-Path $templatePath)) {
    Write-Host "[ERROR] template not found: $templatePath" -ForegroundColor Red
    exit 1
}
# 读取模板：用无 BOM 的 UTF-8，避免 javac 报 '\ufeff' 非法字符
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$execCode = [System.IO.File]::ReadAllText($templatePath, $utf8NoBom)
$execCode = $execCode.Replace("__USER__", ($Username -replace '\\','\\\\' -replace '"','\"'))
$execCode = $execCode.Replace("__PASS__", ($Password -replace '\\','\\\\' -replace '"','\"'))
$execCode = $execCode.Replace("__HOST__", ($DbHost -replace '\\','\\\\' -replace '"','\"'))
$execCode = $execCode.Replace("__PORT__", "$Port")
$execCode = $execCode.Replace("__SERVICE__", ($ServiceName -replace '\\','\\\\' -replace '"','\"'))
$execCode = $execCode.Replace("__SCHEMA__", ($Schema -replace '\\','\\\\' -replace '"','\"'))
$execCode = $execCode.Replace("__SQLB64__", $sqlB64)
$testOnlyVal = "false"
if ($TestOnly) { $testOnlyVal = "true" }
$execCode = $execCode.Replace("__TESTONLY__", $testOnlyVal)

$execFile = Join-Path $classDir "OracleExec.java"
# 写入无 BOM 的 UTF-8，且剥离头部可能的 BOM 字符，避免 javac 报 '\ufeff' 非法字符
$execCode = $execCode.TrimStart([char]0xFEFF)
[System.IO.File]::WriteAllText($execFile, $execCode, (New-Object System.Text.UTF8Encoding $false))

Write-Host "=== Compile JDBC executor ==="
& "$javaHome\bin\javac" -cp "$ojdbc" -encoding UTF8 $execFile -d $classDir 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] compile failed" -ForegroundColor Red
    exit 1
}

Write-Host "=== Execute SQL (testOnly=$TestOnly) ==="
& "$javaHome\bin\java" -cp "${ojdbc};${classDir}" OracleExec 2>&1

Remove-Item -Path $execFile -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $classDir "OracleExec.class") -ErrorAction SilentlyContinue