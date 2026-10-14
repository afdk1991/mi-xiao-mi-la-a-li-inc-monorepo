<?php
/**
 * 设置结构（schema）迁移单元测试。
 *
 * 背景：saas_agg_get_settings() 用「已存值优先」合并，这是刻意的——用户改过的
 * 配置不能被插件升级覆盖。代价是当某个默认值的*含义*变化时（例如 ecommerce
 * 的正确服务从 Go 网关改为 Node.js BFF），老站点会一直沿用错误的历史值，
 * 必须靠显式迁移纠正。本文件验证这套迁移只纠默认值、不碰用户手改值。
 *
 * @package SAAS_Aggregator
 */

class Test_SAAS_Agg_Settings_Migration extends SAAS_Agg_TestCase {

	/**
	 * 构造一份「v1 老站点」的设置：schema 缺失（视为 1），ecommerce 指向旧网关。
	 *
	 * @param string $ecommerce_url 电商数据源的 base_url。
	 * @return array 直接写入 $GLOBALS['__options'] 的结构。
	 */
	private function seed_v1( $ecommerce_url ) {
		$settings               = saas_agg_get_default_settings();
		$settings['providers']['ecommerce']['base_url'] = $ecommerce_url;

		return $settings;
	}

	/**
	 * 全新安装：只落定当前 schema，不凭空写一份设置。
	 */
	public function test_fresh_install_stamps_schema_without_creating_settings() {
		$GLOBALS['__options'] = array();

		saas_agg_maybe_upgrade_settings();

		$this->assertSame(
			SAAS_AGG_SETTINGS_SCHEMA,
			get_option( SAAS_AGG_SETTINGS_SCHEMA_OPTION ),
			'全新安装应直接标记为当前 schema'
		);
		$this->assertFalse(
			get_option( SAAS_AGG_OPTION_NAME, false ),
			'迁移不应替用户凭空创建设置'
		);
	}

	/**
	 * v1 → v2：仍等于旧默认值的电商地址应被纠正到 Node.js BFF。
	 */
	public function test_v1_stale_ecommerce_url_is_migrated() {
		$GLOBALS['__options']                     = array();
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $this->seed_v1( 'http://gateway-go:8080' );

		saas_agg_maybe_upgrade_settings();

		$settings = get_option( SAAS_AGG_OPTION_NAME );
		$this->assertSame(
			'http://node-api:3001',
			$settings['providers']['ecommerce']['base_url'],
			'沿用旧默认值的电商源应迁移到 node-api'
		);
		$this->assertSame( SAAS_AGG_SETTINGS_SCHEMA, get_option( SAAS_AGG_SETTINGS_SCHEMA_OPTION ) );
	}

	/**
	 * 用户手改过的电商地址必须原样保留——迁移只纠默认值。
	 */
	public function test_v1_custom_ecommerce_url_is_preserved() {
		$GLOBALS['__options']                     = array();
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $this->seed_v1( 'https://shop.internal.example.com' );

		saas_agg_maybe_upgrade_settings();

		$settings = get_option( SAAS_AGG_OPTION_NAME );
		$this->assertSame(
			'https://shop.internal.example.com',
			$settings['providers']['ecommerce']['base_url'],
			'用户自定义地址不得被迁移覆盖'
		);
	}

	/**
	 * 迁移只跑一次：已处于当前 schema 的站点不再被改动，
	 * 即便用户之后又把地址改回了网关（那是他自己的选择）。
	 */
	public function test_already_current_schema_is_not_touched() {
		$GLOBALS['__options'] = array(
			SAAS_AGG_OPTION_NAME           => $this->seed_v1( 'http://gateway-go:8080' ),
			SAAS_AGG_SETTINGS_SCHEMA_OPTION => SAAS_AGG_SETTINGS_SCHEMA,
		);

		saas_agg_maybe_upgrade_settings();

		$settings = get_option( SAAS_AGG_OPTION_NAME );
		$this->assertSame(
			'http://gateway-go:8080',
			$settings['providers']['ecommerce']['base_url'],
			'已是当前 schema 的站点不应再被迁移改写'
		);
	}

	/**
	 * 其它数据源不受迁移影响，仍指向统一网关。
	 */
	public function test_other_providers_still_default_to_gateway() {
		$GLOBALS['__options']                     = array();
		$GLOBALS['__options'][ SAAS_AGG_OPTION_NAME ] = $this->seed_v1( 'http://gateway-go:8080' );

		saas_agg_maybe_upgrade_settings();

		$settings = get_option( SAAS_AGG_OPTION_NAME );
		$this->assertSame(
			'http://gateway-go:8080',
			$settings['providers']['gateway_status']['base_url']
		);
		$this->assertSame(
			'http://gateway-go:8080',
			$settings['providers']['analytics']['base_url']
		);
	}

	/**
	 * 默认设置里电商源就不该跟随统一网关——这是本次修复的根因。
	 */
	public function test_default_settings_point_ecommerce_at_node_api() {
		$defaults = saas_agg_get_default_settings();

		$this->assertSame(
			'http://node-api:3001',
			$defaults['providers']['ecommerce']['base_url'],
			'电商源默认应指向 node-api（/api/products 不在 Go 网关上）'
		);
		$this->assertSame(
			'http://gateway-go:8080',
			$defaults['providers']['gateway_status']['base_url'],
			'其余数据源默认仍走统一网关'
		);
	}
}
