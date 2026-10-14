<?php
/**
 * 404 页面：友好未找到
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<section class="not-found">
			<div class="nf-code">404</div>
			<h1 class="nf-title"><?php esc_html_e( '页面走丢了', 'zibstyle' ); ?></h1>
			<p class="nf-desc"><?php esc_html_e( '抱歉，您访问的页面不存在或已被移动。换个关键词搜索，或返回首页继续浏览。', 'zibstyle' ); ?></p>
			<div class="nf-actions">
				<a class="btn-vip" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( '返回首页', 'zibstyle' ); ?></a>
				<a class="btn-ghost" href="<?php echo esc_url( home_url( '/?s=' ) ); ?>"><?php esc_html_e( '浏览全部文章', 'zibstyle' ); ?></a>
			</div>
			<div class="nf-search">
				<?php get_search_form(); ?>
			</div>
		</section>
	</div>
</main>

<?php
get_footer();
