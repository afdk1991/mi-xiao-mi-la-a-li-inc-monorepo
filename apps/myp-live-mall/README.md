# MYP 商城直播系统

基于 WordPress 原生架构的电商 + 直播 + 分销 + 财务一体化系统，由 `myp-core`**&#x20;核心插件** 与 `myp-theme`**&#x20;前端主题** 组成。

## 目录结构



```
项目006/

├── myp-core/              # 核心插件（上传到 wp-content/plugins/）

│   ├── myp-core.php

│   ├── src/               # Core / Admin / Database / Api / Payment / Sms / Einvoice / Finance / Live / ThirdLogin / Seo

│   └── assets/

├── myp-theme/             # 前端主题（上传到 wp-content/themes/）

├── docker-compose.yml     # 本地一键部署

└── README.md
```

## 一、本地 Docker 一键启动（推荐）

前置：本机已安装 Docker Desktop。



```
cd D:\网站全栈项目\项目006

> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**
```

启动后访问：



| 服务           | 地址                                                               |
| ------------ | ---------------------------------------------------------------- |
| 商城前台         | [http://localhost:8080](http://localhost:8080)                   |
| WordPress 后台 | [http://localhost:8080/wp-admin](http://localhost:8080/wp-admin) |
| phpMyAdmin   | [http://localhost:8081](http://localhost:8081) (root/root)       |
| SRS 直播控制台    | [http://localhost:8082](http://localhost:8082)                   |

### 首次初始化



1. 浏览器打开 [http://localhost:8080](http://localhost:8080)，按向导设置站点标题与管理员账号。

2. 后台 → 插件，启用 **「MYP 核心商城系统」**，自动创建 29 张 `wp_myp_` 前缀业务表。

3. 后台 → 外观 → 主题，启用 **「MYP 商城主题」**。

4. 后台 → 设置 → 固定链接，选择「自定义结构」填 `/%postname%/`，保存。

5. 后台 → **MYP 管理 → 全局设置**，填入 SRS 地址（默认 `rtmp://localhost:1935/live`、`http://localhost:8082/live`、`http://localhost:1985/api/v1/streams`）。

## 二、生产环境部署

参见下方步骤，与原部署手册一致：



1. 服务器：Nginx + PHP 7.4/8.0/8.1 + MySQL 5.7/8.0。

2. 将 `myp-core` 上传到 `wp-content/plugins/`，`myp-theme` 上传到 `wp-content/themes/`。

3. 启用插件（自动建表）与主题。

4. 固定链接设为 `/%postname%/`。

5. 后台配置支付、短信、电子发票、财务软件密钥。

## 三、已实现的功能模块



* **商品**：自定义文章类型 `myp_product`，价格 / 原价 / SKU / 库存 / 会员价字段，列表 / 详情 / 搜索 / 分类 / 标签。

* **交易**：购物车（游客 + 登录）、订单事务创建、模拟支付、优惠券、积分、会员等级折扣。

* **营销**：两级分销绑定与佣金结算、秒杀 / 拼团表结构预留、站内消息、阿里云短信、报表邮件。

* **直播**：SRS 推流对接、弹幕（敏感词过滤）、礼物打赏扣积分、PK 连麦记录。

* **履约财务**：物流轨迹、电子发票（百旺适配器）、每日对账、用友 / 金蝶同步。

* **渠道**：微信扫码登录抽象、小程序 REST 命名空间 `myp-mini/v1`。

* **后台**：四级权限（产品 / 订单 / 询盘 / 营销 / 设置）、数据大屏、SEO meta 与 sitemap。

## 四、REST API 一览

统一前缀 `/wp-json/myp/v1/`，返回格式 `{code, msg, data}`：



| 方法       | 路由                    | 说明          |
| -------- | --------------------- | ----------- |
| GET      | /cart                 | 购物车列表       |
| POST     | /cart                 | 加入购物车       |
| DELETE   | /cart/{id}            | 删除购物车项      |
| POST     | /checkout             | 下单（需登录）     |
| GET      | /orders               | 我的订单        |
| POST     | /pay                  | 发起支付        |
| GET/POST | /pay/callback         | 支付回调        |
| GET      | /live                 | 直播列表        |
| GET      | /live/{id}            | 直播详情（含播放地址） |
| POST     | /live/{id}/danmu      | 发送弹幕        |
| POST     | /live/{id}/gift       | 送礼物         |
| GET      | /points               | 积分与流水       |
| GET      | /distribution/summary | 分销汇总        |
| GET/POST | /invoice              | 发票列表 / 申请   |
| POST     | /../myp-mini/v1/login | 小程序登录       |

## 五、29 张业务表

`orders, order_items, inquiry, cart, coupon, coupon_user, points_log, distribution_level, distribution_relation, distribution_commission, member_level, live, live_danmu, live_gift, live_gift_record, live_connect, invoice, logistics, logistics_trace, analytics_daily, message, sms_log, seckill, group_buy, group_buy_member, report_task, finance_reconcile, finance_sync_log, mini_user`

全部集中在 `src/Database/Installer.php`，插件激活自动创建。

## 六、停止 / 重置



```

```