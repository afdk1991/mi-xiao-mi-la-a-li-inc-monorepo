<?php
/**
 * 自定义器：Logo、站点标题、主色、首页滑块分类
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function slstyle_customize_register( $wp_customize ) {

	// ===== 站点身份（Logo / 站点标题已内置，这里仅补充主色与滑块） =====

	// 主色
	$wp_customize->add_setting( 'slstyle_primary_color', array(
		'default'           => '#1e88e5',
		'sanitize_callback' => 'sanitize_hex_color',
		'transport'         => 'postMessage',
	) );
	$wp_customize->add_control( new WP_Customize_Color_Control(
		$wp_customize,
		'slstyle_primary_color',
		array(
			'label'    => __( '主题主色', 'slstyle' ),
			'description' => __( '调整全站主色调（按钮、链接、卡片标签等）', 'slstyle' ),
			'section'  => 'colors',
			'priority' => 10,
		)
	) );

	// ===== 首页滑块设置面板 =====
	$wp_customize->add_section( 'slstyle_slider', array(
		'title'    => __( '首页滑块', 'slstyle' ),
		'priority' => 60,
	) );

	$wp_customize->add_setting( 'slstyle_slider_cat', array(
		'default'           => 0,
		'sanitize_callback' => 'absint',
	) );
	$wp_customize->add_control( 'slstyle_slider_cat', array(
		'label'   => __( '滑块文章来源分类', 'slstyle' ),
		'description' => __( '选择后滑块展示该分类文章；若留空且有置顶文章，则展示置顶文章。', 'slstyle' ),
		'section' => 'slstyle_slider',
		'type'    => 'dropdown-pages', // 占位，下方用分类下拉覆盖
	) );
	// 用分类下拉控件覆盖
	$wp_customize->remove_control( 'slstyle_slider_cat' );
	$wp_customize->add_control( 'slstyle_slider_cat', array(
		'label'   => __( '滑块文章来源分类', 'slstyle' ),
		'section' => 'slstyle_slider',
		'type'    => 'select',
		'choices' => slstyle_cat_choices(),
	) );

	$wp_customize->add_setting( 'slstyle_slider_count', array(
		'default'           => 5,
		'sanitize_callback' => 'absint',
	) );
	$wp_customize->add_control( 'slstyle_slider_count', array(
		'label'   => __( '滑块文章数量', 'slstyle' ),
		'section' => 'slstyle_slider',
		'type'    => 'number',
	) );
}
add_action( 'customize_register', 'slstyle_customize_register' );

/**
 * 自定义器实时预览：主色变更即时反映（postMessage）
 */
function slstyle_customize_preview_js() {
	wp_enqueue_script(
		'slstyle-customize-preview',
		get_template_directory_uri() . '/assets/js/customize-preview.js',
		array( 'customize-preview', 'jquery' ),
		SLSTYLE_VERSION,
		true
	);
}
add_action( 'customize_preview_init', 'slstyle_customize_preview_js' );

/**
 * 分类下拉选项
 */
function slstyle_cat_choices() {
	$choices = array( 0 => __( '（使用置顶文章）', 'slstyle' ) );
	$cats    = get_categories( array( 'hide_empty' => false ) );
	foreach ( $cats as $c ) {
		$choices[ $c->term_id ] = $c->name;
	}
	return $choices;
}
