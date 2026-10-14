<?php
/**
 * 页眉：slStyle 风格深色导航
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> class="<?php echo slstyle_is_dark() ? 'dark' : ''; ?>">
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

		<nav class="main-nav" id="main-nav" aria-label="<?php esc_attr_e( '主导航', 'slstyle' ); ?>">
		<?php
		// 主导航：优先渲染后台「外观 → 菜单」分配给 primary 的菜单，
		// 未分配时回落到 slstyle_page_menu() 的默认结构，前台永不空白。
		wp_nav_menu( array(
			'theme_location' => 'primary',
			'container'      => false,
			'menu_class'     => '',
			'items_wrap'     => '<ul>%3$s</ul>',
			'fallback_cb'    => 'slstyle_page_menu',
			'walker'         => new SLStyle_Nav_Walker(),
		) );
		?>
		</nav>

		<div class="header-actions">
			<button class="search-toggle" id="search-toggle" aria-label="<?php esc_attr_e( '搜索', 'slstyle' ); ?>">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			</button>
			<button class="header-icon" aria-label="通知">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
			</button>
			<button class="header-icon" aria-label="设置">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
			</button>
			<button class="dark-toggle" id="dark-toggle" aria-label="<?php esc_attr_e( '切换深色模式', 'slstyle' ); ?>">🌙</button>

			<div class="header-user">
				<?php if ( is_user_logged_in() ) : ?>
					<?php $uc = get_page_by_path( 'user-center' ); $uc_url = $uc ? get_permalink( $uc ) : admin_url( 'profile.php' ); ?>
					<button class="avatar-btn" id="avatar-btn" aria-label="<?php esc_attr_e( '用户菜单', 'slstyle' ); ?>"><?php echo get_avatar( get_current_user_id(), 32, '', '', array( 'class' => '' ) ); ?></button>
					<div class="user-menu" id="user-menu">
						<div class="uname"><?php echo esc_html( wp_get_current_user()->display_name ); ?></div>
						<a href="<?php echo esc_url( $uc_url ); ?>"><?php esc_html_e( '个人中心', 'slstyle' ); ?></a>
						<a href="<?php echo esc_url( wp_logout_url( home_url() ) ); ?>"><?php esc_html_e( '退出登录', 'slstyle' ); ?></a>
					</div>
				<?php else : ?>
					<button class="avatar-btn" id="avatar-btn" aria-label="<?php esc_attr_e( '登录', 'slstyle' ); ?>"><?php echo get_avatar( 0, 32, '', '', array( 'class' => '' ) ); ?></button>
				<?php endif; ?>
			</div>

			<?php
			$vip_uc  = get_page_by_path( 'user-center' );
			$vip_url = $vip_uc ? get_permalink( $vip_uc ) : wp_login_url( home_url() );
			?>
			<a class="btn-vip" href="<?php echo esc_url( $vip_url ); ?>">✦ 开通会员</a>

			<button class="menu-toggle" id="menu-toggle" aria-label="<?php esc_attr_e( '菜单', 'slstyle' ); ?>">
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
