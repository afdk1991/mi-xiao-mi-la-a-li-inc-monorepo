<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Seo_SeoMeta {
	public function __construct() {
		add_action( 'add_meta_boxes', array( $this, 'add_box' ) );
		add_action( 'save_post', array( $this, 'save' ) );
	}

	public function add_box() {
		add_meta_box( 'myp_seo', 'MYP SEO 设置', array( $this, 'render' ), 'myp_product', 'side', 'low' );
	}

	public function render( $post ) {
		$title = get_post_meta( $post->ID, '_myp_seo_title', true );
		$kw    = get_post_meta( $post->ID, '_myp_seo_keywords', true );
		$desc  = get_post_meta( $post->ID, '_myp_seo_desc', true );
		echo '<p>SEO 标题<input type="text" name="myp_seo_title" value="' . esc_attr( $title ) . '" class="widefat"></p>';
		echo '<p>关键词<input type="text" name="myp_seo_keywords" value="' . esc_attr( $kw ) . '" class="widefat"></p>';
		echo '<p>描述<textarea name="myp_seo_desc" class="widefat">' . esc_textarea( $desc ) . '</textarea></p>';
		wp_nonce_field( 'myp_seo', 'myp_seo_nonce' );
	}

	public function save( $post_id ) {
		if ( ! isset( $_POST['myp_seo_nonce'] ) || ! wp_verify_nonce( $_POST['myp_seo_nonce'], 'myp_seo' ) ) {
			return;
		}
		foreach ( array( 'title', 'keywords', 'desc' ) as $f ) {
			$k = 'myp_seo_' . $f;
			if ( isset( $_POST[ $k ] ) ) {
				update_post_meta( $post_id, '_' . $k, sanitize_text_field( wp_unslash( $_POST[ $k ] ) ) );
			}
		}
	}
}
