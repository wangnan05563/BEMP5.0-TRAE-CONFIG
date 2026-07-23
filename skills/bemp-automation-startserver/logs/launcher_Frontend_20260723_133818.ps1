# BEMP Launcher: Frontend - Auto-generated

chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$host.UI.RawUI.WindowTitle = 'BEMP - Frontend (8091)'

$env:NODE_OPTIONS = '--max_old_space_size=8192'
$env:NODE_ENV = 'development'
$env:PATH = 'D:\code\nodejs14;f:\Program Files\Trae CN\resources\app\modules\ai-agent\bin;D:\code\nodejs24;D:\code\Java\jdk1.8.0_341\bin;C:\Users\hspcadmin\.trae-cn\tools\maven\latest\bin;C:\Users\hspcadmin\.trae-cn\tools\gradle\latest\bin;D:\code\sonar\sonar-scanner-8.0.1.6346-windows-x64\bin;E:\app\hspcadmin\product\11.2.0\dbhome_1\bin;F:\Program Files\VMware\VMware Workstation\bin\;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\;C:\Windows\System32\OpenSSH\;D:\code\Java\jdk1.8.0_341\bin;D:\code\Java\jdk1.8.0_341\jre\bin;F:\Program Files\TortoiseSVN\bin;C:\Program Files\Tailscale\;C:\Program Files\dotnet\;F:\Program Files\Tailscale\;D:\code\apache-maven-3.6.3\bin;F:\Program Files\Microsoft VS Code\bin;D:\code\apache-ant-1.10.15\bin;D:\code\nodejs24;F:\Program Files\Wireshark;F:\Program Files\Git\cmd;F:\Program Files\MySQL\MySQL Server 8.0\bin;D:\code\apache-cxf-4.1.4\bin;F:\Program Files\Python3.14;F:\Program Files\Python3.14\Scripts;D:\code\gradle-9.4.1\bin;C:\Program Files\Docker\Docker\resources\bin;C:\Users\hspcadmin\.cargo\bin;f:\Program Files\Trae CN\bin;F:\Program Files\Python3.14\Scripts\;F:\Program Files\Python3.14\;C:\Users\hspcadmin\.local\bin;C:\Users\hspcadmin\AppData\Local\Microsoft\WindowsApps;D:\code\apache-maven-3.6.3\bin;F:\Program Files\Fiddler;C:\Users\hspcadmin\AppData\Roaming\npm;C:\Users\hspcadmin\AppData\Local\Programs\Ollama;C:\Users\hspcadmin\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;;c:\Users\hspcadmin\.trae-cn\extensions\ms-python.debugpy-2026.6.0-win32-x64\bundled\scripts\noConfigScripts;c:\Users\hspcadmin\.trae-cn\extensions\vscjava.vscode-java-debug-0.59.0-universal\bundled\scripts\noConfigScripts;D:\code\sonar\sonar-scanner-8.0.1.6346-windows-x64\bin;E:\app\hspcadmin\product\11.2.0\dbhome_1\bin;F:\Program Files\VMware\VMware Workstation\bin\;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\;C:\Windows\System32\OpenSSH\;D:\code\Java\jdk1.8.0_341\bin;D:\code\Java\jdk1.8.0_341\jre\bin;F:\Program Files\TortoiseSVN\bin;C:\Program Files\Tailscale\;C:\Program Files\dotnet\;F:\Program Files\Tailscale\;D:\code\apache-maven-3.6.3\bin;F:\Program Files\Microsoft VS Code\bin;D:\code\apache-ant-1.10.15\bin;D:\code\nodejs24;F:\Program Files\Wireshark;F:\Program Files\Git\cmd;F:\Program Files\MySQL\MySQL Server 8.0\bin;D:\code\apache-cxf-4.1.4\bin;F:\Program Files\Python3.14;F:\Program Files\Python3.14\Scripts;D:\code\gradle-9.4.1\bin;C:\Program Files\Docker\Docker\resources\bin;C:\Users\hspcadmin\.cargo\bin;f:\Program Files\Trae CN\bin;F:\Program Files\Python3.14\Scripts\;F:\Program Files\Python3.14\;C:\Users\hspcadmin\.local\bin;C:\Users\hspcadmin\AppData\Local\Microsoft\WindowsApps;F:\Program Files\Fiddler;C:\Users\hspcadmin\AppData\Roaming\npm;C:\Users\hspcadmin\AppData\Local\Programs\Ollama;C:\Users\hspcadmin\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;f:\Program Files\Trae CN\resources\app\bin\lib;f:\Program Files\Trae CN\resources\app\node_modules\@vscode\ripgrep\bin'

Set-Location 'd:\code\QJ\BEMP5.0DEV\frontend'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  BEMP - Frontend (8091)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Log: D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\Frontend_startup_20260723_133818.log' -ForegroundColor Gray
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

Write-Host 'Node version: ' -NoNewline -ForegroundColor Cyan; & 'D:\code\nodejs14\node.exe' --version
Write-Host 'NPM version:  ' -NoNewline -ForegroundColor Cyan; & 'D:\code\nodejs14\npm.cmd' --version
Write-Host ''

$cmdArgs = @('run', 'dev', '--scripts-prepend-node-path')
& 'D:\code\nodejs14\npm.cmd' @cmdArgs 2>&1 | Convert-NativeOutput | Tee-Object -FilePath 'D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\..\logs\Frontend_startup_20260723_133818.log' -Append

Write-Host ''
Write-Host '[Service exited] Press any key to close...' -ForegroundColor Yellow
$null = [Console]::ReadKey($true)

