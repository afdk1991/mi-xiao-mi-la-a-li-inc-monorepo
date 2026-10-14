<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_ThirdLogin_LoginManager {
	public static function provider( $name = 'wechat' ) {
		if ( 'wechat' === $name ) {
			return new MyP_Core_ThirdLogin_WechatLogin();
		}
		return null;
	}
}
