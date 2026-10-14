<?php
/**
 * 模拟支付（测试用）：直接返回成功页。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Payment_DemoPayment extends MyP_Core_Payment_BasePayment {
	protected $gateway = 'demo';

	public function pay( $order ) {
		return array(
			'type' => 'redirect',
			'url'  => add_query_arg( array(
				'myp_pay'  => 'demo',
				'order_no' => $order->order_no,
				'sign'     => $this->sign( $order->order_no ),
			), home_url( '/checkout/return' ) ),
		);
	}

	public function verify_callback( $request ) {
		// 演示网关开关：生产环境必须关闭，否则等于任何人都能「零元完成支付」。
		if ( ! $this->enabled() ) {
			return false;
		}
		$order_no = isset( $request['order_no'] ) ? (string) $request['order_no'] : '';
		$sign     = isset( $request['sign'] ) ? (string) $request['sign'] : '';
		if ( '' === $order_no || '' === $sign ) {
			return false;
		}
		// 恒定时间比较，避免签名比对被时序侧信道逐字节探测
		return hash_equals( $this->sign( $order_no ), $sign );
	}

	/**
	 * 演示网关是否启用。
	 *
	 * 原实现无任何开关，且签名可自行计算（md5(order_no.'demo')，盐是硬编码字面量、
	 * 不含任何秘密），导致任何人拿到/枚举订单号即可算出合法签名，把任意订单
	 * 伪造成「已支付」。现在：显式配置 myp_demo_pay_enabled 优先；
	 * 未配置时仅在 WP_DEBUG（调试环境）下启用，生产环境默认关闭。
	 */
	private function enabled() {
		$opt = get_option( 'myp_demo_pay_enabled', null );
		if ( null !== $opt ) {
			return (bool) $opt;
		}
		return defined( 'WP_DEBUG' ) && WP_DEBUG;
	}

	/**
	 * 回调签名：改用站点私有密钥（wp_salt）做 HMAC-SHA256。
	 * 不再使用硬编码的 'demo' 盐 —— 它不含任何秘密，签名可被任何人算出。
	 */
	private function sign( $order_no ) {
		return hash_hmac( 'sha256', (string) $order_no, wp_salt( 'auth' ) );
	}
}
