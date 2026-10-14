<?php
/**
 * 直播与弹幕礼物 API。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_LiveApi {

	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/live', array(
			array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'list' ), 'permission_callback' => '__return_true' ),
		) );
		register_rest_route( MYP_REST_NAMESPACE, '/live/(?P<id>\d+)', array(
			'methods' => 'GET', 'callback' => array( __CLASS__, 'detail' ), 'permission_callback' => '__return_true',
		) );
		register_rest_route( MYP_REST_NAMESPACE, '/live/(?P<id>\d+)/danmu', array(
			'methods' => 'POST', 'callback' => array( __CLASS__, 'danmu' ),
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
		register_rest_route( MYP_REST_NAMESPACE, '/live/(?P<id>\d+)/gift', array(
			'methods' => 'POST', 'callback' => array( __CLASS__, 'gift' ),
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
	}

	public static function list() {
		return myp_response( 0, 'ok', ( new MyP_Core_Database_LiveModel() )->upcoming() );
	}

	public static function detail( $req ) {
		$live = ( new MyP_Core_Database_LiveModel() )->get( (int) $req['id'] );
		$live->play_url = ( new MyP_Core_Live_StreamService() )->play_url( $live->stream_key );
		return myp_response( 0, 'ok', $live );
	}

	public static function danmu( $req ) {
		$content = sanitize_textarea_field( $req->get_param( 'content' ) );
		$res = ( new MyP_Core_Database_LiveDanmuModel() )->add(
			(int) $req['id'], get_current_user_id(), wp_get_current_user()->display_name, $content
		);
		return is_wp_error( $res ) ? myp_response( 400, $res->get_error_message() ) : myp_response( 0, 'ok' );
	}

	public static function gift( $req ) {
		$res = ( new MyP_Core_Database_LiveGiftModel() )->send(
			(int) $req['id'], get_current_user_id(),
			(int) $req->get_param( 'gift_id' ), max( 1, (int) $req->get_param( 'quantity' ) )
		);
		return is_wp_error( $res ) ? myp_response( 400, $res->get_error_message() ) : myp_response( 0, 'ok', $res );
	}
}
