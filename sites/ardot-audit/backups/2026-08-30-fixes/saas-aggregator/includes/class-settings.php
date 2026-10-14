<?php
/**
 * 后台设置页：全局参数与每个数据源的密钥/参数配置。
 *
 * 遵循 WP Settings API：单一 option 数组存储，统一 sanitize，
 * 权限校验 manage_options，表单自带 nonce。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 设置页控制器。
 */
class SAAS_Agg_Settings {

	/**
	 * 构造：挂接菜单与初始化。
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		// 处理「清空缓存」操作（GET 参数 + nonce 校验）。
		add_action( 'admin_init', array( $this, 'handle_flush_cache' ) );
	}

	/**
	 * 注册后台菜单（挂在「设置」下，权限 manage_options）。
	 */
	public function add_menu() {
		add_options_page(
			__( 'SaaS 聚合器设置', 'saas-aggregator' ),
			__( 'SaaS 聚合器', 'saas-aggregator' ),
			'manage_options',
			'saas-aggregator',
			array( $this, 'render_page' )
		);
	}

	/**
	 * 注册设置项（单一 option 数组）。
	 */
	public function register_settings() {
		register_setting(
			'saas_aggregator',
			SAAS_AGG_OPTION_NAME,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
			)
		);
	}

	/**
	 * 加载后台样式。
	 *
	 * @param string $hook 当前页面 hook。
	 */
	public function enqueue_assets( $hook ) {
		if ( 'settings_page_saas-aggregator' !== $hook ) {
			return;
		}
		wp_enqueue_style(
			'saas-agg-admin',
			SAAS_AGG_PLUGIN_URL . 'assets/admin.css',
			array(),
			SAAS_AGG_VERSION
		);
		wp_enqueue_script(
			'saas-agg-admin',
			SAAS_AGG_PLUGIN_URL . 'assets/admin.js',
			array( 'jquery' ),
			SAAS_AGG_VERSION,
			true
		);
	}

	/**
	 * 统一过滤/清洗提交值。
	 *
	 * @param array $input 原始提交。
	 * @return array
	 */
	public function sanitize( $input ) {
		if ( ! is_array( $input ) ) {
			return saas_agg_get_default_settings();
		}

		$defaults = saas_agg_get_default_settings();
		$out      = array(
			'global'    => $defaults['global'],
			'providers' => $defaults['providers'],
		);

		// 全局项。
		$global_in = isset( $input['global'] ) && is_array( $input['global'] ) ? $input['global'] : array();
		$out['global']['cache_ttl']        = max( 30, absint( $global_in['cache_ttl'] ?? 300 ) );
		$out['global']['items_per_source'] = max( 1, absint( $global_in['items_per_source'] ?? 5 ) );
		$out['global']['demo_mode']        = isset( $global_in['demo_mode'] ) ? 'yes' : '';
		$out['global']['log_errors']       = isset( $global_in['log_errors'] ) ? 'yes' : '';
		$out['global']['default_tenant']   = sanitize_text_field( $global_in['default_tenant'] ?? 'default' );

		// 各 provider。
		if ( isset( $input['providers'] ) && is_array( $input['providers'] ) ) {
			foreach ( $defaults['providers'] as $id => $def ) {
				if ( ! isset( $input['providers'][ $id ] ) ) {
					continue;
				}
				$p = $input['providers'][ $id ];
					$out['providers'][ $id ] = array_merge(
					$def,
					array(
						'enabled'       => isset( $p['enabled'] ) ? 'yes' : '',
						'label'         => sanitize_text_field( $p['label'] ?? $def['label'] ),
						'base_url'      => esc_url_raw( trim( (string) ( $p['base_url'] ?? '' ) ) ),
						'api_key'       => sanitize_text_field( $p['api_key'] ?? '' ),
						'api_secret'    => sanitize_text_field( $p['api_secret'] ?? '' ),
						'tenant_id'     => sanitize_text_field( $p['tenant_id'] ?? '' ),
						'endpoint_path' => sanitize_text_field( $p['endpoint_path'] ?? $def['endpoint_path'] ),
						'query'         => sanitize_textarea_field( $p['query'] ?? ( $def['query'] ?? '' ) ),
						'cache_ttl'     => max( 30, absint( $p['cache_ttl'] ?? $def['cache_ttl'] ) ),
					)
				);
			}
		}

		add_settings_error(
			'saas_aggregator',
			'saas_aggregator_saved',
			__( '设置已保存。', 'saas-aggregator' ),
			'updated'
		);

		return $out;
	}

	/**
	 * 处理「清空缓存」请求（仅管理员 + nonce）。
	 */
	public function handle_flush_cache() {
		if ( ! isset( $_GET['saas_agg_flush'] ) || ! isset( $_GET['_wpnonce'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ), 'saas_agg_flush_cache' ) ) {
			wp_die( esc_html__( '安全校验失败。', 'saas-aggregator' ) );
		}
		SAAS_Agg_Provider_Manager::flush_cache();
		$redirect = remove_query_arg( array( 'saas_agg_flush', '_wpnonce' ), wp_get_referer() );
		$redirect = add_query_arg( 'saas_agg_flushed', '1', $redirect );
		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * 渲染设置页。
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( '权限不足。', 'saas-aggregator' ) );
		}

		$settings  = saas_agg_get_settings();
		$global    = $settings['global'];
		$providers = $settings['providers'];
		?>
		<div class="wrap saas-agg-settings">
			<h1><?php echo esc_html__( 'SaaS 聚合器设置', 'saas-aggregator' ); ?></h1>
			<p class="description">
				<?php echo esc_html__( '在此填写各第三方数据源的接口地址与密钥，插件将聚合展示并统一管理。未配置且开启演示模式时，展示示例数据。', 'saas-aggregator' ); ?>
			</p>

			<?php settings_errors( 'saas_aggregator' ); ?>
			<?php if ( isset( $_GET['saas_agg_flushed'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
				<div class="notice notice-success is-dismissible"><p><?php echo esc_html__( '缓存已清空。', 'saas-aggregator' ); ?></p></div>
			<?php endif; ?>

			<form method="post" action="options.php">
				<?php settings_fields( 'saas_aggregator' ); ?>

				<h2><?php echo esc_html__( '全局设置', 'saas-aggregator' ); ?></h2>
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php echo esc_html__( '默认缓存时长（秒）', 'saas-aggregator' ); ?></th>
							<td>
								<input type="number" min="30" step="30" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[global][cache_ttl]" value="<?php echo esc_attr( $global['cache_ttl'] ); ?>" />
								<p class="description"><?php echo esc_html__( '各数据源未单独设置时使用的缓存秒数。', 'saas-aggregator' ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html__( '每源展示条数', 'saas-aggregator' ); ?></th>
							<td>
								<input type="number" min="1" step="1" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[global][items_per_source]" value="<?php echo esc_attr( $global['items_per_source'] ); ?>" />
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html__( '默认租户 ID', 'saas-aggregator' ); ?></th>
							<td>
								<input type="text" class="regular-text" placeholder="default" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[global][default_tenant]" value="<?php echo esc_attr( $global['default_tenant'] ); ?>" />
								<p class="description"><?php echo esc_html__( '当用户未在其资料页配置租户 ID 时使用的全局默认租户，对应后端 X-Tenant-Id。', 'saas-aggregator' ); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html__( '演示模式', 'saas-aggregator' ); ?></th>
							<td>
								<label>
									<input type="checkbox" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[global][demo_mode]" value="yes" <?php checked( 'yes', $global['demo_mode'] ); ?> />
									<?php echo esc_html__( '未配置真实接口时返回示例数据（便于预览与测试）', 'saas-aggregator' ); ?>
								</label>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html__( '记录错误日志', 'saas-aggregator' ); ?></th>
							<td>
								<label>
									<input type="checkbox" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[global][log_errors]" value="yes" <?php checked( 'yes', $global['log_errors'] ); ?> />
									<?php echo esc_html__( '将接口错误写入 error_log（密钥已脱敏）', 'saas-aggregator' ); ?>
								</label>
							</td>
						</tr>
					</tbody>
				</table>

				<h2><?php echo esc_html__( '数据源配置', 'saas-aggregator' ); ?></h2>
				<div class="saas-agg-providers">
					<?php foreach ( $providers as $id => $cfg ) : ?>
						<fieldset class="saas-agg-provider">
							<legend>
								<label>
									<input type="checkbox" class="saas-agg-enable" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][enabled]" value="yes" <?php checked( 'yes', $cfg['enabled'] ); ?> />
									<strong><?php echo esc_html( $cfg['label'] ); ?></strong>
								</label>
								<span class="saas-agg-desc"><?php echo esc_html( $cfg['description'] ); ?></span>
							</legend>
							<table class="form-table" role="presentation">
								<tbody>
									<tr>
										<th scope="row"><label><?php echo esc_html__( '接口基地址', 'saas-aggregator' ); ?></label></th>
										<td>
											<input type="url" class="regular-text" placeholder="http://localhost:8080" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][base_url]" value="<?php echo esc_attr( $cfg['base_url'] ); ?>" />
											<p class="description"><?php echo esc_html__( '统一 Go 网关地址（docker compose 默认端口 8080）。所有数据源经此网关鉴权与路由，部署后改为你的网关域名即可。', 'saas-aggregator' ); ?></p>
										</td>
									</tr>
									<tr>
										<th scope="row"><label><?php echo esc_html__( '接口路径', 'saas-aggregator' ); ?></label></th>
										<td><input type="text" class="regular-text" placeholder="/api/..." name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][endpoint_path]" value="<?php echo esc_attr( $cfg['endpoint_path'] ); ?>" /></td>
									</tr>
									<?php if ( isset( $cfg['query'] ) ) : ?>
										<tr>
											<th scope="row"><label><?php echo esc_html__( '查询语句', 'saas-aggregator' ); ?></label></th>
											<td>
												<textarea class="regular-text" rows="2" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][query]"><?php echo esc_textarea( $cfg['query'] ); ?></textarea>
												<p class="description"><?php echo esc_html__( 'RAG 默认检索问题，可在短代码 source=ai_insights 时用 query 参数覆盖。', 'saas-aggregator' ); ?></p>
											</td>
										</tr>
									<?php endif; ?>
									<tr>
										<th scope="row"><label><?php echo esc_html__( 'API Key', 'saas-aggregator' ); ?></label></th>
										<td><input type="text" class="regular-text" placeholder="demo-key" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][api_key]" value="<?php echo esc_attr( $cfg['api_key'] ); ?>" autocomplete="off" /></td>
									</tr>
									<tr>
										<th scope="row"><label><?php echo esc_html__( 'API Secret', 'saas-aggregator' ); ?></label></th>
										<td><input type="password" class="regular-text" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][api_secret]" value="<?php echo esc_attr( $cfg['api_secret'] ); ?>" autocomplete="new-password" /></td>
									</tr>
									<tr>
										<th scope="row"><label><?php echo esc_html__( '租户 ID', 'saas-aggregator' ); ?></label></th>
										<td><input type="text" class="regular-text" placeholder="default" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][tenant_id]" value="<?php echo esc_attr( $cfg['tenant_id'] ); ?>" /></td>
									</tr>
									<tr>
										<th scope="row"><label><?php echo esc_html__( '缓存时长（秒）', 'saas-aggregator' ); ?></label></th>
										<td><input type="number" min="30" step="30" name="<?php echo esc_attr( SAAS_AGG_OPTION_NAME ); ?>[providers][<?php echo esc_attr( $id ); ?>][cache_ttl]" value="<?php echo esc_attr( $cfg['cache_ttl'] ); ?>" /></td>
									</tr>
								</tbody>
							</table>
						</fieldset>
					<?php endforeach; ?>
				</div>

				<?php submit_button(); ?>
			</form>

			<hr />
			<h2><?php echo esc_html__( '缓存管理', 'saas-aggregator' ); ?></h2>
			<p>
				<a class="button" href="<?php echo esc_url( wp_nonce_url( add_query_arg( 'saas_agg_flush', '1' ), 'saas_agg_flush_cache' ) ); ?>">
					<?php echo esc_html__( '清空全部聚合缓存', 'saas-aggregator' ); ?>
				</a>
			</p>
			<p class="description">
				<?php echo esc_html__( '当第三方接口返回变更但缓存未过期时，可手动清空以立即刷新。', 'saas-aggregator' ); ?>
			</p>
		</div>
		<?php
	}
}
