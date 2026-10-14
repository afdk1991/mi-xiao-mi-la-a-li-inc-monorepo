<?php
/**
 * 搜索表单
 */
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="s"><?php esc_html_e( '搜索：', 'slstyle' ); ?></label>
	<input type="search" id="s" name="s" placeholder="<?php esc_attr_e( '输入关键词搜索…', 'slstyle' ); ?>" value="<?php echo get_search_query(); ?>" required>
	<button type="submit" class="btn-primary"><?php esc_html_e( '搜索', 'slstyle' ); ?></button>
</form>
