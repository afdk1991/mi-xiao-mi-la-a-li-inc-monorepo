# CloudBase 接入模板代码

按运行环境选择对应模板，环境 ID 均为占位符 `YOUR_ENV_ID`，接入时替换为控制台中的真实 EnvId。

| 模板文件 | 适用场景 | 依赖 |
|---|---|---|
| `web-sdk.ts` | Web / Vue / React / Vite / Taro 前端 | `npm i @cloudbase/js-sdk` |
| `miniprogram.js` | 微信原生 / Taro / uni-app 小程序 | 开发者工具开通云开发 |
| `node-server.js` | NestJS / Express / Koa 后端 | `npm i @cloudbase/node-sdk` |
| `cloudfunction-node/index.js` | Node 云函数 | `@cloudbase/node-sdk` |
| `cloudfunction-python/index.py` | Python 云函数 | 无（标准库） |
| `python-http-api.py` | Python 后端 / 采集脚本 | 无（标准库） |
| `php-cloudapi.php` | WordPress 插件 / PHP 服务 | curl |
| `android-kotlin.kt` | Android / 鸿蒙 | OkHttp（建议） |

## 三条容易踩的坑

1. **存储有两套 API**，用错报 `STORAGE_NOT_EXIST`：
   - 传统 NoSQL 环境 → `app.uploadFile({ cloudPath, filePath })` + `app.getTempFileURL()`
   - PG / pgstore 环境 → `app.storage.from(bucket).upload(key, file)`
   先用 envQuery 确认 `RuntimeBackends`，再选 API。

2. **新增文档返回的 ID 是 `result._id`**，不是 `result.id` / `insertedId`。

3. **安全规则改完有 2–5 分钟缓存延迟**，改完立刻写入可能报
   `DATABASE_PERMISSION_DENIED`，不要误判为规则写错，等几分钟再验。

## 其他官方建议

- 认证用 SDK 内置能力，**不要把登录逻辑搬进云函数**。
- 静态托管上 History 模式 SPA，必须把「404 错误文档」设为 `index.html`，
  否则刷新子路由报 `NoSuchKey`。
- 只初始化一次 app 实例并全局复用，不要每次调用都 `cloudbase.init()`。
- 写操作不要以为 Promise resolve 就等于成功，要检查 `updated` / `deleted` 等返回字段。
