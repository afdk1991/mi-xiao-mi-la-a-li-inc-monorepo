<?php
/**
 * 小程序专属 API：Token 鉴权 + 全接口适配。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_MiniApi {

	public static function register_routes() {
		register_rest_route( MYP_MINI_REST_NAMESPACE, '/login', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'login' ),
			'permission_callback' => '__return_true',
		) );
		register_rest_route( MYP_MINI_REST_NAMESPACE, '/user', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'user' ),
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
	}

	public static function login( $req ) {
		// 小程序 code -> openid -> 签发 token
		$code = sanitize_text_field( $req->get_param( 'code' ) );
		$provider = new MyP_Core_ThirdLogin_WechatLogin();
		$res = $provider->login_by_code( $code );
		return myp_response( 0, 'ok', $res );
	}

	public static function user() {
		$u = wp_get_current_user();
		return myp_response( 0, 'ok', array( 'id' => $u->ID, 'nickname' => $u->display_name ) );
	}
}
