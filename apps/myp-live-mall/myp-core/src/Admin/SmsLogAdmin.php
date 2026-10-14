<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_SmsLogAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,mobile,scene,status,created_at FROM " . myp_table( 'sms_log' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '短信发送记录' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '手机号', '场景', '状态', '时间' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
