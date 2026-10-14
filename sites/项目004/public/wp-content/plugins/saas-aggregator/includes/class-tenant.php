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
	 * 优先级：过滤器 saas_agg_tenant_for_user（接入外部租户目录的扩展点）
	 *       → 当前登录用户 meta → 全局默认租户 → 'default'。
	 *
	 * @return string
	 */
	public static function get_current_tenant() {
		$user_id = get_current_user_id();

		// 扩展点：外部租户目录 / 鉴权服务可在此接管解析，
		// 返回非空字符串即生效，未接时返回空串交由本地解析。
		$resolved = (string) apply_filters( 'saas_agg_tenant_for_user', '', $user_id );
		if ( '' !== $resolved ) {
			return $resolved;
		}

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
	 * 当前用户是否有权修改租户绑定。
	 *
	 * 租户绑定决定了「能看到谁的数据」，因此不能由用户自行填写：
	 * 默认只有具备 edit_users 能力的角色（管理员）可改，其余一律只读。
	 *
	 * @return bool
	 */
	public static function can_edit_tenant() {
		$default = function_exists( 'current_user_can' ) ? current_user_can( 'edit_users' ) : true;
		return (bool) apply_filters( 'saas_agg_can_edit_tenant', $default );
	}

	/**
	 * 允许绑定的租户集合（空数组表示不限制）。
	 *
	 * 站点可通过 saas_agg_allowed_tenants 过滤器下发白名单，
	 * 作为接入租户目录前的静态兜底。
	 *
	 * @return string[]
	 */
	public static function allowed_tenants() {
		$list = apply_filters( 'saas_agg_allowed_tenants', array() );
		return is_array( $list ) ? array_map( 'strval', $list ) : array();
	}

	/**
	 * 在用户资料页渲染租户字段。
	 *
	 * 无权修改时渲染为只读，避免「看似可编辑、提交却被忽略」的误导。
	 *
	 * @param WP_User $user 当前编辑的用户。
	 */
	public function render_field( $user ) {
		$value    = get_user_meta( $user->ID, self::META_KEY, true );
		$editable = self::can_edit_tenant();
		$allowed  = self::allowed_tenants();
		?>
		<h2><?php echo esc_html__( 'SaaS 租户', 'saas-aggregator' ); ?></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th><label for="saas_agg_tenant_id"><?php echo esc_html__( '租户 ID', 'saas-aggregator' ); ?></label></th>
				<td>
					<input type="text" name="<?php echo $editable ? 'saas_agg_tenant_id' : ''; ?>" id="saas_agg_tenant_id" value="<?php echo esc_attr( $value ); ?>" class="regular-text" <?php echo $editable ? '' : 'readonly="readonly"'; ?> />
					<p class="description"><?php echo esc_html__( '用于向后端网关传递 X-Tenant-Id 请求头，实现数据行级隔离。留空则使用全局默认租户。', 'saas-aggregator' ); ?></p>
					<?php if ( ! $editable ) : ?>
						<p class="description"><?php echo esc_html__( '该绑定由管理员分配，当前账号只读。', 'saas-aggregator' ); ?></p>
					<?php elseif ( ! empty( $allowed ) ) : ?>
						<p class="description">
							<?php
							printf(
								/* translators: %s 为允许绑定的租户列表 */
								esc_html__( '当前仅允许绑定：%s', 'saas-aggregator' ),
								esc_html( implode( '、', $allowed ) )
							);
							?>
						</p>
					<?php endif; ?>
				</td>
			</tr>
		</table>
		<?php
	}

	/**
	 * 保存用户资料中的租户字段。
	 *
	 * 双重约束：
	 * 1) 无 edit_users 能力的账号提交该字段一律忽略（防自行换租户）；
	 * 2) 配置了 saas_agg_allowed_tenants 白名单时，不在集合内的值一律拒绝。
	 *
	 * @param int $user_id 被保存的用户 ID。
	 */
	public function save_field( $user_id ) {
		if ( ! current_user_can( 'edit_user', $user_id ) ) {
			return;
		}
		if ( ! isset( $_POST['saas_agg_tenant_id'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			return;
		}

		if ( ! self::can_edit_tenant() ) {
			return;
		}

		$val = sanitize_text_field( wp_unslash( $_POST['saas_agg_tenant_id'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing

		$allowed = self::allowed_tenants();
		if ( '' !== $val && ! empty( $allowed ) && ! in_array( $val, $allowed, true ) ) {
			return; // 不在白名单内，保持原值不动。
		}

		if ( '' === $val ) {
			delete_user_meta( $user_id, self::META_KEY );
		} else {
			update_user_meta( $user_id, self::META_KEY, $val );
		}
	}
}
