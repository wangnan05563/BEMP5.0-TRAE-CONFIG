<#
.SYNOPSIS
    BEMP service launcher - config driven, zero hardcoded paths/ports.
    Starts Redis / ZooKeeper / Served / Adapter / Frontend (or a subset) using a
    WMI-detached process so services survive the launching session. All parameters
    come from config/config.json (+ optional config/local.json override). No literal
    paths or ports exist in this script.

.EXAMPLE
    .\start-bemp.ps1                                  # start all (default profile)
    .\start-bemp.ps1 -Profile hnnxxbank                # explicit profile
    .\start-bemp.ps1 -Service "redis,zookeeper"        # subset
    .\start-bemp.ps1 -Service served,adapter -ForceRestart
    .\start-bemp.ps1 -Compile                         # also rebuild deploy modules
    .\start-bemp.ps1 -Status                          # report only, no start
#>

param(
    [string]$Profile,
    [string]$Service,
    [switch]$Compile,
    [switch]$SkipCompile,
    [switch]$ForceRestart,
    [switch]$Status,
    [string]$ConfigPath,
    [string]$LocalPath
)

$ErrorActionPreference = 'Continue'
# Suppress the progress-stream noise that Invoke-WebRequest emits (e.g. "正在读取 Web 响应")
$ProgressPreference = 'SilentlyContinue'

# ---- locate config ----
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $ConfigPath) { $ConfigPath = Join-Path $scriptRoot '..\config\config.json' }
if (-not $LocalPath)  { $LocalPath  = Join-Path $scriptRoot '..\config\local.json' }
$cfgPath  = Resolve-Path $ConfigPath  -ErrorAction Stop
$locPath  = $LocalPath
$locExists = Test-Path $LocalPath
if (-not $locExists) { Write-Warning "local config not found: $LocalPath (using config.json only)" }

$cfg = Get-Content $cfgPath  -Raw -Encoding UTF8 | ConvertFrom-Json
$loc = if ($locExists) { Get-Content $locPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }

# ---- placeholder resolver ----
function Get-ByPath($obj, $path) {
    if ($null -eq $obj -or [string]::IsNullOrEmpty($path)) { return $null }
    $cur = $obj
    foreach ($seg in ($path -split '\.')) {
        if ($null -eq $cur) { return $null }
        if ($cur -is [hashtable]) {
            if ($cur.ContainsKey($seg)) { $cur = $cur[$seg] } else { return $null }
        } elseif ($cur -is [System.Management.Automation.PSCustomObject]) {
            if ($cur.PSObject.Properties[$seg]) { $cur = $cur.$seg } else { return $null }
        } else { return $null }
    }
    return $cur
}

function Resolve-Value($val) {
    if ($null -eq $val) { return $null }
    if ($val -is [string]) {
        $s = $val
        for ($i = 0; $i -lt 6; $i++) {
        $changed = $false
        $s = [regex]::Replace($s, '\$\{([^}]+)\}', {
            param($m)
            $content = $m.Groups[1].Value
            $scope = $null; $rest = $content
            if ($content.Contains(':')) {
                $idx = $content.IndexOf(':')
                $scope = $content.Substring(0, $idx)
                $rest  = $content.Substring($idx + 1)
            }
            $resolved = $null
            if ($scope -eq 'env') {
                $resolved = [Environment]::GetEnvironmentVariable($rest)
            } elseif ($scope -eq 'local') {
                $resolved = Get-ByPath $loc $rest
            } else {
                # no scope or global/profiles/... -> resolve within cfg
                $resolved = Get-ByPath $cfg $content
            }
            if ($null -eq $resolved) { return $m.Value }   # leave unresolved token
            $changed = $true
            return [string]$resolved
        })
        if (-not $changed) { break }
    }
    return $s
}
if ($val -is [System.Management.Automation.PSCustomObject] -or $val -is [hashtable] -or $val -is [System.Collections.IEnumerable]) {
    return Resolve-Object $val
}
return $val
}

function Resolve-Object($obj) {
    if ($obj -is [System.Management.Automation.PSCustomObject]) {
        $out = @{}
        foreach ($p in $obj.PSObject.Properties) { $out[$p.Name] = Resolve-Object $p.Value }
        return $out
    }
    if ($obj -is [hashtable]) {
        $out = @{}
        foreach ($k in $obj.Keys) { $out[$k] = Resolve-Object $obj[$k] }
        return $out
    }
    if ($obj -is [System.Collections.IEnumerable] -and $obj -isnot [string]) {
        $arr = @()
        foreach ($it in $obj) { $arr += Resolve-Object $it }
        return $arr
    }
    return Resolve-Value $obj
}

# ---- merge selected profile into services ----
function Merge-Obj($base, $override) {
    if ($null -eq $override) { return $base }
    if (($base -is [System.Management.Automation.PSCustomObject] -or $base -is [hashtable]) -and
        ($override -is [System.Management.Automation.PSCustomObject] -or $override -is [hashtable])) {
        $out = @{}
        foreach ($p in $base.PSObject.Properties) { $out[$p.Name] = $base.$($p.Name) }
        foreach ($p in $override.PSObject.Properties) {
            $bn = if ($out.ContainsKey($p.Name)) { $out[$p.Name] } else { $null }
            $out[$p.Name] = Merge-Obj $bn $override.$($p.Name)
        }
        return $out
    }
    return $override
}

$selectedProfile = if ($Profile) { $Profile } else { $cfg.defaultProfile }
Write-Host "Selected profile: $selectedProfile"

# resolve globals
$G = Resolve-Object $cfg.global

# build effective services: base services <- profile.services override
$effServices = @{}
foreach ($svcName in ($cfg.services.PSObject.Properties.Name)) {
    $base = $cfg.services.$svcName
    $profSvc = Get-ByPath $cfg "profiles.$selectedProfile.services.$svcName"
    $merged = Merge-Obj $base $profSvc
    $effServices[$svcName] = Resolve-Object $merged
}
# also pull profile-level values (redis/zookeeper/frontend specifics) used at launch
$prof = Resolve-Object (Get-ByPath $cfg "profiles.$selectedProfile")

# ---- helpers ----
function Test-PortListening($port) {
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $c -and @($c).Count -gt 0)
    } catch { return $false }
}

function Stop-PortOwner($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $killed = @()
    foreach ($c in $conns) {
        $pid = $c.OwningProcess
        $pr = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($pr) { try { $pr.Kill(); $killed += $pid } catch {} }
    }
    return $killed
}

function Quote-Arg($t) {
    if ($null -eq $t) { return '' }
    $s = [string]$t
    if ($s.Contains(' ') -or $s.Contains(';') -or $s.Contains('"')) { return '"' + $s + '"' }
    return $s
}

function Start-Wrapped($name, $port, $cmdBody, $work, $envHash) {
    if (Test-PortListening $port) { return "[SKIP] $name already listening on $port" }
    $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
    $cmdPath = Join-Path $G.logDir "run_$($name)_$ts.cmd"
    $logFile = Join-Path $G.logDir "$($name)_startup_$ts.log"
    $lines = @('@echo off')
    if ($envHash) {
        foreach ($k in $envHash.Keys) { $lines += "set `"$($k)=$($envHash[$k])`"" }
    }
    $lines += "$cmdBody >> `"$logFile`" 2>&1"
    try {
        [System.IO.File]::WriteAllText($cmdPath, ($lines -join "`r`n"), [System.Text.UTF8Encoding]::new($false))
        $cmdLine = "cmd.exe /c ""$cmdPath"""
        $res = Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList @($cmdLine, $work, $null, $null)
        if ($res.ReturnValue -eq 0) {
            return "[OK]   $name PID=$($res.ProcessId) (port $port) log=$logFile [detached via WMI]"
        }
        return "[FAIL] $name WMI Create returned $($res.ReturnValue)"
    } catch {
        return "[FAIL] $name WMI launch error: $_"
    }
}

function Wait-Port($port, $timeoutSec) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        if (Test-PortListening $port) { return $true }
        Start-Sleep -Seconds 1; $elapsed++
    }
    return $false
}

function Test-Health($svcName, $svc, $logFile) {
    $hc = if ($svc.healthCheck) { $svc.healthCheck } else { @{ type='port' } }
    $port = $svc.port
    $to = if ($hc.timeoutSec) { $hc.timeoutSec } else { 120 }
    # port must be listening
    if (-not (Wait-Port $port $to)) { return "FAIL:$svcName port $port not listening within ${to}s" }
    # http probe
    if ($hc.type -eq 'http') {
        $path = if ($hc.path) { $hc.path } else { '/' }
        $expected = if ($hc.expectedStatus) { $hc.expectedStatus } else { @(200) }
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port$path" -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
            $code = [int]$r.StatusCode
            if ($expected -contains $code -or ($code -ge 200 -and $code -lt 400)) {
                return "OK:$svcName port $port HTTP $code"
            }
            return "WARN:$svcName port $port HTTP $code (expected $($expected -join ','))"
        } catch {
            # Invoke-WebRequest throws on 4xx/5xx; extract the status code from the response
            $resp = $_.Exception.Response
            if ($resp -and $resp.StatusCode) {
                $code = [int]$resp.StatusCode
                if ($expected -contains $code) { return "OK:$svcName port $port HTTP $code" }
                return "WARN:$svcName port $port HTTP $code (expected $($expected -join ','))"
            }
            return "WARN:$svcName port $port HTTP probe failed ($($_.Exception.Message.Split([Environment]::NewLine)[0]))"
        }
    }
    return "OK:$svcName port $port listening"
}

function Scan-FatalLog($logFile) {
    if (-not (Test-Path $logFile)) { return $null }
    try {
        $txt = Get-Content $logFile -Encoding UTF8 -Raw -ErrorAction SilentlyContinue
        if ($null -eq $txt) { return $null }
        foreach ($kw in $cfg.launch.fatalLogKeywords) {
            if ($txt.Contains($kw)) { return "fatal keyword in log: $kw" }
        }
    } catch {}
    return $null
}

# ---- determine launch set ----
$allNames = @($effServices.Keys)
if ($Service) {
    $wanted = $Service -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $launchSet = $wanted | Where-Object { $effServices.ContainsKey($_) }
} else {
    $launchSet = $allNames | Where-Object { $effServices[$_].enabled -ne $false }
}

# ---- topological order by dependencies ----
$ordered = @()
$visited = @{}
function Visit($n) {
    if ($visited[$n]) { return }
    $visited[$n] = $true
    $deps = if ($effServices[$n].dependencies) { $effServices[$n].dependencies } else { @() }
    foreach ($d in $deps) { if ($effServices.ContainsKey($d)) { Visit $d } }
    $script:ordered += $n
}
foreach ($n in $launchSet) { Visit $n }

Write-Host "`n=== Launch order: $($ordered -join ' -> ') ==="

# ---- STATUS mode: report only ----
if ($Status) {
    Write-Host "`n=== STATUS ==="
    foreach ($n in $ordered) {
        $svc = $effServices[$n]
        $up = Test-PortListening $svc.port
        $extra = ''
        if ($up -and $svc.healthCheck -and $svc.healthCheck.type -eq 'http') {
            $p = if ($svc.healthCheck.path) { $svc.healthCheck.path } else { '/' }
            $expected = if ($svc.healthCheck.expectedStatus) { $svc.healthCheck.expectedStatus } else { @(200) }
            try {
                $r = Invoke-WebRequest -Uri "http://127.0.0.1:$($svc.port)$p" -TimeoutSec 8 -UseBasicParsing -ErrorAction SilentlyContinue
                $extra = " HTTP $($r.StatusCode)"
            } catch {
                # Invoke-WebRequest throws on 4xx/5xx; extract the status code from the response
                $resp = $_.Exception.Response
                if ($resp -and $resp.StatusCode) {
                    $code = [int]$resp.StatusCode
                    if ($expected -contains $code -or ($code -ge 200 -and $code -lt 400)) { $extra = " HTTP $code" } else { $extra = " HTTP $code (warn)" }
                } else { $extra = ' HTTP probe failed' }
            }
        }
        Write-Host ("[{0}] {1} (port {2}) {3}{4}" -f $(if($up){'UP'}else{'DOWN'}), $n, $svc.port, $(if($up){'LISTENING'}else{'free'}), $extra)
    }
    exit 0
}

# ---- optional compile ----
$doCompile = $false
if ($Compile) { $doCompile = $true }
elseif ($cfg.compile.enabled -and -not $SkipCompile) { $doCompile = $true }

if ($doCompile) {
    $mods = @()
    foreach ($n in $ordered) {
        $cm = Get-ByPath $prof "$n.compileModules"
        if ($cm) { $mods += $cm }
    }
    if ($mods.Count -gt 0) {
        $mods = $mods | Sort-Object -Unique
        Write-Host "`n=== Compiling modules: $($mods -join ',') ==="
        $env:JAVA_HOME = $G.javaHome
        $env:PATH = "$($G.javaHome)\bin;" + [Environment]::GetEnvironmentVariable('PATH')
        $mvn = Join-Path $G.mavenHome 'bin\mvn.cmd'
        $mvnArgs = "$($cfg.compile.mavenCommand) -pl $($mods -join ',')"
        if ($cfg.compile.useLocalRepo -and $G.mavenLocalRepo) { $mvnArgs += " -Dmaven.repo.local=$($G.mavenLocalRepo)" }
        $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
        $clog = Join-Path $G.logDir "compile_$ts.log"
        Write-Host "mvn $mvnArgs  (log=$clog)"
        try {
            Push-Location $G.banksProjectPath
            & $mvn $mvnArgs.Split(' ') 2>&1 | Out-File -FilePath $clog -Encoding UTF8
            Pop-Location
            Write-Host "Compile finished (exit logged to $clog)"
        } catch {
            Write-Warning "Compile error: $_"
        }
    }
}

# ---- launch ----
$javaExe = Join-Path $G.javaHome 'bin\java.exe'
$npmExe  = Join-Path $G.nodePath 'npm.cmd'

$results = @()
foreach ($n in $ordered) {
    $svc = $effServices[$n]
    $port = $svc.port
    if (Test-PortListening $port) {
        if ($ForceRestart) {
            $k = Stop-PortOwner $port
            Write-Host "ForceRestart: killed PIDs $($k -join ',') on port $port"
            Start-Sleep -Seconds 2
        } else {
            $results += "[SKIP] $n already listening on $port"
            continue
        }
    }

    $res = $null
    switch ($svc.type) {
        'redis' {
            $redis = $prof.redis
            $args = @()
            if ($redis.dataDir) { $args += @('--dir', (Quote-Arg $redis.dataDir)) }
            if ($redis.extraArgs) { $args += $redis.extraArgs }
            $body = (Quote-Arg $redis.exe) + ' ' + ($args -join ' ')
            $res = Start-Wrapped -name $n -port $port -cmdBody $body -work $redis.dataDir -Env @{}
            # wait ready then run postStart
            if ($res -like '[OK]*' -and (Wait-Port $port 30)) {
                foreach ($cmd in $redis.postStart) {
                    try { & $redis.redisCli -p $port $cmd.Split(' ') 2>$null | Out-Null; $results += "[OK]   redis postStart: $cmd" } catch { $results += "[WARN] redis postStart failed: $cmd" }
                }
            }
        }
        'zookeeper' {
            $zk = $prof.zookeeper
            $body = (Quote-Arg (Join-Path $zk.home 'bin\zkServer.cmd'))
            $wait = if ($zk.readinessWaitSec) { $zk.readinessWaitSec } else { 45 }
            $res = Start-Wrapped -name $n -port $port -cmdBody $body -work (Join-Path $zk.home 'bin') -Env $zk.env
            if ($res -like '[OK]*') { Wait-Port $port $wait | Out-Null }
        }
        'springboot' {
            $sb = $prof.$n
            $work = Join-Path $G.banksProjectPath ($sb.module + '\target\' + $sb.warDir)
            $jvm = @()
            if ($sb.jvmOptions) { $jvm += ($sb.jvmOptions -split '\s+') }
            $jvm += @('-Dfile.encoding=UTF-8','-Dsun.stdout.encoding=UTF-8','-Dsun.stderr.encoding=UTF-8')
            $jvm += @('-cp', 'WEB-INF\classes;WEB-INF\lib\*', $sb.mainClass)
            $body = (Quote-Arg $javaExe) + ' ' + (($jvm | ForEach-Object { Quote-Arg $_ }) -join ' ')
            $res = Start-Wrapped -name $n -port $port -cmdBody $body -work $work -Env @{ 'JAVA_HOME' = $G.javaHome }
        }
        'frontend' {
            $fe = $prof.frontend
            $work = $G.frontendProjectPath
            $startParts = ($fe.startCommand -split '\s+')
            $body = (Quote-Arg $npmExe) + ' ' + (($startParts | ForEach-Object { Quote-Arg $_ }) -join ' ')
            $nodeMem = if ($fe.nodeMemoryLimitMb) { $fe.nodeMemoryLimitMb } else { 8192 }
            $curPath = [Environment]::GetEnvironmentVariable('PATH')
            if ($curPath -notlike "$($G.nodePath)*") { $curPath = "$($G.nodePath);$curPath" }
            $res = Start-Wrapped -name $n -port $port -cmdBody $body -work $work -Env @{ 'NODE_ENV'='development'; 'NODE_OPTIONS'="--max_old_space_size=$nodeMem"; 'PATH'=$curPath }
        }
        'cmd' {
            $body = $svc.command
            $work = if ($svc.workdir) { $svc.workdir } else { $G.workspaceRoot }
            $res = Start-Wrapped -name $n -port $port -cmdBody $body -work $work -Env ($svc.env)
        }
        default { $res = "[FAIL] $n unknown type: $($svc.type)" }
    }
    $results += $res
}

# ---- health check ----
Write-Host "`n=== Health check ==="
foreach ($n in $ordered) {
    $svc = $effServices[$n]
    # find the log file produced this run (most recent for this service)
    $logFile = $null
    $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
    # locate newest startup log for this service
    $cand = Get-ChildItem (Join-Path $G.logDir "$($n)_startup_*.log") -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($cand) { $logFile = $cand.FullName }
    $h = Test-Health $n $svc $logFile
    $fatal = if ($logFile) { Scan-FatalLog $logFile } else { $null }
    if ($fatal) { Write-Host "$h  -> $fatal" } else { Write-Host $h }
    $results += $h
}

# ---- summary ----
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$sumFile = Join-Path $G.logDir "_launch_summary_$ts.txt"
[System.IO.File]::WriteAllLines($sumFile, $results, [System.Text.UTF8Encoding]::new($false))
Write-Host "`n===== BEMP launch summary (profile $selectedProfile, batch $ts) ====="
$results | ForEach-Object { Write-Host $_ }
Write-Host "Summary saved: $sumFile"
