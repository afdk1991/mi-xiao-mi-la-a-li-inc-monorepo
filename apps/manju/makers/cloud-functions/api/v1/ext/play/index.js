/**
 * GET /api/v1/ext/play —— 外部片单「可播性探测」
 *
 * query: cat(必填) id(必填) proxy(=1 时下发代理地址)
 *
 * 背景：需求是「外部片单条目必须在站内播放，不许跳原站」。这件事纯前端做不到——
 * 浏览器对于「iframe 被 X-Frame-Options / CSP 静默拦掉」不给任何信号，前端既不知道
 * 该不该嵌，也不知道为什么失败。所以把判断搬到服务端：
 *
 *   1. 按 id 找到条目 → 做白名单校验（防 SSRF）
 *   2. 拉源站页面 → 读 X-Frame-Options / CSP frame-ancestors，判定能否被 iframe 嵌入
 *   3. 顺便从页面里抠 m3u8/mp4 → 能抠到就给出直链（direct，体验最好）
 *   4. 三者皆不可，返回结构化 reason，由前端展示降级说明
 *
 * 返回体恒为 JSON 且 mode 字段恒存在，HTTP 200 / 422 只表示「服务端自身」是否出错，
 * 前端只看 mode 与 reason。
 */
import { json, loadData } from '../../../../_lib/data.js';
import {
  authorize, authorizeMedia, createCache, extractCandidateUrls, extractFromJsonFields,
  fetchWithTimeout, FETCH_TIMEOUT_MS, IFRAME_SANDBOX, inspectEmbeddable, MAX_HTML_BYTES,
} from '../../../../_lib/ext_providers.js';

const CACHE = createCache(5 * 60 * 1000);
const CAT_RE = /^[a-z0-9][a-z0-9_-]{0,40}$/i;
const PLAYABLE_EXT = /\.(m3u8|mp4|webm)(\?|#|$)/i;

/** 安全读取响应体：超过上限立刻停，避免把云函数内存吃满。 */
async function readCapped(res) {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_HTML_BYTES) return { text: '', truncated: true };
  if (!res.body) return { text: await res.text(), truncated: false };
  const reader = res.body.getReader();
  let truncated = false;
  let total = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel().catch(() => {});
      truncated = true;
      break;
    }
    chunks.push(value);
  }
  return { text: new TextDecoder().decode(concatU8(chunks)), truncated };
}

function concatU8(list) {
  if (list.length === 1) return list[0];
  const total = list.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of list) { out.set(c, off); off += c.length; }
  return out;
}

function containerOf(url) {
  if (/\.m3u8(\?|#|$)/i.test(url)) return 'hls';
  if (/\.mp4(\?|#|$)/i.test(url)) return 'mp4';
  if (/\.webm(\?|#|$)/i.test(url)) return 'webm';
  return 'unknown';
}

/** 把直链包装成本站代理地址，用于绕 Referer 防盗链。 */
function toProxied(u) {
  return `api/v1/ext/proxy?src=${encodeURIComponent(u)}`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const cat = (url.searchParams.get('cat') || '').trim();
  const id = (url.searchParams.get('id') || '').trim();

  const bad = (message, status = 400) =>
    json({ mode: 'blocked', reason: 'item_not_found', message, checked_at: Date.now() }, status,
      { 'Cache-Control': 'no-store' });

  if (!cat || !CAT_RE.test(cat)) return bad('cat 参数非法');
  if (!id) return bad('缺少 id 参数');

  const ep = Math.max(0, Number(url.searchParams.get('ep') || 0) || 0);
  const fresh = url.searchParams.get('fresh') === '1';

  const cacheKey = `${cat}::${id}::${ep}`;
  const cached = fresh ? null : CACHE.get(cacheKey);
  if (cached) {
    return json(cached, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  /* ---------- 1. 取条目 ---------- */
  const list = loadData(`external/${cat}.json`);
  const items = (list && list.items) || [];
  const item = items.find((x) => String(x.id) === String(id));
  if (!item) {
    return bad('片单里没有这个条目，可能已下架或 ID 已变更');
  }

  const base = {
    item_id: item.id,
    title: item.title,
    cover_url: item.cover_url,
    detail_url: item.detail_url,
    source_label: item.source_label,
    category_label: item.category_label,
    episodes_text: item.episodes_text,
    duration_text: item.duration_text,
    attribution: (list && list.attribution) || '',
    checked_at: Date.now(),
    ttl: 300,
  };

  /* ---------- 2. 白名单校验 ---------- */
  const auth = authorize(item.detail_url || item.play_url);
  if (!auth.ok) {
    return json({ ...base, mode: 'blocked', reason: auth.code, message: auth.message }, 200,
      { 'Cache-Control': 'no-store' });
  }

  /* ---------- 3. 采集期已带 play_url：直接可用，无需请求源站 ---------- */
  const presetAuth = item.play_url ? authorize(item.play_url) : { ok: false };
  const preset = presetAuth.ok && PLAYABLE_EXT.test(item.play_url) ? item.play_url : null;

  if (preset) {
    const body = {
      ...base,
      mode: 'direct',
      sources: [{
        url: preset,
        proxied: toProxied(preset),
        container: containerOf(preset),
        quality: 'auto',
      }],
    };
    CACHE.set(cacheKey, body);
    return json(body, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  /*
   * ---------- 4. 优先走源站播放器页，抠真实流地址（direct 体验最好） ----------
   *
   * 红果把播放地址藏在 /player/<sid>[/<vid>] 的 SSR 数据里（字段 main_url）。
   * 该地址带 Referer 防盗链（带本站 Referer 会 403），所以同时下发代理地址。
   *
   * ⚠ vid 不等于集序号：播放器页第二段是 vid，序号到 vid 的映射必须先从
   *   第 1 集页面里的「剧集列表」解析出来。直接把 0/1/2 当 vid 传过去会得到 404，
   *   表现就是「每部剧只能播第一集」。
   */
  const sid = auth.provider.seriesId ? auth.provider.seriesId(item, auth.url) : null;

  if (sid && auth.provider.playerUrlForVid) {
    /*
     * 剧集清单优先用入厍时核实过的那份（scripts/enrich_external_episodes.mjs 核对写入）。
     * 命中就省掉「先抽列表再取流」的那一跳：请求数减半、延迟减半，
     * 也不再依赖源站列表页的 DOM 结构。只有清单缺失（比如非常规入厍的条目）
     * 才回落到现场抽取。
     */
    const stored = Array.isArray(item.episode_list) ? item.episode_list : [];
    let episodes = stored.length
      ? stored.map((e) => ({ index: e.index, vid: e.vid })).filter((e) => e.vid)
      : [];
    let listing = null;

    if (!episodes.length && auth.provider.extractEpisodes) {
      listing = await fetchPage(auth.provider, auth.provider.playerUrlForVid(sid, ''));
      episodes = listing.html
        ? auth.provider.extractEpisodes(listing.html, sid)
        : [];
    }

    // ep 是 1 起的集序号（前端选集按钮的下标），越界时回落到最后一集
    const wanted = Math.min(Math.max(ep, 0), Math.max(episodes.length - 1, 0));
    const targetEp = episodes[wanted] || null;

    // 第 1 集且已经抓过列表页时，列表页本身就是这一集的播放器页，可直接复用
    let page = null;
    if (listing && (!targetEp || targetEp.vid === '0')) {
      page = listing;
    } else if (targetEp) {
      page = await fetchPage(auth.provider, auth.provider.playerUrlForVid(sid, targetEp.vid));
    } else {
      page = await fetchPage(auth.provider, auth.provider.playerUrlForVid(sid, ''));
    }

    const streams = page.html && auth.provider.extractStreams
      ? sanitize(auth.provider.extractStreams(page.html))
      : [];

    if (streams.length) {
      const body = {
        ...base,
        mode: 'direct',
        episode: targetEp ? targetEp.index : 1,
        episodes: episodes.map((e) => ({ index: e.index, title: `第 ${e.index} 集` })),
        total_playable: episodes.length,
        sources: streams.map((s) => ({
          url: s.url,
          proxied: toProxied(s.url),
          container: s.container || containerOf(s.url),
          quality: s.quality || 'auto',
          // 已知防盗链：先把代理地址排前面，省掉一次必然失败的直连尝试
          proxied_first: !!auth.provider.antiLeech,
        })),
      };
      CACHE.set(cacheKey, body);
      return json(body, 200, { 'Cache-Control': 'public, max-age=60' });
    }
  }

  /* ---------- 5. 探源站详情页（拿不到真流时的兜底） ---------- */
  const target = auth.url.toString();
  let res;
  try {
    res = await fetchWithTimeout(target, { timeoutMs: FETCH_TIMEOUT_MS });
  } catch (e) {
    const timeout = String(e && e.message || '').includes('TIMEOUT');
    return json({
      ...base,
      mode: 'blocked',
      reason: 'unreachable',
      message: timeout
        ? `源站 ${FETCH_TIMEOUT_MS / 1000} 秒内没有响应，可能暂时不可用`
        : '无法连接源站，请稍后重试',
    }, 200, { 'Cache-Control': 'no-store' });
  }

  if (!res.ok) {
    const reason = res.status === 403 || res.status === 401 ? 'stream_expired' : 'unreachable';
    return json({
      ...base,
      mode: 'blocked',
      reason,
      message: reason === 'stream_expired'
        ? '源站拒绝了该资源的访问（防盗链或需要登录）'
        : `源站返回 HTTP ${res.status}`,
    }, 200, { 'Cache-Control': 'no-store' });
  }

  const frame = inspectEmbeddable(res.headers);
  const { text } = await readCapped(res).catch(() => ({ text: '' }));

  /* ---------- 5. 从页面里抠播放流 ---------- */
  const candidates = [
    ...extractCandidateUrls(text),
    ...extractFromJsonFields(text),
  ].filter((u) => PLAYABLE_EXT.test(u))
    // 页面里抠出的地址是第三方输入，同样要过白名单
    .filter((u) => authorizeMedia(u).ok);

  const sources = dedupe(candidates).slice(0, 6).map((u) => ({
    url: u,
    proxied: toProxied(u),
    container: containerOf(u),
    quality: 'auto',
  }));

  let body;
  if (sources.length) {
    body = { ...base, mode: 'direct', sources };
  } else if (frame.embeddable) {
    body = {
      ...base,
      mode: 'embed',
      embed_url: auth.provider.buildEmbedUrl(item, auth.url),
      sandbox: IFRAME_SANDBOX,
    };
  } else {
    body = {
      ...base,
      mode: 'blocked',
      reason: 'frame_blocked',
      message: `源站明确禁止被嵌入播放（${frame.evidence}），无法在站内呈现`,
    };
  }

  CACHE.set(cacheKey, body);
  return json(body, 200, { 'Cache-Control': 'public, max-age=60' });
}

/**
 * 拉取源站播放器页原文。
 *
 * 与旧实现 tryPlayerPage 的区别：把「拿到的 HTML」而不是「抠出来的流」返回。
 * 多集场景下同一份 HTML 要复用两次——先抽剧集列表（拿 vid），再抽当前集的流地址，
 * 若仍返回流就只能再请求一次。
 */
async function fetchPage(provider, target) {
  try {
    const res = await fetchWithTimeout(target.toString(), { timeoutMs: FETCH_TIMEOUT_MS });
    if (!res.ok) return { html: '', status: res.status };
    const { text } = await readCapped(res).catch(() => ({ text: '' }));
    return { html: text, status: res.status };
  } catch {
    return { html: '', status: 0 };
  }
}

/**
 * 给第三方页面里抠出的流地址做 SSRF 兜底校验。
 *
 * 这些 URL 来自源站 SSR 数据，属于不可信输入：理论上可以把地址指向任意主机，
 * 不校验就等于让 SSRF 借道「适配器」这个伪装的合法出口。
 */
function sanitize(raw) {
  const out = [];
  for (const s of raw || []) {
    if (!s || !s.url) continue;
    if (!authorizeMedia(s.url).ok) continue;
    out.push(s);
  }
  return out.slice(0, 6);
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const u of list) {
    const k = u.split('#')[0];
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}
