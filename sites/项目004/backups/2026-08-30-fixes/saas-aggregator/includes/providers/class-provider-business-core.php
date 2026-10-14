<?php
/**
 * 数据源：业务核心（对应架构文档「应用层 · Java」）。
 *
 * 聚合 Java 业务微服务的订单、账务、权限等强一致业务数据。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Java 应用层业务核心数据源。
 */
class SAAS_Agg_Providers_Business_Core extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'java';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'business_core';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( '业务核心', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( 'Java 应用层：订单、账务、权限等强一致业务数据。', 'saas-aggregator' );
	}

	/**
	 * 取数：GET 业务汇总接口。
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
	 * 将 Java 订单列表（List<Order>）归一化为标准条目。
	 *
	 * Order JSON 字段：id / tenantId / product / amount / status / createdAt。
	 *
	 * @param array $body 解码后的订单数组。
	 * @return array
	 */
	protected function normalize_response( $body ) {
		if ( ! is_array( $body ) ) {
			return array();
		}
		$out = array();
		foreach ( $body as $order ) {
			if ( ! is_array( $order ) ) {
				continue;
			}
			$id      = isset( $order['id'] ) ? $order['id'] : ( isset( $order['orderId'] ) ? $order['orderId'] : '' );
			$tenant  = isset( $order['tenantId'] ) ? $order['tenantId'] : '';
			$product = isset( $order['product'] ) ? $order['product'] : '';
			$amount  = isset( $order['amount'] ) ? $order['amount'] : '';
			$status  = isset( $order['status'] ) ? (string) $order['status'] : 'info';
			$created = isset( $order['createdAt'] ) ? $order['createdAt'] : '';
			$out[]   = $this->normalize_item(
				array(
					'title'   => '订单 #' . $id . ( $product ? ' · ' . $product : '' ),
					'value'   => $status,
					'status'  => in_array( $status, array( 'ok', 'warn', 'error', 'info' ), true ) ? $status : 'info',
					'updated' => (string) $created,
					'meta'    => array( 'tenant' => $tenant, 'amount' => (string) $amount ),
				)
			);
		}
		return $out;
	}

	/**
	 * 演示数据：模拟业务核心关键指标。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		$items = array(
			array(
				'title'   => __( '今日订单数', 'saas-aggregator' ),
				'value'   => '2,318',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
				'url'     => '',
			),
			array(
				'title'   => __( '待对账金额', 'saas-aggregator' ),
				'value'   => '¥ 86,420.00',
				'status'  => 'warn',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '分布式事务成功率', 'saas-aggregator' ),
				'value'   => '99.999%',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '活跃租户数', 'saas-aggregator' ),
				'value'   => '572',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '权限校验异常', 'saas-aggregator' ),
				'value'   => '0',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
		);
		return array_slice( $items, 0, $limit );
	}
}
