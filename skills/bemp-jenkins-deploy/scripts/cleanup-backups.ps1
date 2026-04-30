# 备份清理脚本
# 自动清理历史备份，保留指定数量的最新备份
# 支持压缩包备份模式（*.zip）和目录备份模式

param(
    [string]$BackupDir,
    [string]$FilePattern = "bemp-served_*",
    [int]$KeepCount = 3
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Cleanup-Backups {
    param(
        [string]$Directory,
        [string]$Pattern,
        [int]$Keep
    )

    Write-Log "==========================================" "INFO"
    Write-Log "开始清理备份" "INFO"
    Write-Log "备份目录: $Directory" "INFO"
    Write-Log "匹配模式: $Pattern" "INFO"
    Write-Log "保留数量: $Keep" "INFO"
    Write-Log "==========================================" "INFO"

    if (-not (Test-Path $Directory)) {
        Write-Log "备份目录不存在: $Directory" "WARN"
        return
    }

    # 支持三种备份格式：压缩包(.zip)、目录、WAR文件
    $zipPattern = $Pattern -replace '\*$', '*.zip'
    $warPattern = $Pattern -replace '\*$', '*.war'
    
    $zipBackups = Get-ChildItem -Path $Directory -File -Filter $zipPattern -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending
    $dirBackups = Get-ChildItem -Path $Directory -Directory -Filter $Pattern -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending
    $warBackups = Get-ChildItem -Path $Directory -File -Filter $warPattern -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending

    $allBackups = @($zipBackups) + @($dirBackups) + @($warBackups)
    $totalCount = $allBackups.Count
    Write-Log "找到 $totalCount 个备份（压缩包: $($zipBackups.Count), 目录: $($dirBackups.Count), WAR: $($warBackups.Count)）" "INFO"

    if ($totalCount -le $Keep) {
        Write-Log "备份数量未超过保留限制，无需清理" "INFO"
        return
    }

    $itemsToDelete = $allBackups | Select-Object -Skip $Keep
    $deleteCount = $itemsToDelete.Count

    Write-Log "将删除 $deleteCount 个过期备份" "INFO"

    $deletedCount = 0
    $failedCount = 0

    foreach ($item in $itemsToDelete) {
        try {
            $sizeStr = if ($item.PSIsContainer) {
                $size = (Get-ChildItem $item.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                "$([math]::Round($size / 1MB, 2)) MB"
            } else {
                "$([math]::Round($item.Length / 1MB, 2)) MB"
            }
            $typeStr = if ($item.Extension -eq '.zip') { "压缩包" } elseif ($item.PSIsContainer) { "目录" } else { "文件" }
            Write-Log "删除备份$typeStr`: $($item.Name) ($sizeStr)" "INFO"
            Remove-Item $item.FullName -Recurse -Force
            $deletedCount++
        } catch {
            Write-Log "删除失败: $($item.Name) - $_" "ERROR"
            $failedCount++
        }
    }

    Write-Log "==========================================" "INFO"
    Write-Log "备份清理完成" "INFO"
    Write-Log "成功删除: $deletedCount 个" "INFO"
    Write-Log "删除失败: $failedCount 个" "INFO"
    Write-Log "剩余备份: $($totalCount - $deleteCount) 个" "INFO"
    Write-Log "==========================================" "INFO"
}

# 执行清理
Cleanup-Backups -Directory $BackupDir -Pattern $FilePattern -Keep $KeepCount
