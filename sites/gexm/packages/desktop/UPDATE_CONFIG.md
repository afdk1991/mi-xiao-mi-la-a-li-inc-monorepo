# 自动更新配置指南

本指南说明如何为 Gexm Desktop 配置自动更新功能。

## 配置方式

### 方式一：环境变量配置

在 `.env` 文件中设置更新服务器地址：

```env
UPDATE_SERVER_URL=https://your-update-server.com/releases
```

### 方式二：启动参数配置

```bash
gexm-desktop.exe --update-server-url=https://your-update-server.com/releases
```

## 服务器要求

更新服务器需要提供以下端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/latest.yml` | GET | 返回最新版本信息 |
| `/:version.yml` | GET | 返回指定版本信息 |
| `/:version/delta.yml` | GET | 返回增量更新包（可选） |
| `/:version/notes.html` | GET | 返回版本更新日志 |

### latest.yml 示例

```yaml
version: 1.2.0
releaseDate: '2024-01-15T10:00:00Z'
releaseNotes: |
  <h2>更新内容</h2>
  <ul>
    <li>新增功能A</li>
    <li>修复问题B</li>
  </ul>
files:
  - url: Gexm-1.2.0-win64.exe
    sha512: abc123...
    size: 125829120
```

## 版本号文件结构

```
releases/
├── latest.yml
├── latest-mac.yml
├── latest-linux.yml
├── 1.2.0.yml
├── 1.2.0-delta.yml
├── 1.2.0/
│   └── Gexm-1.2.0-win64.exe
├── 1.1.0.yml
└── 1.1.0/
    └── Gexm-1.1.0-win64.exe
```

## 安全配置

### 签名验证

electron-updater 支持签名验证。在 `latest.yml` 中添加：

```yaml
releaseDate: '2024-01-15T10:00:00Z'
files:
  - url: Gexm-1.2.0-win64.exe
    sha512: abc123... # 推荐使用SHA512
signature: 'base64-signature' # Windows NSIS签名
```

### 私有更新服务器

如需认证访问：

```env
UPDATE_SERVER_URL=https://user:pass@your-update-server.com/releases
```

## 调试

开发环境下自动更新功能默认禁用。如需测试：

```bash
NODE_ENV=production npm run dev
```

查看更新日志位置：`%APPDATA%/Gexm/logs/`

## 配置参数

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| 服务器地址 | `UPDATE_SERVER_URL` | `https://your-update-server.com/releases` | 更新文件托管地址 |
| 检查间隔 | `UPDATE_CHECK_INTERVAL` | `1800000` (30分钟) | 自动检查更新间隔 |
| 自动下载 | `UPDATE_AUTO_DOWNLOAD` | `false` | 发现新版本自动下载 |
| 自动安装 | `UPDATE_AUTO_INSTALL` | `true` | 退出时自动安装 |

## 常见问题

### Q: 更新检查失败怎么办？
A: 检查：
1. 服务器地址是否正确
2. 网络是否可达
3. `latest.yml` 格式是否正确
4. 日志文件查看详细错误信息

### Q: 如何禁用自动更新？
A: 设置 `ELECTRON_DISABLE_AUTO_UPDATE=true` 环境变量

### Q: 更新包下载失败？
A: 确认防火墙允许应用程序访问更新服务器，确保磁盘空间充足
