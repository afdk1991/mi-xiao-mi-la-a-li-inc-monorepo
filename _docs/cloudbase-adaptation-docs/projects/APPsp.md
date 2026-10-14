# APPsp · CloudBase 适配方案

> 适配等级：**A · 原生受益** ｜ 预估工作量：**3–4 天** ｜ 代码改动：**中等偏大**

## 1. 现状诊断

| 维度 | 现状 |
|---|---|
| 技术栈 | Taro/uni-app 跨端（38 处）+ Android + 鸿蒙（manifest.json 声明） |
| 源文件规模 | 126 个源文件（含 dist_verify / _deploy 构建产物） |
| 当前数据层 | REST 调用 14 处，localStorage 17 处 —— **本地存储占比偏高** |
| 认证方式 | 未检出独立认证模块 |
| 文件/存储 | 文件上传 12 处（信号集中在 dist_verify 产物） |
| 后端形态 | 外部 REST；含支付（5 处）、地图（12 处） |
| 已接入云服务 | **无** CloudBase 接入 |

信号大量集中在 dist_verify/ 与 dist_verify2/ 等**构建产物目录**，说明扫描命中了打包后的
bundle。真正要改的是 src/ 下的源码。localStorage 17 处是显著信号 —— 说明业务数据严重依赖本地存储，
这是 CloudBase 最能带来价值的地方（跨设备同步）。

## 2. CloudBase 能力映射

| 现有能力 | CloudBase 对应 | 迁移方式 |
|---|---|---|
| localStorage（17 处） | 云数据库集合 | 按业务域拆集合；保留本地缓存做离线，云端为准 |
| REST 后端 | 云函数 / 云托管 | 按接口粒度逐个迁，优先高频只读接口 |
| 文件上传（12 处） | 云存储 | 直传 + fileID |
| 支付（5 处） | 保持微信支付，回调落云函数 | **不要改支付 SDK**，只把回调与订单落库迁到云端 |
| 地图（12 处） | 云函数代理 | Key 收敛到服务端 |
| 鸿蒙端 | CloudBase HTTP API / REST | 鸿蒙无官方 SDK，走 HTTP API |

## 3. 接入点（需要改动的具体位置）

1. `src/manifest.json —— 端侧配置，鸿蒙/Android 声明处`
2. `package.json —— 加 @cloudbase/js-sdk`
3. `_deploy/assets/index-*.js —— 构建产物，改造后需重新构建（不要手改）`
4. `dist_verify/、dist_verify2/ —— 构建产物目录，可直接排除在改造范围外`

## 4. 改造步骤

### 步骤 1：先排除构建产物

把 dist_verify / dist_verify2 / _deploy 加入 .gitignore 与改造排除清单。
**这些目录不是源码**，改动它们没有意义，还会干扰统计。

### 步骤 2：梳理 localStorage 的业务语义

17 处本地存储不可能一刀切迁。按用途分类：
用户偏好（可留本地）/ 业务数据（必须迁云端）/ 会话态（迁认证）。

### 步骤 3：接入 JS SDK 并建立数据层

Taro 项目直接 npm 安装 @cloudbase/js-sdk，建立统一的 db 访问封装。

### 步骤 4：支付与地图单独处理

支付链路保持不动（改支付是高风险动作），只把订单落库迁 CloudBase。
地图 Key 迁云函数代理。

## 5. 风险与注意

- **构建产物被误当成源码**是本项目最大的干扰项，改造前务必先界定源码边界。
- 涉及支付，任何数据层改动都要保证订单一致性 —— 建议只迁存储、不动交易链路。
- 鸿蒙端无 CloudBase 官方 SDK，需走 HTTP API，认证流程要单独设计。
- Android 端若已上架，改数据层要考虑旧版本兼容（不能让老客户端读不到数据）。

## 6. 对应离线文档

- `offline-docs/http-api/index.html`
- `offline-docs/database/doc-crud.html`
- `offline-docs/authentication/index.html`
- `offline-docs/storage/index.html`
