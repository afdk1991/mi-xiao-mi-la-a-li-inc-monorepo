<?php get_header(); ?>
<div class="myp-hero"><h1>全部商品</h1></div>
<div class="container">
	<div class="product-filter" style="padding:16px 0">
		<form method="get" style="display:flex;gap:8px;flex-wrap:wrap">
			<input type="number" name="min_price" placeholder="最低价" value="<?php echo esc_attr( $_GET['min_price'] ?? '' ); ?>">
			<input type="number" name="max_price" placeholder="最高价" value="<?php echo esc_attr( $_GET['max_price'] ?? '' ); ?>">
			<select name="orderby">
				<option value="date">最新</option>
				<option value="price_asc" <?php selected( $_GET['orderby'] ?? '', 'price_asc' ); ?>>价格从低到高</option>
				<option value="price_desc" <?php selected( $_GET['orderby'] ?? '', 'price_desc' ); ?>>价格从高到低</option>
			</select>
			<button class="btn btn-primary">筛选</button>
		</form>
	</div>
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
