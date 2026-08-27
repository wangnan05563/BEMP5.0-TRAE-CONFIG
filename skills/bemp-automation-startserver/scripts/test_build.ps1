$banks    = "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank"
$logDir = Join-Path $PSScriptRoot '..\logs'
$javaHome = "D:\code\Java\jdk1.8.0_341"
$javaExe  = Join-Path $javaHome "bin\java.exe"
$sb = New-Object System.Text.StringBuilder

function Log($m){ [void]$sb.AppendLine($m) }

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

function Build-SpringbootCmd {
    param([string]$JavaExe,[array]$JavaArgs,[string]$JavaHome)
    $lines = @("@echo off")
    if ($JavaHome) { $lines += "set `"JAVA_HOME=$JavaHome`"" }
    $cmdArgs = ($JavaArgs | ForEach-Object { if ($_ -like '*;*' -or $_ -like '* *') { "`"$_`"" } else { $_ } }) -join " "
    $lines += "`"$JavaExe`" $cmdArgs"
    return ($lines -join "`r`n")
}

$served = Get-SpringbootInfo -Module "hnnxbank-served-deploy" -War "bemp-served" -MainClass "com.hundsun.bemp.BempServedAppStarter" -Jvm "-server -Xms1024m -Xmx2048m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m"
Log("served null? " + ($null -eq $served))
if ($served) {
  Log("served.args type: " + $served.args.GetType().Name)
  Log("served.args count: " + @($served.args).Count)
  Log("served.args raw: [" + ($served.args -join " | ") + "]")
  $cmd = Build-SpringbootCmd -JavaExe $javaExe -JavaArgs $served.args -JavaHome $javaHome
  Log("----- generated cmd -----")
  Log($cmd)
  Log("----- end -----")
}
[System.IO.File]::WriteAllText("${logDir}\_test_build_out.txt", $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
