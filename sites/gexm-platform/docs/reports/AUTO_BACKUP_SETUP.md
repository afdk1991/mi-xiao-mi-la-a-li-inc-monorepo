# WordPress自动备份设置指南

本文档提供了如何设置自动备份计划任务的详细步骤，确保您的WordPress网站数据定期安全备份。

## 备份系统概述

我们已经为您安装了增强型WordPress备份系统，具有以下特点：

- 支持完整备份（文件+数据库）、仅文件备份和仅数据库备份
- 自动应用备份保留策略，避免磁盘空间被占满
- 生成详细的备份报告
- 提供灵活的备份选项

## 设置cron自动备份

### 方法1：使用Linux crontab（推荐）

1. 登录到您的服务器控制台
2. 执行以下命令编辑crontab：
   ```bash
   crontab -e
   ```
3. 添加以下cron任务（根据您的需求选择）：

   **每日凌晨2点执行完整备份：**
   ```bash
   0 2 * * * cd /www/wwwroot/laal.top && php wordpress-enhanced-backup.php full > /www/wwwroot/laal.top/wp-content/backups/cron_log_$(date +\%Y\%m\%d).log 2>&1
   ```

   **每日凌晨1点执行数据库备份，每周日凌晨3点执行完整备份：**
   ```bash
   0 1 * * * cd /www/wwwroot/laal.top && php wordpress-enhanced-backup.php database > /www/wwwroot/laal.top/wp-content/backups/cron_log_db_$(date +\%Y\%m\%d).log 2>&1
   0 3 * * 0 cd /www/wwwroot/laal.top && php wordpress-enhanced-backup.php full > /www/wwwroot/laal.top/wp-content/backups/cron_log_full_$(date +\%Y\%m\%d).log 2>&1
   ```

### 方法2：使用WordPress插件（如果无法访问服务器）

如果您无法直接访问服务器，可以使用WordPress插件如WP Crontrol来设置自动备份：

1. 安装并激活WP Crontrol插件
2. 转到「设置」→「Cron作业」
3. 点击「添加PHP」选项卡
4. 在「PHP代码」字段中输入：
   ```php
   include_once(ABSPATH . 'wordpress-enhanced-backup.php');
   ```
5. 设置执行计划
6. 点击「添加PHP Cron事件」

## 备份保留策略

当前备份系统默认保留7天的备份文件。如需修改保留天数，请编辑`wordpress-enhanced-backup.php`文件中的以下配置：

```php
$config = array(
    // ...其他配置...
    'retention_days' => 7, // 修改此值
    // ...其他配置...
);
```

## 备份监控建议

1. **定期检查备份日志**：监控`cron_log_*.log`文件以确保备份正常执行
2. **验证备份完整性**：每月至少进行一次备份恢复测试
3. **监控磁盘空间**：确保备份目录有足够的空间
4. **考虑异地备份**：设置定期将备份文件复制到其他存储位置的额外任务：

   ```bash
   # 示例：将备份文件复制到远程服务器
   30 4 * * * rsync -avz /www/wwwroot/laal.top/wp-content/backups/ user@remote-server:/path/to/backup/storage/ --exclude='cron_log_*.log'
   ```

## 手动执行备份

如需手动执行备份，可通过以下命令：

```bash
# 执行完整备份
php wordpress-enhanced-backup.php full

# 仅备份文件
php wordpress-enhanced-backup.php files

# 仅备份数据库
php wordpress-enhanced-backup.php database
```

## 备份恢复指南

请参阅生成的`RESTORE_INSTRUCTIONS.md`文件了解如何恢复备份。

## 注意事项

- 确保PHP有足够的内存限制执行备份操作
- 大型网站可能需要增加PHP脚本执行时间限制
- 考虑在低流量时段执行备份以减少对网站性能的影响
- 定期检查备份文件的完整性和可恢复性

---

备份系统设置日期：2025-11-23
