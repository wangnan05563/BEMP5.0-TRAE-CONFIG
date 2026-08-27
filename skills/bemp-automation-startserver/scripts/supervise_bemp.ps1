# BEMP supervisor (headless-safe): starts all services directly from a console-backed
# process (so native .exe children spawn correctly), then stays alive forever so the
# children survive. Run as a background task.
# SpringBoot services use a generated .cmd launcher (avoids PowerShell -ArgumentList
# array-mangling of the ';'-containing classpath in the background context).
$ErrorActionPreference = 'SilentlyContinue'

$logDir = Join-Path $PSScriptRoot '..\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

$banks    = "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank"
$frontend = "D:\code\QJ\BEMP5.0DEV\frontend"
$javaHome = "D:\code\Java\jdk1.8.0_341"
$javaExe  = Join-Path $javaHome "bin\java.exe"
$nodeDir  = "D:\code\nodejs14"
$npmExe   = Join-Path $nodeDir "npm.cmd"

function Test-PortListening {
    param([int]$Port)
    try { $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue; return ($null -ne $c -and @($c).Count -gt 0) }
    catch { return $false }
}

# Launch any service DETACHED via WMI Win32_Process.Create.
# WHY WMI (not Start-Process, not [System.Diagnostics.Process]::Start):
#   1. This machine's env block has BOTH "Path" and "PATH" (case variants). Windows PowerShell
#      5.1's Start-Process builds a CASE-SENSITIVE Dictionary from the env and throws
#      "已添加项。字典中的关键字:Path...PATH", failing EVERY launch.
#   2. Services must SURVIVE this supervisor process. A supervisor launched as a background task
#      gets its process GROUP torn down when the agent turn / background task ends, which would
#      kill any child created by Start-Process/[Diagnostics.Process] (same group). WMI Create
#      spawns the process via the WMI service (winmgmt) in a NEW process group, so the service
#      keeps running even after the supervisor exits.
#   3. The wrapper .cmd does its OWN stdout/stderr redirection internally (>> log 2>&1), which
#      also sidesteps the cmd.exe "/c ... > "out"" quoted-redirect "syntax incorrect" quirk.
function Start-Wrapped {
    param([string]$Name,[int]$Port,[string]$CmdBody,[string]$Work,[hashtable]$Env)
    if (Test-PortListening -Port $Port) { return "[SKIP] $Name already listening on $Port" }
    $cmdPath = "$logDir\run_$($Name)_$ts.cmd"
    $logFile = "$logDir\$($Name)_startup_$ts.log"
    $lines = @("@echo off")
    foreach ($k in $Env.Keys) { $lines += "set `"$($k)=$($Env[$k])`"" }
    # internal redirection: capture all output (stdout+stderr) into the per-service log file
    $lines += "$CmdBody >> `"$logFile`" 2>&1"
    [System.IO.File]::WriteAllText($cmdPath, ($lines -join "`r`n"), [System.Text.UTF8Encoding]::new($false))
    try {
        # WMI CreateProcess: CommandLine, CurrentDirectory, ProcessStartupInformation, PID(out)
        # Double-double quotes ("") are WMI's escape for a literal quote inside CommandLine.
        $cmdLine = "cmd.exe /c ""$cmdPath"""
        $res = Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList @($cmdLine, $Work, $null, $null)
        if ($res.ReturnValue -eq 0) {
            return "[OK]   $Name PID=$($res.ProcessId) (port $Port) log=$logFile [detached via WMI]"
        } else {
            return "[FAIL] $Name WMI Create returned $($res.ReturnValue) (see https://msdn.microsoft.com/library/aa394599)"
        }
    } catch {
        return "[FAIL] $Name WMI launch error: $_"
    }
}

$result = @()

# Redis (native). Point 'dir' at a dedicated writable subdir so BGSAVE can create/rename
# dump.rdb without the access-denied error caused by renaming over the original dir's
# already-open dump.rdb. This is the root fix for RDB persistence (no stop-writes trip).
$redisDataDir = "D:\code\Redis-x64-5.0.14.1\rdb"
if (-not (Test-Path $redisDataDir)) { New-Item -ItemType Directory -Path $redisDataDir -Force | Out-Null }
$result += Start-Wrapped -Name "Redis" -Port 6379 -CmdBody "`"D:\code\Redis-x64-5.0.14.1\redis-server.exe`" --dir `"$redisDataDir`"" -Work $redisDataDir -Env @{}
# Relax Redis write-blocking: this env's dump.rdb cannot be persisted (permission denied),
# which trips stop-writes-on-bgsave-error and breaks BEMP queue tasks. Apply at runtime so
# every (re)start keeps writes unblocked. (Root fix = grant dump.rdb write permission / move dir.)
# Must wait for Redis to actually accept connections first, or the SET is silently swallowed.
$redisCli = Join-Path "D:\code\Redis-x64-5.0.14.1" "redis-cli.exe"
if (Test-Path $redisCli) {
    $redisReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try { $p = & $redisCli -p 6379 PING 2>$null; if ($p -eq "PONG") { $redisReady = $true; break } } catch {}
        Start-Sleep -Seconds 1
    }
    if ($redisReady) {
        try { & $redisCli -p 6379 CONFIG SET stop-writes-on-bgsave-error no 2>$null | Out-Null; $result += "[OK]   Redis: stop-writes-on-bgsave-error=no applied" }
        catch { $result += "[WARN] Redis CONFIG SET failed (non-fatal): $_" }
    } else {
        $result += "[WARN] Redis not reachable after 30s, skipped stop-writes-on-bgsave-error relax"
    }
} else { $result += "[WARN] redis-cli not found, skipped stop-writes-on-bgsave-error relax" }
# ZooKeeper (.cmd, works directly). BEMP hnnxbank dubbo registry expects ZK on 21811
# (see banks/ext-hnnxbank/*/application.properties app.registry.address=127.0.0.1:21811),
# so the local ZK clientPort is set to 21811 in apache-zookeeper-3.8.3-bin/conf/zoo.cfg.
$result += Start-Wrapped -Name "ZooKeeper" -Port 21811 -CmdBody "D:\code\apache-zookeeper-3.8.3-bin\bin\zkServer.cmd" -Work "D:\code\apache-zookeeper-3.8.3-bin\bin" -Env @{ "JAVA_TOOL_OPTIONS" = "-Dfile.encoding=UTF-8" }

# SpringBoot classpath helper
function Get-SpringbootInfo {
    param([string]$Module,[string]$War,[string]$MainClass,[string]$Jvm)
    $modPath = Join-Path $banks $Module
    $webinfC = Join-Path $modPath "target\$War\WEB-INF\classes"
    $webinfL = Join-Path $modPath "target\$War\WEB-INF\lib"
    $flatC   = Join-Path $modPath "target\classes"
    $flatL   = Join-Path $modPath "target\lib"
    $a = @()
    $a += $Jvm.Split(' ')
    $a += @("-Dfile.encoding=UTF-8","-Dsun.stdout.encoding=UTF-8","-Dsun.stderr.encoding=UTF-8")
    if ((Test-Path $webinfC) -and (Test-Path $webinfL)) {
        $work = Join-Path $modPath "target\$War"
        $a += @("-cp","WEB-INF\classes;WEB-INF\lib\*",$MainClass)
        return @{ work=$work; args=$a }
    } elseif ((Test-Path $flatC) -and (Test-Path $flatL)) {
        $work = Join-Path $modPath "target"
        $a += @("-cp","classes;lib\*",$MainClass)
        return @{ work=$work; args=$a }
    }
    return $null
}

# Build a .cmd launcher for a springboot service (classpath quoted to avoid ';' issues)
function Build-SpringbootCmd {
    param([string]$JavaExe,[array]$JavaArgs,[string]$JavaHome)
    $lines = @("@echo off")
    if ($JavaHome) { $lines += "set `"JAVA_HOME=$JavaHome`"" }
    $cmdArgs = ($JavaArgs | ForEach-Object { if ($_ -like '*;*' -or $_ -like '* *') { "`"$_`"" } else { $_ } }) -join " "
    $lines += "`"$JavaExe`" $cmdArgs"
    return ($lines -join "`r`n")
}

$served = Get-SpringbootInfo -Module "hnnxbank-served-deploy" -War "bemp-served" -MainClass "com.hundsun.bemp.BempServedAppStarter" -Jvm "-server -Xms1024m -Xmx2048m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
if ($served) {
    $body = "`"$javaExe`" " + (($served.args | ForEach-Object { if ($_ -like '*;*' -or $_ -like '* *') { "`"$_`"" } else { $_ } }) -join " ")
    $result += Start-Wrapped -Name "Served" -Port 8010 -CmdBody $body -Work $served.work -Env @{ "JAVA_HOME" = $javaHome }
} else { $result += "[FAIL] Served: no compiled classes" }

$adapter = Get-SpringbootInfo -Module "hnnxbank-adapter-deploy" -War "bemp-adapter" -MainClass "com.hundsun.bemp.BempAdapterAppStarter" -Jvm "-server -Xms512m -Xmx1024m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
if ($adapter) {
    $body = "`"$javaExe`" " + (($adapter.args | ForEach-Object { if ($_ -like '*;*' -or $_ -like '* *') { "`"$_`"" } else { $_ } }) -join " ")
    $result += Start-Wrapped -Name "Adapter" -Port 8090 -CmdBody $body -Work $adapter.work -Env @{ "JAVA_HOME" = $javaHome }
} else { $result += "[FAIL] Adapter: no compiled classes" }

# Frontend (npm.cmd, works directly)
$curPath = [Environment]::GetEnvironmentVariable("PATH")
if ($curPath -notlike "$nodeDir*") { $curPath = "$nodeDir;$curPath" }
$result += Start-Wrapped -Name "Frontend" -Port 8091 -CmdBody "`"$npmExe`" run dev --scripts-prepend-node-path" -Work $frontend -Env @{ "NODE_ENV"="development"; "NODE_OPTIONS"="--max_old_space_size=8192"; "PATH"=$curPath }

[System.IO.File]::WriteAllLines("$logDir\_supervise_start_$ts.txt", $result, [System.Text.UTF8Encoding]::new($false))

# Print the launch summary to the console, then live-tail the service logs so the
# terminal shows real-time output. Get-Content -Wait blocks forever, which also keeps
# this supervisor window alive (closing the window stops all BEMP services).
Write-Host "`n===== BEMP 启动汇总 (批次 $ts) =====" -ForegroundColor Green
$result | ForEach-Object { Write-Host $_ }
Write-Host "`n===== 实时日志 (合并 UTF-8: bemp_all_$ts.log；Ctrl+C 退出；关闭本窗口将停止全部 BEMP 服务) =====" -ForegroundColor Cyan

# Merge all service stdout logs into one UTF-8 file and echo new lines to the console for
# live viewing. All five services emit UTF-8:
#   - Redis / ZooKeeper / Frontend are UTF-8 natively.
#   - The SpringBoot java services (Served/Adapter) are launched with
#     -Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 (see Get-SpringbootInfo), so their
#     redirected stdout logs are UTF-8 too.
# ROOT-CAUSE NOTE (do NOT "fix" this by switching to GBK): although this machine's PowerShell
# 5.1 / .NET Framework reports [System.Text.Encoding]::Default = GBK (codepage 936), the LOG
# FILES themselves are UTF-8. Decoding them as Default/GBK produces mojibake
# (e.g. 绾跨▼姹狅細). Forcing UTF-8 here keeps Chinese readable in the merged file.
$merged = Join-Path $logDir "bemp_all_$ts.log"
[System.IO.File]::WriteAllText($merged, "", [System.Text.UTF8Encoding]::new($true))
$svcNames = @("Redis","ZooKeeper","Served","Adapter","Frontend")
$pos = @{}
foreach ($n in $svcNames) { $pos[$n] = 0 }
while ($true) {
    foreach ($n in $svcNames) {
        $f = Join-Path $logDir "$($n)_startup_$ts.log"
        if (-not (Test-Path $f)) { continue }
        try {
            $fs = [System.IO.File]::Open($f, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            $fs.Seek($pos[$n], [System.IO.SeekOrigin]::Begin) | Out-Null
            $sr = New-Object System.IO.StreamReader($fs, [System.Text.UTF8Encoding]::new($false))
            $buf = New-Object System.Text.StringBuilder
            $line = $sr.ReadLine()
            while ($null -ne $line) { [void]$buf.AppendLine($line); $line = $sr.ReadLine() }
            if ($buf.Length -gt 0) {
                $sw = New-Object System.IO.StreamWriter($merged, $true, [System.Text.UTF8Encoding]::new($true))
                $sw.Write($buf.ToString()); $sw.Close()
                foreach ($l in ($buf.ToString() -split "`n")) { if ($l.Trim().Length -gt 0) { Write-Host $l } }
            }
            $pos[$n] = $fs.Position
            $sr.Close(); $fs.Close()
        } catch { Start-Sleep -Milliseconds 100 }
    }
    Start-Sleep -Seconds 1
}
