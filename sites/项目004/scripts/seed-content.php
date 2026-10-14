<?php
/**
 * seed-content.php —— 幂等播种默认分类与示例文章
 *
 * 背景（通读发现）：库里仅有「未分类」，主题 slstyle 的首页分类卡片区与主导航
 * 「文章中心」下拉因此整段不渲染。本脚本补齐一组默认分类与示例文章，
 * 让信息架构完整、首页卡片可见。
 *
 * 幂等：已存在同名分类则跳过；每个分类下仅当没有已发布文章时才补示例文章。
 *
 * 运行（在 wp004-php 容器内，/var/www/html 为站点根）：
 *   docker cp scripts/seed-content.php wp004-php:/tmp/seed-content.php
 *   docker exec wp004-php php /tmp/seed-content.php
 */

if ( ! defined( 'ABSPATH' ) && file_exists( '/var/www/html/wp-load.php' ) ) {
	require_once '/var/www/html/wp-load.php';
}

if ( ! function_exists( 'wp_insert_term' ) ) {
	echo "✗ WP 环境未加载，无法播种。\n";
	exit( 1 );
}

$seed_categories = array(
	array( 'name' => '产品动态', 'slug' => 'product-news',  'desc' => '新功能、版本与产品公告' ),
	array( 'name' => '技术博客', 'slug' => 'tech-blog',    'desc' => '架构、性能与工程实践' ),
	array( 'name' => '客户案例', 'slug' => 'case-study',   'desc' => '真实落地与成效' ),
	array( 'name' => '行业洞察', 'slug' => 'industry',     'desc' => '趋势、合规与市场观察' ),
);

$created_cat = 0;
$created_post = 0;

foreach ( $seed_categories as $c ) {
	$existing = get_term_by( 'slug', $c['slug'], 'category' );
	if ( $existing && ! is_wp_error( $existing ) ) {
		echo "• 分类已存在，跳过：{$c['name']} (term_id={$existing->term_id})\n";
		$cat_id = (int) $existing->term_id;
	} else {
		$res = wp_insert_term( $c['name'], 'category', array(
			'slug'        => $c['slug'],
			'description' => $c['desc'],
		) );
		if ( is_wp_error( $res ) ) {
			echo "✗ 创建分类失败 {$c['name']}：" . $res->get_error_message() . "\n";
			continue;
		}
		$cat_id = (int) $res['term_id'];
		$created_cat++;
		echo "✓ 创建分类：{$c['name']} (term_id=$cat_id)\n";
	}

	// 仅当该分类下没有已发布文章时才补一篇示例。
	$has = get_posts( array(
		'category'       => $cat_id,
		'post_status'    => 'publish',
		'posts_per_page' => 1,
		'fields'         => 'ids',
	) );
	if ( ! empty( $has ) ) {
		echo "  - 该分类已有文章，跳过示例。\n";
		continue;
	}

	$post_id = wp_insert_post( array(
		'post_title'   => $c['name'] . '：示例文章',
		'post_content' => '这是为演示首页分类卡片与导航下拉而生成的示例文章。可在后台编辑或删除。',
		'post_status'  => 'publish',
		'post_type'    => 'post',
		'post_category' => array( $cat_id ),
	) );
	if ( is_wp_error( $post_id ) || ! $post_id ) {
		echo "✗ 创建示例文章失败（分类 {$c['name']}）。\n";
		continue;
	}
	$created_post++;
	echo "  ✓ 示例文章已创建 (post_id=$post_id)\n";
}

// 报告分类总数（排除未分类），便于确认导航/首页卡片是否会出现。
$all = get_categories( array( 'hide_empty' => false, 'exclude' => 1 ) );
echo "\n=== 结果 ===\n";
echo "本次新建分类：$created_cat，新建示例文章：$created_post\n";
echo "可用（非未分类）分类数：" . count( $all ) . "\n";
foreach ( $all as $t ) {
	echo "  - {$t->name} (slug={$t->slug}, count={$t->count})\n";
}
echo "完成。\n";
