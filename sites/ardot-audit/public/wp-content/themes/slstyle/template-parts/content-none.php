<?php
/**
 * 空状态
 */
?>
<div class="no-results">
	<div class="icon">🔍</div>
	<h2><?php esc_html_e( '什么也没找到', 'slstyle' ); ?></h2>
	<p><?php esc_html_e( '抱歉，没有符合条件的内容。换个关键词试试？', 'slstyle' ); ?></p>
	<?php get_search_form(); ?>
</div>
