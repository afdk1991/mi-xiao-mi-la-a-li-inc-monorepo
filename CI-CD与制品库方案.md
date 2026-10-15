# CI/CD 与制品库方案（GitHub Packages + Actions + EdgeOne）

> 适用仓库：`afdk1991/mi-xiao-mi-la-a-li-inc-monorepo`（单一 Git 仓库、20 模块多语言 monorepo）
> 目标：依赖包托管与发布 → 自动化构建打包 → 产物自动部署 EdgeOne Pages
> 本文档中标注 🔧 的位置为**可按你的实际情况替换**项。

---

## 0. 一句话总结

**npm 系（JS/TS）走 GitHub Packages 原生 npm 注册表，已完全自动化；部署走 EdgeOne 官方 CLI，PR 自动出预览环境、master 自动出生产环境；Python/PHP 因 GitHub Packages 不支持其原生包格式，改用容器镜像（ghcr.io）或外部仓库——这是本方案唯一需要你决策的分支。**

---

## 1. ⚠️ 关键前提校正：GitHub Packages 并非"按语言任选包管理器"

你的原始设想是"包管理器按项目语言确定"，但 **GitHub Packages 是有硬边界的**。官方支持的注册表只有：

| 语言/生态 | 包格式 | 客户端 | 是否支持 |
|---|---|---|---|
| JavaScript / TypeScript | `package.json` | **npm** | ✅ 支持 |
| Ruby | `Gemfile` | gem | ✅ 支持 |
| Java | `pom.xml` | mvn | ✅ 支持 |
| Java | `build.gradle` | gradle | ✅ 支持 |
| .NET | `nupkg` | dotnet CLI | ✅ 支持 |
| 容器 | `Dockerfile` | docker | ✅ 支持（ghcr.io） |
| **Python** | `pyproject.toml` / wheel | pip / twine | ❌ **不支持**（无 PyPI 注册表） |
| **PHP** | `composer.json` | composer | ❌ **不支持**（无 Composer 注册表） |

**映射到本仓库 20 个模块：**

| 类别 | 模块 | 包管理器 | 结论 |
|---|---|---|---|
| JS/TS（发布包） | `shared/{config,http,map}` | npm | ✅ **已实现**，发布到 `npm.pkg.github.com`，包名 `@afdk1991/shared-*` |
| JS/TS（应用/部署） | `delivery-router`、`mixmlaal-fullstack`、`gexm-platform` 等 | npm | ✅ 走构建 + EdgeOne 部署 |
| Python | `apps/chassis-bom-tool`、`services/price-crawler` | pip/poetry | ❌ 不能作为包发布到 Packages → 🔧 见第 8 节替换方案 |
| PHP | `sites/{ardot-audit,wordpress-deploy}`、`apps/myp-live-mall` | composer | ❌ 同上 → 🔧 见第 8 节 |

> 补充事实：GitHub Packages **仅支持使用 personal access token (classic) 认证**；
> 但在 Actions 中发布**与本仓库关联**的包时，可直接用内置 `GITHUB_TOKEN`（授予 `packages: write`），无需你额外建 token。

---

## 2. 整体架构

```
开发者推送代码
    │
    ├─ shared/** 变更 ─────► publish-packages.yml
    │                         ├─ 读取 package.json 版本
    │                         ├─ npm view 探测该版本是否已存在（已存在则跳过）
    │                         ├─ npm install → npm run build
    │                         └─ npm publish  →  GitHub Packages (npm.pkg.github.com)
    │                                              └── @afdk1991/shared-{config,http,map}
    │
    ├─ sites/ai-server-resources/** 变更 ──► deploy-edgeone-site.yml
    │                         ├─ 白名单复制（避免 package.json/.env 外泄）
    │                         └─ npx edgeone pages deploy → EdgeOne Pages
    │
    ├─ apps/delivery-router/** 变更 ───────► deploy-edgeone-app.yml
    │                         ├─ npm ci --ignore-scripts → npm run build → dist/
    │                         └─ npx edgeone pages deploy → EdgeOne Pages
    │
    ├─ 任意推送 master ─────► ci.yml（零依赖结构冒烟：node run.mjs list）
    └─ 任意推送 master ─────► deploy-pages.yml（保留：同时发布到 GitHub Pages）
```

已落地文件：

| 文件 | 作用 | 状态 |
|---|---|---|
| `.npmrc` | `@afdk1991` 作用域→GitHub Packages（供安装方消费） | ✅ 已建 |
| `.github/workflows/publish-packages.yml` | npm 包幂等发布 | ✅ 已改造 |
| `.github/workflows/deploy-edgeone-site.yml` | 静态站 → EdgeOne（预览/生产） | ✅ 已建 |
| `.github/workflows/deploy-edgeone-app.yml` | delivery-router 构建 → EdgeOne | ✅ 已建 |
| `.github/workflows/deploy-pages.yml` | 静态站 → GitHub Pages（既有，已修复触发） | ✅ 保留 |
| `.github/workflows/ci.yml` | 结构冒烟 | ✅ 保留 |

---

## 3. 仓库配置（已落地）

**① 消费端注册表映射** —— 仓库根 `.npmrc`
```
@afdk1991:registry=https://npm.pkg.github.com
```
> 只路由该作用域，不影响公共 npm 包。若某个 `@afdk1991/*` 包尚未发布，安装时报 404/401 属预期。

**② 待发布包的 package.json**（`shared/*`，已具备）
```jsonc
{
  "name": "@afdk1991/shared-map",   // 必须是 scope 包名
  "version": "1.0.0",               // SemVer
  "publishConfig": { "registry": "https://npm.pkg.github.com" },
  "files": ["dist"],                // 🔧 按需调整要包含的文件
  "repository": { "url": "git+https://github.com/afdk1991/mi-xiao-mi-la-a-li-inc-monorepo.git" }
}
```
> 注意：**不要设 `"private": true`**，否则无法发布。

**③ CI 中的注册表配置**（由 Actions 注入，无需手改）
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@afdk1991'
```

---

## 4. 令牌与密钥清单

| 名称 | 类型 | 谁提供 | 用途 | 是否需要你手工创建 |
|---|---|---|---|---|
| `GITHUB_TOKEN` | 内置临时令牌 | GitHub 自动注入 | Actions 内发布本仓库关联的包 | ❌ 不需要 |
| `EDGEONE_API_TOKEN` | Repository Secret | EdgeOne 控制台生成 | Actions 部署到 EdgeOne | ✅ **需要，见下方步骤** |
| PAT (classic) 🔧 | Repository Secret | 你生成 | 仅在"从**其他私有仓库**安装包"时需要（`read:packages`） | 可选，当前不需要 |
| Docker/OCI 🔧 | `GITHUB_TOKEN` 即可 | — | 若改走 ghcr.io 容器 | 不需要 |

### 获取并配置 `EDGEONE_API_TOKEN`
1. 进入 EdgeOne Pages 控制台 → 生成 **API Token**（控制台 → API Token）
2. 打开仓库 → **Settings → Secrets and variables → Actions → New repository secret**
3. Name = `EDGEONE_API_TOKEN`，Secret = 上一步的 token 值
4. 等价命令行方式（本机需登录 `gh`）：
   ```bash
   gh secret set EDGEONE_API_TOKEN --repo afdk1991/mi-xiao-mi-la-a-li-inc-monorepo
   ```

> ⚠️ **这是唯一需要你手工配置的环节**，缺失时工作流会明确报错并中止（已内置前置校验步骤）。

---

## 5. CI/CD 工作流关键步骤说明

### 5.1 发布 npm 包（`publish-packages.yml`）
**触发**：master 且 `shared/**` 变更；或手动 dispatch（可勾选 `force` 强制重发）

```
checkout → setup-node(registry/scopes) → 读版本号(npm view 幂等探测)
        → npm install --ignore-scripts → npm run build --if-present
        → npm publish (NODE_AUTH_TOKEN=GITHUB_TOKEN) → 写入 Job Summary
```

**幂等设计是本工作流的重点**：每次推送都会跑，但先 `npm view @afdk1991/shared-*@<ver>` 探测，版本已存在则跳过，避免出现
`You cannot publish over the previously published version` 导致流水线长期红灯。

### 5.2 部署 EdgeOne（`deploy-edgeone-*.yml`）
**触发**：master 推送 / PR / 手动 dispatch

```
checkout → 解析目标环境 → 校验 EDGEONE_API_TOKEN 是否配置
        → 构建产物（静态站：白名单复制；SPA：npm ci + vite build）
        → npx edgeone pages deploy <产物目录> -n <项目名> -t $TOKEN -e <环境>
        → 解析 URL 写入 Job Summary
```

**静态站为何用"白名单复制"而不是整目录发布**（踩过的坑）：
- 站点目录内含 `package.json`、`.env`、构建脚本 —— 整目录发布会触发平台侧构建，且可能把敏感文件发布出去。
- 历史上把 `.edgeone/` 当部署源会导致线上根路径为空、首页 404。
- 因此约定**部署目录必须是普通目录且不含 package.json**。

---

## 6. 版本号管理策略

| 层面 | 做法 |
|---|---|
| 规范 | **SemVer** `MAJOR.MINOR.PATCH`（破坏性 / 新功能 / 修复） |
| 唯一真源 | 各包自己的 `package.json` 的 `version` 字段 |
| 升级方式 | `npm version patch \| minor \| major`（会同时打 git tag） |
| 发布去重 | CI 中 `npm view <pkg>@<version>` 探测，已存在则跳过 |
| 手动兜底 | `workflow_dispatch` 勾选 `force=true` 强制重发 |
| 回滚 | 提升版本号发新版；GitHub Packages 已发布的版本不建议删除/覆盖 |

```bash
# 例：shared-map 做了向后兼容的新增
cd shared/map && npm version minor && git push --follow-tags
```

> 若你希望**由 commit message 自动推导版本号**，🔧 可引入 `semantic-release`（会改变现有 tags 约定，需另行评估）。

---

## 7. 预览 / 生产环境管理

EdgeOne CLI 原生支持 `-e production | preview`（默认 `production`）。本方案映射规则：

| 事件 | 环境 | 说明 |
|---|---|---|
| `pull_request` → master | **preview** | 每个 PR 得到独立预览环境，合并前可验证 |
| `push` → master | **production** | 主干即生产 |
| `workflow_dispatch` | 手选 production/preview | 临时重部署用 |

**注意事项（重要）**：
- EdgeOne **默认域名**（`*.edgeone.cool`）的访问链接带 `?eo_token=...`，**有效期较短**（约 24 小时），过期返回 401。
- 已验证：**含 `eo_token` 的完整链接必须在真实浏览器打开**；用抓取工具验证会恒返回 401（工具不携带查询串），据此判断"部署失败"是误判。
- 🔧 **长期公开访问请绑定自定义域名**（EdgeOne 控制台 → 域名管理），绑定后不再依赖短期 token。

---

## 8. Python / PHP 的可替换方案 🔧

由于 GitHub Packages 不支持 PyPI / Composer，给出三条替代路径（**当前未落地，需你选定后再实施**）：

**方案 A：容器镜像发布到 ghcr.io（推荐，仍留在 GitHub Packages 体系内）**
```yaml
permissions: { contents: read, packages: write }
steps:
  - uses: docker/login-action@v3
    with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
  - run: docker build -t ghcr.io/${{ github.repository }}/<svc>:${{ github.sha }} .
  - run: docker push ghcr.io/${{ github.repository }}/<svc>:${{ github.sha }}
```
适用：`services/price-crawler`、`apps/chassis-bom-tool`（Python）、PHP 站点（打包进镜像）。

**方案 B：发布到外部包仓库**
- Python → TestPyPI / PyPI（推荐用 Trusted Publishing，无需密码）
- PHP → Satis / 私有 Composer 仓库 或 Packagist
这些需要各自的账号与 Secret。

**方案 C：仅构建产物部署、不发布包**
若这些模块是应用而非库，其实**不需要发布包**，直接构建 + 部署到 EdgeOne（静态）或你的 laal.top 服务器（需运行时）即可。

---

## 9. 落地清单与验证步骤

**已完成**
- [x] `.npmrc` 作用域映射
- [x] `publish-packages.yml` 幂等发布（加强版）
- [x] `deploy-edgeone-site.yml` / `deploy-edgeone-app.yml`（预览+生产）
- [x] 全部 5 个工作流 YAML 语法校验通过

**需要你完成（唯一阻塞项）**
- [ ] 在 EdgeOne 控制台生成 API Token
- [ ] 在仓库 Settings 添加 Secret `EDGEONE_API_TOKEN`

**上线后验证顺序**
1. 改 `shared/*` 中任一文件推送 → Actions 的 `Publish npm packages` 应绿（或提示 skipped）
2. 用 `npm view @afdk1991/shared-map versions` 确认版本号
3. 提一个 PR 改 `apps/delivery-router` → 应部署到 **preview** 环境
4. 合并到 master → 应部署到 **production** 环境
5. 打开 Job Summary 里的 URL（**必须含 `?eo_token=`**）

---

## 10. 待你决策的位置（🔧 汇总）

| # | 决策项 | 选项 |
|---|---|---|
| 1 | Python/PHP 模块是否要发布制品 | A 容器 ghcr.io / B 外部仓库 / C 不发布只部署 |
| 2 | 是否绑定 EdgeOne 自定义域名 | 绑定（长期稳定）/ 继续用临时默认域（约 24h 过期） |
| 3 | 是否引入 semantic-release 自动版本号 | 引入（改变 tag 约定）/ 维持手工 npm version |
| 4 | 是否保留 GitHub Pages 双轨发布 | 保留现状 / 停掉只留 EdgeOne |
| 5 | 其余 ~14 个模块是否按同样方式接入同一套 CI/CD | 逐个接入（需先确认各模块构建产物形态） |
