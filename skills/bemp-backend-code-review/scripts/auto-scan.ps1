# ========== BEMP 后端代码阻塞级问题自动扫描 v3.1.0 ==========
# 银行参数从 config/bank-config.json 读取，切换银行时修改 currentBank 即可

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$ConfigSearchPaths = @(
    (Join-Path $PSScriptRoot "..\config\bank-config.json")
)
$ConfigPath = ""
foreach ($p in $ConfigSearchPaths) {
    if (Test-Path $p) { $ConfigPath = $p; break }
}
if ([string]::IsNullOrEmpty($ConfigPath)) {
    Write-Host "[ERROR] bank-config.json not found. Searched: $($ConfigSearchPaths -join ', ')" -ForegroundColor Red
    exit 1
}
$CONFIG = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$BANK = $CONFIG.banks.($CONFIG.currentBank)
$SOURCE_DIR = if ([System.IO.Path]::IsPathRooted($BANK.sourceDir)) { $BANK.sourceDir } else { Join-Path $ProjectRoot $BANK.sourceDir }
$DTO_SRC_DIR = if ([System.IO.Path]::IsPathRooted($BANK.dtoSourceDir)) { $BANK.dtoSourceDir } else { Join-Path $ProjectRoot $BANK.dtoSourceDir }
$DTO_PREFIX = $BANK.dtoPrefix
$URL_PREFIXES = $BANK.urlPrefixes
$ISSUE_COUNT = 0

function Get-RelPath($fullPath) {
    if ($fullPath -like "$ProjectRoot*") {
        return $fullPath.Substring($ProjectRoot.Length + 1)
    }
    return $fullPath
}

Write-Host "========== BEMP 后端代码预检 ($($BANK.bankName)) ==========" -ForegroundColor Cyan
Write-Host "源码目录: $SOURCE_DIR`n" -ForegroundColor Gray

# 检查1：extends产品实现类的Service/Atom是否缺少 @CustomizedBean
# 仅implements个性化接口的不需要@CustomizedBean，只需@CloudComponent
Write-Host "[1/16] 检查 @CustomizedBean 注解(extends产品实现类)..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($_.Name -match "(ServiceImpl|AtomImpl).java$" -and $content -match '\bextends\b' -and $content -notmatch "@CustomizedBean") {
        Write-Host "  [BLOCK] extends产品实现类缺 @CustomizedBean: $(Get-RelPath $_.FullName)" -ForegroundColor Red
        $ISSUE_COUNT++
    }
}

# 检查2：Controller 是否误加 @CustomizedBean
Write-Host "[2/16] 检查 Controller 的 @CustomizedBean..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match "@CustomizedBean") {
        Write-Host "  [BLOCK] Controller 不应 @CustomizedBean: $(Get-RelPath $_.FullName)" -ForegroundColor Red
        $ISSUE_COUNT++
    }
}

# 检查3：请求映射路径是否以配置的URL前缀开头
Write-Host "[3/16] 检查请求映射路径 ($($URL_PREFIXES -join ', '))..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match '@RequestMapping') {
        $hasValidPrefix = $false
        foreach ($prefix in $URL_PREFIXES) {
            if ($content -match [regex]::Escape($prefix)) { $hasValidPrefix = $true; break }
        }
        if (-not $hasValidPrefix) {
            Write-Host "  [BLOCK] 路径缺URL前缀: $(Get-RelPath $_.FullName)" -ForegroundColor Red
            $ISSUE_COUNT++
        }
    }
}

# 检查4：Controller 是否缺少 @RestController
Write-Host "[4/16] 检查 @RestController 注解..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -notmatch "@RestController") {
        Write-Host "  [BLOCK] 缺 @RestController: $(Get-RelPath $_.FullName)" -ForegroundColor Red
        $ISSUE_COUNT++
    }
}

# 检查5：DTO 是否实现了 Serializable
Write-Host "[5/16] 检查 DTO Serializable..." -ForegroundColor Yellow
Get-ChildItem -Path "$DTO_SRC_DIR\*" -Recurse -Include "*Req.java","*Resp.java","*Dto.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match "public class" -and $content -notmatch "implements Serializable") {
        Write-Host "  [WARN] DTO 未实现 Serializable: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
    }
}

# 检查6：Controller 返回值类型
Write-Host "[6/16] 检查 Controller 返回值..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*Controller.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match '@RequestMapping' -and $content -notmatch 'CommonResp|void') {
        Write-Host "  [WARN] 返回值非 CommonResp/void: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
    }
}

# 检查7：DTO 前缀是否符合命名规范
Write-Host "[7/16] 检查 DTO 命名前缀 ($DTO_PREFIX)..." -ForegroundColor Yellow
Get-ChildItem -Path "$DTO_SRC_DIR\*" -Recurse -Include "*Req.java","*Resp.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $baseName = $_.BaseName
    if ($baseName -notmatch "^${DTO_PREFIX}") {
        Write-Host "  [WARN] DTO 前缀不符 ${DTO_PREFIX}*: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
    }
}

# 检查8：e.printStackTrace() 替代日志
Write-Host "[8/16] 检查 e.printStackTrace()..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'e\.printStackTrace\(\)') {
            $lineNum = $i + 1
            Write-Host "  [BLOCK] e.printStackTrace() L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor Red
            $ISSUE_COUNT++
        }
    }
}

# 检查9：BigDecimal 用 == 或 equals 比较
Write-Host "[9/16] 检查 BigDecimal 比较方式..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'BigDecimal.*\.equals\(' -or $lines[$i] -match '==\s*\d+.*[Dd]ecimal' -or $lines[$i] -match '[Dd]ecimal.*==') {
            $lineNum = $i + 1
            Write-Host "  [WARN] BigDecimal应用compareTo: L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 检查10：Integer/Long 用 == 比较
Write-Host "[10/16] 检查 Integer/Long == 比较..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '(Integer|Long)\s+\w+\s*==' -or $lines[$i] -match '==\s*\w+\s*//' -or ($lines[$i] -match '\w+Id\s*==\s*\d+' -and $lines[$i] -notmatch 'long\s')) {
            $lineNum = $i + 1
            Write-Host "  [WARN] Integer/Long应用equals: L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 检查11：时间格式误用 hh(12h) 替代 HH(24h)
Write-Host "[11/16] 检查时间格式 hh/HH..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '"hh' -and $lines[$i] -notmatch '"HH' -and $lines[$i] -match 'SimpleDateFormat|DateTimeFormatter|format') {
            $lineNum = $i + 1
            Write-Host "  [WARN] 时间格式可能误用hh(12h): L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 检查12：SQL 字符串拼接
Write-Host "[12/16] 检查 SQL 字符串拼接..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '"\s*\+\s*\w+\s*\+\s*"' -and $lines[$i] -match 'select|insert|update|delete|from|where' -and $lines[$i] -notmatch '\$\{') {
            $lineNum = $i + 1
            Write-Host "  [BLOCK] SQL拼接 L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor Red
            $ISSUE_COUNT++
        }
    }
}

# 检查13：硬编码机构号/产品代码
Write-Host "[13/16] 检查硬编码机构号/产品代码..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'setBrchNo\(\s*"[0-9]+"' -or $lines[$i] -match 'setLegalNo\(\s*"[0-9]+"' -or $lines[$i] -match 'setOrgCode\(\s*"[0-9]+"') {
            $lineNum = $i + 1
            Write-Host "  [WARN] 疑似硬编码机构号 L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 检查14：使用 @Resource 注入（应用 @Autowired）
Write-Host "[14/16] 检查 @Resource 注入..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '@Resource' -and $lines[$i] -notmatch '@CloudReference') {
            $lineNum = $i + 1
            Write-Host "  [WARN] 应用@Autowired替代@Resource: L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 检查15：使用 commons-lang 的 StringUtils（应用 commons-lang3）
Write-Host "[15/16] 检查 StringUtils 版本..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'org\.apache\.commons\.lang\.StringUtils' -and $lines[$i] -notmatch 'lang3') {
            $lineNum = $i + 1
            Write-Host "  [WARN] StringUtils应用lang3: L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 检查16：Collectors.toMap 缺少 merge 函数
Write-Host "[16/16] 检查 Collectors.toMap merge..." -ForegroundColor Yellow
Get-ChildItem -Path $SOURCE_DIR -Recurse -Filter "*.java" -ErrorAction SilentlyContinue | ForEach-Object {
    $lines = Get-Content $_.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'Collectors\.toMap\(' -and $lines[$i] -notmatch 'value1.*value2|merge|\(v1') {
            $lineNum = $i + 1
            Write-Host "  [WARN] toMap缺merge函数: L${lineNum}: $(Get-RelPath $_.FullName)" -ForegroundColor DarkYellow
        }
    }
}

# 汇总
Write-Host "`n========== 扫描完成 ($($BANK.bankName)) ==========" -ForegroundColor Cyan
if ($ISSUE_COUNT -eq 0) {
    Write-Host "未发现阻塞级问题，可以继续人工审查。" -ForegroundColor Green
} else {
    Write-Host "发现 $ISSUE_COUNT 个阻塞级问题，请修复后再提交。" -ForegroundColor Red
}
