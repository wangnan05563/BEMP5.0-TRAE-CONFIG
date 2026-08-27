$logDir = Join-Path $PSScriptRoot '..\logs'
$ts = "20260814_093254"
$redisCli = "D:\code\Redis-x64-5.0.14.1\redis-cli.exe"
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

L("== 等待 Served(8010)/Adapter(8090) 端口 ==")
$sOK = Wait-Port 8010 360
$aOK = Wait-Port 8090 360
L("Served(8010) listening: $sOK")
L("Adapter(8090) listening: $aOK")

# SpringBoot markers
function Marker($name,$port){
  $f = Join-Path $logDir "$($name)_startup_$ts.log"
  if(-not (Test-Path $f)){ return "${name}: NO LOG" }
  $started = Select-String -Path $f -Pattern "Started .*AppStarter" -Quiet -ErrorAction SilentlyContinue
  $fail = Select-String -Path $f -Pattern "APPLICATION FAILED TO START|Error starting ApplicationContext" -Quiet -ErrorAction SilentlyContinue
  if($fail){ return "${name}: FAIL (APPLICATION FAILED)" }
  if($started){ return "${name}: STARTED OK" }
  return "${name}: not-started-yet"
}
L("== SpringBoot markers ==")
L((Marker "Served" 8010))
L((Marker "Adapter" 8090))

# Redis
L("== Redis ==")
try { $pong = & $redisCli -p 6379 PING 2>&1; L("PING -> $pong") } catch { L("PING error: $_") }
try { $g = & $redisCli -p 6379 CONFIG GET stop-writes-on-bgsave-error 2>&1; L("stop-writes-on-bgsave-error -> $($g -join ' ')") } catch { L("CONFIG GET error: $_") }

# ZooKeeper ruok
L("== ZooKeeper ==")
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect("127.0.0.1",2181)
  $s = $tcp.GetStream()
  $b = [System.Text.Encoding]::ASCII.GetBytes("ruok`n")
  $s.Write($b,0,$b.Length)
  $buf = New-Object byte[] 64
  $n = $s.Read($buf,0,64)
  $resp = [System.Text.Encoding]::ASCII.GetString($buf,0,$n)
  L("ruok response: $resp")
  $tcp.Close()
} catch { L("ZK probe error: $_") }

# Frontend HTTP
L("== Frontend ==")
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:8091/" -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
  L("HTTP $($r.StatusCode) ($(($r.Content).Length) bytes)")
} catch { L("HTTP error: $_") }

[System.IO.File]::WriteAllText((Join-Path $logDir "_health_check3.txt"), $out.ToString(), [System.Text.UTF8Encoding]::new($false))
L("DONE")
