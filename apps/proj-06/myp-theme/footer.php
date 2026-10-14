<?php if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
</main>
<footer class="myp-footer">
	<div class="container">
		© <?php echo date( 'Y' ); ?> <?php bloginfo( 'name' ); ?> · Powered by MYP
	</div>
</footer>
<nav class="myp-tabbar">
	<a href="<?php echo esc_url( home_url( '/' ) ); ?>">首页</a>
	<a href="<?php echo esc_url( get_post_type_archive_link( 'myp_product' ) ); ?>">商品</a>
	<a href="<?php echo esc_url( home_url( '/live' ) ); ?>">直播</a>
	<a href="<?php echo esc_url( home_url( '/cart' ) ); ?>">购物车</a>
	<a href="<?php echo esc_url( home_url( '/user-center' ) ); ?>">我的</a>
</nav>
<?php wp_footer(); ?>
</body>
</html>
