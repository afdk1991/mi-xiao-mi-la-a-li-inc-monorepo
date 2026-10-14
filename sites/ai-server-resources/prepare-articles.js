/* 准备文章数据：
   1) 把 articles.js / fetched.js 里的正文 html 抽取为静态文件 assets/articles/<slug>.html
      （正文作为静态资源托管，避免大字段进库；列表/详情页通过 fetch 加载）
   2) 生成 seed/articles-meta.sql —— 仅文章元数据（body 留空，由静态文件承载）
   运行：node prepare-articles.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS = path.join(__dirname, 'assets');
function loadData(file) {
  const code = fs.readFileSync(path.join(ASSETS, file), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/'/g, "''");
}

const win = loadData('articles.js');
const ARTICLES = win.ARTICLES || [];
const FETCHED = loadData('fetched.js').FETCHED || [];

const outDir = path.join(ASSETS, 'articles');
fs.mkdirSync(outDir, { recursive: true });

// 抽取正文为静态文件
const all = [];
ARTICLES.forEach((a) => all.push({ a, original: true }));
FETCHED.forEach((a) => all.push({ a, original: false }));

const filesWritten = [];
for (const { a } of all) {
  const slug = a.id;
  const html = a.html || '';
  const file = path.join(outDir, slug + '.html');
  fs.writeFileSync(file, html, 'utf8');
  filesWritten.push(slug + '.html (' + (Buffer.byteLength(html, 'utf8')) + ' bytes)');
}

// 生成元数据 SQL（body 留空：静态文件承载正文）
const rows = all.map(({ a, original }) => {
  const cat = String(a.cat || '').trim().charAt(0);
  const source = original ? 'AI 资源站原创' : (a.source || '');
  const sourceUrl = a.sourceUrl || '';
  const read = a.read || '';
  const updated = a.updated || '';
  return `('${esc(a.id)}', '${esc(a.title)}', '${esc(cat)}', '${esc(a.summary)}', '', ` +
    `'${esc(source)}', '${esc(sourceUrl)}', '${esc(a.license || '')}', ${original}, ` +
    `'${esc(read)}', '${esc(updated)}')`;
});

const sql = `INSERT INTO articles (slug, title, category, summary, body, source, source_url, license, original, read_time, updated) VALUES\n` +
  rows.join(',\n') + ';\n';
fs.writeFileSync(path.join(__dirname, 'seed', 'articles-meta.sql'), sql);

console.log('静态正文文件：');
filesWritten.forEach((f) => console.log('  ' + f));
console.log('\n元数据 SQL：seed/articles-meta.sql (' + rows.length + ' 行)');
console.log('总计文章：' + all.length + ' 篇（原创 ' + ARTICLES.length + ' ＋ 官方转载 ' + FETCHED.length + '）');
