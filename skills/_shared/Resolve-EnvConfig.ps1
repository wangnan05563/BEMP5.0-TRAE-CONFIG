<#
.SYNOPSIS
    BEMP Skills Global Environment Config Resolver
.DESCRIPTION
    Provides ${ENV:VAR_NAME} placeholder resolution. Skill modules dot-source this file.
    Reads values from environment variables, falls back to environmentDefaults in env-config.json.
.USAGE
    . "$PSScriptRoot\..\..\_shared\Resolve-EnvConfig.ps1"
    $resolvedValue = Resolve-EnvPlaceholder "${ENV:JAVA_HOME}"
    $globalConfig = Get-GlobalEnvConfig
#>

function Get-GlobalEnvConfig {
    $sharedDir = $PSScriptRoot
    if (-not (Test-Path $sharedDir)) {
        $sharedDir = Join-Path (Split-Path $PSScriptRoot -Parent) "_shared"
    }
    $configPath = Join-Path $sharedDir "env-config.json"
    if (Test-Path $configPath) {
        return Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    return $null
}

function Resolve-EnvPlaceholder {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Value
    )

    if ([string]::IsNullOrEmpty($Value)) { return $Value }

    $pattern = '\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)\}'
    $result = $Value

    $matches = [regex]::Matches($Value, $pattern)
    foreach ($m in $matches) {
        $varName = $m.Groups[1].Value
        $envVal = [Environment]::GetEnvironmentVariable($varName)

        if ([string]::IsNullOrEmpty($envVal)) {
            $globalConfig = Get-GlobalEnvConfig
            if ($globalConfig -and $globalConfig.environmentDefaults) {
                $defaultVal = $globalConfig.environmentDefaults.PSObject.Properties | Where-Object { $_.Name -eq $varName } | Select-Object -First 1
                if ($defaultVal -and -not [string]::IsNullOrEmpty($defaultVal.Value)) {
                    $envVal = $defaultVal.Value
                }
            }
        }

        if ([string]::IsNullOrEmpty($envVal)) {
            Write-Warning "环境变量 $varName 未设置，请通过 PowerShell 设置: `$env:$varName = '<实际值>'"
            Write-Warning "或编辑 env-config.json 中 environmentDefaults.$varName 填入实际值"
        }
        elseif ($envVal -like "##PLEASE_SET_*##") {
            Write-Warning "密码环境变量 $varName 未配置！请设置: `$env:$varName = '<实际密码>'"
            $envVal = ""
        }

        $result = $result.Replace($m.Value, $envVal)
    }

    return $result
}

function Resolve-EnvConfigProperty {
    param(
        [Parameter(Mandatory = $true)]
        [object]$ConfigObject,
        [Parameter(Mandatory = $true)]
        [string]$PropertyPath
    )

    $parts = $PropertyPath -split '\.'
    $current = $ConfigObject
    foreach ($part in $parts) {
        if ($current -is [System.Management.Automation.PSCustomObject]) {
            $current = $current.PSObject.Properties | Where-Object { $_.Name -eq $part } | Select-Object -First 1
            if ($current) { $current = $current.Value } else { return $null }
        } elseif ($current -is [System.Collections.IDictionary]) {
            if ($current.Contains($part)) { $current = $current[$part] } else { return $null }
        } else {
            return $null
        }
    }

    if ($current -is [string]) {
        return Resolve-EnvPlaceholder $current
    }
    return $current
}

function Get-ResolvedPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue,
        [string]$RelativeTo = ""
    )

    $resolved = Resolve-EnvPlaceholder $PathValue
    if ([string]::IsNullOrEmpty($resolved)) { return $resolved }

    if (-not [System.IO.Path]::IsPathRooted($resolved) -and -not [string]::IsNullOrEmpty($RelativeTo)) {
        $resolved = Join-Path $RelativeTo $resolved
    }

    return $resolved
}

function Get-ServicePort {
    param(
        [string]$ServiceName,
        [int]$DefaultPort = 0
    )

    $globalConfig = Get-GlobalEnvConfig
    if ($globalConfig -and $globalConfig.services) {
        $svc = $globalConfig.services.PSObject.Properties | Where-Object { $_.Name -eq $ServiceName } | Select-Object -First 1
        if ($svc -and $svc.Value.port) {
            return $svc.Value.port
        }
    }
    return $DefaultPort
}

function Resolve-AllConfigPlaceholders {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Config
    )

    if ($Config -is [string]) {
        return Resolve-EnvPlaceholder $Config
    }
    elseif ($Config -is [System.Management.Automation.PSCustomObject]) {
        $result = [ordered]@{}
        foreach ($prop in $Config.PSObject.Properties) {
            $result[$prop.Name] = Resolve-AllConfigPlaceholders $prop.Value
        }
        return [PSCustomObject]$result
    }
    elseif ($Config -is [System.Collections.IList]) {
        $resolved = @()
        foreach ($item in $Config) {
            $resolved += ,(Resolve-AllConfigPlaceholders $item)
        }
        return $resolved
    }
    else {
        return $Config
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Export-ModuleMember -Function Resolve-EnvPlaceholder, Resolve-EnvConfigProperty, Resolve-AllConfigPlaceholders, Get-ResolvedPath, Get-ServicePort, Get-GlobalEnvConfig
}
