<?php
/**
 * PHP 内置开发服务器的路由脚本（仅用于本地开发，不属于 WordPress 核心）。
 *
 * 用途：不依赖 Apache/Nginx 时，让 WordPress 的固定链接正常工作。
 * 行为与 Apache 的 mod_rewrite 等价：
 *   - 请求的文件真实存在 → 交给内置服务器直接返回；
 *   - 其它请求           → 交给 WordPress 的 index.php 统一路由。
 *
 * 注意（Windows 常见坑）：realpath() 会返回带反斜杠的本地路径，
 * 而 __DIR__ 拼接的基准路径用的是正斜杠。若直接做 strpos() 前缀比较，
 * 在 Windows 上恒为 false，会把所有真实存在的静态文件 / wp-admin 脚本
 * 误判为「不存在」，进而全部转发给 index.php —— 表现为无限重定向。
 * 因此这里统一把分隔符归一化为正斜杠后再比较。
 *
 * 启动方式：
 *   php -S 127.0.0.1:8090 -t public router.php
 *
 * 生产环境请勿使用本脚本，请改用 docker/nginx 中的 try_files 规则。
 *
 * @package WP004
 */

/**
 * 路径分隔符归一化：Windows 下 realpath() 返回 `\`，统一转成 `/`。
 *
 * @param string $path 原始路径。
 * @return string 归一化后的路径（目录不带结尾斜杠）。
 */
function wp004_normalize_path( $path ) {
	$path = str_replace( '\\', '/', (string) $path );
	return rtrim( $path, '/' );
}

$docroot = wp004_normalize_path( realpath( __DIR__ . '/public' ) );
$path    = rawurldecode( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ) );
$target  = wp004_normalize_path( realpath( $docroot . $path ) );

// 真实存在且位于站点根目录内的文件 → 内置服务器直接返回。
if ( false !== $target && is_file( $target ) && 0 === strpos( $target, $docroot . '/' ) ) {
	return false;
}

// 目录形式的请求交给 index.php（WordPress 会自行处理 /wp-admin/ 等入口）。
$_SERVER['SCRIPT_NAME'] = '/index.php';
require $docroot . '/index.php';
