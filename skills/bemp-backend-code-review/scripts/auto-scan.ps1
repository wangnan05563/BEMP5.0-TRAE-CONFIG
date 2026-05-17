# ========== BEMP 后端代码阻塞级问题自动扫描 ==========
# 银行参数从 config/bank-config.json 读取，切换银行时修改 currentBank 即可

$CONFIG = Get-Content ".trae/skills/bemp-backend-code-review/config/bank-config.json" | ConvertFrom-Json
$BANK = $CONFIG.banks.($CONFIG.currentBank)
$SOURCE_DIR = $BANK.sourceDir
$DTO_SRC_DIR = $BANK.dtoSourceDir
$DTO_PREFIX = $BANK.dtoPrefix
$URL_PREFIXES = $BANK.urlPrefixes
$ISSUE_COUNT = 0

Write-Host "========== BEMP 后端代码预检 ($($BANK.bankName)) ==========" -ForegroundColor Cyan
Write-Host "源码目录: $SOURCE_DIR`n" -ForegroundColor Gray

# 检查1：Service/Atom 类是否缺少 @CustomizedBean
Write-Host "[1/7] 检查 @CustomizedBean 注解..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($_.Name -match "(ServiceImpl|AtomImpl).java$" -and $content -notmatch "@CustomizedBean") {
        Write-Host "  [BLOCK] 缺少 @CustomizedBean: $($_.FullName)" -ForegroundColor Red
        $ISSUE_COUNT++
    }
}

# 检查2：Controller 是否误加 @CustomizedBean
Write-Host "[2/7] 检查 Controller 的 @CustomizedBean..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@CustomizedBean") {
        Write-Host "  [BLOCK] Controller 不应使用 @CustomizedBean: $($_.FullName)" -ForegroundColor Red
        $ISSUE_COUNT++
    }
}

# 检查3：请求映射路径是否以配置的URL前缀开头
Write-Host "[3/7] 检查请求映射路径 ($($URL_PREFIXES -join ', '))..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '@RequestMapping') {
        $hasValidPrefix = $false
        foreach ($prefix in $URL_PREFIXES) {
            if ($content -match [regex]::Escape($prefix)) { $hasValidPrefix = $true; break }
        }
        if (-not $hasValidPrefix) {
            Write-Host "  [BLOCK] 路径不以配置的URL前缀开头: $($_.FullName)" -ForegroundColor Red
            $ISSUE_COUNT++
        }
    }
}

# 检查4：Controller 是否缺少 @RestController
Write-Host "[4/7] 检查 @RestController 注解..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -notmatch "@RestController") {
        Write-Host "  [BLOCK] 缺少 @RestController: $($_.FullName)" -ForegroundColor Red
        $ISSUE_COUNT++
    }
}

# 检查5：DTO 是否实现了 Serializable
Write-Host "[5/7] 检查 DTO Serializable..." -ForegroundColor Yellow
Get-ChildItem -Path $DTO_SRC_DIR -Recurse -Include "*Req.java","*Resp.java","*Dto.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "public class" -and $content -notmatch "implements Serializable") {
        Write-Host "  [WARN] DTO 未实现 Serializable: $($_.FullName)" -ForegroundColor DarkYellow
    }
}

# 检查6：Controller 返回值类型
Write-Host "[6/7] 检查 Controller 返回值..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '@RequestMapping' -and $content -notmatch 'CommonResp|void') {
        Write-Host "  [WARN] 返回值可能不是 CommonResp/void: $($_.FullName)" -ForegroundColor DarkYellow
    }
}

# 检查7：DTO 前缀是否符合命名规范
Write-Host "[7/7] 检查 DTO 命名前缀 ($DTO_PREFIX)..." -ForegroundColor Yellow
Get-ChildItem -Path $DTO_SRC_DIR -Recurse -Include "*Req.java","*Resp.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $baseName = $_.BaseName
    if ($baseName -notmatch "^${DTO_PREFIX}") {
        Write-Host "  [WARN] DTO 前缀不符合 ${DTO_PREFIX}*: $($_.FullName)" -ForegroundColor DarkYellow
    }
}

# 汇总
Write-Host "`n========== 扫描完成 ($($BANK.bankName)) ==========" -ForegroundColor Cyan
if ($ISSUE_COUNT -eq 0) {
    Write-Host "未发现阻塞级问题，可以继续人工审查。" -ForegroundColor Green
} else {
    Write-Host "发现 $ISSUE_COUNT 个阻塞级问题，请修复后再提交。" -ForegroundColor Red
}