---
name: manju-drama-production
description: 漫剧 Manju（项目007）自有内容的「剧本→分镜→视频→字幕→入库→上线」全流程编排。当用户要为一部新剧集/新一集生成自有 AI 内容（不是外部导流片单）、需要把创意大纲或剧本变成可在站内 HLS 播放的成品、需要给分集补字幕、或要把 AI 视频/音频资产批量入册时使用。统一调度 script-to-storyboard、seedance-2-5 / minimax-h3、ai-manga-drama、video-transcribe、workrally 五个外部技能，并严格遵守项目007 的资产目录与部署红线。
version: 1.0.0
---

# 项目007 · 自有 AI 剧集生产管线

> 上游解决「内容从哪来」，下游交给 **`manju-content-pipeline`**（regen → localize → build → smoke → deploy）。
> 本技能结束时必须产出：一集完整的 `index.m3u8` + ts 分片 + 降级 mp4 + 封面 + 可选 SRT，
> 且全部落在 **`web/public/`** 下。

## 何时使用

- 要把一个创意大纲 / 小说 / 剧本变成一集可播放的剧集
- 要给已有分集补中文字幕（SRT）
- 要批量产出同一剧集的多场帧 / 多条分镜视频并归档
- ⛔ **不适用**：外部片单（红果 2010 条）的导流维护 —— 那部分只做发现+跳转，禁止抓取/代理

## 六步编排

```
① 剧本 → 分镜       script-to-storyboard    →  storyboard.md（14 字段/镜）
② 分镜 → 视频       seedance-2-5 / minimax-h3 →  每镜 mp4
       └ 无 Key 降级：ai-manga-drama → 静态帧（走 Ken Burns）
③ 视频 → HLS        scripts/build_episode_video.py → index.m3u8 + ts + 降级 mp4
④ 成片 → 字幕       video-transcribe（Whisper 本地优先）→ zh.srt
⑤ 资产 → 入册       workrally（可选，剧集/场次 CRUD + 资产库）
⑥ 入库 → 上线       seed → manju-content-pipeline
```

### ① 分镜：`script-to-storyboard`

输入任意剧本/小说/一句话创意，产出符合杨青标准的分镜表（每镜 14 字段）。
**本项目真正用到的字段只有三个**：`视频运动提示词`（喂给生视频）、`时长核算`（算单镜秒数）、
`人物位置与状态`（角色一致性）。其余用于人工审校。

关键约束（该技能自带质检器，不合规则会被打回）：
- 单镜 ≤ 15 秒
- 提示词必须**中文**
- 全文无 BGM
- 打斗镜标 `0.6–0.7s/帧 + 1.2 倍加速`

### ② 生视频：`seedance-2-5` / `minimax-h3`

两者都是 AI Hive OpenAPI 封装，命令行同构。**需要先拿 Key**：
`https://ai-hive.iclip.cn/chat` 创建，格式 `sk-api-*`，写入环境变量 `AI_HIVE_API_KEY`。

```bash
export AI_HIVE_API_KEY=sk-api-<你的Key>
python "<~>/.workbuddy/skills/seedance-2-5/scripts/videogen.py" generate \
  --prompt "<①输出的视频运动提示词>" --duration 5
python "<~>/.workbuddy/skills/seedance-2-5/scripts/videogen.py" task --task-id <taskId>
```

- 多个 `.SKILL.md` 的 `<~>` 指用户目录 `C:/Users/Admin`
- **Seedance 2.5 优先**，MiniMax H3 作为备选（H3 的音画一致性更适合文戏，H3 也支持音频参考）
- **无 Key 时降级**：用 `ai-manga-drama` 出静态漫画帧，再走③的 Ken Burns 路径
  ——这正是 `demo_ai_rebirth` 已验证过的路子（6 张 AI 分镜帧 → HLS）

### ③ 转 HLS：项目自有脚本

```bash
python scripts/build_episode_video.py     # 依赖 ffmpeg（本机已验证 9.0.1）
```
产出：`index.m3u8` + `000~00N.ts` + 降级 `<ep>.mp4` + `thumb.jpg`。

### ④ 字幕：`video-transcribe`

```bash
# 本地 Whisper 优先（免费、无需 Key、不出网）
python "<~>/.workbuddy/skills/video-transcribe/scripts/transcribe.py" \
  -f <ep>.mp4 -m whisper -o <输出目录>
```
支持五种后端，按优先级：

| 后端 | 是否需 Key | 备注 |
|---|---|---|
| 本地 Whisper | 否 | **首选**，内容不出本机，适合版权素材 |
| SiliconFlow | 是（`SILICONFLOW_API_KEY`） | SenseVoiceSmall，免费额度 |
| 阿里百炼 | 是（`DASHSCOPE_API_KEY`） | |
| 百度语音 | 是 | 走 `aip.baidubce.com` 鉴权 |
| FastWhisper 服务端 | 否 | 本地起服务 `http://127.0.0.1:8000` |

⛔ 该技能安装脚本里有 `curl -LsSf https://astral.sh/uv/install.sh | sh`（官方 uv 安装器）。
本机若无 uv，建议手动安装 uv 而不要直接管道执行。

### ⑤ 资产入册：`workrally`（可选）

```bash
workrally --help     # CLI 名即为 workrally
```
用于剧集/场次/分镜 CRUD、资产库、无限画布。**需要下载安装 CLI**，首次要按其 SKILL.md 走安装与鉴权。
角色定位是「内容资产台账」——生产量大时才值得上；单集验证阶段可跳过。

### ⑥ 入库上线

```bash
python scripts/seed_demo_ai_rebirth.py        # 或仿写一个 <series_id> 专用 seed
# 之后严格走 manju-content-pipeline 五步
python scripts/regen_static_content.py
python scripts/localize_assets.py
cd web && npm run build && cd ..
cd makers && node scripts/smoke_web.mjs && cd ..     # 必须 21/21
cd makers && edgeone makers deploy && cd ..
```

## 资产目录约定（红线）

| 资产 | 落点 |
|---|---|
| 视频切片 | `web/public/files/videos/<series_id>/<ep>/index.m3u8` + ts + `<ep>.mp4` |
| 封面 | `web/public/files/covers/<series_id>_cover.jpg` |
| 字幕 | `web/public/files/videos/<series_id>/<ep>/zh.srt` |
| 单集 JSON 里的 sources | `[{container:"hls",url:"files/videos/.../index.m3u8"},{container:"mp4",url:".../<ep>.mp4"}]`，**站内相对路径** |

红线条目与 `manju-content-pipeline` 完全一致，这里只补两条：

| # | 红线 | 原因 |
|---|---|---|
| 7 | **绝不直写 `makers/static/`** | Vite 构建产物目录，`emptyOutDir` 下次 build 清空 |
| 8 | 目录名**禁止叫 `vendor`** | EdgeOne StaticAssetsBuilder 会跳过，文件不进部署包 |
| 9 | 版权素材优先走**本地 Whisper** | 转写不出网，避免把未授权内容传到第三方 ASR |

## 当前状态

- `demo_ai_rebirth`（重生：我成了漫画主角）是唯一自有剧集，**6 帧静态 + Ken Burns** 路径，已上线。
- 尚未验证：seedance-2-5 / minimax-h3 的真实出片质量；workrally CLI 未安装。
- 下一部新剧建议路线：**先跑①产出合规分镜 → 再决定走②真视频还是②降级静态帧**。

## 前置依赖

- `AI_HIVE_API_KEY`（seedance-2-5 / minimax-h3，走 `ai-hive.iclip.cn`）
- ffmpeg ≥ 9.0（本机已有）
- Python 3.12+ 与 uv（video-transcribe 的 local Whisper 模式）
- `workrally` CLI（仅第⑤步）
