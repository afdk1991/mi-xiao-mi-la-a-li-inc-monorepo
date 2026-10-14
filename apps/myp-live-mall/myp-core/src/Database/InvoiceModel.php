<?php
/**
 * 发票申请模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_InvoiceModel {

	public function apply( $order_id, $user_id, $data ) {
		global $wpdb;
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order ) {
			return new WP_Error( 'no_order', '订单不存在' );
		}
		return $wpdb->insert( myp_table( 'invoice' ), array(
			'order_id' => $order_id, 'user_id' => $user_id,
			'type' => $data['type'] ?? 'normal', 'title' => $data['title'] ?? '',
			'tax_no' => $data['tax_no'] ?? '', 'amount' => $order->pay_amount,
			'status' => 'pending', 'applied_at' => current_time( 'mysql' ),
		) );
	}

	public function approve( $id, $einvoice_no = '', $file_url = '' ) {
		global $wpdb;
		return $wpdb->update( myp_table( 'invoice' ), array(
			'status' => 'approved', 'einvoice_no' => $einvoice_no, 'file_url' => $file_url,
		), array( 'id' => $id ) );
	}

	public function by_user( $user_id, $page = 1, $size = 20 ) {
		global $wpdb;
		$offset = ( $page - 1 ) * $size;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'invoice' ) . " WHERE user_id=%d ORDER BY id DESC LIMIT %d OFFSET %d",
			$user_id, $size, $offset
		) );
	}
}
