# Gexm 全平台应用系统 - 架构与集成分析文档

**文档版本**：v1.0
**生成日期**：2026-06-28
**分析范围**：整个 monorepo 项目（server、app、desktop、shared）

---

## 1. 整体架构概览

### 1.1 Monorepo 架构说明

Gexm 项目采用基于 npm workspaces 的 Monorepo 架构，将多个相关但独立的子包统一管理在一个代码仓库中。

#### 目录结构

```
gexm/
├── packages/
│   ├── server/          # 后端服务（Express.js + SQLite）
│   ├── app/             # 前端应用（uni-app + Vue3）
│   ├── desktop/         # 桌面应用（Electron）
│   └── shared/          # 共享模块（TypeScript 类型/常量/工具）
├── docs/                # 技术文档
├── package.json         # 根配置（monorepo workspaces）
└── README.md
```

#### Monorepo 管理方式

- **包管理**：使用 npm workspaces 统一管理依赖
- **脚本调度**：根目录提供统一的开发/构建脚本
- **命名空间**：子包统一使用 `@gexm/` 前缀
- **并行开发**：支持同时启动前后端开发服务

#### 根级脚本

| 脚本命令 | 说明 |
|----------|------|
| `npm run dev` | 同时启动后端服务和 H5 前端开发 |
| `npm run dev:all` | 启动后端、H5 前端、桌面端全部服务 |
| `npm run build:app-h5` | 构建 H5 版本 |
| `npm run build:app-mp-weixin` | 构建微信小程序 |
| `npm run lint` | 全量代码检查 |
| `npm run test` | 运行所有子包测试 |

### 1.2 前后端分离架构图（文字描述）

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层（Client）                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ iOS APP │ │ Android │ │ 小程序  │ │   H5    │ │ 桌面端  │  │
│  │(uni-app)│ │(uni-app)│ │(uni-app)│ │(uni-app)│ │(Electron)│  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       └───────────┴───────────┴───────────┴───────────┘        │
│                              │                                   │
│                    Pinia 状态管理层                              │
│                    API 请求封装层（request.js）                   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                       RESTful API + WebSocket
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                       接口层（API Gateway）                      │
│  Express.js Router + 中间件链（CORS/限流/认证/CSRF/XSS）        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    业务逻辑层（Service/Controller）              │
│  Controllers（请求处理） → Services（业务编排） → Models（数据） │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      数据访问层（Model/DAO）                     │
│                  better-sqlite3 + SQLite 数据库                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 技术选型说明与理由

#### 前端技术栈

| 技术 | 选型 | 理由 |
|------|------|------|
| 框架 | Vue 3 + Composition API | 轻量、高性能、生态成熟 |
| 跨端方案 | uni-app (Vue3版) | 一套代码多端运行，支持H5/小程序/APP |
| 状态管理 | Pinia 2.1.7 | Vue官方推荐，轻量且TypeScript友好 |
| 构建工具 | Vite 5.x | 开发体验好，冷启动快 |
| 样式方案 | SCSS | 强大的CSS预处理器，支持变量和混合 |
| 组件库 | 自定义组件库（gexm-* 前缀） | 统一设计语言，按需定制 |

#### 后端技术栈

| 技术 | 选型 | 理由 |
|------|------|------|
| Web框架 | Express.js 4.x | 轻量、灵活、生态丰富 |
| 数据库 | SQLite (better-sqlite3) | 嵌入式数据库，零配置，适合中小规模 |
| ORM/驱动 | better-sqlite3 | 同步API，性能优异，事务支持好 |
| 认证 | JWT + Refresh Token | 无状态认证，便于水平扩展 |
| 密码加密 | bcryptjs | 行业标准的密码哈希算法 |
| 实时通信 | Socket.IO 4.x | 成熟的WebSocket库，兼容性好 |
| 文件上传 | Multer | Express生态标准中间件 |
| 日志 | Winston 3.x | 结构化日志，多传输支持 |
| 安全 | Helmet + 自定义中间件 | 安全头、XSS过滤、CSRF防护 |
| 限流 | express-rate-limit | 防止暴力破解和API滥用 |

#### 桌面端技术栈

| 技术 | 选型 | 理由 |
|------|------|------|
| 框架 | Electron | 跨平台桌面应用，复用前端代码 |
| 渲染层 | uni-app H5 构建产物 | 最大化代码复用 |
| 进程通信 | IPC Main / Renderer | Electron标准通信方式 |

### 1.4 系统边界与外部依赖

#### 系统边界

**内部模块**：
- 用户认证与授权系统
- 商品管理与展示系统
- 购物车与订单系统
- 支付系统（模拟实现）
- 会员与积分系统
- 优惠券营销系统
- 秒杀活动系统
- 即时通讯系统
- 通知与站内信系统
- 内容评论系统
- 签到系统
- 后台管理系统

**外部依赖**：

| 依赖类型 | 依赖项 | 说明 |
|----------|--------|------|
| 支付网关 | 微信支付/支付宝 | 当前为模拟实现，预留集成接口 |
| 物流服务 | 第三方物流API | 物流轨迹查询（预留） |
| 推送服务 | 微信/APP推送 | 消息推送（预留） |
| 文件存储 | 本地文件系统 | 当前为本地存储，可扩展为OSS |
| 短信服务 | 短信运营商 | 验证码/通知短信（预留） |
| 邮件服务 | SMTP服务 | 邮件通知（预留） |

---

## 2. 系统架构分层

### 2.1 表现层（Frontend）

#### 2.1.1 uni-app 多端适配

**多端编译目标**：

| 平台 | 编译命令 | 代码复用率 |
|------|----------|------------|
| H5 网页 | `npm run build:h5` | ~95% |
| 微信小程序 | `npm run build:mp-weixin` | ~85% |
| 支付宝小程序 | `npm run build:mp-alipay` | ~85% |
| 百度小程序 | `npm run build:mp-baidu` | ~85% |
| 抖音小程序 | `npm run build:mp-toutiao` | ~85% |
| APP (iOS/Android) | `npm run build:app` | ~90% |

**平台差异化处理**：
- 使用条件编译（`#ifdef` / `#ifndef`）处理平台差异
- CSRF Token 仅在 H5 端从 Cookie 读取
- 系统信息、网络状态通过 uni API 统一获取

#### 2.1.2 页面组件化架构

**页面路由结构**（pages.json）：

```
主包页面（TabBar 页面）：
├── pages/index/index          # 首页
├── pages/category/category    # 分类页
├── pages/cart/cart            # 购物车
└── pages/profile/profile      # 我的

业务页面：
├── pages/product/list         # 商品列表
├── pages/product/detail       # 商品详情
├── pages/order/order-list     # 订单列表
├── pages/order/order-detail   # 订单详情
├── pages/order/order-confirm  # 确认订单
├── pages/payment/payment      # 支付页面
├── pages/chat/conversations   # 会话列表
├── pages/chat/chat            # 对话页面
├── pages/chat/ai-chat         # AI助手
├── pages/coupon/coupon-list   # 优惠券中心
├── pages/coupon/coupon-mine   # 我的优惠券
├── pages/member/member-center # 会员中心
├── pages/checkin/checkin      # 每日签到
├── pages/flash-sale/flash-sale # 限时秒杀
├── pages/inbox/inbox-list     # 站内信列表
├── pages/admin/dashboard      # 管理后台
└── ...
```

**组件库体系**：

| 组件前缀 | 用途 | 示例 |
|----------|------|------|
| `gexm-` | 通用UI组件 | gexm-button, gexm-card, gexm-input |
| `home-` | 业务组件 | home-banner, home-product-grid |

**通用组件清单**（16个）：
- gexm-button - 按钮组件
- gexm-card - 卡片组件
- gexm-chat-input - 聊天输入框
- gexm-chat-list - 聊天列表
- gexm-empty - 空状态
- gexm-image-lazy - 懒加载图片
- gexm-input - 输入框
- gexm-list-item - 列表项
- gexm-loading - 加载状态
- gexm-message-item - 消息项
- gexm-nav-bar - 导航栏
- gexm-product-card - 商品卡片
- gexm-sku-selector - SKU选择器
- gexm-system-status - 系统状态栏
- gexm-tab-bar - 底部标签栏
- gexm-toast - 轻提示

#### 2.1.3 状态管理模式

**Pinia Store 架构**：

| Store 模块 | 职责 | 状态数据 |
|-----------|------|----------|
| `app` | 应用全局状态 | 版本、平台、系统信息、网络状态、主题、加载状态 |
| `user` | 用户认证状态 | token、refreshToken、用户信息 |
| `product` | 商品状态 | 商品列表、当前商品、SKU列表 |
| `category` | 分类状态 | 分类树、当前分类、分类商品 |
| `cart` | 购物车状态 | 购物车商品列表、选中状态、总价计算 |
| `favorite` | 收藏状态 | 收藏列表 |
| `address` | 地址状态 | 地址列表、默认地址、当前地址 |
| `order` | 订单状态 | 订单列表、当前订单、订单详情、物流信息 |
| `chat` | 对话状态 | 会话列表、当前会话、消息列表、未读数 |
| `comment` | 评论状态 | 评论列表、分页信息 |

**状态持久化**：
- 用户 Token 与信息：`uni.setStorageSync` 本地存储
- 当前会话：`gexm_current_conversation` 存储键
- 恢复机制：应用启动时从 Storage 初始化

**状态流转示例（购物车）**：

```
用户操作 → 组件调用 action → API 请求 → 
  更新 store state → 响应式更新视图 → 
    （可选）持久化到本地存储
```

#### 2.1.4 API请求层设计

**请求封装架构**（`src/api/request.js`）：

```
┌─────────────────────────────────────────────┐
│              业务 API 模块                    │
│  auth.js / product.js / order.js / ...       │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           http 统一请求封装                   │
│  ┌───────────────────────────────────────┐  │
│  │  请求拦截器                            │  │
│  │  - 添加 Authorization header          │  │
│  │  - 添加 X-CSRF-Token（写操作）         │  │
│  │  - 显示 Loading                       │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  响应拦截器                            │  │
│  │  - 统一处理 code === 0 成功           │  │
│  │  - 自动处理 Token 过期刷新             │  │
│  │  - 统一错误提示（uni.showToast）      │  │
│  │  - 隐藏 Loading                       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**请求方法**：
- `http.get(url, data, options)`
- `http.post(url, data, options)`
- `http.put(url, data, options)`
- `http.delete(url, data, options)`

**Token 自动刷新机制**：

```
请求返回 1007/1008 (Token过期/无效)
    │
    ├─ 有 refreshToken → 调用 /auth/refresh → 
    │     ├─ 成功 → 更新 token → 重试原请求
    │     └─ 失败 → 清除登录态 → 跳转登录页
    │
    └─ 无 refreshToken → 清除登录态 → 跳转登录页
```

**统一响应格式**：
```javascript
{
  code: 0,           // 0=成功，非0=错误码
  message: '成功',   // 提示信息
  data: { ... },     // 业务数据
  timestamp: 123456  // 时间戳
}
```

### 2.2 接口层（API Gateway）

#### 2.2.1 RESTful API设计规范

**路由组织方式**：

```
/api/
├── auth/              # 认证模块
│   ├── POST /login          # 登录
│   ├── POST /register       # 注册
│   ├── POST /refresh        # 刷新Token
│   ├── POST /logout         # 登出
│   ├── GET /profile         # 获取个人信息
│   ├── PUT /profile         # 更新个人信息
│   └── PUT /password        # 修改密码
│
├── users/             # 用户管理（管理员）
│   ├── GET /                # 用户列表
│   ├── GET /:id             # 用户详情
│   ├── POST /               # 创建用户
│   ├── PUT /:id             # 更新用户
│   └── DELETE /:id          # 删除用户
│
├── products/          # 商品模块
│   ├── GET /                # 商品列表
│   ├── GET /:id             # 商品详情
│   ├── GET /:id/skus        # 商品SKU
│   ├── GET /:id/reviews     # 商品评价
│   └── ...（管理员接口）
│
├── categories/        # 分类模块
├── cart/              # 购物车模块
├── orders/            # 订单模块
├── payment/           # 支付模块
├── chat/              # 对话模块
├── notifications/     # 通知模块
├── coupons/           # 优惠券模块
├── members/           # 会员模块
├── checkins/          # 签到模块
├── flash-sales/       # 秒杀模块
├── inbox/             # 站内信模块
├── admin/             # 后台管理
└── ...
```

#### 2.2.2 路由组织方式

**分层路由结构**（`src/app.js`）：

```
Express App
    │
    ├─ 全局中间件
    │   ├─ helmet（安全头）
    │   ├─ cors（跨域）
    │   ├─ cookie-parser
    │   ├─ express.json（请求体解析）
    │   ├─ apiLimiter（全局限流）
    │   ├─ xssFilterMiddleware（XSS过滤）
    │   ├─ securityHeadersMiddleware（安全头）
    │   ├─ sanitizeInputMiddleware（输入清理）
    │   ├─ csrfTokenMiddleware（CSRF Token生成）
    │   └─ requestLogger（请求日志）
    │
    └─ 路由挂载
        ├─ /api/auth → authRoutes
        ├─ /api/users → userRoutes
        ├─ /api/products → productRoutes
        ├─ /api/categories → categoryRoutes
        ├─ /api/cart → cartRoutes
        ├─ /api/orders → orderRoutes
        ├─ /api/payment → paymentRoutes
        ├─ /api/chat → chatRoutes
        ├─ /api/notifications → notificationRoutes
        ├─ /api/admin → adminRoutes
        └─ ...
```

**路由内部分层**（以 orders.js 为例）：

```javascript
// 1. 创建路由实例
const router = express.Router();

// 2. 全局中间件（该路由下所有接口）
router.use(authMiddleware);

// 3. 具体路由定义
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderDetail);
router.post('/', orderController.createOrder);
router.patch('/:id/cancel', orderController.cancelOrder);

// 4. 导出路由
module.exports = router;
```

#### 2.2.3 请求/响应统一格式

**成功响应**：
```javascript
successResponse(res, data, message = 'success', code = 0, statusCode = 200)

// 返回结构
{
  code: 0,
  message: "操作成功",
  data: { ... },
  timestamp: 1719532800000
}
```

**错误响应**：
```javascript
errorResponse(res, message, code = 1001, statusCode = 400)

// 返回结构
{
  code: 1001,
  message: "参数错误",
  data: null,
  timestamp: 1719532800000
}
```

**常见错误码**：

| 错误码 | 说明 | HTTP状态码 |
|--------|------|-----------|
| 0 | 成功 | 200 |
| 1001 | 参数错误/请求失败 | 400 |
| 1002 | 用户不存在 | 401 |
| 1003 | 无权限/账号禁用 | 403 |
| 1004 | 资源不存在 | 404 |
| 1005 | 服务器内部错误 | 500 |
| 1007 | Token已过期 | 401 |
| 1008 | Token无效 | 401 |
| 1020 | 请求过于频繁 | 429 |
| 1021 | 登录尝试过于频繁 | 429 |
| 6003 | CSRF token无效 | 403 |
| 6004 | CSRF token缺失 | 403 |

#### 2.2.4 版本管理策略

当前版本采用 URL 前缀方式预留版本管理能力：
- 统一通过 `/api/` 前缀访问
- 未来可扩展为 `/api/v1/`、`/api/v2/`
- 通过路由中间件实现版本切换

### 2.3 业务逻辑层（Service/Controller）

#### 2.3.1 控制器职责

**Controller 层定位**：请求处理入口，负责参数校验、调用 Service、返回响应

**典型控制器结构**：

```javascript
const xxxController = {
  async getList(req, res) {
    // 1. 解析并校验参数
    const { page = 1, pageSize = 10 } = req.query;
    
    // 2. 调用 Service/Model 处理业务
    const result = xxxModel.findAll({ page, pageSize });
    
    // 3. 返回统一响应
    return successResponse(res, result, '获取成功');
  },
  
  async create(req, res) {
    // 1. 从 req.body 获取数据
    // 2. 从 req.userId 获取当前用户
    // 3. 业务校验
    // 4. 执行业务操作
    // 5. 返回结果
  },
};
```

**控制器清单**：

| 控制器 | 主要职责 | 文件位置 |
|--------|----------|----------|
| authController | 登录、注册、Token刷新、个人信息 | authController.js |
| userController | 用户CRUD（管理员） | userController.js |
| productController | 商品管理 | productController.js |
| categoryController | 分类管理 | categoryController.js |
| cartController | 购物车操作 | cartController.js |
| orderController | 订单创建、查询、取消 | orderController.js |
| paymentController | 支付发起、回调、查询 | paymentController.js |
| chatController | 会话、消息、评论 | chatController.js |
| reviewController | 商品评价 | reviewController.js |
| addressController | 收货地址管理 | addressController.js |
| favoriteController | 收藏管理 | favoriteController.js |
| notificationController | 通知管理 | notificationController.js |
| couponController | 优惠券管理 | couponController.js |
| memberController | 会员与积分 | memberController.js |
| checkinController | 签到功能 | checkinController.js |
| flashSaleController | 秒杀活动 | flashSaleController.js |
| inboxController | 站内信 | inboxController.js |
| adminController | 后台管理汇总 | adminController.js |
| shippingController | 运费模板 | shippingController.js |
| reconciliationController | 支付对账 | reconciliationController.js |

#### 2.3.2 服务层职责

**Service 层定位**：业务逻辑编排，复杂事务处理，跨模型操作

**现有 Service**：

| 服务 | 职责 | 文件位置 |
|------|------|----------|
| orderService | 订单业务编排（创建/取消/退款等复杂流程） | services/orderService.js |

**orderService 核心能力**：

| 方法 | 功能说明 |
|------|----------|
| `getCartItems(userId, cartItemIds)` | 获取待结算的购物车商品 |
| `getDirectBuyItems(items)` | 获取直接购买的商品信息 |
| `calculateAmount(items, freight)` | 计算订单金额 |
| `previewOrder(userId, params)` | 订单预览（不创建订单） |
| `createOrder(userId, params)` | 创建订单（含库存扣减、事务） |
| `cancelOrder(orderId, userId, reason)` | 取消订单（库存回滚） |
| `confirmReceive(orderId, userId)` | 确认收货 |
| `shipOrder(orderId, logistics)` | 发货（管理员） |
| `applyRefund(orderId, userId, params)` | 申请退款 |
| `auditRefund(orderId, params)` | 审核退款（管理员） |

#### 2.3.3 业务流程编排

以 **创建订单** 为例的流程编排：

```
orderService.createOrder()
    │
    ├─ 1. 参数校验（地址是否存在、商品是否有效）
    │
    ├─ 2. 获取商品数据
    │   ├─ 购物车结算 → 从 carts 表查询选中商品
    │   └─ 直接购买 → 按 productId/skuId 查询商品
    │
    ├─ 3. 计算金额
    │   ├─ 商品总价 = Σ(单价 × 数量)
    │   ├─ 运费计算（预留）
    │   └─ 实付金额 = 商品总价 + 运费 - 优惠
    │
    └─ 4. 事务执行（db.transaction）
        ├─ a. 校验并扣减库存（products + product_skus）
        ├─ b. 创建订单（orders 表）
        ├─ c. 创建订单商品（order_items 表）
        └─ d. 清除购物车（仅购物车结算方式）
```

#### 2.3.4 事务处理策略

**事务实现**：使用 `better-sqlite3` 的 `db.transaction()` 方法

**事务使用场景**：

| 场景 | 事务边界 | 回滚触发 |
|------|----------|----------|
| 创建订单 | 库存扣减 → 订单创建 → 订单项创建 → 清除购物车 | 库存不足/任何错误 |
| 取消订单 | 库存回滚 → 订单状态更新 | 状态校验失败/任何错误 |
| 支付成功 | 支付更新 → 订单更新 → 销量更新 | 任何错误 |
| 退款审核通过 | 库存回滚 → 订单状态更新 | 状态校验失败/任何错误 |
| 发货 | 订单状态更新 → 创建物流记录 | 任何错误 |

**事务代码示例**：
```javascript
const createTransaction = db.transaction(() => {
  // 步骤1：扣减库存
  for (const item of orderItems) {
    const result = db.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?'
    ).run(item.quantity, item.product_id, item.quantity);
    if (result.changes === 0) throw new Error('库存不足');
  }
  
  // 步骤2：创建订单
  const order = orderModel.create({...});
  
  // 步骤3：创建订单项
  for (const item of orderItems) {
    orderModel.createOrderItem({...});
  }
  
  return order;
});

// 执行事务
return createTransaction();
```

### 2.4 数据访问层（Model/DAO）

#### 2.4.1 数据库选型（SQLite）

**选型理由**：
- 零配置，无需单独安装数据库服务
- 嵌入式数据库，单文件存储，便于部署
- 事务支持完善，ACID特性
- better-sqlite3 同步API，性能优异
- 适合中小规模电商应用
- 支持切换到 MySQL（架构预留）

**数据库配置**：
- 文件路径：`./data/gexm.db`
- 数据库驱动：`better-sqlite3`
- 初始化方式：应用启动时自动建表
- 备份方式：直接复制数据库文件

#### 2.4.2 表结构设计原则

**主键设计**：
- 使用文本型 ID（`generateId()` 生成）
- 格式：时间戳 + 随机数的 UUID 风格
- 优点：分布式友好，避免自增ID泄露数据量

**时间字段**：
- `created_at`：创建时间（ISO 8601 字符串）
- `updated_at`：更新时间（ISO 8601 字符串）
- 统一使用 `new Date().toISOString()` 格式

**软删除策略**：
- 主要表使用物理删除（配合 ON DELETE CASCADE）
- 状态型字段使用 `status` 字段标记（active/inactive/deleted）

**JSON字段存储**：
- 复杂结构（如规格、图片列表）存储为 JSON 字符串
- 查询后使用 `JSON.parse()` 解析
- 示例：`products.images`, `product_skus.specs`, `orders.shipping_address`

#### 2.4.3 索引策略

**索引分类**：

| 索引类型 | 用途 | 示例 |
|----------|------|------|
| 单列索引 | 常用查询字段 | `idx_orders_user`, `idx_products_category` |
| 联合索引 | 多条件查询 | `idx_user_coupons_user_status` |
| 唯一索引 | 唯一性约束 | `idx_orders_no`（UNIQUE） |
| 外键索引 | 关联查询 | 所有外键字段 |

**核心表索引清单**：

```
用户表：
  - idx_users_username (username)
  - idx_users_email (email)
  - idx_users_created_at (created_at)

商品表：
  - idx_products_category (category_id)
  - idx_products_status (status)
  - idx_products_sort (sort_order)

订单表：
  - idx_orders_user (user_id)
  - idx_orders_status (status)
  - idx_orders_no (order_no) - UNIQUE
  - idx_orders_created_at (created_at)
  - idx_orders_status_created_at (status, created_at)

购物车表：
  - idx_carts_user (user_id)
  - idx_carts_created_at (created_at)
```

#### 2.4.4 查询优化方法

**优化策略**：

1. **使用预编译语句**（better-sqlite3 特性）
   - 所有查询使用 `db.prepare()` 预编译
   - 参数绑定防止 SQL 注入
   - 重复查询性能更高

2. **合理使用索引**
   - WHERE 条件字段建索引
   - ORDER BY 字段建索引
   - JOIN 关联字段建索引

3. **分页查询**
   - 使用 `LIMIT ? OFFSET ?` 分页
   - 避免一次性加载大量数据

4. **批量查询优化**
   - 订单列表：一次查询所有订单，再批量查询订单项
   - 使用 IN 查询减少数据库往返

5. **避免 N+1 查询**
   - 使用 JOIN 一次性获取关联数据
   - 示例：购物车列表 JOIN 商品表和SKU表

### 2.5 基础设施层

#### 2.5.1 认证与授权

**认证机制**：JWT + Refresh Token 双令牌

**Token 结构**：

| Token类型 | 有效期 | 存储位置 | 用途 |
|-----------|--------|----------|------|
| Access Token | 24小时 | 前端内存/Storage | API请求认证 |
| Refresh Token | 7天 | 前端Storage | 刷新AccessToken |

**认证流程**：
```
用户登录 → 后端验证密码 → 
  生成 accessToken + refreshToken →
    前端存储 → 后续请求携带 Authorization: Bearer <token>
```

**权限层级**：

```
公开接口（无需认证）
    ↓
可选认证（optionalAuthMiddleware）
    ↓ 已登录用户
普通用户（authMiddleware）
    ↓ role === 'admin'
管理员（adminMiddleware / verifyAdmin）
```

**权限校验链路**：

```
请求到达
    │
    ▼
authMiddleware（认证中间件）
    ├─ 从 Header 获取 Authorization
    ├─ 解析 JWT Token
    ├─ 查询用户是否存在
    ├─ 检查用户状态是否 active
    ├─ 将用户信息挂载到 req.user / req.userId
    └─ 通过 → next()
    │
    ▼
adminMiddleware（管理员校验）
    ├─ 检查 req.user.role === 'admin'
    └─ 通过 → next()
    │
    ▼
业务处理
```

#### 2.5.2 安全防护

**安全中间件链**：

```
请求到达
    │
    ├─ helmet() - 安全响应头
    ├─ cors() - 跨域控制
    ├─ apiLimiter - 全局限流（60次/分钟）
    ├─ xssFilterMiddleware - XSS过滤
    ├─ securityHeadersMiddleware - 安全头增强
    ├─ sanitizeInputMiddleware - 输入长度限制
    ├─ csrfTokenMiddleware - CSRF Token生成
    └─ requestLogger - 请求日志
```

**XSS 防护**：
- 过滤 `<script>`、`<iframe>` 等危险标签
- 过滤 `javascript:`、`vbscript:` 等危险协议
- 过滤 `onclick`、`onload` 等事件处理器
- 过滤 `<style>`、`<base>`、`<link>`、`<meta>` 标签
- 覆盖范围：req.body、req.query、req.params

**CSRF 防护**：
- Token 存储：Cookie（`csrf-token`）
- Token 提交：请求头（`X-CSRF-Token`）
- 保护范围：所有 POST/PUT/DELETE/PATCH 请求
- 例外路由：登录、注册、Token刷新（auth模块）
- 保护等级：高安全路由（订单、支付）强制启用

**CSRF 保护路由配置**：

| 路由组 | CSRF保护 | 排除路径 |
|--------|----------|----------|
| auth | 是 | /login, /register, /refresh |
| cart | 是 | 无 |
| orders | 是 | 无 |
| payment | 是 | 无 |
| chat | 是 | 无 |
| search | 否 | - |
| errorLogs | 否 | - |

**速率限制**：

| 限制类型 | 限制规则 | 适用范围 |
|----------|----------|----------|
| 通用API | 60次/分钟/IP | 所有接口 |
| 登录 | 5次/5分钟/IP | /auth/login |
| 注册 | 3次/小时/IP | /auth/register |
| 消息发送 | 20次/分钟/用户 | 发送消息接口 |
| 文件上传 | 5次/分钟/用户 | 上传接口 |

**密码安全**：
- 加密算法：bcryptjs
- 密码强度：至少8位，包含字母和数字
- 密码存储：仅存储哈希值，不可逆

#### 2.5.3 日志系统

**日志框架**：Winston 3.x

**日志级别**：
- `error`：错误日志
- `warn`：警告日志
- `info`：信息日志
- `debug`：调试日志

**日志传输**：
- 控制台输出（开发环境）
- 文件输出（`./logs/app.log`）

**日志内容**：

| 日志类型 | 记录内容 |
|----------|----------|
| 请求日志 | method, url, statusCode, duration, ip, userAgent |
| 错误日志 | error.message, error.stack, url, method, ip |
| 业务日志 | 用户操作、关键业务事件 |
| 安全日志 | 登录失败、CSRF攻击、限流触发 |

**请求日志格式**：
```
info: GET /api/products 200 - 45ms - 192.168.1.1
```

#### 2.5.4 错误处理

**错误处理中间件链**：

```
业务代码抛出错误
    │
    ▼
errorHandler 中间件
    ├─ 记录错误日志（含堆栈信息）
    ├─ 判断错误类型
    │   ├─ entity.too.large → 413 文件过大
    │   └─ 其他 → 500 服务器错误
    └─ 返回统一错误响应
```

**404 处理**：
- 所有未匹配路由统一由 `notFoundHandler` 处理
- 返回错误码 1004，消息"接口不存在"

**全局异常捕获**：
- `uncaughtException`：未捕获异常，记录日志后退出
- `unhandledRejection`：未处理的Promise拒绝
- `SIGTERM` / `SIGINT`：优雅关闭

#### 2.5.5 配置管理

**配置加载**：
- 库：`dotenv`
- 加载时机：应用启动时
- 配置文件：`.env`（不提交到版本库）

**配置项清单**：

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 服务端口 | `PORT` | 3000 | HTTP服务端口 |
| 运行环境 | `NODE_ENV` | development | 环境标识 |
| JWT密钥 | `JWT_SECRET` | gexm_jwt_secret_key_2024 | Access Token签名密钥 |
| JWT有效期 | `JWT_EXPIRES_IN` | 24h | Access Token有效期 |
| JWT刷新密钥 | `JWT_REFRESH_SECRET` | gexm_refresh_secret_key_2024 | Refresh Token签名密钥 |
| JWT刷新有效期 | `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh Token有效期 |
| 强制HTTPS | `FORCE_HTTPS` | false | 生产环境强制HTTPS |
| CORS源 | `CORS_ORIGINS` | '' | 允许的跨域源（逗号分隔） |
| 数据库路径 | `DB_PATH` | ./data/gexm.db | SQLite数据库文件路径 |
| 上传路径 | `UPLOAD_PATH` | ./uploads | 文件上传目录 |
| 最大上传大小 | `MAX_UPLOAD_SIZE` | 10485760 (10MB) | 单文件大小限制 |
| 支付密钥 | `PAYMENT_SECRET` | gexm_payment_secret_key_2024 | 支付回调验签密钥 |
| 日志级别 | `LOG_LEVEL` | info | 日志输出级别 |
| 日志文件 | `LOG_FILE` | ./logs/app.log | 日志文件路径 |

**敏感信息管理**：
- 密钥类配置不硬编码，通过环境变量注入
- `.env` 文件加入 `.gitignore`
- 默认值仅用于开发环境
- 生产环境通过部署系统注入真实密钥

---

## 3. 模块集成详细说明

### 3.1 用户认证集成

#### 3.1.1 登录流程时序

```
前端                          后端
  │                             │
  │ 1. 用户输入用户名密码         │
  │                             │
  │── POST /auth/login ────────>│
  │   { username, password }    │
  │                             │
  │ 2. 登录限流检查              │
  │    (5次/5分钟)               │
  │                             │
  │ 3. 查询用户（用户名/邮箱）    │
  │                             │
  │ 4. 验证密码（bcrypt）        │
  │                             │
  │ 5. 检查用户状态              │
  │                             │
  │ 6. 更新最后登录时间          │
  │                             │
  │ 7. 生成双Token               │
  │    - accessToken (24h)      │
  │    - refreshToken (7d)      │
  │                             │
  │<── 返回登录结果 ─────────────│
  │   { accessToken,            │
  │     refreshToken,           │
  │     user, expiresIn }       │
  │                             │
  │ 8. 存储Token到本地           │
  │    (uni.setStorageSync)     │
  │                             │
  │ 9. 更新 userStore 状态       │
  │                             │
  │ 10. 跳转首页/来源页          │
```

#### 3.1.2 Token管理（access token + refresh token）

**Token 生命周期管理**：

```
┌─────────────┐     使用      ┌──────────────┐
│ Access Token │ ───────────→ │  API 请求    │
│   (24小时)   │              │              │
└──────┬──────┘              └──────┬───────┘
       │                            │
       │ 过期（返回 code=1007）     │
       ▼                            │
┌─────────────┐                     │
│  自动刷新    │                     │
│  refreshToken│                    │
│   (7天)      │                     │
└──────┬──────┘                     │
       │                            │
       ├─ 成功 → 生成新Token对 ──────┘
       │
       └─ 失败 → 清除登录态 → 跳转登录页
```

**Token 刷新机制**：
- 检测时机：响应拦截器收到 1007/1008 错误码
- 刷新接口：`POST /api/auth/refresh`
- 刷新策略：一次性使用（旧 refreshToken 立即作废）
- 失败处理：清除本地登录状态，跳转登录页

#### 3.1.3 权限校验链路

```
前端发起请求
    │
    ▼
request.js 请求拦截器
    ├─ 添加 Authorization header
    └─ 添加 X-CSRF-Token（写操作）
    │
    ▼
后端中间件链
    ├─ apiLimiter（限流）
    ├─ xssFilterMiddleware（XSS过滤）
    ├─ sanitizeInputMiddleware（输入清理）
    │
    ├─ authMiddleware（认证）
    │   ├─ 解析 JWT
    │   ├─ 验证用户存在性
    │   └─ 验证用户状态
    │
    ├─ csrfProtectionMiddleware（CSRF校验）
    │   ├─ 比较 Cookie Token 与 Header Token
    │   └─ 不一致则返回 403
    │
    └─ adminMiddleware（管理员校验，可选）
        └─ 检查 role === 'admin'
    │
    ▼
业务控制器
```

#### 3.1.4 前端状态同步

**userStore 状态流转**：

```
应用启动
    │
    ▼
App.vue onLaunch
    │
    ├─ appStore.initApp()
    │   ├─ 获取系统信息
    │   └─ 检测网络状态
    │
    └─ userStore.initFromStorage()
        ├─ 从 Storage 读取 token
        ├─ 从 Storage 读取 refreshToken
        └─ 从 Storage 读取 userInfo
```

**登录状态同步点**：

| 操作 | 状态更新 | 本地存储 |
|------|----------|----------|
| 登录成功 | 设置 token/userInfo | 是 |
| Token刷新 | 更新 token/refreshToken | 是 |
| 修改资料 | 更新 userInfo | 是 |
| 登出 | 清空所有状态 | 清除Storage |
| Token刷新失败 | 清空所有状态 | 清除Storage |

### 3.2 订单-支付-库存集成

#### 3.2.1 下单全流程

```
购物车/商品页
    │
    ▼
1. 订单预览 (POST /orders/preview)
    ├─ 选择商品（购物车/直接购买）
    ├─ 选择收货地址
    ├─ 计算金额
    └─ 返回预览数据
    │
    ▼
2. 确认订单页
    ├─ 展示商品清单
    ├─ 展示收货地址
    ├─ 展示费用明细
    └─ 用户确认提交
    │
    ▼
3. 创建订单 (POST /orders)
    ├─ 事务开始
    ├─ 校验库存
    ├─ 扣减库存（products + product_skus）
    ├─ 创建订单（orders）
    ├─ 创建订单项（order_items）
    ├─ 清除购物车（购物车方式）
    └─ 事务提交
    │
    ▼
4. 跳转支付页
    │
    ▼
5. 发起支付 (POST /payment/pay)
    ├─ 校验订单状态（必须是 pending）
    ├─ 创建支付记录（payments）
    ├─ 模拟支付/余额支付
    │   ├─ 事务开始
    │   ├─ 余额扣款（balance方式）
    │   ├─ 更新支付状态为 success
    │   ├─ 更新订单状态为 paid
    │   ├─ 更新商品销量
    │   └─ 事务提交
    └─ 返回支付结果
    │
    ▼
6. 支付成功 → 订单状态：paid
    │
    ▼
7. 商家发货（管理员）
    ├─ 更新订单状态为 shipped
    ├─ 记录物流信息
    └─ 创建物流轨迹
    │
    ▼
8. 用户确认收货
    └─ 更新订单状态为 completed
```

#### 3.2.2 各阶段状态流转

**订单状态机**：

```
pending（待付款）
    │
    ├─ 用户支付 → paid（待发货）
    │
    ├─ 用户取消 → cancelled（已取消）
    │   └─ 回滚库存
    │
    └─ 超时未付 → 自动取消（预留）

paid（待发货）
    │
    ├─ 商家发货 → shipped（待收货）
    │
    ├─ 用户申请退款 → refunding（退款中）
    │   └─ 管理员审核
    │       ├─ 通过 → refunded（已退款）
    │       │   └─ 回滚库存
    │       └─ 拒绝 → 恢复 paid
    │
    └─ 取消订单？（不允许，需走退款）

shipped（待收货）
    │
    ├─ 用户确认 → completed（已完成）
    │
    └─ 用户申请退款 → refunding（退款中）

completed（已完成）
    └─ 可评价商品

refunding（退款中）
    ├─ 审核通过 → refunded（已退款）
    └─ 审核拒绝 → 回到原状态

refunded（已退款）
    └─ 终态

cancelled（已取消）
    └─ 终态
```

**订单状态说明表**：

| 状态 | 说明 | 可执行操作 |
|------|------|------------|
| pending | 待付款 | 支付、取消 |
| paid | 待发货 | 申请退款、发货（管理员） |
| shipped | 待收货 | 确认收货、申请退款 |
| completed | 已完成 | 评价 |
| cancelled | 已取消 | - |
| refunding | 退款中 | 审核（管理员） |
| refunded | 已退款 | - |

#### 3.2.3 事务边界

**创建订单事务**：

| 操作 | 表 | 操作类型 |
|------|-----|----------|
| 扣减商品库存 | products | UPDATE |
| 扣减SKU库存 | product_skus | UPDATE |
| 创建订单 | orders | INSERT |
| 创建订单项 | order_items | INSERT（多条） |
| 清除购物车 | carts | DELETE（多条） |

**支付成功事务**：

| 操作 | 表 | 操作类型 |
|------|-----|----------|
| 更新支付状态 | payments | UPDATE |
| 更新订单状态 | orders | UPDATE |
| 更新商品销量 | products | UPDATE（多条） |

**取消订单事务**：

| 操作 | 表 | 操作类型 |
|------|-----|----------|
| 回滚商品库存 | products | UPDATE（多条） |
| 回滚SKU库存 | product_skus | UPDATE（多条） |
| 更新订单状态 | orders | UPDATE |

**退款通过事务**：

| 操作 | 表 | 操作类型 |
|------|-----|----------|
| 回滚商品库存 | products | UPDATE（多条） |
| 回滚SKU库存 | product_skus | UPDATE（多条） |
| 更新订单状态 | orders | UPDATE |

#### 3.2.4 异常回滚机制

**回滚触发条件**：
- 库存不足（扣减失败，changes === 0）
- 任何步骤抛出异常
- 数据校验失败

**better-sqlite3 事务特性**：
- 同步事务 API
- 函数内任何 throw 都会触发回滚
- 函数正常返回则提交事务
- 事务内所有操作原子性执行

### 3.3 营销模块集成

#### 3.3.1 优惠券与订单的集成点

**优惠券生命周期**：

```
创建优惠券（管理员）
    │
    ▼
用户领取 → user_coupons 表（status=unused）
    │
    ▼
下单时选择优惠券
    ├─ 校验：未使用、在有效期内、满足满减条件
    ├─ 计算优惠金额
    └─ 更新实付金额
    │
    ▼
支付成功 → 标记使用（status=used）
    │
    ▼
订单完成
```

**优惠券类型**：
- `fixed`：固定金额减免
- `percent`：折扣比例（预留）

**当前实现状态**：
- 优惠券领取、使用接口已实现
- 订单创建时优惠券集成尚不完善（discountAmount 恒为0）
- 优惠券与订单的关联需进一步集成

#### 3.3.2 会员积分与订单的集成

**积分获取途径**：

| 途径 | 积分数量 | 说明 |
|------|----------|------|
| 每日签到 | 基础10分 + 连续签到奖励 | 签到模块 |
| 订单消费 | 按消费金额比例（预留） | 订单模块 |
| 评价商品 | 固定积分（预留） | 评价模块 |
| 管理员调整 | 任意数量 | 后台管理 |

**积分消费途径**：

| 途径 | 说明 |
|------|------|
| 兑换商品 | 积分商城（预留） |
| 抵扣现金 | 订单支付抵扣（预留） |
| 兑换优惠券 | 积分换券（预留） |

**会员等级体系**：
- 等级依据：累计积分
- 等级权益：折扣率、专属活动
- 等级表：`member_levels`
- 用户等级：`user_points.level_id`

#### 3.3.3 秒杀与库存的关系

**秒杀系统架构**：

```
秒杀活动（flash_sales）
    │
    └─ 秒杀商品（flash_sale_items）
        ├─ 关联 product_id
        ├─ 关联 sku_id（可选）
        ├─ 秒杀价（flash_price）
        ├─ 秒杀库存（stock）
        ├─ 已售数量（sold_count）
        └─ 每人限购（limit_per_user）
```

**秒杀购买流程**：

```
用户请求秒杀
    │
    ├─ 校验活动状态（active）
    ├─ 校验活动时间（开始/结束）
    ├─ 校验商品存在性
    ├─ 校验限购数量
    ├─ 校验库存
    ├─ 创建秒杀订单（内存）
    └─ 返回成功，引导支付
```

**库存管理**：
- 秒杀商品独立库存（`flash_sale_items.stock`）
- 不直接扣减商品主库存
- 支付成功后同步扣减主库存（预留）

**当前实现说明**：
- 控制器层（flashSaleController）使用内存存储
- 数据模型层（flashSaleModel）已设计数据库表结构
- 两者尚未完全对齐，需后续整合

#### 3.3.4 签到与积分的联动

**签到流程**：

```
用户签到
    │
    ├─ 检查今日是否已签到
    │
    ├─ 计算连续签到天数
    │   └─ 上次签到是昨天 → 连续天数+1
    │   └─ 否则 → 重置为1天
    │
    ├─ 计算获得积分
    │   ├─ 基础积分：daily_points（默认10）
    │   └─ 连续奖励：consecutive_bonus（数组配置）
    │
    ├─ 记录签到（checkins 表）
    │
    └─ 增加积分（user_points / point_logs）
```

**签到配置**：

| 配置项 | 说明 |
|--------|------|
| daily_points | 每日签到基础积分 |
| consecutive_bonus | 连续签到额外奖励数组 |
| max_consecutive_days | 最大连续天数上限 |

### 3.4 通知系统集成

#### 3.4.1 通知触发场景

**通知类型**：

| 类型 | 触发场景 | 接收人 |
|------|----------|--------|
| system | 系统公告 | 全体用户 |
| order | 订单状态变更 | 订单用户 |
| coupon | 优惠券到账/过期 | 相应用户 |
| activity | 活动通知 | 目标用户 |
| message | 私信/回复 | 目标用户 |

**订单相关通知触发点**：

| 事件 | 通知内容 |
|------|----------|
| 订单创建成功 | 您的订单已创建，请尽快支付 |
| 支付成功 | 您的订单已支付成功，等待发货 |
| 商家发货 | 您的订单已发货，请注意查收 |
| 确认收货 | 订单已完成，感谢您的购买 |
| 退款申请 | 您的退款申请已提交 |
| 退款结果 | 退款申请已通过/拒绝 |

#### 3.4.2 通知类型与渠道

**通知渠道**：

| 渠道 | 实现状态 | 说明 |
|------|----------|------|
| 站内通知 | ✅ 已实现 | notifications 表 |
| 站内信 | ✅ 已实现 | inbox_messages 表 |
| 邮件通知 | ❌ 未实现 | 预留 |
| 微信推送 | ❌ 未实现 | 预留 |
| APP推送 | ❌ 未实现 | 预留 |
| 短信通知 | ❌ 未实现 | 预留 |

**站内信系统**：
- 支持系统消息和用户私信
- 支持消息回复
- 支持批量发送
- 支持未读计数

#### 3.4.3 未读计数机制

**两层通知体系**：

1. **notifications 表**（系统通知）
   - 未读字段：`read` (0/1)
   - 计数方法：`SELECT COUNT(*) WHERE user_id = ? AND read = 0`

2. **inbox_messages 表**（站内信）
   - 未读状态：`status = 'unread'`
   - 计数方法：`SELECT COUNT(*) WHERE receiver_id = ? AND status = 'unread'`

**前端未读展示**：
- 消息入口显示红点/数字
- 进入详情页自动标记已读
- 提供"全部已读"功能

---

## 4. 关键业务流程图

### 4.1 用户注册登录流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 进入注册页，填写信息 | - | - |
| 2 | 点击注册，提交表单 | 校验参数（用户名/邮箱/密码格式） | - |
| 3 | - | 检查用户名/邮箱是否已存在 | - |
| 4 | - | 密码加密（bcrypt） | - |
| 5 | - | 创建用户记录 | users 表 +1 |
| 6 | 注册成功，跳转登录页 | 返回用户信息 | - |
| 7 | 输入用户名密码登录 | - | - |
| 8 | - | 查询用户、验证密码 | - |
| 9 | - | 生成 accessToken + refreshToken | - |
| 10 | 存储Token，更新状态 | 返回双Token + 用户信息 | - |
| 11 | 跳转首页 | - | - |

### 4.2 商品浏览与搜索流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 进入首页 | - | - |
| 2 | 加载Banner、分类、推荐商品 | 查询商品列表（分页、排序） | - |
| 3 | 点击分类 | - | - |
| 4 | 进入分类页，加载分类商品 | 按分类ID查询商品 | - |
| 5 | 点击搜索 | - | - |
| 6 | 输入关键词搜索 | 模糊查询（名称/副标题/描述） | search_history +1 |
| 7 | 点击商品 | - | - |
| 8 | 进入商品详情页 | 查询商品详情 + SKU列表 | - |
| 9 | 查看评价 | 查询商品评价列表 | - |

### 4.3 购物车与下单流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 商品详情页点击加入购物车 | 检查是否已存在，更新数量或新增 | carts +1 / 更新数量 |
| 2 | 进入购物车页 | 查询购物车列表（关联商品+SKU） | - |
| 3 | 勾选商品、调整数量 | 更新选中状态、数量 | carts 更新 |
| 4 | 点击结算 | - | - |
| 5 | 订单预览（确认订单页） | 计算金额、获取地址 | 无（只读） |
| 6 | 选择地址、提交订单 | - | - |
| 7 | - | 开始事务 | - |
| 8 | - | 校验并扣减库存 | products.stock -, product_skus.stock - |
| 9 | - | 创建订单 | orders +1 |
| 10 | - | 创建订单项 | order_items +N |
| 11 | - | 清除购物车 | carts -N |
| 12 | - | 提交事务 | - |
| 13 | 跳转支付页 | 返回订单信息 | - |

### 4.4 支付与订单状态流转

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 支付页选择支付方式 | - | - |
| 2 | 点击支付 | 校验订单状态（pending） | - |
| 3 | - | 创建支付记录 | payments +1 |
| 4 | - | 模拟支付/余额支付（事务） | - |
| 5 | - | 余额扣款（balance方式） | users.balance - |
| 6 | - | 更新支付状态为 success | payments.status = success |
| 7 | - | 更新订单状态为 paid | orders.status = paid |
| 8 | - | 更新商品销量 | products.sales + |
| 9 | 支付成功，跳转订单详情 | 返回支付结果 | - |
| 10 | （商家）后台点击发货 | 更新订单状态为 shipped | orders.status = shipped |
| 11 | - | 创建物流记录 | logistics +1 |
| 12 | 用户点击确认收货 | 更新订单状态为 completed | orders.status = completed |

### 4.5 退款流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 订单详情页点击申请退款 | - | - |
| 2 | 填写退款原因、金额 | - | - |
| 3 | 提交申请 | 校验订单状态（paid/shipping） | - |
| 4 | - | 更新订单状态为 refunding | orders.status = refunding |
| 5 | （管理员）审核退款 | - | - |
| 6 | 审核通过 | - | - |
| 7 | - | 事务：回滚库存 | products.stock +, product_skus.stock + |
| 8 | - | 更新订单状态为 refunded | orders.status = refunded |
| 9 | 审核拒绝 | - | - |
| 10 | - | 恢复原订单状态 | orders.status = paid/shipped |

### 4.6 优惠券使用流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 进入优惠券中心 | 查询可领取优惠券列表 | - |
| 2 | 点击领取 | 校验领取资格（数量/每人限制） | - |
| 3 | - | 发放优惠券 | user_coupons +1 |
| 4 | 进入我的优惠券 | 查询我的优惠券列表 | - |
| 5 | 下单时选择优惠券 | 校验可用性（未使用/有效期/满减） | - |
| 6 | - | 计算优惠金额 | - |
| 7 | - | 更新订单实付金额 | orders.discount_amount |
| 8 | 支付成功 | 标记优惠券已使用 | user_coupons.status = used |

### 4.7 会员积分获取与消费流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 进入会员中心 | 查询会员信息、积分余额 | - |
| 2 | 每日签到 | 检查今日是否已签 | - |
| 3 | - | 计算连续天数 | - |
| 4 | - | 计算积分（基础+连续奖励） | - |
| 5 | - | 记录签到 | checkins +1 |
| 6 | - | 增加积分 | user_points.balance + |
| 7 | - | 记录积分日志 | point_logs +1 |
| 8 | （订单完成）获得积分 | - | （预留） |
| 9 | 积分消费（兑换/抵扣） | - | （预留） |

### 4.8 秒杀活动参与流程

| 步骤 | 前端动作 | 后端处理 | 数据变化 |
|------|----------|----------|----------|
| 1 | 进入秒杀列表页 | 查询进行中/即将开始的活动 | - |
| 2 | 点击活动进入 | 查询活动详情和商品列表 | - |
| 3 | 点击"立即抢购" | 校验活动状态 | - |
| 4 | - | 校验活动时间 | - |
| 5 | - | 校验商品库存 | - |
| 6 | - | 校验限购数量 | - |
| 7 | - | 创建秒杀订单 | flash_sale_orders +1 |
| 8 | 跳转支付 | 返回秒杀订单信息 | - |
| 9 | 完成支付 | - | （待集成） |

---

## 5. 数据模型关系

### 5.1 核心实体关系图（文字描述）

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   orders    │       │  order_items│
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │──1──*─│ id (PK)     │──1──*─│ id (PK)     │
│ username    │       │ order_no    │       │ order_id(FK)│
│ email       │       │ user_id(FK) │       │ product_id  │
│ password    │       │ status      │       │ sku_id      │
│ nickname    │       │ total_amount│       │ quantity    │
│ phone       │       │ pay_amount  │       │ price       │
│ avatar      │       │ pay_method  │       └─────────────┘
│ role        │       │ pay_time    │              │
│ status      │       │ ...         │              │
└──────┬──────┘       └──────┬──────┘              │
       │                     │                     │
       │                     │                     │
       │ 1                   │ 1                   │ 1
       │ *                   │ *                   │ *
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│  carts      │       │ payments    │       │  products   │
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ user_id(FK) │       │ order_id(FK)│       │ category_id │
│ product_id  │       │ user_id(FK) │       │ name        │
│ sku_id      │       │ payment_no  │       │ price       │
│ quantity    │       │ pay_method  │       │ stock       │
│ selected    │       │ amount      │       │ status      │
└─────────────┘       │ status      │       └──────┬──────┘
                      └─────────────┘              │
                                                   │ 1
                                                   │ *
                                            ┌──────▼──────┐
                                            │ product_skus│
                                            │─────────────│
                                            │ id (PK)     │
                                            │ product_id  │
                                            │ sku_name    │
                                            │ price       │
                                            │ stock       │
                                            │ specs(JSON) │
                                            └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  coupons    │       │user_coupons │       │ categories  │
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │──1──*─│ id (PK)     │       │ id (PK)     │
│ name        │       │ user_id(FK) │       │ name        │
│ type        │       │ coupon_id(FK)│      │ parent_id   │
│ value       │       │ status      │       │ level       │
│ min_amount  │       │ used_at     │       │ sort_order  │
│ total_count │       └─────────────┘       └──────┬──────┘
│ start_time  │                                   │
│ end_time    │                                   │ 自关联（树形）
└─────────────┘                                   └──────────────┘

┌─────────────┐       ┌─────────────┐
│ user_points │       │ point_logs  │
│─────────────│       │─────────────│
│ id (PK)     │──1──*─│ id (PK)     │
│ user_id(FK) │       │ user_id(FK) │
│ balance     │       │ type        │
│ level_id    │       │ amount      │
│ total_earned│       │ reason      │
│ total_spent │       │ created_at  │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│conversations│       │  messages   │
│─────────────│       │─────────────│
│ id (PK)     │──1──*─│ id (PK)     │
│ creator_id  │       │conversation_id│
│ participant_id      │ sender_id   │
│ type        │       │ content     │
│ status      │       │ type        │
└─────────────┘       │ created_at  │
                      └─────────────┘
```

### 5.2 表间关联关系

**用户相关表**：

| 主表 | 从表 | 关系 | 外键 | 级联操作 |
|------|------|------|------|----------|
| users | carts | 1:N | user_id | ON DELETE CASCADE |
| users | orders | 1:N | user_id | ON DELETE CASCADE |
| users | addresses | 1:N | user_id | ON DELETE CASCADE |
| users | favorites | 1:N | user_id | ON DELETE CASCADE |
| users | reviews | 1:N | user_id | ON DELETE CASCADE |
| users | payments | 1:N | user_id | ON DELETE CASCADE |
| users | notifications | 1:N | user_id | ON DELETE CASCADE |
| users | user_coupons | 1:N | user_id | ON DELETE CASCADE |
| users | user_points | 1:1 | user_id | ON DELETE CASCADE |
| users | point_logs | 1:N | user_id | ON DELETE CASCADE |
| users | checkins | 1:N | user_id | ON DELETE CASCADE |
| users | inbox_messages(receiver) | 1:N | receiver_id | ON DELETE CASCADE |

**商品相关表**：

| 主表 | 从表 | 关系 | 外键 | 级联操作 |
|------|------|------|------|----------|
| categories | categories | 1:N（自关联） | parent_id | ON DELETE SET NULL |
| categories | products | 1:N | category_id | ON DELETE SET NULL |
| products | product_skus | 1:N | product_id | ON DELETE CASCADE |
| products | carts | 1:N | product_id | ON DELETE CASCADE |
| products | order_items | 1:N | product_id | ON DELETE CASCADE |
| products | favorites | 1:N | product_id | ON DELETE CASCADE |
| products | reviews | 1:N | product_id | ON DELETE CASCADE |
| product_skus | carts | 1:N | sku_id | ON DELETE SET NULL |
| product_skus | order_items | 1:N | sku_id | ON DELETE SET NULL |

**订单相关表**：

| 主表 | 从表 | 关系 | 外键 | 级联操作 |
|------|------|------|------|----------|
| orders | order_items | 1:N | order_id | ON DELETE CASCADE |
| orders | payments | 1:N | order_id | ON DELETE CASCADE |
| orders | logistics | 1:N | order_id | ON DELETE CASCADE |
| orders | reviews | 1:N | order_id | ON DELETE CASCADE |

### 5.3 外键约束

**SQLite 外键启用**：
- better-sqlite3 默认启用外键约束
- 建表时通过 `FOREIGN KEY (...) REFERENCES ...` 定义

**主要外键约束**：

```sql
-- 订单关联用户
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- 订单项关联订单
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE

-- 订单项关联商品
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE

-- SKU关联商品
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE

-- 购物车关联用户
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- 用户积分关联用户
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

### 5.4 级联操作

**级联删除策略**：

| 级联类型 | 适用场景 | 说明 |
|----------|----------|------|
| ON DELETE CASCADE | 用户、订单、商品等主表删除 | 删除主记录时自动删除关联记录 |
| ON DELETE SET NULL | 可选关联，如分类、SKU | 删除主记录时外键设为NULL |
| ON DELETE SET DEFAULT | （较少使用） | 删除主记录时设为默认值 |
| RESTRICT/NO ACTION | （默认，需显式指定） | 阻止删除有子记录的主记录 |

**级联删除示例链**：

```
删除用户 (users)
    ├─ → 删除购物车 (carts)
    ├─ → 删除订单 (orders)
    │   ├─ → 删除订单项 (order_items)
    │   ├─ → 删除支付记录 (payments)
    │   └─ → 删除物流记录 (logistics)
    ├─ → 删除收藏 (favorites)
    ├─ → 删除地址 (addresses)
    ├─ → 删除评价 (reviews)
    ├─ → 删除通知 (notifications)
    ├─ → 删除用户优惠券 (user_coupons)
    ├─ → 删除用户积分 (user_points)
    │   └─ → 删除积分日志 (point_logs)
    └─ → 删除签到记录 (checkins)
```

---

## 6. 配置管理

### 6.1 环境变量清单

#### 后端环境变量

| 变量名 | 默认值 | 说明 | 敏感 |
|--------|--------|------|------|
| `PORT` | 3000 | 服务端口 | 否 |
| `NODE_ENV` | development | 运行环境 | 否 |
| `JWT_SECRET` | gexm_jwt_secret_key_2024 | JWT签名密钥 | 是 |
| `JWT_EXPIRES_IN` | 24h | Access Token有效期 | 否 |
| `JWT_REFRESH_SECRET` | gexm_refresh_secret_key_2024 | Refresh Token密钥 | 是 |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh Token有效期 | 否 |
| `FORCE_HTTPS` | false | 强制HTTPS | 否 |
| `CORS_ORIGINS` | '' | 允许的跨域源（逗号分隔） | 否 |
| `DB_PATH` | ./data/gexm.db | 数据库文件路径 | 否 |
| `UPLOAD_PATH` | ./uploads | 上传文件目录 | 否 |
| `MAX_UPLOAD_SIZE` | 10485760 | 最大上传大小(字节) | 否 |
| `RATE_LIMIT_WINDOW` | 15 | 限流窗口(分钟) | 否 |
| `RATE_LIMIT_MAX` | 100 | 限流最大请求数 | 否 |
| `PAYMENT_SECRET` | gexm_payment_secret_key_2024 | 支付回调验签密钥 | 是 |
| `PAYMENT_NOTIFY_URL` | '' | 支付回调地址 | 否 |
| `LOG_LEVEL` | info | 日志级别 | 否 |
| `LOG_FILE` | ./logs/app.log | 日志文件路径 | 否 |

#### 前端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_BASE_URL` | /api | API基础地址 |

### 6.2 配置加载顺序

**后端配置加载**（`src/config/index.js`）：

```
1. 加载 .env 文件（dotenv）
    ↓
2. process.env 已注入环境变量
    ↓
3. 构建 config 对象
   - 优先使用 process.env.XXX
   - 否则使用默认值
    ↓
4. 导出 config 供全项目使用
```

**加载优先级**：
```
系统环境变量 > .env 文件 > 代码默认值
```

### 6.3 多环境配置策略

**环境区分**：

| 环境 | NO_ENV | 特点 |
|------|--------|------|
| 开发环境 | development | 详细日志、热重载、本地数据库 |
| 测试环境 | test | 测试数据库、集成测试 |
| 生产环境 | production | 性能优化、安全加固、生产数据库 |

**环境差异配置**：

| 配置项 | 开发环境 | 生产环境 |
|--------|----------|----------|
| 日志级别 | debug/info | info/warn |
| 错误详情 | 完整堆栈 | 通用错误信息 |
| HTTPS | 否 | 是（FORCE_HTTPS） |
| CORS | 宽松 | 严格指定源 |
| 静态资源 | Vite开发服务器 | Nginx + CDN |

### 6.4 敏感信息管理

**管理原则**：
1. **不硬编码**：密钥、密码等敏感信息不写入代码
2. **不入版本库**：`.env` 文件加入 `.gitignore`
3. **按需注入**：生产环境通过部署系统注入
4. **最小权限**：日志中不打印敏感信息

**敏感信息清单**：
- JWT 签名密钥（JWT_SECRET, JWT_REFRESH_SECRET）
- 支付密钥（PAYMENT_SECRET）
- 数据库密码（如切换MySQL）
- 第三方 API 密钥（如支付、短信、邮件）

**.gitignore 相关配置**：
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

## 7. 部署架构

### 7.1 推荐部署拓扑

```
                    +-------------------+
                    |     用户流量       |
                    +---------+---------+
                              │
                              ▼
                    +---------+---------+
                    |       Nginx       |
                    |  (反向代理/HTTPS)  |
                    |  (静态资源服务)    |
                    |  (Gzip 压缩)      |
                    |  (负载均衡)        |
                    +---------+---------+
                              │
               +--------------+--------------+
               │                             │
               v                             v
    +----------+----------+       +----------+----------+
    |   H5 静态资源文件    |       |   Express 后端服务   |
    |  (Nginx 直接服务)    |       |   (PM2 管理进程)     |
    +---------------------+       |   - SQLite 数据库    |
                                  |   - WebSocket 服务   |
                                  |   - 文件上传处理     |
                                  +----------+----------+
                                             │
                                             v
                                  +----------+----------+
                                  |    数据存储层        |
                                  |  - SQLite 文件       |
                                  |  - 上传文件目录       |
                                  |  - 日志文件          |
                                  +---------------------+
```

### 7.2 反向代理配置

**Nginx 核心配置**：

```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name gexm.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务
server {
    listen 443 ssl http2;
    server_name gexm.example.com;

    # SSL 配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # H5 静态资源
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
        expires 7d;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 上传文件
    location /uploads/ {
        alias /path/to/uploads/;
        expires 30d;
    }
}
```

### 7.3 静态资源服务

**H5 构建产物**：
- 构建命令：`npm run build:app-h5`
- 输出目录：`packages/app/dist/build/h5/`
- 部署方式：Nginx 直接服务

**缓存策略**：

| 资源类型 | 缓存时长 | 说明 |
|----------|----------|------|
| HTML | 不缓存 | 入口文件，保证最新 |
| CSS/JS | 7天 | 带hash文件名，可强缓存 |
| 图片 | 30天 | 静态资源，更新少 |
| 字体 | 30天 | 基本不变 |

### 7.4 进程管理

**PM2 进程管理**：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gexm-server',
    script: 'src/server.js',
    cwd: 'packages/server',
    instances: 'max',      // 多核利用
    exec_mode: 'cluster',   // 集群模式
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

**启动命令**：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7.5 扩展方案

**水平扩展方向**：

| 层级 | 扩展方式 | 说明 |
|------|----------|------|
| 前端静态资源 | CDN 加速 | 将 H5 静态资源部署到 CDN |
| 后端服务 | 多实例集群 | PM2 cluster 模式 / 多服务器 |
| 数据库 | 读写分离 / 切换MySQL | 数据量增大后迁移到 MySQL |
| 文件存储 | 对象存储 (OSS/S3) | 从本地存储迁移到云存储 |
| WebSocket | 独立部署 / Redis 适配 | 实时通信独立扩展 |

**数据库迁移路径**：
- 当前：SQLite（适合中小规模）
- 中期：MySQL（数据量增长后）
- 远期：读写分离 + 分库分表

---

## 8. 已知限制与约束

### 8.1 技术栈限制

| 限制项 | 说明 | 影响范围 |
|--------|------|----------|
| SQLite 单文件 | 不支持高并发写入，单连接瓶颈 | 后端数据层 |
| JavaScript | 无类型检查，运行时错误风险 | 前后端代码 |
| uni-app 框架 | 部分平台特性受限，调试体验一般 | 前端多端适配 |
| 单进程服务 | Node.js 单线程，CPU 密集型任务受限 | 后端服务 |

### 8.2 性能瓶颈点

| 瓶颈点 | 原因 | 影响场景 |
|--------|------|----------|
| 数据库写入 | SQLite 单写锁，写入串行化 | 下单、支付等高并发场景 |
| 全文搜索 | LIKE 查询效率低，无全文索引 | 商品搜索（大数据量时） |
| 图片加载 | 本地存储，无 CDN 加速 | 商品图片加载速度 |
| 内存限制 | Node.js 默认内存限制（~1.4GB） | 大查询、大数据集处理 |

### 8.3 安全边界

| 安全项 | 当前状态 | 风险等级 |
|--------|----------|----------|
| 支付安全 | 模拟支付，无真实支付网关 | 中（功能缺失） |
| 数据加密 | 密码加密，传输层HTTPS（可选） | 中（依赖部署配置） |
| 敏感数据 | 数据库明文存储（除密码外） | 中 |
| API 签名 | 无请求签名机制 | 低 |
| 防刷机制 | 基础限流，无验证码 | 中 |

### 8.4 扩展性限制

| 模块 | 扩展难度 | 说明 |
|------|----------|------|
| 支付方式 | 中 | 预留了支付回调接口，但需具体对接 |
| 物流查询 | 高 | 需对接第三方物流API |
| 消息推送 | 中 | 需对接各平台推送服务 |
| 短信/邮件 | 中 | 需对接第三方服务商 |
| 多商户 | 高 | 当前为单商户架构 |

### 8.5 兼容性约束

| 约束项 | 说明 |
|--------|------|
| 浏览器兼容 | H5 端兼容 Chrome/Firefox/Safari/Edge 最新两版 |
| 小程序兼容 | 支持微信/支付宝/百度/抖音小程序 |
| APP兼容 | iOS 12.0+, Android 8.0+ |
| Node.js 版本 | >= 16.0.0 |
| 数据库迁移 | SQLite 切换 MySQL 需测试兼容性 |

---

## 9. 扩展建议

### 9.1 水平扩展方向

**优先级 P0（高）**：

1. **数据库迁移到 MySQL**
   - 原因：SQLite 不支持高并发写入
   - 方案：使用 Knex.js/Sequelize 抽象数据层
   - 影响：核心模块改造

2. **引入 Redis 缓存**
   - 原因：热点数据缓存、Session共享、限流
   - 方案：商品详情、分类列表等热点数据缓存
   - 影响：性能显著提升

3. **CDN 静态资源加速**
   - 原因：图片和静态文件加载速度
   - 方案：将上传目录和静态资源部署到 OSS/CDN
   - 影响：用户体验提升

**优先级 P1（中）**：

4. **后端服务集群化**
   - PM2 cluster 模式 → 多服务器部署
   - 需解决：Session 共享（Redis）、WebSocket 适配（Redis Adapter）

5. **读写分离**
   - 主库写入，从库读取
   - 适用：商品列表、搜索等读多写少场景

### 9.2 功能扩展路线

**P0 - 核心缺失功能**：

1. **真实支付接入**
   - 微信支付、支付宝
   - 支付回调、退款流程完善

2. **物流系统**
   - 物流轨迹查询
   - 运费模板完善

3. **搜索优化**
   - 引入 ElasticSearch
   - 支持搜索建议、搜索纠错

**P1 - 营销增强**：

4. **优惠券系统完善**
   - 与订单系统深度集成
   - 更多优惠券类型（满减、折扣、包邮）

5. **会员体系完善**
   - 成长值体系
   - 会员价、会员专享活动

6. **秒杀系统优化**
   - 分布式锁防超卖
   - 队列削峰

**P2 - 运营工具**：

7. **数据看板**
   - 销售数据可视化
   - 用户行为分析

8. **CMS 内容管理**
   - Banner 管理
   - 文章/公告管理

### 9.3 技术升级建议

**P0 - 代码质量**：

1. **引入 TypeScript**
   - 优先在 shared 包使用
   - 逐步迁移 server 和 app
   - 收益：类型安全、更好的IDE支持

2. **单元测试覆盖**
   - Service 层单元测试
   - API 集成测试
   - 收益：降低回归风险

**P1 - 架构优化**：

3. **shared 模块落地**
   - 统一前后端类型定义
   - 共享常量、工具函数
   - 收益：减少重复代码，保证一致性

4. **引入 ORM 框架**
   - 如：Prisma / TypeORM
   - 替换手写 SQL
   - 收益：数据库迁移更容易，代码更规范

5. **引入 CI/CD**
   - 自动化测试
   - 自动化部署
   - 收益：提升交付效率

### 9.4 优化优先级矩阵

```
                    影响大
                      │
            高价值    │    快速赢
         (P0 功能)    │   (P0 优化)
          - 真实支付  │   - CDN加速
          - MySQL迁移 │   - Redis缓存
                      │
──────────────────────┼──────────────────────
                      │
            战略投入  │    低优先级
         (P2 架构)    │   (P1 小优化)
          - TypeScript│   - 代码重构
          - CI/CD     │   - 文档完善
                      │
                    影响小
         投入大 ──────┴────── 投入小
```

**推荐实施顺序**：

1. **第一阶段（1-2周）**：基础设施优化
   - CDN 静态资源加速
   - Redis 缓存热点数据
   - PM2 cluster 模式

2. **第二阶段（2-4周）**：核心功能完善
   - 真实支付接入
   - 优惠券与订单集成
   - 搜索优化

3. **第三阶段（1-2月）**：架构升级
   - 数据库迁移 MySQL
   - TypeScript 迁移
   - 单元测试覆盖

4. **第四阶段（长期）**：持续优化
   - 微服务拆分
   - 多商户支持
   - 大数据分析

---

**文档结束**

> 本文档基于 2026-06-28 的代码状态生成，如需更新请重新生成。
