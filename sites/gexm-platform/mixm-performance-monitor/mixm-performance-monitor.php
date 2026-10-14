<?php
/**
 * Plugin Name: MixM Performance Monitor
 * Plugin URI: https://laal.top/
 * Description: Real-time performance monitoring for MixM Laal
 * Version: 1.0.0
 * Author: MixM Team
 * Text Domain: mixm-performance-monitor
 */

defined('ABSPATH') || exit;

define('MIXM_PERF_MONITOR_VERSION', '1.0.0');
define('MIXM_PERF_MONITOR_DIR', plugin_dir_path(__FILE__));
define('MIXM_PERF_MONITOR_URL', plugin_dir_url(__FILE__));

require_once MIXM_PERF_MONITOR_DIR . 'includes/class-monitor.php';
require_once MIXM_PERF_MONITOR_DIR . 'includes/class-admin.php';
require_once MIXM_PERF_MONITOR_DIR . 'includes/class-api.php';

register_activation_hook(__FILE__, 'mixm_perf_monitor_activate');
register_deactivation_hook(__FILE__, 'mixm_perf_monitor_deactivate');

function mixm_perf_monitor_activate() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'mixm_performance_metrics';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        response_time DECIMAL(10,4) NOT NULL,
        memory_usage INT NOT NULL,
        query_count INT NOT NULL,
        query_time DECIMAL(10,4) NOT NULL,
        cache_hits INT NOT NULL DEFAULT 0,
        cache_misses INT NOT NULL DEFAULT 0,
        request_url VARCHAR(512) NOT NULL,
        request_method VARCHAR(10) NOT NULL,
        status_code INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_response_time (response_time),
        INDEX idx_query_count (query_count)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    add_option('mixm_perf_monitor_version', MIXM_PERF_MONITOR_VERSION);
}

function mixm_perf_monitor_deactivate() {
    delete_option('mixm_perf_monitor_version');
}

function mixm_perf_monitor_init() {
    MixM_Performance_Monitor::get_instance();
    MixM_Performance_Admin::get_instance();
    MixM_Performance_API::get_instance();
}

add_action('plugins_loaded', 'mixm_perf_monitor_init');
