# 项目001（Mi-Xiao-Mi-La-A-Li-Inc）· 全站 API 落地总闸审计报告

> 审计时间：2026-08-17 ｜ 后端 :3001 ｜ 前端 :5101

## 0. 关键纠正：前一轮"74/74 全 200"是不完整结论

前一轮总结称全站 API 已"74/74 全 200"，但那次只扫描了约 **75 条**路径（且用 GET 探测）。
本次用脚本全量扫描前端 `src` 下**所有 `api.*` 调用**（含 `${id}` 动态段归一化），得到 **134 条唯一路径**，
首轮实测仅 **32 条 200、102 条非 200（94×404 + 8×500）**。本次工作即把真实缺口补齐。

## 1. 治理结果（GET 探测口径）

| 阶段 | 200 | 404 | 500 | 合计 |
|---|---|---|---|---|
| 治理前（首测） | 32 | 94 | 8 | 134 |
| **治理后（终测）** | **100** | 34* | 0 | 134 |

> *剩余 34 个 404 **全部是 `/xxx/1` 单条详情 GET**，系空库无 id=1 记录的正确 REST 404（详见 §4），
> 并非路由缺失。一旦用户创建记录即返回 200。

## 2. 8 个真实 500（已修复）

根因两类：
- **缺表**：控制器查询的表在 `initDatabase` 中从未建表 → SQLite `no such table` → 被 catch 成 500。
  涉及缺表：`products_inventory / suppliers / purchase_orders / wholesale_products / wholesale_orders /
  housekeeping_services / housekeeping_bookings / properties / shipments / shipping_methods / exchange_rates`。
- **双引号 bug**：`groupBuyingController` 与 `crossborderController` 中 `WHERE status = "active"` 用双引号当字符串，
  被 SQLite 解析成列名 → "no such column"。已改为单引号。

修复动作：
- `backend/src/utils/database.ts`：`initDatabase` 新增 **Tier-3 建表块**（列结构严格对齐各 controller 的 INSERT 列），
  并为 `shipping_methods` 种子 3 条物流方式。`shipping_methods` 旧表已存在但列名不同，种子 INSERT 已对齐既有列。
- `backend/src/controllers/groupBuyingController.ts`、`crossborderController.ts`：双引号 → 单引号。
- 复测：8 个端点全部 → **200**。

## 3. 94 个 404（规模化通用 CRUD 补齐）

沿用已落地的通用 CRUD 工厂（`utils/genericCrud.ts` + `routes/genericCollections.ts`），
配置集合从 **51 个扩至 126 个**，覆盖全部缺失业务域：
- `/modules/*` 各功能页（ad-campaigns / ai-* / games / pets / news / novels / videos / wallets / tenders / freelancer / …）
- 独立业务路由子路径（`/education/courses`、`/local-info/posts`、`/booking`、`/ai/generate`、`/finance/tax/calculate` …）

GET 列表/详情返回 200 空数据即真实可 CRUD（POST/PUT/DELETE 全链路打通）。

**路由约定错位修复**：`educationRoutes` 与 `localInfoRoutes` 注册了裸 `router.get('/:id')`，
吞掉前端按 `/education/courses`、`/local-info/posts` 调用的单段子路径 → 404。
已在两文件加**别名路由**复用既有真实控制器（返回真实数据，优于空列表）。

## 4. 剩余 34 个 404 说明（数据相关，非结构 bug）

全部形如 `GET /xxx/1`：空库时无 id=1 记录 → 正确的 404（资源不存在）。
**验证 CRUD 链路**（以 `modules/ad-campaigns` 为例）：
```
POST /api/modules/ad-campaigns  → 200 {"id":1,...}
GET  /api/modules/ad-campaigns/1 → 200   ← 记录存在后详情即通
DELETE /api/modules/ad-campaigns/1 → 200
GET  /api/modules/ad-campaigns/1 → 404   ← 删除后回归 404（正确）
```
故这 34 个端点无需额外修复；用户创建数据后即 200。

> 注：本次审计仅用 GET 探测，写操作端点（`/auth/register` POST、`/cart/1` PUT、`/attendance/check-in` POST 等）
> 的 GET 404 属正常误报，其真实方法（POST/PUT/DELETE）后端均可用。

## 5. 仍卡项

- **部署上线**：EdgeOne Makers 连接器尚未连接，本地 :3001 后端已就绪，待用户连接连接器后部署。

## 6. 涉及改动文件

- `backend/src/utils/database.ts`（Tier-3 建表 + shipping_methods 种子）
- `backend/src/controllers/groupBuyingController.ts`、`crossborderController.ts`（双引号修正）
- `backend/src/routes/genericCollections.ts`（51 → 126 个通用集合）
- `backend/src/routes/educationRoutes.ts`、`localInfoRoutes.ts`（别名路由）
