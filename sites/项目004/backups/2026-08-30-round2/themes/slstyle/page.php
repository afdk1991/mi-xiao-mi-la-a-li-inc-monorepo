<?php
/**
 * 静态页
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<div class="layout">
			<div class="content">
				<?php while ( have_posts() ) : the_post(); ?>
					<article class="page-content">
						<h1><?php the_title(); ?></h1>
						<div class="entry-content">
							<?php the_content(); ?>
						</div>
					</article>
				<?php endwhile; ?>
			</div>

			<?php get_sidebar(); ?>
		</div>
	</div>
</main>

<?php
get_footer();
