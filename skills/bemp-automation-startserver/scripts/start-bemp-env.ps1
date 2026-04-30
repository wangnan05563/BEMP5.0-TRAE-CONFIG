# BEMP Development Environment Startup Script
# Function: Check service status, start services in IDE terminal

param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\config.json",
    [string]$Service = "",
    [switch]$Status,
    [switch]$ForceRestart
)

$originalLocation = Get-Location

function Write-Header {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "     BEMP Dev Environment" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Test-PortListening {
    param([int]$port)
    try {
        $ipv4 = Get-NetTCPConnection -LocalPort $port -AddressFamily IPv4 -State Listen -ErrorAction SilentlyContinue
        $ipv6 = Get-NetTCPConnection -LocalPort $port -AddressFamily IPv6 -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $ipv4 -and $ipv4.Count -gt 0) -or ($null -ne $ipv6 -and $ipv6.Count -gt 0)
    } catch {
        try {
            $result = netstat -ano | findstr ":$port " | findstr "LISTENING"
            return ($null -ne $result -and $result -ne "")
        } catch {
            return $false
        }
    }
}

function Stop-ServiceByPort {
    param([int]$port, [string]$serviceName)
    if (Test-PortListening -port $port) {
        $processIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($processIds) {
            foreach ($processId in $processIds) {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Warning "Stopping $serviceName (PID: $processId)..."
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }
            Start-Sleep -Seconds 2
        }
    }
}

function Get-ServiceStatus {
    param([object]$config)
    
    $serviceName = $config.name
    
    if ($config.ports -is [array]) {
        foreach ($port in $config.ports) {
            if (Test-PortListening -port $port) {
                return @{ Status = "Running"; Port = $port }
            }
        }
        return @{ Status = "Stopped"; Port = ($config.ports -join ", ") }
    } else {
        $port = $config.port
        if (Test-PortListening -port $port) {
            return @{ Status = "Running"; Port = $port }
        } else {
            return @{ Status = "Stopped"; Port = $port }
        }
    }
}

function Set-TerminalTitle {
    param([string]$title)
    try {
        $host.UI.RawUI.WindowTitle = $title
    } catch {}
    $esc = [char]27
    $bel = [char]7
    Write-Host -NoNewline "$esc]0;$title$bel"
}

function Show-TerminalWarning {
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: This terminal will be occupied by the service." -ForegroundColor Yellow
    Write-Host "   Do NOT run other commands in this terminal after starting the service." -ForegroundColor Yellow
    Write-Host "   Use a separate terminal for status checks or other operations." -ForegroundColor Gray
    Write-Host ""
}

function Test-PortConflict {
    param([int]$port, [string]$serviceName)
    
    if (Test-PortListening -port $port) {
        $processIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($processIds) {
            foreach ($processId in $processIds) {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        $processName = $process.Name
                        Write-Warning "Port $port is already in use by process: $processName (PID: $processId)"
                        return @{ HasConflict = $true; ProcessName = $processName; ProcessId = $processId }
                    }
                } catch {}
            }
        }
    }
    return @{ HasConflict = $false }
}

function Start-RedisService {
    param([object]$config)
    
    $executable = $config.executable
    $serviceName = $config.name
    
    # 设置终端窗口标题
    Set-TerminalTitle "BEMP - Redis (6379)"
    
    Show-TerminalWarning
    
    Write-Step "Checking $serviceName status..."
    
    $isRunning = $false
    $checkPorts = if ($config.ports -is [array]) { $config.ports } else { @($config.port) }
    foreach ($port in $checkPorts) {
        if (Test-PortListening -port $port) {
            $isRunning = $true
            break
        }
    }
    $portsText = if ($config.ports -is [array]) { ($config.ports -join ", ") } else { $config.port }
    
    if ($isRunning -and -not $ForceRestart) {
        Write-Success "$serviceName is running (ports: $portsText)"
        return $true
    }
    
    if ($ForceRestart) {
        foreach ($port in $checkPorts) {
            Stop-ServiceByPort -port $port -serviceName $serviceName
        }
    }
    
    if (-not (Test-Path $executable)) {
        Write-Error "$serviceName executable not found: $executable"
        return $false
    }
    
    $redisDir = Split-Path -Parent $executable
    $redisExeName = Split-Path -Leaf $executable
    
    Write-Step "Starting $serviceName..."
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Log" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Working Dir: $redisDir" -ForegroundColor Gray
    Write-Host "Command: .\$redisExeName" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $redisDir
    
    # Re-set terminal title before process starts
    Set-TerminalTitle "BEMP - Redis (6379)"
    
    & ".\$redisExeName"
    
    return $true
}

function Start-ZooKeeperService {
    param([object]$config)

    $executable = $config.executable
    $serviceName = $config.name

    # 设置终端窗口标题
    Set-TerminalTitle "BEMP - ZooKeeper (2181)"
    
    Show-TerminalWarning

    Write-Step "Checking $serviceName status..."
    
    $isRunning = $false
    $checkPorts = if ($config.ports -is [array]) { $config.ports } else { @($config.port) }
    foreach ($port in $checkPorts) {
        if (Test-PortListening -port $port) {
            $isRunning = $true
            break
        }
    }
    $portsText = if ($config.ports -is [array]) { ($config.ports -join ", ") } else { $config.port }
    
    if ($isRunning -and -not $ForceRestart) {
        Write-Success "$serviceName is running (ports: $portsText)"
        return $true
    }
    
    if ($ForceRestart) {
        foreach ($port in $checkPorts) {
            Stop-ServiceByPort -port $port -serviceName $serviceName
        }
    }
    
    if (-not (Test-Path $executable)) {
        Write-Error "$serviceName executable not found: $executable"
        return $false
    }
    
    $zkDir = Split-Path -Parent $executable
    $zkExeName = Split-Path -Leaf $executable
    
    Write-Step "Starting $serviceName..."
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Log" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Working Dir: $zkDir" -ForegroundColor Gray
    Write-Host "Command: .\$zkExeName" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $zkDir
    
    # Re-set terminal title before process starts
    Set-TerminalTitle "BEMP - ZooKeeper (2181)"
    
    & ".\$zkExeName"
    
    return $true
}

function Start-SpringBootService {
    param(
        [object]$config,
        [object]$globalPaths
    )

    # Use global paths from config
    $projectPath = $globalPaths.banksProjectPath
    $workspaceRoot = $globalPaths.workspaceRoot
    $traePath = $globalPaths.traePath
    $javaHome = $globalPaths.javaHome
    $mavenPath = $globalPaths.mavenPath
    
    $modulePath = $config.modulePath
    $warFile = $config.warFile
    $serviceName = $config.name
    $mainClass = $config.mainClass
    $jvmOptions = $config.jvmOptions
    $launchMode = $config.launchMode
    $autoCompile = $config.autoCompile
    $mavenCommand = $config.mavenCommand

    # 设置终端窗口标题
    Set-TerminalTitle "BEMP - SpringBoot (8010)"
    
    Show-TerminalWarning

    Write-Step "Checking $serviceName status..."

    $isRunning = $false
    $checkPorts = if ($config.ports -is [array]) { $config.ports } else { @($config.port) }
    foreach ($port in $checkPorts) {
        if (Test-PortListening -port $port) {
            $isRunning = $true
            break
        }
    }
    $portsText = if ($config.ports -is [array]) { ($config.ports -join ", ") } else { $config.port }

    if ($isRunning -and -not $ForceRestart) {
        Write-Success "$serviceName is running (ports: $portsText)"
        return $true
    }

    # Check for port conflicts with other services before starting
    Write-Step "Checking for port conflicts..."
    $conflicts = @()
    foreach ($port in $checkPorts) {
        $conflict = Test-PortConflict -port $port -serviceName $serviceName
        if ($conflict.HasConflict -and $conflict.ProcessName -ne "java") {
            $conflicts += @{ Port = $port; Process = $conflict.ProcessName; PID = $conflict.ProcessId }
        }
    }
    
    if ($conflicts.Count -gt 0 -and -not $ForceRestart) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  ⚠️  PORT CONFLICT DETECTED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        foreach ($c in $conflicts) {
            Write-Error "Port $($c.Port) is occupied by: $($c.Process) (PID: $($c.PID))"
        }
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  1. Use -ForceRestart to stop conflicting processes and restart" -ForegroundColor Gray
        Write-Host "  2. Manually stop the conflicting services and try again" -ForegroundColor Gray
        Write-Host ""
        return $false
    }

    if ($ForceRestart) {
        foreach ($port in $checkPorts) {
            Stop-ServiceByPort -port $port -serviceName $serviceName
        }
    }

    Write-Step "Starting $serviceName..."
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Startup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Step 1: Check if project path exists
    if (-not (Test-Path $projectPath)) {
        Write-Error "Project path not found: $projectPath"
        return $false
    }

    # Step 2: Auto compile with Maven if enabled
    if ($autoCompile) {
        Write-Step "Auto-compiling project with Maven..."
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Maven Compilation" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Working Dir: $projectPath" -ForegroundColor Gray
        Write-Host "Maven: $mavenPath" -ForegroundColor Gray
        Write-Host "Command: $mavenPath $mavenCommand -pl $modulePath -am" -ForegroundColor Gray
        Write-Host ""
        
        if (-not (Test-Path $mavenPath)) {
            Write-Error "Maven not found: $mavenPath"
            Write-Host "Please check mavenPath in config.json" -ForegroundColor Yellow
            return $false
        }
        
        Set-Location $projectPath
        
        # Parse maven command and arguments
        $mavenArgs = $mavenCommand.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        
        # Add module arguments
        $mavenArgs += "-pl", $modulePath, "-am"
        
        & $mavenPath @mavenArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Maven compilation failed!"
            return $false
        }
        Write-Success "Maven compilation completed"
        Write-Host ""
        
        # Re-set terminal title after Maven (Maven may override it)
        Set-TerminalTitle "BEMP - SpringBoot (8010)"
    }

    # Step 3: Check if WAR file exists after compilation
    $warPath = Join-Path $projectPath "$modulePath\target\$warFile"
    if (-not (Test-Path $warPath)) {
        Write-Error "WAR file not found: $warPath"
        Write-Host ""
        Write-Host "Please compile the project first:" -ForegroundColor Yellow
        Write-Host "  cd $projectPath" -ForegroundColor Gray
        Write-Host "  $mavenPath $mavenCommand -pl $modulePath -am" -ForegroundColor Gray
        Write-Host ""
        return $false
    }

    Write-Success "WAR file found: $warPath"
    Write-Host ""

    # Check launch mode: "terminal" for direct terminal launch, "debug" for F5 debug mode
    if ($launchMode -eq "terminal") {
        return Start-SpringBootInTerminal -config $config -globalPaths $globalPaths
    } else {
        # Default to F5 Debug Mode (Trae IDE)
        return Start-SpringBootWithDebug -config $config -globalPaths $globalPaths
    }
}

function Start-SpringBootWithDebug {
    param([object]$config, [object]$globalPaths)

    $projectPath = $globalPaths.banksProjectPath
    $modulePath = $config.modulePath
    $mainClass = $config.mainClass
    $serviceName = $config.name
    $workspaceRoot = $globalPaths.workspaceRoot
    $traePath = $globalPaths.traePath

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Debug Launch" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Debug Configuration:" -ForegroundColor Green
    Write-Host "  Name: Spring Boot-后端调试" -ForegroundColor Gray
    Write-Host "  Main Class: $mainClass" -ForegroundColor Gray
    Write-Host "  Project: $modulePath" -ForegroundColor Gray
    Write-Host ""

    Write-Host "Starting Debug Session in Trae IDE..." -ForegroundColor Green
    Write-Host ""

    # Trigger Trae IDE debug session using CLI
    try {
        # Validate Trae path
        if (-not (Test-Path $traePath)) {
            Write-Error "Trae IDE not found at: $traePath"
            Write-Host "Please check the traePath configuration in config.json" -ForegroundColor Yellow
            return $false
        }

        # Convert paths for URI
        $workspaceUri = "file:///$($workspaceRoot.Replace('\', '/'))"
        $mainClassPath = "$projectPath/$modulePath/src/test/java/$($mainClass.Replace('.', '/')).java"

        Write-Host "Using Trae IDE: $traePath" -ForegroundColor Gray

        # Open the workspace folder in Trae
        $traeProcess = Start-Process -FilePath $traePath -ArgumentList "--folder-uri", $workspaceUri, "--goto", $mainClassPath -PassThru -WindowStyle Hidden

        Write-Host "Workspace opened in Trae IDE (PID: $($traeProcess.Id))" -ForegroundColor Green

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  SpringBoot Debug Ready" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Trae IDE has been opened with the workspace." -ForegroundColor Green
        Write-Host ""
        Write-Host "To start debugging SpringBoot:" -ForegroundColor Yellow
        Write-Host "  1. Switch to Trae IDE window" -ForegroundColor White
        Write-Host "  2. Press F5 (or click Run → Start Debugging)" -ForegroundColor White
        Write-Host ""
        Write-Host "Debug Features:" -ForegroundColor Cyan
        Write-Host "  ✓ Auto-detect compilation status" -ForegroundColor Green
        Write-Host "  ✓ Auto-compile if needed" -ForegroundColor Green
        Write-Host "  ✓ Start SpringBoot with debugger attached" -ForegroundColor Green
        Write-Host "  ✓ Hot-reload support enabled" -ForegroundColor Green
        Write-Host ""

    } catch {
        Write-Error "Failed to launch Trae IDE: $_"
        Write-Host "Please manually open the project and press F5 to debug" -ForegroundColor Yellow
    }

    return $true
}

function Start-SpringBootInTerminal {
    param([object]$config, [object]$globalPaths)

    $projectPath = $globalPaths.banksProjectPath
    $modulePath = $config.modulePath
    $warFile = $config.warFile
    $mainClass = $config.mainClass
    $jvmOptions = $config.jvmOptions
    $serviceName = $config.name
    $javaHome = $globalPaths.javaHome

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Terminal Launch" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Get WAR path
    $warPath = Join-Path $projectPath "$modulePath\target\$warFile"
    
    # Get classes and lib directories (support both exploded WAR and standard WAR structure)
    $classesDir = Join-Path $projectPath "$modulePath\target\classes"
    $libDir = Join-Path $projectPath "$modulePath\target\lib"
    $webinfClassesDir = Join-Path $projectPath "$modulePath\target\bemp-served\WEB-INF\classes"
    $webinfLibDir = Join-Path $projectPath "$modulePath\target\bemp-served\WEB-INF\lib"
    
    # Check directory structure and determine working directory and classpath
    if ((Test-Path $webinfClassesDir) -and (Test-Path $webinfLibDir)) {
        # Standard Maven WAR exploded structure (WEB-INF/classes and WEB-INF/lib)
        Write-Success "Using exploded WAR structure (WEB-INF)"
        $cpClasses = "WEB-INF\classes"
        $cpLib = "WEB-INF\lib\*"
        $workingDir = Join-Path $projectPath "$modulePath\target\bemp-served"
    } elseif ((Test-Path $classesDir) -and (Test-Path $libDir)) {
        # Flat structure (classes and lib at target level)
        Write-Success "Using flat exploded structure"
        $cpClasses = "..\classes"
        $cpLib = "..\lib\*"
        $workingDir = Split-Path -Parent $classesDir
    } else {
        # Fall back to WAR file
        Write-Success "Using WAR file: $warPath"
        $cpClasses = "WEB-INF\classes"
        $cpLib = "WEB-INF\lib\*"
        $workingDir = Join-Path $projectPath "$modulePath\target\bemp-served"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Log" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Working Dir: $workingDir" -ForegroundColor Gray
    Write-Host "Main Class: $mainClass" -ForegroundColor Gray
    Write-Host "JVM Options: $jvmOptions" -ForegroundColor Gray
    if ($javaHome) {
        Write-Host "JAVA_HOME: $javaHome" -ForegroundColor Gray
    }
    Write-Host ""

    Set-Location $workingDir

    # Build Java command
    $javaArgs = @()
    if ($javaHome) {
        $env:JAVA_HOME = $javaHome
        $env:PATH = "$javaHome\bin;$env:PATH"
        $javaExe = Join-Path $javaHome "bin\java.exe"
    } else {
        $javaExe = "java"
    }

    $javaArgs += $jvmOptions.Split(' ')
    $javaArgs += "-cp"
    $javaArgs += "$cpClasses;$cpLib"
    $javaArgs += $mainClass

    Write-Host "Command: $javaExe $($javaArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""

    # Re-set terminal title before Java process starts
    Set-TerminalTitle "BEMP - SpringBoot (8010)"

    # Start Java process in foreground (like ZooKeeper)
    & $javaExe $javaArgs

    return $true
}

function Start-FrontendService {
    param([object]$config, [object]$globalPaths)

    $projectPath = $globalPaths.frontendProjectPath
    $startCommand = $config.startCommand
    $nodePath = $globalPaths.nodePath
    $serviceName = $config.name

    # 设置终端窗口标题
    Set-TerminalTitle "BEMP - Frontend (8091)"
    
    Show-TerminalWarning

    Write-Step "Checking $serviceName status..."
    
    $isRunning = $false
    $checkPorts = if ($config.ports -is [array]) { $config.ports } else { @($config.port) }
    foreach ($port in $checkPorts) {
        if (Test-PortListening -port $port) {
            # 验证是否真的是前端服务（检查进程名）
            $processIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($processId in $processIds) {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process -and ($process.Name -eq "node" -or $process.Name -eq "node.exe")) {
                        $isRunning = $true
                        break
                    }
                } catch {}
            }
            if ($isRunning) { break }
        }
    }
    $portsText = if ($config.ports -is [array]) { ($config.ports -join ", ") } else { $config.port }
    
    if ($isRunning -and -not $ForceRestart) {
        Write-Success "$serviceName is running (ports: $portsText)"
        return $true
    }
    
    if ($ForceRestart) {
        foreach ($port in $checkPorts) {
            Stop-ServiceByPort -port $port -serviceName $serviceName
        }
    }
    
    Write-Step "Starting $serviceName..."
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Startup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Check if project path exists
    if (-not (Test-Path $projectPath)) {
        Write-Error "Project path not found: $projectPath"
        return $false
    }
    
    # Step 2: Check if Node.js path is configured and exists
    if ($nodePath) {
        if (-not (Test-Path $nodePath)) {
            Write-Error "Node.js executable not found: $nodePath"
            Write-Host "Please check the nodePath configuration in config.json" -ForegroundColor Yellow
            return $false
        }
        
        Write-Success "Using configured Node.js: $nodePath"
        $nodeExe = $nodePath
    } else {
        Write-Warning "No Node.js path configured, using system default"
        $nodeExe = "node"
    }
    
    # Step 3: Install dependencies if needed
    Set-Location $projectPath
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "First run, installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Dependency install failed!" -ForegroundColor Red
            return $false
        }
        Write-Host "Dependencies installed" -ForegroundColor Green
        Write-Host ""
    }
    
    # Step 4: Execute npm command with specified Node.js
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Frontend Development Server" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Working Dir: $projectPath" -ForegroundColor Gray
    Write-Host "Node.js: $nodeExe" -ForegroundColor Gray
    Write-Host "Command: $startCommand" -ForegroundColor Gray
    Write-Host ""
    
    # Get npm path from the configured Node.js installation
    $nodeDir = Split-Path -Parent $nodeExe
    $npmCmd = Join-Path $nodeDir "npm.cmd"
    
    # Temporarily prepend Node.js directory to PATH for npm to find the correct node
    $originalPath = $env:PATH
    $env:PATH = "$nodeDir;$env:PATH"
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "First run, installing dependencies..." -ForegroundColor Yellow
        & $npmCmd install
        if ($LASTEXITCODE -ne 0) {
            $env:PATH = $originalPath
            Write-Host "Dependency install failed!" -ForegroundColor Red
            return $false
        }
        Write-Host "Dependencies installed" -ForegroundColor Green
        Write-Host ""
    }
    
    # Start frontend service
    # Re-set terminal title before process starts
    Set-TerminalTitle "BEMP - Frontend (8091)"
    
    & $npmCmd run dev
    
    # Restore original PATH
    $env:PATH = $originalPath
    
    return $true
}

function Show-Status {
    param([object]$config)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Service Status" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $services = @()
    
    if ($config.services.redis.enabled) {
        $status = Get-ServiceStatus -config $config.services.redis
        $statusText = if ($status.Status -eq "Running") { "[OK] Running" } else { "[--] Stopped" }
        $services += [PSCustomObject]@{
            Service = $config.services.redis.name
            Port = $status.Port
            Status = $statusText
        }
    }
    
    if ($config.services.zookeeper.enabled) {
        $status = Get-ServiceStatus -config $config.services.zookeeper
        $statusText = if ($status.Status -eq "Running") { "[OK] Running" } else { "[--] Stopped" }
        $services += [PSCustomObject]@{
            Service = $config.services.zookeeper.name
            Port = $status.Port
            Status = $statusText
        }
    }
    
    if ($config.services.springboot.enabled) {
        $status = Get-ServiceStatus -config $config.services.springboot
        $statusText = if ($status.Status -eq "Running") { "[OK] Running" } else { "[--] Stopped" }
        $services += [PSCustomObject]@{
            Service = $config.services.springboot.name
            Port = $status.Port
            Status = $statusText
        }
    }
    
    if ($config.services.frontend.enabled) {
        $status = Get-ServiceStatus -config $config.services.frontend
        $statusText = if ($status.Status -eq "Running") { "[OK] Running" } else { "[--] Stopped" }
        $services += [PSCustomObject]@{
            Service = $config.services.frontend.name
            Port = $status.Port
            Status = $statusText
        }
    }
    
    $services | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}

Write-Header

Write-Step "Loading config: $ConfigPath"
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config not found: $ConfigPath"
    exit 1
}
$config = Get-Content $ConfigPath | ConvertFrom-Json
Write-Success "Config loaded"

if ($Status) {
    Show-Status -config $config
    Set-Location $originalLocation
    exit 0
}

if ($Service -ne "") {
    # Extract global paths from config
    $globalPaths = $config.globalPaths
    
    switch ($Service.ToLower()) {
        "redis" {
            if ($config.services.redis.enabled) {
                Start-RedisService -config $config.services.redis
            } else {
                Write-Warning "Redis is disabled"
            }
        }
        "zookeeper" {
            if ($config.services.zookeeper.enabled) {
                Start-ZooKeeperService -config $config.services.zookeeper
            } else {
                Write-Warning "ZooKeeper is disabled"
            }
        }
        "springboot" {
            if ($config.services.springboot.enabled) {
                Start-SpringBootService -config $config.services.springboot -globalPaths $globalPaths
            } else {
                Write-Warning "SpringBoot is disabled"
            }
        }
        "frontend" {
            if ($config.services.frontend.enabled) {
                Start-FrontendService -config $config.services.frontend -globalPaths $globalPaths
            } else {
                Write-Warning "Frontend is disabled"
            }
        }
        default {
            Write-Error "Unknown service: $Service"
            Write-Host "Available: redis, zookeeper, springboot, frontend"
        }
    }
    Set-Location $originalLocation
    exit 0
}

Show-Status -config $config

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  ⚠️  IMPORTANT WARNINGS" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "1. Each service MUST run in a SEPARATE IDE terminal" -ForegroundColor Yellow
Write-Host "   ❌ Don't start multiple services in the same terminal" -ForegroundColor Red
Write-Host "   ✅ Use a new terminal for each service" -ForegroundColor Green
Write-Host ""
Write-Host "2. Once started, DON'T run other commands in that terminal" -ForegroundColor Yellow
Write-Host "   The terminal is occupied by the service process" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Use '-Status' in a separate terminal to check service status" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Startup Instructions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Open a NEW terminal for each service:" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 1 - Redis:" -ForegroundColor Cyan
Write-Host "    .\start-bemp-env.ps1 -Service redis" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 - ZooKeeper:" -ForegroundColor Cyan
Write-Host "    .\start-bemp-env.ps1 -Service zookeeper" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 3 - SpringBoot (Debug Mode - Press F5):" -ForegroundColor Cyan
Write-Host "    .\start-bemp-env.ps1 -Service springboot" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 4 - Frontend:" -ForegroundColor Cyan
Write-Host "    .\start-bemp-env.ps1 -Service frontend" -ForegroundColor White
Write-Host ""
Write-Host "Step 2: Check status (in a separate terminal):" -ForegroundColor Green
Write-Host "    .\start-bemp-env.ps1 -Status" -ForegroundColor Gray
Write-Host ""
Write-Host "Step 3: Force restart if needed:" -ForegroundColor Green
Write-Host "    .\start-bemp-env.ps1 -Service <name> -ForceRestart" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $originalLocation
