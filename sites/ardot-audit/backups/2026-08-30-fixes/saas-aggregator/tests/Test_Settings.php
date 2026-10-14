<?php
/**
 * 设置页 sanitize 单元测试：默认值回退、数值钳制、勾选标志、字段清洗。
 *
 * @package SAAS_Aggregator
 */

class Test_SAAS_Agg_Settings extends SAAS_Agg_TestCase {

	/**
	 * 非数组输入应回退到默认结构，而非崩溃。
	 */
	public function test_non_array_input_returns_defaults() {
		$s   = new SAAS_Agg_Settings();
		$out = $s->sanitize( 'garbage' );
		$this->assertIsArray( $out );
		$this->assertArrayHasKey( 'global', $out );
		$this->assertArrayHasKey( 'providers', $out );
	}

	/**
	 * 全局缓存时长应被钳制到下限 30。
	 */
	public function test_global_cache_ttl_clamped_to_minimum() {
		$s    = new SAAS_Agg_Settings();
		$low  = $s->sanitize( array( 'global' => array( 'cache_ttl' => 1 ) ) );
		$this->assertSame( 30, $low['global']['cache_ttl'] );

		$high = $s->sanitize( array( 'global' => array( 'cache_ttl' => 500 ) ) );
		$this->assertSame( 500, $high['global']['cache_ttl'] );
	}

	/**
	 * 演示模式勾选标志应正确映射为 yes / 空串。
	 */
	public function test_demo_mode_flag_mapping() {
		$s    = new SAAS_Agg_Settings();
		$on   = $s->sanitize( array( 'global' => array( 'demo_mode' => 'yes' ) ) );
		$this->assertSame( 'yes', $on['global']['demo_mode'] );

		$off  = $s->sanitize( array( 'global' => array() ) );
		$this->assertSame( '', $off['global']['demo_mode'] );
	}

	/**
	 * 密钥类字段应经过文本清洗（去除标签）。
	 */
	public function test_provider_api_key_is_sanitized() {
		$s   = new SAAS_Agg_Settings();
		$out = $s->sanitize(
			array(
				'providers' => array(
					'gateway_status' => array(
						'enabled' => 'yes',
						'api_key' => '<script>alert(1)</script>',
					),
				),
			)
		);
		$this->assertSame( 'yes', $out['providers']['gateway_status']['enabled'] );
		$this->assertStringNotContainsString( '<script>', $out['providers']['gateway_status']['api_key'] );
	}

	/**
	 * base_url 字段应被保存并做基础清理（此处验证去空白与字段连通）。
	 */
	public function test_base_url_is_stored_and_trimmed() {
		$s   = new SAAS_Agg_Settings();
		$out = $s->sanitize(
			array(
				'providers' => array(
					'gateway_status' => array( 'base_url' => ' https://api.example.com/ ' ),
				),
			)
		);
		$this->assertSame( 'https://api.example.com/', $out['providers']['gateway_status']['base_url'] );
	}
}
