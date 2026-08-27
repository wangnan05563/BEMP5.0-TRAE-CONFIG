$logDir = Join-Path $PSScriptRoot '..\logs'
$ts = "20260814_013139"
$sb = New-Object System.Text.StringBuilder
function L($m){ [void]$sb.AppendLine($m) }

function PortListen($p){
  try { $c=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if($c){return $true} } catch {}
  return $false
}
function GetTail($log, $n){
  if(-not (Test-Path $log)){ return @("  (log missing)") }
  $txt=[System.IO.File]::ReadAllText($log)
  $lines=$txt.Split(@("`r`n"),[StringSplitOptions]::None) | Where-Object { $_.Trim() -ne "" }
  return $lines | Select-Object -Last $n
}

$wait=130
L("Waiting ${wait}s more for Served init...")
Start-Sleep -Seconds $wait

L("=== PORTS ===")
foreach($p in @(8010,8090,8091,6379,2181)){
  if(PortListen $p){ L("PORT $p LISTENING") } else { L("PORT $p NOT LISTENING") }
}

L("=== SPRINGBOOT MARKERS (Served/Adapter) ===")
foreach($svc in @("Served","Adapter")){
  $log=Join-Path $logDir "$($svc)_startup_$ts.log"
  if(Test-Path $log){
    $txt=[System.IO.File]::ReadAllText($log)
    $lines=$txt.Split(@("`r`n"),[StringSplitOptions]::None)
    $marker = $lines | Where-Object { $_ -match "Started .*AppStarter" -or $_ -match "Tomcat started on port" -or $_ -match "APPLICATION FAILED TO START" -or $_ -match "BUILD SUCCESS" }
    L("$svc markers found: "+$marker.Count)
    foreach($m in $marker){ L("   $m") }
    if($marker.Count -eq 0){
      L("   tail of $svc log:")
      foreach($t in (GetTail $log 12)){ L("   ... $t") }
    }
  } else { L("$svc log MISSING") }
}

L("=== ZOOKEEPER ruok (TCP) ===")
try {
  $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1",2181)
  $ns = $tcp.GetStream()
  $req=[System.Text.Encoding]::ASCII.GetBytes("ruok")
  $ns.Write($req,0,$req.Length)
  $buf=New-Object byte[] 64
  $n=$ns.Read($buf,0,64)
  $resp=[System.Text.Encoding]::ASCII.GetString($buf,0,$n)
  L("zk ruok -> $resp")
  $tcp.Close()
} catch { L("zk ruok error: $_") }

L("=== REDIS ===")
try { $r=& "D:\code\Redis-x64-5.0.14.1\redis-cli.exe" -p 6379 ping 2>&1; L("redis ping -> $r") } catch { L("redis error: $_") }

[System.IO.File]::WriteAllText((Join-Path $logDir "_health_check2.txt"), $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
L("DONE")
