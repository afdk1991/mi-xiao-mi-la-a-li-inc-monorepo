<?php
/**
 * 访问控制：把「谁能看聚合数据」收敛到唯一口径。
 *
 * 背景（通读发现）：
 * 1. REST 路由早先已要求登录，但短代码 / 区块对匿名访客照常渲染真实租户数据，
 *    两条路径口径不一致 —— 匿名访问前台即可看到默认租户的业务数据；
 * 2. 缓存键原先只由 provider 配置生成，不含租户维度，
 *    A 租户写入的 transient 会被 B 租户命中（见 SAAS_Agg_Cache::key）。
 *
 * 本类不做「租户归属」的最终裁决（那属于网关 / 租户目录的职责），
 * 只负责 WordPress 侧的门户：默认拒绝匿名读取真实数据，并留出过滤器供站点显式开放。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 访问判定器。
 */
class SAAS_Agg_Access {

	/**
	 * 判定当前访问者是否可以查看聚合数据。
	 *
	 * 判定顺序：
	 * 1) 过滤器 saas_agg_public_read 显式开放 → 允许（站点自主承担公开责任）；
	 * 2) 前台 + 演示模式 → 允许（内置假数据，不含真实租户信息）；
	 * 3) 否则要求登录；若过滤器 saas_agg_view_capability 指定了能力，则一并校验。
	 *
	 * @param string $context 调用场景：'frontend'（短代码/区块）或 'rest'（REST 路由）。
	 * @return true|WP_Error
	 */
	public static function check( $context = 'frontend' ) {
		// 站点显式开放：保留最高优先级的逃生口，便于做公开数据看板。
		if ( (bool) apply_filters( 'saas_agg_public_read', false ) ) {
			return true;
		}

		// 演示模式：数据来自内置假数据（class-provider-interface 的 demo 分支），
		// 不携带真实租户信息，允许匿名查看，保证演示站开箱可展示。
		// REST 不享受此豁免 —— 接口永远是最容易被批量拉取的面。
		if ( 'frontend' === $context && self::is_demo_mode() ) {
			return true;
		}

		if ( ! self::is_logged_in() ) {
			return new WP_Error(
				'saas_agg_login_required',
				__( '该数据涉及租户业务信息，请登录后查看。', 'saas-aggregator' ),
				array( 'status' => 401 )
			);
		}

		$cap = (string) apply_filters( 'saas_agg_view_capability', '' );
		if ( '' !== $cap && ! self::current_user_can( $cap ) ) {
			return new WP_Error(
				'saas_agg_forbidden',
				__( '当前账号无权查看该数据。', 'saas-aggregator' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * 是否处于演示模式。
	 *
	 * @return bool
	 */
	public static function is_demo_mode() {
		if ( ! function_exists( 'saas_agg_get_settings' ) ) {
			return false;
		}
		$settings = saas_agg_get_settings();
		return isset( $settings['global']['demo_mode'] ) && 'yes' === $settings['global']['demo_mode'];
	}

	/**
	 * 登录判定（兼容测试桩：桩环境不提供 is_user_logged_in）。
	 *
	 * @return bool
	 */
	public static function is_logged_in() {
		if ( function_exists( 'is_user_logged_in' ) ) {
			return (bool) is_user_logged_in();
		}
		return get_current_user_id() > 0;
	}

	/**
	 * 能力判定（兼容测试桩：桩环境不提供 current_user_can）。
	 *
	 * 桩环境没有角色体系，无法判定能力，这里按「已登录即可」放行；
	 * 真实环境由 WP 的角色/能力系统裁决。
	 *
	 * @param string $cap 能力标识。
	 * @return bool
	 */
	public static function current_user_can( $cap ) {
		if ( function_exists( 'current_user_can' ) ) {
			return (bool) current_user_can( $cap );
		}
		unset( $cap );
		return true;
	}
}
