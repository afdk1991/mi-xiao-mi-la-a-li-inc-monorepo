# 项目006 · 生产环境构建与预览验证报告

> 时间：2026-09-15 20:25
> 构建方式：`docker compose`（项目自带编排）+ WordPress 官方镜像 `wordpress:php8.0-apache`
> 结果：**构建 0 报错，4/4 容器 running，15/15 路由与静态资源 200，核心交互通过**

---

## 一、预览访问地址

| 服务 | 地址 | 状态 |
|---|---|---|
| **商城前台** | **http://localhost:18080** | ✅ 200 |
| **WordPress 后台** | http://localhost:18080/wp-admin | ✅（admin / Admin@12345） |
| phpMyAdmin | http://localhost:18081 | ✅ 200（root/root） |
| SRS 直播控制台 | http://localhost:8082 | ✅ 200 |
| MySQL | localhost:13306 | ✅（容器内 db:3306） |

> 端口说明：宿主 3306 / 8080 / 8081 已被本机其他运行中容器占用
> （`mixmlaal-mysql` / `mixmlaal-wp-gateway-go` / `mixmlaal-wp-service-java`），
> 故改用 13306 / 18080 / 18081。详见第三节。

---

## 二、构建与部署流程

```
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**

wp_install()                    → INSTALL_OK user_id=1
activate_plugin(myp-core)       → activated
switch_theme(myp-theme)         → myp-theme
29 张 wp_myp_ 业务表            → MYP_TABLES: 29
种子数据                        → 3 商品 / 4 页面 / 1 直播场次 / 1 优惠券
```

PHP 8.1.34 全量 lint：79/79 通过。Apache error.log：无致命错误。

---

## 三、为达成预览所做的调整（未触碰任何业务规则）

| # | 调整 | 原因 | 性质 |
|---|---|---|---|
| 1 | `archive-product.php` → `archive-myp_product.php` | WP 模板层级只认 `archive-{post_type}.php`，原名对 `myp_product` 无效 | 文件名修正 |
| 2 | `single-product.php` → `single-myp_product.php` | 同上，`single-{post_type}.php` | 文件名修正 |
| 3 | 新增 `myp-theme/index.php` | WP 主题必需文件，缺失时首页/归档无模板可渲染 | 补必需文件 |
| 4 | `functions.php` 增加 `MYP_THEME_VERSION` 常量兜底 | 原代码直接引用插件常量 `MYP_CORE_VERSION`，插件未启用时 PHP 8 直接 Fatal | 防御性兜底 |
| 5 | 新增 `docker-compose.preview.yml` | 宿主 3306/8080/8081 被其他容器占用；Compose 对 `ports` 是追加合并，override 无法替换端口 | 预览编排（原 `docker-compose.yml` 未改动） |
| 6 | 运行时修正 `siteurl` / `home` = `http://localhost:18080` | CLI 下 `wp_install()` 无 `HTTP_HOST`，`wp_guess_url()` 把 URL 写成 `http:///var/www/html`，导致宿主访问全站 404 | 数据库配置值 |

---

## 四、冒烟检查结果

### 4.1 路由与静态资源（15/15 全 200）

| 路由 | 状态 | 内容校验 |
|---|---|---|
| `/` 首页 | 200 (16698 B) | hero 渲染 ✅ |
| `/products/` 商品归档 | 200 (17885 B) | `product-card` ✅ / "MYP Smartphone Pro" ✅ / 价格 3999 ✅ |
| `/product/myp-smartphone-pro/` 详情 | 200 (17405 B) | `price-big` ✅ / 3999 ✅ / `mypAddCart` ✅ / 库存 ✅ |
| `/product-category/digital/` 分类 | 200 (17471 B) | ✅ |
| `/cart/` 购物车页 | 200 (17073 B) | `myp-cart-list` ✅ |
| `/user-center/` 用户中心 | 200 (17088 B) | ✅ |
| `/live/` 直播广场 | 200 (17891 B) | `myp-live-list` ✅ / `myp-danmu-input` ✅ |
| `/submit/` 发布产品 | 200 (17429 B) | ✅ |
| `/?s=Smartphone` 搜索 | 200 (16880 B) | ✅ |
| `/?myp_sitemap=xml` SEO sitemap | 200 (327 B) | 输出 3 条商品 URL ✅ |
| `/wp-json/myp/v1/live` | 200 | 返回直播场次 JSON ✅ |
| `/wp-json/myp/v1/cart` | 200 | ✅ |
| `themes/myp-theme/style.css` | 200 (2889 B) | ✅ |
| `themes/myp-theme/assets/js/main.js` | 200 (1582 B) | ✅ |
| `themes/myp-theme/assets/js/live.js` | 200 (1794 B) | ✅ |

详情页头部资源注入校验：`wp-includes` ✅ / `myp-theme/style.css` ✅ / `main.js` ✅

### 4.2 核心交互

```
POST /wp-json/myp/v1/cart  {"product_id":4,"quantity":2}
  → 200 {"code":0,"msg":"已加入购物车"}

GET  /wp-json/myp/v1/cart  （同一 cookie 会话）
  → 200 {"code":0,"data":[{"id":2,"user_id":"0","session_key":"3151c2b6...",
          "product_id":"4","quantity":"2","post_title":"MYP Smartphone Pro",
          "price":"3999"}]}
```

购物车写入、关联查询（JOIN posts / postmeta 取标题与价格）均正确。

---

## 五、验证过程中发现的现象（未改动，供决策）

### 5.1 游客购物车依赖 PHP Session
首次用无 cookie 的请求测试时，`POST` 成功但 `GET` 返回空数组；带上 `PHPSESSID`
（同一 `WebRequestSession`）后完全正常。**浏览器场景不受影响**。
但需注意：REST 跨域/无 cookie 客户端（如独立小程序）下游客购物车会失效，
与 `ARCHITECTURE_REVIEW` 中「小程序端需改用 Token 鉴权」是同一类问题。

### 5.2 首页显示默认文章流而非商品
`index.php` 为兜底模板，首页沿用 WordPress 默认主循环（`post_type=post`），
当前输出的是安装时生成的示例文章，**未展示商品**。
如需商城首页，可在后台「设置 → 阅读」指定静态首页，或新增 `front-page.php`。

### 5.3 上一轮审计中的业务逻辑缺陷仍然保留（按要求未改动）
- 支付回调 `PaymentApi::callback()` 未调用 `verify_callback()` —— 匿名请求可改订单状态
- `OrderModel::create()` 的 `try/catch(Exception)` 不会触发回滚
- `myp_order_paid_*` 七个事件无消费者（库存/积分/佣金/消息/短信不联动）
- 优惠券与会员折扣未接入结算流程
- 价格区间筛选（`ProductFilter`）未接线

以上均属业务逻辑范畴，本次仅做预览构建，未做任何修改。

---

## 六、如何复现 / 停止

```bash
# 启动（规避端口版）

# 停止

# 停止并清空数据库
```

> 注意：预览服务依赖 Docker Desktop 处于运行状态。
> 本机宿主 3306 / 8080 / 8081 被其他容器占用期间，请使用 preview 编排文件。
