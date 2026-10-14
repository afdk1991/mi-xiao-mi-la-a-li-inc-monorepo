<?php
/**
 * saas-aggregator 单元测试。
 *
 * 运行（需 PHPUnit）：
 *   vendor/bin/phpunit -c phpunit.xml.dist
 *
 * 逻辑已在 tests/bootstrap.php 中用 WP 桩函数模拟，无需完整 WordPress。
 *
 * @package SAAS_Aggregator
 */

use PHPUnit\Framework\TestCase;

class Test_SAAS_Agg_Aggregator extends SAAS_Agg_TestCase {

	/**
	 * 每次测试前重置内存存储，使用默认设置。
	 */
	public function setUp(): void {
		parent::setUp();
		$GLOBALS['__options']    = array();
		$GLOBALS['__transients'] = array();
		unset( $GLOBALS['__http_responder'] );
	}

	/**
	 * 把设置切到「演示模式」。
	 *
	 * 插件默认会为所有数据源填入 base_url（指向 Go 网关），且 demo_mode 默认关闭，
	 * 因此 is_configured() 恒为 true，provider 会走真实取数路径（桩环境下没有
	 * HTTP responder，拿不到数据）。要验证演示数据，必须显式清空 base_url
	 * 并打开 demo_mode。
	 */
	private function enable_demo_mode() {
		$defaults = saas_agg_get_default_settings();

		$defaults['global']['demo_mode'] = 'yes';
		foreach ( $defaults['providers'] as $id => $meta ) {
			$defaults['providers'][ $id ]['enabled']  = 'yes';
			$defaults['providers'][ $id ]['base_url'] = '';
		}

		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $defaults;
	}

	/**
	 * Demo 模式：默认设置下应聚合全部 6 个已启用来源，各返回 5 条。
	 *
	 * 来源清单（与 SAAS_Agg_Provider_Manager::get_providers() 保持一致）：
	 *   gateway_status / business_core / ai_insights / analytics / compliance / ecommerce
	 */
	public function test_demo_aggregation_returns_all_enabled_sources() {
		$this->enable_demo_mode();

		$out = SAAS_Agg_Provider_Manager::aggregate( 'all', 5 );

		$expected_ids = array( 'gateway_status', 'business_core', 'ai_insights', 'analytics', 'compliance', 'ecommerce' );

		$this->assertCount( count( $expected_ids ), $out );
		$ids = wp_list_pluck( $out, 'source' );
		$this->assertEquals( $expected_ids, $ids );

		foreach ( $out as $source ) {
			$this->assertSame( 'ok', $source['status'] );
			// 各来源内置的演示数据条数不同（如电商只有 3 条），只断言「有数据且不超过 limit」。
			$this->assertTrue( count( $source['items'] ) > 0, $source['source'] . ' 演示数据不应为空' );
			$this->assertTrue( count( $source['items'] ) <= 5, $source['source'] . ' 演示数据不应超过 limit' );
		}
	}

	/**
	 * 配置真实接口：API Client + 缓存 + 归一化应正常产出条目。
	 */
	public function test_configured_source_fetches_and_normalizes() {
		$settings = saas_agg_get_default_settings();
		$settings['providers']['gateway_status']['base_url'] = 'https://api.example.com';
		$settings['providers']['gateway_status']['api_key']  = 'test-key';
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $settings;

		$out = SAAS_Agg_Provider_Manager::aggregate( 'gateway_status', 5 );
		$this->assertCount( 1, $out );
		$source = $out[0];
		$this->assertSame( 'ok', $source['status'] );
		$this->assertCount( 1, $source['items'] );
		$this->assertSame( '实时指标', $source['items'][0]['title'] );
		$this->assertSame( 'ok', $source['items'][0]['status'] );
	}

	/**
	 * 未配置接口且关闭演示模式：应返回 error 状态并带说明。
	 */
	public function test_unconfigured_without_demo_returns_error_status() {
		$settings = saas_agg_get_default_settings();
		$settings['global']['demo_mode']                = '';
		$settings['providers']['gateway_status']['base_url'] = '';
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $settings;

		$out = SAAS_Agg_Provider_Manager::aggregate( 'gateway_status', 5 );
		$this->assertCount( 1, $out );
		$this->assertSame( 'error', $out[0]['status'] );
		$this->assertNotEmpty( $out[0]['message'] );
	}

	/**
	 * 缓存层：刷新失败时回退到上次成功（陈旧）缓存，并返回 status=stale。
	 */
	public function test_cache_stale_fallback() {
		$params  = array( 'a' => 1 );
		$key     = SAAS_Agg_Cache::key( 'gateway_status', $params );
		$payload = array(
			'__ts' => time() - 1000,
			'data' => array( array( 'title' => 'stale', 'value' => 'x', 'status' => 'ok' ) ),
		);
		set_transient( $key, $payload, 9999 );

		// TTL 短于数据年龄，强制进入刷新；fetcher 返回错误 → 应回退陈旧缓存。
		$result = SAAS_Agg_Cache::fetch_with_cache(
			'gateway_status',
			$params,
			10,
			function () {
				return new WP_Error( 'boom', 'down' );
			}
		);

		$this->assertSame( 'stale', $result['status'] );
		$this->assertSame( 'stale', $result['data'][0]['title'] );
	}

	/**
	 * 缓存层：命中新鲜缓存时不应调用 fetcher（status=hit）。
	 */
	public function test_cache_hit_skips_fetcher() {
		$params  = array( 'b' => 2 );
		$key     = SAAS_Agg_Cache::key( 'analytics', $params );
		$payload = array(
			'__ts' => time(),
			'data' => array( array( 'title' => 'cached', 'value' => '1', 'status' => 'ok' ) ),
		);
		set_transient( $key, $payload, 9999 );

		$called = false;
		$result = SAAS_Agg_Cache::fetch_with_cache(
			'analytics',
			$params,
			9999,
			function () use ( &$called ) {
				$called = true;
				return array( array( 'title' => 'fresh', 'value' => '2', 'status' => 'ok' ) );
			}
		);

		$this->assertFalse( $called, '新鲜缓存不应触发 fetcher' );
		$this->assertSame( 'hit', $result['status'] );
		$this->assertSame( 'cached', $result['data'][0]['title'] );
	}
}
