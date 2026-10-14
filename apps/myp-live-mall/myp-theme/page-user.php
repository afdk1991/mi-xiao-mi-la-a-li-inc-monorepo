<?php
/* Template Name: 用户中心页面 */
get_header(); ?>
<div class="container">
	<h1 style="padding:24px 0">用户中心</h1>
	<?php if ( ! is_user_logged_in() ) : ?>
		<p>请先 <a href="<?php echo esc_url( wp_login_url( get_permalink() ) ); ?>">登录</a>。</p>
	<?php else : ?>
		<div style="background:#fff;padding:20px;border-radius:8px">
			<h3>我的订单</h3>
			<div id="myp-user-orders">加载中...</div>
			<h3 style="margin-top:24px">积分</h3>
			<div id="myp-user-points">加载中...</div>
		</div>
	<?php endif; ?>
</div>
<?php get_footer(); ?>
