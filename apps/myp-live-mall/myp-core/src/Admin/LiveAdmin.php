<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_LiveAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,title,anchor_id,status,start_time FROM " . myp_table( 'live' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '直播管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '标题', '主播', '状态', '开始时间' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
