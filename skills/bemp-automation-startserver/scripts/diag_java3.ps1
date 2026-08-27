$work = "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-served-deploy\target\bemp-served"
$logDir = Join-Path $PSScriptRoot '..\logs'
$javaExe = "D:\code\Java\jdk1.8.0_341\bin\java.exe"
$args = @("-server","-Xms1024m","-Xmx2048m","-XX:MetaspaceSize=256m","-XX:MaxMetaspaceSize=512m","-Dfile.encoding=UTF-8","-Dsun.stdout.encoding=UTF-8","-Dsun.stderr.encoding=UTF-8","-cp","WEB-INF\classes;WEB-INF\lib\*","com.hundsun.bemp.BempServedAppStarter")
# simulate supervisor env leakage: JAVA_TOOL_OPTIONS + JAVA_HOME set in session
$env:JAVA_TOOL_OPTIONS = "-Dfile.encoding=UTF-8"
$env:JAVA_HOME = "D:\code\Java\jdk1.8.0_341"
$out = "${logDir}\_java_diag3.log"
$err = "${logDir}\_java_diag3.log.stderr"
$r = @()
$job = Start-Process -FilePath $javaExe -ArgumentList $args -WorkingDirectory $work -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
Start-Sleep -Seconds 12
$hasExited = $job.HasExited
if (-not $hasExited) { Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue }
$r += "hasExited after 12s: $hasExited"
$r += "--- stderr (head) ---"; $r += (Get-Content $err -ErrorAction SilentlyContinue | Select-Object -First 8)
$r += "--- stdout (head) ---"; $r += (Get-Content $out -ErrorAction SilentlyContinue | Select-Object -First 3)
[System.IO.File]::WriteAllLines("${logDir}\_java_diag3_result.txt", $r, [System.Text.UTF8Encoding]::new($false))