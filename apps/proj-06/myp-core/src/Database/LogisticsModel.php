<?php
/**
 * 物流模型：多段轨迹。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_LogisticsModel {

	public function ship( $order_id, $company, $tracking_no ) {
		global $wpdb;
		$wpdb->insert( myp_table( 'logistics' ), array(
			'order_id' => $order_id, 'company' => $company,
			'tracking_no' => $tracking_no, 'shipped_at' => current_time( 'mysql' ),
		) );
		( new MyP_Core_Database_OrderModel() )->set_status( $order_id, 'shipped' );
		do_action( 'myp_order_shipped', $order_id );
		return $wpdb->insert_id;
	}

	public function add_trace( $logistics_id, $context ) {
		global $wpdb;
		return $wpdb->insert( myp_table( 'logistics_trace' ), array(
			'logistics_id' => $logistics_id, 'context' => $context, 'trace_time' => current_time( 'mysql' ),
		) );
	}

	public function track( $order_id ) {
		global $wpdb;
		$lg = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'logistics' ) . " WHERE order_id=%d ORDER BY id DESC LIMIT 1", $order_id
		) );
		if ( $lg ) {
			$lg->traces = $wpdb->get_results( $wpdb->prepare(
				"SELECT * FROM " . myp_table( 'logistics_trace' ) . " WHERE logistics_id=%d ORDER BY id DESC", $lg->id
			) );
		}
		return $lg;
	}
}
