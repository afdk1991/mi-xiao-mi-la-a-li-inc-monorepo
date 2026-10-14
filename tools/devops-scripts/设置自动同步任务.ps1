# 自动同步设置脚本 - 右键以管理员身份运行
# 创建每小时自动同步的 Windows 定时任务

$taskName = "GitHub自动同步"
$scriptPath = "D:\网站全栈项目\scripts\sync-to-github.ps1"

Write-Host "========================================"
Write-Host "  设置 GitHub 自动同步定时任务"
Write-Host "========================================"

# Remove existing task
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Create action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -SkipTest"

# Create trigger: every hour, starting now
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)

# Settings
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries

# Register task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "每小时自动同步D盘代码到GitHub"

Write-Host ""
Write-Host "✅ 定时任务已创建: $taskName" -ForegroundColor Green
Write-Host "⏰ 触发频率: 每小时一次"
Write-Host "📂 脚本路径: $scriptPath"
Write-Host ""
Write-Host "查看任务: Get-ScheduledTask -TaskName '$taskName'"
Write-Host "立即运行: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "删除任务: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
