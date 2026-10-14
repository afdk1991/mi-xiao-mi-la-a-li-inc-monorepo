/* 恢复脚本：从 dist/index.html 反推重建 7 个源码页（index/resources/category/
   resource/compliance/curated/about.html）。
   原理：dist 的 7 个 <section class="view"> 即为各源码页 <main> 内容（仅链接被
   改写为 hash），逆向 LINK_MAP 即可还原真实 .html 链接。
   改源码后无需再用本脚本；本脚本仅用于一次性恢复丢失的源码页。 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const dist = fs.readFileSync(path.join(DIR, 'dist/index.html'), 'utf8');

// 逆向链接映射（按特异性从高到低，避免误替换）
const RMAP = [
  ['#/resources?q=', 'resources.html?q='],
  ['#/resource/', 'resource.html?id='],
  ['#/category/', 'category.html?c='],
  ['#/compliance', 'compliance.html'],
  ['#/curated', 'curated.html'],
  ['#/about', 'about.html'],
  ['#/resources', 'resources.html'],
  ['#/', 'index.html']
];
function reverseLinks(s) {
  RMAP.forEach(([from, to]) => { s = s.split(from).join(to); });
  return s;
}

// 平衡提取某个 view 区块的全部内容（含嵌套 <section>）
function extractView(id) {
  const startTag = '<section class="view" id="view-' + id + '"';
  const si = dist.indexOf(startTag);
  if (si < 0) throw new Error('未找到 view: ' + id);
  let i = dist.indexOf('>', si) + 1;
  let depth = 1, j = i;
  while (j < dist.length) {
    if (dist.startsWith('<section', j)) { depth++; j = dist.indexOf('>', j) + 1; }
    else if (dist.startsWith('</section>', j)) {
      depth--; j += '</section>'.length;
      if (depth === 0) break;
    } else j++;
  }
  return dist.slice(i, j).trim();
}

const VIEWS = {
  home: '可转载资源清单 · AI 大模型与服务器/计算机技术',
  resources: '资源库 · 可转载资源清单',
  category: '分类详情 · 可转载资源清单',
  resource: '资源详情 · 可转载资源清单',
  compliance: '转载合规指南 · 可转载资源清单',
  curated: '精选 21 项 · 可转载资源清单',
  about: '关于与勘误 · 可转载资源清单'
};

const NAV = [
  ['index.html', '首页'],
  ['resources.html', '资源库'],
  ['curated.html', '精选 21 项'],
  ['category.html?c=A', '分类'],
  ['compliance.html', '合规指南'],
  ['about.html', '关于']
].map(([h, t]) => '      <a href="' + h + '">' + t + '</a>').join('\n');

const FOOT_CATS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(k =>
  '          <li><a href="category.html?c=' + k + '">' + k + ' 类目</a></li>').join('\n');

function pageShell(title, mainInner) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="AI 大模型与服务器/计算机技术领域公开可转载资源索引。">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-wrap">
    <a class="brand" href="index.html"><span class="mark">R</span><span>可转载资源清单<small>AI 大模型 · 服务器与计算机技术</small></span></a>
    <nav class="nav" id="siteNav">
${NAV}
    </nav>
    <div class="nav-search">
      <input id="globalSearch" type="search" placeholder="搜索资源…（回车）">
      <button class="nav-toggle" id="navToggle" aria-label="菜单">☰</button>
    </div>
  </div>
</header>
<main class="site-main">
${mainInner}
</main>
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
          <li><a href="index.html">首页</a></li>
          <li><a href="resources.html">资源库（全量）</a></li>
          <li><a href="curated.html">精选 21 项</a></li>
          <li><a href="compliance.html">转载合规指南</a></li>
          <li><a href="about.html">关于与勘误</a></li>
        </ul>
      </div>
      <div>
        <h5>类目速达</h5>
        <ul>
${FOOT_CATS}
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
</footer>
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
<button id="toTop" aria-label="回到顶部">↑</button>
<script src="assets/data.js"></script>
<script src="assets/curated.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
`;
}

let ok = 0;
Object.keys(VIEWS).forEach((id) => {
  const inner = reverseLinks(extractView(id));
  const file = id === 'home' ? 'index.html'
    : id === 'resource' ? 'resource.html'
      : id + '.html';
  fs.writeFileSync(path.join(DIR, file), pageShell(VIEWS[id], inner), 'utf8');
  console.log('✓ 已重建 ' + file + '（main ' + inner.length + ' 字符）');
  ok++;
});
console.log('\n恢复完成：' + ok + ' 个源码页。下一步：node smoke-test.js → node build-dist.js → node dist-verify.js');
