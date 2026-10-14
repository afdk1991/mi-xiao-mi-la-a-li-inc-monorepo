/* 设计令牌提取脚本：对比 zibll.com 与本地站（临时分析用，可删除） */
const { chromium } = require('D:/网站全栈项目/项目002/node_modules/playwright-core');
const fs = require('fs');

async function grab(browser, url, out) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6000);
  const data = await page.evaluate(() => {
    const pick = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const c = getComputedStyle(el);
      const o = { sel };
      props.forEach(p => (o[p] = c.getPropertyValue(p)));
      return o;
    };
    const vars = {};
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (const r of rules) {
        const sel = r.selectorText || '';
        if (sel === ':root' || sel === 'html' || sel === 'body' || sel === 'body.dark' || sel === 'html.dark') {
          const m = (r.cssText.match(/--[\w-]+\s*:\s*[^;]+/g) || []);
          m.forEach(x => {
            const i = x.indexOf(':');
            const k = x.slice(0, i).trim();
            if (!vars[k]) vars[k] = x.slice(i + 1).trim();
          });
        }
      }
    }
    const navEls = document.querySelectorAll('header nav > ul > li, .navbar-nav > li, #header .menu > li, ul.nav > li, .site-header nav li');
    const nav = [];
    navEls.forEach((li, i) => { if (i < 12) nav.push((li.querySelector('a') || li).textContent.trim().replace(/\s+/g, ' ').slice(0, 20)); });
    const footH = [];
    document.querySelectorAll('footer h4, footer h5, .site-footer h4, .site-footer h5, #footer h4').forEach(h => footH.push(h.textContent.trim().slice(0, 12)));
    const cont = pick('.container, #main .container, .main-container, .content-wrap', ['max-width', 'width']);
    return {
      href: location.href,
      title: document.title,
      vars,
      header: pick('header, #header, .site-header, .navbar', ['background-color', 'position', 'height', 'backdrop-filter', 'box-shadow']),
      container: cont,
      body: pick('body', ['background-color', 'font-family', 'font-size', 'color', 'line-height']),
      h1: pick('h1', ['font-size', 'font-weight', 'line-height', 'color']),
      h2: pick('h2', ['font-size', 'font-weight', 'line-height']),
      h3: pick('h3', ['font-size', 'font-weight', 'line-height']),
      btnPrimary: pick('a.btn-primary, .btn-primary, button.btn-primary, .btn.focus-color, .post-list .item-img', ['background-color', 'color', 'border-radius', 'padding', 'font-size']),
      card: pick('.post-list-item, .post-module, .post-card, article.card, .item-img, .zib-widget', ['background-color', 'border-radius', 'box-shadow', 'border']),
      link: pick('.post-title a, h2 a, .post-item-title', ['color', 'font-size']),
      aLink: pick('main a:not(.btn), .content a, p a', ['color']),
      navCount: navEls.length, nav,
      footH,
      darkToggle: !!document.querySelector('[class*="dark"], #dark, .dark-toggle'),
      backTop: !!document.querySelector('#back_top, .back-top, [class*="back-top"], [class*="gotop"], [id*="backtop"]'),
    };
  });
  // 移动端 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  data.mobile = await page.evaluate(() => {
    const grid = document.querySelector('.post-grid, .category-grid, .product-grid, .post-list, .post-listing, ul.post-list');
    const burger = document.querySelector('.navbar-toggler, .menu-toggle, [class*="hamburger"], [class*="nav-toggle"], #mobile-menu, .sidebar-mobile');
    return {
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      hamburger: burger ? (burger.className || burger.id).toString().slice(0, 60) : null,
      headerHeight: (document.querySelector('header, #header, .site-header') || {}).offsetHeight || null,
    };
  });
  fs.writeFileSync(out, JSON.stringify(data, null, 1));
  await ctx.close();
  console.log('saved:', out, '| title:', data.title.slice(0, 40));
}

(async () => {
  const browser = await chromium.launch();
  await grab(browser, 'https://www.zibll.com/', 'd:/网站全栈项目/项目01/.trae/screenshots/zibll-ref/design.json');
  await grab(browser, 'http://localhost/?cachebust=3', 'd:/网站全栈项目/项目01/.trae/screenshots/local-site/design.json');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
