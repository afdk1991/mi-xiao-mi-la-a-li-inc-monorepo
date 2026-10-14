<?php
/**
 * 结算与订单 API。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_CheckoutApi {

	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/checkout', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'checkout' ),
			'permission_callback' => function () {
				return is_user_logged_in() ? true : new WP_Error( 'login', '请登录', array( 'status' => 401 ) );
			},
		) );
		register_rest_route( MYP_REST_NAMESPACE, '/orders', array(
			'methods' => 'GET',
			'callback' => array( __CLASS__, 'orders' ),
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
	}

	public static function checkout( $req ) {
		$user_id = get_current_user_id();
		$items   = $req->get_param( 'items' );
		if ( ! is_array( $items ) || ! $items ) {
			return myp_response( 400, '购物车为空' );
		}

		// 商品有效性 + 原价总额
		$total = 0;
		foreach ( $items as $it ) {
			$product_id = (int) ( $it['product_id'] ?? 0 );
			if ( ! $product_id || 'publish' !== get_post_status( $product_id ) ) {
				return myp_response( 400, '商品不存在或已下架' );
			}
			$total += (float) get_post_meta( $product_id, '_myp_price', true ) * max( 1, intval( $it['quantity'] ?? 1 ) );
		}

		// 会员折扣（按当前等级折扣百分比，100 表示无折扣）
		$member_discount = 0.0;
		$level = ( new MyP_Core_Database_MemberLevelModel() )->user_level( $user_id );
		$rate  = $level ? (float) $level->discount : 100.0;
		if ( $rate < 100 ) {
			$member_discount = round( $total * ( 100 - $rate ) / 100, 2 );
		}

		// 优惠券折扣
		$coupon_id       = (int) $req->get_param( 'coupon_id' );
		$coupon_discount = 0.0;
		if ( $coupon_id ) {
			$coupon_discount = (float) ( new MyP_Core_Database_CouponModel() )->calc_discount( $coupon_id, $total - $member_discount );
		}

		// 积分抵现（myp_points_rate 积分抵 1 元，默认 100）
		$points_rate     = max( 1, (int) get_option( 'myp_points_rate', 100 ) );
		$points_use      = max( 0, (int) $req->get_param( 'use_points' ) );
		$points_discount = 0.0;
		if ( $points_use ) {
			$balance         = ( new MyP_Core_Database_PointsModel() )->balance( $user_id );
			$points_use      = min( $points_use, $balance );
			$points_discount = min( floor( $points_use / $points_rate ), $total - $member_discount - $coupon_discount );
			$points_use      = (int) ( $points_discount * $points_rate );
		}

		$discount = round( $member_discount + $coupon_discount + $points_discount, 2 );
		$shipping = (float) get_option( 'default_shipping', 0 );

		$model = new MyP_Core_Database_OrderModel();
		$order_id = $model->create( $user_id, $items, array(
			'discount'     => $discount,
			'coupon_id'    => $coupon_id,
			'shipping_fee' => $shipping,
			'consignee'    => sanitize_text_field( (string) $req->get_param( 'consignee' ) ),
			'mobile'       => sanitize_text_field( (string) $req->get_param( 'mobile' ) ),
			'address'      => sanitize_text_field( (string) $req->get_param( 'address' ) ),
			'remark'       => sanitize_textarea_field( (string) $req->get_param( 'remark' ) ),
		) );
		if ( is_wp_error( $order_id ) ) {
			return myp_response( 500, $order_id->get_error_message() );
		}

		// 核销优惠券 + 扣减积分 + 清空购物车
		if ( $coupon_id && $coupon_discount > 0 ) {
			( new MyP_Core_Database_CouponModel() )->mark_used( $coupon_id, $order_id );
		}
		if ( $points_use > 0 ) {
			( new MyP_Core_Database_PointsModel() )->change( $user_id, -$points_use, 'order', '订单积分抵现', $order_id );
		}
		( new MyP_Core_Database_CartModel() )->clear();

		return myp_response( 0, '下单成功', array(
			'order_id'   => $order_id,
			'total'      => round( $total, 2 ),
			'discount'   => $discount,
			'pay_amount' => round( $total - $discount + $shipping, 2 ),
		) );
	}

	public static function orders() {
		$list = ( new MyP_Core_Database_OrderModel() )->user_orders( get_current_user_id() );
		return myp_response( 0, 'ok', $list );
	}
}
