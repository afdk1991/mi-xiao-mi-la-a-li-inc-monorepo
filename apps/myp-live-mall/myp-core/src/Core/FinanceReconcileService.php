<?php
/**
 * 财务对账：每日凌晨 2 点生成前一日对账单。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_FinanceReconcileService {

	public function __construct() {
		add_action( 'myp_daily_2am', array( $this, 'reconcile_yesterday' ) );
	}

	public function reconcile_yesterday() {
		global $wpdb;
		$date   = gmdate( 'Y-m-d', strtotime( '-1 day' ) );
		$op     = myp_table( 'orders' );
		$cp     = myp_table( 'distribution_commission' );
		$pp     = myp_table( 'points_log' );

		$order_count = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$op} WHERE status='paid' AND DATE(paid_at)=%s", $date
		) );
		$total = (float) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(pay_amount),0) FROM {$op} WHERE status='paid' AND DATE(paid_at)=%s", $date
		) );
		$commission = (float) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(amount),0) FROM {$cp} WHERE DATE(created_at)=%s", $date
		) );
		$points = (float) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(ABS(points)),0) FROM {$pp} WHERE change_type='grant' AND DATE(created_at)=%s", $date
		) );

		$exist = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM " . myp_table( 'finance_reconcile' ) . " WHERE bill_date=%s", $date
		) );
		if ( ! $exist ) {
			$wpdb->insert( myp_table( 'finance_reconcile' ), array(
				'bill_date' => $date,
				'order_count' => $order_count,
				'total_amount' => $total,
				'commission_amount' => $commission,
				'points_amount' => $points,
				'status' => 'done',
			) );
		}
	}
}
