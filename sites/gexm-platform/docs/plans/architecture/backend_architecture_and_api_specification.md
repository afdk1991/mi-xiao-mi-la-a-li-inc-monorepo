# 社区互动电商平台 - 后端服务架构与API接口规范

## 一、后端技术架构

### 1. 技术栈选型
- **核心框架**：Spring Boot 2.7.x + Spring Cloud 2021.x
- **服务注册与发现**：Nacos
- **配置中心**：Nacos Config
- **API网关**：Spring Cloud Gateway
- **负载均衡**：Ribbon
- **服务调用**：OpenFeign
- **熔断降级**：Sentinel
- **分布式事务**：Seata
- **消息队列**：RabbitMQ
- **搜索引擎**：Elasticsearch
- **缓存**：Redis
- **数据库**：MySQL 8.0
- **ORM框架**：MyBatis-Plus
- **权限认证**：Spring Security + JWT
- **日志系统**：ELK (Elasticsearch + Logstash + Kibana)
- **监控系统**：Prometheus + Grafana
- **链路追踪**：SkyWalking
- **容器化**：Docker + Kubernetes

### 2. 微服务架构图
```
┌───────────────┐      ┌───────────────┐      ┌────────────────┐
│   客户端请求    │ ──→ │   API网关      │ ──→ │  服务注册中心(Nacos) │
└───────────────┘      └──────┬────────┘      └────────────────┘
                             │
               ┌────────────┼────────────┐
               │            │            │
    ┌──────────▼─────┐ ┌────▼─────────┐ ┌▼──────────────┐
    │   用户服务     │ │  社区服务    │ │  电商服务     │
    └──────────┬─────┘ └────┬─────────┘ └┬──────────────┘
               │            │            │
    ┌──────────▼─────┐ ┌────▼─────────┐ ┌▼──────────────┐
    │   订单服务     │ │  团长服务    │ │  支付服务     │
    └──────────┬─────┘ └────┬─────────┘ └┬──────────────┘
               │            │            │
    ┌──────────▼─────┐ ┌────▼─────────┐ ┌▼──────────────┐
    │  搜索服务      │ │  本地服务    │ │ 文件存储服务  │
    └──────────┬─────┘ └────┬─────────┘ └┬──────────────┘
               │            │            │
               └────────────┼────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼──────┐        ┌───▼──────┐       ┌───▼──────┐
    │  MySQL   │        │  Redis   │       │RabbitMQ  │
    └──────────┘        └──────────┘       └──────────┘
```

### 3. 微服务模块划分

#### 3.1 服务模块与职责

| 服务名称 | 服务ID | 主要职责 | 对应数据库 |
| :--- | :--- | :--- | :--- |
| 用户服务 | user-service | 用户注册、登录、信息管理、积分等级 | user_db |
| 社区互动服务 | community-service | 帖子发布、评论、点赞、话题管理、视频分享、匿名交流 | community_db |
| 电商服务 | ecommerce-service | 商品管理、分类管理、SKU管理、订单处理、支付对接 | product_db, order_db, payment_db |
| 团长服务 | leader-service | 团长管理、佣金结算、订单处理 | leader_db |
| 内容管理服务 | content-service | 网站内容分类、网络数据采集、本地商家服务、需求众筹 | content_db |
| 搜索服务 | search-service | 商品搜索、帖子搜索 | elasticsearch |
| 文件存储服务 | storage-service | 图片、视频等文件上传下载 | - |
| 移动端支持服务 | mobile-service | 移动端适配、APP集成支持 | mobile_db |
| 管理后台服务 | admin-service | 系统管理、数据分析、运营功能 | admin_db |

#### 3.2 公共模块

| 模块名称 | 主要职责 |
| :--- | :--- |
| common-core | 核心依赖、工具类、常量定义 |
| common-security | 安全认证、JWT处理、权限控制 |
| common-exception | 异常处理、错误码定义 |
| common-db | 数据库连接池配置、ORM扩展 |
| common-mq | 消息队列配置、消息模板 |
| common-redis | Redis配置、缓存操作封装 |

## 二、各服务详细设计

### 1. 用户服务 (user-service)

#### 1.1 核心功能
- 用户注册/登录/登出
- 用户信息管理
- 地址管理
- 积分管理
- 等级体系
- 用户认证与授权

#### 1.2 数据模型
- User（用户基本信息）
- UserAddress（用户地址）
- UserPoints（积分记录）
- UserLevel（等级配置）

#### 1.3 API接口
```
# 用户认证相关
POST /api/v1/users/register - 用户注册
POST /api/v1/users/login - 用户登录
POST /api/v1/users/logout - 用户登出
GET /api/v1/users/me - 获取当前用户信息
PUT /api/v1/users/me - 更新用户信息

# 地址管理
GET /api/v1/users/addresses - 获取用户地址列表
POST /api/v1/users/addresses - 新增地址
PUT /api/v1/users/addresses/{id} - 更新地址
DELETE /api/v1/users/addresses/{id} - 删除地址
PUT /api/v1/users/addresses/{id}/default - 设置默认地址

# 积分管理
GET /api/v1/users/points - 获取积分明细
GET /api/v1/users/points/balance - 获取当前积分余额
POST /api/v1/users/points/exchange - 积分兑换
```

### 2. 社区服务 (community-service)

#### 2.1 核心功能
- 帖子发布/编辑/删除
- 评论管理
- 点赞/收藏/分享
- 话题管理
- 社区推荐算法

#### 2.2 数据模型
- Post（帖子）
- Comment（评论）
- Like（点赞记录）
- Collection（收藏记录）
- Topic（话题）

#### 2.3 API接口
```
# 帖子相关
GET /api/v1/posts - 获取帖子列表
POST /api/v1/posts - 发布帖子
GET /api/v1/posts/{id} - 获取帖子详情
PUT /api/v1/posts/{id} - 更新帖子
DELETE /api/v1/posts/{id} - 删除帖子
POST /api/v1/posts/{id}/like - 点赞帖子
DELETE /api/v1/posts/{id}/like - 取消点赞
POST /api/v1/posts/{id}/collect - 收藏帖子
DELETE /api/v1/posts/{id}/collect - 取消收藏

# 评论相关
GET /api/v1/posts/{postId}/comments - 获取帖子评论
POST /api/v1/posts/{postId}/comments - 发表评论
PUT /api/v1/comments/{id} - 更新评论
DELETE /api/v1/comments/{id} - 删除评论
POST /api/v1/comments/{id}/like - 点赞评论

# 话题相关
GET /api/v1/topics - 获取话题列表
GET /api/v1/topics/{id}/posts - 获取话题下的帖子
```

### 3. 电商服务 (ecommerce-service)

#### 3.1 核心功能
- 商品管理
- 分类管理
- SKU管理
- 商品搜索
- 商品推荐
- 库存管理

#### 3.2 数据模型
- Product（商品）
- Category（分类）
- ProductSku（商品SKU）
- ProductAttribute（商品属性）

#### 3.3 API接口
```
# 商品相关
GET /api/v1/products - 获取商品列表
GET /api/v1/products/hot - 获取热门商品
GET /api/v1/products/new - 获取新品
GET /api/v1/products/{id} - 获取商品详情
GET /api/v1/products/{id}/skus - 获取商品SKU列表
GET /api/v1/products/community-price - 获取社区专属价

# 分类相关
GET /api/v1/categories - 获取分类列表
GET /api/v1/categories/{id}/products - 获取分类下商品

# 搜索相关
GET /api/v1/search/products - 搜索商品
GET /api/v1/search/suggestions - 获取搜索建议
```

### 4. 订单服务 (order-service)

#### 4.1 核心功能
- 订单创建
- 订单查询
- 订单状态管理
- 订单取消
- 订单统计
- 取货码管理

#### 4.2 数据模型
- Order（订单）
- OrderItem（订单项）
- OrderLog（订单日志）

#### 4.3 API接口
```
# 订单相关
POST /api/v1/orders - 创建订单
GET /api/v1/orders - 获取订单列表
GET /api/v1/orders/{id} - 获取订单详情
POST /api/v1/orders/{id}/cancel - 取消订单
POST /api/v1/orders/{id}/complete - 完成订单
GET /api/v1/orders/{id}/logistics - 查询订单物流

# 取货码相关
GET /api/v1/orders/{id}/pickup-code - 获取取货码
POST /api/v1/orders/verify-pickup-code - 验证取货码

# 订单统计
GET /api/v1/orders/stats - 获取订单统计信息
```

### 5. 团长服务 (leader-service)

#### 5.1 核心功能
- 团长申请/审核
- 团长信息管理
- 佣金结算
- 订单处理
- 绩效分析

#### 5.2 数据模型
- Leader（团长信息）
- LeaderApplication（团长申请）
- Commission（佣金记录）
- LeaderStats（团长统计）

#### 5.3 API接口
```
# 团长申请
POST /api/v1/leaders/apply - 提交团长申请
GET /api/v1/leaders/apply/status - 查询申请状态

# 团长信息
GET /api/v1/leaders/me - 获取当前团长信息
PUT /api/v1/leaders/me - 更新团长信息
GET /api/v1/leaders/nearby - 获取附近团长
GET /api/v1/leaders/{id} - 获取团长详情

# 佣金结算
GET /api/v1/leaders/commission - 获取佣金明细
POST /api/v1/leaders/commission/withdraw - 申请提现

# 团长订单
GET /api/v1/leaders/orders - 获取团长订单
POST /api/v1/leaders/orders/{id}/verify - 核销订单

# 绩效分析
GET /api/v1/leaders/stats - 获取团长统计数据
```

### 6. 支付服务 (payment-service)

#### 6.1 核心功能
- 支付下单
- 支付回调
- 支付查询
- 退款处理
- 账单管理

#### 6.2 数据模型
- Payment（支付记录）
- Refund（退款记录）

#### 6.3 API接口
```
# 支付相关
POST /api/v1/payments - 创建支付订单
GET /api/v1/payments/{id}/status - 查询支付状态
POST /api/v1/payments/{id}/cancel - 取消支付

# 退款相关
POST /api/v1/refunds - 申请退款
GET /api/v1/refunds/{id} - 查询退款状态

# 账单相关
GET /api/v1/account/bills - 获取账单记录
```

## 三、API接口设计规范

### 1. RESTful API 设计原则
- **资源命名**：使用名词复数形式表示资源
- **HTTP方法**：
  - GET：获取资源
  - POST：创建资源
  - PUT：更新资源
  - DELETE：删除资源
  - PATCH：部分更新资源
- **状态码**：
  - 2xx：成功
    - 200 OK：成功
    - 201 Created：创建成功
    - 204 No Content：无内容
  - 4xx：客户端错误
    - 400 Bad Request：请求参数错误
    - 401 Unauthorized：未授权
    - 403 Forbidden：禁止访问
    - 404 Not Found：资源不存在
    - 405 Method Not Allowed：方法不允许
  - 5xx：服务器错误
    - 500 Internal Server Error：服务器内部错误
    - 502 Bad Gateway：网关错误
    - 503 Service Unavailable：服务不可用

### 2. 统一响应格式
```json
{
  "code": "000000", // 响应码
  "message": "success", // 响应消息
  "data": {}, // 响应数据
  "timestamp": 1633046400000, // 时间戳
  "traceId": "a1b2c3d4e5f6"
}
```

### 3. 分页请求规范
```
GET /api/v1/resource?page=1&pageSize=10&sortBy=createdAt&sortOrder=desc
```

### 4. 分页响应规范
```json
{
  "code": "000000",
  "message": "success",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### 5. 错误码规范
- **格式**：6位数字，前2位表示服务模块，后4位表示具体错误
- **示例**：
  - 000000：成功
  - 010001：用户服务 - 用户名已存在
  - 020001：社区服务 - 帖子不存在
  - 030001：电商服务 - 商品库存不足

## 四、数据库与缓存设计

### 1. 数据库设计
- **主从架构**：一主多从，读写分离
- **分库分表**：
  - 垂直分库：按业务模块分库
  - 水平分表：订单表按月分表
- **索引优化**：
  - 合理创建索引，避免全表扫描
  - 复合索引遵循最左前缀原则
  - 定期优化和重建索引

### 2. Redis缓存设计
- **缓存策略**：
  - 热点数据缓存：商品详情、热门帖子
  - 用户会话缓存：用户登录状态、购物车
  - 分布式锁：库存扣减、订单创建
- **缓存更新策略**：
  - 双写一致性：写数据库后更新缓存
  - 延迟双删：写数据库后删除缓存，延迟一段时间后再次删除
- **缓存穿透**：使用布隆过滤器或空值缓存
- **缓存雪崩**：设置随机过期时间、多级缓存
- **缓存击穿**：热点数据永不过期或加锁保护

## 五、安全架构

### 1. 身份认证与授权
- **JWT认证**：无状态认证，便于水平扩展
- **OAuth2.0**：第三方授权登录（微信、支付宝）
- **RBAC权限模型**：基于角色的访问控制
- **权限注解**：@PreAuthorize、@Secured等注解控制接口访问

### 2. 数据安全
- **数据加密**：
  - 敏感数据加密存储（如用户密码、身份证号）
  - 传输层加密（HTTPS）
  - 支付信息加密传输
- **数据脱敏**：
  - 接口返回数据脱敏（手机号、身份证号）
  - 日志脱敏

### 3. 接口安全
- **接口限流**：防止恶意请求和DoS攻击
- **CSRF防护**：防止跨站请求伪造
- **XSS防护**：防止跨站脚本攻击
- **SQL注入防护**：使用参数化查询、ORM框架
- **接口签名**：防止接口被篡改

### 4. 安全审计
- **操作日志**：记录关键操作
- **登录日志**：记录登录信息
- **异常日志**：记录异常信息

## 六、消息队列设计

### 1. RabbitMQ 消息设计

| 消息类型 | 交换机 | 路由键 | 队列 | 处理服务 | 功能描述 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 订单创建 | order.exchange | order.created | order.created.queue | order-service | 创建订单 |
| 订单支付 | order.exchange | order.paid | order.paid.queue | order-service | 订单支付成功处理 |
| 订单取消 | order.exchange | order.canceled | order.canceled.queue | order-service | 订单取消处理 |
| 库存扣减 | inventory.exchange | inventory.deduct | inventory.deduct.queue | ecommerce-service | 扣减商品库存 |
| 库存回滚 | inventory.exchange | inventory.rollback | inventory.rollback.queue | ecommerce-service | 库存回滚 |
| 积分变动 | points.exchange | points.change | points.change.queue | user-service | 用户积分变动 |
| 佣金结算 | commission.exchange | commission.settle | commission.settle.queue | leader-service | 团长佣金结算 |
| 消息通知 | notification.exchange | notification.send | notification.send.queue | notification-service | 发送消息通知 |

### 2. 消息可靠性保障
- **消息持久化**：交换机、队列、消息持久化
- **消费者确认机制**：手动确认ACK
- **消息重试机制**：失败重试策略
- **死信队列**：处理多次失败的消息
- **事务性消息**：保证消息与数据库操作的一致性

## 七、部署架构

### 1. 容器化部署
- **Docker**：服务容器化
- **Kubernetes**：容器编排和管理
- **Helm**：K8s应用包管理

### 2. 微服务部署架构
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  负载均衡    │ ──> │   API网关    │ ──> │  服务集群    │
│   Nginx      │     │  (Gateway)   │     │ (多实例部署) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                ┌─────────────────────┐
                                │      中间件集群     │
                                │ (Redis/RabbitMQ/ES) │
                                └─────────────────────┘
                                               │
                                               ▼
                                ┌─────────────────────┐
                                │      数据库集群     │
                                │      (MySQL)        │
                                └─────────────────────┘
```

### 3. 监控与告警
- **Prometheus**：监控指标收集
- **Grafana**：可视化监控面板
- **Alertmanager**：告警管理
- **SkyWalking**：分布式链路追踪
- **ELK**：日志收集与分析

## 八、性能优化策略

### 1. 数据库优化
- **索引优化**：合理创建和使用索引
- **查询优化**：优化SQL语句，避免N+1查询
- **连接池优化**：合理配置连接池参数
- **数据分区**：大表分区存储
- **读写分离**：读请求分发到从库

### 2. 缓存优化
- **多级缓存**：本地缓存 + Redis
- **缓存预热**：系统启动时加载热点数据
- **缓存更新策略**：合理选择更新策略
- **缓存容量规划**：避免内存溢出

### 3. 服务优化
- **异步处理**：非核心流程异步化
- **批量处理**：合并批量操作
- **资源池化**：线程池、连接池等
- **超时控制**：设置合理的超时时间
- **熔断降级**：防止服务雪崩

### 4. JVM优化
- **内存分配**：合理配置堆内存大小
- **GC策略**：选择合适的垃圾收集器
- **类加载优化**：减少类加载时间
- **内存泄漏监控**：及时发现和解决内存泄漏

## 九、接口文档示例

### 1. 商品列表接口

#### 请求URL
`GET /api/v1/products`

#### 请求参数
| 参数名 | 类型 | 必填 | 描述 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| page | int | 否 | 页码，默认1 | 1 |
| pageSize | int | 否 | 每页数量，默认10 | 10 |
| categoryId | long | 否 | 分类ID | 1001 |
| minPrice | decimal | 否 | 最低价格 | 9.9 |
| maxPrice | decimal | 否 | 最高价格 | 999.9 |
| sortBy | string | 否 | 排序字段 | salesCount |
| sortOrder | string | 否 | 排序方式 | desc |

#### 响应参数
```json
{
  "code": "000000",
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "有机蔬菜礼盒",
        "categoryId": 1001,
        "mainImage": "https://example.com/images/vegetable.jpg",
        "originalPrice": 199.00,
        "currentPrice": 159.00,
        "communityPrice": 149.00,
        "salesCount": 1234,
        "stock": 500,
        "communityBuyingCount": 32
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### 2. 创建订单接口

#### 请求URL
`POST /api/v1/orders`

#### 请求头
| 名称 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| Authorization | string | 是 | Bearer token |

#### 请求体
```json
{
  "leaderId": 101,
  "items": [
    {
      "productId": 1,
      "skuId": 1001,
      "quantity": 2,
      "price": 149.00
    }
  ],
  "addressId": 10001,
  "paymentMethod": 1,
  "remark": "请尽快配送"
}
```

#### 响应参数
```json
{
  "code": "000000",
  "message": "success",
  "data": {
    "orderId": 10001,
    "orderSn": "2024010112345678",
    "totalAmount": 298.00,
    "actualPayAmount": 298.00,
    "paymentUrl": "https://payment.example.com/pay?orderId=10001",
    "expireTime": 1633047300000
  }
}
```

## 十、开发与集成规范

### 1. 代码规范
- **Java编码规范**：遵循阿里巴巴Java开发手册
- **Git工作流**：Git Flow或GitHub Flow
- **提交规范**：Conventional Commits

### 2. 接口开发流程
- 定义API接口规范
- 编写接口文档
- 前后端并行开发
- 接口测试
- 集成测试

### 3. 环境规范
- **开发环境**：本地开发、Docker环境
- **测试环境**：功能测试、性能测试
- **预发布环境**：生产环境预验证
- **生产环境**：线上正式环境

### 4. 发布流程
- 代码合并到主分支
- 自动化构建
- 自动化测试
- 灰度发布
- 全量发布
- 发布验证
