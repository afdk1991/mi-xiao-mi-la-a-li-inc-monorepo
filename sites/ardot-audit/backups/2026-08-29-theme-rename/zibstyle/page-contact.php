<?php
/**
 * Template Name: 联系我们
 * 原创「联系我们」页面模板，含可发送邮件的联系表单（page 模板）。
 */
get_header();

$status = isset( $_GET['contact'] ) ? sanitize_key( $_GET['contact'] ) : '';
?>

<div class="container">
	<?php zibstyle_breadcrumbs(); ?>

	<section class="page-hero">
		<h1>联系我们</h1>
		<p>有合作、反馈或疑问？填写下方表单，或直接通过以下方式找到我们。</p>
	</section>

	<?php if ( 'sent' === $status ) : ?>
		<div class="notice notice-ok">✅ 已收到您的消息，我们会尽快回复！</div>
	<?php elseif ( 'empty' === $status ) : ?>
		<div class="notice notice-err">请填写姓名、邮箱与留言内容。</div>
	<?php elseif ( 'invalid' === $status ) : ?>
		<div class="notice notice-err">表单校验失败，请刷新后重试。</div>
	<?php endif; ?>

	<div class="contact-wrap">
		<div class="contact-info">
			<h3>联系方式</h3>
			<ul class="info-list">
				<li><span class="ico">📧</span><span class="k">邮箱</span>
					<a href="mailto:<?php echo antispambot( get_option( 'admin_email' ) ); ?>"><?php echo antispambot( get_option( 'admin_email' ) ); ?></a>
				</li>
				<li><span class="ico">🕒</span><span class="k">工作时间</span>周一至周五 9:00–18:00</li>
				<li><span class="ico">📍</span><span class="k">地址</span>互联网 · 云端</li>
			</ul>
		</div>

		<form class="contact-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="zibstyle_contact">
			<?php wp_nonce_field( 'zibstyle_contact', 'zibstyle_contact_nonce' ); ?>
			<label>姓名
				<input type="text" name="cname" required>
			</label>
			<label>邮箱
				<input type="email" name="cemail" required>
			</label>
			<label>留言
				<textarea name="cmsg" rows="5" required></textarea>
			</label>
			<button type="submit" class="btn">发送消息</button>
		</form>
	</div>
</div>

<?php get_footer(); ?>
