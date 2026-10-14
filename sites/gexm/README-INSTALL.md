# MixM Laal WordPress主题安装指南

## 一、环境要求

- PHP 7.4+ （推荐 PHP 8.0+）
- MySQL 5.7+ 或 MariaDB 10.3+
- Apache 或 Nginx 服务器
- 至少 512MB 内存

## 二、数据库设置

### 方法1：使用提供的SQL脚本（推荐）

在MySQL命令行或phpMyAdmin中执行以下操作：

```bash
mysql -u root -p < init-db.sql
```

### 方法2：手动创建数据库

1. 创建数据库：
```sql
CREATE DATABASE wordpress DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 创建用户并授权：
```sql
CREATE USER 'wordpress_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON wordpress.* TO 'wordpress_user'@'localhost';
FLUSH PRIVILEGES;
```

## 三、WordPress安装

1. **修改wp-config.php文件**（重要）：
   - 编辑`wp-config.php`文件中的数据库连接信息
   - 替换安全密钥（可以访问 https://api.wordpress.org/secret-key/1.1/salt/ 生成新的密钥）
   - 设置正确的网站URL和路径

2. **设置文件权限**：
```bash
chown -R www-data:www-data /www/wwwroot/api.laal.top
chmod -R 755 /www/wwwroot/api.laal.top
chmod -R 775 /www/wwwroot/api.laal.top/wp-content/uploads
```

3. **访问网站**：
   - 在浏览器中访问 https://api.laal.top
   - 按照安装向导完成WordPress的基本设置

## 四、主题激活

1. 登录WordPress后台（https://api.laal.top/wp-admin）
2. 进入「外观」→「主题」
3. 找到「MixM Laal」主题并点击「激活」

## 五、主题配置

1. **主题同步设置**：
   - 进入「设置」→「主题同步」
   - 配置所需的功能模块

2. **API密钥管理**：
   - 进入「设置」→「API密钥」
   - 管理和生成API密钥，设置IP限制和权限

## 六、安全建议

1. **修改默认密码**：
   - 立即修改管理员密码为强密码

2. **更改数据库表前缀**：
   - 在wp-config.php中修改`$table_prefix`（如果需要）

3. **启用HTTPS**：
   - 确保网站使用HTTPS协议

4. **定期更新**：
   - 定期更新WordPress核心、主题和插件

## 七、故障排除

### 常见问题

1. **数据库连接错误**：
   - 检查wp-config.php中的数据库配置是否正确
   - 确认MySQL服务是否正在运行

2. **权限错误**：
   - 确保文件夹和文件权限设置正确
   - 特别是uploads目录需要写入权限

3. **主题不显示**：
   - 确认主题已正确上传到wp-content/themes目录
   - 检查style.css文件是否包含正确的主题头信息

### 技术支持

如遇任何问题，请联系技术支持：support@api.laal.top

---

*MixM Laal主题 v1.0 - 版权所有 © 2025 MixM Team*