# shared/ — 整合抽取的共享代码

本目录是**代码级整合**的产物：把散落在 `apps/` 各子项目中高度重复的通用逻辑，
抽取为**一份权威实现**，统一对外接口，供各应用渐进迁移复用。

此前 `shared/` 为空目录（仅预留），所有重复逻辑各自游离；现在已落地三个模块。

## 模块清单

| 包 | 导入名 | 统一了什么 | 此前重复情况 |
|---|---|---|---|
| `shared/map` | `@shared/map` | 地图服务：配置、瓦片、坐标转换、polyline 解码、provider 接口 | 7 处独立 `mapService*.js` / `amapService.js`（MIXMLAAL ×3、daijia ×2、项目009 ×1、gexm 内嵌 ×1） |
| `shared/http` | `@shared/http` | HTTP 请求：统一 `ApiResult`、超时、错误处理、拦截器、适配器 | 7+ 处独立 `request.ts` / `http.ts`（APPsp、MIXMLAAL admin-react/miniapp、项目01 h5/client/pc/foundation） |
| `shared/config` | `@shared/config` | 配置加载：`getKey()`、`loadEnv()`、`MapSettings` 默认值 | 各项目各自实现配置/Key 读取，无统一入口 |

## 统一接口规范（所有模块共同遵守）

- **结果封装统一**：异步操作一律返回 `ApiResult<T>` = `{ code, message, data }`（`code === 0` 为成功），
  不再各项目自定义 `{success,msg}` / `{ok,data}` / 裸 `data` 三种风格。
- **凭证零硬编码**：任何 Key/Secret 只允许来自环境变量或服务端代理注入，源码中不得出现字面量。
- **坐标系显式化**：国内服务（amap/tencent）统一 GCJ-02，osm 统一 WGS-84，跨体系必须经 `shared/map` 的转换函数。
- **TS 严格模式**：所有共享包 `extends` 根 `tsconfig.base.json`（`strict` + `noUnusedLocals`），
  并通过 `tsc --noEmit` 类型检查。
- **编码风格**：2 空格缩进、单引号、行宽 100、LF（由根 `.editorconfig` + `.prettierrc.json` 统一）。

## 迁移路径（渐进，不破坏现有可运行性）

各应用**暂不强制**改为 import `@shared/*`——因为多数应用当前无 `node_modules`，
强行改写 import 会导致无法构建。推荐迁移顺序：

1. 新代码 / 重构文件直接 `import { ... } from '@shared/map'`；
2. 存量重复实现在**下次触碰该文件时**替换为 shared 版本；
3. 应用装好依赖并纳入 pnpm workspace 后，把 `@shared/*` 加入 `dependencies` 即可。

各包提供 `typecheck` 脚本，可在根级统一执行。
