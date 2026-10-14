# 部署与转载使用说明 · 可转载资源清单

> 本目录是一个「AI 大模型 + 服务器/计算机技术」公开可转载资源索引站。
> 本文说明项目的两种产物形态、如何部署分发、如何转载内容、以及如何维护更新。

---

## 1. 两种产物形态

| 形态 | 位置 | 用途 | 特点 |
|---|---|---|---|
| **源码站（多页）** | `index.html` `resources.html` `category.html` `resource.html` `compliance.html` `curated.html` `about.html` + `assets/` | 日常维护、修改数据、扩展功能 | 模块化、改一处（`assets/data.js`）全站生效；需带 `assets/` 目录一起部署 |
| **单文件分发版** | `dist/index.html` | 一键分发、离线打开、转载附件、任意静态托管 | 零外部依赖，CSS/JS/数据全部内联，双击即可运行；由 `build-dist.js` 从源码构建 |

> 二者**并存互补**：源码用于"改"，单文件用于"发"。不要手工编辑 `dist/index.html`，改动请在源码进行后重新构建。

---

## 2. 如何使用单文件版（最常用）

1. **本地预览**：直接双击 `dist/index.html`（或拖入浏览器）。无需服务器、无需联网。
2. **作为转载附件**：把 `dist/index.html` 作为单个文件发给编辑/运营，对方双击即可浏览全部 79 项资源与合规指南。
3. **嵌入现有站点**：将 `dist/index.html` 的内容整体粘贴进一个 `<iframe>` 或直接发布为子页面。

### 部署到静态托管（任选其一）

| 平台 | 操作要点 |
|---|---|
| **EdgeOne Pages** | 上传 `dist/` 目录，或连接仓库后构建命令填 `node build-dist.js`、输出目录填 `dist` |
| **GitHub Pages** | 将 `dist/index.html` 推到仓库，Settings → Pages → 选分支根目录 |
| **Netlify / Vercel** | 拖拽 `dist/` 文件夹到部署区；或 `Build Command: node build-dist.js`、`Publish Directory: dist` |
| **任意 Web 服务器** | 把 `dist/index.html` 放到站点根或子目录（如 `/resources/`），Nginx/Apache 直接托管静态文件 |
| **对象存储 / CDN** | 上传 `dist/index.html` 作为静态对象，开启公网读 |

> 单文件版内部用 hash 路由（`#/`、`#/resources`、`#/category/A`…），因此放在子目录或作为文件直接打开都不会出现 404 路径问题。

---

## 3. 如何转载"正文内容"

本项目提供**两种可转载的文字素材**，均适合内容平台直接发布：

### A. 原创可转载文章（推荐整篇/连载）
目录 `articles/` 下 5 篇原创技术科普正文（Transformer 注意力机制、训练微调工具链、推理部署与量化、服务器硬件运维、网络与存储）+ `README.md` 合集说明。
- **许可**：统一 **CC BY 4.0**（作者署名：AI 资源站），可自由转载、改编、商用。
- **用法**：复制对应 `.md` 全文，保留文末"可转载说明"段即可；可节选，但衍生作品同样以 CC BY 4.0 发布并保留署名。

### B. 资源索引清单（带链接的参考资料）
- `RESOURCES.md`：79 项全量清单（Markdown，可由 `build-md.js` 重新生成）。
- `CURATED.md`：面向转载场景的 21 项精选表格（可由 `build-curated-md.js` 重新生成）。
- 站内"导出 Markdown"按钮：在任意页面点导出，可直接复制/下载当前清单。

> **重要区分**：资源索引里的外链指向**第三方原始来源**（arXiv、官方文档、开源仓库等），这些第三方内容的转载权限**不归本项目所有**——转载前请按 `compliance.html` 的"三步判断法"核对各自 LICENSE。本项目自身的索引文字与 `articles/` 原创正文可自由转载。

---

## 4. 如何维护与更新数据

所有资源数据集中在两处，改完重跑构建即可：

| 文件 | 内容 |
|---|---|
| `assets/data.js` | 79 项资源（字段：`id / name / type / desc / who / lic / links / cat / l`） |
| `assets/curated.js` | 21 项精选（按类别分节，含许可等级与风险备注） |

修改后执行：
```bash
node build-md.js          # 重新生成 RESOURCES.md
node build-curated-md.js  # 重新生成 CURATED.md
node build-dist.js        # 重新生成单文件版 dist/index.html（含压缩）
```

### 添加新的资源项
在 `assets/data.js` 的 `RESOURCES` 数组追加一条即可，ID 自动按类目序号生成（如 `A16`、`C15`）。无需改动任何页面或样式。

---

## 5. 验证清单（发布前必跑）

```bash
node smoke-test.js        # 源码页渲染冒烟：14/14 通过
node ui-verify.js         # 交互/响应式验收：15/15 通过
node build-dist.js        # 重建单文件版
node dist-verify.js       # 单文件版跨路由渲染：22/22 通过
node ui-audit.js          # 多断点溢出/字号/触控目标诊断：0 问题
```

> 改完样式或脚本后，务必重跑以上命令再发布。

---

## 6. 目录结构速览

```
ai-server-resources/
├─ index/resources/category/resource/compliance/curated/about.html   ← 源码站（7 页，维护用）
├─ assets/
│   ├─ style.css            ← 设计系统（令牌化分层）
│   ├─ app.js              ← 渲染/筛选/导出逻辑（原始版）
│   ├─ data.js             ← 79 项资源（唯一数据源）
│   └─ curated.js          ← 21 项精选（唯一数据源）
├─ dist/index.html         ← ✅ 单文件分发版（发布用，内联+压缩）
├─ articles/               ← 5 篇原创可转载正文 + README
├─ RESOURCES.md            ← 全量清单（Markdown）
├─ CURATED.md              ← 精选清单（Markdown）
├─ build-dist.js           ← 源码 → 单文件版构建（含压缩）
├─ build-md.js / build-curated-md.js  ← 数据源 → Markdown
├─ recover-src.js          ← 应急：从 dist 反推重建源码页
├─ smoke-test.js / ui-verify.js / ui-audit.js / dist-verify.js / render-check.js  ← 回归与验证
└─ archive/                ← 历史归档（验证截图等）
```

---

## 7. 应急恢复说明

源码 7 页若意外丢失，可用 `node recover-src.js` 从 `dist/index.html` 反推重建（dist 内含全部页面 `<main>` 内容，仅链接形式不同）。重建后请立即重跑第 5 节的验证命令确认无误。

---

## 8. 许可与免责

- 本项目**索引文字**与 `articles/` **原创正文**：CC BY 4.0，署名"AI 资源站"即可自由转载/改编/商用。
- 索引中引用的**第三方链接**内容：版权与许可归属各自来源，转载前请逐项核对（参见 `compliance.html`）。
- 本清单为整理性索引，**不构成法律意见**；上游许可可能变更，正式商用前建议再次核对原始许可页面。
