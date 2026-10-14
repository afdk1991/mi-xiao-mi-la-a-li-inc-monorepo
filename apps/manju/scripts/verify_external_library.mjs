/**
 * 外部片单全量「可播性」复验器
 *
 * 为什么需要它：
 *   适配器（能不能抠到真流、能不能 iframe）依赖源站页面结构，源站随时可能改版、
 *   下架作品、换 CDN。之前「2010 条全部覆盖」的结论只在某一时刻成立，
 *   隔一段时间必须重跑，否则线上会出现一批静默失效的条目。
 *
 * 关键设计：**直接调用线上同一个 handler**（api/v1/ext/play 的 onRequestGet）。
 *   不另写一套判定逻辑——否则验的是「我认为它该怎么表现」，
 *   而不是「线上真的会怎么表现」。这里喂假的 Request，走的代码路径与部署后完全一致。
 *
 * 用法：
 *   node scripts/verify_external_library.mjs                    # 全量
 *   node scripts/verify_external_library.mjs --sample 100        # 随机抽样 100 条
 *   node scripts/verify_external_library.mjs --only comic-drama --limit 50
 *   node scripts/verify_external_library.mjs --conc 4 --probe 20 # 顺带抽 20 条真拉流字节
 *   node scripts/verify_external_library.mjs --resume reports/external-verify-xxx.json
 *
 * 对源站的礼貌：受控并发 + 最小间隔 + 失败退避。不要让验证脚本变成压力源。
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MAKERS = path.join(ROOT, 'makers');

/* loadData 按 process.cwd() 找 makers/data，必须在 makers 下运行才与线上一致 */
process.chdir(MAKERS);

/* ------------------------------------------------------------------ *
 * 参数
 * ------------------------------------------------------------------ */
function parseArgs(argv) {
  const a = {
    only: null, limit: 0, sample: 0, conc: 4, gapMs: 120, retries: 1,
    probe: 0, seed: 20261006, out: null, resume: null, quiet: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    const num = (d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    switch (k) {
      case '--only': a.only = String(v).split(',').map((s) => s.trim()).filter(Boolean); i += 1; break;
      case '--limit': a.limit = num(0); i += 1; break;
      case '--sample': a.sample = num(0); i += 1; break;
      case '--conc': a.conc = Math.max(1, num(4)); i += 1; break;
      case '--gap': a.gapMs = Math.max(0, num(120)); i += 1; break;
      case '--retries': a.retries = Math.max(0, num(1)); i += 1; break;
      case '--probe': a.probe = Math.max(0, num(0)); i += 1; break;
      case '--seed': a.seed = num(20261006); i += 1; break;
      case '--out': a.out = v; i += 1; break;
      case '--resume': a.resume = v; i += 1; break;
      case '--quiet': a.quiet = true; break;
      default: break;
    }
  }
  return a;
}

/** 可复现的伪随机（不依赖 Math.random，换机器也能复现同一批抽样）。 */
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * 载入片单 + handler
 * ------------------------------------------------------------------ */
const loadFn = (p) => import(pathToFileURL(p).href);

const index = JSON.parse(
  readFileSync(path.join(MAKERS, 'data', 'external', 'index.json'), 'utf8'),
);
const cats = index.catalogs.map((c) => c.category);

const PLAY = await loadFn(
  path.join(MAKERS, 'cloud-functions', 'api', 'v1', 'ext', 'play', 'index.js'),
);
let PROXY = null;

async function callPlay(cat, id, ep = 0) {
  const qs = `cat=${encodeURIComponent(cat)}&id=${encodeURIComponent(id)}&ep=${ep}`;
  const res = await PLAY.onRequestGet({
    request: new Request(`https://verify.local/api/v1/ext/play?${qs}`),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { mode: 'parse_error', raw: text.slice(0, 200) }; }
}

/** 附带节流的最小间隔：全局串行令牌，避免并发瞬间打爆源站。 */
function createThrottle(gapMs) {
  let last = 0;
  return async () => {
    if (gapMs <= 0) return;
    const wait = last + gapMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
  };
}

/* ------------------------------------------------------------------ *
 * 静态元数据校验（不出网，瞬间完成）
 * ------------------------------------------------------------------ */
const STATIC_RULES = [
  ['id', (it) => typeof it.id === 'string' && it.id.length > 0],
  ['title', (it) => typeof it.title === 'string' && it.title.trim().length > 0],
  ['cover_url', (it) => /^https:\/\//.test(it.cover_url || '')],
  ['detail_url', (it) => /^https:\/\//.test(it.detail_url || '')],
  ['source', (it) => typeof it.source === 'string' && it.source.length > 0],
  ['series_id 可解析', (it) => /series_id=(\d{6,})/.test(it.detail_url || '')],
  ['category 一致', (it, cat) => it.category === cat],
];

function staticCheck(it, cat) {
  const missing = STATIC_RULES.filter(([, fn]) => !fn(it, cat)).map(([n]) => n);
  return missing;
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */
async function main() {
  const args = parseArgs(process.argv);
  const targetCats = args.only ? args.only.filter((c) => cats.includes(c)) : cats;
  if (!targetCats.length) throw new Error(`没有可用分类，现有：${cats.join(', ')}`);

  /* ---- 组装任务队列 ---- */
  const seenId = new Map();
  const dup = [];
  let tasks = [];
  for (const cat of targetCats) {
    const file = path.join(MAKERS, 'data', 'external', `${cat}.json`);
    if (!existsSync(file)) { console.warn(`  ! 缺少数据文件 ${file}`); continue; }
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    const items = (doc && doc.items) || [];
    items.forEach((it, idx) => {
      const missing = staticCheck(it, cat);
      const sid = (/series_id=(\d{6,})/.exec(it.detail_url || '') || [])[1] || null;
      if (sid && seenId.has(sid)) dup.push({ sid, a: seenId.get(sid), b: `${cat}#${idx} ${it.title}` });
      if (sid) seenId.set(sid, `${cat}#${idx} ${it.title}`);
      tasks.push({ cat, idx, id: it.id, title: it.title, item: it, missing, sid });
    });
  }

  const declaredTotal = (index.catalogs || [])
    .filter((c) => targetCats.includes(c.category))
    .reduce((n, c) => n + (c.total || 0), 0);

  console.log('=== 外部片单复验 ===');
  console.log(`分类：${targetCats.join(', ')}`);
  console.log(`索引声明总数：${declaredTotal}　实际条目：${tasks.length}`);
  if (dup.length) console.log(`⚠ 跨/同分类重复 series_id：${dup.length} 组`);

  const broken = tasks.filter((t) => t.missing.length);
  if (broken.length) {
    console.log(`⚠ 元数据不完整：${broken.length} 条`);
    const byField = new Map();
    for (const t of broken) for (const f of t.missing) byField.set(f, (byField.get(f) || 0) + 1);
    console.log('  字段缺失分布：', [...byField.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
  } else {
    console.log('✓ 元数据字段完整性：全部通过');
  }

  /* ---- 抽样 / 截断 ---- */
  if (args.limit) tasks = tasks.slice(0, args.limit);
  if (args.sample && args.sample < tasks.length) {
    const rnd = mulberry32(args.seed);
    const picked = new Set();
    while (picked.size < args.sample) picked.add(Math.floor(rnd() * tasks.length));
    tasks = [...picked].sort((a, b) => a - b).map((i) => tasks[i]);
  }

  /* ---- resume：跳过已有结论的条目 ---- */
  let results = [];
  if (args.resume) {
    const prev = JSON.parse(readFileSync(args.resume, 'utf8'));
    const done = new Map((prev.results || []).map((r) => [`${r.cat}::${r.id}`, r]));
    results = tasks.map((t) => done.get(`${t.cat}::${t.id}`)).filter(Boolean);
    tasks = tasks.filter((t) => !done.has(`${t.cat}::${t.id}`));
    console.log(`续跑：已完成 ${results.length} 条，待验 ${tasks.length} 条`);
  }

  const total = results.length + tasks.length;
  console.log(`\n开始联网复验 ${tasks.length} 条（并发 ${args.conc}，间隔 ${args.gapMs}ms）…\n`);

  const throttle = createThrottle(args.gapMs);
  let cursor = 0;
  let doneCount = results.length;
  const t0 = Date.now();

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= tasks.length) return;
      const t = tasks[i];
      let body = null;
      let err = null;
      for (let attempt = 0; attempt <= args.retries; attempt += 1) {
        await throttle();
        try {
          body = await callPlay(t.cat, t.id, 0);
          if (body && body.mode) break;
        } catch (e) {
          err = String(e && e.message || e);
        }
        if (attempt < args.retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
      const rec = {
        cat: t.cat, id: t.id, title: t.title, sid: t.sid,
        mode: (body && body.mode) || 'error',
        reason: body && body.reason || null,
        message: body && body.message || err || null,
        sources: (body && body.sources) || [],
        // 源站当前放出多少集可直接播放（"只能播一集"这类问题的核心指标）
        total_playable: body && body.total_playable || 0,
        embed_url: body && body.embed_url || null,
        sandbox: body && body.sandbox || null,
        static_missing: t.missing,
      };
      results.push(rec);
      doneCount += 1;
      if (!args.quiet && (doneCount % 25 === 0 || doneCount === total)) {
        const el = (Date.now() - t0) / 1000;
        const rate = doneCount / el;
        const eta = (total - doneCount) / Math.max(rate, 0.001);
        process.stdout.write(
          `\r  进度 ${doneCount}/${total}（${rate.toFixed(1)} 条/秒，剩余约 ${Math.round(eta)}s）   `,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: args.conc }, worker));
  const elapsed = (Date.now() - t0) / 1000;
  process.stdout.write('\n');

  /* ---- 可选：真拉流字节（证明不是只有地址，而是真能取到数据） ---- */
  let probeResult = null;
  if (args.probe > 0) {
    PROXY = await loadFn(path.join(MAKERS, 'cloud-functions', 'api', 'v1', 'ext', 'proxy', 'index.js'));
    const direct = results.filter((r) => r.mode === 'direct' && r.sources.length);
    const rnd = mulberry32(args.seed + 1);
    const picks = [];
    const used = new Set();
    while (picks.length < Math.min(args.probe, direct.length)) {
      const i = Math.floor(rnd() * direct.length);
      if (used.has(i)) continue;
      used.add(i);
      picks.push(direct[i]);
    }
    probeResult = { checked: picks.length, ok: 0, failed: 0, details: [] };
    console.log(`\n抽 ${picks.length} 条真拉流（经 proxy，Range 前 2KB）…`);
    for (const p of picks) {
      const src = p.sources.find((s) => s.proxied) || p.sources[0];
      const url = new URL(src.proxied || src.url, 'https://verify.local/api/v1/ext/').toString();
      try {
        const res = await PROXY.onRequest({
          request: new Request(url, { headers: { Range: 'bytes=0-2047' } }),
        });
        const buf = Buffer.from(await res.arrayBuffer());
        const ok = res.status >= 200 && res.status < 300 && buf.length > 512;
        probeResult.details.push({
          id: p.id, title: p.title, status: res.status, bytes: buf.length,
          content_type: res.headers.get('content-type'),
          ranges: res.headers.get('accept-ranges') || res.headers.get('content-range') || null,
          ok,
        });
        probeResult[ok ? 'ok' : 'failed'] += 1;
      } catch (e) {
        probeResult.failed += 1;
        probeResult.details.push({ id: p.id, title: p.title, status: -1, error: String(e.message || e), ok: false });
      }
    }
    console.log(`  字节可用性：${probeResult.ok}/${probeResult.checked} 通过`);
  }

  /* ---- 汇总 ---- */
  const byMode = new Map();
  const byReason = new Map();
  const cdnHosts = new Map();
  for (const r of results) {
    byMode.set(r.mode, (byMode.get(r.mode) || 0) + 1);
    if (r.mode === 'blocked') byReason.set(r.reason || 'unknown', (byReason.get(r.reason || 'unknown') || 0) + 1);
    for (const s of r.sources) {
      try {
        const h = new URL(s.url).hostname;
        cdnHosts.set(h, (cdnHosts.get(h) || 0) + 1);
      } catch { /* ignore */ }
    }
  }

  const covered = results.length;
  const directN = byMode.get('direct') || 0;
  const embedN = byMode.get('embed') || 0;
  const blockedN = byMode.get('blocked') || 0;

  console.log('\n──────── 复验结果 ────────');
  console.log(`样本总量        ${covered}`);
  console.log(`direct 站内直播  ${directN}  (${(directN / covered * 100).toFixed(1)}%)`);
  console.log(`embed  iframe     ${embedN}  (${(embedN / covered * 100).toFixed(1)}%)`);
  console.log(`blocked 不可用    ${blockedN}  (${(blockedN / covered * 100).toFixed(1)}%)`);
  if (byMode.get('error')) console.log(`error  请求异常   ${byMode.get('error')}`);
  if (byMode.get('parse_error')) console.log(`响应非 JSON      ${byMode.get('parse_error')}`);
  console.log(`耗时             ${elapsed.toFixed(1)}s（${(covered / elapsed).toFixed(1)} 条/秒）`);
  if (cdnHosts.size) {
    console.log('流地址主机分布：', [...cdnHosts.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
  }
  if (byReason.size) {
    console.log('blocked 原因分布：', [...byReason.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
  }

  /* ---- 可选集数分布：回答「是不是只能播一集」 ---- */
  const playable = results.filter((r) => r.mode === 'direct');
  const byEpisodeCount = new Map();
  for (const r of playable) {
    const n = r.total_playable || 0;
    byEpisodeCount.set(n, (byEpisodeCount.get(n) || 0) + 1);
  }
  const multi = playable.filter((r) => (r.total_playable || 0) > 1).length;
  if (byEpisodeCount.size) {
    console.log(
      '\n可选集数分布：',
      [...byEpisodeCount.entries()].sort((a, b) => a[0] - b[0])
        .map(([k, v]) => `${k}集=${v}`).join('  '),
    );
    console.log(
      `多集可播：${multi}/${playable.length}（${(multi / playable.length * 100).toFixed(1)}%）`,
    );
  }

  const failures = results.filter((r) => r.mode !== 'direct');
  if (failures.length) {
    console.log(`\n非 direct 条目 ${failures.length} 条，前 25 条：`);
    for (const f of failures.slice(0, 25)) {
      console.log(`  [${f.cat}] ${f.id} ${f.mode}${f.reason ? '/' + f.reason : ''} :: ${(f.title || '').slice(0, 28)}`);
    }
  }

  /* ---- 断言：这是「复验」而非「巡检」，regression 要能被 CI 抓住 ---- */
  const regression = directN / Math.max(covered, 1) < 0.95;
  console.log(
    regression
      ? `\n✗ direct 覆盖率 ${(directN / Math.max(covered, 1) * 100).toFixed(1)}% 低于 95% 阈值，需要排查适配器`
      : `\n✓ direct 覆盖率 ${(directN / Math.max(covered, 1) * 100).toFixed(1)}%，达到 95% 阈值`,
  );

  /* ---- 落盘 ---- */
  const dir = path.join(ROOT, 'reports');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = args.out || path.join(dir, `external-verify-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify({
    checked_at: new Date().toISOString(),
    scope: targetCats,
    declared_total: declaredTotal,
    actual_items: total,
    elapsed_sec: Number(elapsed.toFixed(1)),
    summary: {
      total: covered, direct: directN, embed: embedN, blocked: blockedN,
      error: byMode.get('error') || 0,
      direct_rate: Number((directN / Math.max(covered, 1)).toFixed(4)),
      cdn_hosts: [...cdnHosts.entries()],
      blocked_reasons: [...byReason.entries()],
      playable_episodes: [...byEpisodeCount.entries()].sort((a, b) => a[0] - b[0]),
      multi_episode_rate: Number((multi / Math.max(playable.length, 1)).toFixed(4)),
    },
    duplicate_series_id: dup,
    static_broken: broken.map((t) => ({ cat: t.cat, id: t.id, missing: t.missing })),
    probe: probeResult,
    results,
  }, null, 2), 'utf8');
  console.log(`\n报告已写入 ${path.relative(ROOT, outFile)}`);

  process.exit(regression ? 1 : 0);
}

main().catch((e) => {
  console.error('复验失败：', e);
  process.exit(2);
});
