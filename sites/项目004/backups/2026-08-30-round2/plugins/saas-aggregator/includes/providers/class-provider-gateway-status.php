<?php
/**
 * 数据源：网关状态（对应架构文档「接入层 · Go」）。
 *
 * 聚合 Go 网关的健康、限流、实时通道等指标。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Go 接入层网关状态数据源。
 */
class SAAS_Agg_Providers_Gateway_Status extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'go';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'gateway_status';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( '网关状态', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( 'Go 接入层：API 网关健康、限流、WebSocket/SSE 实时通道状态。', 'saas-aggregator' );
	}

	/**
	 * 取数：GET 网关状态接口。
	 *
	 * @param array $cfg   配置。
	 * @param int   $limit 条数。
	 * @return array|WP_Error
	 */
	protected function do_fetch( $cfg, $limit ) {
		$url = SAAS_Agg_API_Client::build_url( $cfg );
		if ( is_wp_error( $url ) ) {
			return $url;
		}
		return SAAS_Agg_API_Client::get(
			$url,
			array(
				'timeout'    => 10,
				'api_key'    => isset( $cfg['api_key'] ) ? $cfg['api_key'] : '',
				'api_secret' => isset( $cfg['api_secret'] ) ? $cfg['api_secret'] : '',
				'tenant_id'  => isset( $cfg['tenant_id'] ) ? $cfg['tenant_id'] : '',
			)
		);
	}

	/**
	 * 演示数据：模拟网关运行指标。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		$items = array(
			array(
				'title'   => __( 'API 网关可用性', 'saas-aggregator' ),
				'value'   => '99.98%',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '当前 QPS（单机）', 'saas-aggregator' ),
				'value'   => '12,840',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( 'P99 网关延迟', 'saas-aggregator' ),
				'value'   => '38 ms',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '限流触发次数（近 1h）', 'saas-aggregator' ),
				'value'   => '147',
				'status'  => 'warn',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( 'WebSocket 活跃连接', 'saas-aggregator' ),
				'value'   => '3,205',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
		);
		return array_slice( $items, 0, $limit );
	}
}
