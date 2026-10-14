<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Sms_SmsService {
	private static $last_sent = array();

	public static function send( $mobile, $scene, $params = array() ) {
		// 频率限制：同号同场景 60s 一次
		$key = $mobile . ':' . $scene;
		if ( isset( self::$last_sent[ $key ] ) && time() - self::$last_sent[ $key ] < 60 ) {
			return new WP_Error( 'rate_limit', '发送过于频繁' );
		}
		self::$last_sent[ $key ] = time();

		$provider = new MyP_Core_Sms_AliyunSms();
		$ok = $provider->send( $mobile, $scene, $params );

		global $wpdb;
		$wpdb->insert( myp_table( 'sms_log' ), array(
			'mobile' => $mobile, 'scene' => $scene,
			'content' => wp_json_encode( $params ),
			'status' => $ok ? 'sent' : 'failed',
			'provider' => 'aliyun',
			'created_at' => current_time( 'mysql' ),
		) );
		return $ok;
	}
}
