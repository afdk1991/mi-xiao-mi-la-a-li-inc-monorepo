# 拉阿狸主题部署工具

## 概述

这个工具帮助开发者将拉阿狸网站项目打包为可分发的版本，用于销售或部署到客户网站。

## 目录结构

```
deploy/
├── package_theme.php    # 主题打包脚本
├── README.md           # 本说明文件
└── dist/               # 打包输出目录（脚本运行后生成）
```

## 使用方法

### 1. 环境要求
- PHP 7.4 或更高版本
- 启用 Zip 扩展
- 命令行访问权限

### 2. 运行打包脚本
```bash
cd f:\gexm\deploy
php package_theme.php
```

### 3. 输出文件

脚本运行后将在 `dist/` 目录中生成以下文件：
- `mixm-laal-theme.zip` - 主题文件包
- `mixm-commerce.zip` - 商城插件包
- `mixm-security.zip` - 安全插件包
- `DEPLOYMENT_INSTRUCTIONS.txt` - 部署说明

## 部署到销售平台

### 1. 自建销售网站
1. 使用WordPress + WooCommerce搭建商城
2. 安装并配置支付网关
3. 上传产品文件并设置价格
4. 添加产品描述和截图

### 2. 第三方平台
1. 注册相应平台的开发者账户
2. 按照平台要求准备文件
3. 提交审核
4. 通过后开始销售

## 客户部署说明

客户购买后可以按照 `DEPLOYMENT_INSTRUCTIONS.txt` 文件中的说明进行部署：

1. 上传主题和插件文件
2. 在WordPress后台安装并激活
3. 进行基本配置

## 技术支持

如需技术支持，请联系：support@yourwebsite.com