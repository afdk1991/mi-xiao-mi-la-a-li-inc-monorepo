/* UI 优化验收：交互态（focus / hover / disabled / loading）、栅格对齐、断点行为、减少动效
   用法：node ui-verify.js */
'use strict';
var path = require('path');
var { pathToFileURL } = require('url');
var { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');

var DIR = __dirname;
function url(f) { return pathToFileURL(path.join(DIR, f)).href; }
var R = [];
function chk(name, ok, detail) { R.push({ name: name, ok: ok, detail: detail }); }

(async function () {
  var browser = await chromium.launch({ channel: 'msedge' });

  /* ---------------- 桌面：交互态 ---------------- */
  var page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);

  // 1) 键盘焦点可见性：Tab 遍历，统计有可见 outline 的元素
  var focusVisible = 0, focusTotal = 0;
  for (var i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    var has = await page.evaluate(function () {
      var el = document.activeElement;
      if (!el || el === document.body) return null;
      var cs = getComputedStyle(el);
      return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== 'none';
    });
    if (has !== null) { focusTotal++; if (has) focusVisible++; }
  }
  chk('键盘焦点均有可见指示', focusVisible === focusTotal && focusTotal > 5,
    focusVisible + '/' + focusTotal + ' 个可聚焦元素有 outline/ring');

  // 2) hover 态：分类卡边框变化
  var before = await page.locator('.cat-card').first().evaluate(function (e) { return getComputedStyle(e).borderTopColor; });
  await page.locator('.cat-card').first().hover();
  await page.waitForTimeout(320);
  var after = await page.locator('.cat-card').first().evaluate(function (e) { return getComputedStyle(e).borderTopColor; });
  chk('卡片 hover 有视觉反馈', before !== after, before + ' → ' + after);

  // 3) 按钮 hover 变色
  var btn = page.locator('.btn').first();
  var b1 = await btn.evaluate(function (e) { return getComputedStyle(e).backgroundColor; });
  await btn.hover();
  await page.waitForTimeout(320);
  var b2 = await btn.evaluate(function (e) { return getComputedStyle(e).backgroundColor; });
  chk('按钮 hover 有视觉反馈', b1 !== b2, b1 + ' → ' + b2);

  // 4) 禁用态
  var dis = await page.evaluate(function () {
    // 必须用真实 <button>：<a class="btn"> 不支持 disabled 属性
    var b = document.querySelector('button.btn');
    b.disabled = true;
    var cs = getComputedStyle(b);
    var r = { tag: b.tagName, opacity: parseFloat(cs.opacity), cursor: cs.cursor };
    b.disabled = false;
    // 同时验证语义禁用（对链接等无 disabled 属性的元素）
    var a = document.querySelector('.btn');
    a.setAttribute('aria-disabled', 'true');
    var cs2 = getComputedStyle(a);
    r.ariaOpacity = parseFloat(cs2.opacity);
    a.removeAttribute('aria-disabled');
    return r;
  });
  chk('禁用态：半透明 + not-allowed', dis.opacity < 1 && dis.cursor === 'not-allowed',
    dis.tag + ' opacity=' + dis.opacity + ' cursor=' + dis.cursor);
  chk('语义禁用（aria-disabled）同样生效', dis.ariaOpacity < 1, 'opacity=' + dis.ariaOpacity);

  // 5) 加载态：点击导出后短暂出现 .is-loading，随后消失
  await page.locator('.js-export').first().click();
  var loadingSeen = await page.evaluate(function () {
    return !!document.querySelector('.js-export.is-loading');
  });
  await page.waitForTimeout(400);
  var loadingGone = await page.evaluate(function () {
    return !document.querySelector('.js-export.is-loading');
  });
  var modalOpen = await page.evaluate(function () { return !!document.querySelector('.modal.on'); });
  chk('加载态出现并自动结束', loadingSeen && loadingGone, '出现=' + loadingSeen + ' 结束=' + loadingGone);
  chk('导出弹窗正常打开', modalOpen, 'modal.on=' + modalOpen);
  await page.locator('#closeBtn').click();

  // 6) 栅格对齐：同一行卡片等高、互不重叠
  var align = await page.evaluate(function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.grid .card'));
    if (cards.length < 2) return { ok: true, note: '卡片不足' };
    var heights = cards.map(function (c) { return Math.round(c.getBoundingClientRect().height); });
    var overlap = 0;
    for (var i = 0; i < cards.length; i++) {
      for (var j = i + 1; j < cards.length; j++) {
        var a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++;
      }
    }
    return { overlap: overlap, heights: heights };
  });
  chk('卡片无重叠', align.overlap === 0, '重叠对数=' + (align.overlap || 0));

  // 7) 锚点跳转不被 sticky 页头遮挡（scroll-padding-top）
  await page.goto(url('curated.html'), { waitUntil: 'load' });
  await page.waitForTimeout(250);
  await page.locator('a[href="#sec-C"]').click();
  await page.waitForTimeout(600);
  var anchorTop = await page.locator('#sec-C').evaluate(function (e) { return Math.round(e.getBoundingClientRect().top); });
  chk('锚点定位避开 sticky 页头', anchorTop >= 60, '区块顶部距离视口 ' + anchorTop + 'px（页头高 60px）');

  /* ---------------- 移动端：断点行为 ---------------- */
  var m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(url('index.html'), { waitUntil: 'load' });
  await m.waitForTimeout(300);

  var navHidden = await m.locator('#siteNav').evaluate(function (e) { return getComputedStyle(e).display; });
  chk('移动端导航默认折叠', navHidden === 'none', 'display=' + navHidden);
  await m.locator('#navToggle').click();
  await m.waitForTimeout(250);
  var navShown = await m.locator('#siteNav').evaluate(function (e) {
    var cs = getComputedStyle(e);
    return cs.display + '/' + cs.flexDirection;
  });
  chk('点击汉堡菜单展开纵向导航', navShown.indexOf('flex') === 0 && /column/.test(navShown), navShown);
  var itemH = await m.locator('#siteNav a').first().evaluate(function (e) { return Math.round(e.getBoundingClientRect().height); });
  chk('移动端菜单项触控高度 ≥40px', itemH >= 40, itemH + 'px');

  // 移动端：表格可横向滚动且提示可见
  await m.goto(url('curated.html'), { waitUntil: 'load' });
  await m.waitForTimeout(300);
  var tbl = await m.evaluate(function () {
    var w = document.querySelector('.table-wrap');
    return {
      scrollable: w.scrollWidth > w.clientWidth,
      hint: getComputedStyle(w, '::after').content
    };
  });
  chk('窄屏表格可横向滚动', tbl.scrollable, 'scrollWidth > clientWidth = ' + tbl.scrollable);
  chk('窄屏表格有滑动提示', /滑动/.test(tbl.hint), tbl.hint.slice(0, 24));

  /* ---------------- 减少动效偏好 ---------------- */
  var rm = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await rm.emulateMedia({ reducedMotion: 'reduce' });
  await rm.goto(url('index.html'), { waitUntil: 'load' });
  await rm.waitForTimeout(250);
  var dur = await rm.locator('.btn').first().evaluate(function (e) { return getComputedStyle(e).transitionDuration; });
  chk('尊重 prefers-reduced-motion', parseFloat(dur) < 0.01, 'transition-duration=' + dur);

  await browser.close();

  var fail = 0;
  R.forEach(function (r) {
    if (!r.ok) fail++;
    console.log((r.ok ? '✓ ' : '✗ ') + r.name + '　（' + r.detail + '）');
  });
  console.log('\nUI 验收：' + (R.length - fail) + '/' + R.length + ' 通过');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error('验收异常：', e.message); process.exit(1); });
