$work = "D:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-served-deploy\target\bemp-served"
$logDir = Join-Path $PSScriptRoot '..\logs'
$javaExe = "D:\code\Java\jdk1.8.0_341\bin\java.exe"
$args = @("-server","-Xms1024m","-Xmx2048m","-XX:MetaspaceSize=256m","-XX:MaxMetaspaceSize=512m","-Dfile.encoding=UTF-8","-Dsun.stdout.encoding=UTF-8","-Dsun.stderr.encoding=UTF-8","-cp","WEB-INF\classes;WEB-INF\lib\*","com.hundsun.bemp.BempServedAppStarter")
$out = "${logDir}\_java_diag.log"
$err = "${logDir}\_java_diag.log.stderr"
$r = @()
$r += "workdir exists: $(Test-Path $work)"
$r += "WEB-INF\classes exists: $(Test-Path (Join-Path $work 'WEB-INF\classes'))"
$r += "WEB-INF\lib exists: $(Test-Path (Join-Path $work 'WEB-INF\lib'))"
$p = Start-Process -FilePath $javaExe -ArgumentList $args -WorkingDirectory $work -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
Start-Sleep -Seconds 8
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
$r += "hasExited after 8s: $($p.HasExited)"
$r += "--- stdout (head) ---"
$r += (Get-Content $out -ErrorAction SilentlyContinue | Select-Object -First 15)
$r += "--- stderr (head) ---"
$r += (Get-Content $err -ErrorAction SilentlyContinue | Select-Object -First 15)
[System.IO.File]::WriteAllLines("${logDir}\_java_diag_result.txt", $r, [System.Text.UTF8Encoding]::new($false))