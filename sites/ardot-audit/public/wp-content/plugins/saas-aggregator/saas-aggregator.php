<?php
/**
 * Plugin Name:       SaaS Aggregator
 * Plugin URI:        https://example.com/saas-aggregator
 * Description:        基于企业级 SaaS 架构文档（接入层/应用层/智能层/合规层），将多个第三方数据源（网关状态、业务核心、AI 洞察、决策分析、合规审计）聚合到 WordPress 中统一展示与管理。含后台配置、区块/短代码展示、错误处理与缓存机制，遵循 WordPress 编码规范并具备可扩展性。
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            WorkBuddy
 * Author URI:        https://example.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       saas-aggregator
 * Domain Path:       /languages
 *
 * @package SAAS_Aggregator
 *
 * 许可声明：本插件以 GPL-2.0-or-later 授权。依 GPLv2「or later」条款，接收方有权
 * 选择按 GPLv3 条款接收本插件，从而获得 GPLv3 第 11 条的明示专利授权（GPLv2 正文
 * 不含明示专利授权）。完整许可证全文见同目录 LICENSE 文件。
 */

// 安全护栏：禁止直接访问。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// 插件常量（使用绝对路径与版本，便于扩展与升级）。
if ( ! defined( 'SAAS_AGG_VERSION' ) ) {
	define( 'SAAS_AGG_VERSION', '1.0.0' );
}
if ( ! defined( 'SAAS_AGG_PLUGIN_FILE' ) ) {
	define( 'SAAS_AGG_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'SAAS_AGG_PLUGIN_DIR' ) ) {
	define( 'SAAS_AGG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'SAAS_AGG_PLUGIN_URL' ) ) {
	define( 'SAAS_AGG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}
if ( ! defined( 'SAAS_AGG_OPTION_NAME' ) ) {
	define( 'SAAS_AGG_OPTION_NAME', 'saas_aggregator_settings' );
}
if ( ! defined( 'SAAS_AGG_TEXT_DOMAIN' ) ) {
	define( 'SAAS_AGG_TEXT_DOMAIN', 'saas-aggregator' );
}

/**
 * 设置结构（schema）版本号。
 *
 * 与插件版本 SAAS_AGG_VERSION 分开维护：只有「设置项的含义/默认值发生变化」
 * 才递增，用于触发一次性迁移。见 saas_agg_maybe_upgrade_settings()。
 */
if ( ! defined( 'SAAS_AGG_SETTINGS_SCHEMA' ) ) {
	define( 'SAAS_AGG_SETTINGS_SCHEMA', '2' );
}
if ( ! defined( 'SAAS_AGG_SETTINGS_SCHEMA_OPTION' ) ) {
	define( 'SAAS_AGG_SETTINGS_SCHEMA_OPTION', 'saas_aggregator_settings_schema' );
}

/**
 * 简易 PSR-4 风格自动加载器。
 *
 * 约定：SAAS_Agg_ 前缀的类映射到 includes/ 下的文件，
 * 子命名空间（如 Providers）映射到 includes/providers/。
 */
spl_autoload_register(
	function ( $class ) {
		$prefix = 'SAAS_Agg_';
		if ( strncmp( $prefix, $class, strlen( $prefix ) ) !== 0 ) {
			return;
		}

		$relative = substr( $class, strlen( $prefix ) );

		// 接口与抽象基类同文件：includes/class-provider-interface.php
		if ( 'Provider_Interface' === $relative || 'Provider' === $relative ) {
			$file = SAAS_AGG_PLUGIN_DIR . 'includes/class-provider-interface.php';
			if ( file_exists( $file ) ) {
				require_once $file;
			}
			return;
		}

		$parts = explode( '_', $relative );

		// "Providers_Foo" -> includes/providers/class-provider-foo.php
		if ( count( $parts ) > 1 && 'Providers' === $parts[0] ) {
			$file = SAAS_AGG_PLUGIN_DIR . 'includes/providers/class-provider-' . strtolower( implode( '-', array_slice( $parts, 1 ) ) ) . '.php';
			if ( file_exists( $file ) ) {
				require_once $file;
			}
			return;
		}

		// 其他：includes/class-<kebab>.php
		$file = SAAS_AGG_PLUGIN_DIR . 'includes/class-' . strtolower( str_replace( '_', '-', $relative ) ) . '.php';
		if ( file_exists( $file ) ) {
			require_once $file;
		}
	}
);

/**
 * 审计日志清理的定时任务钩子名。
 */
if ( ! defined( 'SAAS_AGG_PRUNE_HOOK' ) ) {
	define( 'SAAS_AGG_PRUNE_HOOK', 'saas_agg_prune_logs' );
}

/**
 * 激活时写入默认设置、建表并注册定时任务。
 *
 * 建表走 dbDelta，重复激活不会丢数据。
 */
register_activation_hook(
	__FILE__,
	static function () {
		if ( false === get_option( SAAS_AGG_OPTION_NAME ) ) {
			update_option( SAAS_AGG_OPTION_NAME, saas_agg_get_default_settings(), false );
		}

		// 设置结构迁移（激活发生在请求中途时，plugins_loaded 钩子已过）。
		saas_agg_maybe_upgrade_settings();

		// 建表 / 升级表结构。
		require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-db.php';
		SAAS_Agg_DB::install();

		// 注册日志清理任务（若尚未注册）。
		if ( ! wp_next_scheduled( SAAS_AGG_PRUNE_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', SAAS_AGG_PRUNE_HOOK );
		}
	}
);

/**
 * 停用时清理定时任务，避免留下孤儿 cron（数据保留，便于重新启用）。
 */
register_deactivation_hook(
	__FILE__,
	static function () {
		$timestamp = wp_next_scheduled( SAAS_AGG_PRUNE_HOOK );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, SAAS_AGG_PRUNE_HOOK );
		}
	}
);

/**
 * 定时清理 30 天前的审计日志。
 */
add_action(
	SAAS_AGG_PRUNE_HOOK,
	static function () {
		require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-db.php';
		SAAS_Agg_DB::prune( (int) apply_filters( 'saas_agg_log_retention_days', 30 ) );
	}
);

/**
 * 返回默认设置结构。集中定义，便于升级时合并新字段。
 *
 * @return array
 */
function saas_agg_get_default_settings() {
	$providers = array();

	$defaults = array(
		'gateway_status' => array(
			'label'          => __( '网关状态', 'saas-aggregator' ),
			'description'    => __( 'Go 接入层：API 网关健康、限流、实时通道状态。', 'saas-aggregator' ),
			'endpoint_path'  => '/api/gateway/status',
			'method'         => 'GET',
			'cache_ttl'      => 120,
		),
		'business_core'  => array(
			'label'          => __( '业务核心', 'saas-aggregator' ),
			'description'    => __( 'Java 应用层：订单、账务、权限等强一致业务数据。', 'saas-aggregator' ),
			'endpoint_path'  => '/api/orders',
			'method'         => 'GET',
			'cache_ttl'      => 300,
		),
		'ai_insights'    => array(
			'label'          => __( 'AI 洞察', 'saas-aggregator' ),
			'description'    => __( 'Python 智能层：LLM/RAG 检索增强生成与决策辅助。', 'saas-aggregator' ),
			'endpoint_path'  => '/api/ai/rag',
			'method'         => 'POST',
			'query'          => __( '请总结当前租户最值得关注的风险与机会。', 'saas-aggregator' ),
			'cache_ttl'      => 600,
		),
		'analytics'      => array(
			'label'          => __( '决策分析', 'saas-aggregator' ),
			'description'    => __( '数据层：ClickHouse 聚合分析与 Celery 决策看板。', 'saas-aggregator' ),
			'endpoint_path'  => '/api/analytics/dashboard',
			'method'         => 'GET',
			'cache_ttl'      => 900,
		),
		'compliance'     => array(
			'label'          => __( '合规审计', 'saas-aggregator' ),
			'description'    => __( '安全合规层：等保、脱敏、审计留痕与权限状态。', 'saas-aggregator' ),
			'endpoint_path'  => '/api/compliance/status',
			'method'         => 'GET',
			'cache_ttl'      => 600,
		),
		'ecommerce'      => array(
			'label'          => __( '电商商品', 'saas-aggregator' ),
			'description'    => __( '主站电商：Node.js API 商品、库存与销售数据。', 'saas-aggregator' ),
			'endpoint_path'  => '/api/products',
			'method'         => 'GET',
			'cache_ttl'      => 180,
			// 该接口由 Node.js BFF（node-api:3001）直接提供，Go 网关并未代理此路径
			// ——实测 gateway-go:8080/api/products 返回 404，而 node-api:3001 返回
			// 真实商品数据。因此单独指定来源服务，不跟随上面的统一网关默认值。
			'base_url'       => defined( 'SAAS_AGG_NODE_API_URL' )
				? SAAS_AGG_NODE_API_URL
				: 'http://node-api:3001',
		),
	);

	foreach ( $defaults as $id => $meta ) {
		$providers[ $id ] = array_merge(
			array(
				'enabled'   => 'yes',
				// 默认指向统一编排中的 Go 网关服务（同 docker 网络内可解析）。
				// 单机构建或非容器环境请在设置页修改 base_url。
				// 注意：若 $meta 自带 base_url（如 ecommerce），下面的 array_merge
				// 会让它覆盖这里的网关默认值。
				'base_url'  => defined( 'SAAS_AGG_GATEWAY_URL' )
					? SAAS_AGG_GATEWAY_URL
					: 'http://gateway-go:8080',
				// 租户默认 default；Phase 4 支持按 WordPress 用户自动映射。
				'api_key'   => '',
				'api_secret'=> '',
				'tenant_id' => 'default',
			),
			$meta
		);
	}

	return array(
		'global'    => array(
			'cache_ttl'       => 300,
			// demo_mode 默认关闭：激活即接入真实后端（monorepo 已随统一编排启动）。
			'demo_mode'       => 'no',
			'log_errors'      => 'yes',
			'items_per_source'=> 5,
			// 全局默认租户：当用户未在其资料页配置租户时使用。
			'default_tenant'  => 'default',
		),
		'providers' => $providers,
	);
}

/**
 * 统一读取并补全设置（与默认值合并，防止升级缺字段）。
 *
 * @return array
 */
function saas_agg_get_settings() {
	$saved = get_option( SAAS_AGG_OPTION_NAME, array() );
	$default = saas_agg_get_default_settings();

	// 全局项合并。
	$global = isset( $saved['global'] ) && is_array( $saved['global'] )
		? wp_parse_args( $saved['global'], $default['global'] )
		: $default['global'];

	// 各 provider 合并（保留新增 provider 的默认元信息）。
	$providers = $default['providers'];
	if ( isset( $saved['providers'] ) && is_array( $saved['providers'] ) ) {
		foreach ( $saved['providers'] as $id => $cfg ) {
			if ( isset( $providers[ $id ] ) ) {
				$providers[ $id ] = wp_parse_args( $cfg, $providers[ $id ] );
			}
		}
	}

	return array(
		'global'    => $global,
		'providers' => $providers,
	);
}

/**
 * 设置结构（schema）升级：一次性迁移，由 SAAS_AGG_SETTINGS_SCHEMA 驱动。
 *
 * 为什么需要它：saas_agg_get_settings() 用 wp_parse_args( 已存值, 默认值 ) 合并，
 * 「已存值优先」。这本是好事（用户改过的配置不会被升级覆盖），但副作用是——
 * 当某个默认值的*含义*变了（例如 ecommerce 的正确服务从网关改为 node-api），
 * 老站点会一直沿用错误的历史值。所以这类变更必须走显式迁移。
 *
 * 迁移原则：只纠正「仍等于旧默认值」的条目，用户手动改过的一律不动。
 *
 * @return void
 */
function saas_agg_maybe_upgrade_settings() {
	// 全新安装：直接落定当前 schema，不做任何迁移。
	if ( false === get_option( SAAS_AGG_OPTION_NAME, false ) ) {
		update_option( SAAS_AGG_SETTINGS_SCHEMA_OPTION, SAAS_AGG_SETTINGS_SCHEMA, false );
		return;
	}

	$current = (string) get_option( SAAS_AGG_SETTINGS_SCHEMA_OPTION, '1' );
	if ( version_compare( $current, SAAS_AGG_SETTINGS_SCHEMA, '>=' ) ) {
		return;
	}

	$settings = get_option( SAAS_AGG_OPTION_NAME, array() );
	if ( ! is_array( $settings ) ) {
		$settings = array();
	}

	$default = saas_agg_get_default_settings();
	$changed = false;

	// ── v1 → v2 ──────────────────────────────────────────────────
	// 电商数据源 /api/products 不在 Go 网关上（实测 404），由 Node.js BFF 提供。
	if ( version_compare( $current, '2', '<' ) ) {
		$stale = array_filter(
			array(
				defined( 'SAAS_AGG_GATEWAY_URL' ) ? SAAS_AGG_GATEWAY_URL : '',
				'http://gateway-go:8080',
			)
		);

		if ( isset( $settings['providers']['ecommerce']['base_url'] )
			&& in_array( $settings['providers']['ecommerce']['base_url'], $stale, true ) ) {
			$settings['providers']['ecommerce']['base_url'] = $default['providers']['ecommerce']['base_url'];
			$changed                                        = true;
		}
	}
	// ── 后续版本迁移在此追加 ────────────────────────────────────

	if ( $changed ) {
		update_option( SAAS_AGG_OPTION_NAME, $settings, false );
	}

	update_option( SAAS_AGG_SETTINGS_SCHEMA_OPTION, SAAS_AGG_SETTINGS_SCHEMA, false );
}
add_action( 'plugins_loaded', 'saas_agg_maybe_upgrade_settings', 9 );

/**
 * 引导各模块（设置页 / 前台 / 租户 / 数据层 / REST）。
 *
 * 注意：模块一律在 plugins_loaded 之后再实例化，这样所有模块都能安全地
 * 调用 is_admin()、current_user_can() 等需要 WP 环境就绪的函数。
 * 抽成具名函数而不是闭包，是为了兼容「同一请求内才被激活」的场景
 * （CLI 初始化脚本、程序化调用 activate_plugin()）——此时 plugins_loaded
 * 已经触发过了，再 add_action 永远不会执行，必须立刻手动引导一次。
 */
function saas_agg_bootstrap() {
	static $bootstrapped = false;
	if ( $bootstrapped ) {
		return;
	}
	$bootstrapped = true;

	// 设置结构迁移必须早于任何模块读取设置。
	// 单靠 plugins_loaded 钩子不够：若本插件是在请求中途被 activate_plugin()
	// 激活的，钩子早已触发过。这里再兜一次，函数内部自带幂等判断。
	saas_agg_maybe_upgrade_settings();

	// 国际化文本的加载见 saas_agg_load_textdomain()：
	// WP 6.7+ 要求在 init 之后加载，放这里（plugins_loaded / 优先级 10）会产生
	// 「Translation loading was triggered too early」的 Notice。

	// 后台设置页。
	if ( is_admin() ) {
		require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-settings.php';
		new SAAS_Agg_Settings();
	}

	// 前台展示（短代码 + 区块）。
	require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-frontend.php';
	new SAAS_Agg_Frontend();

	// 租户映射（用户 → X-Tenant-Id）。
	require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-tenant.php';
	new SAAS_Agg_Tenant();

	// 数据层：审计日志表。
	require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-db.php';

	// 表结构升级：仅在后台且版本不一致时执行，避免前台每次请求都跑 DDL 检查。
	if ( is_admin() && SAAS_Agg_DB::needs_upgrade() ) {
		SAAS_Agg_DB::install();
	}

	// REST API：注册 /wp-json/saas-aggregator/v1 路由。
	require_once SAAS_AGG_PLUGIN_DIR . 'includes/class-rest.php';
	new SAAS_Agg_REST();
}

/**
 * 加载插件翻译文本（幂等）
 *
 * 挂在 init 上而非 plugins_loaded：自 WP 6.7 起，在 init 之前调用
 * load_plugin_textdomain() 会触发「Translation loading was triggered too
 * early」的 doing_it_wrong 通知并写入 debug.log。
 */
function saas_agg_load_textdomain() {
	static $loaded = false;
	if ( $loaded ) {
		return;
	}
	$loaded = true;

	load_plugin_textdomain(
		SAAS_AGG_TEXT_DOMAIN,
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'init', 'saas_agg_load_textdomain', 0 );

if ( did_action( 'plugins_loaded' ) || doing_action( 'plugins_loaded' ) ) {
	// plugins_loaded 已经触发过（同请求内被激活 / CLI 场景），立即引导。
	saas_agg_bootstrap();
} else {
	add_action( 'plugins_loaded', 'saas_agg_bootstrap', 10 );
}

// 若本插件是在 init 之后才被激活（请求中途 activate_plugin() / CLI 引导），
// init 钩子已过，这里补加载一次，保证翻译不会缺失。
if ( did_action( 'init' ) || doing_action( 'init' ) ) {
	saas_agg_load_textdomain();
}
