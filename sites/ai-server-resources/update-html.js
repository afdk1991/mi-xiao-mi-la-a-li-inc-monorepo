/* 更新所有页面脚本引入：
   - 移除本地静态数据源 data.js / articles.js / fetched.js（数据改由云端提供）
   - 引入 WorkBuddy Cloud SDK（CDN）与 assets/cloud.js（在 curated.js / app.js 之前） */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const SDK = '<script src="https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js"></script>';
const CLOUD = '<script src="assets/cloud.js"></script>';

const files = fs.readdirSync(root).filter((f) => f.endsWith('.html') && f !== 'dist');

files.forEach((f) => {
  const p = path.join(root, f);
  let html = fs.readFileSync(p, 'utf8');

  // 移除本地静态数据源
  html = html
    .replace(/<script src="assets\/data\.js"><\/script>\s*\n/, '')
    .replace(/<script src="assets\/articles\.js"><\/script>\s*\n/, '')
    .replace(/<script src="assets\/fetched\.js"><\/script>\s*\n/, '');

  // 避免重复插入
  if (html.indexOf('assets/cloud.js') === -1) {
    const block = SDK + '\n' + CLOUD + '\n';
    if (html.indexOf('assets/curated.js') !== -1) {
      html = html.replace('<script src="assets/curated.js"></script>', block + '<script src="assets/curated.js"></script>');
    } else if (html.indexOf('assets/app.js') !== -1) {
      html = html.replace('<script src="assets/app.js"></script>', block + '<script src="assets/app.js"></script>');
    } else {
      // 兜底：追加到末尾 </body> 前
      html = html.replace('</body>', block + '</body>');
    }
  }

  fs.writeFileSync(p, html, 'utf8');
  console.log('已更新：' + f);
});

console.log('\n完成。共处理 ' + files.length + ' 个页面。');
