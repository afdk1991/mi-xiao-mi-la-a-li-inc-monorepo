<?php
/**
 * 综合测试运行器（无需真实 PHPUnit）。
 *
 * 通过 tests/phpunit-shim.php 提供 PHPUnit\Framework\TestCase 兼容垫片，
 * 直接加载并运行 tests/Test_*.php 中的全部测试用例，输出 通过/失败/跳过/错误 汇总。
 *
 * 用法：php tests/run-all.php
 * 真实 PHPUnit 环境下请勿使用本文件，改用：vendor/bin/phpunit -c phpunit.xml.dist
 */

require_once __DIR__ . '/phpunit-shim.php';
require_once __DIR__ . '/bootstrap.php';

$test_files = glob( __DIR__ . '/Test_*.php' );
foreach ( $test_files as $f ) {
	require_once $f;
}

// 收集所有具体测试类（排除抽象基类 SAAS_Agg_TestCase）。
$all   = get_declared_classes();
$suite = array();
foreach ( $all as $cls ) {
	if ( 'SAAS_Agg_TestCase' === $cls ) {
		continue;
	}
	if ( ! is_subclass_of( $cls, 'PHPUnit\\Framework\\TestCase' ) ) {
		continue;
	}
	$ref = new ReflectionClass( $cls );
	if ( $ref->isAbstract() ) {
		continue;
	}
	$suite[] = $cls;
}

$results = array(
	'pass'  => array(),
	'fail'  => array(),
	'skip'  => array(),
	'error' => array(),
);

foreach ( $suite as $cls ) {
	$methods = get_class_methods( $cls );
	foreach ( $methods as $m ) {
		if ( 0 !== strpos( $m, 'test' ) ) {
			continue;
		}
		$tc = new $cls();
		try {
			if ( method_exists( $tc, 'setUp' ) ) {
				$tc->setUp();
			}
			$tc->$m();
			if ( method_exists( $tc, 'tearDown' ) ) {
				$tc->tearDown();
			}
			$results['pass'][] = $cls . '::' . $m;
		} catch ( \PHPUnit\Framework\SkippedTest $e ) {
			$results['skip'][] = $cls . '::' . $m . ' — ' . $e->getMessage();
		} catch ( \PHPUnit\Framework\AssertionFailedError $e ) {
			$results['fail'][] = $cls . '::' . $m . ' — ' . $e->getMessage();
		} catch ( \Throwable $e ) {
			$results['error'][] = $cls . '::' . $m . ' — ' . get_class( $e ) . ': ' . $e->getMessage()
				. ' [' . $e->getFile() . ':' . $e->getLine() . ']';
		}
	}
}

$total = count( $results['pass'] ) + count( $results['fail'] ) + count( $results['skip'] ) + count( $results['error'] );

echo str_repeat( '=', 70 ) . PHP_EOL;
echo 'saas-aggregator 测试汇总（PHPUnit 兼容垫片运行）' . PHP_EOL;
echo str_repeat( '=', 70 ) . PHP_EOL;
echo '测试用例文件: ' . count( $test_files ) . '  测试类: ' . count( $suite ) . PHP_EOL;
echo '总计: ' . $total
	. '   通过: ' . count( $results['pass'] )
	. '   失败: ' . count( $results['fail'] )
	. '   跳过: ' . count( $results['skip'] )
	. '   错误: ' . count( $results['error'] ) . PHP_EOL;
echo str_repeat( '-', 70 ) . PHP_EOL;

if ( $results['pass'] ) {
	echo '通过 (PASS):' . PHP_EOL;
	foreach ( $results['pass'] as $p ) {
		echo '  [OK] ' . $p . PHP_EOL;
	}
	echo str_repeat( '-', 70 ) . PHP_EOL;
}

if ( $results['skip'] ) {
	echo '跳过 (SKIP):' . PHP_EOL;
	foreach ( $results['skip'] as $s ) {
		echo '  [SK] ' . $s . PHP_EOL;
	}
	echo str_repeat( '-', 70 ) . PHP_EOL;
}

if ( $results['fail'] ) {
	echo '失败 (FAIL):' . PHP_EOL;
	foreach ( $results['fail'] as $f ) {
		echo '  [XX] ' . $f . PHP_EOL;
	}
	echo str_repeat( '-', 70 ) . PHP_EOL;
}

if ( $results['error'] ) {
	echo '错误 (ERROR):' . PHP_EOL;
	foreach ( $results['error'] as $er ) {
		echo '  [!!] ' . $er . PHP_EOL;
	}
	echo str_repeat( '-', 70 ) . PHP_EOL;
}

echo '结论: ' . ( ( $results['fail'] || $results['error'] ) ? '存在失败/错误' : '全部通过（跳过项除外）' ) . PHP_EOL;
echo str_repeat( '=', 70 ) . PHP_EOL;

// 退出码：有失败或错误则非 0，便于 CI 集成。
exit( ( $results['fail'] || $results['error'] ) ? 1 : 0 );
