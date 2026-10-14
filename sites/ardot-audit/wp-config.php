<?php
/**
 * WordPress 项目配置文件。
 *
 * 该文件位于文档根目录（public/）之外一层，WordPress 核心的 wp-load.php
 * 会原生向上查找并加载它。这样做的好处是：配置文件无法通过 HTTP 直接访问，
 * 同时 public/ 下的核心文件保持 100% 官方原样、零改动。
 *
 * 敏感信息全部从环境变量读取，环境变量缺失时回退到 .env 文件，
 * 便于同一份代码在 本地 / 预发 / 生产 之间切换而无需改动任何文件。
 *
 * 本文件不属于 WordPress 核心（不在官方 checksums 清单内），可自由定制。
 */

// ---------------------------------------------------------------------------
// 1. 轻量 .env 加载（无第三方依赖）
// ---------------------------------------------------------------------------

/**
 * 读取环境变量：优先真实环境变量，其次 .env 文件，最后用默认值。
 *
 * @param string $key     变量名。
 * @param mixed  $default 默认值。
 * @return mixed
 */
if ( ! function_exists( 'wp004_env' ) ) {
	function wp004_env( $key, $default = '' ) {
		// 1) 真实环境变量优先（容器/K8s/CI 场景）。
		$value = getenv( $key );
		if ( false !== $value && '' !== $value ) {
			return $value;
		}

		// 2) .env 文件（仅解析一次）。
		static $parsed = null;
		if ( null === $parsed ) {
			$parsed = array();
			$file   = __DIR__ . '/.env';
			if ( is_readable( $file ) ) {
				foreach ( file( $file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) as $line ) {
					$line = trim( $line );
					if ( '' === $line || '#' === substr( $line, 0, 1 ) ) {
						continue;
					}
					if ( false === strpos( $line, '=' ) ) {
						continue;
					}
					list( $k, $v ) = explode( '=', $line, 2 );
					$parsed[ trim( $k ) ] = trim( trim( $v ), "\"'" );
				}
			}
		}

		return array_key_exists( $key, $parsed ) ? $parsed[ $key ] : $default;
	}
}

/**
 * 把字符串型的开关（"true"/"1"/"yes"）转成布尔。
 *
 * @param string $key     变量名。
 * @param bool   $default 默认值。
 * @return bool
 */
if ( ! function_exists( 'wp004_env_bool' ) ) {
	function wp004_env_bool( $key, $default = false ) {
		$value = strtolower( (string) wp004_env( $key, $default ? 'true' : 'false' ) );
		return in_array( $value, array( '1', 'true', 'yes', 'on' ), true );
	}
}

/**
 * 判断当前是否为命令行（CLI）执行环境。
 *
 * CLI 下不存在 HTTP_HOST，动态推导站点地址会失效，需要在判断中排除。
 *
 * @return bool
 */
if ( ! function_exists( 'wp004_is_cli' ) ) {
	function wp004_is_cli() {
		return 'cli' === PHP_SAPI
			|| 'phpdbg' === PHP_SAPI
			|| ! isset( $_SERVER['REQUEST_METHOD'] );
	}
}

// ---------------------------------------------------------------------------
// 2. 数据库设置
// ---------------------------------------------------------------------------
define( 'DB_NAME',     wp004_env( 'DB_NAME', 'wp004' ) );
define( 'DB_USER',     wp004_env( 'DB_USER', 'wp004' ) );
define( 'DB_PASSWORD', wp004_env( 'DB_PASSWORD', 'wp004_pass' ) );
define( 'DB_HOST',     wp004_env( 'DB_HOST', '127.0.0.1:3307' ) );
define( 'DB_CHARSET',  wp004_env( 'DB_CHARSET', 'utf8mb4' ) );
define( 'DB_COLLATE',  wp004_env( 'DB_COLLATE', '' ) );

/**
 * 数据表前缀。多站点或同库多套站点时修改。
 *
 * @var string
 */
$table_prefix = wp004_env( 'DB_PREFIX', 'wp_' );

// ---------------------------------------------------------------------------
// 3. 站点地址
//    WP_HOME 决定前台地址，WP_SITEURL 决定后台与资源地址。
//    固定链接、REST 路由都依赖它们。
//
//    本地开发（WP_DYNAMIC_URL=1）时，站点地址跟随请求的 Host 动态推导，
//    这样同一个环境既能用 http://127.0.0.1:PORT 访问，也能用容器/局域网
//    IP 或自定义域名访问，避免写死后出现资源 404 或登录跳转回环。
//    生产环境请保持 WP_DYNAMIC_URL=0，使用固定的 WP_HOME / WP_SITEURL。
// ---------------------------------------------------------------------------
if ( wp004_env_bool( 'WP_DYNAMIC_URL', false )
	&& isset( $_SERVER['HTTP_HOST'] )
	&& ! wp004_is_cli()
) {
	$wp004_scheme = ( ( ! empty( $_SERVER['HTTPS'] ) && 'off' !== strtolower( (string) $_SERVER['HTTPS'] ) )
		|| ( isset( $_SERVER['SERVER_PORT'] ) && '443' === (string) $_SERVER['SERVER_PORT'] )
	) ? 'https' : 'http';
	define( 'WP_HOME', $wp004_scheme . '://' . $_SERVER['HTTP_HOST'] );
} else {
	define( 'WP_HOME', wp004_env( 'WP_HOME', 'http://localhost:8080' ) );
}
define( 'WP_SITEURL', wp004_env( 'WP_SITEURL', WP_HOME ) );

// ---------------------------------------------------------------------------
// 4. 内容目录
//
//    两种目录布局都能自动适配，无需改动本文件：
//    A. 本地模式：wp-config.php 在项目根，核心与 wp-content 在 public/
//    B. 容器模式：wp-config.php 在 /var/www/，核心与 wp-content 在 /var/www/html/
//
//    这里的 ABSPATH 由核心的 wp-load.php 在加载本文件之前就已定义为 Web 根，
//    因此用 ABSPATH 推导内容目录在两种布局下都成立；CLI 场景（如 WP-CLI）
//    下 ABSPATH 可能尚未定义，故做兜底。
// ---------------------------------------------------------------------------
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/public/' );
}

define( 'WP_CONTENT_DIR', ABSPATH . 'wp-content' );
define( 'WP_CONTENT_URL', WP_HOME . '/wp-content' );

// ---------------------------------------------------------------------------
// 5. 安全密钥（Authentication Unique Keys and Salts）
//    用于加密 Cookie。更换后所有用户需重新登录。
//    生产环境请务必替换为独立生成的值：https://api.wordpress.org/secret-key/1.1/salt/
// ---------------------------------------------------------------------------
//    优先级：真实环境变量 > .env > 下面的本地默认值。
//    生产环境必须为每个环境注入独立的一组密钥，切勿沿用下面的默认值。
// ---------------------------------------------------------------------------
$wp004_keys = array(
	'AUTH_KEY',
	'SECURE_AUTH_KEY',
	'LOGGED_IN_KEY',
	'NONCE_KEY',
	'AUTH_SALT',
	'SECURE_AUTH_SALT',
	'LOGGED_IN_SALT',
	'NONCE_SALT',
);

// 仅本地开发使用的兜底值；生产环境请通过环境变量覆盖。
$wp004_default_keys = array(
	'AUTH_KEY'         => 'a5e83ab95bf38b9c94a0e33b254a57732cdeae00d8322f6331767f123d37fc8e',
	'SECURE_AUTH_KEY'  => '55c88a36492d44b8c091a3c284cfba866ea79b9d03bf6761b8651594ec010b62',
	'LOGGED_IN_KEY'    => 'f66670b8de3ee962fcc823de201a38e03d15f76fb1963b53ca67a78aef696124',
	'NONCE_KEY'        => '5fc68bba2088079f386a92898e96557558e3e71123fa696653c46dbc21ec34ae',
	'AUTH_SALT'        => '0275c02ae9fd98c3a282fa16074b357080ccb341ca9d78100bf1e854f3276e9f',
	'SECURE_AUTH_SALT' => '63a686c7f6aee4856d6ac669e4c35bb44be8523484adf3ec17ba2fe8a8a40784',
	'LOGGED_IN_SALT'   => '85c640c15f96e3873fd477c5da67d11a5b98940c43ed6b63a0af548b104c22b4',
	'NONCE_SALT'       => '6f52ca99f50805ac2807c97f60890c699f1fcc59a3fb6b8e341b34c0e29d88b9',
);

foreach ( $wp004_keys as $wp004_key ) {
	if ( ! defined( $wp004_key ) ) {
		define( $wp004_key, wp004_env( $wp004_key, $wp004_default_keys[ $wp004_key ] ) );
	}
}
unset( $wp004_keys, $wp004_default_keys, $wp004_key );

// ---------------------------------------------------------------------------
// 6. 调试开关
//    本地开发开启；生产环境请通过环境变量 WP_DEBUG=false 关闭。
// ---------------------------------------------------------------------------
define( 'WP_DEBUG',         wp004_env_bool( 'WP_DEBUG', true ) );
define( 'WP_DEBUG_LOG',     wp004_env_bool( 'WP_DEBUG_LOG', true ) );
define( 'WP_DEBUG_DISPLAY', wp004_env_bool( 'WP_DEBUG_DISPLAY', false ) );
define( 'SCRIPT_DEBUG',     wp004_env_bool( 'SCRIPT_DEBUG', false ) );

// ---------------------------------------------------------------------------
// 7. 环境标识（local / development / staging / production）
//    影响 WordPress 的错误上报与部分功能行为。
// ---------------------------------------------------------------------------
define( 'WP_ENVIRONMENT_TYPE', wp004_env( 'WP_ENVIRONMENT_TYPE', 'local' ) );

// ---------------------------------------------------------------------------
// 8. 安全与运维基线
//    以下常量均为 WordPress 官方支持的配置项，属于原生机制，不属于改核心。
// ---------------------------------------------------------------------------

// 关闭后台的「主题/插件文件编辑器」：防止后台被入侵后直接植入后门。
// 需要在线改代码时，用 WP_ALLOW_FILE_EDIT=true 临时开启即可。
define( 'DISALLOW_FILE_EDIT', ! wp004_env_bool( 'WP_ALLOW_FILE_EDIT', false ) );

// 核心/插件/主题的在线自动更新策略：
// 生产环境建议只放行 minor 安全更新，重大版本走人工验证流程。
define( 'WP_AUTO_UPDATE_CORE', wp004_env( 'WP_AUTO_UPDATE_CORE', 'minor' ) );

// 版本修订与自动保存：避免 revisions 无限膨胀拖慢数据库。
define( 'WP_POST_REVISIONS', (int) wp004_env( 'WP_POST_REVISIONS', 10 ) );
define( 'AUTOSAVE_INTERVAL', (int) wp004_env( 'AUTOSAVE_INTERVAL', 120 ) );

// 回收站保留天数。
define( 'EMPTY_TRASH_DAYS', (int) wp004_env( 'EMPTY_TRASH_DAYS', 15 ) );

// PHP 内存上限（后台与前台）。
define( 'WP_MEMORY_LIMIT', wp004_env( 'WP_MEMORY_LIMIT', '256M' ) );
define( 'WP_MAX_MEMORY_LIMIT', wp004_env( 'WP_MAX_MEMORY_LIMIT', '512M' ) );

// 强制后台走 HTTPS（生产环境建议开启）。
if ( wp004_env_bool( 'FORCE_SSL_ADMIN', false ) ) {
	define( 'FORCE_SSL_ADMIN', true );
}

// ---------------------------------------------------------------------------
// 9. 业务常量：SaaS 聚合器各后端服务地址
//    插件 saas-aggregator 会读取它们作为各数据源的默认 base_url。
//    分两个而不是一个，是因为这些接口并不都在同一个服务上：
//      · Go 网关（gateway-go:8080）—— 网关状态、订单、AI、分析、合规
//      · Node.js BFF（node-api:3001）—— 商品/库存（/api/products 实测不在网关上）
//    未定义时插件会退回内置默认值，因此这两项缺失也不会导致致命错误。
// ---------------------------------------------------------------------------
if ( ! defined( 'SAAS_AGG_GATEWAY_URL' ) ) {
	define( 'SAAS_AGG_GATEWAY_URL', wp004_env( 'SAAS_AGG_GATEWAY_URL', 'http://localhost:8080' ) );
}
if ( ! defined( 'SAAS_AGG_NODE_API_URL' ) ) {
	define( 'SAAS_AGG_NODE_API_URL', wp004_env( 'SAAS_AGG_NODE_API_URL', 'http://localhost:3001' ) );
}

// ---------------------------------------------------------------------------
// 10. 载入 WordPress
//     ABSPATH 已在第 4 节前置定义（核心加载本文件时也已定义），此处直接使用。
// ---------------------------------------------------------------------------
require_once ABSPATH . 'wp-settings.php';
