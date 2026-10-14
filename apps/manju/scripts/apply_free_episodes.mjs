/**
 * 把源站真实剧集实况回填进片单数据（统一入口）。
 *
 * 为什么保留原始标称字段：
 *   episodes / episodes_text 是采集到的原始标称，属于溯源证据，改掉就无从对账。
 *   核实结论一律写在 playable_* / update_* / episode_list 字段里，前端只认这些。
 *
 * 输入：enrich_external_episodes.mjs 产出的剧集实况快照
 * （含逐集明细、免费可播集数、更新状态、简介与标题/封面校正）
 *
 * 写入目标：web/public/external/*.json（权威源）
 * 之后必须跑 scripts/sync_external_data.mjs 同步到 makers/data/external，云函数才看得到。
 *
 * 用法：
 *   node scripts/apply_free_episodes.mjs                                  # 用最新快照
 *   node scripts/apply_free_episodes.mjs --enrich reports/enrich-xxx.json
 *   node scripts/apply_free_episodes.mjs --check                          # 只对比不写
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPORTS = path.join(ROOT, 'reports');
const SRC = path.join(ROOT, 'web', 'public', 'external');

function parseArgs(argv) {
  const a = { enrich: null, check: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--enrich') { a.enrich = argv[i + 1]; i += 1; }
    else if (argv[i] === '--check') a.check = true;
  }
  return a;
}

function latestEnrich() {
  const files = readdirSync(REPORTS)
    // 只认带时间戳的正式快照，排除 enrich-cache.json —— 它是断点续跑的裸数组，
    // 没有 rows 字段，误选它会让回填静默变成 0 条
    .filter((f) => /^enrich-\d{4}-\d{2}-\d{2}T.*\.json$/.test(f))
    .sort();
  if (!files.length) return null;
  return path.join(REPORTS, files[files.length - 1]);
}

/**
 * 归一到「资源标识」再比对封面。
 * 源站会在 p3-novel / p6-novel / p9-novel 等 CDN 节点之间漂移，也会改 ~tplv 裁剪参数，
 * 但 /novel-pic/<hash> 才是资源本体。按字符串比会把同一张图判成两张，制造大量噪音 diff。
 */
function coverKey(url) {
  if (!url) return '';
  const host = String(url).replace(/^https?:\/\/p\d+-novel\./, '');
  return host.split('~')[0].split('?')[0];
}

/** 展示文案：把「能看几集」放最前，避免用户误以为全片免费。 */
function playableText(row) {
  if (!row.playable) return '暂无免费可播';
  const total = row.episode_total_cnt || row.claimed || 0;
  if (total && total > row.playable) return `免费 ${row.playable} 集 / 全 ${total} 集`;
  return `全 ${row.playable} 集`;
}

async function main() {
  const args = parseArgs(process.argv);
  const file = args.enrich || (existsSync(REPORTS) ? latestEnrich() : null);
  if (!file || !existsSync(file)) {
    throw new Error('未找到剧集实况快照，请先跑 scripts/enrich_external_episodes.mjs');
  }
  const report = JSON.parse(readFileSync(file, 'utf8'));

  console.log('=== 回填源站真实剧集实况 ===');
  console.log(`快照：${path.relative(ROOT, file)}`);
  console.log(`模式：${args.check ? '仅核对（不写入）' : '写入'}\n`);

  const verdict = new Map((report.rows || []).map((r) => [r.id, r]));

  const verifiedAt = new Date().toISOString();
  const stats = {
    hit: 0, unavailable: 0, unknown: 0,
    titleFixed: 0, coverFixed: 0, listFilled: 0, statusFilled: 0, introFilled: 0,
  };
  const perCat = [];

  for (const f of readdirSync(SRC).filter((x) => x.endsWith('.json') && x !== 'index.json')) {
    const fp = path.join(SRC, f);
    const doc = JSON.parse(readFileSync(fp, 'utf8'));
    if (!Array.isArray(doc.items)) continue;
    const before = JSON.stringify(doc);
    let hit = 0;

    for (const it of doc.items) {
      const row = verdict.get(it.id);
      if (!row) { stats.unknown += 1; continue; }

      if (!row.ok) {
        stats.unavailable += 1;
        it.unavailable = true;
        it.playable_text = '来源站已下架';
        it.verified_at = verifiedAt;
        continue;
      }
      if (it.unavailable) delete it.unavailable;
      hit += 1;

      // 标题/封面以源站为准：采集自列表页卡片的 alt 与缩略图地址会漂移
      if (row.title && row.title !== it.title) { it.title = row.title; stats.titleFixed += 1; }
      // 只在资源本体的确变了时才替换，CDN 节点漂移不算
      if (row.cover && coverKey(row.cover) !== coverKey(it.cover_url)) {
        it.cover_url = row.cover;
        stats.coverFixed += 1;
      }

      if (row.intro) { it.intro = row.intro; stats.introFilled += 1; }
      if (Array.isArray(row.tags) && row.tags.length) it.tags = row.tags;

      it.playable_episodes = row.accessible_episode_cnt || 0;
      it.updated_episodes_source = row.episode_cnt || 0;
      it.total_episodes_source = row.episode_total_cnt || row.claimed || 0;
      it.playable_text = playableText({ playable: it.playable_episodes, episode_total_cnt: it.total_episodes_source, claimed: row.claimed });

      if (row.update_status) {
        it.update_status = row.update_status;
        it.update_status_text = row.update_status_text;
        stats.statusFilled += 1;
      }
      // 逐集明细：前端选集条据此渲染，不再用标称值渲染点不开的按钮
      if (Array.isArray(row.episode_list) && row.episode_list.length) {
        it.episode_list = row.episode_list;
        stats.listFilled += 1;
      } else if (it.episode_list) {
        delete it.episode_list;
      }
      it.verified_at = verifiedAt;
    }

    stats.hit += hit;
    perCat.push({ 文件: f, 条目: doc.items.length, 已回填: hit });
    if (!args.check && JSON.stringify(doc) !== before) {
      writeFileSync(fp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    }
  }

  const idxPath = path.join(SRC, 'index.json');
  if (existsSync(idxPath) && !args.check) {
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    idx.verified_at = verifiedAt;
    idx.playable_verified_count = stats.hit;
    idx.verified_scope = '逐集明细 / 免费可播集数 / 更新状态 / 标题 / 封面';
    writeFileSync(idxPath, `${JSON.stringify(idx, null, 2)}\n`, 'utf8');
  }

  console.table(perCat);
  console.log(`\n回填 ${stats.hit} 条`);
  console.log(`  逐集明细      ${stats.listFilled} 条`);
  console.log(`  更新状态      ${stats.statusFilled} 条`);
  console.log(`  简介          ${stats.introFilled} 条`);
  console.log(`  标题校正      ${stats.titleFixed} 条`);
  console.log(`  封面校正      ${stats.coverFixed} 条（仅资源本体变化；CDN 节点漂移不计）`);
  console.log(`  标记已下架    ${stats.unavailable} 条`);
  console.log(`  未能核实      ${stats.unknown} 条`);
  if (!args.check) console.log('\n下一步：node scripts/sync_external_data.mjs');
}

main().catch((e) => { console.error('回填失败：', e.message); process.exit(2); });
