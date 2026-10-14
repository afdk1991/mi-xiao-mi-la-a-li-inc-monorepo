# 全栈项目 CloudBase 适配方案

> 目标文档源：`https://docs.cloudbase.net`（腾讯云开发）
> 适配对象：`F:\网站全栈项目\` 下 16 个项目目录
> 生成日期：2026-10-08 ｜ **代码零改动** —— 本包只交付方案，不含对原项目的任何修改

---

## 一、先说结论

16 个项目里，**只有 5 个真正适合接入 CloudBase**，3 个不该动，其余 8 个属于可选或需先瘦身。
技术栈横跨 WordPress、Electron、Python、Go、Android、Taro 小程序、微服务集群 ——
**不存在一套通用改造方案**，强行统一迁移是错误方向。

| 分级 | 项目数 | 判定 |
|---|---|---|
| **A · 原生受益** | 5 | CloudBase 主场（小程序/轻量后端），改造成本低、收益明确，**建议做** |
| **B · 后端可迁** | 4 | 后端或数据层可上云，需按形态选云函数/云托管，**可做** |
| **C · 重资产** | 3 | WordPress + MySQL 深度绑定，迁云等于重写，**不建议** |
| **D · 特殊/空目录** | 4 | 桌面端、空目录、工具脚本，**无需改造** |

---

## 二、16 个项目优先级总表

| # | 项目 | 分级 | 技术栈 | 核心判断 | 建议动作 | 工作量 |
|---|---|---|---|---|---|---|
| 1 | **zhinenglux** | A | Taro + Koa/Nest + Supabase/PG/SQLite | Supabase 已装、三类库并存，数据层未定型 | **趁早收敛到 CloudBase** | 2–3 天 |
| 2 | **代驾距离收费计算** | A | 小程序 + amap-proxy 云函数 + 高德 | 已有云函数架构，与 CloudBase 同构 | **换宿主即可，见效最快** | 1–2 天 |
| 3 | **项目009商品采集** | A | EdgeOne + edge-functions + IndexedDB | 数据全在浏览器 IndexedDB，**丢数据风险最高** | 本地 → 云数据库 | 2–3 天 |
| 4 | **RouteNav** | A | Taro + React + 地图 | 已有 AuthContext，天然切入点 | 认证先行 + Key 收云函数 | 2–3 天 |
| 5 | **APPsp** | A | Taro/uni-app + Android + 鸿蒙 | localStorage 17 处，数据在本地 | 先排除构建产物再改 | 3–4 天 |
| 6 | **项目008采集** | B+ | Python + **已跑 CloudBase 云函数** | 用了云函数，**没用数据库/存储/定时触发器** | 深化：结果入库 + 定时触发 | 2–3 天 |
| 7 | **项目007** | B | FastAPI + PG + 三端客户端 | 长驻服务，**必须走云托管不是云函数** | 后端上云托管，客户端只改地址 | 3–4 天 |
| 8 | **项目003** | B | PG + Go + Electron + 邮件聚合 | 单入口函数形态，迁移成本低 | 库先迁 + 轮询改定时触发 | 3–4 天 |
| 9 | **项目005机箱** | B- | Python + pylibs（PIL/reportlab） | 485 文件**绝大部分是打包的第三方库** | 先瘦身，再谈云 | 1 天（瘦身） |
| 10 | **项目01** | C | WordPress + 微服务集群 + 六种数据库 | 512 文件，**六种数据存储并存** | **不建议整体迁移**，只动 uni-app 端 | 不建议全量 |
| 11 | **项目004** | C | WordPress + zibstyle（PHP 155） | WP 数据模型深度绑定 MySQL | **不划算**，可选媒体库迁云存储 | 不建议 |
| 12 | **项目006** | C | WordPress 插件 myp-core（有 Model 层） | 有 Model 层 = 改造有统一入口 | 可选：仅接口层上云 | 2–3 天（可选） |
| 13 | **项目002** | D | Electron 桌面（gale-engine） | **桌面应用无服务端**，不需要后端 | 仅加云端能力下发/遥测 | 1 天（可选） |
| 14 | **MIXMLAAL** | D | **空目录（0 源文件）** | 无内容 | 确认是否已并入项目01 | 0 |
| 15 | **scripts** | D | 2 个工具脚本 | 非业务项目 | 无需改造 | 0 |
| 16 | **proj-00** | D | Python + SQLite（5 文件） | 极小规模 | 无共享需求则保持本地 | 0.5 天（可选） |

---

## 三、CloudBase 能力矩阵（从哪里查）

| 能力 | 适用项目 | 离线文档位置 |
|---|---|---|
| 文档型数据库（MongoDB 兼容） | 1,3,4,5,9,13 | `offline-docs/database/`（88 页） |
| MySQL / PostgreSQL | 1,6,7,8,10,12 | `offline-docs/database/postgresql/`、`custom-database.html` |
| 云函数 | 2,5,6,8,9,12 | `offline-docs/cloud-function/`（50 页） |
| 云托管 CloudRun（长驻服务） | 7,8,10 | `offline-docs/run/`（71 页） |
| 云存储 | 1,3,4,5,6 | `offline-docs/storage/`（30 页） |
| 静态托管 | 2,7,13 | `offline-docs/hosting/`（9 页） |
| 身份认证 | 1,3,4,5 | `offline-docs/authentication/`+`authentication-v2/`（35 页） |
| HTTP API（无 SDK 场景） | 10,11,12,Android/鸿蒙 | `offline-docs/http-api/`（153 页） |
| AI 接入 | 全部可选 | `offline-docs/ai/`（289 页） |
| 定时触发器 | 6,8,9 | `offline-docs/cloud-function/function-configuration/` |
| 实时推送 watch | 3,4 | `offline-docs/database/realtime.html` |
| 安全规则 | 全部 | `offline-docs/database/security-rules.html` |

> 离线文档共 **3,562 页 / 240 MB**，已抓取完成（失败 2 页）。
> 其中 `en/` 为英文镜像 1,781 页，中文正文约 1,781 页。

---

## 四、通用改造四步法

```
第一步：界定源码边界          ← 必做，否则后续全错
   排除 dist/ build/ node_modules/ backups/ pylibs/ 及 *.dist 产物
   本轮扫描已发现：APPsp 命中 dist_verify/、项目005机箱 命中 pylibs/
   项目01 命中 daijia-dist_old_*/ 归档快照 —— 这些都不是源码

第二步：确定数据落点
   关系型业务（订单/用户/报表）→ CloudBase MySQL/PG，保留 SQL，改造量最小
   非结构化（配置/日志/轨迹）  → 文档型数据库
   ⚠ 不要为了"上云"把 SQL 强行改成文档型，那是自找麻烦

第三步：选运行时
   短任务 / API 代理 / 定时任务 → 云函数
   长驻服务（FastAPI / Go / 连接池 / Kafka 消费者）→ 云托管 CloudRun
   ⚠ FastAPI、Go 服务塞进云函数会冷启动严重 + 丢失长连接

第四步：渐进切换，不要一刀切
   在 api 层抽 repository 适配层，内部可切 CloudBase / 原后端
   分模块灰度，出问题能秒级回退
```

---

## 五、五个跨项目共性风险

| 风险 | 涉及项目 | 说明 |
|---|---|---|
| **扫描数字失真** | 项目005机箱(485)、项目01(512)、APPsp(126) | 命中打包库/构建产物/归档快照，据此估工时会严重高估 |
| **SQLite 留在云函数** | zhinenglux、项目007、proj-00 | 云函数多实例不共享本地磁盘，写入会丢，**必须迁出** |
| **长驻服务误塞云函数** | 项目007(FastAPI)、项目01(Kafka)、项目003(Go) | 冷启动 + 无长连接，应走云托管 |
| **第三方 Key 暴露前端** | RouteNav、APPsp、项目009、代驾 | 地图/API Key 应收进云函数环境变量 |
| **双向同步** | 项目009、APPsp | 不要设计双向同步，冲突处理会吃掉大量工期；用"云端为准 + 本地缓存" |

---

## 六、三个易踩的技术坑（官方文档明确警告）

1. **云存储有两套 API**，用错报 `STORAGE_NOT_EXIST`
   - 传统 NoSQL 环境 → `app.uploadFile({ cloudPath, filePath })` + `app.getTempFileURL()`
   - PG / pgstore 环境 → `app.storage.from(bucket).upload(key, file)`
   - 先用 `envQuery` 确认 `RuntimeBackends.postgresql` 再选

2. **新增文档返回的 ID 是 `result._id`**，不是 `result.id` / `result.insertedId`

3. **安全规则修改后有 2–5 分钟缓存延迟** —— 改完立即写入可能报
   `DATABASE_PERMISSION_DENIED`，不要误判成规则写错，等几分钟再验证

---

## 七、目录结构

```
F:\网站全栈项目\cloudbase-adaptation\
├── README.md                  本文件（总览 + 优先级矩阵）
├── projects\                   16 个项目各自的适配方案
│   ├── zhinenglux.md           A 级
│   ├── 代驾距离收费计算.md       A 级
│   ├── 项目009商品采集.md        A 级
│   ├── RouteNav.md             A 级
│   ├── APPsp.md                A 级
│   ├── 项目008采集.md           B+ 级（已接入，需深化）
│   ├── 项目007.md              B 级
│   ├── 项目003.md              B 级
│   ├── 项目005机箱.md           B- 级
│   ├── 项目01.md               C 级
│   ├── 项目004.md              C 级
│   ├── 项目006.md              C 级
│   ├── 项目002.md              D 级
│   ├── MIXMLAAL.md             D 级
│   ├── scripts.md              D 级
│   └── proj-00.md              D 级
├── templates\                  8 个接入模板（含 README）
│   ├── web-sdk.ts              Web/前端
│   ├── miniprogram.js          小程序
│   ├── node-server.js          Node 后端
│   ├── cloudfunction-node\      Node 云函数
│   ├── cloudfunction-python\    Python 云函数
│   ├── python-http-api.py      Python 无 SDK 场景
│   ├── php-cloudapi.php        WordPress/PHP
│   └── android-kotlin.kt       Android/鸿蒙
├── offline-docs\               CloudBase 官方文档离线镜像（3,562 页 / 240MB）
│   └── _index.html             离线导航入口
└── cb_urls.txt                 文档 URL 清单
```

## 八、下一步

按优先级开工，建议顺序：

1. **代驾距离收费计算**（1–2 天，见效最快，云函数直接换宿主）
2. **项目008采集**（已上云，补入库 + 定时触发，把已有投入变现）
3. **zhinenglux**（收敛数据层选型，趁早定 BaaS）
4. **项目009商品采集**（IndexedDB 数据丢失风险最紧迫）

需要我动手改哪个项目，说项目名即可 —— 目前**所有项目代码均未改动**。
