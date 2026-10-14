<?php
/**
 * 商品搜索过滤。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_Search {

	public function __construct() {
		add_action( 'pre_get_posts', array( $this, 'filter' ) );
	}

	public function filter( $query ) {
		if ( is_admin() || ! $query->is_main_query() ) {
			return;
		}
		if ( $query->is_search() && isset( $_GET['post_type'] ) && 'myp_product' === $_GET['post_type'] ) {
			$query->set( 'post_type', 'myp_product' );
		}
		if ( is_post_type_archive( 'myp_product' ) ) {
			$query->set( 'posts_per_page', get_option( 'myp_per_page', 12 ) );
			$orderby = isset( $_GET['orderby'] ) ? sanitize_text_field( $_GET['orderby'] ) : 'date';
			switch ( $orderby ) {
				case 'price_asc':
					$query->set( 'meta_key', '_myp_price' );
					$query->set( 'orderby', 'meta_value_num' );
					$query->set( 'order', 'ASC' );
					break;
				case 'price_desc':
					$query->set( 'meta_key', '_myp_price' );
					$query->set( 'orderby', 'meta_value_num' );
					$query->set( 'order', 'DESC' );
					break;
				default:
					$query->set( 'orderby', 'date' );
					$query->set( 'order', 'DESC' );
			}
		}
	}
}
