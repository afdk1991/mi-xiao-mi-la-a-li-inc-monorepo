<?php
/**
 * 发票 API。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_InvoiceApi {
	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/invoice', array(
			array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'list' ),
				'permission_callback' => function () { return is_user_logged_in(); } ),
			array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'apply' ),
				'permission_callback' => function () { return is_user_logged_in(); } ),
		) );
	}

	public static function list() {
		return myp_response( 0, 'ok', ( new MyP_Core_Database_InvoiceModel() )->by_user( get_current_user_id() ) );
	}

	public static function apply( $req ) {
		$res = ( new MyP_Core_Database_InvoiceModel() )->apply(
			(int) $req->get_param( 'order_id' ), get_current_user_id(), $req->get_params()
		);
		return is_wp_error( $res ) ? myp_response( 400, $res->get_error_message() ) : myp_response( 0, '申请成功' );
	}
}
