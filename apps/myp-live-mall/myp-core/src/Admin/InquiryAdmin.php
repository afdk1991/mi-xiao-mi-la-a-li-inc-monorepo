<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_InquiryAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT * FROM " . myp_table( 'inquiry' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '询盘管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '客户', '手机', '内容', '状态', '时间' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
