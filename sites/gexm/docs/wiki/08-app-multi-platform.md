# 08 · 多端 App（@gexm/app）

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 8.1 技术栈

- uni-app 3.0（DCloudio 全家桶）
- Vue 3.4.21 + Pinia 2.1.7
- Socket.IO Client 4.8
- @gexm/shared（共享类型与工具）
- Vite 5.2 + Sass
- Babel 7

## 8.2 支持平台

| 平台 | 命令 | 说明 |
| --- | --- | --- |
| H5 | `npm run dev:h5` / `build:h5` | Web 端 |
| 微信小程序 | `dev:mp-weixin` / `build:mp-weixin` | mp-weixin |
| 支付宝小程序 | `dev:mp-alipay` / `build:mp-alipay` | mp-alipay |
| 百度小程序 | `dev:mp-baidu` / `build:mp-baidu` | mp-baidu |
| 抖音小程序 | `dev:mp-toutiao` / `build:mp-toutiao` | mp-toutiao |
| 鸿蒙小程序 | `dev:mp-harmony` / `build:mp-harmony` | mp-harmony |
| App | `dev:app` / `build:app` | iOS/Android |
| 鸿蒙 App | `dev:app-harmony` / `build:app-harmony` | 鸿蒙原生 |

### 8.2.1 多端构建配置

参考 [packages/app/package.json](file:///f:/gexm/packages/app/package.json)：

```json
{
  "name": "@gexm/app",
  "scripts": {
    "dev:h5": "uni",
    "dev:mp-weixin": "uni -p mp-weixin",
    "dev:mp-alipay": "uni -p mp-alipay",
    "dev:mp-baidu": "uni -p mp-baidu",
    "dev:mp-toutiao": "uni -p mp-toutiao",
    "dev:mp-harmony": "uni -p mp-harmony",
    "dev:app": "uni -p app",
    "dev:app-harmony": "uni -p app-harmony",
    "build:h5": "uni build",
    "build:mp-weixin": "uni build -p mp-weixin"
  }
}
```

### 8.2.2 uni-app 依赖

```json
{
  "dependencies": {
    "@dcloudio/uni-app": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-app-harmony": "^3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-app-plus": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-components": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-h5": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-mp-alipay": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-mp-baidu": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-mp-harmony": "^3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-mp-toutiao": "3.0.0-alpha-5020120260706001",
    "@dcloudio/uni-mp-weixin": "3.0.0-alpha-5020120260706001",
    "@gexm/shared": "file:../shared",
    "pinia": "2.1.7",
    "socket.io-client": "^4.8.0",
    "vue": "3.4.21",
    "vue-router": "^4.4.4"
  }
}
```

## 8.3 目录结构

```
packages/app/
├── src/
│   ├── api/                # API 请求层
│   │   ├── auth.js         # 认证 API
│   │   ├── admin.js        # 管理 API
│   │   ├── cart.js         # 购物车 API
│   │   ├── chat.js         # 聊天 API
│   │   ├── food.js         # 外卖 API
│   │   ├── inbox.js        # 站内信 API
│   │   ├── order.js        # 订单 API
│   │   ├── push.js         # 推送 API
│   │   ├── ride.js         # 拼车 API
│   │   ├── sync.js         # 同步 API
│   │   └── index.js        # 统一导出
│   ├── store/
│   │   └── app.js          # Pinia store
│   ├── App.vue
│   ├── main.js
│   ├── pages.json          # uni-app 页面配置
│   └── sw.js               # Service Worker
├── .babelrc
├── Dockerfile
├── index.html
├── manifest.json           # uni-app 应用配置
├── nginx.conf              # Nginx 配置（生产）
├── package.json
├── pages.json              # uni-app 页面配置（外层）
└── vite.config.js
```

## 8.4 pages.json 页面清单

### 8.4.1 主包页面

**配置文件**：[packages/app/src/pages.json](file:///f:/gexm/packages/app/src/pages.json)

| 路径 | 标题 | 备注 |
| --- | --- | --- |
| `pages/index/index` | 首页 | 自定义导航 |
| `pages/category/category` | 分类 | 自定义导航 |
| `pages/cart/cart` | 购物车 | 自定义导航，下拉刷新 |
| `pages/profile/profile` | 我的 | 自定义导航 |
| `pages/login/login` | - | 自定义导航 |
| `pages/login/oauth-callback` | - | OAuth 回调 |
| `pages/login/phone-login` | - | 手机登录 |
| `pages/register/register` | 注册账号 | - |
| `pages/product/detail` | 商品详情 | 自定义导航 |
| `pages/product/list` | 商品列表 | 自定义导航，下拉刷新 |

### 8.4.2 分包页面

| 分包 | 路径 | 标题 |
| --- | --- | --- |
| `subPackages/social` | `feeds/list` | 动态 |
| `subPackages/social` | `feeds/create` | 发布动态 |
| `subPackages/social` | `feeds/detail` | 动态详情 |
| `subPackages/social` | `profile/user` | 用户主页 |
| `subPackages/social` | `friends/list` | 好友列表 |
| `subPackages/social` | `friends/requests` | 好友请求 |
| `subPackages/social` | `search/index` | 搜索用户 |
| `subPackages/user` | `order/list` | 我的订单 |
| `subPackages/user` | `order/detail` | 订单详情 |
| `subPackages/user` | `order/create` | 确认订单 |
| `subPackages/user` | `order/pay` | 支付 |
| `subPackages/user` | `order/logistics` | 物流追踪 |
| `subPackages/user` | `address/list` | 收货地址 |
| `subPackages/user` | `address/edit` | 地址编辑 |
| `subPackages/user` | `favorites/list` | 我的收藏 |
| `subPackages/user` | `review/list` | 商品评价 |
| `subPackages/user` | `review/create` | 发表评价 |
| `subPackages/user` | `profile/edit` | 编辑资料 |
| `subPackages/user` | `profile/settings` | 设置 |
| `subPackages/user` | `profile/forget-password` | 忘记密码 |
| `subPackages/user` | `member/center` | 会员中心 |
| `subPackages/user` | `member/points-logs` | 积分变动记录 |
| `subPackages/user` | `coupon/list` | 优惠券领取中心 |
| `subPackages/user` | `coupon/mine` | 我的优惠券 |
| `subPackages/user` | `coupon/select` | 选择优惠券 |
| `subPackages/user` | `checkin` | 每日签到 |
| `subPackages/user` | `referral/center` | 分销中心 |
| `subPackages/user` | `referral/commissions` | 佣金明细 |
| `subPackages/user` | `referral/team` | 我的团队 |
| `subPackages/user` | `referral/withdraw` | 提现中心 |
| `subPackages/user` | `feedback` | 意见反馈 |

## 8.5 store 模块

### 8.5.1 app store

**文件**：[packages/app/src/store/app.js](file:///f:/gexm/packages/app/src/store/app.js)

**核心功能**：

- 用户状态管理
- 购物车状态
- 登录状态
- 应用配置

## 8.6 API 模块

| 模块 | 文件 | 主要接口 |
| --- | --- | --- |
| 认证 | [auth.js](file:///f:/gexm/packages/app/src/api/auth.js) | login、register、refreshToken、logout |
| 管理 | [admin.js](file:///f:/gexm/packages/app/src/api/admin.js) | 后台管理 |
| 购物车 | [cart.js](file:///f:/gexm/packages/app/src/api/cart.js) | 购物车 CRUD |
| 聊天 | [chat.js](file:///f:/gexm/packages/app/src/api/chat.js) | Socket.IO 聊天 |
| 外卖 | [food.js](file:///f:/gexm/packages/app/src/api/food.js) | 外卖业务 |
| 站内信 | [inbox.js](file:///f:/gexm/packages/app/src/api/inbox.js) | 站内信 |
| 订单 | [order.js](file:///f:/gexm/packages/app/src/api/order.js) | 订单 CRUD |
| 推送 | [push.js](file:///f:/gexm/packages/app/src/api/push.js) | 消息推送 |
| 拼车 | [ride.js](file:///f:/gexm/packages/app/src/api/ride.js) | 拼车业务 |
| 同步 | [sync.js](file:///f:/gexm/packages/app/src/api/sync.js) | 数据同步 |
| 统一导出 | [index.js](file:///f:/gexm/packages/app/src/api/index.js) | 所有 API 统一导出 |

## 8.7 平台适配器

`@gexm/app` 通过 `@gexm/sdk` 接入跨平台能力。SDK 会自动检测当前运行平台并加载对应的适配器：

```javascript
// packages/app/src/main.js
import { GexmSDK } from '@gexm/sdk'

// SDK 自动检测平台（H5/微信/支付宝/百度/抖音/鸿蒙小程序/App/Electron）
GexmSDK.init()

// 业务代码调用统一接口
await GexmSDK.network.request({ url: '/api/v1/auth/login', method: 'POST', data: {...} })
await GexmSDK.storage.set('token', 'xxx')
GexmSDK.log.info('App started')
```

## 8.8 配置文件

### 8.8.1 manifest.json

**文件**：[packages/app/manifest.json](file:///f:/gexm/packages/app/manifest.json)

uni-app 应用配置，包含各平台的 appId、版本号、权限等。

### 8.8.2 vite.config.js

**文件**：[packages/app/vite.config.js](file:///f:/gexm/packages/app/vite.config.js)

Vite 构建配置，集成 `@dcloudio/vite-plugin-uni` 插件。

### 8.8.3 .babelrc

**文件**：[packages/app/.babelrc](file:///f:/gexm/packages/app/.babelrc)

Babel 配置，使用 `@babel/preset-env`。

## 8.9 Service Worker

**文件**：[packages/app/src/sw.js](file:///f:/gexm/packages/app/src/sw.js)

H5 平台的 Service Worker，支持离线缓存与推送通知。

## 8.10 Docker 部署

**Dockerfile**：[packages/app/Dockerfile](file:///f:/gexm/packages/app/Dockerfile)

**Nginx 配置**：[packages/app/nginx.conf](file:///f:/gexm/packages/app/nginx.conf)

容器 `gexm-app` 端口 80，连接 `gexm-frontend` 与 `gexm-backend` 网络。
