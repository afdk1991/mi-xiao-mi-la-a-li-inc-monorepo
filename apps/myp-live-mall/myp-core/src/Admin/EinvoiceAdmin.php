<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_EinvoiceAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,order_id,einvoice_no,status FROM " . myp_table( 'invoice' ) . " WHERE einvoice_no<>'' ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '电子发票' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '订单', '发票号码', '状态' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
