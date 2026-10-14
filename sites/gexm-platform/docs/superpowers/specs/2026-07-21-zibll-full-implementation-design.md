# Zibll 子比主题全量功能补齐设计文档

**日期**: 2026-07-21
**主题**: mixm-laal WordPress 主题
**目标**: 对照 4 份 Zibll 文档,补齐 19 个功能缺口(3 P0 + 6 P1 + 10 P2)

## 一、设计原则

1. **不破坏已实现功能**: 已实现的 17 个 P0/P1/P2 任务与 37 项安全修复保持兼容
2. **遵循项目规则**: WordPress 编码标准 + 安全净化 + nonce 验证 + 用户权限校验
3. **工具链混合**: 古腾堡区块按复杂度分级用不同工具链
4. **并行实施**: 19 个缺口用并行子 Agent 同时推进,主 Agent 统一调度
5. **资源管控**: 遵守 task-scheduling-rules.md,资源密集型任务串行,CPU >80% 时仅做读写

## 二、19 个缺口实施设计

### P0 — 阻塞核心功能(3 项)

#### P0-1 古腾堡 150+ 自定义区块库
- **工具链混合策略**:
  - **ESNext + @wordpress/scripts**(用于复杂交互区块): 付费购买模块、高清视频播放器、音频播放器、Tab 切换、手风琴、计数器、进度条、幻灯片
  - **纯 PHP register_block_type**(用于简单静态区块): 分割线、通知框、按钮、图标组、卡片列表、时间轴静态版
  - **PHP+JS 混合动态区块**(用于需要服务端数据的区块): 文章列表、产品列表、B 站嵌入、Steam 资料、评分
- **目录结构**: `inc/gutenberg-blocks/` 每个区块一个子目录,含 `block.json` + `index.php` + 可选 `edit.js`/`save.js`
- **首批目标**: 30 个高频区块(后续可扩展到 150+)
- **入口**: 在 `functions.php` 通过 `register_block_type_from_metadata` 批量注册
- **构建**: 在 `wp-content/themes/mixm-laal/blocks-js/` 放 ESNext 源码,`npm run build` 输出到 `inc/gutenberg-blocks/`

#### P0-2 AI 预审 + 人工复核双重审核
- **新建文件**: `inc/content-audit-functions.php` + `inc/content-audit-admin.php`
- **数据表**: `wp_mixm_audit_queue`(id, post_id, content_type, content_hash, ai_result, ai_score, ai_reason, manual_status, reviewer_id, created_at, reviewed_at)
- **AI 接入**: 默认接入百度 AI 文本审核 API(可配置切换阿里云 Green / 腾讯云 TMS),`audit_provider` 字段
- **触发钩子**: `wp_insert_comment` / `save_post` / `mixm_laal_forum_topic_insert` / `mixm_laal_community_post_insert`
- **降级策略**: API 不可用时降级为本地敏感词库(预置 5000 词)
- **后台界面**: `wp-admin/admin.php?page=mixm-audit-queue`,支持批量通过/拒绝/打回

#### P0-3 可视化编辑器动态条件显示
- **修改文件**: `inc/visual-editor.php` + `inc/visual-core-modules.php` + `assets/js/visual-editor.js`
- **新增字段**: 每个模块配置加 `display_conditions` JSON,支持 `device`(desktop/mobile/tablet)、`user`(logged_in/logged_out/vip/normal)、`cap`(role:admin/editor/author)
- **服务端渲染**: `mixm_laal_render_module` 增加 `mixm_laal_check_display_conditions($config)` 短路判断
- **前端编辑器**: 模块配置面板新增"显示条件"折叠区,checkbox + select 组合

### P1 — 重要增强(6 项)

#### P1-1 社区提问/悬赏帖子类型
- **修改**: `inc/forum-functions.php` + `inc/poll-functions.php`
- **新增字段**: `forum_topics.topic_type` ENUM('normal','question','bounty') DEFAULT 'normal',`bounty_points` INT DEFAULT 0,`bounty_status` ENUM('open','awarded','expired') DEFAULT 'open',`accepted_post_id` BIGINT DEFAULT 0
- **业务逻辑**: 悬赏帖发布时冻结积分(`points-functions.php` 加 `mixm_laal_freeze_points`),采纳答案时解冻并奖励答主,7 天无采纳自动过期退回
- **前端模板**: `forum-topic.php` 根据 `topic_type` 切换布局,question 显示"已解决/未解决"标识,bounty 显示悬赏金额

#### P1-2 付费板块访问 + 用户组权限管理
- **修改**: `inc/forum-functions.php` + `inc/member-functions.php`
- **新增字段**: `forum_boards.is_paid` TINYINT,`forum_boards.required_level` INT,`forum_boards.required_points` INT,`forum_boards.allowed_groups` TEXT(JSON)
- **新增表**: `wp_mixm_user_groups`(id, name, slug, description, capabilities JSON)
- **新增表**: `wp_mixm_user_group_members`(user_id, group_id, joined_at)
- **权限校验**: `mixm_laal_check_board_access($user_id, $board_id)` 统一入口,在 `forum-topic.php` / `forum.php` 顶部调用
- **付费解锁**: 一次性付费或会员等级达标,记录到 `wp_mixm_board_access`(user_id, board_id, expires_at)

#### P1-3 GitHub 第三方登录
- **修改**: `inc/social-login.php` + `inc/social-login-callback.php`
- **流程**: `/wp-login.php?action=github_login` → 重定向 GitHub authorize → callback 拿 code → 换 access_token → 调 `/user` 拿邮箱/昵称/头像 → 关联本地账号或注册
- **配置项**: 在 `inc/api-admin.php` 加 `github_client_id` / `github_client_secret`(AES-256-CBC 加密存储)
- **state 防 CSRF**: 用 transient 存 state 10 分钟

#### P1-4 虎皮椒支付接口
- **修改**: `inc/payment-gateway.php`
- **新增类**: `MixM_Laal_Hupijiao_Gateway extends WC_Payment_Gateway` 或独立 `MixM_Laal_Hupijiao_Payment`
- **支持**: 支付宝/微信聚合,个人站长无企业资质场景
- **签名**: MD5(pid + out_trade_no + key),`notify_url` 接收异步回调
- **配置**: `hupijiao_pid` / `hupijiao_appkey` 加密存储

#### P1-5 物流同步接口
- **修改**: `inc/commerce-extended-functions.php` + `inc/commerce-functions.php`
- **新增字段**: `shop_orders.shipping_status` ENUM('pending','shipped','delivered','returned'),`tracking_no` VARCHAR(64),`logistics_company` VARCHAR(32)
- **新增文件**: `inc/logistics-functions.php` — 对接快递 100 / 菜鸟物流查询 API
- **后台**: 订单详情页加"发货"按钮,填物流单号后状态自动变 `shipped`,定时任务( hourly)拉取轨迹更新
- **前端**: 用户中心订单列表显示物流轨迹时间轴

#### P1-6 主题更新-DB 自动迁移机制
- **修改**: `functions.php` + 新建 `inc/db-migrations.php`
- **机制**: `MIXM_LAAL_VERSION` 比对 `get_option('mixm_laal_db_version')`,差异时执行 `mixm_laal_run_migrations($from, $to)`
- **迁移文件命名**: `inc/migrations/upgrade-{from}-to-{to}.php`,每个文件返回 `['up' => callable, 'down' => callable]`
- **执行点**: `admin_init` 钩子,执行后更新 `mixm_laal_db_version` option

### P2 — 锦上添花(10 项)

| 编号 | 缺口 | 涉及文件 | 实现思路 |
| --- | --- | --- | --- |
| P2-1 | 容器化布局 4 区域 | `header.php` `front-page.php` | 加 `mixm_laal_top_full_width` hook,首页双栏开关 |
| P2-2 | 可视化编辑器扩展模块 | `inc/visual-core-modules.php` | 新增幻灯片/图文视频封面/多列文章列表/广告位 4 个模块 |
| P2-3 | 限时折扣营销工具 | 新建 `inc/flash-sale-functions.php` | `wp_mixm_flash_sales` 表 + 时间窗 + 自动调价 cron |
| P2-4 | Nginx/Apache 伪静态指南 | 新建 `admin/server-config-guide.php` | 渲染 .htaccess + nginx.conf 模板 + 复制按钮 |
| P2-5 | OpCache 检测向导 | `inc/health-check.php` | 检测 `opcache_get_status()`,显示命中率/内存 |
| P2-6 | CDN 配置向导 | 新建 `inc/cdn-admin.php` | 域名替换/预热/刷新按钮,支持又拍云/七牛/阿里 CDN |
| P2-7 | 滚动入场动画 | `assets/js/main.js` + `assets/css/style.css` | `[data-animate="fade-up"]` + Intersection Observer |
| P2-8 | AJAX 文章列表无限滚动 | `assets/js/main.js` + `functions.php` | `mixm_laal_ajax_load_more` 端点 + Intersection Observer 触发 |
| P2-9 | 可视化编辑器嵌套栅格 | `inc/visual-editor.php` | 支持 row→col→module 三层嵌套 |
| P2-10 | 行为驱动推荐实时反馈 | `inc/recommendation-functions.php` | 收藏/点赞钩子即时重算该文章分数(不批量) |

## 三、并行执行批次

按子 Agent 上限 5 个/批次,分 4 批:

### 批次 1(P0 三件套,3 个 Agent)
- Agent-1: 古腾堡区块库(ESNext + PHP 混合,30 区块)
- Agent-2: AI 内容审核 + 人工复核队列
- Agent-3: 可视化编辑器动态条件显示

### 批次 2(P1 前 3 项,3 个 Agent)
- Agent-4: 社区提问/悬赏帖子类型 + 积分冻结
- Agent-5: 付费板块 + 用户组权限
- Agent-6: GitHub OAuth 登录

### 批次 3(P1 后 3 项,3 个 Agent)
- Agent-7: 虎皮椒支付
- Agent-8: 物流同步接口
- Agent-9: DB 自动迁移机制 + 行为驱动推荐实时反馈

### 批次 4(P2 共 10 项,5 个 Agent 分组)
- Agent-10: P2-1 容器布局 + P2-2 可视化扩展模块 + P2-9 嵌套栅格
- Agent-11: P2-3 限时折扣 + P2-7 滚动动画 + P2-8 AJAX 无限滚动
- Agent-12: P2-4 Nginx 指南 + P2-5 OpCache + P2-6 CDN 向导
- Agent-13: 统一审计 + 文档生成 + 集成测试报告

## 四、风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 古腾堡 ESNext 需要 Node 构建 | 提供纯 PHP fallback,即使不构建也能用基础版 |
| AI 审核 API 需要密钥 | 默认本地敏感词库降级,API 配置后启用云审核 |
| 子 Agent 同时改 functions.php 冲突 | 每个 Agent 改独立 inc/ 文件,主 Agent 统一在 functions.php 末尾追加 require |
| CPU 飙升 | 遵守 task-scheduling-rules.md,lint/build 串行,主 Agent 统一调度 |
| DB schema 变更冲突 | 所有 ALTER TABLE 写在 db-migrations.php,按版本号顺序执行 |

## 五、验证标准

- 每个缺口完成后,通过 WP-CLI 或 docker exec 验证:
  - PHP 语法: `php -l <file>`
  - 区块注册: `wp eval 'print_r(WP_Block_Type_Registry::get_instance()->get_all_registered());'`
  - 数据表: `wp db query "SHOW TABLES LIKE 'wp_mixm_%'"`
  - AJAX 端点: `wp eval 'do_action("wp_ajax_mixm_laal_xxx");'`
- Docker 容器 `gexm-wordpress` (8081 端口) 前后台可访问
- 安全审计: 所有新加 AJAX 端点必须用 `wp_ajax_*` 而非 `wp_ajax_nopriv_*`(敏感操作)

## 六、不在范围内

- 不修改 WordPress 核心文件(wp-admin/wp-includes)
- 不引入 jQuery 以外的第三方 JS 框架
- 不修改已通过安全审计的 37 项修复
- 不重新构建已编译的 @gexm/pc / @gexm/server / @gexm/sdk / @gexm/shared 包
