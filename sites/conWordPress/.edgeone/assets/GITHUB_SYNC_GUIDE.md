# GitHub 同步指南

以下是将WordPress静态站点推送到GitHub仓库的详细步骤：

## 前提条件

在继续之前，请确保您已经：

1. 在您的电脑上安装了Git
2. 拥有GitHub账号
3. 已完成了本地仓库的初始化、文件添加和提交（这些步骤已为您完成）

## 步骤1：在GitHub上创建新仓库

1. 登录您的GitHub账号
2. 点击右上角的"+"号，选择"New repository"
3. 输入仓库名称（例如：`wordpress-static-site`）
4. 选择仓库的可见性（公开或私有）
5. 不要勾选"Initialize this repository with a README"（因为我们已经有了本地README文件）
6. 点击"Create repository"

## 步骤2：关联本地仓库与GitHub仓库

复制GitHub上新建仓库页面提供的远程仓库URL，然后在PowerShell中执行以下命令：

```bash
# 请将下面的URL替换为您自己的GitHub仓库URL
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
```

## 步骤3：推送到GitHub

执行以下命令将本地仓库的内容推送到GitHub：

```bash
git push -u origin main
```

## 遇到问题？

如果在推送过程中遇到权限问题，您可能需要：

1. 设置Git凭据缓存：
   ```bash
git config --global credential.helper cache
```

2. 或者使用GitHub CLI进行身份验证：
   ```bash
gh auth login
```

3. 或者生成SSH密钥并添加到GitHub账号

## 后续操作

成功推送到GitHub后，您可以：

1. 访问GitHub上的仓库页面查看文件
2. 根据`README.md`中的指南，将GitHub仓库与Tencent EdgeOne Pages关联
3. 设置自动部署流程

祝您同步成功！