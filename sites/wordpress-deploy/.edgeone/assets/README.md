# WordPress 静态站点部署指南

本指南将帮助您将WordPress项目部署到Tencent EdgeOne Pages平台。

## 前提条件

在开始部署前，请确保您已经：

1. 拥有Tencent EdgeOne Pages账号
2. 已将WordPress站点转换为静态HTML文件

## 部署步骤

### 方法1：通过GitHub仓库部署

1. **将静态文件推送到GitHub**
   
   ```bash
   # 进入静态导出目录
   cd static-export
   
   # 初始化Git仓库
   git init
   git add .
   git commit -m "Initial commit"
   
   # 关联到GitHub仓库
   git remote add origin https://github.com/[您的用户名]/[仓库名].git
   git push -u origin main
   ```

2. **在Tencent EdgeOne Pages中导入仓库**
   
   - 登录Tencent EdgeOne Pages控制台
   - 点击"新建项目"
   - 选择"从Git仓库导入"
   - 授权Tencent EdgeOne Pages访问您的GitHub账号
   - 选择要导入的仓库和分支
   - 配置构建设置（对于纯静态站点，通常无需额外配置）
   - 点击"部署"

### 方法2：直接上传文件

1. **压缩静态文件**
   
   将`static-export`目录中的所有文件压缩成ZIP文件。

2. **在Tencent EdgeOne Pages中上传**
   
   - 登录Tencent EdgeOne Pages控制台
   - 点击"新建项目"
   - 选择"直接上传"
   - 上传压缩文件
   - 点击"部署"

### 方法3：使用CI/CD工具自动部署

对于开发中的项目，您可以设置CI/CD流程，每次更新代码后自动部署到Tencent EdgeOne Pages。

## 配置自定义域名（可选）

部署完成后，您可以为站点配置自定义域名：

1. 在Tencent EdgeOne Pages控制台中，找到您的项目
2. 点击"设置" > "域名管理"
3. 点击"添加域名"
4. 按照指引完成域名解析设置
5. 配置HTTPS证书（Tencent EdgeOne Pages提供免费证书）

## 注意事项

- 静态站点无法处理动态功能（如评论、表单提交等）
- 如果您的WordPress站点有动态内容，建议使用以下插件进行静态化：
  - Simply Static
  - WP2Static
  - StaticPress
- 对于需要数据库的复杂功能，考虑使用Tencent Cloud其他服务（如云服务器、云数据库等）

## 故障排除

如果部署过程中遇到问题：

1. 检查文件路径是否正确
2. 确认HTML文件没有引用不存在的资源
3. 查看Tencent EdgeOne Pages控制台中的部署日志
4. 确保您的域名已正确解析

## 相关资源

- [Tencent EdgeOne Pages 官方文档](https://edgeone.ai/zh/docs/pages/)
- [WordPress 静态化指南](https://wordpress.org/plugins/simply-static/)

祝您部署成功！