<?php
/**
 * REST API 层：把聚合能力以 WordPress 原生 REST 路由暴露出去。
 *
 * 全部使用 register_rest_route() 注册，遵循原生 REST 基础设施：
 * - 与 /wp-json/ 路由体系、权限回调、参数校验、schema 完全一致；
 * - 可被 Gutenberg 区块、移动端、第三方系统直接消费；
 * - 支持 Application Password / Cookie 等原生认证方式。
 *
 * 命名空间：saas-aggregator/v1
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST 控制器。
 */
class SAAS_Agg_REST {

	/**
	 * 命名空间。
	 *
	 * @var string
	 */
	const NAMESPACE = 'saas-aggregator/v1';

	/**
	 * 构造：挂载路由注册钩子。
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * 注册全部路由。
	 *
	 * @return void
	 */
	public function register_routes() {
		// 数据源清单。
		register_rest_route(
			self::NAMESPACE,
			'/sources',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_sources' ),
				'permission_callback' => array( $this, 'read_permission' ),
			)
		);

		// 聚合数据。
		register_rest_route(
			self::NAMESPACE,
			'/data',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_data' ),
				'permission_callback' => array( $this, 'read_permission' ),
				'args'                => array(
					'source' => array(
						'description'       => __( '数据源标识，留空或填 all 表示全部。', 'saas-aggregator' ),
						'type'              => 'string',
						'default'           => 'all',
						'sanitize_callback' => 'sanitize_key',
					),
					'limit'  => array(
						'description'       => __( '每个数据源返回条数。', 'saas-aggregator' ),
						'type'              => 'integer',
						'default'           => 5,
						'sanitize_callback' => 'absint',
						'validate_callback' => array( $this, 'validate_limit' ),
					),
					'fresh'  => array(
						'description'       => __( '为 1 时跳过缓存强制回源。', 'saas-aggregator' ),
						'type'              => 'boolean',
						'default'           => false,
						'sanitize_callback' => 'rest_sanitize_boolean',
					),
				),
			)
		);

		// 健康探针：只返回状态与耗时，不返回业务数据，便于监控接入。
		register_rest_route(
			self::NAMESPACE,
			'/health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_health' ),
				'permission_callback' => array( $this, 'read_permission' ),
			)
		);

		// 清缓存（写操作，需要管理权限）。
		register_rest_route(
			self::NAMESPACE,
			'/cache/flush',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'flush_cache' ),
				'permission_callback' => array( $this, 'manage_permission' ),
				'args'                => array(
					'source' => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		// 审计日志（敏感，需要管理权限）。
		register_rest_route(
			self::NAMESPACE,
			'/logs',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_logs' ),
				'permission_callback' => array( $this, 'manage_permission' ),
				'args'                => array(
					'limit'       => array(
						'type'              => 'integer',
						'default'           => 20,
						'sanitize_callback' => 'absint',
					),
					'offset'      => array(
						'type'              => 'integer',
						'default'           => 0,
						'sanitize_callback' => 'absint',
					),
					'tenant_id'   => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'provider_id' => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_key',
					),
					'result'      => array(
						'type'              => 'string',
						'default'           => '',
						'enum'              => array( '', 'ok', 'error' ),
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);
	}

	/**
	 * limit 参数校验。
	 *
	 * @param mixed $value 参数值。
	 * @return bool
	 */
	public function validate_limit( $value ) {
		$value = (int) $value;
		return $value >= 1 && $value <= 50;
	}

	/**
	 * 读权限：默认要求登录用户。
	 *
	 * 站点若需把聚合数据开放给匿名访客，可用过滤器放开：
	 * add_filter( 'saas_agg_rest_public_read', '__return_true' );
	 *
	 * @return bool|WP_Error
	 */
	public function read_permission() {
		$public = (bool) apply_filters( 'saas_agg_rest_public_read', false );

		if ( $public ) {
			return $this->rate_limit_ok();
		}

		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'saas_agg_rest_forbidden',
				__( '需要登录后访问该接口。', 'saas-aggregator' ),
				array( 'status' => 401 )
			);
		}

		return $this->rate_limit_ok();
	}

	/**
	 * 管理权限。
	 *
	 * @return bool|WP_Error
	 */
	public function manage_permission() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'saas_agg_rest_forbidden',
				__( '需要管理员权限。', 'saas-aggregator' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * 简易速率限制：每 IP 每分钟 60 次，防止接口被刷。
	 *
	 * @return bool|WP_Error
	 */
	private function rate_limit_ok() {
		$ip   = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$key  = 'saas_agg_rl_' . md5( $ip );
		$hits = (int) get_transient( $key );

		$max = (int) apply_filters( 'saas_agg_rest_rate_limit', 60 );

		if ( $hits >= $max ) {
			return new WP_Error(
				'saas_agg_rest_rate_limited',
				__( '请求过于频繁，请稍后再试。', 'saas-aggregator' ),
				array( 'status' => 429 )
			);
		}

		set_transient( $key, $hits + 1, MINUTE_IN_SECONDS );
		return true;
	}

	/**
	 * GET /sources —— 数据源清单。
	 *
	 * @return WP_REST_Response
	 */
	public function get_sources() {
		$settings  = saas_agg_get_settings();
		$providers = SAAS_Agg_Provider_Manager::get_providers();
		$items     = array();

		foreach ( $providers as $id => $provider ) {
			$cfg = isset( $settings['providers'][ $id ] ) ? $settings['providers'][ $id ] : array();

			$items[] = array(
				'id'          => $provider->get_id(),
				'label'       => $provider->get_label(),
				'description' => $provider->get_description(),
				'layer'       => $provider->get_layer(),
				'enabled'     => isset( $cfg['enabled'] ) ? ( 'yes' === $cfg['enabled'] ) : false,
				'configured'  => $provider->is_configured( $cfg ),
				'cache_ttl'   => isset( $cfg['cache_ttl'] ) ? (int) $cfg['cache_ttl'] : 0,
				'method'      => isset( $cfg['method'] ) ? $cfg['method'] : 'GET',
				'endpoint'    => isset( $cfg['endpoint_path'] ) ? $cfg['endpoint_path'] : '',
			);
		}

		return rest_ensure_response(
			array(
				'tenant'   => SAAS_Agg_Tenant::get_current_tenant(),
				'count'    => count( $items ),
				'sources'  => $items,
			)
		);
	}

	/**
	 * GET /data —— 聚合数据。
	 *
	 * @param WP_REST_Request $request 请求对象。
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_data( $request ) {
		$source = $request->get_param( 'source' );
		$limit  = (int) $request->get_param( 'limit' );
		$fresh  = (bool) $request->get_param( 'fresh' );

		if ( $fresh && current_user_can( 'manage_options' ) ) {
			SAAS_Agg_Provider_Manager::flush_cache( 'all' === $source ? null : $source );
		}

		$start    = microtime( true );
		$sources  = SAAS_Agg_Provider_Manager::aggregate( $source, $limit );
		$duration = (int) round( ( microtime( true ) - $start ) * 1000 );

		// aggregate() 的返回结构为 {source,label,description,layer,status,items,message,cached}。
		$error_count = 0;
		foreach ( $sources as $item ) {
			if ( isset( $item['status'] ) && 'error' === $item['status'] ) {
				++$error_count;
			}
		}

		// 审计留痕：只记录元信息，不记录响应正文。
		if ( class_exists( 'SAAS_Agg_DB' ) ) {
			SAAS_Agg_DB::log(
				array(
					'tenant_id'   => SAAS_Agg_Tenant::get_current_tenant(),
					'provider_id' => 'all' === $source ? '*' : $source,
					'endpoint'    => 'rest:/data',
					'http_status' => 200,
					'duration_ms' => $duration,
					'result'      => $error_count > 0 ? 'error' : 'ok',
					'message'     => $error_count > 0 ? sprintf( '%d 个数据源返回错误', $error_count ) : '',
				)
			);
		}

		return rest_ensure_response(
			array(
				'tenant'      => SAAS_Agg_Tenant::get_current_tenant(),
				'source'      => $source,
				'limit'       => $limit,
				'duration_ms' => $duration,
				'error_count' => $error_count,
				'sources'     => $sources,
			)
		);
	}

	/**
	 * GET /health —— 健康探针。
	 *
	 * @return WP_REST_Response
	 */
	public function get_health() {
		$settings  = saas_agg_get_settings();
		$providers = SAAS_Agg_Provider_Manager::get_providers();
		$checks    = array();

		foreach ( $providers as $id => $provider ) {
			$cfg = isset( $settings['providers'][ $id ] ) ? $settings['providers'][ $id ] : array();

			if ( empty( $cfg['enabled'] ) || 'yes' !== $cfg['enabled'] ) {
				$checks[] = array(
					'id'     => $id,
					'status' => 'disabled',
				);
				continue;
			}

			$start = microtime( true );
			$items = $provider->fetch_items( $cfg, 1 );
			$ms    = (int) round( ( microtime( true ) - $start ) * 1000 );

			$checks[] = array(
				'id'          => $id,
				'label'       => $provider->get_label(),
				'layer'       => $provider->get_layer(),
				'status'      => is_wp_error( $items ) ? 'error' : 'ok',
				'duration_ms' => $ms,
				'message'     => is_wp_error( $items ) ? $items->get_error_message() : '',
			);
		}

		$down = 0;
		foreach ( $checks as $check ) {
			if ( 'error' === $check['status'] ) {
				++$down;
			}
		}

		$response = rest_ensure_response(
			array(
				'ok'       => 0 === $down,
				'down'     => $down,
				'total'    => count( $checks ),
				'checks'   => $checks,
			)
		);

		if ( $down > 0 ) {
			$response->set_status( 503 );
		}

		return $response;
	}

	/**
	 * POST /cache/flush —— 清理缓存。
	 *
	 * @param WP_REST_Request $request 请求对象。
	 * @return WP_REST_Response
	 */
	public function flush_cache( $request ) {
		$source = $request->get_param( 'source' );

		SAAS_Agg_Provider_Manager::flush_cache( '' === $source ? null : $source );

		return rest_ensure_response(
			array(
				'flushed' => '' === $source ? 'all' : $source,
				'time'    => current_time( 'mysql' ),
			)
		);
	}

	/**
	 * GET /logs —— 审计日志。
	 *
	 * @param WP_REST_Request $request 请求对象。
	 * @return WP_REST_Response
	 */
	public function get_logs( $request ) {
		$rows = SAAS_Agg_DB::query(
			array(
				'limit'       => (int) $request->get_param( 'limit' ),
				'offset'      => (int) $request->get_param( 'offset' ),
				'tenant_id'   => (string) $request->get_param( 'tenant_id' ),
				'provider_id' => (string) $request->get_param( 'provider_id' ),
				'result'      => (string) $request->get_param( 'result' ),
			)
		);

		return rest_ensure_response(
			array(
				'total' => SAAS_Agg_DB::count(),
				'rows'  => $rows,
			)
		);
	}
}
