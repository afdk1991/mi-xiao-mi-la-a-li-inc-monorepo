/**
 * 全局环境配置
 * - USE_MOCK=true 时全部走本地 Mock
 * - USE_MOCK=false 时走 CloudBase PostgreSQL REST API
 */
// 默认走本地 Mock；在 .env 里设 VITE_USE_MOCK=false 即可切到真实 CloudBase 接口
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

/** CloudBase PG HTTP API 网关（上海区） */
export const BASE_URL = 'https://cs-1-d5g815slocb5a611a.api.tcloudbasegateway.com/v1/rdb/rest';

/** Publishable Key，可暴露在客户端，仅允许匿名读 */
export const PUBLISHABLE_KEY: string =
  // 内置值仅用于开箱即用；轮换 Key 时在 .env 配 VITE_CLOUDBASE_PUBLISHABLE_KEY 即可，无需改代码重新发版
  (import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY as string | undefined) ||
  'eyJhbGciOiJSUzI1NiIsImtpZCI6IjBkNjA2MmRkLTBlNTktNGRiMi1iYTYyLTViNDdlNTE1ZDFkYyJ9.eyJpc3MiOiJodHRwczovL2NzLTEtZDVnODE1c2xvY2I1YTYxMWEuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6ImNzLTEtZDVnODE1c2xvY2I1YTYxMWEiLCJleHAiOjQwOTM4NTIyNDUsImlhdCI6MTc5MDE2OTA0NSwibm9uY2UiOiJUNXhwRkExTFRkS3IxM1p6UG9nTW9nIiwiYXRfaGFzaCI6IlQ1eHBGQTFMVGRLcjEzWnpQb2dNb2ciLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoiY3MtMS1kNWc4MTVzbG9jYjVhNjExYSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.QOs7aVNhZY_vUwyUVCuj4TZAzvuQlfMAej2ueORaDpH38DHYJFqMFscHzDUDcyYg0HkBwJJX5TKE4y8AwpeOHyJBQco-8d1pU_9qJI8EFiAXsbFUf94lU6JvLdcbfFq4hQDxA8tEwJJZ8Zswk-A91ZagM6RJ-LcZTsAGL7Q3QT0oyh7Hd_-74pAPpPQ7-gmInIBZLViGD6UQf2RvjFQpZcjwlY5_jw3XcoA3LlPsp5KxXMOPZFI_LPtNSaLUDC6Qecvw63mMq_Jl1n3WdCXYMqV-9UAAOVbtx54P2FtWe4UF5LyAn1rrbaVWl_VYGYDCr_TipZzhNB2u0sLnbAYJAQ';

export const APP_INFO = {
  name: '优选',
  version: '1.0.0',
};
