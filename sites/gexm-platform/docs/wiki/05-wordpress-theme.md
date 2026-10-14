# 05 · WordPress 主题模块（mixm-laal）

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 5.1 主题元信息

- **Theme Name**：MixM Laal
- **Theme URI**：https://laal.top
- **Author**：米小米拉阿狸
- **Version**：`mxmlaal v 0.0.1- (2025-11-03 14:30:25)`
- **Text Domain**：`mixm-laal`
- **Tags**：响应式设计、博客、自定义菜单、主题选项、无障碍
- **License**：GPLv2+
- **路径**：[wp-content/themes/mixm-laal/](file:///f:/gexm/wp-content/themes/mixm-laal/)
- **入口**：[functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php)

## 5.2 13 个核心模块

| 模块 | 主模板文件 | 配套 JS | 配套 CSS | 功能说明 |
| --- | --- | --- | --- | --- |
| 拉阿狸首页 | [front-page.php](file:///f:/gexm/wp-content/themes/mixm-laal/front-page.php) | `homepage.js` | `site.css` | 网站主页 |
| 社交 | [social.php](file:///f:/gexm/wp-content/themes/mixm-laal/social.php) | `social.js` | `social.css` | 用户社交互动 |
| 社区 | [community.php](file:///f:/gexm/wp-content/themes/mixm-laal/community.php) | `community.js` | `community.css` | 社区讨论 |
| 论坛 | [forum.php](file:///f:/gexm/wp-content/themes/mixm-laal/forum.php)、[forum-topic.php](file:///f:/gexm/wp-content/themes/mixm-laal/forum-topic.php) | `forum.js`、`forum-editor.js`、`forum-search.js` | `forum.css`、`forum-style.css` | 传统论坛 |
| 商城 | [template-shop.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-shop.php)、[template-product-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-product-detail.php)、[template-cart.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-cart.php)、[template-checkout.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-checkout.php)、[template-orders.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-orders.php)、[template-addresses.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-addresses.php)、[template-order-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-order-detail.php) | `commerce.js` | `shop.css`、`woocommerce.css`、`payment.css` | 电商 |
| 视频 | [video.php](file:///f:/gexm/wp-content/themes/mixm-laal/video.php) | `video.js` | `video.css` | 视频管理 |
| 站长 | [webmaster.php](file:///f:/gexm/wp-content/themes/mixm-laal/webmaster.php) | `webmaster.js` | `site.css` | 站点管理 |
| 漂流瓶 | [bottle.php](file:///f:/gexm/wp-content/themes/mixm-laal/bottle.php) | `bottle.js` | `bottle.css` | 匿名消息 |
| 网站分类 | [site.php](file:///f:/gexm/wp-content/themes/mixm-laal/site.php) | `site.js` | `site.css` | 网站收录 |
| 互联网采集 | [crawler.php](file:///f:/gexm/wp-content/themes/mixm-laal/crawler.php) | `crawler.js` | `crawler.css` | 数据采集 |
| API | [api.php](file:///f:/gexm/wp-content/themes/mixm-laal/api.php)、[api-test.php](file:///f:/gexm/wp-content/themes/mixm-laal/api-test.php) | `api.js` | `api.css` | RESTful 接口 |
| 手机拉阿狸 | [mobile.php](file:///f:/gexm/wp-content/themes/mixm-laal/mobile.php) | `mobile.js`、`mobile-menu.js`、`mobile-footer.js`、`mobile-login.js`、`mobile-share.js` | `mobile.css`、`mobile-footer.css`、`mobile-login.css`、`mobile-share.css` | 移动端适配 |
| 拉阿狸 APP | [app.php](file:///f:/gexm/wp-content/themes/mixm-laal/app.php)、[app-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/app-admin.php) | `app.js` | `app.css` | APP 支持 |

## 5.3 各模块详解

### 5.3.1 拉阿狸首页模块

- **主模板**：[front-page.php](file:///f:/gexm/wp-content/themes/mixm-laal/front-page.php)
- **配套文件**：`assets/js/homepage.js`、`assets/css/site.css`
- **功能**：网站主页展示
- **关键函数**：通过 `mixm_laal_get_cart_session_id()` 提供游客购物车会话标识
- **依赖模块**：依赖 `inc/template-functions.php`、`inc/navigation.php`

### 5.3.2 社交模块

- **主模板**：[social.php](file:///f:/gexm/wp-content/themes/mixm-laal/social.php)
- **配套文件**：`assets/js/social.js`、`assets/css/social.css`
- **功能集成**：[inc/social-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/social-functions.php)
- **AJAX 端点**：动态发布、点赞、评论、关注
- **登录集成**：[inc/social-login.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/social-login.php)、[inc/social-login-callback.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/social-login-callback.php)
- **分享优化**：[inc/social-share-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/social-share-optimization.php)
- **模板片段**：[template-parts/social-feed.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/social-feed.php)、[social-profile.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/social-profile.php)、[social-messages.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/social-messages.php)

### 5.3.3 社区模块

- **主模板**：[community.php](file:///f:/gexm/wp-content/themes/mixm-laal/community.php)
- **配套文件**：`assets/js/community.js`、`assets/css/community.css`
- **功能**：社区讨论、话题、群组
- **模板片段**：[template-parts/community-topics.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/community-topics.php)、[community-groups.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/community-groups.php)、[community-categories.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/community-categories.php)
- **优化集成**：[inc/qa-community-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/qa-community-optimization.php)、[inc/empty-topic-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/empty-topic-functions.php)

### 5.3.4 论坛模块

- **主模板**：[forum.php](file:///f:/gexm/wp-content/themes/mixm-laal/forum.php)、[forum-topic.php](file:///f:/gexm/wp-content/themes/mixm-laal/forum-topic.php)
- **配套文件**：`forum.js`、`forum-editor.js`、`forum-search.js`、`forum.css`、`forum-style.css`
- **功能集成**：[inc/forum-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/forum-functions.php)、[inc/forum-enhancements.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/forum-enhancements.php)
- **模板片段**：[template-parts/forum-topics.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/forum-topics.php)、[forum-topic-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/forum-topic-detail.php)、[forum-boards.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/forum-boards.php)

### 5.3.5 商城模块

- **主模板**：
  - [template-shop.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-shop.php)：商城首页
  - [template-product-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-product-detail.php)：商品详情
  - [template-cart.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-cart.php)：购物车
  - [template-checkout.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-checkout.php)：结算
  - [template-orders.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-orders.php)：订单
  - [template-addresses.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-addresses.php)：收货地址
  - [template-order-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-order-detail.php)：订单详情
- **配套 JS**：`assets/js/commerce.js`
- **配套 CSS**：`shop.css`、`woocommerce.css`、`payment.css`
- **支付集成**：[shop-payment.php](file:///f:/gexm/wp-content/themes/mixm-laal/shop-payment.php)、[payment.php](file:///f:/gexm/wp-content/themes/mixm-laal/payment.php)、[inc/payment-gateway.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/payment-gateway.php)
- **WooCommerce 兼容**：[inc/woocommerce-support.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/woocommerce-support.php)、[inc/woocommerce-311-compatibility.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/woocommerce-311-compatibility.php)
- **数据库表**：
  - `wp_mixm_laal_cart_sessions`：购物车会话
  - `wp_mixm_laal_orders`：订单
  - `wp_mixm_laal_order_items`：订单商品
  - `wp_mixm_laal_addresses`：收货地址
- **支付方式**：支付宝（RSA2）、微信支付（HMAC-SHA256）、PayPal、Stripe
- **模板片段**：[template-parts/shop-products.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-products.php)、[shop-product-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-product-detail.php)、[shop-categories.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-categories.php)、[shop-orders.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-orders.php)、[shop-cart.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-cart.php)、[shop-payment.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-payment.php)、[shop-payment-success.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/shop-payment-success.php)

### 5.3.6 视频模块

- **主模板**：[video.php](file:///f:/gexm/wp-content/themes/mixm-laal/video.php)
- **配套文件**：`assets/js/video.js`、`assets/css/video.css`
- **功能集成**：[inc/video-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/video-functions.php)、[inc/video-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/video-admin.php)
- **功能**：视频管理、播放、上传、历史、收藏、分类
- **模板片段**：[template-parts/video-list.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/video-list.php)、[video-detail.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/video-detail.php)、[video-upload.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/video-upload.php)、[video-history.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/video-history.php)、[video-favorites.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/video-favorites.php)、[video-categories.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/video-categories.php)
- **自定义文章类型**：`video`

### 5.3.7 站长模块

- **主模板**：[webmaster.php](file:///f:/gexm/wp-content/themes/mixm-laal/webmaster.php)
- **配套文件**：`assets/js/webmaster.js`、`assets/css/site.css`
- **功能集成**：[inc/webmaster-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/webmaster-functions.php)、[inc/webmaster-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/webmaster-admin.php)
- **功能**：站点管理、统计、SEO、日志、备份
- **模板片段**：[template-parts/webmaster-dashboard.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/webmaster-dashboard.php)、[webmaster-statistics.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/webmaster-statistics.php)、[webmaster-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/webmaster-settings.php)、[webmaster-seo.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/webmaster-seo.php)、[webmaster-logs.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/webmaster-logs.php)、[webmaster-backups.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/webmaster-backups.php)
- **权限要求**：`current_user_can('manage_options')`

### 5.3.8 漂流瓶模块

- **主模板**：[bottle.php](file:///f:/gexm/wp-content/themes/mixm-laal/bottle.php)
- **配套文件**：`assets/js/bottle.js`、`assets/css/bottle.css`
- **功能**：匿名消息传递、聊天
- **数据库表**：`wp_mixm_laal_bottles`、`wp_mixm_laal_bottle_chats`
- **模板片段**：[template-parts/bottle-send.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/bottle-send.php)、[bottle-receive.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/bottle-receive.php)、[bottle-chat.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/bottle-chat.php)、[bottle-stats.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/bottle-stats.php)、[bottle-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/bottle-settings.php)

### 5.3.9 网站分类模块

- **主模板**：[site.php](file:///f:/gexm/wp-content/themes/mixm-laal/site.php)
- **配套文件**：`assets/js/site.js`、`assets/css/site.css`
- **功能集成**：[inc/site-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/site-functions.php)、[inc/site-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/site-admin.php)
- **功能**：网站收录、分类、标签、搜索、提交
- **数据库表**：`wp_mixm_laal_sites`、`wp_mixm_laal_site_categories`、`wp_mixm_laal_site_tags`
- **模板片段**：[template-parts/site-categories.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/site-categories.php)、[site-websites.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/site-websites.php)、[site-tags.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/site-tags.php)、[site-submit.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/site-submit.php)、[site-search.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/site-search.php)

### 5.3.10 互联网采集模块

- **主模板**：[crawler.php](file:///f:/gexm/wp-content/themes/mixm-laal/crawler.php)
- **配套文件**：`assets/js/crawler.js`、`assets/css/crawler.css`
- **功能集成**：[inc/crawler-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/crawler-functions.php)、[inc/crawler-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/crawler-admin.php)
- **功能**：数据采集、任务管理、代理、解析器、存储、监控、日志
- **数据库表**：`wp_mixm_laal_crawler_tasks`、`wp_mixm_laal_crawler_logs`、`wp_mixm_laal_crawler_proxies`、`wp_mixm_laal_crawler_storages`、`wp_mixm_laal_crawler_parsers`
- **模板片段**：[template-parts/crawler-tasks.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/crawler-tasks.php)、[crawler-storages.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/crawler-storages.php)、[crawler-proxies.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/crawler-proxies.php)、[crawler-parsers.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/crawler-parsers.php)、[crawler-monitor.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/crawler-monitor.php)、[crawler-logs.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/crawler-logs.php)
- **测试**：[tests/test-crawler.php](file:///f:/gexm/wp-content/themes/mixm-laal/tests/test-crawler.php)、[tests/test-crawler-website.php](file:///f:/gexm/wp-content/themes/mixm-laal/tests/test-crawler-website.php)

### 5.3.11 API 模块

- **主模板**：[api.php](file:///f:/gexm/wp-content/themes/mixm-laal/api.php)、[api-test.php](file:///f:/gexm/wp-content/themes/mixm-laal/api-test.php)
- **配套文件**：`assets/js/api.js`、`assets/css/api.css`
- **功能**：RESTful 接口服务、API 测试、认证、分析、设置
- **AJAX 端点**：通过 `admin-ajax.php?action=mixm_laal_*` 形式暴露
- **API 密钥管理**：[admin/api-keys.php](file:///f:/gexm/wp-content/themes/mixm-laal/admin/api-keys.php)
- **数据库表**：`wp_mixm_laal_api_keys`
- **模板片段**：[template-parts/api-documentation.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/api-documentation.php)、[api-tester.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/api-tester.php)、[api-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/api-settings.php)、[api-auth.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/api-auth.php)、[api-analytics.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/api-analytics.php)
- **安全**：所有 API 请求必须通过 `mixm_laal_nonce` nonce 校验

### 5.3.12 手机拉阿狸模块

- **主模板**：[mobile.php](file:///f:/gexm/wp-content/themes/mixm-laal/mobile.php)
- **配套文件**：`mobile.js`、`mobile-menu.js`、`mobile-footer.js`、`mobile-login.js`、`mobile-share.js`、`mobile.css`、`mobile-footer.css`、`mobile-login.css`、`mobile-share.css`
- **功能集成**：[inc/mobile-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-functions.php)、[inc/mobile-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-admin.php)、[inc/mobile-login.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-login.php)、[inc/mobile-footer-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-footer-functions.php)、[inc/mobile-footer-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-footer-admin.php)、[inc/mobile-post-pagination.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-post-pagination.php)、[inc/mobile-pagination-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-pagination-functions.php)、[inc/mobile-header-sticky.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-header-sticky.php)、[inc/mobile-category-switch.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mobile-category-switch.php)
- **功能**：移动端全功能适配（首页、社交、商城、论坛、社区、视频、漂流瓶、API、采集、网站分类）
- **模板片段**：[template-parts/mobile-home.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-home.php)、[mobile-social.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-social.php)、[mobile-shop.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-shop.php)、[mobile-forum.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-forum.php)、[mobile-community.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-community.php)、[mobile-video.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-video.php)、[mobile-bottle.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-bottle.php)、[mobile-api.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-api.php)、[mobile-crawler.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-crawler.php)、[mobile-site.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/mobile-site.php)

### 5.3.13 拉阿狸 APP 模块

- **主模板**：[app.php](file:///f:/gexm/wp-content/themes/mixm-laal/app.php)、[app-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/app-admin.php)
- **配套文件**：`assets/js/app.js`、`assets/css/app.css`
- **功能**：APP 支持、版本管理、反馈、统计、设置
- **模板片段**：[template-parts/app-stats.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/app-stats.php)、[app-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/app-settings.php)、[app-feedback.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/app-feedback.php)、[app-feedback-list.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/app-feedback-list.php)、[app-versions.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/app-versions.php)

## 5.4 主题核心 PHP 文件

### 5.4.1 标准模板文件

| 文件 | 职责 |
| --- | --- |
| [functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php) | 主题入口，注册菜单、小工具、自定义文章类型、钩子挂载 |
| [header.php](file:///f:/gexm/wp-content/themes/mixm-laal/header.php) | 公共头部（导航、SEO meta、Open Graph） |
| [footer.php](file:///f:/gexm/wp-content/themes/mixm-laal/footer.php) | 公共页脚 |
| [sidebar.php](file:///f:/gexm/wp-content/themes/mixm-laal/sidebar.php) | 侧边栏 |
| [index.php](file:///f:/gexm/wp-content/themes/mixm-laal/index.php) | 默认列表模板（fallback） |
| [single.php](file:///f:/gexm/wp-content/themes/mixm-laal/single.php) | 单篇文章 |
| [page.php](file:///f:/gexm/wp-content/themes/mixm-laal/page.php) | 自定义页面 |
| [archive.php](file:///f:/gexm/wp-content/themes/mixm-laal/archive.php) | 归档页 |
| [category.php](file:///f:/gexm/wp-content/themes/mixm-laal/category.php) | 分类页 |
| [tag.php](file:///f:/gexm/wp-content/themes/mixm-laal/tag.php) | 标签页 |
| [search.php](file:///f:/gexm/wp-content/themes/mixm-laal/search.php) | 搜索结果页 |
| [searchform.php](file:///f:/gexm/wp-content/themes/mixm-laal/searchform.php) | 搜索表单 |
| [404.php](file:///f:/gexm/wp-content/themes/mixm-laal/404.php) | 404 错误页 |
| [comments.php](file:///f:/gexm/wp-content/themes/mixm-laal/comments.php) | 评论模板 |
| [author.php](file:///f:/gexm/wp-content/themes/mixm-laal/author.php) | 作者页 |
| [date.php](file:///f:/gexm/wp-content/themes/mixm-laal/date.php) | 日期归档页 |
| [content.php](file:///f:/gexm/wp-content/themes/mixm-laal/content.php) / [content-page.php](file:///f:/gexm/wp-content/themes/mixm-laal/content-page.php) / [content-search.php](file:///f:/gexm/wp-content/themes/mixm-laal/content-search.php) / [content-none.php](file:///f:/gexm/wp-content/themes/mixm-laal/content-none.php) | 内容片段模板 |

### 5.4.2 支付与商城

| 文件 | 职责 |
| --- | --- |
| [payment.php](file:///f:/gexm/wp-content/themes/mixm-laal/payment.php) | 支付回调 |
| [shop-payment.php](file:///f:/gexm/wp-content/themes/mixm-laal/shop-payment.php) | 商城支付 |
| [inc/payment-gateway.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/payment-gateway.php) | 支付网关集成 |

### 5.4.3 自定义文章类型与分类法

| 文件 | 职责 |
| --- | --- |
| [taxonomy-article_topic.php](file:///f:/gexm/wp-content/themes/mixm-laal/taxonomy-article_topic.php) | 自定义分类法模板 |
| [single-news_flash.php](file:///f:/gexm/wp-content/themes/mixm-laal/single-news_flash.php) | 快讯自定义文章类型（单篇） |
| [archive-news_flash.php](file:///f:/gexm/wp-content/themes/mixm-laal/archive-news_flash.php) | 快讯自定义文章类型（归档） |

### 5.4.4 模块化页面构建器

| 文件 | 职责 |
| --- | --- |
| [modular-page.php](file:///f:/gexm/wp-content/themes/mixm-laal/modular-page.php) | 模块化页面构建器 |
| [page-visual-layout.php](file:///f:/gexm/wp-content/themes/mixm-laal/page-visual-layout.php) | 可视化布局 |
| [page-content-modules.php](file:///f:/gexm/wp-content/themes/mixm-laal/page-content-modules.php) | 内容模块 |
| [inc/visual-editor.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/visual-editor.php) | 可视化编辑器 |
| [inc/visual-core-modules.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/visual-core-modules.php) | 核心模块 |
| [inc/themer-framework.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/themer-framework.php) | 主题框架 |
| [inc/themer-framework-extended.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/themer-framework-extended.php) | 主题框架扩展 |
| [inc/themer-modular-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/themer-modular-optimization.php) | 模块化优化 |

### 5.4.5 API 与管理

| 文件 | 职责 |
| --- | --- |
| [api.php](file:///f:/gexm/wp-content/themes/mixm-laal/api.php) | 主题 AJAX API（含 `mixm_laal_nonce` 校验） |
| [api-test.php](file:///f:/gexm/wp-content/themes/mixm-laal/api-test.php) | API 测试 |
| [admin/api-keys.php](file:///f:/gexm/wp-content/themes/mixm-laal/admin/api-keys.php) | 后台 API 密钥管理 |
| [admin/theme-sync.php](file:///f:/gexm/wp-content/themes/mixm-laal/admin/theme-sync.php) | 主题同步管理（注册 `mixm_laal_sync_status` AJAX） |

### 5.4.6 新建站模块

| 文件 | 职责 |
| --- | --- |
| [xinzj.php](file:///f:/gexm/wp-content/themes/mixm-laal/xinzj.php) | 新建站模块 |
| [inc/xinzj-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/xinzj-functions.php) | 新建站功能 |
| [inc/xinzj-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/xinzj-admin.php) | 新建站管理 |
| [template-parts/xinzj-features.php](file:///f:/gexm/wp-content/themes/mixm-laal/template-parts/xinzj-features.php) | 新建站特性 |

## 5.5 关键 inc/ 文件清单

| 文件 | 职责 |
| --- | --- |
| [inc/module-loader.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/module-loader.php) | 模块加载器（统一加载所有 inc/ 文件） |
| [inc/module-router.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/module-router.php) | 模块路由（37 项白名单校验） |
| [inc/module-integration.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/module-integration.php) | 模块集成 |
| [inc/template-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/template-functions.php) | 模板函数 |
| [inc/navigation.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/navigation.php) | 导航 |
| [inc/error-handler.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/error-handler.php) | 错误处理 |
| [inc/rate-limit-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/rate-limit-functions.php) | 速率限制 |
| [inc/seo-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/seo-optimization.php) | SEO 优化 |
| [inc/seo-meta-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/seo-meta-optimization.php) | SEO Meta 优化 |
| [inc/seo-enhanced-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/seo-enhanced-optimization.php) | SEO 增强优化 |
| [inc/seo-feature-toggle.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/seo-feature-toggle.php) | SEO 功能开关 |
| [inc/performance-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/performance-functions.php) | 性能优化 |
| [inc/database-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/database-optimization.php) | 数据库优化 |
| [inc/health-check.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/health-check.php) | 健康检查 |
| [inc/lazyload-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/lazyload-functions.php) | 懒加载 |
| [inc/lazyload-custom-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/lazyload-custom-functions.php) | 自定义懒加载 |
| [inc/lazy-load.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/lazy-load.php) | 懒加载（旧版） |
| [inc/webp-support.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/webp-support.php) | WebP 支持 |
| [inc/image-compatibility-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/image-compatibility-optimization.php) | 图片兼容性优化 |
| [inc/image-typesetting-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/image-typesetting-functions.php) | 图片排版 |
| [inc/external-image-featured.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/external-image-featured.php) | 外部图片作为特色图片 |
| [inc/custom-thumbnail-crop.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/custom-thumbnail-crop.php) | 自定义缩略图裁剪 |
| [inc/post-image-alignment.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/post-image-alignment.php) | 文章图片对齐 |
| [inc/post-list-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/post-list-optimization.php) | 文章列表优化 |
| [inc/post-pagination.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/post-pagination.php) | 文章分页 |
| [inc/post-author-info-toggle.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/post-author-info-toggle.php) | 作者信息开关 |
| [inc/widget-sorting.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/widget-sorting.php) | 小工具排序 |
| [inc/sidebar-sticky-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/sidebar-sticky-functions.php) | 侧边栏固定 |
| [inc/custom-sidebar-support.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/custom-sidebar-support.php) | 自定义侧边栏 |
| [inc/user-center-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/user-center-optimization.php) | 用户中心优化 |
| [inc/user-dropdown-menu-optimization.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/user-dropdown-menu-optimization.php) | 用户下拉菜单优化 |
| [inc/header-avatar-menu.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/header-avatar-menu.php) | 头部头像菜单 |
| [inc/contribution-enhanced-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/contribution-enhanced-functions.php) | 投稿增强 |
| [inc/contributor-image-upload.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/contributor-image-upload.php) | 投稿图片上传 |
| [inc/homepage-category-sort-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/homepage-category-sort-functions.php) | 首页分类排序 |
| [inc/homepage-seo-title.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/homepage-seo-title.php) | 首页 SEO 标题 |
| [inc/fullscreen-background-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/fullscreen-background-settings.php) | 全屏背景设置 |
| [inc/theme-panel-tab-remember.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/theme-panel-tab-remember.php) | 主题面板标签记忆 |
| [inc/logo-size-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/logo-size-settings.php) | Logo 尺寸设置 |
| [inc/reward-button-position.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/reward-button-position.php) | 打赏按钮位置 |
| [inc/pagination-title-number.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/pagination-title-number.php) | 分页标题编号 |
| [inc/jquery-update.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/jquery-update.php) | jQuery 升级 |
| [inc/smooth-scroll-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/smooth-scroll-functions.php) | 平滑滚动 |
| [inc/theme-documentation-link.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/theme-documentation-link.php) | 主题文档链接 |
| [inc/custom-seo-support.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/custom-seo-support.php) | 自定义 SEO 支持 |
| [inc/title-separator-settings.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/title-separator-settings.php) | 标题分隔符设置 |
| [inc/news-flash-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/news-flash-functions.php) | 快讯功能 |
| [inc/news-category-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/news-category-functions.php) | 新闻分类 |
| [inc/reward-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/reward-functions.php) | 打赏功能 |
| [inc/reward-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/reward-admin.php) | 打赏管理 |
| [inc/wechat-share-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/wechat-share-functions.php) | 微信分享功能 |
| [inc/wechat-share-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/wechat-share-admin.php) | 微信分享管理 |
| [inc/sample-data.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/sample-data.php) | 示例数据 |
| [inc/sample-data-functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/sample-data-functions.php) | 示例数据函数 |
| [inc/sample-data-extended.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/sample-data-extended.php) | 扩展示例数据 |
| [inc/sample-data-admin.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/sample-data-admin.php) | 示例数据管理 |
| [inc/websocket-server.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/websocket-server.php) | WebSocket 服务 |
| [inc/start-websocket.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/start-websocket.php) | WebSocket 启动 |
| [inc/mixm-laal-support.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/mixm-laal-support.php) | 主题支持 |

## 5.6 主题核心函数

### 5.6.1 关键函数

| 函数 | 文件 | 说明 |
| --- | --- | --- |
| `mixm_laal_get_cart_session_id()` | functions.php | 获取/创建游客购物车会话 ID（替代 session_start 的 Cookie 方案） |
| `mixm_laal_ip_match_cidr($ip, $cidr)` | inc/rate-limit-functions.php | IP 与 CIDR 范围匹配 |
| `mixm_laal_sync_status` AJAX | admin/theme-sync.php | 主题同步状态查询 |
| `mixm_laal_nonce` | api.php | AJAX CSRF nonce |

### 5.6.2 购物车会话示例

```php
<?php
/**
 * 获取或创建游客购物车会话 ID（替代 session_start 的 Cookie 方案）
 *
 * 旧实现依赖 PHP $_SESSION['cart_session_id']，会与 WP 缓存插件冲突。
 * 新实现使用 HTTP Cookie（mixm_laal_cart_session）+ Transient 存储映射。
 *
 * @since 1.0.1
 * @return string 32 位会话标识（已登录用户返回 'user_' . user_id）
 */
function mixm_laal_get_cart_session_id() {
    if (is_user_logged_in()) {
        return 'user_' . get_current_user_id();
    }
    // ... Cookie + Transient 实现 ...
}
```

## 5.7 主题资源加载规则

- 所有 CSS 通过 `wp_enqueue_style()` 加载，统一前缀避免冲突
- 所有 JS 通过 `wp_enqueue_script()` 加载，依赖关系明确（如 jQuery）
- FontAwesome 字体资源位于 `assets/fonts/`
- 图片启用 `loading="lazy"` 属性
- 移动端独立 CSS/JS 文件，按设备条件加载
- 通过 `function_exists()` 守卫防止重复声明
- WebP 格式支持（[inc/webp-support.php](file:///f:/gexm/wp-content/themes/mixm-laal/inc/webp-support.php)）

## 5.8 主题安全规范

### 5.8.1 输入验证与输出净化

| 场景 | 函数 |
| --- | --- |
| 文本输出（HTML 上下文） | `esc_html()` |
| 属性输出 | `esc_attr()` |
| URL 输出 | `esc_url()` |
| 富文本输出 | `wp_kses_post()` |
| 用户输入净化 | `sanitize_text_field()` |
| 整数输入 | `intval()` / `absint()` |
| URL 输入存储 | `esc_url_raw()` |

### 5.8.2 SQL 安全规范

参考 [functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php) 顶部注释：

```php
// 1. 动态表名变量均通过 $wpdb->prefix . '硬编码字符串' 构造，不接收用户输入
$table_name = $wpdb->prefix . 'mixm_laal_api_keys';

// 2. 用户输入查询条件必须使用 $wpdb->prepare() 预处理
$results = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$table_name} WHERE id = %d",
    $id
));

// 3. ORDER BY 字段使用 in_array() 白名单校验
$allowed_order = ['date', 'title', 'modified'];
$order = in_array($_GET['order'], $allowed_order) ? $_GET['order'] : 'date';

// 4. $wpdb->insert() / $wpdb->update() / $wpdb->delete() 内部已自动 prepare
$wpdb->insert($table_name, ['name' => $name], ['%s']);
```

### 5.8.3 CSRF 防护

- 所有 AJAX 请求必须通过 `mixm_laal_nonce` nonce 校验
- 所有表单必须包含 `wp_nonce_field()` 生成 nonce
- 处理请求时使用 `wp_verify_nonce()` 验证

### 5.8.4 权限控制

- 后台操作必须通过 `current_user_can('manage_options')` 等权限检查
- 站长模块：`current_user_can('manage_options')`
- 投稿：`current_user_can('edit_posts')`

## 5.9 主题数据库表

| 表名 | 模块 | 用途 |
| --- | --- | --- |
| `wp_mixm_laal_cart_sessions` | 商城 | 购物车会话 |
| `wp_mixm_laal_orders` | 商城 | 订单 |
| `wp_mixm_laal_order_items` | 商城 | 订单商品 |
| `wp_mixm_laal_addresses` | 商城 | 收货地址 |
| `wp_mixm_laal_bottles` | 漂流瓶 | 漂流瓶消息 |
| `wp_mixm_laal_bottle_chats` | 漂流瓶 | 漂流瓶聊天 |
| `wp_mixm_laal_sites` | 网站分类 | 网站 |
| `wp_mixm_laal_site_categories` | 网站分类 | 网站分类 |
| `wp_mixm_laal_site_tags` | 网站分类 | 网站标签 |
| `wp_mixm_laal_crawler_tasks` | 采集 | 采集任务 |
| `wp_mixm_laal_crawler_logs` | 采集 | 采集日志 |
| `wp_mixm_laal_crawler_proxies` | 采集 | 代理 |
| `wp_mixm_laal_crawler_storages` | 采集 | 存储 |
| `wp_mixm_laal_crawler_parsers` | 采集 | 解析器 |
| `wp_mixm_laal_api_keys` | API | API 密钥 |
