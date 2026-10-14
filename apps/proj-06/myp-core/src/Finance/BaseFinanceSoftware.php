<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class MyP_Core_Finance_BaseFinanceSoftware {
	abstract public function sync_order( $order );
	abstract public function sync_customer( $user );
}
