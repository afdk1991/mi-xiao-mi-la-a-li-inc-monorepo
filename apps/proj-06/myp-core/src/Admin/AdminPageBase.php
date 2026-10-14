<?php
/**
 * 后台管理页基类：统一渲染容器。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Admin_AdminPageBase {
	public static function header( $title ) {
		echo '<div class="wrap"><h1>' . esc_html( $title ) . '</h1>';
	}
	public static function footer() {
		echo '</div>';
	}
	public static function table( $columns, $rows ) {
		echo '<table class="widefat striped"><thead><tr>';
		foreach ( $columns as $c ) { echo '<th>' . esc_html( $c ) . '</th>'; }
		echo '</tr></thead><tbody>';
		foreach ( $rows as $row ) {
			echo '<tr>';
			foreach ( $row as $cell ) { echo '<td>' . wp_kses_post( $cell ) . '</td>'; }
			echo '</tr>';
		}
		echo '</tbody></table>';
	}
}
