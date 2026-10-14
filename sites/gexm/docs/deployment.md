# 部署文档

## 1. 环境要求

### 1.1 软件要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 16.0.0 (推荐 18.x LTS) | JavaScript 运行时 |
| npm | >= 7.0.0 (推荐 9.x) | 包管理器 |
| Git | 最新版 | 版本控制 |
| Nginx | >= 1.18 | 反向代理 & 静态资源服务 |
| PM2 | >= 5.0 | Node.js 进程管理（可选，Docker 部署可不用） |
| SQLite3 | 随 better-sqlite3 自动安装 | 数据库 |
| Redis | >= 6.0 (推荐 7.x) | 缓存服务（可选，未安装时自动降级为内存缓存） |

### 1.2 服务器硬件要求

| 配置级别 | CPU | 内存 | 硬盘 | 支持并发 | 适用场景 |
|----------|-----|------|------|----------|----------|
| 最低配置 | 2 核 | 2 GB | 20 GB SSD | ~200 QPS | 开发/测试环境 |
| 推荐配置 | 4 核 | 4 GB | 50 GB SSD | ~1000 QPS | 小型生产环境 |
| 高性能 | 8 核 | 8 GB | 100 GB SSD | ~3000 QPS | 中大型生产环境 |

### 1.3 操作系统要求

- **Linux (推荐)**: Ubuntu 20.04 LTS / 22.04 LTS, CentOS 7/8, Debian 11
- **macOS**: 11.0+ (开发/测试用)
- **Windows**: Windows 10/11, Windows Server 2019+ (开发/测试用)

---

## 2. 生产环境部署步骤

### 2.1 服务器环境准备

#### 2.1.1 Linux (Ubuntu/Debian)

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y git curl wget build-essential

# 安装 Node.js 18.x (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应输出 v18.x.x
npm --version   # 应输出 9.x.x

# 安装 PM2 (进程管理)
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
```

#### 2.1.2 Linux (CentOS/RHEL)

```bash
# 更新系统
sudo yum update -y

# 安装基础工具
sudo yum install -y git curl wget gcc-c++ make

# 安装 Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo yum install -y nginx
sudo systemctl enable nginx
```

#### 2.1.3 Windows

```powershell
# 使用 Chocolatey 安装 (需要先安装 Chocolatey)
choco install nodejs-lts git nginx -y

# 安装 PM2 (Windows 下可用 pm2-installer)
npm install -g pm2-windows-startup
```

#### 2.1.4 Redis 安装（可选）

Redis 作为缓存服务，未安装时系统自动降级为内存缓存模式。

##### Linux (Ubuntu/Debian)

```bash
# 安装 Redis
sudo apt install -y redis-server

# 启用 Redis 服务
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 验证安装
redis-cli ping  # 应输出 PONG
```

##### Linux (CentOS/RHEL)

```bash
# 安装 Redis
sudo yum install -y redis

# 启用 Redis 服务
sudo systemctl enable redis
sudo systemctl start redis

# 验证安装
redis-cli ping
```

##### Windows

```powershell
# 使用 Chocolatey 安装
choco install redis-64 -y

# 启动 Redis 服务
redis-server --service-install
redis-server --service-start
```

### 2.2 代码拉取与依赖安装

```bash
# 克隆项目 (Linux/macOS/Windows 通用)
git clone <your-repository-url> gexm
cd gexm

# 切换到生产分支
git checkout main

# 安装依赖 (monorepo 根目录执行，自动安装所有子包)
npm install

# 验证依赖安装
npm ls --depth=0
```

> **注意**: 如果在国内服务器，建议配置 npm 镜像源以加速安装：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

### 2.3 环境变量配置

```bash
# 复制后端环境变量模板
cp packages/server/.env.example packages/server/.env

# 编辑环境变量
# Linux/macOS
vi packages/server/.env

# Windows PowerShell
notepad packages\server\.env
```

**生产环境必须修改的关键配置**：

```env
# 运行环境
NODE_ENV=production
PORT=3000

# JWT 密钥 - 生产环境必须使用强随机密钥
# 生成命令: openssl rand -base64 32
JWT_SECRET=your_32bit_strong_secret_key_here
JWT_REFRESH_SECRET=your_another_32bit_strong_secret_key_here

# Token 有效期
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# 数据库路径 (建议使用绝对路径)
DB_PATH=/opt/gexm/data/gexm.db

# 文件上传目录
UPLOAD_PATH=/opt/gexm/uploads
MAX_UPLOAD_SIZE=10485760

# CORS 配置 (逗号分隔多个域名)
CORS_ORIGINS=https://www.yourdomain.com,https://m.yourdomain.com

# 强制 HTTPS
FORCE_HTTPS=true

# 限流配置
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# 日志配置
LOG_LEVEL=warn
LOG_FILE=/opt/gexm/logs/app.log
```

> **安全提示**: 
> - JWT_SECRET 和 JWT_REFRESH_SECRET 必须使用不同的随机字符串
> - 绝不能将 .env 文件提交到 Git 仓库
> - 密钥建议至少 32 位，包含大小写字母、数字和特殊字符

### 2.4 数据库初始化

```bash
# 创建必要的目录
mkdir -p /opt/gexm/data
mkdir -p /opt/gexm/uploads
mkdir -p /opt/gexm/logs

# 设置目录权限 (Linux/macOS)
chmod 755 /opt/gexm/data
chmod 755 /opt/gexm/uploads
chmod 755 /opt/gexm/logs

# 首次启动服务会自动创建数据库表和初始化数据
cd packages/server
node src/server.js
```

首次启动后，系统会自动：
1. 创建 SQLite 数据库文件
2. 创建所有数据表结构
3. 插入默认管理员账号 (admin / admin123456)
4. 插入默认商品分类和示例数据

> **重要**: 首次启动成功后，请立即登录后台修改管理员默认密码！

### 2.5 构建前端 (H5)

```bash
# 在项目根目录执行
npm run build:app-h5
```

构建产物位于：`packages/app/dist/build/h5/`

### 2.6 启动后端服务

#### 方式一：PM2 进程管理 (推荐)

创建 PM2 配置文件 `ecosystem.config.js`（项目根目录）：

```javascript
module.exports = {
  apps: [{
    name: 'gexm-server',
    script: 'packages/server/src/server.js',
    cwd: '/opt/gexm',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/gexm/logs/pm2-error.log',
    out_file: '/opt/gexm/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }]
};
```

启动服务：

```bash
# 启动应用
pm2 start ecosystem.config.js

# 保存进程列表，开机自启
pm2 save
pm2 startup systemd

# 查看状态
pm2 status
pm2 logs gexm-server
```

#### 方式二：systemd 服务 (Linux)

创建服务文件 `/etc/systemd/system/gexm.service`：

```ini
[Unit]
Description=Gexm E-commerce Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/gexm/packages/server
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gexm-server

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable gexm
sudo systemctl start gexm
sudo systemctl status gexm
```

---

## 3. 推荐部署架构

### 3.1 单机部署架构（适用于中小型项目）

```
                    +-------------------+
                    |     用户流量       |
                    +---------+---------+
                              |
                              v
                    +---------+---------+
                    |       Nginx       |
                    |  (反向代理/HTTPS)  |
                    |  (静态资源服务)    |
                    |  (Gzip 压缩)      |
                    +---------+---------+
                              |
               +--------------+--------------+
               |                             |
               v                             v
    +----------+----------+       +----------+----------+
    |   H5 静态资源文件    |       |   Express 后端服务   |
    |  (Nginx 直接服务)    |       |   (PM2 管理进程)     |
    +---------------------+       |   - SQLite 数据库    |
                                  |   - WebSocket 服务   |
                                  |   - 文件上传处理     |
                                  +---------------------+
```

### 3.2 架构说明

- **Nginx**: 作为入口，负责 HTTPS 终止、静态资源服务、API 反向代理、Gzip 压缩、负载均衡
- **Express 后端**: 业务逻辑处理，由 PM2 管理进程，保证服务稳定性
- **SQLite**: 轻量级数据库，适合中小规模电商，数据存储在本地文件
- **静态资源**: H5 构建产物直接由 Nginx 提供，减轻 Node.js 服务压力

---

## 4. Nginx 配置示例

### 4.1 完整 Nginx 配置

创建配置文件 `/etc/nginx/conf.d/gexm.conf`：

```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com m.yourdomain.com;
    
    # Let's Encrypt 验证路径
    location ~ /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL 证书路径 (使用 Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # SSL 会话缓存
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # 根路径 - H5 静态资源
    location / {
        root /opt/gexm/packages/app/dist/build/h5;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # HTML 不缓存，确保更新即时生效
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # 代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲配置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # 上传文件缓存
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # 健康检查
    location = /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        access_log off;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/xml
        application/xml+rss
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 访问日志
    access_log /var/log/nginx/gexm-access.log;
    error_log /var/log/nginx/gexm-error.log warn;
}
```

### 4.2 配置验证与重载

```bash
# 验证配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
# 或者
sudo nginx -s reload
```

---

## 5. PM2 进程管理配置

### 5.1 完整 ecosystem.config.js

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'gexm-server',
      script: 'packages/server/src/server.js',
      cwd: '/opt/gexm',
      
      // 实例配置
      instances: 1,
      exec_mode: 'fork',
      
      // 重启策略
      autorestart: true,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      
      // 监听文件变化（开发环境用，生产环境禁用）
      watch: false,
      ignore_watch: [
        'node_modules',
        'data',
        'uploads',
        'logs',
        '.git'
      ],
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      error_file: '/opt/gexm/logs/pm2-error.log',
      out_file: '/opt/gexm/logs/pm2-out.log',
      merge_logs: true,
      max_size: '10M',
      retain: 30,
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: false,
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/gexm.git',
      path: '/opt/gexm',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:app-h5 && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

### 5.2 PM2 常用命令

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status
pm2 list

# 查看日志
pm2 logs gexm-server
pm2 logs gexm-server --lines 100
pm2 logs gexm-server --err

# 监控
pm2 monit
pm2 show gexm-server

# 重启/重载
pm2 restart gexm-server
pm2 reload gexm-server    # 0 秒停机重载

# 停止/删除
pm2 stop gexm-server
pm2 delete gexm-server

# 保存当前进程列表
pm2 save

# 设置开机自启
pm2 startup systemd
pm2 save

# 禁用开机自启
pm2 unstartup systemd

# 查看实时资源使用
pm2 monit
```

---

## 6. Docker 部署方案

### 6.1 后端 Dockerfile

创建 `packages/server/Dockerfile`：

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安装构建依赖 (better-sqlite3 需要编译)
RUN apk add --no-cache python3 make g++

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 运行阶段
FROM node:18-alpine

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache curl tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 复制构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# 创建必要目录
RUN mkdir -p data uploads logs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["node", "src/server.js"]
```

### 6.2 .dockerignore

创建 `.dockerignore`（项目根目录）：

```
node_modules
**/node_modules
data
uploads
logs
.git
.gitignore
*.md
.env
.env.*
!.env.example
npm-debug.log
yarn-error.log
.DS_Store
.vscode
.idea
```

### 6.3 Nginx Docker 配置

创建 `docker/nginx/nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;
    
    # H5 静态资源
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://gexm-server:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 上传文件
    location /uploads/ {
        proxy_pass http://gexm-server:3000;
        expires 7d;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

### 6.4 docker-compose.yml

创建 `docker-compose.yml`（项目根目录）：

```yaml
version: '3.8'

services:
  gexm-server:
    build:
      context: ./packages/server
      dockerfile: Dockerfile
    container_name: gexm-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - gexm-data:/app/data
      - gexm-uploads:/app/uploads
      - gexm-logs:/app/logs
    env_file:
      - ./packages/server/.env
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/gexm.db
      - UPLOAD_PATH=/app/uploads
      - LOG_FILE=/app/logs/app.log
    networks:
      - gexm-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: gexm-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./packages/app/dist/build/h5:/usr/share/nginx/html:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - gexm-server
    networks:
      - gexm-network

volumes:
  gexm-data:
    driver: local
  gexm-uploads:
    driver: local
  gexm-logs:
    driver: local

networks:
  gexm-network:
    driver: bridge
```

### 6.5 Docker 部署命令

```bash
# 1. 构建前端
npm run build:app-h5

# 2. 构建并启动容器
docker-compose up -d --build

# 3. 查看状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f gexm-server
docker-compose logs -f nginx

# 5. 停止服务
docker-compose stop

# 6. 重启服务
docker-compose restart

# 7. 更新部署
git pull
npm run build:app-h5
docker-compose up -d --build

# 8. 数据备份
docker run --rm -v gexm-data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/gexm-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 7. 域名与 SSL 证书配置

### 7.1 域名解析

在域名服务商处添加 DNS 解析记录：

| 主机记录 | 记录类型 | 记录值 | TTL |
|----------|----------|--------|-----|
| @ | A | 服务器公网IP | 600 |
| www | A | 服务器公网IP | 600 |
| m | A | 服务器公网IP | 600 |

### 7.2 Let's Encrypt 免费 SSL 证书

```bash
# 安装 Certbot (Ubuntu/Debian)
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d m.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run

# 证书位置
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 7.3 自动续期

Certbot 会自动添加定时任务，也可以手动配置：

```bash
# 查看 crontab
sudo crontab -l

# 手动添加（如未自动添加）
echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | sudo crontab -
```

### 7.4 使用自签名证书（测试环境）

```bash
# 生成自签名证书
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/server.key \
  -out docker/nginx/ssl/server.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Gexm/OU=Dev/CN=localhost"
```

---

## 8. 部署验证清单

部署完成后，请按以下清单验证：

- [ ] 后端服务正常运行：`curl http://localhost:3000/api/health`
- [ ] Nginx 配置正确：`nginx -t`
- [ ] 前端页面可正常访问
- [ ] API 接口可正常调用
- [ ] HTTPS 正常工作，证书有效
- [ ] WebSocket 连接正常
- [ ] 文件上传功能正常
- [ ] 登录/注册功能正常
- [ ] 管理员后台可正常登录
- [ ] 日志正常输出
- [ ] PM2 进程管理正常（如使用 PM2）
- [ ] 自动备份脚本已配置（如需要）
