# 合并源码 · 单一项目统一入口

> 本目录是 **F:\网站全栈项目** 与 **E:\04_个人项目\github所有仓库项目** 经合并、去重、重组后的**一个项目**（单体仓库 monorepo）。
> 生成时间：2026-10-13 ｜ **代码级整合：2026-10-14** ｜ **单一项目化：2026-10-14**（见末尾「整合合并记录」）
> 项目身份：`mi-xiao-mi-la-a-li-inc-monorepo` ｜ 模块数：**19 个顶层模块**（apps 11 + services 1 + sites 3 + tools 1 + shared 3），
> 含嵌套子包共 **29 个可寻址包**，全部归入**一个** `package.json` + **一个**入口 `run.mjs` 统一编排。
> 已合并/归档：5 对 F/E 镜像、`manju`→`项目007`、`项目002`→`gale-engine`、`项目006`→`proj-06`、
> 内嵌 `mixmlaal` 副本、近空壳 `proj-00`；`cloudbase-adaptation`（文档库）移入 `_docs/`。
> `shared/` 三个共享包（统一地图 / 请求 / 配置）已通过 `tsc --noEmit` 零错误校验。

## ⚠️ 必读说明
1. **这是一个项目**：所有模块已统一到单一根 `package.json`（`npm run` 即入口）与单一编排器 `run.mjs`；
   统一配置基线（tsconfig / eslint / prettier / editorconfig）、统一共享包、统一验证命令 `npm run verify`。
2. **多技术栈是事实，不是未整合**：模块跨 PHP(WordPress) / Node / Python / Electron / uni-app / Go，
   **无法压缩为一次构建命令**——正如一个含前后端的项目不会把 PHP 与 Rust 编进同一产物。
   本项目统一的是「身份、结构、配置基线、共享代码、编排入口」；各模块按自身工具链构建，由 `run.mjs` 统一调度。
3. **去重依据**：5 对 F/E 同名项目经「git HEAD 一致 + 跟踪文件列表 md5 一致 + 字节级 diff」三重核对，
   确认 F（中文名）副本为较新/较完整版本，E（短名）副本为旧镜像/子集，已永久删除（`proj-01 / proj-04 / proj-08 / proj-09 / email-aggregator`）。
4. **可逆性**：`项目002` / `manju` / 内嵌 `mixmlaal` / `proj-06-gitea` / `proj-00` 均可逆归档于 `_backups/`；
   被删 E 副本的隔离区在 `E:\_TRASH_20261013_github_all\` 与 `F:\合并项目\_TRASH_20261013_isolation\`（待授权永久删除）。
5. **密钥**：`.env`、`key/`、`.keystore` 等含密钥文件已随项目保留（未推送公开远端），统一忽略于 `.gitignore`。

## 整体架构

```
合并源码/
├─ apps/          业务应用 / 前端 / 全栈 / Electron / Android
│   ├─ 项目01/            Mi-Xiao-Mi-La-A-Li-Inc 全栈平台（最大）
│   ├─ RouteNav/          Expo + Express monorepo（client / taro-app / server）
│   ├─ zhinenglux/        Coze 小程序 + Node 后端（含 key/）
│   ├─ APPsp/             uni-app + Android shell（→ CloudBase）
│   ├─ MIXMLAAL/          Node 微服务（services + config）
│   ├─ gale-engine/       Electron 39 + Vue3 + TS（已合并 Gitea 镜像）
│   ├─ 项目003/           邮箱聚合平台（web / go 后端 / go-webui）
│   ├─ 项目007/           CloudBase 全栈（web/scripts/server[Py]，已并入 manju）
│   ├─ 项目009商品采集/    配送定位 delivery-router（Vite + Capacitor）
│   ├─ proj-05/           BOM / PDF 生成（Python）
│   └─ proj-06/           WordPress 主题 + 插件（myp-theme / myp-core，已合并 Gitea 镜像）
├─ services/       后端 / 采集 / Python 服务
│   └─ 项目008采集/        价格采集（CloudBase functions, Python）
├─ sites/          WordPress / PHP / 静态站点
│   ├─ ai-server-resources/ AI/服务器资源站（静态 HTML+assets，独立发布）
│   ├─ 项目004/            WordPress（wp-config.php）
│   ├─ conWordPress/       WordPress 配置/容器
│   └─ gexm/               网站（wp-config.php + Node）
├─ tools/          共享脚本 / 工具
│   └─ scripts/            部署与运维脚本（F 超集，权威版）
├─ _docs/          归档报告 / 参考资料
│   ├─ _archive_20260924_old_reports/
│   └─ cloudbase-adaptation-docs/   CloudBase 适配文档/模板库（非应用）
├─ _backups/       归档区（可逆，随时可还原）
│   ├─ gexm.git.bak-20261002/          （bare, HEAD 966b53f）
│   ├─ manju-20261013/                 （已并入项目007）
│   ├─ gale-engine-gitea-20261014/     （已快进合并进 gale-engine）
│   ├─ proj-06-gitea-20261014/         （已合并进 proj-06）
│   ├─ proj-00-20261014/               （近空壳：4 个源码 + 目录分析脚本）
│   └─ mixmlaal-embedded-20261014/     （内嵌冗余副本，MIXMLAAL 已覆盖）
├─ shared/         整合抽取的共享包（已落地，tsc --noEmit 零错误）
│   ├─ map/        @shared/map    统一地图服务（配置/坐标/瓦片/provider×4）
│   ├─ http/       @shared/http   统一请求封装（ApiResult/超时/拦截器/适配器）
│   └─ config/     @shared/config 统一配置加载（env → MapSettings）
├─ manju-push-bundle.bundle   单文件（git bundle）
├─ README索引.md             详细逐项目索引（原清单）
├─ README.md                 本文件（统一入口）
├─ run.mjs                   ⭐ 单一项目编排器（list/dev/build/typecheck/verify/clean/setup）
├─ tsc.mjs                    仓库内 tsc 定位器（共享包无 node_modules 时也能类型检查）
├─ package.json              单一项目身份 + npm run 入口（映射到 run.mjs）
├─ pnpm-workspace.yaml       工作区（apps / services / sites / tools / shared）
├─ tsconfig.base.json        TypeScript 统一基线
├─ .editorconfig .prettierrc.json .gitignore   统一风格/忽略
└─ eslint.config.base.mjs    ESLint 基线（flat config，各应用可 extends）
```

## 模块依赖关系
- **主要依赖为「应用内」**：每个应用自包含前端/后端，跨项目耦合极低。
  - `项目003/email-aggregator-web` → 依赖同仓 `email-aggregator`（后端 API）与 `email-aggregator-go`。
  - `RouteNav/client` → 依赖 `RouteNav`（根服务）；`taro-app` 为跨端小程序。
  - `zhinenglux`（前端）→ `zhinenglux/server`。
  - `APPsp` / `项目009商品采集` 的 H5 → 各自 Android shell 壳（`app-debug.apk`）。
  - `项目007`（已并入 `manju`）：`web` + `makers` → `server`（Python，CloudBase）。
- **跨项目共享**：`tools/scripts` 提供统一部署脚本；`shared/{map,http,config}` 为**已抽取**的公共库（统一地图服务 / 请求封装 / 配置加载），不再只是预留。
- **数据/服务依赖**：`项目008采集`（采集）与 `项目009商品采集`（配送）均为 CloudBase 函数，彼此独立。

## 应用速查表（19 个顶层模块 / 29 个可寻址包）

> 全部模块可用 `npm run list`（或 `node run.mjs list`）实时查看；构建/类型检查用 `npm run build <模块>` / `npm run typecheck <模块>`。

| 分组 | 模块 | 包名 | 技术栈 | 构建命令 | 备注 |
|---|---|---|---|---|---|
| apps | 项目01 | @mxm/proj-01 | WP+Node 全栈（聚合壳） | 进入 `Mi-Xiao-Mi-La-A-Li-Inc/` 子目录 | 最大项目；子包各自构建 |
| apps | RouteNav | expo-express-monorepo | Node/Vue/Taro | `npm run build all`（需先 install） | client/taro-app/server 子包 |
| apps | zhinenglux | coze-mini-program | Taro+Nest | `npm run build all`（需先 install） | 含 `key/` 密钥 |
| apps | APPsp | appsp | uni-app+Vite | `npm run build all`（需先 install） | 产出 app-debug.apk |
| apps | MIXMLAAL | mixmlaal-fullstack | Node 微服务 | `npm run build all`（需先 install） | 7 前端 + api + 微服务 |
| apps | gale-engine | gale-engine | Electron 39+Vue3 | `npm run build all`（需先 install） | 已合并 Gitea 镜像 |
| apps | 项目003 | @mxm/proj-03 | TS/Go 全栈（聚合壳） | `npm run build all` | email-aggregator 系列子包 |
| apps | 项目007 | @mxm/proj-07 | CloudBase 全栈（聚合壳） | `npm run build all` | 已并入 manju；Py server |
| apps | 项目009商品采集 | delivery-router | Vite+Capacitor | `npm run build 项目009商品采集` ✅ 已验证 | 唯一自带 node_modules |
| apps | proj-05 | @mxm/proj-05 | Python | `npm run build proj-05` ✅ 已验证 | BOM/PDF 生成 |
| apps | proj-06 | @mxm/proj-06 | PHP（WP 主题/插件） | 部署到 WP 主机 | myp-theme/myp-core |
| services | 项目008采集 | @mxm/proj-08-crawler | Python | `npm run build 项目008采集` ✅ 已验证 | CloudBase 采集 |
| sites | 项目004 | @mxm/site-proj-04 | WordPress/PHP | 部署至 WP 主机 | 完整 WP 站点 |
| sites | conWordPress | @mxm/site-conwordpress | WordPress/PHP | 部署至 WP 主机 | 配置/容器 |
| sites | gexm | gexm-platform | WP+Node | `npm run build all`（需先 install） | packages 工作区 |
| sites | ai-server-resources | @mxm/ai-server-resources | 静态站（Node 构建脚本） | 不参与统一构建（独立发布） | AI/服务器资源站 |
| tools | scripts | @mxm/tools-scripts | Shell/Py | 无可构建产物 | 部署运维脚本集 |
| shared | map | @shared/map | TS | `npm run build shared/map` ✅ 已验证 | 统一地图服务 |
| shared | http | @shared/http | TS | `npm run build shared/http` ✅ 已验证 | 统一请求封装 |
| shared | config | @shared/config | TS | `npm run build shared/config` ✅ 已验证 | 统一配置加载 |

## 统一编码规范（已落地基线）
- **字符 / 换行**：UTF-8、LF、末尾换行（见 `.editorconfig`）。
- **缩进**：JS/TS/JSON/YAML = 2 空格；Python = 4 空格；Go = tab。
- **格式化**：Prettier（`printWidth 100`、单引号、尾逗号，见 `.prettierrc.json`）。
- **类型**：TypeScript `strict` 模式（见 `tsconfig.base.json`）；`shared/map`、`shared/http`、`shared/config` **已实际 `extends` 该基线**并通过 `tsc --noEmit`（不再是孤儿配置）。
- **Lint**：ESLint 基线 `eslint.config.base.mjs`（flat config，**已实际创建**；各应用 `npm i -D eslint` 后 `extends` 即可）。
- **提交前**：`pnpm format` 统一格式；密钥禁止入库（`.gitignore` 已忽略 `.env`/`key`/`.keystore`）。

## 基础配置清单
| 文件 | 作用 |
|---|---|
| `package.json` | **单一项目身份** + npm run 入口（list/dev/build/typecheck/verify/clean/setup → run.mjs） |
| `run.mjs` | 单一编排器：模块发现、按技术栈构建、类型检查、全量验证（零依赖，Node≥18） |
| `tsc.mjs` | 仓库内 tsc 定位器（向上查找 + 扫描各分组已装依赖） |
| `pnpm-workspace.yaml` | 工作区范围 `apps/*` `services/*` `sites/*` `tools/*` `shared/*`（pnpm 用户可选） |
| `tsconfig.base.json` | TS 严格基线（shared 三包已 extends） |
| `.editorconfig` | 跨编辑器格式统一 |
| `.prettierrc.json` | 代码格式化规则 |
| `eslint.config.base.mjs` | ESLint flat config 基线（可选 extends） |
| `.gitignore` | 统一忽略 node_modules/dist/.env/缓存等 |

## 如何构建 / 运行（单一入口）

```bash
# 入口总览（等价于项目说明书）
npm run                    # 列出全部入口命令

npm run list               # 29 个可寻址模块清单（类型/依赖/脚本）
npm run setup              # 为缺依赖的 Node 模块逐个 npm install（需网络）

npm run build 项目009商品采集    # 构建单个模块（已验证 ✅）
npm run build all              # 构建全部模块（缺依赖的自动跳过并说明原因）
npm run dev zhinenglux         # 启动某模块开发服务
npm run typecheck all          # 全部 TS 模块类型检查
npm run verify                 # ⭐ 全量验证 = typecheck all + build all
npm run clean 项目009商品采集     # 清理构建产物（dist/build/out）
```

> 无需 pnpm：`run.mjs` 为零依赖 Node 脚本，`npm` 即可驱动全部流程（pnpm 用户仍可用 `pnpm-workspace.yaml`）。
> Electron / CloudBase / WordPress 类模块按各自工具链构建，`run.mjs` 自动识别技术栈（Node/Python/PHP/Go/脚本）并分派。

## 验证状态（2026-10-14 最终全量验证，`npm run verify` 退出码 0）
- ✅ **类型检查：4 通过 / 0 失败**——`项目009商品采集`（`tsc -b`）+ `@shared/{map,http,config}`（`tsc.mjs` 定位 TS 5.9.3，离线）。
- ✅ **构建：9 通过 / 0 失败**——`项目009商品采集`（tsc+vite 87 modules）、`proj-05`、`项目008采集`（Python compileall）、
  三个聚合壳（项目003/007/01）、shared 三包；其余 20 个模块因缺 node_modules / 无构建步骤 / 本机无 PHP 而**明确跳过**（非失败）。
- ✅ 去重：5 对镜像字节级核对后删除 E 副本，F 副本 git HEAD 不变。
- ✅ 重组：项目按域归组，移动后各 git 仓库 HEAD 与原记录一致。
- ✅ 配置：根级 tsconfig/editorconfig/prettier/eslint/gitignore/package.json/run.mjs 均已落地**并生效**。
- ✅ 共享包类型检查：三包 `tsc --noEmit` 均 **0 错误**。
- ✅ gale-engine 合并：fast-forward 至 `6891277`，含 `项目002`（Gitea）全部提交，工作树干净。
- ✅ proj-06 合并：merge 至 `3301df1`，含 `项目006`（Gitea）全部提交。
- ✅ 同源收敛：全仓扫描无 `项目0XX`/`proj-XX` 配对残留、无 `myp-theme`/`myp-core` 内嵌副本。

## 整合合并记录（2026-10-14）

此前仅完成「物理搬运 + 去重 + 空壳配置」。以下为**代码级整合**的真实落地：

| # | 整合动作 | 之前状态 | 现在状态 |
|---|---|---|---|
| 1 | 抽取统一地图服务 | 7 处独立 `mapService*.js` / `amapService.js`（MIXMLAAL×3、daijia×2、项目009×1、gexm 内嵌×1） | `shared/map`：1 套配置 + 1 个 `MapProvider` 接口 + 4 个 provider（amap / tencent / baidu / osm） |
| 2 | 抽取统一请求封装 | 7+ 处各自 `request.ts` / `http.ts`（APPsp、MIXMLAAL admin-react/miniapp、项目01 h5/client/pc/foundation） | `shared/http`：`ApiResult<T>` 统一契约 + 超时 + 拦截器 + fetch / uni 双适配器 |
| 3 | 抽取统一配置加载 | 各项目自读 env / Key，无统一入口 | `shared/config`：`readEnv` / `loadEnv` / `buildMapSettings`，凭证零硬编码 |
| 4 | 消除整仓级重复 | `MIXMLAAL` 整仓被复制进 `项目01/.../gexm/packages/mixmlaal` | 内嵌副本（1160 文件）归档至 `_backups`，主仓 MIXMLAAL（1503 文件）完整覆盖 |
| 5 | 双远程镜像合并 | `gale-engine`（GitHub）与 `项目002`（Gitea）HEAD 分叉、配置逐字节相同 | `gale-engine` fast-forward 合并 `项目002` 全部提交 → `6891277`；`项目002` 归档 |
| 6 | 根配置真正生效 | `tsconfig.base.json` 0 引用；`pnpm-workspace` 仅 `apps/*`；`.eslintrc.base.js` 声称有实无 | shared 三包 `extends` 根 tsconfig；workspace 覆盖 5 个分组；`eslint.config.base.mjs` 实际创建 |
| 7 | 双远程镜像合并（第二轮） | `项目006`（Gitea `root/proj-06`）与 `proj-06`（GitHub `afdk1991/proj-06`）历史分叉、文件集近乎相同（差 2 个文件） | `proj-06` 用本地 remote fetch 后 **merge 至 `3301df1`**（含项目006 全部提交与 `FulfillmentService.php` 等）；项目006 归档 |
| 8 | 清理近空壳项目 | `proj-00`：69 文件但源码仅 4 个（目录分析脚本 + 日志） | 归档 `_backups/proj-00-20261014` |
| 9 | 文档库归位 | `cloudbase-adaptation`：3590 文件但源码仅 4 个（文档 / 模板 / offline-docs），非可运行应用 | 移入 `_docs/cloudbase-adaptation-docs`，apps 只保留可运行应用 |
| 10 | **20 个模块合并为一个项目** | 9 个模块无 `package.json` 身份；根脚本依赖 pnpm（本机没有）；`shared` 包 `tsc` 不在 PATH；无统一编排 | 为 9 个模块创建统一 `@mxm/*` 身份 + 技术栈元数据；根 `package.json` 重写为单一项目入口；新建零依赖编排器 `run.mjs` + `tsc.mjs`；**29 个包统一寻址** |
| 11 | **单一验证管线** | 各项目各自验证，无统一命令 | `npm run verify` = typecheck all + build all，按技术栈自动分派，缺依赖明确跳过而非失败；**最终 4✅/0❌ + 9✅/0❌** |
| 12 | **聚合壳显式化** | 项目01/003/007 是含子包的壳，曾被当作普通 Node 模块 | 标记 `mxm.type=aggregator`，构建时透传说明、不误判缺依赖 |
| 13 | **README 与实际对齐** | 速查表列出已归档/已合并项目（manju/项目002/项目006/proj-00）、声称 pnpm 编排 | 速查表重写为 20 模块真实清单；构建文档切换到 `run.mjs` 入口 |

### 统一接口规范（整合后约定）
- 所有异步能力统一返回 `ApiResult<T>`（`code === 0` 为成功），不再混用 `{success,msg}` / `{ok,data}` / 裸 data 三种风格。
- 地图能力统一走 `MapProvider` 接口；国内服务 GCJ-02、osm WGS-84，跨体系必须经 `shared/map` 的转换函数。
- 凭证只从环境变量或服务端代理注入，源码零硬编码。
- 共享包必须通过 `tsc --noEmit`（strict），作为合并门槛。

### 共享包用法
```ts
import { createProvider, buildMapSettings } from '@shared/map'   // 或 @shared/config
import { http } from '@shared/http'

const settings = buildMapSettings()          // 自动从环境变量装配
const provider = createProvider(settings)    // 按 service 分派 amap/tencent/baidu/osm
const point = await provider.geocode('深圳市南山区科技园')
const res = await http.get('/api/customers') // 统一 ApiResult<T>
```

> 迁移策略：各应用**暂不强制**改为 import `@shared/*`（多数应用当前无 node_modules，
> 强行改写会破坏构建）。新代码直接用 `@shared/*`，存量实现在下次触碰该文件时替换。

## 回滚与恢复
- `_backups/` 内 5 个归档（manju / gale-engine-gitea / proj-06-gitea / proj-00 / mixmlaal-embedded）均可**原路移回**恢复。
- 被删 E 副本的隔离区在 `E:\_TRASH_20261013_github_all\` 与 `F:\合并项目\_TRASH_20261013_isolation\`（永久删除待授权）。
- 重组移动：均为同盘重命名，可按 `apps/xxx → 原路径` 逆向移回。
