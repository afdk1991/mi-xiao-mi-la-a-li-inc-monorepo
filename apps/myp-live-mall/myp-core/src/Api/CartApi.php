<?php
/**
 * 购物车 API。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_CartApi {

	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/cart', array(
			array( 'methods' => 'GET',  'callback' => array( __CLASS__, 'list' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'add' ), 'permission_callback' => '__return_true' ),
		) );
		register_rest_route( MYP_REST_NAMESPACE, '/cart/(?P<id>\d+)', array(
			'methods' => 'DELETE', 'callback' => array( __CLASS__, 'remove' ),
			'permission_callback' => '__return_true',
		) );
	}

	public static function list() {
		return myp_response( 0, 'ok', ( new MyP_Core_Database_CartModel() )->items() );
	}

	public static function add( $req ) {
		$product_id = (int) $req->get_param( 'product_id' );
		$qty        = max( 1, (int) $req->get_param( 'quantity' ) );
		( new MyP_Core_Database_CartModel() )->add( $product_id, $qty );
		return myp_response( 0, '已加入购物车' );
	}

	public static function remove( $req ) {
		( new MyP_Core_Database_CartModel() )->remove( (int) $req['id'] );
		return myp_response( 0, '已删除' );
	}
}
