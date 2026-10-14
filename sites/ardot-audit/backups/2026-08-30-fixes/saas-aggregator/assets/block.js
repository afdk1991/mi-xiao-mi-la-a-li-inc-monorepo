/* SaaS Aggregator - 区块编辑器脚本（原生 ES5，无需构建步骤）。 */
( function () {
	if ( ! window.wp || ! wp.blocks || ! wp.element ) {
		return;
	}

	var el = wp.element.createElement;
	var SelectControl = wp.components.SelectControl;
	var useBlockProps = wp.blockEditor ? wp.blockEditor.useBlockProps : wp.editor.useBlockProps;
	var InspectorControls = wp.blockEditor ? wp.blockEditor.InspectorControls : wp.editor.InspectorControls;
	var PanelBody = wp.components.PanelBody;

	wp.blocks.registerBlockType( 'saas-aggregator/aggregator', {
		edit: function ( props ) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;

			var blockProps = useBlockProps( {
				className: 'saas-agg-block-edit'
			} );

			var sourceOptions = [
				{ label: '全部数据源', value: 'all' },
				{ label: '网关状态', value: 'gateway_status' },
				{ label: '业务核心', value: 'business_core' },
				{ label: 'AI 洞察', value: 'ai_insights' },
				{ label: '决策分析', value: 'analytics' },
				{ label: '合规审计', value: 'compliance' }
			];

			return [
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: '数据源设置', initialOpen: true },
						el( SelectControl, {
							label: '展示来源',
							value: attributes.source,
							options: sourceOptions,
							onChange: function ( value ) {
								setAttributes( { source: value } );
							}
						} ),
						el( SelectControl, {
							label: '每源条数',
							value: String( attributes.limit ),
							options: [
								{ label: '3', value: '3' },
								{ label: '5', value: '5' },
								{ label: '10', value: '10' }
							],
							onChange: function ( value ) {
								setAttributes( { limit: parseInt( value, 10 ) } );
							}
						} )
					)
				),
				el(
					'div',
					blockProps,
					el( 'p', { className: 'saas-agg-block-hint' }, 'SaaS 聚合器：保存后在前台渲染聚合数据。' )
				)
			];
		},

		save: function () {
			// 动态区块：服务端渲染，前端不保存 HTML。
			return null;
		}
	} );
} )();
