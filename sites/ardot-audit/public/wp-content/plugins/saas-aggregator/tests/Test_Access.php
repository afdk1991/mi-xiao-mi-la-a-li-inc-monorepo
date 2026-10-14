<?php
/**
 * 访问控制测试：SAAS_Agg_Access 的判定口径。
 *
 * 覆盖匿名拒绝、登录放行、公开开关、演示模式豁免边界与能力校验，
 * 确保「REST 与前台共用一套判定」不会因后续改动而失衡。
 *
 * @package SAAS_Aggregator
 */

/**
 * 访问控制测试。
 */
class Test_SAAS_Agg_Access extends SAAS_Agg_TestCase {

	/**
	 * 每个用例都从「未登录 + 非演示」这一最严格基线出发。
	 */
	public function setUp(): void {
		parent::setUp();
		$GLOBALS['__current_user_id'] = 0;
		$GLOBALS['__caps']            = array();
		$GLOBALS['__filters']         = array();

		if ( function_exists( 'saas_agg_get_default_settings' ) ) {
			$settings                        = saas_agg_get_default_settings();
			$settings['global']['demo_mode'] = 'no';
			update_option( SAAS_AGG_OPTION_NAME, $settings );
		}
	}

	/**
	 * 匿名访问一律拒绝，并返回 401。
	 */
	public function test_anonymous_is_denied() {
		$result = SAAS_Agg_Access::check( 'rest' );

		$this->assertTrue( is_wp_error( $result ) );
		$data = $result->get_error_data();
		$this->assertSame( 401, $data['status'] );
	}

	/**
	 * 登录后放行（未指定能力要求时）。
	 */
	public function test_logged_in_is_allowed() {
		wp_set_current_user( 1 );

		$this->assertTrue( SAAS_Agg_Access::check( 'rest' ) );
		$this->assertTrue( SAAS_Agg_Access::check( 'frontend' ) );
	}

	/**
	 * 显式公开开关优先于登录要求。
	 */
	public function test_public_filter_overrides_login_requirement() {
		add_filter(
			'saas_agg_public_read',
			function () {
				return true;
			}
		);

		$this->assertTrue( SAAS_Agg_Access::check( 'rest' ) );
		$this->assertTrue( SAAS_Agg_Access::check( 'frontend' ) );

		unset( $GLOBALS['__filters']['saas_agg_public_read'] );
	}

	/**
	 * 演示模式只豁免前台：短代码可匿名展示假数据，REST 依旧要求登录。
	 */
	public function test_demo_mode_exempts_frontend_only() {
		$settings                        = saas_agg_get_default_settings();
		$settings['global']['demo_mode'] = 'yes';
		update_option( SAAS_AGG_OPTION_NAME, $settings );

		$this->assertTrue( SAAS_Agg_Access::check( 'frontend' ) );
		$this->assertTrue( is_wp_error( SAAS_Agg_Access::check( 'rest' ) ) );
	}

	/**
	 * 指定能力要求时，无该能力的已登录用户返回 403。
	 */
	public function test_capability_gate_returns_403() {
		wp_set_current_user( 1 );
		$GLOBALS['__caps']['manage_options'] = false;

		add_filter(
			'saas_agg_view_capability',
			function () {
				return 'manage_options';
			}
		);

		$result = SAAS_Agg_Access::check( 'frontend' );

		$this->assertTrue( is_wp_error( $result ) );
		$data = $result->get_error_data();
		$this->assertSame( 403, $data['status'] );

		unset( $GLOBALS['__filters']['saas_agg_view_capability'] );
		$GLOBALS['__caps'] = array();
	}
}
