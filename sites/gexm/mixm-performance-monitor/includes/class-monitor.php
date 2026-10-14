<?php

defined('ABSPATH') || exit;

class MixM_Performance_Monitor {
    
    private static $instance = null;
    
    private $queries = array();
    private $slow_queries = array();
    private $start_time;
    private $start_memory;
    private $cache_hits = 0;
    private $cache_misses = 0;
    private $slow_query_threshold = 0.5;
    
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
        add_action('init', array($this, 'start_monitoring'));
        add_action('shutdown', array($this, 'end_monitoring'));
        add_action('wp_cache_get', array($this, 'log_cache_get'), 10, 4);
    }
    
    public function log_cache_get($value, $key, $group, &$found) {
        if ($found) {
            $this->cache_hits++;
        } else {
            $this->cache_misses++;
        }
        return $value;
    }
    
    public function start_monitoring() {
        $this->start_time = microtime(true);
        $this->start_memory = memory_get_usage();
        $this->queries = array();
        $this->slow_queries = array();
        $this->cache_hits = 0;
        $this->cache_misses = 0;
    }
    
    public function end_monitoring() {
        if (defined('DOING_CRON') && DOING_CRON) {
            return;
        }
        
        if (defined('REST_REQUEST') && REST_REQUEST) {
            return;
        }
        
        $metrics = array(
            'response_time' => round(microtime(true) - $this->start_time, 4),
            'memory_usage' => memory_get_peak_usage() - $this->start_memory,
            'query_count' => count($this->queries),
            'query_time' => round(array_sum(array_column($this->queries, 'time')), 4),
            'cache_hits' => $this->cache_hits,
            'cache_misses' => $this->cache_misses,
            'request_url' => isset($_SERVER['REQUEST_URI']) ? sanitize_text_field($_SERVER['REQUEST_URI']) : '',
            'request_method' => isset($_SERVER['REQUEST_METHOD']) ? sanitize_text_field($_SERVER['REQUEST_METHOD']) : 'GET',
            'status_code' => http_response_code(),
            'timestamp' => time()
        );
        
        $this->store_metrics($metrics);
        
        foreach ($this->slow_queries as $slow_query) {
            $this->store_slow_query($slow_query);
        }
    }
    
    public function log_query($query) {
        $start = microtime(true);
        
        add_filter('posts_results', function($results) use ($start, $query) {
            $query_time = microtime(true) - $start;
            $this->queries[] = array(
                'query' => $query,
                'time' => $query_time,
                'timestamp' => time()
            );
            
            if ($query_time > $this->slow_query_threshold) {
                $this->slow_queries[] = array(
                    'query' => $query,
                    'time' => $query_time,
                    'request_url' => isset($_SERVER['REQUEST_URI']) ? sanitize_text_field($_SERVER['REQUEST_URI']) : '',
                    'timestamp' => time()
                );
            }
            
            return $results;
        });
        
        return $query;
    }
    
    public function store_metrics($metrics) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'mixm_performance_metrics';
        
        $wpdb->insert(
            $table_name,
            array(
                'response_time' => $metrics['response_time'],
                'memory_usage' => $metrics['memory_usage'],
                'query_count' => $metrics['query_count'],
                'query_time' => $metrics['query_time'],
                'cache_hits' => $metrics['cache_hits'],
                'cache_misses' => $metrics['cache_misses'],
                'request_url' => $metrics['request_url'],
                'request_method' => $metrics['request_method'],
                'status_code' => $metrics['status_code']
            ),
            array('%f', '%d', '%d', '%f', '%d', '%d', '%s', '%s', '%d')
        );
        
        $this->cleanup_old_data();
    }
    
    private function store_slow_query($slow_query) {
        $slow_queries = get_transient('mixm_slow_queries');
        if (!$slow_queries) {
            $slow_queries = array();
        }
        
        $slow_queries[] = $slow_query;
        
        if (count($slow_queries) > 100) {
            $slow_queries = array_slice($slow_queries, -100);
        }
        
        set_transient('mixm_slow_queries', $slow_queries, HOUR_IN_SECONDS);
    }
    
    private function cleanup_old_data() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'mixm_performance_metrics';
        
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM $table_name WHERE created_at < %s",
                date('Y-m-d H:i:s', strtotime('-7 days'))
            )
        );
    }
    
    public function get_metrics($period = '24h') {
        global $wpdb;
        $table_name = $wpdb->prefix . 'mixm_performance_metrics';
        
        $time_range = $this->get_time_range($period);
        
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table_name WHERE created_at >= %s ORDER BY created_at DESC",
                $time_range
            )
        );
        
        return $results ? $results : array();
    }
    
    public function get_realtime_metrics() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'mixm_performance_metrics';
        
        $results = $wpdb->get_results(
            "SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 10"
        );
        
        if (empty($results)) {
            return array(
                'response_time' => 0,
                'memory_usage' => 0,
                'query_count' => 0,
                'query_time' => 0,
                'cache_hits' => 0,
                'cache_misses' => 0,
                'cache_hit_rate' => 0
            );
        }
        
        $total_hits = 0;
        $total_misses = 0;
        $count = count($results);
        
        foreach ($results as $row) {
            $total_hits += $row->cache_hits;
            $total_misses += $row->cache_misses;
        }
        
        $cache_hit_rate = ($total_hits + $total_misses) > 0 ?
            round(($total_hits / ($total_hits + $total_misses)) * 100, 2) : 0;
        
        return array(
            'response_time' => round(array_sum(array_column($results, 'response_time')) / $count, 4),
            'memory_usage' => round(array_sum(array_column($results, 'memory_usage')) / $count),
            'query_count' => round(array_sum(array_column($results, 'query_count')) / $count),
            'query_time' => round(array_sum(array_column($results, 'query_time')) / $count, 4),
            'cache_hits' => $total_hits,
            'cache_misses' => $total_misses,
            'cache_hit_rate' => $cache_hit_rate
        );
    }
    
    public function get_slow_queries() {
        $slow_queries = get_transient('mixm_slow_queries');
        return $slow_queries ? $slow_queries : array();
    }
    
    public function get_history_data($period = '24h') {
        global $wpdb;
        $table_name = $wpdb->prefix . 'mixm_performance_metrics';
        
        $time_range = $this->get_time_range($period);
        
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i') as time_slot,
                    AVG(response_time) as avg_response_time,
                    AVG(memory_usage) as avg_memory_usage,
                    AVG(query_count) as avg_query_count,
                    AVG(query_time) as avg_query_time,
                    SUM(cache_hits) as total_cache_hits,
                    SUM(cache_misses) as total_cache_misses
                FROM $table_name 
                WHERE created_at >= %s 
                GROUP BY time_slot 
                ORDER BY time_slot ASC",
                $time_range
            )
        );
        
        return $results ? $results : array();
    }
    
    private function get_time_range($period) {
        switch ($period) {
            case '1h':
                return date('Y-m-d H:i:s', strtotime('-1 hour'));
            case '6h':
                return date('Y-m-d H:i:s', strtotime('-6 hours'));
            case '24h':
            default:
                return date('Y-m-d H:i:s', strtotime('-24 hours'));
        }
    }
}
