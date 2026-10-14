// ============================================================
// CloudBase Android / 鸿蒙接入模板（Kotlin）
// 说明：Android 与鸿蒙无官方原生 SDK，走 HTTP API / REST 调用
// 依据：docs.cloudbase.net — HTTP API / App 集成
// 适用：代驾距离收费计算、APPsp(Android/harmony) 等
// ============================================================

package com.example.cloudbase

import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStreamWriter

object CloudBaseClient {

    // 环境 ID 建议放 buildConfigField 或 local.properties，不要硬编码
    const val ENV_ID = "YOUR_ENV_ID"

    // 网关地址以控制台实际分配为准
    private const val BASE_URL = "https://$ENV_ID.api.tcloudbasegateway.com"

    /**
     * 通用 POST 请求。
     * 生产环境应接入腾讯云 SDK 做签名，并使用 OkHttp/Retrofit 管理连接池。
     */
    fun post(path: String, body: String): String {
        val conn = URL(BASE_URL + path).openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.doOutput = true
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream.bufferedReader(Charsets.UTF_8).readText()
            if (code !in 200..299) throw RuntimeException("CloudBase HTTP $code: $text")
            text
        } finally {
            conn.disconnect()
        }
    }

    /** 写入文档 */
    fun insert(collection: String, doc: String): String =
        post("/v1/document/insert", """
            {"envId":"$ENV_ID","collectionName":"$collection","document":$doc}
        """.trimIndent())

    /** 查询文档 */
    fun find(collection: String, query: String = "{}", limit: Int = 20): String =
        post("/v1/document/find", """
            {"envId":"$ENV_ID","collectionName":"$collection","query":$query,"limit":$limit}
        """.trimIndent())
}

/*
注意事项：
1. Android 端不要内置 SecretKey —— 密钥放服务端/云函数，客户端只调云函数或带签名的临时凭证
2. 网络调用必须放子线程（协程 / IO 线程），不要阻塞主线程
3. 弱网与超时要有明确降级：本地缓存兜底，不能让 App 在无网时不可用
4. 若项目已有旧版客户端在跑，改数据层要考虑老版本兼容
*/
