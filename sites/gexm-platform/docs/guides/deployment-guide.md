# 部署指南

**文档版本**：v2.0.0
**最后更新**：2026-07-12
**适用项目**：gexm 电商商城系统
**Node.js 版本**：>= 18.0.0（推荐 20.x LTS）

---

## 目录

1. [环境要求](#1-环境要求)
2. [部署架构](#2-部署架构)
3. [源码部署](#3-源码部署)
4. [Docker 部署](#4-docker-部署)
5. [数据库部署](#5-数据库部署)
6. [前端部署](#6-前端部署)
7. [Nginx 配置](#7-nginx-配置)
8. [PM2 进程管理](#8-pm2-进程管理)
9. [环境变量配置](#9-环境变量配置)
10. [SSL 证书配置](#10-ssl-证书配置)
11. [监控与运维](#11-监控与运维)
12. [备份与恢复](#12-备份与恢复)
13. [安全加固](#13-安全加固)
14. [故障排查](#14-故障排查)
15. [部署脚本](#15-部署脚本)

---

## 1. 环境要求

### 1.1 软件要求

| 软件 | 版本要求 | 说明 | 是否必需 |
|------|----------|------|----------|
| Node.js | >= 18.0.0（推荐 20.x LTS） | JavaScript 运行时 | 必需 |
| npm | >= 9.0.0 | 包管理器（随 Node.js 安装） | 必需 |
| Git | >= 2.30 | 版本控制 | 必需 |
| Nginx | >= 1.18 | 反向代理 & 静态资源服务 | 生产环境必需 |
| PM2 | >= 5.0 | Node.js 进程管理 | 生产环境推荐 |
| SQLite | 随 better-sqlite3 自动安装 | 默认数据库 | 默认必需 |
| PostgreSQL | >= 12.0（推荐 16.x） | 可选数据库（支持双写） | 可选 |
| Redis | >= 6.0（推荐 7.x） | 缓存服务 | 可选 |
| Docker | >= 20.0 | 容器化部署 | Docker 部署必需 |
| Docker Compose | >= 2.0 | 多容器编排 | Docker 部署必需 |
| Certbot | 最新版 | SSL 证书自动续期 | HTTPS 必需 |

### 1.2 服务器硬件要求

| 配置级别 | CPU | 内存 | 硬盘 | 支持并发 | 适用场景 |
|----------|-----|------|------|----------|----------|
| 最低配置 | 2 核 | 2 GB | 20 GB SSD | ~200 QPS | 开发/测试环境 |
| 推荐配置 | 4 核 | 4 GB | 50 GB SSD | ~1000 QPS | 小型生产环境 |
| 高性能 | 8 核 | 8 GB | 100 GB SSD | ~3000 QPS | 中大型生产环境 |
| 企业级 | 16 核 | 16 GB | 200 GB SSD | ~5000 QPS | 大型生产环境 |

### 1.3 操作系统要求

| 操作系统 | 版本 | 支持状态 | 说明 |
|----------|------|----------|------|
| Ubuntu | 20.04 LTS / 22.04 LTS | 生产推荐 | 长期支持版，社区活跃 |
| CentOS | 7 / 8 / 9 Stream | 支持 | 企业级稳定版 |
| Debian | 11 / 12 | 支持 | 轻量稳定 |
| Windows Server | 2019+ | 支持（测试） | 开发/测试环境 |
| macOS | 11.0+ | 支持（开发） | 开发环境 |
| 国产系统 | 统信UOS / 麒麟 / 欧拉 | 支持 | 信创环境适配 |

### 1.4 网络要求

| 端口 | 用途 | 是否对外开放 |
|------|------|--------------|
| 80 | HTTP（Nginx） | 是（重定向到 443） |
| 443 | HTTPS（Nginx） | 是 |
| 3000 | Express 后端 | 否（仅内网访问） |
| 6379 | Redis | 否（仅本机访问） |
| 5432 | PostgreSQL | 否（仅内网访问） |
| 8080 | PC 端 | 否（Nginx 代理） |

### 1.5 浏览器兼容性

前端应用兼容以下浏览器最新 2 个版本：
- Chrome、Firefox、Safari、Edge
- 移动端：iOS Safari 12+、Android Chrome 8+
- 不支持 IE11

---

## 2. 部署架构

### 2.1 单机部署架构（适用于中小型项目）

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
    +---------------------+       |   - SQLite/PG 数据库 |
                                  |   - WebSocket 服务   |
                                  |   - 文件上传处理     |
                                  +---------------------+
```

### 2.2 Docker 部署架构（推荐）

```
                    +-------------------+
                    |     用户流量       |
                    +---------+---------+
                              |
                              v
                    +---------+---------+
                    |       Nginx       |
                    |  (反向代理/HTTPS)  |
                    +---------+---------+
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
  +-------+-------+   +-------+-------+   +-------+-------+
  | gexm-server   |   | gexm-app     |   | gexm-pc      |
  | (Express API) |   | (H5 静态)     |   | (PC 静态)     |
  | Port: 3000    |   | Port: 80     |   | Port: 8080   |
  +-------+-------+   +---------------+   +---------------+
          |
          v
  +-------+-------+   +---------------+
  | Redis         |   | PostgreSQL    |
  | (缓存)         |   | (数据库)       |
  | Port: 6379    |   | Port: 5432    |
  +---------------+   +---------------+
```

### 2.3 集群部署架构（适用于大型项目）

```
                        +-------------------+
                        |    负载均衡器      |
                        |  (SLB/HAProxy)   |
                        +---------+---------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
          +--------+--------+          +--------+--------+
          |    Nginx 节点 1  |          |    Nginx 节点 2  |
          +--------+--------+          +--------+--------+
                   |                             |
                   +--------------+--------------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
          +--------+--------+          +--------+--------+
          |  API 节点 1     |          |  API 节点 2     |
          | (PM2 Cluster)  |          | (PM2 Cluster)  |
          +--------+--------+          +--------+--------+
                   |                             |
                   +--------------+--------------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
          +--------+--------+          +--------+--------+
          | PostgreSQL 主  | <------> | PostgreSQL 从  |
          +-----------------+          +-----------------+
                                  |
                          +-------+-------+
                          | Redis 集群    |
                          +---------------+
```

### 2.4 架构选型建议

| 部署方式 | 适用规模 | 优点 | 缺点 |
|----------|----------|------|------|
| 单机部署 | < 1000 QPS | 成本低、部署简单 | 单点故障风险 |
| Docker 部署 | < 3000 QPS | 环境隔离、易于扩展 | 需要容器化经验 |
| 集群部署 | > 3000 QPS | 高可用、可扩展 | 成本高、运维复杂 |

---

## 3. 源码部署

### 3.1 服务器环境准备

#### 3.1.1 Ubuntu/Debian

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y git curl wget build-essential

# 安装 Node.js 20.x (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应输出 v20.x.x
npm --version   # 应输出 10.x.x

# 安装 PM2 (进程管理)
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
```

#### 3.1.2 CentOS/RHEL

```bash
# 更新系统
sudo yum update -y

# 安装基础工具
sudo yum install -y git curl wget gcc-c++ make

# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
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

#### 3.1.3 国产操作系统（统信UOS/麒麟）

```bash
# 统信UOS/麒麟基于 Debian/Ubuntu
sudo apt update && sudo apt install -y git curl wget build-essential

# 安装 Node.js（使用 nvm 管理版本）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证安装
node --version
npm --version

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 3.2 代码拉取与依赖安装

```bash
# 克隆项目
git clone <your-repository-url> gexm
cd gexm

# 切换到生产分支
git checkout main

# 安装依赖 (monorepo 根目录执行，自动安装所有子包)
npm install

# 验证依赖安装
npm ls --depth=0
```

> **国内服务器加速**：如遇 npm 安装缓慢，建议配置镜像源：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

### 3.3 构建项目

```bash
# 构建共享包
npm run build --workspace=@gexm/shared

# 构建后端
npm run build --workspace=@gexm/server

# 构建前端 H5
npm run build:app-h5

# 构建前端 PC（可选）
npm run build:pc
```

### 3.4 启动服务

#### 开发环境

```bash
# 启动后端开发服务（热重载）
npm run dev:server

# 启动前端 H5 开发服务
npm run dev:app-h5

# 启动所有服务（后端 + 前端）
npm run dev
```

#### 生产环境

```bash
# 创建必要的目录
mkdir -p /opt/gexm/data
mkdir -p /opt/gexm/uploads
mkdir -p /opt/gexm/logs

# 设置目录权限
chmod 755 /opt/gexm/data
chmod 755 /opt/gexm/uploads
chmod 755 /opt/gexm/logs

# 使用 PM2 启动服务
pm2 start ecosystem.config.js --env production

# 保存进程列表，开机自启
pm2 save
pm2 startup systemd
```

---

## 4. Docker 部署

### 4.1 Docker 环境安装

#### 4.1.1 Ubuntu/Debian

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sudo bash

# 安装 Docker Compose
sudo apt install -y docker-compose-plugin

# 启动 Docker 服务
sudo systemctl enable docker
sudo systemctl start docker

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**
```

#### 4.1.2 CentOS/RHEL

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker

# 验证安装
docker --version
```

### 4.2 使用 Docker Compose 部署

项目根目录已提供 [docker-compose.yml](file:///f:/gexm/docker-compose.yml)，包含以下服务：

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| server | gexm-server | 3000 | Express 后端 API |
| app | gexm-app | 80 | H5 前端静态资源 |
| pc | gexm-pc | 8080 | PC 端前端静态资源 |
| redis | gexm-redis | 6379 | Redis 缓存服务 |
| postgres | gexm-postgres | 5432 | PostgreSQL 数据库 |

#### 4.2.1 快速启动

```bash
# 进入项目根目录
cd /opt/gexm

# 构建并启动所有服务（后台运行）

# 查看服务状态

# 查看日志
```

#### 4.2.2 服务管理

```bash
# 启动所有服务

# 停止所有服务

# 重启特定服务

# 查看服务日志

# 进入容器

# 重新构建并启动
```

### 4.3 数据卷管理

Docker 部署使用以下数据卷持久化数据：

| 数据卷 | 挂载点 | 说明 |
|--------|--------|------|
| server-data | /app/packages/server/data | SQLite 数据库文件 |
| server-uploads | /app/packages/server/uploads | 用户上传文件 |
| server-logs | /app/packages/server/logs | 应用日志 |
| redis-data | /data | Redis 持久化数据 |
| postgres-data | /var/lib/postgresql/data | PostgreSQL 数据文件 |

**备份数据卷**：

```bash
# 备份 server-data

# 恢复 server-data
```

### 4.4 Dockerfile 说明

后端服务使用多阶段构建，位于 [packages/server/Dockerfile](file:///f:/gexm/packages/server/Dockerfile)：

```dockerfile
# 阶段 1：构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY packages/server/package*.json packages/server/
RUN npm ci --workspace=@gexm/shared
RUN npm ci --workspace=@gexm/server
COPY packages/shared/src packages/shared/src
COPY packages/server/src packages/server/src
COPY packages/server/tsconfig.json packages/server/
RUN npm run build --workspace=@gexm/shared
RUN npm run build --workspace=@gexm/server

# 阶段 2：生产
FROM node:20-alpine AS production
WORKDIR /app/packages/server
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist .
COPY --from=builder /app/packages/server/package*.json ./
RUN npm ci --only=production --workspace=@gexm/server
RUN mkdir -p data uploads logs
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**构建优化**：
- 多阶段构建减小镜像体积
- 仅安装生产依赖
- 使用 Alpine Linux 基础镜像
- 利用 Docker 缓存层优化构建速度

### 4.5 自定义 Docker Compose 配置

如需自定义配置，可创建 `docker-compose.override.yml`：

```yaml
version: '3.8'

services:
  server:
    environment:
      - NODE_ENV=production
      - DB_TYPE=postgres
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=gexm
      - DB_USER=gexm
      - DB_PASSWORD=your_secure_password
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your_32bit_strong_secret_key_here
      - CRYPTO_KEY=your_32char_encryption_key_here
    volumes:
      - ./packages/server/.env.production:/app/packages/server/.env.production:ro
```

---

## 5. 数据库部署

### 5.1 SQLite 部署（默认）

SQLite 为默认数据库，无需额外安装，首次启动服务时自动创建。

**配置**：

```env
DB_TYPE=sqlite
DB_PATH=/opt/gexm/data/gexm.db
```

**性能优化**：

```sql
-- 已在代码中自动配置
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;
```

**备份**：

```bash
# 在线备份（使用 .backup 命令）
sqlite3 /opt/gexm/data/gexm.db ".backup '/opt/gexm/backup/gexm-$(date +%Y%m%d).db'"

# 文件复制（需停机）
cp /opt/gexm/data/gexm.db /opt/gexm/backup/gexm-$(date +%Y%m%d).db
```

### 5.2 PostgreSQL 部署

#### 5.2.1 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install -y postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install -y postgresql-server postgresql-contrib

# 初始化数据库
sudo postgresql-setup initdb

# 启动服务
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### 5.2.2 创建数据库和用户

```bash
# 切换到 postgres 用户
sudo -i -u postgres

# 创建数据库用户
psql -c "CREATE USER gexm WITH PASSWORD 'your_secure_password';"

# 创建数据库
psql -c "CREATE DATABASE gexm OWNER gexm;"

# 授予权限
psql -c "GRANT ALL PRIVILEGES ON DATABASE gexm TO gexm;"

# 退出
exit
```

#### 5.2.3 配置 PostgreSQL

编辑 `/etc/postgresql/16/main/postgresql.conf`：

```conf
# 连接配置
listen_addresses = 'localhost'
max_connections = 100

# 内存配置
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL 配置
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB
checkpoint_completion_target = 0.9

# 日志配置
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
```

编辑 `/etc/postgresql/16/main/pg_hba.conf`：

```conf
# TYPE  DATABASE  USER  ADDRESS        METHOD
local   all       all                  trust
host    all       all   127.0.0.1/32   md5
host    all       all   ::1/128        md5
```

重启 PostgreSQL：

```bash
sudo systemctl restart postgresql
```

#### 5.2.4 应用配置

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gexm
DB_USER=gexm
DB_PASSWORD=your_secure_password
```

### 5.3 双写一致性配置

启用 SQLite 与 PostgreSQL 双写模式，实现数据冗余和故障切换。

**配置**：

```env
# 主数据库（SQLite）
DB_TYPE=sqlite
DB_PATH=/opt/gexm/data/gexm.db

# 双写配置
DUAL_WRITE_ENABLED=true
DUAL_WRITE_TARGET=postgres
PG_HOST=localhost
PG_PORT=5432
PG_NAME=gexm
PG_USER=gexm
PG_PASSWORD=your_secure_password

# 一致性检查间隔（毫秒，默认 5 分钟）
CONSISTENCY_CHECK_INTERVAL=300000
```

**管理命令**：

```bash
# 查看双写状态
curl http://localhost:3000/api/admin/dual-write/status

# 手动触发一致性检查
curl -X POST http://localhost:3000/api/admin/dual-write/check

# 修复不一致数据
curl -X POST http://localhost:3000/api/admin/dual-write/repair
```

### 5.4 Redis 部署

Redis 为可选组件，未安装时系统自动降级为内存缓存模式。

#### 5.4.1 安装 Redis

```bash
# Ubuntu/Debian
sudo apt install -y redis-server

# CentOS/RHEL
sudo yum install -y redis

# 启动服务
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 验证安装
redis-cli ping  # 应输出 PONG
```

#### 5.4.2 安全配置

编辑 `/etc/redis/redis.conf`：

```conf
# 绑定本机地址
bind 127.0.0.1

# 设置密码
requirepass your_redis_password

# 禁用危险命令
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
```

重启 Redis：

```bash
sudo systemctl restart redis-server
```

#### 5.4.3 应用配置

```env
REDIS_URL=redis://:your_redis_password@127.0.0.1:6379
```

---

## 6. 前端部署

### 6.1 H5 端构建与部署

#### 6.1.1 构建命令

```bash
# 在项目根目录执行
npm run build:app-h5
```

构建产物位于：`packages/app/dist/build/h5/`

#### 6.1.2 部署方式

**方式一：Nginx 静态服务（推荐）**

```bash
# 复制构建产物到 Nginx 目录
sudo mkdir -p /var/www/gexm-h5
sudo cp -r packages/app/dist/build/h5/* /var/www/gexm-h5/

# 设置权限
sudo chown -R www-data:www-data /var/www/gexm-h5
sudo chmod -R 755 /var/www/gexm-h5
```

**方式二：Docker 部署**

```bash
# 构建前端镜像

# 运行容器
```

### 6.2 PC 端构建与部署

```bash
# 构建命令
npm run build:pc

# 构建产物位于：packages/pc/dist/
```

### 6.3 移动端 App 打包

移动端使用 uni-app 开发，支持多端打包：

```bash
# H5 打包
npm run build:app-h5

# 微信小程序打包
npm run build:app-mp-weixin

# App 打包（需 HBuilderX）
# 使用 HBuilderX 打开 packages/app，选择"发行" > "原生 App-云打包"
```

### 6.4 微信小程序部署

```bash
# 构建微信小程序
npm run build:app-mp-weixin

# 构建产物位于：packages/app/dist/build/mp-weixin/

# 使用微信开发者工具打开该目录
# 点击"上传"提交代码至微信平台
```

**小程序配置要点**：
- 主包大小必须 < 1.5 MB
- 使用 `wechatProjectConfigPatch` 插件配置 `packNpmManually: false`
- 在微信公众平台配置服务器域名（request/socket/uploadFile/downloadFile）

---

## 7. Nginx 配置

### 7.1 完整 Nginx 配置

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

    # SSL 证书路径
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
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
        root /var/www/gexm-h5;
        index index.html;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # HTML 不缓存
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
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;" always;

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

### 7.2 PC 端 Nginx 配置

如需单独部署 PC 端，添加以下配置：

```nginx
server {
    listen 443 ssl http2;
    server_name pc.yourdomain.com;

    # SSL 配置（同上）

    location / {
        root /var/www/gexm-pc;
        index index.html;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 配置验证与重载

```bash
# 验证配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
# 或者
sudo nginx -s reload
```

---

## 8. PM2 进程管理

### 8.1 完整 ecosystem.config.js

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'gexm-server',
      script: 'packages/server/dist/server.js',
      cwd: '/opt/gexm',

      // 实例配置
      instances: 1,
      exec_mode: 'fork',  // SQLite 兼容，必须使用 fork 模式

      // 重启策略
      autorestart: true,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,

      // 监听文件变化（生产环境禁用）
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
      'post-deploy': 'npm install && npm run build --workspace=@gexm/shared && npm run build --workspace=@gexm/server && npm run build:app-h5 && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

### 8.2 PM2 常用命令

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status
pm2 list

# 查看日志
pm2 logs gexm-server
pm2 logs gexm-server --lines 100

# 重启应用
pm2 restart gexm-server
pm2 reload gexm-server  # 零停机重启

# 停止应用
pm2 stop gexm-server

# 删除应用
pm2 delete gexm-server

# 监控
pm2 monit

# 保存进程列表（开机自启）
pm2 save
pm2 startup systemd
```

### 8.3 零停机部署

```bash
# 拉取最新代码
cd /opt/gexm
git pull origin main

# 安装依赖
npm install

# 构建项目
npm run build --workspace=@gexm/shared
npm run build --workspace=@gexm/server
npm run build:app-h5

# 零停机重启
pm2 reload ecosystem.config.js --env production

# 健康检查
curl http://localhost:3000/api/health
```

---

## 9. 环境变量配置

### 9.1 完整环境变量清单

创建 `packages/server/.env.production` 文件：

```env
# ==================== 基础配置 ====================
PORT=3000
NODE_ENV=production

# ==================== 密钥配置 ====================
# JWT 密钥（必须 >= 32 位强随机字符串）
# 生成命令：openssl rand -base64 32
JWT_SECRET=your_32bit_strong_jwt_secret_key_here
JWT_REFRESH_SECRET=your_another_32bit_strong_refresh_secret_key_here
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# 加密密钥（必须恰好 32 字符，用于 AES-256-GCM）
CRYPTO_KEY=your_32char_encryption_key_here!!
ENCRYPTION_KEY=your_32char_encryption_key_here!!

# CSRF 密钥
CSRF_SECRET=your_32bit_csrf_secret_key_here

# ==================== 数据库配置 ====================
# SQLite（默认）
DB_TYPE=sqlite
DB_PATH=/opt/gexm/data/gexm.db

# PostgreSQL（可选）
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=gexm
# DB_USER=gexm
# DB_PASSWORD=your_secure_password

# 双写配置（可选）
# DUAL_WRITE_ENABLED=true
# CONSISTENCY_CHECK_INTERVAL=300000

# ==================== Redis 配置 ====================
# 未配置时自动降级为内存缓存
REDIS_URL=redis://:your_redis_password@127.0.0.1:6379
REDIS_PASSWORD=your_redis_password

# ==================== OAuth 配置 ====================
# 微信开放平台（网站登录）
WECHAT_OPEN_APP_ID=
WECHAT_OPEN_APP_SECRET=
WECHAT_OPEN_REDIRECT_URI=https://yourdomain.com/api/oauth/wechat/callback

# 微信公众号
WECHAT_OA_APP_ID=
WECHAT_OA_APP_SECRET=
WECHAT_OA_REDIRECT_URI=https://yourdomain.com/api/oauth/wechat/official-account/callback

# 微信小程序
WECHAT_MP_APP_ID=
WECHAT_MP_APP_SECRET=

# QQ
QQ_APP_ID=
QQ_APP_SECRET=
QQ_REDIRECT_URI=https://yourdomain.com/api/oauth/qq/callback

# 微博
WEIBO_APP_ID=
WEIBO_APP_SECRET=
WEIBO_REDIRECT_URI=https://yourdomain.com/api/oauth/weibo/callback

# 支付宝
ALIPAY_APP_ID=
ALIPAY_APP_SECRET=
ALIPAY_REDIRECT_URI=https://yourdomain.com/api/oauth/alipay/callback
ALIPAY_PRIVATE_KEY=

# Google
GOOGLE_APP_ID=
GOOGLE_APP_SECRET=
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/oauth/google/callback

# Facebook
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/oauth/facebook/callback

# Twitter
TWITTER_APP_ID=
TWITTER_APP_SECRET=
TWITTER_REDIRECT_URI=https://yourdomain.com/api/oauth/twitter/callback

# ==================== 支付配置 ====================
PAYMENT_SECRET=your_32bit_payment_secret_key_here

# ==================== 管理员配置 ====================
ADMIN_DEFAULT_PASSWORD=admin123456

# ==================== 安全配置 ====================
# CORS 配置（逗号分隔多个域名）
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://m.yourdomain.com

# 强制 HTTPS
FORCE_HTTPS=true

# 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ==================== 文件上传配置 ====================
UPLOAD_PATH=/opt/gexm/uploads
UPLOAD_MAX_SIZE=10485760

# ==================== 日志配置 ====================
LOG_LEVEL=warn
LOG_FILE=/opt/gexm/logs/app.log
```

### 9.2 密钥生成

```bash
# 生成 JWT 密钥（Base64 编码，32 字节）
openssl rand -base64 32

# 生成加密密钥（32 字符，用于 AES-256-GCM）
openssl rand -hex 16

# 生成强随机密码（包含大小写字母、数字、特殊字符）
openssl rand -base64 24 | tr -d '/+=' | head -c 32
```

### 9.3 密钥安全要求

| 密钥类型 | 长度要求 | 格式要求 | 验证方式 |
|----------|----------|----------|----------|
| JWT_SECRET | >= 32 位 | 强随机字符串 | 长度 + 复杂度验证 |
| JWT_REFRESH_SECRET | >= 32 位 | 强随机字符串 | 长度 + 复杂度验证 |
| CRYPTO_KEY | 恰好 32 字符 | 任意字符 | 长度验证 |
| ENCRYPTION_KEY | >= 32 字符 | 任意字符 | 长度验证 |
| CSRF_SECRET | >= 32 位 | 强随机字符串 | 长度 + 复杂度验证 |
| PAYMENT_SECRET | >= 32 位 | 强随机字符串 | 长度 + 复杂度验证 |
| REDIS_PASSWORD | 非空 | 任意字符 | 非空验证 |

> **Hex 格式密钥**（64 字符）仅需长度验证；非 Hex 格式需包含大写+小写+数字+特殊字符。

---

## 10. SSL 证书配置

### 10.1 Let's Encrypt 免费证书

#### 10.1.1 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

#### 10.1.2 申请证书

```bash
# 确保域名已解析到服务器
# 确保 Nginx 已启动且 80 端口可访问

# 申请证书（自动修改 Nginx 配置）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d m.yourdomain.com

# 或仅申请证书（手动配置 Nginx）
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 10.1.3 自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# 添加定时任务（已自动添加）
sudo crontab -e
# 添加以下内容（每天凌晨 3 点检查续期）
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 10.2 商业 SSL 证书

如使用商业 SSL 证书，将证书文件放置到指定目录：

```bash
# 创建证书目录
sudo mkdir -p /etc/ssl/private/gexm

# 上传证书文件
sudo cp yourdomain.crt /etc/ssl/private/gexm/
sudo cp yourdomain.key /etc/ssl/private/gexm/
sudo cp intermediate.crt /etc/ssl/private/gexm/

# 设置权限
sudo chmod 644 /etc/ssl/private/gexm/*.crt
sudo chmod 600 /etc/ssl/private/gexm/*.key
```

Nginx 配置修改：

```nginx
ssl_certificate /etc/ssl/private/gexm/yourdomain.crt;
ssl_certificate_key /etc/ssl/private/gexm/yourdomain.key;
ssl_trusted_certificate /etc/ssl/private/gexm/intermediate.crt;
```

---

## 11. 监控与运维

### 11.1 健康检查

系统提供健康检查端点：`GET /api/health`

```bash
# 手动健康检查
curl http://localhost:3000/api/health

# 响应示例
{
  "status": "ok",
  "timestamp": "2026-07-12T10:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

**自动健康检查脚本**：

```bash
#!/bin/bash
# /opt/gexm/scripts/health-check.sh

HEALTH_URL="http://localhost:3000/api/health"
ALERT_EMAIL="admin@yourdomain.com"
MAX_RETRIES=3
RETRY_INTERVAL=30

check_health() {
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
        if [ "$response" = "200" ]; then
            echo "$(date): Health check passed"
            exit 0
        fi
        retries=$((retries + 1))
        sleep $RETRY_INTERVAL
    done

    echo "$(date): Health check failed after $MAX_RETRIES attempts"
    echo "Service may be down. HTTP Status: $response" | mail -s "GEXM Alert: Service Down" $ALERT_EMAIL
    exit 1
}

check_health
```

添加定时任务：

```bash
# 每 5 分钟检查一次
*/5 * * * * /opt/gexm/scripts/health-check.sh >> /opt/gexm/logs/health-check.log 2>&1
```

### 11.2 日志管理

#### 11.2.1 应用日志

日志位于 `/opt/gexm/logs/` 目录：

| 日志文件 | 说明 |
|----------|------|
| app.log | 应用主日志 |
| pm2-error.log | PM2 错误日志 |
| pm2-out.log | PM2 输出日志 |
| health-check.log | 健康检查日志 |

#### 11.2.2 日志轮转

```bash
# 安装 logrotate
sudo apt install -y logrotate

# 创建配置文件 /etc/logrotate.d/gexm
cat > /etc/logrotate.d/gexm << 'EOF'
/opt/gexm/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload gexm-server > /dev/null 2>&1 || true
    endscript
}
EOF

# 测试配置
sudo logrotate -d /etc/logrotate.d/gexm

# 手动执行
sudo logrotate -f /etc/logrotate.d/gexm
```

#### 11.2.3 Nginx 日志

```bash
# 访问日志
/var/log/nginx/gexm-access.log

# 错误日志
/var/log/nginx/gexm-error.log
```

Nginx 日志轮转（系统默认配置）：

```bash
# /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### 11.3 性能监控

#### 11.3.1 PM2 监控

```bash
# 实时监控
pm2 monit

# 查看进程信息
pm2 describe gexm-server

# 查看资源使用
pm2 info gexm-server
```

#### 11.3.2 系统监控

```bash
# CPU 和内存使用
top
htop

# 磁盘使用
df -h
du -sh /opt/gexm/*

# 网络连接
netstat -tulpn
ss -tulpn

# 进程监控
ps aux | grep node
```

#### 11.3.3 数据库监控

**SQLite**：

```bash
# 查看数据库大小
ls -lh /opt/gexm/data/gexm.db

# 查看数据库状态
sqlite3 /opt/gexm/data/gexm.db "PRAGMA integrity_check;"
sqlite3 /opt/gexm/data/gexm.db "PRAGMA journal_mode;"

# 查看表统计
sqlite3 /opt/gexm/data/gexm.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**PostgreSQL**：

```bash
# 连接数
psql -U gexm -c "SELECT count(*) FROM pg_stat_activity;"

# 数据库大小
psql -U gexm -c "SELECT pg_size_pretty(pg_database_size('gexm'));"

# 表大小
psql -U gexm -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"

# 慢查询
psql -U gexm -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### 11.4 应用性能监控（APM）

系统内置 APM 中间件，可集成 Prometheus + Grafana：

```bash
# 暴露指标端点
curl http://localhost:3000/api/metrics
```

**Prometheus 配置**：

```yaml
scrape_configs:
  - job_name: 'gexm'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

---

## 12. 备份与恢复

### 12.1 备份策略

遵循 3-2-1 原则：
- **3** 份备份
- **2** 种介质
- **1** 份异地

### 12.2 数据库备份

#### 12.2.1 SQLite 备份

```bash
#!/bin/bash
# /opt/gexm/scripts/backup-sqlite.sh

BACKUP_DIR="/opt/gexm/backup"
DB_PATH="/opt/gexm/data/gexm.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gexm_$DATE.db"

mkdir -p $BACKUP_DIR

# 在线备份（不停机）
sqlite3 $DB_PATH ".backup '$BACKUP_FILE'"

# 压缩备份
gzip $BACKUP_FILE

# 删除 7 天前的备份
find $BACKUP_DIR -name "gexm_*.db.gz" -mtime +7 -delete

echo "$(date): SQLite backup completed: $BACKUP_FILE.gz"
```

#### 12.2.2 PostgreSQL 备份

```bash
#!/bin/bash
# /opt/gexm/scripts/backup-postgres.sh

BACKUP_DIR="/opt/gexm/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gexm_$DATE.sql"

mkdir -p $BACKUP_DIR

# 导出数据库
pg_dump -U gexm -h localhost gexm > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除 30 天前的备份
find $BACKUP_DIR -name "gexm_*.sql.gz" -mtime +30 -delete

echo "$(date): PostgreSQL backup completed: $BACKUP_FILE.gz"
```

### 12.3 文件备份

```bash
#!/bin/bash
# /opt/gexm/scripts/backup-files.sh

BACKUP_DIR="/opt/gexm/backup"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOADS_DIR="/opt/gexm/uploads"
BACKUP_FILE="$BACKUP_DIR/uploads_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# 备份上传文件
tar -czf $BACKUP_FILE -C /opt/gexm uploads

# 删除 30 天前的备份
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete

echo "$(date): Files backup completed: $BACKUP_FILE"
```

### 12.4 自动备份

```bash
# 添加定时任务
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /opt/gexm/scripts/backup-sqlite.sh >> /opt/gexm/logs/backup.log 2>&1
0 3 * * * /opt/gexm/scripts/backup-files.sh >> /opt/gexm/logs/backup.log 2>&1
```

### 12.5 异地备份

```bash
#!/bin/bash
# /opt/gexm/scripts/backup-remote.sh

BACKUP_DIR="/opt/gexm/backup"
REMOTE_HOST="backup@remote-server"
REMOTE_DIR="/backup/gexm"

# 同步备份到远程服务器
rsync -avz --delete $BACKUP_DIR/ $REMOTE_HOST:$REMOTE_DIR/

echo "$(date): Remote backup completed"
```

### 12.6 数据恢复

#### 12.6.1 SQLite 恢复

```bash
# 停止服务
pm2 stop gexm-server

# 恢复数据库
gunzip -c /opt/gexm/backup/gexm_20260712_020000.db.gz > /opt/gexm/data/gexm.db

# 启动服务
pm2 start gexm-server
```

#### 12.6.2 PostgreSQL 恢复

```bash
# 停止服务
pm2 stop gexm-server

# 恢复数据库
gunzip -c /opt/gexm/backup/gexm_20260712_020000.sql.gz | psql -U gexm -h localhost gexm

# 启动服务
pm2 start gexm-server
```

---

## 13. 安全加固

### 13.1 服务器安全

#### 13.1.1 SSH 加固

```bash
# 编辑 SSH 配置
sudo vi /etc/ssh/sshd_config

# 禁用 root 登录
PermitRootLogin no

# 禁用密码登录（仅密钥登录）
PasswordAuthentication no

# 修改默认端口（可选）
Port 2222

# 限制登录用户
AllowUsers deploy

# 重启 SSH
sudo systemctl restart sshd
```

#### 13.1.2 防火墙配置

```bash
# UFW 防火墙（Ubuntu）
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS
sudo ufw enable

# firewalld 防火墙（CentOS）
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 13.1.3 Fail2ban 防暴力破解

```bash
# 安装 Fail2ban
sudo apt install -y fail2ban

# 配置
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[ssh]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF

# 启动
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 13.2 应用安全

#### 13.2.1 必须配置的安全项

| 配置项 | 说明 | 验证方式 |
|--------|------|----------|
| NODE_ENV=production | 生产环境标识 | 启动日志检查 |
| FORCE_HTTPS=true | 强制 HTTPS | HTTP 请求应重定向 |
| JWT_SECRET >= 32位 | JWT 签名密钥 | `getKeyHealthStatus()` |
| CRYPTO_KEY = 32字符 | AES-256-GCM 加密 | 长度验证 |
| REDIS_PASSWORD 非空 | Redis 密码 | 连接验证 |
| CORS_ORIGINS 配置 | 跨域白名单 | 非允许域请求被拒 |

#### 13.2.2 安全中间件

系统已内置以下安全中间件：

- **Helmet**：设置安全 HTTP 头（CSP、HSTS、X-Frame-Options 等）
- **CORS**：跨域资源共享控制
- **CSRF**：跨站请求伪造防护
- **XSS Filter**：跨站脚本攻击过滤
- **Input Sanitization**：输入数据消毒
- **Rate Limiting**：请求限流
- **Force HTTPS**：生产环境强制 HTTPS

#### 13.2.3 Docker 容器安全

```yaml
# docker-compose.yml 安全配置
services:
  server:
    security_opt:
      - no-new-privileges:true  # 禁止提权
    read_only: false
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    user: "1000:1000"  # 非 root 用户运行
```

### 13.3 数据安全

#### 13.3.1 敏感数据加密

- **OAuth Token**：使用 AES-256-GCM 加密存储
- **用户密码**：使用 bcrypt 加密（salt rounds: 10）
- **敏感信息**：身份证号、银行卡号等加密存储
- **传输加密**：强制 HTTPS/TLS 1.2+

#### 13.3.2 数据脱敏

日志中自动脱敏的字段：
- 密码、密钥、Token
- 手机号（中间 4 位掩码）
- 身份证号（中间 8 位掩码）
- 银行卡号（仅显示后 4 位）

---

## 14. 故障排查

### 14.1 常见问题

#### 14.1.1 服务无法启动

```bash
# 查看错误日志
pm2 logs gexm-server --err --lines 50

# 常见原因
# 1. 端口被占用
lsof -i :3000
# 解决：修改 PORT 环境变量或停止占用进程

# 2. 数据库文件权限
ls -la /opt/gexm/data/
# 解决：chown -R www-data:www-data /opt/gexm/data

# 3. 环境变量缺失
cat /opt/gexm/packages/server/.env.production
# 解决：补全必需的环境变量
```

#### 14.1.2 数据库连接失败

**SQLite**：

```bash
# 检查文件是否存在
ls -la /opt/gexm/data/gexm.db

# 检查文件权限
stat /opt/gexm/data/gexm.db

# 检查磁盘空间
df -h

# 修复数据库
sqlite3 /opt/gexm/data/gexm.db "PRAGMA integrity_check;"
```

**PostgreSQL**：

```bash
# 检查服务状态
sudo systemctl status postgresql

# 检查连接
psql -U gexm -h localhost -c "SELECT 1;"

# 查看日志
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

#### 14.1.3 Redis 连接失败

```bash
# 检查 Redis 服务
redis-cli ping

# 检查密码
redis-cli -a your_redis_password ping

# 查看日志
sudo tail -f /var/log/redis/redis-server.log
```

> **注意**：Redis 连接失败时系统会自动降级为内存缓存模式，不影响核心功能。

#### 14.1.4 Nginx 502 Bad Gateway

```bash
# 检查后端服务是否运行
pm2 status
curl http://localhost:3000/api/health

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/gexm-error.log

# 检查 Nginx 配置
sudo nginx -t

# 常见原因
# 1. 后端服务未启动
# 2. 端口配置不匹配
# 3. 防火墙阻止
```

#### 14.1.5 SSL 证书问题

```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期
sudo certbot renew

# 检查证书文件
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout
```

### 14.2 性能问题排查

#### 14.2.1 响应慢

```bash
# 检查系统负载
uptime
top

# 检查 Node.js 进程
pm2 monit

# 检查数据库查询
# SQLite
sqlite3 /opt/gexm/data/gexm.db ".timer on" "SELECT * FROM orders LIMIT 10;"

# PostgreSQL
psql -U gexm -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### 14.2.2 内存占用高

```bash
# 查看内存使用
free -h
pm2 info gexm-server

# 设置内存限制重启
pm2 restart gexm-server --max-memory-restart 512M

# 内存泄漏排查
node --inspect packages/server/dist/server.js
# 使用 Chrome DevTools 连接排查
```

#### 14.2.3 磁盘空间不足

```bash
# 查看磁盘使用
df -h
du -sh /opt/gexm/*

# 清理日志
find /opt/gexm/logs -name "*.log" -mtime +30 -delete

# 清理备份
find /opt/gexm/backup -mtime +30 -delete

# 清理上传文件（谨慎操作）
find /opt/gexm/uploads -mtime +90 -delete

# 清理 npm 缓存
npm cache clean --force
```

### 14.3 日志分析

```bash
# 查看应用错误
grep "ERROR" /opt/gexm/logs/app.log | tail -50

# 查看 Nginx 访问统计
awk '{print $1}' /var/log/nginx/gexm-access.log | sort | uniq -c | sort -rn | head 10

# 查看 404 错误
grep " 404 " /var/log/nginx/gexm-access.log | awk '{print $7}' | sort | uniq -c | sort -rn

# 查看 500 错误
grep " 500 " /var/log/nginx/gexm-access.log | tail -20

# 查看慢请求（> 1 秒）
awk '($NF > 1){print $7, $NF}' /var/log/nginx/gexm-access.log | sort -k2 -rn | head 20
```

---

## 15. 部署脚本

### 15.1 自动化部署脚本

项目提供部署脚本位于 [deploy/scripts/deploy.sh](file:///f:/gexm/deploy/scripts/deploy.sh)：

```bash
#!/bin/bash
# 使用方法
./deploy/scripts/deploy.sh deploy    # 部署
./deploy/scripts/deploy.sh rollback  # 回滚
./deploy/scripts/deploy.sh migrate   # 数据库迁移
./deploy/scripts/deploy.sh db-backup # 数据库备份
```

### 15.2 部署流程

```bash
# 1. 克隆/拉取最新代码
cd /opt/gexm
git pull origin main

# 2. 创建环境文件（首次）
cp packages/server/.env.example packages/server/.env.production
vi packages/server/.env.production  # 修改配置

# 3. 安装依赖
npm ci --production

# 4. 构建项目
npm run build --workspace=@gexm/shared
npm run build --workspace=@gexm/server
npm run build:app-h5

# 5. 停止旧服务
pm2 stop gexm-server

# 6. 配置 Nginx
sudo cp deploy/nginx/gexm.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx

# 7. 启动新服务
pm2 start ecosystem.config.js --env production

# 8. 健康检查
sleep 5
curl http://localhost:3000/api/health
```

### 15.3 回滚流程

```bash
# 1. 停止服务
pm2 stop gexm-server

# 2. 回滚代码
git log --oneline -5           # 查看历史版本
git checkout <previous-commit>

# 3. 恢复数据库（如需要）
./deploy/scripts/deploy.sh db-backup restore <backup-file>

# 4. 重新构建
npm run build --workspace=@gexm/shared
npm run build --workspace=@gexm/server

# 5. 启动服务
pm2 start ecosystem.config.js --env production

# 6. 健康检查
curl http://localhost:3000/api/health
```

### 15.4 CI/CD 集成

**GitHub Actions 示例** (`.github/workflows/deploy.yml`)：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: |
          npm run build --workspace=@gexm/shared
          npm run build --workspace=@gexm/server
          npm run build:app-h5

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/gexm
            git pull origin main
            npm ci --production
            npm run build --workspace=@gexm/shared
            npm run build --workspace=@gexm/server
            npm run build:app-h5
            pm2 reload ecosystem.config.js --env production
            sleep 5
            curl -f http://localhost:3000/api/health || pm2 rollback gexm-server
```

---

## 附录

### A. 部署检查清单

部署前请逐项确认：

- [ ] Node.js 版本 >= 18.0.0（推荐 20.x LTS）
- [ ] 所有环境变量已正确配置
- [ ] JWT_SECRET、CRYPTO_KEY 等密钥已生成且符合要求
- [ ] 数据库路径已创建且权限正确
- [ ] 上传目录已创建且权限正确
- [ ] 日志目录已创建且权限正确
- [ ] SSL 证书已配置且未过期
- [ ] Nginx 配置已验证且重载
- [ ] 防火墙已配置（仅开放 80/443 端口）
- [ ] PM2 已配置开机自启
- [ ] 健康检查脚本已配置
- [ ] 备份脚本已配置
- [ ] 日志轮转已配置
- [ ] 默认管理员密码已修改

### B. 相关文件

| 文件路径 | 说明 |
|----------|------|
| [docker-compose.yml](file:///f:/gexm/docker-compose.yml) | Docker Compose 编排配置 |
| [packages/server/Dockerfile](file:///f:/gexm/packages/server/Dockerfile) | 后端 Docker 镜像构建 |
| [packages/server/.env.example](file:///f:/gexm/packages/server/.env.example) | 环境变量模板 |
| [deploy/scripts/deploy.sh](file:///f:/gexm/deploy/scripts/deploy.sh) | 部署脚本 |
| [packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts) | Express 应用入口 |
| [packages/server/src/server.js](file:///f:/gexm/packages/server/src/server.js) | 服务启动文件 |

### C. 性能基准

| 指标 | 目标值 | 测试方法 |
|------|--------|----------|
| API 响应时间 | < 300ms | `ab -n 1000 -c 100 http://localhost:3000/api/health` |
| 应用启动时间 | < 3 秒 | PM2 启动日志 |
| 页面切换时间 | < 0.5 秒 | 前端性能监控 |
| H5 首屏加载 | < 2 秒 | Lighthouse |
| 数据库查询 | < 100ms | 慢查询日志 |
| 并发支持 | >= 1000 QPS | 压力测试 |

### D. 联系方式

如遇到部署问题，请通过以下方式获取支持：

- 提交 Issue：GitHub Issues
- 技术支持：tech@yourdomain.com
- 紧急联系：查看项目 README 中的维护者信息
