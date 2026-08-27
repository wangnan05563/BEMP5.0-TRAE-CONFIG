# Cleanup all running BEMP services and supervisor/launcher processes
$logDir = Join-Path $PSScriptRoot '..\logs'
$lines = @()
# kill supervisor / orchestrator scripts
Get-WmiObject Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*supervise_bemp*' -or $_.CommandLine -like '*launch_all_bemp*' -or $_.CommandLine -like '*launcher_*_*.ps1*' } | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $lines += "killed supervisor/launcher PID=$($_.ProcessId)" } catch {}
}
# kill bemp java
Get-WmiObject Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*com.hundsun.bemp*' } | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $lines += "killed bemp java PID=$($_.ProcessId)" } catch {}
}
# kill redis
Get-Process -Name "redis-server" -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; $lines += "killed redis PID=$($_.Id)" } catch {} }
# kill by listening port: frontend(8091), zk(2181), redis(6379)
foreach ($p in @(8091,2181,6379)) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conn) { try { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue; $lines += "killed port $p owner PID=$($conn.OwningProcess)" } catch {} }
}
# kill frontend npm/node by command line
Get-WmiObject Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*BEMP5.0DEV\frontend*' -or $_.CommandLine -like '*npm run dev*' } | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $lines += "killed frontend proc PID=$($_.ProcessId)" } catch {}
}
Start-Sleep -Seconds 2
foreach ($p in @(@("Redis",6379),@("ZooKeeper",2181),@("Served",8010),@("Adapter",8090),@("Frontend",8091))) {
    $c = Get-NetTCPConnection -LocalPort $p[1] -State Listen -ErrorAction SilentlyContinue
    $lines += "$($p[0]) ($($p[1])): $(if ($c) {'STILL LISTENING'} else {'free'})"
}
[System.IO.File]::WriteAllLines("$logDir\_cleanup.txt", $lines, [System.Text.UTF8Encoding]::new($false))