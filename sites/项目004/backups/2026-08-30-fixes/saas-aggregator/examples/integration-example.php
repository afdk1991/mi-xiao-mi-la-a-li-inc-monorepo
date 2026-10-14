<?php
/**
 * 真实第三方接口接入示例（drop-in，不修改插件核心）。
 *
 * 本文件演示如何把「真实可用的第三方接口」接入 saas-aggregator。它注册了一个新的
 * Provider「实时服务状态」，对接 GitHub 公开的 rate_limit 接口（无需鉴权即可访问，
 * 仅受未认证 60 次/小时限流），从而让插件真正拉取并显示实时数据，验证
 * 「API 客户端 → 缓存 → 归一化 → 展示」整条链路。
 *
 * 用法：
 *   1) 将此文件放到 wp-content/mu-plugins/ 或直接在主题 functions.php 中 require；
 *   2) 到「设置 → SaaS 聚合器」无需额外配置（该示例源默认演示模式关闭、base_url 已内置）；
 *   3) 若要走鉴权接口，在 Provider 的 do_fetch 中补充 api_key/api_secret 即可（见下方注释）。
 *
 * 接入你自己的 SaaS 服务：见仓库 README「扩展新数据源」一节与本文档末尾说明。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 示例 Provider：对接 GitHub 公开 rate_limit（实时数据，证明端到端可用）。
 */
class SAAS_Agg_Providers_GitHub_Status extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'data';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'github_status';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( '实时服务状态（示例）', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( '示例：对接 GitHub 公开 rate_limit 接口，验证真实第三方数据接入。', 'saas-aggregator' );
	}

	/**
	 * 本示例内置了可用的公开地址，故默认即视为「已配置」，直接走真实接口。
	 * （生产接入自有服务时，去掉此方法并在后台填写 base_url 即可。）
	 *
	 * @param array $cfg 配置。
	 * @return bool
	 */
	public function is_configured( $cfg ) {
		return true;
	}

	/**
	 * 取数：GET 真实公开接口。
	 *
	 * @param array $cfg   配置。
	 * @param int   $limit 条数。
	 * @return array|WP_Error
	 */
	protected function do_fetch( $cfg, $limit ) {
		// 示例内置一个真实可用的公开地址；生产可改为你自己的 SaaS 网关地址。
		$base = ! empty( $cfg['base_url'] ) ? $cfg['base_url'] : 'https://api.github.com';
		$path = ! empty( $cfg['endpoint_path'] ) ? $cfg['endpoint_path'] : '/rate_limit';

		$url = rtrim( $base, '/' ) . '/' . ltrim( $path, '/' );

		// 租户维度统一走 X-Tenant-Id 请求头（见 SAAS_Agg_API_Client::request）。
		return SAAS_Agg_API_Client::get(
			$url,
			array(
				'timeout'    => 10,
				'api_key'    => isset( $cfg['api_key'] ) ? $cfg['api_key'] : '',
				'api_secret' => isset( $cfg['api_secret'] ) ? $cfg['api_secret'] : '',
				'tenant_id'  => isset( $cfg['tenant_id'] ) ? $cfg['tenant_id'] : '',
			)
		);
	}

	/**
	 * 把 GitHub 响应归一化为标准条目。
	 *
	 * 不同第三方返回结构不同，重写 normalize_response 即可适配。
	 *
	 * @param array $body GitHub rate_limit 响应。
	 * @return array
	 */
	protected function normalize_response( $body ) {
		$out = array();
		if ( isset( $body['resources'] ) && is_array( $body['resources'] ) ) {
			foreach ( $body['resources'] as $name => $quota ) {
				if ( ! is_array( $quota ) ) {
					continue;
				}
				$remaining = isset( $quota['remaining'] ) ? (int) $quota['remaining'] : 0;
				$limit     = isset( $quota['limit'] ) ? (int) $quota['limit'] : 0;
				$out[] = $this->normalize_item(
					array(
						'title'  => sprintf( 'GitHub 配额 · %s', $name ),
						'value'  => sprintf( '%d / %d', $remaining, $limit ),
						'status' => $remaining > 0 ? 'ok' : 'error',
					)
				);
			}
		}
		return $out;
	}

	/**
	 * 演示数据（仅当未配置且开启 demo 时使用，本示例默认不依赖）。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		return array(
			$this->normalize_item(
				array( 'title' => 'GitHub 配额 · core', 'value' => '60 / 60', 'status' => 'ok' )
			),
		);
	}
}

/**
 * 通过过滤器注册该 Provider（无需改动插件核心文件）。
 */
add_filter(
	'saas_agg_providers',
	function ( $list ) {
		$list[] = new SAAS_Agg_Providers_GitHub_Status();
		return $list;
	}
);
