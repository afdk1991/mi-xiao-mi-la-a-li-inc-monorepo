<?php
/**
 * 文章详情
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<div class="layout">
			<div class="content">
				<?php while ( have_posts() ) : the_post(); ?>
					<?php slstyle_breadcrumbs(); ?>

					<article class="single-post">
						<?php
						$cats = get_the_category();
						if ( ! empty( $cats ) ) :
							?>
							<a class="cat-link" href="<?php echo esc_url( get_category_link( $cats[0]->term_id ) ); ?>"><?php echo esc_html( $cats[0]->name ); ?></a>
						<?php endif; ?>

						<?php the_title( '<h1>', '</h1>' ); ?>

						<div class="post-meta">
							<?php echo get_avatar( get_the_author_meta( 'ID' ), 30, '', '', array( 'class' => 'avatar' ) ); ?>
							<span><?php the_author(); ?></span>
							<span><?php echo get_the_date(); ?></span>
							<span><?php echo esc_html( slstyle_read_time() ); ?></span>
							<span><?php echo slstyle_post_views(); ?> 阅读</span>
						</div>

						<?php if ( has_post_thumbnail() ) : ?>
							<?php the_post_thumbnail( 'large', array( 'style' => 'border-radius:8px;margin:0 0 18px;' ) ); ?>
						<?php endif; ?>

						<div class="post-toc" id="post-toc">
							<div class="toc-title">📑 <?php esc_html_e( '目录', 'slstyle' ); ?></div>
							<ol class="toc-body"></ol>
						</div>

						<div class="entry-content">
							<?php the_content(); ?>
							<?php
							wp_link_pages( array(
								'before' => '<div class="page-links">' . __( '分页：', 'slstyle' ),
								'after'  => '</div>',
							) );
							?>
						</div>

						<div class="entry-footer">
							<?php
							$tags = get_the_tags();
							if ( $tags ) :
								foreach ( $tags as $t ) :
									?>
									<a class="tag" href="<?php echo esc_url( get_tag_link( $t->term_id ) ); ?>">#<?php echo esc_html( $t->name ); ?></a>
								<?php endforeach; ?>
							<?php endif; ?>
						</div>

						<div class="post-actions">
							<button class="act-btn liked<?php echo slstyle_is_liked() ? ' active' : ''; ?>" data-post="<?php the_ID(); ?>" data-act="like">
								<span class="ico">♥</span><span class="txt"><?php echo slstyle_likes_count(); ?></span>
							</button>
							<button class="act-btn faved<?php echo slstyle_is_faved() ? ' active' : ''; ?>" data-post="<?php the_ID(); ?>" data-act="fav">
								<span class="ico">★</span><span class="txt"><?php esc_html_e( '收藏', 'slstyle' ); ?></span>
							</button>
							<span class="act-meta"><?php esc_html_e( '点赞与收藏仅代表你的喜爱', 'slstyle' ); ?></span>
						</div>
					</article>

					<?php
					// 相关文章（同分类）
					$related = new WP_Query( array(
						'category__in'   => wp_get_post_categories( get_the_ID() ),
						'post__not_in'   => array( get_the_ID() ),
						'posts_per_page' => 3,
						'post_status'    => 'publish',
					) );
					if ( $related->have_posts() ) :
						?>
						<div class="section-head" style="margin-top:30px">
							<span class="bar"></span>
							<h2><?php esc_html_e( '相关推荐', 'slstyle' ); ?></h2>
						</div>
						<div class="posts-grid">
							<?php while ( $related->have_posts() ) : $related->the_post(); ?>
								<?php get_template_part( 'template-parts/article-card' ); ?>
							<?php endwhile; ?>
						</div>
						<?php wp_reset_postdata(); ?>
					<?php endif; ?>

				<?php endwhile; ?>
			</div>

			<?php get_sidebar(); ?>
		</div>
	</div>
</main>

<?php
get_footer();
