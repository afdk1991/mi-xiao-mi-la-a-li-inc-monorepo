<?php
/**
 * 侧边栏
 */
if ( ! is_active_sidebar( 'sidebar-1' ) ) {
	return;
}
?>
<aside class="sidebar" aria-label="<?php esc_attr_e( '侧边栏', 'slstyle' ); ?>">
	<?php dynamic_sidebar( 'sidebar-1' ); ?>
</aside>
