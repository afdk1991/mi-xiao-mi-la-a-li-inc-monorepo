<?php
/**
 * 数据源：决策分析（对应架构文档「数据层 · ClickHouse/Celery」）。
 *
 * 聚合 ClickHouse 海量聚合分析与 Celery 决策看板指标。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 数据层决策分析数据源。
 */
class SAAS_Agg_Providers_Analytics extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'data';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'analytics';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( '决策分析', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( '数据层：ClickHouse 聚合分析与 Celery 决策看板。', 'saas-aggregator' );
	}

	/**
	 * 取数：GET 分析看板接口。
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
				'timeout'    => 12,
				'api_key'    => isset( $cfg['api_key'] ) ? $cfg['api_key'] : '',
				'api_secret' => isset( $cfg['api_secret'] ) ? $cfg['api_secret'] : '',
				'tenant_id'  => isset( $cfg['tenant_id'] ) ? $cfg['tenant_id'] : '',
			)
		);
	}

	/**
	 * 演示数据：模拟分析看板核心指标。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		$items = array(
			array(
				'title'   => __( '近 7 日营收趋势', 'saas-aggregator' ),
				'value'   => __( '↑ 14.2%', 'saas-aggregator' ),
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '功能模块使用 Top1', 'saas-aggregator' ),
				'value'   => __( '数据看板', 'saas-aggregator' ),
				'status'  => 'info',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '异常事件（近 24h）', 'saas-aggregator' ),
				'value'   => '3',
				'status'  => 'warn',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( 'Celery 队列积压', 'saas-aggregator' ),
				'value'   => '0',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '预测：下月续费率', 'saas-aggregator' ),
				'value'   => '94.1%',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
		);
		return array_slice( $items, 0, $limit );
	}
}
