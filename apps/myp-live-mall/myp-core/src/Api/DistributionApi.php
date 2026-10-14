<?php
/**
 * 分销 API。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_DistributionApi {
	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/distribution/summary', array(
			'methods' => 'GET',
			'callback' => function () {
				return myp_response( 0, 'ok', ( new MyP_Core_Database_DistributionModel() )->summary( get_current_user_id() ) );
			},
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
	}
}
