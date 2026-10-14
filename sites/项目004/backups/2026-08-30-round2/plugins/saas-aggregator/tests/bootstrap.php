<?php
/**
 * PHPUnit 引导文件：在缺少完整 WordPress 的环境中，用桩函数模拟必要的 WP API，
 * 以便对 Provider 聚合、缓存、归一化与错误降级做单元测试。
 *
 * 桩函数均带 function_exists 守卫，因此在本体 WordPress 环境中不会覆盖真实函数。
 */

// 插件头部护栏要求。
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/' );
}

// 内存版 option / transient 存储。
$GLOBALS['__options']    = array();
$GLOBALS['__transients'] = array();
$GLOBALS['__filters']    = array();

if ( ! function_exists( 'plugin_dir_path' ) ) {
	function plugin_dir_path( $f ) {
		return rtrim( dirname( $f ), '/' ) . '/';
	}
}
if ( ! function_exists( 'plugin_dir_url' ) ) {
	function plugin_dir_url( $f ) {
		return 'http://example.test/' . basename( dirname( $f ) ) . '/';
	}
}
if ( ! function_exists( 'register_activation_hook' ) ) {
	function register_activation_hook() {}
}
if ( ! function_exists( 'register_deactivation_hook' ) ) {
	function register_deactivation_hook() {}
}
if ( ! function_exists( 'register_uninstall_hook' ) ) {
	function register_uninstall_hook() {}
}
/*
 * 租户解析依赖当前用户 ID。桩环境默认返回 0（未登录），
 * 测试可通过设置 $GLOBALS['__current_user_id'] 模拟已登录用户。
 */
if ( ! function_exists( 'get_current_user_id' ) ) {
	function get_current_user_id() {
		return isset( $GLOBALS['__current_user_id'] ) ? (int) $GLOBALS['__current_user_id'] : 0;
	}
}
if ( ! function_exists( 'sanitize_textarea_field' ) ) {
	function sanitize_textarea_field( $str ) {
		return trim( strip_tags( (string) $str ) );
	}
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action() {}
}
// 插件主文件用 did_action()/doing_action() 判断 plugins_loaded 是否已触发，
// 以便在「同一请求内被激活」时立即完成模块引导。测试桩里没有 WP 的动作系统，
// 这里返回 0 / false，等价于「还没到 plugins_loaded」的正常加载路径。
if ( ! function_exists( 'did_action' ) ) {
	function did_action( $hook_name = '' ) {
		return isset( $GLOBALS['__action_counts'][ $hook_name ] )
			? (int) $GLOBALS['__action_counts'][ $hook_name ]
			: 0;
	}
}
if ( ! function_exists( 'doing_action' ) ) {
	function doing_action( $hook_name = null ) {
		return false;
	}
}
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( $tag, $cb, $priority = 10 ) {
		$GLOBALS['__filters'][ $tag ][ (int) $priority ][] = $cb;
		return true;
	}
}
if ( ! function_exists( 'has_filter' ) ) {
	function has_filter( $tag, $cb = false ) {
		if ( empty( $GLOBALS['__filters'][ $tag ] ) ) {
			return false;
		}
		if ( false === $cb ) {
			return true;
		}
		foreach ( $GLOBALS['__filters'][ $tag ] as $cbs ) {
			if ( in_array( $cb, $cbs, true ) ) {
				return true;
			}
		}
		return false;
	}
}
if ( ! function_exists( 'add_shortcode' ) ) {
	function add_shortcode() {}
}
if ( ! function_exists( 'register_block_type' ) ) {
	function register_block_type() {
		return true;
	}
}
if ( ! function_exists( 'get_bloginfo' ) ) {
	function get_bloginfo() {
		return 'http://example.test';
	}
}

if ( ! function_exists( '__' ) ) {
	function __( $t, $d = '' ) {
		return $t;
	}
}
if ( ! function_exists( '_e' ) ) {
	function _e( $t, $d = '' ) {
		echo $t;
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( $t, $d = '' ) {
		return $t;
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $t ) {
		return htmlspecialchars( (string) $t, ENT_QUOTES );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $t ) {
		return htmlspecialchars( (string) $t, ENT_QUOTES );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $t ) {
		return $t;
	}
}
if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( $t ) {
		return trim( (string) $t );
	}
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $t ) {
		return trim( strip_tags( (string) $t ) );
	}
}
if ( ! function_exists( 'wp_parse_args' ) ) {
	function wp_parse_args( $args, $defaults ) {
		$args    = is_array( $args ) ? $args : array();
		$defaults = is_array( $defaults ) ? $defaults : array();
		return array_merge( $defaults, $args );
	}
}
if ( ! function_exists( 'shortcode_atts' ) ) {
	function shortcode_atts( $pairs, $atts, $shortcode = '' ) {
		$atts = is_array( $atts ) ? $atts : array();
		$out  = array();
		foreach ( $pairs as $name => $default ) {
			$out[ $name ] = array_key_exists( $name, $atts ) ? $atts[ $name ] : $default;
		}
		return $out;
	}
}
if ( ! function_exists( 'wp_enqueue_style' ) ) {
	function wp_enqueue_style( $handle, $src = '', $deps = array(), $ver = false, $media = 'all' ) {
		$GLOBALS['__enqueued_styles'][] = array(
			'handle' => $handle,
			'src'    => $src,
		);
	}
}
if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( $tag, $value ) {
		if ( empty( $GLOBALS['__filters'][ $tag ] ) ) {
			return $value;
		}
		$extra = array_slice( func_get_args(), 2 );
		ksort( $GLOBALS['__filters'][ $tag ] );
		foreach ( $GLOBALS['__filters'][ $tag ] as $cbs ) {
			foreach ( $cbs as $cb ) {
				$value = call_user_func_array( $cb, array_merge( array( $value ), $extra ) );
			}
		}
		return $value;
	}
}
if ( ! function_exists( 'current_time' ) ) {
	function current_time( $f ) {
		return date( 'Y-m-d H:i:s' );
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $maybe ) {
		return abs( (int) $maybe );
	}
}
if ( ! function_exists( 'wp_list_pluck' ) ) {
	function wp_list_pluck( $list, $field, $index_key = null ) {
		$out = array();
		foreach ( (array) $list as $row ) {
			$value = is_object( $row ) ? ( isset( $row->$field ) ? $row->$field : null )
				: ( is_array( $row ) ? ( array_key_exists( $field, $row ) ? $row[ $field ] : null ) : null );
			if ( null !== $index_key ) {
				$key = is_object( $row ) ? ( isset( $row->$index_key ) ? $row->$index_key : null )
					: ( is_array( $row ) ? ( array_key_exists( $index_key, $row ) ? $row[ $index_key ] : null ) : null );
				$out[ $key ] = $value;
			} else {
				$out[] = $value;
			}
		}
		return $out;
	}
}
if ( ! function_exists( 'add_settings_error' ) ) {
	function add_settings_error( $setting = '', $code = '', $message = '', $type = 'error' ) {
		$GLOBALS['__settings_errors'][] = array(
			'setting' => $setting,
			'code'    => $code,
			'message' => $message,
			'type'    => $type,
		);
	}
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $d ) {
		return json_encode( $d );
	}
}
// WordPress 通过 wp-includes/compat.php 保证 mbstring 函数存在；桩环境在此提供回退。
if ( ! function_exists( 'mb_substr' ) ) {
	function mb_substr( $str, $start, $length = null, $encoding = 'UTF-8' ) {
		$str = (string) $str;
		$ar  = preg_split( '//u', $str, -1, PREG_SPLIT_NO_EMPTY );
		if ( false === $ar ) {
			$ar = array();
			$len = strlen( $str );
			for ( $i = 0; $i < $len; $i ++ ) {
				$ar[] = $str[ $i ];
			}
		}
		return implode( '', array_slice( $ar, (int) $start, null === $length ? null : (int) $length ) );
	}
}
if ( ! function_exists( 'get_option' ) ) {
	function get_option( $k, $d = false ) {
		return array_key_exists( $k, $GLOBALS['__options'] ) ? $GLOBALS['__options'][ $k ] : $d;
	}
}
if ( ! function_exists( 'update_option' ) ) {
	function update_option( $k, $v, $a = false ) {
		$GLOBALS['__options'][ $k ] = $v;
		return true;
	}
}
if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( $k ) {
		return array_key_exists( $k, $GLOBALS['__transients'] ) ? $GLOBALS['__transients'][ $k ] : false;
	}
}
if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( $k, $v, $t = 0 ) {
		$GLOBALS['__transients'][ $k ] = $v;
		return true;
	}
}

// HTTP 桩：默认返回 200 + 一条 JSON 数据；测试可重写 $GLOBALS['__http_responder']。
if ( ! function_exists( 'wp_remote_request' ) ) {
	function wp_remote_request( $url, $args = array() ) {
		if ( isset( $GLOBALS['__http_responder'] ) && is_callable( $GLOBALS['__http_responder'] ) ) {
			return call_user_func( $GLOBALS['__http_responder'], $url, $args );
		}
		$body = wp_json_encode(
			array(
				'items' => array(
					array( 'title' => '实时指标', 'value' => '123', 'status' => 'ok' ),
				),
			)
		);
		return array( 'body' => $body, 'response' => array( 'code' => 200 ), 'headers' => array() );
	}
}
if ( ! function_exists( 'wp_remote_retrieve_response_code' ) ) {
	function wp_remote_retrieve_response_code( $r ) {
		return isset( $r['response']['code'] ) ? $r['response']['code'] : 0;
	}
}
if ( ! function_exists( 'wp_remote_retrieve_body' ) ) {
	function wp_remote_retrieve_body( $r ) {
		return isset( $r['body'] ) ? $r['body'] : '';
	}
}

if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		private $code;
		private $msg;
		private $data;
		public function __construct( $code, $msg = '', $data = array() ) {
			$this->code = $code;
			$this->msg  = $msg;
			$this->data = $data;
		}
		public function get_error_code() {
			return $this->code;
		}
		public function get_error_message() {
			return $this->msg;
		}
		public function get_error_data() {
			return $this->data;
		}
	}
}
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $x ) {
		return $x instanceof WP_Error;
	}
}

// 载入插件（注册自动加载器并定义默认设置等）。
require_once dirname( __DIR__ ) . '/saas-aggregator.php';

// 仅当运行于 PHPUnit 时，提供带状态隔离的测试基类（真实 WordPress 下不会定义）。
if ( class_exists( 'PHPUnit\\Framework\\TestCase' ) ) {
	/**
	 * 所有 saas-aggregator 测试用例的基类：每个用例前重置桩状态，保证用例间隔离。
	 */
	class SAAS_Agg_TestCase extends \PHPUnit\Framework\TestCase {

		/**
		 * 通过反射重置 Provider Manager 的静态缓存，避免跨用例污染。
		 */
		protected function reset_manager_cache() {
			if ( class_exists( 'SAAS_Agg_Provider_Manager' ) ) {
				$ref  = new \ReflectionClass( 'SAAS_Agg_Provider_Manager' );
				$prop = $ref->getProperty( 'providers' );
				$prop->setAccessible( true );
				$prop->setValue( null, null );
			}
		}

		public function setUp(): void {
			parent::setUp();
			$GLOBALS['__options']         = array();
			$GLOBALS['__transients']      = array();
			$GLOBALS['__filters']         = array();
			$GLOBALS['__settings_errors'] = array();
			unset( $GLOBALS['__http_responder'] );
			$this->reset_manager_cache();
		}
	}
}
