# 微服务拆分规划方案

## 1. 现状分析

### 1.1 当前架构
项目采用 monorepo 架构，后端服务 (`packages/server`) 是一个单体 Express 应用，包含以下核心模块：

| 模块 | 路由路径 | 核心功能 |
|------|---------|---------|
| 用户认证 | `/api/auth`, `/api/users`, `/api/oauth` | 用户注册、登录、OAuth、个人信息管理 |
| 商品管理 | `/api/products`, `/api/categories`, `/api/search` | 商品CRUD、分类、搜索 |
| 订单管理 | `/api/orders`, `/api/flash-sales` | 订单创建、支付、发货、退款、秒杀 |
| 支付服务 | `/api/payment`, `/api/coupons`, `/api/members` | 支付处理、优惠券、会员 |
| 购物车 | `/api/cart`, `/api/favorites` | 购物车、收藏 |
| 物流服务 | `/api/shipping`, `/api/addresses` | 地址管理、物流跟踪 |
| 聊天服务 | `/api/chat`, `/api/inbox` | 实时聊天、消息管理 |
| 通知服务 | `/api/notifications` | 系统通知 |
| 管理后台 | `/api/admin`, `/api/monitoring` | 管理功能、监控 |

### 1.2 问题识别
- **耦合度高**：所有业务逻辑集中在单一进程中，模块间依赖紧密
- **扩展受限**：无法根据业务负载独立扩展
- **部署风险**：任何修改都需要整体部署
- **技术债务**：共享数据库导致 schema 变更困难

## 2. 微服务拆分策略

### 2.1 拆分原则
1. **单一职责**：每个服务只负责一个业务域
2. **高内聚低耦合**：服务内部高度内聚，服务间通过 API 通信
3. **数据独立**：每个服务拥有独立的数据库
4. **渐进式迁移**：采用 Strangler Fig 模式逐步迁移

### 2.2 微服务划分

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                             │
│  (请求路由、认证、限流、日志、监控)                              │
└──────────────────┬────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ User    │ │ Product │ │ Order   │ │ Payment │ │ Chat    │
   │ Service │ │ Service │ │ Service │ │ Service │ │ Service │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │           │
   ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
   │ Postgres│ │ Postgres│ │ Postgres│ │ Postgres│ │ Postgres│
   │ + Redis │ │ + Redis │ │ + Redis │ │ + Redis │ │ + Redis │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

#### 2.2.1 用户服务 (User Service)
- **职责范围**：用户注册、登录、OAuth、个人信息、地址管理
- **路由路径**：`/api/auth`, `/api/users`, `/api/oauth`, `/api/addresses`
- **数据库表**：`users`, `addresses`, `oauth_providers`, `oauth_tokens`, `login_attempts`
- **依赖服务**：无（认证服务）

#### 2.2.2 商品服务 (Product Service)
- **职责范围**：商品管理、分类、搜索、评论、收藏
- **路由路径**：`/api/products`, `/api/categories`, `/api/search`, `/api/reviews`, `/api/favorites`
- **数据库表**：`products`, `categories`, `product_skus`, `product_images`, `reviews`, `favorites`, `search_history`
- **依赖服务**：用户服务（获取用户信息）

#### 2.2.3 订单服务 (Order Service)
- **职责范围**：订单创建、管理、秒杀、发货、退款
- **路由路径**：`/api/orders`, `/api/flash-sales`, `/api/cart`
- **数据库表**：`orders`, `order_items`, `flash_sales`, `cart`, `cart_items`
- **依赖服务**：用户服务、商品服务、支付服务

#### 2.2.4 支付服务 (Payment Service)
- **职责范围**：支付处理、优惠券、会员、余额
- **路由路径**：`/api/payment`, `/api/coupons`, `/api/members`
- **数据库表**：`payments`, `coupons`, `coupon_usage`, `member_levels`, `user_balance`, `balance_history`
- **依赖服务**：用户服务、订单服务

#### 2.2.5 聊天服务 (Chat Service)
- **职责范围**：实时聊天、消息管理、AI对话
- **路由路径**：`/api/chat`, `/api/inbox`
- **数据库表**：`chat_messages`, `chat_sessions`, `inbox`, `ai_chat_history`
- **依赖服务**：用户服务

#### 2.2.6 通知服务 (Notification Service)
- **职责范围**：系统通知、邮件、短信推送
- **路由路径**：`/api/notifications`
- **数据库表**：`notifications`, `notification_settings`, `email_templates`
- **依赖服务**：用户服务

#### 2.2.7 管理服务 (Admin Service)
- **职责范围**：管理后台、监控、审计
- **路由路径**：`/api/admin`, `/api/monitoring`, `/api/metrics`, `/api/error-logs`
- **数据库表**：`roles`, `permissions`, `audit_logs`, `error_logs`, `system_settings`
- **依赖服务**：所有服务

## 3. 服务间通信

### 3.1 同步通信 - REST API
- 使用 HTTP/HTTPS 进行同步请求
- 服务间调用使用服务名 + 路径
- 统一错误码和响应格式

### 3.2 异步通信 - 消息队列
- 使用 RabbitMQ/Kafka 进行异步消息传递
- 事件驱动架构：
  - `user.registered` - 用户注册完成
  - `order.created` - 订单创建
  - `order.paid` - 订单支付成功
  - `order.shipped` - 订单发货
  - `payment.completed` - 支付完成
  - `product.stock.updated` - 库存更新

### 3.3 服务发现
- 使用 Consul 或 etcd 进行服务注册和发现
- API Gateway 通过服务发现获取服务实例地址

## 4. API Gateway 设计

### 4.1 核心功能
- **请求路由**：根据路径转发到对应服务
- **认证授权**：统一 JWT 验证、权限检查
- **限流熔断**：防止雪崩、保护后端服务
- **日志追踪**：统一日志格式、分布式链路追踪
- **负载均衡**：轮询、权重、最小连接数

### 4.2 路由映射

| 前端路径 | 后端服务 | 服务路径 |
|---------|---------|---------|
| `/api/auth/*` | User Service | `/api/auth/*` |
| `/api/users/*` | User Service | `/api/users/*` |
| `/api/oauth/*` | User Service | `/api/oauth/*` |
| `/api/addresses/*` | User Service | `/api/addresses/*` |
| `/api/products/*` | Product Service | `/api/products/*` |
| `/api/categories/*` | Product Service | `/api/categories/*` |
| `/api/search/*` | Product Service | `/api/search/*` |
| `/api/reviews/*` | Product Service | `/api/reviews/*` |
| `/api/favorites/*` | Product Service | `/api/favorites/*` |
| `/api/orders/*` | Order Service | `/api/orders/*` |
| `/api/flash-sales/*` | Order Service | `/api/flash-sales/*` |
| `/api/cart/*` | Order Service | `/api/cart/*` |
| `/api/payment/*` | Payment Service | `/api/payment/*` |
| `/api/coupons/*` | Payment Service | `/api/coupons/*` |
| `/api/members/*` | Payment Service | `/api/members/*` |
| `/api/chat/*` | Chat Service | `/api/chat/*` |
| `/api/inbox/*` | Chat Service | `/api/inbox/*` |
| `/api/notifications/*` | Notification Service | `/api/notifications/*` |
| `/api/admin/*` | Admin Service | `/api/admin/*` |

## 5. 数据库拆分方案

### 5.1 数据库独立
每个服务拥有独立的 PostgreSQL 数据库：

```
user-service-db
├── users
├── addresses
├── oauth_providers
├── oauth_tokens
└── login_attempts

product-service-db
├── products
├── categories
├── product_skus
├── product_images
├── reviews
├── favorites
└── search_history

order-service-db
├── orders
├── order_items
├── flash_sales
├── cart
└── cart_items

payment-service-db
├── payments
├── coupons
├── coupon_usage
├── member_levels
├── user_balance
└── balance_history

chat-service-db
├── chat_messages
├── chat_sessions
├── inbox
└── ai_chat_history

notification-service-db
├── notifications
├── notification_settings
└── email_templates

admin-service-db
├── roles
├── permissions
├── audit_logs
├── error_logs
└── system_settings
```

### 5.2 数据一致性
- **最终一致性**：通过消息队列保证数据最终一致
- **分布式事务**：使用 Saga 模式处理跨服务事务
- **数据冗余**：在需要的服务间复制必要数据（如用户基本信息）

## 6. 迁移路线图

### Phase 1：基础设施准备（2周）
- [ ] 部署 API Gateway（Express/Nginx）
- [ ] 部署服务发现（Consul）
- [ ] 部署消息队列（RabbitMQ）
- [ ] 配置监控告警（Prometheus + Grafana）

### Phase 2：用户服务拆分（2周）
- [ ] 独立用户服务数据库
- [ ] 迁移用户相关模型和控制器
- [ ] 部署用户服务
- [ ] API Gateway 路由配置
- [ ] 测试验证

### Phase 3：商品服务拆分（2周）
- [ ] 独立商品服务数据库
- [ ] 迁移商品相关模型和控制器
- [ ] 部署商品服务
- [ ] API Gateway 路由配置
- [ ] 测试验证

### Phase 4：订单服务拆分（3周）
- [ ] 独立订单服务数据库
- [ ] 迁移订单相关模型和控制器
- [ ] 实现订单-商品服务通信
- [ ] 部署订单服务
- [ ] API Gateway 路由配置
- [ ] 测试验证

### Phase 5：支付服务拆分（2周）
- [ ] 独立支付服务数据库
- [ ] 迁移支付相关模型和控制器
- [ ] 实现支付-订单服务通信
- [ ] 部署支付服务
- [ ] API Gateway 路由配置
- [ ] 测试验证

### Phase 6：聊天和通知服务拆分（2周）
- [ ] 独立聊天服务数据库
- [ ] 独立通知服务数据库
- [ ] 迁移相关模型和控制器
- [ ] 部署服务
- [ ] API Gateway 路由配置

### Phase 7：管理服务拆分（1周）
- [ ] 独立管理服务数据库
- [ ] 迁移管理相关模型和控制器
- [ ] 部署管理服务
- [ ] API Gateway 路由配置

### Phase 8：清理和优化（1周）
- [ ] 移除单体应用中的已迁移代码
- [ ] 优化服务间通信
- [ ] 完善监控和告警

## 7. 技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| API Gateway | Express + http-proxy-middleware | 轻量、灵活 |
| 服务发现 | Consul | 成熟、稳定 |
| 消息队列 | RabbitMQ | 支持延迟消息、死信队列 |
| 数据库 | PostgreSQL | 支持 JSON、全文搜索 |
| 缓存 | Redis | 分布式缓存、会话管理 |
| 监控 | Prometheus + Grafana | 指标监控、可视化 |
| 日志 | ELK Stack | 日志收集、分析 |
| 部署 | Docker + Kubernetes | 容器化部署、自动扩缩容 |

## 8. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 服务间调用延迟 | 高 | 使用本地缓存、优化网络 |
| 分布式事务一致性 | 高 | 采用 Saga 模式、最终一致性 |
| 服务不可用 | 高 | 熔断降级、冗余部署 |
| 数据迁移风险 | 中 | 双写验证、回滚方案 |
| 测试复杂度增加 | 中 | 集成测试、契约测试 |

## 9. 验收标准

### 9.1 功能验收
- 所有 API 接口功能保持不变
- 用户体验不受影响
- 数据一致性得到保障

### 9.2 性能验收
- API Gateway 响应时间 < 50ms
- 服务间调用延迟 < 100ms
- 系统吞吐量提升 30%+

### 9.3 可靠性验收
- 服务可用性 99.9%+
- 自动故障转移 < 30秒
- 完整的监控告警体系
