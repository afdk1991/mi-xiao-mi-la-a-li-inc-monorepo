<?php
/**
 * 自定义器：Logo、站点标题、主色、首页滑块分类
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function zibstyle_customize_register( $wp_customize ) {

	// ===== 站点身份（Logo / 站点标题已内置，这里仅补充主色与滑块） =====

	// 主色
	$wp_customize->add_setting( 'zibstyle_primary_color', array(
		'default'           => '#1e88e5',
		'sanitize_callback' => 'sanitize_hex_color',
		'transport'         => 'postMessage',
	) );
	$wp_customize->add_control( new WP_Customize_Color_Control(
		$wp_customize,
		'zibstyle_primary_color',
		array(
			'label'    => __( '主题主色', 'zibstyle' ),
			'description' => __( '调整全站主色调（按钮、链接、卡片标签等）', 'zibstyle' ),
			'section'  => 'colors',
			'priority' => 10,
		)
	) );

	// ===== 首页滑块设置面板 =====
	$wp_customize->add_section( 'zibstyle_slider', array(
		'title'    => __( '首页滑块', 'zibstyle' ),
		'priority' => 60,
	) );

	$wp_customize->add_setting( 'zibstyle_slider_cat', array(
		'default'           => 0,
		'sanitize_callback' => 'absint',
	) );
	$wp_customize->add_control( 'zibstyle_slider_cat', array(
		'label'   => __( '滑块文章来源分类', 'zibstyle' ),
		'description' => __( '选择后滑块展示该分类文章；若留空且有置顶文章，则展示置顶文章。', 'zibstyle' ),
		'section' => 'zibstyle_slider',
		'type'    => 'dropdown-pages', // 占位，下方用分类下拉覆盖
	) );
	// 用分类下拉控件覆盖
	$wp_customize->remove_control( 'zibstyle_slider_cat' );
	$wp_customize->add_control( 'zibstyle_slider_cat', array(
		'label'   => __( '滑块文章来源分类', 'zibstyle' ),
		'section' => 'zibstyle_slider',
		'type'    => 'select',
		'choices' => zibstyle_cat_choices(),
	) );

	$wp_customize->add_setting( 'zibstyle_slider_count', array(
		'default'           => 5,
		'sanitize_callback' => 'absint',
	) );
	$wp_customize->add_control( 'zibstyle_slider_count', array(
		'label'   => __( '滑块文章数量', 'zibstyle' ),
		'section' => 'zibstyle_slider',
		'type'    => 'number',
	) );
}
add_action( 'customize_register', 'zibstyle_customize_register' );

/**
 * 自定义器实时预览：主色变更即时反映（postMessage）
 */
function zibstyle_customize_preview_js() {
	wp_enqueue_script(
		'zibstyle-customize-preview',
		get_template_directory_uri() . '/assets/js/customize-preview.js',
		array( 'customize-preview', 'jquery' ),
		ZIBSTYLE_VERSION,
		true
	);
}
add_action( 'customize_preview_init', 'zibstyle_customize_preview_js' );

/**
 * 分类下拉选项
 */
function zibstyle_cat_choices() {
	$choices = array( 0 => __( '（使用置顶文章）', 'zibstyle' ) );
	$cats    = get_categories( array( 'hide_empty' => false ) );
	foreach ( $cats as $c ) {
		$choices[ $c->term_id ] = $c->name;
	}
	return $choices;
}
