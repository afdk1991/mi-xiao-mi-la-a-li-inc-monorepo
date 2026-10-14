# 环境变量说明

## 1. 概述

本文档详细说明 Gexm 电商项目的所有环境变量配置，包括后端服务、前端构建配置以及不同环境的配置差异。

### 1.1 配置文件位置

| 配置文件 | 说明 | 所属包 |
|----------|------|--------|
| `packages/server/.env` | 后端环境变量 | `@gexm/server` |
| `packages/server/.env.example` | 后端环境变量模板 | `@gexm/server` |
| `packages/app/.env.development` | 前端开发环境配置 | `@gexm/app` |
| `packages/app/.env.production` | 前端生产环境配置 | `@gexm/app` |

> **注意**: `.env` 文件包含敏感信息，**绝不能提交到 Git 仓库**。项目已在 `.gitignore` 中忽略这些文件。

---

## 2. 后端环境变量详解

### 2.1 基础配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `PORT` | 否 | `3000` | number | 服务监听端口 |
| `NODE_ENV` | 否 | `development` | string | 运行环境，可选值：`development`, `testing`, `staging`, `production` |

**示例**:
```env
PORT=3000
NODE_ENV=production
```

### 2.2 JWT 认证配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `JWT_SECRET` | 是 | `gexm_jwt_secret_key_2024` | string | Access Token 签名密钥 |
| `JWT_EXPIRES_IN` | 否 | `24h` | string | Access Token 有效期 |
| `JWT_REFRESH_SECRET` | 是 | `gexm_refresh_secret_key_2024` | string | Refresh Token 签名密钥 |
| `JWT_REFRESH_EXPIRES_IN` | 否 | `7d` | string | Refresh Token 有效期 |

**安全提示**:
- 生产环境必须修改默认密钥！
- 密钥建议使用 32 位以上的随机字符串
- `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 必须使用不同的值
- 密钥变更会导致所有已登录用户失效

**密钥生成命令**:
```bash
# Linux/macOS
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**有效期格式说明**:
- 秒: `60`, `2m`
- 分钟: `1h`, `60m`
- 小时: `24h`, `1d`
- 天: `7d`, `30d`

**示例**:
```env
JWT_SECRET=your_32_character_strong_secret_key_here
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=your_another_32_character_strong_secret_key
JWT_REFRESH_EXPIRES_IN=7d
```

### 2.3 安全配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `FORCE_HTTPS` | 否 | `false` | boolean | 是否强制 HTTPS 重定向 |
| `CORS_ORIGINS` | 否 | `''` | string | 允许的 CORS 源，逗号分隔 |

**`CORS_ORIGINS` 格式**:
- 多个域名用英文逗号分隔
- 支持通配符 `*`（不推荐用于生产环境）
- 包含协议和端口（如需要）

**示例**:
```env
FORCE_HTTPS=true
CORS_ORIGINS=https://www.yourdomain.com,https://m.yourdomain.com,https://admin.yourdomain.com
```

> **注意**: 开发环境可留空，表示允许所有来源（`*`）。生产环境必须明确配置允许的域名。

### 2.4 数据库配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `DB_PATH` | 否 | `./data/gexm.db` | string | SQLite 数据库文件路径 |

**路径说明**:
- 相对路径：相对于 `packages/server/` 目录
- 生产环境建议使用绝对路径

**示例**:
```env
# 相对路径
DB_PATH=./data/gexm.db

# 绝对路径（推荐生产环境）
DB_PATH=/opt/gexm/data/gexm.db
```

### 2.5 Redis 缓存配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `REDIS_HOST` | 否 | `localhost` | string | Redis 服务器地址 |
| `REDIS_PORT` | 否 | `6379` | number | Redis 端口 |
| `REDIS_PASSWORD` | 否 | `''` | string | Redis 密码（如有） |
| `REDIS_DB` | 否 | `0` | number | Redis 数据库编号 |
| `REDIS_ENABLED` | 否 | `false` | boolean | 是否启用 Redis 缓存 |

**说明**:
- Redis 未启用或连接失败时，系统自动降级为内存缓存模式
- 生产环境建议启用 Redis 以提升性能和稳定性
- 密码为空表示无需认证

**示例**:
```env
# 启用 Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_ENABLED=true
```

### 2.6 文件上传配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `UPLOAD_PATH` | 否 | `./uploads` | string | 文件上传目录路径 |
| `MAX_UPLOAD_SIZE` | 否 | `10485760` | number | 最大上传文件大小（字节） |

**文件大小换算**:
- 1 MB = 1048576 字节
- 10 MB = 10485760 字节（默认）
- 50 MB = 52428800 字节
- 100 MB = 104857600 字节

**示例**:
```env
UPLOAD_PATH=/opt/gexm/uploads
MAX_UPLOAD_SIZE=10485760
```

### 2.7 限流配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `RATE_LIMIT_WINDOW` | 否 | `15` | number | 限流时间窗口（分钟） |
| `RATE_LIMIT_MAX` | 否 | `100` | number | 时间窗口内最大请求数 |

**限流规则**:
- 默认：每 IP 每 15 分钟最多 100 次请求
- 超过限制返回 429 Too Many Requests
- 适用于所有 API 接口

**根据场景调整**:
| 场景 | 时间窗口 | 最大请求数 |
|------|----------|------------|
| 开发环境 | 15 分钟 | 1000 |
| 测试环境 | 15 分钟 | 500 |
| 生产环境（小型） | 15 分钟 | 100 |
| 生产环境（中型） | 15 分钟 | 500 |
| 生产环境（大型） | 1 分钟 | 1000 |

**示例**:
```env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 2.8 支付配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `PAYMENT_SECRET` | 否 | `gexm_payment_secret_key_2024` | string | 支付签名密钥 |
| `PAYMENT_NOTIFY_URL` | 否 | `''` | string | 支付回调通知地址 |

**示例**:
```env
PAYMENT_SECRET=your_payment_secret_key
PAYMENT_NOTIFY_URL=https://api.yourdomain.com/api/payment/notify
```

### 2.9 日志配置

| 变量名 | 必填 | 默认值 | 类型 | 说明 |
|--------|------|--------|------|------|
| `LOG_LEVEL` | 否 | `info` | string | 日志级别 |
| `LOG_FILE` | 否 | `./logs/app.log` | string | 日志文件路径 |

**日志级别（从低到高）**:
| 级别 | 输出内容 | 适用场景 |
|------|----------|----------|
| `error` | 仅错误 | 生产环境（极简） |
| `warn` | 错误 + 警告 | 生产环境（推荐） |
| `info` | 信息 + 警告 + 错误 | 测试环境 / 开发环境 |
| `http` | HTTP 请求日志 + 以上 | 调试接口 |
| `verbose` | 详细日志 + 以上 | 问题排查 |
| `debug` | 调试信息 + 以上 | 开发环境 |
| `silly` | 所有日志 | 深度调试 |

> **注意**: 生产环境建议使用 `warn` 或 `error` 级别，减少日志量。

**日志文件**:
- 普通日志：`app.log`（或配置的路径）
- 错误日志：自动生成 `app-error.log`（仅 error 级别）
- 单文件最大 5MB，最多保留 5 个文件（Winston 内置轮转）

**示例**:
```env
# 开发环境
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# 生产环境
LOG_LEVEL=warn
LOG_FILE=/opt/gexm/logs/app.log
```

---

## 3. 前端环境变量详解

### 3.1 Vite 环境变量规则

- 只有以 `VITE_` 开头的变量才会暴露到前端代码中
- 在代码中通过 `import.meta.env.VITE_XXX` 访问
- 构建时会被静态替换（非运行时）

### 3.2 前端环境变量列表

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_API_BASE_URL` | 是 | `/api` | API 请求基础路径 |
| `VITE_APP_TITLE` | 否 | `Gexm` | 应用标题 |
| `VITE_APP_VERSION` | 否 | `1.0.0` | 应用版本号 |

### 3.3 变量详细说明

#### VITE_API_BASE_URL

API 请求的基础 URL 前缀。

**不同场景配置**:
| 环境 | 配置值 | 说明 |
|------|--------|------|
| 开发环境 | `/api` | 通过 Vite 代理转发 |
| 生产环境（同域名） | `/api` | 通过 Nginx 反向代理 |
| 生产环境（跨域名） | `https://api.yourdomain.com` | 独立 API 域名 |

**示例**:
```env
# 同域名部署（推荐）
VITE_API_BASE_URL=/api

# 独立 API 域名
VITE_API_BASE_URL=https://api.yourdomain.com
```

#### VITE_APP_TITLE

应用名称，显示在浏览器标签页、启动页等位置。

**示例**:
```env
VITE_APP_TITLE=Gexm 商城
```

#### VITE_APP_VERSION

应用版本号，用于显示和排查问题。

**示例**:
```env
VITE_APP_VERSION=1.2.3
```

> **建议**: 在 CI/CD 中自动设置为 Git 提交哈希或版本标签，便于追踪。

### 3.4 前端代码中使用

```javascript
// 获取 API 基础地址
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// 获取应用标题
const appTitle = import.meta.env.VITE_APP_TITLE;

// 获取版本号
const appVersion = import.meta.env.VITE_APP_VERSION;

// 环境判断
if (import.meta.env.DEV) {
  console.log('开发环境');
}

if (import.meta.env.PROD) {
  console.log('生产环境');
}
```

---

## 4. 不同环境配置差异

### 4.1 配置矩阵

| 配置项 | 开发环境 | 测试环境 | 预发布环境 | 生产环境 |
|--------|----------|----------|------------|----------|
| **NODE_ENV** | `development` | `testing` | `staging` | `production` |
| **LOG_LEVEL** | `debug` | `info` | `info` | `warn` |
| **JWT_SECRET** | 开发密钥 | 测试密钥 | 预发布密钥 | 生产密钥 |
| **JWT_EXPIRES_IN** | `24h` | `24h` | `2h` | `2h` |
| **FORCE_HTTPS** | `false` | `false` | `true` | `true` |
| **CORS_ORIGINS** | 空（允许所有） | 测试域名 | 预发布域名 | 生产域名 |
| **RATE_LIMIT_MAX** | `1000` | `500` | `200` | `100` |
| **DB_PATH** | `./data/gexm.db` | `/opt/gexm-test/data/gexm.db` | `/opt/gexm-staging/data/gexm.db` | `/opt/gexm/data/gexm.db` |

### 4.2 开发环境配置

**后端 `packages/server/.env`**:

```env
PORT=3000
NODE_ENV=development

JWT_SECRET=gexm_jwt_secret_key_2024
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=gexm_refresh_secret_key_2024
JWT_REFRESH_EXPIRES_IN=7d

FORCE_HTTPS=false
CORS_ORIGINS=

DB_PATH=./data/gexm.db

UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10485760

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000

LOG_LEVEL=debug
LOG_FILE=./logs/app.log
```

**前端 `packages/app/.env.development`**:

```env
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Gexm (开发)
VITE_APP_VERSION=dev
```

### 4.3 测试环境配置

**后端 `.env`**:

```env
PORT=3001
NODE_ENV=testing

JWT_SECRET=test_jwt_secret_change_me_12345
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=test_refresh_secret_change_me_67890
JWT_REFRESH_EXPIRES_IN=7d

FORCE_HTTPS=false
CORS_ORIGINS=https://test.yourdomain.com

DB_PATH=/opt/gexm-test/data/gexm.db

UPLOAD_PATH=/opt/gexm-test/uploads
MAX_UPLOAD_SIZE=10485760

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=500

LOG_LEVEL=info
LOG_FILE=/opt/gexm-test/logs/app.log
```

**前端 `.env.testing`** (如需要，需创建文件):

```env
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Gexm (测试)
VITE_APP_VERSION=test
```

### 4.4 预发布环境配置

**后端 `.env`**:

```env
PORT=3002
NODE_ENV=staging

JWT_SECRET=staging_jwt_secret_change_me_abcde
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=staging_refresh_secret_change_me_fghij
JWT_REFRESH_EXPIRES_IN=7d

FORCE_HTTPS=true
CORS_ORIGINS=https://staging.yourdomain.com

DB_PATH=/opt/gexm-staging/data/gexm.db

UPLOAD_PATH=/opt/gexm-staging/uploads
MAX_UPLOAD_SIZE=10485760

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=200

LOG_LEVEL=info
LOG_FILE=/opt/gexm-staging/logs/app.log
```

### 4.5 生产环境配置

**后端 `.env`**:

```env
PORT=3000
NODE_ENV=production

JWT_SECRET=生产环境密钥_请使用32位以上随机字符串
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=生产环境刷新密钥_请使用32位以上随机字符串
JWT_REFRESH_EXPIRES_IN=7d

FORCE_HTTPS=true
CORS_ORIGINS=https://www.yourdomain.com,https://m.yourdomain.com

DB_PATH=/opt/gexm/data/gexm.db

UPLOAD_PATH=/opt/gexm/uploads
MAX_UPLOAD_SIZE=10485760

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

PAYMENT_SECRET=生产环境支付密钥
PAYMENT_NOTIFY_URL=https://www.yourdomain.com/api/payment/notify

LOG_LEVEL=warn
LOG_FILE=/opt/gexm/logs/app.log
```

**前端 `.env.production`**:

```env
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Gexm
VITE_APP_VERSION=1.0.0
```

---

## 5. 敏感信息管理规范

### 5.1 敏感信息分类

| 级别 | 信息类型 | 示例 | 存储位置 |
|------|----------|------|----------|
| **最高** | 数据库密钥、支付密钥 | JWT_SECRET, PAYMENT_SECRET | 环境变量 / 密钥管理系统 |
| **高** | 数据库连接信息 | DB_PATH（含路径敏感信息） | 环境变量 |
| **中** | 服务端口、域名 | PORT, CORS_ORIGINS | 环境变量 / 配置文件 |
| **低** | 日志级别、缓存配置 | LOG_LEVEL, RATE_LIMIT_* | 配置文件 |

### 5.2 安全管理原则

1. **绝不提交到代码仓库**
   - `.env` 文件必须加入 `.gitignore`
   - 代码中不能硬编码任何密钥
   - 提交前检查是否有敏感信息泄露

2. **最小权限原则**
   - 只向需要的人授予访问权限
   - 不同环境使用不同密钥
   - 定期轮换密钥

3. **密钥强度要求**
   - 长度：至少 32 字符
   - 复杂度：包含大小写字母、数字、特殊字符
   - 随机性：使用密码生成器生成，不要使用有意义的单词

### 5.3 密钥生成方法

```bash
# 方法 1: OpenSSL (推荐)
openssl rand -base64 32

# 方法 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: /dev/urandom (Linux/macOS)
cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*()_+-=[]{}|;:,.<>?' | head -c 64 ; echo ''
```

### 5.4 密钥轮换策略

| 密钥类型 | 轮换周期 | 轮换方式 | 影响 |
|----------|----------|----------|------|
| JWT_SECRET | 90 天 | 新旧并存一段时间 | 用户需要重新登录 |
| JWT_REFRESH_SECRET | 90 天 | 新旧并存一段时间 | 用户需要重新登录 |
| PAYMENT_SECRET | 180 天 | 与支付平台同步更换 | 支付可能短暂中断 |

### 5.5 环境变量加载优先级

后端使用 `dotenv` 加载环境变量，优先级如下（从高到低）：

1. **系统环境变量** (操作系统级)
2. **`.env` 文件** (项目级)
3. **默认值** (代码中配置)

> **注意**: 已存在的系统环境变量不会被 `.env` 文件覆盖。

### 5.6 验证环境配置

检查当前环境变量配置是否正确：

```bash
# 后端 - 查看有效配置
cd packages/server
node -e "const config = require('./src/config'); console.log(JSON.stringify(config, null, 2))"

# 或者调用健康检查接口
curl http://localhost:3000/api/health
```

### 5.7 部署时的环境变量管理

#### 方式一：.env 文件（传统方式）

- 将 `.env` 文件放在服务器上
- 通过 scp 或部署工具上传
- 设置文件权限：`chmod 600 .env`

#### 方式二：系统环境变量

```bash
# 临时设置
export JWT_SECRET=your_secret

# 永久设置（写入 ~/.bashrc 或 /etc/environment）
echo 'export JWT_SECRET=your_secret' >> ~/.bashrc
```

#### 方式三：Docker / Docker Compose

```yaml
# docker-compose.yml
services:
  gexm-server:
    env_file:
      - ./packages/server/.env
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/gexm.db
```

#### 方式四：专用密钥管理系统（推荐企业级）

- **HashiCorp Vault**
- **AWS Secrets Manager**
- **阿里云 KMS**
- **腾讯云 KMS**

### 5.8 配置文件权限设置

```bash
# Linux/macOS - 仅所有者可读写
chmod 600 packages/server/.env
chmod 600 packages/app/.env.production

# 确认权限
ls -la packages/server/.env
# -rw------- 1 user group  ... .env
```

---

## 6. 配置变更流程

### 6.1 新增环境变量

1. 在 `.env.example` 中添加示例和注释
2. 在 `src/config/index.js` 中添加配置读取代码
3. 在本文档中添加变量说明
4. 更新各环境的 `.env` 文件
5. 更新 CI/CD 配置（如需要）

### 6.2 修改环境变量

1. 评估变更影响范围
2. 在测试环境验证
3. 逐步应用到各环境
4. 记录变更日志

### 6.3 删除环境变量

1. 确认不再使用
2. 从代码中移除引用
3. 从 `.env.example` 和文档中移除
4. 清理各环境配置

---

## 7. 常见问题

### Q: 修改了环境变量为什么不生效？

A: 
- 后端：需要重启 Node.js 服务（`pm2 restart gexm-server`）
- 前端：需要重新构建（`npm run build:app-h5`）
- 检查是否有系统环境变量覆盖了 `.env` 文件的值

### Q: 如何查看当前生效的配置？

A:
```bash
# 后端
node -e "console.log(require('./packages/server/src/config'))"
```

### Q: 可以在代码中直接使用 process.env 吗？

A: 建议通过 `config/index.js` 统一读取和管理，而不是直接使用 `process.env`。这样可以：
- 统一类型转换
- 设置默认值
- 便于测试和维护

### Q: 多环境如何管理配置文件？

A: 有几种方式：
1. 每个环境一个 `.env` 文件，部署时选择对应文件
2. 使用环境变量管理系统（如 Vault）
3. 在 CI/CD 中通过 Secrets 注入
