<?php
/**
 * 前台展示：短代码 + Gutenberg 区块 + 聚合视图渲染。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 前台控制器。
 */
class SAAS_Agg_Frontend {

	/**
	 * 构造：注册短代码与区块。
	 */
	public function __construct() {
		add_shortcode( 'saas_aggregator', array( $this, 'shortcode' ) );
		add_action( 'init', array( $this, 'register_block' ) );
	}

	/**
	 * 注册服务端渲染的 Gutenberg 区块（无构建步骤，编辑脚本为原生 ES5）。
	 */
	public function register_block() {
		// 兼容老版本：block.json 路径注册。
		$block_json = SAAS_AGG_PLUGIN_DIR . 'block.json';
		if ( file_exists( $block_json ) && function_exists( 'register_block_type' ) ) {
			register_block_type(
				$block_json,
				array(
					'render_callback' => array( $this, 'render_block' ),
				)
			);
		}
	}

	/**
	 * 短代码处理。
	 *
	 * @param array $atts 属性。
	 * @return string
	 */
	public function shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'source' => 'all',
				'limit'  => 5,
			),
			$atts,
			'saas_aggregator'
		);

		return $this->render( $atts['source'], (int) $atts['limit'] );
	}

	/**
	 * 区块服务端渲染。
	 *
	 * @param array $attrs 区块属性。
	 * @return string
	 */
	public function render_block( $attrs ) {
		$attrs = wp_parse_args(
			$attrs,
			array(
				'source' => 'all',
				'limit'  => 5,
			)
		);
		return $this->render( $attrs['source'], (int) $attrs['limit'] );
	}

	/**
	 * 统一渲染入口：聚合数据并输出视图。
	 *
	 * @param string $source 来源 id 或 'all'。
	 * @param int    $limit  每源条数。
	 * @return string
	 */
	public function render( $source = 'all', $limit = 5 ) {
		$limit = max( 1, (int) $limit );

		// 门户：与 REST 同一口径，默认拒绝匿名读取真实租户数据。
		// 演示模式（内置假数据）不受影响，保证演示站开箱可展示。
		$access = class_exists( 'SAAS_Agg_Access' ) ? SAAS_Agg_Access::check( 'frontend' ) : true;
		if ( is_wp_error( $access ) ) {
			return $this->render_access_notice( $access );
		}

		$sources = SAAS_Agg_Provider_Manager::aggregate( $source, $limit );

		// 无可用数据且无错误时的兜底提示。
		if ( empty( $sources ) ) {
			return '<p class="saas-agg-empty">' . esc_html__( '暂无启用的数据源。请到「设置 → SaaS 聚合器」配置。', 'saas-aggregator' ) . '</p>';
		}

		// 加载样式。
		wp_enqueue_style(
			'saas-agg-frontend',
			SAAS_AGG_PLUGIN_URL . 'assets/frontend.css',
			array(),
			SAAS_AGG_VERSION
		);

		ob_start();
		include SAAS_AGG_PLUGIN_DIR . 'templates/aggregator-view.php';
		return ob_get_clean();
	}

	/**
	 * 无查看权限时的前台提示（不输出任何业务数据）。
	 *
	 * @param WP_Error $error 来自 SAAS_Agg_Access::check() 的错误。
	 * @return string
	 */
	private function render_access_notice( $error ) {
		$html = '<p class="saas-agg-empty saas-agg-login-required">' . esc_html( $error->get_error_message() );

		if ( ! self::is_logged_in() && function_exists( 'wp_login_url' ) ) {
			$redirect = '';
			if ( isset( $GLOBALS['wp']->request ) && function_exists( 'home_url' ) ) {
				$redirect = home_url( '/' . ltrim( (string) $GLOBALS['wp']->request, '/' ) );
			}
			$html .= ' <a href="' . esc_url( wp_login_url( $redirect ) ) . '">'
				. esc_html__( '立即登录', 'saas-aggregator' ) . '</a>';
		}

		return $html . '</p>';
	}

	/**
	 * 登录判定（兼容测试桩）。
	 *
	 * @return bool
	 */
	private static function is_logged_in() {
		if ( function_exists( 'is_user_logged_in' ) ) {
			return (bool) is_user_logged_in();
		}
		return function_exists( 'get_current_user_id' ) && get_current_user_id() > 0;
	}
}

/**
 * 架构层 → 前端徽标元信息（供模板使用）。
 *
 * @param string $layer 层标识。
 * @return array {label, class}
 */
function saas_agg_layer_badge( $layer ) {
	$map = array(
		'go'        => array( 'label' => __( '接入层 · Go', 'saas-aggregator' ), 'class' => 'layer-go' ),
		'java'      => array( 'label' => __( '应用层 · Java', 'saas-aggregator' ), 'class' => 'layer-java' ),
		'python'    => array( 'label' => __( '智能层 · Python', 'saas-aggregator' ), 'class' => 'layer-python' ),
		'data'      => array( 'label' => __( '数据层', 'saas-aggregator' ), 'class' => 'layer-data' ),
		'security'  => array( 'label' => __( '安全合规', 'saas-aggregator' ), 'class' => 'layer-security' ),
		'ecommerce' => array( 'label' => __( '电商层 · Node.js', 'saas-aggregator' ), 'class' => 'layer-ecommerce' ),
	);
	return isset( $map[ $layer ] ) ? $map[ $layer ] : array( 'label' => __( '数据源', 'saas-aggregator' ), 'class' => 'layer-unknown' );
}
