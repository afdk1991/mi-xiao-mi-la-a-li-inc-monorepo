<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_MemberLevelAdmin {
	public static function render() {
		$rows = ( new MyP_Core_Database_MemberLevelModel() )->all();
		$data = array();
		foreach ( $rows as $r ) {
			$data[] = array( $r->id, $r->name, $r->level, $r->discount, $r->points_rate, $r->min_amount );
		}
		MyP_Core_Admin_AdminPageBase::header( '会员等级' );
		MyP_Core_Admin_AdminPageBase::table( array( 'ID', '名称', '等级', '折扣%', '积分倍率', '门槛金额' ), $data );
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
