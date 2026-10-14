<?php
/**
 * 首页：slStyle 风格还原
 *  - Hero（粉色渐变卡片：定制服务 / 现已上线 + 4 项服务 + 3D 插图）
 *  - SaaS 业务聚合门户（5 大数据源实时监控：Go 网关 / Java 业务 / Python AI / 数据分析 / 合规）
 *  - 分类入口（6 张卡片）
 *  - 最新文章（slStyle 卡片网格）
 *  - 返回顶部 FAB
 */
get_header();

$contact_page = get_page_by_path( 'contact' );
$contact_url  = $contact_page ? get_permalink( $contact_page ) : home_url( '/' );
?>

<main class="site-main slstyle-home">

	<!-- Hero -->
	<section class="hero">
		<div class="container">
			<div class="hero-card">
				<div class="hero-content">
					<div class="hero-tag">专属您的独特性</div>
					<h1 class="hero-title">定制服务<br><span class="highlight">现已上线</span></h1>
					<p class="hero-sub">一量身定制，专属打造，让您的网站更符合您的需求</p>
					<div class="hero-services">
						<a href="<?php echo esc_url( $contact_url ); ?>" class="svc">
							<span class="svc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13.5 5l-3 14"/></svg></span>
							<span>功能修改</span>
						</a>
						<a href="<?php echo esc_url( $contact_url ); ?>" class="svc">
							<span class="svc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5L18 6a2.12 2.12 0 0 0-3-3l-8.5 8.5"/><path d="M7 17l-2 2 2 .5L9 17z"/><path d="M14 6l3-3 1 1-3 3z"/></svg></span>
							<span>UI 美化</span>
						</a>
						<a href="<?php echo esc_url( $contact_url ); ?>" class="svc">
							<span class="svc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v2a2 2 0 0 0 4 0V3h3a2 2 0 0 1 2 2v3h-2a2 2 0 0 0 0 4h2v3a2 2 0 0 1-2 2h-3v-2a2 2 0 0 0-4 0v2H6a2 2 0 0 1-2-2v-3h2a2 2 0 0 0 0-4H4V5a2 2 0 0 1 2-2h3z"/></svg></span>
							<span>插件定制</span>
						</a>
						<a href="<?php echo esc_url( $contact_url ); ?>" class="svc">
							<span class="svc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 3 4-3 5 3-2 4 2 1-2 3H5l-2-3 2-1-2-4z"/></svg></span>
							<span>主题定制</span>
						</a>
					</div>
				</div>
				<div class="hero-illustration">
					<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/hero-slstyle.png' ); ?>" alt="<?php esc_attr_e( '定制服务插画', 'slstyle' ); ?>">
				</div>
			</div>
		</div>
	</section>

	<!-- SaaS 业务聚合门户（主站核心功能：聚合网关状态/业务核心/AI 洞察/决策分析/合规审计） -->
	<section class="saas-agg-portal" style="padding:48px 0;background:#f7f9fc;">
		<div class="container">
			<div class="section-title">
				<h2>统一业务监控门户</h2>
				<a href="<?php echo esc_url( home_url( '/?page_id=14' ) ); ?>"><?php esc_html_e( '查看完整演示 ›', 'slstyle' ); ?></a>
			</div>
			<?php
			// 首页内嵌 SaaS 聚合器（5 大数据源实时展示，接入 Go 网关）
			if ( shortcode_exists( 'saas_aggregator' ) ) {
				echo do_shortcode( '[saas_aggregator source="all" limit="3"]' );
			} else {
				echo '<p>聚合插件未启用，请到「插件」启用 SaaS Aggregator。</p>';
			}
			?>
		</div>
	</section>

	<!-- 分类入口（6 张真实分类卡片，链接到真实分类归档） -->
	<section class="category-row">
		<div class="container">
			<?php
			// 数据驱动：分类名 -> 真实分类归档链接 + 实时文章数
			$cat_defs = array(
				'技术教程' => array( 'desc' => '开发与设计干货', 'color' => 'purple' ),
				'产品设计' => array( 'desc' => 'UI/UX 与体验设计', 'color' => 'blue' ),
				'行业洞察' => array( 'desc' => '趋势与深度观察', 'color' => 'cyan' ),
				'建站资源' => array( 'desc' => '模板、插件与工具', 'color' => 'pink' ),
				'用户指南' => array( 'desc' => '上手与使用教程', 'color' => 'blue' ),
				'案例精选' => array( 'desc' => '实战案例拆解', 'color' => 'orange' ),
			);
			$cat_links = array();
			foreach ( $cat_defs as $cname => $meta ) {
				$t = get_term_by( 'name', $cname, 'category' );
				$cat_links[ $cname ] = $t ? array(
					'url'   => get_category_link( $t->term_id ),
					'count' => (int) $t->count,
				) : array( 'url' => home_url( '/' ), 'count' => 0 );
			}
			?>
			<div class="category-grid">
				<a href="<?php echo esc_url( $cat_links['技术教程']['url'] ); ?>" class="cat-card <?php echo esc_attr( $cat_defs['技术教程']['color'] ); ?>">
					<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v3a4 4 0 0 1-8 0V4zM6 4H4v2a3 3 0 0 0 3 3M18 4h2v2a3 3 0 0 1-3 3M9 14h6M10 14v4l2 2 2-2v-4"/></svg></span>
					<span class="cat-info"><b>技术教程</b><small><?php echo esc_html( $cat_defs['技术教程']['desc'] ); ?> · <?php echo $cat_links['技术教程']['count']; ?> 篇</small></span>
				</a>
				<a href="<?php echo esc_url( $cat_links['产品设计']['url'] ); ?>" class="cat-card <?php echo esc_attr( $cat_defs['产品设计']['color'] ); ?>">
					<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/></svg></span>
					<span class="cat-info"><b>产品设计</b><small><?php echo esc_html( $cat_defs['产品设计']['desc'] ); ?> · <?php echo $cat_links['产品设计']['count']; ?> 篇</small></span>
				</a>
				<a href="<?php echo esc_url( $cat_links['行业洞察']['url'] ); ?>" class="cat-card <?php echo esc_attr( $cat_defs['行业洞察']['color'] ); ?>">
					<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v18"/></svg></span>
					<span class="cat-info"><b>行业洞察</b><small><?php echo esc_html( $cat_defs['行业洞察']['desc'] ); ?> · <?php echo $cat_links['行业洞察']['count']; ?> 篇</small></span>
				</a>
				<a href="<?php echo esc_url( $cat_links['建站资源']['url'] ); ?>" class="cat-card <?php echo esc_attr( $cat_defs['建站资源']['color'] ); ?>">
					<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.2 11h11l2-7H6"/></svg></span>
					<span class="cat-info"><b>建站资源</b><small><?php echo esc_html( $cat_defs['建站资源']['desc'] ); ?> · <?php echo $cat_links['建站资源']['count']; ?> 篇</small></span>
				</a>
				<a href="<?php echo esc_url( $cat_links['用户指南']['url'] ); ?>" class="cat-card <?php echo esc_attr( $cat_defs['用户指南']['color'] ); ?>">
					<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
					<span class="cat-info"><b>用户指南</b><small><?php echo esc_html( $cat_defs['用户指南']['desc'] ); ?> · <?php echo $cat_links['用户指南']['count']; ?> 篇</small></span>
				</a>
				<a href="<?php echo esc_url( $cat_links['案例精选']['url'] ); ?>" class="cat-card <?php echo esc_attr( $cat_defs['案例精选']['color'] ); ?>">
					<span class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="3.2"/><path d="M4 20a6 6 0 0 1 12 0"/><circle cx="18" cy="16" r="2"/><path d="M18 12v1.5M18 18.5V20M14.5 16h-1M22 16h-1"/></svg></span>
					<span class="cat-info"><b>案例精选</b><small><?php echo esc_html( $cat_defs['案例精选']['desc'] ); ?> · <?php echo $cat_links['案例精选']['count']; ?> 篇</small></span>
				</a>
			</div>
		</div>
	</section>

	<!-- 最新文章 -->
	<section class="articles">
		<div class="container">
			<div class="section-title">
				<h2><?php esc_html_e( '最新文章', 'slstyle' ); ?></h2>
				<a href="<?php echo esc_url( home_url( '/?s=' ) ); ?>"><?php esc_html_e( '查看更多 ›', 'slstyle' ); ?></a>
			</div>

			<?php
			$latest = new WP_Query( array(
				'posts_per_page' => 8,
				'post_status'    => 'publish',
			) );
			if ( $latest->have_posts() ) :
				echo '<div class="article-grid">';
				while ( $latest->have_posts() ) :
					$latest->the_post();
					get_template_part( 'template-parts/article-card' );
				endwhile;
				echo '</div>';
				wp_reset_postdata();
			else :
				get_template_part( 'template-parts/content-none' );
			endif;
			?>
		</div>
	</section>

	<button class="fab" id="fab" aria-label="<?php esc_attr_e( '返回顶部', 'slstyle' ); ?>">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M5 12l7-7 7 7"/></svg>
	</button>
</main>

<?php
get_footer();
