<?php
/**
 * 卸载清理：删除插件设置与缓存残留。
 *
 * 仅在 WordPress 标准卸载流程中执行（WP_UNINSTALL_PLUGIN 常量已定义）。
 *
 * @package SAAS_Aggregator
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// 清理定时任务。
$prune_hook = 'saas_agg_prune_logs';
$timestamp  = wp_next_scheduled( $prune_hook );
if ( $timestamp ) {
	wp_unschedule_event( $timestamp, $prune_hook );
}
wp_clear_scheduled_hook( $prune_hook );

// 清理审计日志表（含结构版本记录）。
require_once __DIR__ . '/includes/class-db.php';
SAAS_Agg_DB::uninstall();

// 清理租户映射（用户 meta）。
// phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->delete( $wpdb->usermeta, array( 'meta_key' => 'saas_agg_tenant_id' ), array( '%s' ) );

// 删除主设置项与缓存键跟踪表。
delete_option( 'saas_aggregator_settings' );
delete_option( 'saas_agg_cache_keys' );

// 设置结构版本号也要删：留着会让重装后的站点被判定为「已迁移过」，
// 从而跳过后续版本的所有迁移。
delete_option( 'saas_aggregator_settings_schema' );

// 兜底：直接清理可能残留的 transient（含 timeout 记录）。
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		'_transient_saas_agg_%',
		'_transient_timeout_saas_agg_%'
	)
);
