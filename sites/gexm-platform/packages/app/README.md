# @gexm/app

Gexm 全平台应用前端，基于 uni-app + Vue 3 构建，实现"一套代码，多端运行"，支持 H5、微信小程序、支付宝小程序、百度小程序、抖音小程序、HarmonyOS、App 等多端平台。

## 模块简介

本模块为 Gexm 平台的客户端入口，覆盖用户认证、商城购物、订单支付、即时聊天、消息通知、签到会员、数据同步等业务场景。通过 uni-app 的跨端编译能力，将同一份源码编译为多端可运行产物，代码复用率高。

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 跨端框架 | uni-app (Vue 3) | 3.0.0-alpha，多端编译 |
| 视图层 | Vue 3 | 3.4.x，Composition API |
| 状态管理 | Pinia | 2.1.x |
| 构建工具 | Vite | 5.2.x |
| 样式预处理 | Sass | 1.71.x |
| 测试 | Jest | 29.7.x |
| 共享库 | @gexm/shared | 工作区共享类型与工具 |
| 兼容层 | vue-demi | Vue 2/3 兼容 |

## 目录结构

```
packages/app/
├── src/
│   ├── pages/                 # 页面目录
│   │   ├── index/             # 首页
│   │   ├── login/             # 登录
│   │   ├── register/          # 注册
│   │   ├── profile/           # 个人中心
│   │   ├── category/          # 分类
│   │   ├── cart/              # 购物车
│   │   ├── product/           # 商品列表与详情
│   │   ├── order/             # 订单列表
│   │   ├── payment/           # 支付
│   │   ├── search/            # 搜索
│   │   ├── chat/              # 聊天与 AI 助手
│   │   ├── inbox/             # 站内信
│   │   ├── checkin/           # 签到
│   │   ├── comments/          # 评价
│   │   ├── settings/          # 设置
│   │   ├── mine/              # 我的（关于/反馈/隐私）
│   │   ├── about/             # 关于
│   │   ├── admin/             # 后台管理页（仪表盘/订单）
│   │   └── test/              # 测试页
│   ├── store/                 # Pinia 状态管理
│   │   ├── user.js            # 用户
│   │   ├── app.js             # 应用全局
│   │   ├── cart.js            # 购物车
│   │   ├── product.js         # 商品
│   │   ├── order.js           # 订单
│   │   ├── category.js        # 分类
│   │   ├── address.js         # 收货地址
│   │   ├── chat.js            # 聊天
│   │   ├── comment.js         # 评价
│   │   ├── coupon.js          # 优惠券
│   │   └── favorite.js        # 收藏
│   ├── api/                   # API 请求封装
│   │   ├── request.js         # 请求基础封装
│   │   ├── auth.js            # 认证
│   │   ├── admin.js           # 后台
│   │   ├── cart.js            # 购物车
│   │   ├── category.js        # 分类
│   │   ├── chat.js            # 聊天
│   │   ├── checkin.js         # 签到
│   │   ├── comment.js         # 评价
│   │   ├── coupon.js          # 优惠券
│   │   ├── favorite.js        # 收藏
│   │   ├── flash-sale.js      # 限时秒杀
│   │   ├── inbox.js           # 站内信
│   │   ├── member.js          # 会员
│   │   ├── notification.js    # 通知
│   │   ├── order.js           # 订单
│   │   ├── payment.js         # 支付
│   │   ├── product.js         # 商品
│   │   ├── review.js          # 评价
│   │   ├── search.js          # 搜索
│   │   ├── sync.js            # 数据同步
│   │   ├── upload.js          # 上传
│   │   ├── address.js         # 收货地址
│   │   ├── errorLog.js        # 错误日志上报
│   │   ├── platform-config.js # 平台配置
│   │   └── index.js           # 入口聚合
│   ├── platform/              # 平台适配层
│   │   ├── index.js           # 适配入口
│   │   ├── README.js          # 平台说明
│   │   ├── clipboard.js       # 剪贴板
│   │   ├── error.js           # 错误处理
│   │   ├── image.js           # 图片
│   │   ├── info.js            # 设备/系统信息
│   │   ├── location.js        # 定位
│   │   ├── payment.js         # 支付
│   │   ├── safeArea.js        # 安全区域
│   │   ├── share.js           # 分享
│   │   └── storage.js         # 存储
│   ├── utils/                 # 工具函数
│   │   ├── request.js         # 请求工具
│   │   ├── websocket.js       # WebSocket 客户端
│   │   ├── syncManager.js     # 同步管理器
│   │   ├── errorHandler.js    # 错误处理
│   │   ├── errorMonitor.js    # 错误监控
│   │   ├── image.js           # 图片工具
│   │   ├── permission.js      # 权限
│   │   ├── responsive.js      # 响应式
│   │   ├── index.js
│   │   └── ...
│   ├── styles/                # 全局样式
│   │   ├── global.scss
│   │   └── variables.scss     # 主题变量
│   ├── static/                # 静态资源（不参与编译）
│   │   ├── images/            # 图片
│   │   └── tabbar/            # 底部导航图标
│   ├── App.vue                # 应用根组件
│   ├── main.js                # 入口
│   ├── manifest.json          # uni-app 应用配置
│   ├── pages.json             # 页面路由配置
│   └── sw.js                  # PWA Service Worker
├── scripts/
│   └── build-all.js           # 一键多端构建脚本
├── test/
│   └── cross-platform.test.js # 跨端测试
├── .env.development           # 开发环境变量
├── .env.production            # 生产环境变量
├── .env.h5                    # H5 环境
├── .env.mp-weixin             # 微信小程序环境
├── .env.mp-alipay             # 支付宝小程序环境
├── .env.mp-baidu              # 百度小程序环境
├── .env.mp-toutiao            # 抖音小程序环境
├── vite.config.js             # Vite 配置
├── jest.config.js
├── pages.json
├── manifest.json
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0（或 pnpm）
- HBuilderX >= 3.6.0（小程序开发与真机调试推荐）
- 微信开发者工具（如需调试微信小程序）

### 安装依赖

```bash
cd packages/app
npm install
```

### H5 开发

```bash
npm run dev:h5

# 默认监听 http://localhost:5173
```

### 小程序开发

```bash
# 微信小程序
npm run dev:mp-weixin

# 支付宝小程序
npm run dev:mp-alipay

# 百度小程序
npm run dev:mp-baidu

# 抖音小程序
npm run dev:mp-toutiao

# 鸿蒙小程序
npm run dev:mp-harmony
```

编译产物位于 `dist/dev/<平台>/`，使用对应平台开发者工具打开该目录即可调试。

### App 开发

```bash
# App（iOS/Android）
npm run dev:app

# App 鸿蒙
npm run dev:app-harmony
```

App 开发需配合 HBuilderX 进行真机运行或打包。

### 构建

```bash
# H5
npm run build:h5

# 微信小程序
npm run build:mp-weixin

# 支付宝小程序
npm run build:mp-alipay

# 百度小程序
npm run build:mp-baidu

# 抖音小程序
npm run build:mp-toutiao

# 鸿蒙小程序
npm run build:mp-harmony

# App
npm run build:app

# 一键构建所有平台
npm run build:all
```

构建产物位于 `dist/build/<平台>/`。

## 多端适配说明

### 条件编译

通过 uni-app 提供的条件编译注释，针对不同平台编写差异化代码：

```javascript
// #ifdef H5
console.log('仅在 H5 平台执行');
// #endif

// #ifdef MP-WEIXIN
console.log('仅在微信小程序执行');
// #endif

// #ifdef APP-PLUS
console.log('仅在 App 执行');
// #endif
```

支持的平台标识：`H5`、`MP-WEIXIN`、`MP-ALIPAY`、`MP-BAIDU`、`MP-TOUTIAO`、`MP-HARMONY`、`APP-PLUS`、`APP-HARMONY`。

### 平台差异处理

平台差异统一封装在 `src/platform/` 目录，调用方通过统一接口访问，无需关心平台内部实现：

- `src/platform/index.js`：适配入口，自动注入对应平台实现
- `src/platform/storage.js`：存储（H5 使用 localStorage，小程序使用 wx.getStorageSync，App 使用 plus.storage）
- `src/platform/clipboard.js`：剪贴板
- `src/platform/location.js`：定位
- `src/platform/payment.js`：支付（各端支付 SDK 差异封装）
- `src/platform/share.js`：分享
- `src/platform/safeArea.js`：安全区域适配
- `src/platform/info.js`：设备/系统信息
- `src/platform/image.js`：图片处理
- `src/platform/error.js`：错误处理

### 多端兼容要点

- 样式单位使用 `rpx`（响应式像素），H5 端自动转换为 `rem`
- 网络请求统一通过 `src/api/request.js` 封装，自动适配各端
- WebSocket 通过 `src/utils/websocket.js` 适配，小程序使用 `wx.connectSocket`
- 静态资源路径在 `src/static/` 下，避免使用绝对路径

## 环境变量说明

环境变量通过 Vite 的 `.env` 文件机制加载，按平台与模式区分：

| 文件 | 用途 |
|------|------|
| `.env` | 通用默认变量（所有平台共享） |
| `.env.development` | 开发模式变量 |
| `.env.production` | 生产模式变量 |
| `.env.h5` | H5 平台变量 |
| `.env.mp-weixin` | 微信小程序变量 |
| `.env.mp-alipay` | 支付宝小程序变量 |
| `.env.mp-baidu` | 百度小程序变量 |
| `.env.mp-toutiao` | 抖音小程序变量 |

主要变量：

| 变量 | 示例值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `/api`（H5）/ `https://api.yourdomain.com/api`（小程序） | API 基础地址 |
| `VITE_APP_TITLE` | Gexm Web / Gexm微信小程序 | 应用标题 |
| `VITE_PLATFORM` | h5 / mp-weixin / mp-alipay 等 | 当前平台标识 |

> 说明：H5 端通过 Vite 代理转发至后端，可使用相对路径 `/api`；小程序与 App 端需配置完整域名，且小程序需在管理后台配置 request 合法域名。

## 测试

```bash
# 单元测试
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

## 许可证

MIT
