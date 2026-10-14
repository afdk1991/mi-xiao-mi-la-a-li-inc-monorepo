<?php
/**
 * 数据源 Provider 接口与抽象基类。
 *
 * 任何第三方数据源都实现 SAAS_Agg_Provider_Interface，
 * 通过 SAAS_Agg_Provider_Manager 统一调度，保证可扩展性。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 所有数据源必须实现的接口。
 */
interface SAAS_Agg_Provider_Interface {

	/**
	 * 数据源唯一标识（用于缓存键、短代码参数）。
	 *
	 * @return string
	 */
	public function get_id();

	/**
	 * 展示名称。
	 *
	 * @return string
	 */
	public function get_label();

	/**
	 * 简介（对应架构文档中的来源说明）。
	 *
	 * @return string
	 */
	public function get_description();

	/**
	 * 判断该来源是否已正确配置（至少要有 base_url）。
	 *
	 * @param array $cfg 该来源的运行时配置。
	 * @return bool
	 */
	public function is_configured( $cfg );

	/**
	 * 拉取并归一化为标准条目数组。
	 *
	 * @param array $cfg   该来源的运行时配置。
	 * @param int   $limit 最多返回条数。
	 * @return array|WP_Error 标准条目数组或错误。
	 */
	public function fetch_items( $cfg, $limit = 5 );
}

/**
 * 抽象基类：提供归一化、错误处理与缓存的通用实现。
 *
 * 子类只需关注：从哪里取数（do_fetch）、如何把响应归一化（normalize）。
 */
abstract class SAAS_Agg_Provider implements SAAS_Agg_Provider_Interface {

	/**
	 * 默认缓存秒数（可被配置覆盖）。
	 *
	 * @var int
	 */
	protected $default_ttl = 300;

	/**
	 * 来源所属架构层（用于展示分组/徽标）。
	 *
	 * @var string
	 */
	protected $layer = 'unknown';

	/**
	 * 最近一次 fetch_items 的缓存命中状态。
	 * 用于 aggregate() 回填 cached 字段（修复此前死代码问题）。
	 *
	 * @var string hit|fresh|stale|error
	 */
	protected $last_cache_status = 'fresh';

	/**
	 * 归一化单条数据为统一结构。
	 *
	 * @param array $raw 单条原始数据。
	 * @return array {title,value,url,status,updated,meta}
	 */
	protected function normalize_item( $raw ) {
		$raw = is_array( $raw ) ? $raw : array();

		$status = isset( $raw['status'] ) ? (string) $raw['status'] : 'info';

		return array(
			'title'   => isset( $raw['title'] ) ? (string) $raw['title'] : '',
			'value'   => isset( $raw['value'] ) ? (string) $raw['value'] : '',
			'url'     => isset( $raw['url'] ) ? esc_url_raw( (string) $raw['url'] ) : '',
			'status'  => in_array( $status, array( 'ok', 'warn', 'error', 'info' ), true ) ? $status : 'info',
			'updated' => isset( $raw['updated'] ) ? (string) $raw['updated'] : '',
			'meta'    => isset( $raw['meta'] ) && is_array( $raw['meta'] ) ? $raw['meta'] : array(),
		);
	}

	/**
	 * 将响应体（已解码数组）转换为标准条目数组。
	 * 子类可覆盖以适配不同的字段结构。
	 *
	 * 兼容三种常见的响应包装：
	 *   1. {"items":[...]}                      —— 本栈 Python 层 / Go 网关的约定
	 *   2. {"data":[...]}                       —— data 直接就是列表
	 *   3. {"code":200,"data":{"products":[...]}} —— data 再套一层具名集合（Node 层约定）
	 *
	 * 第 3 种是实际踩到的坑：若只把 data 当列表遍历，遍历到的是
	 * {"products":[...]} 这一整块，逐条归一化后 title/value 全为空。
	 *
	 * @param array $body 解码后的响应。
	 * @return array
	 */
	protected function normalize_response( $body ) {
		$body = is_array( $body ) ? $body : array();

		if ( isset( $body['items'] ) && is_array( $body['items'] ) ) {
			$items = $body['items'];
		} elseif ( isset( $body['data'] ) && is_array( $body['data'] ) ) {
			$items = $this->unwrap_data_envelope( $body['data'] );
		} else {
			$items = $body;
		}

		$out = array();
		foreach ( $items as $row ) {
			if ( is_array( $row ) ) {
				$out[] = $this->normalize_item( $row );
			}
		}
		return $out;
	}

	/**
	 * 拆开 data 外层信封。
	 *
	 * 处理 {"data":{"products":[...]}} 这类「具名集合」包装：
	 * 当 data 只有一个键且该键是列表时，直接返回这个列表。
	 * 若 data 本身就是列表（数字键）或包含多个键，则原样返回，
	 * 由调用方按原逻辑处理。
	 *
	 * @param array $data 响应中的 data 字段。
	 * @return array
	 */
	protected function unwrap_data_envelope( $data ) {
		if ( ! is_array( $data ) || array() === $data ) {
			return $data;
		}

		$keys = array_keys( $data );

		// 数字键 = 已经是列表，无需拆包。
		if ( is_int( $keys[0] ) ) {
			return $data;
		}

		// 只有一个具名键且值为列表 → 拆掉这层信封。
		if ( 1 === count( $keys ) && isset( $data[ $keys[0] ] ) && is_array( $data[ $keys[0] ] ) ) {
			return $data[ $keys[0] ];
		}

		return $data;
	}

	/**
	 * 实际取数（子类实现）。返回归一化前的原始数组或 WP_Error。
	 *
	 * @param array $cfg   配置。
	 * @param int   $limit 条数。
	 * @return array|WP_Error
	 */
	abstract protected function do_fetch( $cfg, $limit );

	/**
	 * 演示/兜底数据（当未配置真实接口且开启 demo_mode 时返回）。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	abstract protected function demo_items( $limit );

	/**
	 * {@inheritDoc}
	 */
	public function is_configured( $cfg ) {
		return ! empty( $cfg['base_url'] );
	}

	/**
	 * {@inheritDoc}
	 */
	public function fetch_items( $cfg, $limit = 5 ) {
		$limit = (int) $limit;
		if ( $limit <= 0 ) {
			$limit = 5;
		}

		// 未配置：尝试演示数据。
		if ( ! $this->is_configured( $cfg ) ) {
			$settings = saas_agg_get_settings();
			if ( 'yes' === $settings['global']['demo_mode'] ) {
				return array_slice( $this->demo_items( $limit ), 0, $limit );
			}
			return new WP_Error( 'saas_agg_not_configured', __( '该数据源未配置接口地址，且未开启演示模式。', 'saas-aggregator' ) );
		}

		// 优先级：provider 级 cache_ttl → 全局 cache_ttl → 基类兜底（修复此前全局值未生效问题）。
		$ttl = isset( $cfg['cache_ttl'] ) && (int) $cfg['cache_ttl'] > 0
			? (int) $cfg['cache_ttl']
			: max( 60, (int) saas_agg_get_settings()['global']['cache_ttl'] );

		// 缓存键仅取非敏感维度，避免把密钥写入缓存元数据。
		$cache_params = array(
			'url'    => isset( $cfg['base_url'] ) ? $cfg['base_url'] : '',
			'path'   => isset( $cfg['endpoint_path'] ) ? $cfg['endpoint_path'] : '',
			'tenant' => isset( $cfg['tenant_id'] ) ? $cfg['tenant_id'] : '',
			'limit'  => $limit,
		);

		$result = SAAS_Agg_Cache::fetch_with_cache(
			$this->get_id(),
			$cache_params,
			$ttl,
			function () use ( $cfg, $limit ) {
				// 各来源自定义取数（可在子类 do_fetch 中决定 GET/POST、鉴权与 URL）。
				$raw = $this->do_fetch( $cfg, $limit );
				if ( is_wp_error( $raw ) ) {
					return $raw;
				}
				return $this->normalize_response( $raw );
			}
		);

		if ( 'error' === $result['status'] && $result['error'] instanceof WP_Error ) {
			return $result['error'];
		}

		// 记录缓存状态（供 aggregate() 回填 cached 字段）。
		$this->last_cache_status = $result['status'];

		// 记录陈旧缓存回退的提示（不阻断展示）。
		if ( 'stale' === $result['status'] && $result['error'] instanceof WP_Error ) {
			$this->maybe_log( $result['error']->get_error_message() );
		}

		return is_array( $result['data'] ) ? array_slice( $result['data'], 0, $limit ) : array();
	}

	/**
	 * 获取最近一次 fetch_items 的缓存命中状态。
	 *
	 * @return string hit|fresh|stale|error
	 */
	public function get_cache_status() {
		return $this->last_cache_status;
	}

	/**
	 * 来源架构层标识（用于前端徽标）。
	 *
	 * @return string
	 */
	public function get_layer() {
		return $this->layer;
	}

	/**
	 * 受控的错误日志（呼应文档 §8：敏感数据不落明文日志）。
	 *
	 * @param string $message 日志信息。
	 */
	protected function maybe_log( $message ) {
		$settings = saas_agg_get_settings();
		if ( 'yes' === $settings['global']['log_errors'] ) {
			// 仅记录脱敏后的信息，不含密钥。
			error_log( '[SaaS-Aggregator][' . $this->get_id() . '] ' . preg_replace( '#(key|token|secret)=[^&\s]+#i', '$1=***', (string) $message ) );
		}
	}
}
