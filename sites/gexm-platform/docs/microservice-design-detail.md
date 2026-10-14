# GEXM 微服务边界详细设计文档

> **版本**：v1.0  
> **日期**：2026-07-13  
> **状态**：草案（Draft）

---

## 一、设计原则

1. **单一职责原则**：每个服务专注于一个业务领域
2. **独立部署**：服务可独立开发、部署、扩展
3. **数据隔离**：每个服务拥有独立数据库，禁止跨库直接访问
4. **服务自治**：服务内部逻辑不依赖外部服务实现细节
5. **容错设计**：服务间调用支持降级、熔断、超时控制
6. **最终一致性**：跨服务事务采用 Saga/TCC 模式，不追求强一致性

---

## 二、服务划分与边界

### 2.1 整体架构

```
                        ┌─────────────────────┐
                        │    API Gateway      │
                        │    (Nginx / 自实现)  │
                        └─────────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  User Service │       │ Order Service │       │Product Service│
│  用户服务      │       │  订单服务      │       │  商品服务      │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
   User DB                  Order DB                 Product DB
   (SQLite/PG)              (SQLite/PG)              (SQLite/PG)
```

### 2.2 服务职责边界

#### 用户服务（user-service）

**职责范围**：
- 用户注册、登录、注销、身份认证
- 用户资料管理（昵称、头像、手机号、邮箱）
- 用户地址管理
- OAuth 第三方登录
- 用户等级与积分（会员体系）
- 登录日志与安全审计

**数据库表**：
- `users` — 用户主表
- `addresses` — 收货地址
- `oauth_accounts` — OAuth 绑定
- `oauth_states` — OAuth 状态
- `login_attempts` — 登录尝试记录
- `refresh_tokens` — 刷新令牌
- `member_levels` — 会员等级
- `point_logs` — 积分流水

**API 前缀**：`/api/users/*`、`/api/auth/*`

**对外 API（供其他服务调用）**：
| API | 方法 | 说明 |
|-----|------|------|
| `/api/users/:id` | GET | 根据 ID 获取用户信息 |
| `/api/users/batch` | POST | 批量获取用户信息 |
| `/api/users/:id/points` | GET | 获取用户积分 |
| `/api/users/:id/points/deduct` | POST | 扣减积分（内部服务调用） |
| `/api/users/:id/points/add` | POST | 增加积分（内部服务调用） |

---

#### 商品服务（product-service）

**职责范围**：
- 商品 CRUD 管理
- 商品分类管理
- 商品 SKU 管理
- 库存管理（库存扣减、归还）
- 商品评价
- 购物车

**数据库表**：
- `products` — 商品主表
- `product_skus` — 商品 SKU
- `categories` — 分类
- `product_images` — 商品图片
- `product_reviews` — 商品评价
- `cart_items` — 购物车

**API 前缀**：`/api/products/*`、`/api/categories/*`、`/api/cart/*`

**对外 API（供其他服务调用）**：
| API | 方法 | 说明 |
|-----|------|------|
| `/api/products/:id` | GET | 获取商品详情 |
| `/api/products/batch` | POST | 批量获取商品 |
| `/api/products/skus/:id` | GET | 获取 SKU 详情 |
| `/api/products/skus/batch` | POST | 批量获取 SKU |
| `/api/products/stock/deduct` | POST | 扣减库存（内部调用） |
| `/api/products/stock/restore` | POST | 归还库存（内部调用） |
| `/api/products/stock/check` | POST | 库存检查（内部调用） |
| `/api/products/sales/increment` | POST | 增加销量（内部调用） |

---

#### 订单服务（order-service）

**职责范围**：
- 订单创建、查询、取消
- 订单状态管理（状态机）
- 订单超时自动取消
- 订单评价
- 订单退款
- 购物车结算（预下单）

**数据库表**：
- `orders` — 订单主表
- `order_items` — 订单商品项
- `order_logs` — 订单操作日志
- `order_coupons` — 订单优惠券使用记录

**API 前缀**：`/api/orders/*`

**对外 API（供其他服务调用）**：
| API | 方法 | 说明 |
|-----|------|------|
| `/api/orders/:id` | GET | 获取订单详情 |
| `/api/orders/user/:userId` | GET | 获取用户订单列表 |
| `/api/orders/internal/status` | PUT | 更新订单状态（内部调用） |

---

### 2.3 共享模块（@gexm/shared）

**位置**：`packages/shared/`

**包含内容**：
- 通用类型定义
- 通用工具函数
- 平台判断工具
- 错误码常量
- API 响应格式

**依赖关系**：所有微服务均可依赖 `@gexm/shared`，但 `@gexm/shared` 不可依赖任何微服务。

---

## 三、服务间通信设计

### 3.1 通信模式

| 场景 | 通信模式 | 实现方式 |
|------|----------|----------|
| 同步查询（如获取用户信息） | 同步 HTTP | REST API + 服务发现 |
| 异步事件（如下单后扣积分） | 异步消息 | 消息队列（RabbitMQ/Kafka） |
| 批量数据同步 | 异步消息 | 消息队列 + 事件溯源 |

### 3.2 服务间 HTTP 调用封装

```typescript
// packages/shared/src/http/client.ts
export interface ServiceClientOptions {
  baseUrl: string
  timeout?: number
  retries?: number
}

export class ServiceHttpClient {
  constructor(private options: ServiceClientOptions) {}

  async get<T>(path: string, headers?: Record<string, string>): Promise<T>
  async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>
  async put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>
  async delete<T>(path: string, headers?: Record<string, string>): Promise<T>
}
```

### 3.3 内部服务调用鉴权

- 采用 **Service-to-Service Token** 机制
- 每个服务有独立的 service-id 和 service-secret
- 内部调用时携带 `X-Service-Token` 请求头
- API Gateway 负责验证外部请求并剥离内部 token

### 3.4 消息队列事件契约

#### 用户服务事件

| 事件名 | 载荷 | 触发时机 |
|--------|------|----------|
| `user.created` | `{ userId, username, email, phone, createdAt }` | 用户注册 |
| `user.updated` | `{ userId, fields: string[], updatedAt }` | 用户资料更新 |
| `user.points.changed` | `{ userId, points, change, reason }` | 积分变更 |

#### 商品服务事件

| 事件名 | 载荷 | 触发时机 |
|--------|------|----------|
| `product.stock.changed` | `{ productId, skuId, stock, changedBy }` | 库存变更 |
| `product.created` | `{ productId, name, categoryId }` | 商品上架 |
| `product.updated` | `{ productId, fields: string[] }` | 商品更新 |

#### 订单服务事件

| 事件名 | 载荷 | 触发时机 |
|--------|------|----------|
| `order.created` | `{ orderId, orderNo, userId, payAmount, items }` | 订单创建 |
| `order.paid` | `{ orderId, orderNo, userId, paidAt }` | 订单支付 |
| `order.cancelled` | `{ orderId, orderNo, userId, reason }` | 订单取消 |
| `order.completed` | `{ orderId, orderNo, userId, completedAt }` | 订单完成 |

---

## 四、数据隔离与一致性

### 4.1 数据隔离原则

- 每个服务拥有独立数据库（或独立 Schema）
- 服务之间不允许直接访问对方数据库
- 数据通过 API 或消息队列同步

### 4.2 分布式事务方案

**采用 Saga 模式（编排式）**：

以「订单创建」为例：

```
Step 1: 创建订单（订单服务）
  → 成功：继续
  → 失败：终止，返回错误

Step 2: 扣减库存（商品服务）
  → 成功：继续
  → 失败：回滚 Step 1（取消订单）

Step 3: 扣减积分（用户服务）
  → 成功：完成
  → 失败：回滚 Step 2（归还库存）+ 回滚 Step 1（取消订单）
```

**Saga 协调器**：订单服务作为协调器，负责编排整个流程。

### 4.3 数据一致性保障

| 层级 | 机制 |
|------|------|
| 服务内部 | 数据库本地事务（ACID） |
| 服务间 | Saga + 补偿事务（最终一致性） |
| 缓存层 | 写穿透 + 失效通知（最终一致性） |
| 消息队列 | 幂等消费 + 至少一次投递 |

---

## 五、API 网关设计

### 5.1 网关职责

- 请求路由（按路径转发到对应服务）
- 统一鉴权（JWT 验证）
- 统一限流
- 统一日志
- 跨域处理
- 灰度发布（流量比例切换）

### 5.2 路由规则

| 路径前缀 | 目标服务 | 服务端口 |
|----------|----------|----------|
| `/api/auth/*` | user-service | 3001 |
| `/api/users/*` | user-service | 3001 |
| `/api/products/*` | product-service | 3002 |
| `/api/categories/*` | product-service | 3002 |
| `/api/cart/*` | product-service | 3002 |
| `/api/orders/*` | order-service | 3003 |
| `/api/payments/*` | order-service | 3003 |
| `/api/admin/*` | admin-service | 3004 |

### 5.3 网关实现方案

**推荐方案**：基于 Nginx + 自定义 Lua 脚本

**备选方案**：自建 Express 网关服务

**当前阶段**：先用 Nginx 配置实现，后续根据需要演进。

---

## 六、服务发现

### 6.1 方案选型

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| Nginx 静态配置 | 简单、可靠 | 不支持动态注册 | ⭐⭐⭐ 初期够用 |
| Consul | 功能完整、健康检查 | 引入新组件 | ⭐⭐⭐ 中期推荐 |
| Kubernetes Service | 云原生、自动化 | 依赖 K8s | ⭐⭐⭐⭐ 生产推荐 |

### 6.2 当前阶段方案

第二阶段采用 **Nginx 静态配置**，服务地址硬编码在 Nginx 配置中。第三阶段再引入服务发现组件。

---

## 七、拆分实施路线图

### 第一阶段：用户服务拆分（Sprint 11 前期）

- [ ] 用户服务独立部署并通过冒烟测试
- [ ] 用户服务独立数据库
- [ ] Nginx 路由配置转发
- [ ] 单点登录验证通过

### 第二阶段：商品服务拆分（Sprint 11 中期）

- [ ] 商品服务独立部署
- [ ] 商品数据库独立
- [ ] 库存扣减 API 内部化
- [ ] 订单服务通过 HTTP 调用商品服务

### 第三阶段：订单服务拆分（Sprint 11 后期）

- [ ] 订单服务独立部署
- [ ] 订单数据库独立
- [ ] Saga 协调器实现
- [ ] 完整下单链路联调

### 第四阶段：微服务治理（Sprint 12）

- [ ] 服务发现引入
- [ ] 链路追踪部署
- [ ] 灰度发布机制
- [ ] 监控告警完善

---

## 八、降级与容错策略

### 8.1 降级策略

| 场景 | 降级方式 |
|------|----------|
| 用户服务不可用 | 订单服务缓存用户基础信息，允许只读 |
| 商品服务不可用 | 订单服务拒绝下单，返回友好提示 |
| 消息队列不可用 | 切换为内存队列模式，本地重试 |
| Redis 不可用 | 降级为内存缓存 |

### 8.2 超时配置

| 调用类型 | 默认超时 | 可配置环境变量 |
|----------|----------|----------------|
| 服务间 HTTP 调用 | 5s | `SERVICE_HTTP_TIMEOUT` |
| 数据库查询 | 30s | `DB_QUERY_TIMEOUT` |
| 缓存操作 | 1s | `CACHE_TIMEOUT` |
| 消息发布 | 3s | `MQ_PUBLISH_TIMEOUT` |

### 8.3 熔断器

- 采用 **滑动窗口** 统计错误率
- 错误率 > 50% 触发熔断
- 熔断后每 30s 放 1 个请求探测恢复
- 连续 3 个成功请求则关闭熔断

---

## 九、安全设计

### 9.1 网络安全

- 服务间通信通过内网
- 敏感服务（数据库、缓存）不暴露公网
- API Gateway 暴露公网，作为唯一入口

### 9.2 认证授权

- 外部请求：JWT Token
- 服务间调用：Service Token
- 管理后台：Admin JWT + 权限校验

### 9.3 数据安全

- 用户密码 bcrypt 哈希
- 敏感字段（手机号、邮箱）加密存储
- 数据库定期备份
- 操作审计日志

---

## 十、监控与运维

### 10.1 监控指标

| 层级 | 指标 |
|------|------|
| 服务级 | QPS、响应时间、错误率、可用性 |
| 业务级 | 订单数、用户数、商品数、转化率 |
| 资源级 | CPU、内存、磁盘、网络 |
| 数据库 | 连接数、慢查询、锁等待 |
| 缓存 | 命中率、内存使用率、Key 数量 |

### 10.2 日志规范

- 统一日志格式（JSON）
- 统一 Trace ID（贯穿服务调用链路）
- 日志分级：ERROR、WARN、INFO、DEBUG

### 10.3 告警策略

- P0 故障（服务不可用）：立即告警，5 分钟响应
- P1 故障（性能下降、错误率升高）：15 分钟内响应
- P2 告警（资源使用率高）：工作时间处理

---

## 附录 A：服务端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| API Gateway | 3000 | 对外统一入口 |
| User Service | 3001 | 用户服务 |
| Product Service | 3002 | 商品服务 |
| Order Service | 3003 | 订单服务 |
| Admin Service | 3004 | 管理后台服务 |
| Notification Service | 3005 | 通知服务（后期） |
| Search Service | 3006 | 搜索服务（后期） |

---

## 附录 B：环境变量规范

所有服务统一遵循以下环境变量命名规范：

```
服务前缀_功能_参数
如：
  USER_SERVICE_PORT=3001
  USER_SERVICE_DB_PATH=./data/users.db
  ORDER_SERVICE_REDIS_HOST=localhost
  PRODUCT_SERVICE_MQ_URL=amqp://localhost
```
