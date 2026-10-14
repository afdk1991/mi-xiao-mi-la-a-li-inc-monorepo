<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_OrderAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,order_no,user_id,pay_amount,status,created_at FROM " . myp_table( 'orders' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '订单管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '订单号', '用户', '金额', '状态', '时间' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
