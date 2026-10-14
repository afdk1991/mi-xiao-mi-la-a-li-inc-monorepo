<?php
/**
 * 集成测试：真实接口路径（经桩 HTTP 响应器模拟）、单源错误隔离、过滤器扩展。
 *
 * @package SAAS_Aggregator
 */

class Test_SAAS_Agg_Integration extends SAAS_Agg_TestCase {

	/**
	 * 已配置来源：API Client → 缓存 → 归一化 全链路应产出条目。
	 */
	public function test_configured_source_returns_real_items() {
		$settings                                    = saas_agg_get_default_settings();
		$settings['providers']['gateway_status']['base_url'] = 'https://api.example.com';
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ]  = $settings;

		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			return array(
				'body'     => json_encode(
					array( 'items' => array( array( 'title' => '实时指标', 'value' => '123', 'status' => 'ok' ) ) )
				),
				'response' => array( 'code' => 200 ),
				'headers'  => array(),
			);
		};

		$out = SAAS_Agg_Provider_Manager::aggregate( 'gateway_status', 5 );
		$this->assertCount( 1, $out );
		$this->assertSame( 'ok', $out[0]['status'] );
		$this->assertSame( '实时指标', $out[0]['items'][0]['title'] );
	}

	/**
	 * 单源失败不应影响其他源（错误隔离）。
	 */
	public function test_per_source_error_isolation() {
		$settings = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = '';

		foreach ( array_keys( $settings['providers'] ) as $id ) {
			$settings['providers'][ $id ]['enabled'] = '';
		}
		$settings['providers']['gateway_status']['enabled'] = 'yes';
		$settings['providers']['analytics']['enabled']      = 'yes';
		$settings['providers']['gateway_status']['base_url'] = 'https://api.example.com';
		$settings['providers']['analytics']['base_url']      = 'https://api.example.com';
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $settings;

		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			if ( strpos( $url, 'gateway' ) !== false ) {
				return array( 'body' => 'bad', 'response' => array( 'code' => 500 ), 'headers' => array() );
			}
			return array(
				'body'     => json_encode( array( 'items' => array( array( 'title' => 'OK' ) ) ) ),
				'response' => array( 'code' => 200 ),
				'headers'  => array(),
			);
		};

		$out = SAAS_Agg_Provider_Manager::aggregate( 'all', 5 );
		$by  = array_column( $out, 'status', 'source' );
		$this->assertArrayHasKey( 'gateway_status', $by );
		$this->assertArrayHasKey( 'analytics', $by );
		$this->assertSame( 'error', $by['gateway_status'] );
		$this->assertSame( 'ok', $by['analytics'] );
	}

	/**
	 * 通过 saas_agg_providers 过滤器注册自定义源（证明端到端可扩展，无需改核心）。
	 */
	public function test_extension_provider_registered_via_filter() {
		require_once dirname( __DIR__ ) . '/examples/integration-example.php';

		add_filter(
			'saas_agg_providers',
			function ( $list ) {
				$list[] = new SAAS_Agg_Providers_GitHub_Status();
				return $list;
			}
		);

		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			return array(
				'body'     => json_encode(
					array( 'resources' => array( 'core' => array( 'limit' => 60, 'remaining' => 58 ) ) )
				),
				'response' => array( 'code' => 200 ),
				'headers'  => array(),
			);
		};

		$out = SAAS_Agg_Provider_Manager::aggregate( 'github_status', 5 );
		$this->assertCount( 1, $out );
		$this->assertSame( 'github_status', $out[0]['source'] );
		$this->assertSame( 'GitHub 配额 · core', $out[0]['items'][0]['title'] );
	}
}
