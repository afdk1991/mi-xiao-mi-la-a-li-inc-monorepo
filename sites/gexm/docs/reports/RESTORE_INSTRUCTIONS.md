# WordPress备份恢复说明

## 恢复文件备份

### 方法1：使用tar命令恢复
```bash
# 进入WordPress根目录
cd /www/wwwroot/laal.top

# 删除现有文件（谨慎操作！）
rm -rf *

# 解压备份文件
tar -xzf /www/wwwroot/laal.top/wp-content/backups/files/[备份文件名].tar.gz
```

### 方法2：使用FTP/SFTP恢复
1. 下载备份文件
2. 解压到本地计算机
3. 使用FTP客户端上传所有文件到网站根目录

## 恢复数据库备份

### 方法1：使用命令行恢复
```bash
# 解压并恢复数据库
zcat /www/wwwroot/laal.top/wp-content/backups/database/[备份文件名].sql.gz | mysql -u [数据库用户名] -p [数据库名]
```

### 方法2：使用phpMyAdmin恢复
1. 下载备份文件并解压
2. 登录phpMyAdmin
3. 选择目标数据库
4. 点击"导入"选项卡
5. 选择解压后的SQL文件
6. 点击"执行"按钮

## 注意事项

1. 确保在恢复前备份当前数据
2. 恢复后可能需要更新wp-config.php中的配置信息
3. 如果网站域名已更改，可能需要在数据库中更新域名设置
4. 恢复完成后清除缓存并测试网站功能
5. 检查文件权限是否正确

## 最后备份信息
- 备份时间: 20251123135629
- 备份类型: full
- 备份文件:   - files_backup_20251123135629.json
  - database_backup_20251123135629.sql.gz
