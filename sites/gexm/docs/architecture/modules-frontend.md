# Gexm 前端模块分析文档

## 1. 项目概览

### 1.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4.21 | 前端框架 |
| uni-app | 3.0.0-alpha | 跨端开发框架 |
| Pinia | 2.1.7 | 状态管理 |
| Vite | 5.2.8 | 构建工具 |
| SCSS / Sass | 1.71.1 | CSS 预处理器 |

### 1.2 架构模式

项目采用 **MVVM** 架构模式，基于 uni-app + Vue 3 + Pinia 构建全平台电商应用：

- **视图层 (View)**: Vue 组件 / uni-app 页面
- **视图模型层 (ViewModel)**: Vue 3 Composition API + Pinia Stores
- **模型层 (Model)**: API 层 + 本地存储

### 1.3 目录结构说明

```
packages/app/src/
├── api/                    # API 请求层（26个模块）
│   ├── request.js          # 统一请求封装
│   ├── index.js            # API 统一导出
│   ├── auth.js             # 认证相关
│   ├── product.js          # 商品相关
│   ├── cart.js             # 购物车相关
│   ├── order.js            # 订单相关
│   ├── chat.js             # 聊天相关
│   └── ...                 # 其他业务模块
├── components/             # 公共组件库（gexm-xxx 系列）
│   ├── gexm-nav-bar/       # 导航栏
│   ├── gexm-product-card/  # 商品卡片
│   ├── gexm-tab-bar/       # 底部导航
│   ├── gexm-loading/       # 加载组件
│   ├── gexm-empty/         # 空状态组件
│   ├── gexm-sku-selector/  # SKU 选择器
│   └── ...                 # 其他组件
├── pages/                  # 页面模块（按功能分组）
│   ├── index/              # 首页
│   ├── category/           # 分类页
│   ├── product/            # 商品相关页
│   ├── cart/               # 购物车
│   ├── order/              # 订单相关
│   ├── chat/               # AI 对话
│   ├── admin/              # 管理后台
│   └── ...                 # 其他页面
├── store/                  # Pinia 状态管理（11个 store）
│   ├── app.js              # 应用全局状态
│   ├── user.js             # 用户状态
│   ├── cart.js             # 购物车状态
│   ├── product.js          # 商品状态
│   ├── order.js            # 订单状态
│   ├── chat.js             # 聊天状态
│   └── ...                 # 其他 store
├── utils/                  # 工具函数
│   ├── request.js          # HTTP 请求工具
│   ├── errorMonitor.js     # 错误监控
│   ├── websocket.js        # WebSocket 服务
│   ├── syncManager.js      # 数据同步管理
│   └── index.js            # 通用工具函数
├── static/                 # 静态资源
│   ├── images/             # 图片资源
│   ├── tabbar/             # 底部导航图标
│   └── tabs/               # 标签页图标
├── styles/                 # 全局样式
│   ├── variables.scss      # SCSS 变量
│   └── global.scss         # 全局样式
├── App.vue                 # 应用根组件
├── main.js                 # 应用入口
├── pages.json              # 页面路由配置
└── manifest.json           # 应用配置
```

### 1.4 构建工具

项目使用 **Vite + uni-app CLI** 构建，支持多端编译：

```json
{
  "dev:h5": "uni",                    // H5 开发
  "dev:mp-weixin": "uni -p mp-weixin", // 微信小程序
  "dev:mp-alipay": "uni -p mp-alipay", // 支付宝小程序
  "dev:app": "uni -p app",            // App
  "build:h5": "uni build",            // H5 构建
  "build:mp-weixin": "uni build -p mp-weixin"
}
```

---

## 2. 核心基础设施模块

### 2.1 应用入口 (main.js / App.vue)

#### 模块名称与文件路径
- **入口文件**: `packages/app/src/main.js`
- **根组件**: `packages/app/src/App.vue`

#### 功能描述
应用入口负责初始化 Vue 应用、Pinia 状态管理、全局错误过滤和应用生命周期管理。

#### 关键组件/方法

**main.js** - `createApp()`
- 创建 SSR 兼容的 Vue 应用实例
- 注册 Pinia 状态管理
- 配置已知错误过滤（抑制 uni-app/Vue 内部已知警告）

**App.vue** - 生命周期钩子
- `onLaunch()`: 应用启动时初始化
  - 调用 `appStore.initApp()` 初始化应用状态
  - 调用 `userStore.initFromStorage()` 从本地存储恢复用户信息
  - 调用 `errorMonitor.init()` 初始化错误监控
- `onShow()`: 应用显示时触发
- `onHide()`: 应用隐藏时触发

#### 输入输出规范
- 输出: `{ app, pinia }` - Vue 应用实例和 Pinia 实例

#### 依赖关系
- 依赖: `vue`, `pinia`, `./App.vue`
- Store 依赖: `useAppStore`, `useUserStore`
- 工具依赖: `errorMonitor`

#### 集成点
- 在 `onLaunch` 中完成全局初始化
- 通过 Pinia 进行全局状态管理
- 通过 errorMonitor 进行全局错误捕获

---

### 2.2 Store 层 - Pinia 状态管理

#### 模块名称与文件路径
- **目录**: `packages/app/src/store/`
- **Store 列表**:
  - `app.js` - 应用全局状态
  - `user.js` - 用户状态
  - `cart.js` - 购物车状态
  - `product.js` - 商品状态
  - `order.js` - 订单状态
  - `chat.js` - 聊天状态
  - `category.js` - 分类状态
  - `address.js` - 地址状态
  - `favorite.js` - 收藏状态
  - `comment.js` - 评论状态

#### 功能描述
采用 Pinia 进行集中式状态管理，每个业务模块对应一个独立的 store，支持：
- 状态持久化（用户信息、会话信息等）
- 异步 actions（API 调用封装）
- 计算属性 getters
- 模块化组织

#### 关键组件/方法

每个 Store 采用标准结构：
```javascript
defineStore('name', {
  state: () => ({}),    // 状态
  getters: {},          // 计算属性
  actions: {}           // 方法（支持异步）
})
```

#### 依赖关系
- 每个业务 store 依赖对应的 API 模块
- 所有 store 依赖 `pinia`
- chat store 额外依赖 `websocket` 服务

#### 集成点
- 在 `main.js` 中通过 `app.use(pinia)` 注册
- 页面中通过 `useXxxStore()` 函数访问
- 支持跨 store 通信（直接导入其他 store）

---

### 2.3 API 请求层

#### 模块名称与文件路径
- **目录**: `packages/app/src/api/`
- **入口**: `packages/app/src/api/index.js`
- **请求封装**: `packages/app/src/api/request.js`

#### 功能描述
统一的 API 请求层，封装所有后端接口调用，提供：
- 统一的请求/响应拦截
- 自动 Token 注入
- CSRF Token 自动携带（H5 环境）
- 统一错误处理
- 按业务模块组织

#### 关键组件/方法

**request.js** - 核心方法：
| 方法 | 描述 |
|------|------|
| `request(options)` | 统一请求方法 |
| `get(url, params)` | GET 请求 |
| `post(url, data)` | POST 请求 |
| `put(url, data)` | PUT 请求 |
| `del(url, data)` | DELETE 请求 |
| `patch(url, data)` | PATCH 请求 |
| `getCsrfToken()` | 获取 CSRF Token |
| `getAuthToken()` | 获取认证 Token |

**请求特性**:
- 自动添加 `Authorization: Bearer <token>` 头
- 自动为 POST/PUT/DELETE/PATCH 添加 `X-CSRF-Token` 头（H5）
- 401 状态自动清除用户信息
- 403 + code=6003 识别 CSRF 失败

**API 模块列表**:
| 模块文件 | 功能 | 主要接口 |
|----------|------|----------|
| `auth.js` | 认证 | login, register, logout, refreshToken, getProfile, updateProfile |
| `product.js` | 商品 | getProducts, getProductDetail, getProductSkus, createProduct, updateProduct |
| `cart.js` | 购物车 | getCart, getCartCount, addToCart, updateCartItem, deleteCartItem, toggleSelect |
| `order.js` | 订单 | getOrders, getOrderDetail, previewOrder, createOrder, cancelOrder, confirmOrder |
| `chat.js` | 聊天 | getConversations, createConversation, sendMessage, getMessages, getUnreadCount |
| `category.js` | 分类 | getCategories, getCategoryDetail |
| `address.js` | 地址 | getAddresses, createAddress, updateAddress, deleteAddress, setDefault |
| `favorite.js` | 收藏 | getFavorites, addFavorite, removeFavorite |
| `coupon.js` | 优惠券 | getCouponList, getMyCoupons, receiveCoupon |
| `member.js` | 会员 | getMemberInfo, getPointsLogs |
| `checkin.js` | 签到 | getCheckinStatus, checkin, getCheckinHistory |
| `inbox.js` | 站内信 | getInboxList, getInboxDetail, markAsRead |
| `flash-sale.js` | 秒杀 | getFlashSaleList, getFlashSaleDetail |
| `payment.js` | 支付 | createPayment, getPaymentStatus |
| `review.js` | 评论 | getReviews, publishReview |
| `search.js` | 搜索 | searchProducts, getSearchHistory, getHotKeywords |
| `notification.js` | 通知 | getNotifications, markAsRead |
| `upload.js` | 上传 | uploadImage, uploadFile |
| `errorLog.js` | 错误日志 | report |
| `sync.js` | 数据同步 | syncData |
| `admin.js` | 管理员 | getDashboard, getStatistics |
| `comment.js` | 评论 | getComments, addComment |

#### 输入输出规范
- 输入: URL + 参数对象
- 输出: Promise\<响应数据\>
- 统一响应格式: `{ code, message, data, timestamp, requestId }`

#### 依赖关系
- 依赖: `./request.js` (HTTP 基础请求)
- 依赖 store: `useUserStore` (获取 Token)

#### 集成点
- 通过 `api/index.js` 统一导出
- 页面和 store 中直接 import 对应 API 模块使用

---

### 2.4 工具函数层 (utils/)

#### 模块名称与文件路径
- **目录**: `packages/app/src/utils/`
- **工具列表**:
  - `request.js` - HTTP 请求工具
  - `errorMonitor.js` - 错误监控
  - `websocket.js` - WebSocket 服务
  - `syncManager.js` - 数据同步管理
  - `index.js` - 通用工具函数

#### 功能描述

**errorMonitor.js** - 错误监控
- 全局错误捕获（window.onerror / unhandledrejection）
- 小程序错误捕获（wx.onError）
- 错误批量上报（每 5 秒或 10 条上报一次）
- 手动上报 API
- 平台信息自动附带

**index.js** - 通用工具函数
| 函数 | 描述 |
|------|------|
| `formatDate(date, format)` | 日期格式化 |
| `formatRelativeTime(date)` | 相对时间格式化 |
| `generateId(prefix)` | 生成唯一 ID |
| `debounce(fn, delay)` | 防抖函数 |
| `throttle(fn, delay)` | 节流函数 |
| `deepClone(obj)` | 深拷贝 |
| `isValidEmail(email)` | 邮箱验证 |
| `isValidPhone(phone)` | 手机号验证 |
| `formatFileSize(bytes)` | 文件大小格式化 |
| `getPlatform()` | 获取当前平台 |
| `storage` 对象 | 本地存储封装（set/get/remove/clear） |
| `sleep(ms)` | 延时函数 |

#### 输入输出规范
- 纯函数工具：输入明确，输出可预测
- 异步工具返回 Promise

#### 依赖关系
- errorMonitor 依赖 `errorLogApi` 和 `getPlatform`
- websocket 独立服务
- 其他工具无外部依赖

#### 集成点
- errorMonitor 在 App.vue 的 onLaunch 中初始化
- 通用工具在各页面和组件中按需 import

---

### 2.5 公共组件库 (components/)

#### 模块名称与文件路径
- **目录**: `packages/app/src/components/`
- **命名规范**: `gexm-xxx` 前缀
- **自动导入**: 通过 pages.json 的 easycom 配置自动注册

#### 功能描述
项目自研组件库，提供电商应用常用 UI 组件，采用 uni-app 跨端兼容方案。

#### 组件清单

| 组件名 | 路径 | 功能描述 |
|--------|------|----------|
| gexm-nav-bar | `components/gexm-nav-bar/` | 自定义导航栏，支持状态栏适配 |
| gexm-card | `components/gexm-card/` | 卡片容器组件 |
| gexm-button | `components/gexm-button/` | 按钮组件 |
| gexm-input | `components/gexm-input/` | 输入框组件 |
| gexm-list-item | `components/gexm-list-item/` | 列表项组件 |
| gexm-tab-bar | `components/gexm-tab-bar/` | 底部导航栏 |
| gexm-empty | `components/gexm-empty/` | 空状态提示 |
| gexm-loading | `components/gexm-loading/` | 加载中提示 |
| gexm-product-card | `components/gexm-product-card/` | 商品卡片（价格、销量、图片） |
| gexm-sku-selector | `components/gexm-sku-selector/` | SKU 规格选择器 |
| gexm-pagination | `components/gexm-pagination/` | 分页组件 |
| gexm-toast | `components/gexm-toast/` | 轻量提示 |
| gexm-chat-input | `components/gexm-chat-input/` | 聊天输入框 |
| gexm-chat-list | `components/gexm-chat-list/` | 聊天消息列表 |
| gexm-message-item | `components/gexm-message-item/` | 消息项组件 |
| gexm-image-lazy | `components/gexm-image-lazy/` | 图片懒加载 |
| gexm-system-status | `components/gexm-system-status/` | 系统状态条 |
| home-chat-panel | `components/home-chat-panel/` | 首页聊天面板 |

#### 关键组件详解

**gexm-nav-bar** (`components/gexm-nav-bar/index.vue`)
- Props: `title`, `showBack`, `fixed`
- 功能: 自定义导航栏，自动适配状态栏高度
- 依赖: `useAppStore` (获取状态栏高度)
- 插槽: `left`, `title`, `right`

**gexm-product-card** (`components/gexm-product-card/index.vue`)
- Props: `product` (商品对象)
- 功能: 商品展示卡片，包含图片、名称、价格、销量
- 交互: 点击跳转商品详情页
- 计算属性: `displayPrice` - 显示价格（优先取 sale_price）

#### 依赖关系
- 组件内部依赖: Pinia stores (如 app store)
- 样式依赖: `@/styles/variables.scss` 变量
- 部分组件依赖 uni API

#### 集成点
- 在 `pages.json` 的 `easycom` 中配置自动导入
- 页面中直接使用 `<gexm-xxx />` 无需 import
- 样式变量通过 SCSS `@use` 引入

---

### 2.6 静态资源 (static/)

#### 模块名称与文件路径
- **目录**: `packages/app/src/static/`

#### 资源分类
| 目录 | 内容 | 示例 |
|------|------|------|
| `images/` | 通用图片 | banner1.png, banner2.png, banner3.png, placeholder.svg |
| `tabbar/` | 底部导航图标 | home.svg, category.svg, cart.svg, profile.svg (含 active 版本) |
| `tabs/` | 标签页图标 | 分类标签等 |

#### 集成点
- 页面中通过 `/static/xxx` 路径引用
- tabBar 图标在 pages.json 中配置

---

## 3. 页面模块分析

### 3.1 首页与导航

#### 3.1.1 首页
- **路径**: `pages/index/index.vue`
- **路由**: `/pages/index/index`

**功能描述**
电商应用首页，包含搜索栏、轮播图、分类快捷入口、商品推荐列表和底部导航。

**页面生命周期**
- `onMounted`: 加载首页数据（分类、商品列表）
- `onShow`: 重置当前 Tab 状态

**关键交互逻辑**
- 搜索栏点击 → 跳转商品列表页
- 轮播图点击 → 跳转对应链接
- 分类图标点击 → 跳转分类商品列表
- 商品卡片点击 → 跳转商品详情
- 底部 Tab 切换 → 跳转对应页面
- 滚动到底部 → 加载更多商品

**使用的 Store**
- `useAppStore` - 状态栏高度
- `useProductStore` - 商品列表数据
- `useCategoryStore` - 分类数据

**调用的 API 接口**
- `categoryApi.getCategories()` - 获取分类列表
- `productApi.getProducts()` - 获取商品列表（分页）

**依赖的组件**
- `gexm-loading` - 加载状态
- `gexm-empty` - 空状态
- `gexm-product-card` - 商品卡片

**跳转关系**
- 从哪来: 应用启动入口 / 底部 Tab 切换
- 到哪去:
  - 商品列表页 (`/pages/product/list`)
  - 分类页 (`/pages/category/category`)
  - 购物车页 (`/pages/cart/cart`)
  - 个人中心 (`/pages/profile/profile`)
  - 商品详情页 (`/pages/product/detail?id=xxx`)

**状态/数据结构**
```javascript
{
  banners: [{ id, image, link }],      // 轮播图数据
  tabs: [{ name, path, icon }],        // 底部 Tab 配置
  currentTab: string,                   // 当前选中 Tab
  loading: boolean,                     // 首次加载状态
  loadingMore: boolean,                 // 加载更多状态
  page: number,                         // 当前页码
  pageSize: number,                     // 每页数量
  hasMore: boolean                      // 是否还有更多
}
```

---

#### 3.1.2 分类页
- **路径**: `pages/category/category.vue`
- **路由**: `/pages/category/category`

**功能描述**
商品分类浏览页，左侧分类列表，右侧分类商品展示。

**关键交互逻辑**
- 左侧分类切换 → 更新右侧商品列表
- 商品点击 → 跳转商品详情

**使用的 Store**
- `useCategoryStore`
- `useProductStore`

**调用的 API 接口**
- `categoryApi.getCategories()`
- `productApi.getProducts({ categoryId })`

**依赖的组件**
- `gexm-nav-bar`
- `gexm-product-card`
- `gexm-loading`

**跳转关系**
- 从哪来: 首页底部 Tab / 其他页面
- 到哪去: 商品详情页

---

#### 3.1.3 搜索页
- **路径**: `pages/search/search.vue`
- **路由**: `/pages/search/search`

**功能描述**
商品搜索页面，支持关键词搜索、搜索历史、热门搜索。

**使用的 Store**
- `useProductStore`

**调用的 API 接口**
- `searchApi.searchProducts()`
- `searchApi.getSearchHistory()`
- `searchApi.getHotKeywords()`

**依赖的组件**
- `gexm-nav-bar`
- `gexm-input`
- `gexm-product-card`

---

### 3.2 商品相关

#### 3.2.1 商品列表
- **路径**: `pages/product/list.vue`
- **路由**: `/pages/product/list`

**功能描述**
商品列表页，支持分类筛选、排序、下拉刷新、上拉加载更多。

**页面生命周期**
- `onLoad`: 接收参数（categoryId, keyword 等）
- `onPullDownRefresh`: 下拉刷新
- `onReachBottom`: 上拉加载更多

**使用的 Store**
- `useProductStore`
- `useCategoryStore`

**调用的 API 接口**
- `productApi.getProducts(params)` - 分页获取商品列表

**依赖的组件**
- `gexm-nav-bar`
- `gexm-product-card`
- `gexm-loading`
- `gexm-empty`

**跳转关系**
- 从哪来: 首页、分类页、搜索页
- 到哪去: 商品详情页 (`/pages/product/detail?id=xxx`)

---

#### 3.2.2 商品详情
- **路径**: `pages/product/detail.vue`
- **路由**: `/pages/product/detail`

**功能描述**
商品详情页，展示商品图片、价格、规格、详情、评价，支持加入购物车、立即购买。

**页面生命周期**
- `onLoad`: 接收商品 ID，加载详情

**关键交互逻辑**
- SKU 规格选择
- 数量调整
- 加入购物车
- 立即购买 → 跳转订单确认
- 收藏/取消收藏
- 查看评价

**使用的 Store**
- `useProductStore` - 商品详情数据
- `useCartStore` - 加入购物车
- `useFavoriteStore` - 收藏功能
- `useUserStore` - 判断登录状态

**调用的 API 接口**
- `productApi.getProductDetail(id)` - 获取商品详情
- `productApi.getProductSkus(id)` - 获取 SKU 列表
- `cartApi.addToCart()` - 加入购物车
- `favoriteApi.addFavorite()` / `removeFavorite()` - 收藏操作

**依赖的组件**
- `gexm-nav-bar`
- `gexm-sku-selector`
- `gexm-loading`
- `gexm-button`

**跳转关系**
- 从哪来: 商品列表、首页推荐、购物车
- 到哪去:
  - 订单确认页 (`/pages/order/order-confirm`)
  - 购物车页
  - 登录页（未登录时）

---

#### 3.2.3 收藏页
- **路径**: `pages/favorites/favorites.vue`
- **路由**: `/pages/favorites/favorites`

**功能描述**
我的收藏列表，支持下拉刷新、取消收藏。

**使用的 Store**
- `useFavoriteStore`

**调用的 API 接口**
- `favoriteApi.getFavorites()` - 获取收藏列表
- `favoriteApi.removeFavorite()` - 取消收藏

**依赖的组件**
- `gexm-nav-bar`
- `gexm-product-card`
- `gexm-empty`
- `gexm-loading`

---

### 3.3 购物车

#### 购物车页
- **路径**: `pages/cart/cart.vue`
- **路由**: `/pages/cart/cart`

**功能描述**
购物车页面，支持商品管理、数量调整、全选/反选、结算。

**页面生命周期**
- `onShow`: 每次显示时刷新购物车数据
- `onPullDownRefresh`: 下拉刷新

**关键交互逻辑**
- 单选/全选商品
- 数量增减
- 删除商品
- 批量删除选中商品
- 结算 → 跳转订单确认页

**使用的 Store**
- `useCartStore` - 购物车状态
- `useUserStore` - 判断登录状态

**调用的 API 接口**
- `cartApi.getCart()` - 获取购物车列表
- `cartApi.updateCartItem()` - 更新数量
- `cartApi.deleteCartItem()` - 删除单品
- `cartApi.deleteCartItems()` - 批量删除
- `cartApi.toggleSelect()` - 切换选中状态

**依赖的组件**
- `gexm-nav-bar`
- `gexm-empty`
- `gexm-loading`
- `gexm-button`

**跳转关系**
- 从哪来: 首页底部 Tab、商品详情
- 到哪去: 订单确认页 (`/pages/order/order-confirm`)

**状态/数据结构**
```javascript
// cart store
{
  cartItems: [],          // 购物车商品列表
  cartCount: number,      // 总数量
  // getters
  selectedItems: [],      // 已选中商品
  selectedCount: number,  // 选中数量
  totalPrice: number,     // 选中总价
  isAllSelected: boolean  // 是否全选
}
```

---

### 3.4 订单相关

#### 3.4.1 订单列表
- **路径**: `pages/order/order-list.vue`
- **路由**: `/pages/order/order-list`

**功能描述**
订单列表页，支持按状态筛选（全部/待付款/待发货/待收货/已完成/已取消）。

**使用的 Store**
- `useOrderStore`

**调用的 API 接口**
- `orderApi.getOrders({ status })` - 获取订单列表

**依赖的组件**
- `gexm-nav-bar`
- `gexm-list-item`
- `gexm-loading`
- `gexm-empty`

**跳转关系**
- 从哪来: 个人中心
- 到哪去: 订单详情页 (`/pages/order/order-detail?id=xxx`)

---

#### 3.4.2 订单详情
- **路径**: `pages/order/order-detail.vue`
- **路由**: `/pages/order/order-detail`

**功能描述**
订单详情页，展示订单信息、商品列表、物流信息、操作按钮。

**关键交互逻辑**
- 取消订单
- 确认收货
- 申请退款
- 查看物流
- 再次购买

**使用的 Store**
- `useOrderStore`

**调用的 API 接口**
- `orderApi.getOrderDetail(id)` - 订单详情
- `orderApi.cancelOrder(id)` - 取消订单
- `orderApi.confirmOrder(id)` - 确认收货
- `orderApi.getLogistics(id)` - 物流信息
- `orderApi.applyRefund(id, data)` - 申请退款
- `orderApi.buyAgain(id)` - 再次购买

**跳转关系**
- 从哪来: 订单列表、支付页
- 到哪去:
  - 支付页（待付款状态）
  - 评价页（已完成状态）

---

#### 3.4.3 订单确认
- **路径**: `pages/order/order-confirm.vue`
- **路由**: `/pages/order/order-confirm`

**功能描述**
订单确认页，确认商品信息、收货地址、优惠券、金额，提交订单。

**关键交互逻辑**
- 选择/切换收货地址
- 选择优惠券
- 订单备注
- 提交订单 → 跳转支付页

**使用的 Store**
- `useOrderStore`
- `useAddressStore`
- `useCartStore`
- `useCouponStore`

**调用的 API 接口**
- `orderApi.previewOrder(data)` - 订单预览
- `orderApi.createOrder(data)` - 创建订单
- `addressApi.getAddresses()` - 获取地址列表
- `couponApi.getMyCoupons()` - 获取可用优惠券

**跳转关系**
- 从哪来: 商品详情（立即购买）、购物车（结算）
- 到哪去: 支付页 (`/pages/payment/payment?orderId=xxx`)

---

#### 3.4.4 支付页
- **路径**: `pages/payment/payment.vue`
- **路由**: `/pages/payment/payment`

**功能描述**
支付页面，选择支付方式，完成支付。

**关键交互逻辑**
- 选择支付方式（微信、支付宝等）
- 确认支付
- 支付成功 → 跳转订单详情

**调用的 API 接口**
- `paymentApi.createPayment()` - 创建支付
- `paymentApi.getPaymentStatus()` - 查询支付状态

**跳转关系**
- 从哪来: 订单确认页
- 到哪去: 订单详情页（支付成功后）

---

### 3.5 用户中心

#### 3.5.1 个人中心
- **路径**: `pages/profile/profile.vue`
- **路由**: `/pages/profile/profile`

**功能描述**
个人中心页，展示用户信息、订单入口、功能菜单。

**使用的 Store**
- `useUserStore`
- `useOrderStore`
- `useCouponStore`

**调用的 API 接口**
- `authApi.getProfile()` - 获取用户信息
- `orderApi.getOrders()` - 获取订单数量统计

**依赖的组件**
- `gexm-nav-bar`
- `gexm-list-item`

**跳转关系**
- 从哪来: 底部 Tab
- 到哪去:
  - 登录页（未登录）
  - 编辑资料页
  - 订单列表页
  - 收藏页
  - 优惠券页
  - 地址管理
  - 设置页
  - 会员中心
  - 签到页
  - 站内信
  - 消息通知

---

#### 3.5.2 登录/注册
- **登录页**: `pages/login/login.vue`
- **注册页**: `pages/register/register.vue`

**功能描述**
用户认证页面，支持账号密码登录/注册。

**关键交互逻辑**
- 表单验证
- 登录成功 → 保存 Token → 返回上一页
- 注册成功 → 跳转登录或直接登录

**使用的 Store**
- `useUserStore`

**调用的 API 接口**
- `authApi.login(data)` - 登录
- `authApi.register(data)` - 注册

**跳转关系**
- 从哪来: 需要登录的页面
- 到哪去: 来源页面 / 首页

---

#### 3.5.3 编辑资料
- **路径**: `pages/edit-profile/edit-profile.vue`

**功能描述**
编辑用户个人信息（昵称、头像、手机号等）。

**使用的 Store**
- `useUserStore`

**调用的 API 接口**
- `authApi.updateProfile(data)` - 更新资料
- `uploadApi.uploadImage()` - 上传头像

---

#### 3.5.4 地址管理
- **列表页**: `pages/address/address-list.vue`
- **编辑页**: `pages/address/address-edit.vue`

**功能描述**
收货地址管理，支持新增、编辑、删除、设为默认。

**使用的 Store**
- `useAddressStore`

**调用的 API 接口**
- `addressApi.getAddresses()` - 地址列表
- `addressApi.createAddress(data)` - 新增地址
- `addressApi.updateAddress(id, data)` - 更新地址
- `addressApi.deleteAddress(id)` - 删除地址
- `addressApi.setDefault(id)` - 设为默认

---

#### 3.5.5 设置页
- **路径**: `pages/settings/settings.vue`

**功能描述**
应用设置页面，包含账号安全、通知设置、清除缓存、关于、退出登录等。

**使用的 Store**
- `useUserStore`
- `useAppStore`

**调用的 API 接口**
- `authApi.logout()` - 退出登录
- `authApi.changePassword()` - 修改密码

---

#### 3.5.6 消息通知
- **路径**: `pages/notifications/notifications.vue`

**功能描述**
系统消息通知列表。

**使用的 Store**
- 通知相关状态

**调用的 API 接口**
- `notificationApi.getNotifications()` - 获取通知列表
- `notificationApi.markAsRead()` - 标记已读

---

### 3.6 营销模块

#### 3.6.1 优惠券
- **优惠券列表**: `pages/coupon/coupon-list.vue` - 可领取优惠券
- **我的优惠券**: `pages/coupon/coupon-mine.vue` - 已领取优惠券

**调用的 API 接口**
- `couponApi.getCouponList()` - 优惠券列表
- `couponApi.getMyCoupons()` - 我的优惠券
- `couponApi.receiveCoupon()` - 领取优惠券

---

#### 3.6.2 会员中心
- **会员中心**: `pages/member/member-center.vue`
- **积分明细**: `pages/member/points-logs.vue`

**调用的 API 接口**
- `memberApi.getMemberInfo()` - 会员信息
- `memberApi.getPointsLogs()` - 积分明细

---

#### 3.6.3 签到页
- **路径**: `pages/checkin/checkin.vue`

**功能描述**
每日签到页面，展示签到日历、连续签到天数、积分奖励。

**调用的 API 接口**
- `checkinApi.getCheckinStatus()` - 签到状态
- `checkinApi.checkin()` - 签到
- `checkinApi.getCheckinHistory()` - 签到历史

---

#### 3.6.4 秒杀活动
- **路径**: `pages/flash-sale/flash-sale.vue`

**功能描述**
限时秒杀活动页面，展示秒杀商品和倒计时。

**调用的 API 接口**
- `flashSaleApi.getFlashSaleList()` - 秒杀列表
- `flashSaleApi.getFlashSaleDetail()` - 秒杀详情

---

#### 3.6.5 站内信
- **列表页**: `pages/inbox/inbox-list.vue`
- **详情页**: `pages/inbox/inbox-detail.vue`

**调用的 API 接口**
- `inboxApi.getInboxList()` - 站内信列表
- `inboxApi.getInboxDetail()` - 站内信详情
- `inboxApi.markAsRead()` - 标记已读

---

### 3.7 AI 对话

#### 3.7.1 会话列表
- **路径**: `pages/chat/conversations.vue`

**功能描述**
聊天会话列表，展示所有会话和未读消息数。

**使用的 Store**
- `useChatStore`

**调用的 API 接口**
- `chatApi.getConversations()` - 获取会话列表
- `chatApi.getUnreadCount()` - 未读消息数

**跳转关系**
- 到哪去: 聊天页 (`/pages/chat/chat?conversationId=xxx`)

---

#### 3.7.2 聊天页
- **路径**: `pages/chat/chat.vue`

**功能描述**
实时聊天页面，支持发送文字消息、查看历史消息、实时推送。

**页面生命周期**
- `onLoad`: 接收会话 ID，加载消息
- `onUnload`: 清理当前会话

**关键交互逻辑**
- 发送消息
- 上拉加载历史消息
- 实时接收新消息（WebSocket）

**使用的 Store**
- `useChatStore`

**调用的 API 接口**
- `chatApi.getConversationDetail()` - 会话详情和消息
- `chatApi.sendMessage()` - 发送消息

**依赖的组件**
- `gexm-nav-bar`
- `gexm-chat-list`
- `gexm-chat-input`
- `gexm-message-item`
- `gexm-loading`

---

#### 3.7.3 AI 对话
- **路径**: `pages/chat/ai-chat.vue`

**功能描述**
AI 智能助手对话页面，与 AI 进行智能对话。

**使用的 Store**
- `useChatStore`

**调用的 API 接口**
- `chatApi.getAIConversation()` - 获取/创建 AI 会话
- `chatApi.sendMessage()` - 发送消息给 AI

---

### 3.8 管理后台

#### 3.8.1 商品管理
- **商品列表**: `pages/admin/product-list.vue`
- **商品编辑**: `pages/admin/product-edit.vue`

**功能描述**
管理员商品管理，支持商品的增删改查、上下架。

**调用的 API 接口**
- `productApi.getProducts()` - 商品列表
- `productApi.createProduct()` - 创建商品
- `productApi.updateProduct()` - 更新商品
- `productApi.deleteProduct()` - 删除商品
- `productApi.updateProductStatus()` - 更新状态

---

#### 3.8.2 订单管理
- **订单列表**: `pages/admin/order-list.vue`
- **订单详情**: `pages/admin/order-detail.vue`
- **订单统计**: `pages/admin/order-statistics.vue`

**调用的 API 接口**
- `orderApi.getOrders()` - 订单列表
- `orderApi.getOrderDetail()` - 订单详情
- `adminApi.getOrderStatistics()` - 订单统计

---

#### 3.8.3 数据仪表盘
- **路径**: `pages/admin/dashboard.vue`

**功能描述**
管理后台数据概览，展示销售数据、用户数据、订单数据等。

**调用的 API 接口**
- `adminApi.getDashboard()` - 仪表盘数据
- `adminApi.getStatistics()` - 统计数据

---

## 4. 组件库分析

### 4.1 组件设计原则

1. **跨端兼容**: 基于 uni-app 组件，兼容 H5、小程序、App
2. **命名规范**: 统一 `gexm-` 前缀，避免命名冲突
3. **自动导入**: 通过 easycom 配置，无需手动 import
4. **样式变量**: 统一使用 SCSS 变量，便于主题定制
5. **BEM 命名**: 样式采用 BEM 命名规范

### 4.2 核心组件详解

#### gexm-nav-bar
- **文件**: `components/gexm-nav-bar/index.vue`
- **作用**: 自定义导航栏，适配不同设备状态栏
- **Props**:
  - `title` (String): 导航栏标题
  - `showBack` (Boolean): 是否显示返回按钮，默认 true
  - `fixed` (Boolean): 是否固定定位，默认 true
- **插槽**:
  - `left`: 左侧自定义内容
  - `title`: 标题自定义内容
  - `right`: 右侧自定义内容
- **依赖**: `useAppStore` (获取状态栏高度)
- **事件**: `back` - 返回按钮点击

#### gexm-product-card
- **文件**: `components/gexm-product-card/index.vue`
- **作用**: 商品展示卡片
- **Props**:
  - `product` (Object, required): 商品数据对象
- **计算属性**:
  - `displayPrice`: 显示价格（优先取 sale_price）
- **交互**: 点击跳转商品详情页
- **展示内容**: 商品图片、名称、价格、销量

#### gexm-sku-selector
- **文件**: `components/gexm-sku-selector/index.vue`
- **作用**: SKU 规格选择器
- **功能**: 多规格选择、库存判断、价格计算

#### gexm-empty
- **文件**: `components/gexm-empty/index.vue`
- **作用**: 空状态提示组件
- **Props**: `description` - 描述文字

#### gexm-loading
- **文件**: `components/gexm-loading/index.vue`
- **作用**: 加载状态提示
- **Props**: `text` - 加载文字

#### gexm-tab-bar
- **文件**: `components/gexm-tab-bar/index.vue`
- **作用**: 底部导航栏
- **功能**: 多 Tab 切换、徽标显示

#### gexm-chat-input
- **文件**: `components/gexm-chat-input/index.vue`
- **作用**: 聊天输入框组件
- **功能**: 文字输入、发送按钮

#### gexm-chat-list
- **文件**: `components/gexm-chat-list/index.vue`
- **作用**: 聊天消息列表
- **功能**: 消息展示、滚动定位、加载更多

#### gexm-pagination
- **文件**: `components/gexm-pagination/index.vue`
- **作用**: 分页组件
- **功能**: 页码切换、上一页/下一页

#### gexm-button
- **文件**: `components/gexm-button/index.vue`
- **作用**: 按钮组件
- **类型**: primary / success / warning / danger / info

#### gexm-input
- **文件**: `components/gexm-input/index.vue`
- **作用**: 输入框组件
- **功能**: 表单输入、验证提示

#### gexm-list-item
- **文件**: `components/gexm-list-item/index.vue`
- **作用**: 列表项组件
- **功能**: 统一的列表样式、箭头、右侧内容

#### gexm-card
- **文件**: `components/gexm-card/index.vue`
- **作用**: 卡片容器组件
- **功能**: 内容卡片、圆角、阴影

#### gexm-toast
- **文件**: `components/gexm-toast/index.vue`
- **作用**: 轻量提示组件

#### gexm-image-lazy
- **文件**: `components/gexm-image-lazy/index.vue`
- **作用**: 图片懒加载组件
- **功能**: 滚动时加载、占位图

#### gexm-message-item
- **文件**: `components/gexm-message-item/index.vue`
- **作用**: 消息项组件
- **功能**: 区分发送方、消息类型展示

#### gexm-system-status
- **文件**: `components/gexm-system-status/index.vue`
- **作用**: 系统状态条组件

#### home-chat-panel
- **文件**: `components/home-chat-panel/index.vue`
- **作用**: 首页悬浮聊天入口面板

---

## 5. 状态管理分析（Pinia）

### 5.1 架构概览

项目采用 **模块化 Pinia Store** 架构，每个业务领域对应一个独立的 store：

```
Pinia Root
├── app store        - 应用全局状态
├── user store       - 用户认证状态
├── product store    - 商品数据状态
├── cart store       - 购物车状态
├── order store      - 订单状态
├── category store   - 分类状态
├── chat store       - 聊天状态
├── address store    - 地址状态
├── favorite store   - 收藏状态
├── comment store    - 评论状态
└── ... (其他业务 store)
```

### 5.2 App Store - 应用全局状态

**文件**: `store/app.js`

**State**:
```javascript
{
  appVersion: '1.0.0',      // 应用版本
  platform: '',              // 当前平台 (h5/mp-weixin/mp-alipay/app-plus)
  systemInfo: null,          // 系统信息
  safeArea: null,            // 安全区域信息
  isOnline: true,            // 网络状态
  theme: 'light',            // 主题
  language: 'zh-CN',         // 语言
  enablePush: true,          // 推送开关
  enableOffline: true,       // 离线模式
  loadingCount: 0            // 加载计数
}
```

**Getters**:
- `isLoading`: 是否正在加载 (loadingCount > 0)
- `statusBarHeight`: 状态栏高度
- `navBarHeight`: 导航栏高度（状态栏 + 44px）
- `safeAreaBottom`: 底部安全区域高度

**Actions**:
| 方法 | 描述 |
|------|------|
| `initApp()` | 初始化应用（系统信息、网络、平台） |
| `getSystemInfo()` | 获取系统信息 |
| `initPlatform()` | 检测当前平台（条件编译） |
| `checkNetwork()` | 检测并监听网络状态 |
| `showLoading(title)` | 显示加载（计数+1） |
| `hideLoading()` | 隐藏加载（计数-1） |
| `setTheme(theme)` | 设置主题 |
| `setLanguage(lang)` | 设置语言 |
| `toast(title, icon, duration)` | 轻提示 |

**依赖**: 无外部依赖（使用 uni API）

---

### 5.3 User Store - 用户状态

**文件**: `store/user.js`

**State**:
```javascript
{
  token: '',                 // 访问令牌
  refreshToken: '',          // 刷新令牌
  userInfo: null             // 用户信息对象
}
```

**Getters**:
- `isLoggedIn`: 是否已登录 (!!token)
- `userId`: 用户 ID
- `username`: 用户名
- `nickname`: 昵称
- `avatar`: 头像
- `role`: 角色 (user/admin)

**Actions**:
| 方法 | 描述 |
|------|------|
| `initFromStorage()` | 从本地存储恢复用户信息 |
| `setToken(accessToken, refreshToken)` | 设置并持久化 Token |
| `setUserInfo(userInfo)` | 设置并持久化用户信息 |
| `updateUserInfo(partialInfo)` | 部分更新用户信息 |
| `logout()` | 退出登录，清除所有状态 |

**持久化 Key**:
- `gexm_access_token` - 访问令牌
- `gexm_refresh_token` - 刷新令牌
- `gexm_user_info` - 用户信息

**依赖**: 无 API 依赖（纯本地状态管理）

---

### 5.4 Cart Store - 购物车状态

**文件**: `store/cart.js`

**State**:
```javascript
{
  cartItems: [],             // 购物车商品列表
  cartCount: 0               // 商品总数
}
```

**Getters**:
- `hasItems`: 是否有商品
- `selectedItems`: 已选中的商品列表
- `selectedCount`: 已选中商品数量
- `totalPrice`: 已选中商品总价
- `isAllSelected`: 是否全选

**Actions**:
| 方法 | 描述 |
|------|------|
| `fetchCart()` | 获取购物车列表 |
| `fetchCartCount()` | 获取购物车数量 |
| `addToCart(productId, skuId, quantity)` | 添加到购物车 |
| `updateQuantity(cartId, quantity)` | 更新数量 |
| `removeItem(cartId)` | 删除单个商品 |
| `removeSelected()` | 删除选中商品 |
| `toggleSelect(cartId, selected)` | 切换选中状态 |
| `toggleSelectAll(selected)` | 全选/取消全选 |
| `updateCartCount()` | 重新计算总数 |
| `clearCart()` | 清空购物车 |

**依赖**: `cartApi` - 购物车 API

---

### 5.5 Product Store - 商品状态

**文件**: `store/product.js`

**State**:
```javascript
{
  products: [],              // 商品列表
  productsTotal: 0,          // 商品总数
  currentProduct: null,      // 当前查看的商品详情
  skus: []                   // 当前商品的 SKU 列表
}
```

**Getters**:
- `hasProducts`: 是否有商品

**Actions**:
| 方法 | 描述 |
|------|------|
| `fetchProducts(params)` | 获取商品列表（分页） |
| `addProducts(list)` | 追加商品（加载更多） |
| `fetchProductDetail(productId)` | 获取商品详情 |
| `fetchProductSkus(productId)` | 获取商品 SKU |
| `clearCurrentProduct()` | 清除当前商品 |

**依赖**: `productApi` - 商品 API

---

### 5.6 Order Store - 订单状态

**文件**: `store/order.js`

**State**:
```javascript
{
  orders: [],                // 订单列表
  ordersTotal: 0,            // 订单总数
  currentOrder: null,        // 当前订单详情
  orderItems: [],            // 订单商品列表
  previewData: null,         // 订单预览数据
  logistics: null,           // 物流信息
  refundInfo: null           // 退款信息
}
```

**Actions**:
| 方法 | 描述 |
|------|------|
| `fetchOrders(params)` | 获取订单列表 |
| `fetchOrderDetail(orderId)` | 获取订单详情 |
| `previewOrder(data)` | 订单预览 |
| `createOrder(data)` | 创建订单 |
| `cancelOrder(orderId)` | 取消订单 |
| `confirmOrder(orderId)` | 确认收货 |
| `fetchLogistics(orderId)` | 获取物流信息 |
| `applyRefund(orderId, data)` | 申请退款 |
| `buyAgain(orderId)` | 再次购买 |
| `clearCurrentOrder()` | 清除当前订单 |

**依赖**: `orderApi` - 订单 API

---

### 5.7 Chat Store - 聊天状态

**文件**: `store/chat.js`

**State**:
```javascript
{
  conversations: [],         // 会话列表
  conversationsTotal: 0,     // 会话总数
  currentConversation: null, // 当前会话
  messages: [],              // 当前会话消息列表
  messagesTotal: 0,          // 消息总数
  unreadCount: 0,            // 未读消息数
  aiConversation: null,      // AI 会话
  isConnected: false,        // WebSocket 连接状态
  isSending: false           // 发送中状态
}
```

**Getters**:
- `hasConversations`: 是否有会话
- `currentConversationId`: 当前会话 ID
- `currentConversationType`: 当前会话类型
- `isAIConversation`: 是否 AI 对话
- `latestMessage`: 最新消息
- `hasMoreMessages`: 是否有更多消息

**Actions**:
| 方法 | 描述 |
|------|------|
| `init()` | 初始化聊天状态和 WebSocket |
| `initWebSocket()` | 初始化 WebSocket 连接和事件 |
| `fetchConversations(page, pageSize)` | 获取会话列表 |
| `createConversation(data)` | 创建新会话 |
| `getOrCreateAIConversation()` | 获取或创建 AI 会话 |
| `setCurrentConversation(conversation)` | 设置当前会话 |
| `fetchMessages(conversationId, page, pageSize)` | 获取消息列表 |
| `sendMessage(content, type)` | 发送消息 |
| `fetchUnreadCount()` | 获取未读数 |
| `loadMoreMessages()` | 加载更多历史消息 |
| `addReceivedMessage(message)` | 添加接收的消息（实时推送） |
| `clearMessages()` | 清除当前会话消息 |
| `clearAll()` | 清除所有聊天状态 |

**持久化 Key**:
- `gexm_current_conversation` - 当前会话

**依赖**:
- `chatApi` - 聊天 API
- `websocketService` - WebSocket 服务（实时消息推送）

---

### 5.8 其他 Store

| Store | 文件 | 主要功能 |
|-------|------|----------|
| Category Store | `store/category.js` | 商品分类数据管理 |
| Address Store | `store/address.js` | 收货地址管理 |
| Favorite Store | `store/favorite.js` | 收藏管理 |
| Comment Store | `store/comment.js` | 评论管理 |

---

## 6. 模块间数据流

### 6.1 整体数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                        页面层 (Pages)                        │
│  首页 / 商品 / 购物车 / 订单 / 用户 / 聊天 / 管理后台        │
└──────────────┬──────────────────────────┬───────────────────┘
               │ 读取/订阅                 │ 调用 actions
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Store 层 (Pinia)                         │
│  app / user / product / cart / order / chat / ...           │
└──────────────┬──────────────────────────┬───────────────────┘
               │ 状态变更通知               │ 调用 API
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 层 (api/)                           │
│  auth / product / cart / order / chat / ...                 │
└──────────────┬──────────────────────────┬───────────────────┘
               │ 请求封装                   │ 返回数据
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    请求工具 (utils/request.js)               │
│  - Token 注入              - CSRF 防护                      │
│  - 错误处理                - 响应拦截                        │
└──────────────┬──────────────────────────┬───────────────────┘
               │ HTTP / WebSocket           │
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       后端服务 (Server)                      │
│  Express + SQLite + JWT + WebSocket                          │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 页面 → API → 后端

**标准流程**:
1. 页面触发交互（按钮点击、滚动加载等）
2. 调用对应 Store 的 action 方法
3. Store action 调用 API 模块的方法
4. API 模块调用 `utils/request.js` 发送 HTTP 请求
5. request.js 自动添加 Token、CSRF 等请求头
6. 后端处理后返回统一格式响应
7. request.js 处理响应（错误判断、数据提取）
8. API 模块返回数据给 Store
9. Store 更新 state
10. 页面通过响应式数据自动更新视图

**示例: 加载商品列表**
```
页面 (product/list.vue)
  ↓ onLoad
productStore.fetchProducts({ page, pageSize })
  ↓
productApi.getProducts(params)
  ↓
http.get('/products', params)
  ↓
request({ url, method: 'GET' })
  ↓ 添加 Authorization header
uni.request(...)
  ↓
后端 → 返回 { code: 0, data: [...], total: 100 }
  ↓
Store 更新 this.products 和 this.productsTotal
  ↓
页面 computed 属性响应式更新 → 视图渲染
```

### 6.3 Store → 页面

**数据绑定方式**:
- 使用 Vue 3 Composition API 的 `computed` 从 Store 读取数据
- Store state 变化时自动触发视图更新

**示例**:
```javascript
import { computed } from 'vue'
import { useProductStore } from '@/store/product'

const productStore = useProductStore()
const products = computed(() => productStore.products)
```

### 6.4 组件间通信方式

| 方式 | 适用场景 | 示例 |
|------|----------|------|
| Props / Emit | 父子组件通信 | 父传数据给 product-card，子 emit 事件 |
| Pinia Store | 跨组件、跨页面共享状态 | 购物车数量、用户信息 |
| Provide / Inject | 深层嵌套组件 | 主题配置 |
| Event Bus | 非父子组件（较少使用） | - |
| uni.$on / uni.$emit | uni-app 全局事件 | 页面间通信 |

### 6.5 路由跳转与参数传递

**跳转方式**:
| 方法 | 用途 | 示例 |
|------|------|------|
| `uni.navigateTo()` | 保留当前页，跳转新页 | 商品详情、订单确认 |
| `uni.redirectTo()` | 关闭当前页，跳转新页 | 支付成功后跳转订单详情 |
| `uni.switchTab()` | 切换 Tab 页 | 底部导航 |
| `uni.navigateBack()` | 返回上一页 | 导航栏返回 |
| `uni.reLaunch()` | 关闭所有页，跳转新页 | 退出登录后跳转首页 |

**参数传递方式**:
1. **URL 参数**: `uni.navigateTo({ url: '/pages/product/detail?id=123' })`
   - 接收: `onLoad(options) { const id = options.id }`

2. **全局状态**: 通过 Pinia Store 传递
   - 适合大量数据、多个页面共享

3. **本地存储**: 通过 `uni.setStorageSync()` 传递
   - 适合持久化数据、跨会话数据

4. **Event Channel**: 页面间事件通道
   - 页面返回时传值

---

## 7. 配置文件

### 7.1 pages.json - 页面路由与组件自动导入

**文件**: `packages/app/src/pages.json`

**核心配置**:

**easycom 自动导入**:
```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^gexm-(.*)": "@/components/gexm-$1/index.vue",
      "^home-(.*)": "@/components/home-$1/index.vue"
    }
  }
}
```
- 自动扫描 `gexm-xxx` 和 `home-xxx` 组件
- 页面中直接使用组件标签，无需 import 和注册

**页面路由**:
配置所有页面路径和样式，主要页面包括：
- 首页: `pages/index/index`
- 分类: `pages/category/category`
- 商品列表/详情: `pages/product/list`, `pages/product/detail`
- 购物车: `pages/cart/cart`
- 订单列表/详情/确认: `pages/order/*`
- 支付: `pages/payment/payment`
- 个人中心: `pages/profile/profile`
- 登录/注册: `pages/login/login`, `pages/register/register`
- 聊天: `pages/chat/conversations`, `pages/chat/chat`, `pages/chat/ai-chat`
- 管理后台: `pages/admin/*`
- 营销模块: `pages/coupon/*`, `pages/member/*`, `pages/checkin/checkin` 等

**全局样式**:
```json
{
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "Gexm",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F5F7FA"
  }
}
```

### 7.2 manifest.json - 应用配置

**文件**: `packages/app/src/manifest.json`

**配置内容**:
- 应用基本信息（名称、版本、描述）
- 各平台专属配置（H5、小程序、App）
- 权限配置
- 启动页配置
- 模块配置（支付、分享、推送等）

### 7.3 styles/variables.scss - 全局样式变量

**文件**: `packages/app/src/styles/variables.scss`

**颜色变量**:
| 变量名 | 值 | 用途 |
|--------|----|------|
| `$primary-color` | #409eff | 主色调 |
| `$success-color` | #67c23a | 成功色 |
| `$warning-color` | #e6a23c | 警告色 |
| `$danger-color` | #f56c6c | 危险色 |
| `$info-color` | #909399 | 信息色 |
| `$bg-color-page` | #f5f7fa | 页面背景色 |
| `$bg-color-white` | #ffffff | 白色背景 |
| `$text-color` | #303133 | 主要文字 |
| `$text-color-secondary` | #606266 | 次要文字 |
| `$text-color-tertiary` | #909399 | 三级文字 |
| `$text-color-placeholder` | #c0c4cc | 占位文字 |
| `$border-color` | #dcdfe6 | 边框色 |
| `$border-color-light` | #e4e7ed | 浅边框 |
| `$border-color-lighter` | #ebeef5 | 更浅边框 |

**字体大小**:
| 变量名 | 值 |
|--------|----|
| `$font-size-xs` | 20rpx |
| `$font-size-sm` | 24rpx |
| `$font-size-base` | 28rpx |
| `$font-size-md` | 32rpx |
| `$font-size-lg` | 36rpx |
| `$font-size-xl` | 40rpx |

**间距**:
| 变量名 | 值 |
|--------|----|
| `$spacing-xs` | 8rpx |
| `$spacing-sm` | 16rpx |
| `$spacing-base` | 24rpx |
| `$spacing-md` | 32rpx |
| `$spacing-lg` | 48rpx |
| `$spacing-xl` | 64rpx |

**圆角**:
| 变量名 | 值 |
|--------|----|
| `$border-radius-sm` | 8rpx |
| `$border-radius-base` | 12rpx |
| `$border-radius-md` | 16rpx |
| `$border-radius-lg` | 20rpx |

**其他**:
- `$shadow-sm/base/lg` - 阴影
- `$header-height` - 头部高度
- `$tab-bar-height` - 底部导航高度
- `$safe-area-bottom` - 底部安全区域
- `$transition-fast/base/slow` - 过渡动画

### 7.4 styles/global.scss - 全局样式

**文件**: `packages/app/src/styles/global.scss`

**功能**:
- 全局重置样式
- 通用工具类（flex、text、margin、padding 等）
- 通用组件类（card、divider、page-container 等）

**工具类清单**:
- Flex 布局: `.flex`, `.flex-1`, `.flex-center`, `.flex-between`, `.flex-column`
- 文字对齐: `.text-center`, `.text-right`
- 文字颜色: `.text-primary/success/warning/danger/info/muted`
- 字体大小: `.font-sm/base/md/lg`, `.font-bold`
- 外边距: `.mt-xs/sm/base/md/lg`, `.mb-*`, `.ml-*`, `.mr-*`
- 内边距: `.p-xs/sm/base/md`, `.pt-sm`, `.pb-sm`, `.pl-sm`, `.pr-sm`
- 文字省略: `.ellipsis`, `.ellipsis-2`, `.ellipsis-3`
- 安全区域: `.safe-area-bottom`
- 页面容器: `.page-container`
- 卡片: `.card`
- 分隔线: `.divider`

---

## 附录：模块依赖关系图

```
App.vue (应用根组件)
    │
    ├─→ appStore.initApp()       ←→  utils/request.js
    ├─→ userStore.initFromStorage()       ↑
    └─→ errorMonitor.init()                │
                                          │
┌───────────────────────────────────────────┐
│              Pages (页面层)                │
└──────┬──────────┬──────────┬──────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌─────────┐ ┌──────────┐
│ 首页     │ │ 商品页   │ │ 购物车页  │ ...
└─────┬────┘ └────┬────┘ └─────┬────┘
      │           │            │
      ▼           ▼            ▼
┌──────────────────────────────────────┐
│           Pinia Stores               │
│  app / user / product / cart / ...   │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│           API Layer                  │
│  auth / product / cart / order / ... │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       utils/request.js               │
│  (Token, CSRF, Error Handling)      │
└──────────────┬───────────────────────┘
               │
               ▼
         Backend Server
```

---

**文档版本**: v1.0
**最后更新**: 2026-06-28
**适用项目**: Gexm 全平台电商应用 (packages/app)
