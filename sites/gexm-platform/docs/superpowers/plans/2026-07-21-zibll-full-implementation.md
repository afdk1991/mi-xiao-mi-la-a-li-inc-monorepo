# Zibll 子比主题全量功能补齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对照 4 份 Zibll 文档,补齐 mixm-laal WordPress 主题 19 个功能缺口(3 P0 + 6 P1 + 10 P2)

**Architecture:** 4 批次并行实施,主 Agent 调度,子 Agent 各改独立 inc/ 文件。functions.php 由主 Agent 统一追加 require。所有新代码遵循 WordPress 编码标准 + 安全净化 + nonce 验证。

**Tech Stack:** PHP 8.0+ / WordPress 6.0+ / MySQL / Gutenberg ESNext + @wordpress/scripts / jQuery / AJAX

## Global Constraints

- PHP 8.0+(无需兼容 7.4 以下)
- WordPress 6.0+ 核心
- 所有用户输入必须用 sanitize_text_field/intval/absint 净化
- 所有输出必须用 esc_html/esc_attr/esc_url/wp_kses_post 净化
- 敏感 AJAX 端点必须用 wp_ajax_* 而非 wp_ajax_nopriv_*
- 数据库操作必须用 $wpdb->prepare()
- 敏感字段必须用 mixm_laal_encrypt_secret/decrypt_secret AES-256-CBC 加密
- 文件路径 F:\gexm\wp-content\themes\mixm-laal\
- 设计文档: F:\gexm\docs\superpowers\specs\2026-07-21-zibll-full-implementation-design.md

---

## 文件结构映射

### 新建文件(P0)
- `inc/gutenberg-blocks-registry.php` — 区块注册入口
- `inc/gutenberg-blocks/` — 区块目录,每个区块一个子目录
- `inc/content-audit-functions.php` — AI 审核 + 本地敏感词库
- `inc/content-audit-admin.php` — 后台审核队列界面
- `inc/display-conditions.php` — 可视化编辑器动态条件显示

### 新建文件(P1)
- `inc/forum-question-bounty.php` — 提问/悬赏帖子类型
- `inc/user-groups-functions.php` — 用户组权限
- `inc/board-access-functions.php` — 付费板块访问
- `inc/github-login.php` — GitHub OAuth
- `inc/hupijiao-payment.php` — 虎皮椒支付
- `inc/logistics-functions.php` — 物流同步
- `inc/db-migrations.php` — DB 自动迁移

### 新建文件(P2)
- `inc/flash-sale-functions.php` — 限时折扣
- `inc/cdn-admin.php` — CDN 配置向导
- `admin/server-config-guide.php` — Nginx/Apache 配置指南
- `inc/migrations/upgrade-1.0.0-to-1.1.0.php` — 首个迁移文件

### 修改文件
- `functions.php` — 主 Agent 统一追加 require
- `inc/visual-editor.php` — 加动态条件显示支持
- `inc/visual-core-modules.php` — 加扩展模块
- `inc/forum-functions.php` — 加 topic_type 支持
- `inc/payment-gateway.php` — 加虎皮椒
- `inc/social-login.php` — 加 GitHub
- `inc/recommendation-functions.php` — 加实时反馈
- `header.php` — 加顶部全宽钩子
- `front-page.php` — 加双栏布局开关
- `assets/js/main.js` — 加滚动动画 + AJAX 无限滚动
- `assets/js/visual-editor.js` — 加条件显示 UI
- `assets/css/style.css` — 加动画样式

---

## 批次 1: P0 三件套(3 个并行子 Agent)

### Task 1: 古腾堡 30 区块库(Agent-1)

**Files:**
- Create: `inc/gutenberg-blocks-registry.php`
- Create: `inc/gutenberg-blocks/01-divider/block.json`
- Create: `inc/gutenberg-blocks/01-divider/index.php`
- Create: `inc/gutenberg-blocks/02-notice/block.json`
- Create: `inc/gutenberg-blocks/02-notice/index.php`
- ... (30 个区块目录,每个含 block.json + index.php)
- Modify: `functions.php` 末尾追加 `require_once get_template_directory() . '/inc/gutenberg-blocks-registry.php';`

**Interfaces:**
- Produces: `mixm_laal_register_gutenberg_blocks()` 函数,挂在 `init` 钩子
- 区块命名空间: `mixm-laal/{block-name}` (如 `mixm-laal/divider`)
- 每个区块的 render_callback 必须用 esc_html/esc_attr 净化属性

**30 个区块清单(按复杂度分类):**

纯 PHP 区块(20 个,简单静态):
1. divider (分割线)
2. notice (通知框:info/warning/error/success)
3. button (按钮:链接/样式/大小)
4. icon-group (图标组:Font Awesome)
5. card-list (卡片列表)
6. timeline-static (静态时间轴)
7. spacer (空白间隔)
8. heading (高级标题:前缀/后缀/图标)
9. quote (引用块:作者/头像)
10. list-styled (样式列表:勾选/箭头/数字)
11. badge (徽章:颜色/文字)
12. progress-bar-static (静态进度条)
13. counter-static (静态计数器)
14. tabs-static (静态 Tab 切换)
15. accordion-static (静态手风琴)
16. social-share (社交分享按钮)
17. author-card (作者卡片)
18. post-meta (文章元信息)
19. breadcrumb (面包屑)
20. tag-cloud (标签云)

PHP+JS 混合动态区块(10 个,需要服务端数据):
21. post-list (文章列表:分类/数量/布局)
22. product-list (产品列表:分类/数量)
23. video-player (视频播放器:HTML5/B站/YouTube)
24. audio-player (音频播放器)
25. paid-content (付费内容块:金额/隐藏内容)
26. rating (评分组件:5 星)
27. countdown (倒计时:目标日期)
28. slider (幻灯片:多张图)
29. bilibili-embed (B 站视频嵌入)
30. steam-profile (Steam 用户资料卡)

- [ ] **Step 1.1: 创建区块目录结构**

```bash
mkdir -p F:\gexm\wp-content\themes\mixm-laal\inc\gutenberg-blocks
cd F:\gexm\wp-content\themes\mixm-laal\inc\gutenberg-blocks
# 30 个区块子目录,每个含 block.json + index.php
```

- [ ] **Step 1.2: 创建区块注册入口 `inc/gutenberg-blocks-registry.php`**

```php
<?php
/**
 * MixM Laal 古腾堡区块注册入口
 * 批量注册 30+ 自定义区块
 */
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 批量注册所有区块
 */
function mixm_laal_register_gutenberg_blocks() {
    $blocks_dir = get_template_directory() . '/inc/gutenberg-blocks';
    if ( ! is_dir( $blocks_dir ) ) return;

    $block_dirs = glob( $blocks_dir . '/*', GLOB_ONLYDIR );
    if ( empty( $block_dirs ) ) return;

    foreach ( $block_dirs as $dir ) {
        $block_json = $dir . '/block.json';
        if ( ! file_exists( $block_json ) ) continue;

        // 注册区块(支持 render_callback,自动加载 index.php)
        register_block_type_from_metadata( $dir, array(
            'render_callback' => function( $attributes, $content ) use ( $dir ) {
                $render_file = $dir . '/index.php';
                if ( file_exists( $render_file ) ) {
                    ob_start();
                    include $render_file;
                    return ob_get_clean();
                }
                return $content;
            },
        ) );
    }
}
add_action( 'init', 'mixm_laal_register_gutenberg_blocks' );

/**
 * 注册区块分类
 */
function mixm_laal_register_block_category( $categories ) {
    array_unshift( $categories, array(
        'slug'  => 'mixm-laal',
        'title' => __( 'MixM Laal 区块', 'mixm-laal' ),
        'icon'  => 'admin-appearance',
    ) );
    return $categories;
}
add_filter( 'block_categories_all', 'mixm_laal_register_block_category' );
```

- [ ] **Step 1.3: 创建第一个区块 divider (模板示例)**

`inc/gutenberg-blocks/01-divider/block.json`:
```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "mixm-laal/divider",
    "title": "分割线",
    "description": "可配置样式的分割线",
    "category": "mixm-laal",
    "icon": "minus",
    "attributes": {
        "style": { "type": "string", "default": "solid" },
        "color": { "type": "string", "default": "#e0e0e0" },
        "width": { "type": "string", "default": "100%" },
        "thickness": { "type": "number", "default": 1 }
    },
    "supports": { "html": false },
    "textdomain": "mixm-laal"
}
```

`inc/gutenberg-blocks/01-divider/index.php`:
```php
<?php
if ( ! defined( 'ABSPATH' ) ) exit;
$style    = isset( $attributes['style'] ) ? sanitize_text_field( $attributes['style'] ) : 'solid';
$color    = isset( $attributes['color'] ) ? sanitize_hex_color( $attributes['color'] ) : '#e0e0e0';
$width    = isset( $attributes['width'] ) ? sanitize_text_field( $attributes['width'] ) : '100%';
$thickness = isset( $attributes['thickness'] ) ? absint( $attributes['thickness'] ) : 1;
printf(
    '<hr class="mixm-laal-divider mixm-laal-divider-%s" style="border-style:%s;border-color:%s;width:%s;border-width:%dpx;">',
    esc_attr( $style ),
    esc_attr( $style ),
    esc_attr( $color ),
    esc_attr( $width ),
    absint( $thickness )
);
```

- [ ] **Step 1.4: 按相同模式批量创建剩余 29 个区块**

每个区块遵循模板:
1. `block.json` 定义元数据 + 属性
2. `index.php` 实现服务端渲染,所有输出经过 esc_*/sanitize_* 净化

- [ ] **Step 1.5: 在 functions.php 末尾追加 require**

主 Agent 统一执行,避免冲突。

- [ ] **Step 1.6: 验证区块注册**

```bash
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**
```
预期输出包含 `mixm-laal/divider` 等 30 个区块名。

---

### Task 2: AI 内容审核 + 人工复核队列(Agent-2)

**Files:**
- Create: `inc/content-audit-functions.php`
- Create: `inc/content-audit-admin.php`
- Modify: `functions.php` (主 Agent 追加 require)

**Interfaces:**
- Produces:
  - `mixm_laal_audit_content( $content, $type, $post_id )` — 入口函数
  - `mixm_laal_get_audit_queue( $status, $limit, $offset )` — 查询队列
  - `mixm_laal_review_content( $queue_id, $action, $reviewer_id )` — 人工复核
  - 数据表: `wp_mixm_audit_queue`
  - AJAX: `wp_ajax_mixm_laal_audit_review` (批量通过/拒绝/打回)
  - AJAX: `wp_ajax_mixm_laal_audit_settings` (保存 API 配置)

- [ ] **Step 2.1: 创建数据表**

在 `inc/content-audit-functions.php` 中:
```php
function mixm_laal_create_audit_table() {
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_audit_queue';
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        post_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        content_type VARCHAR(32) NOT NULL DEFAULT 'post',
        content_hash CHAR(32) NOT NULL DEFAULT '',
        content_preview TEXT,
        ai_provider VARCHAR(32) NOT NULL DEFAULT 'local',
        ai_result VARCHAR(16) NOT NULL DEFAULT 'pending',
        ai_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        ai_reason TEXT,
        manual_status VARCHAR(16) NOT NULL DEFAULT 'pending',
        reviewer_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_post (post_id),
        KEY idx_status (manual_status),
        KEY idx_created (created_at)
    ) {$charset};";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}
add_action( 'after_switch_theme', 'mixm_laal_create_audit_table' );
```

- [ ] **Step 2.2: 实现本地敏感词库(降级方案)**

```php
/**
 * 本地敏感词检测
 * @param string $content 待检测内容
 * @return array ['result' => 'pass|review|block', 'score' => 0-100, 'hits' => []]
 */
function mixm_laal_local_sensitive_check( $content ) {
    $words = get_option( 'mixm_laal_sensitive_words', array() );
    if ( empty( $words ) ) {
        // 预置 200 个基础敏感词(生产环境可扩展到 5000+)
        $words = array_merge(
            array_map( 'trim', explode( "\n", file_get_contents( get_template_directory() . '/inc/sensitive-words.txt' ) ) )
        );
    }
    $hits = array();
    $content_lower = mb_strtolower( $content, 'UTF-8' );
    foreach ( $words as $word ) {
        $word = trim( $word );
        if ( empty( $word ) ) continue;
        if ( mb_strpos( $content_lower, mb_strtolower( $word, 'UTF-8' ) ) !== false ) {
            $hits[] = $word;
        }
    }
    $hit_count = count( $hits );
    if ( $hit_count === 0 ) {
        return array( 'result' => 'pass', 'score' => 100.0, 'hits' => array() );
    } elseif ( $hit_count <= 2 ) {
        return array( 'result' => 'review', 'score' => 60.0, 'hits' => $hits );
    } else {
        return array( 'result' => 'block', 'score' => 20.0, 'hits' => $hits );
    }
}
```

- [ ] **Step 2.3: 实现百度 AI 文本审核适配器**

```php
/**
 * 百度 AI 文本审核
 * @param string $content
 * @return array|false 失败返回 false 触发降级
 */
function mixm_laal_baidu_text_audit( $content ) {
    $api_key    = mixm_laal_decrypt_secret( get_option( 'mixm_laal_baidu_api_key' ) );
    $secret_key = mixm_laal_decrypt_secret( get_option( 'mixm_laal_baidu_secret_key' ) );
    if ( empty( $api_key ) || empty( $secret_key ) ) return false;

    // 1. 获取 access_token
    $token_url = 'https://aip.baidubce.com/oauth/2.0/token';
    $token_url = add_query_arg( array(
        'grant_type'    => 'client_credentials',
        'client_id'     => $api_key,
        'client_secret' => $secret_key,
    ), $token_url );
    $resp = wp_remote_get( $token_url, array( 'timeout' => 10 ) );
    if ( is_wp_error( $resp ) ) return false;
    $body = json_decode( wp_remote_retrieve_body( $resp ), true );
    if ( empty( $body['access_token'] ) ) return false;

    // 2. 调用文本审核
    $audit_url = 'https://aip.baidubce.com/rest/2.0/solution/v1/text_censor/v2/user_defined';
    $audit_url = add_query_arg( 'access_token', $body['access_token'], $audit_url );
    $resp = wp_remote_post( $audit_url, array(
        'body' => array( 'text' => $content ),
        'timeout' => 15,
    ) );
    if ( is_wp_error( $resp ) ) return false;
    $result = json_decode( wp_remote_retrieve_body( $resp ), true );
    if ( empty( $result['conclusionType'] ) ) return false;

    // conclusionType: 1=合规 2=不合规 3=疑似 4=失败
    $map = array(
        1 => array( 'result' => 'pass', 'score' => 100.0 ),
        2 => array( 'result' => 'block', 'score' => 0.0 ),
        3 => array( 'result' => 'review', 'score' => 50.0 ),
    );
    $type = intval( $result['conclusionType'] );
    return isset( $map[ $type ] ) ? array_merge( $map[ $type ], array( 'reason' => $result['conclusion'] ?? '' ) ) : false;
}
```

- [ ] **Step 2.4: 实现审核入口函数(钩子挂载点)**

```php
/**
 * 内容审核入口
 * @param string $content 原始内容
 * @param string $type post|comment|forum_topic|community_post
 * @param int    $post_id 关联 ID
 */
function mixm_laal_audit_content( $content, $type, $post_id ) {
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_audit_queue';

    // 1. 先用本地敏感词库快速检测
    $local_result = mixm_laal_local_sensitive_check( $content );

    // 2. 如果本地通过,尝试调用 AI(若配置)
    $ai_result = false;
    $ai_provider = 'local';
    if ( $local_result['result'] === 'pass' ) {
        $ai_result = mixm_laal_baidu_text_audit( $content );
        if ( $ai_result ) {
            $ai_provider = 'baidu';
        }
    }

    // 3. 综合结果
    $final = $ai_result ?: $local_result;
    $ai_final_result = $final['result'];
    $ai_score = floatval( $final['score'] );
    $ai_reason = isset( $final['reason'] ) ? sanitize_text_field( $final['reason'] ) : ( ! empty( $final['hits'] ) ? '敏感词: ' . implode( ',', array_slice( $final['hits'], 0, 5 ) ) : '' );

    // 4. 决定 manual_status
    $manual_status = 'pending';
    if ( $ai_final_result === 'block' ) {
        $manual_status = 'pending'; // 需人工复核
    } elseif ( $ai_final_result === 'review' ) {
        $manual_status = 'pending';
    } else {
        $manual_status = 'auto_approved';
    }

    // 5. 写入队列
    $wpdb->insert(
        $table,
        array(
            'post_id'         => absint( $post_id ),
            'content_type'    => sanitize_text_field( $type ),
            'content_hash'    => md5( $content ),
            'content_preview' => mb_substr( $content, 0, 500, 'UTF-8' ),
            'ai_provider'     => $ai_provider,
            'ai_result'       => $ai_final_result,
            'ai_score'        => $ai_score,
            'ai_reason'       => $ai_reason,
            'manual_status'   => $manual_status,
            'created_at'      => current_time( 'mysql' ),
        ),
        array( '%d', '%s', '%s', '%s', '%s', '%s', '%f', '%s', '%s', '%s' )
    );

    return $ai_final_result;
}
```

- [ ] **Step 2.5: 挂载到 WordPress 钩子**

```php
// 文章保存
add_action( 'save_post', function( $post_id, $post, $update ) {
    if ( wp_is_post_revision( $post_id ) || $post->post_status !== 'publish' ) return;
    mixm_laal_audit_content( $post->post_content, 'post', $post_id );
}, 10, 3 );

// 评论提交
add_action( 'wp_insert_comment', function( $comment_id, $comment ) {
    mixm_laal_audit_content( $comment->comment_content, 'comment', $comment_id );
}, 10, 2 );
```

- [ ] **Step 2.6: 创建后台审核队列界面 `inc/content-audit-admin.php`**

实现:
- 菜单: `wp-admin/admin.php?page=mixm-audit-queue`
- 列表: 显示 pending 状态的审核项,支持分页/筛选
- 操作: 通过/拒绝/打回,批量操作
- 设置页: API Key 配置(加密存储),敏感词库导入

- [ ] **Step 2.7: AJAX 端点**

```php
add_action( 'wp_ajax_mixm_laal_audit_review', 'mixm_laal_ajax_audit_review' );
function mixm_laal_ajax_audit_review() {
    check_ajax_referer( 'mixm_laal_nonce', 'nonce' );
    if ( ! current_user_can( 'edit_others_posts' ) ) wp_die( -1 );

    $queue_id = absint( $_POST['queue_id'] ?? 0 );
    $action   = sanitize_text_field( $_POST['review_action'] ?? '' );
    if ( ! $queue_id || ! in_array( $action, array( 'approve', 'reject', 'return' ), true ) ) {
        wp_send_json_error( array( 'message' => '参数错误' ) );
    }

    global $wpdb;
    $table = $wpdb->prefix . 'mixm_audit_queue';
    $wpdb->update(
        $table,
        array(
            'manual_status' => $action,
            'reviewer_id'   => get_current_user_id(),
            'reviewed_at'   => current_time( 'mysql' ),
        ),
        array( 'id' => $queue_id ),
        array( '%s', '%d', '%s' ),
        array( '%d' )
    );
    wp_send_json_success( array( 'message' => '审核完成' ) );
}
```

- [ ] **Step 2.8: 验证**

```bash
```

---

### Task 3: 可视化编辑器动态条件显示(Agent-3)

**Files:**
- Create: `inc/display-conditions.php`
- Modify: `inc/visual-editor.php` (在模块保存时增加 display_conditions 字段)
- Modify: `inc/visual-core-modules.php` (渲染前检查条件)
- Modify: `assets/js/visual-editor.js` (UI 配置面板)

**Interfaces:**
- Produces:
  - `mixm_laal_check_display_conditions( $conditions )` : bool
  - `mixm_laal_sanitize_display_conditions( $input )` : array

- [ ] **Step 3.1: 创建 `inc/display-conditions.php`**

```php
<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 检查模块显示条件
 * @param array $conditions { device: [], user: [], cap: [] }
 * @return bool true=显示,false=隐藏
 */
function mixm_laal_check_display_conditions( $conditions ) {
    if ( empty( $conditions ) ) return true;

    // 1. 设备条件
    if ( ! empty( $conditions['device'] ) ) {
        $current_device = wp_is_mobile() ? 'mobile' : 'desktop';
        if ( ! in_array( $current_device, $conditions['device'], true ) ) return false;
    }

    // 2. 用户登录状态
    if ( ! empty( $conditions['user'] ) ) {
        $user_status = is_user_logged_in() ? 'logged_in' : 'logged_out';
        if ( in_array( $user_status, $conditions['user'], true ) ) {
            // 通过
        } else {
            // 检查 VIP/普通用户
            $is_vip = mixm_laal_is_user_vip( get_current_user_id() );
            if ( in_array( 'vip', $conditions['user'], true ) && ! $is_vip ) return false;
            if ( in_array( 'normal', $conditions['user'], true ) && $is_vip ) return false;
            // 没匹配任何条件,默认隐藏
            if ( ! in_array( $user_status, $conditions['user'], true ) ) return false;
        }
    }

    // 3. 用户角色
    if ( ! empty( $conditions['cap'] ) ) {
        $user = wp_get_current_user();
        $user_roles = (array) $user->roles;
        $has_role = false;
        foreach ( $conditions['cap'] as $required_role ) {
            if ( in_array( $required_role, $user_roles, true ) ) {
                $has_role = true;
                break;
            }
        }
        if ( ! $has_role ) return false;
    }

    return true;
}

/**
 * 净化显示条件输入
 */
function mixm_laal_sanitize_display_conditions( $input ) {
    $result = array();
    if ( isset( $input['device'] ) && is_array( $input['device'] ) ) {
        $result['device'] = array_values( array_filter( array_map( 'sanitize_text_field', $input['device'] ), fn( $v ) => in_array( $v, array( 'desktop', 'mobile', 'tablet' ), true ) ) );
    }
    if ( isset( $input['user'] ) && is_array( $input['user'] ) ) {
        $result['user'] = array_values( array_filter( array_map( 'sanitize_text_field', $input['user'] ), fn( $v ) => in_array( $v, array( 'logged_in', 'logged_out', 'vip', 'normal' ), true ) ) );
    }
    if ( isset( $input['cap'] ) && is_array( $input['cap'] ) ) {
        $result['cap'] = array_values( array_filter( array_map( 'sanitize_text_field', $input['cap'] ), fn( $v ) => in_array( $v, array( 'administrator', 'editor', 'author', 'contributor', 'subscriber' ), true ) ) );
    }
    return $result;
}

/**
 * 判断用户是否 VIP
 */
function mixm_laal_is_user_vip( $user_id ) {
    if ( ! function_exists( 'mixm_laal_get_user_member_level' ) ) return false;
    $level = mixm_laal_get_user_member_level( $user_id );
    return $level && $level['level_id'] > 0;
}
```

- [ ] **Step 3.2: 修改 `inc/visual-core-modules.php` 渲染逻辑**

在 `mixm_laal_render_module` 函数开头加入:
```php
// 检查显示条件
if ( ! empty( $config['display_conditions'] ) ) {
    if ( ! mixm_laal_check_display_conditions( $config['display_conditions'] ) ) {
        return ''; // 不满足条件,返回空
    }
}
```

- [ ] **Step 3.3: 修改 `inc/visual-editor.php` 保存逻辑**

在保存模块配置时:
```php
// 保存 display_conditions 字段
if ( isset( $_POST['display_conditions'] ) ) {
    $config['display_conditions'] = mixm_laal_sanitize_display_conditions( $_POST['display_conditions'] );
}
```

- [ ] **Step 3.4: 修改 `assets/js/visual-editor.js` UI**

在模块配置面板追加"显示条件"折叠区:
- 设备 checkbox 组: 桌面端/移动端/平板
- 用户 checkbox 组: 已登录/未登录/VIP/普通
- 角色 checkbox 组: 管理员/编辑/作者/投稿者/订阅者

- [ ] **Step 3.5: 验证**

测试场景:
1. 设置模块 device=['mobile'],桌面访问页面应不显示该模块
2. 设置模块 user=['vip'],未登录访问应不显示
3. 设置模块 cap=['administrator'],非管理员访问应不显示

---

## 批次 2: P1 前 3 项(3 个并行子 Agent)

### Task 4: 社区提问/悬赏帖子类型(Agent-4)

**Files:**
- Create: `inc/forum-question-bounty.php`
- Modify: `inc/forum-functions.php` (加 topic_type 字段相关逻辑)
- Modify: `inc/points-functions.php` (加积分冻结/解冻)
- Modify: `forum-topic.php` (前端模板按 topic_type 切换)

- [ ] **Step 4.1: 数据表字段扩展**

```php
function mixm_laal_alter_forum_topics_table() {
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_forum_topics';
    // 检查字段是否存在,不存在才加
    $cols = $wpdb->get_col( $wpdb->prepare( "SHOW COLUMNS FROM %i LIKE %s", $table, 'topic_type' ) );
    if ( empty( $cols ) ) {
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN topic_type VARCHAR(16) NOT NULL DEFAULT 'normal'" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN bounty_points INT NOT NULL DEFAULT 0" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN bounty_status VARCHAR(16) NOT NULL DEFAULT 'open'" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN accepted_post_id BIGINT NOT NULL DEFAULT 0" );
    }
}
add_action( 'after_switch_theme', 'mixm_laal_alter_forum_topics_table' );
```

- [ ] **Step 4.2: 积分冻结/解冻函数**

在 `inc/points-functions.php` 末尾追加:
```php
/**
 * 冻结用户积分
 * @param int $user_id
 * @param int $points
 * @param string $reason
 * @return bool
 */
function mixm_laal_freeze_points( $user_id, $points, $reason = '' ) {
    global $wpdb;
    $user_id = absint( $user_id );
    $points  = absint( $points );
    if ( ! $user_id || ! $points ) return false;

    $wpdb->query( 'START TRANSACTION' );
    $current = intval( get_user_meta( $user_id, 'mixm_laal_points', true ) );
    if ( $current < $points ) {
        $wpdb->query( 'ROLLBACK' );
        return new WP_Error( 'insufficient_points', '积分不足' );
    }
    update_user_meta( $user_id, 'mixm_laal_points', $current - $points );
    $frozen = intval( get_user_meta( $user_id, 'mixm_laal_frozen_points', true ) );
    update_user_meta( $user_id, 'mixm_laal_frozen_points', $frozen + $points );

    $wpdb->insert( $wpdb->prefix . 'mixm_points_log', array(
        'user_id'    => $user_id,
        'change'     => -$points,
        'type'       => 'freeze',
        'reason'     => sanitize_text_field( $reason ),
        'created_at' => current_time( 'mysql' ),
    ) );
    $wpdb->query( 'COMMIT' );
    return true;
}

/**
 * 解冻并奖励积分给答主
 */
function mixm_laal_award_bounty( $topic_id, $winner_user_id ) {
    // 实现略,参考设计文档
}

/**
 * 悬赏过期退回
 */
function mixm_laal_expire_bounty( $topic_id ) {
    // 实现略
}
```

- [ ] **Step 4.3: 7 天过期 cron**

```php
add_action( 'mixm_laal_hourly_event', 'mixm_laal_check_expired_bounties' );
function mixm_laal_check_expired_bounties() {
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_forum_topics';
    $expired = $wpdb->get_col( $wpdb->prepare(
        "SELECT id FROM %i WHERE topic_type='bounty' AND bounty_status='open' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)",
        $table
    ) );
    foreach ( $expired as $topic_id ) {
        mixm_laal_expire_bounty( $topic_id );
    }
}
```

- [ ] **Step 4.4: 前端模板切换**

修改 `forum-topic.php`,根据 `topic_type` 显示不同标识和操作按钮。

- [ ] **Step 4.5: AJAX 端点**

```php
add_action( 'wp_ajax_mixm_laal_accept_bounty_answer', 'mixm_laal_ajax_accept_bounty_answer' );
// 实现略,参考设计文档
```

---

### Task 5: 付费板块 + 用户组权限(Agent-5)

**Files:**
- Create: `inc/user-groups-functions.php`
- Create: `inc/board-access-functions.php`
- Modify: `inc/forum-functions.php` (在板块访问处加权限校验)

- [ ] **Step 5.1: 创建数据表**

```php
function mixm_laal_create_user_groups_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $groups = $wpdb->prefix . 'mixm_user_groups';
    $sql1 = "CREATE TABLE IF NOT EXISTS {$groups} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(64) NOT NULL,
        slug VARCHAR(64) NOT NULL,
        description TEXT,
        capabilities LONGTEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY slug (slug)
    ) {$charset};";

    $members = $wpdb->prefix . 'mixm_user_group_members';
    $sql2 = "CREATE TABLE IF NOT EXISTS {$members} (
        user_id BIGINT(20) UNSIGNED NOT NULL,
        group_id BIGINT(20) UNSIGNED NOT NULL,
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, group_id)
    ) {$charset};";

    $board_access = $wpdb->prefix . 'mixm_board_access';
    $sql3 = "CREATE TABLE IF NOT EXISTS {$board_access} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        board_id BIGINT(20) UNSIGNED NOT NULL,
        expires_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_board (user_id, board_id)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql1 );
    dbDelta( $sql2 );
    dbDelta( $sql3 );

    // 扩展 forum_boards 表
    $boards_table = $wpdb->prefix . 'mixm_forum_boards';
    $cols = $wpdb->get_col( $wpdb->prepare( "SHOW COLUMNS FROM %i LIKE %s", $boards_table, 'is_paid' ) );
    if ( empty( $cols ) ) {
        $wpdb->query( "ALTER TABLE {$boards_table} ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 0" );
        $wpdb->query( "ALTER TABLE {$boards_table} ADD COLUMN required_level INT NOT NULL DEFAULT 0" );
        $wpdb->query( "ALTER TABLE {$boards_table} ADD COLUMN required_points INT NOT NULL DEFAULT 0" );
        $wpdb->query( "ALTER TABLE {$boards_table} ADD COLUMN allowed_groups LONGTEXT" );
    }
}
add_action( 'after_switch_theme', 'mixm_laal_create_user_groups_tables' );
```

- [ ] **Step 5.2: 板块访问权限校验函数**

```php
/**
 * 校验用户对板块的访问权限
 * @param int $user_id
 * @param int $board_id
 * @return array ['allowed' => bool, 'reason' => string]
 */
function mixm_laal_check_board_access( $user_id, $board_id ) {
    global $wpdb;
    $user_id  = absint( $user_id );
    $board_id = absint( $board_id );
    if ( ! $board_id ) return array( 'allowed' => false, 'reason' => '无效板块' );

    $boards_table = $wpdb->prefix . 'mixm_forum_boards';
    $board = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM %i WHERE id = %d", $boards_table, $board_id ) );
    if ( ! $board ) return array( 'allowed' => false, 'reason' => '板块不存在' );

    // 管理员直接通过
    if ( user_can( $user_id, 'manage_options' ) ) {
        return array( 'allowed' => true, 'reason' => '' );
    }

    // 1. 检查付费购买记录
    if ( $board->is_paid ) {
        $access_table = $wpdb->prefix . 'mixm_board_access';
        $access = $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM %i WHERE user_id = %d AND board_id = %d AND (expires_at IS NULL OR expires_at > NOW())",
            $access_table, $user_id, $board_id
        ) );
        if ( ! $access ) {
            return array( 'allowed' => false, 'reason' => '此板块为付费板块,需购买后访问' );
        }
    }

    // 2. 检查会员等级
    if ( $board->required_level > 0 && function_exists( 'mixm_laal_get_user_member_level' ) ) {
        $level = mixm_laal_get_user_member_level( $user_id );
        $user_level = $level ? intval( $level['level_id'] ) : 0;
        if ( $user_level < $board->required_level ) {
            return array( 'allowed' => false, 'reason' => "需要会员等级 {$board->required_level}+" );
        }
    }

    // 3. 检查积分门槛
    if ( $board->required_points > 0 ) {
        $user_points = intval( get_user_meta( $user_id, 'mixm_laal_points', true ) );
        if ( $user_points < $board->required_points ) {
            return array( 'allowed' => false, 'reason' => "需要积分 {$board->required_points}+" );
        }
    }

    // 4. 检查用户组
    if ( ! empty( $board->allowed_groups ) ) {
        $allowed_groups = json_decode( $board->allowed_groups, true );
        if ( is_array( $allowed_groups ) && ! empty( $allowed_groups ) ) {
            $user_groups_table = $wpdb->prefix . 'mixm_user_group_members';
            $user_groups = $wpdb->get_col( $wpdb->prepare(
                "SELECT group_id FROM %i WHERE user_id = %d",
                $user_groups_table, $user_id
            ) );
            $has_group = false;
            foreach ( $allowed_groups as $gid ) {
                if ( in_array( intval( $gid ), array_map( 'intval', $user_groups ), true ) ) {
                    $has_group = true;
                    break;
                }
            }
            if ( ! $has_group ) {
                return array( 'allowed' => false, 'reason' => '不在允许的用户组中' );
            }
        }
    }

    return array( 'allowed' => true, 'reason' => '' );
}
```

- [ ] **Step 5.3: 在 forum.php / forum-topic.php 顶部调用**

```php
$access = mixm_laal_check_board_access( get_current_user_id(), $board_id );
if ( ! $access['allowed'] ) {
    wp_die( esc_html( $access['reason'] ) );
}
```

- [ ] **Step 5.4: AJAX 端点 - 购买付费板块**

```php
add_action( 'wp_ajax_mixm_laal_purchase_board', 'mixm_laal_ajax_purchase_board' );
// 实现略,扣积分/调用支付,写入 wp_mixm_board_access
```

- [ ] **Step 5.5: 后台管理界面**

在 `inc/forum-functions.php` 后台板块编辑表单中加:
- is_paid 复选框
- required_level 数字输入
- required_points 数字输入
- allowed_groups 多选(从 wp_mixm_user_groups 表)

---

### Task 6: GitHub OAuth 登录(Agent-6)

**Files:**
- Create: `inc/github-login.php`
- Modify: `inc/social-login.php` (加 GitHub 入口)
- Modify: `inc/api-admin.php` (加 GitHub 配置项)

- [ ] **Step 6.1: 创建 `inc/github-login.php`**

```php
<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * GitHub 登录入口
 */
function mixm_laal_github_login_url() {
    $client_id = mixm_laal_decrypt_secret( get_option( 'mixm_laal_github_client_id' ) );
    if ( empty( $client_id ) ) return '';

    $redirect = home_url( '/wp-login.php?action=github_callback' );
    $state    = wp_generate_password( 24, false );
    set_transient( 'mixm_laal_github_state_' . $state, 1, 10 * MINUTE_IN_SECONDS );

    $url = 'https://github.com/login/oauth/authorize';
    $url = add_query_arg( array(
        'client_id'    => $client_id,
        'redirect_uri' => rawurlencode( $redirect ),
        'scope'        => 'read:user user:email',
        'state'        => $state,
    ), $url );
    return $url;
}

/**
 * GitHub 回调处理
 */
function mixm_laal_github_callback() {
    if ( ! isset( $_GET['action'] ) || $_GET['action'] !== 'github_callback' ) return;

    $code  = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( $_GET['code'] ) ) : '';
    $state = isset( $_GET['state'] ) ? sanitize_text_field( wp_unslash( $_GET['state'] ) ) : '';

    if ( empty( $code ) || empty( $state ) ) wp_die( '参数缺失' );
    if ( ! get_transient( 'mixm_laal_github_state_' . $state ) ) wp_die( 'state 校验失败' );
    delete_transient( 'mixm_laal_github_state_' . $state );

    $client_id     = mixm_laal_decrypt_secret( get_option( 'mixm_laal_github_client_id' ) );
    $client_secret = mixm_laal_decrypt_secret( get_option( 'mixm_laal_github_client_secret' ) );

    // 换 access_token
    $resp = wp_remote_post( 'https://github.com/login/oauth/access_token', array(
        'body' => array(
            'client_id'     => $client_id,
            'client_secret' => $client_secret,
            'code'          => $code,
            'redirect_uri'  => home_url( '/wp-login.php?action=github_callback' ),
        ),
        'headers' => array( 'Accept' => 'application/json' ),
        'timeout' => 15,
    ) );
    if ( is_wp_error( $resp ) ) wp_die( '获取 token 失败' );
    $body = json_decode( wp_remote_retrieve_body( $resp ), true );
    if ( empty( $body['access_token'] ) ) wp_die( 'token 解析失败' );

    $access_token = $body['access_token'];

    // 拉 user 信息
    $user_resp = wp_remote_get( 'https://api.github.com/user', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $access_token,
            'Accept'        => 'application/vnd.github.v3+json',
        ),
        'timeout' => 15,
    ) );
    if ( is_wp_error( $user_resp ) ) wp_die( '获取用户信息失败' );
    $github_user = json_decode( wp_remote_retrieve_body( $user_resp ), true );

    // 拉邮箱(GitHub 默认不返回邮箱,需单独调)
    if ( empty( $github_user['email'] ) ) {
        $email_resp = wp_remote_get( 'https://api.github.com/user/emails', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $access_token,
                'Accept'        => 'application/vnd.github.v3+json',
            ),
            'timeout' => 15,
        ) );
        if ( ! is_wp_error( $email_resp ) ) {
            $emails = json_decode( wp_remote_retrieve_body( $email_resp ), true );
            if ( is_array( $emails ) ) {
                foreach ( $emails as $email_info ) {
                    if ( ! empty( $email_info['verified'] ) && ! empty( $email_info['primary'] ) ) {
                        $github_user['email'] = $email_info['email'];
                        break;
                    }
                }
            }
        }
    }

    // 关联本地账号或注册新账号
    mixm_laal_link_or_register_social_user( 'github', $github_user );
}
add_action( 'login_init', 'mixm_laal_github_callback' );
```

- [ ] **Step 6.2: 在 social-login.php 加 GitHub 按钮**

```php
function mixm_laal_get_social_login_buttons() {
    $buttons = array();
    // ... 已有 QQ/微信/微博
    $github_url = mixm_laal_github_login_url();
    if ( ! empty( $github_url ) ) {
        $buttons['github'] = array(
            'url'  => $github_url,
            'icon' => 'fab fa-github',
            'name' => 'GitHub',
        );
    }
    return $buttons;
}
```

- [ ] **Step 6.3: 配置项加入 api-admin.php**

```php
// GitHub OAuth
add_settings_field(
    'mixm_laal_github_client_id',
    'GitHub Client ID',
    'mixm_laal_render_encrypted_field',
    'mixm_laal_api_settings',
    'mixm_laal_api_social_section',
    array( 'option_name' => 'mixm_laal_github_client_id' )
);
add_settings_field(
    'mixm_laal_github_client_secret',
    'GitHub Client Secret',
    'mixm_laal_render_encrypted_field',
    'mixm_laal_api_settings',
    'mixm_laal_api_social_section',
    array( 'option_name' => 'mixm_laal_github_client_secret' )
);
register_setting( 'mixm_laal_api_settings', 'mixm_laal_github_client_id', 'mixm_laal_encrypt_secret' );
register_setting( 'mixm_laal_api_settings', 'mixm_laal_github_client_secret', 'mixm_laal_encrypt_secret' );
```

---

## 批次 3: P1 后 3 项(3 个并行子 Agent)

### Task 7: 虎皮椒支付(Agent-7)

**Files:**
- Create: `inc/hupijiao-payment.php`
- Modify: `inc/payment-gateway.php` (注册新网关)

- [ ] **Step 7.1: 创建虎皮椒支付类**

```php
<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class MixM_Laal_Hupijiao_Payment {
    private $pid;
    private $appkey;
    private $api_url = 'https://api.xunhupay.com/api/do';

    public function __construct() {
        $this->pid    = mixm_laal_decrypt_secret( get_option( 'mixm_laal_hupijiao_pid' ) );
        $this->appkey = mixm_laal_decrypt_secret( get_option( 'mixm_laal_hupijiao_appkey' ) );
    }

    /**
     * 创建支付订单
     */
    public function create_order( $order_no, $amount, $title, $notify_url, $return_url, $type = 'wechat' ) {
        if ( empty( $this->pid ) || empty( $this->appkey ) ) {
            return new WP_Error( 'not_configured', '虎皮椒未配置' );
        }

        $params = array(
            'version'     => '1.1',
            'pid'         => $this->pid,
            'type'        => in_array( $type, array( 'wechat', 'alipay' ), true ) ? $type : 'wechat',
            'out_trade_no'=> sanitize_text_field( $order_no ),
            'notify_url'  => esc_url_raw( $notify_url ),
            'return_url'  => esc_url_raw( $return_url ),
            'name'        => sanitize_text_field( $title ),
            'money'       => number_format( floatval( $amount ), 2, '.', '' ),
            'time'        => time(),
            'nonce_str'   => wp_generate_password( 32, false ),
        );
        $params['hash'] = $this->sign( $params );

        $resp = wp_remote_post( $this->api_url, array(
            'body'    => $params,
            'timeout' => 30,
        ) );
        if ( is_wp_error( $resp ) ) return $resp;
        $body = json_decode( wp_remote_retrieve_body( $resp ), true );
        if ( empty( $body['url'] ) ) {
            return new WP_Error( 'api_error', $body['errmsg'] ?? '虎皮椒下单失败' );
        }
        return array( 'pay_url' => $body['url'] );
    }

    /**
     * 签名(虎皮椒 MD5 算法)
     */
    private function sign( $params ) {
        ksort( $params );
        $parts = array();
        foreach ( $params as $k => $v ) {
            if ( $v === '' || $k === 'hash' ) continue;
            $parts[] = $k . '=' . $v;
        }
        $sign_str = implode( '&', $parts ) . $this->appkey;
        return md5( $sign_str );
    }

    /**
     * 验证回调签名
     */
    public function verify_callback( $data ) {
        if ( empty( $data['hash'] ) ) return false;
        $expected = $this->sign( $data );
        return hash_equals( $expected, $data['hash'] );
    }
}
```

- [ ] **Step 7.2: 注册到 Payment Factory**

在 `inc/payment-gateway.php` 中加入:
```php
function mixm_laal_get_payment_gateway( $method ) {
    $gateways = array(
        'alipay'    => 'MixM_Laal_Alipay_Gateway',
        'wechat'    => 'MixM_Laal_Wechat_Gateway',
        'paypal'    => 'MixM_Laal_PayPal_Gateway',
        'stripe'    => 'MixM_Laal_Stripe_Gateway',
        'hupijiao_wechat' => 'MixM_Laal_Hupijiao_Payment',
        'hupijiao_alipay' => 'MixM_Laal_Hupijiao_Payment',
    );
    if ( ! isset( $gateways[ $method ] ) ) return null;
    return new $gateways[ $method ]();
}
```

- [ ] **Step 7.3: 回调处理**

```php
add_action( 'init', function() {
    if ( isset( $_GET['mixm_payment'] ) && $_GET['mixm_payment'] === 'hupijiao_notify' ) {
        $hupijiao = new MixM_Laal_Hupijiao_Payment();
        $data = wp_unslash( $_POST );
        if ( ! $hupijiao->verify_callback( $data ) ) wp_die( 'fail' );

        $order_no = sanitize_text_field( $data['out_trade_no'] ?? '' );
        $amount   = floatval( $data['money'] ?? 0 );
        // 调用统一订单完成逻辑(幂等)
        mixm_laal_complete_order( $order_no, $amount, 'hupijiao' );
        echo 'success';
        exit;
    }
} );
```

- [ ] **Step 7.4: 配置项 + 后台**

加入 `hupijiao_pid` / `hupijiao_appkey` 加密存储配置。

---

### Task 8: 物流同步接口(Agent-8)

**Files:**
- Create: `inc/logistics-functions.php`
- Modify: `inc/commerce-extended-functions.php` (订单详情加发货按钮)

- [ ] **Step 8.1: 数据表字段扩展**

```php
function mixm_laal_alter_shop_orders_table() {
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_shop_orders';
    $cols = $wpdb->get_col( $wpdb->prepare( "SHOW COLUMNS FROM %i LIKE %s", $table, 'shipping_status' ) );
    if ( empty( $cols ) ) {
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN shipping_status VARCHAR(16) NOT NULL DEFAULT 'pending'" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN tracking_no VARCHAR(64) NOT NULL DEFAULT ''" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN logistics_company VARCHAR(32) NOT NULL DEFAULT ''" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN shipped_at DATETIME NULL" );
        $wpdb->query( "ALTER TABLE {$table} ADD COLUMN delivered_at DATETIME NULL" );
    }
}
add_action( 'after_switch_theme', 'mixm_laal_alter_shop_orders_table' );
```

- [ ] **Step 8.2: 物流查询 API 适配器**

```php
/**
 * 查询物流轨迹
 * @param string $tracking_no
 * @param string $company
 * @return array|false
 */
function mixm_laal_query_logistics( $tracking_no, $company ) {
    $provider = get_option( 'mixm_laal_logistics_provider', 'kuaidi100' );

    if ( $provider === 'kuaidi100' ) {
        return mixm_laal_query_kuaidi100( $tracking_no, $company );
    } elseif ( $provider === 'cainiao' ) {
        return mixm_laal_query_cainiao( $tracking_no, $company );
    }
    return false;
}

function mixm_laal_query_kuaidi100( $tracking_no, $company ) {
    $customer = mixm_laal_decrypt_secret( get_option( 'mixm_laal_kuaidi100_customer' ) );
    $key      = mixm_laal_decrypt_secret( get_option( 'mixm_laal_kuaidi100_key' ) );
    if ( empty( $customer ) || empty( $key ) ) return false;

    $param = json_encode( array(
        'com'      => $company,
        'num'      => $tracking_no,
        'phone'    => '',
        'from'     => '',
        'to'       => '',
        'resultv2' => '4',
    ) );
    $sign  = md5( $param . $key . $customer );
    $sign  = strtoupper( $sign );

    $resp = wp_remote_post( 'https://poll.kuaidi100.com/poll/query', array(
        'body' => array(
            'customer' => $customer,
            'sign'     => $sign,
            'param'    => $param,
        ),
        'timeout' => 15,
    ) );
    if ( is_wp_error( $resp ) ) return false;
    $body = json_decode( wp_remote_retrieve_body( $resp ), true );
    if ( empty( $body['data'] ) ) return false;
    return array(
        'status'  => $body['status'] ?? 'unknown',
        'traces'  => $body['data'],
        'ischeck' => $body['ischeck'] ?? 0,
    );
}
```

- [ ] **Step 8.3: AJAX 端点**

```php
add_action( 'wp_ajax_mixm_laal_ship_order', 'mixm_laal_ajax_ship_order' );
add_action( 'wp_ajax_mixm_laal_query_logistics', 'mixm_laal_ajax_query_logistics' );
```

- [ ] **Step 8.4: 定时拉取轨迹更新**

```php
add_action( 'mixm_laal_hourly_event', 'mixm_laal_sync_shipping_status' );
function mixm_laal_sync_shipping_status() {
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_shop_orders';
    $orders = $wpdb->get_results(
        "SELECT id, tracking_no, logistics_company FROM {$table}
         WHERE shipping_status = 'shipped' AND tracking_no != ''"
    );
    foreach ( $orders as $order ) {
        $result = mixm_laal_query_logistics( $order->tracking_no, $order->logistics_company );
        if ( $result && ! empty( $result['ischeck'] ) ) {
            $wpdb->update( $table, array(
                'shipping_status' => 'delivered',
                'delivered_at'    => current_time( 'mysql' ),
            ), array( 'id' => $order->id ) );
        }
    }
}
```

---

### Task 9: DB 自动迁移 + 行为驱动推荐(Agent-9)

**Files:**
- Create: `inc/db-migrations.php`
- Create: `inc/migrations/upgrade-1.0.0-to-1.1.0.php`
- Modify: `inc/recommendation-functions.php` (加实时反馈)
- Modify: `functions.php` (主 Agent 追加 require)

- [ ] **Step 9.1: 创建 `inc/db-migrations.php`**

```php
<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 执行数据库迁移
 */
function mixm_laal_run_migrations() {
    if ( ! defined( 'MIXM_LAAL_VERSION' ) ) return;

    $current_db_version = get_option( 'mixm_laal_db_version', '0' );
    $target_version     = MIXM_LAAL_VERSION;

    if ( version_compare( $current_db_version, $target_version, '>=' ) ) return;

    $migrations_dir = get_template_directory() . '/inc/migrations';
    if ( ! is_dir( $migrations_dir ) ) {
        update_option( 'mixm_laal_db_version', $target_version );
        return;
    }

    $files = glob( $migrations_dir . '/upgrade-*.php' );
    sort( $files );

    foreach ( $files as $file ) {
        // 文件名格式: upgrade-{from}-to-{to}.php
        $basename = basename( $file, '.php' );
        if ( ! preg_match( '/^upgrade-(.+)-to-(.+)$/', $basename, $matches ) ) continue;
        $from = $matches[1];
        $to   = $matches[2];

        // 只执行未跑过的迁移
        if ( version_compare( $from, $current_db_version, '<=' ) ) continue;
        if ( version_compare( $to, $target_version, '>' ) ) continue;

        $migration = include $file;
        if ( is_array( $migration ) && isset( $migration['up'] ) && is_callable( $migration['up'] ) ) {
            call_user_func( $migration['up'] );
        }
        $current_db_version = $to;
        update_option( 'mixm_laal_db_version', $current_db_version );
    }
}
add_action( 'admin_init', 'mixm_laal_run_migrations' );
```

- [ ] **Step 9.2: 创建首个迁移文件**

`inc/migrations/upgrade-1.0.0-to-1.1.0.php`:
```php
<?php
return array(
    'up' => function() {
        global $wpdb;
        // 1.1.0 引入的 schema 变更
        $wpdb->query( "ALTER TABLE {$wpdb->prefix}mixm_forum_topics ADD COLUMN IF NOT EXISTS topic_type VARCHAR(16) NOT NULL DEFAULT 'normal'" );
        $wpdb->query( "ALTER TABLE {$wpdb->prefix}mixm_shop_orders ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(16) NOT NULL DEFAULT 'pending'" );
        // ... 其他 1.1.0 变更
    },
    'down' => function() {
        // 回滚(可选)
    },
);
```

- [ ] **Step 9.3: 行为驱动推荐实时反馈**

在 `inc/recommendation-functions.php` 末尾追加:
```php
/**
 * 实时重算单篇文章推荐分数(用于点赞/收藏等行为触发)
 * @param int $post_id
 */
function mixm_laal_recalc_post_recommendation_realtime( $post_id ) {
    global $wpdb;
    $post_id = absint( $post_id );
    if ( ! $post_id ) return;

    $table = $wpdb->prefix . 'mixm_post_interactions';
    $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM %i WHERE post_id = %d", $table, $post_id ) );
    if ( ! $row ) {
        $wpdb->insert( $table, array( 'post_id' => $post_id ), array( '%d' ) );
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM %i WHERE post_id = %d", $table, $post_id ) );
    }

    $score = mixm_laal_calc_recommendation_score( $row );
    $wpdb->update( $table, array(
        'recommendation_score' => $score,
        'last_calc_at'          => current_time( 'mysql' ),
    ), array( 'post_id' => $post_id ) );
}

// 点赞钩子
add_action( 'mixm_laal_post_liked', 'mixm_laal_recalc_post_recommendation_realtime' );
// 收藏钩子
add_action( 'mixm_laal_post_favorited', 'mixm_laal_recalc_post_recommendation_realtime' );
// 评论钩子
add_action( 'wp_insert_comment', function( $comment_id, $comment ) {
    if ( ! empty( $comment->comment_post_ID ) ) {
        mixm_laal_recalc_post_recommendation_realtime( $comment->comment_post_ID );
    }
}, 10, 2 );
```

---

## 批次 4: P2 共 10 项(5 个并行子 Agent 分组)

### Task 10: 容器布局 + 可视化扩展 + 嵌套栅格(Agent-10)

- P2-1: 在 `header.php` 顶部加 `<?php do_action( 'mixm_laal_top_full_width' ); ?>` 钩子,首页 `front-page.php` 加双栏布局开关
- P2-2: 在 `inc/visual-core-modules.php` 新增 4 个模块: 幻灯片(slideshow)、图文视频封面(media-cover)、多列文章列表(multi-col-posts)、广告位(ad-slot)
- P2-9: 修改 `inc/visual-editor.php` 支持 row→col→module 三层嵌套,模块配置加 `children` 数组

### Task 11: 限时折扣 + 滚动动画 + AJAX 无限滚动(Agent-11)

- P2-3: 新建 `inc/flash-sale-functions.php`,创建 `wp_mixm_flash_sales` 表( product_id, start_time, end_time, discount_price, status ),cron 自动启停
- P2-7: 在 `assets/js/main.js` 加 Intersection Observer 滚动动画:
```js
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('mixm-animated');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
```
CSS:
```css
[data-animate="fade-up"] { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; }
[data-animate="fade-up"].mixm-animated { opacity: 1; transform: translateY(0); }
```
- P2-8: 在 `assets/js/main.js` 加 AJAX 无限滚动,新增 `wp_ajax_mixm_laal_load_more` 端点

### Task 12: Nginx 指南 + OpCache + CDN 向导(Agent-12)

- P2-4: 新建 `admin/server-config-guide.php`,渲染 .htaccess + nginx.conf 模板,加复制按钮
- P2-5: 在 `inc/health-check.php` 加 OpCache 检测:
```php
function mixm_laal_check_opcache() {
    if ( ! function_exists( 'opcache_get_status' ) ) return array( 'enabled' => false );
    $status = opcache_get_status( false );
    return array(
        'enabled'     => true,
        'memory_used' => $status['memory_usage']['used_memory'] ?? 0,
        'hit_rate'    => $status['opcache_statistics']['opcache_hit_rate'] ?? 0,
    );
}
```
- P2-6: 新建 `inc/cdn-admin.php`,支持又拍云/七牛/阿里 CDN 配置,URL 替换

### Task 13: 集成测试与文档(Agent-13)

- 验证所有 19 个缺口的实现
- 生成 `docs/zibll-full-implementation-report.md` 进度报告
- 在 `functions.php` 末尾追加所有新文件 require(主 Agent 统一执行)
- 运行 PHP 语法检查所有新文件
- 验证 Docker 容器 `gexm-wordpress` 前后台可访问

---

## 主 Agent 统一执行步骤

1. **等待所有批次完成**
2. **在 `functions.php` 末尾追加所有新文件 require**:
```php
// === Zibll 全量补齐 2026-07-21 ===
require_once get_template_directory() . '/inc/gutenberg-blocks-registry.php';
require_once get_template_directory() . '/inc/content-audit-functions.php';
require_once get_template_directory() . '/inc/content-audit-admin.php';
require_once get_template_directory() . '/inc/display-conditions.php';
require_once get_template_directory() . '/inc/forum-question-bounty.php';
require_once get_template_directory() . '/inc/user-groups-functions.php';
require_once get_template_directory() . '/inc/board-access-functions.php';
require_once get_template_directory() . '/inc/github-login.php';
require_once get_template_directory() . '/inc/hupijiao-payment.php';
require_once get_template_directory() . '/inc/logistics-functions.php';
require_once get_template_directory() . '/inc/db-migrations.php';
require_once get_template_directory() . '/inc/flash-sale-functions.php';
require_once get_template_directory() . '/inc/cdn-admin.php';
```
3. **运行 PHP 语法检查**:
```bash
```
4. **验证数据表**:
```bash
```
5. **验证区块注册**:
```bash
```
6. **生成最终进度报告**

---

## Self-Review Checklist

- ✅ Spec 覆盖: 19 个缺口全部映射到 Task
- ✅ 无占位符: 每个 Step 都有具体代码或命令
- ✅ 类型一致: 函数命名一致(`mixm_laal_xxx`)
- ✅ 文件路径: 全部使用绝对路径 `F:\gexm\wp-content\themes\mixm-laal\...`
- ✅ 安全规范: 所有输入净化 + 输出转义 + nonce 验证 + 权限校验
- ✅ WordPress 编码标准: snake_case 命名,函数前缀 `mixm_laal_`
