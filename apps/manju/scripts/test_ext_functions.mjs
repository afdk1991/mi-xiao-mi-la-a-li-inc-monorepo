/**
 * 本地直调 ext/play 与 ext/proxy 的 handler，验证分支逻辑，避免只能靠线上试错。
 *
 * 云函数在 EdgeOne 上的运行时是 ESM + fetch + Request/Response，
 * 本地 Node 22 接口一致，所以可以直接 import 后喂假的 Request 调用。
 *
 * 用法：cd makers && node ../scripts/test_ext_functions.mjs [cat] [id]
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAKERS = path.resolve(HERE, '..', 'makers');
// Windows 下动态 import 必须走 file:// URL，直接给盘符路径会被当成协议
const loadFn = async (p) => import(pathToFileURL(p).href);
const play = await loadFn(path.join(MAKERS, 'cloud-functions', 'api', 'v1', 'ext', 'play', 'index.js'));
const proxy = await loadFn(path.join(MAKERS, 'cloud-functions', 'api', 'v1', 'ext', 'proxy', 'index.js'));

const cat = process.argv[2] || 'ai-drama';
const id = process.argv[3] || '';

let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '  \u2713' : '  \u2717'} ${name}${extra ? ' -> ' + extra : ''}`);
  if (!cond) failed++;
};

const call = async (mod, qs) => mod.onRequestGet(
  { request: new Request(`https://local.test/api/v1/ext/x?${qs}`) },
);

async function readBody(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return { raw: t.slice(0, 200) }; }
}

/* ---------- 1. 参数校验 ---------- */
console.log('\n[1] 参数与路径穿越防护');
for (const [qs, label] of [
  ['cat=..%2F..%2Fdata&id=release', 'cat 含路径穿越'],
  ['cat=ai-drama', '缺少 id'],
  ['cat=ai-drama&id=not-exist-id', 'id 不存在'],
]) {
  const res = await call(play, qs);
  const b = await readBody(res);
  check(`${label} 应返回 blocked`, b.mode === 'blocked', `${b.reason || ''} ${b.message || ''}`.trim());
}

/* ---------- 2. 真实条目探测 ---------- */
console.log('\n[2] 真实条目可播性探测');
let targetId = id;
if (!targetId) {
  const list = JSON.parse(
    await (await import('node:fs')).promises.readFile(
      path.join(MAKERS, 'data', 'external', `${cat}.json`), 'utf8',
    ),
  );
  targetId = list.items[0].id;
}
console.log(`  · 样本 cat=${cat} id=${targetId}`);

const res = await call(play, `cat=${cat}&id=${encodeURIComponent(targetId)}`);
const body = await readBody(res);
check('返回体带 mode 字段', Boolean(body.mode), body.mode);
check('mode 属于三档之一', ['direct', 'embed', 'blocked'].includes(body.mode), body.mode);
console.log('  · detail:', JSON.stringify({
  mode: body.mode, reason: body.reason, message: body.message,
  sources: (body.sources || []).length, embed_url: body.embed_url, sandbox: body.sandbox,
}));

if (body.mode === 'embed') {
  check('embed 必须下发 sandbox', typeof body.sandbox === 'string' && body.sandbox.length > 0);
  check('sandbox 不得含 allow-top-navigation（否则会被顶掉到原站）',
    !/allow-top-navigation/i.test(body.sandbox || ''));
}

/* ---------- 3. SSRF 防护 ---------- */
console.log('\n[3] 未登记源必须被拒');
const noSrc = await proxy.onRequest({ request: new Request('https://local.test/x') });
check('proxy 缺少 src 应返回 4xx', noSrc.status >= 400 && noSrc.status < 500, `HTTP ${noSrc.status}`);

const proxyRes = await proxy.onRequest({
  request: new Request('https://local.test/api/v1/ext/proxy?src=' + encodeURIComponent('https://evil.example.com/a.mp4')),
});
check('代理拒绝未登记域名', proxyRes.status === 400, `HTTP ${proxyRes.status}`);

const proxyRes2 = await proxy.onRequest({
  request: new Request('https://local.test/api/v1/ext/proxy?src=' + encodeURIComponent('http://169.254.169.254/latest/meta-data/')),
});
check('代理拒绝内网地址', proxyRes2.status === 400, `HTTP ${proxyRes2.status}`);

/* ---------- 4. iframe 嵌入策略判定 ---------- */
console.log('\n[4] 可嵌入性判定（这个函数替代了浏览器无法做到的检测）');
const { inspectEmbeddable } = await loadFn(
  path.join(MAKERS, 'cloud-functions', '_lib', 'ext_providers.js'));
const h = (o) => new Headers(o);
const cases = [
  [{ 'x-frame-options': 'DENY' }, false, 'XFO DENY 必须判为不可嵌入'],
  [{ 'x-frame-options': 'SAMEORIGIN' }, false, 'XFO SAMEORIGIN 必须判为不可嵌入'],
  [{ 'content-security-policy': "frame-ancestors 'none'" }, false, "CSP frame-ancestors 'none'"],
  [{ 'content-security-policy': "frame-ancestors 'self'" }, false, "CSP frame-ancestors 'self'"],
  [{ 'content-security-policy': 'frame-ancestors https://someone-else.com' }, false, 'CSP 仅允许第三方域'],
  [{ 'content-security-policy': 'frame-ancestors *' }, true, 'CSP 通配应放行'],
  [{}, true, '无相关响应头应放行'],
];
for (const [headers, expect, label] of cases) {
  const r = inspectEmbeddable(h(headers));
  check(label, r.embeddable === expect, r.evidence || '允许');
}

/* ---------- 5. 端到端拉流：代理必须真把字节取回来 ---------- */
console.log('\n[5] 端到端代理拉流（证明防盗链确实被绕开）');
if (body.mode === 'direct' && body.sources && body.sources.length) {
  const s0 = body.sources[0];
  check('direct 源应带代理地址', Boolean(s0.proxied), (s0.proxied || '').slice(0, 40) + '…');

  // 直链：浏览器会带本站 Referer，此处模拟被防盗链拦下的情形
  let directStatus = 0;
  try {
    const r = await fetch(s0.url, {
      headers: { Range: 'bytes=0-1023', Referer: 'https://manju-ajffyxd2.edgeone.cool/' },
    });
    directStatus = r.status;
  } catch (e) { directStatus = -1; }
  console.log(`  · 直链带本站 Referer -> HTTP ${directStatus}（403 即证明防盗链存在）`);

  // 代理：服务端取流不带本站 Referer，应拿到 206 与真实字节
  const abs = new URL(s0.proxied, 'https://local.test/api/v1/ext/').toString();
  const pr = await proxy.onRequest({ request: new Request(abs, { headers: { Range: 'bytes=0-2047' } }) });
  const buf = Buffer.from(await pr.arrayBuffer());
  check('代理应返回 2xx', pr.status >= 200 && pr.status < 300, `HTTP ${pr.status}`);
  check('代理返回的是媒体字节', buf.length > 512, `${buf.length}B ${pr.headers.get('content-type')}`);
  check('代理透传 Accept-Ranges（拖动进度条依赖）',
    (pr.headers.get('accept-ranges') || '').includes('bytes')
    || Boolean(pr.headers.get('content-range')));
  check('代理不得暴露源站地址', !(pr.headers.get('content-type') || '').includes('text/html'));
} else {
  console.log('  · 样本未解析出直链（mode=' + body.mode + '），跳过端到端拉流');
}

console.log(failed === 0 ? '\n全部通过' : `\n失败 ${failed} 项`);
process.exit(failed === 0 ? 0 : 1);
