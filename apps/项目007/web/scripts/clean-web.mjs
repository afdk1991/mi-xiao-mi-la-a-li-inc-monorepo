// 构建前精确清理 web 自有产物，绝不触碰 makers/static 下的
// files/（用户上传）、admin/、api/（静态接口）、external/ 等同云函数静态资产。
// 修复前 emptyOutDir:true 指向 makers/static 会清空整目录、导致数据丢失。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webOutRoot = path.resolve(__dirname, '../makers/static');

// 1) 站点根入口（web 独有的 index.html；admin 的 index.html 在 admin/ 子目录，不受影响）
const entry = path.join(webOutRoot, 'index.html');
if (fs.existsSync(entry)) fs.rmSync(entry);

// 2) 仅删除 vite 生成的 web 哈希资源 index-*.{js,css}
//    （admin 不引用根 /assets/index-*，故此清理不会误伤 admin 产物）
const assetsDir = path.join(webOutRoot, 'assets');
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir)) {
    if (/^index-.*\.(js|css)$/.test(f)) {
      fs.rmSync(path.join(assetsDir, f));
    }
  }
}

console.log('[clean-web] 已清理 web 旧产物，files/admin/api/external 保持不动');
