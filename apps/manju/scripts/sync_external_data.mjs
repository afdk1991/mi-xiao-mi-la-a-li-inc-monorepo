/**
 * 把 web/public/external/*.json 同步到 makers/data/external/。
 *
 * 为什么多这一步：EdgeOne 的 includeFiles 只认 makers/data/**，而云函数没有
 * 静态目录的读权限。ext/play 要按 id 反查条目，就必须让这份数据跟着函数一起打包。
 *
 * 幂等：内容一致就跳过写入；不会碰 makers/static（那是 Vite 的产物目录）。
 *
 * 用法：node scripts/sync_external_data.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// 注意用 fileURLToPath：直接取 new URL().pathname 会把中文路径 URL-encode 掉
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'web', 'public', 'external');
const DST = path.join(ROOT, 'makers', 'data', 'external');

const checkOnly = process.argv.includes('--check');
let copied = 0;
let same = 0;
let missing = 0;

function sha(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
}

if (!fs.existsSync(SRC)) {
  console.error('源目录不存在：' + SRC);
  process.exit(1);
}

fs.mkdirSync(DST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json'));
for (const f of files) {
  const from = path.join(SRC, f);
  const to = path.join(DST, f);
  const buf = fs.readFileSync(from);

  // 顺带做一次条目契约校验：缺 id / 缺 detail_url 的条目在云端无法被解析
  try {
    const j = JSON.parse(buf.toString('utf8'));
    const items = j.items || [];
    const badItem = items.find((x) => !x.id || !x.detail_url);
    if (badItem) {
      console.error(`  ✗ ${f}: 存在缺少 id/detail_url 的条目 -> ${JSON.stringify(badItem).slice(0, 120)}`);
      missing++;
    }
  } catch (e) {
    console.error(`  ✗ ${f}: JSON 解析失败 ${e.message}`);
    missing++;
    continue;
  }

  if (fs.existsSync(to) && sha(fs.readFileSync(to)) === sha(buf)) {
    same++;
    continue;
  }
  if (checkOnly) {
    console.error(`  ✗ ${f}: 与目标不一致（需要同步）`);
    missing++;
    continue;
  }
  fs.writeFileSync(to, buf);
  copied++;
  console.log(`  ✓ ${f} -> makers/data/external/ (${(buf.length / 1024).toFixed(1)}KB)`);
}

console.log(`\n同步完成：新增/更新 ${copied}，无变化 ${same}，异常 ${missing}`);
if (missing > 0) process.exit(1);
