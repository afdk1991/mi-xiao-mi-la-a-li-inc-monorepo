<?php
/**
 * 核心文件完整性校验器
 *
 * 用途：证明 WordPress 核心文件未被二次开发改动（交付验收要点之一）。
 * 原理：以 wordpress.org 官方 checksums API 为黄金基线，逐文件比对 MD5。
 *
 * 用法：
 *   php scripts/verify-core.php                    # 校验，输出报告
 *   php scripts/verify-core.php --json             # 机器可读输出
 *   php scripts/verify-core.php --strict           # 任何差异都以非 0 退出（CI 用）
 *   php scripts/verify-core.php --scope=content    # 只校验 wp-content 官方文件
 *
 * 校验域：
 *   core    —— wp-admin/、wp-includes/、根目录受控文件。严禁新增/修改/删除。
 *   content —— wp-content/ 下官方分发的文件（语言包、默认主题、Akismet）。
 *              允许新增（这是我们放子主题/插件的地方），但严禁修改/删除官方文件。
 *
 * 退出码：0 = 核心零改动；1 = 存在差异；2 = 基线缺失或参数错误。
 */

declare(strict_types=1);

// WordPress 根目录：容器 / 非标准布局用 WP004_ABSPATH 指定，否则回落到项目根下的 public/。
$wp_root = getenv('WP004_ABSPATH');
if ($wp_root) {
    $wp_root = rtrim(str_replace('\\', '/', (string) $wp_root), '/');
} else {
    $wp_root = rtrim(str_replace('\\', '/', dirname(__DIR__)), '/') . '/public';
}

// 基线文件：可用 WP004_BASELINE 指定绝对路径；否则按版本 + 语言推导。
$baseline = getenv('WP004_BASELINE');
if (!$baseline) {
    $version = getenv('WP_VERSION') ?: '7.0.4';
    $locale  = getenv('WP_LOCALE') ?: 'zh_CN';
    $candidate = dirname(__DIR__) . '/_dist/checksums-' . $version . '-' . $locale . '.json';
    $baseline  = is_file($candidate) ? $candidate : dirname(__DIR__) . '/_dist/checksums-7.0.4-zh_CN.json';
}

$opts = [
    'json'   => false,
    'strict' => false,
    'scope'  => 'all', // all | core | content
];
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--json')        { $opts['json'] = true; continue; }
    if ($arg === '--strict')      { $opts['strict'] = true; continue; }
    if (strpos($arg, '--scope=') === 0) { $opts['scope'] = substr($arg, 8); continue; }
}

if (!is_file($baseline)) {
    fwrite(STDERR, "[错误] 基线文件缺失：{$baseline}\n");
    fwrite(STDERR, "        请先执行 scripts/fetch-baseline.sh 获取官方 checksums。\n");
    exit(2);
}

$official = json_decode((string) file_get_contents($baseline), true);
if (empty($official['checksums'])) {
    fwrite(STDERR, "[错误] 基线文件格式不正确。\n");
    exit(2);
}
$official = $official['checksums'];

/** 判断相对路径属于哪个域 */
function domain_of(string $rel): string
{
    if (strpos($rel, 'wp-content/') === 0) {
        return 'content';
    }
    return 'core';
}

/** 递归收集 WP 根目录下所有实际文件（相对路径 => 绝对路径） */
function collect_files(string $dir, string $base, array &$out): void
{
    $items = @scandir($dir);
    if ($items === false) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . '/' . $item;
        $rel  = ltrim(str_replace($base, '', $path), '/');
        if (is_dir($path)) {
            collect_files($path, $base, $out);
        } elseif (is_file($path)) {
            $out[$rel] = $path;
        }
    }
}

$actual = [];
collect_files($wp_root, $wp_root, $actual);

$modified = []; // 官方有、内容变了
$missing  = []; // 官方有、文件没了
$extra    = []; // 官方没有、凭空多出

foreach ($official as $rel => $expected_md5) {
    $domain = domain_of($rel);
    if ($opts['scope'] !== 'all' && $opts['scope'] !== $domain) {
        continue;
    }
    if (!isset($actual[$rel])) {
        $missing[] = ['path' => $rel, 'domain' => $domain];
        continue;
    }
    $md5 = md5_file($actual[$rel]);
    if ($md5 !== $expected_md5) {
        $modified[] = ['path' => $rel, 'domain' => $domain];
    }
}

foreach ($actual as $rel => $abs) {
    $domain = domain_of($rel);
    if ($opts['scope'] !== 'all' && $opts['scope'] !== $domain) {
        continue;
    }
    if (!isset($official[$rel])) {
        // wp-content 下的新增是二次开发的正常产物；core 域的新增是违规的。
        $extra[] = ['path' => $rel, 'domain' => $domain, 'allowed' => $domain === 'content'];
    }
}

$core_modified    = array_values(array_filter($modified, fn($x) => $x['domain'] === 'core'));
$core_missing     = array_values(array_filter($missing,  fn($x) => $x['domain'] === 'core'));
$core_extra       = array_values(array_filter($extra,    fn($x) => $x['domain'] === 'core'));
$content_modified = array_values(array_filter($modified, fn($x) => $x['domain'] === 'content'));
$content_missing  = array_values(array_filter($missing,  fn($x) => $x['domain'] === 'content'));
$content_added    = array_values(array_filter($extra,    fn($x) => $x['domain'] === 'content'));

$violations = count($core_modified) + count($core_missing) + count($core_extra)
            + count($content_modified) + count($content_missing);

$result = [
    'wordpress_version' => '7.0.4',
    'locale'            => 'zh_CN',
    'baseline_checksums' => count($official),
    'scanned_files'     => count($actual),
    'verdict'           => $violations === 0 ? 'PASS' : 'FAIL',
    'core' => [
        'modified' => $core_modified,
        'missing'  => $core_missing,
        'extra'    => $core_extra,
    ],
    'content' => [
        'modified' => $content_modified,
        'missing'  => $content_missing,
        'added'    => $content_added,
    ],
];

if ($opts['json']) {
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), "\n";
} else {
    $line = str_repeat('=', 68);
    echo "\n{$line}\n  WordPress 核心完整性校验\n{$line}\n";
    printf("  版本            : %s (%s)\n", $result['wordpress_version'], $result['locale']);
    printf("  基线校验和条目  : %d\n", $result['baseline_checksums']);
    printf("  实际扫描文件    : %d\n", $result['scanned_files']);
    echo "\n  --- 核心域 (wp-admin / wp-includes / 根受控文件) ---\n";
    printf("    被修改        : %d\n", count($core_modified));
    printf("    缺失          : %d\n", count($core_missing));
    printf("    非法新增      : %d\n", count($core_extra));
    echo "\n  --- 内容域 (wp-content 官方分发文件) ---\n";
    printf("    官方文件被改  : %d\n", count($content_modified));
    printf("    官方文件缺失  : %d\n", count($content_missing));
    printf("    新增(允许)    : %d\n", count($content_added));

    if ($violations > 0) {
        echo "\n  [违规明细]\n";
        foreach (['核心被修改' => $core_modified, '核心缺失' => $core_missing,
                  '核心非法新增' => $core_extra, '内容被修改' => $content_modified,
                  '内容缺失' => $content_missing] as $label => $rows) {
            if (!$rows) { continue; }
            echo "    {$label}:\n";
            foreach (array_slice($rows, 0, 20) as $r) {
                echo "      - {$r['path']}\n";
            }
            if (count($rows) > 20) {
                printf("      ... 另有 %d 项\n", count($rows) - 20);
            }
        }
    }

    echo "\n{$line}\n";
    if ($violations === 0) {
        echo "  结论：PASS —— 核心文件 100% 保持官方原样，零改动。\n";
    } else {
        printf("  结论：FAIL —— 发现 %d 处违规改动。\n", $violations);
    }
    echo "{$line}\n\n";
}

exit($violations === 0 ? 0 : 1);
