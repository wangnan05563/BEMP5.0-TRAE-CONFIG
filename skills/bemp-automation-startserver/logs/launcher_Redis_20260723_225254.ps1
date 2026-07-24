# BEMP Launcher: Redis - Auto-generated

chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$host.UI.RawUI.WindowTitle = 'BEMP - Redis (6379)'


Set-Location 'D:\code\Redis-x64-5.0.14.1'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  BEMP - Redis (6379)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Log: D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\Redis_startup_20260723_225254.log' -ForegroundColor Gray
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


& .\redis-server.exe 2>&1 | Convert-NativeOutput | Tee-Object -FilePath 'D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\Redis_startup_20260723_225254.log' -Append

Write-Host ''
Write-Host '[Service exited] Press any key to close...' -ForegroundColor Yellow
$null = [Console]::ReadKey($true)

