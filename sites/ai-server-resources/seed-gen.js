/* 种子数据生成：把站点的硬编码数据源映射进云端数据库 schema，输出分块 SQL。
   运行：node seed-gen.js
   产物：seed/ 目录下 .sql 文件（供 exec_sql mode=write 执行） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS = path.join(__dirname, 'assets');

function loadData(file) {
  const code = fs.readFileSync(path.join(ASSETS, file), 'utf8');
  const sandbox = { window: {}, module: { exports: {} }, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window;
}

function esc(s) {
  // 仅转义单引号（标准 PG 字符串常量下反斜杠按字面处理）
  return String(s == null ? '' : s).replace(/'/g, "''");
}

// 把任意字符串拆成 ≤size 字符的短字面量，用 || 拼接，保证单行 < 2000 不被截断
function sqlStr(s) {
  const safe = esc(s);
  const size = 1800;
  const chunks = [];
  for (let i = 0; i < safe.length; i += size) chunks.push(safe.slice(i, i + size));
  return chunks.map((c) => `'${c}'`).join('\n|| ');
}

const win = loadData('data.js');
const CATS = win.CATS;
const RESOURCES = win.RESOURCES;
const ARTICLES = loadData('articles.js').ARTICLES;
const FETCHED = loadData('fetched.js').FETCHED;

const outDir = path.join(__dirname, 'seed');
fs.mkdirSync(outDir, { recursive: true });

// ---------- categories ----------
{
  const rows = Object.keys(CATS).map((code) => {
    const c = CATS[code];
    return `(${sqlStr(code)},${sqlStr(c.t)},${sqlStr(c.d)})`;
  });
  fs.writeFileSync(path.join(outDir, 'categories.sql'),
    `INSERT INTO categories (code, title, description) VALUES\n${rows.join(',\n')};\n`);
}

// ---------- resources ----------
// owner_id 用系统占位（公开读不受影响；写入走服务角色绕过 RLS）
{
  const rows = RESOURCES.map((r) => {
    const links = JSON.stringify(r.links || []);
    return `('sys-seed',${sqlStr(r.cat)},${sqlStr(r.name)},${sqlStr(r.type)},${sqlStr(r.l)},` +
      `${sqlStr(r.lic)},${sqlStr(r.desc)},${sqlStr(r.who)},(${sqlStr(links)})::jsonb)`;
  });
  fs.writeFileSync(path.join(outDir, 'resources.sql'),
    `INSERT INTO resources (owner_id, cat, name, type, license_level, license, description, audience, links) VALUES\n` +
    rows.join(',\n') + ';\n');
}

// ---------- articles ----------
function articleRow(a, original) {
  const cat = String(a.cat || '').trim().charAt(0); // 取类目首字母代码
  const source = original ? 'AI 资源站原创' : (a.source || '');
  const sourceUrl = a.sourceUrl || '';
  const read = a.read || '';
  const updated = a.updated || '';
  return `(${sqlStr(a.id)},${sqlStr(a.title)},${sqlStr(cat)},${sqlStr(a.summary)},` +
    `${sqlStr(a.html)},${sqlStr(source)},${sqlStr(sourceUrl)},${sqlStr(a.license)},` +
    `${original},${sqlStr(read)},${sqlStr(updated)})`;
}

function writeChunks(label, items, original, maxBytes) {
  let buf = [];
  let size = 0;
  let idx = 1;
  const flush = () => {
    if (!buf.length) return;
    const sql = `INSERT INTO articles (slug, title, category, summary, body, source, source_url, license, original, read_time, updated) VALUES\n` +
      buf.join(',\n') + ';\n';
    fs.writeFileSync(path.join(outDir, `${label}-${idx}.sql`), sql);
    idx++;
    buf = [];
    size = 0;
  };
  for (const it of items) {
    const row = articleRow(it, original);
    if (size + row.length > maxBytes && buf.length) { flush(); }
    buf.push(row);
    size += row.length;
  }
  flush();
}

writeChunks('articles-orig', ARTICLES, true, 200 * 1024);
writeChunks('articles-fetched', FETCHED, false, 40 * 1024);

// 汇总
const files = fs.readdirSync(outDir).map((f) => {
  const b = fs.statSync(path.join(outDir, f)).size;
  return `${f} (${(b / 1024).toFixed(1)} KB)`;
});
console.log('生成完成：\n' + files.join('\n'));
