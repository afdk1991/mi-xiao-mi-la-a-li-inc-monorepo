/* ===========================================================
   构建单文件分发版：dist/index.html
   把 style.css / data.js / curated.js / app.js 全部内联，
   并将各页 <main> 抽取为 hash 路由视图区块。
   改源码后重跑：node build-dist.js
   =========================================================== */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function read(p) { return fs.readFileSync(path.join(DIR, p), 'utf8'); }

/* ---------- 压缩工具（隔离 node 工作区，失败自动回退） ---------- */
const NODE_PATH = 'C:/Users/Admin/.workbuddy/binaries/node/workspace/node_modules';
let terser = null, CleanCSS = null;
try {
  terser = require(path.join(NODE_PATH, 'terser'));
  CleanCSS = require(path.join(NODE_PATH, 'clean-css'));
  console.log('✓ 压缩工具已加载：terser / clean-css');
} catch (e) {
  console.warn('⚠ 压缩工具不可用，将输出未压缩版：' + e.message);
}
async function mjs(code) {
  if (!terser) return code;
  try {
    const r = await terser.minify(code, {
      compress: { defaults: true, passes: 2 },
      mangle: { toplevel: false },
      format: { comments: false }
    });
    if (r.error) { console.warn('  ⚠ JS 压缩跳过：' + r.error.message); return code; }
    return r.code;
  } catch (e) { console.warn('  ⚠ JS 压缩跳过：' + e.message); return code; }
}

/* ---------- 1. 资源内联 ---------- */
let css = read('assets/style.css');
let dataJs = read('assets/data.js');
let curatedJs = read('assets/curated.js');
let articlesJs = read('assets/articles.js');
let fetchedJs = read('assets/fetched.js');
let appJs = read('assets/app.js');

/* ---------- 2. 改造 app.js：链接改 hash + 参数从 hash 读取 ---------- */
const LINK_MAP = [
  ['category.html?c=', '#/category/'],
  ['resource.html?id=', '#/resource/'],
  ['article.html?id=', '#/article/'],
  ['articles.html', '#/articles'],
  ['article.html', '#/article/'],
  ['content.html', '#/content'],
  ['resources.html?q=', '#/resources?q='],
  ['resources.html', '#/resources'],
  ['index.html', '#/'],
  ['compliance.html', '#/compliance'],
  ['curated.html', '#/curated'],
  ['about.html', '#/about'],
  ['resource.html', '#/resource/']
];
LINK_MAP.forEach(([from, to]) => { appJs = appJs.split(from).join(to); });

// param() 改为从 hash 读取；新增 extractSeg() 解析 /category/A、/resource/C1
appJs = appJs.replace(
  /function param\(name\) \{[\s\S]*?return m \? decodeURIComponent\(m\[1\]\.replace\(\/\\\+\/g, ' '\)\) : null;\s*\}/,
  `function param(name) {
    var h = window.location.hash || '';
    var q = h.indexOf('?') >= 0 ? h.slice(h.indexOf('?')) : '';
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(q);
    return m ? decodeURIComponent(m[1].replace(/\\+/g, ' ')) : null;
  }
  function extractSeg(seg) {
    var h = (window.location.hash || '').replace(/^#\\//, '');
    var qi = h.indexOf('?'); if (qi >= 0) h = h.slice(0, qi);
    var parts = h.split('/'); var idx = parts.indexOf(seg);
    return (idx >= 0 && parts[idx + 1]) ? parts[idx + 1] : null;
  }`
);
appJs = appJs.split("var key = (param('c') || 'A').toUpperCase();").join("var key = (extractSeg('category') || 'A').toUpperCase();");
// 资源详情：从 /resource/<id> 取参（initResource 用 resOut 容器）
appJs = appJs.split("    var el = document.getElementById('resOut');\n    if (!el) return;\n    var id = param('id');").join("    var el = document.getElementById('resOut');\n    if (!el) return;\n    var id = extractSeg('resource');");
// 文章详情：从 /article/<id> 取参（initArticle 用 artDetailOut 容器）
appJs = appJs.split("    var el = document.getElementById('artDetailOut');\n    if (!el) return;\n    var id = param('id');").join("    var el = document.getElementById('artDetailOut');\n    if (!el) return;\n    var id = extractSeg('article');");

// 暴露 initCategory / initResource 给路由脚本调用
appJs = appJs.replace(
  /window\.SITE = \{[\s\S]*?\};/,
  `  window.SITE = {
    CATS: CATS, RESOURCES: RESOURCES, LIC_LABEL: LIC_LABEL,
    cardHTML: cardHTML, catCardsHTML: catCardsHTML, toMarkdown: toMarkdown,
    toCuratedMarkdown: toCuratedMarkdown,
    param: param, byId: byId, inCat: inCat, countLic: countLic,
    initCategory: initCategory, initResource: initResource,
    initArticles: initArticles, initArticle: initArticle,
    initFullContent: initFullContent
  };`
);

/* ---------- 3. 抽取各页主内容（header 之后、footer 之前） ---------- */
// 配平 main/section 标签：源页面已修复为「单 main + 无多余 </section>」，
// 此处保留作为防御性兜底——若后续编辑再次引入多余的 </main>/</section>，
// 直接内联会提前闭合 <section class="view"> 与 dist-main，导致视图被挤出容器。
function balanceClose(s) {
  ['main', 'section'].forEach(function (tag) {
    const opens = (s.match(new RegExp('<' + tag + '(\\s|>)', 'g')) || []).length;
    let excess = (s.match(new RegExp('</' + tag + '>', 'g')) || []).length - opens;
    while (excess > 0) {
      const i = s.lastIndexOf('</' + tag + '>');
      if (i < 0) break;
      s = s.slice(0, i) + s.slice(i + tag.length + 3);
      excess--;
    }
  });
  return s;
}
function extractMain(file) {
  const h = read(file);
  const m = h.match(/<\/header>([\s\S]*?)<footer class="site-footer"/);
  if (!m) throw new Error('无法从 ' + file + ' 抽取主内容');
  let body = m[1];
  LINK_MAP.forEach(([from, to]) => { body = body.split(from).join(to); });
  // 剥离外层 <main class="site-main">：dist 中 <main class="dist-main"> 已是唯一 main，
  // 视图内不应再嵌套 main（HTML 规范：每页仅一个可见 main）
  body = body.replace(/<main class="site-main">/, '');
  body = body.replace(/<\/main>\s*$/, '');
  return stripIds(balanceClose(body));
}
function stripIds(s) { return s.replace(/\sdata-page-node-id="[^"]*"/g, ''); }

const views = {
  home: extractMain('index.html'),
  resources: extractMain('resources.html'),
  category: extractMain('category.html'),
  resource: extractMain('resource.html'),
  compliance: extractMain('compliance.html'),
  curated: extractMain('curated.html'),
  articles: extractMain('articles.html'),
  article: extractMain('article.html'),
  content: extractMain('content.html'),
  about: extractMain('about.html')
};

/* ---------- 4. 组装头部（hash 导航）与页脚 ---------- */
const headerHtml = stripIds(`
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="#/"><span class="mark">R</span><span>可转载资源清单<small>AI 大模型 · 服务器与计算机技术</small></span></a>
    <nav class="nav" id="siteNav">
      <a href="#/" data-route="home" class="active">首页</a>
      <a href="#/resources" data-route="resources">资源库</a>
      <a href="#/curated" data-route="curated">精选 21 项</a>
      <a href="#/articles" data-route="articles">技术文章</a>
      <a href="#/content" data-route="content">全文阅读</a>
      <a href="#/category/A" data-route="category">分类</a>
      <a href="#/compliance" data-route="compliance">合规指南</a>
      <a href="#/about" data-route="about">关于</a>
    </nav>
    <div class="nav-search">
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="切换深色 / 浅色主题" title="切换主题">🌙</button>
      <input id="globalSearch" type="search" placeholder="搜索资源…（回车）">
      <button class="nav-toggle" id="navToggle" aria-label="菜单">☰</button>
    </div>
  </div>
</header>
<div id="readBar"></div>`);

const footerHtml = stripIds(`
<footer class="site-footer">
  <div class="container">
    <div class="foot-grid">
      <div>
        <h5>关于本站</h5>
        <p>收录 AI 大模型与服务器 / 计算机技术领域公开可得、可自由转载或注明出处即可引用的资源，逐项标注许可与版权状态。</p>
        <p>当前共 <b id="footTotal">—</b> 项资源，分 8 大类。</p>
      </div>
      <div>
        <h5>浏览</h5>
        <ul>
          <li><a href="#/">首页</a></li>
          <li><a href="#/resources">资源库（全量）</a></li>
          <li><a href="#/curated">精选 21 项</a></li>
          <li><a href="#/articles">技术文章</a></li>
          <li><a href="#/content">全文阅读（全部正文）</a></li>
          <li><a href="#/compliance">转载合规指南</a></li>
          <li><a href="#/about">关于与勘误</a></li>
        </ul>
      </div>
      <div>
        <h5>类目速达</h5>
        <ul>
          <li><a href="#/category/A">A 大模型原理与算法</a></li>
          <li><a href="#/category/B">B 训练与微调工具</a></li>
          <li><a href="#/category/C">C 推理部署与优化</a></li>
          <li><a href="#/category/D">D 服务器硬件与运维</a></li>
          <li><a href="#/category/E">E 计算机网络与存储</a></li>
          <li><a href="#/category/F">F 数据集与评测基准</a></li>
          <li><a href="#/category/G">G 配图 / 图标 / 字体</a></li>
          <li><a href="#/category/H">H 中文内容与社区</a></li>
        </ul>
      </div>
      <div>
        <h5>合规要点</h5>
        <ul>
          <li>权重开放 ≠ 开源</li>
          <li>arXiv 默认不可全文转载</li>
          <li>商标 Logo 需单独授权</li>
          <li>中文社区默认禁转载</li>
          <li>数据许可独立于模型</li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span id="year">2026</span> 可转载资源清单 · 本页为索引性质，不托管任何受版权保护的原文</span>
      <span>许可信息以各来源官方声明为准</span>
    </div>
  </div>
</footer>`);

const modalHtml = stripIds(`
<div class="modal" id="modal">
  <div class="modal-box">
    <header><b id="mdTitle">完整清单（Markdown）</b><button class="btn ghost sm" id="closeBtn">关闭</button></header>
    <div class="modal-body"><textarea id="mdOut" readonly></textarea></div>
    <div class="modal-foot">
      <button class="btn" id="copyBtn">复制到剪贴板</button>
      <button class="btn ghost" id="dlBtn">下载 .md 文件</button>
      <span id="copyTip"></span>
    </div>
  </div>
</div>
<button id="toTop" aria-label="回到顶部">↑</button>`);

/* ---------- 5. 路由脚本 ---------- */
const routerJs = `
(function () {
  var routes = ['home','resources','category','resource','compliance','curated','articles','article','content','about'];
  function getRoute() {
    var h = (location.hash || '#/').replace(/^#\\//, '');
    var qi = h.indexOf('?'); if (qi >= 0) h = h.slice(0, qi);
    var first = h.split('/')[0];
    if (!first) return 'home';
    if (routes.indexOf(first) >= 0) return first;
    return 'home';
  }
  function show(route) {
    routes.forEach(function (r) {
      var el = document.getElementById('view-' + r);
      if (el) el.style.display = (r === route) ? '' : 'none';
    });
    document.querySelectorAll('#siteNav a[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === route);
    });
    window.scrollTo(0, 0);
  }
  function onRoute() {
    var route = getRoute();
    show(route);
    if (route === 'category' && window.SITE && window.SITE.initCategory) window.SITE.initCategory();
    if (route === 'resource' && window.SITE && window.SITE.initResource) window.SITE.initResource();
    if (route === 'articles' && window.SITE && window.SITE.initArticles) window.SITE.initArticles();
    if (route === 'article' && window.SITE && window.SITE.initArticle) window.SITE.initArticle();
    if (route === 'content' && window.SITE && window.SITE.initFullContent) window.SITE.initFullContent();
    if (route === 'resources' && window.SITE) {
      var q = window.SITE.param ? window.SITE.param('q') : null;
      var inp = document.getElementById('libQ');
      if (q && inp) { inp.value = q; inp.dispatchEvent(new Event('input')); }
    }
  }
  window.addEventListener('hashchange', onRoute);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onRoute);
  else onRoute();
})();`;

/* ---------- 6. 拼装最终文档（压缩后） ---------- */
function viewBlock(route, inner) {
  const hidden = route === 'home' ? '' : ' style="display:none"';
  return '<section class="view" id="view-' + route + '"' + hidden + '>' + inner + '</section>';
}

const viewsHtml = Object.keys(views).map(r => viewBlock(r, views[r])).join('\n');

async function main() {
  // CSS 压缩
  let cssOut = css;
  if (CleanCSS) {
    const r = new CleanCSS({ level: 1, rebase: false }).minify(css);
    if (r.errors.length) console.warn('  ⚠ CSS 压缩跳过：' + r.errors[0]);
    else cssOut = r.styles;
  }
  // JS 压缩（5 个脚本块并行），失败回退原文
  const [dataJsM, curatedJsM, articlesJsM, fetchedJsM, appJsM, routerJsM] = await Promise.all([
    mjs(dataJs), mjs(curatedJs), mjs(articlesJs), mjs(fetchedJs), mjs(appJs), mjs(routerJs)
  ]);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>可转载资源清单 · AI 大模型与服务器/计算机技术（单文件版）</title>
<meta name="description" content="收录 79 项 AI 大模型与服务器/计算机技术领域的公开可转载资源，单文件离线版。">
<style>
${cssOut}
</style>
</head>
<body>
${headerHtml}
<main class="dist-main">
${viewsHtml}
</main>
${footerHtml}
${modalHtml}
<script>${dataJsM}</script>
<script>${curatedJsM}</script>
<script>${articlesJsM}</script>
<script>${fetchedJsM}</script>
<script>${appJsM}</script>
<script>${routerJsM}</script>
</body>
</html>`;

  const outDir = path.join(DIR, 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  const jsRaw = dataJs.length + curatedJs.length + articlesJs.length + fetchedJs.length + appJs.length + routerJs.length;
  const jsMin = dataJsM.length + curatedJsM.length + articlesJsM.length + fetchedJsM.length + appJsM.length + routerJsM.length;
  console.log('✓ dist/index.html 已生成：' + Math.round(html.length / 1024) + ' KB');
  console.log('  压缩：CSS ' + Math.round(css.length / 1024) + '→' + Math.round(cssOut.length / 1024) +
    ' KB；JS ' + Math.round(jsRaw / 1024) + '→' + Math.round(jsMin / 1024) + ' KB');
  console.log('  内联资源：style.css + data.js + curated.js + app.js(改写) + router');
  console.log('  视图区块：' + Object.keys(views).join(', '));
}

main().catch(e => { console.error(e); process.exit(1); });
