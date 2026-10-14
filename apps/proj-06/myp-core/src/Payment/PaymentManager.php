<?php
/**
 * 支付管理器：注册并调度各支付渠道。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Payment_PaymentManager {

	private static $gateways = array();

	public static function register( MyP_Core_Payment_BasePayment $gateway ) {
		self::$gateways[ $gateway->get_gateway() ] = $gateway;
	}

	public static function gateway( $name ) {
		return isset( self::$gateways[ $name ] ) ? self::$gateways[ $name ] : null;
	}

	public static function all() {
		return self::$gateways;
	}

	/**
	 * 在插件启动时注册内置渠道。
	 */
	public static function boot_defaults() {
		self::register( new MyP_Core_Payment_DemoPayment() );
	}
}
