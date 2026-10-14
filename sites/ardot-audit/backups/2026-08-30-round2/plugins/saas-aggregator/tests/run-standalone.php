<?php
/**
 * 无 PHPUnit 时的本地校验脚本：复用 tests/bootstrap.php 的 WP 桩，
 * 以最简断言验证核心逻辑。运行：php tests/run-standalone.php
 */

require_once __DIR__ . '/bootstrap.php';

$pass = 0;
$fail = 0;

function check( $cond, $label ) {
	global $pass, $fail;
	if ( $cond ) {
		$pass++;
		echo "  [PASS] $label\n";
	} else {
		$fail++;
		echo "  [FAIL] $label\n";
	}
}

echo "=== Demo 聚合（全部来源）===\n";
$GLOBALS['__options']    = array();
$GLOBALS['__transients'] = array();
unset( $GLOBALS['__http_responder'] );

// 桩后端默认只返回 1 条，这里造 5 条，顺便验证 limit 生效。
$GLOBALS['__http_responder'] = function () {
	$items = array();
	for ( $i = 1; $i <= 5; $i ++ ) {
		$items[] = array( 'title' => '实时指标 ' . $i, 'value' => (string) ( $i * 100 ), 'status' => 'ok' );
	}
	return array(
		'body'     => wp_json_encode( array( 'items' => $items ) ),
		'response' => array( 'code' => 200 ),
		'headers'  => array(),
	);
};

$out = SAAS_Agg_Provider_Manager::aggregate( 'all', 5 );
check( count( $out ) === 6, '聚合返回 6 个来源' );
$ids = array_map( function ( $s ) { return $s['source']; }, $out );
check(
	$ids === array( 'gateway_status', 'business_core', 'ai_insights', 'analytics', 'compliance', 'ecommerce' ),
	'来源顺序与 id 正确'
);
check( $out[0]['status'] === 'ok' && count( $out[0]['items'] ) === 5, 'gateway_status: ok 且 5 条' );

echo "\n=== 配置接口路径（API Client + 缓存 + 归一化）===\n";
// 本节用回默认桩（返回单条「实时指标」），验证配置读取链路。
unset( $GLOBALS['__http_responder'] );
$settings = saas_agg_get_default_settings();
$settings['providers']['gateway_status']['base_url'] = 'https://api.example.com';
$settings['providers']['gateway_status']['api_key']  = 'test-key';
$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $settings;
$out2 = SAAS_Agg_Provider_Manager::aggregate( 'gateway_status', 5 );
check( $out2[0]['status'] === 'ok' && $out2[0]['items'][0]['title'] === '实时指标', '配置源返回归一化条目' );

echo "\n=== 错误降级：未配置 + 关闭 demo ===\n";
$settings['global']['demo_mode'] = '';
$settings['providers']['gateway_status']['base_url'] = '';
$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $settings;
$out3 = SAAS_Agg_Provider_Manager::aggregate( 'gateway_status', 5 );
check( $out3[0]['status'] === 'error' && ! empty( $out3[0]['message'] ), '未配置源返回 error 状态与说明' );

echo "\n=== 缓存：陈旧回退（stale）===\n";
$GLOBALS['__options']    = array();
$GLOBALS['__transients'] = array();
$params  = array( 'a' => 1 );
$key     = SAAS_Agg_Cache::key( 'gateway_status', $params );
$payload = array( '__ts' => time() - 1000, 'data' => array( array( 'title' => 'stale', 'value' => 'x', 'status' => 'ok' ) ) );
set_transient( $key, $payload, 9999 );
$res = SAAS_Agg_Cache::fetch_with_cache(
	'gateway_status',
	$params,
	10,
	function () { return new WP_Error( 'boom', 'down' ); }
);
check( $res['status'] === 'stale' && $res['data'][0]['title'] === 'stale', '刷新失败回退陈旧缓存' );

echo "\n=== 缓存：新鲜命中（hit，不触发 fetcher）===\n";
$GLOBALS['__transients'] = array();
$params2  = array( 'b' => 2 );
$key2     = SAAS_Agg_Cache::key( 'analytics', $params2 );
set_transient( $key2, array( '__ts' => time(), 'data' => array( array( 'title' => 'cached', 'value' => '1', 'status' => 'ok' ) ) ), 9999 );
$called = false;
$res2 = SAAS_Agg_Cache::fetch_with_cache(
	'analytics',
	$params2,
	9999,
	function () use ( &$called ) { $called = true; return array( array( 'title' => 'fresh', 'value' => '2', 'status' => 'ok' ) ); }
);
check( ! $called && $res2['status'] === 'hit' && $res2['data'][0]['title'] === 'cached', '新鲜缓存命中且不调用 fetcher' );

echo "\n=== 结果：$pass 通过 / $fail 失败 ===\n";
exit( $fail > 0 ? 1 : 0 );
