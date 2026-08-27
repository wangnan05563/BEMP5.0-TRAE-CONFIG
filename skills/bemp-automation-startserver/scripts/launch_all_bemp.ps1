# BEMP all-services launcher v2 (headless-safe, resilient)
# Generates one -NoExit launcher per service and starts it via Start-Process powershell -NoExit.
# The -NoExit launcher survives the orchestrator task completing (verified earlier),
# keeping its child service alive in this sandbox that kills task children on completion.
param([string]$Names = "")
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

# ---- service definitions (exe, args, workdir, env) ----
$services = @()

# Redis
$services += [ordered]@{
    name="Redis"; port=6379; exe="D:\code\Redis-x64-5.0.14.1\redis-server.exe"; args=@(); work="D:\code\Redis-x64-5.0.14.1"; env=@{}
}
# ZooKeeper
$services += [ordered]@{
    name="ZooKeeper"; port=2181; exe="D:\code\apache-zookeeper-3.8.3-bin\bin\zkServer.cmd"; args=@(); work="D:\code\apache-zookeeper-3.8.3-bin\bin"; env=@{ "JAVA_TOOL_OPTIONS"="-Dfile.encoding=UTF-8" }
}

# SpringBoot classpath decision
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
$served = Get-SpringbootInfo -Module "hnnxbank-served-deploy" -War "bemp-served" -MainClass "com.hundsun.bemp.BempServedAppStarter" -Jvm "-server -Xms1024m -Xmx2048m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
if ($served) {
    $services += [ordered]@{ name="Served"; port=8010; exe=$javaExe; args=$served.args; work=$served.work; env=@{ "JAVA_HOME"=$javaHome } }
}
$adapter = Get-SpringbootInfo -Module "hnnxbank-adapter-deploy" -War "bemp-adapter" -MainClass "com.hundsun.bemp.BempAdapterAppStarter" -Jvm "-server -Xms512m -Xmx1024m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
if ($adapter) {
    $services += [ordered]@{ name="Adapter"; port=8090; exe=$javaExe; args=$adapter.args; work=$adapter.work; env=@{ "JAVA_HOME"=$javaHome } }
}

# Frontend (node14 in PATH)
$curPath = [Environment]::GetEnvironmentVariable("PATH")
if ($curPath -notlike "$nodeDir*") { $curPath = "$nodeDir;$curPath" }
$services += [ordered]@{
    name="Frontend"; port=8091; exe=$npmExe; args=@("run","dev","--scripts-prepend-node-path"); work=$frontend; env=@{ "NODE_ENV"="development"; "NODE_OPTIONS"="--max_old_space_size=8192"; "PATH"=$curPath }
}

# ---- generate + launch each service ----
$launched = @()
foreach ($svc in $services) {
    $name = $svc.name; $port = $svc.port; $exe = $svc.exe; $args = $svc.args; $work = $svc.work; $envHash = $svc.env
    if ($Names -ne "" -and ($Names.ToLower() -split ',' | ForEach-Object { $_.Trim() }) -notcontains $name.ToLower()) { continue }
    if (Test-PortListening -Port $port) {
        $launched += "[SKIP] $name already listening on $port"
        continue
    }
    if (-not (Test-Path $exe)) {
        $launched += "[FAIL] $name exe not found: $exe"
        continue
    }
    $outLog = "$logDir\$($name)_startup_$ts.log"
    $errLog = "$logDir\$($name)_startup_$ts.log.stderr"

    # build env setup lines
    $envLines = ""
    foreach ($k in $envHash.Keys) {
        $envLines += "`$env:$k = '$($envHash[$k].Replace("'","''"))'`n"
    }
    # build args fragment (omit -ArgumentList entirely when no args; empty array breaks Start-Process)
    if ($args.Count -eq 0) { $argFragment = "" } else { $argFragment = "-ArgumentList @(" + (($args | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ", ") + ")" }

    $launcherContent = @"
# BEMP service launcher: $name (auto-generated)
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
`$outLog = '$outLog'
`$errLog = '$errLog'
$envLines`$proc = Start-Process -FilePath '$exe' $argFragment -WorkingDirectory '$work' -NoNewWindow -RedirectStandardOutput `$outLog -RedirectStandardError `$errLog -PassThru
Write-Host 'Service $name PID:' `$proc.Id
Write-Host 'Log: $outLog'
# keep this -NoExit host alive so the child service survives task completion
while (`$true) { Start-Sleep -Seconds 30 }
"@
    $launcherPath = "$logDir\launcher_$($name)_$ts.ps1"
    [System.IO.File]::WriteAllText($launcherPath, $launcherContent, [System.Text.UTF8Encoding]::new($false))

    try {
        Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit","-ExecutionPolicy","Bypass","-File","$launcherPath") -ErrorAction Stop
        $launched += "[OK]   $name launcher started (port $port) -> $launcherPath"
    } catch {
        $launched += "[FAIL] $name Start-Process error: $_"
    }
}

[System.IO.File]::WriteAllLines("$logDir\_launch_orchestrate_$ts.txt", $launched, [System.Text.UTF8Encoding]::new($false))
