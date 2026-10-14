# 项目006 · 全量阅读报告

> 生成时间：2026-09-15
> 项目：MYP 商城直播系统（WordPress 插件 `myp-core` + 主题 `myp-theme`）
> 已读取：87 个文件（79 PHP + 4 前端资源 + 4 文档/配置），**逐行通读，非抽样**
> 语法校验：PHP 8.1.34 lint，79/79 通过，0 错误

---

## 一、文件清单

### 1.1 根目录（4）

| 文件 | 说明 |
|---|---|
| `README.md` | 部署手册 + API 一览 + 29 张表清单 |
| `ARCHITECTURE_REVIEW.md` | 架构评审与上线风险清单（8 项硬项待补） |
| `docker-compose.yml` | MySQL 5.7 + WP php8.0-apache + phpMyAdmin + SRS 5 |
| `myp-core.zip` / `myp-theme.zip` | 打包产物 |

### 1.2 `myp-core`（核心插件，69 文件）

| 层 | 目录 | 文件 |
|---|---|---|
| 入口 | `/` | `myp-core.php`（常量 + PSR 风格自动加载 + `myp_table()` / `myp_response()`） |
| 注册中心 | `src/Core/` | `Bootstrap`（6）、`Roles`、`Search`、`ProductFilter`、`ReportService`、`FinanceReconcileService` |
| 数据层 | `src/Database/` | `Installer`（29 表 + 种子数据）、`Order`、`Cart`、`Coupon`、`Points`、`Distribution`、`MemberLevel`、`Live`、`LiveDanmu`、`LiveGift`、`LiveConnect`、`Invoice`、`Logistics`、`Analytics`、`Message` |
| 接口层 | `src/Api/` | `Cart`、`Checkout`、`Payment`、`Live`、`Points`、`Distribution`、`Invoice`、`Mini` |
| 后台 | `src/Admin/` | `AdminPageBase` + 15 个管理页 |
| 支付 | `src/Payment/` | `BasePayment`（抽象）、`DemoPayment`、`PaymentManager` |
| 短信 | `src/Sms/` | `BaseSms`、`AliyunSms`、`SmsService`（60s 频控） |
| 发票 | `src/Einvoice/` | `BaseEinvoice`、`BaiwangEinvoice`、`EinvoiceService` |
| 财务 | `src/Finance/` | `BaseFinanceSoftware`、`Yonyou`、`Kingdee`、`FinanceSyncService` |
| 直播 | `src/Live/` | `StreamService`（SRS 推/播/状态）、`MixStreamService`（FFmpeg 混流） |
| 三方登录 | `src/ThirdLogin/` | `BaseLogin`、`WechatLogin`、`LoginManager` |
| SEO | `src/Seo/` | `SeoMeta`（meta box）、`SeoHead`（输出）、`Sitemap` |
| 资源 | `assets/` | `admin.css`、`gallery.js`（wp.media 多图） |

### 1.3 `myp-theme`（前端主题，15 文件）

`style.css`、`functions.php`、`header.php`、`footer.php`、`archive-product.php`、`single-product.php`、`search.php`、
`page-cart.php`、`page-user.php`、`page-submit.php`、`page-live.php`、
`taxonomy-myp_product_cat.php`、`taxonomy-myp_product_tag.php`、`assets/js/main.js`、`assets/js/live.js`

---

## 二、架构评价（正面）

| 维度 | 评价 |
|---|---|
| 分层 | Core / Database / Api / Admin / 适配器 四层清晰，无跨层反向依赖 |
| 命名与加载 | `MyP_Core_Dir_Class` ↔ `src/Dir/Class.php` 约定 + `spl_autoload_register`，零 require 噪音 |
| SQL 安全 | 全项目 `$wpdb->prepare` 覆盖到位，未发现裸拼接 |
| 输出安全 | 后台/主题统一 `esc_html` / `esc_attr` / `esc_url` / `wp_kses_post` |
| 响应规范 | REST 统一 `{code, msg, data}`，`myp_response()` 单点收口 |
| 幂等设计 | 对账按 `bill_date` UNIQUE、角色初始化按 option 幂等、订单号 UNIQUE |
| 调度 | `myp_hourly_event` / `myp_daily_2am` / `myp_daily_3am` 三档分频，职责不混 |

---

## 三、致命缺陷 🔴 P0（当前状态下站点白屏 / 资金可被伪造）

### P0-1 主题缺 `index.php` → 首页 100% 白屏
`myp-theme` 只有 12 个 PHP，无 `index.php`。WP 模板层级最后一环就是 `index.php`，
缺失时 `get_index_template()` 返回空 → `template-loader.php` 不 include 任何模板 → **空白页**。

### P0-2 商品归档模板名错误 → `/products/` 白屏
现有 `archive-product.php`。WP 对 CPT `myp_product` 找的是 **`archive-myp_product.php`**。
`archive-product.php` 只对 post type `product` 生效，本项目无此类型 → 该文件是死文件。

### P0-3 商品详情模板名错误 → 详情页白屏
现有 `single-product.php`。WP 需要 **`single-myp_product.php`**。
`single-product.php` 同样只对 `product` 类型生效 → 死文件。

> P0-1/2/3 合计：**首页、商品列表、商品详情三个核心页面全部无法渲染**。
> 修复：`archive-product.php` → `archive-myp_product.php`；`single-product.php` → `single-myp_product.php`；新增 `index.php`。

### P0-4 主题硬依赖插件常量 → 插件未启用即 Fatal
`myp-theme/functions.php:18,19` 使用 `MYP_CORE_VERSION`（由插件定义）。
PHP 8 下未定义常量是 `Error` 异常，不是 notice → 插件未激活时前台直接崩溃。
修复：`defined( 'MYP_CORE_VERSION' ) ? MYP_CORE_VERSION : '1.0.0'`。

### P0-5 支付回调零校验 → 任意人可把订单改成已支付
`PaymentApi::callback()` 直接：
```php
if ( $order && 'pending' === $order->status ) { ...mark_paid( $order->id, 'demo' ); }
```
`DemoPayment::verify_callback()` **写了但从未被调用**；`permission_callback` 是 `__return_true`。
任何人 `GET /wp-json/myp/v1/pay/callback?order_no=MYP2026xxxx` 即可零元提货。

### P0-6 订单事务永不回滚
`OrderModel::create()` 用 `try { ... } catch ( Exception $e ) { ROLLBACK }`，
但 `$wpdb->query()` / `insert()` 失败**返回 false，不抛异常** → catch 永不触发 → 明细写一半时主表已落库，产生脏订单。
修复：改为检查 `$wpdb->last_error` 或 `if ( false === $wpdb->insert(...) ) { ROLLBACK; }`。

---

## 四、功能链断裂 🔴 P1（事件广播了，但没人听）

`Bootstrap::on_order_paid()` 触发 7 个动作，**全项目零 `add_action` 监听**（已全文 grep 确认）：

| 触发的动作 | 预期行为 | 实际消费者 |
|---|---|---|
| `myp_order_paid_reduce_stock` | 扣库存 | ❌ 无 → **库存永不扣减** |
| `myp_order_paid_grant_points` | 发积分 | ❌ 无 → **积分永不发放** |
| `myp_order_paid_distribution_commission` | 结算佣金 | ❌ 无 → `DistributionModel::settle_commission()` **从未被调用** |
| `myp_order_paid_send_message` | 站内消息 | ❌ 无 → `MessageModel` 从未被任何业务调用 |
| `myp_order_paid_send_sms` | 短信 | ❌ 无 → `SmsService` 从未被任何业务调用 |
| `myp_order_paid_send_subscribe` | 订阅消息 | ❌ 无 |
| `myp_dashboard_refresh` | 刷新大屏 | ❌ 无 |
| `myp_order_shipped`（`LogisticsModel:18`） | 发货通知 | ❌ 无 |

唯一真正接上的事件是 `myp_order_paid_sync_finance` → `FinanceSyncService`（且适配器未配置时直接 return）。
**即：支付成功 = 只改订单状态，其余整条履约链路是空转。**

### P1-8 优惠券 / 会员折扣完全没接线
`CouponModel::claim()` / `calc_discount()` / `mark_used()` 三个方法**零调用点**；
`MemberLevelModel::discount()` 同样零调用点。
`CheckoutApi::checkout()` 只传了收货信息，未传 `coupon_id` / `discount` → 优惠券与会员价是纯摆设。

### P1-9 价格区间筛选是死代码
`ProductFilter` 用 **`add_action( 'myp_product_query', ... )`** 注册（应为 `add_filter`），
且全项目无 `apply_filters('myp_product_query', ...)` 调用点 → `archive-product.php` 里的 min_price/max_price 表单**提交后无任何效果**。

### P1-10 「发布产品」页是空壳
`page-submit.php` 只有 `<form method="post">`，**无处理逻辑、无 nonce、无权限校验、无 `wp_insert_post`** → 提交后什么都不发生，且任意游客可见。

### P1-11 「立即购买」跳转 404
`main.js:18`：
```js
location.href = MYP_API.rest.replace('/wp-json/', '/') + '../cart';
```
`http://site/wp-json/myp/v1/` → `http://site/myp/v1/` → `http://site/myp/cart`（应为 `http://site/cart`）。

### P1-12 购物车页「去结算」按钮无实现
`page-cart.php:8` 调用 `mypCheckout()`，但 `main.js` 只定义了 `mypApi / mypAddCart / mypBuyNow` → **函数未定义，点击报 JS 错误**。

---

## 五、次要问题 🟡 P2

| # | 位置 | 问题 |
|---|---|---|
| 1 | `InquiryAdmin.php:6` | `SELECT *`（8 列）但表头只有 6 列 → 表格列错位 |
| 2 | `Bootstrap.php:127` | 菜单 slug 用 `sanitize_title('全局设置')` → 生成 `myp-%e5%85%a8...` 百分号编码 URL，可用但极丑 |
| 3 | `Bootstrap.php:103` | `admin_menu` 内再次 `new Roles()`，重复挂 `init`（此时 init 已过，无效但冗余） |
| 4 | `Bootstrap.php:131` | `admin_assets` 未判断 `$hook`，全后台无差别加载资源 |
| 5 | `Installer.php:34` | `$c = $GLOBALS['wpdb']->get_charset_collate()` 定义后未使用；表字符集硬编码 `utf8mb4` |
| 6 | `PointsModel::change()` | 每次先 `SUM` 全表算余额再插入，非原子 → 并发下余额算错；应 `SELECT ... FOR UPDATE` 或改余额字段 |
| 7 | `CartModel::key()` | 游客态依赖 `session_start()`；WP 原生不用 PHP session，REST 跨域/无 cookie 场景下游客购物车基本失效或串号 |
| 8 | `CheckoutApi::checkout()` | 未校验商品是否存在/上下架/库存；下单成功后未清空购物车 |
| 9 | `Bootstrap.php:155` | `myp_every_minute` schedule 已注册但**从未被任何 `wp_schedule_event` 使用**，README 所述「每分钟直播检测」不存在 |
| 10 | `Roles::rest_permission()` | 定义了但 API 全部用内联闭包，死代码 |
| 11 | `Sitemap.php` | 依赖 `?myp_sitemap=xml` query var，未注册 rewrite rule |
| 12 | `header.php` | 缺 `wp_body_open()` |
| 13 | `live.js` | 礼物面板 `#myp-gift-list` 从未填充；弹幕仅本地追加，不轮询他人消息（评审已记录需 WebSocket） |
| 14 | 插件根 | 无 `readme.txt`；`load_plugin_textdomain` 指向 `/languages` 目录不存在 |
| 15 | `Installer::uninstall()` | DROP TABLE 被注释，只删 option；重复启停会残留数据 |
| 16 | `dbDelta` | 建表语句用 Tab 缩进且 `PRIMARY KEY (id), UNIQUE KEY ...` 同行，dbDelta 解析较敏感，建议按 WP 官方格式（两个空格） |

---

## 六、已建但未接线的模块（清单）

以下类**已完整实现但全项目零调用**，属于"骨架就绪、未通电"：

```
DistributionModel::settle_commission()   分销佣金结算
CouponModel::claim() / calc_discount() / mark_used()   优惠券全链路
MemberLevelModel::discount()             会员等级折扣
MessageModel                             站内消息
SmsService / AliyunSms                   短信
EinvoiceService / BaiwangEinvoice        电子发票开具
LogisticsModel                           物流轨迹
LiveConnectModel                         连麦 / PK
MixStreamService                         FFmpeg 混流
LoginManager / WechatLogin               微信登录
ProductFilter                            价格筛选
CartModel::clear()                       清空购物车
LiveDanmuModel::recent()                 弹幕历史拉取
AnalyticsModel::trend()                  趋势数据
```
外加 **秒杀 / 拼团**（`seckill` / `group_buy` / `group_buy_member` 三张表已建，零业务代码，评审已记录）。

---

## 七、修复优先级建议

```
第一批（不通则站点不可用）
  P0-1 新增 myp-theme/index.php
  P0-2 archive-product.php  → archive-myp_product.php
  P0-3 single-product.php   → single-myp_product.php
  P0-4 主题常量兜底 defined() 判断
  P0-5 支付回调调 verify_callback + 金额核对 + 幂等
  P0-6 订单事务改 last_error 判定

第二批（不通则核心业务空转）
  P1   为 7 个 myp_order_paid_* 事件补消费者（库存/积分/佣金/消息/短信）
  P1-8 结算页接入优惠券 + 会员折扣
  P1-9 ProductFilter 改 add_filter 并在归档模板 apply_filters
  P1-10 page-submit 补 wp_insert_post + nonce + 权限
  P1-11/12 修 mypBuyNow 跳转、补 mypCheckout()

第三批（打磨）
  P2-1 表格列数对齐
  P2-6 积分余额原子化
  P2-7 购物车改 user_id + 透明 token 双轨
  P2-9 删除或启用 myp_every_minute
```

---

## 八、结论

代码**风格统一、分层干净、SQL 与输出安全到位**，属于质量不错的骨架级交付；
但存在**模板命名与 WP 模板层级不匹配**这一整类问题，导致三个核心页面白屏，
且**事件驱动链路只广播不消费**，使支付后的库存/积分/佣金/消息全部空转。

按第七批优先级修复后，即可达到 README 所述"可跑通"状态。
上线前仍需完成 `ARCHITECTURE_REVIEW.md` 第三节列出的 8 项硬项（真实支付验签、原子扣库存、系统 crontab、WSS 弹幕、HTTPS、Token 鉴权、数据脱敏、备份）。
