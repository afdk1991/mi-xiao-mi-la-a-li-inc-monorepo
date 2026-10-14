/* 从 assets/curated.js 生成 CURATED.md（精选 21 项）
   用法：node build-curated-md.js
   改完 curated.js 后重跑本脚本，网页端由 assets/app.js 实时渲染，两边始终一致。 */
'use strict';
var fs = require('fs');
var path = require('path');
var C = require('./assets/curated.js');

var S = C.CURATED_SECTIONS, M = C.CURATED_META, NOTES = C.CURATED_NOTES;
var all = [];
S.forEach(function (s) { s.items.forEach(function (i) { all.push(i); }); });

var md = '';
md += '# AI 大模型 + 服务器/计算机底层技术｜可转载资源精选清单（' + all.length + ' 项）\n\n';
md += '> 编制日期：' + M.updated + '　|　用途：内容平台转载 / 引用　|　筛选口径：权威、公开、许可清晰优先\n';
md += '> 许可标签：🟢 宽松可商用 · 🟡 需署名或有附加条件 · 🔴 仅允许署名引用或需授权 · ⚠️ 许可不明确需核实\n';
md += '> 完整版（79 项）见 `RESOURCES.md` / 站点「资源库」页。\n\n';
md += '---\n';

S.forEach(function (s) {
  md += '\n## ' + s.title + '（' + s.items.length + ' 项）\n\n';
  md += '| 名称 | 类型 | 核心内容（1–2 句） | 适合人群 | 获取渠道 | 许可状态 |\n';
  md += '|---|---|---|---|---|---|\n';
  s.items.forEach(function (it) {
    md += '| **' + it.name + '** | ' + it.type + ' | ' + it.desc + ' | ' + it.who + ' | '
      + it.links.map(function (l) { return '[' + l[0] + '](' + l[1] + ')'; }).join('、') + ' | '
      + it.lic + '｜' + it.note + ' |\n';
  });
});

md += '\n---\n\n## 转载注意事项小结\n\n';
NOTES.forEach(function (n, i) {
  md += '**' + (i + 1) + '. ' + n.t + '。** ' + n.d + '\n\n';
});

md += '### 合规速查：三步判断能否转载\n\n';
md += '1. **找许可声明**——页面页脚 / 仓库 LICENSE / 文档 Legal Notice。找不到 → 默认不可转载，走邮件授权。\n';
md += '2. **看条款类型**——CC 系列查 BY / SA / NC / ND 四个要素；开源项目查 OSI 许可名；论文查摘要页许可标注。\n';
md += '3. **定使用方式**——原样转载 / 改编 / 翻译 / 商用，逐项对照上述限制，确认署名要素与链接是否齐备。\n\n';
md += '---\n\n> 本清单许可信息基于 ' + M.updated + ' 的公开声明核实，仅供合规参考，不构成法律意见。'
  + '上游许可可能变更，正式商用前建议再次核对原始许可页面。\n';

var out = path.join(__dirname, 'CURATED.md');
fs.writeFileSync(out, md, 'utf8');

var cnt = { g: 0, a: 0, r: 0 };
all.forEach(function (i) { cnt[i.level]++; });
var need = all.filter(function (i) { return /需核实/.test(i.note); });
console.log('✓ CURATED.md 已生成：' + md.split('\n').length + ' 行 / ' + Math.round(md.length / 1024) + 'KB');
console.log('  资源总数 ' + all.length + ' 项 | 分类 ' + S.length + ' 个');
console.log('  🟢 ' + cnt.g + ' / 🟡 ' + cnt.a + ' / 🔴 ' + cnt.r + ' | 标注需核实：' + need.length + ' 项');
need.forEach(function (i) { console.log('    ⚠ ' + i.name); });
