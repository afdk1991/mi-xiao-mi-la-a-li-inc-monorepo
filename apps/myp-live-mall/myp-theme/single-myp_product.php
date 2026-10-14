<?php get_header(); ?>
<?php while ( have_posts() ) : the_post();
	$price = get_post_meta( get_the_ID(), '_myp_price', true );
	$stock = get_post_meta( get_the_ID(), '_myp_stock', true ); ?>
	<div class="single-product">
		<div class="product-gallery">
			<?php the_post_thumbnail( 'large', array( 'style' => 'width:100%;border-radius:8px' ) ); ?>
		</div>
		<div class="product-info">
			<h1><?php the_title(); ?></h1>
			<div class="price-big">¥<?php echo esc_html( $price ); ?></div>
			<p style="color:#888">库存：<?php echo esc_html( $stock ); ?></p>
			<div class="desc" style="margin:20px 0"><?php the_content(); ?></div>
			<button class="btn btn-outline" onclick="mypAddCart(<?php the_ID(); ?>)">加入购物车</button>
			<button class="btn btn-primary" onclick="mypBuyNow(<?php the_ID(); ?>)">立即购买</button>
			<?php if ( get_post_meta( get_the_ID(), '_myp_live_id', true ) ) : ?>
				<a class="btn btn-primary" href="<?php echo esc_url( home_url( '/live/?id=' . (int) get_post_meta( get_the_ID(), '_myp_live_id', true ) ) ); ?>">进入直播</a>
			<?php endif; ?>
		</div>
	</div>
<?php endwhile; ?>
<?php get_footer(); ?>
