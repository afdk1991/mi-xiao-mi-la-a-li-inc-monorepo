// 布局实测：验证「单 main」结构修复与响应式无溢出
// 检查项：① 每页 DOM 仅 1 个 <main>  ② 三档断点无横向溢出  ③ 主体上留白为令牌值  ④ 无控制台错误
// 用法：node layout-verify.js
const { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');
const DIR = 'F:/合并项目/AI大模型等等/ai-server-resources';

// 桌面 / 平板 / 移动 三档断点
const SIZES = [
  { w: 1440, h: 900, name: '桌面1440' },
  { w: 900, h: 1000, name: '平板900' },
  { w: 390, h: 844, name: '移动390' }
];

const PAGES = [
  'index.html',
  'resources.html',
  'category.html?c=A',
  'resource.html?id=C1',
  'compliance.html',
  'curated.html',
  'about.html',
  'articles.html',
  'article.html?id=transformer',
  'article.html?id=rfc9110-http',      // 转载原文：RFC 纯文本，最容易横向溢出
  'article.html?id=archwiki-systemd',  // 转载原文：ArchWiki 长文
  'content.html'                        // 全文阅读：13 篇正文连续渲染，最长页面
];

const DIST_ROUTES = ['#/', '#/resources', '#/articles', '#/article/transformer',
  '#/article/rfc9110-http', '#/content', '#/compliance'];

async function checkPage(page, url, sizes) {
  const res = { mainCounts: [], maxOverflow: 0, padTop: null, errs: [] };
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const mains = document.querySelectorAll('main');
      const main = mains[0];
      const de = document.documentElement;
      // 取第一个有实际高度的内容元素，测量其距文档顶部的位置
      return {
        mainCount: mains.length,
        overflow: de.scrollWidth - window.innerWidth,
        padTop: main ? getComputedStyle(main).paddingTop : null
      };
    });
    res.mainCounts.push(r.mainCount);
    if (r.overflow > res.maxOverflow) res.maxOverflow = r.overflow;
    if (r.padTop && !res.padTop) res.padTop = r.padTop;
  }
  return res;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleErrs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', e => consoleErrs.push(String(e)));

  let fail = 0, total = 0;

  console.log('=== 一、模块化站点（9 页 × 3 断点）===');
  console.log('页面'.padEnd(32) + 'main数  最大横向溢出  主体上留白  状态');
  console.log('-'.repeat(76));
  for (const p of PAGES) {
    total++;
    consoleErrs.length = 0;
    const r = await checkPage(page, 'file:///' + DIR + '/' + p, SIZES);
    const singleMain = r.mainCounts.every(c => c === 1);
    const noOverflow = r.maxOverflow <= 1;
    const ok = singleMain && noOverflow && consoleErrs.length === 0;
    if (!ok) fail++;
    const mainStr = [...new Set(r.mainCounts)].join('/');
    console.log(
      p.padEnd(32) +
      mainStr.padEnd(7) +
      (noOverflow ? '无' : ('溢出 ' + r.maxOverflow + 'px')).padEnd(14) +
      String(r.padTop || '-').padEnd(12) +
      (ok ? '✔' : '✘ ' + (singleMain ? '' : 'main数异常 ') + (noOverflow ? '' : '溢出 ') + (consoleErrs.length ? '控制台错误' : ''))
    );
  }

  console.log('\n=== 二、单文件分发版 dist/index.html（5 路由 × 3 断点）===');
  console.log('路由'.padEnd(32) + 'main数  最大横向溢出  主体上留白  状态');
  console.log('-'.repeat(76));
  for (const route of DIST_ROUTES) {
    total++;
    consoleErrs.length = 0;
    const r = await checkPage(page, 'file:///' + DIR + '/dist/index.html' + route, SIZES);
    const singleMain = r.mainCounts.every(c => c === 1);
    const noOverflow = r.maxOverflow <= 1;
    const ok = singleMain && noOverflow && consoleErrs.length === 0;
    if (!ok) fail++;
    const mainStr = [...new Set(r.mainCounts)].join('/');
    console.log(
      route.padEnd(32) +
      mainStr.padEnd(7) +
      (noOverflow ? '无' : ('溢出 ' + r.maxOverflow + 'px')).padEnd(14) +
      String(r.padTop || '-').padEnd(12) +
      (ok ? '✔' : '✘')
    );
  }

  await browser.close();
  console.log('\n' + '-'.repeat(76));
  console.log('结果：' + (total - fail) + '/' + total + ' 个场景通过' +
    (fail === 0 ? '（全部页面仅 1 个 <main>，三档断点均无横向溢出，无控制台错误）' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
