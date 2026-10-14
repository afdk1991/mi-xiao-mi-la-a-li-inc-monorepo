# Gexm Desktop

Gexm 全平台桌面端应用，基于 Electron 构建。

## 功能特性

- 跨平台支持（Windows、macOS、Linux）
- 自动更新功能
- H5 应用嵌入

## 构建

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建所有平台
npm run build

# 构建 Windows
npm run build:win

# 构建 macOS
npm run build:mac

# 构建 Linux
npm run build:linux
```

## 代码签名

详细签名配置请参考以下文档：

- [Windows 签名配置](docs/signing-windows.md)
- [macOS 签名配置](docs/signing-macos.md)

### Windows 签名环境变量

```bash
set CSC_LINK="path/to/certificate.pfx"
set CSC_KEY_PASSWORD="password"
```

### macOS 签名环境变量

```bash
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="password"
```

## 项目结构

```
desktop/
├── assets/              # 静态资源
│   ├── entitlements.mac.plist  # macOS 权限配置
│   └── icon.*           # 应用图标
├── docs/                # 文档
│   ├── signing-windows.md
│   └── signing-macos.md
├── scripts/             # 构建脚本
├── src/
│   ├── main/           # 主进程
│   ├── preload/        # 预加载脚本
│   └── renderer/       # 渲染进程
└── package.json
```

## 依赖

- Electron ^28.2.0
- electron-builder ^24.9.1
- electron-store ^8.1.0
- electron-updater ^6.1.7
