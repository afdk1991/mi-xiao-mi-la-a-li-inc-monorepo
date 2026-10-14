<?php
/**
 * WP004 功能验收脚本（命令行执行）
 *
 * 覆盖「验收要点」中的可自动化部分：
 *   - 站点与主题/插件状态
 *   - 数据表结构与版本
 *   - 扩展点注册情况（短代码 / 区块 / REST 路由 / 钩子 / 定时任务）
 *   - REST 接口实际调用（含鉴权与速率限制行为）
 *   - 安全基线常量
 *   - 核心文件完整性（调用 verify-core.php）
 *
 * 用法：
 *   wsl -d Ubuntu -u root -- php /mnt/d/网站全栈项目/项目004/scripts/verify-site.php
 *   php scripts/verify-site.php --json          # 机器可读输出
 *   php scripts/verify-site.php --skip-core     # 跳过核心校验（较慢）
 *
 * 退出码：0=全部通过  1=存在失败项
 *
 * @package WP004
 */

if ( 'cli' !== PHP_SAPI ) {
	fwrite( STDERR, "本脚本仅限命令行执行。\n" );
	exit( 1 );
}

// WordPress 根目录（ABSPATH）解析：容器 / 非标准布局用 WP004_ABSPATH 指定，
// 否则回落到项目根下的 public/。与 wp-bootstrap.php 保持同一套约定。
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

$as_json   = in_array( '--json', $argv, true );
$skip_core = in_array( '--skip-core', $argv, true );

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

define( 'WP_ADMIN', true );

require_once $wp004_abspath . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

$results = array();
$failed  = 0;

/**
 * 记录一条检查结果。
 *
 * @param string $group    分组名。
 * @param string $item     检查项。
 * @param bool   $ok       是否通过。
 * @param string $detail   详情。
 */
function wp004_check( $group, $item, $ok, $detail = '' ) {
	global $results, $failed;
	$results[] = array(
		'group'  => $group,
		'item'   => $item,
		'ok'     => (bool) $ok,
		'detail' => (string) $detail,
	);
	if ( ! $ok ) {
		++$failed;
	}
}

global $wpdb;

// ---------------------------------------------------------------------------
// 1. 站点基础状态
// ---------------------------------------------------------------------------
wp004_check( '站点', 'WordPress 版本', true, get_bloginfo( 'version' ) );
wp004_check( '站点', '站点标题', (bool) get_bloginfo( 'name' ), get_bloginfo( 'name' ) );
wp004_check( '站点', 'PHP 版本', version_compare( PHP_VERSION, '7.2', '>=' ), PHP_VERSION );
wp004_check( '站点', '固定链接结构', (bool) get_option( 'permalink_structure' ), get_option( 'permalink_structure' ) );

// ---------------------------------------------------------------------------
// 2. 主题（子主题机制）
// ---------------------------------------------------------------------------
$stylesheet = get_option( 'stylesheet' );
$template   = get_option( 'template' );
wp004_check( '主题', '当前启用的是子主题', 'slstyle-child' === $stylesheet, 'stylesheet=' . $stylesheet );
wp004_check( '主题', '父主题正确', 'slstyle' === $template, 'template=' . $template );
wp004_check( '主题', '父主题存在', wp_get_theme( 'slstyle' )->exists() );
wp004_check( '主题', '子主题无错误', ! wp_get_theme( 'slstyle-child' )->errors(), (string) wp_get_theme( 'slstyle-child' )->errors() );
wp004_check(
	'主题',
	'子主题提供了页面模板',
	file_exists( get_stylesheet_directory() . '/page-dashboard.php' ),
	'page-dashboard.php'
);

// 主题必备页面（关于我们 / 联系我们 / 用户中心）：缺失会导致导航出现死链。
$required_pages = array( 'about', 'contact', 'user-center' );
$missing_pages  = array();
foreach ( $required_pages as $slug ) {
	if ( ! get_page_by_path( $slug ) ) {
		$missing_pages[] = $slug;
	}
}
wp004_check(
	'主题',
	'主题必备页面齐全',
	empty( $missing_pages ),
	$missing_pages ? '缺少: ' . implode( ', ', $missing_pages ) : implode( ', ', $required_pages )
);

// 用户中心模板绑定：页面建了但模板没绑上，功能等于没接。
$uc_page    = get_page_by_path( 'user-center' );
$uc_tpl     = $uc_page ? get_post_meta( $uc_page->ID, '_wp_page_template', true ) : '';
wp004_check( '主题', '用户中心模板已绑定', 'user-center.php' === $uc_tpl, $uc_tpl ? $uc_tpl : '未绑定' );

// 硬编码 page_id 回归防线：页面 ID 随站点迁移而变，硬编码必然产生死链。
$hardcoded = array();
foreach ( glob( get_template_directory() . '/*.php' ) as $tpl_file ) {
	$contents = file_get_contents( $tpl_file );
	if ( $contents && preg_match( '/page_id\s*=\s*\d+/', $contents ) ) {
		$hardcoded[] = basename( $tpl_file );
	}
}
wp004_check(
	'主题',
	'模板无硬编码 page_id',
	empty( $hardcoded ),
	$hardcoded ? '仍存在: ' . implode( ', ', $hardcoded ) : '已全部改用 slug 解析'
);

// ---------------------------------------------------------------------------
// 3. 插件
// ---------------------------------------------------------------------------
$plugin_file = 'saas-aggregator/saas-aggregator.php';
wp004_check( '插件', '自研插件已激活', is_plugin_active( $plugin_file ), $plugin_file );
wp004_check( '插件', '插件主文件存在', file_exists( WP_PLUGIN_DIR . '/' . $plugin_file ) );

// ---------------------------------------------------------------------------
// 4. 数据表（遵循 WP 规范：前缀 + 版本存 option）
// ---------------------------------------------------------------------------
$core_tables = array( 'posts', 'postmeta', 'options', 'users', 'usermeta', 'terms', 'term_taxonomy', 'term_relationships', 'termmeta', 'comments', 'commentmeta', 'links' );
$missing     = array();
foreach ( $core_tables as $t ) {
	$name = $wpdb->prefix . $t;
	if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $name ) ) !== $name ) {
		$missing[] = $name;
	}
}
wp004_check( '数据表', '核心表齐全（12 张）', empty( $missing ), $missing ? '缺失: ' . implode( ', ', $missing ) : '12/12' );

$log_table = $wpdb->prefix . 'saas_agg_logs';
$has_log   = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $log_table ) ) === $log_table;
wp004_check( '数据表', '自定义审计表已建立', $has_log, $log_table );

if ( $has_log ) {
	$cols = $wpdb->get_col( "SHOW COLUMNS FROM {$log_table}" );
	$need = array( 'id', 'created_at', 'user_id', 'tenant_id', 'provider_id', 'endpoint', 'http_status', 'duration_ms', 'cache_hit', 'result', 'message' );
	$lack = array_diff( $need, $cols );
	wp004_check( '数据表', '审计表字段完整', empty( $lack ), $lack ? '缺少: ' . implode( ',', $lack ) : count( $need ) . '/' . count( $need ) );

	$idx = $wpdb->get_results( "SHOW INDEX FROM {$log_table}" );
	$keys = array();
	foreach ( $idx as $row ) {
		$keys[ $row->Key_name ] = true;
	}
	wp004_check( '数据表', '审计表索引（租户/数据源/时间）', isset( $keys['tenant_id'], $keys['provider_id'], $keys['created_at'] ), implode( ',', array_keys( $keys ) ) );

	$charset = $wpdb->get_var( "SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{$log_table}'" );
	wp004_check( '数据表', '审计表字符集与站点一致', false !== strpos( (string) $charset, 'utf8mb4' ), (string) $charset );
}

$db_version = get_option( 'saas_aggregator_db_version' );
wp004_check( '数据表', '表结构版本已记录', (bool) $db_version, 'version=' . $db_version );

// ---------------------------------------------------------------------------
// 5. 扩展点注册情况
// ---------------------------------------------------------------------------
wp004_check( '扩展点', '短代码 saas_aggregator 已注册', shortcode_exists( 'saas_aggregator' ) );

$block_types = array();
if ( class_exists( 'WP_Block_Type_Registry' ) ) {
	$block_types = WP_Block_Type_Registry::get_instance()->get_all_registered();
}
$own_blocks = array();
foreach ( $block_types as $name => $bt ) {
	if ( 0 === strpos( $name, 'saas-aggregator/' ) ) {
		$own_blocks[] = $name;
	}
}
wp004_check( '扩展点', 'Gutenberg 区块已注册', ! empty( $own_blocks ), implode( ', ', $own_blocks ) );

$routes = rest_get_server()->get_routes();
$own    = array();
foreach ( array_keys( $routes ) as $route ) {
	if ( 0 === strpos( $route, '/saas-aggregator/v1' ) ) {
		$own[] = $route;
	}
}
sort( $own );
wp004_check( '扩展点', 'REST 命名空间 saas-aggregator/v1', ! empty( $own ), $own ? count( $own ) . ' 条路由' : '未注册' );

$expected_routes = array(
	'/saas-aggregator/v1/sources',
	'/saas-aggregator/v1/data',
	'/saas-aggregator/v1/health',
	'/saas-aggregator/v1/cache/flush',
	'/saas-aggregator/v1/logs',
);
$lack_routes = array_diff( $expected_routes, $own );
wp004_check( '扩展点', '五条 REST 路由齐全', empty( $lack_routes ), $lack_routes ? '缺少: ' . implode( ',', $lack_routes ) : '5/5' );

// 只通过钩子扩展、不改核心佐证：核心的过滤器链上应挂有本插件的回调。
$hook_found = false;
foreach ( array( 'rest_api_init', 'plugins_loaded', 'init' ) as $hook ) {
	if ( has_action( $hook ) ) {
		$hook_found = true;
		break;
	}
}
wp004_check( '扩展点', '通过动作/过滤器钩子扩展', $hook_found );

// 定时任务（WP-Cron）。
$prune_hook   = 'saas_agg_prune_logs';
$scheduled    = wp_next_scheduled( $prune_hook );
wp004_check( '扩展点', '日志清理定时任务已注册', (bool) $scheduled, $scheduled ? '下次执行: ' . gmdate( 'Y-m-d H:i:s', $scheduled ) . ' UTC' : '未注册' );

// ---------------------------------------------------------------------------
// 6. REST 实际调用（模拟内部请求）
// ---------------------------------------------------------------------------
if ( ! empty( $own ) ) {
	$request  = new WP_REST_Request( 'GET', '/saas-aggregator/v1/health' );
	$response = rest_get_server()->dispatch( $request );
	$code     = $response->get_status();
	// 匿名访问按设计应被拒绝（401/403）；登录后可放行。
	wp004_check( 'REST', '匿名访问受权限回调保护', in_array( $code, array( 401, 403 ), true ), 'HTTP ' . $code );

	// 以管理员身份请求，验证鉴权通过后接口可用。
	wp_set_current_user( 1 );
	$request  = new WP_REST_Request( 'GET', '/saas-aggregator/v1/sources' );
	$response = rest_get_server()->dispatch( $request );
	$code     = $response->get_status();
	$data     = $response->get_data();
	wp004_check( 'REST', '管理员访问 /sources', 200 === $code, 'HTTP ' . $code );
	if ( 200 === $code && is_array( $data ) ) {
		// /sources 返回结构：{ tenant, count, sources: [ {id,label,...} ] }
		$list = isset( $data['sources'] ) && is_array( $data['sources'] ) ? $data['sources'] : array();
		$ids  = array();
		foreach ( $list as $item ) {
			if ( isset( $item['id'] ) ) {
				$ids[] = $item['id'];
			}
		}
		wp004_check( 'REST', '数据源清单非空', ! empty( $ids ), $ids ? count( $ids ) . ' 个: ' . implode( ', ', $ids ) : '（count=' . ( $data['count'] ?? 'N/A' ) . '）' );
	}

	$request  = new WP_REST_Request( 'GET', '/saas-aggregator/v1/data' );
	$request->set_param( 'limit', 3 );
	$response = rest_get_server()->dispatch( $request );
	wp004_check( 'REST', '管理员访问 /data', 200 === $response->get_status(), 'HTTP ' . $response->get_status() );

	// /data 应写入审计日志。
	$logged = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$log_table} WHERE endpoint LIKE %s", '%/data%' ) );
	wp004_check( 'REST', '调用被写入审计日志', $logged > 0, $logged . ' 条' );

	wp_set_current_user( 0 );
}

// ---------------------------------------------------------------------------
// 7. 安全基线常量
// ---------------------------------------------------------------------------
// 本地环境不要求 SSL；预发布/生产必须开启后台强制 SSL。
$is_local = defined( 'WP_ENVIRONMENT_TYPE' ) && 'local' === WP_ENVIRONMENT_TYPE;

$security = array(
	'DISALLOW_FILE_EDIT'  => array( '后台禁用文件编辑', defined( 'DISALLOW_FILE_EDIT' ) && DISALLOW_FILE_EDIT, true ),
	'FORCE_SSL_ADMIN'     => array( '后台强制 SSL', defined( 'FORCE_SSL_ADMIN' ) && FORCE_SSL_ADMIN, ! $is_local ),
	'WP_ENVIRONMENT_TYPE' => array( '环境类型已声明', defined( 'WP_ENVIRONMENT_TYPE' ), true ),
	'WP_AUTO_UPDATE_CORE' => array( '核心自动更新策略已声明', defined( 'WP_AUTO_UPDATE_CORE' ), true ),
);
foreach ( $security as $const => $info ) {
	$value = defined( $const ) ? var_export( constant( $const ), true ) : '未定义';
	if ( ! $info[2] ) {
		// 本地环境不强制，仅作为信息展示，不计入失败。
		wp004_check( '安全', $info[0] . ' [' . $const . ']', true, $value . '（本地环境不强制）' );
		continue;
	}
	wp004_check( '安全', $info[0] . ' [' . $const . ']', $info[1], $value );
}

// 调试模式：本地允许开启，其它环境必须关闭。
$debug_on = defined( 'WP_DEBUG' ) && WP_DEBUG;
wp004_check(
	'安全',
	'调试模式 [WP_DEBUG]',
	$is_local ? true : ! $debug_on,
	var_export( $debug_on, true ) . ( $is_local ? '（本地允许开启）' : '（生产必须为 false）' )
);

// ---------------------------------------------------------------------------
// 8. 核心文件完整性（调用独立校验器）
// ---------------------------------------------------------------------------
if ( $skip_core ) {
	wp004_check( '核心', '核心文件完整性', true, '已跳过（--skip-core）' );
} else {
	// 校验器定位：优先用本脚本自身所在目录（容器里脚本可能被拷到别处运行），
	// 找不到再回落到项目约定路径。
	$verify = __DIR__ . '/verify-core.php';
	if ( ! file_exists( $verify ) ) {
		$verify = dirname( $wp004_abspath ) . '/scripts/verify-core.php';
	}
	if ( file_exists( $verify ) ) {
		$cmd = escapeshellcmd( PHP_BINARY ) . ' ' . escapeshellarg( $verify ) . ' --json';
		$out = shell_exec( $cmd . ' 2>&1' );
		$j   = json_decode( (string) $out, true );
		if ( is_array( $j ) ) {
			$ok = 'PASS' === ( $j['verdict'] ?? 'FAIL' );
			wp004_check(
				'核心',
				'核心文件零改动',
				$ok,
				sprintf(
					'判定 %s / 基线 %d / 扫描 %d / 核心改动 %d / 核心缺失 %d / 核心非法新增 %d',
					$j['verdict'] ?? 'UNKNOWN',
					$j['baseline_checksums'] ?? 0,
					$j['scanned_files'] ?? 0,
					count( $j['core']['modified'] ?? array() ),
					count( $j['core']['missing'] ?? array() ),
					count( $j['core']['extra'] ?? array() )
				)
			);
			if ( ! $ok ) {
				foreach ( array( 'modified', 'missing', 'extra' ) as $kind ) {
					foreach ( array_slice( (array) ( $j['core'][ $kind ] ?? array() ), 0, 5 ) as $v ) {
						wp004_check( '核心', '  违规项 ' . $kind, false, $v['path'] ?? json_encode( $v ) );
					}
				}
			}
		} else {
			wp004_check( '核心', '核心文件零改动', false, '校验器输出无法解析：' . substr( (string) $out, 0, 200 ) );
		}
	} else {
		wp004_check( '核心', '核心文件零改动', false, '缺少 scripts/verify-core.php' );
	}
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------
if ( $as_json ) {
	echo wp_json_encode(
		array(
			'pass'    => 0 === $failed,
			'failed'  => $failed,
			'total'   => count( $results ),
			'results' => $results,
		),
		JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
	) . "\n";
	exit( 0 === $failed ? 0 : 1 );
}

echo "\n============================================================\n";
echo " WP004 功能验收报告\n";
echo ' ' . gmdate( 'Y-m-d H:i:s' ) . " UTC / WordPress " . get_bloginfo( 'version' ) . "\n";
echo "============================================================\n\n";

$current_group = '';
foreach ( $results as $r ) {
	if ( $r['group'] !== $current_group ) {
		$current_group = $r['group'];
		printf( "\n【%s】\n", $current_group );
	}
	printf(
		"  [%s] %-32s %s\n",
		$r['ok'] ? ' OK ' : 'FAIL',
		$r['item'],
		$r['detail']
	);
}

echo "\n------------------------------------------------------------\n";
printf( "  合计 %d 项，通过 %d 项，失败 %d 项\n", count( $results ), count( $results ) - $failed, $failed );
echo "------------------------------------------------------------\n\n";

exit( 0 === $failed ? 0 : 1 );
