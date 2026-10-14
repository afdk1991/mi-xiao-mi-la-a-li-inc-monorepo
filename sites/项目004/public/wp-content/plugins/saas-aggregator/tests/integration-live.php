<?php
/**
 * 真实 HTTP 联调验证：复用 WP 桩，但把 __http_responder 换成真正发 HTTP 请求的函数，
 * 让插件在关闭 demo_mode 的情况下，对本地 mock 后端（tests/mock-backend.py）跑真实
 * aggregate()，以验证 fetch + normalize 契约在真实 HTTP 下成立。
 *
 * 运行：
 *   1) 终端起 mock： php 不需要； 用 python tests/mock-backend.py  (监听 127.0.0.1:8799)
 *   2) 另起终端：   php tests/integration-live.php
 */

require_once __DIR__ . '/bootstrap.php';

$MOCK = 'http://127.0.0.1:8799';

/**
 * 真实 HTTP responder：用 stream_context_create 发 GET/POST，转发插件传入的
 * method / headers / body（与 WP HTTP API 桩的 wp_remote_request($url,$args) 签名一致）。
 */
$GLOBALS['__http_responder'] = function ( $url, $args ) use ( $MOCK ) {
	$args  = is_array( $args ) ? $args : array();
	$method = strtoupper( (string) ( $args['method'] ?? 'GET' ) );
	$headers_in = isset( $args['headers'] ) && is_array( $args['headers'] ) ? $args['headers'] : array();
	$body = isset( $args['body'] ) ? (string) $args['body'] : '';

	// 把相对路径拼到 mock 基地址上（插件 build_url 只产出 path）。
	$parsed = parse_url( $url );
	$path = isset( $parsed['path'] ) ? $parsed['path'] : '/';
	$full = rtrim( $MOCK, '/' ) . $path;
	if ( ! empty( $parsed['query'] ) ) {
		$full .= '?' . $parsed['query'];
	}

	$header_lines = array();
	foreach ( $headers_in as $k => $v ) {
		$header_lines[] = $k . ': ' . $v;
	}

	$ctx_opts = array(
		'http' => array(
			'method'           => $method,
			'header'           => implode( "\r\n", $header_lines ),
			'ignore_errors'    => true,
			'timeout'          => 10,
			'follow_location'  => 0,
		),
	);
	if ( '' !== $body ) {
		$ctx_opts['http']['content'] = $body;
	}
	$ctx = stream_context_create( $ctx_opts );

	$raw = @file_get_contents( $full, false, $ctx );
	if ( false === $raw ) {
		$err = error_get_last();
		return new WP_Error( 'http_failure', '无法连接 mock 后端: ' . ( $err['message'] ?? $full ) );
	}

	$code = 200;
	if ( isset( $http_response_header ) ) {
		foreach ( $http_response_header as $line ) {
			if ( preg_match( '#^HTTP/\S+\s+(\d{3})#i', $line, $m ) ) {
				$code = (int) $m[1];
				break;
			}
		}
	}
	return array(
		'body'     => $raw,
		'response' => array( 'code' => $code ),
		'headers'  => array(),
	);
};

// ---- 配置插件：指向 mock 后端，关闭 demo_mode，强制走真实取数 ----
$settings = saas_agg_get_default_settings();
$settings['global']['demo_mode'] = '';   // 关闭演示模式，验证真实聚合
foreach ( $settings['providers'] as $id => &$p ) {
	$p['base_url']  = $MOCK;
	$p['api_key']   = 'demo-key';
	$p['tenant_id'] = 'default';
}
unset( $p );
$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $settings;

// ---- 跑聚合 ----
echo "=== 真实 HTTP 联调：aggregate('all', 5) 指向 mock 后端 @ $MOCK ===\n\n";
$out = SAAS_Agg_Provider_Manager::aggregate( 'all', 5 );

$ok = 0;
foreach ( $out as $src ) {
	$items = isset( $src['items'] ) ? $src['items'] : array();
	$n = count( $items );
	$flag = ( 'ok' === $src['status'] || 'info' === $src['status'] ) ? 'OK ' : 'ERR';
	if ( $n > 0 ) {
		$ok++;
	}
	printf(
		"  [%s] %-14s status=%-6s items=%d  first=%s\n",
		$flag,
		$src['source'],
		$src['status'],
		$n,
		$n > 0 ? mb_substr( (string) $items[0]['title'], 0, 24 ) : ( $src['message'] ?? '-' )
	);
	if ( $n > 0 ) {
		foreach ( array_slice( $items, 0, 2 ) as $it ) {
			printf( "        - %s : %s (%s)\n", $it['title'], $it['value'], $it['status'] );
		}
	}
}

echo "\n=== 汇总：成功取到真实数据的来源 $ok / " . count( $out ) . " ===\n";
exit( $ok === count( $out ) ? 0 : 1 );
