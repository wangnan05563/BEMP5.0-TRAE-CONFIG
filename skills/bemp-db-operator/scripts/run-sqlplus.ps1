# 执行Oracle SQL脚本 - 插入branch_admin_init_pwd参数
chcp 65001 > $null
$env:NLS_LANG = "AMERICAN_AMERICA.AL32UTF8"
$env:NLS_DATE_FORMAT = "YYYY-MM-DD HH24:MI:SS"

$sqlFile = Join-Path $PSScriptRoot "insert-branch-admin-init-pwd.sql"
$connectStr = "bemp_hnnx/123456@10.20.42.211:1521/orcl"
$wrappedSql = Join-Path $env:TEMP "wrapped_sql.sql"

$header = @"
ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';
ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF';
ALTER SESSION SET NLS_DATE_LANGUAGE = 'AMERICAN';
ALTER SESSION SET NLS_LANGUAGE = 'AMERICAN';
ALTER SESSION SET CURRENT_SCHEMA = BEMP_HNNX;

"@

$sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8
$footer = "`nEXIT;"

$wrappedContent = $header + $sqlContent + $footer
Set-Content -Path $wrappedSql -Value $wrappedContent -Encoding UTF8

Write-Host "========================================="
Write-Host "Oracle SQL*Plus 执行"
Write-Host "  数据库: 10.20.42.211:1521/orcl"
Write-Host "  Schema: BEMP_HNNX"
Write-Host "========================================="

$resultFile = Join-Path $env:TEMP "sqlplus_result.log"
$errorFile = Join-Path $env:TEMP "sqlplus_error.log"

$p = Start-Process -FilePath "sqlplus" `
    -ArgumentList "-S", "-L", $connectStr, "@`"$wrappedSql`"" `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $resultFile `
    -RedirectStandardError $errorFile

Write-Host "Exit code: $($p.ExitCode)"

if (Test-Path $resultFile) {
    $output = Get-Content $resultFile -Raw -Encoding UTF8
    Write-Host "--- OUTPUT ---"
    Write-Host $output
    Remove-Item $resultFile -Force
}

if (Test-Path $errorFile) {
    $err = Get-Content $errorFile -Raw -Encoding UTF8
    if ($err.Trim()) {
        Write-Host "--- ERRORS ---"
        Write-Host $err
    }
    Remove-Item $errorFile -Force
}

if (Test-Path $wrappedSql) {
    Remove-Item $wrappedSql -Force
}

if ($p.ExitCode -ne 0) {
    exit 1
}