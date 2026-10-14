# RouteNav · CloudBase 适配方案

> 适配等级：**A · 原生受益** ｜ 预估工作量：**2–3 天** ｜ 代码改动：**中等**

## 1. 现状诊断

| 维度 | 现状 |
|---|---|
| 技术栈 | Taro 小程序（10 处）+ React 客户端 + 地图/导航（3 处） |
| 源文件规模 | 403 个源文件 |
| 当前数据层 | client/utils/api.ts 走 REST；localStorage 存本地状态（1 处） |
| 认证方式 | client/contexts/AuthContext.tsx —— 已有独立认证上下文 |
| 文件/存储 | client/utils/network.ts、taro-app/src/utils/network.ts 有文件上传（2 处） |
| 后端形态 | 外部 REST 服务（client/utils/api.ts 调用） |
| 已接入云服务 | **无** CloudBase 接入；走 EdgeOne Pages 部署 |

已有完整的认证上下文（AuthContext.tsx），这是改造的**天然切入点** —— 把 AuthContext 内部的
登录态换成 CloudBase 认证，上层组件几乎不用动。地图导航类应用的数据（路线、轨迹、收藏点）
天然适合文档型数据库存储。

## 2. CloudBase 能力映射

| 现有能力 | CloudBase 对应 | 迁移方式 |
|---|---|---|
| AuthContext.tsx 登录态 | CloudBase 认证（匿名/微信/自定义） | app.auth({persistence:"local"}) 替换现有 token 管理 |
| localStorage 本地状态 | 云数据库集合 | 跨设备同步（收藏地址、历史路线） |
| REST 后端 | 云函数 或 保留现有后端 + CloudBase 做数据层 | 若现有后端稳定，可只迁数据层，Backend 不动 |
| 文件上传 | 云存储 | 用户上传的轨迹/图片 |
| 地图调用 | 云函数代理（隐藏 Key） | **重要**：地图 Key 目前可能暴露在前端，迁云函数代理 |

## 3. 接入点（需要改动的具体位置）

1. `client/contexts/AuthContext.tsx —— 认证改造主战场`
2. `client/utils/api.ts —— REST 基地址与数据层切换`
3. `client/utils/network.ts、taro-app/src/utils/network.ts —— 上传逻辑`
4. `client/screens/navigate/index.tsx —— 导航页数据读写`
5. `taro-app/config/index.ts —— 新增 envId 配置`
6. `client/utils/platform.ts —— 平台判断 + localStorage 封装，可在此做存储适配层`

## 4. 改造步骤

### 步骤 1：先做认证（收益最直接）

AuthContext.tsx 里把 token 签发/校验替换为 CloudBase 认证。
上层组件消费的 context 接口保持不变，**这是零侵入改法**。

### 步骤 2：建立数据访问适配层

在 client/utils/api.ts 下抽一层 repository，内部可切 CloudBase / 原 REST。
这样迁移可分模块灰度，不用一次性切完。

### 步骤 3：地图 Key 收进云函数

现在前端直连地图 API 有 Key 泄露风险。建一个云函数做代理，
前端只调云函数，Key 存云函数环境变量。这是**安全收益最大的一步**。

### 步骤 4：localStorage → 云数据库

收藏地址、历史路线这类数据，本地存换设备就丢。迁到云数据库后天然跨端同步。

### 步骤 5：Taro 端同步改造

taro-app 与 client 共用 utils 逻辑，优先抽公共包，避免两套代码重复改。

## 5. 风险与注意

- **地图 Key 暴露在前端**是当前最实际的安全问题，优先于其他改造。
- client/ 与 taro-app/ 存在重复的 utils（network.ts 两份），改造时容易只改一处漏一处 —— 先抽公共包。
- 403 个源文件里含 eslint-plugins 等构建产物/依赖，实际业务代码远少于此，改造前先确认真正的源码边界。

## 6. 对应离线文档

- `offline-docs/authentication/index.html`
- `offline-docs/database/doc-crud.html`
- `offline-docs/cloud-function/quick-start.html`
- `offline-docs/storage/index.html`
