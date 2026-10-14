<?php

defined('ABSPATH') || exit;

class MixM_Performance_Admin {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->setup_hooks();
    }
    
    private function setup_hooks() {
        add_action('admin_menu', array($this, 'add_menu_page'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
    }
    
    public function add_menu_page() {
        add_menu_page(
            '性能监控',
            '性能监控',
            'manage_options',
            'mixm-performance-monitor',
            array($this, 'render_dashboard'),
            'dashicons-chart-line',
            6
        );
        
        add_submenu_page(
            'mixm-performance-monitor',
            '性能趋势',
            '性能趋势',
            'manage_options',
            'mixm-performance-trends',
            array($this, 'render_trends')
        );
        
        add_submenu_page(
            'mixm-performance-monitor',
            '慢查询',
            '慢查询',
            'manage_options',
            'mixm-performance-slow-queries',
            array($this, 'render_slow_queries')
        );
    }
    
    public function enqueue_scripts($hook) {
        if (!strpos($hook, 'mixm-performance')) {
            return;
        }
        
        wp_enqueue_style(
            'mixm-perf-monitor-admin',
            MIXM_PERF_MONITOR_URL . 'assets/css/admin.css',
            array(),
            MIXM_PERF_MONITOR_VERSION
        );
        
        wp_enqueue_script(
            'mixm-perf-monitor-admin',
            MIXM_PERF_MONITOR_URL . 'assets/js/admin.js',
            array('jquery', 'chartjs'),
            MIXM_PERF_MONITOR_VERSION,
            true
        );
        
        wp_enqueue_script(
            'chartjs',
            'https://cdn.jsdelivr.net/npm/chart.js',
            array(),
            '4.4.0',
            true
        );
        
        wp_localize_script('mixm-perf-monitor-admin', 'mixmPerfMonitor', array(
            'restUrl' => get_rest_url(),
            'nonce' => wp_create_nonce('wp_rest')
        ));
    }
    
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'mixm_perf_monitor_dashboard',
            'MixM 性能监控',
            array($this, 'render_dashboard_widget')
        );
    }
    
    public function render_dashboard_widget() {
        $monitor = MixM_Performance_Monitor::get_instance();
        $metrics = $monitor->get_realtime_metrics();
        
        ?>
        <div class="mixm-dashboard-widget">
            <div class="mixm-metric-grid">
                <div class="mixm-metric-item">
                    <div class="mixm-metric-value"><?php echo number_format($metrics['response_time'], 4); ?>s</div>
                    <div class="mixm-metric-label">响应时间</div>
                </div>
                <div class="mixm-metric-item">
                    <div class="mixm-metric-value"><?php echo number_format($metrics['memory_usage'] / 1024 / 1024, 2); ?>MB</div>
                    <div class="mixm-metric-label">内存使用</div>
                </div>
                <div class="mixm-metric-item">
                    <div class="mixm-metric-value"><?php echo $metrics['query_count']; ?></div>
                    <div class="mixm-metric-label">查询次数</div>
                </div>
                <div class="mixm-metric-item">
                    <div class="mixm-metric-value"><?php echo number_format($metrics['query_time'], 4); ?>s</div>
                    <div class="mixm-metric-label">查询耗时</div>
                </div>
            </div>
            <div class="mixm-cache-stats">
                <div class="mixm-cache-bar">
                    <div class="mixm-cache-hit" style="width: <?php echo $metrics['cache_hit_rate']; ?>%"></div>
                    <div class="mixm-cache-miss" style="width: <?php echo 100 - $metrics['cache_hit_rate']; ?>%"></div>
                </div>
                <div class="mixm-cache-label">缓存命中率: <?php echo $metrics['cache_hit_rate']; ?>%</div>
            </div>
        </div>
        <?php
    }
    
    public function render_dashboard() {
        $monitor = MixM_Performance_Monitor::get_instance();
        $metrics = $monitor->get_realtime_metrics();
        $recent_metrics = $monitor->get_metrics('1h');
        
        ?>
        <div class="wrap mixm-perf-monitor">
            <h1 class="wp-heading-inline">性能监控仪表盘</h1>
            
            <div class="mixm-stats-grid">
                <div class="mixm-stat-card">
                    <div class="mixm-stat-icon dashicons dashicons-clock"></div>
                    <div class="mixm-stat-content">
                        <div class="mixm-stat-value"><?php echo number_format($metrics['response_time'], 4); ?> <span class="mixm-stat-unit">秒</span></div>
                        <div class="mixm-stat-label">平均响应时间</div>
                    </div>
                    <?php if ($metrics['response_time'] > 2) : ?>
                        <div class="mixm-stat-alert mixm-alert-warning"></div>
                    <?php endif; ?>
                </div>
                
                <div class="mixm-stat-card">
                    <div class="mixm-stat-icon dashicons dashicons-database"></div>
                    <div class="mixm-stat-content">
                        <div class="mixm-stat-value"><?php echo $metrics['query_count']; ?> <span class="mixm-stat-unit">次</span></div>
                        <div class="mixm-stat-label">平均查询次数</div>
                    </div>
                    <?php if ($metrics['query_count'] > 100) : ?>
                        <div class="mixm-stat-alert mixm-alert-warning"></div>
                    <?php endif; ?>
                </div>
                
                <div class="mixm-stat-card">
                    <div class="mixm-stat-icon dashicons dashicons-hammer"></div>
                    <div class="mixm-stat-content">
                        <div class="mixm-stat-value"><?php echo number_format($metrics['query_time'], 4); ?> <span class="mixm-stat-unit">秒</span></div>
                        <div class="mixm-stat-label">平均查询耗时</div>
                    </div>
                    <?php if ($metrics['query_time'] > 1) : ?>
                        <div class="mixm-stat-alert mixm-alert-warning"></div>
                    <?php endif; ?>
                </div>
                
                <div class="mixm-stat-card">
                    <div class="mixm-stat-icon dashicons dashicons-memory"></div>
                    <div class="mixm-stat-content">
                        <div class="mixm-stat-value"><?php echo number_format($metrics['memory_usage'] / 1024 / 1024, 2); ?> <span class="mixm-stat-unit">MB</span></div>
                        <div class="mixm-stat-label">平均内存使用</div>
                    </div>
                    <?php if ($metrics['memory_usage'] / 1024 / 1024 > 256) : ?>
                        <div class="mixm-stat-alert mixm-alert-warning"></div>
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="mixm-section">
                <h2>缓存统计</h2>
                <div class="mixm-cache-container">
                    <div class="mixm-cache-info">
                        <div class="mixm-cache-row">
                            <span>缓存命中:</span>
                            <strong><?php echo $metrics['cache_hits']; ?></strong>
                        </div>
                        <div class="mixm-cache-row">
                            <span>缓存未命中:</span>
                            <strong><?php echo $metrics['cache_misses']; ?></strong>
                        </div>
                        <div class="mixm-cache-row mixm-cache-row-highlight">
                            <span>命中率:</span>
                            <strong><?php echo $metrics['cache_hit_rate']; ?>%</strong>
                        </div>
                    </div>
                    <div class="mixm-cache-chart">
                        <div class="mixm-cache-bar-container">
                            <div class="mixm-cache-bar">
                                <div class="mixm-cache-hit" style="width: <?php echo $metrics['cache_hit_rate']; ?>%"></div>
                                <div class="mixm-cache-miss" style="width: <?php echo 100 - $metrics['cache_hit_rate']; ?>%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mixm-section">
                <h2>最近请求记录</h2>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>URL</th>
                            <th>响应时间</th>
                            <th>查询次数</th>
                            <th>查询耗时</th>
                            <th>内存使用</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($recent_metrics)) : ?>
                            <?php foreach ($recent_metrics as $metric) : ?>
                                <tr>
                                    <td><?php echo $metric->created_at; ?></td>
                                    <td><?php echo esc_html($metric->request_url); ?></td>
                                    <td><?php echo number_format($metric->response_time, 4); ?>s</td>
                                    <td><?php echo $metric->query_count; ?></td>
                                    <td><?php echo number_format($metric->query_time, 4); ?>s</td>
                                    <td><?php echo number_format($metric->memory_usage / 1024 / 1024, 2); ?>MB</td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else : ?>
                            <tr>
                                <td colspan="6" class="no-items">暂无数据</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }
    
    public function render_trends() {
        ?>
        <div class="wrap mixm-perf-monitor">
            <h1 class="wp-heading-inline">性能趋势</h1>
            
            <div class="mixm-period-tabs">
                <button class="mixm-period-tab active" data-period="1h">1小时</button>
                <button class="mixm-period-tab" data-period="6h">6小时</button>
                <button class="mixm-period-tab" data-period="24h">24小时</button>
            </div>
            
            <div class="mixm-chart-container">
                <canvas id="mixmResponseTimeChart"></canvas>
            </div>
            
            <div class="mixm-chart-container">
                <canvas id="mixmMemoryChart"></canvas>
            </div>
            
            <div class="mixm-chart-container">
                <canvas id="mixmQueryChart"></canvas>
            </div>
        </div>
        <?php
    }
    
    public function render_slow_queries() {
        $monitor = MixM_Performance_Monitor::get_instance();
        $slow_queries = $monitor->get_slow_queries();
        
        ?>
        <div class="wrap mixm-perf-monitor">
            <h1 class="wp-heading-inline">慢查询日志</h1>
            
            <div class="mixm-section">
                <p class="description">显示查询时间超过 0.5 秒的数据库查询</p>
                
                <?php if (!empty($slow_queries)) : ?>
                    <div class="mixm-slow-queries-list">
                        <?php foreach ($slow_queries as $query) : ?>
                            <div class="mixm-slow-query-item">
                                <div class="mixm-slow-query-header">
                                    <span class="mixm-slow-query-time"><?php echo number_format($query['time'], 4); ?>s</span>
                                    <span class="mixm-slow-query-url"><?php echo esc_html($query['request_url']); ?></span>
                                </div>
                                <div class="mixm-slow-query-body">
                                    <code><?php echo esc_html($query['query']); ?></code>
                                </div>
                                <div class="mixm-slow-query-footer">
                                    <?php echo date('Y-m-d H:i:s', $query['timestamp']); ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php else : ?>
                    <div class="mixm-empty-state">
                        <div class="dashicons dashicons-thumb-up"></div>
                        <p>暂无慢查询记录</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}
