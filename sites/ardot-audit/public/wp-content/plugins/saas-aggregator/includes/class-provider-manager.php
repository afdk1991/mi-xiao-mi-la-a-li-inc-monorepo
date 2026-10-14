<?php
/**
 * 数据源注册与调度中心。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 负责收集所有 Provider 实例、按需获取单源或多源聚合结果。
 *
 * 扩展方式：第三方开发者可通过 `saas_agg_providers` 过滤器注册自己的 Provider 类实例，
 * 无需修改核心代码。
 */
class SAAS_Agg_Provider_Manager {

	/**
	 * 缓存的 Provider 实例列表。
	 *
	 * @var SAAS_Agg_Provider_Interface[]
	 */
	private static $providers = null;

	/**
	 * 获取全部 Provider 实例（含内置与通过过滤器注册的）。
	 *
	 * @return SAAS_Agg_Provider_Interface[]
	 */
	public static function get_providers() {
		if ( null !== self::$providers ) {
			return self::$providers;
		}

		// 内置 Provider（对应三份架构文档中的能力来源）。
		$builtin = array(
			new SAAS_Agg_Providers_Gateway_Status(),
			new SAAS_Agg_Providers_Business_Core(),
			new SAAS_Agg_Providers_AI_Insights(),
			new SAAS_Agg_Providers_Analytics(),
			new SAAS_Agg_Providers_Compliance(),
			new SAAS_Agg_Providers_Ecommerce(),
		);

		/**
		 * 允许外部扩展数据源。
		 *
		 * @param SAAS_Agg_Provider_Interface[] $builtin 内置数据源。
		 */
		$all = apply_filters( 'saas_agg_providers', $builtin );

		$indexed = array();
		foreach ( $all as $provider ) {
			if ( $provider instanceof SAAS_Agg_Provider_Interface ) {
				$indexed[ $provider->get_id() ] = $provider;
			}
		}

		self::$providers = $indexed;
		return $indexed;
	}

	/**
	 * 按 id 取单个 Provider。
	 *
	 * @param string $id 数据源标识。
	 * @return SAAS_Agg_Provider_Interface|null
	 */
	public static function get_provider( $id ) {
		$providers = self::get_providers();
		return isset( $providers[ $id ] ) ? $providers[ $id ] : null;
	}

	/**
	 * 聚合获取结果，支持单源或全源；任何单源失败不影响其他源。
	 *
	 * @param string|null $source 来源 id；null/'all' 表示全部已启用来源。
	 * @param int         $limit  每源条数。
	 * @return array 每个来源的聚合结构。
	 */
	public static function aggregate( $source = 'all', $limit = 5 ) {
		$settings  = saas_agg_get_settings();
		$providers = self::get_providers();
		$out       = array();

		$targets = ( 'all' === $source || empty( $source ) )
			? array_keys( $providers )
			: array( $source );

		foreach ( $targets as $id ) {
			$provider = isset( $providers[ $id ] ) ? $providers[ $id ] : null;
			if ( ! $provider ) {
				continue;
			}

			$cfg = isset( $settings['providers'][ $id ] ) ? $settings['providers'][ $id ] : array();

			// 仅展示已启用来源（除非显式指定单源）。
			if ( 'all' === $source && empty( $cfg['enabled'] ) ) {
				continue;
			}

			$entry = array(
				'source'      => $id,
				'label'       => $provider->get_label(),
				'description' => $provider->get_description(),
				'layer'       => method_exists( $provider, 'get_layer' ) ? $provider->get_layer() : 'unknown',
				'status'      => 'ok',
				'items'       => array(),
				'message'     => '',
				'cached'      => false,
			);

			$items = $provider->fetch_items( $cfg, $limit );

			if ( is_wp_error( $items ) ) {
				$entry['status']  = 'error';
				$entry['message'] = $items->get_error_message();
			} elseif ( empty( $items ) ) {
				$entry['status']  = 'empty';
				$entry['message'] = __( '暂无数据。', 'saas-aggregator' );
			} else {
				$entry['items']  = $items;
				// 回填缓存命中状态（'hit' 表示命中新鲜缓存）。
				$entry['cached'] = ( 'hit' === $provider->get_cache_status() );
			}

			$out[] = $entry;
		}

		return $out;
	}

	/**
	 * 清除缓存（管理操作调用）。
	 *
	 * @param string|null $source 来源标识。
	 */
	public static function flush_cache( $source = null ) {
		SAAS_Agg_Cache::flush( $source );
	}
}
