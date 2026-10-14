<?php
/**
 * Provider 归一化逻辑单元测试（通过反射调用受保护方法）。
 *
 * @package SAAS_Aggregator
 */

class Test_SAAS_Agg_Provider_Normalization extends SAAS_Agg_TestCase {

	/**
	 * normalize_item：默认值、状态合法性校验。
	 */
	public function test_normalize_item_defaults_and_status_validation() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$m = new ReflectionMethod( $p, 'normalize_item' );
		$m->setAccessible( true );

		$item = $m->invoke( $p, array( 'title' => 'T', 'value' => 'V' ) );
		$this->assertSame( 'T', $item['title'] );
		$this->assertSame( 'V', $item['value'] );
		$this->assertSame( 'info', $item['status'], '缺省状态应为 info' );

		$bogus = $m->invoke( $p, array( 'title' => 'X', 'status' => 'bogus' ) );
		$this->assertSame( 'info', $bogus['status'], '非法状态应被纠正为 info' );

		$ok = $m->invoke( $p, array( 'title' => 'Y', 'status' => 'ok' ) );
		$this->assertSame( 'ok', $ok['status'], '合法状态应被保留' );
	}

	/**
	 * normalize_response：兼容 items / data / 裸数组三种结构。
	 */
	public function test_normalize_response_handles_items_data_and_raw() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$m = new ReflectionMethod( $p, 'normalize_response' );
		$m->setAccessible( true );

		$from_items = $m->invoke( $p, array( 'items' => array( array( 'title' => 'A' ) ) ) );
		$this->assertCount( 1, $from_items );
		$this->assertSame( 'A', $from_items[0]['title'] );

		$from_data = $m->invoke( $p, array( 'data' => array( array( 'title' => 'B' ) ) ) );
		$this->assertSame( 'B', $from_data[0]['title'] );

		$from_raw = $m->invoke( $p, array( array( 'title' => 'C' ) ) );
		$this->assertSame( 'C', $from_raw[0]['title'] );
	}

	/**
	 * data 为「具名集合」包装时（如 {"data":{"products":[...]}}）应拆开信封。
	 *
	 * 这是 Node.js BFF 的响应风格：外层是 {code,msg,data}，data 里再按业务名
	 * 分组。若不拆开，遍历到的会是整块 {"products":[...]}，title/value 全空。
	 */
	public function test_normalize_response_unwraps_named_collection_envelope() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$m = new ReflectionMethod( $p, 'normalize_response' );
		$m->setAccessible( true );

		$wrapped = $m->invoke(
			$p,
			array(
				'code' => 200,
				'msg'  => '成功',
				'data' => array(
					'products' => array(
						array( 'title' => 'iPhone 15 Pro', 'value' => '¥7,999.00' ),
						array( 'title' => 'MacBook Pro 14', 'value' => '¥14,999.00' ),
					),
				),
			)
		);

		$this->assertCount( 2, $wrapped, '具名集合应被拆开成两条' );
		$this->assertSame( 'iPhone 15 Pro', $wrapped[0]['title'] );
		$this->assertSame( 'MacBook Pro 14', $wrapped[1]['title'] );
	}

	/**
	 * 对照组：不拆信封时 data 只被当成一条（title 为空），正是修复前的现象。
	 * 用反射直接验证 unwrap_data_envelope 的返回值，锁定拆包行为本身。
	 */
	public function test_unwrap_data_envelope_returns_inner_list() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$m = new ReflectionMethod( $p, 'unwrap_data_envelope' );
		$m->setAccessible( true );

		$named = array( 'products' => array( array( 'title' => 'A' ), array( 'title' => 'B' ) ) );
		$this->assertCount( 2, $m->invoke( $p, $named ), '单个具名集合应返回内层列表' );

		$plain = array( array( 'title' => 'A' ), array( 'title' => 'B' ) );
		$this->assertSame( $plain, $m->invoke( $p, $plain ), '本身是列表时应原样返回' );

		$this->assertSame( array(), $m->invoke( $p, array() ), '空数组应原样返回' );
	}

	/**
	 * 具名集合里再套多个键时不做拆分（无法判定取哪个），保持原样交给子类。
	 */
	public function test_normalize_response_keeps_multi_key_data_intact() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$m = new ReflectionMethod( $p, 'normalize_response' );
		$m->setAccessible( true );

		// 两个键都不是纯列表结构，unwrap 后仍是单元素数组，归一化后无 title 条目。
		$multi = $m->invoke(
			$p,
			array(
				'data' => array(
					'a' => array( 'title' => 'A1' ),
					'b' => array( 'title' => 'B1' ),
				),
			)
		);

		$this->assertIsArray( $multi );
		foreach ( $multi as $row ) {
			$this->assertArrayHasKey( 'title', $row );
		}
	}

	/**
	 * 空 data 不应抛错。
	 */
	public function test_normalize_response_handles_empty_data() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$m = new ReflectionMethod( $p, 'normalize_response' );
		$m->setAccessible( true );

		$this->assertSame( array(), $m->invoke( $p, array( 'data' => array() ) ) );
		$this->assertSame( array(), $m->invoke( $p, 'not-an-array' ) );
	}

	/**
	 * get_layer 应返回非空字符串（用于前端徽标分组）。
	 */
	public function test_get_layer_returns_non_empty_string() {
		$p = new SAAS_Agg_Providers_Gateway_Status();
		$this->assertIsString( $p->get_layer() );
		$this->assertNotEmpty( $p->get_layer() );
	}
}
