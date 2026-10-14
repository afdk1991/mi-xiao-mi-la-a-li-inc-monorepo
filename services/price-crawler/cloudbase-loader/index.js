// PriceProbe loader：极小入口，运行时从公开 CDN 拉取完整 worker.js 并执行（绕过函数代码包大小/上传限制）。
const http = require('http');
const CODE_URL = 'https://cs-1-d5g815slocb5a611a-1320483685.tcloudbaseapp.com/pp-worker/worker.js';
const TTL = 30000;
let cached = null; // { handler, time }
async function load() {
  const now = Date.now();
  if (cached && now - cached.time < TTL) return cached.handler;
  try {
    const r = await fetch(CODE_URL + '?v=' + Math.floor(now / 1000), { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('load worker HTTP ' + r.status);
    const src = await r.text();
    const m = { exports: {} };
    new Function('module', 'exports', 'require', src)(m, m.exports, require);
    const h = m.exports.handler;
    if (typeof h !== 'function') throw new Error('worker has no handler');
    cached = { handler: h, time: now };
    return h;
  } catch (e) {
    if (cached) return cached.handler; // 拉取失败时回退上一可用版本
    throw e;
  }
}
http.createServer(async (req, res) => {
  try {
    await (await load())(req, res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'loader failed: ' + ((e && e.message) || String(e)) }));
  }
}).listen(process.env.PORT || 9000, () => console.log('priceprobe loader listening'));
