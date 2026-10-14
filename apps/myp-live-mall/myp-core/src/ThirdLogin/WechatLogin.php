<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_ThirdLogin_WechatLogin extends MyP_Core_ThirdLogin_BaseLogin {
	public function authorize_url() {
		$appid = get_option( 'myp_wechat_appid', '' );
		$redirect = home_url( '/wechat-callback' );
		return 'https://open.weixin.qq.com/connect/qrconnect?appid=' . $appid .
			'&redirect_uri=' . urlencode( $redirect ) . '&response_type=code&scope=snsapi_login#wechat_redirect';
	}

	public function login_by_code( $code ) {
		// 用 code 换 access_token/openid，自动注册/登录
		return array( 'user_id' => 0, 'openid' => '' );
	}
}
