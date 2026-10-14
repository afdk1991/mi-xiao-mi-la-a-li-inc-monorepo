// 按新域名重签 OTA 发布清单。无第三方依赖（Node 内置 crypto）。
//
// 背景：签名消息含 URL（f"{version}|{build}|{sha256}|{url}"），换域名后旧签名全部失效。
// makers/scripts/export_static.py 本来负责这件事，但它依赖 sqlalchemy（本机受管 Python 未装），
// 所以这里提供一个等价但零依赖的实现。
//
// 用法：
//   node scripts/resign_ota_domain.mjs https://<新域名>          # 试运行
//   node scripts/resign_ota_domain.mjs https://<新域名> --write  # 落盘
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrivateKey, sign } from 'node:crypto';

const newBase = process.argv[2];
const write = process.argv.includes('--write');
if (!newBase) { console.error('用法: node scripts/resign_ota_domain.mjs https://<新域名> [--write]'); process.exit(2); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RELEASES = path.join(ROOT, 'makers', 'data', 'releases.json');
const PRIV = path.join(ROOT, 'keys', 'ota_private.pem');

// 匹配任意历史/当前托管主机（含未知的新旧域名段），避免域名轮换后静默漏签。
// 注意：域名段允许连字符（如 manju-drama-hub-tkwcxlaw），写成 [a-z0-9]+ 会漏匹配。
const HOST_RE = /(https?:\/\/)(?:manju-[a-z0-9-]+\.edgeone\.cool|127\.0\.0\.1(?::\d+)?|localhost(?::\d+)?)/;

const pem = fs.readFileSync(PRIV, 'utf8');
const data = JSON.parse(fs.readFileSync(RELEASES, 'utf8'));
const rels = data.releases ?? [];
const base = newBase.replace(/\/+$/, '');

let replaced = 0, keptSign = 0, skipped = 0;
for (const r of rels) {
  const art = r.artifact;
  if (!art?.url || !art.sha256) { skipped++; continue; }

  const oldUrl = art.url;
  let newUrl = oldUrl;
  const m = oldUrl.match(HOST_RE);
  if (m) {
    // 保留原路径，只换协议+主机
    newUrl = `${base}${new URL(oldUrl).pathname}`;
  }
  if (newUrl === oldUrl) { skipped++; console.log(`- 跳过 ${r.platform} ${r.version}: URL 无需变更 (${oldUrl})`); continue; }

  const payload = `${r.version}|${r.build}|${String(art.sha256).toLowerCase()}|${newUrl}`;
  const sig = sign(null, Buffer.from(payload, 'utf8'), createPrivateKey(pem));
  art.url = newUrl;
  art.signature = `ed25519:${sig.toString('base64')}`;
  replaced++;
  console.log(`✓ ${r.platform} ${r.version}\n    ${oldUrl}\n -> ${newUrl}`);
}

console.log(`\n替换 ${replaced} 条，跳过 ${skipped} 条。`);
if (write && replaced > 0) {
  fs.writeFileSync(RELEASES, JSON.stringify(data, null, 2), 'utf8');
  console.log(`已写入 ${RELEASES}`);
} else if (replaced > 0) {
  console.log('（试运行，未落盘。加 --write 生效）');
}
