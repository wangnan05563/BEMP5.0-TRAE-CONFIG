$logDir = Join-Path $PSScriptRoot '..\logs'
$rcli = "D:\code\Redis-x64-5.0.14.1\redis-cli.exe"
$rdbDir = "D:\code\Redis-x64-5.0.14.1\rdb"
$out = New-Object System.Text.StringBuilder
function L($m){ [void]$out.AppendLine($m) }

# detect latest batch
$sf = Get-ChildItem -Path $logDir -Filter "_supervise_start_*.txt" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($sf -and ($sf.Name -match '(\d{8}_\d{6})')) { $ts = $Matches[1] } else { $ts = $null }
L("latest batch ts: $ts")

function Wait-Port($port,$max){
  $t=0
  while($t -lt $max){
    $c=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($c){ return $true }
    Start-Sleep -Seconds 10; $t+=10
  }
  return $false
}
L("Served(8010)    : $(Wait-Port 8010 420)")
L("Adapter(8090)   : $(Wait-Port 8090 420)")
L("Frontend(8091)  : $(Wait-Port 8091 600)")
# frontend http
$feOK=$false
for($i=0;$i -lt 30;$i++){
  try { $r=Invoke-WebRequest -Uri "http://127.0.0.1:8091/" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop; if($r.StatusCode -eq 200){ L("Frontend HTTP 200 ($(($r.Content).Length)b)"); $feOK=$true; break } }
  catch { }
  Start-Sleep -Seconds 20
}
if(-not $feOK){ L("Frontend NOT ready") }

# 1) UTF-8 merged log
L("")
L("== UTF-8 合并日志 ==")
if ($ts) {
  $merged = Join-Path $logDir "bemp_all_$ts.log"
  if (Test-Path $merged) {
    $sz=(Get-Item $merged).Length
    L("bemp_all_$ts.log 存在, 大小=$sz bytes")
    $tail = Get-Content -Path $merged -Tail 60 -ErrorAction SilentlyContinue
    $cjk = $tail | Where-Object { $_ -match '[\u4e00-\u9fff]' } | Select-Object -First 1
    if ($cjk) { L("中文解码正常, 示例: $($cjk.Trim().Substring(0,[Math]::Min(80,$cjk.Trim().Length)))") } else { L("尾部 60 行未检出中文字符(可能当前无中文日志, 非异常)") }
  } else { L("bemp_all_$ts.log 不存在!") }
}

# 2) Redis RDB persistence root fix
L("")
L("== Redis RDB 持久化根治 ==")
L("rdb 子目录存在: $(Test-Path $rdbDir)")
if (Test-Path $rdbDir) {
  $items = Get-ChildItem -Path $rdbDir
  L("rdb 目录内容: $(($items | ForEach-Object { "$($_.Name)($($_.Length)b)" }) -join ', ')")
}
# trigger a save and inspect
try { $r=& $rcli -p 6379 SAVE 2>&1; L("SAVE -> $r") } catch { L("SAVE error: $_") }
Start-Sleep -Seconds 2
if (Test-Path $rdbDir) {
  $items = Get-ChildItem -Path $rdbDir
  L("SAVE 后 rdb 目录: $(($items | ForEach-Object { "$($_.Name)($($_.Length)b)" }) -join ', ')")
}
# redis log: any Background saving error?
if ($ts) {
  $rlog = Join-Path $logDir "Redis_startup_$ts.log"
  if (Test-Path $rlog) {
    $err = Select-String -Path $rlog -Pattern "Background saving error|拒绝访问|Can't save" -Quiet -ErrorAction SilentlyContinue
    $ok = Select-String -Path $rlog -Pattern "Background saving started|DB saved|Background saving terminated" -Quiet -ErrorAction SilentlyContinue
    L("redis 日志: 落盘成功标记=$(if($ok){'有'}else{'无'}), 失败标记=$(if($err){'有!!!'}else{'无'})")
  }
}
# stop-writes state
try { $g=& $rcli -p 6379 CONFIG GET stop-writes-on-bgsave-error 2>&1; L("stop-writes-on-bgsave-error -> $($g -join ' ')") } catch { L("CONFIG GET error: $_") }

[System.IO.File]::WriteAllText((Join-Path $logDir "_verify_fixes.txt"), $out.ToString(), [System.Text.UTF8Encoding]::new($false))
L("")
L("DONE")
