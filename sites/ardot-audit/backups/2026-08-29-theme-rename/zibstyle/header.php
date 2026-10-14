<?php
/**
 * 页眉：zibll 风格深色导航
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> class="<?php echo zibstyle_is_dark() ? 'dark' : ''; ?>">
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>

<div class="page-loading" id="page-loading"><div class="spinner"></div></div>

<header class="site-header">
	<div class="container">
		<a class="site-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
			<?php if ( has_custom_logo() ) : ?>
				<?php the_custom_logo(); ?>
			<?php else : ?>
				<span class="logo-mark">Z</span>
				<span class="logo-text"><?php bloginfo( 'name' ); ?></span>
			<?php endif; ?>
		</a>

		<nav class="main-nav" id="main-nav" aria-label="<?php esc_attr_e( '主导航', 'zibstyle' ); ?>">
			<ul>
				<li><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( '首页', 'zibstyle' ); ?></a></li>
				<li class="has-dropdown">
					<a href="<?php echo esc_url( home_url( '/?page_id=14' ) ); ?>"><?php esc_html_e( '业务监控', 'zibstyle' ); ?><span class="arrow">▾</span></a>
					<ul class="sub-menu">
						<li><a href="<?php echo esc_url( home_url( '/?page_id=14' ) ); ?>">SaaS 聚合演示</a></li>
						<li><a href="<?php echo esc_url( home_url( '/' ) ); ?>#saas-agg">统一监控门户</a></li>
					</ul>
				</li>
				<li class="has-dropdown">
					<a href="<?php echo esc_url( get_category_link( get_cat_ID( '技术教程' ) ) ); ?>"><?php esc_html_e( '文章中心', 'zibstyle' ); ?><span class="arrow">▾</span></a>
					<ul class="sub-menu">
						<li><a href="<?php echo esc_url( get_category_link( get_cat_ID( '技术教程' ) ) ); ?>">技术教程</a></li>
						<li><a href="<?php echo esc_url( get_category_link( get_cat_ID( '产品设计' ) ) ); ?>">产品设计</a></li>
						<li><a href="<?php echo esc_url( get_category_link( get_cat_ID( '行业洞察' ) ) ); ?>">行业洞察</a></li>
						<li><a href="<?php echo esc_url( get_category_link( get_cat_ID( '案例精选' ) ) ); ?>">案例精选</a></li>
					</ul>
				</li>
				<li><a href="<?php echo esc_url( get_permalink( get_page_by_path( 'about' ) ) ); ?>"><?php esc_html_e( '关于我们', 'zibstyle' ); ?></a></li>
				<li><a href="<?php echo esc_url( get_permalink( get_page_by_path( 'contact' ) ) ); ?>"><?php esc_html_e( '联系我们', 'zibstyle' ); ?></a></li>
			</ul>
		</nav>

		<div class="header-actions">
			<button class="search-toggle" id="search-toggle" aria-label="<?php esc_attr_e( '搜索', 'zibstyle' ); ?>">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			</button>
			<button class="header-icon" aria-label="通知">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
			</button>
			<button class="header-icon" aria-label="设置">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
			</button>
			<button class="dark-toggle" id="dark-toggle" aria-label="<?php esc_attr_e( '切换深色模式', 'zibstyle' ); ?>">🌙</button>

			<div class="header-user">
				<?php if ( is_user_logged_in() ) : ?>
					<?php $uc = get_page_by_path( 'user-center' ); $uc_url = $uc ? get_permalink( $uc ) : admin_url( 'profile.php' ); ?>
					<button class="avatar-btn" id="avatar-btn" aria-label="<?php esc_attr_e( '用户菜单', 'zibstyle' ); ?>"><?php echo get_avatar( get_current_user_id(), 32, '', '', array( 'class' => '' ) ); ?></button>
					<div class="user-menu" id="user-menu">
						<div class="uname"><?php echo esc_html( wp_get_current_user()->display_name ); ?></div>
						<a href="<?php echo esc_url( $uc_url ); ?>"><?php esc_html_e( '个人中心', 'zibstyle' ); ?></a>
						<a href="<?php echo esc_url( wp_logout_url( home_url() ) ); ?>"><?php esc_html_e( '退出登录', 'zibstyle' ); ?></a>
					</div>
				<?php else : ?>
					<button class="avatar-btn" id="avatar-btn" aria-label="<?php esc_attr_e( '登录', 'zibstyle' ); ?>"><?php echo get_avatar( 0, 32, '', '', array( 'class' => '' ) ); ?></button>
				<?php endif; ?>
			</div>

			<?php
			$vip_uc  = get_page_by_path( 'user-center' );
			$vip_url = $vip_uc ? get_permalink( $vip_uc ) : wp_login_url( home_url() );
			?>
			<a class="btn-vip" href="<?php echo esc_url( $vip_url ); ?>">✦ 开通会员</a>

			<button class="menu-toggle" id="menu-toggle" aria-label="<?php esc_attr_e( '菜单', 'zibstyle' ); ?>">
				<span></span><span></span><span></span>
			</button>
		</div>
	</div>

	<div class="header-search" id="header-search">
		<div class="container">
			<?php get_search_form(); ?>
		</div>
	</div>
</header>
