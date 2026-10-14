<?php
/* Template Name: 发布产品页面 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// P1-10 修复：处理发布提交（nonce + 登录校验 + wp_insert_post + 商品字段落库）
if ( isset( $_POST['myp_submit_product'] ) ) {
	if ( ! is_user_logged_in() ) {
		echo '<div class="container"><p>请先 <a href="' . esc_url( wp_login_url( get_permalink() ) ) . '">登录</a> 后再发布。</p></div>';
		get_footer();
		exit;
	}
	check_admin_referer( 'myp_submit_product', 'myp_submit_nonce' );

	$title   = sanitize_text_field( wp_unslash( $_POST['post_title'] ?? '' ) );
	$price   = (float) ( $_POST['myp_price'] ?? 0 );
	$stock   = max( 0, (int) ( $_POST['myp_stock'] ?? 0 ) );
	$content = sanitize_textarea_field( wp_unslash( $_POST['post_content'] ?? '' ) );

	if ( ! $title || $price <= 0 ) {
		echo '<div class="container"><p style="color:#c0392b">标题不能为空，且价格必须大于 0。</p></div>';
		get_footer();
		exit;
	}

	$post_id = wp_insert_post( array(
		'post_type'    => 'myp_product',
		'post_status'  => 'publish',
		'post_title'   => $title,
		'post_content' => $content,
		'post_author'  => get_current_user_id(),
	) );

	if ( $post_id && ! is_wp_error( $post_id ) ) {
		update_post_meta( $post_id, '_myp_price', $price );
		update_post_meta( $post_id, '_myp_stock', $stock );
		wp_safe_redirect( get_permalink( $post_id ) );
		exit;
	}

	echo '<div class="container"><p style="color:#c0392b">发布失败，请稍后重试。</p></div>';
	get_footer();
	exit;
}

get_header(); ?>
<div class="container">
	<h1 style="padding:24px 0">发布产品</h1>
	<form method="post" style="background:#fff;padding:20px;border-radius:8px;max-width:600px">
		<?php wp_nonce_field( 'myp_submit_product', 'myp_submit_nonce' ); ?>
		<p>标题 <input name="post_title" class="regular-text" style="width:100%" required></p>
		<p>价格 <input name="myp_price" type="number" step="0.01" min="0.01" style="width:100%" required></p>
		<p>库存 <input name="myp_stock" type="number" min="0" value="0" style="width:100%"></p>
		<p>详情 <textarea name="post_content" style="width:100%;height:120px"></textarea></p>
		<button class="btn btn-primary" name="myp_submit_product" value="1">提交</button>
	</form>
</div>
<?php get_footer(); ?>
