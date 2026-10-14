<?php
/**
 * 缓存封装单元测试：键生成、fresh/hit/stale/error 四种状态。
 *
 * @package SAAS_Aggregator
 */

class Test_SAAS_Agg_Cache extends SAAS_Agg_TestCase {

	/**
	 * 缓存键应仅依赖参数内容（与顺序无关）且带前缀。
	 */
	public function test_key_is_deterministic() {
		$k1 = SAAS_Agg_Cache::key( 'g', array( 'a' => 1, 'b' => 2 ) );
		$k2 = SAAS_Agg_Cache::key( 'g', array( 'b' => 2, 'a' => 1 ) );
		$this->assertSame( $k1, $k2, '参数顺序不应影响缓存键' );
		$this->assertStringStartsWith( 'saas_agg_g_', $k1 );
	}

	/**
	 * 无缓存时首次拉取应写入缓存并返回 status=fresh。
	 */
	public function test_fresh_fetch_stores_and_returns_fresh() {
		$called = false;
		$res    = SAAS_Agg_Cache::fetch_with_cache(
			'group',
			array( 'x' => 1 ),
			60,
			function () use ( &$called ) {
				$called = true;
				return array( array( 'title' => 'new' ) );
			}
		);
		$this->assertTrue( $called );
		$this->assertSame( 'fresh', $res['status'] );
		$this->assertSame( 'new', $res['data'][0]['title'] );
		$this->assertNotNull( SAAS_Agg_Cache::get( SAAS_Agg_Cache::key( 'group', array( 'x' => 1 ) ) ) );
	}

	/**
	 * 命中新鲜缓存时不应再调用 fetcher。
	 */
	public function test_hit_skips_fetcher() {
		$key = SAAS_Agg_Cache::key( 'h', array( 'y' => 2 ) );
		set_transient( $key, array( '__ts' => time(), 'data' => array( array( 'title' => 'cached' ) ) ), 9999 );

		$called = false;
		$res    = SAAS_Agg_Cache::fetch_with_cache(
			'h',
			array( 'y' => 2 ),
			9999,
			function () use ( &$called ) {
				$called = true;
				return array( array( 'title' => 'fresh' ) );
			}
		);
		$this->assertFalse( $called, '新鲜缓存不应触发 fetcher' );
		$this->assertSame( 'hit', $res['status'] );
		$this->assertSame( 'cached', $res['data'][0]['title'] );
	}

	/**
	 * 拉取失败且存在陈旧缓存时应回退并返回 status=stale。
	 */
	public function test_stale_fallback_on_error() {
		$key = SAAS_Agg_Cache::key( 's', array( 'z' => 3 ) );
		set_transient( $key, array( '__ts' => time() - 1000, 'data' => array( array( 'title' => 'stale' ) ) ), 9999 );

		$res = SAAS_Agg_Cache::fetch_with_cache(
			's',
			array( 'z' => 3 ),
			10,
			function () {
				return new WP_Error( 'down', 'boom' );
			}
		);
		$this->assertSame( 'stale', $res['status'] );
		$this->assertSame( 'stale', $res['data'][0]['title'] );
		$this->assertInstanceOf( WP_Error::class, $res['error'] );
	}

	/**
	 * 无任何缓存且 fetcher 失败时返回 status=error。
	 */
	public function test_error_when_no_cache_and_fetcher_fails() {
		$res = SAAS_Agg_Cache::fetch_with_cache(
			'e',
			array( 'q' => 9 ),
			60,
			function () {
				return new WP_Error( 'bad', 'nope' );
			}
		);
		$this->assertSame( 'error', $res['status'] );
		$this->assertNull( $res['data'] );
		$this->assertInstanceOf( WP_Error::class, $res['error'] );
	}

	/**
	 * flush() 直接操作数据库（$wpdb），属于集成层；桩环境无 $wpdb，标记为跳过。
	 * 真实 WordPress 环境中此用例会真正执行清空并断言缓存已失效。
	 */
	public function test_flush_requires_database_and_is_skipped_in_stub_env() {
		if ( ! isset( $GLOBALS['wpdb'] ) && ! class_exists( 'wpdb' ) ) {
			$this->markTestSkipped( 'flush() 依赖数据库 $wpdb，桩环境跳过（属集成测试）' );
		}
		SAAS_Agg_Cache::set( 'flushable', array( 'data' => array( 'title' => 'x' ) ), 9999 );
		SAAS_Agg_Cache::flush();
		$this->assertNull( SAAS_Agg_Cache::get( 'flushable' ) );
	}
}
