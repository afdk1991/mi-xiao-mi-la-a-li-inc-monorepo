# 网站管理员文档

## 1. 文档概述

本文档为网站管理员提供全面的管理指南，涵盖WordPress后台、API层、前端部署、性能监控、备份恢复和安全管理等方面。

## 2. 系统架构

### 2.1 整体架构
- **WordPress后端**：用于内容管理，位于 `https://laal.top/wp-admin`
- **自定义API层**：位于 `http://localhost:8001/api`
- **Vue 3 + TypeScript前端**：使用Element Plus组件库，部署在主域名 `https://laal.top`

### 2.2 技术栈
- **后端**：WordPress 6.x
- **API**：自定义PHP API
- **前端**：Vue 3 + TypeScript + Element Plus + Tailwind CSS
- **状态管理**：Pinia
- **路由**：Vue Router
- **HTTP客户端**：Axios
- **测试框架**：Vitest + Vue Test Utils

## 3. WordPress后台管理

### 3.1 登录与权限
- 登录地址：`https://laal.top/wp-admin`
- 管理员账户：请联系系统管理员获取
- 角色权限：
  - 超级管理员：所有权限
  - 编辑：内容编辑权限
  - 作者：只能编辑自己的内容
  - 订阅者：仅能查看内容

### 3.2 内容管理
- **文章管理**：创建、编辑、发布和删除文章
- **页面管理**：管理网站页面
- **媒体库**：上传和管理图片、视频等媒体文件
- **分类与标签**：管理内容分类和标签
- **自定义字段**：管理自定义内容字段

### 3.3 主题与插件
- **主题管理**：当前使用自定义主题 `mixm-laal`，位于 `/www/wwwroot/laal.top/wp-content/themes/mixm-laal/`
- **插件管理**：
  - 必装插件：Yoast SEO、Wordfence Security、WP Super Cache
  - 自定义插件：位于 `/www/wwwroot/laal.top/wp-content/plugins/`

### 3.4 性能优化
- **缓存设置**：WP Super Cache已配置，缓存目录：`/www/wwwroot/laal.top/wp-content/cache/`
- **数据库优化**：定期使用WP-Optimize插件优化数据库
- **图片优化**：使用Smush插件自动压缩图片

## 4. API管理

### 4.1 API端点
- 基础URL：`http://localhost:8001/api`
- 主要端点：
  - `/api/posts`：获取文章列表
  - `/api/posts/:id`：获取单篇文章
  - `/api/pages`：获取页面列表
  - `/api/media`：获取媒体文件
  - `/api/categories`：获取分类列表

### 4.2 API安全
- **认证机制**：JWT令牌认证
- **速率限制**：每IP每分钟100次请求
- **CORS设置**：允许主域名访问
- **CSRF保护**：已启用CSRF令牌验证

### 4.3 API监控
- **日志位置**：`/www/wwwroot/laal.top/api/logs/`
- **错误处理**：详细的错误日志记录
- **性能监控**：API响应时间记录

## 5. 前端部署与管理

### 5.1 前端代码库
- 代码位置：`/www/wwwroot/laal.top/frontend/`
- 构建命令：`npm run build`
- 开发命令：`npm run dev`
- 测试命令：`npm run test`

### 5.2 部署流程
1. 拉取最新代码：`git pull origin main`
2. 安装依赖：`npm install`
3. 构建生产版本：`npm run build`
4. 部署到服务器：构建产物位于 `dist/` 目录

### 5.3 环境变量
- 配置文件：`/www/wwwroot/laal.top/frontend/.env`
- 主要环境变量：
  - `VITE_API_BASE_URL`：API基础URL
  - `VITE_APP_TITLE`：应用标题
  - `VITE_APP_DESCRIPTION`：应用描述

## 6. 性能监控

### 6.1 前端性能监控
- **监控工具**：自定义性能监控类 `PerformanceMonitor`
- **监控指标**：
  - 页面加载时间
  - API请求时间
  - 组件渲染时间
  - 资源加载时间
  - 内存使用情况

### 6.2 警报系统
- **警报配置**：可通过 `setAlertConfig` 方法设置阈值
- **默认阈值**：
  - 页面加载时间：3秒
  - API请求时间：1秒
  - 组件渲染时间：500ms
  - 内存使用：50MB
- **警报通知**：控制台日志输出，可通过 `onAlert` 注册自定义回调

### 6.3 性能报告
- **生成报告**：调用 `performanceMonitor.generateReport()` 方法
- **报告内容**：包含所有监控指标的平均值、最大值、最小值和请求次数

## 7. 备份与恢复

### 7.1 自动备份
- **备份脚本**：`/www/wwwroot/laal.top/wp-content/mixm-auto-backup.php`
- **备份频率**：每日自动备份
- **备份内容**：
  - 数据库备份
  - WordPress核心文件
  - 主题和插件
  - 媒体库

### 7.2 手动备份
- **数据库备份**：使用phpMyAdmin或命令行工具
- **文件备份**：使用FTP或SCP工具复制文件

### 7.3 恢复流程
1. 停止网站服务
2. 恢复数据库：导入备份的SQL文件
3. 恢复文件：替换网站文件
4. 启动网站服务
5. 测试网站功能

## 8. 安全管理

### 8.1 服务器安全
- **防火墙**：已配置UFW防火墙，仅开放必要端口
- **SSH访问**：禁用密码登录，仅允许密钥登录
- **定期更新**：自动更新系统软件包

### 8.2 WordPress安全
- **Wordfence Security**：实时监控和阻止恶意访问
- **强密码策略**：要求使用复杂密码
- **定期更新**：自动更新WordPress核心、主题和插件
- **文件权限**：正确设置文件和目录权限

### 8.3 API安全
- **JWT令牌**：定期刷新令牌，令牌有效期为24小时
- **HTTPS**：强制使用HTTPS连接
- **输入验证**：所有API输入均经过严格验证
- **输出编码**：防止XSS攻击

## 9. 常见问题与解决方案

### 9.1 WordPress后台无法登录
- **解决方案**：
  1. 检查用户名和密码是否正确
  2. 清除浏览器缓存和Cookie
  3. 检查数据库连接是否正常
  4. 禁用所有插件，排查插件冲突

### 9.2 前端页面无法加载
- **解决方案**：
  1. 检查API服务是否正常运行
  2. 查看浏览器控制台错误信息
  3. 检查前端构建是否成功
  4. 清除CDN缓存（如果使用了CDN）

### 9.3 API请求失败
- **解决方案**：
  1. 检查API服务是否正常运行
  2. 查看API日志，定位错误原因
  3. 检查JWT令牌是否有效
  4. 检查请求参数是否正确

### 9.4 网站性能下降
- **解决方案**：
  1. 生成性能报告，定位瓶颈
  2. 优化数据库查询
  3. 清理缓存
  4. 优化图片和资源
  5. 检查是否有恶意请求

## 10. 联系方式与支持

### 10.1 技术支持
- 系统管理员：[管理员邮箱]
- 开发团队：[开发团队邮箱]
- 紧急联系：[紧急联系电话]

### 10.2 文档更新
- 文档版本：v1.0
- 最后更新：2025-11-28
- 更新记录：
  - v1.0 (2025-11-28)：初始版本

## 11. 附录

### 11.1 常用命令
- **WordPress数据库备份**：`wp db export backup.sql`
- **重启API服务**：`systemctl restart mixm-api`
- **查看API日志**：`tail -f /www/wwwroot/laal.top/api/logs/error.log`
- **前端构建**：`cd /www/wwwroot/laal.top/frontend && npm run build`

### 11.2 重要文件位置
- **WordPress配置**：`/www/wwwroot/laal.top/wp-config.php`
- **主题目录**：`/www/wwwroot/laal.top/wp-content/themes/mixm-laal/`
- **插件目录**：`/www/wwwroot/laal.top/wp-content/plugins/`
- **API代码**：`/www/wwwroot/laal.top/api/`
- **前端代码**：`/www/wwwroot/laal.top/frontend/`
- **备份目录**：`/www/wwwroot/laal.top/backups/`

### 11.3 性能监控示例
```javascript
// 初始化性能监控
import { performanceMonitor } from '@/utils/performanceMonitor';

// 设置自定义警报阈值
performanceMonitor.setAlertConfig({
  pageLoadTimeThreshold: 4000, // 4秒
  apiRequestTimeThreshold: 1500, // 1.5秒
  componentRenderTimeThreshold: 800, // 800ms
  memoryUsageThreshold: 60 * 1024 * 1024 // 60MB
});

// 注册警报回调
performanceMonitor.onAlert(alert => {
  // 可以在这里添加自定义警报处理，如发送邮件或通知
  console.error(`[自定义警报] ${alert.message}`);
});

// 生成性能报告
performanceMonitor.generateReport();
```

---

**文档结束**

*本文档为内部使用，请勿泄露给外部人员。*