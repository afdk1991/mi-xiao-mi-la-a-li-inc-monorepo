<?php
/**
 * 分类 / 标签 / 日期归档
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<?php slstyle_breadcrumbs(); ?>
		<div class="archive-head">
			<?php the_archive_title( '<h1>', '</h1>' ); ?>
			<?php if ( get_the_archive_description() ) : ?>
				<p class="desc"><?php the_archive_description(); ?></p>
			<?php endif; ?>
			<p class="count"><?php printf( esc_html__( '共 %d 篇文章', 'slstyle' ), $wp_query->found_posts ); ?></p>
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
