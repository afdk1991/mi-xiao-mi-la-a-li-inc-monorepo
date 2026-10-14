<?php
/**
 * 最小化 PHPUnit 兼容垫片（shim）。
 *
 * 仅在“未安装真实 PHPUnit”时由 tests/run-all.php 载入，目的是让同一份
 * PHPUnit 测试用例（tests/Test_*.php）能够在缺少 mbstring 等扩展的沙箱环境中被直接运行。
 * 真实 PHPUnit 环境下本文件为 no-op（class_exists 守卫）。
 *
 * 注意：本垫片只实现本插件测试用例实际用到的断言方法子集，并非完整 PHPUnit。
 */

namespace PHPUnit\Framework;

if ( class_exists( __NAMESPACE__ . '\TestCase', false ) ) {
	return;
}

class AssertionFailedError extends \Exception {}
class SkippedTest extends \Exception {}
class IncompleteTest extends \Exception {}

class TestCase {

	public function setUp(): void {}
	public function tearDown(): void {}

	public function markTestSkipped( string $message = '' ): void {
		throw new SkippedTest( $message );
	}

	public function markTestIncomplete( string $message = '' ): void {
		throw new IncompleteTest( $message );
	}

	// 真实 PHPUnit 中用于声明预期异常；垫片下忽略（用例未依赖此特性）。
	public function expectException( $exception ): void {}

	protected function fail( string $message = '' ): void {
		throw new AssertionFailedError( $message );
	}

	private function diff( $expected, $actual ): string {
		return sprintf( "expected: %s\nactual:   %s", var_export( $expected, true ), var_export( $actual, true ) );
	}

	protected function assertTrue( $condition, string $message = '' ): void {
		if ( true !== $condition ) {
			$this->fail( $message ?: 'Failed asserting that ' . var_export( $condition, true ) . ' is true' );
		}
	}

	protected function assertFalse( $condition, string $message = '' ): void {
		if ( false !== $condition ) {
			$this->fail( $message ?: 'Failed asserting that ' . var_export( $condition, true ) . ' is false' );
		}
	}

	protected function assertSame( $expected, $actual, string $message = '' ): void {
		if ( $expected !== $actual ) {
			$this->fail( $message ?: 'Failed asserting that two values are identical. ' . $this->diff( $expected, $actual ) );
		}
	}

	protected function assertEquals( $expected, $actual, string $message = '' ): void {
		if ( $expected != $actual ) {
			$this->fail( $message ?: 'Failed asserting that two values are equal. ' . $this->diff( $expected, $actual ) );
		}
	}

	protected function assertNull( $actual, string $message = '' ): void {
		if ( null !== $actual ) {
			$this->fail( $message ?: 'Failed asserting that value is null. ' . $this->diff( null, $actual ) );
		}
	}

	protected function assertNotNull( $actual, string $message = '' ): void {
		if ( null === $actual ) {
			$this->fail( $message ?: 'Failed asserting that value is not null.' );
		}
	}

	protected function assertEmpty( $actual, string $message = '' ): void {
		if ( ! empty( $actual ) ) {
			$this->fail( $message ?: 'Failed asserting that value is empty.' );
		}
	}

	protected function assertNotEmpty( $actual, string $message = '' ): void {
		if ( empty( $actual ) ) {
			$this->fail( $message ?: 'Failed asserting that value is not empty.' );
		}
	}

	protected function assertCount( int $expected_count, $haystack, string $message = '' ): void {
		if ( ! is_array( $haystack ) && ! is_countable( $haystack ) ) {
			$this->fail( $message ?: 'assertCount expects an array or countable.' );
		}
		$actual_count = count( $haystack );
		if ( $actual_count !== $expected_count ) {
			$this->fail( $message ?: sprintf( 'Failed asserting that count is %d. actual: %d', $expected_count, $actual_count ) );
		}
	}

	protected function assertIsArray( $actual, string $message = '' ): void {
		if ( ! is_array( $actual ) ) {
			$this->fail( $message ?: 'Failed asserting that value is of type "array".' );
		}
	}

	protected function assertIsString( $actual, string $message = '' ): void {
		if ( ! is_string( $actual ) ) {
			$this->fail( $message ?: 'Failed asserting that value is of type "string".' );
		}
	}

	protected function assertInstanceOf( string $expected, $actual, string $message = '' ): void {
		if ( ! ( $actual instanceof $expected ) ) {
			$this->fail( $message ?: sprintf( 'Failed asserting that value is an instance of %s.', $expected ) );
		}
	}

	protected function assertArrayHasKey( $key, $array, string $message = '' ): void {
		if ( ! is_array( $array ) || ! array_key_exists( $key, $array ) ) {
			$this->fail( $message ?: sprintf( 'Failed asserting that an array has key %s.', var_export( $key, true ) ) );
		}
	}

	protected function assertStringStartsWith( string $prefix, string $string, string $message = '' ): void {
		if ( 0 !== strpos( $string, $prefix ) ) {
			$this->fail( $message ?: sprintf( 'Failed asserting that %s starts with %s.', var_export( $string, true ), var_export( $prefix, true ) ) );
		}
	}

	protected function assertStringNotContainsString( string $needle, string $haystack, string $message = '' ): void {
		if ( false !== strpos( $haystack, $needle ) ) {
			$this->fail( $message ?: sprintf( 'Failed asserting that %s does not contain %s.', var_export( $haystack, true ), var_export( $needle, true ) ) );
		}
	}

	protected function assertStringContainsString( string $needle, string $haystack, string $message = '' ): void {
		if ( false === strpos( $haystack, $needle ) ) {
			$this->fail( $message ?: sprintf( 'Failed asserting that %s contains %s.', var_export( $haystack, true ), var_export( $needle, true ) ) );
		}
	}

	protected function assertContains( $needle, $haystack, string $message = '' ): void {
		if ( is_array( $haystack ) ) {
			if ( ! in_array( $needle, $haystack, true ) ) {
				$this->fail( $message ?: sprintf( 'Failed asserting that array contains %s.', var_export( $needle, true ) ) );
			}
			return;
		}
		if ( is_string( $haystack ) ) {
			if ( false === strpos( $haystack, (string) $needle ) ) {
				$this->fail( $message ?: sprintf( 'Failed asserting that string contains %s.', var_export( $needle, true ) ) );
			}
			return;
		}
		$this->fail( $message ?: 'assertContains expects an array or string haystack.' );
	}
}
