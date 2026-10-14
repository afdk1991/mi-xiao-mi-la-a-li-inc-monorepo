<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
class MyP_Core_Admin_Analytics {
	public static function render() {
		$ov = ( new MyP_Core_Database_AnalyticsModel() )->overview();
		MyP_Core_Admin_AdminPageBase::header( '数据大屏' );
		echo '<div style="display:flex;gap:16px;flex-wrap:wrap">';
		foreach ( $ov as $k => $v ) {
			echo '<div style="flex:1;min-width:160px;padding:16px;background:#fff;border-left:4px solid #2271b1"><h3>' . esc_html( $k ) . '</h3><p style="font-size:24px;margin:0">' . esc_html( $v ) . '</p></div>';
		}
		echo '</div>';
		MyP_Core_Admin_AdminPageBase::footer();
	}
}
