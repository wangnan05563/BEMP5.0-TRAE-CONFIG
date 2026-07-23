<#
.SYNOPSIS
    BEMP 编译产物验证脚本（BUG-005）
.DESCRIPTION
    使用 javap 验证新方法是否已编译进运行时jar，防止旧class残留导致运行时行为不一致。
    定位 exploded WAR 的 WEB-INF/lib 目录下的 jar，检查类和方法是否存在。
    配置文件：config/compile-verification.json
.USAGE
    .\verify-compile.ps1
    .\verify-compile.ps1 -ConfigPath "..\config\compile-verification.json"
#>
param(
    [string]$ConfigPath = ""
)

# 复用全局占位符解析
. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

# 默认配置路径
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $PSScriptRoot "..\config\compile-verification.json"
}

if (-not (Test-Path $ConfigPath)) {
    Write-Host "[FAIL] Config not found: $ConfigPath" -ForegroundColor Red
    exit 2
}

# 加载并解析配置
$cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$cfg = Resolve-AllConfigPlaceholders $cfg

$javap = $cfg.defaults.javapPath
$failSeverity = $cfg.defaults.failSeverity
$exitOnFail = $cfg.outputFormat.exitOnFail

if (-not (Test-Path $javap)) {
    Write-Host "[FAIL] javap not found: $javap (check JAVA_HOME config)" -ForegroundColor Red
    exit 2
}

$passed = 0
$failed = 0
$total = 0

Write-Host "[INFO] Compile verification starting..." -ForegroundColor Cyan

foreach ($target in $cfg.verificationTargets.targets) {
    # 跳过禁用的目标
    if (-not $target.enabled) {
        Write-Host "[SKIP] $($target.id): disabled" -ForegroundColor Gray
        continue
    }

    # 跳过没有类的目标
    if (-not $target.classes -or $target.classes.Count -eq 0) {
        Write-Host "[SKIP] $($target.id): no classes to verify" -ForegroundColor Gray
        continue
    }

    # 定位 jar 文件
    $warLibDir = $target.warLibDir
    $jarPattern = $target.jarPattern

    if (-not (Test-Path $warLibDir)) {
        Write-Host "[FAIL] $($target.id): WAR lib dir not found: $warLibDir" -ForegroundColor Red
        Write-Host "       -> Run compile first, or check warLibDir config" -ForegroundColor Gray
        $failed++
        continue
    }

    $jarFile = Get-ChildItem -Path $warLibDir -Filter $jarPattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $jarFile) {
        Write-Host "[FAIL] $($target.id): jar not found ($jarPattern) in $warLibDir" -ForegroundColor Red
        Write-Host "       -> Run compile first, or check jarPattern config" -ForegroundColor Gray
        $failed++
        continue
    }

    Write-Host "[INFO] $($target.id): verifying $($jarFile.Name)" -ForegroundColor Gray

    # 遍历类和方法
    foreach ($cls in $target.classes) {
        $className = $cls.fullyQualifiedName

        # 先验证类是否存在
        $classOutput = & $javap -classpath $jarFile.FullName $className 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FAIL] $($target.id): class not found: $className" -ForegroundColor Red
            Write-Host "       -> Check BANK_PACKAGE_PREFIX resolution or recompile" -ForegroundColor Gray
            $failed++
            continue
        }

        # 验证每个方法
        foreach ($method in $cls.methods) {
            $total++
            if ($classOutput -match [regex]::Escape($method)) {
                Write-Host "[OK]   $($target.id): $className.$method verified" -ForegroundColor Green
                $passed++
            } else {
                Write-Host "[FAIL] $($target.id): $className.$method NOT found in jar" -ForegroundColor Red
                Write-Host "       -> Method name mismatch, or code not compiled into jar" -ForegroundColor Gray
                $failed++
            }
        }
    }
}

# 汇总输出
Write-Host ""
Write-Host "Verification: $passed/$total methods verified ($failed failed)" -ForegroundColor Cyan

# 退出码逻辑
if ($failed -gt 0) {
    if ($failSeverity -eq "block" -and $exitOnFail) {
        Write-Host "[FAIL] Verification failed (block). Abort startup. Recompile or check class/method names." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "[WARN] Verification failed (warn). Review failures before proceeding." -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] All verified methods present in runtime jars" -ForegroundColor Green
}

exit 0
