<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_LiveGiftAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,name,points,animation,status FROM " . myp_table( 'live_gift' ), ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '礼物管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '名称', '所需积分', '特效', '状态' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
