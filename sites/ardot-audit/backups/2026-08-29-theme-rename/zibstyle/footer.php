<?php
/**
 * 页脚：小工具区 + 底部版权
 */
?>
<footer class="site-footer">
	<div class="container">
		<div class="footer-widgets">
			<div class="footer-about">
				<div class="logo"><?php bloginfo( 'name' ); ?></div>
				<p><?php echo esc_html( get_bloginfo( 'description' ) ?: __( '一个参考 Zibll 设计风格的简洁现代 WordPress 主题。', 'zibstyle' ) ); ?></p>
			</div>
			<?php if ( is_active_sidebar( 'footer-1' ) ) : ?>
				<?php dynamic_sidebar( 'footer-1' ); ?>
			<?php endif; ?>
			<?php if ( is_active_sidebar( 'footer-2' ) ) : ?>
				<?php dynamic_sidebar( 'footer-2' ); ?>
			<?php endif; ?>
			<?php if ( is_active_sidebar( 'footer-3' ) ) : ?>
				<?php dynamic_sidebar( 'footer-3' ); ?>
			<?php endif; ?>
		</div>

		<div class="footer-bottom">
			<div>&copy; <?php echo date( 'Y' ); ?> <?php bloginfo( 'name' ); ?>. <?php esc_html_e( '保留所有权利。', 'zibstyle' ); ?></div>
			<div class="links">
				<?php
				wp_nav_menu( array(
					'theme_location' => 'footer',
					'container'      => '',
					'menu_class'     => '',
					'fallback_cb'    => false,
					'depth'          => 1,
				) );
				?>
				<a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( '网站首页', 'zibstyle' ); ?></a>
			</div>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>

<script id="zibstyle-loading-fix">
/* 兜底：确保首页加载遮罩一定消失（兼容 main.js 未及时执行的情况） */
(function () {
	function hide() {
		var el = document.getElementById('page-loading');
		if (el) {
			el.classList.add('hide');
			setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 400);
		}
	}
	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		hide();
	} else {
		window.addEventListener('load', function () { setTimeout(hide, 100); });
		setTimeout(hide, 800);
	}
})();
</script>
</body>
</html>
