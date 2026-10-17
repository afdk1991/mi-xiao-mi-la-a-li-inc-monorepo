# route-nav server

零运行时依赖的服务端：`node:http` + `node:sqlite`（Node 内置）。**要求 Node >= 22.18**（利用 TS 类型擦除直接运行 `.ts`，无需 tsx/ts-node）。

## 运行

```bash
node src/index.ts          # 生产/直接运行（默认 0.0.0.0:9091）
node --watch src/index.ts  # 开发模式（原生 watch）
PORT=3000 node src/index.ts
```

数据库文件：`server/data/route-nav.db`（首次启动自动建表并灌入 69 个景点种子数据；已 gitignore）。
库路径可用环境变量 `ROUTE_NAV_DB` 覆盖。

## 环境变量（均可选）

| 变量 | 作用 |
|---|---|
| `PORT` / `HOST` | 监听地址（默认 `0.0.0.0:9091`） |
| `AMAP_WEB_KEY` | 高德 Web 服务 Key（GCJ-02，国内最准） |
| `TENCENT_KEY` | 腾讯位置服务 WebServiceAPI Key（GCJ-02） |
| `AUTH_SECRET` | 令牌签名密钥（>=16 位；缺省自动生成并持久化，重启不失效） |
| `ROUTE_NAV_DB` | SQLite 库文件路径 |

地理编码回退链：高德 → 腾讯 → Photon → Nominatim。未配 Key 时自动走免 Key 的 Photon/Nominatim（WGS-84）。

## API 一览（`/api/v1` 前缀）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/health` | 否 | 健康检查 + 当前 geo 提供商 |
| POST | `/auth/register` | 否 | `{username,email,password}` → `{data:{id,username,email,token}, user, token}` |
| POST | `/auth/login` | 否 | `{email\|username,password}` → 同上（双端兼容格式） |
| GET | `/auth/me` | 是 | 当前用户 |
| GET/POST | `/addresses` | 是 | 地址列表 / 新建 |
| GET/PUT/DELETE | `/addresses/:id` | 是 | 单地址读改写删 |
| POST | `/addresses/from-attraction/:attractionId` | 是 | 景点转地址（单个） |
| POST | `/addresses/from-attractions` | 是 | `{attractionIds}` 景点转地址（批量） |
| POST | `/geocode` | 否 | `{query}` → `{latitude,longitude,displayName,city,coordSystem}` |
| POST | `/reverse-geocode` | 否 | `{latitude,longitude}` → 同上 |
| POST | `/routes/optimize` | 是 | `{addressIds,mode}` → `{addressIds,orderedAddresses,totalDistance,optimizationMode}` |
| GET/POST | `/routes` | 是 | 路线列表 / 保存 |
| GET/DELETE | `/routes/:id` | 是 | 单路线读删 |
| POST | `/distance` | 否 | `{from,to}` → `{distance,unit}`（haversine，米） |
| POST | `/external-map-url` | 否 | `{latitude,longitude,name?,provider}` → `{url,provider}` |
| GET | `/attractions?city&category&region&search&limit&offset` | 否 | 景点分页 |
| GET | `/attractions/cities/list` | 否 | 城市列表 + 计数 |
| GET | `/attractions/:id` | 否 | 景点详情 |

优化模式 `mode`：`shortest`（总里程最短，NN+2-opt）/ `balanced`（路段更平滑，最小化各段平方和）/ `regional`（按城市聚类，组间质心 NN + 组内 NN）。地址的 `isStart`/`isEnd` 标记会钉住首尾。

外部地图 `provider`：`amap`（GCJ-02 原生 URI）/ `baidu`（自动转 BD-09）/ `google`、`apple`（自动转 WGS-84）。

## 响应格式约定

同时兼容两个前端消费方：

- Expo `client/utils/api.ts` 读取 `body.data ?? body`
- Taro `taro-app/src/utils/network.ts` 读取 `body` 本身

因此列表/单对象返回**裸载荷**；auth 响应同时提供 `data.{...}` 与顶层 `token`/`user`。错误统一 `{success:false,error}` + 4xx/5xx。

## 校验

```bash
node scripts/lint.mjs   # 零依赖链接检查：动态 import 全部 src 模块
```
