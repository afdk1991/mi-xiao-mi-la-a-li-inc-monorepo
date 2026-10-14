/* 新增 UI 特性验收：暗色模式无溢出、主题切换、阅读进度条、页头阴影、滚动渐显 */
const { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');
const DIR = 'F:/合并项目/AI大模型等等/ai-server-resources';

const SIZES = [{ w: 1440, h: 900 }, { w: 900, h: 1000 }, { w: 390, h: 844 }];
const PAGES = ['index.html','resources.html','category.html?c=A','resource.html?id=C1',
  'compliance.html','curated.html','about.html','articles.html','article.html?id=transformer','content.html'];
const DIST = ['#/','#/resources','#/articles','#/article/transformer','#/content','#/compliance'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  let fail = 0, total = 0;
  const log = (name, ok, extra) => { total++; if (!ok) fail++; console.log((ok ? '✓ ' : '✗ ') + name + (extra ? '  [' + extra + ']' : '')); };

  // 一、暗色模式：每页强制 dark，三档断点无横向溢出
  console.log('=== 一、模块化站点 · 暗色模式无溢出（10 页 × 3 断点）===');
  for (const p of PAGES) {
    let maxOver = 0;
    for (const s of SIZES) {
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.goto('file:///' + DIR + '/' + p, { waitUntil: 'load' });
      await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
      await page.waitForTimeout(120);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (o > maxOver) maxOver = o;
    }
    log('暗色无溢出 · ' + p, maxOver <= 1, '最大溢出=' + maxOver + 'px');
  }

  // 二、主题切换按钮
  console.log('\n=== 二、主题切换 ===');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('file:///' + DIR + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(150);
  const t0 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#themeToggle');
  await page.waitForTimeout(80);
  const t1 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const icon = await page.evaluate(() => document.getElementById('themeToggle').textContent);
  log('初始主题已设置', t0 === 'light' || t0 === 'dark' || t0 === null, '初始=' + t0);
  log('点击后主题翻转', t0 !== t1 && (t1 === 'light' || t1 === 'dark'), '变为=' + t1);
  log('切换按钮图标同步', icon === '☀' || icon === '🌙', '图标=' + icon);

  // 三、阅读进度条
  console.log('\n=== 三、阅读进度条 ===');
  await page.goto('file:///' + DIR + '/article.html?id=transformer', { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const rHome = await page.evaluate(() => document.getElementById('readBar').classList.contains('on'));
  log('文章页进度条激活', rHome);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(120);
  const rWidth = await page.evaluate(() => parseFloat(document.getElementById('readBar').style.width) || 0);
  log('滚动后进度条推进', rWidth > 10 && rWidth < 95, '宽度=' + rWidth + '%');
  // 首页不应显示进度条
  await page.goto('file:///' + DIR + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(150);
  const rIndex = await page.evaluate(() => { const rb = document.getElementById('readBar'); return rb ? rb.classList.contains('on') : false; });
  log('首页进度条不激活', !rIndex);

  // 四、页头滚动阴影
  console.log('\n=== 四、页头滚动阴影 ===');
  await page.goto('file:///' + DIR + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(120);
  const sh0 = await page.evaluate(() => document.querySelector('.site-header').classList.contains('scrolled'));
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(120);
  const sh1 = await page.evaluate(() => document.querySelector('.site-header').classList.contains('scrolled'));
  log('顶部时页头无阴影', !sh0);
  log('滚动后页头加阴影', sh1);

  // 五、滚动渐显：兜底后内容可见
  console.log('\n=== 五、滚动渐显 ===');
  await page.goto('file:///' + DIR + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  const rev = await page.evaluate(() => {
    const els = document.querySelectorAll('.section,.grid,.stat-row');
    let hidden = 0;
    els.forEach(e => { if (getComputedStyle(e).opacity === '0') hidden++; });
    return { total: els.length, hidden };
  });
  log('渐显元素最终可见', rev.hidden === 0, '隐藏=' + rev.hidden + '/' + rev.total);

  // 六、dist 暗色 + 进度条
  console.log('\n=== 六、单文件版 · 暗色与进度条 ===');
  for (const route of DIST) {
    let maxOver = 0;
    for (const s of SIZES) {
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.goto('file:///' + DIR + '/dist/index.html' + route, { waitUntil: 'load' });
      await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
      await page.waitForTimeout(120);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (o > maxOver) maxOver = o;
    }
    log('dist 暗色无溢出 · ' + route, maxOver <= 1, '最大溢出=' + maxOver + 'px');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('file:///' + DIR + '/dist/index.html#/article/transformer', { waitUntil: 'load' });
  await page.waitForTimeout(250);
  const dAct = await page.evaluate(() => document.getElementById('readBar').classList.contains('on'));
  log('dist 文章路由进度条激活', dAct);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(150);
  const dW = await page.evaluate(() => parseFloat(document.getElementById('readBar').style.width) || 0);
  log('dist 滚动后进度条推进', dW > 10 && dW < 95, '宽度=' + dW + '%');

  log('全程无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n结果：' + (total - fail) + '/' + total + ' 通过' + (fail ? '（有失败）' : '（全部通过）'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
