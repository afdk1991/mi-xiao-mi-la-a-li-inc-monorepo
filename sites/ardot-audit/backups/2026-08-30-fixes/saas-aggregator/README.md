# SaaS Aggregator

基于企业级 SaaS 架构文档（接入层 / 应用层 / 智能层 / 数据层 / 安全合规层），将**多个第三方数据源**聚合到 WordPress 中统一展示与管理的插件。

## 功能

- **多源聚合**：内置 5 个数据源 Provider，分别对应三份架构文档中的能力层：
  | Provider | 架构层（文档出处） | 内容 |
  |---|---|---|
  | `gateway_status` | 接入层 · Go | API 网关健康、限流、实时通道状态 |
  | `business_core` | 应用层 · Java | 订单、账务、权限等强一致业务数据 |
  | `ai_insights` | 智能层 · Python | LLM/RAG 检索增强生成与决策辅助 |
  | `analytics` | 数据层 | ClickHouse 聚合分析与 Celery 决策看板 |
  | `compliance` | 安全合规层 | 等保、脱敏、审计留痕与权限状态 |
- **后台配置**：`设置 → SaaS 聚合器` 为每个来源填写接口基地址、路径、API Key/Secret、租户 ID、缓存时长；支持全局默认缓存、演示模式、错误日志开关。
- **统一展示**：短代码 `[saas_aggregator source="all" limit="5"]` 或 Block 编辑器中的「SaaS 聚合器」区块，按来源分组卡片展示，状态色标区分 ok/warn/error/info。
- **错误处理**：任何单源失败不影响其他源；接口异常时自动回退到上一次成功缓存（陈旧数据），保证可用性。
- **缓存机制**：基于 WordPress Transients，按来源+参数哈希缓存；支持手动清空。
- **可扩展**：实现 `SAAS_Agg_Provider_Interface` 即可新增数据源；通过 `saas_agg_providers` 过滤器注册，无需改动核心。
- **编码规范**：遵循 WordPress 编码标准（前缀 `saas_agg_` / 类前缀 `SAAS_Agg_`），全量输出转义（`esc_html`/`esc_attr`/`esc_url`），表单带 nonce 与 `manage_options` 权限校验，密钥不落明文日志。

## 使用

1. 上传至 `wp-content/plugins/saas-aggregator/` 并启用。
2. 到 `设置 → SaaS 聚合器` 填写各第三方接口地址与密钥（未配置且开启演示模式时展示示例数据）。
3. 在文章/页面中插入短代码，或在区块编辑器中添加「SaaS 聚合器」区块。

## 扩展新数据源（示例）

```php
class SAAS_Agg_Providers_My_Source extends SAAS_Agg_Provider {
    protected $layer = 'data';
    public function get_id() { return 'my_source'; }
    public function get_label() { return '我的数据源'; }
    public function get_description() { return '示例。'; }
    protected function do_fetch( $cfg, $limit ) {
        $url = SAAS_Agg_API_Client::build_url( $cfg );
        if ( is_wp_error( $url ) ) return $url;
        return SAAS_Agg_API_Client::get( $url, array(
            'api_key' => isset( $cfg['api_key'] ) ? $cfg['api_key'] : '',
        ) );
    }
    protected function demo_items( $limit ) {
        return array( array( 'title' => '示例', 'value' => '1', 'status' => 'ok' ) );
    }
}

add_filter( 'saas_agg_providers', function ( $list ) {
    $list[] = new SAAS_Agg_Providers_My_Source();
    return $list;
} );
```

## 目录结构

```
saas-aggregator/
├── saas-aggregator.php          # 引导、常量、默认设置、自动加载
├── block.json                   # 区块元信息
├── includes/
│   ├── class-api-client.php      # HTTP 客户端（鉴权/超时/JSON/错误）
│   ├── class-cache.php           # Transient 缓存（含陈旧回退）
│   ├── class-provider-interface.php # Provider 接口 + 抽象基类
│   ├── class-provider-manager.php    # 注册与聚合调度
│   ├── class-settings.php        # 后台设置页
│   ├── class-frontend.php        # 短代码 + 区块 + 渲染
│   └── providers/               # 5 个内置 Provider
├── templates/aggregator-view.php # 聚合展示模板
└── assets/                      # admin/frontend 样式与区块脚本
```
