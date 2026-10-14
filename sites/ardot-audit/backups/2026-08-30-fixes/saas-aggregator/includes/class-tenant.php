<?php
/**
 * 租户映射：将 WordPress 用户与后端 X-Tenant-Id 关联。
 *
 * 设计：在用户资料页维护 saas_agg_tenant_id 元数据；
 * API 客户端发起请求时自动以当前登录用户的租户覆盖配置中的 tenant_id，
 * 实现「同一 WordPress 站点、不同用户看到各自租户数据」的行级隔离。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 租户解析工具。
 */
class SAAS_Agg_Tenant {

	/**
	 * 用户元数据键。
	 *
	 * @var string
	 */
	const META_KEY = 'saas_agg_tenant_id';

	/**
	 * 构造：挂接用户资料字段与保存钩子。
	 */
	public function __construct() {
		add_action( 'show_user_profile', array( $this, 'render_field' ) );
		add_action( 'edit_user_profile', array( $this, 'render_field' ) );
		add_action( 'personal_options_update', array( $this, 'save_field' ) );
		add_action( 'edit_user_profile_update', array( $this, 'save_field' ) );
	}

	/**
	 * 获取当前用户的租户 ID。
	 *
	 * 优先级：当前登录用户 meta → 全局默认租户 → 'default'。
	 *
	 * @return string
	 */
	public static function get_current_tenant() {
		$user_id = get_current_user_id();
		if ( $user_id ) {
			$meta = get_user_meta( $user_id, self::META_KEY, true );
			if ( ! empty( $meta ) ) {
				return (string) $meta;
			}
		}
		$settings = saas_agg_get_settings();
		$global   = isset( $settings['global']['default_tenant'] ) ? (string) $settings['global']['default_tenant'] : '';
		return $global ? $global : 'default';
	}

	/**
	 * 在用户资料页渲染租户字段。
	 *
	 * @param WP_User $user 当前编辑的用户。
	 */
	public function render_field( $user ) {
		$value = get_user_meta( $user->ID, self::META_KEY, true );
		?>
		<h2><?php echo esc_html__( 'SaaS 租户', 'saas-aggregator' ); ?></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th><label for="saas_agg_tenant_id"><?php echo esc_html__( '租户 ID', 'saas-aggregator' ); ?></label></th>
				<td>
					<input type="text" name="saas_agg_tenant_id" id="saas_agg_tenant_id" value="<?php echo esc_attr( $value ); ?>" class="regular-text" />
					<p class="description"><?php echo esc_html__( '用于向后端网关传递 X-Tenant-Id 请求头，实现数据行级隔离。留空则使用全局默认租户。', 'saas-aggregator' ); ?></p>
				</td>
			</tr>
		</table>
		<?php
	}

	/**
	 * 保存用户资料中的租户字段。
	 *
	 * @param int $user_id 被保存的用户 ID。
	 */
	public function save_field( $user_id ) {
		if ( ! current_user_can( 'edit_user', $user_id ) ) {
			return;
		}
		if ( isset( $_POST['saas_agg_tenant_id'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			$val = sanitize_text_field( wp_unslash( $_POST['saas_agg_tenant_id'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
			if ( '' === $val ) {
				delete_user_meta( $user_id, self::META_KEY );
			} else {
				update_user_meta( $user_id, self::META_KEY, $val );
			}
		}
	}
}
