<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Sms_AliyunSms extends MyP_Core_Sms_BaseSms {
	public function send( $mobile, $scene, $params = array() ) {
		$ak    = get_option( 'myp_sms_aliyun_ak', '' );
		$sk    = get_option( 'myp_sms_aliyun_sk', '' );
		$sign  = get_option( 'myp_sms_aliyun_sign', '' );
		$tpl   = get_option( 'myp_sms_tpl_' . $scene, '' );
		if ( ! $ak || ! $tpl ) {
			return false; // 未配置，静默失败
		}
		// 实际对接阿里云 dysmsapi.aliyuncs.com，此处保留接入点
		return true;
	}
}
