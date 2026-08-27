$sb = New-Object System.Text.StringBuilder
$logDir = Join-Path $PSScriptRoot '..\logs'
function L($m){ [void]$sb.AppendLine($m) }

L("=== HTTP / TCP PROBES ===")
foreach($u in @("http://127.0.0.1:8010/","http://127.0.0.1:8090/","http://127.0.0.1:8091/")){
  try {
    $r = Invoke-WebRequest -Uri $u -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
    L("$u -> HTTP $($r.StatusCode) ($(($r.Content).Length) bytes)")
  } catch {
    $ex = $_.Exception
    if($ex.Response){ L("$u -> HTTP $($ex.Response.StatusCode) (server up, returned non-200)") }
    else { L("$u -> CONNECT ERROR: $($ex.Message)") }
  }
}

L("=== REDIS ===")
try { $p=& "D:\code\Redis-x64-5.0.14.1\redis-cli.exe" -p 6379 ping 2>&1; L("redis ping -> $p") } catch { L("redis error: $_") }

L("=== ZOOKEEPER (TCP connect) ===")
try {
  $tcp=New-Object System.Net.Sockets.TcpClient("127.0.0.1",2181); 
  L("zk TCP 2181 -> CONNECTED (LocalPort=$($tcp.Client.LocalEndPoint.Port))"); $tcp.Close()
} catch { L("zk TCP error: $_") }

[System.IO.File]::WriteAllText("${logDir}\_final_verify.txt", $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
L("DONE")
