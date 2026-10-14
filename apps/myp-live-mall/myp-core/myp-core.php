<?php
/**
 * Plugin Name: MYP 核心商城系统
 * Plugin URI:  https://example.com/myp-core
 * Description: 电商 + 直播 + 分销 + 财务一体化核心插件，统一数据层、权限、API、事件与调度。
 * Version:     1.0.0
 * Author:      MYP
 * Text Domain: myp-core
 * Requires PHP: 7.2
 * Requires at least: 5.6
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MYP_CORE_VERSION', '1.0.0' );
define( 'MYP_CORE_FILE', __FILE__ );
define( 'MYP_CORE_DIR', plugin_dir_path( __FILE__ ) );
define( 'MYP_CORE_URL', plugin_dir_url( __FILE__ ) );
define( 'MYP_CORE_PREFIX', 'myp_' );
define( 'MYP_REST_NAMESPACE', 'myp/v1' );
define( 'MYP_MINI_REST_NAMESPACE', 'myp-mini/v1' );

/**
 * 自动加载（仅本插件 src 目录下的类）。
 * 约定：类名 MyP_Core_Admin_Settings -> src/Admin/Settings.php
 *       类名 MyP_Core_Core_Bootstrap -> src/Core/Bootstrap.php
 */
spl_autoload_register( function ( $class ) {
	if ( strpos( $class, 'MyP_Core_' ) !== 0 ) {
		return;
	}
	$relative = substr( $class, 9 ); // 去掉 "MyP_Core_" 前缀
	$path     = MYP_CORE_DIR . 'src/' . str_replace( '_', '/', $relative ) . '.php';
	if ( file_exists( $path ) ) {
		require_once $path;
	}
} );

/**
 * 统一表名（带 wpdb 前缀）。
 */
function myp_table( $name ) {
	global $wpdb;
	return $wpdb->prefix . MYP_CORE_PREFIX . $name;
}

/**
 * 统一 JSON 返回。
 */
function myp_response( $code = 0, $msg = 'ok', $data = null ) {
	return rest_ensure_response( array(
		'code' => $code,
		'msg'  => $msg,
		'data' => $data,
	) );
}

// 激活 / 卸载
register_activation_hook( __FILE__, array( 'MyP_Core_Database_Installer', 'install' ) );
register_uninstall_hook( __FILE__, array( 'MyP_Core_Database_Installer', 'uninstall' ) );

// 启动引导
add_action( 'plugins_loaded', array( 'MyP_Core_Core_Bootstrap', 'instance' ) );
