<#
.SYNOPSIS
    产物新鲜度检查脚本（pre-compile-check.json checks.deployArtifactFreshness 的执行器）
.DESCRIPTION
    增量开发后启动服务前执行：源码已改但 deploy 模块未重装 jar 时，服务会加载旧包（W9-01 根因），
    该问题在健康检查阶段才暴露且难定位，本脚本把检查前移到启动门禁。
    检查逻辑全部来自配置，脚本本身零硬编码业务参数：
      - 变更范围：git status（含未跟踪新文件），排除 pre-compile-check.json fileFilter.excludes
      - 模块映射：compile-deploy.json modules（sourceDir/warLibDir，${ENV:} 占位符经 _shared 解析链）
      - 探测规则：pre-compile-check.json checks.deployArtifactFreshness.artifactProbe
      - 运行时 bean 顶替核对：pre-compile-check.json ...runtimeBeanVerify（服务启动后执行）
.PARAMETER BankCode
    银行码，银行解析链第一级：本参数 > 环境变量 BANK_CODE > _shared/env-config.json environmentDefaults.BANK_CODE
.PARAMETER CheckType
    artifact=产物新鲜度（启动前门禁，默认）；bean-verify=启动日志 bean 顶替核对（启动后）；all=两者
.PARAMETER RepoDir
    git 检测目录覆盖（默认 banks/{BANK_PROJECT_DIR}，served 产品化代码禁止个性化修改故不在检测范围）
.PARAMETER ClassProbeOverrides
    逗号分隔的类全名清单：替代 git 变更集做定向探测（定向核验某类是否已在包内 / 测试 STALE 路径）
.PARAMETER ServedLogDir
    Served 启动日志目录覆盖（默认 ${ENV:BEMP_LOG_DIR}，目录不存在时回退技能本地 logs 目录）
.PARAMETER ExpectedBeanRemoveList
    逗号分隔的产品 bean 名清单（如 ebank2005AtomImpl），bean-verify 模式核对日志顶替记录是否覆盖
.EXAMPLE
    .\check-artifact-freshness.ps1                                   # 启动前门禁（默认 artifact）
    .\check-artifact-freshness.ps1 -CheckType all                    # 产物 + bean 顶替一起核对
    .\check-artifact-freshness.ps1 -CheckType bean-verify -ExpectedBeanRemoveList "ebank2005AtomImpl"
    .\check-artifact-freshness.ps1 -ClassProbeOverrides "com.hundsun.bemp.hnnxbank.biz.antimoney.validate.HnnxAntiMoneyValidateUtil"
.OUTPUTS
    逐类输出 [OK] FOUND-IN-JAR / [FAIL] STALE-ARTIFACT / [FAIL] DEPLOY-TARGET-MISSING，
    摘要行 + 修复命令模板（mvn install -pl {变更模块},{deploy模块} -am）。
    退出码：0=通过；1=存在 block 级失败；2=配置/环境错误
#>
param(
    [string]$BankCode = "",
    [ValidateSet("artifact", "bean-verify", "all")]
    [string]$CheckType = "artifact",
    [string]$RepoDir = "",
    [string]$ClassProbeOverrides = "",
    [string]$ServedLogDir = "",
    [string]$ExpectedBeanRemoveList = "",
    [string]$LogFile = ""
)

$ErrorActionPreference = 'Stop'
# 审计日志路径（-LogFile 指定时启用）：无人值守调用方（startserver PreCheck/CI）采集结果用
$script:LogFile = $LogFile

# ---------- 共享解析链加载（${ENV:VAR} 解析：环境变量 > env-config.json environmentDefaults > 报错） ----------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillDir  = Split-Path -Parent $scriptDir
$sharedDir = Join-Path (Split-Path -Parent $skillDir) "_shared"
. (Join-Path $sharedDir "Resolve-EnvConfig.ps1")

# ---------- 工具函数 ----------
function Write-Check {
    param([string]$Level, [string]$Message)
    $tag = switch ($Level) { "OK" { "[OK]  " } "FAIL" { "[FAIL]" } "WARN" { "[WARN]" } "INFO" { "[INFO]" } default { "      " } }
    Write-Host "$tag $Message"
    if ($script:LogFile) { Add-Content -Path $script:LogFile -Value "$tag $Message" -Encoding UTF8 }
}

function Resolve-BankCode {
    param([string]$FromParam)
    # 银行解析链：CLI 参数 > 环境变量 BANK_CODE > env-config.json environmentDefaults.BANK_CODE
    if (-not [string]::IsNullOrEmpty($FromParam)) { return $FromParam }
    $envVal = [Environment]::GetEnvironmentVariable("BANK_CODE")
    if (-not [string]::IsNullOrEmpty($envVal)) { return $envVal }
    $cfg = Get-GlobalEnvConfig
    if ($cfg -and $cfg.environmentDefaults) {
        $prop = $cfg.environmentDefaults.PSObject.Properties["BANK_CODE"]
        if ($prop -and -not [string]::IsNullOrEmpty($prop.Value)) { return $prop.Value }
    }
    throw "BANK_CODE 未提供：-BankCode 参数、环境变量 BANK_CODE、environmentDefaults.BANK_CODE 三级均解析为空"
}

function Load-JsonConfig {
    param([string]$Path)
    if (-not (Test-Path $Path)) { throw "配置文件不存在: $Path" }
    return Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-ChangedJavaSources {
    param(
        [string]$RepoPath,
        [string[]]$ExcludeGlobs,
        [string]$GitExe
    )
    # git 仓库根可能在本目录或任意上级（如 banks\ 为仓库根而检测目录是其子目录），向上探测 .git
    $probeDir = $RepoPath
    $gitRoot = $null
    for ($i = 0; $i -lt 6 -and $probeDir; $i++) {
        if (Test-Path (Join-Path $probeDir ".git")) { $gitRoot = $probeDir; break }
        $parent = Split-Path -Parent $probeDir
        if ($parent -eq $probeDir) { break }
        $probeDir = $parent
    }
    if (-not $gitRoot) {
        throw "git 检测目录及其上级均非 git 仓库: $RepoPath"
    }
    $output = & $GitExe -C $RepoPath status --porcelain 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git status 执行失败: $($output -join ' ')" }

    $sources = @()
    foreach ($line in $output) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        # porcelain 格式：XY path（X/Y 为状态位），路径相对 git 仓库根（非检测目录）；rename 形如 "R  old -> new" 取新路径
        $rel = $line.Substring(3).Trim()
        if ($rel -match '->') { $rel = ($rel -split '->')[-1].Trim() }
        if ($rel -notlike '*.java') { continue }
        $abs = Join-Path $gitRoot $rel
        $excluded = $false
        foreach ($g in $ExcludeGlobs) {
            if ($rel -like ($g -replace '\*\*/', '*\')) { $excluded = $true; break }
            if ($rel -like $g) { $excluded = $true; break }
        }
        if ($excluded) { continue }
        if (Test-Path $abs) { $sources += (Get-Item $abs).FullName }
    }
    return $sources
}

function Get-ModuleMapping {
    param([object]$CompileDeployConfig, [string]$ModulePrefix, [string]$WorkspaceRoot)
    # compile-deploy.json modules：key 为 "{modulePrefix}biz-as" 模板形态，value 含 ${ENV:} 占位符路径。
    # 返回实际模块映射表：moduleSuffix -> @{ ModuleName / SourceDir / WarLibDir / DeployModuleName }
    $mapping = @{}
    foreach ($prop in $CompileDeployConfig.modules.PSObject.Properties) {
        $key = $prop.Name
        if ($key -like '_*') { continue }   # _ 前缀键为文档元字段，豁免
        # key 为 "{modulePrefix}biz-as" 字面模板形态：剥掉 {modulePrefix} 前缀得模块后缀（biz-as）
        $suffix = $key -replace '^\{modulePrefix\}', ''
        $mapping[$suffix] = @{
            ModuleName       = ($ModulePrefix + $suffix)
            SourceDir        = (Get-ResolvedPath -PathValue ($prop.Value.sourceDir -replace '\{modulePrefix\}', $ModulePrefix) -RelativeTo $WorkspaceRoot)
            WarLibDir        = (Get-ResolvedPath -PathValue ($prop.Value.warLibDir -replace '\{modulePrefix\}', $ModulePrefix) -RelativeTo $WorkspaceRoot)
            DeployModuleName = ($ModulePrefix + (($prop.Value.warLibDir -replace '\{modulePrefix\}', $ModulePrefix) -replace '.*(served|adapter)-deploy.*$', '$1') + '-deploy')
        }
    }
    return $mapping
}

function Test-ClassEntryInJar {
    param([string]$JarPath, [string]$Fqcn)
    # 用 .NET Zip 读取 jar 条目（jar 即 zip），避免外部 jar.exe 依赖
    if (-not ("System.IO.Compression.FileSystem" -as [type])) {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
    }
    $zip = $null
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($JarPath)
        $entryName = ($Fqcn -replace '\.', '/') + '.class'
        $hit = $zip.Entries | Where-Object { $_.FullName -eq $entryName } | Select-Object -First 1
        return ($null -ne $hit)
    } catch {
        throw "读取 jar 失败（可能被进程占用或损坏）: $JarPath -> $($_.Exception.Message)"
    } finally {
        if ($zip) { $zip.Dispose() }
    }
}

# ---------- 主流程 ----------
try {
    $bankCode = Resolve-BankCode -FromParam $BankCode
    if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable("BANK_CODE"))) {
        # 仅注入进程级（不改机器/用户级），供下游 ${ENV:BANK_*} 解析链一致
        [Environment]::SetEnvironmentVariable("BANK_CODE", $bankCode, "Process")
    }
    Write-Host "==== BEMP 产物新鲜度检查（check-artifact-freshness）===="
    Write-Host "BANK_CODE = $bankCode ; CheckType = $CheckType"

    $preCheck = Load-JsonConfig -Path (Join-Path $skillDir "config\pre-compile-check.json")
    $compileDeploy = Load-JsonConfig -Path (Join-Path $skillDir "config\compile-deploy.json")

    $deployCfg = $preCheck.checks.deployArtifactFreshness
    if (-not $deployCfg -or -not $deployCfg.enabled) {
        Write-Check "INFO" "deployArtifactFreshness 检查项在 pre-compile-check.json 中未启用，跳过"
        exit 0
    }
    $probe = $deployCfg.artifactProbe
    $toleranceSec = 60
    if ($probe.timestampToleranceSeconds) { $toleranceSec = [int]$probe.timestampToleranceSeconds }

    $workspaceRoot = Get-ResolvedPath -PathValue '${ENV:BEMP_WORKSPACE_ROOT}'
    $repoDir = $RepoDir
    if ([string]::IsNullOrEmpty($repoDir)) {
        $repoDir = Get-ResolvedPath -PathValue '${ENV:BEMP_WORKSPACE_ROOT}\banks\${ENV:BANK_PROJECT_DIR}'
    }
    $gitExe = "git"
    $gitPathDefault = (Get-GlobalEnvConfig).environmentDefaults.PSObject.Properties["GIT_PATH"]
    if ($gitPathDefault -and -not [string]::IsNullOrEmpty($gitPathDefault.Value)) { $gitExe = $gitPathDefault.Value }

    $modulePrefix = Get-ResolvedPath -PathValue '${ENV:BANK_MODULE_PREFIX}'
    $moduleMapping = Get-ModuleMapping -CompileDeployConfig $compileDeploy -ModulePrefix $modulePrefix -WorkspaceRoot $workspaceRoot

    $exitCode = 0

    # ===== artifact 模式 =====
    if ($CheckType -in @("artifact", "all")) {
        Write-Host "---- [artifact] 变更源码 vs 部署产物核验 ----"

        # 变更类清单：优先定向探测清单（参数），否则 git 变更集
        $probeTargets = @()   # @{ Fqcn / ModuleSuffix / SourcePath / LastWrite }
        if (-not [string]::IsNullOrEmpty($ClassProbeOverrides)) {
            foreach ($fqcn in ($ClassProbeOverrides -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }) {
                $probeTargets += @{ Fqcn = $fqcn; SourcePath = "<override>"; LastWrite = $null; ModuleSuffix = $null }
            }
        } else {
            $excludeGlobs = @($preCheck.fileFilter.excludes.patterns)
            $changed = Get-ChangedJavaSources -RepoPath $repoDir -ExcludeGlobs $excludeGlobs -GitExe $gitExe
            if ($changed.Count -eq 0) {
                Write-Check "OK" "无待部署的 Java 变更（git 工作区无 .java 修改/新增），产物新鲜度检查不适用"
            }
            foreach ($src in $changed) {
                $matched = $null
                foreach ($suffix in $moduleMapping.Keys) {
                    $srcDir = $moduleMapping[$suffix].SourceDir
                    if ($src -like (Join-Path $srcDir '*')) { $matched = $suffix; break }
                }
                if (-not $matched) {
                    Write-Check "WARN" "变更文件不在 compile-deploy.json 任何模块映射内，跳过产物核验: $src"
                    continue
                }
                $rel = $src.Substring($moduleMapping[$matched].SourceDir.Length).TrimStart('\')
                $fqcn = ($rel -replace '\.java$', '') -replace '\\', '/'
                $fqcn = ($fqcn -replace '/', '.')
                $probeTargets += @{
                    Fqcn = $fqcn; ModuleSuffix = $matched; SourcePath = $src
                    LastWrite = (Get-Item $src).LastWriteTimeUtc
                }
            }
        }

        if ($probeTargets.Count -gt 0) {
            $okCount = 0; $failCount = 0
            # 按模块聚合（deploy jar 按模块打开一次）
            $byModule = @{}
            foreach ($t in $probeTargets) {
                $ms = if ($t.ModuleSuffix) { $t.ModuleSuffix } else { "<probe>" }
                if (-not $byModule.ContainsKey($ms)) { $byModule[$ms] = @() }
                $byModule[$ms] += $t
            }
            $changedModuleNames = @()
            foreach ($ms in $byModule.Keys) {
                $targets = $byModule[$ms]
                $mappingEntry = if ($ms -ne "<probe>" -and $moduleMapping.ContainsKey($ms)) { $moduleMapping[$ms] } else { $null }
                $warLibDir = $null; $jarFile = $null
                if ($mappingEntry) {
                    $warLibDir = $mappingEntry.WarLibDir
                    $changedModuleNames += $mappingEntry.ModuleName
                    $deployModuleName = $mappingEntry.DeployModuleName
                    if (-not (Test-Path $warLibDir)) {
                        Write-Check "FAIL" ($probe.missingArtifactMessage + " -> warLibDir 不存在: $warLibDir")
                        $failCount += $targets.Count; continue
                    }
                    # jar 实际命名含产品 artifactId 前缀（如 bemp-hnnxbank-biz-as-*），前缀放宽为 * 匹配
                    $jarFile = Get-ChildItem $warLibDir -Filter ('*' + $modulePrefix + $ms + '-*.jar') -ErrorAction SilentlyContinue |
                               Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
                    if (-not $jarFile) {
                        Write-Check "FAIL" ($probe.missingArtifactMessage + " -> $warLibDir 下未找到 *" + $modulePrefix + "$ms-*.jar")
                        $failCount += $targets.Count; continue
                    }
                }
                foreach ($t in $targets) {
                    if (-not $jarFile) {
                        # 定向探测但无法定位模块映射时，扫描 warLibDir 下全部 jar
                        $found = $false
                        foreach ($wl in ($moduleMapping.Values | ForEach-Object { $_.WarLibDir } | Select-Object -Unique)) {
                            if (-not (Test-Path $wl)) { continue }
                            foreach ($j in (Get-ChildItem $wl -Filter '*.jar')) {
                                if (Test-ClassEntryInJar -JarPath $j.FullName -Fqcn $t.Fqcn) { $found = $true; break }
                            }
                            if ($found) { break }
                        }
                        if ($found) { Write-Check "OK" ($probe.foundInJarPassMessage + ": " + $t.Fqcn); $okCount++ }
                        else { Write-Check "FAIL" ($probe.staleFailMessage + ": " + $t.Fqcn + " 不在任何部署 jar 中"); $failCount++ }
                        continue
                    }
                    $inJar = Test-ClassEntryInJar -JarPath $jarFile.FullName -Fqcn $t.Fqcn
                    if (-not $inJar) {
                        Write-Check "FAIL" ($probe.staleFailMessage + ": " + $t.Fqcn + " 未打入 " + $jarFile.Name)
                        $failCount++; continue
                    }
                    # 类存在后做时间戳核验：mtime 受 git checkout/工具触碰干扰会产生"类在 jar 但源码时间戳更新"的假象，
                    # 故仅 WARN 提示不阻断（W9-01 硬门禁=类缺失；方法级 staleness 由 compile-verification.json javap 验证兜底）
                    if ($t.LastWrite) {
                        $jarTime = $jarFile.LastWriteTimeUtc
                        $srcTime = $t.LastWrite
                        if (($srcTime - $jarTime).TotalSeconds -gt $toleranceSec) {
                            Write-Check "WARN" ("时间戳提示（非阻断，类已在包内）: " + $t.Fqcn + " 源码(" + $srcTime.ToString('HH:mm:ss') + "UTC) 晚于 jar(" + $jarTime.ToString('HH:mm:ss') + "UTC)，如涉及方法级变更请重装 deploy 后以 javap 验证")
                        }
                    }
                    Write-Check "OK" ($probe.foundInJarPassMessage + ": " + $t.Fqcn + " -> " + $jarFile.Name)
                    $okCount++
                }
            }
            Write-Host "---- summary [artifact]: passed=$okCount failed=$failCount ----"
            if ($failCount -gt 0) {
                $exitCode = 1
                # 修复命令模板：deploy 模块名从映射推导（served/adapter 前缀归类），不在脚本硬编码
                $deployModules = ($moduleMapping.Values | ForEach-Object { $_.DeployModuleName } | Select-Object -Unique) -join ','
                $changedModules = ($changedModuleNames | Select-Object -Unique) -join ','
                # 空变更清单（定向探测模式）时避免 "-pl ,deploy" 出现空段
                $plTargets = if ([string]::IsNullOrEmpty($changedModules)) { $deployModules } else { "$changedModules,$deployModules" }
                Write-Check "INFO" ("修复命令（在 " + (Get-ResolvedPath -PathValue '${ENV:BEMP_WORKSPACE_ROOT}\banks\${ENV:BANK_PROJECT_DIR}') + " 执行）:")
                Write-Host ("  " + ($probe.remedyCommandTemplate -replace '\{changedModules\},\{deployModule\}', $plTargets -replace '\{deployModule\}', $plTargets))
                Write-Host "  刷新后重新执行本脚本复检 FOUND-IN-JAR 通过方可启动服务"
            }
        }
    }

    # ===== bean-verify 模式 =====
    if ($CheckType -in @("bean-verify", "all")) {
        Write-Host "---- [bean-verify] Served 启动日志 bean 顶替核对 ----"
        $bv = $deployCfg.runtimeBeanVerify
        if (-not $bv -or -not $bv.enabled) {
            Write-Check "INFO" "runtimeBeanVerify 在 pre-compile-check.json 中未启用，跳过"
        } else {
            $logDir = $ServedLogDir
            if ([string]::IsNullOrEmpty($logDir)) { $logDir = Get-ResolvedPath -PathValue '${ENV:BEMP_LOG_DIR}' }
            if ([string]::IsNullOrEmpty($logDir) -or -not (Test-Path $logDir) -or -not (Get-ChildItem $logDir -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'Served_startup_*.log.stderr' })) {
                # 回退技能本地 logs 目录（BEMP_LOG_DIR 可能指向其它工具的同名空目录）
                $logDir = Join-Path $skillDir "logs"
            }
            if (-not (Test-Path $logDir)) {
                Write-Check "WARN" "Served 日志目录不存在（服务可能未启动过），bean-verify 跳过: $logDir"
            } else {
                $logFile = Get-ChildItem $logDir -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'Served_startup_*.log.stderr' } |
                           Sort-Object LastWriteTime -Descending | Select-Object -First 1
                if (-not $logFile -or [string]::IsNullOrEmpty($logFile.FullName)) {
                    Write-Check "WARN" "日志目录无 Served_startup_*.log.stderr，bean-verify 跳过: $logDir"
                } else {
                    Write-Check "INFO" "核对日志: $($logFile.Name)"
                    $pattern = 'Customized bean\s+([\w\.]+),\s*remove the bean\s+([\w\.]+)'
                    $records = @()
                    foreach ($line in (Get-Content $logFile.FullName -Encoding UTF8)) {
                        if ($line -match $pattern) { $records += @{ Personalized = $Matches[1]; Removed = $Matches[2] } }
                    }
                    if ($records.Count -eq 0) {
                        Write-Check "WARN" "日志中未发现任何 bean 顶替记录（本次变更若含新增 @CustomizedBean 类则为异常；无此类变更则正常）"
                    } else {
                        foreach ($r in $records) {
                            Write-Check "OK" ("bean 顶替记录: Customized bean " + $r.Personalized + " -> remove " + $r.Removed)
                        }
                    }
                    # 期望清单核对：每个期望移除的产品 bean 必须出现在顶替记录中
                    if (-not [string]::IsNullOrEmpty($ExpectedBeanRemoveList)) {
                        $miss = @()
                        foreach ($expected in ($ExpectedBeanRemoveList -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }) {
                            $hit = $records | Where-Object { $_.Removed -eq $expected -or $_.Removed -like "*$expected" }
                            if (-not $hit) { $miss += $expected }
                        }
                        if ($miss.Count -gt 0) {
                            Write-Check "FAIL" ("期望被顶替的产品 bean 未在日志中找到: " + ($miss -join ', '))
                            $exitCode = 1
                        } else {
                            Write-Check "OK" ("期望清单全部命中顶替记录（" + ($ExpectedBeanRemoveList -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }).Count + " 项）")
                        }
                    }
                }
            }
        }
    }

    Write-Host "==== 检查结束，退出码: $exitCode ===="
    exit $exitCode
} catch {
    Write-Check "FAIL" ("脚本执行异常: " + $_.Exception.Message)
    Write-Host $_.ScriptStackTrace
    exit 2
}
