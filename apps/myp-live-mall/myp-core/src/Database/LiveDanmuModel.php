<?php
/**
 * 弹幕模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_LiveDanmuModel {

	private static $banned = array( '赌博', '色情', '诈骗' );

	public function add( $live_id, $user_id, $nickname, $content ) {
		foreach ( self::$banned as $word ) {
			if ( stripos( $content, $word ) !== false ) {
				return new WP_Error( 'sensitive', '包含敏感词' );
			}
		}
		global $wpdb;
		return $wpdb->insert( myp_table( 'live_danmu' ), array(
			'live_id' => $live_id, 'user_id' => $user_id,
			'nickname' => $nickname, 'content' => $content,
			'created_at' => current_time( 'mysql' ),
		) );
	}

	public function recent( $live_id, $since_id = 0, $limit = 50 ) {
		global $wpdb;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'live_danmu' ) . " WHERE live_id=%d AND id>%d ORDER BY id DESC LIMIT %d",
			$live_id, $since_id, $limit
		) );
	}
}
