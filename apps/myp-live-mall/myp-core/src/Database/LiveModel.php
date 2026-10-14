<?php
/**
 * 直播场次模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_LiveModel {

	public function create( $data ) {
		global $wpdb;
		$data['stream_key'] = md5( uniqid( 'myp_', true ) );
		$data['created_at'] = current_time( 'mysql' );
		$wpdb->insert( myp_table( 'live' ), $data );
		return (int) $wpdb->insert_id;
	}

	public function get( $id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . myp_table( 'live' ) . " WHERE id=%d", $id ) );
	}

	public function upcoming( $limit = 20 ) {
		global $wpdb;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'live' ) . " WHERE status IN('ready','living') ORDER BY id DESC LIMIT %d", $limit
		) );
	}

	public function set_status( $id, $status ) {
		global $wpdb;
		return $wpdb->update( myp_table( 'live' ), array( 'status' => $status ), array( 'id' => $id ) );
	}
}
