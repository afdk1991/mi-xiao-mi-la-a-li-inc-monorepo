<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_FinanceSyncAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,provider,biz_type,biz_id,status,created_at FROM " . myp_table( 'finance_sync_log' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '财务软件对接' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '渠道', '业务', '业务ID', '状态', '时间' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
