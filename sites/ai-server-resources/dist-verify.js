/* 单文件分发版（dist/index.html）路由与渲染验收 */
const { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const DIR = 'F:/合并项目/AI大模型等等/ai-server-resources';
const url = pathToFileURL(path.join(DIR, 'dist/index.html')).href;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const results = [];
  function chk(name, pass, extra) { results.push([pass, name, extra || '']); }

  // 桌面端
  let page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  // 首页
  let r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); if (!e) return null; return getComputedStyle(e).display !== 'none'; };
    return {
      homeVisible: vis('view-home'),
      statCards: document.querySelectorAll('#homeStats .stat-card').length,
      catCards: document.querySelectorAll('#homeCats .cat-card').length,
      picks: document.querySelectorAll('#homePicks .card').length
    };
  });
  chk('首页视图可见', r.homeVisible);
  chk('首页统计卡=5', r.statCards === 5, '实际=' + r.statCards);
  chk('首页类目卡=8', r.catCards === 8, '实际=' + r.catCards);
  chk('首页精选卡=6', r.picks === 6, '实际=' + r.picks);

  // 资源库
  await page.evaluate(() => { location.hash = '#/resources'; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    return { vis: vis('view-resources'), cards: document.querySelectorAll('#libOut .card').length };
  });
  chk('资源库视图可见', r.vis);
  chk('资源库卡片=79', r.cards === 79, '实际=' + r.cards);

  // 搜索 vLLM
  await page.fill('#globalSearch', 'vLLM');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => {
    return {
      hash: location.hash,
      vis: (() => { const e = document.getElementById('view-resources'); return e && getComputedStyle(e).display !== 'none'; })(),
      cards: document.querySelectorAll('#libOut .card').length
    };
  });
  chk('搜索后跳资源库', /resources/.test(r.hash) && r.vis);
  chk('搜索 vLLM 命中少量', r.cards >= 1 && r.cards <= 3, '命中=' + r.cards);

  // 精选
  await page.evaluate(() => { location.hash = '#/curated'; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    return { vis: vis('view-curated'), secs: document.querySelectorAll('#curOut .section').length, stat: !!document.getElementById('curStat') };
  });
  chk('精选视图可见', r.vis);
  chk('精选分类段=6', r.secs === 6, '实际=' + r.secs);
  chk('精选统计区存在', r.stat);

  // 分类 A
  await page.evaluate(() => { location.hash = '#/category/A'; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    return { vis: vis('view-category'), title: (document.getElementById('catTitle') || {}).textContent, cards: document.querySelectorAll('#catOut .card').length };
  });
  chk('分类视图可见', r.vis);
  chk('分类A标题正确', /A\./.test(r.title || ''), '标题=' + r.title);
  chk('分类A卡片=15', r.cards === 15, '实际=' + r.cards);

  // 资源详情 C1
  await page.evaluate(() => { location.hash = '#/resource/C1'; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    return { vis: vis('view-resource'), hasDetail: !!document.querySelector('#resOut .detail-head h1') };
  });
  chk('详情视图可见', r.vis);
  chk('详情标题渲染', r.hasDetail);

  // 合规 / 关于
  await page.evaluate(() => { location.hash = '#/compliance'; });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => { const e = document.getElementById('view-compliance'); return e && getComputedStyle(e).display !== 'none'; });
  chk('合规视图可见', r);
  await page.evaluate(() => { location.hash = '#/about'; });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => { const e = document.getElementById('view-about'); return e && getComputedStyle(e).display !== 'none'; });
  chk('关于视图可见', r);

  // 技术文章列表
  await page.evaluate(() => { location.hash = '#/articles'; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    return { vis: vis('view-articles'), cards: document.querySelectorAll('#artOut .art-card').length };
  });
  chk('文章列表视图可见', r.vis);
  chk('文章列表卡=13（原创5+转载8）', r.cards === 13, '实际=' + r.cards);

  // 文章详情
  await page.evaluate(() => { location.hash = '#/article/transformer'; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    return {
      vis: vis('view-article'),
      hasH1: !!document.querySelector('#artDetailOut .article .article-head h1'),
      paras: document.querySelectorAll('#artDetailOut .article h2').length,
      hasReprint: !!document.querySelector('#artDetailOut .article .reprint')
    };
  });
  chk('文章详情视图可见', r.vis);
  chk('文章详情标题渲染', r.hasH1);
  chk('文章详情含多个小节', r.paras >= 5, 'h2 数=' + r.paras);
  chk('文章含转载声明块', r.hasReprint);

  // 联网抓取的官方原文（转载类）详情：验证真实正文已落地
  await page.evaluate(() => { location.hash = '#/article/nginx-beginner'; });
  await page.waitForTimeout(200);
  const rf = await page.evaluate(() => {
    const t = document.querySelector('#artDetailOut .article');
    return {
      hasH1: !!document.querySelector('#artDetailOut .article .article-head h1'),
      len: t ? t.textContent.replace(/\s+/g, '').length : 0,
      hasSource: !!document.querySelector('#artDetailOut .article-note a[href^="http"]'),
      hasReprint: !!document.querySelector('#artDetailOut .article .reprint')
    };
  });
  chk('转载原文标题渲染', rf.hasH1);
  chk('转载原文正文充足', rf.len > 5000, '正文 ' + rf.len + ' 字');
  chk('转载原文含来源链接', rf.hasSource);
  chk('转载原文含许可声明', rf.hasReprint);

  // 全文阅读视图：一次性渲染全部正文（非卡片清单）
  await page.evaluate(() => { location.hash = '#/content'; });
  await page.waitForTimeout(300);
  const fc = await page.evaluate(() => {
    let chars = 0;
    document.querySelectorAll('#fullOut .article').forEach(a => { chars += a.textContent.replace(/\s+/g, '').length; });
    return {
      secs: document.querySelectorAll('#fullOut .full-sec').length,
      toc: document.querySelectorAll('#fullToc .toc-list li').length,
      chars: chars,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      stat: (document.getElementById('fullStat') || {}).textContent || ''
    };
  });
  chk('全文阅读渲染 13 篇完整正文', fc.secs === 13, '实际=' + fc.secs);
  chk('全文阅读目录项=13', fc.toc === 13, '实际=' + fc.toc);
  chk('全文阅读正文充足', fc.chars > 80000, '正文 ' + fc.chars + ' 字');
  chk('全文阅读无横向溢出', fc.overflow <= 0, '溢出=' + fc.overflow + 'px');
  chk('全文阅读统计文案含篇数', /13 篇正文/.test(fc.stat), fc.stat.slice(0, 60));

  // 同一时刻仅一个视图可见
  r = await page.evaluate(() => {
    const ids = ['home','resources','category','resource','compliance','curated','articles','article','content','about'];
    const shown = ids.filter(id => { const e = document.getElementById('view-' + id); return e && getComputedStyle(e).display !== 'none'; });
    return shown;
  });
  chk('同时仅一个视图可见', r.length === 1, '可见=' + r.join(','));

  // 导出弹窗
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(200);
  await page.click('.js-export');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => document.getElementById('modal').classList.contains('on'));
  chk('导出弹窗可打开', r);

  // 移动端溢出检查
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(url, { waitUntil: 'load' });
  await m.waitForTimeout(400);
  r = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  chk('移动端无横向溢出', r.sw <= r.iw + 1, 'scrollW=' + r.sw + ' innerW=' + r.iw);
  await m.close();

  chk('无控制台错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();

  let pass = 0;
  results.forEach(([p, n, e]) => { console.log((p ? '✓' : '✗') + ' ' + n + (e ? '  [' + e + ']' : '')); if (p) pass++; });
  console.log('\n结果：' + pass + '/' + results.length + ' 通过');
  process.exit(pass === results.length ? 0 : 1);
})();
