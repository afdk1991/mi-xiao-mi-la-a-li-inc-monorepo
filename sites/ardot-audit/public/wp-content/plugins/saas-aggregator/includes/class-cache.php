<?php
/**
 * 缓存封装：基于 WordPress Transients，支持「错误时回退到陈旧缓存」。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 数据获取 + 缓存的统一入口。
 *
 * 行为：
 * 1. 命中且未过期的缓存直接返回（status=hit）；
 * 2. 未命中/过期则调用 $fetch_callback 拉取最新数据；
 *    - 成功：写入缓存，返回（status=fresh）；
 *    - 失败：若存在上次的成功缓存（陈旧），返回它并标记（status=stale）；
 *    - 无任何缓存：返回 WP_Error。
 */
class SAAS_Agg_Cache {

	/**
	 * 生成缓存键（带前缀 + 参数哈希，避免冲突）。
	 *
	 * @param string $group 数据来源标识。
	 * @param array  $params 影响结果的可变参数。
	 * @return string
	 */
	public static function key( $group, $params = array() ) {
		$params = is_array( $params ) ? $params : array();

		// 租户维度必须进缓存键：同一份 provider 配置下，不同租户拿到的行级数据不同。
		// 否则 A 租户写入的 transient 会被 B 租户直接命中，形成跨租户数据串读。
		if ( (bool) apply_filters( 'saas_agg_cache_key_include_tenant', true ) ) {
			$params['__tenant'] = class_exists( 'SAAS_Agg_Tenant' )
				? SAAS_Agg_Tenant::get_current_tenant()
				: 'default';
		}

		$suffix = $params ? md5( wp_json_encode( self::normalize_params( $params ) ) ) : 'default';
		return 'saas_agg_' . $group . '_' . $suffix;
	}

	/**
	 * 递归按 key 排序，确保缓存键与参数书写顺序无关（可缓存性正确性）。
	 *
	 * @param mixed $params 待规范化参数。
	 * @return mixed
	 */
	private static function normalize_params( $params ) {
		if ( ! is_array( $params ) ) {
			return $params;
		}
		$out = array();
		foreach ( $params as $k => $v ) {
			$out[ $k ] = is_array( $v ) ? self::normalize_params( $v ) : $v;
		}
		ksort( $out );
		return $out;
	}

	/**
	 * 读取缓存（不区分是否过期，由调用方判断）。
	 *
	 * @param string $key 缓存键。
	 * @return mixed|false
	 */
	public static function get( $key ) {
		return get_transient( $key );
	}

	/**
	 * 写入缓存。
	 *
	 * @param string $key  缓存键。
	 * @param mixed  $data 数据。
	 * @param int    $ttl  存活秒数。
	 * @return bool
	 */
	public static function set( $key, $data, $ttl ) {
		$ttl = (int) $ttl;
		if ( $ttl <= 0 ) {
			$ttl = 60;
		}
		return set_transient( $key, $data, $ttl );
	}

	/**
	 * 「带缓存的获取」核心方法。
	 *
	 * @param string   $group    数据来源标识（用于缓存键）。
	 * @param array    $params   影响结果的可变参数。
	 * @param int      $ttl      缓存秒数。
	 * @param callable $fetcher  拉取真实数据的回调，返回 array 或 WP_Error。
	 * @return array {data:array|null, status:hit|fresh|stale, error:WP_Error|null}
	 */
	public static function fetch_with_cache( $group, $params, $ttl, $fetcher ) {
		$key  = self::key( $group, $params );
		$cached = get_transient( $key );

		if ( false !== $cached && is_array( $cached ) && isset( $cached['__ts'] ) ) {
			// 命中新鲜缓存。
			$age = time() - (int) $cached['__ts'];
			if ( $age < (int) $ttl ) {
				return array(
					'data'   => $cached['data'],
					'status' => 'hit',
					'error'  => null,
				);
			}
		}

		// 需要刷新：调用 fetcher。
		$result = call_user_func( $fetcher );

		if ( ! is_wp_error( $result ) && is_array( $result ) ) {
			$payload = array(
				'__ts'  => time(),
				'data'  => $result,
			);
			self::set( $key, $payload, $ttl );
			self::track_key( $key );
			return array(
				'data'   => $result,
				'status' => 'fresh',
				'error'  => null,
			);
		}

		// 拉取失败：尝试回退陈旧缓存（保证可用性）。
		if ( false !== $cached && is_array( $cached ) && isset( $cached['data'] ) ) {
			return array(
				'data'   => $cached['data'],
				'status' => 'stale',
				'error'  => is_wp_error( $result ) ? $result : null,
			);
		}

		// 无任何可用数据。
		return array(
			'data'   => null,
			'status' => 'error',
			'error'  => is_wp_error( $result ) ? $result : new WP_Error( 'saas_agg_unknown', __( '未知错误。', 'saas-aggregator' ) ),
		);
	}

	/**
	 * 记录缓存键，便于卸载/清空时精确删除（兼容对象缓存）。
	 *
	 * @param string $key 缓存键。
	 */
	private static function track_key( $key ) {
		$keys = get_option( 'saas_agg_cache_keys', array() );
		if ( ! in_array( $key, $keys, true ) ) {
			$keys[] = $key;
			update_option( 'saas_agg_cache_keys', $keys );
		}
	}

	/**
	 * 清除某来源或全部缓存。
	 *
	 * 通过跟踪的键精确 delete_transient()，同时兼容数据库存储与对象缓存。
	 *
	 * @param string|null $group 来源标识；null 表示全部。
	 */
	public static function flush( $group = null ) {
		$keys = get_option( 'saas_agg_cache_keys', array() );
		$kept = array();
		foreach ( $keys as $key ) {
			if ( $group && 0 !== strpos( $key, 'saas_agg_' . $group . '_' ) ) {
				$kept[] = $key;
				continue;
			}
			delete_transient( $key );
		}
		update_option( 'saas_agg_cache_keys', $kept );
	}
}
