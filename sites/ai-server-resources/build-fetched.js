/* ===========================================================
   从 fetched/ 目录抓取的原始文档中提取真实正文，生成 assets/fetched.js
   许可合规：仅为「允许全文转载」的来源生成正文页，并在页首/页尾强制附加
             来源、原文链接与许可声明（CC BY / GFDL / BSD / 公有领域等要求署名）
   用法：node build-fetched.js
   =========================================================== */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const FETCH = path.join(DIR, 'fetched');

/* ---------- 通用实体解码（保留 &lt;/&gt; 交由浏览器渲染） ---------- */
const ENT = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&rsquo;': '’', '&lsquo;': '‘',
  '&ldquo;': '“', '&rdquo;': '”', '&copy;': '©', '&trade;': '™', '&reg;': '®',
  '&eacute;': 'é', '&times;': '×', '&middot;': '·'
};

/* ---------- HTML 正文清洗：白名单标签 + 剥离其余标签 ---------- */
function cleanHtml(raw) {
  let s = raw;
  // 1. 整块删除无用区域
  ['head', 'script', 'style', 'nav', 'footer', 'svg', 'form', 'noscript', 'button', 'select']
    .forEach(t => { s = s.replace(new RegExp('<' + t + '\\b[\\s\\S]*?</' + t + '>', 'gi'), ''); });
  // 2. 去掉链接标签（相对链接在本地会失效），仅保留文字
  s = s.replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '');
  // 3. 白名单标签 → 占位符（h4~h6 统一降级为 h3，保证层级只有 h2/h3）
  const map = {
    h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3',
    p: 'p', ul: 'ul', ol: 'ol', li: 'li', pre: 'pre', code: 'code',
    b: 'b', strong: 'b', i: 'i', em: 'i', blockquote: 'blockquote',
    table: 'table', thead: 'thead', tbody: 'tbody', tr: 'tr', td: 'td', th: 'th',
    dl: 'dl', dt: 'dt', dd: 'dd'
  };
  Object.keys(map).forEach(tag => {
    const to = map[tag];
    s = s.replace(new RegExp('<' + tag + '\\b[^>]*>', 'gi'), '\u0001' + to + '\u0002');
    s = s.replace(new RegExp('</' + tag + '\\s*>', 'gi'), '\u0001/' + to + '\u0002');
  });
  // 4. br 单独处理
  s = s.replace(/<br\s*\/?>/gi, '\u0001br\u0002');
  // 5. 剥离所有剩余标签（仅保留文本）
  s = s.replace(/<[^>]+>/g, '');
  // 6. 还原占位符为真实标签
  s = s.replace(/\u0001(\/?)([a-z0-9]+)\u0002/g, (m, slash, t) => '<' + slash + t + '>');
  // 7. 实体解码
  Object.keys(ENT).forEach(k => { s = s.split(k).join(ENT[k]); });
  // 8. 清理空白与空元素
  s = s.replace(/\u00a0/g, ' ');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  ['p', 'h2', 'h3', 'li', 'td', 'th', 'dt', 'dd', 'blockquote', 'pre', 'code']
    .forEach(t => {
      s = s.replace(new RegExp('<' + t + '>\\s*</' + t + '>', 'g'), '');
      s = s.replace(new RegExp('<' + t + '>(?:\\s|&nbsp;)*</' + t + '>', 'g'), '');
    });
  return s.trim();
}

/* ---------- 按起止标记截取正文区域 ---------- */
function sliceRegion(raw, from, to) {
  let s = raw;
  // 起止标记可能是标签中间的某个属性（如 id="docContent"），
  // 需回退到该标签的 '<' 处，否则会残留半个标签变成纯文本
  if (from) {
    const i = s.indexOf(from);
    if (i >= 0) { const lt = s.lastIndexOf('<', i); s = s.slice(lt >= 0 ? lt : i); }
  }
  if (to) {
    const j = s.indexOf(to);
    if (j >= 0) { const lt = s.lastIndexOf('<', j); s = s.slice(0, lt >= 0 ? lt : j); }
  }
  return s;
}

/* ---------- 截断到指定长度，且在段落边界断开 ---------- */
function truncate(html, max) {
  if (html.length <= max) return html;
  let cut = html.slice(0, max);
  const j = cut.lastIndexOf('</p>');
  if (j > max * 0.5) cut = cut.slice(0, j + 4);
  return cut + '\n<p class="article-note">（以下为节选，完整内容请见文末原文链接）</p>';
}

/* ---------- 生成署名/许可声明块 ---------- */
function attrBlock(a) {
  return '<div class="article-note"><b>来源：</b>' + a.source +
    '　·　<b>许可：</b>' + a.license +
    '<br><b>原文链接：</b><a href="' + a.sourceUrl + '" target="_blank" rel="noopener">' +
    a.sourceUrl + '</a>' +
    (a.derived ? '<br>' + a.derived : '') + '</div>';
}
function reprintBlock(a) {
  return '<div class="reprint">本文正文摘自 <b>' + a.source + '</b>（' + a.license + '）。' +
    '原文：<a href="' + a.sourceUrl + '" target="_blank" rel="noopener">' + a.sourceUrl + '</a>。' +
    '本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。</div>';
}

/* ---------- 来源配置：均为允许全文转载的许可 ---------- */
const SOURCES = [
  {
    id: 'nginx-beginner', cat: 'D', file: 'nginx-beginner.html',
    title: 'nginx 新手指南：启动停止、配置结构与静态/代理服务（官方文档全文）',
    summary: 'nginx 官方新手指南全文：主进程与 worker 进程模型、启动停止与重载配置、配置文件结构、静态内容服务、反向代理与 FastCGI 代理配置。',
    license: '2-clause BSD（nginx 官方文档）',
    source: 'nginx.org 官方文档',
    sourceUrl: 'https://nginx.org/en/docs/beginners_guide.html',
    from: '<div id="content">', to: '</body>', max: 42000
  },
  {
    id: 'sqlite-whentouse', cat: 'E', file: 'sqlite-whentouse.html',
    title: 'SQLite 官方：什么场景下该用 / 不该用 SQLite（公有领域全文）',
    summary: 'SQLite 官方「Appropriate Uses」全文：SQLite 与客户端/服务器数据库的区别、最适合的使用场景、应当改用服务端数据库的情形，以及并发写入与网络文件系统的注意事项。',
    license: '公有领域（Public Domain，SQLite 官方文档）',
    source: 'sqlite.org 官方文档',
    sourceUrl: 'https://www.sqlite.org/whentouse.html',
    from: '<div class="fancy">', to: '<div class="footer">', max: 42000
  },
  {
    id: 'postgres-whatis', cat: 'E', file: 'postgres-whatis.html',
    title: 'PostgreSQL 官方：PostgreSQL 是什么（PostgreSQL License 全文）',
    summary: 'PostgreSQL 官方文档「What is PostgreSQL?」：关系型数据库定位、可扩展性与数据类型/函数/索引定制能力、MVCC 并发控制、SQL 标准符合度与 ACID 特性。',
    license: 'PostgreSQL License（PostgreSQL 官方文档）',
    source: 'postgresql.org 官方文档',
    sourceUrl: 'https://www.postgresql.org/docs/current/intro-whatis.html',
    from: 'id="docContent"', to: 'id="docComments"', max: 42000
  },
  {
    id: 'k8s-components', cat: 'D', file: 'k8s-components-zh.html',
    title: 'Kubernetes 官方中文：集群组件架构（CC BY 4.0 全文）',
    summary: 'Kubernetes 官方中文文档「Kubernetes 组件」：控制平面组件（kube-apiserver、etcd、kube-scheduler、kube-controller-manager、cloud-controller-manager）与 Node 组件（kubelet、kube-proxy、容器运行时）的职责与协作方式，以及插件（Addons）层。',
    license: 'CC BY 4.0（Kubernetes 官方文档）',
    source: 'kubernetes.io 官方中文文档',
    sourceUrl: 'https://kubernetes.io/zh-cn/docs/concepts/overview/components/',
    from: '<main', to: '</main>', max: 46000
  },
  {
    id: 'archwiki-systemd', cat: 'D', file: 'archwiki-systemd.html',
    title: 'ArchWiki：systemd 系统与服务管理（GFDL 1.3 全文节选）',
    summary: 'ArchWiki「systemd」条目：systemctl 基本用法、服务单元管理、target 与运行级别、日志（journalctl）、电源管理，以及编写自定义 service 单元的要点。',
    license: 'GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可）',
    source: 'ArchWiki（wiki.archlinux.org）',
    sourceUrl: 'https://wiki.archlinux.org/title/Systemd',
    from: 'class="mw-parser-output"', to: '<div class="printfooter"', max: 48000
  },
  {
    id: 'rfc9110-http', cat: 'E', file: 'rfc9110.txt',
    title: 'RFC 9110：HTTP 语义（IETF 标准全文节选）',
    summary: 'IETF STD 97 / RFC 9110「HTTP Semantics」节选：HTTP 无状态应用层协议定位、整体架构、客户端-服务器与中间盒模型、URI 方案与核心协议元素。IETF Trust Legal Provisions 允许全文复制、分发与翻译。',
    license: 'IETF Trust Legal Provisions（RFC，允许全文复制/分发/翻译，须注明 IETF 与 RFC 编号）',
    source: 'IETF RFC Editor',
    sourceUrl: 'https://www.rfc-editor.org/rfc/rfc9110.txt',
    isText: true, max: 30000,
    derived: '本文为 RFC 9110 开头部分（摘要与导言）的节选，完整规范请见 RFC Editor 原文。'
  },
  {
    id: 'vllm-quickstart', cat: 'C', file: 'vllm-quickstart.html',
    title: 'vLLM 官方快速上手：离线推理、OpenAI 兼容服务与分布式部署（Apache-2.0 全文）',
    summary: 'vLLM 官方文档 Quickstart 全文：离线批量推理、OpenAI 兼容 API 服务器启动、分布式张量并行 / 流水线并行部署，以及常用参数与性能优化要点。',
    license: 'Apache-2.0（vLLM 官方文档）',
    source: 'vLLM 官方文档（docs.vllm.ai）',
    sourceUrl: 'https://docs.vllm.ai/en/latest/getting_started/quickstart.html',
    from: '<article', to: '</article>', max: 46000
  },
  {
    id: 'pytorch-basics', cat: 'B', file: 'pytorch-intro.html',
    title: 'PyTorch 官方教程：Learn the Basics（张量 / DataLoader / 神经网络 / 自动求导 / 优化）',
    summary: 'PyTorch 官方入门教程全文：张量基础操作与 GPU 加速、自定义 Dataset 与 DataLoader、数据变换、用 nn.Module 构建神经网络、autograd 自动求导、优化循环与模型保存/加载。',
    license: 'BSD 3-Clause（PyTorch 官方教程）',
    source: 'PyTorch 官方教程（pytorch.org）',
    sourceUrl: 'https://pytorch.org/tutorials/beginner/basics/intro.html',
    from: 'role="main"', to: '</article>', max: 48000
  }
];

/* ---------- 主流程 ---------- */
function buildOne(a) {
  const raw = fs.readFileSync(path.join(FETCH, a.file), 'utf8');
  let body;
  if (a.isText) {
    // RFC 纯文本：清除分页符，按原始排版放入 pre，保持规范文本真实性
    let t = raw.replace(/\f/g, '\n');
    t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    body = '<pre>' + t + '</pre>';
  } else {
    const region = sliceRegion(raw, a.from, a.to);
    body = cleanHtml(region);
    // 清洗会丢掉原始的 <div class="table-wrap">，这里把表格重新套回滚动容器，
    // 否则宽表（如 ArchWiki 的参数表）会直接撑破正文导致整页横向溢出
    body = body.replace(/<table>/g, '<div class="table-wrap"><table>')
               .replace(/<\/table>/g, '</table></div>');
  }
  body = truncate(body, a.max || 40000);
  const html = attrBlock(a) + body + reprintBlock(a);
  return {
    id: a.id,
    title: a.title,
    cat: a.cat,
    summary: a.summary,
    license: a.license,
    source: a.source,
    sourceUrl: a.sourceUrl,
    updated: '转载自官方原文',
    read: Math.max(1, Math.round(body.replace(/<[^>]+>/g, '').length / 400)) + ' 分钟',
    html: html
  };
}

const list = SOURCES.map(s => {
  try {
    const item = buildOne(s);
    const plain = item.html.replace(/<[^>]+>/g, '');
    console.log('✓ ' + s.id.padEnd(20) + '正文 ' + String(plain.length).padStart(7) + ' 字  ' + s.title.slice(0, 30));
    return item;
  } catch (e) {
    console.warn('✗ ' + s.id + ' 处理失败：' + e.message);
    return null;
  }
}).filter(Boolean);

const out = '/* 联网抓取的官方原文正文（自动生成，勿手改）\n' +
  '   生成脚本：build-fetched.js　源目录：fetched/\n' +
  '   全部来源均为允许全文转载的许可，页首/页尾已附来源与许可声明 */\n' +
  'window.FETCHED = ' + JSON.stringify(list, null, 1) + ';\n';
fs.writeFileSync(path.join(DIR, 'assets', 'fetched.js'), out, 'utf8');
console.log('\n✓ assets/fetched.js 已生成：' + list.length + ' 篇，' +
  Math.round(out.length / 1024) + ' KB');
