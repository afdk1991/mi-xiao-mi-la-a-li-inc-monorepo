/* 真实渲染截图：亮 / 暗双主题 + 桌面 / 移动，用于人工目视核验 */
const { chromium } = require('C:/Users/Admin/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/playwright-core');
const DIR = 'F:/合并项目/AI大模型等等/ai-server-resources';
const OUT = DIR + '/verify-shots';
const fs = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();

  async function shot(file, route, theme, w, h, full) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('file:///' + DIR + '/' + file + (route || ''), { waitUntil: 'load' });
    if (theme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(700); // 等待渐显兜底
    const name = file.replace('.html', '') + '_' + theme + '_' + w + '.png';
    await page.screenshot({ path: OUT + '/' + name, fullPage: !!full });
    console.log('✓ ' + name);
  }

  await shot('index.html', '', 'light', 1440, 900, false);
  await shot('index.html', '', 'dark', 1440, 900, false);
  await shot('index.html', '', 'light', 390, 844, false);
  await shot('resources.html', '', 'light', 1440, 900, false);
  await shot('articles.html', '', 'light', 1440, 900, false);
  await shot('article.html', '?id=transformer', 'light', 1440, 900, false);
  await shot('article.html', '?id=transformer', 'dark', 1440, 900, false);
  await shot('content.html', '', 'dark', 1440, 900, false);
  await shot('curated.html', '', 'light', 1440, 900, false);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
