# macOS 代码签名配置

本文档说明 Gexm 桌面应用在 macOS 平台下的代码签名配置。

## 签名算法配置

```json
{
  "mac": {
    "signingHashAlgorithms": ["sha256", "sha1"],
    "timestamp": "http://timestamp.apple.com/ts0412"
  }
}
```

## 环境变量配置

构建前需要设置以下环境变量：

```bash
# Apple Developer ID 证书（必须）
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"

# 或使用 3rd Party Mac Developer Application 证书
export APPLE_ID="your.apple.id@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export TEAM_ID="your_team_id"
```

## 证书类型

### Developer ID Application（推荐）

用于分发到非 App Store 渠道（官网下载），这是最常用的签名方式。

- **证书名称**: Developer ID Application
- **环境变量**: `CSC_LINK`
- **有效期**: 3 年

### Mac App Store

用于通过 Mac App Store 分发的应用。

- **证书名称**: 3rd Party Mac Developer Application
- **Team ID**: 需要通过 `TEAM_ID` 指定

## Entitlements 配置

应用使用 `assets/entitlements.mac.plist` 文件定义权限：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

### 权限说明

| 权限 Key | 说明 |
|---------|------|
| `com.apple.security.cs.allow-jit` | 允许 JIT 代码执行 |
| `com.apple.security.cs.allow-unsigned-executable-memory` | 允许执行未签名内存 |
| `com.apple.security.cs.disable-library-validation` | 禁用动态库验证 |
| `com.apple.security.network.client` | 允许网络请求（客户端） |
| `com.apple.security.network.server` | 允许网络服务（服务端） |
| `com.apple.security.files.user-selected.read-write` | 允许访问用户选择的文件 |

## 构建签名应用

```bash
# 使用环境变量
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="password"
npm run build:mac
```

## 验证签名

构建完成后，可使用以下命令验证签名：

```bash
# 查看签名状态
codesign -dvvv "path/to/Gexm.app"

# 验证签名有效性
codesign --verify --verbose=2 "path/to/Gexm.app"

# 查看 entitlements
codesign -d --entitlements=- "path/to/Gexm.app" | xargs plutil
```

## 常见问题

### 证书不受信任

1. 打开"钥匙串访问"
2. 找到 Developer ID 证书
3. 右键显示简介 -> 信任 -> 始终信任

### Gatekeeper 拦截

确保使用有效的 Developer ID 证书签名，应用签名后会被 Gatekeeper 自动识别为可信开发者。

### 签名失败

1. 检查证书是否在有效期内
2. 确认 Team ID 是否正确
3. 确保 entitlements 配置正确
4. 验证环境变量是否正确设置

## 分发注意事项

- Developer ID 签名应用可直接从官网分发
- 应用首次运行时会提示用户确认（如果来自互联网）
- 签名和应用捆绑的标识符必须匹配
