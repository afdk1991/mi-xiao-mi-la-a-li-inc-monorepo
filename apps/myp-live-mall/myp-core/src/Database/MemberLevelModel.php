<?php
/**
 * 会员等级模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_MemberLevelModel {

	public function all() {
		global $wpdb;
		return $wpdb->get_results( "SELECT * FROM " . myp_table( 'member_level' ) . " ORDER BY level ASC" );
	}

	public function user_level( $user_id ) {
		global $wpdb;
		$total = (float) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(pay_amount),0) FROM " . myp_table( 'orders' ) . " WHERE user_id=%d AND status='paid'", $user_id
		) );
		$level = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'member_level' ) . " WHERE min_amount <= %f ORDER BY level DESC LIMIT 1", $total
		) );
		return $level;
	}

	public function discount( $user_id ) {
		$lv = $this->user_level( $user_id );
		return $lv ? (float) $lv->discount : 100.0;
	}
}
