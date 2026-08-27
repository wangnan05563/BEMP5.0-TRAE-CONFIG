$work = "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-served-deploy\target\bemp-served"
$logDir = Join-Path $PSScriptRoot '..\logs'
$javaExe = "D:\code\Java\jdk1.8.0_341\bin\java.exe"
$args = @("-server","-Xms1024m","-Xmx2048m","-XX:MetaspaceSize=256m","-XX:MaxMetaspaceSize=512m","-Dfile.encoding=UTF-8","-Dsun.stdout.encoding=UTF-8","-Dsun.stderr.encoding=UTF-8","-cp","WEB-INF\classes;WEB-INF\lib\*","com.hundsun.bemp.BempServedAppStarter")
$out = "${logDir}\_java_diag2.log"
$err = "${logDir}\_java_diag2.log.stderr"
$r = @()
$job = Start-Process -FilePath $javaExe -ArgumentList $args -WorkingDirectory $work -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
Start-Sleep -Seconds 25
$portUp = (Get-NetTCPConnection -LocalPort 8010 -State Listen -ErrorAction SilentlyContinue) -ne $null
$hasExited = $job.HasExited
if (-not $hasExited) { Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue }
$r += "port8010 up after 25s: $portUp"
$r += "hasExited after 25s: $hasExited"
$r += "--- stdout (head) ---"; $r += (Get-Content $out -ErrorAction SilentlyContinue | Select-Object -First 20)
$r += "--- stderr (head) ---"; $r += (Get-Content $err -ErrorAction SilentlyContinue | Select-Object -First 20)
[System.IO.File]::WriteAllLines("${logDir}\_java_diag2_result.txt", $r, [System.Text.UTF8Encoding]::new($false))