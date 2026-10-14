<?php
/**
 * 数据源：AI 洞察（对应架构文档「智能层 · Python」）。
 *
 * 聚合 Python FastAPI 的 LLM/RAG 检索增强生成与决策辅助结果。
 * 该来源示例以 POST 方式调用（展示不同 Provider 可自定义传输方式）。
 *
 * @package SAAS_Aggregator
 */

// 安全护栏。
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Python 智能层 AI 洞察数据源。
 */
class SAAS_Agg_Providers_AI_Insights extends SAAS_Agg_Provider {

	/**
	 * @var string
	 */
	protected $layer = 'python';

	/**
	 * {@inheritDoc}
	 */
	public function get_id() {
		return 'ai_insights';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label() {
		return __( 'AI 洞察', 'saas-aggregator' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description() {
		return __( 'Python 智能层：LLM/RAG 检索增强生成与决策辅助。', 'saas-aggregator' );
	}

	/**
	 * 取数：POST 到 AI 推理接口（携带租户维度，呼应文档「输入先脱敏」）。
	 *
	 * @param array $cfg   配置。
	 * @param int   $limit 条数。
	 * @return array|WP_Error
	 */
	protected function do_fetch( $cfg, $limit ) {
		$url = SAAS_Agg_API_Client::build_url( $cfg );
		if ( is_wp_error( $url ) ) {
			return $url;
		}
		$query = isset( $cfg['query'] ) && '' !== $cfg['query']
			? (string) $cfg['query']
			: __( '请总结当前租户最值得关注的风险与机会。', 'saas-aggregator' );
		return SAAS_Agg_API_Client::post(
			$url,
			array(
				'query' => $query,
				'top_k' => (int) $limit,
			),
			array(
				'timeout'    => 60,
				'api_key'    => isset( $cfg['api_key'] ) ? $cfg['api_key'] : '',
				'api_secret' => isset( $cfg['api_secret'] ) ? $cfg['api_secret'] : '',
				'tenant_id'  => isset( $cfg['tenant_id'] ) ? $cfg['tenant_id'] : '',
			)
		);
	}

	/**
	 * 将 RAG 响应（{answer, references}）归一化为标准条目。
	 *
	 * @param array $body 解码后的响应。
	 * @return array
	 */
	protected function normalize_response( $body ) {
		if ( ! is_array( $body ) ) {
			return array();
		}
		// 兼容两种后端返回：网关 gRPC 用 references（JSON 字符串），Python HTTP RAG 用 retrieved（数组）。
		$refs = isset( $body['references'] )
			? $body['references']
			: ( isset( $body['retrieved'] ) ? $body['retrieved'] : null );
		// gRPC 经网关返回的 references 是 JSON 字符串，需解码为数组。
		if ( is_string( $refs ) ) {
			$decoded = json_decode( $refs, true );
			if ( JSON_ERROR_NONE === json_last_error() && is_array( $decoded ) ) {
				$refs = $decoded;
			}
		}
		$out = array();
		if ( isset( $body['answer'] ) ) {
			$out[] = $this->normalize_item(
				array(
					'title'  => __( 'RAG 回答', 'saas-aggregator' ),
					'value'  => (string) $body['answer'],
					'status' => 'ok',
					'meta'   => null !== $refs ? array( 'references' => $refs ) : array(),
				)
			);
		}
		if ( null !== $refs && is_array( $refs ) ) {
			foreach ( $refs as $ref ) {
				if ( ! is_array( $ref ) ) {
					continue;
				}
				$out[] = $this->normalize_item(
					array(
						'title'  => __( '引用来源', 'saas-aggregator' ),
						'value'  => isset( $ref['content'] ) ? mb_substr( (string) $ref['content'], 0, 120 ) : '',
						'status' => 'info',
					)
				);
			}
		}
		return $out;
	}

	/**
	 * 演示数据：模拟 RAG/LLM 产出的洞察卡片。
	 *
	 * @param int $limit 条数。
	 * @return array
	 */
	protected function demo_items( $limit ) {
		$items = array(
			array(
				'title'   => __( '客户流失风险预警', 'saas-aggregator' ),
				'value'   => __( '高：12 家租户本周活跃度下降 >30%', 'saas-aggregator' ),
				'status'  => 'error',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '知识库问答命中率', 'saas-aggregator' ),
				'value'   => '92.4%',
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( 'RAG 引用溯源合规', 'saas-aggregator' ),
				'value'   => __( '全部回答均带引用来源', 'saas-aggregator' ),
				'status'  => 'ok',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '待人工复核的生成内容', 'saas-aggregator' ),
				'value'   => '5',
				'status'  => 'warn',
				'updated' => current_time( 'mysql' ),
			),
			array(
				'title'   => __( '模型调用（私有化网关）', 'saas-aggregator' ),
				'value'   => __( 'qwen-plus / 本地 llama3', 'saas-aggregator' ),
				'status'  => 'info',
				'updated' => current_time( 'mysql' ),
			),
		);
		return array_slice( $items, 0, $limit );
	}
}
