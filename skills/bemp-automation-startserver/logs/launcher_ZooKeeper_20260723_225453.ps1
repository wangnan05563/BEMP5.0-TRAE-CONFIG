# BEMP Launcher: ZooKeeper - Auto-generated

chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$host.UI.RawUI.WindowTitle = 'BEMP - ZooKeeper (2181)'

$env:JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'

Set-Location 'D:\code\apache-zookeeper-3.8.3-bin\bin'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  BEMP - ZooKeeper (2181)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Log: D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\ZooKeeper_startup_20260723_225453.log' -ForegroundColor Gray
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


& .\zkServer.cmd 2>&1 | Convert-NativeOutput | Tee-Object -FilePath 'D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\ZooKeeper_startup_20260723_225453.log' -Append

Write-Host ''
Write-Host '[Service exited] Press any key to close...' -ForegroundColor Yellow
$null = [Console]::ReadKey($true)

