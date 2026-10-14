# GEXM 项目部署指南

## 1. 项目概述

GEXM 是一个基于 uni-app 和 Express 的跨平台电商系统，支持 H5、微信小程序、支付宝小程序等多端运行。

### 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + uni-app | 跨平台应用框架 |
| 后端 | Express + TypeScript | Node.js 服务端框架 |
| 数据库 | SQLite | 轻量级关系型数据库 |
| 缓存 | Redis / 内存缓存 | 可选缓存层 |
| 支付 | 微信支付 / 支付宝支付 | 第三方支付集成 |

### 项目结构

```
f:\gexm/
├── packages/
│   ├── server/          # 后端服务
│   ├── app/             # uni-app 前端应用
│   ├── shared/          # 共享类型定义
│   ├── sdk/             # SDK 模块
│   ├── desktop/         # 桌面应用
│   └── harmonyos/       # HarmonyOS 应用
├── package.json         # 根项目配置
└── README.md            # 项目说明
```

---

## 2. 环境要求

### 基础环境

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.0.0 | 建议使用 LTS 版本 |
| npm | >= 9.0.0 | 包管理器 |
| Git | >= 2.30.0 | 版本控制 |

### 可选依赖

| 工具 | 说明 |
|------|------|
| Redis | 缓存服务（可选） |
| PM2 | 生产环境进程管理 |
| Nginx | 反向代理服务器 |

---

## 3. 安装步骤

### 3.1 克隆项目

```bash
git clone <repository-url>
cd gexm
```

### 3.2 安装依赖

```bash
npm install
```

### 3.3 安装子模块依赖

```bash
npm run bootstrap
```

### 3.4 编译后端代码

```bash
cd packages/server
npm run build
```

---

## 4. 配置说明

### 4.1 环境变量配置

后端服务配置文件位于 `packages/server/.env`：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DATABASE_PATH=./data/gexm.db
DATABASE_MAX_CONNECTIONS=10

# 安全密钥（必须替换为强随机密钥）
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
CSRF_SECRET=your-csrf-secret-here
PAYMENT_SECRET=your-payment-secret-here

# JWT 配置
JWT_EXPIRES_IN=86400
JWT_REFRESH_EXPIRES_IN=604800

# 缓存配置
CACHE_TYPE=memory
REDIS_URL=redis://localhost:6379

# CORS 配置
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 支付配置
WECHAT_PAY_ENABLED=false
WECHAT_APP_ID=your-wechat-app-id
WECHAT_MCH_ID=your-wechat-mch-id
WECHAT_API_KEY=your-wechat-api-key
WECHAT_NOTIFY_URL=http://your-domain.com/api/payment/wechat/callback

ALIPAY_ENABLED=false
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-alipay-private-key
ALIPAY_PUBLIC_KEY=your-alipay-public-key
ALIPAY_NOTIFY_URL=http://your-domain.com/api/payment/alipay/callback

# 安全配置
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### 4.2 生成安全密钥

```bash
# 生成 JWT_SECRET（64位十六进制）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 CSRF_SECRET（64位十六进制）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 PAYMENT_SECRET（64位十六进制）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. 运行服务

### 5.1 开发模式

```bash
# 启动后端服务
cd packages/server
npm run dev

# 启动前端开发服务器（H5）
cd packages/app
npm run dev:h5
```

### 5.2 生产模式

```bash
# 编译并启动后端服务
cd packages/server
npm run build
npm run start

# 编译前端（H5）
cd packages/app
npm run build:h5
```

### 5.3 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "gexm-server" -- run start

# 查看状态
pm2 status

# 查看日志
pm2 logs gexm-server

# 停止服务
pm2 stop gexm-server

# 设置开机自启
pm2 startup
pm2 save
```

---

## 6. Nginx 配置

### 6.1 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/gexm/packages/app/dist/build/h5;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 文件上传
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    # SSL 配置（生产环境）
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;
    # ssl_protocols TLSv1.2 TLSv1.3;
}
```

---

## 7. 数据库管理

### 7.1 初始化数据库

数据库会在服务启动时自动初始化，创建所需的表结构。

### 7.2 数据库备份

```bash
# SQLite 数据库备份
sqlite3 packages/server/data/gexm.db ".backup packages/server/data/gexm_backup.db"

# 定时备份（Linux cron）
# 0 3 * * * sqlite3 /path/to/gexm/packages/server/data/gexm.db ".backup /path/to/backup/gexm_$(date +%Y%m%d).db"
```

### 7.3 数据库恢复

```bash
sqlite3 packages/server/data/gexm.db ".restore packages/server/data/gexm_backup.db"
```

---

## 8. 安全配置

### 8.1 生产环境安全检查清单

- [ ] 替换所有默认密钥为强随机密钥
- [ ] 启用 HTTPS（配置 SSL 证书）
- [ ] 配置正确的 CORS 白名单
- [ ] 禁用调试模式
- [ ] 设置适当的文件上传大小限制
- [ ] 配置防火墙规则
- [ ] 定期更新依赖包
- [ ] 配置日志轮转

### 8.2 安全中间件

系统已集成以下安全中间件：

| 中间件 | 功能 |
|--------|------|
| helmet | 设置安全 HTTP 头 |
| csrfProtection | CSRF 防护 |
| xssFilter | XSS 攻击防护 |
| rateLimiter | 接口限流 |
| sanitizeInput | 输入内容过滤 |

---

## 9. 监控与日志

### 9.1 日志配置

日志文件位于 `packages/server/logs/app.log`。

### 9.2 健康检查

```bash
curl http://localhost:3000/api/health
```

### 9.3 性能指标

```bash
curl http://localhost:3000/api/metrics
```

---

## 10. 常见问题

### 10.1 端口占用

```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程
taskkill /F /PID <进程ID>
```

### 10.2 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 10.3 数据库连接失败

- 确保数据库目录存在且有读写权限
- 检查 `DATABASE_PATH` 配置是否正确

### 10.4 支付配置问题

- 确保支付网关配置完整
- 检查回调地址是否可访问
- 验证商户密钥是否正确

---

## 11. 部署流程

### 11.1 CI/CD 建议

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Build server
      run: npm run build --workspace=@gexm/server

    - name: Deploy to production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USERNAME }}
        password: ${{ secrets.SSH_PASSWORD }}
        script: |
          cd /path/to/gexm
          git pull
          npm install
          npm run build --workspace=@gexm/server
          pm2 restart gexm-server
```

---

## 12. 版本更新

```bash
# 更新项目
git pull origin main

# 更新依赖
npm install

# 重新编译
npm run build --workspace=@gexm/server

# 重启服务
pm2 restart gexm-server
```

---

## 附录：常用命令

```bash
# 运行测试
cd packages/server
npm run test

# 代码检查
npm run lint

# 代码格式化
npm run lint:fix

# 查看测试覆盖率
npm run test -- --coverage
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-07-05