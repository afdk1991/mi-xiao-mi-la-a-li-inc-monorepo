<?php
/**
 * 订单模型：主表 + 明细表，事务安全下单。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_OrderModel {

	public function generate_order_no() {
		return 'MYP' . gmdate( 'YmdHis' ) . str_pad( wp_rand( 1000, 9999 ), 4, '0', STR_PAD_LEFT );
	}

	public function create( $user_id, $items, $args = array() ) {
		global $wpdb;
		$op = myp_table( 'orders' );
		$oi = myp_table( 'order_items' );

		$wpdb->query( 'START TRANSACTION' );

		// P0-6 修复:$wpdb->insert/query 失败返回 false 而非抛异常,
		// 原 try/catch(Exception) 是死代码,改为显式 false 判定 + ROLLBACK。
		$total = 0;
		$lines = array();
		foreach ( $items as $item ) {
			$price    = (float) get_post_meta( $item['product_id'], '_myp_price', true );
			$qty      = max( 1, intval( $item['quantity'] ) );
			$subtotal = $price * $qty;
			$total   += $subtotal;
			$lines[]  = array(
				'product_id'  => $item['product_id'],
				'product_name' => get_the_title( $item['product_id'] ),
				'sku'         => get_post_meta( $item['product_id'], '_myp_sku', true ),
				'price'       => $price,
				'quantity'    => $qty,
				'subtotal'    => $subtotal,
			);
		}

		$order_no   = $this->generate_order_no();
		$pay_amount = $total - (float) ( $args['discount'] ?? 0 ) + (float) ( $args['shipping_fee'] ?? 0 );

		$inserted = $wpdb->insert( $op, array(
			'order_no'        => $order_no,
			'user_id'         => $user_id,
			'status'          => 'pending',
			'total_amount'    => $total,
			'discount_amount' => $args['discount'] ?? 0,
			'shipping_fee'    => $args['shipping_fee'] ?? 0,
			'pay_amount'      => $pay_amount,
			'coupon_id'       => $args['coupon_id'] ?? 0,
			'consignee'       => $args['consignee'] ?? '',
			'mobile'          => $args['mobile'] ?? '',
			'address'         => $args['address'] ?? '',
			'remark'          => $args['remark'] ?? '',
			'created_at'      => current_time( 'mysql' ),
			'updated_at'      => current_time( 'mysql' ),
		) );

		if ( false === $inserted ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'order_failed', '订单主表写入失败: ' . $wpdb->last_error );
		}

		$order_id = (int) $wpdb->insert_id;

		foreach ( $lines as $line ) {
			$line['order_id'] = $order_id;
			$inserted_item = $wpdb->insert( $oi, $line );
			if ( false === $inserted_item ) {
				$wpdb->query( 'ROLLBACK' );
				return new WP_Error( 'order_failed', '订单明细写入失败: ' . $wpdb->last_error );
			}
		}

		$wpdb->query( 'COMMIT' );
		return $order_id;
	}

	public function get( $order_id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . myp_table( 'orders' ) . " WHERE id=%d", $order_id ) );
		if ( $row ) {
			$row->items = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM " . myp_table( 'order_items' ) . " WHERE order_id=%d", $order_id ) );
		}
		return $row;
	}

	public function get_by_no( $order_no ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . myp_table( 'orders' ) . " WHERE order_no=%s", $order_no ) );
	}

	public function set_status( $order_id, $status, $extra = array() ) {
		global $wpdb;
		$data = array( 'status' => $status, 'updated_at' => current_time( 'mysql' ) );
		if ( 'paid' === $status ) {
			$data['paid_at'] = current_time( 'mysql' );
		}
		$data = array_merge( $data, $extra );
		return $wpdb->update( myp_table( 'orders' ), $data, array( 'id' => $order_id ) );
	}

	public function mark_paid( $order_id, $pay_method ) {
		$this->set_status( $order_id, 'paid', array( 'pay_method' => $pay_method ) );
		do_action( 'myp_order_paid', $order_id );
	}

	public function user_orders( $user_id, $page = 1, $size = 10 ) {
		global $wpdb;
		$offset = ( $page - 1 ) * $size;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'orders' ) . " WHERE user_id=%d ORDER BY id DESC LIMIT %d OFFSET %d",
			$user_id, $size, $offset
		) );
	}
}
