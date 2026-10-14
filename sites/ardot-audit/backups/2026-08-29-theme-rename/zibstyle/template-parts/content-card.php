<?php
/**
 * 文章卡片（用于网格展示）
 */
$cats = get_the_category();
$cat  = ! empty( $cats ) ? $cats[0] : null;
?>
<article class="post-card">
	<a class="thumb" href="<?php the_permalink(); ?>" style="background-image:url('<?php echo esc_url( zibstyle_thumb() ); ?>')">
		<?php if ( $cat ) : ?>
			<span class="cat-badge"><?php echo esc_html( $cat->name ); ?></span>
		<?php endif; ?>
	</a>
	<div class="card-body">
		<h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
		<p class="excerpt"><?php echo esc_html( zibstyle_excerpt( 60 ) ); ?></p>
		<div class="meta">
			<?php echo get_avatar( get_the_author_meta( 'ID' ), 24, '', '', array( 'class' => 'avatar' ) ); ?>
			<span><?php the_author(); ?></span>
			<span class="dot"></span>
			<span><?php echo get_the_date(); ?></span>
			<span class="dot"></span>
			<span><?php echo zibstyle_post_views(); ?> 阅读</span>
		</div>
	</div>
</article>
