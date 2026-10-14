<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_ReportAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,name,frequency,recipients,last_sent_at FROM " . myp_table( 'report_task' ), ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '报表推送任务' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '名称', '频率', '收件人', '上次发送' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
