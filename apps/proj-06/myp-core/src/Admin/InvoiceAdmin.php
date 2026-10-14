<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_InvoiceAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,order_id,title,amount,status,applied_at FROM " . myp_table( 'invoice' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '发票管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '订单', '抬头', '金额', '状态', '申请时间' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
