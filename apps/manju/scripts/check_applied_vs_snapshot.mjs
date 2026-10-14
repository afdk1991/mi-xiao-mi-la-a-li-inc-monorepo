/**
 * 全量一致性校验：把「已回填到片单的字段」与「抓取快照(enrich)」逐条比对，
 * 确认两者完全一致（这是用户对「与实际内容一致」的硬要求）。
 *
 * 校验维度：
 *   - 存活条目：playable_episodes / episode_list 长度与 vid / title / update_status
 *              / total_episodes_source / verified_at 必须与快照一致
 *   - 失效条目：必须标 unavailable，且不得残留误导性的 playable 字段
 *   - 孤儿条目：应用数据里有、快照里没有的（反向）
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPORTS = path.join(ROOT, 'reports');
const SRC = path.join(ROOT, 'web', 'public', 'external');

function latestEnrich() {
  const files = readdirSync(REPORTS)
    .filter((f) => /^enrich-\d{4}-\d{2}-\d{2}T.*\.json$/.test(f))
    .sort();
  return files.length ? path.join(REPORTS, files[files.length - 1]) : null;
}

const problems = [];
function flag(id, cat, field, expect, actual) {
  problems.push({ id, cat, field, expect, actual });
}

const snapPath = latestEnrich();
if (!snapPath) { console.error('未找到 enrich 快照'); process.exit(2); }
const rep = JSON.parse(readFileSync(snapPath, 'utf8'));
const rows = new Map((rep.rows || []).map((r) => [r.id, r]));
console.log(`快照：${path.basename(snapPath)}  行数=${rows.size}`);

const cats = ['ai-drama', 'comic-drama'];
const appliedById = new Map();
for (const cat of cats) {
  const fp = path.join(SRC, `${cat}.json`);
  const doc = JSON.parse(readFileSync(fp, 'utf8'));
  for (const it of doc.items) appliedById.set(it.id, { ...it, _cat: cat });
}

let okCount = 0, deadCount = 0, orphan = 0;
for (const [id, row] of rows) {
  const it = appliedById.get(id);
  if (!it) { flag(id, row.cat, 'MISSING_IN_APPLIED', '存在', '缺失'); continue; }
  if (!row.ok) {
    deadCount += 1;
    if (!it.unavailable && !/下架/.test(it.playable_text || '')) {
      flag(id, row.cat, 'DEAD_NOT_MARKED', 'unavailable=true', `unavailable=${it.unavailable}`);
    }
    if (it.playable_episodes) {
      flag(id, row.cat, 'DEAD_HAS_PLAYABLE', '0/无', `playable_episodes=${it.playable_episodes}`);
    }
    if (Array.isArray(it.episode_list) && it.episode_list.length) {
      flag(id, row.cat, 'DEAD_HAS_LIST', '无 episode_list', `len=${it.episode_list.length}`);
    }
    continue;
  }
  okCount += 1;
  const ep = row.accessible_episode_cnt || 0;
  if (it.playable_episodes !== ep) flag(id, row.cat, 'playable_episodes', ep, it.playable_episodes);
  const list = Array.isArray(it.episode_list) ? it.episode_list : [];
  if (list.length !== ep) flag(id, row.cat, 'episode_list.length', ep, list.length);
  const missingVid = list.filter((e) => !e.vid).length;
  if (missingVid) flag(id, row.cat, 'episode_list.vid缺失', 0, missingVid);
  if (it.title !== row.title) flag(id, row.cat, 'title', JSON.stringify(row.title), JSON.stringify(it.title));
  if (it.update_status !== row.update_status) flag(id, row.cat, 'update_status', row.update_status, it.update_status);
  const expectTotal = row.episode_total_cnt || row.claimed || 0;
  if (it.total_episodes_source !== expectTotal) flag(id, row.cat, 'total_episodes_source', expectTotal, it.total_episodes_source);
  if (!it.verified_at) flag(id, row.cat, 'verified_at', '存在', '缺失');
  if (it.unavailable) flag(id, row.cat, 'UNEXPECTED_UNAVAILABLE', 'false', 'true');
  // 顺序与 vid 对应：逐集 vid 必须等于快照 vid_list[i]
  for (let i = 0; i < list.length; i += 1) {
    if (row.vid_list && row.vid_list[i] != null && list[i].vid !== row.vid_list[i]) {
      flag(id, row.cat, `episode_list[${i}].vid`, row.vid_list[i], list[i].vid);
      break;
    }
  }
}

// 反向：应用数据里有、快照没有的孤儿
for (const [id, it] of appliedById) {
  if (!rows.has(id)) { orphan += 1; flag(id, it._cat, 'ORPHAN_NO_SNAPSHOT', '有快照', '无'); }
}

console.log(`\n存活条目=${okCount}  失效条目=${deadCount}  孤儿=${orphan}`);
console.log(`\n不一致项总数：${problems.length}`);
if (problems.length) {
  const byField = new Map();
  for (const p of problems) byField.set(p.field, (byField.get(p.field) || 0) + 1);
  console.log('按字段分布：', [...byField.entries()].map(([k, v]) => `${k}=${v}`).join('  '));
  console.log('\n明细（前 40）：');
  for (const p of problems.slice(0, 40)) {
    console.log(`  [${p.field}] ${p.cat}/${p.id}  期望=${JSON.stringify(p.expect)}  实际=${JSON.stringify(p.actual)}`);
  }
} else {
  console.log('✅ 全部一致：应用数据与抓取快照逐字段完全吻合');
}
process.exit(problems.length ? 1 : 0);
