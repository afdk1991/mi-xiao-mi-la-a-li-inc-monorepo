<?php
/**
 * slStyle 风格文章卡片（首页网格用）
 * 封面：有特色图用特色图，否则 slstyle_card_cover() 生成的彩色渐变占位
 * 文字层：分类名 + 作者；置顶文章显示「置顶」徽标
 */
$post_id     = get_the_ID();
$cats        = get_the_category();
$cat         = ! empty( $cats ) ? $cats[0] : null;
$tags        = get_the_tags();
$cover       = slstyle_card_cover( $post_id );
$thumb_big   = $cat ? $cat->name : get_post_type_object( get_post_type() )->labels->singular_name;
$thumb_small = get_the_author();
?>
<article class="article-card">
	<a class="art-thumb" href="<?php the_permalink(); ?>" style="background-image:url('<?php echo esc_url( $cover ); ?>')">
		<span class="thumb-text">
			<big><?php echo esc_html( $thumb_big ); ?></big>
			<small><?php echo esc_html( $thumb_small ); ?></small>
		</span>
		<?php if ( is_sticky( $post_id ) ) : ?>
			<span class="sticky-badge">置顶</span>
		<?php endif; ?>
	</a>
	<div class="art-body">
		<a class="art-title" href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
		<div class="art-tags">
			<?php
			$tag_items = $tags ? $tags : $cats;
			$n = 0;
			if ( $tag_items ) {
				foreach ( $tag_items as $t ) {
					if ( $n++ >= 3 ) {
						break;
					}
					printf(
						'<a href="%s">%s</a>',
						esc_url( get_term_link( $t ) ),
						esc_html( $t->name )
					);
				}
			}
			?>
		</div>
		<div class="art-meta">
			<span>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
				<?php echo get_the_date(); ?>
			</span>
			<span>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
				<?php echo slstyle_post_views( $post_id ); ?>
			</span>
			<span>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/></svg>
				<?php echo slstyle_likes_count( $post_id ); ?>
			</span>
		</div>
	</div>
</article>
