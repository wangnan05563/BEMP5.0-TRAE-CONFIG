# 测试Oracle连接 - 使用/nolog模式
$env:TNS_ADMIN = "E:\app\hspcadmin\product\11.2.0\dbhome_1\network\admin"
$env:NLS_LANG = "AMERICAN_AMERICA.AL32UTF8"

$tempSql = Join-Path $env:TEMP "test_ora.sql"

$content = @"
CONNECT bemp_hnnx/123456@10.20.42.211:1521/orcl;
SELECT 'CONNECTION_OK' AS status FROM DUAL;
EXIT;
"@

Set-Content -Path $tempSql -Force -Value $content -Encoding UTF8

Write-Host "=== 尝试使用 /nolog 模式连接 ==="
sqlplus -S -L /nolog @$tempSql 2>&1

Remove-Item $tempSql -Force -ErrorAction SilentlyContinue