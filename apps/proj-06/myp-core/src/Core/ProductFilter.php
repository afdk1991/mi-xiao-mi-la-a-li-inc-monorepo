<?php
/**
 * 高级筛选：价格区间 / 仅看有货 / 价格排序。
 *
 * P1-9 修复：原实现挂 `myp_product_query` 动作但全项目无人 `apply_filters`，是死代码。
 * 改为挂 `pre_get_posts` 直接作用于主查询（商品归档/分类/标签页），筛选与排序即可生效。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_ProductFilter {

	public function __construct() {
		add_action( 'pre_get_posts', array( $this, 'apply' ), 10, 1 );
	}

	public function apply( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}
		if ( ! ( is_post_type_archive( 'myp_product' ) || is_tax( array( 'myp_product_cat', 'myp_product_tag' ) ) ) ) {
			return;
		}

		$meta_query = $query->get( 'meta_query' );
		if ( ! is_array( $meta_query ) ) {
			$meta_query = array();
		}

		if ( isset( $_GET['min_price'] ) && $_GET['min_price'] !== '' ) {
			$meta_query[] = array(
				'key'     => '_myp_price',
				'value'   => floatval( $_GET['min_price'] ),
				'type'    => 'NUMERIC',
				'compare' => '>=',
			);
		}
		if ( isset( $_GET['max_price'] ) && $_GET['max_price'] !== '' ) {
			$meta_query[] = array(
				'key'     => '_myp_price',
				'value'   => floatval( $_GET['max_price'] ),
				'type'    => 'NUMERIC',
				'compare' => '<=',
			);
		}
		if ( ! empty( $_GET['in_stock'] ) ) {
			$meta_query[] = array(
				'key'     => '_myp_stock',
				'value'   => 0,
				'type'    => 'NUMERIC',
				'compare' => '>',
			);
		}

		if ( $meta_query ) {
			$query->set( 'meta_query', $meta_query );
		}

		// 价格排序
		$orderby = $_GET['orderby'] ?? '';
		if ( 'price_asc' === $orderby || 'price_desc' === $orderby ) {
			$query->set( 'meta_key', '_myp_price' );
			$query->set( 'orderby', 'meta_value_num' );
			$query->set( 'order', 'price_asc' === $orderby ? 'ASC' : 'DESC' );
		}
	}
}
