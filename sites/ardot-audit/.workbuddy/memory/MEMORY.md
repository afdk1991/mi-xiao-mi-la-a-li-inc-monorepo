# 项目004 · 长期项目笔记

## 项目定位
基于 **WordPress 7.0.4（zh_CN）** 的全栈二次开发项目。工作目录 `D:\网站全栈项目\项目004`。

## 不可逾越的红线
**WordPress 核心零改动**（`wp-admin/`、`wp-includes/`、根目录受控文件一个字节都不改）。
三层保证：① 开发层只用官方扩展机制 ② 校验层 `verify-core.php` 对账官方 checksums（基线 4171 条）③ 部署层容器核心来自镜像层，宿主机只挂载 `wp-content` 与 `wp-config.php`
`wp-config.php` 不在核心 checksums 清单内，可自由定制。

## 架构约定

### 功能落位
- **表现形态** → 子主题 `slstyle-child`（父主题 `slstyle` 零改动，可独立升级）
- **业务能力** → 自定义插件 `saas-aggregator`（换主题不丢功能）
- 通信方式：短代码 + 区块 + REST 接口

### 数据存放决策树
- 少量配置 → `wp_options` | 附着实体字段 → `postmeta` / `user_meta` | 临时可重建 → Transients | 高频写+检索+清理 → 自建表（目前仅 `wp_saas_agg_logs`）
- 自建表四要素：`$wpdb->prefix` + `$wpdb->get_charset_collate()` + `dbDelta()` + 版本号存 option。DDL 只在后台且版本不一致时执行

### 数据源服务归属（实测结论，勿凭直觉改）
| 数据源 | 服务 | 端口 |
|---|---|---|
| `gateway_status` / `business_core` | gateway-go | 8080 |
| `ai_insights` / `analytics` / `compliance` | ai-python | 8000 |
| `ecommerce` | **node-api** | **3001** |

`/api/products` **不在 Go 网关上**（8080 返回 404）。业务地址常量拆成两个：`SAAS_AGG_GATEWAY_URL` 与 `SAAS_AGG_NODE_API_URL`（三处同步：wp-config.php / .env / compose）

### 上游响应包装差异
- Python 层 / 网关：`{"tenant":...,"items":[...]}`
- **Node 层（node-api）**：`{"code":200,"msg":"成功","data":{"products":[...]}}` —— 由 `unwrap_data_envelope()` 拆包

### 设置结构迁移（schema migration）
`saas_agg_get_settings()` 用 `wp_parse_args(已存值, 默认值)`，**已存值优先**。
→ 凡改动已有默认值的语义，必须：① 递增 `SAAS_AGG_SETTINGS_SCHEMA` ② 在 `saas_agg_maybe_upgrade_settings()` 加迁移分支 ③ **只纠正仍等于旧默认值的条目** ④ `uninstall.php` 记得删 schema option
迁移挂 `plugins_loaded` **优先级 9**，并在 `saas_agg_bootstrap()` 与激活钩子里各兜一次

## 环境备忘
- **本地开发服务器必须跑在 WSL 内**（`php -S 0.0.0.0:8090`）；容器栈 nginx 端口 **8091**
- WSL 内 **8081 被 wslrelay 占用**；发行版名是 **`Ubuntu`**（`wsl -d Ubuntu`）
- `wsl` 命令输出 UTF-16，管道前加 `| tr -d '\r'`
- **Windows 侧 docker 客户端不可用**，容器操作一律走 WSL
- 向 WSL 传脚本**必须用 stdin**：`wsl -d Ubuntu -- bash -s <<'EOF' ... EOF`

## 验收基线（应保持全绿）
| 项目 | 期望 |
|---|---|
| 本地功能验收 `verify-site.php` | 34/37（3 FAIL 均为 .env 配置：WP_DEBUG/SSL/基线，非代码缺陷）|
| 容器功能验收 + 冒烟 | 34/34 + 19/19 |
| 插件单测 `tests/run-all.php` | **45 通过（1 SKIP）** |
| 独立校验 `tests/run-standalone.php` | 7/7 |
| 真实上游联通 `verify-upstream.php` | **6/6** |
| 升级与回滚 | 10/10 |
| 核心完整性 | 改动 0 / 缺失 0 / 非法新增 0（扫描 4255）|

## 上线前必改
管理员密码 / DB_PASSWORD / WP_DEBUG=false / WP_DYNAMIC_URL=0 + 真实域名 / FORCE_SSL_ADMIN=true + 证书 / SAAS_AGG_URL 改生产地址

## 仍需用户拍板
1. 🟡 **网关侧租户绑定 phase-1** —— WP 侧已加固（门禁/缓存键/字段只读，2026-08-30 生效）；网关 Go 源码已改（WS/auth 白名单收紧），但需 `go build`+部署，WSL 无 go 工具链未编译。最终需接入 IdP 做主体→租户归属裁决
2. 🟡 与微服务栈的**读写边界**（目前只读）
3. 🟢 `mixmlaal-wp-portal:8088` 替换还是并存

## 许可证与商用合规
**有条件商用**。GPLv2 不限制"运行"，SaaS 不触发源码开放；分发须履行 GPLv2 义务。
三条硬知识：① GPL 义务触发于"分发"不是"运行" ② HTTP 调外部微服务 = mere aggregation ③ GPLv2-or-later 可按 GPLv3 接收专利授权

### 风险点状态
| 项 | 状态 |
|---|---|
| Redis→Valkey 迁移 | ✅ 已解决（valkey:8.1-alpine，BSD-3-Clause）。⚠️ 不能挂载旧 RDB v12 卷 |
| Akismet | 未激活无 key，风险 0 |
| 主题命名 Zib→slStyle | ✅ 已闭环（2026-08-29） |

### 待补（仅对外分发时需要）
2 份 MIT 全文 + 1 份 OFL 全文 + 修改说明

## 主题开发约定（2026-08-30 确立）
1. **禁止硬编码 `page_id`** —— 用 `slstyle_page_url($slug)` 按 slug 解析
2. **分类取数统一走 `slstyle_get_primary_categories()`** —— 无分类时区块整段不渲染
3. **必备页面走 `slstyle_required_pages()`** —— 改动后必须递增 `slstyle_pages_version`
4. **主导航是 header.php 硬编码 HTML `<ul>`**，不是 `wp_nav_menu()`；`primary` 菜单位从未被渲染

## 关键踩坑
- Windows 侧 PHP 跑 `verify-core.php` 会**误报 FAIL**（路径不存在），必须在容器内跑
- WP 模板 `//` 行注释**绝不能压成单行**（会导致 fatal error）；批量 Edit 后务必 `php -l` + 实拉首页（带 no-cache）
- 验证前台必须带 `Cache-Control: no-cache`，避免被陈旧响应误导"假绿"

## 租户/越权（架构结论）
- 权威来源应落在**租户目录/鉴权服务**（当前**不存在**）；强制点应落在**网关** `authAndTenant`
- 定性：隔离依赖租户 ID 保密性。`X-Tenant-Id: default` 可拿到 default 租户全部订单
- 三个暴露面：① 前台渲染路径**无 capability 检查** ② 网关排除 `/health`/`/ws`鉴权 ③ 电商源直连 node-api **绕过网关零校验**

## 设计稿（Ardot Canvas）
- fileId: **720201023184408** | URL: `https://ardot.tencent.com/file/720201023184408`
- 共 **8 页**：设计系统(P1) / 首页(P2) / 用户中心(P3) / SaaS监控门户(P4) / 文章中心(P5) / 关于联系404(P6) / 演示中心聚合看板(P7) / 搜索结果页(P8)
- Design Token 提取自 `slstyle/style.css` + `functions.php` 真实代码
- P2 首页经 **13 轮**审计（P10-P13），累计 23 项全部修复并验证。
- P3 用户中心经 **1 轮**审计（P14），修复 4 项（Nav 背景/VipCard 渐变/Stat 间距/LoginBtn 居中）。
- P3-P8 全站 Footer 统一（P15）：6 页各插入三列 Footer（114 新节点）+ PageBG 高度调整。
- P4-P8 深度审计 + 全站 Nav 统一（P16，2026-09-06）：① 跨页 Nav 菜单间距 80px 等距统一（P3-P8 共 6 页）② 非激活菜单色 #E2E6EB（WCAG AA 达标）③ Nav 背景全站 #0F141B ④ P2 起始 x 208→200 统一 ⑤ P8 Pagination/Footer 重叠 38px bug 修复。
- **累计 32 项修复 + 6 页 Footer + 全站 Nav 统一 = 全站 8 页设计一致性达标。** P4-P8 左边距 40px 保持现状（信息架构分层）。

## 代码缺陷状态（doc 07 全量闭环）
doc 07 列出的 7 项原始缺陷 + 第 8 轮 4 项补充修复，**全部于 2026-08-30 闭环**：
- ✅ page_id=14 三处死链 → `slstyle_page_url()` 按 slug 解析
- ✅ user-center 页未创建 → `slstyle_ensure_pages_once()` 自愈建出 ID=15
- ✅ header 硬编码分类 → `slstyle_get_primary_categories()` 动态取
- ✅ i18n 加载过早 → 拆到 `init` 优先级 0
- ✅ README 数据源 5→6
- ✅ front-page 分类段被压单行致 500 → 规范多行 + `$card_styles` 无条件定义
- ✅ 主导航改 `wp_nav_menu('primary')` + `SLStyle_Nav_Walker`
- ✅ 租户越权 WP 侧加固（门禁/缓存键/字段只读）
- ✅ 默认分类+示例文章播种（`seed-content.php`）
- ✅ `.env` 引用的缺失脚本 `sync-db-host.sh` 补齐
**真正剩余**：仅网关 Go 侧需编译部署（跨仓库）+ 生产 .env 切换（上线时）+ 分发级 3 项许可文本（对外分发时）

## 详细文档索引
`docs/01-现状清单.md` | `docs/02-开发思路与扩展点.md` | `docs/03-待确认项.md` | `docs/04-部署与验收.md` | `docs/05-许可证与商用合规分析.md` | `docs/06-第三方许可与声明清单.md` | `docs/07-代码通读发现清单.md` | `docs/08-主题更名改动清单.md`
