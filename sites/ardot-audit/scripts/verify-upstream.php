<?php
/**
 * 真实上游微服务联通校验。
 *
 * 与 scripts/verify-site.php 的分工：
 *   verify-site.php   —— 验证「链路通不通」（路由注册、钩子、表结构、权限）
 *   verify-upstream.php —— 验证「数据真不真」（能不能从真实微服务取到业务数据）
 *
 * 校验方式刻意走插件自身的取数链路（Provider_Manager → Provider → API_Client），
 * 而不是另写一套 HTTP 请求，这样测到的才是线上真正生效的代码路径。
 *
 * 用法：
 *   # 宿主机本地（WP 跑在 127.0.0.1）
 *   php scripts/verify-upstream.php
 *
 *   # 容器内（微服务在宿主机上，用 host.docker.internal）
 *   WP004_ABSPATH=/var/www/html \
 *   WP004_HTTP_HOST=127.0.0.1:8091 \
 *   WP004_UPSTREAM_HOST=host.docker.internal \
 *   php scripts/verify-upstream.php
 *
 * 环境变量：
 *   WP004_ABSPATH        WordPress 根目录，默认 <项目根>/public
 *   WP004_HTTP_HOST      站点 Host，默认 127.0.0.1:8090
 *   WP004_UPSTREAM_HOST  上游微服务主机名，默认 127.0.0.1
 *   WP004_UPSTREAM_PORT_* 覆盖单个服务的端口（见下方 $ports）
 *
 * 退出码：全部数据源 ok 为 0，否则为 1。
 */

// 捕获致命错误，避免被 WordPress 的 fatal handler 吞掉真实原因。
register_shutdown_function(
	static function () {
		$e = error_get_last();
		if ( $e && in_array( $e['type'], array( E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR ), true ) ) {
			fwrite( STDERR, "\n[FATAL] {$e['message']}\n        于 {$e['file']}:{$e['line']}\n" );
		}
	}
);

$abspath = getenv( 'WP004_ABSPATH' );
if ( ! $abspath ) {
	$abspath = dirname( __DIR__ ) . '/public';
}
$abspath = rtrim( str_replace( '\\', '/', (string) $abspath ), '/' );

if ( ! is_file( $abspath . '/wp-load.php' ) ) {
	fwrite( STDERR, "找不到 wp-load.php：{$abspath}\n请设置环境变量 WP004_ABSPATH 指向 WordPress 根目录。\n" );
	exit( 1 );
}

$http_host = getenv( 'WP004_HTTP_HOST' ) ?: '127.0.0.1:8090';
$_SERVER['HTTP_HOST']       = $http_host;
$_SERVER['SERVER_NAME']     = (string) parse_url( 'http://' . $http_host, PHP_URL_HOST );
$_SERVER['REQUEST_METHOD']  = 'GET';
$_SERVER['REQUEST_URI']     = '/';
$_SERVER['SCRIPT_NAME']     = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $abspath . '/index.php';
$_SERVER['REMOTE_ADDR']     = '127.0.0.1';

require_once $abspath . '/wp-load.php';

if ( ! function_exists( 'saas_agg_get_default_settings' ) ) {
	fwrite( STDERR, "插件 saas-aggregator 未加载，请先激活。\n" );
	exit( 1 );
}

// ── 各数据源的服务归属 ──────────────────────────────────────────
// 这是实测结论，不是猜的：/api/products 不在 Go 网关上（8080 返回 404），
// 而在 Node.js BFF 上（3001 返回真实商品数据）。
$host  = getenv( 'WP004_UPSTREAM_HOST' ) ?: '127.0.0.1';
$ports = array(
	'gateway-go' => (int) ( getenv( 'WP004_UPSTREAM_PORT_GATEWAY' ) ?: 8080 ),
	'ai-python'  => (int) ( getenv( 'WP004_UPSTREAM_PORT_AI' ) ?: 8000 ),
	'node-api'   => (int) ( getenv( 'WP004_UPSTREAM_PORT_NODE' ) ?: 3001 ),
);

$targets = array(
	'gateway_status' => 'gateway-go',
	'business_core'  => 'gateway-go',
	'ai_insights'    => 'ai-python',
	'analytics'      => 'ai-python',
	'compliance'     => 'ai-python',
	'ecommerce'      => 'node-api',
);

$settings = saas_agg_get_default_settings();
$settings['global']['demo_mode'] = 'no';   // 必须关掉演示，否则测的是假数据

foreach ( $targets as $id => $service ) {
	if ( ! isset( $settings['providers'][ $id ] ) ) {
		continue;
	}
	$settings['providers'][ $id ]['enabled']    = 'yes';
	$settings['providers'][ $id ]['base_url']   = 'http://' . $host . ':' . $ports[ $service ];
	$settings['providers'][ $id ]['tenant_id']  = 'wp004-verify';
	$settings['providers'][ $id ]['api_key']    = 'wp004-verify';
	$settings['providers'][ $id ]['api_secret'] = 'wp004-verify';
}

$had_settings = ( false !== get_option( SAAS_AGG_OPTION_NAME, false ) );
$old_settings = get_option( SAAS_AGG_OPTION_NAME, array() );

update_option( SAAS_AGG_OPTION_NAME, $settings );

echo str_repeat( '=', 62 ) . "\n";
echo "真实上游微服务联通校验\n";
echo str_repeat( '=', 62 ) . "\n";
printf( "上游主机 : %s\n", $host );
printf( "服务端口 : gateway-go=%d / ai-python=%d / node-api=%d\n", $ports['gateway-go'], $ports['ai-python'], $ports['node-api'] );
printf( "租户头   : X-Tenant-Id = wp004-verify\n" );
printf( "演示模式 : 已关闭（确保取的是真实数据）\n\n" );

$result = SAAS_Agg_Provider_Manager::aggregate( 'all', 5 );

$ok_count = 0;
$total    = 0;

// 输出对齐用的列宽。
$width = 16;
foreach ( $result as $src ) {
	if ( isset( $src['source'] ) ) {
		$width = max( $width, strlen( (string) $src['source'] ) );
	}
}

foreach ( $result as $src ) {
	$total ++;

	// aggregate() 返回的是列表，来源 id 在 source 字段里。
	$id = isset( $src['source'] ) ? (string) $src['source'] : '#' . $total;

	if ( is_wp_error( $src ) ) {
		printf( "  [FAIL] %-{$width}s WP_Error: %s\n", $id, $src->get_error_message() );
		continue;
	}

	$status = isset( $src['status'] ) ? (string) $src['status'] : '(未知)';
	$items  = isset( $src['items'] ) ? $src['items'] : array();
	$first  = $items ? $items[0] : array();

	if ( 'ok' === $status && $items ) {
		$ok_count ++;

		$title = isset( $first['title'] ) ? (string) $first['title'] : '-';
		$value = isset( $first['value'] ) ? (string) $first['value'] : '';
		$value = '' === $value ? '' : ' = ' . mb_substr( $value, 0, 40 );
		$when  = ( isset( $first['updated'] ) && $first['updated'] )
			? '  @ ' . mb_substr( (string) $first['updated'], 0, 19 )
			: '';

		printf( "  [ OK ] %-{$width}s %2d 条  %s%s%s\n", $id, count( $items ), $title, $value, $when );
	} else {
		$err = isset( $src['error'] )
			? ( is_string( $src['error'] ) ? $src['error'] : wp_json_encode( $src['error'] ) )
			: '';
		printf( "  [FAIL] %-{$width}s status=%s  %s\n", $id, $status, mb_substr( $err, 0, 60 ) );
	}
}

echo "\n" . str_repeat( '-', 62 ) . "\n";
printf( "  真实数据源联通：%d / %d\n", $ok_count, $total );
echo str_repeat( '=', 62 ) . "\n";

// 还原：原本没设置的就删掉（与 live 测试一致），有设置就写回原值。
if ( $had_settings ) {
	update_option( SAAS_AGG_OPTION_NAME, $old_settings, false );
	echo "已还原插件原有配置。\n";
} else {
	delete_option( SAAS_AGG_OPTION_NAME );
	echo "已清除临时写入的校验配置（站点原本无自定义设置）。\n";
}

exit( $ok_count === $total ? 0 : 1 );
