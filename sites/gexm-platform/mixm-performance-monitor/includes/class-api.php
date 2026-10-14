<?php

defined('ABSPATH') || exit;

class MixM_Performance_API {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    public function register_routes() {
        register_rest_route('mixm/v1', '/performance/metrics', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_metrics'),
            'permission_callback' => array($this, 'check_permission'),
            'args' => array(
                'period' => array(
                    'type' => 'string',
                    'default' => '24h',
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function($param) {
                        return in_array($param, array('1h', '6h', '24h'));
                    }
                )
            )
        ));
        
        register_rest_route('mixm/v1', '/performance/realtime', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_realtime_metrics'),
            'permission_callback' => array($this, 'check_permission')
        ));
        
        register_rest_route('mixm/v1', '/performance/history', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_history'),
            'permission_callback' => array($this, 'check_permission'),
            'args' => array(
                'period' => array(
                    'type' => 'string',
                    'default' => '24h',
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function($param) {
                        return in_array($param, array('1h', '6h', '24h'));
                    }
                )
            )
        ));
        
        register_rest_route('mixm/v1', '/performance/slow-queries', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_slow_queries'),
            'permission_callback' => array($this, 'check_permission')
        ));
    }
    
    public function check_permission() {
        return current_user_can('manage_options');
    }
    
    public function get_metrics($request) {
        $period = $request->get_param('period');
        $monitor = MixM_Performance_Monitor::get_instance();
        $metrics = $monitor->get_metrics($period);
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => $metrics
        ), 200);
    }
    
    public function get_realtime_metrics($request) {
        $monitor = MixM_Performance_Monitor::get_instance();
        $metrics = $monitor->get_realtime_metrics();
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => $metrics
        ), 200);
    }
    
    public function get_history($request) {
        $period = $request->get_param('period');
        $monitor = MixM_Performance_Monitor::get_instance();
        $history = $monitor->get_history_data($period);
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => $history
        ), 200);
    }
    
    public function get_slow_queries($request) {
        $monitor = MixM_Performance_Monitor::get_instance();
        $slow_queries = $monitor->get_slow_queries();
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => $slow_queries
        ), 200);
    }
}
