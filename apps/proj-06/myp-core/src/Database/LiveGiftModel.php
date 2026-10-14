<?php
/**
 * 礼物模型：打赏扣积分 + 全屏特效。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_LiveGiftModel {

	public function all() {
		global $wpdb;
		return $wpdb->get_results( "SELECT * FROM " . myp_table( 'live_gift' ) . " WHERE status=1" );
	}

	public function send( $live_id, $user_id, $gift_id, $quantity = 1 ) {
		global $wpdb;
		$gift = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . myp_table( 'live_gift' ) . " WHERE id=%d", $gift_id ) );
		if ( ! $gift ) {
			return new WP_Error( 'no_gift', '礼物不存在' );
		}
		$cost = (int) $gift->points * $quantity;
		$points = new MyP_Core_Database_PointsModel();
		$deduct = $points->change( $user_id, -$cost, 'gift', '直播打赏', $live_id );
		if ( is_wp_error( $deduct ) ) {
			return $deduct;
		}
		$wpdb->insert( myp_table( 'live_gift_record' ), array(
			'live_id' => $live_id, 'user_id' => $user_id, 'gift_id' => $gift_id,
			'quantity' => $quantity, 'points' => $cost, 'created_at' => current_time( 'mysql' ),
		) );
		return array( 'gift' => $gift, 'cost' => $cost );
	}

	public function rank( $live_id, $limit = 10 ) {
		global $wpdb;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT user_id, SUM(points) AS total FROM " . myp_table( 'live_gift_record' ) .
			" WHERE live_id=%d GROUP BY user_id ORDER BY total DESC LIMIT %d", $live_id, $limit
		) );
	}
}
