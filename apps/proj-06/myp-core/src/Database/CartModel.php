<?php
/**
 * 购物车模型：游客(session)/登录(user)双模式。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_CartModel {

	private function key() {
		if ( is_user_logged_in() ) {
			return array( 'user_id' => get_current_user_id(), 'session_key' => '' );
		}
		if ( ! session_id() ) {
			session_start();
		}
		return array( 'user_id' => 0, 'session_key' => session_id() );
	}

	public function add( $product_id, $quantity = 1 ) {
		global $wpdb;
		$k = $this->key();
		$exist = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'cart' ) . " WHERE product_id=%d AND user_id=%d AND session_key=%s",
			$product_id, $k['user_id'], $k['session_key']
		) );
		if ( $exist ) {
			return $wpdb->update( myp_table( 'cart' ),
				array( 'quantity' => $exist->quantity + $quantity ),
				array( 'id' => $exist->id )
			);
		}
		return $wpdb->insert( myp_table( 'cart' ), array(
			'user_id'      => $k['user_id'],
			'session_key'  => $k['session_key'],
			'product_id'   => $product_id,
			'quantity'     => $quantity,
			'added_at'     => current_time( 'mysql' ),
		) );
	}

	public function items() {
		global $wpdb;
		$k = $this->key();
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT c.*, p.post_title, pm_price.meta_value AS price
			 FROM " . myp_table( 'cart' ) . " c
			 LEFT JOIN {$wpdb->posts} p ON p.ID=c.product_id
			 LEFT JOIN {$wpdb->postmeta} pm_price ON pm_price.post_id=c.product_id AND pm_price.meta_key='_myp_price'
			 WHERE c.user_id=%d AND c.session_key=%s",
			$k['user_id'], $k['session_key']
		) );
	}

	public function remove( $id ) {
		global $wpdb;
		return $wpdb->delete( myp_table( 'cart' ), array( 'id' => $id ) );
	}

	public function clear() {
		global $wpdb;
		$k = $this->key();
		return $wpdb->delete( myp_table( 'cart' ),
			array( 'user_id' => $k['user_id'], 'session_key' => $k['session_key'] ) );
	}
}
