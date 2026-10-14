<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_DistributionAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,user_id,order_id,level,amount,status FROM " . myp_table( 'distribution_commission' ) . " ORDER BY id DESC LIMIT 100", ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '分销管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '用户', '订单', '层级', '佣金', '状态' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
