# MYP 商城直播系统 — 架构评审与上线风险清单

> 本文档对应原架构方案的评审。已对照本次落地代码逐项核对。

## 一、已落地 vs. 待补齐

| 模块 | 落地状态 | 说明 |
|---|---|---|
| 29 张业务表 | ✅ 完整 | `Installer.php` 全部建表 + 默认会员/分销/礼物种子数据 |
| 统一分层 / 注册中心 | ✅ | `Bootstrap.php` 统一挂载 CPT、菜单、REST、Cron、事件 |
| 四级权限 | ✅ | `Roles.php` 注册 4 个角色 + 超管全量授权 |
| 订单事务 | ✅ | `OrderModel::create()` 使用 START TRANSACTION / COMMIT / ROLLBACK |
| 购物车 / 结算 / 模拟支付 | ✅ 可跑通 | Demo 支付回调置「已支付」并触发 `myp_order_paid` 事件链 |
| 优惠券 / 积分 / 会员等级 | ✅ 核心逻辑 | 满减/折扣计算、积分流水、按累计金额自动定级 |
| 分销两级佣金 | ✅ | 绑定上下级 + 订单支付成功自动按比例结算 |
| 直播 SRS 对接 | 🟡 骨架 | 推流/播放/状态查询已封装；弹幕与礼物走 REST 轮询，未接 WebSocket |
| 短信 / 电子发票 / 财务软件 | 🟡 适配器骨架 | 抽象类 + 百旺/阿里云/用友/金蝶实现，真实密钥未填时静默跳过 |
| 秒杀 / 拼团 | 🟡 仅表结构 | 防超卖事务、成团回调未实现 |
| 小程序端 | 🟡 Token 体系未签发 | `myp-mini/v1` 路由占位，code2session 需接真实 AppID |

## 二、原方案中发现的问题（已在本版修正）

1. **目录树重复项**：原方案 `LiveModel` 目录下 `LiveGiftModel.php` 出现两次、`myp-theme` 中 `page-live.php` 出现两次。已去重。
2. **「29 张表」与「19 张业务表」表述冲突**：本版统一为 29 张，清单见 README。
3. **Cron 频率矛盾**：原文同时写「每小时直播检测」和「每分钟直播检测」。本版按 `myp_every_minute` / `myp_every_hour` 两个 schedule 分别挂，生产建议用系统 crontab 代替 WP-Cron。
4. **支付回调安全**：Demo 支付用 `md5(order_no.'demo')` 仅作演示；微信/支付宝正式接入必须校验平台签名 + 金额核对 + 订单幂等（同一 order_no 重复回调只处理一次）。
5. **库存超卖**：`myp_order_paid_reduce_stock` 钩子已留，但扣减需用 `UPDATE ... SET stock=stock-%d WHERE stock>=%d` 原子条件更新，不能先查后改。
6. **直播弹幕并发**：纯 PHP 无法承载 WebSocket，生产应单独部署 Node/WS 服务（原方案已提及），PHP 侧只做落库与历史拉取。

## 三、上线前必须补的硬项

- [ ] **支付**：接微信支付/支付宝真实商户号，回调验签 + 金额校验 + 幂等。
- [ ] **库存**：下单与支付扣库存改为原子 SQL，防止超卖。
- [ ] **并发**：订单号生成需加唯一索引兜底（已有 UNIQUE KEY `order_no`），高并发改用号段或 Redis INCR。
- [ ] **WP-Cron**：禁用默认 WP-Cron（`DISABLE_WP_CRON`），改用系统 crontab 每分钟 `wp-cron.php`。
- [ ] **HTTPS**：WSS 弹幕、支付回调、小程序业务域全部 HTTPS。
- [ ] **CSRF/Nonce**：前台写操作接口已校验 `X-WP-Nonce`；小程序端需改用 Token 鉴权，不能走 cookie nonce。
- [ ] **上传/脱敏**：用户手机号、地址、发票税号需按合规要求脱敏展示与加密存储。
- [ ] **备份**：数据库每日定时备份 + 异地留存。

## 四、性能与扩展

- 高并发：MySQL 读写分离 + Redis 对象缓存（`WP Redis`）。
- 直播：SRS 集群 + CDN 分发，弹幕 WSS 集群，礼物特效走前端，后端只计数。
- 财务：对账任务幂等（按 `bill_date` UNIQUE），重跑不产生重复记录。
