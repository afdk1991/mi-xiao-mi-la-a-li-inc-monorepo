<?php if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<header class="myp-header">
	<div class="container bar">
		<a class="myp-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">MYP 商城</a>
		<nav class="myp-nav">
			<a href="<?php echo esc_url( get_post_type_archive_link( 'myp_product' ) ); ?>">商品</a>
			<a href="<?php echo esc_url( home_url( '/live' ) ); ?>">直播</a>
			<a href="<?php echo esc_url( home_url( '/cart' ) ); ?>">购物车</a>
			<a href="<?php echo esc_url( home_url( '/user-center' ) ); ?>">我的</a>
		</nav>
	</div>
</header>
<main class="container">
