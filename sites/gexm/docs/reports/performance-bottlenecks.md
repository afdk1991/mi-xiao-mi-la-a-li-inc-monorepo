# Gexm 项目性能瓶颈分析报告

> 报告生成时间：2026-06-28
> 分析版本：v1.0
> 分析范围：全栈（后端 + 前端 + 网络 + 并发）

---

## 目录

1. [执行摘要](#执行摘要)
2. [后端性能瓶颈](#后端性能瓶颈)
   - [数据库层面](#数据库层面)
   - [接口层面](#接口层面)
   - [计算层面](#计算层面)
3. [前端性能瓶颈](#前端性能瓶颈)
   - [首屏加载](#首屏加载)
   - [运行时性能](#运行时性能)
   - [构建性能](#构建性能)
4. [网络性能](#网络性能)
5. [资源利用率](#资源利用率)
6. [并发处理瓶颈](#并发处理瓶颈)
7. [性能测试方案建议](#性能测试方案建议)
8. [性能优化路线图](#性能优化路线图)
9. [系统性能评级与承载预估](#系统性能评级与承载预估)

---

## 执行摘要

本报告对 Gexm 全栈电商项目进行了深入的性能瓶颈分析，共识别出 **28 个性能瓶颈点**，其中：

| 严重程度 | 数量 | 占比 |
|---------|------|------|
| 高（High） | 8 | 28.6% |
| 中（Medium） | 12 | 42.9% |
| 低（Low） | 8 | 28.6% |

**核心结论：**
- 当前系统采用 SQLite + 单 Node.js 进程架构，适用于中小规模场景
- 主要瓶颈集中在：SQLite 并发写入限制、同步 bcrypt 阻塞事件循环、前端长列表性能
- 经过短期优化后，预计 QPS 可从当前 ~50 提升至 ~200
- 中期引入 Redis 缓存和 PM2 集群后，QPS 可提升至 ~500
- 长期迁移至 PostgreSQL + 微服务架构后，可支持万级 QPS

---

## 后端性能瓶颈

### 数据库层面

#### 1. SQLite 单连接并发写入瓶颈

**问题描述：**
项目使用 `better-sqlite3` 同步 API，采用单数据库连接模型。SQLite 本质上是文件级数据库，写操作需要获取独占锁，高并发写入时会出现严重的锁等待。

**影响范围：**
- 订单创建、支付、库存扣减等写操作
- 用户注册、登录更新
- 所有涉及事务的业务流程

**严重程度：高**

**代码位置：**
- `packages/server/src/models/index.js:15` - 单例数据库连接
- `packages/server/src/services/orderService.js:201-262` - 订单创建长事务

**当前配置：**
```javascript
db.pragma('journal_mode = WAL');      // WAL模式，读不阻塞写，写仍互斥
db.pragma('synchronous = NORMAL');    // 正常同步级别
db.pragma('cache_size = -64000');     // 64MB 缓存
```

**优化建议：**
1. 短期：优化事务粒度，减少事务持有时间
2. 中期：引入 Redis 做缓存层，减少数据库写入
3. 长期：迁移至 PostgreSQL 或 MySQL，支持连接池和真正的并发写入

**预期收益：** 写操作并发能力提升 3-10 倍

---

#### 2. 订单服务 N+1 查询问题

**问题描述：**
`orderService.getDirectBuyItems` 方法中，通过循环逐个查询商品和 SKU 信息，存在典型的 N+1 查询问题。当购买多个商品时，数据库查询次数呈线性增长。

**影响范围：**
- 立即购买订单预览
- 立即购买订单创建
- 购物车结算（部分路径）

**严重程度：高**

**代码位置：**
`packages/server/src/services/orderService.js:36-74`

```javascript
// 当前实现：循环内单独查询
for (const item of items) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
  if (item.skuId) {
    const sku = db.prepare('SELECT * FROM product_skus WHERE id = ?').get(item.skuId);
  }
}
```

**优化建议：**
使用 `IN` 查询批量获取数据，然后在内存中组装：

```javascript
// 优化后：批量查询
const productIds = items.map(i => i.productId);
const products = db.prepare(
  `SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`
).all(...productIds);

const skuIds = items.filter(i => i.skuId).map(i => i.skuId);
const skus = db.prepare(
  `SELECT * FROM product_skus WHERE id IN (${skuIds.map(() => '?').join(',')})`
).all(...skuIds);
```

**预期收益：** 多商品订单查询次数减少 60-80%，接口响应时间提升 2-5 倍

---

#### 3. 商品搜索 LIKE 模糊查询全表扫描

**问题描述：**
商品搜索使用 `LIKE '%keyword%'` 前缀通配符查询，导致无法使用 B-Tree 索引，必须进行全表扫描。数据量增大后性能急剧下降。

**影响范围：**
- 商品搜索接口
- 管理后台商品搜索
- 分类筛选 + 关键词搜索

**严重程度：高**

**代码位置：**
`packages/server/src/models/productModel.js:35-39`

```javascript
if (keyword) {
  whereClause.push('(name LIKE ? OR subtitle LIKE ? OR description LIKE ?)');
  const searchPattern = `%${keyword}%`;
  params.push(searchPattern, searchPattern, searchPattern);
}
```

**优化建议：**
1. 短期：为商品名称建立 FTS5 全文搜索虚拟表
2. 中期：引入 Elasticsearch 或 MeiliSearch 专业搜索引擎
3. 临时方案：限制搜索结果数量，添加超时保护

**预期收益：** 搜索性能提升 10-100 倍（取决于数据量）

---

#### 4. 管理后台统计接口低效

**问题描述：**
`getDashboardOverview` 接口执行了 20 多次独立的 SQL 查询，每次查询都要单独编译和执行，数据库交互开销巨大。

**影响范围：**
- 管理后台首页数据概览
- 管理员频繁访问的统计页面

**严重程度：中**

**代码位置：**
`packages/server/src/controllers/adminController.js:340-463`

**问题代码特征：**
- 今日/本周/本月/上周/上月 订单数、销售额、用户数分别查询
- 每个指标都是独立的 `SELECT COUNT(*)` 或 `SELECT SUM()` 查询
- 总计约 15-20 次独立数据库查询

**优化建议：**
1. 使用条件聚合（CASE WHEN）将多个统计合并为单条查询
2. 增加 Redis 缓存，设置 1-5 分钟 TTL
3. 预计算统计数据，定时任务更新

```javascript
// 优化思路：单条 SQL 完成多个统计
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as todayCount,
    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as weekCount,
    SUM(CASE WHEN status IN ('paid','shipped','completed') AND created_at >= ? THEN pay_amount ELSE 0 END) as todaySales
  FROM orders
`).get(todayStart, weekStart, todayStart);
```

**预期收益：** 统计接口响应时间减少 70-90%

---

#### 5. 订单列表 JSON 反序列化开销

**问题描述：**
订单的 `shipping_address` 字段以 JSON 字符串形式存储，每次查询订单列表时都需要逐条进行 `JSON.parse` 反序列化，CPU 开销随数据量线性增长。

**影响范围：**
- 用户订单列表
- 管理后台订单列表
- 订单详情

**严重程度：中**

**代码位置：**
`packages/server/src/services/orderService.js:496-507`

```javascript
const ordersWithItems = orders.map(order => {
  const orderCopy = { ...order };
  if (orderCopy.shipping_address && typeof orderCopy.shipping_address === 'string') {
    try {
      orderCopy.shipping_address = JSON.parse(orderCopy.shipping_address);
    } catch {
      orderCopy.shipping_address = {};
    }
  }
  // ...
});
```

**优化建议：**
1. 数据库结构优化：将地址字段拆分为独立列（省、市、区、详细地址等）
2. 或使用 SQLite JSON 扩展，在查询时直接提取字段
3. 增加数据库字段索引，支持按地区筛选

**预期收益：** 订单列表接口 CPU 消耗降低 20-30%

---

#### 6. 索引覆盖率不足

**问题描述：**
虽然已建立了不少单字段索引，但部分高频查询场景缺少联合索引，导致查询效率低下。

**影响范围：**
- 商品列表多条件筛选（分类 + 状态 + 排序）
- 订单列表多条件查询（用户 + 状态 + 时间）
- 统计查询的时间范围过滤

**严重程度：中**

**已建立的联合索引（部分）：**
- `idx_products_status_category_sort` - 商品状态+分类+排序
- `idx_orders_user_status_created` - 订单用户+状态+创建时间
- `idx_messages_conv_created` - 消息会话+创建时间

**缺失的关键索引：**
- `products(category_id, status, sales)` - 按分类+销量排序
- `orders(status, created_at)` - 按状态+时间范围统计
- `order_items(product_id, created_at)` - 商品销量统计
- `user_coupons(user_id, status, created_at)` - 用户优惠券查询

**优化建议：**
1. 补充上述缺失的联合索引
2. 使用 `EXPLAIN QUERY PLAN` 分析慢查询
3. 定期运行 `ANALYZE` 更新统计信息

**预期收益：** 相关查询性能提升 2-5 倍

---

#### 7. 长事务锁等待风险

**问题描述：**
订单创建事务包含多次库存检查、库存扣减、订单插入、订单项插入、购物车删除等操作，事务持锁时间较长。高并发下容易造成锁等待超时。

**影响范围：**
- 秒杀活动场景
- 大促期间集中下单
- 多商品订单创建

**严重程度：中**

**代码位置：**
`packages/server/src/services/orderService.js:201-262`

事务内操作：
1. 循环检查并扣减 SKU 库存（N 次 UPDATE）
2. 循环检查并扣减商品库存（N 次 UPDATE）
3. 创建订单（1 次 INSERT）
4. 循环创建订单项（N 次 INSERT）
5. 删除购物车（1 次 DELETE）

**优化建议：**
1. 减少事务内循环查询，提前批量获取数据
2. 库存检查和扣减合并为单条 UPDATE（使用 WHERE stock >= ?）
3. 考虑将非核心操作移出事务（如积分、优惠券处理）
4. 添加事务超时机制

**预期收益：** 事务持锁时间减少 40-60%，并发处理能力提升

---

#### 8. 大表扫描风险

**问题描述：**
部分表在数据量增长后，由于缺少有效索引或查询设计问题，可能出现全表扫描。

**高风险表：**

| 表名 | 风险点 | 预计数据量级触发 |
|------|--------|----------------|
| `order_items` | 商品销量统计缺少高效索引 | 10万+ 条 |
| `stock_logs` | 库存变动记录查询 | 10万+ 条 |
| `point_logs` | 积分变动记录查询 | 10万+ 条 |
| `error_logs` | 错误日志查询 | 10万+ 条 |
| `search_history` | 搜索历史统计 | 5万+ 条 |

**严重程度：中**

**优化建议：**
1. 为高频查询字段建立联合索引
2. 实现数据归档策略，历史数据迁移至冷存储
3. 分页查询必须加索引，避免大偏移量深分页

**预期收益：** 避免数据增长后的性能断崖式下降

---

### 接口层面

#### 9. 缺少响应数据压缩

**问题描述：**
Express 服务未启用 Gzip/Brotli 响应压缩，大响应体积的接口会浪费带宽并增加传输时间。

**影响范围：**
- 商品列表接口（返回大量商品数据）
- 订单列表接口
- 管理后台统计接口
- 所有返回 JSON 数据的接口

**严重程度：高**

**代码位置：**
`packages/server/src/app.js` - 未引入 compression 中间件

**优化建议：**
```javascript
// 安装依赖
// npm install compression

// app.js 中添加
const compression = require('compression');
app.use(compression({
  threshold: 1024,  // 1KB 以上才压缩
  level: 6           // 压缩级别
}));
```

**预期收益：** 响应体大小减少 60-80%，传输时间显著缩短

---

#### 10. 管理后台批量订单更新循环查询

**问题描述：**
`batchUpdateOrderStatus` 方法使用 forEach 循环逐个更新订单状态，每次都是独立的数据库操作，效率低下。

**影响范围：**
- 管理后台批量订单操作
- 批量发货、批量改状态等场景

**严重程度：中**

**代码位置：**
`packages/server/src/controllers/adminController.js:261-263`

```javascript
ids.forEach(id => {
  orderModel.updateStatus(id, status, { remark });
});
```

**优化建议：**
使用 `IN` 语句批量更新：
```javascript
const placeholders = ids.map(() => '?').join(',');
db.prepare(
  `UPDATE orders SET status = ?, remark = ?, updated_at = ? WHERE id IN (${placeholders})`
).run(status, remark, now, ...ids);
```

**预期收益：** 批量操作性能提升 5-20 倍

---

#### 11. 缺少接口缓存机制

**问题描述：**
所有接口每次请求都直接查询数据库，没有利用缓存减少数据库压力。对于读多写少的数据，缓存能极大提升性能。

**高缓存价值接口：**

| 接口 | 数据特性 | 建议缓存时长 |
|------|----------|------------|
| 商品分类树 | 变动极少 | 1 小时 |
| 商品详情 | 变动较少 | 5-10 分钟 |
| 商品列表 | 中等变动 | 1-5 分钟 |
| 管理统计 | 允许延迟 | 1-5 分钟 |
| 运费模板 | 变动极少 | 1 小时 |
| 会员等级 | 变动极少 | 1 小时 |

**严重程度：高**

**优化建议：**
1. 引入 Node.js 内存缓存（lru-cache）
2. 中期引入 Redis 分布式缓存
3. 实现 Cache-Aside 模式，写操作时主动失效缓存

**预期收益：** 热点接口 QPS 提升 5-20 倍，数据库压力降低 60-90%

---

#### 12. 中间件堆叠开销

**问题描述：**
每个 API 请求需要经过多层中间件，部分中间件存在重复计算或不必要的开销。

**当前中间件链路（按顺序）：**
1. helmet - 安全头
2. cors - 跨域处理
3. express.json - 请求体解析（10MB 限制）
4. cookieParser - Cookie 解析
5. requestLogger - 请求日志
6. forceHttpsMiddleware - HTTPS 强制
7. securityHeadersMiddleware - 安全头（与 helmet 部分重复）
8. xssFilterMiddleware - XSS 过滤
9. sanitizeInputMiddleware - 输入清理
10. csrfTokenMiddleware - CSRF Token
11. apiLimiter - 速率限制
12. getCsrfMiddleware('xxx') - CSRF 校验（每个路由组）

**严重程度：低**

**优化建议：**
1. 合并功能重叠的中间件（securityHeaders 与 helmet）
2. 将日志中间件改为异步写入，避免阻塞请求
3. 对静态资源路径跳过不必要的中间件
4. CSRF 中间件统一配置，避免每个路由组单独调用

**预期收益：** 单次请求中间件开销减少 20-30%

---

#### 13. 限流阈值配置偏低

**问题描述：**
全局 API 限流设置为 60 次/分钟/IP，对于正常用户的高频操作场景可能造成误拦截。

**当前配置：**
- 全局 API：60 次/分钟/IP
- 登录：5 次/5分钟/IP
- 注册：3 次/小时/IP
- 消息发送：20 次/分钟
- 文件上传：5 次/分钟

**严重程度：低**

**代码位置：**
`packages/server/src/middleware/rateLimiter.js:9-14`

**优化建议：**
1. 区分读接口和写接口的限流阈值
2. 登录用户的限流基于用户ID而非IP
3. 采用滑动窗口算法更精确控制
4. 添加白名单机制（内部服务、管理后台）

**预期收益：** 减少正常用户误拦截，提升用户体验

---

### 计算层面

#### 14. bcrypt 同步哈希阻塞事件循环

**问题描述：**
用户注册和登录时使用 `bcrypt.hashSync` 和 `bcrypt.compareSync` 同步 API，会阻塞 Node.js 事件循环。bcrypt 哈希是 CPU 密集型操作，salt rounds = 10 时单次计算约需 100-200ms。

**影响范围：**
- 用户注册接口
- 用户登录接口
- 修改密码接口
- 所有涉及密码验证的操作

**严重程度：高**

**代码位置：**
`packages/server/src/models/userModel.js:27, 106, 161`

```javascript
// 同步哈希（阻塞）
const hashedPassword = bcrypt.hashSync(userData.password, 10);
return bcrypt.compareSync(password, hash);
```

**阻塞影响分析：**
- 每次注册/登录阻塞事件循环约 100ms
- 阻塞期间无法处理其他任何请求
- 并发注册场景下，吞吐量严重下降

**优化建议：**
1. 改用异步 API：`bcrypt.hash()` 和 `bcrypt.compare()`
2. 将 bcrypt 计算移至 Worker Threads
3. 考虑降低 salt rounds 至 8（权衡安全性与性能）

```javascript
// 异步版本
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);
```

**预期收益：** 事件循环阻塞消除，并发处理能力显著提升

---

#### 15. better-sqlite3 同步 API 阻塞

**问题描述：**
`better-sqlite3` 所有 API 都是同步的，数据库操作会阻塞事件循环。虽然 SQLite 本地查询很快，但复杂查询或大事务仍可能造成 noticeable 的阻塞。

**影响范围：**
- 所有数据库操作
- 复杂查询和事务
- 大数据量批量操作

**严重程度：中**

**优化建议：**
1. 将复杂查询和批量操作移至 Worker Threads
2. 优化查询，减少单次操作的数据量
3. 增加缓存层，减少数据库访问次数
4. 长期考虑迁移至支持异步的数据库（PostgreSQL）

**预期收益：** 减少事件循环阻塞，提升并发处理能力

---

#### 16. JSON 序列化/反序列化开销

**问题描述：**
多处存在 JSON 字符串和对象之间的转换，特别是数据库存取和 API 响应时的大对象序列化。

**高频转换点：**
- 商品 images 字段（productModel.js:8-11, 90-94）
- 订单 shipping_address 字段
- SKU specs 字段
- 大列表接口响应序列化

**严重程度：低**

**优化建议：**
1. 数据库层优化：将高频查询的 JSON 字段拆分为独立列
2. 使用更快的 JSON 库（如 fast-json-stringify 预编译 schema）
3. API 响应按需返回字段，避免传输不必要的大字段

**预期收益：** CPU 消耗降低 10-20%，响应时间缩短

---

## 前端性能瓶颈

### 首屏加载

#### 17. uni-app 主包体积过大

**问题描述：**
所有页面都打包在主包中，没有采用分包加载策略。小程序端主包大小受限（2MB），H5 端首屏需要下载完整 JS bundle。

**当前包结构：**
- 全部页面在主包（约 30+ 页面）
- 包含管理后台、聊天、会员等非首屏必需模块
- 组件和工具函数全部打入主包

**严重程度：高**

**代码位置：**
`packages/app/src/pages.json` - 所有页面平铺，未配置分包

**优化建议：**
按功能模块分包：
```json
{
  "pages": [
    "pages/index/index",
    "pages/product/list",
    "pages/product/detail",
    "pages/category/category",
    "pages/cart/cart",
    "pages/member/member-center",
    "pages/login/login"
  ],
  "subPackages": [
    {
      "root": "pages/order",
      "pages": ["order-list", "order-detail", "order-confirm"]
    },
    {
      "root": "pages/admin",
      "pages": ["dashboard", "product-list", "order-list"]
    },
    {
      "root": "pages/chat",
      "pages": ["chat", "conversations", "ai-chat"]
    }
  ]
}
```

**预期收益：** 首屏 JS 体积减少 40-60%，启动速度提升 30-50%

---

#### 18. 缺少骨架屏和启动优化

**问题描述：**
应用启动时显示白屏，没有骨架屏过渡，用户感知等待时间长。启动流程串行执行，未做并行优化。

**当前启动流程：**
1. uni-app 框架初始化
2. Vue 应用创建
3. Pinia store 初始化
4. 首页组件渲染
5. API 请求数据
6. 数据返回后渲染内容

**严重程度：中**

**优化建议：**
1. 添加首屏骨架屏（uni-app 原生支持）
2. 关键数据预加载（App.onLaunch 中提前请求）
3. 非核心 store 延迟初始化
4. 本地缓存数据优先展示，后台刷新

**预期收益：** 首屏可交互时间缩短 20-40%

---

#### 19. 静态资源未优化

**问题描述：**
图片资源未做格式优化和尺寸适配，banner 图等大图直接加载原图。

**当前问题：**
- banner 图使用 PNG 格式，体积大
- 没有 WebP 等现代格式支持
- 没有根据设备像素比加载不同尺寸图片
- Tabbar 图标未做 SVG 优化

**严重程度：中**

**优化建议：**
1. Banner 图转 WebP 格式，体积减少 30-50%
2. 实现响应式图片加载（根据屏幕宽度）
3. Tabbar 图标使用 SVG 或 iconfont
4. 小图标使用 base64 内联

**预期收益：** 图片资源体积减少 30-60%

---

### 运行时性能

#### 20. 长列表无虚拟滚动

**问题描述：**
商品列表、订单列表等长列表页面使用 `scroll-view + v-for` 全量渲染，数据量增大后 DOM 节点过多，导致滚动卡顿和内存占用高。

**影响范围：**
- 商品列表页
- 订单列表页
- 搜索结果页
- 收藏列表
- 管理后台列表

**严重程度：高**

**代码位置：**
`packages/app/src/pages/product/list.vue:60-62`

```vue
<view class="product-grid">
  <gexm-product-card v-for="product in products" :key="product.id" :product="product" />
</view>
```

**性能影响：**
- 100 个商品卡片 = 100+ DOM 节点
- 滚动时所有节点都在内存中
- 数据越多，滚动越卡

**优化建议：**
1. 使用 `recycle-list`（uni-app 原生组件）
2. 或实现虚拟滚动组件
3. 分页加载时控制每页数量（当前 10 条偏小，可调至 20）
4. 卡片组件使用 `v-memo` 减少不必要的重渲染

**预期收益：** 长列表滚动流畅度提升 5-10 倍，内存占用降低 60-80%

---

#### 21. 商品图片无懒加载

**问题描述：**
商品卡片组件的图片使用原生 `image` 标签，没有懒加载机制。列表页所有图片同时加载，造成首屏带宽浪费和加载缓慢。

**严重程度：中**

**代码位置：**
`packages/app/src/components/gexm-product-card/index.vue:3-7`

```vue
<image
  class="gexm-product-card__image"
  :src="product.main_image || ..."
  mode="aspectFill"
/>
```

**优化建议：**
1. 利用 uni-app `image` 组件的 `lazy-load` 属性（App/小程序端）
2. H5 端实现 Intersection Observer 懒加载
3. 先加载低质量占位图，再渐显高清图
4. 封装统一的懒加载图片组件 `gexm-image-lazy`

**预期收益：** 首屏图片加载量减少 60-70%，滚动更流畅

---

#### 22. Pinia Store 不必要的响应式更新

**问题描述：**
商品列表等数据更新时直接替换整个数组，导致所有依赖该数据的组件全部重新渲染，即使大部分数据没有变化。

**代码位置：**
`packages/app/src/pages/product/list.vue:178`

```javascript
productStore.products = [...productStore.products, ...list];
```

**严重程度：中**

**优化建议：**
1. 列表数据使用 `shallowRef` 减少响应式开销
2. 增量更新时只追加新数据，不替换已有数据
3. 商品卡片组件使用 `v-memo` 精准控制更新
4. 考虑使用虚拟列表，只渲染可视区域

**预期收益：** 列表渲染性能提升 30-50%

---

#### 23. 缺少请求防抖和合并

**问题描述：**
搜索输入等高频交互没有防抖，可能导致大量无效请求；多个独立接口请求可合并但未合并。

**具体问题点：**
- 搜索框实时搜索无防抖
- 商品分类切换每次都重新请求列表
- 首页多个独立请求（banner、分类、推荐商品）串行执行

**严重程度：低**

**优化建议：**
1. 搜索输入添加 300ms 防抖
2. 实现请求合并（批量接口或 GraphQL）
3. 首页数据使用批量接口一次获取
4. 页面数据缓存，返回时不重复请求

**预期收益：** 无效请求减少 50-80%，服务器压力降低

---

#### 24. 内存泄漏风险点

**潜在内存泄漏场景：**

| 场景 | 风险点 | 位置 |
|------|--------|------|
| WebSocket 连接 | 页面卸载时未断开连接 | `utils/websocket.js` |
| 定时器 | 倒计时、轮询未清理 | 各业务页面 |
| 事件监听 | 全局事件未移除 | 组件内监听 |
| 大图片 | 长列表图片未回收 | 列表页 |

**严重程度：低**

**优化建议：**
1. 建立统一的资源清理模式（onUnmounted 钩子）
2. WebSocket 连接池管理，页面切换时自动清理
3. 定时器统一管理，页面销毁时自动清除
4. 添加性能监控，检测内存泄漏

**预期收益：** 避免长时间使用后内存持续增长

---

### 构建性能

#### 25. Vite 构建优化不足

**问题描述：**
Vite 配置比较基础，缺少针对生产构建的深度优化。

**当前构建配置：**
- target: es2015
- minify: terser
- 已配置 drop_console
- chunkSizeWarningLimit: 1000KB

**严重程度：低**

**代码位置：**
`packages/app/vite.config.js:62-76`

**优化建议：**
```javascript
build: {
  target: 'es2015',
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.warn'],
    },
  },
  rollupOptions: {
    output: {
      manualChunks: {
        'vue-vendor': ['vue', 'pinia'],
        'uni-vendor': ['@dcloudio/uni-app', '@dcloudio/uni-h5'],
      },
    },
  },
  cssCodeSplit: true,
  sourcemap: false,
  reportCompressedSize: false,
  chunkSizeWarningLimit: 500,
}
```

**预期收益：** 构建产物体积减少 10-20%，构建速度提升

---

## 网络性能

#### 26. API 请求串行化

**问题描述：**
首页等页面多个接口请求采用串行方式，没有充分利用浏览器并发能力。

**典型场景（首页）：**
1. 请求分类数据 → 等待返回
2. 请求 Banner 数据 → 等待返回
3. 请求推荐商品 → 等待返回

实际这三个请求互不依赖，可以并行执行。

**严重程度：中**

**优化建议：**
1. 使用 `Promise.all` 并行发起独立请求
2. 后端提供聚合接口，一次返回首页所需全部数据
3. 关键数据优先请求，非关键数据延迟加载

```javascript
// 优化前（串行）
const categories = await categoryApi.getList();
const banners = await bannerApi.getList();
const products = await productApi.getRecommend();

// 优化后（并行）
const [categories, banners, products] = await Promise.all([
  categoryApi.getList(),
  bannerApi.getList(),
  productApi.getRecommend(),
]);
```

**预期收益：** 首屏数据加载时间减少 40-60%

---

#### 27. 缺少 HTTP 缓存策略

**问题描述：**
静态资源和 API 响应都没有配置合理的缓存策略，导致重复请求浪费带宽和时间。

**缓存现状：**
- 静态资源：无明确缓存头
- API 响应：无 Cache-Control
- 浏览器每次都重新请求验证

**严重程度：中**

**优化建议：**
1. 静态资源设置长缓存（1年）+ 文件名 hash
2. API 响应添加 ETag / Last-Modified
3. 读多写少的接口设置 Cache-Control: public, max-age=xxx
4. 使用 Service Worker 做离线缓存（PWA）

**预期收益：** 重复访问加载速度提升 50-80%

---

## 资源利用率

#### 28. CPU 密集型操作集中在主线程

**问题描述：**
所有计算都在 Node.js 主线程执行，CPU 密集型操作会阻塞事件循环，影响整体吞吐量。

**CPU 密集型操作清单：**

| 操作 | 类型 | 预计耗时 |
|------|------|----------|
| bcrypt 密码哈希 | CPU 计算 | 100-200ms |
| 大 JSON 序列化 | CPU 计算 | 随数据量增长 |
| 复杂 SQL 查询 | CPU + IO | 视查询复杂度 |
| 图片处理（如有） | CPU 计算 | 较高 |

**严重程度：中**

**优化建议：**
1. bcrypt 改用异步 API
2. 复杂计算移至 Worker Threads
3. 考虑使用 PM2 多进程模式，利用多核 CPU
4. 大响应使用流式输出（stream）

**预期收益：** 单进程吞吐量提升 2-4 倍（多核场景）

---

## 并发处理瓶颈

### 29. Node.js 单线程模型限制

**问题描述：**
当前以单进程模式运行，无法充分利用多核 CPU。CPU 密集型操作会阻塞整个进程。

**当前承载估算（单进程）：**
- 简单查询接口：~100 QPS
- 复杂查询接口：~30 QPS
- 写操作接口：~20 QPS
- 登录/注册接口：~5 QPS（受 bcrypt 阻塞）

**严重程度：高**

**优化建议：**
1. 使用 PM2 集群模式，启动与 CPU 核数相等的工作进程
2. 配置负载均衡（Nginx 反向代理）
3. 状态共享改用 Redis（Session、限流计数等）
4. WebSocket 使用 Redis Adapter 支持多节点

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gexm-server',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' }
  }]
};
```

**预期收益：** 吞吐量线性提升（N 核 CPU ≈ N 倍单进程性能）

---

### 30. 数据库连接池限制

**问题描述：**
SQLite 单连接模型，不支持连接池。所有请求串行访问数据库，是并发瓶颈之一。

**严重程度：高**

**优化建议：**
1. 短期：优化查询和缓存，减少数据库访问
2. 中期：引入 Redis 缓存，承担大部分读压力
3. 长期：迁移至 PostgreSQL/MySQL，使用连接池

**预期收益：** 数据库层并发能力提升 10-100 倍

---

## 性能测试方案建议

### 测试工具推荐

| 工具 | 适用场景 | 优点 |
|------|----------|------|
| **autocannon** | HTTP/HTTPS 压测 | 简单易用，Node.js 生态，支持 HTTP/2 |
| **artillery** | 复杂场景压测 | 支持场景编排，报表丰富 |
| **wrk** | 高并发基准测试 | 性能极高，C 语言实现 |
| **k6** | 脚本化压测 | 现代化，JS 脚本，云原生 |
| **Lighthouse** | 前端性能审计 | 谷歌官方，综合评分 |
| **WebPageTest** | 网页性能测试 | 多地区、多设备测试 |

### 关键性能指标

| 指标类别 | 具体指标 | 目标值 |
|---------|---------|--------|
| **响应时间** | P50（中位数） | < 100ms |
| | P95（95分位） | < 300ms |
| | P99（99分位） | < 500ms |
| **吞吐量** | QPS（单进程） | > 50（写）/ > 200（读） |
| **错误率** | HTTP 错误率 | < 0.1% |
| **资源使用** | CPU 使用率 | < 70% |
| | 内存使用率 | < 80% |
| **前端指标** | FCP（首次内容绘制） | < 1.5s |
| | LCP（最大内容绘制） | < 2.5s |
| | TTI（可交互时间） | < 3.5s |

### 基准测试场景设计

#### 场景 1：首页加载压测
- **接口**：商品列表、分类、Banner
- **并发用户**：50 / 100 / 200
- **持续时间**：2 分钟
- **验证点**：P95 响应时间、错误率、CPU 使用率

#### 场景 2：用户登录压测
- **接口**：登录接口
- **并发用户**：10 / 20 / 50
- **持续时间**：1 分钟
- **验证点**：bcrypt 阻塞影响、限流触发点

#### 场景 3：下单流程压测
- **接口**：创建订单
- **并发用户**：10 / 30 / 50
- **持续时间**：2 分钟
- **验证点**：数据库写性能、事务锁等待

#### 场景 4：秒杀场景压测
- **接口**：秒杀商品下单
- **并发用户**：100 / 500 / 1000
- **持续时间**：30 秒
- **验证点**：库存超卖、系统稳定性

#### 场景 5：混合场景压测
- **接口组合**：浏览 60% + 搜索 20% + 下单 10% + 个人中心 10%
- **并发用户**：50 / 100 / 200
- **持续时间**：5 分钟
- **验证点**：整体系统稳定性、资源瓶颈

### 性能监控指标建议

**应用层指标：**
- 请求量（QPS/RPM）
- 响应时间分布（P50/P95/P99）
- 错误率（按接口、按状态码）
- 业务指标（下单量、支付成功率）

**系统层指标：**
- CPU 使用率、负载
- 内存使用率、GC 情况
- 磁盘 IO、网络 IO
- 连接数、句柄数

**数据库指标：**
- 查询次数、慢查询数
- 连接数、锁等待
- 缓存命中率

**前端指标：**
- 页面加载时间（FCP/LCP）
-  JS 错误率
- 接口成功率、耗时
- 用户交互响应时间

---

## 性能优化路线图

### 短期（1-2 周）可落地优化

**优先级：高**

| 序号 | 优化项 | 预计收益 | 开发量 |
|------|--------|----------|--------|
| 1 | 启用 Gzip 响应压缩 | 响应体积减 60% | 0.5 天 |
| 2 | bcrypt 改用异步 API | 消除事件循环阻塞 | 0.5 天 |
| 3 | 修复订单服务 N+1 查询 | 订单接口快 2-5 倍 | 1 天 |
| 4 | 管理后台统计 SQL 优化 | 统计接口快 3-5 倍 | 1 天 |
| 5 | 前端图片懒加载 | 首屏图片减 60% | 1 天 |
| 6 | 首页请求并行化 | 首屏快 40% | 0.5 天 |
| 7 | 补充关键联合索引 | 查询快 2-3 倍 | 0.5 天 |

**短期优化后预估：**
- 单进程读 QPS：50 → 150
- 单进程写 QPS：20 → 40
- 首屏加载时间：减少 30-50%

---

### 中期（1-2 月）规划优化

**优先级：中高**

| 序号 | 优化项 | 预计收益 | 开发量 |
|------|--------|----------|--------|
| 1 | 引入 Redis 缓存层 | 读性能提升 5-20 倍 | 2 周 |
| 2 | PM2 多进程集群 | 吞吐量提升 N 倍（核数） | 1 周 |
| 3 | 前端分包加载 | 首屏 JS 减 40-60% | 1 周 |
| 4 | 长列表虚拟滚动 | 列表性能提升 5-10 倍 | 1 周 |
| 5 | 商品搜索 FTS5 优化 | 搜索性能提升 10 倍 | 1 周 |
| 6 | 接口数据按需返回 | 响应体积减 20-30% | 1 周 |
| 7 | HTTP 缓存策略 | 重复访问快 50%+ | 0.5 周 |

**中期优化后预估：**
- 整体 QPS：200 → 500+
- 支持并发用户数：500 → 2000+
- 首屏加载：3s → 1.5s 以内

---

### 长期（3-6 月）架构调整

**优先级：中长期**

| 序号 | 优化项 | 预计收益 | 开发量 |
|------|--------|----------|--------|
| 1 | 数据库迁移 PostgreSQL | 并发能力提升 100 倍 | 4 周 |
| 2 | 微服务架构拆分 | 独立扩展、故障隔离 | 2-3 月 |
| 3 | 引入消息队列（MQ） | 异步解耦、削峰填谷 | 2 周 |
| 4 | CDN 静态资源加速 | 静态资源加载快 3-10 倍 | 1 周 |
| 5 | 全链路监控体系 | 快速定位性能问题 | 2 周 |
| 6 | 数据库读写分离 | 读能力线性扩展 | 2 周 |
| 7 | 弹性伸缩架构 | 自动应对流量高峰 | 3 周 |

**长期优化后预估：**
- 系统 QPS：500 → 10000+
- 支持并发用户：万级 → 十万级
- 高可用性：99.9% → 99.99%

---

## 系统性能评级与承载预估

### 当前性能评级

| 维度 | 评级 | 说明 |
|------|------|------|
| **整体性能** | ⭐⭐ | 基础可用，性能瓶颈明显 |
| **后端性能** | ⭐⭐ | SQLite 限制明显，优化空间大 |
| **前端性能** | ⭐⭐⭐ | 基本流畅，长列表和首屏待优化 |
| **并发能力** | ⭐ | 单进程单连接，并发能力弱 |
| **可扩展性** | ⭐⭐ | 架构简单，扩展需较大改造 |
| **综合评级** | **C 级** | 适合中小规模，需优化以应对增长 |

### 承载能力预估

#### 当前架构（单节点）

| 指标 | 低值（保守） | 典型值 | 峰值（极限） |
|------|-------------|--------|-------------|
| 同时在线用户 | 50 人 | 100 人 | 200 人 |
| 日活用户（DAU） | 500 人 | 1000 人 | 2000 人 |
| QPS（混合负载） | 20 | 50 | 100 |
| 日订单量 | 50 单 | 200 单 | 500 单 |
| 商品数据量 | 1000 件 | 10000 件 | 50000 件 |
| 用户数据量 | 1 万人 | 5 万人 | 10 万人 |

#### 短期优化后

| 指标 | 预估数值 | 提升倍率 |
|------|---------|---------|
| QPS（混合负载） | 100-150 | 2-3x |
| 日订单量 | 500-1000 单 | 3-5x |
| 同时在线用户 | 300-500 人 | 3-5x |

#### 中期优化后（PM2 + Redis）

| 指标 | 预估数值 | 提升倍率 |
|------|---------|---------|
| QPS（混合负载） | 500-800 | 10-15x |
| 日订单量 | 3000-5000 单 | 15-25x |
| 同时在线用户 | 2000-3000 人 | 10-20x |

#### 长期架构升级后（PostgreSQL + 微服务）

| 指标 | 预估数值 | 提升倍率 |
|------|---------|---------|
| QPS（混合负载） | 5000-10000+ | 100-200x |
| 日订单量 | 10 万+ 单 | 500x+ |
| 同时在线用户 | 5 万+ 人 | 100x+ |

---

## 总结与建议

### 核心发现

1. **最大瓶颈**：SQLite 单连接 + better-sqlite3 同步 API，严重限制并发写入能力
2. **最易优化**：启用 Gzip 压缩、bcrypt 异步化、N+1 查询修复，半天即可见效
3. **性价比最高**：引入 Redis 缓存 + PM2 集群，投入产出比最优
4. **前端重点**：长列表虚拟滚动 + 分包加载，用户感知提升最明显

### 行动建议

**立即执行（本周内）：**
1. 启用 Gzip/Brotli 响应压缩
2. bcrypt 同步改异步
3. 修复订单服务 N+1 查询
4. 补充关键数据库索引

**本月重点：**
1. 引入 Redis 缓存热点数据
2. PM2 多进程部署
3. 前端分包加载改造
4. 商品图片懒加载

**季度规划：**
1. 评估 PostgreSQL 迁移方案
2. 建立性能监控体系
3. 前端性能持续优化
4. 压测验证和容量规划

---

> **报告结束**
>
> 本报告基于当前代码静态分析生成，实际性能数据需通过压测验证。建议先落地短期优化项，建立性能基线后再逐步推进中远期优化。
