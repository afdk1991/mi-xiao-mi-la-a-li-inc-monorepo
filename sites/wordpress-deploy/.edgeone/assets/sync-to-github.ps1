#!/usr/bin/env pwsh
# GitHub同步脚本
# 此脚本帮助您将WordPress静态站点推送到GitHub仓库

Write-Host "=== WordPress静态站点GitHub同步工具 ==="

# 默认GitHub仓库URL
$repoUrl = "https://github.com/afdk1991/conWordPress.git"
Write-Host "使用默认仓库地址: $repoUrl"

# 检查URL格式是否正确
if (-not ($repoUrl -match '^https://github.com/.*\.git$')) {
    Write-Host "错误：GitHub仓库URL格式不正确。请确保URL以https://github.com/开头并以.git结尾。" -ForegroundColor Red
    exit 1
}

# 关联远程仓库
try {
    Write-Host "正在关联远程仓库..."
    git remote add origin $repoUrl
    Write-Host "远程仓库关联成功！" -ForegroundColor Green
} catch {
    Write-Host "远程仓库关联失败：$_" -ForegroundColor Red
    # 检查是否已经有关联的远程仓库
    $existingRemote = git remote -v
    if ($existingRemote -match 'origin') {
        Write-Host "检测到已有远程仓库。是否要覆盖它？(y/n)" -ForegroundColor Yellow
        $confirm = Read-Host
        if ($confirm -eq 'y') {
            git remote set-url origin $repoUrl
            Write-Host "远程仓库URL已更新！" -ForegroundColor Green
        } else {
            Write-Host "取消操作。" -ForegroundColor Yellow
            exit 0
        }
    }
}

# 推送到GitHub
try {
    Write-Host "正在推送到GitHub..."
    git push -u origin main
    Write-Host "\n恭喜！WordPress静态站点已成功推送到GitHub！" -ForegroundColor Green
    Write-Host "\n下一步："
    Write-Host "1. 访问您的GitHub仓库检查文件是否已成功上传"
    Write-Host "2. 根据README.md中的指南部署到Tencent EdgeOne Pages"
} catch {
    Write-Host "\n推送失败：$_" -ForegroundColor Red
    Write-Host "\n常见问题及解决方案："
    Write-Host "1. 确保您已在GitHub上创建了对应的仓库"
    Write-Host "2. 检查您的Git凭据是否正确（可以使用 'git config --global credential.helper cache' 缓存凭据）"
    Write-Host "3. 确保您有推送到该仓库的权限"
    Write-Host "4. 如果仓库已有内容，可能需要先拉取（git pull origin main --allow-unrelated-histories）"
    exit 1
}