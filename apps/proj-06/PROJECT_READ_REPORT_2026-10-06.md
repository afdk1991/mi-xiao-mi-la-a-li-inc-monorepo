# 项目006 · 全量读取报告（2026-10-06）

> 生成时间：2026-10-06
> 项目：MYP 商城直播系统（WordPress 插件 `myp-core` + 主题 `myp-theme`）
> 位置：`F:\网站全栈项目\项目006`
> 读取方式：**逐文件实际读取，非抽样**（85 个源码文件 + 全部文档/配置/仓库元数据）
> 语法校验：本机无 PHP CLI；9-15 曾以 PHP 8.1.34 lint 校验 79/79 通过，本次逐行通读未发现语法问题

---

## 一、读取范围与文件清单

### 1.1 仓库根（本次新增/变更项，均已读取）

| 文件 | 说明 | 变更时间 |
|---|---|---|
| `README.md` | 部署手册 + API 一览 + 29 张表清单（Docker 指令已移除） | 2026-09-28 更新 |
| `DEPLOY_VERIFY.md` | 部署验证报告（Docker 指令已移除，保留结论） | 2026-09-28 更新 |
| `ARCHITECTURE_REVIEW.md` | 架构评审与上线风险清单（8 项硬项） | 2026-09-15 |
| `PROJECT_READ_REPORT.md` | 9-15 全量阅读报告（P0/P1/P2 缺陷清单） | 2026-09-15 |
| `edgeone.json` | EdgeOne Makers 部署配置 `{"name":"project006-wp-theme","nodeVersion":"24.18.0"}` | 2026-09-28 |
| `.github/workflows/deploy-pages.yml` | GitHub Pages Actions：push main 后全仓库静态发布 | 2026-09-25 |
| `sync.ps1` | 调用 `D:\网站全栈项目\scripts\sync-to-github.ps1` 同步到 GitHub | 2026-09-24 |
| `.gitignore` | 忽略 zip / 日志 / 凭据 / 临时文件 | 2026-09-18 |
| `.git` | git 仓库（git CLI 不在当前 PATH） | 2026-10-03 更新 |
| `.workbuddy/memory/2026-09-15.md` | TRAE 工作区记忆（同日审计与部署踩坑） | 2026-09-15 |
| ~~docker-compose.yml / preview.yml~~ | **已从仓库移除**（README 目录表仍提及，文件不存在） | — |

### 1.2 `myp-core`（核心插件，69 文件，逐行通读）

| 层 | 文件（类名 → 职责） |
|---|---|
| 入口 | `myp-core.php`：常量 + PSR 风格 `spl_autoload` + `myp_table()` / `myp_response()` |
| 注册中心 `src/Core/` (6) | `Bootstrap`（CPT/菜单/REST/Cron/事件挂载）、`Roles`（四级权限）、`Search`、`ProductFilter`、`ReportService`、`FinanceReconcileService` |
| 数据层 `src/Database/` (15) | `Installer`（29 表+种子）、`OrderModel`（**10-01 修复**）、`CartModel`、`CouponModel`、`PointsModel`、`DistributionModel`、`MemberLevelModel`、`LiveModel`、`LiveDanmuModel`、`LiveGiftModel`、`LiveConnectModel`、`InvoiceModel`、`LogisticsModel`、`AnalyticsModel`、`MessageModel` |
| 接口层 `src/Api/` (8) | `CartApi`、`CheckoutApi`、`PaymentApi`（**10-01 修复**）、`LiveApi`、`PointsApi`、`DistributionApi`、`InvoiceApi`、`MiniApi`（REST 前缀 `myp/v1` + `myp-mini/v1`，统一 `{code,msg,data}`） |
| 后台 `src/Admin/` (16) | `AdminPageBase` + `Settings`/`Inquiry`/`Order`/`Invoice`/`Coupon`/`Distribution`/`Live`/`LiveGift`/`MemberLevel`/`Analytics`/`Report`/`SmsLog`/`Einvoice`/`Finance`/`FinanceSync` |
| 支付 `src/Payment/` (3) | `BasePayment`（抽象）、`DemoPayment`（md5 验签）、`PaymentManager` |
| 短信 `src/Sms/` (3) | `BaseSms`、`AliyunSms`（未配置静默失败）、`SmsService`（60s 频控） |
| 发票 `src/Einvoice/` (3) | `BaseEinvoice`、`BaiwangEinvoice`（模拟开具）、`EinvoiceService` |
| 财务 `src/Finance/` (4) | `BaseFinanceSoftware`、`YonyouFinance`、`KingdeeFinance`、`FinanceSyncService`（已接线） |
| 直播 `src/Live/` (2) | `StreamService`（SRS 推/播/状态）、`MixStreamService`（FFmpeg 混流占位） |
| 三方登录 `src/ThirdLogin/` (3) | `BaseLogin`、`WechatLogin`（占位）、`LoginManager` |
| SEO `src/Seo/` (3) | `SeoMeta`（meta box）、`SeoHead`（输出）、`Sitemap`（`?myp_sitemap=xml`） |
| 资源 `assets/` (2) | `admin.css`、`gallery.js`（wp.media 多图上传） |

### 1.3 `myp-theme`（前端主题，16 文件，逐行通读）

`style.css`（CSS 变量+响应式）、`functions.php`（主题设置/资源/商品 meta box/模板注册）、`header.php`、`footer.php`、`index.php`（兜底，**已修复 P0-1**）、`archive-myp_product.php`（**已修复 P0-2**）、`single-myp_product.php`（**已修复 P0-3**）、`search.php`、`page-cart.php`、`page-user.php`、`page-submit.php`（空壳）、`page-live.php`、`taxonomy-myp_product_cat.php`、`taxonomy-myp_product_tag.php`、`assets/js/main.js`、`assets/js/live.js`

---

## 二、本次与 9-15 版本的关键差异（重要）

### 2.1 P0 致命缺陷：10-01 已修复 ✅

**P0-5 支付回调零验签 → 已修复（`PaymentApi.php`，66 行）**
- 新增 `verify_callback()` 前置校验，失败返回 403
- 幂等：已支付订单直接返回成功（网关重试不报错）
- 状态机：仅 `pending` 可支付，其他状态返回 409
- 金额核对：回调金额与 `pay_amount` 一致（容忍 ±0.01），不符返回 402

**P0-6 订单事务永不回滚 → 已修复（`OrderModel.php`）**
- 删除死代码 `try/catch(Exception)`
- 改为显式 `false === $wpdb->insert/update` 判定 → 主表/明细任一失败即 `ROLLBACK`
- 返回带 `last_error` 的 `WP_Error`

### 2.2 部署形态变更

- `docker-compose.yml` / `docker-compose.preview.yml` **已移出仓库**（README 同步删除 Docker 运行指令）
- 新增 `edgeone.json`（EdgeOne Makers）与 `.github/workflows/deploy-pages.yml`（GitHub Pages）
- 新增 git 仓库 + `sync.ps1` 同步脚本 + `.gitignore`

> ⚠️ 注意：`deploy-pages.yml` 与 EdgeOne `deploy-html` 均只发布**静态文件**；
> 本项目是 WordPress（PHP+MySQL），这两条路径都**无法运行**系统，只能得到源码/静态页。

---

## 三、架构现状（逐文件核实后确认）

| 维度 | 结论 |
|---|---|
| 分层 | Core / Database / Api / Admin / 适配器四层清晰，无跨层反向依赖 |
| 加载 | `MyP_Core_Dir_Class` ↔ `src/Dir/Class.php` 约定 + `spl_autoload_register` |
| SQL 安全 | 全项目 `$wpdb->prepare` 覆盖，未发现裸拼接 |
| 输出安全 | 统一 `esc_html/esc_attr/esc_url/wp_kses_post` |
| REST 规范 | `myp/v1` + `myp-mini/v1`，响应统一 `{code,msg,data}` |
| 幂等 | 对账 `bill_date` UNIQUE、订单号 UNIQUE、角色初始化按 option 幂等 |
| 调度 | `myp_hourly_event` / `myp_daily_2am` / `myp_daily_3am` 三档 |
| 事件 | `myp_order_paid` 触发 7 子动作 + `myp_order_shipped`；**仅 `_sync_finance` 有消费者** |

---

## 四、问题状态（截至 2026-10-06 修复后）

### 4.1 P1 履约链：2026-10-06 已修复 ✅（本次会话）

| 修复项 | 实现 |
|---|---|
| 7 个 `myp_order_paid_*` 事件 + 大屏 + 发货事件 | 新建 `src/Core/FulfillmentService.php`（165 行），8 个 `add_action` 消费者全部接线，Bootstrap 已挂载 |
| `_reduce_stock` 扣库存 | 原子 `UPDATE ... SET stock=stock-%d WHERE stock>=%d` 防超卖 |
| `_grant_points` 发积分 | 实付金额 × 会员等级 `points_rate`（默认 1 元 1 分） |
| `_distribution_commission` 佣金 | 调 `DistributionModel::settle_commission`（两级） |
| `_send_message` 站内消息 | `MessageModel::send` 支付成功通知 |
| `_send_sms` 短信 | `SmsService::send`（未配置静默记失败日志） |
| `_send_subscribe` 订阅 | 未配 AppID 跳过，配后走 `myp_wechat_subscribe_send` |
| `myp_dashboard_refresh` 大屏 | 当日订单数/金额 Upsert 进 `analytics_daily`（stat_date UNIQUE 幂等） |
| `myp_order_shipped` 发货通知 | 站内消息 + 短信 |
| 优惠券 + 会员折扣 + 积分抵现 | `CheckoutApi::checkout` 重写：商品有效性校验 → 会员折扣 → 优惠券（calc_discount）→ 积分抵现（100 积分=1 元，可配）→ 下单后 mark_used + 扣积分 + 清空购物车；`OrderModel::create` 原生支持 discount/coupon_id/shipping_fee 字段 |
| P1-9 价格筛选死代码 | `ProductFilter` 改挂 `pre_get_posts` 主查询，min_price/max_price/in_stock/价格排序生效 |
| P1-10 发布页空壳 | `page-submit.php` 补 nonce + 登录校验 + `wp_insert_post` + 价格/库存落库 + 跳转 |
| P1-11/12 前端结算缺口 | `main.js`：`mypBuyNow` 改跳 `home/cart`；新增 `mypCheckout()`（购物车 items + 收货表单 → POST /checkout）；`page-cart.php` 加收货表单；`functions.php` localize 注入 `home` |

**验证**：8 个事件 add_action ↔ Bootstrap do_action 一一配对（Grep 确认）；8 个修改文件圆括号/花括号全配对；本机无 PHP CLI，运行时验证在部署环节执行。

### 4.2 剩余 P2 次要问题（16 项，未变）

含 `InquiryAdmin` 列错位、菜单 slug 百分号编码、`PointsModel` 余额非原子、`CartModel` 游客 session 依赖、
`myp_every_minute` 注册未用、`Roles::rest_permission` 死代码、`Sitemap` 未注册 rewrite、
`header.php` 缺 `wp_body_open`、`live.js` 礼物面板未填充、无 `readme.txt`、
`Installer::uninstall` DROP TABLE 被注释、dbDelta 缩进敏感等（详见 `PROJECT_READ_REPORT.md` 第五节）。

---

## 五、上线前硬项（`ARCHITECTURE_REVIEW.md` 第三节，8 项未完成）

真实支付验签（微信/支付宝商户号）、原子扣库存（`UPDATE ... WHERE stock>=`）、高并发订单号、
禁用 WP-Cron 改系统 crontab、全站 HTTPS/WSS、小程序 Token 鉴权、手机号/税号脱敏加密、每日备份异地留存。

---

## 六、结论

- **代码质量**：分层干净、SQL/输出安全到位，属良好骨架级交付。
- **P0 已清零**：白屏类（P0-1~4）与资金安全类（P0-5/6）均已修复并逐行确认。
- **P1 未动**：支付后的库存/积分/佣金/消息/短信履约链仍空转，优惠券/会员折扣未接线。
- **部署形态**：仓库已为 EdgeOne Makers / GitHub Pages 准备（edgeone.json + Actions 工作流 + git），
  但静态托管无法运行 WordPress；如需公网完整运行，需 PHP+MySQL 托管（如 InfinityFree 免费主机）或 VPS。
