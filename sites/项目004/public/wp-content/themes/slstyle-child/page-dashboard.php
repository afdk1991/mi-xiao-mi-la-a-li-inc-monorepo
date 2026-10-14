<?php
/**
 * 模板名称：聚合看板
 * 模板用途：以页面模板形式展示 SaaS 聚合器各数据源的实时状态与条目。
 *
 * 说明：该模板由子主题新增，不复制、不修改父主题的任何模板文件。
 * 页面结构沿用父主题的 main > container > layout > content 骨架，
 * 以保证与父主题的样式、深色模式、响应式规则完全一致。
 *
 * @package slStyle_Child
 */

get_header();
?>

<main class="site-main">
	<div class="container">
		<div class="layout">
			<div class="content">

				<?php while ( have_posts() ) : ?>
					<?php the_post(); ?>

					<article class="page-content">
						<h1><?php the_title(); ?></h1>

						<?php if ( get_the_content() ) : ?>
							<div class="entry-content">
								<?php the_content(); ?>
							</div>
						<?php endif; ?>

						<?php if ( ! zsc_has_aggregator() ) : ?>

							<div class="zsc-empty">
								<p><?php esc_html_e( '未检测到 SaaS Aggregator 插件，或插件未启用。请在后台启用插件后再查看本看板。', 'slstyle-child' ); ?></p>
							</div>

						<?php else : ?>

							<?php
							$sources = zsc_get_aggregate( 'all', 5 );
							$tenant  = function_exists( 'SAAS_Agg_Tenant::get_current_tenant' ) || class_exists( 'SAAS_Agg_Tenant' )
								? SAAS_Agg_Tenant::get_current_tenant()
								: '';

							$ok_count   = 0;
							$down_count = 0;
							foreach ( $sources as $entry ) {
								if ( 'error' === $entry['status'] ) {
									++$down_count;
								} else {
									++$ok_count;
								}
							}
							?>

							<section class="zsc-dashboard" id="zsc-dashboard" aria-live="polite">

								<div class="zsc-dashboard__head">
									<h2 class="zsc-dashboard__title"><?php esc_html_e( '数据源总览', 'slstyle-child' ); ?></h2>
									<span class="zsc-dashboard__meta">
										<?php
										printf(
											/* translators: 1: 正常数量 2: 异常数量 3: 租户标识 */
											esc_html__( '正常 %1$d · 异常 %2$d · 租户 %3$s', 'slstyle-child' ),
											(int) $ok_count,
											(int) $down_count,
											esc_html( $tenant ? $tenant : __( '默认', 'slstyle-child' ) )
										);
										?>
									</span>
									<div class="zsc-dashboard__actions">
										<button type="button" class="zsc-btn" id="zsc-refresh" data-nonce="<?php echo esc_attr( wp_create_nonce( 'wp_rest' ) ); ?>">
											<?php esc_html_e( '刷新数据', 'slstyle-child' ); ?>
										</button>
									</div>
								</div>

								<?php if ( empty( $sources ) ) : ?>

									<div class="zsc-empty">
										<p><?php esc_html_e( '暂无启用的数据源。请到「设置 → SaaS 聚合器」进行配置。', 'slstyle-child' ); ?></p>
									</div>

								<?php else : ?>

									<div class="zsc-grid">
										<?php foreach ( $sources as $entry ) : ?>
											<?php
											$badge_class = 'ok' === $entry['status'] ? 'zsc-badge--ok' : ( 'error' === $entry['status'] ? 'zsc-badge--error' : 'zsc-badge--disabled' );
											$badge_text  = 'ok' === $entry['status'] ? __( '正常', 'slstyle-child' )
												: ( 'error' === $entry['status'] ? __( '异常', 'slstyle-child' ) : __( '空', 'slstyle-child' ) );
											?>
											<div class="zsc-card" data-source="<?php echo esc_attr( $entry['source'] ); ?>">
												<div class="zsc-card__top">
													<span class="zsc-card__label"><?php echo esc_html( $entry['label'] ); ?></span>
													<span class="zsc-badge <?php echo esc_attr( $badge_class ); ?>"><?php echo esc_html( $badge_text ); ?></span>
												</div>

												<p class="zsc-card__desc"><?php echo esc_html( $entry['description'] ); ?></p>

												<p style="margin:0 0 10px;">
													<span class="zsc-badge zsc-badge--layer"><?php echo esc_html( $entry['layer'] ); ?></span>
													<?php if ( ! empty( $entry['cached'] ) ) : ?>
														<span class="zsc-badge zsc-badge--disabled"><?php esc_html_e( '缓存', 'slstyle-child' ); ?></span>
													<?php endif; ?>
												</p>

												<?php if ( ! empty( $entry['items'] ) ) : ?>
													<ul class="zsc-list">
														<?php foreach ( $entry['items'] as $item ) : ?>
															<li>
																<?php if ( ! empty( $item['url'] ) ) : ?>
																	<a href="<?php echo esc_url( $item['url'] ); ?>" rel="noopener noreferrer">
																		<?php echo esc_html( $item['title'] ); ?>
																	</a>
																<?php else : ?>
																	<?php echo esc_html( $item['title'] ); ?>
																<?php endif; ?>

																<?php if ( '' !== $item['value'] ) : ?>
																	<strong> <?php echo esc_html( $item['value'] ); ?></strong>
																<?php endif; ?>
															</li>
														<?php endforeach; ?>
													</ul>
												<?php elseif ( '' !== $entry['message'] ) : ?>
													<p class="zsc-error"><?php echo esc_html( $entry['message'] ); ?></p>
												<?php endif; ?>
											</div>
										<?php endforeach; ?>
									</div>

								<?php endif; ?>

							</section>

						<?php endif; ?>
					</article>

				<?php endwhile; ?>

			</div>

			<?php
			// 看板页优先使用子主题注册的专用侧栏，未挂小工具时回退到默认侧栏。
			if ( is_active_sidebar( 'zsc-dashboard' ) ) :
				?>
				<aside class="sidebar zsc-dashboard-sidebar">
					<?php dynamic_sidebar( 'zsc-dashboard' ); ?>
				</aside>
				<?php
			else :
				get_sidebar();
			endif;
			?>
		</div>
	</div>
</main>

<?php
get_footer();
