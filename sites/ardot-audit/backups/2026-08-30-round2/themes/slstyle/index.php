<?php
/**
 * 索引/回退页：文章列表网格
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<div class="archive-head">
			<h1><?php esc_html_e( '文章列表', 'slstyle' ); ?></h1>
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
