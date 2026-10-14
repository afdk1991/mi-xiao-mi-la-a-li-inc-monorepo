# 03 · 目录结构总览

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 3.1 仓库根目录树形结构

```
f:\gexm\
├── packages/                    # npm workspaces 主目录
│   ├── server/                  # Express + TypeScript 后端
│   ├── pc/                      # Vue3 PC 管理后台
│   ├── app/                     # uni-app 多端应用
│   ├── desktop/                 # Electron 桌面端
│   ├── sdk/                     # 跨平台适配器 SDK
│   ├── shared/                  # 共享类型与工具
│   ├── order-service/           # 订单微服务（独立）
│   ├── product-service/         # 商品微服务（独立）
│   ├── user-service/            # 用户微服务（独立）
│   ├── mixmlaal/                # 旧版 monorepo（混合代码）
│   ├── mixmlaal-inc/            # 含 80+ 微服务的归档项目
│   ├── mixmlaal-inc-legacy/     # mixmlaal-inc 的历史快照
│   ├── route-nav/               # 路径导航子项目
│   ├── zhinenglux/              # 智能路径子项目
│   ├── coze-projects/           # Coze 平台对接项目
│   ├── daijiatongxcx/           # 代驾通小程序
│   ├── omniplex-platform/       # Omniplex 平台
│   └── weidangzhenghe/          # 围挡整合
├── wp-admin/                    # WordPress 后台核心
├── wp-content/
│   ├── themes/mixm-laal/        # 自研主题（13 模块）
│   ├── plugins/                 # WordPress 插件
│   └── languages/               # 语言包
├── wp-includes/                 # WordPress 核心库
├── docs/                        # 项目文档（50+ 篇）
│   └── wiki/                    # 拆分后的 Code Wiki
├── documentation/               # 模块化文档
├── docker/                      # Docker 镜像构建资源
│   ├── nginx/                   # Nginx 配置
│   ├── redis/                   # Redis 配置
│   └── wordpress/               # WordPress Dockerfile
├── infra/                       # 基础设施配置
│   ├── nginx/conf.d/gexm.conf   # 网关反向代理配置
│   ├── mysql/my.cnf
│   └── redis/redis.conf
├── deploy/                      # 部署脚本与 systemd
│   └── scripts/
│       ├── gexm.service
│       ├── deploy.sh
│       └── ssl-setup.sh
├── scripts/                     # 工具脚本
│   ├── lint-guarded.js          # ESLint 文件锁包装
│   ├── monitor-cpu.ps1          # CPU 监控
│   ├── p0-recheck.mjs           # P0 风险复检
│   ├── patch-uni-app.js         # uni-app 编译补丁
│   └── homepage-validate.js     # 首页校验
├── static/                      # 静态资源
├── design/                      # 设计规范
├── docker-compose.yml           # 主 Compose（开发）
├── docker-compose.dev.yml       # 开发覆写
├── docker-compose.prod.yml      # 生产覆写
├── docker-compose.test.yml      # 测试覆写
├── docker-compose.wp.yml        # WordPress 独立 Compose
├── package.json                 # 根 workspaces 配置
├── eslint.config.js             # ESLint 9 Flat Config
├── playwright.config.ts         # E2E 配置
├── commitlint.config.js         # 提交规范
├── .husky/                      # Git Hooks
├── .prettierrc                  # Prettier 配置
├── .lintstagedrc.json           # lint-staged 配置
└── .trae/rules/                 # Trae AI 规则
    ├── project_rules.md         # 项目规则
    └── task-scheduling-rules.md # AI Agent 资源管控规则
```

## 3.2 packages/server 目录结构

```
packages/server/
├── src/
│   ├── app.ts                   # Express 应用入口（中间件挂载）
│   ├── server.ts                # HTTP 服务启动 + 优雅停机
│   ├── websocket.js             # Socket.IO 服务
│   ├── routes/                  # 路由层（40+ 路由模块）
│   │   ├── index.ts             # 路由注册入口
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── oauth.ts
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── payment.ts
│   │   ├── cart.ts
│   │   ├── ...（详见 06-server-backend.md）
│   ├── controllers/             # 控制器层（30+ 个）
│   ├── services/                # 服务层
│   │   ├── paymentGateways/     # 支付网关（alipay/wechat）
│   │   ├── oauth/               # OAuth 提供方
│   │   ├── agent/               # AI Agent（LangChain + MCP）
│   │   ├── reportGenerator/     # 报告生成器
│   │   ├── taskqueue/           # 任务队列
│   │   ├── cacheService.ts
│   │   ├── queueService.ts
│   │   ├── orderService.ts
│   │   ├── productService.ts
│   │   └── ...
│   ├── models/                  # 数据模型层（35+ 个）
│   │   ├── index.ts             # 工厂方法 getDb()/closeDb()
│   │   ├── dbClient.ts          # 数据库客户端抽象
│   │   ├── pgSyncClient.ts      # PostgreSQL 同步客户端
│   │   ├── sqlDialect.ts        # SQL 方言适配
│   │   ├── postgresSchema.ts    # PostgreSQL Schema
│   │   ├── userModel.ts
│   │   ├── orderModel.ts
│   │   ├── productModel.ts
│   │   └── ...
│   ├── middleware/              # 中间件层
│   │   ├── security.ts          # 安全中间件集合
│   │   ├── auth.ts              # JWT 认证
│   │   ├── permission.ts        # RBAC 权限
│   │   ├── rateLimiter.ts       # 速率限制
│   │   ├── csrfConfig.ts        # CSRF 配置
│   │   ├── dataMasking.ts       # 数据脱敏
│   │   ├── apm.ts               # APM 性能监控
│   │   ├── metrics.ts           # Prometheus 指标
│   │   └── ...
│   ├── config/                  # 配置
│   │   ├── index.ts             # 主配置入口
│   │   ├── swagger.ts           # Swagger 文档
│   │   └── cache.ts             # 缓存配置
│   ├── utils/                   # 工具
│   │   ├── logger.ts            # Winston 日志
│   │   ├── tracing.ts           # OpenTelemetry
│   │   ├── crypto.ts            # 加密工具
│   │   ├── response.ts          # 统一响应
│   │   ├── backup.ts            # 自动备份
│   │   └── migration.ts         # 数据库迁移
│   └── types/                   # 类型定义
├── data/                        # SQLite 数据库文件
├── uploads/                     # 上传文件
├── logs/                        # 日志文件
├── .env.example
├── Dockerfile
├── package.json
├── tsconfig.json
└── nodemon.json
```

## 3.3 packages/pc 目录结构

```
packages/pc/
├── src/
│   ├── api/                     # API 请求层（按业务拆分）
│   │   ├── request.ts           # Axios 封装
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── product.ts
│   │   ├── order.ts
│   │   ├── review.ts
│   │   ├── social.ts
│   │   ├── chat.ts
│   │   ├── audit.ts
│   │   ├── role.ts
│   │   ├── permission.ts
│   │   ├── category.ts
│   │   ├── flashSale.ts
│   │   ├── referral.ts
│   │   └── index.ts             # 统一导出
│   ├── components/              # 通用组件
│   │   └── CaptchaCanvas.vue
│   ├── i18n/
│   │   ├── locales/
│   │   │   ├── zh-CN.ts
│   │   │   └── en-US.ts
│   │   └── index.ts
│   ├── layout/
│   │   └── index.vue            # 后台主布局
│   ├── router/
│   │   └── index.ts             # 路由配置
│   ├── store/
│   │   ├── user.ts              # 用户状态
│   │   └── user.test.ts
│   ├── styles/
│   │   ├── global.scss
│   │   └── variables.scss
│   ├── utils/
│   │   └── passwordStrength.ts
│   ├── views/                   # 页面视图（按模块组织）
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── reviews/
│   │   ├── audit/
│   │   ├── chat/
│   │   ├── inbox/
│   │   ├── social/
│   │   ├── flash-sales/
│   │   ├── referral/
│   │   ├── queue/
│   │   ├── settings/
│   │   ├── profile/
│   │   └── NotFound.vue
│   ├── App.vue
│   ├── main.ts
│   └── global.d.ts
├── Dockerfile
├── index.html
├── nginx.conf
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 3.4 packages/app 目录结构

```
packages/app/
├── src/
│   ├── api/                     # API 请求层
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── cart.js
│   │   ├── chat.js
│   │   ├── food.js
│   │   ├── inbox.js
│   │   ├── order.js
│   │   ├── push.js
│   │   ├── ride.js
│   │   ├── sync.js
│   │   └── index.js
│   ├── store/
│   │   └── app.js               # Pinia store
│   ├── App.vue
│   ├── main.js
│   ├── pages.json               # uni-app 页面配置
│   └── sw.js                    # Service Worker
├── .babelrc
├── Dockerfile
├── index.html
├── manifest.json
├── nginx.conf
├── package.json
├── pages.json
└── vite.config.js
```

## 3.5 packages/sdk 目录结构

```
packages/sdk/
├── src/
│   ├── index.ts                 # 主入口（GexmSDK 类）
│   ├── adapters/                # 9 个平台适配器
│   │   ├── web/                 # Web 适配器
│   │   │   ├── index.ts
│   │   │   ├── webNetworkModule.ts
│   │   │   ├── webStorageModule.ts
│   │   │   ├── webCryptoModule.ts
│   │   │   ├── webLogModule.ts
│   │   │   └── webTerminalModule.ts
│   │   ├── mp-weixin/index.ts
│   │   ├── mp-alipay/index.ts
│   │   ├── mp-baidu/index.ts
│   │   ├── mp-toutiao/index.ts
│   │   ├── mp-harmony/index.ts
│   │   ├── app-plus/index.ts
│   │   ├── app-harmony/index.ts
│   │   └── electron/index.ts
│   ├── core/                    # 核心机制
│   │   ├── platformFactory.ts
│   │   ├── eventBus.ts
│   │   ├── pluginRegistry.ts
│   │   └── errorCodes.ts
│   ├── interfaces/              # 接口定义
│   └── globals.d.ts
├── jest.config.js
├── package.json
├── tsconfig.json
├── typedoc.json
└── vite.config.ts
```

## 3.6 wp-content/themes/mixm-laal 目录结构

```
wp-content/themes/mixm-laal/
├── style.css                    # 主题头部信息 + 全局样式
├── functions.php                # 主题入口（注册菜单/小工具/CPT/钩子）
├── header.php                   # 公共头部
├── footer.php                   # 公共页脚
├── sidebar.php                  # 侧边栏
├── index.php                    # 默认列表模板（fallback）
├── single.php                   # 单篇文章
├── page.php                     # 自定义页面
├── archive.php                  # 归档页
├── category.php                 # 分类页
├── tag.php                      # 标签页
├── search.php                   # 搜索结果页
├── searchform.php               # 搜索表单
├── 404.php                      # 404 错误页
├── comments.php                 # 评论模板
├── author.php                   # 作者页
├── date.php                     # 日期归档页
├── front-page.php               # 首页模板
├── social.php                   # 社交模块
├── community.php                # 社区模块
├── forum.php / forum-topic.php  # 论坛模块
├── template-shop.php            # 商城模板
├── template-product-detail.php
├── template-cart.php
├── template-checkout.php
├── template-orders.php
├── template-addresses.php
├── template-order-detail.php
├── shop-payment.php             # 商城支付
├── payment.php                  # 支付回调
├── video.php                    # 视频模块
├── webmaster.php                # 站长模块
├── bottle.php                   # 漂流瓶模块
├── site.php                     # 网站分类模块
├── crawler.php                  # 互联网采集模块
├── api.php / api-test.php       # API 模块
├── mobile.php                   # 手机拉阿狸模块
├── app.php / app-admin.php      # APP 模块
├── xinzj.php                    # 新建站模块
├── modular-page.php             # 模块化页面构建器
├── page-visual-layout.php
├── page-content-modules.php
├── single-news_flash.php        # 快讯自定义文章类型
├── archive-news_flash.php
├── taxonomy-article_topic.php   # 自定义分类法模板
├── content.php / content-page.php / content-search.php / content-none.php
├── inc/                         # 主题功能集成
│   ├── module-loader.php        # 模块加载器
│   ├── module-router.php        # 模块路由
│   ├── module-integration.php
│   ├── social-functions.php
│   ├── forum-functions.php
│   ├── payment-gateway.php
│   ├── mobile-functions.php
│   ├── webmaster-functions.php
│   ├── site-functions.php
│   ├── crawler-functions.php
│   ├── video-functions.php
│   ├── rate-limit-functions.php
│   ├── seo-optimization.php
│   ├── performance-functions.php
│   ├── database-optimization.php
│   ├── health-check.php
│   ├── social-login.php
│   ├── social-login-callback.php
│   ├── social-share-optimization.php
│   ├── news-flash-functions.php
│   ├── news-category-functions.php
│   ├── reward-functions.php / reward-admin.php
│   ├── wechat-share-functions.php / wechat-share-admin.php
│   ├── lazyload-functions.php / lazyload-custom-functions.php / lazy-load.php
│   ├── webp-support.php
│   ├── themer-framework.php / themer-framework-extended.php
│   ├── themer-modular-optimization.php
│   ├── modular-combination-optimization.php
│   ├── visual-editor.php / visual-core-modules.php
│   ├── template-functions.php
│   ├── navigation.php
│   ├── error-handler.php
│   ├── websocket-server.php / start-websocket.php
│   ├── sample-data.php / sample-data-functions.php / sample-data-extended.php / sample-data-admin.php
│   ├── woocommerce-support.php / woocommerce-311-compatibility.php
│   ├── xinzj-functions.php / xinzj-admin.php
│   ├── crawler-admin.php
│   ├── site-admin.php
│   ├── video-admin.php
│   ├── webmaster-admin.php
│   ├── mobile-admin.php / mobile-footer-admin.php / mobile-footer-functions.php / mobile-login.php
│   ├── mobile-post-pagination.php / mobile-pagination-functions.php / mobile-header-sticky.php / mobile-category-switch.php
│   ├── seo-meta-optimization.php / seo-enhanced-optimization.php / seo-feature-toggle.php
│   ├── custom-seo-support.php / homepage-seo-title.php / title-separator-settings.php
│   ├── post-list-optimization.php / post-pagination.php / post-author-info-toggle.php / post-image-alignment.php
│   ├── image-compatibility-optimization.php / image-typesetting-functions.php / external-image-featured.php / custom-thumbnail-crop.php
│   ├── widget-sorting.php / sidebar-sticky-functions.php / custom-sidebar-support.php
│   ├── user-center-optimization.php / user-dropdown-menu-optimization.php / header-avatar-menu.php
│   ├── qa-community-optimization.php / empty-topic-functions.php / contribution-enhanced-functions.php / contributor-image-upload.php
│   ├── homepage-category-sort-functions.php / fullscreen-background-settings.php / theme-panel-tab-remember.php
│   ├── logo-size-settings.php / reward-button-position.php / pagination-title-number.php
│   ├── jquery-update.php / smooth-scroll-functions.php / theme-documentation-link.php
│   └── mixm-laal-support.php
├── template-parts/              # 模板片段
│   ├── content.php
│   ├── content/
│   │   ├── content.php
│   │   ├── content-page.php
│   │   ├── content-search.php
│   │   └── content-none.php
│   ├── social-feed.php
│   ├── social-profile.php
│   ├── social-messages.php
│   ├── forum-topics.php / forum-topic-detail.php / forum-boards.php
│   ├── community-topics.php / community-groups.php / community-categories.php
│   ├── shop-products.php / shop-product-detail.php / shop-categories.php / shop-orders.php / shop-cart.php / shop-payment.php / shop-payment-success.php
│   ├── video-list.php / video-detail.php / video-upload.php / video-history.php / video-favorites.php / video-categories.php
│   ├── webmaster-dashboard.php / webmaster-statistics.php / webmaster-settings.php / webmaster-seo.php / webmaster-logs.php / webmaster-backups.php
│   ├── site-categories.php / site-websites.php / site-tags.php / site-submit.php / site-search.php
│   ├── crawler-tasks.php / crawler-storages.php / crawler-proxies.php / crawler-parsers.php / crawler-monitor.php / crawler-logs.php
│   ├── bottle-send.php / bottle-receive.php / bottle-chat.php / bottle-stats.php / bottle-settings.php
│   ├── api-documentation.php / api-tester.php / api-settings.php / api-auth.php / api-analytics.php
│   ├── mobile-home.php / mobile-social.php / mobile-shop.php / mobile-forum.php / mobile-community.php / mobile-video.php / mobile-bottle.php / mobile-api.php / mobile-crawler.php / mobile-site.php
│   ├── app-stats.php / app-settings.php / app-feedback.php / app-feedback-list.php / app-versions.php
│   ├── xinzj-features.php
│   └── content-modules-demo.php
├── templates/                   # 备用模板目录
│   ├── template-shop.php
│   ├── template-cart.php
│   ├── template-checkout.php
│   ├── template-addresses.php
│   ├── template-product-detail.php
│   └── template-orders.php
├── admin/                       # 后台管理
│   ├── api-keys.php             # API 密钥管理
│   └── theme-sync.php           # 主题同步管理
├── assets/                      # 静态资源
│   ├── fonts/                   # FontAwesome 字体
│   ├── js/                      # 模块 JS 文件
│   ├── css/                     # 模块 CSS 文件
│   └── images/
└── tests/                       # 主题测试
    ├── bootstrap.php
    ├── test-url-rewrite.php
    ├── test-crawler.php
    ├── test-crawler-website.php
    └── test-commerce.php
```
