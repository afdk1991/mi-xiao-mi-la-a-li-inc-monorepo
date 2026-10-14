<?php
/**
 * 分销模型：绑定上下级 + 自动结算两级佣金。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_DistributionModel {

	public function bind( $user_id, $parent_id ) {
		global $wpdb;
		if ( ! $parent_id || $parent_id == $user_id ) {
			return false;
		}
		$exists = $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM " . myp_table( 'distribution_relation' ) . " WHERE user_id=%d", $user_id
		) );
		if ( $exists ) {
			return false;
		}
		$gp = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT parent_id FROM " . myp_table( 'distribution_relation' ) . " WHERE user_id=%d", $parent_id
		) );
		return $wpdb->insert( myp_table( 'distribution_relation' ), array(
			'user_id' => $user_id, 'parent_id' => $parent_id, 'grandparent_id' => $gp,
			'bind_at' => current_time( 'mysql' ),
		) );
	}

	public function settle_commission( $order_id, $order_amount, $buyer_id ) {
		global $wpdb;
		$rel = $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM " . myp_table( 'distribution_relation' ) . " WHERE user_id=%d", $buyer_id
		) );
		if ( ! $rel ) {
			return;
		}
		$level = $wpdb->get_row( "SELECT * FROM " . myp_table( 'distribution_level' ) . " ORDER BY level ASC LIMIT 1" );
		$rate1 = $level ? (float) $level->rate1 : 0.10;
		$rate2 = $level ? (float) $level->rate2 : 0.05;

		if ( $rel->parent_id ) {
			$wpdb->insert( myp_table( 'distribution_commission' ), array(
				'user_id' => $rel->parent_id, 'order_id' => $order_id, 'level' => 1,
				'amount' => round( $order_amount * $rate1, 2 ), 'status' => 'pending',
				'created_at' => current_time( 'mysql' ),
			) );
		}
		if ( $rel->grandparent_id ) {
			$wpdb->insert( myp_table( 'distribution_commission' ), array(
				'user_id' => $rel->grandparent_id, 'order_id' => $order_id, 'level' => 2,
				'amount' => round( $order_amount * $rate2, 2 ), 'status' => 'pending',
				'created_at' => current_time( 'mysql' ),
			) );
		}
	}

	public function summary( $user_id ) {
		global $wpdb;
		$total = (float) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(amount),0) FROM " . myp_table( 'distribution_commission' ) . " WHERE user_id=%d", $user_id
		) );
		$team = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM " . myp_table( 'distribution_relation' ) . " WHERE parent_id=%d", $user_id
		) );
		return array( 'total_commission' => $total, 'team_count' => $team );
	}
}
