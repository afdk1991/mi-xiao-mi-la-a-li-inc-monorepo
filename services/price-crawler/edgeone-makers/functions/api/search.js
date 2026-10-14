// EdgeOne Pages Function: /api/search
// 4 平台（严选/小米有品/苏宁/当当）真实采集 + 清洗去重 + 评分聚合，自包含、零依赖。
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';

const PLATFORM_ORDER = ['jd','taobao','pdd','tmall','vip','suning','douyin','kuaishou','wechat','xiaohongshu','c1688','meituan','jdnow','tbflash','hema','dangdang','dewu','yanxuan','miyoupin','xianyu','zhuanzhuan','tmallglobal','jdglobal','kaola','douyinglobal','temu','shein','tiktokshop','aliexpress','shopee','lazada','amazon','tb_cps','jd_cps'];
const CLOUD = ['yanxuan','miyoupin','suning','dangdang'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RETRY_S = new Set([429, 480, 500, 502, 503, 504]);
async function openRetry(url, headers, retries = 3) {
  for (let a = 0; a < retries; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
      if (RETRY_S.has(r.status)) { await sleep(600 * (a + 1)); continue; }
      return r;
    } catch (e) { if (a === retries - 1) throw e; await sleep(600 * (a + 1)); }
  }
  throw new Error('retries exhausted');
}
const stripTags = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ---------- GBK 动态编码（用于当当关键词），运行时不支持则降级 ----------
let GBK_MAP = null;
function gbkSupported () { try { new TextDecoder('gbk'); return true; } catch (e) { return false; } }
function buildGbk () {
  if (GBK_MAP) return GBK_MAP;
  const dec = new TextDecoder('gbk');
  const bytes = [], pairs = [];
  for (let b1 = 0x81; b1 <= 0xFE; b1++)
    for (let b2 = 0x40; b2 <= 0xFE; b2++) { if (b2 === 0x7F) continue; bytes.push(b1, b2); pairs.push([b1, b2]); }
  const s = dec.decode(new Uint8Array(bytes));
  const map = {};
  for (let i = 0; i < pairs.length; i++) { const ch = s[i]; if (ch && ch !== '\uFFFD' && !(ch in map)) map[ch] = pairs[i]; }
  GBK_MAP = map; return map;
}
function gbkQuote (kw) {
  const map = buildGbk(); let out = '';
  for (const ch of kw) { const p = map[ch]; out += p ? ('%' + p[0].toString(16).toUpperCase() + '%' + p[1].toString(16).toUpperCase()) : encodeURIComponent(ch); }
  return out;
}

// ---------- 严选 ----------
async function yanxuan(keyword, size) {
  const p = new URLSearchParams({ __timestamp: Date.now(), page: 1, sortType: 0, categoryId: 0,
    descSorted: 'true', matchType: 0, floorPrice: -1, upperPrice: -1, stillSearch: 'false',
    searchWordSource: 1, size: 40, keyword, needPopWindow: 'false' });
  const r = await openRetry('https://you.163.com/xhr/search/search.json?' + p,
    { Referer: 'https://you.163.com/search?keyword=x', Accept: 'application/json' });
  if (!r.ok) throw new Error('yx HTTP ' + r.status);
  const items = (await r.json()).data.directly.searcherResult.result;
  const out = [];
  for (const it of items) {
    const price = Number(it.retailPrice || 0); if (price <= 0) continue;
    const counter = Number(it.counterPrice || 0);
    out.push({ platform: 'yanxuan', name: it.name || keyword, price, original_price: counter > price ? counter : 0,
      shop_name: '网易严选', shop_rating: -1, sales: 0, sales_text: '',
      url: `https://you.163.com/item/detail?id=${it.id}`, image: it.primaryPicUrl || it.listPicUrl || '', keyword });
  }
  return out.slice(0, size);
}

// ---------- 小米有品 ----------
async function miyoupin(keyword, size) {
  const payload = [{}, { query: [{ queryName: keyword, queryType: 0, rule: [] }], sortBy: 0, pageIdx: 0,
    strategyInfo: null, filter: null, baseParam: { imei: '', clientVersion: '', ypClient: 3 },
    source: 'searchPage', requestId: '9000870017970302', clientPageId: '015948074073691365',
    recentAddress: null, requestExtraInfo: {}, pageSize: 20 }];
  let lastErr;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://www.xiaomiyoupin.com/mtop/market/search/v2/doSearch', {
        method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json',
          'x-user-agent': 'channel/youpin platform/youpin.pc', 'x-yp-app-source': 'front-PC',
          dtoken: '', referer: 'https://www.xiaomiyoupin.com/search?keyword=x', 'accept-language': 'zh-CN' },
        body: JSON.stringify(payload) });
      if (RETRY_S.has(r.status)) { await sleep(600 * (a + 1)); continue; }
      if (!r.ok) throw new Error('mi HTTP ' + r.status);
      const goods = (await r.json()).data.data.goods;
      const out = [];
      for (const g of goods) {
        const gi = g.data.goodsInfo, pi = gi.priceInfo || {}, single = pi.singlePrice || {};
        const price = Number(single.price || gi.priceMin || 0) / 100; if (price <= 0) continue;
        const orig = Number(gi.marketPrice || pi.marketPrice || 0) / 100;
        out.push({ platform: 'miyoupin', name: gi.name || keyword, price, original_price: orig > price ? orig : 0,
          shop_name: '小米有品', shop_rating: -1, sales: 0, sales_text: '',
          url: `https://www.xiaomiyoupin.com/detail?gid=${gi.gid}`, image: gi.imgSquare || gi.img800s || '', keyword });
      }
      return out.slice(0, size);
    } catch (e) { lastErr = e; await sleep(600 * (a + 1)); }
  }
  throw lastErr || new Error('mi failed');
}

// ---------- 苏宁 ----------
async function suning(keyword, size) {
  const sr = await openRetry('https://search.suning.com/' + encodeURIComponent(keyword) + '/',
    { 'Accept-Language': 'zh-CN', Referer: 'https://www.suning.com/' });
  if (!sr.ok) throw new Error('sn HTTP ' + sr.status);
  const html = await sr.text();
  const cards = [];
  for (const b of html.split(/(?=class="item-wrap[ "])/)) {
    const mc = b.match(/dataPro="\|\|(\d+)\|\|/); if (!mc) continue;
    const mn = b.match(/title-selling-point[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    const mi = b.match(/<img[^>]*src="(\/\/imgservice[^"]+?)"/);
    cards.push({ code: mc[1], vendor: (b.match(/vendor="(\d+)"/) || [])[1] || '',
      brand: (b.match(/brand_id="([\dA-Za-z]+)"/) || [])[1] || '',
      mdm: (b.match(/mdmGroupId="([\w]+)"/) || [])[1] || 'R9003417',
      name: mn ? stripTags(mn[1]) : '', img: mi ? ('https:' + mi[1]) : '' });
  }
  if (!cards.length) return [];
  const info = {};
  for (let i = 0; i < cards.length; i += 10) {
    const group = cards.slice(i, i + 10);
    try {
      const parts = group.map(c => c.code.padStart(18, '0') + '_____' + c.mdm + '_' + c.brand + '__');
      const cb = 'ds' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
      const vendor = group[0].vendor || '0000000000';
      const turl = 'https://ds.suning.com/ds/generalForTile/' + parts.join(',') +
        `-025-2-${vendor}-1--${cb}.jsonp?callback=${cb}`;
      const tr = await openRetry(turl, { Referer: 'https://search.suning.com/' });
      const body = await tr.text();
      const m = body.match(/\((\{[\s\S]*\})\)/);
      for (const r of JSON.parse(m[1]).rs || []) info[r.cmmdtyCode] = [Number(r.price || 0), r.vendorName || ''];
    } catch (e) { /* continue */ }
    await sleep(350);
  }
  const out = [];
  for (const c of cards) {
    const pv = info[c.code.padStart(18, '0')] || [0, ''];
    const price = pv[0]; if (price <= 0) continue;
    out.push({ platform: 'suning', name: c.name || keyword, price, original_price: 0,
      shop_name: pv[1] || '苏宁易购', shop_rating: -1, sales: 0, sales_text: '',
      url: `https://product.suning.com/${c.vendor || '0000000000'}/${c.code}.html`, image: c.img, keyword });
  }
  return out.slice(0, size);
}

// ---------- 当当 ----------
function extractPrice(chunk, markers) {
  for (const mk of markers) {
    const i = chunk.indexOf(mk); if (i < 0) continue;
    const m = chunk.slice(i, i + 260).match(/&yen;\s*([0-9]+(?:\.[0-9]+)?)/);
    if (m) return m[1];
  }
  return '';
}
async function dangdang(keyword, size) {
  const encKey = gbkQuote(keyword);
  const url = `https://search.dangdang.com/?key=${encKey}&act=input&page_index=1`;
  const r = await openRetry(url, { Referer: 'https://search.dangdang.com/' });
  if (!r.ok) throw new Error('dd HTTP ' + r.status);
  const buf = await r.arrayBuffer();
  const html = new TextDecoder('gbk').decode(buf);
  const out = [];
  for (const chunk of html.split('<li')) {
    if (!chunk.includes('class="name"')) continue;
    const nm = chunk.match(/<p class="name"[^>]*>\s*<a\s+title="([^"]*)"\s+href="([^"]+)"/i);
    if (!nm) continue;
    const now = extractPrice(chunk, ['search_now_price', 'price_n']); if (!now) continue;
    const price = Number(now); if (price <= 0) continue;
    const name = (nm[1] || '').trim(); if (!name) continue;
    let u = (nm[2] || '').trim();
    u = u.startsWith('//') ? ('https:' + u) : new URL(u, 'https://search.dangdang.com/').href;
    const pre = extractPrice(chunk, ['search_pre_price', 'price_r']);
    const sm = chunk.match(/<p class="link"[^>]*>\s*<a[^>]*?title="([^"]*)"/i);
    const im = chunk.match(/(?:data-original|src)\s*=\s*["'](\/\/img[^"']+\.(?:jpe?g|png|webp))["']/i);
    out.push({ platform: 'dangdang', name, price, original_price: pre ? Number(pre) : 0,
      shop_name: sm ? (sm[1] || '').trim() : '', shop_rating: -1, sales: 0, sales_text: '',
      url: u, image: im ? ('https:' + im[1]) : '', keyword });
  }
  return out.slice(0, size);
}

// ---------- 清洗 / 聚合（复刻 cleaning/analysis/scoring） ----------
function canonicalName(name) {
  return String(name).replace(/[\s\u3000]+/g, '').replace(/[^\w\u4e00-\u9fff]+/g, '').toLowerCase();
}
function cleanAndDedup(products, dedup) {
  let list = [];
  for (const p of products) {
    p.name = (p.name || '').trim();
    p.price = Math.round(p.price * 100) / 100;
    p.original_price = Math.round((p.original_price || 0) * 100) / 100;
    p.sales = parseInt(p.sales || 0, 10);
    p.shop_rating = Math.round((p.shop_rating == null ? -1 : p.shop_rating) * 10) / 10;
    p.shop_name = (p.shop_name || '').trim();
    if (p.name && p.price > 0) list.push(p);
  }
  if (!dedup) return list;
  const seen = {};
  for (const p of list) {
    const k = p.platform + '|' + canonicalName(p.name);
    if (!(k in seen) || p.price < seen[k].price) seen[k] = p;
  }
  return Object.values(seen);
}
const norm = (v, lo, hi) => hi === lo ? 0.5 : (v - lo) / (hi - lo);
const normInv = (v, lo, hi) => hi === lo ? 1 : 1 - (v - lo) / (hi - lo);
function buildResult(keyword, products) {
  const sorted = products.slice().sort((a, b) => a.price - b.price || b.sales - a.sales);
  const price_trend = sorted.map((p, i) => ({ rank: i + 1, price: p.price, name: p.name, platform: p.platform }));

  const groups = {};
  for (const p of sorted) (groups[p.platform] = groups[p.platform] || []).push(p.price);
  const platform_stats = [];
  for (const pf of PLATFORM_ORDER) {
    const pr = groups[pf]; if (!pr) continue;
    platform_stats.push({ platform: pf, count: pr.length,
      min_price: Math.round(Math.min(...pr) * 100) / 100,
      max_price: Math.round(Math.max(...pr) * 100) / 100,
      avg_price: Math.round((pr.reduce((s, x) => s + x, 0) / pr.length) * 100) / 100 });
  }

  let price_distribution = [];
  if (sorted.length) {
    const prices = sorted.map(p => p.price), lo = Math.min(...prices), hi = Math.max(...prices), B = 8;
    if (hi === lo) price_distribution = [{ range: lo.toFixed(2), min: lo, max: hi, count: sorted.length }];
    else {
      const step = (hi - lo) / B, bins = new Array(B).fill(0);
      for (const pr of prices) bins[Math.min(Math.floor((pr - lo) / step), B - 1)]++;
      for (let i = 0; i < B; i++)
        price_distribution.push({ range: `${Math.round(lo + i * step)}-${Math.round(lo + (i + 1) * step)}`,
          min: Math.round((lo + i * step) * 100) / 100, max: Math.round((lo + (i + 1) * step) * 100) / 100, count: bins[i] });
    }
  }

  // 评分
  let recommendations = [];
  if (sorted.length) {
    const prices = sorted.map(p => p.price);
    const validR = sorted.filter(p => p.shop_rating >= 0).map(p => p.shop_rating);
    const rDef = validR.length ? validR.reduce((s, x) => s + x, 0) / validR.length : 3.0;
    const ratings = sorted.map(p => p.shop_rating >= 0 ? p.shop_rating : rDef);
    const sLog = sorted.map(p => Math.log1p(Math.max(p.sales, 0)));
    const pLo = Math.min(...prices), pHi = Math.max(...prices);
    const rLo = Math.min(...ratings), rHi = Math.max(...ratings);
    const sLo = Math.min(...sLog), sHi = Math.max(...sLog);
    const scored = sorted.map((p, i) => {
      const ps = normInv(prices[i], pLo, pHi), rs = norm(ratings[i], rLo, rHi), ss = norm(sLog[i], sLo, sHi);
      return { p, score: Math.round(100 * (0.45 * ps + 0.30 * rs + 0.25 * ss) * 10) / 10 };
    }).sort((a, b) => b.score - a.score);
    const n = scored.length, top10 = Math.max(1, Math.floor(n * 0.1)), top30 = Math.max(1, Math.floor(n * 0.3));
    scored.forEach((it, rank) => { it.label = rank < top10 ? '性价比之王' : rank < top30 ? '高性价比推荐' : '一般'; });
    recommendations = scored.map((it, i) => ({ rank: i + 1, name: it.p.name, platform: it.p.platform,
      price: it.p.price, shop_rating: it.p.shop_rating, sales: it.p.sales, score: it.score,
      label: it.label, url: it.p.url }));
  }

  return { keyword, total: sorted.length, products: sorted, price_trend, platform_stats,
    price_distribution, recommendations };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type' };

export async function onRequest(ctx) {
  if (ctx.request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS });
  const u = new URL(ctx.request.url);
  const keyword = (u.searchParams.get('keyword') || '').trim();
  let reqP = (u.searchParams.get('platforms') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!reqP.length) reqP = CLOUD.slice();
  if (!keyword)
    return new Response(JSON.stringify({ error: 'missing keyword' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });

  const useCloud = CLOUD.filter(p => reqP.includes(p));
  const source_status = {};
  for (const p of reqP) if (!CLOUD.includes(p)) source_status[p] = 'blocked';

  const fns = { yanxuan, miyoupin, suning, dangdang };
  const entries = await Promise.all(useCloud.map(async p => {
    try { const list = await fns[p](keyword, 20); source_status[p] = list.length ? 'ok' : 'empty'; return list; }
    catch (e) { source_status[p] = 'error:' + (e.message || 'fail'); return []; }
  }));
  let raw = entries.flat();
  // 当当依赖 GBK，运行时不支持则其状态如实标记
  if (useCloud.includes('dangdang') && !gbkSupported()) source_status.dangdang = 'gbk_unsupported';

  const cleaned = cleanAndDedup(raw, true);
  const base = buildResult(keyword, cleaned);
  const result = { ...base, source_mode: 'live · edge function',
    collected_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    source_status, live_platforms: Object.values(source_status).filter(v => v === 'ok').length };

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
}
