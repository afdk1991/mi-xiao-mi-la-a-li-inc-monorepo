/**
 * 从源站详情页补全「剧集实况」，产出可供回填与核对的行级快照。
 *
 * 为什么必须再抓一次详情页：
 *   分类列表页卡片上的「全 N 集」是源站的**标称全集**，包含付费墙后面的部分；
 *   只有 /detail 的 SSR 里有 accessible_episode_cnt（源站自己标注的免费可看集数）
 *   与 series_episode_info（已上线集数 / 总集数 / 连载状态）、vid_list（逐集 ID）。
 *   三者缺一，前端展示的集数就一定与用户实际能点开的内容不符。
 *
 * 合规边界：源站 robots.txt 只对 filePath 两级播放路径、/series/、/query/ 及带参的
 * /category 做了 Disallow；详情接口 /detail 未被禁止。本脚本只请求 /detail，限速 + 单条 + 失败即跳过。
 *
 * 用法：
 *   node scripts/enrich_external_episodes.mjs                 # 全量
 *   node scripts/enrich_external_episodes.mjs --limit 12      # 抽样试跑
 *   node scripts/enrich_external_episodes.mjs --conc 6 --gap 60
 *   node scripts/enrich_external_episodes.mjs --fresh         # 忽略断点缓存
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'web', 'public', 'external');
const REPORTS = path.join(ROOT, 'reports');
const CACHE = path.join(REPORTS, 'enrich-cache.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const CATS = ['comic-drama', 'ai-drama'];

function parseArgs(argv) {
  const a = { limit: 0, conc: 6, gap: 60, fresh: false, retries: 2 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--limit') { a.limit = Number(argv[i + 1]); i += 1; }
    else if (argv[i] === '--conc') { a.conc = Number(argv[i + 1]); i += 1; }
    else if (argv[i] === '--gap') { a.gap = Number(argv[i + 1]); i += 1; }
    else if (argv[i] === '--retries') { a.retries = Number(argv[i + 1]); i += 1; }
    else if (argv[i] === '--fresh') a.fresh = true;
  }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 从 SSR 文本里按 anchor 抠出完整 JSON 对象（做花括号配平，能容忍内含转义斜杠）。 */
function pickObject(text, anchor) {
  const start = text.indexOf(anchor);
  if (start < 0) return null;
  const open = text.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) return null;
  try {
    return JSON.parse(text.slice(open, end));
  } catch {
    return null;
  }
}

async function fetchDetail(sid, retries) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20000);
    try {
      const res = await fetch('https://hongguoduanju.com/detail?series_id=' + sid, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (res.status === 404) return { status: 404 };
      if (!res.ok) { lastErr = new Error('HTTP ' + res.status); await sleep(600); continue; }
      const html = await res.text();
      return { status: res.status, html };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      await sleep(600 * (attempt + 1));
    }
  }
  return { status: 0, error: lastErr ? lastErr.message : 'unknown' };
}

/**
 * 判定更新状态。
 * 源站 series_status 语义：1 = 已完结，其它值（连载）按集数缺口兜底判断。
 * 缺口存在时优先信缺口——比状态码更能反映用户实际感知（"更新到哪了"）。
 */
function resolveUpdate(epInfo, totalCnt) {
  const updated = Number(epInfo?.episode_cnt) || 0;
  const total = Number(epInfo?.episode_total_cnt) || totalCnt || 0;
  if (total && updated && updated < total) {
    return { key: 'updating', text: `更新至第 ${updated} 集` };
  }
  if (epInfo?.series_status === 1) return { key: 'completed', text: '已完结' };
  return { key: 'updating', text: updated ? `更新至第 ${updated} 集` : '连载中' };
}

function collect() {
  const out = [];
  for (const cat of CATS) {
    const f = path.join(SRC, cat + '.json');
    if (!existsSync(f)) continue;
    const doc = JSON.parse(readFileSync(f, 'utf8'));
    for (const it of doc.items) {
      const sid = (/series_id=(\d{6,})/.exec(it.detail_url || '') || [])[1];
      if (!sid) continue;
      out.push({ cat, id: it.id, sid, local: it });
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });

  let tasks = collect();
  if (args.limit) tasks = tasks.slice(0, args.limit);

  const cache = new Map();
  if (!args.fresh && existsSync(CACHE)) {
    try {
      for (const r of JSON.parse(readFileSync(CACHE, 'utf8'))) cache.set(r.id, r);
      console.log(`断点缓存命中 ${cache.size} 条，未命中才会真正请求`);
    } catch { /* 缓存损坏就当没有 */ }
  }

  const pending = tasks.filter((t) => !cache.has(t.id));
  console.log(`共 ${tasks.length} 条，待请求 ${pending.length} 条（并发 ${args.conc}，间隔 ${args.gap}ms）\n`);

  const stamp = new Date();
  let done = 0;
  let okN = 0;
  let failN = 0;

  async function worker(queue) {
    for (;;) {
      const t = queue.shift();
      if (!t) return;
      const res = await fetchDetail(t.sid, args.retries);
      let row;
      if (res.status === 404) {
        row = { ...pickMeta(t), ok: false, status: 404, note: '源站 404，判定已下架' };
      } else if (!res.html) {
        row = { ...pickMeta(t), ok: false, status: res.status, note: '请求失败：' + (res.error || '') };
      } else {
        const d = res.html.replace(/\\u002F/g, '/');
        const sd = pickObject(d, '"seriesDetail":{');
        if (!sd) {
          row = { ...pickMeta(t), ok: false, status: res.status, note: 'SSR 未含 seriesDetail' };
        } else {
          const epInfo = sd.series_episode_info || {};
          const accessible = Number(sd.accessible_episode_cnt) || 0;
          const total = Number(epInfo.episode_total_cnt) || Number(sd.episode_cnt) || 0;
          const updated = Number(epInfo.episode_cnt) || 0;
          const vids = Array.isArray(sd.vid_list) ? sd.vid_list : [];
          const upd = resolveUpdate(epInfo, total);
          // 逐集明细：源站本身没有独立集标题，只有「第 N 集」的编号式命名，
          // 因此按源站实际呈现生成，不臆造剧集名。
          const episodeList = [];
          for (let i = 0; i < accessible; i += 1) {
            episodeList.push({
              index: i + 1,
              vid: vids[i] || null,
              title: `第 ${i + 1} 集`,
              playable: true,
            });
          }
          row = {
            cat: t.cat,
            id: t.id,
            sid: t.sid,
            ok: true,
            status: res.status,
            title: String(sd.series_name || '').trim(),
            cover: String(sd.series_cover || '').trim(),
            intro: String(sd.series_intro || '').trim(),
            tags: Array.isArray(sd.tags) ? sd.tags.slice(0, 8) : [],
            accessible_episode_cnt: accessible,
            episode_cnt: updated,
            episode_total_cnt: total,
            series_status: epInfo.series_status ?? null,
            update_status: upd.key,
            update_status_text: upd.text,
            episode_right_text: String(sd.episode_right_text || '').trim(),
            vid_list_len: vids.length,
            episode_list: episodeList,
            claimed: t.local.episodes || 0,
            local_title: t.local.title || '',
            local_cover: t.local.cover_url || '',
            note: '',
          };
        }
      }
      cache.set(t.id, row);
      done += 1;
      if (row.ok) okN += 1; else failN += 1;
      if (done % 100 === 0 || done === pending.length) {
        process.stdout.write(`\r  进度 ${done}/${pending.length}　成功 ${okN}　失败 ${failN}   `);
        writeFileSync(CACHE, JSON.stringify([...cache.values()]), 'utf8');
      }
      await sleep(args.gap);
    }
  }

  function pickMeta(t) {
    return { cat: t.cat, id: t.id, sid: t.sid, claimed: t.local.episodes || 0, local_title: t.local.title || '', local_cover: t.local.cover_url || '' };
  }

  const queue = [...pending];
  await Promise.all(Array.from({ length: Math.min(args.conc, queue.length) }, () => worker(queue)));
  process.stdout.write('\n');

  const rows = tasks.map((t) => cache.get(t.id)).filter(Boolean);
  writeFileSync(CACHE, JSON.stringify(rows), 'utf8');

  const ts = stamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = path.join(REPORTS, `enrich-${ts}.json`);
  writeFileSync(reportPath, JSON.stringify({ started_at: stamp.toISOString(), rows }, null, 1), 'utf8');

  // ---- 汇总 ----
  const ok = rows.filter((r) => r.ok);
  const dead = rows.filter((r) => !r.ok);
  const titleDiff = ok.filter((r) => r.title && r.title !== r.local_title);
  const coverDiff = ok.filter((r) => r.cover && r.cover !== r.local_cover);
  const claimedVsTotal = ok.filter((r) => r.claimed !== r.episode_total_cnt);
  const claimedVsPlayable = ok.filter((r) => r.claimed !== r.accessible_episode_cnt);
  const noVid = ok.filter((r) => (r.episode_list || []).some((e) => !e.vid));

  console.log('\n=== 全量剧集实况核对 ===');
  console.log(`条目总数 ${rows.length}　解析成功 ${ok.length}　不可达 ${dead.length}`);
  console.log('');
  console.log('| 核对项 | 数量 | 说明 |');
  console.log('|---|---|---|');
  console.log(`| 标称 == 源站全集数 | ${ok.length - claimedVsTotal.length} | 差异 ${claimedVsTotal.length} |`);
  console.log(`| 标称 == 真实免费可播 | ${ok.length - claimedVsPlayable.length} | 差异 ${claimedVsPlayable.length}（付费墙导致）|`);
  console.log(`| 本地标题 == 源站标题 | ${ok.length - titleDiff.length} | 差异 ${titleDiff.length} |`);
  console.log(`| 本地封面 == 源站封面 | ${ok.length - coverDiff.length} | 差异 ${coverDiff.length} |`);
  console.log(`| 逐集 vid 齐全 | ${ok.length - noVid.length} | 缺 vid ${noVid.length} |`);

  const statusDist = new Map();
  for (const r of ok) statusDist.set(r.update_status, (statusDist.get(r.update_status) || 0) + 1);
  console.log('\n更新状态分布：', [...statusDist.entries()].map(([k, v]) => `${k}=${v}`).join('  '));

  const playDist = new Map();
  for (const r of ok) playDist.set(r.accessible_episode_cnt, (playDist.get(r.accessible_episode_cnt) || 0) + 1);
  console.log('免费可播集数分布：', [...playDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}集=${v}`).join('  '));

  if (titleDiff.length) {
    console.log('\n标题不一致样例（前 8）：');
    for (const r of titleDiff.slice(0, 8)) console.log(`  ${r.id}  本地「${r.local_title}」→ 源站「${r.title}」`);
  }
  if (claimedVsTotal.length) {
    console.log('\n标称与源站全集不符样例（前 8）：');
    for (const r of claimedVsTotal.slice(0, 8)) console.log(`  ${r.id}  本地 ${r.claimed} → 源站 ${r.episode_total_cnt}`);
  }
  if (dead.length) {
    console.log('\n不可达条目（前 10）：');
    for (const r of dead.slice(0, 10)) console.log(`  ${r.id}  ${r.note}`);
  }

  console.log(`\n快照 → ${path.relative(ROOT, reportPath)}`);
  console.log('下一步：node scripts/apply_free_episodes.mjs --enrich <该文件>');
}

main().catch((e) => { console.error('失败：', e); process.exit(2); });
