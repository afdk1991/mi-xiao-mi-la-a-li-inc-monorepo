# F:\项目01 整理合并分析报告

> 生成时间：2026-08-11 ｜ 模式：**只读扫描，未移动/删除任何文件**
> 触发专家：文件整理专家（file-organizer-zh）
> 用户已确认：① 先出分析报告 → ② 为 SkillHub 加技能 → ③ 合并时**不备份、直接移动**

---

## 一、总体概况

| 指标 | 数值 |
|------|------|
| 顶层条目数 | ~60（目录与根文件混放） |
| 估算总体积 | **约 40.7 GB** |
| 估算文件总数 | **约 131 万** |
| 最大单目录 | `gexm` 29.4 GB / 389,947 文件 |
| 核心问题 | 多组同系/重复项目混放 + 根目录杂入 WordPress 站点 |

体积 Top 13（>50 MB）：

| 目录 | 体积 | 文件数 | 性质 |
|------|------|--------|------|
| gexm | 29.4 GB | 389,947 | 疑似 MiXiaoMi/laal 同源分支（来自 E04 工作区） |
| Mi Xiao Mi La A Li Inc | 3.29 GB | 290,559 | **主项目** Mi-Xiao-Mi-La-A-Li-Inc |
| backups | 2.57 GB | 74,658 | 历史备份 |
| MIXMLAAL | 2.08 GB | 160,215 | 大写变体，疑似同项目不同导出 |
| E04-migrated | 1.19 GB | 26,964 | E04 迁移产物 |
| RouteNav | 811 MB | 107,449 | 性质不明，疑为某项目 |
| daijiatongxcx | 637 MB | 68,526 | 代驾微信小程序（体量最大的一端） |
| enterprise-admin-platform | 500 MB | 66,852 | 企业管理平台 |
| blog-template | 444 MB | 26,026 | 博客模板（迁移产物） |
| projects | 397 MB | 51,307 | 泛用目录，疑为杂项集合 |
| Mi Xiao Mi A Li Inc | 212 MB | 28,594 | 缺 "La" 的旧版/精简版 |
| plugin-mcp-system | 80 MB | 9,453 | **SkillHub**（待扩展） |
| node_modules | 68 MB | 7,603 | 根目录 npm 依赖 |

---

## 二、重复 / 同系集群（合并候选）

### A. MiXiaoMi / laal 主项目系
- `Mi Xiao Mi La A Li Inc` — 3.29 GB / 290,559 文件（对应记忆中的主项目 Mi-Xiao-Mi-La-A-Li-Inc）
- `MIXMLAAL` — 2.08 GB / 160,215 文件（大写变体，疑似同项目不同导出）
- `Mi Xiao Mi A Li Inc` — 212 MB / 28,594 文件（缺 "La" 的旧版/精简版）
- `gexm` — 29.4 GB / 389,947 文件（来自 E04 工作区，体量最大，疑为同源另一分支）
- `laal-top` — 13 文件（SSL 证书/密钥，属 laal.top 部署配置）

> **状态（今日早些时候已完成）**：三向增量合并已执行——`MIXMLAAL` 与 `Mi Xiao Mi A Li Inc` 的差异文件已并入 `Mi Xiao Mi La A Li Inc`（新增 1717 文件，17 处冲突保留目标版）。源目录 `MIXMLAAL`、`Mi Xiao Mi A Li Inc` 仍保留未删（沙箱禁止删除），仅待归档。
> **建议**：`gexm` 因体量巨大且来源待确认，**需你明确是否同源**后再决定并入或独立保留；已合并的 `MIXMLAAL`/`Mi Xiao Mi A Li Inc` 源目录建议移入 `_archive` 待人工最终确认后删除。

### B. daijia 代驾平台多端
- `daijiatongxcx` — 637 MB / 68,526 文件（微信小程序，体量最大）
- `daijia-core` — 38 文件（后端 PHP）
- `daijia-admin-dashboard` — 12 文件
- `daijia-mobile` — 23 文件
- `daijia-website` — 5 文件
- `daijia-woo-ext` — 3 文件（WooCommerce 扩展）
- `daijiatxcx` — 1 文件

> **建议**：各端保留为独立子目录，统一归入 `daijia/`（多端 monorepo 结构），互不覆盖。

### C. admin 企业管理系
- `enterprise-admin-platform` — 500 MB / 66,852 文件
- `b-admin` — 58 文件

> **建议**：`b-admin` 仅 58 文件，疑为精简版/旧版；需你确认是否与 `enterprise-admin-platform` 同源，再决定是否合并。

### D. 迁移 / 冗余遗留
- `E04-migrated` — 1.19 GB / 26,964 文件
- `blog-template` — 444 MB / 26,026 文件
- `redundant` — 27 文件
- `_merge_output` — 5 文件
- `RouteNav` — 811 MB / 107,449 文件（性质不明）
- `projects` — 397 MB / 51,307 文件（泛用目录，疑杂项）

> **建议**：E04-migrated / blog-template 为迁移产物，如已并入对应项目可移入 `_archive`；RouteNav / projects 需你确认用途后再归类。

### E. 备份 / 数据
- `backups` — 2.57 GB / 74,658 文件（历史备份，建议保留或归档）
- `data` — 1 文件（*.db）

### F. 根目录 WordPress 站点（混杂）
- 根目录含 ~20 个 `wp-*.php` + `composer.json` + `package.json` + `node_modules`(68 MB) + `index.php`

> **建议**：WordPress 站点不应与多项目混在根目录，迁入独立子目录（如 `wordpress/` 或 `laal-wordpress/`），保持根目录为工作区索引。

### G. SkillHub（plugin-mcp-system）
- `plugin-mcp-system` — 80 MB / 9,453 文件；含 `src/skill/`（SkillRegistry / SkillOrchestrator / SkillScheduler）
- 技能经插件 manifest 的 `skills` 数组注册到 `SkillRegistry`（详见第四节）

### 杂项（建议保留）
`docs`、`tests`、`scripts`、`server`、`deliverables`、`mcp-server-guide`、`zhinenglux`、`.edgeone`、`.codebuddy`、`.workbuddy`、`.trae` 等

---

## 三、建议的目标结构（合并后）

```
F:\项目01\
├── MiXiaoMiLaALi\        # A 系合并，规范名
│   ├── web\              # Mi Xiao Mi La A Li Inc 内容
│   ├── gexm\             # 确认同源后并入，或保持独立子目录
│   └── deploy\           # laal-top 证书密钥
├── daijia\               # B 系多端 monorepo
│   ├── core\  admin-dashboard\  mobile\  website\  woo-ext\  xcx\
├── admin\                # C 系（确认后）
├── projects-archive\      # D/E 冗余/备份/迁移产物
├── wordpress\            # F 根目录 WP 迁入
├── plugin-mcp-system\    # G SkillHub（保持并扩展）
├── docs\ tests\ scripts\ ...   # 杂项保留
└── _archive\             # 待你最终确认删除的项
```

---

## 四、SkillHub 扩展方案（plugin-mcp-system）

技能通过**插件 manifest 的 `skills` 数组**注册到 `SkillRegistry`（见 `src/skill/SkillRegistry.ts`：`register(skill: SkillDescriptor)`）。新增技能 = 在 `src/plugins/` 下新建插件 + `manifest.json`（含 `skills`）+ 实现 + 单测。

**建议新增 3 个贴合本次工作流的技能（作为新插件 `project-toolkit`）：**

| 技能名 | tags | 作用 |
|--------|------|------|
| `dir-classify` | file, organize | 按扩展名将目录文件分类到 images/documents/code/…（本专家逻辑的程序化封装） |
| `dup-detect` | dedupe, analyze | 扫描并比对同系项目目录，输出重复/差异报告 |
| `safe-merge` | merge, safe | 按白名单安全合并目录，冲突自动加后缀，绝不覆盖 |

> 需你确认：采用上述 3 个，或你另有技能清单/方向。确认后我会在 `plugin-mcp-system` 中实现该插件及单测。

---

## 五、执行计划（待你确认后执行）

⚠️ **此操作非常危险，可能导致不可逆的数据丢失！** 你已选择「不备份、直接移动」，移动后原路径不可恢复；且 `gexm` 单目录 29 GB / 39 万文件，跨目录移动可能耗时且易因文件占用失败。

### 第一批（低风险、无歧义，可直接执行）
| 源路径 | 目标路径 |
|--------|----------|
| `F:\项目01\daijia-core` | `F:\项目01\daijia\core` |
| `F:\项目01\daijia-admin-dashboard` | `F:\项目01\daijia\admin-dashboard` |
| `F:\项目01\daijia-mobile` | `F:\项目01\daijia\mobile` |
| `F:\项目01\daijia-website` | `F:\项目01\daijia\website` |
| `F:\项目01\daijia-woo-ext` | `F:\项目01\daijia\woo-ext` |
| `F:\项目01\daijiatongxcx` | `F:\项目01\daijia\xcx` |
| `F:\项目01\daijiatxcx` | `F:\项目01\daijia\xcx-tong` |
| 根目录 `wp-*.php` + `index.php` + `composer.json` + `package.json` + `node_modules` | `F:\项目01\wordpress\` |
| `F:\项目01\redundant` | `F:\项目01\projects-archive\redundant` |
| `F:\项目01\_merge_output` | `F:\项目01\projects-archive\_merge_output` |

### 第二批（需你确认决策后再执行）
| 待确认问题 | 影响目录 |
|------------|----------|
| `gexm` 是否与 MiXiaoMi 同源？ | `gexm`（29.4 GB）是否并入 `MiXiaoMiLaALi\gexm` 或独立保留 |
| `b-admin` 是否 `enterprise-admin-platform` 的精简版？ | `b-admin` 是否并入 `admin\` |
| `RouteNav` / `projects` 用途？ | 归入 `projects-archive` 还是保留 |
| `MIXMLAAL` / `Mi Xiao Mi A Li Inc` 源目录（已合并，有少量差异） | 移入 `_archive` 待人工确认后删 |
| `E04-migrated` / `blog-template` 是否已并入对应项目？ | 是否移入 `projects-archive` |

---

## 六、下一步

1. 你确认本报告中的 **合并映射** 与 **SkillHub 技能清单**；
2. 回复「继续」后，我按「第一批 → 第二批(确认后)」分步执行移动 + 实现 SkillHub 插件；
3. 每批完成后输出结果报告，第二批前再次停留确认。

（本次仅完成只读分析，未对任何文件执行移动/删除。）
