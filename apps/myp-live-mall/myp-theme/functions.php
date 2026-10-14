<?php
/**
 * MYP 商城主题功能入口。
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! defined( 'MYP_THEME_VERSION' ) ) {
	define( 'MYP_THEME_VERSION', defined( 'MYP_CORE_VERSION' ) ? MYP_CORE_VERSION : '1.0.0' );
}

function myp_theme_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'custom-logo' );
	register_nav_menus( array(
		'primary' => '主导航',
	) );
}
add_action( 'after_setup_theme', 'myp_theme_setup' );

function myp_theme_assets() {
	wp_enqueue_style( 'myp-theme-style', get_stylesheet_uri(), array(), MYP_THEME_VERSION );
	wp_enqueue_script( 'myp-main', get_template_directory_uri() . '/assets/js/main.js', array( 'jquery' ), MYP_THEME_VERSION, true );
	wp_localize_script( 'myp-main', 'MYP_API', array(
		'rest'  => esc_url_raw( rest_url( 'myp/v1/' ) ),
		'home'  => esc_url_raw( home_url( '/' ) ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
	) );
	if ( is_page_template( 'page-live.php' ) || is_page( 'live' ) ) {
		wp_enqueue_script( 'myp-live', get_template_directory_uri() . '/assets/js/live.js', array( 'jquery' ), MYP_THEME_VERSION, true );
	}
}
add_action( 'wp_enqueue_scripts', 'myp_theme_assets' );

function myp_product_meta_box() {
	add_meta_box( 'myp_product_data', '商品数据（MYP）', 'myp_product_data_html', 'myp_product', 'normal', 'high' );
}
add_action( 'add_meta_boxes', 'myp_product_meta_box' );

function myp_product_data_html( $post ) {
	$price   = get_post_meta( $post->ID, '_myp_price', true );
	$origin  = get_post_meta( $post->ID, '_myp_origin_price', true );
	$sku     = get_post_meta( $post->ID, '_myp_sku', true );
	$stock   = get_post_meta( $post->ID, '_myp_stock', true );
	$member  = get_post_meta( $post->ID, '_myp_member_price', true );
	echo '<p>价格 <input name="myp_price" value="' . esc_attr( $price ) . '"></p>';
	echo '<p>原价 <input name="myp_origin_price" value="' . esc_attr( $origin ) . '"></p>';
	echo '<p>SKU <input name="myp_sku" value="' . esc_attr( $sku ) . '"></p>';
	echo '<p>库存 <input name="myp_stock" value="' . esc_attr( $stock ) . '"></p>';
	echo '<p>会员价 <input name="myp_member_price" value="' . esc_attr( $member ) . '"></p>';
	wp_nonce_field( 'myp_product', 'myp_product_nonce' );
}

add_action( 'save_post', function ( $post_id ) {
	if ( ! isset( $_POST['myp_product_nonce'] ) || ! wp_verify_nonce( $_POST['myp_product_nonce'], 'myp_product' ) ) return;
	foreach ( array( 'price', 'origin_price', 'sku', 'stock', 'member_price' ) as $f ) {
		if ( isset( $_POST[ 'myp_' . $f ] ) ) {
			update_post_meta( $post_id, '_myp_' . $f, sanitize_text_field( wp_unslash( $_POST[ 'myp_' . $f ] ) ) );
		}
	}
} );

function myp_theme_page_templates( $templates ) {
	$templates['page-cart.php']    = '购物车页面';
	$templates['page-user.php']    = '用户中心页面';
	$templates['page-submit.php']  = '发布产品页面';
	$templates['page-live.php']    = '直播页面';
	return $templates;
}
add_filter( 'theme_page_templates', 'myp_theme_page_templates' );
