# Windows 代码签名配置

本文档说明 Gexm 桌面应用在 Windows 平台下的代码签名配置。

## 签名算法配置

```json
{
  "win": {
    "signingHashAlgorithms": ["sha256"],
    "rfc3161Timestamp": {
      "server": "http://timestamp.digicert.com"
    }
  }
}
```

## 环境变量配置

构建前需要设置以下环境变量：

```bash
# Windows 签名证书（pfx 格式）
set CSC_LINK="path/to/certificate.pfx"
set CSC_KEY_PASSWORD="certificate_password"

# 或使用单独的密钥文件
set WIN_CSC_LINK="path/to/certificate.pfx"
set WIN_CSC_KEY_PASSWORD="password"
```

## 签名证书要求

1. **证书类型**：代码签名证书（Code Signing Certificate）
2. **证书格式**：PFX/P12 格式
3. **证书颁发机构**：推荐使用受信任的 CA（如 DigiCert、GlobalSign、Comodo 等）
4. **证书存储**：支持文件路径或环境变量引用

## 时间戳服务器

配置使用 RFC 3161 时间戳，确保签名在证书过期后仍然有效：

- DigiCert: `http://timestamp.digicert.com`
- GlobalSign: `http://timestamp.globalsign.com/tsa/r6advanced1`
- Comodo: `http://timestamp.comodoca.com/rfc3161`

## 构建签名应用

```bash
# 使用环境变量
set CSC_LINK="path/to/certificate.pfx"
set CSC_KEY_PASSWORD="password"
npm run build:win

# 或使用 electron-builder 的 --win 参数
npx electron-builder --win --config.win.signingHashAlgorithms=["sha256"]
```

## 验证签名

构建完成后，可使用以下命令验证签名：

```powershell
# 查看 EXE 文件签名
Get-AuthenticodeSignature "path/to/Gexm.exe"

# 验证时间戳
signtool verify /pa /v "path/to/Gexm.exe"
```

## 常见问题

### 证书不受信任

确保使用受信任 CA 颁发的证书，或将自签名证书添加到系统的受信任根证书存储。

### 签名失败

1. 检查证书路径是否正确
2. 确认证书密码是否匹配
3. 验证证书是否在有效期内
4. 确保环境变量正确设置
