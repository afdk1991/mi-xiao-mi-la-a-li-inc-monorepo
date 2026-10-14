<?php
/**
 * slStyle 主题核心函数
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SLSTYLE_VERSION', '1.0.0' );

/**
 * 主题初始化：注册菜单、侧边栏、主题特性
 */
function slstyle_setup() {
	// 多语言
	load_theme_textdomain( 'slstyle', get_template_directory() . '/languages' );

	// 基础特性
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array(
		'comment-list', 'comment-form', 'search-form', 'gallery', 'caption', 'style', 'script',
	) );
	add_theme_support( 'custom-logo', array(
		'height'      => 60,
		'width'       => 200,
		'flex-height' => true,
		'flex-width'  => true,
	) );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'customize-selective-refresh-widgets' );

	// 内容宽度
	$GLOBALS['content_width'] = 760;

	// 菜单
	register_nav_menus( array(
		'primary' => __( '主导航', 'slstyle' ),
		'footer'  => __( '页脚导航', 'slstyle' ),
	) );

	// 侧边栏
	register_sidebar( array(
		'name'          => __( '文章侧边栏', 'slstyle' ),
		'id'            => 'sidebar-1',
		'description'   => __( '首页与文章列表/详情页右侧小工具区', 'slstyle' ),
		'before_widget' => '<div class="widget %2$s">',
		'after_widget'  => '</div>',
		'before_title'  => '<h3 class="widget-title">',
		'after_title'   => '</h3>',
	) );
	for ( $i = 1; $i <= 3; $i++ ) {
		register_sidebar( array(
			'name'          => sprintf( __( '页脚小工具 %d', 'slstyle' ), $i ),
			'id'            => 'footer-' . $i,
			'before_widget' => '<div class="widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h3 class="widget-title">',
			'after_title'   => '</h3>',
		) );
	}
}
add_action( 'after_setup_theme', 'slstyle_setup' );

/**
 * 主导航回退：未设置菜单时显示页面列表（输出纯 ul 以匹配样式）
 */
function slstyle_page_menu() {
	$pages = get_pages();
	echo '<ul>';
	foreach ( $pages as $p ) {
		printf(
			'<li><a href="%s">%s</a></li>',
			esc_url( get_permalink( $p->ID ) ),
			esc_html( $p->post_title )
		);
	}
	echo '</ul>';
}

/**
 * 资源队列
 */
function slstyle_enqueue() {
	$dir = get_template_directory_uri();
	wp_enqueue_style( 'slstyle-style', get_stylesheet_uri(), array(), SLSTYLE_VERSION );
	wp_enqueue_script( 'slstyle-main', $dir . '/assets/js/main.js', array( 'jquery' ), SLSTYLE_VERSION, true );

	// 把自定义主色注入到样式中（优先级高于 style.css 的默认值）
	$primary = get_theme_mod( 'slstyle_primary_color', '#1e88e5' );
	$css = ":root{--primary:{$primary};--primary-dark:" . slstyle_darken( $primary, 12 ) . ';' .
	       '--primary-light:' . slstyle_lighten( $primary, 90 ) . ';}';
	wp_add_inline_style( 'slstyle-style', $css );
}
add_action( 'wp_enqueue_scripts', 'slstyle_enqueue' );

/**
 * 颜色工具：将 #hex 调暗/调亮
 */
function slstyle_hex2rgb( $hex ) {
	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) === 3 ) {
		$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
	}
	return array(
		'r' => hexdec( substr( $hex, 0, 2 ) ),
		'g' => hexdec( substr( $hex, 2, 2 ) ),
		'b' => hexdec( substr( $hex, 4, 2 ) ),
	);
}
function slstyle_darken( $hex, $percent ) {
	$rgb = slstyle_hex2rgb( $hex );
	$f   = 1 - $percent / 100;
	return sprintf( '#%02x%02x%02x', $rgb['r'] * $f, $rgb['g'] * $f, $rgb['b'] * $f );
}
function slstyle_lighten( $hex, $percent ) {
	$rgb = slstyle_hex2rgb( $hex );
	$t   = $percent / 100;
	return sprintf( '#%02x%02x%02x',
		$rgb['r'] + ( 255 - $rgb['r'] ) * $t,
		$rgb['g'] + ( 255 - $rgb['g'] ) * $t,
		$rgb['b'] + ( 255 - $rgb['b'] ) * $t
	);
}

/**
 * 自定义器
 */
require get_template_directory() . '/inc/customizer.php';

/**
 * 工具：获取文章缩略图地址（含占位）
 */
function slstyle_thumb( $size = 'large' ) {
	if ( has_post_thumbnail() ) {
		return get_the_post_thumbnail_url( null, $size );
	}
	// 无图时用主题内置 SVG 占位（依主色生成）
	$primary = get_theme_mod( 'slstyle_primary_color', '#1e88e5' );
	$svg     = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">' .
		'<rect width="800" height="450" fill="' . $primary . '" opacity="0.12"/>' .
		'<text x="50%" y="50%" fill="' . $primary . '" font-size="42" font-family="sans-serif" ' .
		'text-anchor="middle" dominant-baseline="middle">slStyle</text></svg>';
	return 'data:image/svg+xml;utf8,' . rawurlencode( $svg );
}

/**
 * 首页滑块文章（置顶优先，其次指定分类）
 */
function slstyle_slider_posts( $count = 5 ) {
	$cat = (int) get_theme_mod( 'slstyle_slider_cat', 0 );

	$sticky = get_option( 'sticky_posts' );
	if ( ! empty( $sticky ) ) {
		return new WP_Query( array(
			'post__in'            => $sticky,
			'ignore_sticky_posts' => 1,
			'posts_per_page'      => $count,
		) );
	}
	$args = array( 'posts_per_page' => $count );
	if ( $cat > 0 ) {
		$args['cat'] = $cat;
	}
	return new WP_Query( $args );
}

/**
 * 摘要（去除短代码/标签）
 */
function slstyle_excerpt( $length = 80 ) {
	$excerpt = get_the_excerpt();
	if ( ! $excerpt ) {
		$excerpt = wp_strip_all_tags( get_the_content(), true );
	}
	$excerpt = wp_trim_words( $excerpt, $length, '…' );
	return $excerpt;
}

/**
 * 估算阅读时长
 */
function slstyle_read_time() {
	$content = get_post_field( 'post_content', get_the_ID() );
	$words   = mb_strlen( wp_strip_all_tags( $content ), 'UTF-8' );
	$mins    = max( 1, ceil( $words / 350 ) );
	return sprintf( esc_html__( '%d 分钟阅读', 'slstyle' ), $mins );
}

/**
 * 添加默认小工具（首次启用时）
 */
function slstyle_default_widgets() {
	$sidebars = get_option( 'sidebars_widgets' );
	if ( ! empty( $sidebars['sidebar-1'] ) ) {
		return; // 已配置过，跳过
	}
	$sidebars['sidebar-1'] = array( 'search-1', 'recent-posts-1', 'categories-1', 'tag_cloud-1' );
	$sidebars['footer-1']  = array( 'text-1' );
	$sidebars['footer-2']  = array( 'recent-posts-2' );
	$sidebars['footer-3']  = array( 'categories-2' );
	update_option( 'sidebars_widgets', $sidebars );

	// 初始化小工具选项
	update_option( 'widget_search', array( 1 => array( 'title' => '' ), '_multiwidget' => 1 ) );
	update_option( 'widget_recent-posts', array( 1 => array( 'title' => '最新文章', 'number' => 5 ), '_multiwidget' => 1 ) );
	update_option( 'widget_categories', array( 1 => array( 'title' => '文章分类', 'count' => 1 ), '_multiwidget' => 1 ) );
	update_option( 'widget_tag_cloud', array( 1 => array( 'title' => '热门标签', 'count' => 20 ), '_multiwidget' => 1 ) );
	update_option( 'widget_text', array( 1 => array( 'title' => '关于我们', 'text' => 'slStyle 是一个简洁现代的 WordPress 主题，聚焦卡片网格布局与流畅的阅读体验。' ), '_multiwidget' => 1 ) );
}
add_action( 'after_switch_theme', 'slstyle_default_widgets' );

/* =========================================================
   增强功能：浏览量 / 点赞收藏 / 面包屑 / 深色模式 / 用户中心
   （对齐 slStyle 风格，从零原创实现）
   ========================================================= */

/**
 * AJAX 本地化（供 main.js 调用 admin-ajax）
 */
function slstyle_ajax_localize() {
	wp_localize_script( 'slstyle-main', 'slstyle_ajax', array(
		'url'   => admin_url( 'admin-ajax.php' ),
		'nonce' => wp_create_nonce( 'slstyle_nonce' ),
	) );
}
add_action( 'wp_enqueue_scripts', 'slstyle_ajax_localize', 20 );

/**
 * 文章浏览量统计（详情页访问 +1，1 小时内同访客不重复计）
 */
add_action( 'template_redirect', 'slstyle_count_views' );
function slstyle_count_views() {
	if ( is_singular( 'post' ) ) {
		$id = get_the_ID();
		$ck = 'slstyle_views_' . $id;
		if ( empty( $_COOKIE[ $ck ] ) ) {
			$n = (int) get_post_meta( $id, 'slstyle_views', true ) + 1;
			update_post_meta( $id, 'slstyle_views', $n );
			$path = COOKIEPATH ? COOKIEPATH : '/';
			$dom  = COOKIE_DOMAIN ? COOKIE_DOMAIN : '';
			setcookie( $ck, '1', time() + 3600, $path, $dom );
		}
	}
}
function slstyle_post_views( $post_id = null ) {
	$post_id = $post_id ?: get_the_ID();
	return (int) get_post_meta( $post_id, 'slstyle_views', true );
}

/**
 * 点赞（游客/登录均可，cookie 防重复；meta 计总数）
 */
add_action( 'wp_ajax_slstyle_like', 'slstyle_ajax_like' );
add_action( 'wp_ajax_nopriv_slstyle_like', 'slstyle_ajax_like' );
function slstyle_ajax_like() {
	check_ajax_referer( 'slstyle_nonce', 'nonce' );
	$pid = (int) ( $_POST['post_id'] ?? 0 );
	if ( ! $pid ) { wp_send_json_error(); }
	$ck    = 'slstyle_like_' . $pid;
	$likes = (int) get_post_meta( $pid, 'slstyle_likes', true );
	$path  = COOKIEPATH ? COOKIEPATH : '/';
	$dom   = COOKIE_DOMAIN ? COOKIE_DOMAIN : '';
	if ( ! empty( $_COOKIE[ $ck ] ) ) {
		$likes = max( 0, $likes - 1 );
		setcookie( $ck, '', time() - 3600, $path, $dom );
		$state = false;
	} else {
		$likes++;
		setcookie( $ck, '1', time() + YEAR_IN_SECONDS, $path, $dom );
		$state = true;
	}
	update_post_meta( $pid, 'slstyle_likes', $likes );
	wp_send_json_success( array( 'likes' => $likes, 'liked' => $state ) );
}
function slstyle_likes_count( $pid = null ) {
	$pid = $pid ?: get_the_ID();
	return (int) get_post_meta( $pid, 'slstyle_likes', true );
}
function slstyle_is_liked( $pid = null ) {
	$pid = $pid ?: get_the_ID();
	return ! empty( $_COOKIE[ 'slstyle_like_' . $pid ] );
}

/**
 * 收藏（需登录，存用户 meta）
 */
add_action( 'wp_ajax_slstyle_fav', 'slstyle_ajax_fav' );
function slstyle_ajax_fav() {
	check_ajax_referer( 'slstyle_nonce', 'nonce' );
	if ( ! is_user_logged_in() ) { wp_send_json_error( array( 'msg' => '请先登录' ) ); }
	$pid = (int) ( $_POST['post_id'] ?? 0 );
	if ( ! $pid ) { wp_send_json_error(); }
	$uid  = get_current_user_id();
	$favs = (array) get_user_meta( $uid, 'slstyle_favs', true );
	if ( in_array( $pid, $favs, true ) ) {
		$favs  = array_values( array_diff( $favs, array( $pid ) ) );
		$state = false;
	} else {
		$favs[] = $pid;
		$state  = true;
	}
	update_user_meta( $uid, 'slstyle_favs', $favs );
	wp_send_json_success( array( 'faved' => $state ) );
}
function slstyle_is_faved( $pid = null ) {
	$pid = $pid ?: get_the_ID();
	if ( ! is_user_logged_in() ) { return false; }
	return in_array( $pid, (array) get_user_meta( get_current_user_id(), 'slstyle_favs', true ), true );
}

/**
 * 面包屑
 */
function slstyle_breadcrumbs() {
	if ( is_front_page() ) { return; }
	echo '<nav class="breadcrumbs" aria-label="面包屑">';
	echo '<a href="' . esc_url( home_url( '/' ) ) . '">首页</a><span class="sep">/</span>';
	if ( is_single() ) {
		$cats = get_the_category();
		if ( $cats ) {
			echo '<a href="' . esc_url( get_category_link( $cats[0]->term_id ) ) . '">' . esc_html( $cats[0]->name ) . '</a><span class="sep">/</span>';
		}
		echo '<span class="current">' . esc_html( get_the_title() ) . '</span>';
	} elseif ( is_category() ) {
		echo '<span class="current">' . esc_html( single_cat_title( '', false ) ) . '</span>';
	} elseif ( is_tag() ) {
		echo '<span class="current">' . esc_html( single_tag_title( '', false ) ) . '</span>';
	} elseif ( is_search() ) {
		echo '<span class="current">搜索：' . esc_html( get_search_query() ) . '</span>';
	} elseif ( is_page() ) {
		echo '<span class="current">' . esc_html( get_the_title() ) . '</span>';
	} elseif ( is_archive() ) {
		echo '<span class="current">' . esc_html( get_the_archive_title() ) . '</span>';
	}
	echo '</nav>';
}

/**
 * 深色模式：优先检测 cookie（JS 设置），否则用自定义器默认
 */
function slstyle_is_dark() {
	if ( isset( $_COOKIE['slstyle_dark'] ) ) {
		return '1' === $_COOKIE['slstyle_dark'];
	}
	return (bool) get_theme_mod( 'slstyle_dark_default', false );
}

/**
 * 用户中心：获取收藏文章 ID 列表
 */
function slstyle_get_favs( $user_id = null ) {
	$user_id = $user_id ?: get_current_user_id();
	return (array) get_user_meta( $user_id, 'slstyle_favs', true );
}

/* =========================================================
   联系表单处理（page-contact.php 使用，admin-post 端点）
   ========================================================= */
add_action( 'admin_post_nopriv_slstyle_contact', 'slstyle_contact_send' );
add_action( 'admin_post_slstyle_contact', 'slstyle_contact_send' );
function slstyle_contact_send() {
	$ref = wp_get_referer() ?: home_url( '/' );
	if ( empty( $_POST['slstyle_contact_nonce'] ) || ! wp_verify_nonce( $_POST['slstyle_contact_nonce'], 'slstyle_contact' ) ) {
		wp_redirect( add_query_arg( 'contact', 'invalid', $ref ) );
		exit;
	}
	$name  = sanitize_text_field( $_POST['cname'] ?? '' );
	$email = sanitize_email( $_POST['cemail'] ?? '' );
	$msg   = sanitize_textarea_field( $_POST['cmsg'] ?? '' );
	if ( $name && $email && $msg ) {
		$to      = get_option( 'admin_email' );
		$headers = array( 'Reply-To: ' . $email );
		wp_mail( $to, '网站联系表单：' . $name, $msg . "\n\n—— 来自 " . $name . ' <' . $email . '>', $headers );
		wp_redirect( add_query_arg( 'contact', 'sent', $ref ) );
		exit;
	}
	wp_redirect( add_query_arg( 'contact', 'empty', $ref ) );
	exit;
}

/* =========================================================
   主题页面：按 slug 解析链接 + 自动创建必备页面
   ========================================================= */

/**
 * 取首页 / 导航共用的顶级分类列表（排除默认「未分类」）
 *
 * 统一口径，避免各处硬编码分类名导致 get_cat_ID() 返回 0 而产出死链。
 *
 * @param int $number 最多取多少个。
 * @return WP_Term[]
 */
function slstyle_get_primary_categories( $number = 6 ) {
	$terms = get_categories( array(
		'taxonomy'   => 'category',
		'parent'     => 0,
		'hide_empty' => 0,
		'exclude'    => array( (int) get_option( 'default_category' ) ),
		'number'     => $number,
		'orderby'    => 'count',
		'order'      => 'DESC',
	) );
	return is_array( $terms ) ? $terms : array();
}

/**
 * 取页面永久链接——按 slug 解析（见下方 slstyle_page_url）
 *
 * 页面不存在时回落到 $fallback（默认站内首页），保证导航永不产出 404。
 *
 * @param string $slug     页面别名。
 * @param string $fallback 页面缺失时的回落地址，默认站内首页。
 * @return string 已转义安全的 URL。
 */
function slstyle_page_url( $slug, $fallback = '' ) {
	$page = get_page_by_path( $slug );
	if ( $page ) {
		return get_permalink( $page );
	}
	return $fallback ? $fallback : home_url( '/' );
}

/**
 * 主题必备页面清单（slug => 标题 / 模板）
 *
 * @return array
 */
function slstyle_required_pages() {
	return array(
		'about'       => array( 'title' => '关于我们', 'tpl' => 'page-about.php' ),
		'contact'     => array( 'title' => '联系我们', 'tpl' => 'page-contact.php' ),
		'user-center' => array( 'title' => '用户中心', 'tpl' => 'user-center.php' ),
	);
}

/**
 * 创建主题必备页面（幂等：已存在则跳过）
 */
function slstyle_default_pages() {
	foreach ( slstyle_required_pages() as $slug => $p ) {
		if ( get_page_by_path( $slug ) ) {
			continue;
		}
		wp_insert_post( array(
			'post_title'     => $p['title'],
			'post_name'      => $slug,
			'post_status'    => 'publish',
			'post_type'      => 'page',
			'page_template'  => $p['tpl'],
		) );
	}
}
add_action( 'after_switch_theme', 'slstyle_default_pages' );

/**
 * 存量站点补齐必备页面（一次性，带版本号守卫）
 *
 * after_switch_theme 只在切换主题时触发，已启用的站点不会补建后来新增的页面
 * （例如 user-center）。这里在 init 上做一次版本化补齐，跑完即写入版本号，
 * 之后每次请求只有一次 get_option 开销。
 */
function slstyle_ensure_pages_once() {
	if ( (int) get_option( 'slstyle_pages_version' ) >= 2 ) {
		return;
	}
	slstyle_default_pages();
	update_option( 'slstyle_pages_version', 2 );
}
add_action( 'init', 'slstyle_ensure_pages_once', 20 );

/**
 * 构建主导航菜单的层级结构（信息架构重构）
 * 顶级：首页 / 文章中心[分类] / 关于我们[联系我们] / 用户中心 / 演示中心[演示页]
 *  - 将「联系我们」归入「关于我们」下（父子嵌套）
 *  - 将「SaaS 聚合演示 / Sample Page」归入「演示中心」同一分组（平级归组）
 *  - 「文章中心」聚合全站顶级分类归档为下拉子菜单
 */
function slstyle_build_primary_menu( $menu_id ) {
	// 1) 首页
	wp_update_nav_menu_item( $menu_id, 0, array(
		'menu-item-title'  => __( '首页', 'slstyle' ),
		'menu-item-url'    => home_url( '/' ),
		'menu-item-status' => 'publish',
	) );

	// 2) 文章中心（父）→ 子项挂分类归档
	$articles_id = wp_update_nav_menu_item( $menu_id, 0, array(
		'menu-item-title'  => __( '文章中心', 'slstyle' ),
		'menu-item-url'    => home_url( '/' ),
		'menu-item-status' => 'publish',
	) );
	foreach ( get_categories( array( 'hide_empty' => true, 'parent' => 0 ) ) as $c ) {
		wp_update_nav_menu_item( $menu_id, 0, array(
			'menu-item-title'     => $c->name,
			'menu-item-object'    => 'category',
			'menu-item-object-id' => $c->term_id,
			'menu-item-type'      => 'taxonomy',
			'menu-item-parent-id' => $articles_id,
			'menu-item-status'    => 'publish',
		) );
	}

	// 3) 关于我们（父）→ 联系我们（子）
	$about_pg = get_page_by_path( 'about' );
	$about_id = wp_update_nav_menu_item( $menu_id, 0, array(
		'menu-item-title'     => '关于我们',
		'menu-item-object'    => 'page',
		'menu-item-object-id' => $about_pg ? $about_pg->ID : 0,
		'menu-item-type'      => 'post_type',
		'menu-item-status'    => 'publish',
	) );
	if ( $contact_pg = get_page_by_path( 'contact' ) ) {
		wp_update_nav_menu_item( $menu_id, 0, array(
			'menu-item-title'     => '联系我们',
			'menu-item-object'    => 'page',
			'menu-item-object-id' => $contact_pg->ID,
			'menu-item-type'      => 'post_type',
			'menu-item-parent-id' => $about_id,
			'menu-item-status'    => 'publish',
		) );
	}

	// 4) 用户中心（顶级）
	if ( $uc_pg = get_page_by_path( 'user-center' ) ) {
		wp_update_nav_menu_item( $menu_id, 0, array(
			'menu-item-title'     => '用户中心',
			'menu-item-object'    => 'page',
			'menu-item-object-id' => $uc_pg->ID,
			'menu-item-type'      => 'post_type',
			'menu-item-status'    => 'publish',
		) );
	}

	// 5) 演示中心（父）→ SaaS 聚合演示 / Sample Page 归入同组
	$demo_id = wp_update_nav_menu_item( $menu_id, 0, array(
		'menu-item-title'  => __( '演示中心', 'slstyle' ),
		'menu-item-url'    => home_url( '/' ),
		'menu-item-status' => 'publish',
	) );
	foreach ( array( 'dashboard', 'aggregator-shortcode', 'sample-page' ) as $slug ) {
		if ( $pg = get_page_by_path( $slug ) ) {
			wp_update_nav_menu_item( $menu_id, 0, array(
				'menu-item-title'     => $pg->post_title,
				'menu-item-object'    => 'page',
				'menu-item-object-id' => $pg->ID,
				'menu-item-type'      => 'post_type',
				'menu-item-parent-id' => $demo_id,
				'menu-item-status'    => 'publish',
			) );
		}
	}
}

/**
 * 主题启用时生成主导航菜单（幂等：已分配则跳过）
 */
function slstyle_default_menu() {
	$locations = get_theme_mod( 'nav_menu_locations' );
	if ( ! empty( $locations['primary'] ) && wp_get_nav_menu_object( $locations['primary'] ) ) {
		return; // 已分配过菜单，跳过
	}
	$menu_name = '主导航';
	$menu      = wp_get_nav_menu_object( $menu_name );
	$menu_id   = $menu ? $menu->term_id : wp_create_nav_menu( $menu_name );
	slstyle_build_primary_menu( $menu_id );
	$locations['primary'] = $menu_id;
	set_theme_mod( 'nav_menu_locations', $locations );
}
add_action( 'after_switch_theme', 'slstyle_default_menu' );

/* =========================================================
   slStyle 首页还原：body class + 卡片彩色封面占位
   ========================================================= */

/**
 * 首页添加专用 body class，便于深色导航与 Hero 样式隔离
 */
function slstyle_body_class( $classes ) {
	if ( is_front_page() ) {
		$classes[] = 'slstyle-front-hero';
	}
	return $classes;
}
add_filter( 'body_class', 'slstyle_body_class' );

/**
 * 文章卡片封面：有 Featured Image 则用之，否则返回彩色渐变 SVG 占位
 */
function slstyle_card_cover( $post_id = null ) {
	$post_id = $post_id ?: get_the_ID();
	if ( has_post_thumbnail( $post_id ) ) {
		return get_the_post_thumbnail_url( $post_id, 'large' );
	}
	$gradients = array(
		array( '#ff9a9e', '#fecfef' ),
		array( '#a18cd1', '#fbc2eb' ),
		array( '#4facfe', '#00f2fe' ),
		array( '#43e97b', '#38f9d7' ),
		array( '#fa709a', '#fee140' ),
		array( '#667eea', '#764ba2' ),
		array( '#ffecd2', '#fcb69f' ),
		array( '#84fab0', '#8fd3f4' ),
	);
	$idx = $post_id % count( $gradients );
	$g   = $gradients[ $idx ];
	$svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">' .
		'<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' .
		'<stop offset="0%" stop-color="' . $g[0] . '"/><stop offset="100%" stop-color="' . $g[1] . '"/>' .
		'</linearGradient></defs>' .
		'<rect width="800" height="450" fill="url(#g)"/>' .
		'<circle cx="680" cy="90" r="36" fill="rgba(255,255,255,.25)"/>' .
		'<circle cx="140" cy="360" r="56" fill="rgba(255,255,255,.18)"/>' .
		'</svg>';
	return 'data:image/svg+xml;utf8,' . rawurlencode( $svg );
}
