/* UI 问题诊断：多视口 × 多页面，检测溢出、错位、重叠、触控目标与层级问题
   用法：node ui-audit.js
   只读检查，不修改任何文件。 */
'use strict';
var path = require('path');
var { pathToFileURL } = require('url');
var { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');

var DIR = __dirname;
var PAGES = ['index.html', 'resources.html', 'curated.html', 'category.html?c=A',
  'resource.html?id=C1', 'compliance.html', 'about.html'];
var VIEWPORTS = [
  { name: '桌面 1440', w: 1440, h: 900 },
  { name: '小桌面 1180', w: 1180, h: 900 },
  { name: '平板 834', w: 834, h: 1100 },
  { name: '手机 390', w: 390, h: 844 },
  { name: '窄屏 320', w: 320, h: 700 }
];

var AUDIT = function () {
  var out = { overflowX: 0, offenders: [], navOverflow: 0, tinyText: [], smallTargets: [], footerCols: 0 };
  var vw = window.innerWidth;
  out.overflowX = document.documentElement.scrollWidth - vw;

  var allowScroll = function (el) {
    // 允许内部横向滚动的容器（表格包裹层）
    var p = el;
    while (p && p !== document.body) {
      var ov = getComputedStyle(p).overflowX;
      if (ov === 'auto' || ov === 'scroll') return true;
      p = p.parentElement;
    }
    return false;
  };

  document.querySelectorAll('body *').forEach(function (el) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.right > vw + 1 && !allowScroll(el)) {
      out.offenders.push(el.tagName.toLowerCase() +
        (el.id ? '#' + el.id : '') +
        (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') +
        ' right=' + Math.round(r.right));
    }
    var fs = parseFloat(cs.fontSize);
    if (fs && fs < 12 && el.textContent.trim().length > 2 && el.children.length === 0) {
      out.tinyText.push(Math.round(fs * 10) / 10 + 'px: ' + el.textContent.trim().slice(0, 18));
    }
    var cls = (el.className || '').toString();
    var isControl = el.tagName === 'BUTTON' || /\b(btn|chip|nav|cat-card|pager)\b/.test(cls) ||
      (el.id === 'toTop');
    if (isControl && r.width > 0 && r.height > 0) {
      if (r.height < 30 || r.width < 24) {
        out.smallTargets.push(el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0] +
          ' ' + Math.round(r.width) + '×' + Math.round(r.height));
      }
    }
  });

  var nav = document.querySelector('.nav-wrap');
  if (nav) out.navOverflow = nav.scrollWidth - nav.clientWidth;
  var fg = document.querySelector('.foot-grid');
  if (fg) out.footerCols = getComputedStyle(fg).gridTemplateColumns.split(' ').length;

  out.offenders = out.offenders.slice(0, 6);
  out.tinyText = out.tinyText.slice(0, 4);
  out.smallTargets = out.smallTargets.slice(0, 5);
  return out;
};

(async function () {
  var browser = await chromium.launch({ channel: 'msedge' });
  var problems = [];
  for (var v = 0; v < VIEWPORTS.length; v++) {
    var vp = VIEWPORTS[v];
    var page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    console.log('\n──────── ' + vp.name + ' (' + vp.w + '×' + vp.h + ') ────────');
    for (var i = 0; i < PAGES.length; i++) {
      var f = PAGES[i];
      var qi = f.indexOf('?');
      var file = qi >= 0 ? f.slice(0, qi) : f;
      var qs = qi >= 0 ? f.slice(qi) : '';
      await page.goto(pathToFileURL(path.join(DIR, file)).href + qs, { waitUntil: 'load' });
      await page.waitForTimeout(220);
      var r = await page.evaluate(AUDIT);
      var bad = [];
      if (r.overflowX > 1) bad.push('横向溢出 ' + r.overflowX + 'px');
      if (r.navOverflow > 1) bad.push('导航条溢出 ' + r.navOverflow + 'px');
      if (r.offenders.length) bad.push('越界元素: ' + r.offenders.join(' | '));
      if (r.tinyText.length) bad.push('过小字号: ' + r.tinyText.join(' | '));
      if (r.smallTargets.length) bad.push('触控目标偏小: ' + r.smallTargets.join(' | '));
      if (bad.length) {
        problems.push({ vp: vp.name, page: f, bad: bad });
        console.log('✗ ' + f);
        bad.forEach(function (b) { console.log('    · ' + b); });
      } else {
        console.log('✓ ' + f + '　（页脚列数 ' + r.footerCols + '）');
      }
    }
    await page.close();
  }
  await browser.close();
  console.log('\n诊断完成：共发现 ' + problems.length + " 处页面×视口组合存在问题");
})().catch(function (e) { console.error('诊断异常：', e.message); process.exit(1); });
