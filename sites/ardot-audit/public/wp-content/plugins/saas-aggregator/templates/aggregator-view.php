<?php
/**
 * 聚合展示模板。
 *
 * 变量作用域：$sources（SAAS_Agg_Provider_Manager::aggregate 的返回）。
 * 所有输出均经过转义，遵循 WordPress 编码规范。
 *
 * @package SAAS_Aggregator
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="saas-agg-view">
	<?php foreach ( $sources as $source ) : ?>
		<?php
			$badge = saas_agg_layer_badge( $source['layer'] );
			$status_class = 'status-' . esc_attr( $source['status'] );
		?>
		<section class="saas-agg-source <?php echo esc_attr( $badge['class'] ); ?> <?php echo esc_attr( $status_class ); ?>">
			<header class="saas-agg-source-head">
				<div class="saas-agg-title-row">
					<h3 class="saas-agg-source-title"><?php echo esc_html( $source['label'] ); ?></h3>
					<span class="saas-agg-layer"><?php echo esc_html( $badge['label'] ); ?></span>
				</div>
				<?php if ( ! empty( $source['description'] ) ) : ?>
					<p class="saas-agg-source-desc"><?php echo esc_html( $source['description'] ); ?></p>
				<?php endif; ?>
			</header>

			<?php if ( 'error' === $source['status'] ) : ?>
				<p class="saas-agg-error">
					<?php echo esc_html__( '数据获取失败：', 'saas-aggregator' ); ?>
					<?php echo esc_html( $source['message'] ); ?>
				</p>
			<?php elseif ( 'empty' === $source['status'] ) : ?>
				<p class="saas-agg-empty"><?php echo esc_html( $source['message'] ); ?></p>
			<?php else : ?>
				<ul class="saas-agg-items">
					<?php foreach ( $source['items'] as $item ) : ?>
						<li class="saas-agg-item status-<?php echo esc_attr( $item['status'] ); ?>">
							<span class="saas-agg-dot" aria-hidden="true"></span>
							<span class="saas-agg-item-main">
								<span class="saas-agg-item-title"><?php echo esc_html( $item['title'] ); ?></span>
								<?php if ( '' !== $item['value'] ) : ?>
									<span class="saas-agg-item-value"><?php echo esc_html( $item['value'] ); ?></span>
								<?php endif; ?>
							</span>
							<?php if ( ! empty( $item['updated'] ) ) : ?>
								<time class="saas-agg-item-time"><?php echo esc_html( $item['updated'] ); ?></time>
							<?php endif; ?>
							<?php if ( ! empty( $item['url'] ) ) : ?>
								<a class="saas-agg-item-link" href="<?php echo esc_url( $item['url'] ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( '查看', 'saas-aggregator' ); ?></a>
							<?php endif; ?>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
		</section>
	<?php endforeach; ?>
</div>
