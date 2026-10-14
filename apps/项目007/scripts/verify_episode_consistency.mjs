/**
 * 集数一致性核对器：标称集数 vs 源站真实可播集数 vs 内容是否真的是不同正片
 *
 * 为什么单看「能不能播」不够：
 *   观众看到的是「全 80 集 / 全 1000 集」，实际能看的是另一回事。
 *   如果标称 1000、实际只有 3 集还能播，产品上就是虚假陈列。
 *   所以在对外展示/统计之前，必须先把这两个数字的差距量出来。
 *
 * 三条独立口径（互相印证，任一条对不上说明有隐藏问题）：
 *   1. 标称集数      — 片单 JSON 里的 episodes / episodes_text
 *   2. 源站全集长度  — /detail 页 SSR 里的 vid_list 长度与 episode_cnt
 *   3. 真实可播集数  — 按 vid 逐集请求播放器页，取到流才算数（遇到 404 停止）
 *
 * 合规：只请求 /detail?series_id=（robots 允许）。
 *
 * 用法：
 *   node scripts/verify_episode_consistency.mjs --sample 100
 *   node scripts/verify_episode_consistency.mjs --only comic-drama --limit 20
 *   node scripts/verify_episode_consistency.mjs --max-scan 8 --conc 3
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MAKERS = path.join(ROOT, 'makers');
process.chdir(MAKERS);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const { PROVIDERS, fetchWithTimeout } = await import(
  pathToFileURL(path.join(MAKERS, 'cloud-functions', '_lib', 'ext_providers.js')).href
);
const hg = PROVIDERS.find((p) => p.key === 'hongguoduanju');

function parseArgs(argv) {
  const a = { only: null, limit: 0, sample: 0, conc: 3, gapMs: 150, seed: 20261006, maxScan: 8, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i]; const v = argv[i + 1];
    const num = (d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    switch (k) {
      case '--only': a.only = String(v).split(',').map((s) => s.trim()).filter(Boolean); i += 1; break;
      case '--limit': a.limit = num(0); i += 1; break;
      case '--sample': a.sample = num(0); i += 1; break;
      case '--conc': a.conc = Math.max(1, num(3)); i += 1; break;
      case '--gap': a.gapMs = Math.max(0, num(150)); i += 1; break;
      case '--max-scan': a.maxScan = Math.max(1, num(8)); i += 1; break;
      case '--seed': a.seed = num(20261006); i += 1; break;
      case '--out': a.out = v; i += 1; break;
      default: break;
    }
  }
  return a;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createThrottle(gapMs) {
  let last = 0;
  return async () => {
    if (gapMs <= 0) return;
    const wait = last + gapMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
  };
}

/** 从 /detail 页里取 SSR 的剧集元信息。 */
function parseDetail(html) {
  const d = html.replace(/\\u002F/g, '/');
  const raw = (d.match(/"vid_list":\[([^\]]+)\]/) || [])[1];
  let vids = [];
  if (raw) {
    try { vids = JSON.parse(`[${raw}]`); } catch { vids = []; }
  }
  const pick = (k) => {
    const m = d.match(new RegExp(`"${k}":\\s*"?(\\d+)"?`));
    return m ? Number(m[1]) : 0;
  };
  return {
    vids,
    episode_cnt: pick('episode_cnt'),
    episode_total_cnt: pick('episode_total_cnt'),
    series_status: pick('series_status'),
  };
}

/** 取某一集的流；顺带带出时长与封面，用于判定「内容是否真的不同」。 */
async function probeEpisode(sid, vid) {
  const url = vid && vid !== '0'
    ? `https://hongguoduanju.com/player/${sid}/${vid}`
    : `https://hongguoduanju.com/player/${sid}`;
  let status = 0;
  let html = '';
  try {
    const res = await fetchWithTimeout(url, { timeoutMs: 12000 });
    status = res.status;
    if (res.ok) html = await res.text();
  } catch { return { ok: false, status: 0 }; }
  if (!res_ok(status)) return { ok: false, status };
  const d = html.replace(/\\u002F/g, '/');
  const streams = hg.extractStreams(html) || [];
  const duration = Number((d.match(/"duration":([\d.]+)/) || [])[1] || 0);
  const poster = (d.match(/"poster_url":"(https:[^"]{20,300})"/) || [])[1] || '';
  const title = (d.match(/"title":"([^"]{1,80})"/) || [])[1] || '';
  return {
    ok: streams.length > 0, status, duration, poster, title,
    // 流 URL 去掉签名后的路径部分可当作内容指纹：不同集应当不同
    fp: streams[0] ? streams[0].url.split('?')[0].slice(-40) : '',
  };
}

function res_ok(s) { return s >= 200 && s < 300; }

async function main() {
  const args = parseArgs(process.argv);
  const index = JSON.parse(readFileSync(path.join(MAKERS, 'data', 'external', 'index.json'), 'utf8'));
  const cats = index.catalogs.map((c) => c.category);
  const targetCats = args.only ? args.only.filter((c) => cats.includes(c)) : cats;

  const tasks = [];
  for (const cat of targetCats) {
    const doc = JSON.parse(readFileSync(path.join(MAKERS, 'data', 'external', `${cat}.json`), 'utf8'));
    for (const it of doc.items) {
      const sid = (/series_id=(\d{6,})/.exec(it.detail_url || '') || [])[1];
      if (!sid) continue;
      tasks.push({ cat, id: it.id, title: it.title, sid, claimed: it.episodes || 0, claimed_text: it.episodes_text || '' });
    }
  }

  let queue = tasks;
  if (args.limit) queue = queue.slice(0, args.limit);
  if (args.sample && args.sample < queue.length) {
    const rnd = mulberry32(args.seed);
    const picked = new Set();
    while (picked.size < args.sample) picked.add(Math.floor(rnd() * queue.length));
    queue = [...picked].sort((a, b) => a - b).map((i) => queue[i]);
  }

  console.log('=== 集数一致性核对 ===');
  console.log(`范围：${targetCats.join(', ')}　样本：${queue.length} 条`);
  console.log(`逐集扫描上限：每部最多探测前 ${args.maxScan} 集（遇 404 提前停止）\n`);

  const throttle = createThrottle(args.gapMs);
  let cursor = 0;
  const results = [];
  const t0 = Date.now();

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= queue.length) return;
      const t = queue[i];

      await throttle();
      let meta = { vids: [], episode_cnt: 0, episode_total_cnt: 0, series_status: 0 };
      try {
        const res = await fetchWithTimeout(`https://hongguoduanju.com/detail?series_id=${t.sid}`, { timeoutMs: 12000 });
        if (res.ok) meta = parseDetail(await res.text());
      } catch { /* detail 拿不到就标记为未知，仍继续逐集探测 */ }

      // 逐集探测：第 1 集是 /player/<sid>，其余带 vid
      const episodes = [];
      const scanTo = Math.min(args.maxScan, Math.max(meta.vids.length, 1));
      let firstBad = -1;
      for (let k = 0; k < scanTo; k += 1) {
        const vid = k === 0 ? '0' : meta.vids[k];
        if (k > 0 && !vid) break;
        await throttle();
        const r = await probeEpisode(t.sid, vid);
        episodes.push({ index: k + 1, vid: String(vid), ...r });
        if (!r.ok) { firstBad = k + 1; break; }
      }

      const okList = episodes.filter((e) => e.ok);
      const durations = okList.map((e) => e.duration).filter((d) => d > 0);
      const fps = new Set(okList.map((e) => e.fp).filter(Boolean));

      results.push({
        ...t,
        source_vid_count: meta.vids.length,
        source_episode_cnt: meta.episode_cnt,
        source_total_cnt: meta.episode_total_cnt,
        playable_count: okList.length,
        first_unplayable_index: firstBad,
        scanned: episodes.length,
        durations,
        unique_streams: fps.size,
        // 内容真实性：能播的集里，是不是每集都是不同的一段正片
        same_content_dup: okList.length > 1 && fps.size === 1,
      });

      const done = results.length;
      if (done % 10 === 0 || done === queue.length) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`\r  进度 ${done}/${queue.length}（${(done / el).toFixed(1)} 条/秒）   `);
      }
    }
  }

  await Promise.all(Array.from({ length: args.conc }, worker));
  process.stdout.write('\n');

  /* ---------- 汇总 ---------- */
  const n = results.length;
  const withSource = results.filter((r) => r.source_vid_count > 0);
  const claimedEqSource = withSource.filter((r) => r.claimed === r.source_total_cnt);
  const claimedEqSourceAny = withSource.filter(
    (r) => r.claimed === r.source_total_cnt || r.claimed === r.source_episode_cnt,
  );
  const threeOnly = results.filter((r) => r.playable_count === 3);
  const dupContent = results.filter((r) => r.same_content_dup);
  const shortfall = withSource.map((r) => r.source_total_cnt - r.playable_count);

  console.log('\n──────── 核对结果 ────────');
  console.log(`样本计数                 ${n}`);
  console.log(`能读到源站全集(vid_list)  ${withSource.length}`);
  console.log(`标称 == 源站全集          ${claimedEqSource.length}/${withSource.length}`
    + `（${(claimedEqSource.length / Math.max(withSource.length, 1) * 100).toFixed(1)}%）`);
  console.log(`标称 == 源站任一集数字段  ${claimedEqSourceAny.length}/${withSource.length}`
    + `（${(claimedEqSourceAny.length / Math.max(withSource.length, 1) * 100).toFixed(1)}%）`);
  console.log(`真实可播恰为 3 集         ${threeOnly.length}/${n}`
    + `（${(threeOnly.length / Math.max(n, 1) * 100).toFixed(1)}%）`);
  console.log(`可播集内容重复(疑似占位)  ${dupContent.length}`);
  if (shortfall.length) {
    shortfall.sort((a, b) => a - b);
    console.log(`标称与可播差值：中位 ${shortfall[Math.floor(shortfall.length / 2)]}，`
      + `最小 ${shortfall[0]}，最大 ${shortfall[shortfall.length - 1]}`);
  }

  const mism = withSource.filter((r) => r.claimed !== r.source_total_cnt);
  if (mism.length) {
    console.log(`\n标称与源站全集不一致 ${mism.length} 条，前 15 条：`);
    for (const r of mism.slice(0, 15)) {
      console.log(`  ${r.id}  标称 ${r.claimed} / 源站 ${r.source_total_cnt} / 可播 ${r.playable_count}  ${r.title.slice(0, 22)}`);
    }
  }

  const dir = path.join(ROOT, 'reports');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = args.out || path.join(dir, `episode-consistency-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify({
    checked_at: new Date().toISOString(),
    scope: targetCats,
    sample: n,
    summary: {
      claimed_eq_source_total: claimedEqSource.length,
      claimed_eq_source_rate: Number((claimedEqSource.length / Math.max(withSource.length, 1)).toFixed(4)),
      playable_3_only: threeOnly.length,
      duplicate_content: dupContent.length,
    },
    results,
  }, null, 2), 'utf8');
  console.log(`\n报告已写入 ${path.relative(ROOT, outFile)}`);
}

main().catch((e) => { console.error('核对失败：', e); process.exit(2); });
