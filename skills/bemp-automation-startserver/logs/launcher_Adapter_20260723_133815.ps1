# BEMP Launcher: Adapter - Auto-generated

chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$host.UI.RawUI.WindowTitle = 'BEMP - Adapter (8090)'

$env:JAVA_HOME = 'D:\code\Java\jdk1.8.0_341'

Set-Location 'd:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank\hnnxbank-adapter-deploy\target\bemp-adapter'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  BEMP - Adapter (8090)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Log: D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\Adapter_startup_20260723_133815.log' -ForegroundColor Gray
Write-Host ''
function Convert-NativeOutput {
    $input | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) {
            $_.ToString()
        } else {
            $_
        }
    }
}


$cmdArgs = @('-server', '-Xms512m', '-Xmx1024m', '-XX:MetaspaceSize=256m', '-XX:MaxMetaspaceSize=512m', '-Dfile.encoding=UTF-8', '-Dsun.stdout.encoding=UTF-8', '-Dsun.stderr.encoding=UTF-8', '-cp', 'WEB-INF\classes;WEB-INF\lib\*', 'com.hundsun.bemp.BempAdapterAppStarter')
& 'D:\code\Java\jdk1.8.0_341\bin\java.exe' @cmdArgs 2>&1 | Convert-NativeOutput | Tee-Object -FilePath 'D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\Adapter_startup_20260723_133815.log' -Append

Write-Host ''
Write-Host '[Service exited] Press any key to close...' -ForegroundColor Yellow
$null = [Console]::ReadKey($true)

