<?php get_header(); ?>
<div class="container">
	<h1 style="padding:24px 0">搜索：<?php echo esc_html( get_search_query() ); ?></h1>
	<div class="product-grid">
		<?php if ( have_posts() ) : while ( have_posts() ) : the_post();
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
		<?php endwhile; else : ?>
			<p>没有找到相关商品。</p>
		<?php endif; ?>
	</div>
</div>
<?php get_footer(); ?>
