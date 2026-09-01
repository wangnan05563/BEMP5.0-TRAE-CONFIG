# resolve-sonar-token.ps1
# 技能侧共享解析模块：Token 解析链 + 三层占位符解析 + Token 有效性实测
# 调用方（verify-connection.ps1 / run-sonar-scanner.ps1）只需 dot-source 本文件一次，
# 无需重复 dot-source _shared/Resolve-EnvConfig.ps1（本文件已内部加载，函数重复定义幂等无害）。
#
# 背景（2026-09-01 机构管理增量扫描降级记录教训）：
#   SONARQUBE_TOKEN 仅初始终端会话可见，新会话解析不到导致 /api/authentication/validate 返回 401。
#   故 Token 解析链必须具备会话无关的兜底来源：_shared/env-config.json（全技能库唯一配置入口）。

# ---- 依赖加载：_shared/Resolve-EnvConfig.ps1（提供 Get-GlobalEnvConfig / Resolve-EnvPlaceholder）----
$script:SharedDir = Join-Path $PSScriptRoot "..\..\_shared"
$script:SharedResolver = Join-Path $script:SharedDir "Resolve-EnvConfig.ps1"
if (Test-Path $script:SharedResolver) {
    . $script:SharedResolver
} else {
    throw "依赖文件不存在: $script:SharedResolver （_shared/Resolve-EnvConfig.ps1 是全技能库共享解析器，缺失时无法继续）"
}

# ---- 三层占位符解析 ----
function Resolve-SqPlaceholder {
    <#
    .SYNOPSIS
        解析 ${ENV:VAR} 与 ${ENV:VAR:默认值} 占位符，解析链与 _shared 约定对齐：
        环境变量 > environmentDefaults > inline default（${ENV:VAR:默认值}）
    #>
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Value
    )
    if ([string]::IsNullOrEmpty($Value)) { return $Value }

    # 第一/二层（env > environmentDefaults）交给 _shared 解析器处理，避免与共享行为漂移；
    # _shared 解析器不识别 inline default 语法，带默认值的占位符会原样保留，由下方第三层兜底。
    $result = Resolve-EnvPlaceholder $Value

    # 第三层：inline default。逐个替换（多占位符场景，如 http://${ENV:BEMP_HOST:127.0.0.1}:${ENV:SONARQUBE_PORT:9000}）
    foreach ($m in [regex]::Matches($result, '\$\{ENV:([A-Za-z_][A-Za-z0-9_]*):([^}]*)\}')) {
        $varName = $m.Groups[1].Value
        $inlineDefault = $m.Groups[2].Value
        # 动态环境变量名必须用 [Environment]::GetEnvironmentVariable（$env:$varName 语法 PS5.1 不解析，教训强制）
        $envVal = [Environment]::GetEnvironmentVariable($varName)
        if ([string]::IsNullOrEmpty($envVal)) {
            $cfg = Get-GlobalEnvConfig
            if ($cfg -and $cfg.environmentDefaults) {
                $prop = $cfg.environmentDefaults.PSObject.Properties[$varName]
                if ($prop -and -not [string]::IsNullOrEmpty([string]$prop.Value)) { $envVal = [string]$prop.Value }
            }
        }
        $resolvedVal = if (-not [string]::IsNullOrEmpty($envVal)) { $envVal } else { $inlineDefault }
        $result = $result.Replace($m.Value, $resolvedVal)
    }
    return $result
}

# ---- Token 解析链 ----
function Get-SonarTokenFromSharedText {
    <#
    .SYNOPSIS
        键名文本搜索兜底：仅在 env-config.json 结构化解析（ConvertFrom-Json）失败时使用。
        精确匹配 "SONARQUBE_TOKEN" 键名行，不把整文件内容误当 Token。
    #>
    param([Parameter(Mandatory = $true)][string]$ConfigPath)
    foreach ($line in (Get-Content $ConfigPath -Encoding UTF8)) {
        if ($line -match '"SONARQUBE_TOKEN"\s*:\s*"([^"]+)"') {
            return $Matches[1]
        }
    }
    return $null
}

function Resolve-SonarToken {
    <#
    .SYNOPSIS
        Token 解析链（按序取第一个非空值）：
          1. 环境变量 SONARQUBE_TOKEN（既有约定）
          2. 环境变量 SONAR_TOKEN（兼容 sonar-scanner 官方约定）
          3. _shared/env-config.json#environmentDefaults.SONARQUBE_TOKEN（结构化 JSON 解析，ConvertFrom-Json 为 PS5.1 自带）
          4. 仅当结构化解析抛异常时，退化为按 "SONARQUBE_TOKEN" 键名文本搜索
    .OUTPUTS
        解析成功返回 @{ Token = <值>; Source = <来源标识> }；全部来源无值返回 $null
    .NOTES
        禁止在本技能任何文件硬编码 Token 真值；_shared/env-config.json 是唯一真值入口（不得在本技能内改写）。
    #>
    foreach ($envName in @("SONARQUBE_TOKEN", "SONAR_TOKEN")) {
        # 动态环境变量名必须走 [Environment]::GetEnvironmentVariable（$env:$envName 语法无效）
        $t = [Environment]::GetEnvironmentVariable($envName)
        if (-not [string]::IsNullOrWhiteSpace($t)) {
            return @{ Token = $t; Source = "env:$envName" }
        }
    }

    $sharedConfigPath = Join-Path $script:SharedDir "env-config.json"
    if (Test-Path $sharedConfigPath) {
        try {
            $cfg = Get-Content $sharedConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $prop = $cfg.environmentDefaults.PSObject.Properties["SONARQUBE_TOKEN"]
            if ($prop -and -not [string]::IsNullOrWhiteSpace([string]$prop.Value)) {
                return @{ Token = [string]$prop.Value; Source = "shared:env-config.json#environmentDefaults.SONARQUBE_TOKEN" }
            }
        } catch {
            # 结构解析失败才允许文本搜索兜底；正常情况下 ConvertFrom-Json 优先，避免正则误伤 JSON 其他键
            Write-Warning "env-config.json 结构化解析失败（$($_.Exception.Message)），退化为按键名文本搜索 SONARQUBE_TOKEN"
            $t = Get-SonarTokenFromSharedText -ConfigPath $sharedConfigPath
            if (-not [string]::IsNullOrWhiteSpace($t)) {
                return @{ Token = $t; Source = "shared:text-search:SONARQUBE_TOKEN" }
            }
        }
    } else {
        Write-Warning "未找到共享配置: $sharedConfigPath（Token 兜底来源不可用）"
    }
    return $null
}

# ---- Token 有效性实测 ----
function Test-SonarToken {
    <#
    .SYNOPSIS
        用解析出的 Token 请求 /api/authentication/validate，返回 @{ Valid; Detail }。
        401/403 异常会被捕获并转化为结构化结果，不向调用方抛异常。
    #>
    param(
        [Parameter(Mandatory = $true)][string]$BaseUrl,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Token
    )
    if ([string]::IsNullOrWhiteSpace($Token)) {
        return @{ Valid = $false; Detail = "Token 为空（解析链无任何来源命中）" }
    }
    $validateUrl = $BaseUrl.TrimEnd('/') + "/api/authentication/validate"
    try {
        $resp = Invoke-WebRequest -Uri $validateUrl -Headers @{ Authorization = "Bearer $Token" } -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $body = $resp.Content | ConvertFrom-Json
        return @{ Valid = [bool]$body.valid; Detail = "HTTP $($resp.StatusCode), valid=$($body.valid)" }
    } catch {
        # PS5.1 下 4xx/5xx 走异常通道；从 Response 提取状态码，便于区分 401（Token 无效）与网络故障
        $statusCode = $null
        if ($_.Exception.Response) {
            try { $statusCode = [int]$_.Exception.Response.StatusCode } catch { $statusCode = $null }
        }
        return @{ Valid = $false; Detail = "HTTP $statusCode, $($_.Exception.Message)" }
    }
}

# ---- 便捷封装：解析 + 实测一步完成 ----
function Resolve-AndTestSonarToken {
    <#
    .SYNOPSIS
        解析 Token 并实测 validate，返回 @{ Token; Source; Valid; Detail }。
    #>
    param([Parameter(Mandatory = $true)][string]$BaseUrl)
    $resolved = Resolve-SonarToken
    if (-not $resolved) {
        return @{ Token = $null; Source = $null; Valid = $false; Detail = "Token 解析链全部来源无值（env 与 _shared 均未配置）" }
    }
    $testResult = Test-SonarToken -BaseUrl $BaseUrl -Token $resolved.Token
    return @{
        Token  = $resolved.Token
        Source = $resolved.Source
        Valid  = $testResult.Valid
        Detail = $testResult.Detail
    }
}
