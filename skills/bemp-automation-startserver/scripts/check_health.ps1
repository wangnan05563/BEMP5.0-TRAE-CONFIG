$logDir = Join-Path $PSScriptRoot '..\logs'
$ts = "20260814_013139"
$sb = New-Object System.Text.StringBuilder
function Log($m){ [void]$sb.AppendLine($m) }

function PortListen($p){
  try { $c=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if($c){return $true} } catch {}
  return $false
}

# wait for SpringBoot + frontend to initialize
$wait = 150
Log("Waiting ${wait}s for SpringBoot/frontend init...")
Start-Sleep -Seconds $wait

# 1) ports
Log("=== PORTS ===")
foreach($p in @(6379,2181,8010,8090,8091)){
  if(PortListen $p){ Log("PORT $p LISTENING") } else { Log("PORT $p NOT LISTENING") }
}

# 2) Redis health
Log("=== REDIS ===")
try {
  $r = & "D:\code\Redis-x64-5.0.14.1\redis-cli.exe" -p 6379 ping 2>&1
  Log("redis ping -> $r")
} catch { Log("redis-cli error: $_") }

# 3) ZooKeeper health
Log("=== ZOOKEEPER ===")
try {
  $zk = echo ruok | & "D:\code\apache-zookeeper-3.8.3-bin\bin\zkCli.sh" 2>&1
  Log("zk ruok attempt done (see log file for detail)")
} catch { Log("zk check skipped: $_") }
# alternative: nc ruok
try {
  $nc = (echo "ruok") | & "D:\code\apache-zookeeper-3.8.3-bin\bin\zkServer.cmd" status 2>&1
} catch {}

# 4) SpringBoot readiness (look for "Started" banner)
Log("=== SPRINGBOOT (Served/Adapter) ===")
foreach($svc in @("Served","Adapter")){
  $log = Join-Path $logDir "$($svc)_startup_$ts.log"
  if(Test-Path $log){
    $txt = [System.IO.File]::ReadAllText($log)
    $lines = $txt.Split(@("`r`n"), [StringSplitOptions]::None)
    $started = $lines | Where-Object { $_ -match "Started .* in .* seconds" -or $_ -match "Tomcat started on port" -or $_ -match "APPLICATION FAILED TO START" }
    $size = (Get-Item $log).Length
    Log("$svc log size=$size bytes; matches:")
    foreach($m in $started){ Log("   $m") }
    if(-not $started){ Log("   (no startup marker yet; tail:)") ; $tail = $lines | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 5; foreach($t in $tail){ Log("   ... $t") } }
  } else { Log("$svc log MISSING") }
}

# 5) Frontend readiness
Log("=== FRONTEND ===")
$flog = Join-Path $logDir "Frontend_startup_$ts.log"
if(Test-Path $flog){
  $ftxt = [System.IO.File]::ReadAllText($flog)
  $flines = $ftxt.Split(@("`r`n"), [StringSplitOptions]::None)
  $fmatch = $flines | Where-Object { $_ -match "Project is running at" -or $_ -match "Compiled successfully" -or $_ -match "Listenging|Listening on" -or $_ -match "error" }
  $fsize = (Get-Item $flog).Length
  Log("Frontend log size=$fsize bytes; matches:")
  foreach($m in $fmatch){ Log("   $m") }
  if(-not $fmatch){ $ftail = $flines | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 8; foreach($t in $ftail){ Log("   ... $t") } }
} else { Log("Frontend log MISSING") }

[System.IO.File]::WriteAllText((Join-Path $logDir "_health_check.txt"), $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
Log("HEALTH CHECK COMPLETE")
