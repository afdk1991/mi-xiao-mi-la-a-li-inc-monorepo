<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Seo_SeoHead {
	public function __construct() {
		add_action( 'wp_head', array( $this, 'output' ), 1 );
	}

	public function output() {
		if ( is_singular( 'myp_product' ) ) {
			$id = get_the_ID();
			$title = get_post_meta( $id, '_myp_seo_title', true );
			$kw    = get_post_meta( $id, '_myp_seo_keywords', true );
			$desc  = get_post_meta( $id, '_myp_seo_desc', true );
			if ( $title ) { echo '<title>' . esc_html( $title ) . "</title>\n"; }
			if ( $kw ) { echo '<meta name="keywords" content="' . esc_attr( $kw ) . "\">\n"; }
			if ( $desc ) { echo '<meta name="description" content="' . esc_attr( $desc ) . "\">\n"; }
		}
	}
}
