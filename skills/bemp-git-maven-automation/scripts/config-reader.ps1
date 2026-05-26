<#
.SYNOPSIS
配置读取与验证工具
.DESCRIPTION
读取config/config.properties，自动检测项目根目录，验证配置有效性
#>

$script:ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { $null }

function Read-PropertiesFile {
    param([string]$Path)
    $result = New-Object System.Collections.Specialized.OrderedDictionary
    if (!(Test-Path $Path)) { return $result }
    foreach ($line in Get-Content $Path -Encoding UTF8) {
        $trimmed = $line.Trim()
        if ($trimmed -and !$trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
            $parts = $trimmed.Split("=", 2)
            $result[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $result
}

function Get-BuildConfig {
    $skillRoot = $env:BEMP_SKILL_ROOT
    if (!$skillRoot -and $script:ScriptRoot) {
        $skillRoot = Split-Path -Parent $script:ScriptRoot
    }
    if (!$skillRoot) {
        $candidate = Join-Path $PWD ".trae\skills\bemp-git-maven-automation"
        if (Test-Path $candidate) { $skillRoot = (Resolve-Path $candidate).Path }
    }
    if (!$skillRoot) {
        Write-Error "Cannot determine skill root. Set BEMP_SKILL_ROOT env or run from project root."; return $null
    }

    $configFile = Join-Path $skillRoot "config\config.properties"
    $config = Read-PropertiesFile $configFile

    $env:BEMP_SKILL_ROOT = $skillRoot

    $defaultPairs = @(
        "BUILD_TYPE=incremental",
        "BANKS_BUILD_DIRS=ext-hnnxbank",
        "BANKS_BUILD_DEPENDENCIES=true",
        "MAVEN_OPTS=-Xmx2048m -XX:MaxMetaspaceSize=512m",
        "SKIP_DIRS=node_modules,target,.idea,log,logs",
        "CONFLICT_ACTION=stop",
        "PARALLEL_BUILD=false",
        "BUILD_THREADS=4",
        "GIT_RETRY_COUNT=3",
        "ENABLE_BUILD_REPORT=true",
        "BUILD_ORDER=bom,framework,adapter,banks,served",
        "SKIP_BUILD_EXTENSIONS=.md,.txt,.gitignore,.gitattributes",
        "BUILD_LOG_LEVEL=normal",
        "SKIP_CLEAN_ON_LOCK=true"
    )
    foreach ($pair in $defaultPairs) {
        $parts = $pair.Split("=", 2)
        $key = $parts[0]
        $val = $parts[1]
        if (!$config.Contains($key) -or [string]::IsNullOrWhiteSpace($config[$key])) {
            $config[$key] = $val
        }
    }

    foreach ($key in @([string[]]$config.Keys)) {
        $envVal = [Environment]::GetEnvironmentVariable($key)
        if ($envVal) { $config[$key] = $envVal }
    }

    if ($config["PROJECT_ROOT"] -and (Test-Path $config["PROJECT_ROOT"])) {
        $config["PROJECT_ROOT"] = (Resolve-Path $config["PROJECT_ROOT"]).Path
    } else {
        $config["PROJECT_ROOT"] = (Get-Item (Join-Path $skillRoot "..\..\..")).FullName
    }

    $banksRoot = Join-Path $config["PROJECT_ROOT"] "banks"
    if (Test-Path $banksRoot) {
        $config["BANKS_ROOT_DIR"] = $banksRoot
        if ([string]::IsNullOrWhiteSpace($config["BANKS_BUILD_DIRS"])) {
            $discovered = Get-AvailableBanks $banksRoot
            if ($discovered) {
                $config["BANKS_BUILD_DIRS"] = $discovered -join ","
                Write-Host "Auto-discovered banks: $($config['BANKS_BUILD_DIRS'])"
            }
        }
    }

    return $config
}

function Test-BuildConfig {
    param($Config)
    $errors = @()

    if (!$Config["PROJECT_ROOT"] -or !(Test-Path $Config["PROJECT_ROOT"])) {
        $errors += "PROJECT_ROOT invalid: $($Config['PROJECT_ROOT'])"
    }

    if ($Config["BANKS_BUILD_DIRS"] -and $Config["BANKS_ROOT_DIR"]) {
        foreach ($dir in ($Config["BANKS_BUILD_DIRS"] -split "," | ForEach-Object { $_.Trim() })) {
            if (!(Test-Path (Join-Path $Config["BANKS_ROOT_DIR"] $dir))) {
                $errors += "BANKS_BUILD_DIRS dir not found: $dir"
            }
        }
    }

    if (@("full", "incremental") -notcontains $Config["BUILD_TYPE"]) {
        $errors += "BUILD_TYPE invalid: $($Config['BUILD_TYPE'])"
    }

    if (@("stop", "warn", "skip") -notcontains $Config["CONFLICT_ACTION"]) {
        $errors += "CONFLICT_ACTION invalid: $($Config['CONFLICT_ACTION'])"
    }

    if ($Config["BUILD_ORDER"]) {
        $orderModules = ($Config["BUILD_ORDER"] -split "," | ForEach-Object { $_.Trim() })
        if ($orderModules.Count -eq 0) {
            $errors += "BUILD_ORDER is empty"
        }
    }

    return $errors
}

function Split-ConfigList {
    param([string]$Value)
    if (!$Value) { return @() }
    return $Value.Split(",", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }
}

function Get-AvailableBanks {
    param([string]$BanksRoot)
    if (!$BanksRoot -or !(Test-Path $BanksRoot)) { return @() }
    return Get-ChildItem $BanksRoot -Directory | Where-Object {
        $_.Name -match "^ext-" -and $_.Name -notmatch "@tmp$" -and (Test-Path (Join-Path $_.FullName "pom.xml"))
    } | Select-Object -ExpandProperty Name
}

function Find-GitCmd {
    $savedEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    foreach ($p in @("git", (Get-Command git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source), "C:\Program Files\Git\cmd\git.exe")) {
        if ($p -and (Get-Command $p -ErrorAction SilentlyContinue)) { $ErrorActionPreference = $savedEAP; return $p }
    }
    $ErrorActionPreference = $savedEAP; return $null
}

function Test-EnvPrerequisites {
    param($Config, [string]$GitCmd)
    $savedEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $checks = @()
    if (!$GitCmd) { $checks += "git not found" }
    $javaOut = & java -version 2>&1 | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_.ToString() } }
    $javaVer = ($javaOut | Select-Object -First 1)
    if ($javaVer -notmatch "1\.8|11|17|21") { $checks += "Java 8+ required (got: $javaVer)" }
    $mvnOut = & mvn -version 2>&1 | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_.ToString() } }
    $mvnVer = ($mvnOut | Select-Object -First 1)
    if ($mvnVer -notmatch "3\.") { $checks += "Maven 3.6+ required (got: $mvnVer)" }
    $ErrorActionPreference = $savedEAP
    $drive = (Get-Item $Config.PROJECT_ROOT).Root.Name.Substring(0,1)
    $freeGB = [math]::Round((Get-PSDrive -Name $drive).Free / 1GB, 1)
    if ($freeGB -lt 2) { $checks += "Disk free ${freeGB}GB < 2GB" }
    if ($checks) { Write-Error ($checks -join "`n"); return $false }
    Write-Host "OK: Java OK, Maven OK, git=$GitCmd, Disk ${freeGB}GB"; return $true
}

function Find-GitRepos {
    param($Config, [string]$GitCmd)
    $root = $Config.PROJECT_ROOT
    $skipDirs = Split-ConfigList $Config.SKIP_DIRS
    $buildOrder = Split-ConfigList $Config.BUILD_ORDER
    $repos = @()

    foreach ($orderDir in $buildOrder) {
        $orderPath = Join-Path $root $orderDir
        if (!(Test-Path $orderPath)) { continue }

        if ($orderDir -eq "banks" -and $Config.BANKS_ROOT_DIR) {
            if (Test-Path (Join-Path $orderPath ".git")) {
                $repos += @{ name = "banks"; path = $orderPath; order = $orderDir }
            } else {
                $bankDirs = Split-ConfigList $Config.BANKS_BUILD_DIRS
                if ($bankDirs.Count -gt 0) {
                    foreach ($bd in $bankDirs) {
                        $bankPath = Join-Path $Config.BANKS_ROOT_DIR $bd
                        if ((Test-Path $bankPath) -and (Test-Path (Join-Path $bankPath ".git"))) {
                            $repos += @{ name = "banks/$bd"; path = $bankPath; order = $orderDir }
                        }
                    }
                } else {
                    Get-ChildItem $orderPath -Directory | Where-Object {
                        $_.Name -notin $skipDirs -and (Test-Path (Join-Path $_.FullName ".git"))
                    } | ForEach-Object {
                        $repos += @{ name = "banks/$($_.Name)"; path = $_.FullName; order = $orderDir }
                    }
                }
            }
        } elseif (Test-Path (Join-Path $orderPath ".git")) {
            $repos += @{ name = $orderDir; path = $orderPath; order = $orderDir }
        } else {
            Get-ChildItem $orderPath -Directory | Where-Object {
                $_.Name -notin $skipDirs -and (Test-Path (Join-Path $_.FullName ".git"))
            } | ForEach-Object {
                $repos += @{ name = "$orderDir/$($_.Name)"; path = $_.FullName; order = $orderDir }
            }
        }
    }

    Write-Host "Found $($repos.Count) git repos"
    foreach ($r in $repos) { Write-Host "  $($r.name): $($r.path)" }
    return ,$repos
}

function Sync-GitRepos {
    param($Config, [string]$GitCmd, [array]$RepoList)
    $retryCount = [int]$Config.GIT_RETRY_COUNT
    $conflictAction = $Config.CONFLICT_ACTION
    $skipExts = Split-ConfigList $Config.SKIP_BUILD_EXTENSIONS
    $results = @()

    $proxyArg = ""
    $proxyUrl = & $GitCmd config --global http.proxy 2>&1
    if ($proxyUrl -and $proxyUrl -is [string] -and $proxyUrl -match "127\.0\.0\.1|localhost") {
        $proxyArg = '-c','http.proxy=','-c','https.proxy='
    }

    foreach ($repo in $RepoList) {
        $entry = @{ name = $repo.name; path = $repo.path; order = $repo.order; status = "unknown"; hasSrcChanges = $false; error = "" }

        Push-Location $repo.path
        try {
            $stashRef = & $GitCmd stash list 2>&1 | Select-Object -First 1
            $hadStashBefore = [bool]$stashRef

            $localChanges = & $GitCmd status --porcelain 2>&1
            $didStash = $false
            $localSrcChanges = @()
            if ($localChanges) {
                $localSrcChanges = $localChanges | Where-Object {
                    try { $ext = [System.IO.Path]::GetExtension(($_ -replace "^[MADRC?! ]+ ", "").Trim()); $ext -and $ext -notin $skipExts } catch { $false }
                }
                $stashOut = & $GitCmd stash push -m "bemp-auto-stash" 2>&1
                if ($LASTEXITCODE -eq 0) { $didStash = $true }
            }

            $fetchOk = $false
            for ($i = 0; $i -lt $retryCount; $i++) {
                $fetchOut = & $GitCmd @proxyArg fetch --all 2>&1
                if ($LASTEXITCODE -eq 0) { $fetchOk = $true; break }
                Start-Sleep -Seconds 2
            }
            if (!$fetchOk) {
                $entry.status = "fetch_failed"
                $entry.error = "fetch failed after $retryCount retries"
                if ($didStash) { & $GitCmd stash pop 2>&1 | Out-Null }
                $results += $entry; continue
            }

            $beforeHash = ""
            $hashOut = & $GitCmd rev-parse HEAD 2>&1
            if ($LASTEXITCODE -eq 0) { $beforeHash = $hashOut.Trim() }

            $pullOk = $false
            for ($i = 0; $i -lt $retryCount; $i++) {
                $pullOut = & $GitCmd @proxyArg pull 2>&1
                if ($LASTEXITCODE -eq 0) { $pullOk = $true; break }
                if ($pullOut -match "CONFLICT") {
                    $entry.status = "conflict"
                    $entry.error = "merge conflict"
                    break
                }
                Start-Sleep -Seconds 2
            }

            if ($entry.status -eq "conflict") {
                if ($conflictAction -eq "stop") {
                    if ($didStash) { & $GitCmd stash pop 2>&1 | Out-Null }
                    $results += $entry
                    Write-Error "Conflict in $($repo.name), stopping (CONFLICT_ACTION=stop)"
                    return ,$results
                }
                $results += $entry; continue
            }

            if (!$pullOk) {
                $entry.status = "pull_failed"
                $entry.error = "pull failed after $retryCount retries"
                if ($didStash) { & $GitCmd stash pop 2>&1 | Out-Null }
                $results += $entry; continue
            }

            $afterHash = ""
            $hashOut2 = & $GitCmd rev-parse HEAD 2>&1
            if ($LASTEXITCODE -eq 0) { $afterHash = $hashOut2.Trim() }
            if ($beforeHash -and $afterHash -and $beforeHash -ne $afterHash) {
                $diffOut = & $GitCmd -c core.quotepath=false diff --name-only $beforeHash $afterHash 2>&1 | Where-Object { $_ -is [string] -and $_.Trim() }
                if ($diffOut) {
                    $srcFiles = $diffOut | Where-Object {
                        try { $ext = [System.IO.Path]::GetExtension($_.Trim()); $ext -and $ext -notin $skipExts } catch { $false }
                    }
                    if ($srcFiles) { $entry.hasSrcChanges = $true }
                }
            }

            $entry.status = "synced"

            if ($localSrcChanges -and $localSrcChanges.Count -gt 0) {
                $entry.hasSrcChanges = $true
            }

            if ($didStash) {
                $popOut = & $GitCmd stash pop 2>&1
                if ($LASTEXITCODE -ne 0) {
                    $entry.status = "stash_conflict"
                    $entry.error = "stash pop conflict, manual resolve needed"
                }
            }
        } catch {
            $entry.status = "error"
            $entry.error = $_.Exception.Message
        } finally {
            Pop-Location
        }

        $results += $entry
        $statusMark = if ($entry.status -eq "synced") { "OK" } else { "FAIL" }
        $changeMark = if ($entry.hasSrcChanges) { "src" } else { "no-change" }
        Write-Host "$statusMark $($entry.name): $($entry.status) ($changeMark)"
    }

    return ,$results
}

function Test-TargetLocked {
    param([string]$ModulePath)
    $targetDir = Join-Path $ModulePath "target"
    if (!(Test-Path $targetDir)) { return $false }
    try {
        $testFile = Join-Path $targetDir ".bemp-write-test-$(Get-Random)"
        [IO.File]::Create($testFile).Close()
        Remove-Item $testFile -Force -ErrorAction SilentlyContinue
        return $false
    } catch {
        return $true
    }
}

function Start-MvnBuild {
    param(
        [string]$ModulePath,
        [string]$ModuleName,
        [string]$BuildType,
        [bool]$SkipCleanOnLock,
        [string]$LogLevel,
        [string]$MavenOpts,
        [string[]]$ExtraArgs
    )

    $needClean = $BuildType -eq "full"

    if ($needClean -and $SkipCleanOnLock -and (Test-TargetLocked $ModulePath)) {
        Write-Host "  [WARN] Target locked by another process, skipping clean phase" -ForegroundColor Yellow
        $needClean = $false
    }

    $mvnArgs = @()
    if ($needClean) { $mvnArgs += "clean" }
    $mvnArgs += "install"
    $mvnArgs += "-DskipTests"
    $mvnArgs += $ExtraArgs

    $env:MAVEN_OPTS = "$MavenOpts -Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8"
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $moduleStart = Get-Date

    Write-Host "Building $ModuleName ..." -ForegroundColor Cyan

    $allOutput = [System.Collections.Generic.List[string]]::new()
    Push-Location $ModulePath
    try {
        & mvn $mvnArgs 2>&1 | ForEach-Object {
            $line = if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_.ToString() }
            $allOutput.Add($line)

            $shouldShow = switch ($LogLevel) {
                "verbose" { $true }
                "quiet" { $line -match "BUILD |ERROR|FAILURE" }
                default { $line -match "Building |BUILD |ERROR|WARNING|---" }
            }
            if ($shouldShow) {
                if ($line -match "BUILD SUCCESS") { Write-Host $line -ForegroundColor Green }
                elseif ($line -match "BUILD FAILURE") { Write-Host $line -ForegroundColor Red }
                elseif ($line -match "^\[ERROR\]") { Write-Host $line -ForegroundColor Red }
                elseif ($line -match "^\[WARNING\]") { Write-Host $line -ForegroundColor Yellow }
                else { Write-Host $line }
            }
        }
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    $moduleElapsed = ((Get-Date) - $moduleStart).ToString("mm\:ss")

    if ($exitCode -eq 0) {
        Write-Host "$ModuleName|SUCCESS ($moduleElapsed)" -ForegroundColor Green
        return @{ module = $ModuleName; status = "SUCCESS"; elapsed = $moduleElapsed }
    } else {
        $tailLines = $allOutput | Select-Object -Last 20
        Write-Host ($tailLines -join "`n") -ForegroundColor Red
        Write-Host "$ModuleName|FAILED ($moduleElapsed)" -ForegroundColor Red
        return @{ module = $ModuleName; status = "FAILED"; elapsed = $moduleElapsed }
    }
}

function Invoke-MavenBuild {
    param($Config, [array]$SyncResults)
    $buildType = $Config.BUILD_TYPE
    $mavenOpts = $Config.MAVEN_OPTS
    $buildOrder = Split-ConfigList $Config.BUILD_ORDER
    $parallelBuild = $Config.PARALLEL_BUILD -eq "true"
    $buildThreads = [int]$Config.BUILD_THREADS
    $enableReport = $Config.ENABLE_BUILD_REPORT -eq "true"
    $buildDeps = $Config.BANKS_BUILD_DEPENDENCIES -eq "true"
    $projectRoot = $Config.PROJECT_ROOT
    $logLevel = if ($Config.BUILD_LOG_LEVEL) { $Config.BUILD_LOG_LEVEL } else { "normal" }
    $skipCleanOnLock = $Config.SKIP_CLEAN_ON_LOCK -eq "true"
    $startTime = Get-Date
    $buildResults = @()

    $modulesToBuild = @()
    if ($buildType -eq "full") {
        $modulesToBuild = $buildOrder
    } else {
        $changedOrders = $SyncResults | Where-Object { $_["hasSrcChanges"] -eq $true } | ForEach-Object { $_["order"] } | Select-Object -Unique
        $modulesToBuild = $buildOrder | Where-Object { $_ -in $changedOrders }
        if ($modulesToBuild.Count -eq 0) {
            Write-Host "No source changes detected, skipping build (use BUILD_TYPE=full to force)" -ForegroundColor Yellow
            return
        }
        Write-Host "Incremental build modules: $($modulesToBuild -join ', ')" -ForegroundColor Cyan
        $changedRepos = $SyncResults | Where-Object { $_["hasSrcChanges"] -eq $true }
        foreach ($cr in $changedRepos) {
            Write-Host "  $($cr["name"]): source changes detected" -ForegroundColor Yellow
        }
    }

    foreach ($module in $modulesToBuild) {
        $modulePath = Join-Path $projectRoot $module
        if (!(Test-Path $modulePath)) { continue }

        if ($module -eq "banks" -and $Config.BANKS_ROOT_DIR) {
            $bankDirs = Split-ConfigList $Config.BANKS_BUILD_DIRS
            $bankRepos = $SyncResults | Where-Object { $_["order"] -eq "banks" -and ($buildType -eq "full" -or $_["hasSrcChanges"] -eq $true) }
            if ($bankRepos.Count -eq 0) { continue }

            $bankNames = @()
            if ($bankDirs.Count -gt 0) {
                $bankNames = $bankDirs
            } else {
                $bankNames = Get-AvailableBanks $Config.BANKS_ROOT_DIR
            }

            foreach ($bankName in $bankNames) {
                $bankPath = Join-Path $Config.BANKS_ROOT_DIR $bankName
                if (!(Test-Path (Join-Path $bankPath "pom.xml"))) { continue }

                $extraArgs = @()
                if ($buildDeps) { $extraArgs += "-am" }
                if ($parallelBuild) { $extraArgs += "-T"; $extraArgs += $buildThreads.ToString() }

                $result = Start-MvnBuild -ModulePath $bankPath -ModuleName "banks/$bankName" -BuildType $buildType -SkipCleanOnLock $skipCleanOnLock -LogLevel $logLevel -MavenOpts $mavenOpts -ExtraArgs $extraArgs
                $buildResults += $result
            }
        } else {
            if (!(Test-Path (Join-Path $modulePath "pom.xml"))) { continue }

            $extraArgs = @()
            if ($parallelBuild) { $extraArgs += "-T"; $extraArgs += $buildThreads.ToString() }

            $result = Start-MvnBuild -ModulePath $modulePath -ModuleName $module -BuildType $buildType -SkipCleanOnLock $skipCleanOnLock -LogLevel $logLevel -MavenOpts $mavenOpts -ExtraArgs $extraArgs
            $buildResults += $result
        }
    }

    $elapsed = ((Get-Date) - $startTime).ToString("hh\:mm\:ss")
    $successCount = ($buildResults | Where-Object { $_.status -eq "SUCCESS" }).Count
    $totalCount = $buildResults.Count

    if ($enableReport) {
        Write-Host ""
        Write-Host "===== Build Report =====" -ForegroundColor Cyan
        Write-Host "Mode: $buildType | Total: $totalCount | Success: $successCount | Failed: $($totalCount - $successCount)"
        Write-Host "Elapsed: $elapsed"
        $succeeded = $buildResults | Where-Object { $_.status -eq "SUCCESS" }
        if ($succeeded) {
            Write-Host "Succeeded:" -ForegroundColor Green
            foreach ($s in $succeeded) { Write-Host "  $($s.module) ($($s.elapsed))" -ForegroundColor Green }
        }
        $failed = $buildResults | Where-Object { $_.status -eq "FAILED" }
        if ($failed) {
            Write-Host "Failed:" -ForegroundColor Red
            foreach ($f in $failed) { Write-Host "  $($f.module) ($($f.elapsed))" -ForegroundColor Red }
        }
        Write-Host "========================" -ForegroundColor Cyan
    } else {
        Write-Host "Build done: $successCount/$totalCount success ($elapsed)"
    }
}
