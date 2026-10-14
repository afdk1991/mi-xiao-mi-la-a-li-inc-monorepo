<?php
/**
 * 站内消息模型。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_MessageModel {

	public function send( $user_id, $title, $content ) {
		global $wpdb;
		return $wpdb->insert( myp_table( 'message' ), array(
			'user_id' => $user_id, 'title' => $title, 'content' => $content,
			'is_read' => 0, 'created_at' => current_time( 'mysql' ),
		) );
	}

	public function unread( $user_id ) {
		global $wpdb;
		return (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM " . myp_table( 'message' ) . " WHERE user_id=%d AND is_read=0", $user_id
		) );
	}

	public function lists( $user_id, $page = 1, $size = 20 ) {
		global $wpdb;
		$offset = ( $page - 1 ) * $size;
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'message' ) . " WHERE user_id=%d ORDER BY id DESC LIMIT %d OFFSET %d",
			$user_id, $size, $offset
		) );
	}

	public function mark_read( $id, $user_id ) {
		global $wpdb;
		return $wpdb->update( myp_table( 'message' ), array( 'is_read' => 1 ),
			array( 'id' => $id, 'user_id' => $user_id ) );
	}
}
