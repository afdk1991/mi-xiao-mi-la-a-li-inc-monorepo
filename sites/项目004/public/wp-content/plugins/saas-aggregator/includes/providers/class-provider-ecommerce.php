<?php
/**
 * 数据源：电商商品（对应主站电商业务 Node.js API）。
 *
 * 聚合主站 node-api 的商品数据，展示到 WordPress 主站聚合门户。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 电商商品数据源。
 */
class SAAS_Agg_Providers_Ecommerce extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'ecommerce';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'ecommerce';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( '电商商品', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( '主站电商：Node.js API 商品、库存与销售数据。', 'saas-aggregator' );
	}

	/**
	 * 取数：GET 商品列表接口（node-api /api/products）。
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

		$data = SAAS_Agg_API_Client::get(
			$url,
			array(
				'timeout'    => 10,
				'api_key'    => isset( $cfg['api_key'] ) ? $cfg['api_key'] : '',
				'api_secret' => isset( $cfg['api_secret'] ) ? $cfg['api_secret'] : '',
				'tenant_id'  => isset( $cfg['tenant_id'] ) ? $cfg['tenant_id'] : '',
			)
		);

		if ( is_wp_error( $data ) ) {
			return $data;
		}

		// node-api 返回结构：{ code, msg, data: { products: [...] } }
		$products = array();
		if ( isset( $data['data']['products'] ) && is_array( $data['data']['products'] ) ) {
			$products = $data['data']['products'];
		} elseif ( isset( $data['products'] ) && is_array( $data['products'] ) ) {
			$products = $data['products'];
		} elseif ( is_array( $data ) && empty( $data['data'] ) && isset( $data[0] ) ) {
			$products = $data;
		}

		$items = array();
		foreach ( array_slice( $products, 0, $limit ) as $p ) {
			if ( ! is_array( $p ) ) {
				continue;
			}
			$price  = isset( $p['price'] ) ? number_format( (float) $p['price'], 2 ) : '0.00';
			$items[] = array(
				'title'   => isset( $p['name'] ) ? $p['name'] : __( '未命名商品', 'saas-aggregator' ),
				'value'   => '¥' . $price,
				'status'  => 'ok',
				'meta'    => sprintf(
					/* translators: %1$s 分类 %2$d 库存 %3$d 销量 */
					__( '%1$s · 库存 %2$d · 销量 %3$d', 'saas-aggregator' ),
					isset( $p['category'] ) ? $p['category'] : '-',
					isset( $p['stock'] ) ? (int) $p['stock'] : 0,
					isset( $p['sales'] ) ? (int) $p['sales'] : 0
				),
				'updated' => isset( $p['created_at'] ) ? $p['created_at'] : current_time( 'mysql' ),
			);
		}

		return $items;
	}

	/**
	 * 演示数据：模拟商品列表。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		$items = array(
			array(
				'title'   => __( 'iPhone 15 Pro', 'saas-aggregator' ),
				'value'   => '¥7,999.00',
				'status'  => 'ok',
				'meta'    => __( '数码 · 库存 100 · 销量 12', 'saas-aggregator' ),
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( 'MacBook Pro 14', 'saas-aggregator' ),
				'value'   => '¥14,999.00',
				'status'  => 'ok',
				'meta'    => __( '数码 · 库存 50 · 销量 6', 'saas-aggregator' ),
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( 'AirPods Pro 2', 'saas-aggregator' ),
				'value'   => '¥1,899.00',
				'status'  => 'ok',
				'meta'    => __( '数码 · 库存 200 · 销量 30', 'saas-aggregator' ),
				'updated' => current_time( 'mysql' ),
			),
		);
		return array_slice( $items, 0, $limit );
	}
}
