<?php
/**
 * 支付 API：发起支付 + 回调。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Api_PaymentApi {

	public static function register_routes() {
		register_rest_route( MYP_REST_NAMESPACE, '/pay', array(
			'methods' => 'POST',
			'callback' => array( __CLASS__, 'pay' ),
			'permission_callback' => function () { return is_user_logged_in(); },
		) );
		register_rest_route( MYP_REST_NAMESPACE, '/pay/callback', array(
			'methods' => 'GET,POST',
			'callback' => array( __CLASS__, 'callback' ),
			'permission_callback' => '__return_true',
		) );
	}

	public static function pay( $req ) {
		$order_no = sanitize_text_field( $req->get_param( 'order_no' ) );
		$order = ( new MyP_Core_Database_OrderModel() )->get_by_no( $order_no );
		if ( ! $order ) {
			return myp_response( 404, '订单不存在' );
		}
		$gateway = MyP_Core_Payment_PaymentManager::gateway( 'demo' );
		$pay     = $gateway->pay( $order );
		return myp_response( 0, 'ok', $pay );
	}

	public static function callback( $req ) {
		$params  = $req->get_params();
		$gateway = MyP_Core_Payment_PaymentManager::gateway( 'demo' );

		// P0-5 修复:必须先验签,杜绝任意请求伪造已支付
		if ( ! $gateway || ! $gateway->verify_callback( $params ) ) {
			return myp_response( 403, '签名校验失败' );
		}

		$order_no = sanitize_text_field( $params['order_no'] ?? '' );
		$order    = ( new MyP_Core_Database_OrderModel() )->get_by_no( $order_no );
		if ( ! $order ) {
			return myp_response( 404, '订单不存在' );
		}

		// 幂等:重复回调直接返回成功,避免网关重试时报错
		if ( 'paid' === $order->status ) {
			return myp_response( 0, '订单已支付(幂等)' );
		}

		// 状态必须为 pending,其他状态拒绝
		if ( 'pending' !== $order->status ) {
			return myp_response( 409, '订单状态异常:' . $order->status );
		}

		// 金额核对:回调金额必须与订单 pay_amount 一致(容忍 0.01 元浮点误差)
		$amount = isset( $params['amount'] ) ? (float) $params['amount'] : (float) ( $params['pay_amount'] ?? 0 );
		if ( $amount <= 0 || abs( $amount - (float) $order->pay_amount ) > 0.01 ) {
			return myp_response( 402, '金额不匹配' );
		}

		( new MyP_Core_Database_OrderModel() )->mark_paid( $order->id, 'demo' );
		return myp_response( 0, '支付成功' );
	}
}
