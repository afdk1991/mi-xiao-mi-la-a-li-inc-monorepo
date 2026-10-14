# 18. 其它子项目说明

> `gexm-platform` 仓库 `packages/` 下除 `server`、`pc`、`app`、`desktop`、`sdk`、`shared` 六个核心包外，还包含若干归档或独立子项目。本章详述这些子项目的定位、目录结构、与主流程的关系。所有路径以 `file:///` 协议给出。

---

## 18.1 子项目分类总览

| 类型 | 子项目 | 状态 | 说明 |
| --- | --- | --- | --- |
| 微服务 | `order-service`、`product-service`、`user-service` | 独立 | 主流程可选扩展 |
| 鸿蒙原生 | `harmony-app` | 实验性 | 鸿蒙 ArkTS 应用 |
| 历史归档 | `mixmlaal`、`mixmlaal-inc`、`mixmlaal-inc-legacy` | 归档 | 旧版 monorepo |
| 独立工具 | `route-nav`、`zhinenglux` | 独立 | 路径导航 / 智能路径 |
| 平台对接 | `coze-projects`、`daijiatongxcx`、`omniplex-platform`、`weidangzhenghe` | 独立 | 第三方平台对接 |

> **重要约束**：以上子项目多数为历史归档或独立实验项目，**不属于主流程**。主流程仅涉及 `server` / `pc` / `app` / `desktop` / `sdk` / `shared` 六个核心包。

---

## 18.2 微服务子项目

### 18.2.1 order-service（订单微服务）

**路径**：[packages/order-service/](file:///f:/gexm/packages/order-service/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立微服务 |
| 状态 | 可选扩展 |
| 通信协议 | HTTP REST API |
| 主流程关系 | 主服务通过 HTTP 调用，可独立部署 |

#### 职责

- 订单生命周期管理（创建、支付、发货、完成、退款）
- 订单状态机
- 订单查询（含分页、筛选、排序）
- 订单统计

#### 部署模式

- 可作为 `@gexm/server` 的扩展模块（默认集成）
- 也可独立部署为微服务，通过 Nginx 反向代理路由
- 与主服务共享同一数据库（默认）或独立数据库

### 18.2.2 product-service（商品微服务）

**路径**：[packages/product-service/](file:///f:/gexm/packages/product-service/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立微服务 |
| 状态 | 可选扩展 |
| 通信协议 | HTTP REST API |

#### 职责

- 商品 CRUD
- 商品分类管理
- 商品库存管理
- 商品搜索（含全文搜索）
- 商品评价聚合

### 18.2.3 user-service（用户微服务）

**路径**：[packages/user-service/](file:///f:/gexm/packages/user-service/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立微服务 |
| 状态 | 可选扩展 |
| 通信协议 | HTTP REST API |

#### 职责

- 用户注册、登录、登出
- 用户信息管理
- 用户权限与角色
- 用户行为日志

---

## 18.3 鸿蒙原生 App

### 18.3.1 harmony-app

**路径**：[packages/harmony-app/](file:///f:/gexm/packages/harmony-app/)

| 属性 | 值 |
| --- | --- |
| 类型 | 鸿蒙原生应用 |
| 状态 | 实验性 |
| 技术栈 | ArkTS / HarmonyOS SDK |
| 主流程关系 | 与 `@gexm/app` 的鸿蒙模式并存 |

#### 与 @gexm/app 鸿蒙模式的关系

| 维度 | `@gexm/app` 鸿蒙模式 | `harmony-app` 原生 |
| --- | --- | --- |
| 技术栈 | uni-app 3 + Vue 3 | ArkTS |
| 复用代码 | 是（与 H5、小程序共享） | 否（独立实现） |
| 性能 | 一般 | 最优 |
| 开发效率 | 高 | 低 |
| 维护 | 主流程 | 实验 |

**建议**：优先使用 `@gexm/app` 的鸿蒙模式，仅在性能要求极高的场景使用 `harmony-app`。

---

## 18.4 历史归档项目

### 18.4.1 mixmlaal（旧版 monorepo）

**路径**：[packages/mixmlaal/](file:///f:/gexm/packages/mixmlaal/)

| 属性 | 值 |
| --- | --- |
| 类型 | 旧版 monorepo |
| 状态 | 归档（不再维护） |
| 结构 | 含 microservices、apps、services 多层结构 |

#### 归档原因

- 架构演进：从多层微服务架构迁移到 npm workspaces 单仓库
- 代码冗余：与 `@gexm/server`、`@gexm/pc` 等核心包功能重叠
- 维护成本高

#### 处置建议

- **不要修改**：归档代码仅供历史参考
- **不要引用**：新代码不应依赖此目录
- **可考虑删除**：在确认无任何依赖后可整体删除

### 18.4.2 mixmlaal-inc（含 80+ 微服务的归档项目）

**路径**：[packages/mixmlaal-inc/](file:///f:/gexm/packages/mixmlaal-inc/)

| 属性 | 值 |
| --- | --- |
| 类型 | 大型归档项目 |
| 状态 | 归档（不再维护） |
| 规模 | 80+ 微服务 |
| 分层 | 5 层（前端集群 / 后端微服务集群 / 全平台应用端 / 部署运维层 / 项目文档层） |

#### 分层结构

```
packages/mixmlaal-inc/
├── 01-前端集群/                # 前端项目集合
├── 02-后端微服务集群/          # 后端微服务
├── 03-全平台应用端/            # 多端 App
├── 05-部署运维层/              # 部署脚本与配置
└── 06-项目文档层/              # 文档
```

#### 归档原因

- 微服务过度拆分导致运维成本激增
- 80+ 微服务多数功能与主流程重叠
- 数据库实例过多，资源浪费

### 18.4.3 mixmlaal-inc-legacy

**路径**：[packages/mixmlaal-inc-legacy/](file:///f:/gexm/packages/mixmlaal-inc-legacy/)

| 属性 | 值 |
| --- | --- |
| 类型 | mixmlaal-inc 的历史快照 |
| 状态 | 归档（不再维护） |
| 用途 | 历史代码参考 |

---

## 18.5 独立工具子项目

### 18.5.1 route-nav（路径导航）

**路径**：[packages/route-nav/](file:///f:/gexm/packages/route-nav/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立工具项目 |
| 状态 | 维护中 |
| 结构 | client / server / taro-app |

#### 职责

- 路径导航功能
- 多端实现（Web、Taro 小程序）

#### 目录结构

```
packages/route-nav/
├── client/             # Web 前端
├── server/             # 后端
└── taro-app/           # Taro 小程序
```

### 18.5.2 zhinenglux（智能路径）

**路径**：[packages/zhinenglux/](file:///f:/gexm/packages/zhinenglux/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立工具项目 |
| 状态 | 维护中 |

#### 职责

- 智能路径规划
- 与 `route-nav` 互补，提供算法层支持

---

## 18.6 第三方平台对接

### 18.6.1 coze-projects（Coze 平台对接）

**路径**：[packages/coze-projects/](file:///f:/gexm/packages/coze-projects/)

| 属性 | 值 |
| --- | --- |
| 类型 | 第三方平台对接 |
| 状态 | 维护中 |
| 平台 | Coze（字节跳动 AI Bot 平台） |

#### 职责

- 对接 Coze 平台 API
- 实现 Bot 调用、知识库查询、工作流触发
- 与主服务 AI Agent 模块互补

### 18.6.2 daijiatongxcx（代驾通小程序）

**路径**：[packages/daijiatongxcx/](file:///f:/gexm/packages/daijiatongxcx/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立小程序 |
| 状态 | 维护中 |
| 平台 | 微信小程序 |

#### 职责

- 代驾服务预约
- 司机调度
- 订单管理
- 支付集成

### 18.6.3 omniplex-platform（Omniplex 平台）

**路径**：[packages/omniplex-platform/](file:///f:/gexm/packages/omniplex-platform/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立平台 |
| 状态 | 维护中 |

#### 职责

- Omniplex 业务平台
- 独立部署，通过 API 与主服务交互

### 18.6.4 weidangzhenghe（围挡整合）

**路径**：[packages/weidangzhenghe/](file:///f:/gexm/packages/weidangzhenghe/)

| 属性 | 值 |
| --- | --- |
| 类型 | 独立项目 |
| 状态 | 维护中 |

#### 职责

- 围挡工程整合管理
- 施工现场数据采集
- 工程进度跟踪

---

## 18.7 子项目治理规则

### 18.7.1 归档项目处置

按 `project_memory.md` 约定，以下目录应**清理移除**以精简项目结构：

- `legacy-web/`
- `legacy-projects/`
- `legacy-docs/`
- `Apache/`
- `IIS/`
- `Tomcat8_4/`
- `Tomcat8_5+/`
- `Haproxy/`

**清理原则**：
1. 确认无任何引用（grep 全仓库）
2. 备份后删除
3. 同步更新文档

### 18.7.2 历史项目保留原则

- `mixmlaal-inc` 等大型归档项目，如长期未引用，应迁移到独立的归档仓库
- 保留 `git history` 以便追溯
- 主仓库 `packages/` 只保留活跃子项目

### 18.7.3 新增子项目规范

新增子项目必须：
1. 在 `packages/` 下创建独立目录
2. 提供完整的 `package.json`
3. 在根 `package.json` 的 `workspaces` 中自动包含
4. 编写 README.md 说明项目用途
5. 在本章文档中登记

---

## 18.8 子项目状态矩阵

| 子项目 | 路径 | 类型 | 状态 | 主流程依赖 | 文档完整度 |
| --- | --- | --- | --- | --- | --- |
| `order-service` | [packages/order-service/](file:///f:/gexm/packages/order-service/) | 微服务 | 活跃 | 可选 | 中 |
| `product-service` | [packages/product-service/](file:///f:/gexm/packages/product-service/) | 微服务 | 活跃 | 可选 | 中 |
| `user-service` | [packages/user-service/](file:///f:/gexm/packages/user-service/) | 微服务 | 活跃 | 可选 | 中 |
| `harmony-app` | [packages/harmony-app/](file:///f:/gexm/packages/harmony-app/) | 鸿蒙原生 | 实验 | 否 | 低 |
| `mixmlaal` | [packages/mixmlaal/](file:///f:/gexm/packages/mixmlaal/) | 旧版 monorepo | 归档 | 否 | 低 |
| `mixmlaal-inc` | [packages/mixmlaal-inc/](file:///f:/gexm/packages/mixmlaal-inc/) | 大型归档 | 归档 | 否 | 低 |
| `mixmlaal-inc-legacy` | [packages/mixmlaal-inc-legacy/](file:///f:/gexm/packages/mixmlaal-inc-legacy/) | 历史快照 | 归档 | 否 | 低 |
| `route-nav` | [packages/route-nav/](file:///f:/gexm/packages/route-nav/) | 独立工具 | 活跃 | 否 | 中 |
| `zhinenglux` | [packages/zhinenglux/](file:///f:/gexm/packages/zhinenglux/) | 独立工具 | 活跃 | 否 | 中 |
| `coze-projects` | [packages/coze-projects/](file:///f:/gexm/packages/coze-projects/) | 平台对接 | 活跃 | 否 | 中 |
| `daijiatongxcx` | [packages/daijiatongxcx/](file:///f:/gexm/packages/daijiatongxcx/) | 小程序 | 活跃 | 否 | 中 |
| `omniplex-platform` | [packages/omniplex-platform/](file:///f:/gexm/packages/omniplex-platform/) | 独立平台 | 活跃 | 否 | 中 |
| `weidangzhenghe` | [packages/weidangzhenghe/](file:///f:/gexm/packages/weidangzhenghe/) | 独立项目 | 活跃 | 否 | 中 |

---

## 18.9 与主流程的关系图

```
┌──────────────────────────────────────────────────────────────┐
│                      主流程（核心包）                          │
│                                                              │
│   @gexm/server  @gexm/pc  @gexm/app  @gexm/sdk              │
│   @gexm/shared  @gexm/desktop                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  微服务扩展       │ │  独立工具         │ │  第三方对接       │
│                  │ │                  │ │                  │
│  order-service   │ │  route-nav       │ │  coze-projects   │
│  product-service │ │  zhinenglux      │ │  daijiatongxcx   │
│  user-service    │ │                  │ │  omniplex-       │
│                  │ │                  │ │    platform      │
│                  │ │                  │ │  weidangzhenghe  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                  ┌──────────────────┐
                  │   归档项目        │
                  │                  │
                  │  mixmlaal        │
                  │  mixmlaal-inc    │
                  │  mixmlaal-inc-   │
                  │    legacy        │
                  │  harmony-app     │
                  │  (实验性)         │
                  └──────────────────┘
```

---

## 18.10 参考文档

- [packages/order-service/](file:///f:/gexm/packages/order-service/) — 订单微服务
- [packages/product-service/](file:///f:/gexm/packages/product-service/) — 商品微服务
- [packages/user-service/](file:///f:/gexm/packages/user-service/) — 用户微服务
- [packages/harmony-app/](file:///f:/gexm/packages/harmony-app/) — 鸿蒙原生 App
- [packages/mixmlaal/](file:///f:/gexm/packages/mixmlaal/) — 旧版 monorepo
- [packages/mixmlaal-inc/](file:///f:/gexm/packages/mixmlaal-inc/) — 大型归档项目
- [packages/route-nav/](file:///f:/gexm/packages/route-nav/) — 路径导航
- [packages/zhinenglux/](file:///f:/gexm/packages/zhinenglux/) — 智能路径
- [packages/coze-projects/](file:///f:/gexm/packages/coze-projects/) — Coze 对接
- [packages/daijiatongxcx/](file:///f:/gexm/packages/daijiatongxcx/) — 代驾通小程序
- [packages/omniplex-platform/](file:///f:/gexm/packages/omniplex-platform/) — Omniplex 平台
- [packages/weidangzhenghe/](file:///f:/gexm/packages/weidangzhenghe/) — 围挡整合
