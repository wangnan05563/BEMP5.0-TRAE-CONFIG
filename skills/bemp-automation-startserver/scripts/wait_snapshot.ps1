$logDir = Join-Path $PSScriptRoot '..\logs'
$ts = "20260814_100222"
$out = New-Object System.Text.StringBuilder
function L($m){ [void]$out.AppendLine($m) }

function Wait-Port($port,$max){
  $t=0
  while($t -lt $max){
    $c=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($c){ return $true }
    Start-Sleep -Seconds 10; $t+=10
  }
  return $false
}

L("== 等待 Served(8010)/Adapter(8090)/Frontend(8091) ==")
L("Served(8010)    : $(Wait-Port 8010 420)")
L("Adapter(8090)   : $(Wait-Port 8090 420)")
L("Frontend(8091)  : $(Wait-Port 8091 600)")

# Frontend HTTP
L("== Frontend HTTP ==")
$feOK=$false
for($i=0;$i -lt 30;$i++){
  try { $r=Invoke-WebRequest -Uri "http://127.0.0.1:8091/" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop; if($r.StatusCode -eq 200){ L("HTTP 200 ($(($r.Content).Length)b) at attempt $($i+1)"); $feOK=$true; break } }
  catch { L("attempt $($i+1): $($_.Exception.Message)") }
  Start-Sleep -Seconds 20
}
if(-not $feOK){ L("Frontend NOT ready after wait") }

# Live snapshot: tail of each service log (Get-Content shared read)
L("")
L("==================================================")
L("  实时日志快照 (批次 $ts)")
L("==================================================")
foreach($n in @("Redis","ZooKeeper","Served","Adapter","Frontend")){
  $f=Join-Path $logDir "$($n)_startup_$ts.log"
  if(Test-Path $f){
    $bytes=(Get-Item $f).Length
    L("")
    L("----- $n  (stdout $bytes bytes, 尾部 12 行) -----")
    $tail=Get-Content -Path $f -Tail 12 -ErrorAction SilentlyContinue
    foreach($l in $tail){ if($l -and $l.Trim().Length -gt 0){ L($l.Trim()) } }
  } else { L("----- $n : 无日志 -----") }
}

[System.IO.File]::WriteAllText((Join-Path $logDir "_live_snapshot.txt"), $out.ToString(), [System.Text.UTF8Encoding]::new($false))
L("")
L("DONE")
