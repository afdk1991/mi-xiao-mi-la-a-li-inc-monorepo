<?php
/**
 * 推流与混流服务：对接 SRS。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Live_StreamService {

	public function rtmp_url( $stream_key ) {
		$host = get_option( 'myp_srs_rtmp', 'rtmp://localhost:1935/live' );
		return rtrim( $host, '/' ) . '/' . $stream_key;
	}

	public function play_url( $stream_key ) {
		$host = get_option( 'myp_srs_http', 'http://localhost:8080/live' );
		return rtrim( $host, '/' ) . '/' . $stream_key . '.flv';
	}

	public function status( $stream_key ) {
		$api = get_option( 'myp_srs_api', 'http://localhost:1985/api/v1/streams' );
		$res = wp_remote_get( $api . '/' . $stream_key, array( 'timeout' => 5 ) );
		if ( is_wp_error( $res ) ) {
			return false;
		}
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		return ! empty( $body['streams'] );
	}
}
