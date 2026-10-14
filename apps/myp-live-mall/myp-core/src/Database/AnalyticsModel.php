<?php
/**
 * 数据分析模型：7 大维度汇总。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_AnalyticsModel {

	public function overview() {
		global $wpdb;
		$op = myp_table( 'orders' );
		$uv = myp_table( 'live' );
		return array(
			'today_orders'    => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$op} WHERE DATE(created_at)=CURDATE()" ),
			'today_amount'   => (float) $wpdb->get_var( "SELECT COALESCE(SUM(pay_amount),0) FROM {$op} WHERE status='paid' AND DATE(paid_at)=CURDATE()" ),
			'total_users'     => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->users}" ),
			'total_orders'    => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$op}" ),
			'live_count'      => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$uv} WHERE status='living'" ),
		);
	}

	public function trend( $days = 30 ) {
		global $wpdb;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT stat_date, orders_count, goods_amount, new_users, live_views
			 FROM " . myp_table( 'analytics_daily' ) . "
			 ORDER BY stat_date DESC LIMIT %d", $days
		) );
	}
}
