/**
 * X-User-Id 解析与校验（用户态接口：favorites / history）。
 *
 * 演示版以请求头区分用户（原 FastAPI 版为 JWT bearer，Makers 演示版简化为请求头标识）。
 * 生产环境应替换为正式鉴权（JWT / Makers Agents），届时本模块可整体下线。
 *
 * 本文件为纯函数、零外部依赖，便于独立单元测试。
 */
// 仅允许安全字符，长度 1-64，杜绝 "/"、控制字符等可用于 Blob key 注入 / 路径穿越的字符；
// 同时禁止 ".." 子串，避免 uid=".." 使 users/../favorites 形成路径穿越。
export const UID_RE = /^[A-Za-z0-9._-]{1,64}$/;

export function uidOf(context) {
  const raw = (context.request.headers.get('X-User-Id') || '').trim().slice(0, 64);
  if (!UID_RE.test(raw) || raw.includes('..')) return '';
  return raw;
}
