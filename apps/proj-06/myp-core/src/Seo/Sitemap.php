<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Seo_Sitemap {
	public function __construct() {
		add_action( 'template_redirect', array( $this, 'render' ) );
	}

	public function render() {
		if ( ! isset( $_GET['myp_sitemap'] ) || 'xml' !== $_GET['myp_sitemap'] ) {
			return;
		}
		$posts = get_posts( array( 'post_type' => 'myp_product', 'numberposts' => 500 ) );
		header( 'Content-Type: application/xml; charset=UTF-8' );
		echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
		foreach ( $posts as $p ) {
			echo '<url><loc>' . esc_url( get_permalink( $p->ID ) ) . '</loc></url>' . "\n";
		}
		echo '</urlset>';
		exit;
	}
}
