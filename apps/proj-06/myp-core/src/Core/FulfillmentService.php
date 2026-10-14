<?php
/**
 * 履约服务：为支付成功事件链补齐消费者。
 *
 * 修复 P1：`myp_order_paid_*` 由"广播无监听"变为可执行链路——
 * 库存（原子扣减防超卖）→ 积分（按会员倍率发放）→ 分销佣金（两级结算）
 * → 站内消息 → 短信（未配置静默）→ 微信订阅（未配置 AppID 跳过）→ 大屏日报；
 * 另补 `myp_order_shipped`（发货通知）消费者。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_FulfillmentService {

	public function __construct() {
		add_action( 'myp_order_paid_reduce_stock', array( $this, 'reduce_stock' ), 10, 1 );
		add_action( 'myp_order_paid_grant_points', array( $this, 'grant_points' ), 10, 1 );
		add_action( 'myp_order_paid_distribution_commission', array( $this, 'settle_commission' ), 10, 1 );
		add_action( 'myp_order_paid_send_message', array( $this, 'send_message' ), 10, 1 );
		add_action( 'myp_order_paid_send_sms', array( $this, 'send_sms' ), 10, 1 );
		add_action( 'myp_order_paid_send_subscribe', array( $this, 'send_subscribe' ), 10, 1 );
		add_action( 'myp_dashboard_refresh', array( $this, 'dashboard_refresh' ), 10, 1 );
		add_action( 'myp_order_shipped', array( $this, 'order_shipped' ), 10, 1 );
	}

	/**
	 * 扣库存：原子条件 UPDATE（库存足够才扣减），防止并发超卖。
	 */
	public function reduce_stock( $order_id ) {
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order || empty( $order->items ) ) {
			return;
		}
		global $wpdb;
		foreach ( $order->items as $item ) {
			$wpdb->query( $wpdb->prepare(
				"UPDATE {$wpdb->postmeta}
				 SET meta_value = CAST(meta_value AS SIGNED) - %d
				 WHERE post_id=%d AND meta_key='_myp_stock' AND CAST(meta_value AS SIGNED) >= %d",
				(int) $item->quantity,
				(int) $item->product_id,
				(int) $item->quantity
			) );
		}
	}

	/**
	 * 发积分：实付金额 × 会员等级积分倍率（默认 1 元 = 1 分）。
	 */
	public function grant_points( $order_id ) {
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order ) {
			return;
		}
		$level = ( new MyP_Core_Database_MemberLevelModel() )->user_level( $order->user_id );
		$rate  = $level ? (float) $level->points_rate : 1.0;
		if ( $rate <= 0 ) {
			$rate = 1.0;
		}
		$points = (int) floor( (float) $order->pay_amount * $rate );
		if ( $points <= 0 ) {
			return;
		}
		( new MyP_Core_Database_PointsModel() )->change(
			$order->user_id, $points, 'order', '订单支付奖励', $order_id
		);
	}

	/**
	 * 分销佣金：买家上下两级按比例结算（DistributionModel 内部按 level 表 rate1/rate2）。
	 */
	public function settle_commission( $order_id ) {
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order ) {
			return;
		}
		( new MyP_Core_Database_DistributionModel() )->settle_commission(
			$order_id, (float) $order->pay_amount, (int) $order->user_id
		);
	}

	/**
	 * 站内消息：支付成功通知。
	 */
	public function send_message( $order_id ) {
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order ) {
			return;
		}
		( new MyP_Core_Database_MessageModel() )->send(
			$order->user_id,
			'订单支付成功',
			'您的订单 ' . $order->order_no . ' 已支付成功，我们将尽快为您发货。'
		);
	}

	/**
	 * 短信通知：支付成功短信（短信服务未配置时 SmsService 静默记录失败日志）。
	 */
	public function send_sms( $order_id ) {
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order || empty( $order->mobile ) ) {
			return;
		}
		MyP_Core_Sms_SmsService::send(
			$order->mobile,
			'order_paid',
			array( 'order_no' => $order->order_no, 'amount' => $order->pay_amount )
		);
	}

	/**
	 * 微信订阅消息：未配置 AppID 时静默跳过；配置后经 myp_wechat_subscribe_send 下发。
	 */
	public function send_subscribe( $order_id ) {
		$appid = get_option( 'myp_wechat_appid', '' );
		if ( ! $appid ) {
			return;
		}
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order ) {
			return;
		}
		do_action( 'myp_wechat_subscribe_send', $order );
	}

	/**
	 * 大屏/日报：按当日实时汇总 Upsert analytics_daily（stat_date UNIQUE 保证幂等）。
	 */
	public function dashboard_refresh( $order_id ) {
		global $wpdb;
		$date = gmdate( 'Y-m-d', current_time( 'timestamp' ) + (float) get_option( 'gmt_offset' ) * HOUR_IN_SECONDS );
		$orders_count = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM " . myp_table( 'orders' ) . " WHERE DATE(created_at)=%s", $date
		) );
		$goods_amount = (float) $wpdb->get_var( $wpdb->prepare(
			"SELECT COALESCE(SUM(pay_amount),0) FROM " . myp_table( 'orders' ) . " WHERE status='paid' AND DATE(paid_at)=%s", $date
		) );

		$existing = $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM " . myp_table( 'analytics_daily' ) . " WHERE stat_date=%s", $date
		) );
		if ( $existing ) {
			$wpdb->update( myp_table( 'analytics_daily' ),
				array( 'orders_count' => $orders_count, 'goods_amount' => $goods_amount ),
				array( 'id' => (int) $existing )
			);
		} else {
			$wpdb->insert( myp_table( 'analytics_daily' ),
				array( 'stat_date' => $date, 'orders_count' => $orders_count, 'goods_amount' => $goods_amount )
			);
		}
	}

	/**
	 * 发货通知：物流发货（LogisticsModel::ship 触发 myp_order_shipped）后站内消息 + 短信。
	 */
	public function order_shipped( $order_id ) {
		$order = ( new MyP_Core_Database_OrderModel() )->get( $order_id );
		if ( ! $order ) {
			return;
		}
		( new MyP_Core_Database_MessageModel() )->send(
			$order->user_id,
			'订单已发货',
			'您的订单 ' . $order->order_no . ' 已发货，请留意物流信息。'
		);
		if ( ! empty( $order->mobile ) ) {
			MyP_Core_Sms_SmsService::send(
				$order->mobile,
				'order_shipped',
				array( 'order_no' => $order->order_no )
			);
		}
	}
}
