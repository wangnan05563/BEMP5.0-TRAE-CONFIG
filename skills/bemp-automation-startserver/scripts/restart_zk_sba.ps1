$ErrorActionPreference='SilentlyContinue'
$logDir='C:\Users\hspcadmin\.workbuddy\skills\bemp-automation-startserver\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$ts=Get-Date -Format "yyyyMMdd_HHmmss"
$banks="D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank"
$javaHome="D:\code\Java\jdk1.8.0_341"
$javaExe=Join-Path $javaHome "bin\java.exe"

function Test-PortListening($p){
  try { $c=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; return ($null -ne $c -and @($c).Count -gt 0) } catch { return $false }
}

function Start-Wrapped($Name,$Port,$CmdBody,$Work,$Env){
  if (Test-PortListening -p $Port) { return "[SKIP] $Name already listening on $Port" }
  $cmdPath="$logDir\run_$($Name)_$ts.cmd"
  $logFile="$logDir\$($Name)_startup_$ts.log"
  $lines=@("@echo off")
  foreach ($k in $Env.Keys){ $lines += "set `"$($k)=$($Env[$k])`"" }
  $lines += "$CmdBody >> `"$logFile`" 2>&1"
  [System.IO.File]::WriteAllText($cmdPath, ($lines -join "`r`n"), [System.Text.UTF8Encoding]::new($false))
  try {
    $cmdLine="cmd.exe /c ""$cmdPath"""
    $res=Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList @($cmdLine,$Work,$null,$null)
    if ($res.ReturnValue -eq 0){ return "[OK]   $Name PID=$($res.ProcessId) (port $Port) log=$logFile [detached via WMI]" }
    else { return "[FAIL] $Name WMI Create returned $($res.ReturnValue)" }
  } catch { return "[FAIL] $Name WMI launch error: $_" }
}

function Get-SpringbootInfo($Module,$War,$MainClass,$Jvm){
  $modPath=Join-Path $banks $Module
  $webinfC=Join-Path $modPath "target\$War\WEB-INF\classes"
  $webinfL=Join-Path $modPath "target\$War\WEB-INF\lib"
  $a=@()
  $a += $Jvm.Split(' ')
  $a += @("-Dfile.encoding=UTF-8","-Dsun.stdout.encoding=UTF-8","-Dsun.stderr.encoding=UTF-8")
  if ((Test-Path $webinfC) -and (Test-Path $webinfL)){
    $work=Join-Path $modPath "target\$War"
    $a += @("-cp","WEB-INF\classes;WEB-INF\lib\*",$MainClass)
    return @{ work=$work; args=$a }
  }
  return $null
}

# 1) Kill old ZK / Served / Adapter JVMs only (keep Redis + Frontend alive)
$killIds=@()
Get-CimInstance Win32_Process -Filter "Name='java.exe'" | ForEach-Object {
  $cmd=$_.CommandLine
  if ($cmd -match 'BempServedAppStarter' -or $cmd -match 'BempAdapterAppStarter' -or $cmd -match 'org.apache.zookeeper') { $killIds += $_.ProcessId }
}
$killIds | Sort-Object -Unique | ForEach-Object {
  $pr=Get-Process -Id $_ -ErrorAction SilentlyContinue
  if ($pr){ try { $pr.Kill(); "killed java PID $_" } catch { "kill failed $_" } }
}
# kill the stale wrapper cmd processes from prior launch
@(27544,36468,17628) | ForEach-Object {
  $pr=Get-Process -Id $_ -ErrorAction SilentlyContinue
  if ($pr){ try { $pr.Kill() } catch {} }
}
Start-Sleep -Seconds 3

$result=@()
# 2) Launch ZooKeeper on 21811
$result += Start-Wrapped -Name "ZooKeeper" -Port 21811 -CmdBody "D:\code\apache-zookeeper-3.8.3-bin\bin\zkServer.cmd" -Work "D:\code\apache-zookeeper-3.8.3-bin\bin" -Env @{ "JAVA_TOOL_OPTIONS"="-Dfile.encoding=UTF-8" }

# 3) Wait for ZK readiness (dubbo needs it before Served/Adapter register)
$zkReady=$false
for($i=0;$i -lt 45;$i++){ if (Test-PortListening -p 21811){ $zkReady=$true; break }; Start-Sleep -Seconds 1 }
$result += if($zkReady){ "[OK]   ZooKeeper listening on 21811" } else { "[WARN] ZooKeeper not listening on 21811 after 45s" }

# 4) Launch Served
$served=Get-SpringbootInfo -Module "hnnxbank-served-deploy" -War "bemp-served" -MainClass "com.hundsun.bemp.BempServedAppStarter" -Jvm "-server -Xms1024m -Xmx2048m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
if($served){
  $body="`"$javaExe`" " + (($served.args | ForEach-Object { if($_ -like '*;*' -or $_ -like '* *'){ "`"$_`"" }else{ $_ } }) -join " ")
  $result += Start-Wrapped -Name "Served" -Port 8010 -CmdBody $body -Work $served.work -Env @{ "JAVA_HOME"=$javaHome }
} else { $result += "[FAIL] Served: no compiled classes" }

# 5) Launch Adapter
$adapter=Get-SpringbootInfo -Module "hnnxbank-adapter-deploy" -War "bemp-adapter" -MainClass "com.hundsun.bemp.BempAdapterAppStarter" -Jvm "-server -Xms512m -Xmx1024m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
if($adapter){
  $body="`"$javaExe`" " + (($adapter.args | ForEach-Object { if($_ -like '*;*' -or $_ -like '* *'){ "`"$_`"" }else{ $_ } }) -join " ")
  $result += Start-Wrapped -Name "Adapter" -Port 8090 -CmdBody $body -Work $adapter.work -Env @{ "JAVA_HOME"=$javaHome }
} else { $result += "[FAIL] Adapter: no compiled classes" }

[System.IO.File]::WriteAllLines("$logDir\_restart_zksba_$ts.txt", $result, [System.Text.UTF8Encoding]::new($false))
Write-Host "===== ZK+SBA restart summary (batch $ts) ====="
$result | ForEach-Object { Write-Host $_ }
