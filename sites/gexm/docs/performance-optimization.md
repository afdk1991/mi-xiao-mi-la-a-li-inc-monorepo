# Gexm 平台性能优化方案

## 文档概述

本文档针对 Gexm 全平台应用系统进行全面的性能分析，并提供可落地的优化方案。涵盖前端（uni-app）、后端（Node.js + SQLite）两个层面。

---

## 一、前端性能优化

### 1.1 资源加载优化

#### 1.1.1 图片懒加载方案

**现状分析：**
- 项目已存在 `gexm-image-lazy` 组件，但未在所有页面广泛使用
- 首页商品列表、商品详情页等图片较多的页面未统一使用懒加载
- Banner 图为本地 PNG 格式，体积较大

**优化方案：**

| 优化项 | 优先级 | 预期收益 | 实施难度 |
|--------|--------|----------|----------|
| 统一使用懒加载组件 | 高 | 首屏加载减少 30-50% 图片请求 | 低 |
| WebP 格式支持 | 中 | 图片体积减少 25-35% | 中 |
| 图片尺寸适配 | 中 | 避免加载过大图片 | 低 |
| 占位图优化 | 低 | 提升视觉体验 | 低 |

**具体实施：**

```vue
<!-- 推荐用法：统一使用 gexm-image-lazy 组件 -->
<gexm-image-lazy 
  :src="product.main_image" 
  mode="aspectFill"
  :placeholder="'/static/images/placeholder.svg'"
/>
```

**图片压缩建议：**
- 使用 tinypng 等工具批量压缩现有 PNG/JPG
- Banner 图建议压缩到 100KB 以内
- 商品主图建议控制在 200KB 以内

#### 1.1.2 分包加载策略（uni-app 分包）

**现状分析：**
- 当前所有页面都在主包中，无分包配置
- 管理后台页面（admin 目录）普通用户不会访问
- 部分功能页面（如 AI 聊天、评论）使用频率较低

**优化方案：**

推荐分包结构：

```
├── 主包 (pages/)
│   ├── index/index          # 首页
│   ├── category/category    # 分类
│   ├── cart/cart            # 购物车
│   ├── profile/profile      # 我的
│   ├── login/login          # 登录
│   ├── register/register    # 注册
│   └── product/             # 商品相关（高频）
├── 分包A - 用户中心 (subPackages/user/)
│   ├── address/             # 地址管理
│   ├── order/               # 订单相关
│   ├── favorites/           # 收藏
│   ├── review/              # 评价
│   ├── edit-profile/        # 编辑资料
│   └── settings/            # 设置
├── 分包B - 内容互动 (subPackages/content/)
│   ├── chat/                # 聊天
│   ├── comments/            # 留言板
│   ├── notifications/       # 通知
│   └── search/              # 搜索
└── 分包C - 管理后台 (subPackages/admin/)
    └── admin/               # 全部管理页面
```

**配置示例（pages.json）：**

```json
{
  "pages": [
    { "path": "pages/index/index" },
    { "path": "pages/category/category" },
    { "path": "pages/cart/cart" },
    { "path": "pages/profile/profile" },
    { "path": "pages/login/login" },
    { "path": "pages/register/register" },
    { "path": "pages/product/list" },
    { "path": "pages/product/detail" }
  ],
  "subPackages": [
    {
      "root": "subPackages/user",
      "pages": [
        { "path": "address/address-list" },
        { "path": "address/address-edit" },
        { "path": "order/order-list" },
        { "path": "order/order-detail" },
        { "path": "order/order-confirm" },
        { "path": "payment/payment" },
        { "path": "favorites/favorites" },
        { "path": "review/review-list" },
        { "path": "review/review-publish" },
        { "path": "edit-profile/edit-profile" },
        { "path": "settings/settings" }
      ]
    },
    {
      "root": "subPackages/content",
      "pages": [
        { "path": "chat/conversations" },
        { "path": "chat/chat" },
        { "path": "chat/ai-chat" },
        { "path": "comments/comments" },
        { "path": "notifications/notifications" },
        { "path": "search/search" }
      ]
    },
    {
      "root": "subPackages/admin",
      "pages": [
        { "path": "admin/product-list" },
        { "path": "admin/product-edit" },
        { "path": "admin/order-list" },
        { "path": "admin/order-detail" },
        { "path": "admin/order-statistics" }
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["subPackages/content"]
    },
    "pages/profile/profile": {
      "network": "all",
      "packages": ["subPackages/user"]
    }
  }
}
```

**预期收益：**
- 主包体积减少 40-60%
- 小程序启动速度提升 30-50%
- H5 首屏 JS 体积显著减少

#### 1.1.3 资源压缩与 CDN 配置

**现状分析：**
- 静态资源未配置 CDN
- H5 构建产物未开启 Gzip 压缩
- 未配置资源缓存策略

**优化方案：**

**Vite 构建优化（vite.config.js）：**

```javascript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  build: {
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 生产环境移除 console
        drop_debugger: true,
      },
    },
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
        },
      },
    },
    // 超大文件警告阈值
    chunkSizeWarningLimit: 1000,
  },
})
```

**Nginx Gzip 配置（生产环境）：**

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types
  text/plain
  text/css
  text/xml
  text/javascript
  application/json
  application/javascript
  application/xml+rss
  application/vnd.ms-fontobject
  application/x-font-ttf
  font/opentype
  image/svg+xml
  image/x-icon;
```

**CDN 配置建议：**
- 静态资源（图片、JS、CSS）使用 CDN 加速
- 配置合理的缓存策略：
  - HTML: no-cache
  - CSS/JS: 1年（带 hash 版本号）
  - 图片: 30天

---

### 1.2 运行时性能

#### 1.2.1 长列表性能优化（虚拟列表方案）

**现状分析：**
- 商品列表、订单列表、消息列表等使用 scroll-view + v-for 渲染
- 数据量较大时（>100条）会出现卡顿
- 未使用虚拟列表技术

**优化方案：**

**方案一：uni-app 内置虚拟化（推荐）**

使用 `recycle-list` 或第三方虚拟列表组件：

```vue
<template>
  <recycle-list 
    v-for="(item, index) in list" 
    :key="item.id"
    :size="itemSize"
  >
    <cell-slot>
      <gexm-product-card :product="item" />
    </cell-slot>
  </recycle-list>
</template>
```

**方案二：分页加载 + 数据截断**

```javascript
// 列表数据上限控制，避免内存无限增长
const MAX_LIST_LENGTH = 200;

function addProducts(newItems) {
  const all = [...products.value, ...newItems];
  if (all.length > MAX_LIST_LENGTH) {
    all.splice(0, all.length - MAX_LIST_LENGTH);
  }
  products.value = all;
}
```

**适用页面优先级：**
1. 商品列表页（高）
2. 订单列表页（中）
3. 消息列表页（中）
4. 评论列表页（低）

#### 1.2.2 内存泄漏检查点

**常见泄漏场景及排查：**

| 场景 | 检查点 | 修复方案 |
|------|--------|----------|
| 定时器 | setInterval/setTimeout | onUnmounted 中清除 |
| 事件监听 | uni.$on / addEventListener | onUnmounted 中移除 |
| WebSocket | socket 连接 | 页面销毁时关闭连接 |
| 大图片 | 长列表图片 | 图片懒加载 + 离屏释放 |
| Store | Pinia 数据无限增长 | 定期清理不必要的数据 |

**检查工具：**
- H5: Chrome DevTools Memory 面板
- 小程序: 微信开发者工具性能面板

#### 1.2.3 首屏加载优化

**优化策略：**

1. **骨架屏（Skeleton）**
   - 首页、商品列表页添加骨架屏
   - 减少用户感知等待时间

2. **关键数据预加载**
   ```javascript
   // App.vue 中预加载分类数据
   onLaunch(() => {
     categoryStore.fetchCategories().catch(() => {})
   })
   ```

3. **首屏接口优化**
   - 合并首页多个接口为一个（BFF 层）
   - 减少 HTTP 请求次数

4. **路由懒加载**
   - 非首屏页面按需加载
   - 配合分包策略效果更佳

---

### 1.3 代码层面

#### 1.3.1 组件复用与合理拆分

**现状分析：**
- 已有 20+ 个通用组件，基础良好
- 部分页面存在重复逻辑
- 业务组件拆分粒度可优化

**优化建议：**

1. **提取通用业务组件**
   - 商品筛选器组件
   - 价格展示组件
   - 状态标签组件

2. **使用 Composition API 复用逻辑**
   ```javascript
   // composables/usePagination.js
   export function usePagination(fetchFn, options = {}) {
     const list = ref([])
     const loading = ref(false)
     const page = ref(1)
     const pageSize = ref(options.pageSize || 20)
     const hasMore = ref(true)
     
     async function loadMore() { /* ... */ }
     async function refresh() { /* ... */ }
     
     return { list, loading, page, pageSize, hasMore, loadMore, refresh }
   }
   ```

#### 1.3.2 计算属性缓存

**优化原则：**
- 复杂计算逻辑使用 `computed` 缓存结果
- 避免在模板中调用方法执行复杂计算
- Store 中的派生状态使用 getter

**反模式示例：**
```vue
<template>
  <!-- 避免：每次渲染都重新计算 -->
  <text>{{ formatPrice(product.price) }}</text>
</template>
```

**优化后：**
```vue
<script setup>
const formattedPrice = computed(() => formatPrice(product.price))
</script>

<template>
  <text>{{ formattedPrice }}</text>
</template>
```

#### 1.3.3 防抖节流使用规范

**应用场景：**

| 场景 | 类型 | 建议延迟 |
|------|------|----------|
| 搜索输入 | 防抖 | 300ms |
| 窗口 resize | 防抖 | 200ms |
| 按钮防重复点击 | 节流 | 1000ms |
| 滚动加载 | 节流 | 200ms |
| 表单实时校验 | 防抖 | 500ms |

**工具函数封装：**

```javascript
// utils/index.js
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function throttle(fn, delay = 300) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}
```

---

## 二、后端性能优化

### 2.1 数据库优化

#### 2.1.1 索引优化建议

**现状分析：**
- 基础索引已建立（users、products、orders 等）
- 部分查询场景缺少联合索引
- 搜索使用 LIKE '%keyword%' 无法利用索引

**已存在的索引（良好）：**
- `idx_users_username`, `idx_users_email`
- `idx_products_category`, `idx_products_status`
- `idx_orders_user`, `idx_orders_status`
- `idx_messages_conversation`, `idx_messages_created_at`

**建议新增的索引：**

| 表名 | 索引字段 | 类型 | 用途 | 优先级 |
|------|----------|------|------|--------|
| products | (status, category_id, sort_order) | 联合索引 | 商品列表筛选排序 | 高 |
| orders | (user_id, status, created_at) | 联合索引 | 用户订单列表 | 高 |
| order_items | (order_id) | 普通索引 | 订单项查询 | 高 |
| messages | (conversation_id, created_at DESC) | 联合索引 | 消息分页 | 中 |
| reviews | (product_id, status, created_at) | 联合索引 | 商品评价列表 | 中 |
| carts | (user_id, product_id) | 联合索引 | 购物车去重 | 低 |

**SQLite 索引创建语句：**

```sql
-- 商品列表优化
CREATE INDEX IF NOT EXISTS idx_products_status_category_sort 
ON products(status, category_id, sort_order);

-- 订单列表优化
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
ON orders(user_id, status, created_at);

-- 订单项索引（已存在 idx_order_items_order，确认是否生效）
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 消息列表优化
CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
ON messages(conversation_id, created_at DESC);

-- 评价列表优化
CREATE INDEX IF NOT EXISTS idx_reviews_product_status_created 
ON reviews(product_id, status, created_at);
```

#### 2.1.2 查询优化（N+1 问题检查）

**发现的 N+1 查询问题：**

1. **订单列表查询** (`orderService.getOrderList`)
   - 先查订单列表（1次查询）
   - 循环每个订单查订单项（N次查询）
   - **影响：** 订单越多性能越差

2. **商品列表 JSON 解析**
   - 每条记录都要 JSON.parse(images)
   - 可考虑批量处理

**优化方案：**

**订单列表优化：**

```javascript
// 优化前：N+1 查询
getOrderList(userId, { page = 1, pageSize = 10, status = '' } = {}) {
  const { orders, total } = orderModel.findByUserId(userId, { page, pageSize, status });
  const ordersWithItems = orders.map(order => {
    order.items = orderModel.getOrderItems(order.id);  // N次查询
    return order;
  });
  return { orders: ordersWithItems, total };
}

// 优化后：2次查询 + 内存组装
getOrderList(userId, { page = 1, pageSize = 10, status = '' } = {}) {
  const { orders, total } = orderModel.findByUserId(userId, { page, pageSize, status });
  
  if (orders.length === 0) {
    return { orders: [], total };
  }
  
  // 批量查询所有订单项
  const orderIds = orders.map(o => o.id);
  const placeholders = orderIds.map(() => '?').join(',');
  const allItems = db.prepare(`
    SELECT * FROM order_items 
    WHERE order_id IN (${placeholders})
    ORDER BY created_at ASC
  `).all(...orderIds);
  
  // 按订单分组
  const itemsByOrder = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.order_id]) {
      itemsByOrder[item.order_id] = [];
    }
    itemsByOrder[item.order_id].push(item);
  }
  
  // 组装数据
  const ordersWithItems = orders.map(order => ({
    ...order,
    items: itemsByOrder[order.id] || [],
    shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : {},
  }));
  
  return { orders: ordersWithItems, total };
}
```

**预期收益：**
- 订单列表查询性能提升 50-80%（10条订单时）
- 大幅减少数据库查询次数

#### 2.1.3 连接池配置

**现状分析：**
- 使用 better-sqlite3（同步、单连接）
- 无连接池概念
- 适合中小规模应用

**优化建议（SQLite 场景）：**

1. **WAL 模式已启用**（`journal_mode = WAL`）✅
   - 支持读写并发
   - 性能优于默认模式

2. **优化 PRAGMA 配置：**

```javascript
// models/index.js 中补充
db.pragma('synchronous = NORMAL');  // 平衡性能与安全性
db.pragma('cache_size = -64000');   // 64MB 缓存
db.pragma('temp_store = MEMORY');   // 临时表放内存
db.pragma('mmap_size = 268435456'); // 256MB 内存映射
```

#### 2.1.4 SQLite 到 MySQL 迁移方案（未来扩展）

**迁移时机判断：**
- 日活用户 > 1000
- 并发写入 > 10 TPS
- 数据库文件 > 1GB
- 需要复杂查询或多表关联

**迁移步骤：**

1. **数据模型适配层**
   ```javascript
   // models/db.js - 抽象数据库层
   let db;
   if (config.database.type === 'sqlite') {
     db = require('./sqlite');
   } else if (config.database.type === 'mysql') {
     db = require('./mysql');
   }
   module.exports = db;
   ```

2. **迁移工具**
   - 使用 `sqlite3-to-mysql` 等工具
   - 编写数据校验脚本

3. **SQL 语法差异处理**
   - SQLite: `AUTOINCREMENT` → MySQL: `AUTO_INCREMENT`
   - SQLite: `TEXT` → MySQL: `VARCHAR/TEXT`
   - SQLite: `INTEGER` → MySQL: `INT/BIGINT`

---

### 2.2 接口性能

#### 2.2.1 响应时间优化

**现状分析：**
- 大部分接口响应时间应在 100ms 以内
- 搜索接口（LIKE 查询）可能较慢
- 订单列表存在 N+1 问题

**优化清单：**

| 接口 | 现状 | 优化方向 | 预期优化后 |
|------|------|----------|------------|
| 商品列表 | 中等 | 索引优化 + 缓存 | < 50ms |
| 商品详情 | 良好 | 缓存 | < 30ms |
| 订单列表 | 较差 | N+1 优化 + 索引 | < 100ms |
| 搜索接口 | 较差 | 全文索引/Redis | < 200ms |
| 登录接口 | 良好 | - | < 100ms |

#### 2.2.2 分页查询规范

**现有问题：**
- 分页参数未做上限校验
- 大页码查询性能下降（OFFSET 问题）

**规范建议：**

```javascript
// 工具函数：安全的分页参数
function getPaginationParams(page, pageSize, maxPageSize = 100) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(maxPageSize, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (safePage - 1) * safePageSize;
  return { page: safePage, pageSize: safePageSize, offset };
}
```

**深分页优化（游标分页）：**

```javascript
// 适用于无限滚动列表
function findByCursor(lastId, limit = 20) {
  return db.prepare(`
    SELECT * FROM products 
    WHERE id < ? AND status = 'on_sale'
    ORDER BY id DESC
    LIMIT ?
  `).all(lastId, limit);
}
```

#### 2.2.3 接口缓存策略（Redis 方案）

**引入 Redis 的时机：**
- 接口 QPS > 100
- 热点数据读多写少
- 需要分布式会话/限流

**缓存层级设计：**

```
┌─────────────────────────┐
│   应用内存缓存 (L1)      │  热点数据，容量小，速度最快
└─────────────────────────┘
            ↓
┌─────────────────────────┐
│   Redis 缓存 (L2)        │  共享缓存，支持过期、淘汰
└─────────────────────────┘
            ↓
┌─────────────────────────┐
│   SQLite 数据库 (L3)     │  持久化存储
└─────────────────────────┘
```

**推荐缓存的数据：**

| 数据类型 | 缓存策略 | TTL | 更新方式 |
|----------|----------|-----|----------|
| 商品分类 | 全量缓存 | 1小时 | 主动失效 |
| 商品详情 | 单条缓存 | 30分钟 | 主动更新 |
| 热门商品列表 | 列表缓存 | 10分钟 | 定时刷新 |
| 用户信息 | 单条缓存 | 15分钟 | 主动更新 |
| 搜索热词 | 全量缓存 | 5分钟 | 定时刷新 |

**Redis 集成示例：**

```javascript
// config/redis.js
const Redis = require('ioredis');
const config = require('./index');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db || 0,
  lazyConnect: true,
});

// 缓存工具函数
async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setCache(key, value, ttl = 300) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // 缓存失败不影响主流程
  }
}

module.exports = { redis, getCache, setCache };
```

---

### 2.3 服务层面

#### 2.3.1 并发处理优化

**现状分析：**
- Node.js 单线程事件循环
- 同步数据库操作（better-sqlite3）会阻塞事件循环
- 未使用集群模式

**优化方案：**

1. **PM2 集群模式（生产环境）**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gexm-server',
    script: 'src/server.js',
    instances: 'max',     // 根据 CPU 核心数启动
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
  }]
};
```

2. **异步化数据库操作（中长期）**
   - 迁移到 mysql2/promise
   - 或使用 better-sqlite3 的 worker_threads

3. **CPU 密集型任务 offload**
   - 图片处理
   - 大数据计算
   - 使用 worker_threads 或子进程

#### 2.3.2 静态资源服务优化

**当前问题：**
- 上传文件通过 Express 静态服务提供
- 无缓存头配置
- 无文件压缩

**优化方案：**

```javascript
// app.js 中优化静态资源服务
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '30d',          // 30天缓存
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || 
        filePath.endsWith('.png') || 
        filePath.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  },
}));
```

**生产环境建议：**
- 使用 Nginx 托管静态资源
- 或上传到对象存储（OSS/COS/S3）
- 配合 CDN 加速

#### 2.3.3 Gzip 压缩配置

**Express 中间件：**

```javascript
// 安装依赖
// npm install compression

const compression = require('compression');

app.use(compression({
  level: 6,
  threshold: 1024,  // 1KB 以上才压缩
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
```

---

## 三、优化实施路线图

### 第一阶段：低投入高收益（1-2 天）

- [ ] 新增数据库联合索引（商品、订单）
- [ ] 修复订单列表 N+1 查询问题
- [ ] 优化 SQLite PRAGMA 配置
- [ ] 统一使用图片懒加载组件
- [ ] 前端列表数据上限控制

### 第二阶段：中等投入（3-5 天）

- [ ] uni-app 分包配置
- [ ] Express Gzip 压缩
- [ ] 静态资源缓存头配置
- [ ] 接口响应时间埋点监控
- [ ] 搜索防抖优化

### 第三阶段：长期优化（1-2 周）

- [ ] Redis 缓存接入
- [ ] PM2 集群部署
- [ ] 虚拟列表组件实现
- [ ] CDN 配置
- [ ] MySQL 迁移准备

---

## 四、性能监控建议

### 前端监控指标：
- FCP（首次内容绘制）
- LCP（最大内容绘制）
- 页面加载时间
- 接口响应时间
- 内存使用情况

### 后端监控指标：
- 接口响应时间（P50/P95/P99）
- 错误率
- QPS
- 数据库查询耗时
- 内存/CPU 使用率

### 工具推荐：
- APM: Sentry / OpenTelemetry
- 日志: Winston + ELK
- 告警: 企业微信/钉钉机器人
