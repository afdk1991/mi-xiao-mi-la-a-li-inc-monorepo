# Gexm Infrastructure

独立部署架构，采用"独立 Compose + 共享网络 + .env 统一管理"的设计模式。

## 目录结构

```
infra/
├── .env                    # 全局环境变量配置
├── network.yml             # Docker 网络配置
├── start-all.ps1           # 一键启动所有服务
├── stop-all.ps1            # 一键停止所有服务
├── mysql/
│   ├── docker-compose.yml
│   └── my.cnf              # MySQL 配置
├── redis/
│   ├── docker-compose.yml
│   └── redis.conf          # Redis 配置
├── wordpress/
│   └── docker-compose.yml
├── express-api/
│   └── docker-compose.yml
└── nginx/
    ├── docker-compose.yml
    ├── conf.d/
    │   └── gexm.conf       # Nginx 统一网关配置
    └── ssl/                # SSL 证书目录
```

## 启动方式

### 一键启动（推荐）

```powershell
cd infra
.\start-all.ps1
```

### 按需启动单个服务

```powershell
# 启动 MySQL
cd infra/mysql
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**

# 启动 Redis
cd infra/redis

# 启动 WordPress
cd infra/wordpress

# 启动 Express API
cd infra/express-api

# 启动 Nginx 网关
cd infra/nginx
```

### 停止服务

```powershell
cd infra
.\stop-all.ps1
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 主网站 | http://localhost |
| WordPress 后台 | http://localhost/wp-admin |
| Express API | http://localhost/api/app/ |
| WordPress REST API | http://localhost/api/wp/wp-json/ |
| 健康检查 | http://localhost/api/health |

## API 路由分发

Nginx 网关按路径自动分发请求：

```
/api/wp/        → WordPress 容器 (wordpress:80)
/api/app/       → Express API 容器 (express-api:3000)
/wp-admin/      → WordPress 后台
/wp-content/    → WordPress 静态资源
/uploads/       → 上传文件目录
/               → WordPress 主站点
```

## 环境变量配置

全局配置文件：`infra/.env`（**禁止入库**，已加入 `.gitignore`）

> **安全规范**：所有密码、密钥必须通过 `infra/.env` 注入，禁止硬编码到任何仓库文件。
> 首次部署请复制 `infra/.env.example` 为 `infra/.env` 并填入强随机值（建议使用 `openssl rand -base64 32` 生成）。

```env
# 网络配置
COMPOSE_PROJECT_NAME=gexm
GLOBAL_NETWORK=gexm-network

# MySQL 配置（密码请使用强随机值，禁止使用示例值）
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_ROOT_PASSWORD=<请替换为强随机密码>
MYSQL_DATABASE=laal_top
MYSQL_USER=laal_top
MYSQL_PASSWORD=<请替换为强随机密码>

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<生产环境必须设置强密码>

# WordPress 配置
WORDPRESS_HOST=wordpress
WORDPRESS_PORT=8081
WORDPRESS_DB_NAME=laal_top
WORDPRESS_DB_USER=laal_top
WORDPRESS_DB_PASSWORD=<与 MYSQL_PASSWORD 一致>

# Express API 配置
EXPRESS_HOST=express-api
EXPRESS_PORT=3000

# Nginx 配置
NGINX_HOST=nginx
NGINX_PORT=80
NGINX_SSL_PORT=443

# 域名配置
DOMAIN_NAME=laal.top
DOMAIN_NAME_WWW=www.laal.top

# WordPress 环境标识（production 时启用安全加固）
WP_ENV=production
```

> **历史泄露处理**：如发现 git 历史中包含明文密码，请使用 `git filter-repo` 清理，并立即轮换所有相关凭据。

## 服务依赖关系

```
Nginx (网关)
  ├── WordPress (内容管理)
  │   └── MySQL (数据库)
  └── Express API (业务逻辑)
      └── Redis (缓存)
```

## 注意事项

1. 首次启动前需确保 Docker Desktop 已启动
2. 服务间通过 `gexm-network` 网络互相访问，使用容器名作为主机名
3. 数据卷自动创建，重启容器数据不会丢失
4. Nginx SSL 证书需放置在 `infra/nginx/ssl/` 目录