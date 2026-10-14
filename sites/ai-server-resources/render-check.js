/* 真实浏览器渲染验证：Edge + playwright-core
   用法：node render-check.js
   校验精选页与首页在真实渲染下的 DOM 输出、布局无溢出、无控制台错误。 */
'use strict';
var path = require('path');
var { pathToFileURL } = require('url');
var { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');

var DIR = __dirname;
function url(f) { return pathToFileURL(path.join(DIR, f)).href; }

var CHECKS = [];
function chk(name, ok, detail) { CHECKS.push({ name: name, ok: ok, detail: detail }); }

(async function () {
  var browser = await chromium.launch({ channel: 'msedge' });
  var page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  var errs = [];
  page.on('console', function (m) { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });

  // ---- 精选页 ----
  await page.goto(url('curated.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);

  var rows = await page.locator('#curOut tbody tr').count();
  chk('精选页表格数据行 = 21', rows === 21, '实际 ' + rows);

  var secs = await page.locator('#curOut .section').count();
  chk('分类区块 = 6', secs === 6, '实际 ' + secs);

  var verify = await page.locator('#curVerify tbody tr').count();
  chk('需核实项 = 5', verify === 5, '实际 ' + verify);

  var notes = await page.locator('#curNotes .note-item').count();
  chk('注意事项 = 10', notes === 10, '实际 ' + notes);

  var stats = await page.locator('#curStat .stat-card').count();
  chk('统计卡 = 6', stats === 6, '实际 ' + stats);

  var navText = await page.locator('#siteNav').innerText();
  chk('导航含「精选 21 项」', /精选 21 项/.test(navText), navText.replace(/\n/g, ' / '));

  // 表格未横向溢出容器（允许 .table-wrap 内部滚动，检查 wrap 宽度不超过视口）
  var overflow = await page.evaluate(function () {
    var bad = [];
    document.querySelectorAll('.table-wrap').forEach(function (w, i) {
      var r = w.getBoundingClientRect();
      if (r.right > window.innerWidth + 1) bad.push('wrap#' + i + ' right=' + Math.round(r.right));
    });
    return bad;
  });
  chk('表格容器无横向溢出', overflow.length === 0, overflow.join('; ') || '无');

  // 首行表格实际渲染高度（非折叠）
  var firstRowBox = await page.locator('#curOut tbody tr').first().boundingBox();
  chk('首行已渲染出可见高度', !!firstRowBox && firstRowBox.height > 30,
    firstRowBox ? Math.round(firstRowBox.height) + 'px' : 'null');

  // 导出按钮可点击并填充 textarea
  await page.locator('.js-export').first().click();
  await page.waitForTimeout(250);
  var md = await page.locator('#mdOut').inputValue();
  chk('导出 Markdown 非空且含 21 项', md.length > 2000 && /21 项/.test(md), md.length + ' 字符');
  var mdTitle = await page.locator('#mdTitle').innerText();
  chk('导出弹窗标题为精选版', /精选清单/.test(mdTitle), mdTitle);
  await page.locator('#closeBtn').click();

  await page.screenshot({ path: path.join(DIR, 'preview-curated.png'), fullPage: false });
  await page.evaluate(function () { window.scrollTo(0, 900); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(DIR, 'preview-curated-table.png') });

  // ---- 首页（导航联动）----
  await page.goto(url('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  var idxNav = await page.locator('#siteNav').innerText();
  chk('首页导航含「精选 21 项」', /精选 21 项/.test(idxNav), idxNav.replace(/\n/g, ' / '));
  await page.locator('#siteNav a[href="curated.html"]').click();
  await page.waitForTimeout(400);
  chk('首页点击导航可跳转精选页', /curated\.html/.test(page.url()), page.url().split('/').pop());
  var rows2 = await page.locator('#curOut tbody tr').count();
  chk('跳转后表格正常渲染', rows2 === 21, '实际 ' + rows2);

  chk('无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | ') || '无');

  await browser.close();

  var fail = 0;
  CHECKS.forEach(function (c) {
    if (!c.ok) fail++;
    console.log((c.ok ? '✓ ' : '✗ ') + c.name + '　（' + c.detail + '）');
  });
  console.log('\n浏览器渲染验证：' + (CHECKS.length - fail) + '/' + CHECKS.length + ' 通过');
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('渲染验证异常：', e.message);
  process.exit(1);
});
