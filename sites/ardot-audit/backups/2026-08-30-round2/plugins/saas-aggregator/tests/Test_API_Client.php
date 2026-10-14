<?php
/**
 * API 客户端单元测试：URL 校验、状态码、JSON、鉴权头。
 *
 * @package SAAS_Aggregator
 */

class Test_SAAS_Agg_API_Client extends SAAS_Agg_TestCase {

	/**
	 * 非法 URL 应直接返回 WP_Error，且不发起请求。
	 */
	public function test_invalid_url_returns_wp_error() {
		$res = SAAS_Agg_API_Client::get( 'not-a-valid-url', array() );
		$this->assertInstanceOf( WP_Error::class, $res );
	}

	/**
	 * 非 2xx 响应应返回 WP_Error。
	 */
	public function test_non_200_status_returns_wp_error() {
		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			return array(
				'body'     => '{}',
				'response' => array( 'code' => 500 ),
				'headers'  => array(),
			);
		};
		$res = SAAS_Agg_API_Client::get( 'https://api.example.com/x', array() );
		$this->assertInstanceOf( WP_Error::class, $res );
	}

	/**
	 * 非法 JSON 应返回 WP_Error。
	 */
	public function test_bad_json_returns_wp_error() {
		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			return array(
				'body'     => 'this is not json',
				'response' => array( 'code' => 200 ),
				'headers'  => array(),
			);
		};
		$res = SAAS_Agg_API_Client::get( 'https://api.example.com/x', array() );
		$this->assertInstanceOf( WP_Error::class, $res );
	}

	/**
	 * 合法 200 + JSON 应解码为数组。
	 */
	public function test_valid_response_is_decoded() {
		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			return array(
				'body'     => json_encode( array( 'ok' => true, 'n' => 42 ) ),
				'response' => array( 'code' => 200 ),
				'headers'  => array(),
			);
		};
		$res = SAAS_Agg_API_Client::get( 'https://api.example.com/x', array() );
		$this->assertIsArray( $res );
		$this->assertTrue( $res['ok'] );
		$this->assertSame( 42, $res['n'] );
	}

	/**
	 * 仅 api_key 时应使用 Bearer 鉴权头。
	 */
	public function test_bearer_auth_header_added() {
		$captured = null;
		$GLOBALS['__http_responder'] = function ( $url, $args ) use ( &$captured ) {
			$captured = $args;
			return array( 'body' => '{}', 'response' => array( 'code' => 200 ), 'headers' => array() );
		};
		SAAS_Agg_API_Client::get( 'https://api.example.com/x', array( 'api_key' => 'secret-token' ) );
		$this->assertArrayHasKey( 'Authorization', $captured['headers'] );
		$this->assertSame( 'Bearer secret-token', $captured['headers']['Authorization'] );
	}

	/**
	 * 同时提供 api_key + api_secret 时应使用 Basic 鉴权头。
	 */
	public function test_basic_auth_when_secret_present() {
		$captured = null;
		$GLOBALS['__http_responder'] = function ( $url, $args ) use ( &$captured ) {
			$captured = $args;
			return array( 'body' => '{}', 'response' => array( 'code' => 200 ), 'headers' => array() );
		};
		SAAS_Agg_API_Client::get(
			'https://api.example.com/x',
			array( 'api_key' => 'user', 'api_secret' => 'pass' )
		);
		$this->assertSame( 'Basic ' . base64_encode( 'user:pass' ), $captured['headers']['Authorization'] );
	}
}
