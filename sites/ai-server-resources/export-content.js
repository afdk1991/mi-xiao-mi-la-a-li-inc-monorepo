/* ===========================================================
   正文导出器：把站内文章（原创 + 官方原文转载）导出为纯文本文件
   目的：交付「可直接阅读的正文全文」，而非链接清单。
   输出：CONTENT-FULL.md（全部 13 篇完整正文）
   运行：node export-content.js
   =========================================================== */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, 'CONTENT-FULL.md');

/* 载入两个数据源（与页面同源，保证导出与站点内容一致） */
function loadArticles() {
  const s = fs.readFileSync(path.join(DIR, 'assets/articles.js'), 'utf8');
  const m = s.match(/window\.ARTICLES\s*=\s*(\[[\s\S]*?\])\s*;/);
  return m ? eval(m[1]) : [];
}
function loadFetched() {
  const s = fs.readFileSync(path.join(DIR, 'assets/fetched.js'), 'utf8');
  const m = s.match(/window\.FETCHED\s*=\s*(\[[\s\S]*?\])\s*;/)
         || s.match(/window\.FETCHED\s*=\s*(\[[\s\S]*\])\s*;/);
  return m ? eval(m[1]) : [];
}

/* HTML 正文 → Markdown 纯文本 */
function html2md(html) {
  let s = String(html || '');

  // 预处理：去掉脚本/样式
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
       .replace(/<style[\s\S]*?<\/style>/gi, '');

  // 代码块先占位，避免内部内容被后续规则破坏
  const codes = [];
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => {
    const inner = c.replace(/<br\s*\/?>/gi, '\n')
                   .replace(/<[^>]+>/g, '')
                   .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
    codes.push(inner);
    return '\u0000CODE' + (codes.length - 1) + '\u0000';
  });

  // 标题
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // 列表
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  s = s.replace(/<\/?[uo]l[^>]*>/gi, '\n');

  // 行内强调
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // 段落 / 换行
  s = s.replace(/<\/p>/gi, '\n\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(div|section|blockquote)>/gi, '\n');

  // 去除其余标签
  s = s.replace(/<[^>]+>/g, '');

  // 实体还原
  s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
       .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');

  // 放回代码块
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => '\n\n```\n' + codes[+i] + '\n```\n\n');

  // 整理空白：压缩 3+ 空行为 2 行，去掉行尾空格
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/* 构造单篇文章的 Markdown */
function articleMd(a, kind) {
  const L = [];
  L.push('# ' + a.title);
  L.push('');
  L.push('> **' + (kind === 'fetched' ? '官方原文转载' : '原创科普') + '**　·　' +
         (kind === 'fetched'
           ? '来源：' + (a.source || '') + '　·　许可：' + (a.license || '')
           : '许可：' + (a.license || '') + '　·　阅读约 ' + (a.read || '') + '　·　更新 ' + (a.updated || '')));
  if (kind === 'fetched') {
    L.push('>');
    L.push('> 原文：' + (a.sourceUrl || ''));
    if (a.updated) L.push('> 抓取日期：' + a.updated);
  }
  L.push('');
  if (a.summary) { L.push('**摘要**：' + a.summary); L.push(''); }
  L.push('---');
  L.push('');
  L.push(html2md(a.html));
  L.push('');
  L.push('---');
  L.push('');
  return L.join('\n');
}

/* 主流程 */
const original = loadArticles();
const fetched = loadFetched();
const totalChars = [...original, ...fetched]
  .reduce((n, a) => n + String(a.html || '').replace(/<[^>]+>/g, '').length, 0);

const header = [
  '# AI 大模型与服务器技术 · 完整正文合集',
  '',
  '> 本文件是**正文全文**，不是链接清单。所有内容可直接阅读、复制、转载。',
  '> 由 `export-content.js` 从站点数据源 `assets/articles.js`（原创）+ `assets/fetched.js`（官方原文转载）自动导出，与网站页面同源。',
  '',
  '**统计**：共 ' + (original.length + fetched.length) + ' 篇　·　原创 ' + original.length +
    ' 篇　·　官方原文转载 ' + fetched.length + ' 篇　·　正文约 ' + totalChars + ' 字',
  '',
  '## 目录',
  ''
].join('\n');

const toc = [];
toc.push('### 一、原创科普（' + original.length + ' 篇）');
toc.push('');
original.forEach((a, i) => toc.push((i + 1) + '. ' + a.title + '　（`#' + a.id + '`）'));
toc.push('');
toc.push('### 二、官方原文转载（' + fetched.length + ' 篇）');
toc.push('');
fetched.forEach((a, i) => toc.push((i + 1 + original.length) + '. ' + a.title + '　（`#' + a.id + '`）'));
toc.push('');
toc.push('---');
toc.push('');

const parts = [];
parts.push('<!-- ===== 原创科普 ===== -->');
parts.push('');
original.forEach(a => parts.push('<a id="' + a.id + '"></a>'));
original.forEach(a => parts.push('') && parts.push(articleMd(a, 'original')));
parts.push('<!-- ===== 官方原文转载 ===== -->');
parts.push('');
fetched.forEach(a => parts.push('<a id="' + a.id + '"></a>'));
fetched.forEach(a => parts.push('') && parts.push(articleMd(a, 'fetched')));

const md = header + toc.join('\n') + parts.join('\n');
fs.writeFileSync(OUT, md, 'utf8');

console.log('✔ 已导出：' + OUT);
console.log('  篇数：' + (original.length + fetched.length) +
            '（原创 ' + original.length + ' + 转载 ' + fetched.length + '）');
console.log('  正文约 ' + totalChars + ' 字　文件 ' + fs.statSync(OUT).size + ' 字节');
