<?php
// ============================================================
// CloudBase HTTP API 调用模板（PHP / WordPress 插件适用）
// 依据：docs.cloudbase.net — HTTP API
// 适用：项目004 / 项目006 等 WordPress + PHP 场景
// ============================================================

class CloudBaseClient
{
    private string $envId;
    private string $baseUrl;
    private string $secretId;
    private string $secretKey;
    private int $timeout = 30;

    public function __construct(string $envId, string $secretId, string $secretKey)
    {
        $this->envId     = $envId;
        $this->secretId  = $secretId;
        $this->secretKey = $secretKey;
        // 网关地址以控制台实际分配为准
        $this->baseUrl   = "https://{$envId}.api.tcloudbasegateway.com";
    }

    /**
     * 发送 HTTP API 请求。
     * 生产环境应使用腾讯云官方 SDK 做 TC3-HMAC-SHA256 签名。
     */
    private function request(string $path, array $body): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => $this->timeout,
        ]);
        $raw = curl_exec($ch);
        if ($raw === false) {
            throw new RuntimeException('CloudBase request failed: ' . curl_error($ch));
        }
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode($raw, true);
        if ($code >= 400) {
            throw new RuntimeException("CloudBase HTTP {$code}: " . $raw);
        }
        return $data ?? [];
    }

    public function insert(string $coll, array $doc): array
    {
        return $this->request('/v1/document/insert', [
            'envId'          => $this->envId,
            'collectionName' => $coll,
            'document'       => $doc,
        ]);
    }

    public function find(string $coll, array $query = [], int $limit = 20): array
    {
        return $this->request('/v1/document/find', [
            'envId'          => $this->envId,
            'collectionName' => $coll,
            'query'          => $query,
            'limit'          => $limit,
        ]);
    }
}

// —— WordPress 插件中的用法示例 ——
// 建议在插件 Bootstrap 里做一次初始化，全局复用，不要每次请求都 new：
/*
add_action('init', function () {
    $GLOBALS['cb'] = new CloudBaseClient(
        getenv('CLOUDBASE_ENV_ID') ?: 'YOUR_ENV_ID',
        getenv('TENCENTCLOUD_SECRET_ID'),
        getenv('TENCENTCLOUD_SECRET_KEY')
    );
});
*/
