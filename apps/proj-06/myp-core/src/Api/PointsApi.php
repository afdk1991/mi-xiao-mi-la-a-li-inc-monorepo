<?php
/**
 * 积分 API。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_PointsApi {
	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/points', array(
			'methods' => 'GET',
			'callback' => function () {
				$m = new MyP_Core_Database_PointsModel();
				return myp_response( 0, 'ok', array(
					'balance' => $m->balance( get_current_user_id() ),
					'logs'     => $m->logs( get_current_user_id() ),
				) );
			},
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
	}
}
