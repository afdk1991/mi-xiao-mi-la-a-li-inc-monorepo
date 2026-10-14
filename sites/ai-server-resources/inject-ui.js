/* 一次性注入：① 所有页面页头加入主题切换按钮 ② 文章/全文页加入阅读进度条
   仅在目标字符串存在且尚未注入时执行，可重复安全运行。 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const TOGGLE = '      <button class="theme-toggle" id="themeToggle" type="button" aria-label="切换深色 / 浅色主题" title="切换主题">🌙</button>\n';
const OLD_NAVSEARCH = '      <input id="globalSearch" type="search" placeholder="搜索资源…（回车）">\n      <button class="nav-toggle" id="navToggle" aria-label="菜单">☰</button>';
const NEW_NAVSEARCH = TOGGLE + '      <input id="globalSearch" type="search" placeholder="搜索资源…（回车）">\n      <button class="nav-toggle" id="navToggle" aria-label="菜单">☰</button>';

const READBAR = '<div id="readBar"></div>';
const AFTER_HEADER = '</header>';

const PAGES = ['index.html','resources.html','category.html','resource.html','compliance.html',
  'curated.html','about.html','articles.html','article.html','content.html'];

let changed = 0;
PAGES.forEach(function (f) {
  const p = path.join(DIR, f);
  let s = fs.readFileSync(p, 'utf8');
  // 注入主题按钮（仅一次）
  if (s.indexOf('id="themeToggle"') === -1) {
    if (s.indexOf(OLD_NAVSEARCH) === -1) { console.warn('⚠ ' + f + ' 未找到 nav-search 锚点，跳过'); return; }
    s = s.replace(OLD_NAVSEARCH, NEW_NAVSEARCH);
    changed++;
  }
  // 文章 / 全文页注入阅读进度条
  const isArticle = (f === 'article.html' || f === 'content.html');
  if (isArticle && s.indexOf('id="readBar"') === -1) {
    s = s.replace(AFTER_HEADER, AFTER_HEADER + '\n' + READBAR);
    changed++;
  }
  fs.writeFileSync(p, s, 'utf8');
  console.log('✓ ' + f + (isArticle ? '（含进度条）' : ''));
});
console.log('共修改 ' + changed + ' 处');
