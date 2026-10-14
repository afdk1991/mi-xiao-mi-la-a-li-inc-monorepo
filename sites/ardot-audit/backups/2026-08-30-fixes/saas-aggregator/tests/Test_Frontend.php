<?php
/**
 * 前台展示层测试：短代码 / 区块 / 聚合视图渲染。
 *
 * 覆盖短代码解析、区块默认参数、模板转义、空状态与架构层徽标映射。
 * 通过 tests/bootstrap.php 的 WP 桩运行（真实 WordPress 环境下同样适用）。
 *
 * @package SAAS_Aggregator
 */

/**
 * 前台展示层测试。直接继承 SAAS_Agg_TestCase（桩环境与真实 PHPUnit 下均存在）。
 */
class Test_SAAS_Agg_Frontend extends SAAS_Agg_TestCase {

	public function setUp(): void {
		parent::setUp();
		$GLOBALS['__enqueued_styles'] = array();
		if ( function_exists( 'saas_agg_get_default_settings' ) ) {
			update_option( SAAS_AGG_OPTION_NAME, saas_agg_get_default_settings() );
		}
	}

	/**
	 * 启用演示模式时，render() 应产出聚合视图 HTML。
	 */
	public function test_render_demo_produces_view_html() {
		$settings                        = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = 'yes';
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		$frontend = new SAAS_Agg_Frontend();
		$html     = $frontend->render( 'all', 5 );

		$this->assertIsString( $html );
		$this->assertStringContainsString( 'saas-agg-view', $html );
		$this->assertStringContainsString( 'saas-agg-source', $html );
	}

	/**
	 * 短代码应解析默认参数并产出与 render() 一致的视图。
	 */
	public function test_shortcode_returns_html() {
		$settings                        = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = 'yes';
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		$frontend = new SAAS_Agg_Frontend();
		$html     = $frontend->shortcode( array( 'source' => 'all', 'limit' => 3 ) );

		$this->assertStringContainsString( 'saas-agg-view', $html );
		$this->assertStringContainsString( 'saas-agg-source', $html );
	}

	/**
	 * 区块渲染（服务端）应对空属性套用默认值，且仍产出视图。
	 */
	public function test_render_block_applies_defaults() {
		$settings                        = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = 'yes';
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		$frontend = new SAAS_Agg_Frontend();
		$html     = $frontend->render_block( array() );

		$this->assertStringContainsString( 'saas-agg-view', $html );
	}

	/**
	 * 渲染必须经过转义：恶意标题不应以原始 HTML 出现在输出中。
	 */
	public function test_render_escapes_malicious_value() {
		$settings                                  = saas_agg_get_default_settings();
		$settings['global']['demo_mode']           = 'no';
		$settings['providers']['gateway_status']['enabled']       = true;
		$settings['providers']['gateway_status']['base_url']      = 'https://api.example.test';
		$settings['providers']['gateway_status']['endpoint_path'] = '/status';
		$settings['providers']['gateway_status']['cache_ttl']     = 60;
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		$GLOBALS['__http_responder'] = function ( $url, $args ) {
			$body = wp_json_encode(
				array(
					'items' => array(
						array(
							'title'  => '<script>alert(1)</script>',
							'value'  => 'x',
							'status' => 'ok',
						),
					),
				)
			);
			return array(
				'body'     => $body,
				'response' => array( 'code' => 200 ),
				'headers'  => array(),
			);
		};

		$html = ( new SAAS_Agg_Frontend() )->render( 'gateway_status', 5 );

		$this->assertStringNotContainsString( '<script>alert(1)</script>', $html );
		$this->assertStringContainsString( '&lt;script&gt;', $html );
	}

	/**
	 * 当无任何启用来源且未开启演示时，应显示空状态提示。
	 */
	public function test_empty_state_when_no_enabled_source() {
		$settings                        = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = 'no';
		foreach ( $settings['providers'] as $id => $cfg ) {
			$settings['providers'][ $id ]['enabled'] = false;
		}
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		$html = ( new SAAS_Agg_Frontend() )->render( 'all', 5 );

		$this->assertStringContainsString( 'saas-agg-empty', $html );
		$this->assertStringContainsString( '暂无启用', $html );
	}

	/**
	 * 架构层徽标映射应返回预期的标签与 CSS 类。
	 */
	public function test_layer_badge_mapping() {
		$go = saas_agg_layer_badge( 'go' );
		$this->assertSame( 'layer-go', $go['class'] );
		$this->assertStringContainsString( 'Go', $go['label'] );

		$unknown = saas_agg_layer_badge( 'does-not-exist' );
		$this->assertSame( 'layer-unknown', $unknown['class'] );
	}

	/**
	 * render() 渲染时应登记前端样式表。
	 */
	public function test_render_enqueues_frontend_style() {
		$settings                        = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = 'yes';
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		( new SAAS_Agg_Frontend() )->render( 'all', 5 );

		$handles = wp_list_pluck( $GLOBALS['__enqueued_styles'], 'handle' );
		$this->assertContains( 'saas-agg-frontend', $handles );
	}
}
