# @gexm/server

Gexm 全平台应用系统的后端服务，基于 Express.js 构建，提供用户认证、商品管理、订单处理、支付、购物车、即时聊天等核心业务能力。

## 模块简介

本服务作为 Gexm 平台的后端中枢，承担数据持久化、业务逻辑处理、API 服务、实时通信等职责。采用 TypeScript 编写，通过 monorepo 工作区与前端应用、SDK 等模块协同工作。

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| Web 框架 | Express.js | 4.18.x，Node.js 主流 Web 框架 |
| 数据库 | better-sqlite3 | 9.4.x，同步 SQLite 驱动，开发环境默认 |
| 缓存 | redis | 4.7.x，可选，未启用时降级为内存缓存 |
| 认证 | jsonwebtoken (JWT) | 9.0.x，双 Token 机制（Access + Refresh） |
| 实时通信 | Socket.IO | 4.8.x，聊天与消息推送 |
| 参数校验 | Zod | 3.23.x，请求参数类型校验 |
| 安全 | helmet / cors / express-rate-limit / xss / bcryptjs | 多层安全防护 |
| 日志 | winston + winston-daily-rotate-file | 分级日志与按日轮转 |
| 文件上传 | multer | 1.4.x，支持大小与类型限制 |
| 进程管理 | PM2（生产，参考 ecosystem.config.js） | 多进程与守护 |

## 目录结构

```
packages/server/
├── src/
│   ├── config/                # 配置层
│   │   ├── index.ts           # 主配置入口
│   │   └── cache.ts           # 缓存（Redis/内存）配置
│   ├── constants/
│   │   └── errorCodes.ts      # 错误码常量
│   ├── middleware/            # 中间件层
│   │   ├── auth.ts            # JWT 鉴权
│   │   ├── security.ts        # 安全防护（Helmet/CORS/限流等）
│   │   ├── csrfConfig.ts      # CSRF 配置
│   │   ├── apm.ts             # 应用性能监控
│   │   └── metrics.ts         # 指标采集
│   ├── models/                # 数据模型层（直接操作 SQLite）
│   │   ├── userModel.ts
│   │   ├── productModel.ts
│   │   ├── orderModel.ts
│   │   ├── cartModel.ts
│   │   ├── paymentModel.ts
│   │   ├── chatModel.ts
│   │   └── ...                # 收货地址、优惠券、收藏、签到等
│   ├── routes/                # 路由层（控制器逻辑内聚）
│   │   ├── auth.ts            # 认证
│   │   ├── users.ts           # 用户
│   │   ├── products.ts        # 商品
│   │   ├── categories.ts      # 分类
│   │   ├── orders.ts          # 订单
│   │   ├── payment.ts         # 支付
│   │   ├── cart.ts            # 购物车
│   │   ├── chat.ts            # 聊天
│   │   ├── addresses.ts       # 收货地址
│   │   ├── favorites.ts       # 收藏
│   │   ├── coupons.ts         # 优惠券
│   │   ├── checkins.ts        # 签到
│   │   ├── members.ts         # 会员
│   │   ├── reviews.ts         # 评价
│   │   ├── search.ts          # 搜索
│   │   ├── shipping.ts        # 物流
│   │   ├── inbox.ts           # 站内信
│   │   ├── sync.ts            # 数据同步
│   │   ├── upload.ts          # 文件上传
│   │   ├── flashSales.ts      # 限时秒杀
│   │   ├── admin.ts           # 后台管理
│   │   ├── monitoring.ts      # 监控
│   │   ├── metrics.ts         # 指标
│   │   ├── notifications.ts   # 通知
│   │   ├── errorLogs.ts       # 错误日志
│   │   └── index.ts           # 路由聚合
│   ├── schemas/               # Zod 校验 Schema
│   │   ├── auth.ts
│   │   ├── address.ts
│   │   ├── admin.ts
│   │   └── payment.ts
│   ├── services/              # 业务服务层
│   │   ├── cacheService.ts    # 缓存服务（Redis/内存自动降级）
│   │   ├── orderService.ts    # 订单业务
│   │   └── monitoring.ts      # 监控服务
│   ├── utils/                 # 工具层
│   │   ├── logger.ts          # 日志器
│   │   ├── response.ts        # 统一响应封装
│   │   ├── aes.ts             # AES 加解密
│   │   └── backup.js          # 数据备份
│   ├── app.ts                 # Express 应用入口
│   ├── server.ts              # HTTP 服务启动
│   └── websocket.js           # Socket.IO 实时通信
├── data/                      # SQLite 数据库文件
├── logs/                      # 运行日志
├── deploy/                    # 部署脚本与配置
│   ├── deploy.sh / deploy.bat
│   ├── gexm-server.service    # systemd 服务
│   ├── nginx.conf
│   ├── ssl-setup.sh
│   └── health-check.sh
├── e2e/                       # Playwright E2E 测试
├── performance/               # 性能压测脚本
├── __tests__/                 # Jest 单元/集成测试
├── .env.example               # 环境变量示例
├── Dockerfile                 # 容器化构建
├── docker-compose.yml
├── ecosystem.config.js        # PM2 配置
├── tsconfig.json
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0（或 pnpm）
- Python 3.x（better-sqlite3 编译依赖，Windows 需 Visual Studio Build Tools）

### 安装依赖

```bash
cd packages/server
npm install
```

### 环境配置

```bash
# 复制环境变量示例文件
cp .env.example .env

# 按需修改 .env 中的配置项：
# - JWT_SECRET / JWT_REFRESH_SECRET：生产环境必须替换为强随机密钥
# - DB_PATH：数据库文件路径
# - REDIS_ENABLED：是否启用 Redis 缓存
# - PAYMENT_SECRET：支付签名密钥
```

### 启动开发服务器

```bash
# 开发模式（ts-node 直接运行 TypeScript）
npm run dev

# 默认监听 http://localhost:3000
```

### 构建

```bash
# 编译 TypeScript 至 dist/
npm run build

# 生产启动
npm start
```

## API 概览

所有接口遵循 RESTful 规范，统一响应格式参见 `src/utils/response.ts`。详细接口文档见根目录 `docs/api.md` 与 `docs/api-documentation.md`。

| 模块 | 路由前缀 | 主要能力 |
|------|----------|----------|
| 用户认证 | `/api/auth` | 注册、登录、刷新 Token、登出、密码找回 |
| 用户管理 | `/api/users` | 用户资料、头像上传、个人信息维护 |
| 商品管理 | `/api/products` | 商品 CRUD、列表、详情、库存 |
| 商品分类 | `/api/categories` | 分类树、分类商品查询 |
| 购物车 | `/api/cart` | 加购、修改、删除、清单查询 |
| 订单管理 | `/api/orders` | 创建、查询、取消、状态流转 |
| 支付 | `/api/payment` | 下单、回调、签名校验、IP 白名单 |
| 收货地址 | `/api/addresses` | 地址 CRUD、默认地址设置 |
| 收藏 | `/api/favorites` | 收藏与取消 |
| 优惠券 | `/api/coupons` | 优惠券领取、查询、核销 |
| 签到 | `/api/checkins` | 每日签到、签到记录 |
| 会员 | `/api/members` | 会员等级、权益 |
| 评价 | `/api/reviews` | 商品评价提交与查询 |
| 搜索 | `/api/search` | 商品搜索、热词、历史 |
| 物流 | `/api/shipping` | 物流模板与运费计算 |
| 站内信 | `/api/inbox` | 系统消息、状态管理 |
| 聊天 | `/api/chat` | 一对一聊天、AI 助手（基于 Socket.IO） |
| 限时秒杀 | `/api/flash-sales` | 秒杀活动与库存控制 |
| 数据同步 | `/api/sync` | 离线数据同步、冲突解决 |
| 文件上传 | `/api/upload` | 文件上传与大小/类型校验 |
| 后台管理 | `/api/admin` | 后台运营管理 |
| 通知 | `/api/notifications` | 通知管理与推送 |
| 错误日志 | `/api/error-logs` | 客户端错误上报 |
| 监控 | `/api/monitoring` `/api/metrics` | 健康检查、性能指标 |

## 环境变量说明

完整变量列表及注释详见 `.env.example`，关键配置项摘要如下：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `NODE_ENV` | development | 运行环境 |
| `JWT_SECRET` | （示例值） | JWT 签名密钥，生产必须替换 |
| `JWT_EXPIRES_IN` | 24h | Access Token 有效期 |
| `JWT_REFRESH_SECRET` | （示例值） | Refresh Token 签名密钥 |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh Token 有效期 |
| `FORCE_HTTPS` | false | 是否强制 HTTPS |
| `CORS_ORIGINS` | - | 允许的跨域来源，逗号分隔 |
| `CSRF_SECRET` | （示例值） | CSRF 密钥，生产必须替换 |
| `DB_PATH` | ./data/gexm.db | SQLite 数据库路径 |
| `UPLOAD_PATH` | ./uploads | 上传文件目录 |
| `MAX_UPLOAD_SIZE` | 10485760 | 上传大小上限（字节） |
| `PAYMENT_SECRET` | （示例值） | 支付签名密钥，HMAC-SHA256 |
| `PAYMENT_IP_WHITELIST_ENABLED` | false | 支付回调 IP 白名单开关 |
| `RATE_LIMIT_WINDOW` | 15 | 限流窗口（分钟） |
| `RATE_LIMIT_MAX` | 100 | 限流窗口内最大请求数 |
| `LOG_LEVEL` | info | 日志级别 |
| `LOG_FILE` | ./logs/app.log | 日志文件路径 |
| `REDIS_ENABLED` | false | 是否启用 Redis |
| `REDIS_HOST` | localhost | Redis 主机 |
| `REDIS_PORT` | 6379 | Redis 端口 |
| `REDIS_PASSWORD` | - | Redis 密码 |
| `REDIS_DB` | 0 | Redis 数据库序号 |
| `CACHE_KEY_PREFIX` | gexm: | 缓存键前缀 |

## 部署说明

部署相关脚本与配置位于 `deploy/` 目录：

- `deploy/deploy.sh` / `deploy/deploy.bat`：Linux/Windows 部署脚本
- `deploy/gexm-server.service`：systemd 服务单元文件
- `deploy/nginx.conf`：Nginx 反向代理配置
- `deploy/ssl-setup.sh`：SSL 证书申请脚本
- `deploy/health-check.sh`：健康检查脚本

容器化部署：

```bash
# 构建镜像
docker build -t gexm-server .

# 使用 docker-compose
docker-compose up -d
```

生产环境推荐使用 PM2 进程管理：

```bash
pm2 start ecosystem.config.js --env production
```

更完整的部署指南见根目录 `docs/deployment.md`。

## 测试

```bash
# 单元/集成测试
npm test

# E2E 测试（Playwright）
npm run test:e2e

# 性能压测
npm run test:performance

# 高负载压测
npm run test:performance:high
```

## 许可证

MIT
