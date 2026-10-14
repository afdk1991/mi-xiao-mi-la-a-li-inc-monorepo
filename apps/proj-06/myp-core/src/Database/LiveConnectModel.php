<?php
/**
 * 连麦 / PK 模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_LiveConnectModel {

	public function invite( $live_id, $guest_live_id, $type = 'connect' ) {
		global $wpdb;
		$wpdb->insert( myp_table( 'live_connect' ), array(
			'live_id' => $live_id, 'guest_live_id' => $guest_live_id,
			'type' => $type, 'status' => 'inviting',
		) );
		return (int) $wpdb->insert_id;
	}

	public function accept( $id ) {
		global $wpdb;
		return $wpdb->update( myp_table( 'live_connect' ),
			array( 'status' => 'connected', 'start_time' => current_time( 'mysql' ) ),
			array( 'id' => $id ) );
	}

	public function finish( $id ) {
		global $wpdb;
		return $wpdb->update( myp_table( 'live_connect' ),
			array( 'status' => 'ended', 'end_time' => current_time( 'mysql' ) ),
			array( 'id' => $id ) );
	}
}
