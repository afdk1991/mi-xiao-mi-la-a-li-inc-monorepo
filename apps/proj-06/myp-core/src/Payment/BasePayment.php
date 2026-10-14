<?php
/**
 * 支付抽象基类。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class MyP_Core_Payment_BasePayment {
	protected $gateway = '';

	abstract public function pay( $order );
	abstract public function verify_callback( $request );

	public function get_gateway() {
		return $this->gateway;
	}
}
