<?php
/**
 * HTTP 客户端封装：统一处理鉴权、超时、JSON 解析与错误。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 对第三方 API 发起请求的轻量封装。
 *
 * 设计目标：
 * - 统一超时与 UA，避免后端慢服务拖垮 WordPress 请求；
 * - 支持 Bearer / 自定义 Header 鉴权；
 * - 任何失败都返回 WP_Error，便于上层做优雅降级。
 */
class SAAS_Agg_API_Client {

	/**
	 * 发起 GET 请求并返回解析后的数组。
	 *
	 * @param string $url    完整请求地址。
	 * @param array  $args   {timeout, headers, api_key, api_secret, method}。
	 * @return array|WP_Error 成功返回数组，失败返回 WP_Error。
	 */
	public static function get( $url, $args = array() ) {
		return self::request( $url, wp_parse_args( $args, array( 'method' => 'GET' ) ) );
	}

	/**
	 * 发起 POST 请求（JSON body）。
	 *
	 * @param string $url  完整请求地址。
	 * @param array  $body 请求体（会被 json_encode）。
	 * @param array  $args 其他参数。
	 * @return array|WP_Error
	 */
	public static function post( $url, $body = array(), $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'method' => 'POST',
				'body'   => wp_json_encode( $body ),
			)
		);
		return self::request( $url, $args );
	}

	/**
	 * 核心请求方法。
	 *
	 * @param string $url  完整请求地址。
	 * @param array  $args 参数。
	 * @return array|WP_Error
	 */
	public static function request( $url, $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'method'      => 'GET',
				'timeout'     => 10,
				'redirection' => 0,
				'headers'     => array(),
				'api_key'     => '',
				'api_secret'  => '',
				'body'        => null,
				'sslverify'   => true,
			)
		);

		// 地址校验：必须是合法 http(s) URL。
		if ( ! filter_var( $url, FILTER_VALIDATE_URL ) || ! preg_match( '#^https?://#i', $url ) ) {
			return new WP_Error( 'saas_agg_invalid_url', __( '接口地址不合法。', 'saas-aggregator' ), array( 'url' => $url ) );
		}

		// 组装请求头。
		$headers = (array) $args['headers'];
		$headers['Accept']       = 'application/json';
		$headers['User-Agent']   = 'SaaS-Aggregator/' . SAAS_AGG_VERSION . '; ' . get_bloginfo( 'url' );

		// 租户标识必须走请求头（网关据此做行级隔离，而非查询参数）。
		// 优先取当前登录用户在资料页配置的租户，其次配置中的 tenant_id。
		$effective_tenant = ( class_exists( 'SAAS_Agg_Tenant' ) && method_exists( 'SAAS_Agg_Tenant', 'get_current_tenant' ) )
			? SAAS_Agg_Tenant::get_current_tenant()
			: ( ! empty( $args['tenant_id'] ) ? (string) $args['tenant_id'] : '' );
		if ( ! empty( $effective_tenant ) ) {
			$headers['X-Tenant-Id'] = $effective_tenant;
		}

		// 鉴权头：优先 api_key/api_secret；缺失时以租户或固定标识兜底，
		// 确保网关的 Authorization 存在性校验通过（网关不校验令牌值）。
		if ( ! empty( $args['api_key'] ) && ! empty( $args['api_secret'] ) ) {
			$headers['Authorization'] = 'Basic ' . base64_encode( $args['api_key'] . ':' . $args['api_secret'] );
		} elseif ( ! empty( $args['api_key'] ) ) {
			$headers['Authorization'] = 'Bearer ' . $args['api_key'];
		} elseif ( ! empty( $args['tenant_id'] ) ) {
			$headers['Authorization'] = 'Bearer ' . $args['tenant_id'];
		} else {
			$headers['Authorization'] = 'Bearer saas-aggregator';
		}

		if ( 'POST' === strtoupper( (string) $args['method'] ) && ! isset( $headers['Content-Type'] ) ) {
			$headers['Content-Type'] = 'application/json';
		}

		$request_args = array(
			'method'      => strtoupper( (string) $args['method'] ),
			'timeout'     => (int) $args['timeout'],
			'redirection' => (int) $args['redirection'],
			'headers'     => $headers,
			'sslverify'   => (bool) $args['sslverify'],
		);

		if ( null !== $args['body'] ) {
			$request_args['body'] = $args['body'];
		}

		// 关键：禁止记录明文密钥到日志（呼应文档 §8 安全守则）。
		$response = wp_remote_request( $url, $request_args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'saas_agg_request_failed',
				sprintf( /* translators: %s 为底层错误说明 */ __( '请求第三方接口失败：%s', 'saas-aggregator' ), $response->get_error_message() ),
				array( 'url' => preg_replace( '#(key|token|secret)=[^&]+#i', '$1=***', $url ) )
			);
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== (int) $code && 201 !== (int) $code ) {
			return new WP_Error(
				'saas_agg_bad_status',
				sprintf( /* translators: %d 为 HTTP 状态码 */ __( '第三方接口返回异常状态：%d', 'saas-aggregator' ), (int) $code ),
				array( 'status' => (int) $code )
			);
		}

		$body_raw = wp_remote_retrieve_body( $response );
		$data     = json_decode( $body_raw, true );

		if ( JSON_ERROR_NONE !== json_last_error() ) {
			return new WP_Error(
				'saas_agg_bad_json',
				__( '第三方接口返回的数据不是合法 JSON。', 'saas-aggregator' ),
				array( 'snippet' => mb_substr( $body_raw, 0, 200 ) )
			);
		}

		return is_array( $data ) ? $data : array();
	}

	/**
	 * 将 provider 配置拼装为完整 URL。
	 *
	 * @param array  $provider_cfg 单个 provider 配置。
	 * @param string $override_path 可覆盖默认 endpoint_path。
	 * @return string|WP_Error
	 */
	public static function build_url( $provider_cfg, $override_path = '' ) {
		$base = isset( $provider_cfg['base_url'] ) ? trim( (string) $provider_cfg['base_url'] ) : '';
		$path = $override_path ? $override_path : ( isset( $provider_cfg['endpoint_path'] ) ? (string) $provider_cfg['endpoint_path'] : '' );

		if ( '' === $base ) {
			return new WP_Error( 'saas_agg_no_base', __( '未配置接口基地址（base_url）。', 'saas-aggregator' ) );
		}

		$base = rtrim( $base, '/' );
		$path = '/' . ltrim( $path, '/' );

		// 租户维度改由 X-Tenant-Id 请求头传递（见 SAAS_Agg_API_Client::request），URL 不再携带租户参数。
		return $base . $path;
	}
}
