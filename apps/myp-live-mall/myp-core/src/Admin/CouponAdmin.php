<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_CouponAdmin {
	public static function render() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id,title,type,value,min_amount,total_stock,used_stock FROM " . myp_table( 'coupon' ), ARRAY_A );
		MyP_Core_Admin_AdminPageBase::header( '优惠券管理' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '名称', '类型', '面值', '门槛', '总量', '已领' ), $rows ?: array() );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
