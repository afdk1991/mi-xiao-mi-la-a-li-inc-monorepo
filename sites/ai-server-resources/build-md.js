// 从 assets/data.js（站点唯一数据源）生成 RESOURCES.md，保证网页与 Markdown 清单内容一致
// 用法：node build-md.js
const fs = require('fs');
const path = require('path');

const { CATS, RESOURCES } = require('./assets/data.js');

const LIC = { g: '🟢 宽松可商用', a: '🟡 需署名 / 有限制', r: '🔴 需授权 / 禁止转载' };
const strip = (s) => String(s).replace(/<[^>]+>/g, '');

let md = '# AI 大模型与服务器 / 计算机技术 · 可转载资源清单\n\n';
md += '> 整理时间：2026-10 ｜ 共 ' + RESOURCES.length + ' 项资源 ｜ 分 ' + Object.keys(CATS).length + ' 大类\n';
md += '>\n';
md += '> **免责声明**：本清单为整理性索引，不构成法律意见。开源许可可能随版本变更，'
     + '模型权重许可与代码许可相互独立。**正式转载、商用或翻译前请逐项核对目标页面 / 仓库当前的 LICENSE 声明。**\n\n';
md += '| 许可标记 | 含义 |\n|---|---|\n';
md += '| 🟢 | 宽松可商用：保留许可声明即可商用、改写、再分发 |\n';
md += '| 🟡 | 可转载但需署名 / 相同方式共享，或附带使用限制（如 RFC 不得修改、自定义模型许可门槛） |\n';
md += '| 🔴 | 仅可引用片段或需书面授权：arXiv 默认许可、非商业许可、默认版权内容 |\n\n';
md += '---\n';

Object.keys(CATS).forEach((k) => {
  const items = RESOURCES.filter((r) => r.cat === k);
  md += '\n## ' + k + '. ' + CATS[k].t + '（' + items.length + ' 项）\n\n' + CATS[k].d + '\n\n';
  items.forEach((r, i) => {
    md += '### ' + (i + 1) + '. ' + r.name + '\n\n';
    md += '- **编号**：' + r.id + '　｜　**类型**：' + r.type + '\n';
    md += '- **许可等级**：' + LIC[r.l] + '\n';
    md += '- **许可 / 版权说明**：' + strip(r.lic) + '\n';
    md += '- **主要内容**：' + r.desc + '\n';
    md += '- **适合人群**：' + r.who + '\n';
    md += '- **获取渠道**：' + r.links.map((l) => '[' + l[0] + '](' + l[1] + ')').join(' ｜ ') + '\n\n';
  });
});

md += '\n---\n\n## 附录 A：许可合规速查表\n\n';
const table = [
  ['CC0 / 公有领域','✅','否','否','✅','SQLite 官方文档、MDN 代码示例、Wikipedia 元数据'],
  ['MIT / BSD / PostgreSQL License','✅','保留版权与许可文本','否','✅','llama.cpp、Ollama、ONNX Runtime、nginx 文档'],
  ['Apache-2.0','✅','保留 LICENSE + NOTICE、标注改动','否','✅','vLLM、SGLang、Transformers、Qwen3、OLMo 2'],
  ['GPL-2.0（文档/代码）','✅','✅','✅ 强 copyleft','✅','Linux 内核文档、man-pages'],
  ['GFDL 1.3','✅','✅','✅','✅','Arch Wiki、部分 Debian 文档'],
  ['CC BY 4.0','✅','✅','否','✅','Kubernetes 官方文档、Distill.pub'],
  ['CC BY-SA 4.0','✅','✅','✅ 衍生须同协议','✅','维基百科、MDN 文档、Red Hat 文档'],
  ['CC BY-NC-SA / BY-NC-ND','❌ 仅限非商业','✅','✅','ND 变体禁止改写','阮一峰周刊、部分中文教程'],
  ['自定义模型许可（Llama / Gemma / Qwen Research）','部分允许，附规模与命名限制','✅ 且常含品牌露出要求','视具体条款','✅','须逐模型核对 model card'],
  ['arXiv 默认非独占许可','❌ 全文转载需作者授权','—','—','❌','仅 CC BY / CC0 版本可自由转载'],
  ['默认版权（知乎 / CSDN / 商业博客）','❌ 须书面授权','—','—','❌','站内转载功能或联系作者'],
  ['IETF TLP-5（RFC）','✅ 可复制 / 分发 / 翻译全文','✅ 注明 IETF 与 RFC 编号','—','❌ 不得修改后仍称 RFC','RFC Editor；代码组件按 Revised BSD']
];
md += '| 许可类型 | 可商用 | 需署名 | 衍生需同协议 | 可修改 | 典型来源 |\n|---|---|---|---|---|---|\n';
table.forEach((r) => { md += '| ' + r.join(' | ') + ' |\n'; });

md += '\n## 附录 B：转载五条红线\n\n';
md += '1. **权重开放 ≠ 开源。** Llama 4（700M MAU 门槛 + 必须展示 "Built with Llama" + 衍生模型须以 Llama 开头命名）、'
     + 'Gemma 自定义条款、部分 Qwen 尺寸的 Qwen Research License（非商用）——均非 OSI 认可许可，商用前必须逐模型看 model card。\n';
md += '2. **arXiv 论文默认不可全文转载。** 默认 "perpetual non-exclusive license" 下版权仍归作者 / 出版方；'
     + '只有摘要页显式标注 CC BY / CC BY-SA / CC0 的版本才可自由转载。安全做法：引用观点、重画图表、注明 arXiv 编号。\n';
md += '3. **商标、Logo、网站外观不在 CC 授权范围内。** Mozilla、Red Hat、NVIDIA、Cloudflare 等品牌标识需单独授权。\n';
md += '4. **中文社区内容默认禁止转载。** 知乎、CSDN、掘金默认"保留所有权利"，注明出处不等于获得授权。\n';
md += '5. **数据集许可独立于模型许可。** 模型是 Apache-2.0 不代表训练语料可再分发；Common Crawl、The Pile 由多子集拼成，需逐子集核对。\n';

md += '\n## 附录 C：署名模板（可直接套用）\n\n';
md += '**CC BY-SA 4.0（维基百科 / MDN / Red Hat 文档）**\n\n```\n';
md += '本文部分内容来自「<文章标题>」（<原文 URL>），作者 <作者 / Mozilla Contributors>,\n';
md += '采用 CC BY-SA 4.0 许可发布，本文沿用相同许可。\n';
md += '（如有改动已在此说明：<改动说明>）\n```\n\n';
md += '**CC BY-NC-SA（阮一峰周刊等）**\n\n```\n';
md += '本文转载自《<标题>》（<原文 URL>），作者 <作者>，\n';
md += '采用「自由转载-非商用-非衍生-保持署名（CC BY-NC-SA）」许可，仅作非商业用途。\n```\n\n';
md += '**Apache-2.0 / MIT 代码与文档**\n\n```\n';
md += '本文代码/内容基于 <项目名>（<仓库 URL>）修改，Copyright <年份> <版权方>，\n';
md += '以 Apache License 2.0 发布；修改处已标注。完整许可文本见 https://www.apache.org/licenses/LICENSE-2.0\n```\n\n';
md += '**RFC / 标准文档**\n\n```\n';
md += '本节译自 IETF RFC <编号>（<标题>），版权归 IETF Trust，按 Trust Legal Provisions 复制与翻译，\n';
md += '未作修改。原文：https://www.rfc-editor.org/rfc/rfc<编号>\n```\n';

fs.writeFileSync(path.join(__dirname, 'RESOURCES.md'), md, 'utf8');
console.log('已生成 RESOURCES.md：' + RESOURCES.length + ' 项资源，' + md.split('\n').length + ' 行。');
