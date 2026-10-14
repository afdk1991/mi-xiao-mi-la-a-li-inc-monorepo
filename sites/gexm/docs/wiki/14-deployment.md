# 14. 部署与运行方式

> 本章描述 `gexm-platform` 的本地开发、Docker Compose 部署、systemd 生产部署、Nginx 网关配置、SSL 配置、PM2 进程管理、监控告警等场景。所有路径以 `file:///` 协议给出。

---

## 14.1 本地开发

### 14.1.1 前置要求

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | ≥ 18.0.0 | 运行时 |
| npm | ≥ 9.0.0 | 包管理 |
| Docker Desktop | 最新（WSL2 后端） | PostgreSQL/Redis 集成测试 |
| PHP | 8.0+ | 本地运行 WordPress（可选） |
| MySQL | 5.7+ / 8.0 | WordPress 数据库（可选） |
| Git | 2.30+ | 版本控制 |

### 14.1.2 安装与启动

```bash
# 1. 克隆仓库
git clone <repo-url> f:\gexm
cd f:\gexm

# 2. 安装根依赖（自动安装 workspaces 所有包依赖）
npm install

# 3. 配置环境变量
cp packages/server/.env.example packages/server/.env
# 编辑 .env，至少配置 JWT_SECRET、JWT_REFRESH_SECRET、CSRF_SECRET

# 4. 启动后端 + H5（并行）
npm run dev
# 等价于：
#   npm run dev:server  → tsx src/server.ts (端口 3000)
#   npm run dev:app-h5  → uni (H5 模式)

# 5. 启动全部（后端 + H5 + 桌面端）
npm run dev:all

# 6. 启动 PC 后台
npm --workspace @gexm/pc run dev

# 7. 启动微信小程序
npm run dev:app-mp-weixin

# 8. 启动桌面端
npm run dev:desktop
```

### 14.1.3 开发端口规划

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| Express Server | 3000 | 后端 API |
| PC 后台 | 5173 | Vite dev server |
| H5 | 8080 | uni-app H5 |
| 桌面端 | — | Electron 窗口 |
| MCP Server | 8080 | AI Agent MCP |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Jaeger UI | 16686 | 链路追踪 |

### 14.1.4 开发工具

| 工具 | 用途 | 配置 |
| --- | --- | --- |
| `nodemon` | 后端热重启 | [packages/server/nodemon.json](file:///f:/gexm/packages/server/nodemon.json) |
| `tsx` | TS 脚本直接执行 | `dev` script |
| `concurrently` | 并行启动多服务 | 根 `dev` / `dev:all` script |
| `Query Monitor` | WordPress 调试 | WP 插件 |
| `Vue DevTools` | Vue 调试 | 浏览器扩展 |
| `React DevTools` | Gutenberg 调试 | 浏览器扩展（如使用 React 区块） |

---

## 14.2 Docker Compose 部署

### 14.2.1 主 Compose 文件

**文件**：[docker-compose.yml](file:///f:/gexm/docker-compose.yml)

定义 5 个服务：

| 服务 | 镜像/构建 | 端口 | 网络 |
| --- | --- | --- | --- |
| `server` | `packages/server/Dockerfile` | `${SERVER_PORT:-3000}:3000` | gexm-backend, gexm-db |
| `app` | `packages/app/Dockerfile` | `${APP_PORT:-80}:80` | gexm-frontend, gexm-backend |
| `pc` | `packages/pc/Dockerfile` | `${PC_PORT:-8080}:8080` | gexm-frontend, gexm-backend |
| `redis` | `redis:7-alpine` | `${REDIS_PORT:-6379}:6379` | gexm-db |
| `postgres` | `postgres:16-alpine` | `${POSTGRES_PORT:-5432}:5432` | gexm-db |

### 14.2.2 三套独立网络隔离

```yaml
networks:
  gexm-frontend:           # 172.20.0.0/24 — 前端容器（app, pc）
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  gexm-backend:            # 172.21.0.0/24 — 后端容器（server, app, pc）
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24
  gexm-db:                 # 172.22.0.0/24 — 数据库容器（server, redis, postgres）
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/24
```

**网络隔离原则**：
- 前端容器（app/pc）只能访问后端（server），不能直接访问数据库
- 数据库容器（redis/postgres）只与 server 共享 `gexm-db` 网络
- 通过 `networks:` 字段控制容器加入的网络

### 14.2.3 数据卷持久化

```yaml
volumes:
  server-data:        # /app/packages/server/data — SQLite 数据库
  server-uploads:     # /app/packages/server/uploads — 用户上传
  server-logs:        # /app/packages/server/logs — 日志
  redis-data:         # /data — Redis 持久化
  postgres-data:      # /var/lib/postgresql/data — PostgreSQL 数据
```

### 14.2.4 健康检查

| 服务 | 健康检查命令 | 间隔 | 超时 | 重试 | 启动等待 |
| --- | --- | --- | --- | --- | --- |
| `server` | `curl -f http://localhost:3000/api/health` | 30s | 10s | 3 | 40s |
| `app` | `curl -f http://localhost` | 30s | 10s | 3 | 20s |
| `pc` | `curl -f http://localhost:8080` | 30s | 10s | 3 | 20s |
| `redis` | `redis-cli ping` | 10s | 5s | 3 | — |
| `postgres` | `pg_isready -U gexm` | 10s | 5s | 3 | — |

### 14.2.5 启动命令

```bash
# 开发环境（默认）
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**

# 生产环境（覆写）

# WordPress 独立栈

# 测试环境

# 查看日志

# 停止

# 停止并删除数据卷（慎用）
```

### 14.2.6 独立 Compose 拆分

按 `project_memory.md` 约定，每个服务使用独立 Compose 文件：

| 服务 | Compose 文件 | 路径 |
| --- | --- | --- |
| Nginx | `docker-compose.yml` | [infra/nginx/docker-compose.yml](file:///f:/gexm/infra/nginx/docker-compose.yml) |
| Express API | `docker-compose.yml` | [infra/express-api/docker-compose.yml](file:///f:/gexm/infra/express-api/docker-compose.yml) |
| MySQL | `docker-compose.yml` | [infra/mysql/docker-compose.yml](file:///f:/gexm/infra/mysql/docker-compose.yml) |
| Redis | `docker-compose.yml` | [infra/redis/docker-compose.yml](file:///f:/gexm/infra/redis/docker-compose.yml) |
| WordPress | `docker-compose.yml` | [infra/wordpress/docker-compose.yml](file:///f:/gexm/infra/wordpress/docker-compose.yml) |
| 监控栈 | `docker-compose.yml` | [infra/monitoring/docker-compose.yml](file:///f:/gexm/infra/monitoring/docker-compose.yml) |
| 网络定义 | `network.yml` | [infra/network.yml](file:///f:/gexm/infra/network.yml) |

通过 `networks:` 引用共享网络实现互通。

---

## 14.3 生产部署（systemd）

### 14.3.1 systemd 单元文件

**文件**：[deploy/scripts/gexm.service](file:///f:/gexm/deploy/scripts/gexm.service)

```ini
[Unit]
Description=Gexm Platform Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=gexm
Group=gexm
WorkingDirectory=/opt/gexm
EnvironmentFile=/opt/gexm/.env
ExecStart=/usr/bin/node /opt/gexm/packages/server/dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gexm

# 安全限制
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gexm/logs /opt/gexm/data /opt/gexm/uploads

# 资源限制
LimitNOFILE=65536
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

### 14.3.2 部署步骤

```bash
# 1. 拷贝到 systemd 目录
sudo cp deploy/scripts/gexm.service /etc/systemd/system/

# 2. 重载 systemd 配置
sudo systemctl daemon-reload

# 3. 启用开机自启
sudo systemctl enable gexm

# 4. 启动服务
sudo systemctl start gexm

# 5. 查看状态
sudo systemctl status gexm

# 6. 查看日志
sudo journalctl -u gexm -f
```

### 14.3.3 部署脚本

| 脚本 | 路径 | 用途 |
| --- | --- | --- |
| `deploy.sh` | [deploy/scripts/deploy.sh](file:///f:/gexm/deploy/scripts/deploy.sh) | 一键部署（拉代码、安装依赖、构建、重启服务） |
| `ssl-setup.sh` | [deploy/scripts/ssl-setup.sh](file:///f:/gexm/deploy/scripts/ssl-setup.sh) | SSL 证书申请与续期（Let's Encrypt） |
| `backup.sh` | [deploy/scripts/backup.sh](file:///f:/gexm/deploy/scripts/backup.sh) | 数据库备份 |
| `rollback.sh` | [deploy/scripts/rollback.sh](file:///f:/gexm/deploy/scripts/rollback.sh) | 版本回滚 |

---

## 14.4 PM2 进程管理（可选）

**文件**：[packages/server/ecosystem.config.js](file:///f:/gexm/packages/server/ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: 'gexm-server',
      script: 'dist/server.js',
      cwd: './packages/server',
      instances: 1,                  // 单实例（避免 SQLite 锁竞争）
      exec_mode: 'fork',
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
    },
    {
      name: 'gexm-mcp',
      script: 'dist/mcpServer.js',
      cwd: './packages/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        MCP_PORT: 8080,
      },
    },
  ],
}
```

### 14.4.1 PM2 常用命令

```bash
# 启动
pm2 start ecosystem.config.js --env production

# 停止
pm2 stop gexm-server

# 重启
pm2 restart gexm-server

# 查看状态
pm2 status

# 查看日志
pm2 logs gexm-server --lines 100

# 监控
pm2 monit

# 保存进程列表（开机自启）
pm2 save
pm2 startup
```

---

## 14.5 Nginx 网关配置

### 14.5.1 主配置文件

**文件**：[infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf)

### 14.5.2 核心配置项

#### Upstream 定义

```nginx
upstream wordpress_backend {
    server wordpress:80;
    keepalive 64;
}

upstream express_backend {
    server express-api:3000;
    keepalive 64;
}
```

#### Gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript
           text/xml application/xml application/xml+rss
           text/javascript image/svg+xml;
gzip_min_length 256;
gzip_buffers 16 8k;
```

#### 安全响应头

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header X-XSS-Protection "1; mode=block" always;
```

#### 路由规则

| 路径 | 上游 | 缓存 | 备注 |
| --- | --- | --- | --- |
| `/api/wp/` | wordpress_backend | — | WordPress REST API |
| `/api/app/` | express_backend | — | Express API（支持 WebSocket 升级） |
| `/api/health` | express_backend | `access_log off` | 健康检查 |
| `/api/payment/notify/wechat` | express_backend | 单独 access_log | 微信支付回调 |
| `/api/payment/notify/alipay` | express_backend | 单独 access_log | 支付宝支付回调 |
| `/` | wordpress_backend | — | WordPress 前台 |
| `/wp-admin/` | wordpress_backend | — | WordPress 后台 |
| `/wp-content/` | wordpress_backend | 30 天 | 静态资源 |
| `/uploads/` | wordpress_backend | 30 天 | 上传文件 |
| `*.(js\|css\|png\|...)` | wordpress_backend | 1 年 immutable | 静态资源 |

#### TLS 配置（HTTPS）

```nginx
server {
    listen 443 ssl http2;
    server_name laal.top www.laal.top;

    ssl_certificate /etc/nginx/ssl/laal.top.crt;
    ssl_certificate_key /etc/nginx/ssl/laal.top.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:
                ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:
                ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:
                DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    # ... 其他响应头
}
```

#### HTTP → HTTPS 重定向

```nginx
server {
    listen 80;
    server_name ~^[^.]+\.laal\.top$;
    return 301 https://$host$request_uri;
}
```

### 14.5.3 敏感路径屏蔽

通过 `project_memory.md` 约定，Nginx 必须屏蔽以下路径：

- `logs/`、`backups/`、`cache/`
- `.log`、`.sql`、`.bak` 扩展名
- `PEM_Privatekey/`、`certs/`

实际配置中通过 WordPress 容器**仅挂载 `wp-content` 目录**避免敏感文件暴露（参见 [docker-compose.wp.yml](file:///f:/gexm/docker-compose.wp.yml)）。

---

## 14.6 SSL 证书配置

### 14.6.1 Let's Encrypt 申请

**文件**：[deploy/scripts/ssl-setup.sh](file:///f:/gexm/deploy/scripts/ssl-setup.sh)

```bash
#!/bin/bash
# 申请 Let's Encrypt 证书

DOMAIN="laal.top"
EMAIL="admin@laal.top"

# 1. 安装 certbot
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# 2. 申请证书
sudo certbot --nginx \
  -d ${DOMAIN} \
  -d www.${DOMAIN} \
  --email ${EMAIL} \
  --agree-tos \
  --no-eff-email \
  --redirect

# 3. 自动续期（cron）
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew

# 4. 测试续期
sudo certbot renew --dry-run
```

### 14.6.2 证书路径

| 文件 | 路径 | 用途 |
| --- | --- | --- |
| 证书 | `/etc/letsencrypt/live/laal.top/fullchain.pem` | 完整证书链 |
| 私钥 | `/etc/letsencrypt/live/laal.top/privkey.pem` | 私钥 |
| 链证书 | `/etc/letsencrypt/live/laal.top/chain.pem` | 中间证书 |

### 14.6.3 Nginx 引用

```nginx
ssl_certificate /etc/letsencrypt/live/laal.top/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/laal.top/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/laal.top/chain.pem;
```

---

## 14.7 监控告警

### 14.7.1 监控栈

**目录**：[infra/monitoring/](file:///f:/gexm/infra/monitoring/)

| 组件 | 配置文件 | 用途 |
| --- | --- | --- |
| Prometheus | [prometheus.yml](file:///f:/gexm/infra/monitoring/prometheus.yml) | 指标采集 |
| Alertmanager | [alertmanager.yml](file:///f:/gexm/infra/monitoring/alertmanager.yml) | 告警路由 |
| Loki | [loki-config.yml](file:///f:/gexm/infra/monitoring/loki-config.yml) | 日志聚合 |
| Promtail | [promtail-config.yml](file:///f:/gexm/infra/monitoring/promtail-config.yml) | 日志采集 |
| Grafana | [grafana/dashboards/gexm-overview.json](file:///f:/gexm/infra/monitoring/grafana/dashboards/gexm-overview.json) | 可视化 |

### 14.7.2 告警规则

**文件**：[infra/monitoring/alert_rules.yml](file:///f:/gexm/infra/monitoring/alert_rules.yml)

典型规则：
- `HighErrorRate`：5xx 错误率 > 5% 持续 5 分钟
- `HighLatency`：P95 延迟 > 2s 持续 5 分钟
- `ServiceDown`：服务健康检查失败 3 次
- `DiskSpaceLow`：磁盘空间 < 10%
- `MemoryHigh`：内存使用 > 90% 持续 5 分钟

### 14.7.3 Grafana Dashboard

**文件**：[infra/monitoring/grafana/dashboards/gexm-overview.json](file:///f:/gexm/infra/monitoring/grafana/dashboards/gexm-overview.json)

包含面板：
- QPS / 错误率 / P95 延迟
- CPU / 内存 / 磁盘使用
- 数据库连接池
- Redis 命中率
- HTTP 状态码分布
- 热点路由

---

## 14.8 数据库部署

### 14.8.1 PostgreSQL 配置

**文件**：[infra/postgres/postgresql.conf](file:///f:/gexm/infra/postgres/postgresql.conf)

关键配置：
- `max_connections = 200`
- `shared_buffers = 512MB`
- `effective_cache_size = 2GB`
- `work_mem = 16MB`
- `maintenance_work_mem = 256MB`
- `log_min_duration_statement = 1000`（记录慢查询 > 1s）
- `log_lock_waits = on`

### 14.8.2 Redis 配置

**文件**：[infra/redis/redis.conf](file:///f:/gexm/infra/redis/redis.conf)

关键配置：
- `maxmemory 512mb`
- `maxmemory-policy allkeys-lru`
- `appendonly yes`
- `appendfsync everysec`
- `requirepass ${REDIS_PASSWORD}`（生产强制）

### 14.8.3 MySQL 配置（WordPress 用）

**文件**：[infra/mysql/my.cnf](file:///f:/gexm/infra/mysql/my.cnf)

关键配置：
- `innodb_buffer_pool_size = 1G`
- `innodb_log_file_size = 256M`
- `innodb_flush_log_at_trx_commit = 2`
- `character-set-server = utf8mb4`
- `collation-server = utf8mb4_unicode_ci`

---

## 14.9 环境变量管理

### 14.9.1 全局 .env 文件

按 `project_memory.md` 约定，使用 `.env` 统一管理所有服务环境变量：

```
f:\gexm\
├── .env                    # 全局共享
├── .env.example            # 示例
├── .env.production         # 生产（gitignore）
├── .env.staging            # 预发（gitignore）
├── packages/server/.env    # 后端专用
└── packages/server/.env.example
```

### 14.9.2 关键变量清单

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 环境 |
| `SERVER_PORT` | `3000` | Express 端口 |
| `APP_PORT` | `80` | App H5 端口 |
| `PC_PORT` | `8080` | PC 端口 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `POSTGRES_PORT` | `5432` | PostgreSQL 端口 |
| `EXPOSE_DB_PORTS` | `true` | 是否暴露数据库端口（生产设 false） |
| `API_BASE_URL` | `http://server:3000` | 容器间调用地址 |

完整变量列表参见 [15-configuration.md](file:///f:/gexm/docs/wiki/15-configuration.md)。

### 14.9.3 .gitignore 敏感文件

按 `project_memory.md` 约定，以下文件必须加入 `.gitignore`：

- `.env.production`、`.env.staging`、`.env.local`
- `certs/`、`PEM_Privatekey/`
- `*.pfx`、`*.jks`
- `.env.*.local`
- `*.sql`、`*.dump`、`*.bak`
- `*.log`、`*.ps1`、`*.sh`、`*.bat`

---

## 14.10 WordPress 部署

### 14.10.1 独立 Compose

**文件**：[docker-compose.wp.yml](file:///f:/gexm/docker-compose.wp.yml)

```yaml
services:
  wordpress:
    image: wordpress:6.4-php8.2-apache
    container_name: gexm-wp
    ports:
      - "${WP_PORT:-8081}:80"
    environment:
      - WORDPRESS_DB_HOST=mysql:3306
      - WORDPRESS_DB_NAME=${WP_DB_NAME:-wordpress}
      - WORDPRESS_DB_USER=${WP_DB_USER:-wordpress}
      - WORDPRESS_DB_PASSWORD=${WP_DB_PASSWORD}
    volumes:
      - ./wp-content:/var/www/html/wp-content
      - ./wp-config.php:/var/www/html/wp-config.php:ro
    depends_on:
      - mysql
    networks:
      - gexm-frontend
      - gexm-backend

  mysql:
    image: mysql:8.0
    container_name: gexm-mysql
    environment:
      - MYSQL_DATABASE=${WP_DB_NAME:-wordpress}
      - MYSQL_USER=${WP_DB_USER:-wordpress}
      - MYSQL_PASSWORD=${WP_DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - gexm-db
```

### 14.10.2 主题挂载

**关键约束**：WordPress 容器**仅挂载 `wp-content` 目录**，避免暴露 monorepo 敏感文件：

```yaml
volumes:
  - ./wp-content:/var/www/html/wp-content
```

---

## 14.11 部署检查清单

### 14.11.1 生产部署前检查

- [ ] `.env.production` 已配置所有必需变量（`JWT_SECRET`、`JWT_REFRESH_SECRET`、`CSRF_SECRET`、`PII_ENCRYPTION_KEY`、`PAYMENT_SECRET`）
- [ ] 密钥强度校验通过（长度 ≥ 32，含大小写字母 + 数字 + 特殊字符）
- [ ] `EXPOSE_DB_PORTS=false`（隐藏数据库端口）
- [ ] `FORCE_HTTPS=true`（强制 HTTPS）
- [ ] `LOG_MASK_SENSITIVE_DATA=true`（日志脱敏）
- [ ] SSL 证书已申请并配置
- [ ] Nginx 配置已测试（`nginx -t`）
- [ ] 防火墙规则已配置（仅开放 80/443）
- [ ] 数据库备份脚本已配置
- [ ] 监控告警已配置
- [ ] 日志轮转已配置

### 14.11.2 部署后验证

```bash
# 1. 健康检查
curl https://laal.top/api/health
# 期望返回 {"status":"ok","traceId":"xxx"}

# 2. 检查服务状态
sudo systemctl status gexm

# 3. 检查日志
sudo journalctl -u gexm -n 100

# 4. 测试支付回调（沙箱）
curl -X POST https://laal.top/api/payment/notify/alipay -d '...'

# 5. 测试 OAuth 登录
# 浏览器访问 https://laal.top/login，点击第三方登录

# 6. 检查监控
# 访问 Grafana，确认指标采集正常
```

---

## 14.12 参考文档

- [docker-compose.yml](file:///f:/gexm/docker-compose.yml) — 主 Compose
- [docker-compose.prod.yml](file:///f:/gexm/docker-compose.prod.yml) — 生产覆写
- [docker-compose.wp.yml](file:///f:/gexm/docker-compose.wp.yml) — WordPress 独立栈
- [infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf) — Nginx 配置
- [deploy/scripts/gexm.service](file:///f:/gexm/deploy/scripts/gexm.service) — systemd 单元
- [deploy/scripts/deploy.sh](file:///f:/gexm/deploy/scripts/deploy.sh) — 部署脚本
- [deploy/scripts/ssl-setup.sh](file:///f:/gexm/deploy/scripts/ssl-setup.sh) — SSL 配置
- [packages/server/ecosystem.config.js](file:///f:/gexm/packages/server/ecosystem.config.js) — PM2 配置
- [infra/monitoring/](file:///f:/gexm/infra/monitoring/) — 监控栈
- [docs/deployment-guide.md](file:///f:/gexm/docs/deployment-guide.md) — 部署指南
