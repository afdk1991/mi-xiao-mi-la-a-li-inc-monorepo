/**
 * 外部播放源注册表 —— 唯一的可信边界
 *
 * 存在意义：ext/play 与 ext/proxy 两个云函数都要去访问第三方站点，
 * 若不限定目标，就成了任人驱使的 SSRF 代理。所以：
 *
 *   1. 只有在 HOSTS 里登记的主机名才允许被请求；
 *   2. 每个站点一个适配器，描述「怎么造嵌入地址」和「怎么从页面里抠出播放流」；
 *   3. 禁止 http:// 明文源（只收 https），禁止内网地址。
 *
 * 接入新站点 = 在这里加一项，不需要改任何业务代码。
 */
import { json } from './data.js';

/** 拉取源站页面的超时上限（毫秒）。必须小于 edgeone.json 的 maxDuration*1000。 */
export const FETCH_TIMEOUT_MS = 8000;

/** 首屏 HTML 体积上限，超过就放弃解析，避免把云函数内存吃满。 */
export const MAX_HTML_BYTES = 4 * 1024 * 1024;

/** 代理单段媒体的体积上限（分片一般远小于此，防被用来搬运大文件）。 */
export const MAX_PROXY_BYTES = 64 * 1024 * 1024;

/* ------------------------------------------------------------------ *
 * 通用解析：把页面文本里疑似视频流的地址捞出来
 * ------------------------------------------------------------------ */

/**
 * 从任意文本里抠出可播放地址。
 * 覆盖三种常见形态：裸地址、JSON 字段值、转义过的地址（\/）。
 */
export function extractCandidateUrls(text) {
  const found = new Set();
  const re = /(https?:)?\/\/[^\s"'\\<>)]+?\.(?:m3u8|mp4|webm)(?:[?&#][^\s"'\\<>)]*)?/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    let u = m[0];
    if (u.startsWith('//')) u = 'https:' + u;
    try {
      const abs = new URL(u).toString();
      found.add(abs);
    } catch { /* 非绝对地址，丢弃 */ }
  }
  // 处理 "url":"https:\/\/cdn.xxx\/a.m3u8" 这类被转义的形式
  const unesc = text.replace(/\\\//g, '/');
  if (unesc !== text) {
    for (const u of extractCandidateUrlsRaw(unesc)) found.add(u);
  }
  return [...found];
}

function extractCandidateUrlsRaw(text) {
  const out = new Set();
  const re = /https?:\/\/[^\s"'\\<>)]+?\.(?:m3u8|mp4|webm)(?:[?&#][^\s"'\\<>)]*)?/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    try { out.add(new URL(m[0]).toString()); } catch { /* ignore */ }
  }
  return out;
}

/** 从 JSON 风格字段里尝试再捞一轮（很多站点把流地址放在 JSON 里，HTML 里没有明文后缀）。 */
export function extractFromJsonFields(text) {
  const out = new Set();
  const re = /"(?:play_url|playUrl|play_addr|playAddr|video_url|videoUrl|url|src|hls_url|m3u8_url|dash_url)"\s*:\s*"([^"\\]{8,600})"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const v = m[1];
    if (!/\.(m3u8|mp4|webm)(\?|$)/i.test(v) && !/^https?:\/\//i.test(v)) continue;
    try {
      const u = v.startsWith('http') ? new URL(v) : null;
      if (u) out.add(u.toString());
    } catch { /* ignore */ }
  }
  return [...out];
}

/* ------------------------------------------------------------------ *
 * 站点适配器
 * ------------------------------------------------------------------ */

/**
 * 红果短剧。
 *
 * 实测结论（2026-10-05，本机 curl）：
 *
 * 1. 详情页 /detail?series_id=<id>：200 SSR HTML，无 XFO/CSP、无 frame-buster，
 *    可 iframe 嵌入；但页面里没有明文流地址（播放流走带签名 XHR）。
 *
 * 2. 【关键】robots.txt 里有 "Disallow: /player/ 两级路径" —— 说明存在独立播放器路由。
 *    实测 /player/<series_id>/<集索引> 返回 200，其 SSR 数据里带着
 *    `"main_url":"https://v11-hgweb.qznovelvod.com/..."` 的真实 mp4 地址
 *    （源站把 "/" 转义成 \u002F，必须先还原再提取）。
 *
 * 3. 【关键】该 mp4 有 Referer 防盗链：
 *      不带 Referer      → 206 video/mp4   ✅
 *      带源站 Referer    → 206             ✅
 *      带其他站 Referer  → 403             ❌
 *    浏览器直连必然带本站 Referer → 必然 403，因此**必须**经 ext/proxy 转发
 *    （服务端 fetch 不带 Referer）。故 antiLeech = true，直接下发代理地址。
 *
 * 4. 签名地址实测 3 分钟后仍返回 206；为稳妥，缓存 TTL 取 5 分钟，
 *    并支持 fresh=1 跳过缓存（前端首次失败后带该参数重试）。
 */
const hongguoduanju = {
  key: 'hongguoduanju',
  label: '红果短剧',
  hosts: ['hongguoduanju.com', 'www.hongguoduanju.com'],
  /** 视频 CDN 后缀白名单（proxy 放行用，避免把整个公网放开）。 */
  cdnSuffixes: ['.qznovelvod.com'],
  /** 已知 Referer 防盗链 → 直接下发代理地址，省掉一次必然失败的直连尝试。 */
  antiLeech: true,

  /** 从条目详情地址里取 series_id。 */
  seriesId(item, url) {
    const qs = url.searchParams.get('series_id');
    if (qs) return qs;
    const m = /(?:series|detail)\/(\d{6,})/i.exec(url.pathname || '');
    return m ? m[1] : null;
  },

  /**
   * 播放器页：
   *   第 1 集 = /player/<sid>（无后缀，SSR 里 vid 为真实 vid）
   *   第 N 集 = /player/<sid>/<vid>
   *
   * ⚠ 第二个路径段是 **vid（视频ID），不是集序号**。曾误当作 0/1/2 递增序号传给源站，
   *   结果 ep>=1 一律 404 → 表面上就是「每部剧只能播第 1 集」。
   */
  buildPlayerUrl(item, url, ep = 0) {
    const sid = this.seriesId(item, url);
    if (!sid) return null;
    return `https://hongguoduanju.com/player/${encodeURIComponent(sid)}/${Number(ep) || 0}`;
  },

  /** 已知 vid → 该集的播放器页地址。vid 为 '' / '0' 时返回第 1 集。 */
  playerUrlForVid(sid, vid) {
    const s = encodeURIComponent(String(sid));
    if (!vid || vid === '0') return `https://hongguoduanju.com/player/${s}`;
    return `https://hongguoduanju.com/player/${s}/${encodeURIComponent(String(vid))}`;
  },

  /**
   * 从播放器页里抽出「本剧」的剧集列表。
   *
   * ⚠ 页面上还有大量「推荐位」链接指向别的 series_id（同版式 /player/<其它sid>），
   *   必须按本剧 sid 过滤，否则选集条会混进别的剧。
   * 只看带 href 的可点项：没有 href 的那些是未解锁集（源站用锁图标占位），点了也是 404。
   */
  extractEpisodes(html, sid) {
    if (!html || !sid) return [];
    const d = html.replace(/\\u002F/g, '/');
    const s = String(sid);
    const re = new RegExp(`href="/player/${s}(?:/(\\d{6,}))?"`, 'g');
    const seen = new Set();
    const out = [];
    let m;
    while ((m = re.exec(d)) !== null) {
      const vid = m[1] || '0';
      if (seen.has(vid)) continue;
      seen.add(vid);
      out.push({ index: out.length + 1, vid });
    }
    return out;
  },

  /** 兜底嵌入页：详情页本身。 */
  buildEmbedUrl(_item, url) {
    return url.toString();
  },

  /**
   * 从播放器页 SSR 数据里抠出真实流地址。
   * 命中即升级为 direct，不命中则由调用方降级到 embed。
   */
  extractStreams(html) {
    if (!html) return [];
    const decoded = html.replace(/\\u002F/g, '/');
    const out = [];
    const re = /"main_url":"(https:[^"]{40,2000})"/g;
    let m;
    while ((m = re.exec(decoded)) !== null) {
      const raw = m[1].replace(/\\\//g, '/');
      try {
        const u = new URL(raw);
        if (!u.protocol.startsWith('http')) continue;
        out.push({
          url: u.toString(),
          container: /\.m3u8(\?|$)/i.test(u.pathname) ? 'hls' : 'mp4',
          quality: 'auto',
        });
      } catch { /* 非绝对地址，丢弃 */ }
    }
    return out;
  },
};

/**
 * 通用兜底站点：只用于「外壳 + detail_url」也能工作的开放站点。
 * 默认不开放 —— 新增站点请显式登记，避免无意中放开 SSRF 面。
 */
export const PROVIDERS = [hongguoduanju];

const HOST_INDEX = new Map();
for (const p of PROVIDERS) for (const h of p.hosts) HOST_INDEX.set(h, p);

/** 全部已登记的视频 CDN 后缀（只匹配子域，不匹配根域，避免白名单过宽）。 */
const CDN_SUFFIXES = [];
for (const p of PROVIDERS) for (const s of p.cdnSuffixes || []) CDN_SUFFIXES.push(s.toLowerCase());

/** 是否为已登记的视频 CDN 主机。 */
export function isCdnHost(host) {
  const h = String(host || '').toLowerCase();
  return CDN_SUFFIXES.some((s) => h.endsWith(s));
}

/** 取主机名（小写，去端口）。非法 URL 返回 null。 */
export function hostOf(raw) {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** 查所属适配器；未登记返回 null。 */
export function providerForHost(host) {
  return HOST_INDEX.get(String(host || '').toLowerCase()) || null;
}

/**
 * SSRF 前置校验：必须在发起任何出网请求之前调用。
 * 返回 { ok:true, provider, url } 或 { ok:false, code, message }。
 */
export function authorize(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ''));
  } catch {
    return { ok: false, code: 'host_not_allowed', message: '地址格式非法' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, code: 'host_not_allowed', message: '只允许 https 源站' };
  }
  const host = url.hostname.toLowerCase();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost' || host.endsWith('.local')) {
    return { ok: false, code: 'host_not_allowed', message: '禁止访问内网地址' };
  }
  const provider = providerForHost(host);
  if (!provider) {
    return { ok: false, code: 'no_adapter', message: `源站 ${host} 尚未登记，无法提供站内播放` };
  }
  return { ok: true, provider, url };
}

/**
 * 媒体地址校验（供 ext/proxy 使用）。
 *
 * 比 authorize 多放行「已登记的视频 CDN」——直链来自源站 SSR 数据里的
 * main_url，它们不在 provider.hosts 里，但同属受控白名单。
 * 其余限制（https、禁 IP、禁内网）与 authorize 完全一致。
 */
export function authorizeMedia(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ''));
  } catch {
    return { ok: false, code: 'host_not_allowed', message: '地址格式非法' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, code: 'host_not_allowed', message: '只允许 https 源站' };
  }
  const host = url.hostname.toLowerCase();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost' || host.endsWith('.local')) {
    return { ok: false, code: 'host_not_allowed', message: '禁止访问内网地址' };
  }
  const provider = providerForHost(host);
  if (provider) return { ok: true, provider, url };
  if (isCdnHost(host)) {
    return { ok: true, provider: { key: 'cdn', label: '视频 CDN', hosts: [host] }, url, isCdn: true };
  }
  return { ok: false, code: 'no_adapter', message: `媒体主机 ${host} 未登记` };
}

/**
 * 判断目标页面能否被 iframe 嵌入。
 *
 * 这件事只能在服务端做：浏览器对「被 X-Frame-Options / CSP 拒绝的 iframe」
 * 不报错、也不给 JS 任何信号，前端无法区分「加载成功」和「被策略静默拦掉」。
 * 所以必须由服务端读响应头后把结论下发给前端。
 */
export function inspectEmbeddable(headers) {
  const xfo = (headers.get('x-frame-options') || '').trim().toLowerCase();
  if (xfo === 'deny') {
    return { embeddable: false, evidence: 'X-Frame-Options: DENY' };
  }
  if (xfo === 'sameorigin') {
    return { embeddable: false, evidence: 'X-Frame-Options: SAMEORIGIN' };
  }

  const csp = headers.get('content-security-policy') || '';
  const fa = /frame-ancestors\s+([^;]+)/i.exec(csp);
  if (fa) {
    const tokens = fa[1].trim().toLowerCase().split(/\s+/);
    // 'none' 全禁；出现 'self' 或其他具体域名时，本站域名不在其列即视为禁止
    if (tokens.includes("'none'")) {
      return { embeddable: false, evidence: "Content-Security-Policy: frame-ancestors 'none'" };
    }
    if (!tokens.includes('*') && !tokens.includes('https:') && !tokens.includes('http:')) {
      return { embeddable: false, evidence: `Content-Security-Policy: frame-ancestors ${fa[1].trim()}` };
    }
  }
  return { embeddable: true, evidence: '' };
}

/**
 * iframe sandbox 策略。
 *
 * 红线：绝不能出现 allow-top-navigation。
 * 一旦放开，第三方页面就能把外层顶掉，用户会在无形中被带到原站——
 * 这与「点击条目必须在站内播放、不发生原站跳转」的需求直接冲突。
 */
export const IFRAME_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-presentation',
  'allow-autoplay',
].join(' ');

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

/** 带超时的 fetch，超出即抛 TIMEOUT。 */
export async function fetchWithTimeout(url, { timeoutMs = FETCH_TIMEOUT_MS, headers = {} } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        // 源站普遍按 UA 分流，桌面 UA 更容易拿到完整版页面
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
          + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...headers,
      },
    });
  } catch (e) {
    // 统一成带 TIMEOUT 标记的错误，调用方才能区分「超时」和「连接失败」
    if (e && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      throw new Error(`TIMEOUT after ${timeoutMs}ms: ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** 统一错误响应体：mode 恒为 blocked，前端据此进入降级 UI。 */
export function blockedResponse(body, status = 200, extraHeaders = {}) {
  return json({ mode: 'blocked', checked_at: Date.now(), ...body }, status, {
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
}

/** 简单 TTL 缓存（云函数实例内复用，冷启动后失效，属预期行为）。 */
export function createCache(ttlMs, max = 200) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (Date.now() - hit.at > ttlMs) {
        map.delete(key);
        return null;
      }
      return hit.value;
    },
    set(key, value) {
      if (map.size >= max) map.delete(map.keys().next().value);
      map.set(key, { at: Date.now(), value });
    },
  };
}
