# BEMP 开发环境启动 - 演示脚本
# 版本: 2.0.0
# 用途：检查配置和环境状态（不启动服务）

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BEMP 开发环境启动 Skill" -ForegroundColor Cyan
Write-Host "  环境检查演示" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$skillRoot = Split-Path -Parent $PSScriptRoot

# ==================== 1. 读取配置 ====================
Write-Host "【1. 读取配置】" -ForegroundColor Cyan
$ConfigPath = "$skillRoot\config\config.json"

if (Test-Path $ConfigPath) {
    try {
        $config = Get-Content $ConfigPath | ConvertFrom-Json
        Write-Host "   ✅ 配置加载成功" -ForegroundColor Green
        Write-Host "   Redis 路径: $($config.services.redis.executable)" -ForegroundColor White
        Write-Host "   ZooKeeper 路径: $($config.services.zookeeper.executable)" -ForegroundColor White
        Write-Host "   项目路径: $($config.services.springboot.projectPath)" -ForegroundColor White
    } catch {
        Write-Host "   ❌ 配置解析失败: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ❌ 配置文件不存在: $ConfigPath" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ==================== 2. 环境检查 ====================
Write-Host "【2. 环境检查】" -ForegroundColor Cyan

$jdkInfo = java -version 2>&1 | Select-String "version"
if ($jdkInfo -match "1\.8") {
    Write-Host "   ✅ JDK 1.8: 已配置" -ForegroundColor Green
} else {
    Write-Host "   ❌ JDK 1.8: 未配置或版本不匹配" -ForegroundColor Red
}

$nodeInfo = node -v 2>$null
if ($nodeInfo) {
    Write-Host "   ✅ Node.js: 已配置 ($nodeInfo)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Node.js: 未配置" -ForegroundColor Yellow
}

$mvnInfo = mvn -version 2>&1 | Select-String "Apache Maven"
if ($mvnInfo) {
    Write-Host "   ✅ Maven: 已配置" -ForegroundColor Green
} else {
    Write-Host "   ❌ Maven: 未配置" -ForegroundColor Red
}
Write-Host ""

# ==================== 3. 服务状态检测 ====================
Write-Host "【3. 服务状态检测】" -ForegroundColor Cyan

$ports = @{
    "Redis"     = $config.services.redis.port
    "ZooKeeper" = $config.services.zookeeper.port
    "SpringBoot" = 8010
    "前端"       = $config.services.frontend.port
}

foreach ($entry in $ports.GetEnumerator()) {
    $serviceName = $entry.Key
    $port = $entry.Value
    $result = netstat -ano | findstr ":$port "
    if ($result) {
        Write-Host "   ✅ $serviceName`: 运行中 (端口: $port)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $serviceName`: 未运行 (端口: $port)" -ForegroundColor Red
    }
}
Write-Host ""

# ==================== 4. 可执行文件检查 ====================
Write-Host "【4. 可执行文件检查】" -ForegroundColor Cyan

if (Test-Path $config.services.redis.executable) {
    Write-Host "   ✅ Redis 可执行文件: 存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ Redis 可执行文件: 不存在" -ForegroundColor Red
}

if (Test-Path $config.services.zookeeper.executable) {
    Write-Host "   ✅ ZooKeeper 可执行文件: 存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ ZooKeeper 可执行文件: 不存在" -ForegroundColor Red
}

if (Test-Path $config.services.frontend.projectPath) {
    Write-Host "   ✅ 前端项目目录: 存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ 前端项目目录: 不存在" -ForegroundColor Red
}
Write-Host ""

# ==================== 5. 使用说明 ====================
Write-Host "【5. 使用说明】" -ForegroundColor Cyan
Write-Host "   脚本目录: scripts/" -ForegroundColor White
Write-Host ""
Write-Host "   查看状态:" -ForegroundColor White
Write-Host "     .\start-bemp-env.ps1 -Status" -ForegroundColor Yellow
Write-Host ""
Write-Host "   启动 Redis:" -ForegroundColor White
Write-Host "     .\start-bemp-env.ps1 -Service redis" -ForegroundColor Yellow
Write-Host ""
Write-Host "   启动 ZooKeeper:" -ForegroundColor White
Write-Host "     .\start-bemp-env.ps1 -Service zookeeper" -ForegroundColor Yellow
Write-Host ""
Write-Host "   启动 SpringBoot:" -ForegroundColor White
Write-Host "     .\start-bemp-env.ps1 -Service springboot" -ForegroundColor Yellow
Write-Host ""
Write-Host "   启动前端:" -ForegroundColor White
Write-Host "     .\start-bemp-env.ps1 -Service frontend" -ForegroundColor Yellow
Write-Host ""
Write-Host "   强制重启:" -ForegroundColor White
Write-Host "     .\start-bemp-env.ps1 -Service <名称> -ForceRestart" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  演示完成" -ForegroundColor Cyan
Write-Host "  详细文档请查看: README.md" -ForegroundColor White
Write-Host "  故障排查请查看: docs/troubleshooting.md" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
