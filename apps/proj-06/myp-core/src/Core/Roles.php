<?php
/**
 * 权限与角色：四级管理权限，超级管理员拥有全部。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_Roles {

	const CAP_PRODUCT   = 'myp_manage_product';
	const CAP_ORDER     = 'myp_manage_order';
	const CAP_INQUIRY   = 'myp_manage_inquiry';
	const CAP_MARKETING = 'myp_manage_marketing';
	const CAP_SETTINGS  = 'myp_manage_settings';

	private static $map = array(
		'product'   => self::CAP_PRODUCT,
		'order'     => self::CAP_ORDER,
		'inquiry'   => self::CAP_INQUIRY,
		'marketing' => self::CAP_MARKETING,
		'settings'  => self::CAP_SETTINGS,
	);

	public function __construct() {
		add_action( 'init', array( $this, 'add_roles' ) );
	}

	public function add_roles() {
		// 幂等：已存在则跳过
		if ( get_option( 'myp_roles_loaded' ) ) {
			return;
		}

		$caps = array(
			self::CAP_PRODUCT   => true,
			self::CAP_ORDER     => true,
			self::CAP_INQUIRY   => true,
			self::CAP_MARKETING => true,
			self::CAP_SETTINGS  => true,
		);

		add_role( 'myp_product_manager', '产品管理员', array( 'read' => true, self::CAP_PRODUCT => true ) );
		add_role( 'myp_order_manager', '订单管理员', array( 'read' => true, self::CAP_ORDER => true ) );
		add_role( 'myp_inquiry_manager', '询盘管理员', array( 'read' => true, self::CAP_INQUIRY => true ) );
		add_role( 'myp_marketing_manager', '营销管理员', array( 'read' => true, self::CAP_MARKETING => true ) );

		// 超级管理员（administrator）授予全部
		$admin = get_role( 'administrator' );
		if ( $admin ) {
			foreach ( $caps as $cap => $v ) {
				$admin->add_cap( $cap );
			}
		}

		update_option( 'myp_roles_loaded', 1 );
	}

	public function capability( $group ) {
		return isset( self::$map[ $group ] ) ? self::$map[ $group ] : 'read';
	}

	public static function current_user_can( $group ) {
		$cap = isset( self::$map[ $group ] ) ? self::$map[ $group ] : 'read';
		return current_user_can( $cap );
	}

	/**
	 * REST 权限回调。
	 */
	public static function rest_permission( $group ) {
		return function () use ( $group ) {
			if ( ! is_user_logged_in() ) {
				return new WP_Error( 'not_logged', '请先登录', array( 'status' => 401 ) );
			}
			return self::current_user_can( $group );
		};
	}
}
