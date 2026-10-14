<?php
/**
 * Template Name: 关于我们
 * 原创「关于我们」页面模板，风格对齐 ZibStyle / zibll。
 */
get_header();
?>

<div class="container">
	<?php zibstyle_breadcrumbs(); ?>

	<section class="page-hero">
		<h1>关于我们</h1>
		<p>ZibStyle 是一个参考 Zibll 设计风格的原创 WordPress 主题，致力于用简洁现代的视觉与流畅的交互，帮助创作者快速搭建专业的内容站点。</p>
	</section>

	<section class="about-features">
		<div class="feat-grid">
			<div class="feat">
				<div class="feat-ico">🎨</div>
				<h3>简洁现代</h3>
				<p>以蓝色主色与卡片网格为核心，干净留白、层次分明，阅读体验舒适。</p>
			</div>
			<div class="feat">
				<div class="feat-ico">📱</div>
				<h3>全端响应</h3>
				<p>桌面、平板、手机自适应，移动端导航与交互均经过精心打磨。</p>
			</div>
			<div class="feat">
				<div class="feat-ico">🧩</div>
				<h3>高度可定制</h3>
				<p>自定义器内调整主色、深色模式、首页滑块，无需改动任何代码。</p>
			</div>
			<div class="feat">
				<div class="feat-ico">⚡</div>
				<h3>交互完备</h3>
				<p>浏览量、点赞、收藏、文章目录、前端用户中心一应俱全。</p>
			</div>
		</div>
	</section>

	<section class="about-stats">
		<div class="stat"><b>100%</b><span>原创实现</span></div>
		<div class="stat"><b>4+</b><span>核心模板</span></div>
		<div class="stat"><b>GPL</b><span>开源协议</span></div>
		<div class="stat"><b>🌙</b><span>深色模式</span></div>
	</section>

	<section class="about-cta">
		<h2>准备好开始了吗？</h2>
		<p>在自定义器中挑选你的主色，几分钟内拥有专属风格的内容站。</p>
		<a class="btn" href="<?php echo esc_url( home_url( '/' ) ); ?>">返回首页</a>
	</section>
</div>

<?php get_footer(); ?>
