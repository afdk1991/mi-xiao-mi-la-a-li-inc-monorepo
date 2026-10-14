<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class MyP_Core_ThirdLogin_BaseLogin {
	abstract public function authorize_url();
	abstract public function login_by_code( $code );
}
