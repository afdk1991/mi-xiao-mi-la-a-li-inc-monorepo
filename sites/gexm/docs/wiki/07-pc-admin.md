# 07 · PC 管理后台（@gexm/pc）

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 7.1 技术栈

- Vue 3.4.21 + TypeScript
- Element Plus 2.6（含中文 locale）
- Pinia 2.1.7（状态管理）
- Vue Router 4.3
- Vue I18n 9.13（中英文）
- ECharts 5.5（图表）
- Vite 5.1 + Sass
- Vitest 4 + @vue/test-utils（单元测试）
- vite-plugin-pwa（PWA 支持）
- vite-plugin-compression（Gzip 压缩）
- rollup-plugin-visualizer（包大小分析）

## 7.2 入口

[packages/pc/src/main.ts](file:///f:/gexm/packages/pc/src/main.ts)

### 7.2.1 启动流程

```
createApp(App)
  → app.use(pinia)
  → app.use(i18n)
  → useUserStore().initFromStorage()    # 从 localStorage 恢复用户状态
  → app.use(router)
  → app.use(ElementPlus, { locale: zhCn })
  → app.mount('#app')
```

### 7.2.2 入口代码示例

```typescript
// packages/pc/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import '@/styles/global.scss'
import router from '@/router'
import App from '@/App.vue'
import { useUserStore } from '@/store/user'
import i18n from '@/i18n'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)

// 在挂载前从本地存储恢复用户状态（避免首次渲染后再次重定向）
const userStore = useUserStore()
userStore.initFromStorage()

app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
```

## 7.3 目录结构

```
packages/pc/src/
├── api/                # API 请求层（按业务拆分）
│   ├── request.ts      # Axios 封装
│   ├── auth.ts         # 认证 API
│   ├── user.ts         # 用户 API
│   ├── product.ts      # 商品 API
│   ├── order.ts        # 订单 API
│   ├── review.ts       # 评价 API
│   ├── social.ts       # 社交 API
│   ├── chat.ts         # 聊天 API
│   ├── audit.ts        # 审计 API
│   ├── role.ts         # 角色 API
│   ├── permission.ts   # 权限 API
│   ├── category.ts     # 分类 API
│   ├── flashSale.ts    # 限时抢购 API
│   ├── referral.ts     # 推荐返利 API
│   └── index.ts        # 统一导出
├── components/         # 通用组件
│   ├── CaptchaCanvas.vue  # 验证码画布
│   └── CaptchaCanvas.test.ts
├── i18n/
│   ├── locales/zh-CN.ts
│   ├── locales/en-US.ts
│   └── index.ts
├── layout/index.vue    # 后台主布局
├── router/index.ts     # 路由配置
├── store/
│   ├── user.ts         # 用户状态（含 initFromStorage）
│   └── user.test.ts
├── styles/
│   ├── global.scss     # 全局样式
│   └── variables.scss  # SCSS 变量
├── utils/
│   ├── passwordStrength.ts  # 密码强度检测
│   └── passwordStrength.test.ts
├── views/              # 页面视图（按模块组织）
│   ├── dashboard/      # 仪表盘
│   ├── login/          # 登录、忘记密码
│   ├── users/          # 用户管理
│   ├── roles/          # 角色管理
│   ├── permissions/    # 权限管理
│   ├── products/       # 商品管理
│   ├── categories/     # 分类管理
│   ├── orders/         # 订单管理
│   ├── reviews/        # 评价管理
│   ├── audit/          # 审计日志
│   ├── chat/           # 聊天
│   ├── inbox/          # 站内信
│   ├── social/         # 社交（Feeds/Comments）
│   ├── flash-sales/    # 限时抢购
│   ├── referral/       # 推荐返利
│   ├── queue/          # 队列
│   ├── settings/       # 设置
│   ├── profile/        # 个人资料
│   └── NotFound.vue
├── App.vue
├── main.ts
└── global.d.ts
```

## 7.4 views/ 页面清单

| 模块 | 路径 | 文件 | 路由 | 说明 |
| --- | --- | --- | --- | --- |
| 数据看板 | `dashboard/` | [Dashboard.vue](file:///f:/gexm/packages/pc/src/views/dashboard/Dashboard.vue) | `/dashboard` | 数据看板（ECharts） |
| 登录 | `login/` | [Login.vue](file:///f:/gexm/packages/pc/src/views/login/Login.vue) | `/login` | 用户登录 |
| 忘记密码 | `login/` | [ForgotPassword.vue](file:///f:/gexm/packages/pc/src/views/login/ForgotPassword.vue) | `/forgot-password` | 密码重置 |
| 用户管理 | `users/` | [Users.vue](file:///f:/gexm/packages/pc/src/views/users/Users.vue) | `/users` | 用户列表（仅 admin） |
| 角色管理 | `roles/` | [Roles.vue](file:///f:/gexm/packages/pc/src/views/roles/Roles.vue) | `/roles` | RBAC 角色（仅 admin） |
| 权限管理 | `permissions/` | [Permissions.vue](file:///f:/gexm/packages/pc/src/views/permissions/Permissions.vue) | `/permissions` | 权限分配（仅 admin） |
| 商品管理 | `products/` | [Products.vue](file:///f:/gexm/packages/pc/src/views/products/Products.vue) | `/products` | 商品 CRUD |
| 分类管理 | `categories/` | [Categories.vue](file:///f:/gexm/packages/pc/src/views/categories/Categories.vue) | `/categories` | 商品分类 |
| 订单管理 | `orders/` | [Orders.vue](file:///f:/gexm/packages/pc/src/views/orders/Orders.vue) | `/orders` | 订单列表 |
| 评价管理 | `reviews/` | [Reviews.vue](file:///f:/gexm/packages/pc/src/views/reviews/Reviews.vue) | `/reviews` | 评价审核 |
| 审计日志 | `audit/` | [Audit.vue](file:///f:/gexm/packages/pc/src/views/audit/Audit.vue) | `/audit` | 审计日志（仅 admin） |
| 聊天 | `chat/` | [Chat.vue](file:///f:/gexm/packages/pc/src/views/chat/Chat.vue) | `/chat` | 实时聊天 |
| 站内信 | `inbox/` | [Inbox.vue](file:///f:/gexm/packages/pc/src/views/inbox/Inbox.vue) | `/inbox` | 站内信管理 |
| 社交动态 | `social/` | [Feeds.vue](file:///f:/gexm/packages/pc/src/views/social/Feeds.vue) | `/social/feeds` | 动态管理 |
| 社交评论 | `social/` | [Comments.vue](file:///f:/gexm/packages/pc/src/views/social/Comments.vue) | `/social/comments` | 评论管理 |
| 限时抢购 | `flash-sales/` | [FlashSales.vue](file:///f:/gexm/packages/pc/src/views/flash-sales/FlashSales.vue) | `/flash-sales` | 秒杀管理 |
| 推荐返利 | `referral/` | [Referral.vue](file:///f:/gexm/packages/pc/src/views/referral/Referral.vue) | `/referral` | 分销管理 |
| 队列监控 | `queue/` | [Queue.vue](file:///f:/gexm/packages/pc/src/views/queue/Queue.vue) | `/queue` | 消息队列 |
| 系统设置 | `settings/` | [Settings.vue](file:///f:/gexm/packages/pc/src/views/settings/Settings.vue) | `/settings` | 系统配置 |
| 个人中心 | `profile/` | [Profile.vue](file:///f:/gexm/packages/pc/src/views/profile/Profile.vue) | `/profile` | 个人资料 |
| 404 | - | [NotFound.vue](file:///f:/gexm/packages/pc/src/views/NotFound.vue) | `/:pathMatch(.*)*` | 404 页面 |

## 7.5 router 配置

**入口**：[packages/pc/src/router/index.ts](file:///f:/gexm/packages/pc/src/router/index.ts)

### 7.5.1 路由结构

- 公开路由：`/login`、`/forgot-password`、`/:pathMatch(.*)*`（404）
- 受保护路由：`/`（重定向到 `/dashboard`），需登录后访问
  - 子路由：dashboard、products、orders、chat、profile、settings、users、reviews、roles、permissions、audit、categories、flash-sales、social/feeds、social/comments、referral、inbox、queue

### 7.5.2 路由守卫

```typescript
// packages/pc/src/router/index.ts
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth !== false

  // 1. 未登录访问受保护页面 → 跳转登录
  if (requiresAuth && !userStore.isLoggedIn) {
    next('/login')
    return
  }

  // 2. 已登录访问登录页 → 跳转仪表盘
  if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
    return
  }

  // 3. 管理员路径校验
  if (requiresAuth && userStore.isLoggedIn) {
    const userRole = userStore.userInfo?.role || ''
    const adminPaths = ['/users', '/roles', '/permissions', '/audit']
    const isAdmin = userRole === 'admin'

    if (adminPaths.some((path) => to.path.startsWith(path)) && !isAdmin) {
      next('/dashboard')
      return
    }
  }

  next()
})
```

### 7.5.3 管理员专属路径

以下路径仅 `admin` 角色可访问：

- `/users`：用户管理
- `/roles`：角色管理
- `/permissions`：权限管理
- `/audit`：审计日志

## 7.6 store 模块

### 7.6.1 user store

**文件**：[packages/pc/src/store/user.ts](file:///f:/gexm/packages/pc/src/store/user.ts)

**核心功能**：

- `initFromStorage()`：从 localStorage 恢复用户状态（避免首次渲染后再次重定向）
- `isLoggedIn`：登录状态 getter
- `userInfo`：用户信息（含 role）
- `token`：JWT Token

```typescript
// packages/pc/src/store/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null as UserInfo | null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    initFromStorage() {
      const token = localStorage.getItem('token')
      const userInfo = localStorage.getItem('userInfo')
      if (token) this.token = token
      if (userInfo) this.userInfo = JSON.parse(userInfo)
    },
  },
})
```

## 7.7 i18n 配置

**入口**：[packages/pc/src/i18n/index.ts](file:///f:/gexm/packages/pc/src/i18n/index.ts)

**支持语言**：

- 简体中文（zh-CN）：[locales/zh-CN.ts](file:///f:/gexm/packages/pc/src/i18n/locales/zh-CN.ts)
- English（en-US）：[locales/en-US.ts](file:///f:/gexm/packages/pc/src/i18n/locales/en-US.ts)

## 7.8 API 模块清单

| 模块 | 文件 | 主要接口 |
| --- | --- | --- |
| Axios 封装 | [request.ts](file:///f:/gexm/packages/pc/src/api/request.ts) | 统一请求拦截、响应拦截、错误处理 |
| 认证 | [auth.ts](file:///f:/gexm/packages/pc/src/api/auth.ts) | login、register、refreshToken、logout |
| 用户 | [user.ts](file:///f:/gexm/packages/pc/src/api/user.ts) | CRUD、批量操作 |
| 商品 | [product.ts](file:///f:/gexm/packages/pc/src/api/product.ts) | 商品 CRUD、上下架 |
| 订单 | [order.ts](file:///f:/gexm/packages/pc/src/api/order.ts) | 订单查询、状态更新 |
| 评价 | [review.ts](file:///f:/gexm/packages/pc/src/api/review.ts) | 评价查询、审核 |
| 社交 | [social.ts](file:///f:/gexm/packages/pc/src/api/social.ts) | 动态、评论管理 |
| 聊天 | [chat.ts](file:///f:/gexm/packages/pc/src/api/chat.ts) | 聊天会话 |
| 审计 | [audit.ts](file:///f:/gexm/packages/pc/src/api/audit.ts) | 审计日志查询 |
| 角色 | [role.ts](file:///f:/gexm/packages/pc/src/api/role.ts) | 角色 CRUD |
| 权限 | [permission.ts](file:///f:/gexm/packages/pc/src/api/permission.ts) | 权限分配 |
| 分类 | [category.ts](file:///f:/gexm/packages/pc/src/api/category.ts) | 分类 CRUD |
| 限时抢购 | [flashSale.ts](file:///f:/gexm/packages/pc/src/api/flashSale.ts) | 秒杀活动 |
| 推荐返利 | [referral.ts](file:///f:/gexm/packages/pc/src/api/referral.ts) | 分销返利 |
| 统一导出 | [index.ts](file:///f:/gexm/packages/pc/src/api/index.ts) | 所有 API 统一导出 |

## 7.9 通用组件

### 7.9.1 CaptchaCanvas

**文件**：[components/CaptchaCanvas.vue](file:///f:/gexm/packages/pc/src/components/CaptchaCanvas.vue)

**功能**：Canvas 验证码生成组件

**测试**：[CaptchaCanvas.test.ts](file:///f:/gexm/packages/pc/src/components/CaptchaCanvas.test.ts)

## 7.10 工具函数

### 7.10.1 密码强度检测

**文件**：[utils/passwordStrength.ts](file:///f:/gexm/packages/pc/src/utils/passwordStrength.ts)

```typescript
// packages/pc/src/utils/passwordStrength.ts
export function checkPasswordStrength(password: string): PasswordStrengthResult
```

**测试**：[passwordStrength.test.ts](file:///f:/gexm/packages/pc/src/utils/passwordStrength.test.ts)

## 7.11 配置文件

### 7.11.1 Vite 配置

- [vite.config.ts](file:///f:/gexm/packages/pc/vite.config.ts)：Vite 构建配置
- [vitest.config.ts](file:///f:/gexm/packages/pc/vitest.config.ts)：Vitest 测试配置
- [tsconfig.json](file:///f:/gexm/packages/pc/tsconfig.json)：TypeScript 配置

### 7.11.2 Docker 配置

- [Dockerfile](file:///f:/gexm/packages/pc/Dockerfile)：PC 容器构建
- [nginx.conf](file:///f:/gexm/packages/pc/nginx.conf)：PC Nginx 配置

### 7.11.3 HTML 模板

- [index.html](file:///f:/gexm/packages/pc/index.html)：HTML 入口

## 7.12 测试

**测试框架**：Vitest 4 + @vue/test-utils

**测试文件**：

- [CaptchaCanvas.test.ts](file:///f:/gexm/packages/pc/src/components/CaptchaCanvas.test.ts)
- [user.test.ts](file:///f:/gexm/packages/pc/src/store/user.test.ts)
- [passwordStrength.test.ts](file:///f:/gexm/packages/pc/src/utils/passwordStrength.test.ts)
- [test/setup.ts](file:///f:/gexm/packages/pc/src/test/setup.ts)

**运行命令**：

```bash
npm --workspace @gexm/pc run test          # 单次运行
npm --workspace @gexm/pc run test:watch    # 监听模式
npm --workspace @gexm/pc run test:coverage # 覆盖率
```
