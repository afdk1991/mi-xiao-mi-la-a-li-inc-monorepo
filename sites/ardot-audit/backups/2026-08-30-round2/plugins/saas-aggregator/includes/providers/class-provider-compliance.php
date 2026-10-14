<?php
/**
 * 数据源：合规审计（对应架构文档「安全合规层」）。
 *
 * 聚合等保、脱敏、审计留痕与权限状态。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 安全合规层数据源。
 */
class SAAS_Agg_Providers_Compliance extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'security';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'compliance';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( '合规审计', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( '安全合规层：等保、脱敏、审计留痕与权限状态。', 'saas-aggregator' );
	}

	/**
	 * 取数：GET 合规状态接口。
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
	 * 演示数据：模拟合规与审计状态。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		$items = array(
			array(
				'title'   => __( '等保 2.0 等级', 'saas-aggregator' ),
				'value'   => __( '三级（已测评）', 'saas-aggregator' ),
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '敏感字段脱敏覆盖率', 'saas-aggregator' ),
				'value'   => '100%',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '审计日志完整性', 'saas-aggregator' ),
				'value'   => __( '全链路覆盖', 'saas-aggregator' ),
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '越权访问拦截', 'saas-aggregator' ),
				'value'   => '11 次（今日）',
				'status'  => 'warn',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '密钥轮转状态', 'saas-aggregator' ),
				'value'   => __( '正常（KMS 托管）', 'saas-aggregator' ),
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
		);
		return array_slice( $items, 0, $limit );
	}
}
