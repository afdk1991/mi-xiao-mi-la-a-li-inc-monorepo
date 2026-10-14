<?php
/**
 * 数据层：审计日志表的规范建表、读写与生命周期管理。
 *
 * 设计取舍（呼应「优先复用 postmeta/options 或规范建表」原则）：
 * - 配置项仍然复用 wp_options（低频读写、需要升级合并，options 是最优解）；
 * - 审计日志属于高频追加写、需要按时间/租户检索、需要定期清理的结构化流水，
 *   放进 options 或 postmeta 都会拖垮查询，因此按 WordPress 规范自建表。
 *
 * 严格遵守的原生约定：
 * - 使用 $wpdb->prefix，支持多站点与自定义表前缀；
 * - 使用 $wpdb->get_charset_collate()，跟随站点字符集；
 * - 使用 dbDelta() 建表，保证版本升级时表结构可平滑演进；
 * - 表结构版本存入 option，避免每次请求重复执行 DDL。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 审计日志数据访问层。
 */
class SAAS_Agg_DB {

	/**
	 * 表结构版本。结构变更时递增，触发 dbDelta 增量升级。
	 *
	 * @var string
	 */
	const SCHEMA_VERSION = '1.0.0';

	/**
	 * 存放表结构版本的 option 名。
	 *
	 * @var string
	 */
	const SCHEMA_OPTION = 'saas_aggregator_db_version';

	/**
	 * 表名（含前缀）。
	 *
	 * @var string
	 */
	private static $table = '';

	/**
	 * 返回完整表名。
	 *
	 * @return string
	 */
	public static function table_name() {
		global $wpdb;

		if ( '' === self::$table ) {
			self::$table = $wpdb->prefix . 'saas_agg_logs';
		}

		return self::$table;
	}

	/**
	 * 建表 / 升级表结构。
	 *
	 * dbDelta 是 WordPress 官方推荐的建表方式：
	 * 只做增量变更，不会清空已有数据，因此插件升级是安全的。
	 *
	 * @return void
	 */
	public static function install() {
		global $wpdb;

		$table   = self::table_name();
		$charset = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
	created_at datetime NOT NULL,
	user_id bigint(20) unsigned NOT NULL DEFAULT 0,
	tenant_id varchar(64) NOT NULL DEFAULT '',
	provider_id varchar(64) NOT NULL DEFAULT '',
	endpoint varchar(255) NOT NULL DEFAULT '',
	http_status smallint(5) unsigned NOT NULL DEFAULT 0,
	duration_ms int(10) unsigned NOT NULL DEFAULT 0,
	cache_hit tinyint(1) NOT NULL DEFAULT 0,
	result varchar(16) NOT NULL DEFAULT 'ok',
	message text,
	PRIMARY KEY  (id),
	KEY tenant_id (tenant_id),
	KEY provider_id (provider_id),
	KEY created_at (created_at)
) {$charset};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );

		update_option( self::SCHEMA_OPTION, self::SCHEMA_VERSION, false );
	}

	/**
	 * 卸载时清理表结构（由 uninstall.php 调用）。
	 *
	 * @return void
	 */
	public static function uninstall() {
		global $wpdb;

		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::table_name() ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		delete_option( self::SCHEMA_OPTION );
	}

	/**
	 * 是否需要建表或升级。
	 *
	 * @return bool
	 */
	public static function needs_upgrade() {
		return get_option( self::SCHEMA_OPTION ) !== self::SCHEMA_VERSION;
	}

	/**
	 * 写入一条审计日志。
	 *
	 * 合规要求：只记录结构化元信息，不落库任何密钥、令牌或完整响应正文。
	 *
	 * @param array $data {
	 *     @type int    $user_id      操作用户 ID。
	 *     @type string $tenant_id    租户标识。
	 *     @type string $provider_id  数据源标识。
	 *     @type string $endpoint     请求端点。
	 *     @type int    $http_status  HTTP 状态码。
	 *     @type int    $duration_ms  耗时（毫秒）。
	 *     @type bool   $cache_hit    是否命中缓存。
	 *     @type string $result       结果：ok|error。
	 *     @type string $message      错误摘要（已脱敏）。
	 * }
	 * @return int|false 插入行 ID，失败返回 false。
	 */
	public static function log( $data ) {
		global $wpdb;

		$defaults = array(
			'created_at'  => current_time( 'mysql' ),
			'user_id'     => get_current_user_id(),
			'tenant_id'   => '',
			'provider_id' => '',
			'endpoint'    => '',
			'http_status' => 0,
			'duration_ms' => 0,
			'cache_hit'   => 0,
			'result'      => 'ok',
			'message'     => '',
		);

		$row = wp_parse_args( $data, $defaults );

		// 字段裁剪，防止超长内容撑爆索引字段。
		$row['tenant_id']   = mb_substr( (string) $row['tenant_id'], 0, 64 );
		$row['provider_id'] = mb_substr( (string) $row['provider_id'], 0, 64 );
		$row['endpoint']    = mb_substr( (string) $row['endpoint'], 0, 255 );
		$row['result']      = in_array( $row['result'], array( 'ok', 'error' ), true ) ? $row['result'] : 'ok';
		$row['message']     = mb_substr( (string) $row['message'], 0, 1000 );
		$row['cache_hit']   = empty( $row['cache_hit'] ) ? 0 : 1;
		$row['http_status'] = (int) $row['http_status'];
		$row['duration_ms'] = (int) $row['duration_ms'];
		$row['user_id']     = (int) $row['user_id'];

		$formats = array(
			'%s', // created_at.
			'%d', // user_id.
			'%s', // tenant_id.
			'%s', // provider_id.
			'%s', // endpoint.
			'%d', // http_status.
			'%d', // duration_ms.
			'%d', // cache_hit.
			'%s', // result.
			'%s', // message.
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$inserted = $wpdb->insert( self::table_name(), $row, $formats );

		return $inserted ? $wpdb->insert_id : false;
	}

	/**
	 * 查询审计日志。
	 *
	 * @param array $args {
	 *     @type int    $limit      返回条数，默认 20。
	 *     @type int    $offset     偏移量，默认 0。
	 *     @type string $tenant_id  按租户过滤。
	 *     @type string $provider_id 按数据源过滤。
	 *     @type string $result     按结果过滤。
	 * }
	 * @return array
	 */
	public static function query( $args = array() ) {
		global $wpdb;

		$args = wp_parse_args(
			$args,
			array(
				'limit'       => 20,
				'offset'      => 0,
				'tenant_id'   => '',
				'provider_id' => '',
				'result'      => '',
			)
		);

		$where  = array( '1=1' );
		$values = array();

		if ( '' !== $args['tenant_id'] ) {
			$where[]  = 'tenant_id = %s';
			$values[] = $args['tenant_id'];
		}
		if ( '' !== $args['provider_id'] ) {
			$where[]  = 'provider_id = %s';
			$values[] = $args['provider_id'];
		}
		if ( '' !== $args['result'] ) {
			$where[]  = 'result = %s';
			$values[] = $args['result'];
		}

		$limit  = min( 200, max( 1, (int) $args['limit'] ) );
		$offset = max( 0, (int) $args['offset'] );

		$sql = 'SELECT * FROM ' . self::table_name() . ' WHERE ' . implode( ' AND ', $where )
			. ' ORDER BY id DESC LIMIT %d OFFSET %d';
		$values[] = $limit;
		$values[] = $offset;

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery
		return $wpdb->get_results( $wpdb->prepare( $sql, $values ), ARRAY_A );
	}

	/**
	 * 统计日志条数。
	 *
	 * @param string $result 可选，按结果过滤。
	 * @return int
	 */
	public static function count( $result = '' ) {
		global $wpdb;

		if ( '' !== $result ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM ' . self::table_name() . ' WHERE result = %s', $result ) );
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . self::table_name() );
	}

	/**
	 * 清理过期日志（默认保留 30 天）。
	 *
	 * 通过 WP-Cron 定时调用，避免日志表无限膨胀。
	 *
	 * @param int $days 保留天数。
	 * @return int 删除行数。
	 */
	public static function prune( $days = 30 ) {
		global $wpdb;

		$days = max( 1, (int) $days );
		$cut  = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return (int) $wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table_name() . ' WHERE created_at < %s', $cut ) );
	}
}
