<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_Settings {
	public static function render() {
		if ( isset( $_POST['myp_save'] ) ) {
			check_admin_referer( 'myp_settings' );
			foreach ( array( 'order_prefix', 'default_shipping', 'service_phone', 'myp_srs_rtmp', 'myp_srs_http', 'myp_srs_api', 'myp_finance_provider' ) as $k ) {
				if ( isset( $_POST[ $k ] ) ) { update_option( $k, sanitize_text_field( wp_unslash( $_POST[ $k ] ) ) ); }
			}
			echo '<div class="updated"><p>已保存</p></div>';
		}
		MyP_Core_Admin_AdminPageBase::header( '全局设置' );
		echo '<form method="post">';
		wp_nonce_field( 'myp_settings' );
		echo '<table class="form-table">';
		foreach ( array(
			'order_prefix' => '订单号前缀', 'default_shipping' => '默认运费',
			'service_phone' => '客服电话', 'myp_srs_rtmp' => 'SRS RTMP 地址',
			'myp_srs_http' => 'SRS HTTP 地址', 'myp_srs_api' => 'SRS API 地址',
			'myp_finance_provider' => '财务软件(yonyou/kingdee)',
		) as $k => $label ) {
			echo '<tr><th>' . esc_html( $label ) . '</th><td><input name="' . esc_attr( $k ) . '" value="' . esc_attr( get_option( $k ) ) . '" class="regular-text"></td></tr>';
		}
		echo '</table><p><button class="button button-primary" name="myp_save" value="1">保存</button></p></form>';
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
