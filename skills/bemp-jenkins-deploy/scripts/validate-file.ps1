# 文件完整性验证脚本
# 用于验证构建产物和部署包的完整性

param(
    [string]$FilePath,
    [string]$ExpectedMD5 = "",
    [int]$MinSizeBytes = 1024  # 最小文件大小（字节）
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Test-FileExists {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Log "文件不存在: $Path" "ERROR"
        return $false
    }
    Write-Log "文件存在: $Path" "INFO"
    return $true
}

function Test-FileSize {
    param([string]$Path, [int]$MinSize)
    
    $file = Get-Item $Path
    if ($file.Length -lt $MinSize) {
        Write-Log "文件大小不达标: $($file.Length) 字节 < $MinSize 字节" "ERROR"
        return $false
    }
    Write-Log "文件大小验证通过: $($file.Length) 字节" "INFO"
    return $true
}

function Get-FileMD5 {
    param([string]$Path)
    
    $output = certutil -hashfile $Path MD5 | Select-String -Pattern "^[a-fA-F0-9]{32}$"
    if ($output) {
        return $output.ToString().Trim()
    }
    return ""
}

function Test-FileMD5 {
    param([string]$Path, [string]$ExpectedMD5)
    
    if ([string]::IsNullOrEmpty($ExpectedMD5)) {
        Write-Log "未提供期望的MD5值，跳过MD5验证" "WARN"
        return $true
    }
    
    $actualMD5 = Get-FileMD5 -Path $Path
    Write-Log "文件MD5: $actualMD5" "INFO"
    Write-Log "期望MD5: $ExpectedMD5" "INFO"
    
    if ($actualMD5 -ne $ExpectedMD5) {
        Write-Log "MD5校验失败" "ERROR"
        return $false
    }
    
    Write-Log "MD5校验通过" "INFO"
    return $true
}

# 主验证流程
Write-Log "==========================================" "INFO"
Write-Log "开始文件完整性验证" "INFO"
Write-Log "文件路径: $FilePath" "INFO"
Write-Log "==========================================" "INFO"

$allPassed = $true

# 1. 检查文件存在性
if (-not (Test-FileExists -Path $FilePath)) {
    $allPassed = $false
} else {
    # 2. 检查文件大小
    if (-not (Test-FileSize -Path $FilePath -MinSize $MinSizeBytes)) {
        $allPassed = $false
    }
    
    # 3. 检查MD5校验和
    if (-not (Test-FileMD5 -Path $FilePath -ExpectedMD5 $ExpectedMD5)) {
        $allPassed = $false
    }
}

if ($allPassed) {
    Write-Log "==========================================" "INFO"
    Write-Log "文件完整性验证通过" "INFO"
    Write-Log "==========================================" "INFO"
    exit 0
} else {
    Write-Log "==========================================" "ERROR"
    Write-Log "文件完整性验证失败" "ERROR"
    Write-Log "==========================================" "ERROR"
    exit 1
}
