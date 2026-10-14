<?php
/**
 * 所有业务表统一建表。插件激活时一次性创建，表名前缀 wp_myp_。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Database_Installer {

	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$prefix          = $wpdb->prefix . MYP_CORE_PREFIX;
		$tables          = self::schemas( $prefix );

		foreach ( $tables as $sql ) {
			dbDelta( $sql );
		}

		// 默认数据：会员等级 / 分销等级 / 礼物
		self::seed_defaults();

		update_option( 'myp_core_version', MYP_CORE_VERSION );
		update_option( 'myp_core_installed', time() );
	}

	/**
	 * 返回 29 张业务表的 CREATE 语句。
	 */
	private static function schemas( $prefix ) {
		$c = $GLOBALS['wpdb']->get_charset_collate();
		$f = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
		$t = array();

		// 1. 订单主表
		$t[] = "CREATE TABLE {$prefix}orders (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			order_no VARCHAR(32) NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
			pay_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			coupon_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			points int NOT NULL DEFAULT 0,
			pay_method VARCHAR(30) DEFAULT '',
			paid_at DATETIME NULL,
			ship_at DATETIME NULL,
			consignee VARCHAR(60) DEFAULT '',
			mobile VARCHAR(20) DEFAULT '',
			address TEXT,
			remark TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY (id), UNIQUE KEY order_no (order_no), KEY user_id (user_id), KEY status (status)
		) $f;";

		// 2. 订单明细
		$t[] = "CREATE TABLE {$prefix}order_items (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			order_id BIGINT UNSIGNED NOT NULL,
			product_id BIGINT UNSIGNED NOT NULL,
			product_name VARCHAR(255) DEFAULT '',
			sku VARCHAR(60) DEFAULT '',
			price DECIMAL(12,2) NOT NULL DEFAULT 0,
			quantity INT NOT NULL DEFAULT 1,
			subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
			PRIMARY KEY (id), KEY order_id (order_id), KEY product_id (product_id)
		) $f;";

		// 3. 询盘
		$t[] = "CREATE TABLE {$prefix}inquiry (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			product_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			name VARCHAR(60) DEFAULT '',
			mobile VARCHAR(20) DEFAULT '',
			content TEXT,
			status VARCHAR(20) DEFAULT 'new',
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY product_id (product_id), KEY status (status)
		) $f;";

		// 4. 购物车
		$t[] = "CREATE TABLE {$prefix}cart (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			session_key VARCHAR(64) DEFAULT '',
			product_id BIGINT UNSIGNED NOT NULL,
			quantity INT NOT NULL DEFAULT 1,
			added_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY user_id (user_id), KEY session_key (session_key)
		) $f;";

		// 5. 优惠券
		$t[] = "CREATE TABLE {$prefix}coupon (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			title VARCHAR(120) DEFAULT '',
			type VARCHAR(20) DEFAULT 'minus',
			value DECIMAL(12,2) NOT NULL DEFAULT 0,
			min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			total_stock INT NOT NULL DEFAULT 0,
			used_stock INT NOT NULL DEFAULT 0,
			expire_at DATETIME NULL,
			status TINYINT NOT NULL DEFAULT 1,
			PRIMARY KEY (id), KEY status (status)
		) $f;";

		// 6. 用户优惠券
		$t[] = "CREATE TABLE {$prefix}coupon_user (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			coupon_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			status VARCHAR(20) DEFAULT 'unused',
			used_order_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			received_at DATETIME NOT NULL,
			used_at DATETIME NULL,
			PRIMARY KEY (id), KEY user_id (user_id), KEY coupon_id (coupon_id)
		) $f;";

		// 7. 积分流水
		$t[] = "CREATE TABLE {$prefix}points_log (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			change_type VARCHAR(30) DEFAULT '',
			points INT NOT NULL DEFAULT 0,
			balance INT NOT NULL DEFAULT 0,
			remark VARCHAR(255) DEFAULT '',
			order_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY user_id (user_id)
		) $f;";

		// 8. 分销等级
		$t[] = "CREATE TABLE {$prefix}distribution_level (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			name VARCHAR(60) DEFAULT '',
			level INT NOT NULL DEFAULT 1,
			rate1 DECIMAL(5,4) NOT NULL DEFAULT 0,
			rate2 DECIMAL(5,4) NOT NULL DEFAULT 0,
			min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			PRIMARY KEY (id)
		) $f;";

		// 9. 分销关系
		$t[] = "CREATE TABLE {$prefix}distribution_relation (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			parent_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			grandparent_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			bind_at DATETIME NOT NULL,
			PRIMARY KEY (id), UNIQUE KEY user_id (user_id), KEY parent_id (parent_id)
		) $f;";

		// 10. 分销佣金
		$t[] = "CREATE TABLE {$prefix}distribution_commission (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			order_id BIGINT UNSIGNED NOT NULL,
			level INT NOT NULL DEFAULT 1,
			amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			status VARCHAR(20) DEFAULT 'pending',
			settled_at DATETIME NULL,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY user_id (user_id), KEY order_id (order_id)
		) $f;";

		// 11. 会员等级
		$t[] = "CREATE TABLE {$prefix}member_level (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			name VARCHAR(60) DEFAULT '',
			level INT NOT NULL DEFAULT 1,
			discount DECIMAL(5,2) NOT NULL DEFAULT 100.00,
			points_rate DECIMAL(5,2) NOT NULL DEFAULT 1.00,
			min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			PRIMARY KEY (id)
		) $f;";

		// 12. 直播场次
		$t[] = "CREATE TABLE {$prefix}live (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			title VARCHAR(255) DEFAULT '',
			anchor_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			product_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			cover VARCHAR(255) DEFAULT '',
			stream_key VARCHAR(120) DEFAULT '',
			play_url VARCHAR(255) DEFAULT '',
			status VARCHAR(20) DEFAULT 'ready',
			start_time DATETIME NULL,
			end_time DATETIME NULL,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY anchor_id (anchor_id), KEY status (status)
		) $f;";

		// 13. 直播弹幕
		$t[] = "CREATE TABLE {$prefix}live_danmu (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			live_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			nickname VARCHAR(60) DEFAULT '',
			content VARCHAR(500) DEFAULT '',
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY live_id (live_id)
		) $f;";

		// 14. 礼物定义
		$t[] = "CREATE TABLE {$prefix}live_gift (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			name VARCHAR(60) DEFAULT '',
			icon VARCHAR(255) DEFAULT '',
			points INT NOT NULL DEFAULT 1,
			animation VARCHAR(60) DEFAULT '',
			status TINYINT NOT NULL DEFAULT 1,
			PRIMARY KEY (id)
		) $f;";

		// 15. 礼物打赏记录
		$t[] = "CREATE TABLE {$prefix}live_gift_record (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			live_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			gift_id BIGINT UNSIGNED NOT NULL,
			quantity INT NOT NULL DEFAULT 1,
			points INT NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY live_id (live_id), KEY user_id (user_id)
		) $f;";

		// 16. 连麦 / PK
		$t[] = "CREATE TABLE {$prefix}live_connect (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			live_id BIGINT UNSIGNED NOT NULL,
			guest_live_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			type VARCHAR(20) DEFAULT 'connect',
			status VARCHAR(20) DEFAULT 'inviting',
			start_time DATETIME NULL,
			end_time DATETIME NULL,
			PRIMARY KEY (id), KEY live_id (live_id)
		) $f;";

		// 17. 发票申请
		$t[] = "CREATE TABLE {$prefix}invoice (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			order_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			type VARCHAR(20) DEFAULT 'normal',
			title VARCHAR(120) DEFAULT '',
			tax_no VARCHAR(40) DEFAULT '',
			amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			status VARCHAR(20) DEFAULT 'pending',
			einvoice_no VARCHAR(60) DEFAULT '',
			file_url VARCHAR(255) DEFAULT '',
			applied_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY order_id (order_id), KEY user_id (user_id)
		) $f;";

		// 18. 物流单
		$t[] = "CREATE TABLE {$prefix}logistics (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			order_id BIGINT UNSIGNED NOT NULL,
			company VARCHAR(60) DEFAULT '',
			tracking_no VARCHAR(80) DEFAULT '',
			shipped_at DATETIME NULL,
			PRIMARY KEY (id), KEY order_id (order_id), KEY tracking_no (tracking_no)
		) $f;";

		// 19. 物流轨迹
		$t[] = "CREATE TABLE {$prefix}logistics_trace (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			logistics_id BIGINT UNSIGNED NOT NULL,
			context TEXT,
			trace_time DATETIME NULL,
			PRIMARY KEY (id), KEY logistics_id (logistics_id)
		) $f;";

		// 20. 数据日报
		$t[] = "CREATE TABLE {$prefix}analytics_daily (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			stat_date DATE NOT NULL,
			orders_count INT NOT NULL DEFAULT 0,
			goods_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			new_users INT NOT NULL DEFAULT 0,
			live_views INT NOT NULL DEFAULT 0,
			PRIMARY KEY (id), UNIQUE KEY stat_date (stat_date)
		) $f;";

		// 21. 站内消息
		$t[] = "CREATE TABLE {$prefix}message (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			title VARCHAR(120) DEFAULT '',
			content TEXT,
			is_read TINYINT NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY user_id (user_id), KEY is_read (is_read)
		) $f;";

		// 22. 短信记录
		$t[] = "CREATE TABLE {$prefix}sms_log (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			mobile VARCHAR(20) DEFAULT '',
			scene VARCHAR(30) DEFAULT '',
			content TEXT,
			status VARCHAR(20) DEFAULT 'sent',
			provider VARCHAR(30) DEFAULT '',
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY mobile (mobile), KEY scene (scene)
		) $f;";

		// 23. 秒杀
		$t[] = "CREATE TABLE {$prefix}seckill (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			product_id BIGINT UNSIGNED NOT NULL,
			seckill_price DECIMAL(12,2) NOT NULL DEFAULT 0,
			stock INT NOT NULL DEFAULT 0,
			start_time DATETIME NULL,
			end_time DATETIME NULL,
			PRIMARY KEY (id), KEY product_id (product_id)
		) $f;";

		// 24. 拼团
		$t[] = "CREATE TABLE {$prefix}group_buy (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			product_id BIGINT UNSIGNED NOT NULL,
			price DECIMAL(12,2) NOT NULL DEFAULT 0,
			require_count INT NOT NULL DEFAULT 2,
			joined_count INT NOT NULL DEFAULT 1,
			leader_user_id BIGINT UNSIGNED NOT NULL,
			status VARCHAR(20) DEFAULT 'ongoing',
			deadline DATETIME NULL,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY product_id (product_id), KEY status (status)
		) $f;";

		// 25. 拼团成员
		$t[] = "CREATE TABLE {$prefix}group_buy_member (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			group_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			joined_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY group_id (group_id), KEY user_id (user_id)
		) $f;";

		// 26. 报表任务
		$t[] = "CREATE TABLE {$prefix}report_task (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			name VARCHAR(120) DEFAULT '',
			frequency VARCHAR(20) DEFAULT 'daily',
			recipients TEXT,
			last_sent_at DATETIME NULL,
			status TINYINT NOT NULL DEFAULT 1,
			PRIMARY KEY (id)
		) $f;";

		// 27. 财务对账
		$t[] = "CREATE TABLE {$prefix}finance_reconcile (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			bill_date DATE NOT NULL,
			order_count INT NOT NULL DEFAULT 0,
			total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			points_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
			status VARCHAR(20) DEFAULT 'draft',
			PRIMARY KEY (id), UNIQUE KEY bill_date (bill_date)
		) $f;";

		// 28. 财务同步日志
		$t[] = "CREATE TABLE {$prefix}finance_sync_log (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			provider VARCHAR(30) DEFAULT '',
			biz_type VARCHAR(30) DEFAULT '',
			biz_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			status VARCHAR(20) DEFAULT 'pending',
			response TEXT,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id), KEY provider (provider), KEY biz_id (biz_id)
		) $f;";

		// 29. 小程序用户
		$t[] = "CREATE TABLE {$prefix}mini_user (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			openid VARCHAR(80) DEFAULT '',
			unionid VARCHAR(80) DEFAULT '',
			session_key VARCHAR(80) DEFAULT '',
			PRIMARY KEY (id), UNIQUE KEY openid (openid), KEY user_id (user_id)
		) $f;";

		return $t;
	}

	private static function seed_defaults() {
		global $wpdb;
		$p = $wpdb->prefix . MYP_CORE_PREFIX;

		if ( (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}member_level" ) === 0 ) {
			foreach ( array(
				array( '普通会员', 1, 100.00, 1.00, 0 ),
				array( '白银会员', 2, 98.00, 1.20, 1000 ),
				array( '黄金会员', 3, 95.00, 1.50, 5000 ),
				array( '钻石会员', 4, 90.00, 2.00, 20000 ),
			) as $lv ) {
				$wpdb->insert( "{$p}member_level", array(
					'name' => $lv[0], 'level' => $lv[1], 'discount' => $lv[2],
					'points_rate' => $lv[3], 'min_amount' => $lv[4],
				) );
			}
		}

		if ( (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}distribution_level" ) === 0 ) {
			foreach ( array(
				array( '一级分销', 1, 0.10, 0.05, 0 ),
				array( '二级分销', 2, 0.08, 0.03, 5000 ),
				array( '三级分销', 3, 0.05, 0.02, 20000 ),
			) as $lv ) {
				$wpdb->insert( "{$p}distribution_level", array(
					'name' => $lv[0], 'level' => $lv[1], 'rate1' => $lv[2],
					'rate2' => $lv[3], 'min_amount' => $lv[4],
				) );
			}
		}

		if ( (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}live_gift" ) === 0 ) {
			foreach ( array(
				array( '小心心', '', 1, 'heart' ),
				array( '玫瑰花', '', 10, 'flower' ),
				array( '火箭', '', 100, 'rocket' ),
				array( '皇冠', '', 520, 'crown' ),
				array( '城堡', '', 1314, 'castle' ),
			) as $g ) {
				$wpdb->insert( "{$p}live_gift", array(
					'name' => $g[0], 'icon' => $g[1], 'points' => $g[2], 'animation' => $g[3],
				) );
			}
		}
	}

	public static function uninstall() {
		global $wpdb;
		$p = $wpdb->prefix . MYP_CORE_PREFIX;
		// 仅删除本插件表，保留选项以便恢复；如需彻底清理可取消下行注释
		// $wpdb->query( "DROP TABLE IF EXISTS {$p}orders,{$p}order_items,{$p}inquiry,{$p}cart,{$p}coupon,{$p}coupon_user,{$p}points_log,{$p}distribution_level,{$p}distribution_relation,{$p}distribution_commission,{$p}member_level,{$p}live,{$p}live_danmu,{$p}live_gift,{$p}live_gift_record,{$p}live_connect,{$p}invoice,{$p}logistics,{$p}logistics_trace,{$p}analytics_daily,{$p}message,{$p}sms_log,{$p}seckill,{$p}group_buy,{$p}group_buy_member,{$p}report_task,{$p}finance_reconcile,{$p}finance_sync_log,{$p}mini_user" );
		delete_option( 'myp_core_version' );
		delete_option( 'myp_core_installed' );
	}
}
