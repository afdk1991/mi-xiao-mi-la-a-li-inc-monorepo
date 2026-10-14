<?php
/**
 * WP004 站点初始化脚本（命令行执行）
 *
 * 作用：以 WordPress 官方 API 的方式完成站点开通动作——
 *   - 激活自研插件（会正常触发 register_activation_hook，建表 / 注册定时任务）
 *   - 切换到子主题
 *   - 写入固定链接结构并刷新重写规则
 *
 * 为什么不直接改数据库：
 *   直接 UPDATE wp_options 只能改状态位，不会触发 activation hook，
 *   插件的建表与定时任务注册会被跳过。这里一律走官方 API，
 *   保证与后台点击「启用」的行为完全一致。
 *
 * 用法：
 *   # WSL 内（推荐，避免跨系统数据库访问）
 *   wsl -d Ubuntu -u root -- php /mnt/d/网站全栈项目/项目004/scripts/wp-bootstrap.php
 *
 *   # Windows 侧（XAMPP PHP）
 *   C:\xampp\php\php.exe D:\网站全栈项目\项目004\scripts\wp-bootstrap.php
 *
 * 可选参数：
 *   --skip-plugins   不激活插件
 *   --skip-theme     不切换主题
 *   --skip-permalink 不设置固定链接
 *
 * @package WP004
 */

// 仅在 CLI 下允许执行，避免被 Web 访问。
if ( 'cli' !== PHP_SAPI ) {
	fwrite( STDERR, "本脚本仅限命令行执行。\n" );
	exit( 1 );
}

// WordPress 根目录（ABSPATH）的解析顺序：
//   1. 环境变量 WP004_ABSPATH —— 容器 / 非标准目录布局用这个指定
//   2. 项目根下的 public/     —— 本地开发布局（脚本在 scripts/ 里）
// 这样同一份脚本既能在宿主机跑，也能 docker exec 进容器跑。
$wp004_abspath = getenv( 'WP004_ABSPATH' );
if ( $wp004_abspath ) {
	$wp004_abspath = rtrim( str_replace( '\\', '/', (string) $wp004_abspath ), '/' );
} else {
	$wp004_abspath = rtrim( str_replace( '\\', '/', dirname( __DIR__ ) ), '/' ) . '/public';
}

if ( ! is_file( $wp004_abspath . '/wp-load.php' ) ) {
	fwrite( STDERR, "找不到 wp-load.php：{$wp004_abspath}\n请设置环境变量 WP004_ABSPATH 指向 WordPress 根目录。\n" );
	exit( 1 );
}

// CLI 场景下补齐 WordPress 引导所需的 $_SERVER 变量。
// Host / 端口优先跟随 WP_HOME（本地与容器可能不同）。
$wp004_host = '127.0.0.1:8090';
$wp004_port = '8090';
if ( getenv( 'WP004_HTTP_HOST' ) ) {
	$wp004_host = (string) getenv( 'WP004_HTTP_HOST' );
	$wp004_port = (string) ( parse_url( 'http://' . $wp004_host, PHP_URL_PORT ) ?: '80' );
}

$_SERVER['HTTP_HOST']       = $wp004_host;
$_SERVER['SERVER_NAME']     = (string) parse_url( 'http://' . $wp004_host, PHP_URL_HOST );
$_SERVER['REQUEST_METHOD']  = 'GET';
$_SERVER['REQUEST_URI']     = '/';
$_SERVER['SERVER_PORT']     = $wp004_port;
$_SERVER['SCRIPT_NAME']     = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $wp004_abspath . '/index.php';
$_SERVER['HTTPS']           = '';

// 激活插件需要 admin 侧的 plugin.php。
define( 'WP_ADMIN', true );

require_once $wp004_abspath . '/wp-load.php';

require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/theme.php';
require_once ABSPATH . 'wp-admin/includes/file.php';

$opts = getopt( '', array( 'skip-plugins', 'skip-theme', 'skip-permalink', 'demo-pages' ) );

/**
 * 输出一行状态。
 *
 * @param string $status OK / SKIP / FAIL / INFO。
 * @param string $label  项目名。
 * @param string $detail 详情。
 */
function wp004_line( $status, $label, $detail = '' ) {
	printf( "[%-4s] %-40s %s\n", $status, $label, $detail );
}

echo "============================================================\n";
echo " WP004 站点初始化\n";
echo " WordPress " . get_bloginfo( 'version' ) . " / PHP " . PHP_VERSION . "\n";
echo "============================================================\n\n";

// ---------------------------------------------------------------------------
// 1. 激活插件
// ---------------------------------------------------------------------------
if ( isset( $opts['skip-plugins'] ) ) {
	wp004_line( 'SKIP', '插件激活' );
} else {
	$plugins = array(
		'saas-aggregator/saas-aggregator.php' => 'SaaS 聚合器（自研）',
	);

	foreach ( $plugins as $plugin_file => $label ) {
		if ( ! file_exists( WP_PLUGIN_DIR . '/' . $plugin_file ) ) {
			wp004_line( 'FAIL', $label, '插件文件不存在: ' . $plugin_file );
			continue;
		}
		if ( is_plugin_active( $plugin_file ) ) {
			wp004_line( 'OK', $label, '已激活（跳过）' );
			continue;
		}
		$result = activate_plugin( $plugin_file );
		if ( is_wp_error( $result ) ) {
			wp004_line( 'FAIL', $label, $result->get_error_message() );
		} else {
			wp004_line( 'OK', $label, $plugin_file );
		}
	}
}

// ---------------------------------------------------------------------------
// 2. 切换主题
// ---------------------------------------------------------------------------
if ( isset( $opts['skip-theme'] ) ) {
	wp004_line( 'SKIP', '主题切换' );
} else {
	$target_theme = 'slstyle-child';
	$parent_theme = 'slstyle';

	if ( ! wp_get_theme( $parent_theme )->exists() ) {
		wp004_line( 'FAIL', '父主题检查', '缺少父主题: ' . $parent_theme );
	} elseif ( ! wp_get_theme( $target_theme )->exists() ) {
		wp004_line( 'FAIL', '子主题检查', '缺少子主题: ' . $target_theme );
	} elseif ( wp_get_theme( $target_theme )->errors() ) {
		wp004_line( 'FAIL', '子主题校验', (string) wp_get_theme( $target_theme )->errors() );
	} else {
		switch_theme( $target_theme );
		if ( get_option( 'stylesheet' ) === $target_theme ) {
			wp004_line( 'OK', '主题切换', "stylesheet={$target_theme} / template={$parent_theme}" );
		} else {
			wp004_line( 'FAIL', '主题切换', '当前 stylesheet=' . get_option( 'stylesheet' ) );
		}
	}
}

// ---------------------------------------------------------------------------
// 2.5 站点地址同步
//
//     把 home / siteurl 对齐到 wp-config.php 里实际生效的 WP_HOME / WP_SITEURL。
//     这一步在「换端口 / 换域名 / 从本地迁到容器」时尤其重要：
//     如果库里存的是旧地址，前台资源链接与计划任务（WP-Cron 走 CLI，
//     拿不到 HTTP_HOST）都会指向错的地方。
//     走 update_option 而不是直接 UPDATE，保证 option 的 action 钩子正常触发。
// ---------------------------------------------------------------------------
$wp004_want_home    = untrailingslashit( WP_HOME );
$wp004_want_siteurl = untrailingslashit( WP_SITEURL );
$wp004_now_home     = untrailingslashit( (string) get_option( 'home' ) );
$wp004_now_siteurl  = untrailingslashit( (string) get_option( 'siteurl' ) );

if ( $wp004_now_home !== $wp004_want_home || $wp004_now_siteurl !== $wp004_want_siteurl ) {
	update_option( 'home', $wp004_want_home );
	update_option( 'siteurl', $wp004_want_siteurl );
	wp004_line( 'OK', '站点地址', $wp004_now_home . ' → ' . $wp004_want_home );
} else {
	wp004_line( 'OK', '站点地址', $wp004_want_home . '（已是最新）' );
}

// ---------------------------------------------------------------------------
// 3. 固定链接
// ---------------------------------------------------------------------------
if ( isset( $opts['skip-permalink'] ) ) {
	wp004_line( 'SKIP', '固定链接' );
} else {
	$structure = '/%postname%/';
	if ( get_option( 'permalink_structure' ) !== $structure ) {
		update_option( 'permalink_structure', $structure );
	}
	// 重建重写规则并写入 .htaccess（Apache）或提示手动配置（Nginx）。
	flush_rewrite_rules( true );
	wp004_line( 'OK', '固定链接', $structure );
}

// ---------------------------------------------------------------------------
// 4. 演示页面（--demo-pages 时创建）
//
//    全部通过 wp_insert_post() 写入，与后台手工新建页面完全等价；
//    页面模板通过 postmeta 的 _wp_page_template 指定，是 WordPress 原生机制。
// ---------------------------------------------------------------------------
if ( ! isset( $opts['demo-pages'] ) ) {
	wp004_line( 'SKIP', '演示页面', '加 --demo-pages 参数创建' );
} else {
	$demo = array(
		array(
			'title'    => '数据看板',
			'slug'     => 'dashboard',
			'template' => 'page-dashboard.php',
			'content'  => "本页由子主题的页面模板 page-dashboard.php 服务端渲染。\n\n聚合结果同时通过 REST 接口异步刷新，未登录或插件停用时会自动降级为静态提示。",
		),
		array(
			'title'    => '聚合短代码演示',
			'slug'     => 'aggregator-shortcode',
			'template' => '',
			'content'  => "下面这块内容由短代码 [saas_aggregator] 渲染：\n\n[saas_aggregator]\n\n下面是指定单个数据源的写法：\n\n[saas_aggregator source=\"gateway_status\" limit=\"3\"]",
		),
	);

	foreach ( $demo as $d ) {
		// 幂等：已存在同 slug 的页面则跳过。
		$existing = get_page_by_path( $d['slug'], OBJECT, 'page' );
		if ( $existing ) {
			wp004_line( 'OK', '演示页面：' . $d['title'], '已存在（ID=' . $existing->ID . '，跳过）' );
			continue;
		}

		$post_id = wp_insert_post(
			array(
				'post_title'   => $d['title'],
				'post_name'    => $d['slug'],
				'post_content' => $d['content'],
				'post_status'  => 'publish',
				'post_type'    => 'page',
				'post_author'  => 1,
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			wp004_line( 'FAIL', '演示页面：' . $d['title'], $post_id->get_error_message() );
			continue;
		}

		if ( $d['template'] ) {
			update_post_meta( $post_id, '_wp_page_template', $d['template'] );
		}
		wp004_line( 'OK', '演示页面：' . $d['title'], 'ID=' . $post_id . ' 模板=' . ( $d['template'] ?: '默认' ) );
	}
}

// ---------------------------------------------------------------------------
// 5. 结果自检
// ---------------------------------------------------------------------------
echo "\n------------------------------------------------------------\n";
echo " 自检\n";
echo "------------------------------------------------------------\n";

global $wpdb;

$checks = array(
	'站点名称'   => get_bloginfo( 'name' ),
	'站点地址'   => get_option( 'siteurl' ),
	'前台地址'   => get_option( 'home' ),
	'当前主题'   => get_option( 'stylesheet' ),
	'父主题'     => get_option( 'template' ),
	'已启用插件' => implode( ', ', array_map(
		function ( $p ) {
			return dirname( $p );
		},
		(array) get_option( 'active_plugins', array() )
	) ),
);

foreach ( $checks as $k => $v ) {
	printf( "  %-10s %s\n", $k . ':', $v );
}

// 审计日志表是否由插件的 activation hook 创建。
$table = $wpdb->prefix . 'saas_agg_logs';
$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
printf( "  %-10s %s\n", '审计日志表:', $found === $table ? $table . '（已创建）' : '未创建' );

// REST 路由是否注册。
$routes = rest_get_server()->get_routes();
$own    = array();
foreach ( array_keys( $routes ) as $route ) {
	if ( 0 === strpos( $route, '/saas-aggregator/v1' ) ) {
		$own[] = $route;
	}
}
sort( $own );
printf( "  %-10s %s\n", 'REST 路由:', $own ? implode( ' ', $own ) : '未注册' );

echo "\n完成。\n";
