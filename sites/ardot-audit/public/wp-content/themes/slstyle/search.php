<?php
/**
 * 搜索结果页
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<div class="archive-head">
			<h1><?php esc_html_e( '搜索结果', 'slstyle' ); ?></h1>
			<p class="desc">
				<?php printf( esc_html__( '关键词「%s」找到 %d 条结果', 'slstyle' ), '<strong>' . get_search_query() . '</strong>', $wp_query->found_posts ); ?>
			</p>
		</div>

		<div class="layout">
			<div class="content">
				<?php if ( have_posts() ) : ?>
					<div class="posts-grid">
						<?php while ( have_posts() ) : the_post(); ?>
							<?php get_template_part( 'template-parts/article-card' ); ?>
						<?php endwhile; ?>
					</div>
					<div class="pagination">
						<?php
						echo paginate_links( array(
							'prev_text' => '‹',
							'next_text' => '›',
						) );
						?>
					</div>
				<?php else : ?>
					<?php get_template_part( 'template-parts/content-none' ); ?>
				<?php endif; ?>
			</div>

			<?php get_sidebar(); ?>
		</div>
	</div>
</main>

<?php
get_footer();
