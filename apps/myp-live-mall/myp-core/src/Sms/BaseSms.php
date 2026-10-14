<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class MyP_Core_Sms_BaseSms {
	abstract public function send( $mobile, $scene, $params = array() );
}
