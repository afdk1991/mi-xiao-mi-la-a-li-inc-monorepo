<?php
/**
 * 首页主滑块
 */
$slider = slstyle_slider_posts( (int) get_theme_mod( 'slstyle_slider_count', 5 ) );
if ( ! $slider->have_posts() ) {
	return;
}
?>
<section class="hero-slider">
	<div class="slider" id="hero-slider">
		<?php
		$i = 0;
		while ( $slider->have_posts() ) :
			$slider->the_post();
			$cats  = get_the_category();
			$cat   = ! empty( $cats ) ? $cats[0] : null;
			$active = 0 === $i ? ' active' : '';
			?>
			<div class="slide<?php echo esc_attr( $active ); ?>">
				<div class="slide-img" style="background-image:url('<?php echo esc_url( slstyle_thumb() ); ?>')"></div>
				<div class="slide-body">
					<?php if ( $cat ) : ?><span class="cat"><?php echo esc_html( $cat->name ); ?></span><?php endif; ?>
					<h2><a href="<?php the_permalink(); ?>" style="color:#fff"><?php the_title(); ?></a></h2>
					<p><?php echo esc_html( slstyle_excerpt( 50 ) ); ?></p>
					<a class="btn" href="<?php the_permalink(); ?>"><?php esc_html_e( '阅读全文', 'slstyle' ); ?></a>
				</div>
			</div>
			<?php
			$i++;
		endwhile;
		wp_reset_postdata();
		?>
		<button class="slider-nav slider-prev" aria-label="上一张">&#10094;</button>
		<button class="slider-nav slider-next" aria-label="下一张">&#10095;</button>
		<div class="slider-dots"></div>
	</div>
</section>
