<?php
/**
 * 简易 POT 提取器：扫描插件 PHP 文件中的可翻译字符串（__()、_e()、esc_html__() 等），
 * 生成 languages/saas-aggregator.pot。
 *
 * 运行：php bin/make-pot.php
 *
 * 说明：这是轻量替代方案（不依赖 WP-CLI / make-pot），覆盖本插件实际用到的取词函数。
 */

$plugin_dir = dirname( __DIR__ );
$pot_file   = $plugin_dir . '/languages/saas-aggregator.pot';

// 需要提取的取词函数（仅取第一个字符串参数作为 msgid）。
$funcs = array(
	'__', '_e', 'esc_html__', 'esc_html_e', 'esc_attr__', 'esc_attr_e',
	'esc_html_x', 'esc_attr_x', '_x', '_ex', '_n', '_nx',
);

// 递归收集 *.php。
$files = array();
$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $plugin_dir, FilesystemIterator::SKIP_DOTS ) );
foreach ( $it as $f ) {
	if ( 'php' !== $f->getExtension() ) {
		continue;
	}
	$path = $f->getPathname();
	// 排除测试与脚本桩，避免把桩函数名误当字符串。
	if ( strpos( $path, '/tests/' ) !== false || strpos( $path, '/bin/' ) !== false ) {
		continue;
	}
	$files[] = $path;
}

sort( $files );

$entries = array(); // msgid => [ 'refs' => [...] ]

$re = '/(?<![\w\\\\])(' . implode( '|', $funcs ) . ')\(\s*("|\')((?:\\\\.|(?!\2).)*?)\2/';

foreach ( $files as $file ) {
	$content = file_get_contents( $file );
	$rel     = ltrim( str_replace( $plugin_dir, '', $file ), '/\\' );
	$rel     = str_replace( '\\', '/', $rel );
	if ( ! preg_match_all( $re, $content, $m, PREG_OFFSET_CAPTURE ) ) {
		continue;
	}
	foreach ( $m[3] as $idx => $cap ) {
		$msgid = $cap[0];
		$offset = $cap[1];
		$line  = substr_count( substr( $content, 0, $offset ), "\n" ) + 1;
		$ref   = $rel . ':' . $line;
		if ( ! isset( $entries[ $msgid ] ) ) {
			$entries[ $msgid ] = array( 'refs' => array() );
		}
		$entries[ $msgid ]['refs'][] = $ref;
	}
}

// 按 msgid 排序，稳定输出。
uksort( $entries, 'strcmp' );

$out  = "msgid \"\"\n";
$out .= "msgstr \"\"\n";
$out .= "\"Project-Id-Version: SaaS Aggregator 1.0.0\\n\"\n";
$out .= "\"Report-Msgid-Bugs-To: https://example.com\\n\"\n";
$out .= "\"Last-Translator: \\n\"\n";
$out .= "\"Language-Team: \\n\"\n";
$out .= "\"MIME-Version: 1.0\\n\"\n";
$out .= "\"Content-Type: text/plain; charset=UTF-8\\n\"\n";
$out .= "\"Content-Transfer-Encoding: 8bit\\n\"\n";
$out .= "\"X-Domain: saas-aggregator\\n\"\n\n";

foreach ( $entries as $msgid => $data ) {
	$out .= '#: ' . implode( "\n#: ", $data['refs'] ) . "\n";
	$out .= 'msgid ' . pot_quote( $msgid ) . "\n";
	$out .= "msgstr \"\"\n\n";
}

if ( ! is_dir( dirname( $pot_file ) ) ) {
	mkdir( dirname( $pot_file ), 0755, true );
}
file_put_contents( $pot_file, $out );

echo 'Generated ' . $pot_file . ' with ' . count( $entries ) . " entries.\n";

/**
 * 按 PO 规范转义并包裹字符串。
 */
function pot_quote( $s ) {
	$s = str_replace( '\\', '\\\\', $s );
	$s = str_replace( '"', '\\"', $s );
	$s = str_replace( "\n", '\n', $s );
	return '"' . $s . '"';
}
