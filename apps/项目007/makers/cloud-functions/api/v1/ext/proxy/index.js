/**
 * GET /api/v1/ext/proxy —— 外部媒体防盗链代理
 *
 * query: src(必填，需 URL 编码的绝对 https 地址)
 *
 * 为什么需要它：相当多的CDN 按 Referer 做防盗链。直接把外部地址塞给 <video> 时，
 * 请求会带上本站 Referer，源站可能直接返 403。改由云函数代为取流后，
 * 请求不带本站 Referer，行为等同于源站自己的播放器。
 *
 * 三类资源：
 *   - m3u8   → 必须逐行重写内部 URI（分片、EXT-X-KEY、EXT-X-MAP），否则分片仍直连源站
 *   - mp4/webm → 原样转发，支持 Range（拖动进度条依赖它）
 *   - 其他    → 拒绝，避免沦为通用代理
 *
 * 安全：src 必须命中 _lib/ext_providers.js 登记的主机白名单，否则 400。
 */
import { authorizeMedia, fetchWithTimeout, MAX_PROXY_BYTES } from '../../../../_lib/ext_providers.js';

const MEDIA_EXT = /\.(m3u8|mp4|webm|m4s|ts|aac|mp3)(\?|#|$)/i;
/**
 * 不少 CDN（含字节系 VOD）的地址**不带文件扩展名**，
 * 靠 mime_type=video_mp4 之类的查询参数标识类型。只认扩展名会误杀它们。
 */
const MIME_HINT = /[?&]mime_type=video[_-]?(mp4|webm|flv|mpeg|x-msvideo|3gpp)/i;
const PLAYLIST_TYPE = /(application\/(?:vnd\.apple\.)?mpegurl|application\/x-mpegurl|audio\/mpegurl|text\/vtt)/i;
const SAFE_CODECS = new Set(['mp4', 'webm', 'm4s', 'ts', 'aac', 'mp3', 'm3u8']);
/** 上游返回这些类型才放行；其余一律拒绝，避免本函数沦为通用下载代理。 */
const UPSTREAM_MEDIA = /^(video|audio)\//i;

function noStore() {
  return { 'Cache-Control': 'no-store' };
}

function fail(status, message) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', ...noStore() },
  });
}

/** 把代理地址拼出来（相对本项目根，前端 fetch 时同源）。 */
function proxyUrl(abs) {
  return `api/v1/ext/proxy?src=${encodeURIComponent(abs)}`;
}

/**
 * 重写 m3u8 里的每一条 URI。
 * 只动「非注释行」和 URI="..." 属性，其余原样保留，避免破坏 EXT-X-VERSION 等指令。
 */
function rewritePlaylist(text, base) {
  return text.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    if (!line) return raw;

    // EXT-X-KEY / EXT-X-MAP / EXT-X-SESSION-KEY 里的 URI 属性
    if (line.startsWith('#') && /URI\s*=\s*"([^"]+)"/i.test(line)) {
      return line.replace(/URI\s*=\s*"([^"]+)"/i, (_m, u) => {
        let abs;
        try { abs = new URL(u, base).toString(); } catch { return `URI="${u}"`; }
        return `URI="${proxyUrl(abs)}"`;
      });
    }
    if (line.startsWith('#')) return raw;

    let abs;
    try { abs = new URL(line, base).toString(); } catch { return raw; }
    return proxyUrl(abs);
  }).join('\n');
}

export async function onRequest(context) {
  if (!['GET', 'HEAD'].includes(context.request.method)) {
    return fail(405, 'method not allowed');
  }

  const url = new URL(context.request.url);
  const src = url.searchParams.get('src');
  if (!src) return fail(400, 'missing src');

  /* ---------- 白名单：这道墙不能绕 ---------- */
  // 用 authorizeMedia：除源站主机外，还放行已登记的视频 CDN（如 *.qznovelvod.com）
  const auth = authorizeMedia(src);
  if (!auth.ok) return fail(400, `source not allowed: ${auth.message}`);

  const ext = (/\.([a-z0-9]+)(\?|#|$)/i.exec(auth.url.pathname) || [])[1] || '';
  const looksLikeMedia = MEDIA_EXT.test(src) || MIME_HINT.test(src);
  if (!looksLikeMedia || (ext && !SAFE_CODECS.has(ext.toLowerCase()))) {
    return fail(400, 'unsupported media type');
  }

  /* ---------- 取源 ---------- */
  const range = context.request.headers.get('range');
  const upstreamHeaders = {};
  if (range) upstreamHeaders.Range = range;

  let res;
  try {
    res = await fetchWithTimeout(auth.url.toString(), { timeoutMs: 15000, headers: upstreamHeaders });
  } catch {
    return fail(504, 'upstream timeout');
  }

  if (!res.ok) {
    // 403/404 基本就是防盗链或资源过期；用 410 告诉前端不用重试同一地址
    return fail(res.status === 403 || res.status === 404 ? 410 : 502, `upstream ${res.status}`);
  }

  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_PROXY_BYTES) return fail(413, 'media too large');

  const ctype = res.headers.get('content-type') || '';
  const isPlaylist = PLAYLIST_TYPE.test(ctype) || /\.m3u8(\?|#|$)/i.test(auth.url.pathname);

  // 二次校验：上游返回的必须真是媒体。地址形态可骗人，Content-Type 骗不了
  if (!isPlaylist && ctype && !UPSTREAM_MEDIA.test(ctype) && !/octet-stream/i.test(ctype)) {
    return fail(415, `upstream is not media: ${ctype}`);
  }

  const out = new Headers({
    'Cache-Control': 'public, max-age=300',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  });

  if (isPlaylist) {
    const text = await res.text();
    const body = rewritePlaylist(text, auth.url.toString());
    out.set('Content-Type', 'application/vnd.apple.mpegurl; charset=UTF-8');
    return new Response(body, { status: 200, headers: out });
  }

  if (!ctype) {
    const guess = ext.toLowerCase() === 'mp4' ? 'video/mp4' : `video/${ext.toLowerCase()}`;
    out.set('Content-Type', guess);
  } else {
    out.set('Content-Type', ctype);
  }
  for (const h of ['Content-Range', 'Content-Length', 'ETag', 'Last-Modified']) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }

  // 206 必须透传，否则 Range 请求被当成 200，播放器拖动会错乱
  return new Response(res.body, { status: res.status, headers: out });
}
