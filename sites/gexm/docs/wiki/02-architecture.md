# 02 · 整体架构

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 2.1 顶层架构图（文字流程图）

```
┌─────────────────────────────────────────────────────────────────┐
│                       终端用户 / 多端入口                          │
└──────────────┬──────────────┬──────────────┬───────────┬────────┘
               │              │              │           │
       H5/小程序/App      PC 后台        桌面端      WordPress 前台
       (@gexm/app)     (@gexm/pc)   (@gexm/desktop)  (mixm-laal 主题)
               │              │              │           │
               └──────────┬───┴──────┬───────┘           │
                          │          │                   │
                          ▼          ▼                   ▼
                    ┌─────────────────────┐      ┌──────────────────┐
                    │   Nginx 反向代理     │      │  WordPress Core  │
                    │  /api/app/  → 3000  │      │  (PHP + MySQL)   │
                    │  /api/wp/   → 80    │◀────▶│  wp-content/     │
                    └──────────┬──────────┘      │  themes/mixm-laal│
                               │                 └────────┬─────────┘
                               ▼                          │
                    ┌────────────────────────┐            │
                    │  @gexm/server (Express)│◀───────────┘
                    │  + Socket.IO           │   通过 wp_remote_get
                    │  + Agent (LangChain)   │   调用 WP REST API
                    └─────────┬──────────────┘
                              │
              ┌───────────────┼───────────────┬─────────────┐
              ▼               ▼               ▼             ▼
        ┌──────────┐   ┌──────────┐    ┌──────────┐  ┌──────────┐
        │ SQLite/  │   │ Redis 7  │    │ Consul   │  │ Jaeger   │
        │ Postgres │   │ (可选)    │    │ (可选)    │  │ OTel Trace│
        └──────────┘   └──────────┘    └──────────┘  └──────────┘
```

## 2.2 三大服务边界

1. **WordPress 站点**（容器 `gexm-wp` 或裸机部署）：负责内容发布、商城展示页、社区/论坛/视频/漂流瓶等前台 UI，通过 `wp-content/themes/mixm-laal/` 主题文件实现
2. **Express API 服务**（容器 `gexm-server`）：负责业务 API（认证/订单/购物车/社交/AI Agent 等），通过 Nginx 反向代理对外暴露 `/api/app/`
3. **多端前端**（容器 `gexm-app`/`gexm-pc`/桌面端）：消费 Express API + WordPress REST API，统一通过 `@gexm/sdk` 适配各平台

## 2.3 模块关系图

### 2.3.1 npm workspaces 内部依赖

```
@gexm/server  ──┬──→ @gexm/shared
                └──→ (外部：express, langchain, better-sqlite3, pg, redis, socket.io, ...)

@gexm/app     ──┬──→ @gexm/shared
                └──→ (外部：@dcloudio/uni-app, vue, pinia, socket.io-client)

@gexm/pc      ───→ (外部：vue, element-plus, pinia, vue-router, vue-i18n, echarts, axios)

@gexm/sdk     ───→ (无内部依赖，纯适配器层)

@gexm/desktop ───→ (electron 28)

@gexm/shared  ───→ (无内部依赖，纯类型/工具)
```

### 2.3.2 运行时服务依赖

```
Express Server ──┬──→ SQLite (默认) 或 PostgreSQL (生产)
                 ├──→ Redis (可选缓存)
                 ├──→ Consul (可选服务发现)
                 ├──→ Jaeger (可选 Tracing)
                 ├──→ WordPress (通过 wp_remote_get 调用 REST API)
                 └──→ OpenAI (AI Agent)

WordPress ──┬──→ MySQL
            ├──→ 主题 mixm-laal
            └──→ 通过 Nginx 反向代理与 Express 互通
```

### 2.3.3 部署拓扑依赖

```
Nginx 网关
  ├── /api/wp/*  → WordPress 容器 (gexm-wp)
  ├── /api/app/* → Express 容器 (gexm-server)
  ├── /          → PC 容器 (gexm-pc) 或 App H5 容器 (gexm-app)
  └── /static/*  → 静态资源（CDN 可选）
```

## 2.4 数据流向概览

| 数据流 | 入口 | 中间节点 | 出口 |
| --- | --- | --- | --- |
| 用户登录 | App/PC | Nginx → Express | DB + Redis |
| 商品浏览 | App/PC | Nginx → Express / WordPress REST | DB / MySQL |
| 订单创建 | App/PC | Nginx → Express | DB + Queue |
| 支付回调 | 支付平台 | Nginx → Express `/api/v1/payment/notify` | DB + 通知服务 |
| OAuth 登录 | App/PC | Nginx → Express → OAuth Provider | DB |
| AI 对话 | App/PC | Nginx → Express → LangChain → OpenAI | DB |
| 实时消息 | App/PC | Socket.IO → Express | WebSocket 客户端 |

详细时序图见 [13-data-flow.md](file:///f:/gexm/docs/wiki/13-data-flow.md)。

## 2.5 三网络隔离架构

Docker Compose 通过三个独立 bridge 网络实现隔离：

| 网络 | 子网 | 包含服务 | 用途 |
| --- | --- | --- | --- |
| `gexm-frontend` | 172.20.0.0/24 | `app`、`pc` | 前端容器隔离 |
| `gexm-backend` | 172.21.0.0/24 | `server`、`app`、`pc` | 前后端通信 |
| `gexm-db` | 172.22.0.0/24 | `redis`、`postgres`、`server` | 数据层隔离 |

- `server` 跨 `gexm-backend` 与 `gexm-db` 两个网络
- `app`/`pc` 跨 `gexm-frontend` 与 `gexm-backend`
- `redis`/`postgres` 仅在 `gexm-db` 网络，外部无法直接访问

## 2.6 服务可观测性架构

```
[App/PC]                       [Express Server]
   │                                  │
   │ X-Trace-Id ( propagated )        │
   ├─────────────────────────────────▶│
   │                                  │
   │                          ┌────────┴────────┐
   │                          │  Winston Logger  │ → logs/app.log (按日轮转)
   │                          └────────┬────────┘
   │                                   │
   │                          ┌────────┴────────┐
   │                          │  OpenTelemetry   │ → Jaeger (TraceId)
   │                          └────────┬────────┘
   │                                   │
   │                          ┌────────┴────────┐
   │                          │  Prometheus     │ → /metrics 端点
   │                          └────────┬────────┘
   │                                   │
   │                          ┌────────┴────────┐
   │                          │  APM Middleware  │ → 性能指标采集
   │                          └─────────────────┘
```

- **TraceId 传播**：通过 HTTP 头 `X-Trace-Id` 在前后端之间传递
- **日志关联**：所有日志条目附带 `traceId` 字段，支持全链路查询
- **指标暴露**：`/metrics` 端点供 Prometheus 抓取，`/api/metrics` 返回 JSON 格式
