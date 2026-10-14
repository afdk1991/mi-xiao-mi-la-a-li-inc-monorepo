<?php
/**
 * 主题兜底模板（WordPress 必需）：
 * 同时承担首页渲染与模板层级最后一环的 fallback。
 * 不引入任何业务逻辑，仅按当前查询循环输出。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$is_product_query = is_post_type_archive( 'myp_product' ) || is_tax( 'myp_product_cat' ) || is_tax( 'myp_product_tag' );
$heading = '';

if ( is_search() ) {
	$heading = '搜索：' . get_search_query();
} elseif ( is_post_type_archive( 'myp_product' ) ) {
	$heading = '全部商品';
} elseif ( is_tax() ) {
	$heading = single_term_title( '', false );
} elseif ( is_home() || is_front_page() ) {
	$heading = '欢迎来到 ' . get_bloginfo( 'name' );
}
?>

<?php if ( $heading ) : ?>
	<div class="myp-hero"><h1><?php echo esc_html( $heading ); ?></h1></div>
<?php endif; ?>

<div class="container">
	<?php if ( have_posts() ) : ?>

		<?php if ( $is_product_query ) : ?>
			<div class="product-grid">
				<?php
				while ( have_posts() ) :
					the_post();
					$price = get_post_meta( get_the_ID(), '_myp_price', true );
					?>
					<div class="product-card">
						<a href="<?php the_permalink(); ?>">
							<div class="thumb"><?php the_post_thumbnail( 'medium' ); ?></div>
							<div class="body">
								<div class="title"><?php the_title(); ?></div>
								<div class="price">¥<?php echo esc_html( $price ); ?></div>
							</div>
						</a>
					</div>
				<?php endwhile; ?>
			</div>
		<?php else : ?>
			<?php
			while ( have_posts() ) :
				the_post();
				?>
				<article style="background:#fff;padding:20px;border-radius:8px;margin:24px 0">
					<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
					<div style="color:#888;font-size:13px;margin:6px 0"><?php echo esc_html( get_the_date() ); ?></div>
					<div><?php the_excerpt(); ?></div>
				</article>
			<?php endwhile; ?>
		<?php endif; ?>

		<?php the_posts_navigation(); ?>

	<?php else : ?>
		<p style="padding:40px 0;color:#888">暂无内容。</p>
	<?php endif; ?>
</div>

<?php
get_footer();
