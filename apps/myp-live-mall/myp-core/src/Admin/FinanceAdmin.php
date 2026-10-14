<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_FinanceAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT * FROM " . myp_table( 'finance_reconcile' ) . " ORDER BY bill_date DESC LIMIT 30", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '财务对账' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '日期', '订单数', '总额', '佣金', '积分', '状态' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
