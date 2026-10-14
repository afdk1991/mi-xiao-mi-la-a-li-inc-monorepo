<?php
/**
 * 模块统一注册中心。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_Bootstrap {

	private static $instance = null;
	private $modules        = array();

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->load_dependencies();
		$this->define_constants_ready();

		add_action( 'init', array( $this, 'register_post_types' ) );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_assets' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_filter( 'cron_schedules', array( $this, 'cron_schedules' ) );
		add_action( 'wp', array( $this, 'schedule_events' ) );
		$this->hook_events();
		$this->init_modules();
	}

	private function load_dependencies() {
		$files = array(
			'src/Core/Roles.php',
			'src/Core/Search.php',
			'src/Core/ProductFilter.php',
			'src/Core/ReportService.php',
			'src/Core/FinanceReconcileService.php',
			'src/Core/FulfillmentService.php',
		);
		foreach ( $files as $f ) {
			$path = MYP_CORE_DIR . $f;
			if ( file_exists( $path ) ) {
				require_once $path;
			}
		}
	}

	private function define_constants_ready() {
		load_plugin_textdomain( 'myp-core', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	}

	public function register_post_types() {
		$labels = array(
			'name'          => '商品',
			'singular_name' => '商品',
			'add_new_item'  => '新增商品',
			'edit_item'     => '编辑商品',
		);
		register_post_type( 'myp_product', array(
			'labels'       => $labels,
			'public'       => true,
			'show_in_rest' => true,
			'menu_icon'    => 'dashicons-cart',
			'supports'     => array( 'title', 'editor', 'thumbnail', 'custom-fields', 'revisions' ),
			'rewrite'      => array( 'slug' => 'product' ),
			'has_archive'  => 'products',
		) );

		register_taxonomy( 'myp_product_cat', 'myp_product', array(
			'labels'       => array( 'name' => '商品分类' ),
			'public'       => true,
			'hierarchical' => true,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'product-category' ),
		) );
		register_taxonomy( 'myp_product_tag', 'myp_product', array(
			'labels'       => array( 'name' => '商品标签' ),
			'public'       => true,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'product-tag' ),
		) );
	}

	public function admin_menu() {
		$role = new MyP_Core_Core_Roles();
		add_menu_page( 'MYP 管理', 'MYP 管理', $role->capability( 'settings' ), 'myp-core', null, 'dashicons-store', 26 );
		$pages = array(
			'MyP_Core_Admin_Settings'         => array( '全局设置', 'settings' ),
			'MyP_Core_Admin_InquiryAdmin'     => array( '询盘管理', 'inquiry' ),
			'MyP_Core_Admin_OrderAdmin'       => array( '订单管理', 'order' ),
			'MyP_Core_Admin_InvoiceAdmin'      => array( '发票管理', 'order' ),
			'MyP_Core_Admin_CouponAdmin'      => array( '优惠券', 'marketing' ),
			'MyP_Core_Admin_DistributionAdmin' => array( '分销管理', 'marketing' ),
			'MyP_Core_Admin_LiveAdmin'        => array( '直播管理', 'marketing' ),
			'MyP_Core_Admin_LiveGiftAdmin'    => array( '礼物管理', 'marketing' ),
			'MyP_Core_Admin_MemberLevelAdmin' => array( '会员等级', 'marketing' ),
			'MyP_Core_Admin_Analytics'        => array( '数据大屏', 'marketing' ),
			'MyP_Core_Admin_ReportAdmin'      => array( '报表推送', 'settings' ),
			'MyP_Core_Admin_SmsLogAdmin'      => array( '短信记录', 'settings' ),
			'MyP_Core_Admin_EinvoiceAdmin'    => array( '电子发票', 'order' ),
			'MyP_Core_Admin_FinanceAdmin'     => array( '财务对账', 'order' ),
			'MyP_Core_Admin_FinanceSyncAdmin' => array( '财务对接', 'settings' ),
		);
		foreach ( $pages as $class => $info ) {
			$cap = $role->capability( $info[1] );
			add_submenu_page( 'myp-core', $info[0], $info[0], $cap, 'myp-' . sanitize_title( $info[0] ), array( $class, 'render' ) );
		}
	}

	public function admin_assets( $hook ) {
		wp_enqueue_style( 'myp-admin', MYP_CORE_URL . 'assets/admin.css', array(), MYP_CORE_VERSION );
		wp_enqueue_script( 'myp-gallery', MYP_CORE_URL . 'assets/gallery.js', array( 'jquery' ), MYP_CORE_VERSION, true );
	}

	public function register_rest_routes() {
		$apis = array(
			'MyP_Core_Api_CheckoutApi',
			'MyP_Core_Api_CartApi',
			'MyP_Core_Api_LiveApi',
			'MyP_Core_Api_MiniApi',
			'MyP_Core_Api_InvoiceApi',
			'MyP_Core_Api_PointsApi',
			'MyP_Core_Api_DistributionApi',
			'MyP_Core_Api_PaymentApi',
		);
		foreach ( $apis as $api ) {
			if ( method_exists( $api, 'register_routes' ) ) {
				call_user_func( array( $api, 'register_routes' ) );
			}
		}
	}

	public function cron_schedules( $schedules ) {
		$schedules['myp_every_minute']  = array( 'interval' => 60, 'display' => 'MYP 每分钟' );
		$schedules['myp_every_hour']    = array( 'interval' => 3600, 'display' => 'MYP 每小时' );
		return $schedules;
	}

	public function schedule_events() {
		if ( ! wp_next_scheduled( 'myp_hourly_event' ) ) {
			wp_schedule_event( time(), 'myp_every_hour', 'myp_hourly_event' );
		}
		if ( ! wp_next_scheduled( 'myp_daily_2am' ) ) {
			wp_schedule_event( strtotime( 'today 02:00' ), 'daily', 'myp_daily_2am' );
		}
		if ( ! wp_next_scheduled( 'myp_daily_3am' ) ) {
			wp_schedule_event( strtotime( 'today 03:00' ), 'daily', 'myp_daily_3am' );
		}
	}

	private function hook_events() {
		add_action( 'myp_order_paid', array( $this, 'on_order_paid' ), 10, 1 );
	}

	public function on_order_paid( $order_id ) {
		do_action( 'myp_order_paid_reduce_stock', $order_id );
		do_action( 'myp_order_paid_grant_points', $order_id );
		do_action( 'myp_order_paid_distribution_commission', $order_id );
		do_action( 'myp_order_paid_send_message', $order_id );
		do_action( 'myp_order_paid_send_subscribe', $order_id );
		do_action( 'myp_order_paid_send_sms', $order_id );
		do_action( 'myp_order_paid_sync_finance', $order_id );
		do_action( 'myp_dashboard_refresh', $order_id );
	}

	private function init_modules() {
		MyP_Core_Payment_PaymentManager::boot_defaults();
		$this->modules['roles']    = new MyP_Core_Core_Roles();
		$this->modules['search']   = new MyP_Core_Core_Search();
		$this->modules['filter']   = new MyP_Core_Core_ProductFilter();
		$this->modules['report']   = new MyP_Core_Core_ReportService();
		$this->modules['reconcile']= new MyP_Core_Core_FinanceReconcileService();
		$this->modules['fulfill']  = new MyP_Core_Core_FulfillmentService();
		$this->modules['finance']  = new MyP_Core_Finance_FinanceSyncService();
		$this->modules['seo_meta'] = new MyP_Core_Seo_SeoMeta();
		$this->modules['seo_head'] = new MyP_Core_Seo_SeoHead();
		$this->modules['sitemap']  = new MyP_Core_Seo_Sitemap();
	}

	public function module( $key ) {
		return isset( $this->modules[ $key ] ) ? $this->modules[ $key ] : null;
	}
}
