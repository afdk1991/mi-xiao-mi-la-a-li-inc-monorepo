<?php
/**
 * 优惠券模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_CouponModel {

	public function claim( $coupon_id, $user_id ) {
		global $wpdb;
		$coupon = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . myp_table( 'coupon' ) . " WHERE id=%d AND status=1", $coupon_id ) );
		if ( ! $coupon ) {
			return new WP_Error( 'no_coupon', '优惠券不存在' );
		}
		if ( $coupon->used_stock >= $coupon->total_stock ) {
			return new WP_Error( 'out_of_stock', '优惠券已领完' );
		}
		$wpdb->insert( myp_table( 'coupon_user' ), array(
			'coupon_id'  => $coupon_id,
			'user_id'    => $user_id,
			'status'     => 'unused',
			'received_at' => current_time( 'mysql' ),
		) );
		$wpdb->query( $wpdb->prepare( "UPDATE " . myp_table( 'coupon' ) . " SET used_stock=used_stock+1 WHERE id=%d", $coupon_id ) );
		return true;
	}

	public function calc_discount( $user_coupon_id, $amount ) {
		global $wpdb;
		$uc = $wpdb->get_row( $wpdb->prepare(
			"SELECT cu.*, c.type, c.value, c.min_amount FROM " . myp_table( 'coupon_user' ) . " cu
			 LEFT JOIN " . myp_table( 'coupon' ) . " c ON c.id=cu.coupon_id
			 WHERE cu.id=%d AND cu.status='unused'", $user_coupon_id
		) );
		if ( ! $uc || $amount < $uc->min_amount ) {
			return 0;
		}
		if ( 'minus' === $uc->type ) {
			return min( $uc->value, $amount );
		}
		if ( 'discount' === $uc->type ) {
			return round( $amount * ( 1 - $uc->value / 100 ), 2 );
		}
		return 0;
	}

	public function mark_used( $user_coupon_id, $order_id ) {
		global $wpdb;
		return $wpdb->update( myp_table( 'coupon_user' ),
			array( 'status' => 'used', 'used_order_id' => $order_id, 'used_at' => current_time( 'mysql' ) ),
			array( 'id' => $user_coupon_id )
		);
	}
}
