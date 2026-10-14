<?php
/**
 * 积分模型：赠送 / 抵现 / 流水。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_PointsModel {

	public function balance( $user_id ) {
		global $wpdb;
		return (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(points),0) FROM " . myp_table( 'points_log' ) . " WHERE user_id=%d", $user_id
		) );
	}

	public function change( $user_id, $points, $type, $remark = '', $order_id = 0 ) {
		global $wpdb;
		$balance = $this->balance( $user_id ) + $points;
		if ( $balance < 0 ) {
			return new WP_Error( 'no_points', '积分不足' );
		}
		return $wpdb->insert( myp_table( 'points_log' ), array(
			'user_id'    => $user_id,
			'change_type' => $type,
			'points'     => $points,
			'balance'    => $balance,
			'remark'     => $remark,
			'order_id'   => $order_id,
			'created_at' => current_time( 'mysql' ),
		) );
	}

	public function logs( $user_id, $page = 1, $size = 20 ) {
		global $wpdb;
		$offset = ( $page - 1 ) * $size;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'points_log' ) . " WHERE user_id=%d ORDER BY id DESC LIMIT %d OFFSET %d",
			$user_id, $size, $offset
		) );
	}
}
