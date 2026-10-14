# WordPress SaaS 四大核心组件端到端实施计划

## 一、背景（Context）

部署阶段收尾后，需在 WordPress SaaS 卫星产品上完整实现需求规格书的四大核心组件，全部中文界面，四项均衡推进并产出功能/性能/安全验证报告：

1. **前端网站首页** — zibstyle 主题首页已三轮验证通过（响应式 29 断点、主导航+次导航、页脚版权、蓝色 #2997f7 对齐 zibll.com）。本次仅做：站点实时数据板块（消费新 REST API）+ 首屏 ≤3s 性能措施，不破坏已有成果。
2. **数据库系统** — wp-mysql（MySQL 8.0，库 wp\_site）目前无自定义表、无备份机制、DB\_CHARSET 为 utf8。本次：审计日志表（utf8mb4）、事务写入、定时备份 sidecar、防注入规范。
3. **后端网站服务** — 主题与插件中**零自定义 REST API**。本次新建 `saas-console/v1` 命名空间：服务端二次验证 + RBAC capability + 限流 + 缓存，指标 100 并发/≤800ms。
4. **项目管理后台** — 仅有 saas-aggregator 设置页。本次新建「管理控制台」插件页：仪表盘（ECharts）/用户管理（增删改查+角色分配）/系统设置/操作日志，左侧导航+主内容区，关键操作确认+落日志。

关键落点：`d:\网站全栈项目\项目01\Mi-Xiao-Mi-La-A-Li-Inc\08-卫星产品\wordpress-saas\wp-content\`

## 二、架构决策

**新建独立插件** **`saas-console`**（不扩展 saas-aggregator）：读写职责分离（aggregator 是只读聚合且有 phpunit 测试）、激活/卸载钩子独立、故障隔离。复用其**约定**而非代码：

* 内联 PSR-4 自动加载器，前缀 `SAAS_Console_` → `includes/class-<kebab>.php`（照抄 saas-aggregator.php L50-85 结构）

* 缓存沿用 transient + hit/fresh/stale 语义

* 单一 option 数组 + sanitize\_callback 的 Settings 模式照搬 class-settings.php

不引入 Redis object cache（wordpress:6.5-apache 镜像无 redis 扩展，需重建镜像；演示数据规模 transient 足够，写入报告备选项）。

## 三、关键设计

### 3.1 REST API（命名空间 `saas-console/v1`，认证走 Cookie + X-WP-Nonce）

| 方法         | 路径              | 权限                                           | 说明                                            |
| ---------- | --------------- | -------------------------------------------- | --------------------------------------------- |
| GET        | /me             | 登录                                           | 当前用户+角色+权限摘要                                  |
| GET        | /stats/summary  | 公开                                           | 首页实时计数（用户/文章/商品/订单），transient 60s，限流 30次/分/IP |
| GET        | /stats/overview | manage\_options                              | 仪表盘：近 N 日注册/订单趋势、内容构成、审计 Top                  |
| GET/POST   | /users          | list\_users / create\_users                  | 列表分页搜索 / 创建（写审计）                              |
| PUT/DELETE | /users/{id}     | edit\_users(+promote\_users) / delete\_users | 更新资料角色 / 删除（禁删自己+超管，写审计）                      |
| GET        | /products       | 公开                                           | CPT product 只读列表（价格/销量 meta）                  |
| GET        | /orders         | 登录                                           | CPT mall\_order，非管理员强制按 \_zib\_user\_id 过滤    |
| GET/POST   | /settings       | manage\_options                              | 读/写设置（写审计）                                    |
| GET        | /audit-logs     | manage\_options                              | 操作日志查询（action/user/days 筛选）                   |

统一约定：`permission_callback` 内先限流（transient 计数，429）再查 capability（403/401）；参数 `sanitize_text_field/absint/is_email`，role 与 `get_editable_roles()` 交集防提权，排序字段硬编码白名单；SQL 全程 `$wpdb->prepare`。

### 3.2 数据库

* 新表 `wp_saas_audit_log`：id/user\_id/user\_login/action/object\_type/object\_id/detail(脱敏JSON)/ip/user\_agent/created\_at，索引 idx\_action/idx\_user/idx\_created/idx\_object，`utf8mb4_unicode_ci` InnoDB，dbDelta 激活建表，`option saas_console_db_version` 记版本，uninstall.php 删表删 option。

* 事务：批量用户删除、设置写入+审计，用 `$wpdb->start_transaction()` 包裹。

* 密码一律走 WP 原生 `wp_insert_user/wp_update_user`（phppass+盐），不直接写 wp\_users；审计 detail 对 password/email 脱敏。

* **定时备份**：docker-compose 增 `wp-db-backup` sidecar（mysql:8.0 镜像，bash 循环每日 `mysqldump --single-transaction | gzip` 到 `wordpress-saas/backups/`，保留 14 天）+ 手动备份/恢复脚本说明。备份目录加 .gitignore。

### 3.3 管理后台 UI

* `add_menu_page('管理控制台', ..., 'manage_options', 'saas-console')` 单顶级页，子区用 `&tab=dashboard|users|settings|logs` 切换；`admin_enqueue_scripts` 只匹配 `toplevel_page_saas-console` 一个 hook。

* 页内 flex 布局：左侧 210px 导航（当前 tab 高亮 #2997f7）+ 右侧主内容区。

* 仪表盘：4 张指标卡 + ECharts 折线图（7 日用户/订单双系列）+ 环形图（内容构成）+ 柱状图（审计 Top 8）；echarts.min.js 本地复制自 `08-卫星产品\daijia\admin-dashboard\assets\vendor\echarts.min.js`，仅控制台页加载。

* 用户管理：自绘表格（搜索/角色筛选/分页）+ 新增/编辑 modal（表单校验）+ 删除确认 modal（自定义 `Modal.confirm`，中文文案），数据 fetch + nonce。

* 操作日志：表格 + 筛选 + 服务端分页；系统设置：Settings API 表单，提交记审计。

### 3.4 首页增强（保护三轮验证成果）

* `front-page.php` 在 saas-agg-portal 板块后（约 L128）插入「站点实时数据」只读容器（仅骨架 HTML）；新增独立 `assets/css/home-stats.css` + `assets/js/home-stats.js`（不动 style.css/main.js），`is_front_page()` 条件 enqueue；JS IntersectionObserver 首见拉取 `/stats/summary` + 5 分钟轮询，失败显示「--」。

* 首屏性能：hero 图 preload、列表 img 补 `loading="lazy" decoding="async"`、API transient 缓存。

* 修改前备份：front-page.php、functions.php 复制 `*.bak.<timestamp>`（沿用 style.css.bak 惯例）。

## 四、实施步骤（6 阶段，每阶段可独立验证）

1. **插件骨架+建表+审计写入器**：saas-console.php（常量/自动加载/激活钩子）+ class-activator/class-audit/class-cache → 激活成功、SHOW TABLES 见表、审计可写入查询
2. **只读 REST API**：class-rest/class-stats/class-ratelimit + me/stats/products/orders/audit-logs → curl 冒烟（401/200/缓存命中）
3. **用户管理 API**：class-users + CRUD/角色分配/限流 → curl 全链路 + 越权 403
4. **管理后台 UI**：class-admin-page + admin.css/admin.js + vendor echarts → 浏览器走查四 tab、增删改查、确认弹窗、日志落库
5. **首页板块+性能**：front-page.php 插入、home-stats.\*、functions.php enqueue、preload、compose 修复+sidecar、wp-config utf8mb4 → 浏览器三断点走查
6. **备份演练+压测+安全测试+报告** → `四组件端到端验证报告.html`（与第三轮报告同目录同风格，PASS/WARN/FAIL 四维度明细）

### 文件清单

**新增**：

* `wp-content\plugins\saas-console\`：saas-console.php、uninstall.php、includes{class-activator, class-rest, class-stats, class-users, class-audit, class-ratelimit, class-cache, class-admin-page}.php、assets{admin.css, admin.js}、assets\vendor\echarts.min.js

* `wp-content\themes\zibstyle\assets\css\home-stats.css`、`assets\js\home-stats.js`

* `wp-content\themes\zibstyle\四组件端到端验证报告.html`

* `wordpress-saas\backups\`（.gitignore）

**修改**（先备份 .bak.<timestamp>）：

* `wp-content\themes\zibstyle\front-page.php`（插板块容器）

* `wp-content\themes\zibstyle\functions.php`（条件 enqueue + preload）

* `wordpress-saas\wp-config.php`（DB\_CHARSET utf8→utf8mb4，L62）

* `Mi-Xiao-Mi-La-A-Li-Inc\docker-compose.yml`（**修复整段重复定义**：910 行中 wp-portal/wp-mysql 等服务在 L229/L669 重复两份，需去重；同时加 wp-db-backup sidecar）

* `05-部署运维层\nginx.conf`（静态资源缓存 location，可选）

**参照复用**：

* saas-aggregator.php（自动加载/常量/激活钩子模板）

* zibstyle\inc\extend\shop.php（product/mall\_order CPT 与 meta 结构）

* saas-aggregator\includes\class-settings.php（后台设置页模式）

* daijia\admin-dashboard\assets\vendor\echarts.min.js（本地 ECharts）

## 五、验证方案

**前置**：启动 Docker Desktop → `docker compose up -d wp-portal wp-mysql`（先去重 compose 并 `docker compose config` 校验）。

* **功能**：curl 冒烟（未登录 /users 401、/stats/summary 200+缓存头）；管理员浏览器走查控制台增删改查+角色分配+确认弹窗；首页板块数字与仪表盘一致。

* **性能**：优先容器内 `docker exec mixmlaal-wp-portal ab -n 2000 -c 100 -k http://127.0.0.1/`（首页）与 `ab -n 5000 -c 100 <stats/summary URL>`（API）；ab 缺失则用宿主 Node 脚本 100 并发取 p95。指标：REST ≤800ms、首页 ≤3s、SQL ≤500ms（EXPLAIN 抽查审计表分页）。

* **安全**：注入探测（`?search=' OR 1=1--`、UNION SELECT）断言空集非报错；editor 角色调写接口期望 403；XSS 用户名转义输出；限流 429。

* **备份**：手动 dump → 删表 → 恢复 → 断言还原。

* **报告**：四维度明细表 + 压测数据 + 恢复演练记录。

## 六、风险与注意点

1. Docker Desktop 未运行，所有验证前置依赖其启动；wp-mysql 健康后再激活插件。
2. docker-compose.yml 重复定义必须先去重（改前备份原文件），否则 compose 解析有静默合并风险。
3. 凭证 wp/wp\_pass 均为演示值，报告标注仅限本地；WP\_DEBUG 生产建议关闭（写入报告，本次不改）。
4. 限流 transient 计数非原子，演示规模可接受，报告注明。
5. 固定链接若为空，REST 用 `?rest_route=` 兜底参数验证。
6. 主题修改均留 .bak 备份，验证不通过可秒回退。

