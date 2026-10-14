<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Finance_KingdeeFinance extends MyP_Core_Finance_BaseFinanceSoftware {
	public function sync_order( $order ) {
		return array( 'provider' => 'kingdee', 'ok' => true );
	}
	public function sync_customer( $user ) {
		return array( 'provider' => 'kingdee', 'ok' => true );
	}
}
