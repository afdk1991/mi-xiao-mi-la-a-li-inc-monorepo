<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Finance_FinanceSyncService {
	public function __construct() {
		add_action( 'myp_daily_3am', array( $this, 'sync_daily' ) );
		add_action( 'myp_order_paid_sync_finance', array( $this, 'on_order_paid' ), 10, 1 );
	}

	public function adapter() {
		$provider = get_option( 'myp_finance_provider', '' );
		if ( 'yonyou' === $provider ) {
			return new MyP_Core_Finance_YonyouFinance();
		}
		if ( 'kingdee' === $provider ) {
			return new MyP_Core_Finance_KingdeeFinance();
		}
		return null;
	}

	public function on_order_paid( $order_id ) {
		$adapter = $this->adapter();
		if ( ! $adapter ) {
			return;
		}
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		$res   = $adapter->sync_order( $order );
		$this->log( 'order', $order_id, $res );
	}

	public function sync_daily() {
		$adapter = $this->adapter();
		if ( ! $adapter ) {
			return;
		}
		global $wpdb;
		$rows = $wpdb->get_results(
			"SELECT o.* FROM " . myp_table( 'orders' ) . " o
			 LEFT JOIN " . myp_table( 'finance_sync_log' ) . " l ON l.biz_id=o.id AND l.biz_type='order'
			 WHERE o.status='paid' AND l.id IS NULL LIMIT 100"
		);
		foreach ( $rows as $order ) {
			$res = $adapter->sync_order( $order );
			$this->log( 'order', $order->id, $res );
		}
	}

	private function log( $type, $biz_id, $res ) {
		global $wpdb;
		$wpdb->insert( myp_table( 'finance_sync_log' ), array(
			'provider' => get_option( 'myp_finance_provider', '' ),
			'biz_type' => $type, 'biz_id' => $biz_id,
			'status' => ! empty( $res['ok'] ) ? 'success' : 'failed',
			'response' => wp_json_encode( $res ),
			'created_at' => current_time( 'mysql' ),
		) );
	}
}
