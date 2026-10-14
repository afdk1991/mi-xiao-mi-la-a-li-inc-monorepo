<?php
/**
 * 数据库错误页 drop-in（WordPress 官方扩展点，位于 wp-content 下，不触及核心文件）
 *
 * 重要：本文件在「数据库不可用」的上下文里执行，因此**绝对不能**调用任何
 * 会访问数据库或依赖完整引导流程的 WordPress 函数（esc_html / wp_json_encode /
 * __ 等都可能间接触发 get_option）。这里全部使用 PHP 原生函数实现。
 *
 * 生产环境（WP_DEBUG=false）只输出通用提示，不泄露任何连接参数。
 *
 * @package WP004
 */

if ( ! headers_sent() ) {
	header( 'HTTP/1.1 500 Internal Server Error' );
	header( 'Content-Type: text/html; charset=utf-8' );
}

$wp004_debug = defined( 'WP_DEBUG' ) && WP_DEBUG;

if ( $wp004_debug ) {
	$wp004_info = array(
		'DB_HOST'    => defined( 'DB_HOST' ) ? DB_HOST : '(未定义)',
		'DB_NAME'    => defined( 'DB_NAME' ) ? DB_NAME : '(未定义)',
		'DB_USER'    => defined( 'DB_USER' ) ? DB_USER : '(未定义)',
		'DB_CHARSET' => defined( 'DB_CHARSET' ) ? DB_CHARSET : '(未定义)',
		'PHP'        => PHP_VERSION,
		'时间'       => gmdate( 'Y-m-d H:i:s' ) . ' UTC',
	);
	/*
	 * 本文件由 wpdb::db_connect() 内部 require，因此 $this 即 wpdb 实例。
	 * 注意：此时 wp-settings.php 的 `$wpdb = new wpdb(...)` 尚未完成赋值，
	 * 所以不能用 global $wpdb 取实例，必须用 $this。
	 */
	$wp004_db = ( isset( $this ) && $this instanceof wpdb ) ? $this : null;
	if ( $wp004_db ) {
		$wp004_info['last_errno'] = (string) $wp004_db->last_errno;
		$wp004_info['last_error'] = (string) $wp004_db->last_error;
		$wp004_info['dbhost']     = (string) $wp004_db->dbhost;
		if ( $wp004_db->dbh instanceof mysqli ) {
			$wp004_info['connect_errno'] = (string) $wp004_db->dbh->connect_errno;
			$wp004_info['connect_error'] = (string) $wp004_db->dbh->connect_error;
		} else {
			$wp004_info['dbh'] = '(null)';
		}
	} else {
		$wp004_info['wpdb'] = '实例不可用';
	}
	// 直接落盘，避免依赖 error_log 目标（此时 WP_DEBUG_LOG 尚未生效）。
	if ( is_dir( WP_CONTENT_DIR ) && is_writable( WP_CONTENT_DIR ) ) {
		@file_put_contents(
			WP_CONTENT_DIR . '/db-error-detail.log',
			gmdate( 'c' ) . "\t" . json_encode( $wp004_info, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . "\n",
			FILE_APPEND
		);
	}
	if ( function_exists( 'error_log' ) ) {
		error_log( 'WP004 db-error: ' . json_encode( $wp004_info, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
	}
}

/**
 * 原生转义，避免依赖 esc_html()。
 *
 * @param mixed $value 待输出值。
 * @return string
 */
function wp004_db_error_esc( $value ) {
	return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>数据库连接失败</title>
<style>
body{font-family:-apple-system,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif;background:#f1f1f1;margin:0;padding:40px}
.box{background:#fff;border:1px solid #ccd0d4;border-radius:4px;max-width:760px;margin:0 auto;padding:32px}
h1{margin:0 0 16px;font-size:22px;color:#1d2327}p{color:#444;line-height:1.7}
code{background:#f0f0f1;padding:2px 6px;border-radius:3px;font-size:13px}
table{border-collapse:collapse;margin-top:16px;width:100%}
td,th{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:13px}
th{background:#f6f7f7;width:150px}
</style>
</head>
<body>
<div class="box">
	<h1>数据库连接失败</h1>
	<p>站点暂时无法访问数据库。请检查数据库服务是否已启动，以及 <code>.env</code> 中的连接参数是否正确。</p>
<?php if ( $wp004_debug && ! empty( $wp004_info ) ) : ?>
	<table>
		<?php foreach ( $wp004_info as $wp004_k => $wp004_v ) : ?>
		<tr><th><?php echo wp004_db_error_esc( $wp004_k ); ?></th><td><code><?php echo wp004_db_error_esc( $wp004_v ); ?></code></td></tr>
		<?php endforeach; ?>
	</table>
<?php endif; ?>
</div>
</body>
</html>
