<?php get_header(); ?>
<div class="container">
	<h1 style="padding:24px 0"><?php single_term_title(); ?></h1>
	<div class="product-grid">
		<?php while ( have_posts() ) : the_post();
			$price = get_post_meta( get_the_ID(), '_myp_price', true ); ?>
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
	<?php the_posts_navigation(); ?>
</div>
<?php get_footer(); ?>
