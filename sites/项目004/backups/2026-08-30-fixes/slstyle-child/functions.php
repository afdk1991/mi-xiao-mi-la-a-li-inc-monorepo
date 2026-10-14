<?php
/**
 * slStyle Child 主题功能入口。
 *
 * 设计原则：
 * 1. 不修改父主题任何文件 —— 全部通过动作/过滤器钩子与模板层级扩展；
 * 2. 子主题 functions.php 先于父主题加载，因此父样式的挂载需要早于父主题钩子；
 * 3. 所有能力对插件缺失做优雅降级，避免父主题/插件未启用时前端报错。
 *
 * @package slStyle_Child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ZSC_VERSION', '1.0.0' );

/**
 * 加载父主题样式。
 *
 * 背景：父主题 slstyle 的资源队列使用 get_stylesheet_uri()，
 * 在子主题语境下该函数返回的是「子主题」的 style.css。
 * 若不显式补挂父主题样式，父主题的基础样式将整体丢失。
 * 这里以优先级 5 提前入队，确保层叠顺序为：父主题 → 子主题。
 */
function zsc_enqueue_parent_styles() {
	wp_enqueue_style(
		'slstyle-parent-style',
		get_template_directory_uri() . '/style.css',
		array(),
		defined( 'SLSTYLE_VERSION' ) ? SLSTYLE_VERSION : '1.0.0'
	);
}
add_action( 'wp_enqueue_scripts', 'zsc_enqueue_parent_styles', 5 );

/**
 * 子主题初始化。
 */
function zsc_setup() {
	load_child_theme_textdomain( 'slstyle-child', get_stylesheet_directory() . '/languages' );

	// 看板页专用的小工具区，便于在不改模板的情况下增删模块。
	register_sidebar(
		array(
			'name'          => __( '聚合看板侧栏', 'slstyle-child' ),
			'id'            => 'zsc-dashboard',
			'description'   => __( '仅显示在「聚合看板」页面模板的侧边栏。', 'slstyle-child' ),
			'before_widget' => '<div class="widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h3 class="widget-title">',
			'after_title'   => '</h3>',
		)
	);
}
add_action( 'after_setup_theme', 'zsc_setup', 11 );

/**
 * 看板页资源：注入 REST 端点与 nonce，供前端异步刷新。
 */
function zsc_enqueue_dashboard_assets() {
	if ( ! is_page_template( 'page-dashboard.php' ) ) {
		return;
	}

	wp_enqueue_script(
		'zsc-dashboard',
		get_stylesheet_directory_uri() . '/assets/js/dashboard.js',
		array(),
		ZSC_VERSION,
		true
	);

	wp_localize_script(
		'zsc-dashboard',
		'zscDashboard',
		array(
			'restUrl'  => esc_url_raw( rest_url( 'saas-aggregator/v1/data' ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'pluginOn' => function_exists( 'saas_agg_get_settings' ),
			'i18n'     => array(
				'refreshing' => __( '正在刷新…', 'slstyle-child' ),
				'refresh'    => __( '刷新数据', 'slstyle-child' ),
				'failed'     => __( '刷新失败，请稍后重试。', 'slstyle-child' ),
				'updated'    => __( '数据已更新', 'slstyle-child' ),
			),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'zsc_enqueue_dashboard_assets', 20 );

/**
 * 判断聚合插件是否可用。
 *
 * @return bool
 */
function zsc_has_aggregator() {
	return class_exists( 'SAAS_Agg_Provider_Manager' );
}

/**
 * 取聚合数据（带静态缓存，避免同一次请求内重复回源）。
 *
 * @param string $source 数据源标识。
 * @param int    $limit  每源条数。
 * @return array
 */
function zsc_get_aggregate( $source = 'all', $limit = 5 ) {
	static $cache = array();

	$key = $source . '|' . $limit;
	if ( isset( $cache[ $key ] ) ) {
		return $cache[ $key ];
	}

	if ( ! zsc_has_aggregator() ) {
		$cache[ $key ] = array();
		return $cache[ $key ];
	}

	$cache[ $key ] = SAAS_Agg_Provider_Manager::aggregate( $source, $limit );
	return $cache[ $key ];
}

/**
 * 在父主题 body class 基础上补充看板页标记，便于样式隔离。
 *
 * @param array $classes 现有 class 列表。
 * @return array
 */
function zsc_body_class( $classes ) {
	if ( is_page_template( 'page-dashboard.php' ) ) {
		$classes[] = 'zsc-page-dashboard';
	}
	return $classes;
}
add_filter( 'body_class', 'zsc_body_class' );
