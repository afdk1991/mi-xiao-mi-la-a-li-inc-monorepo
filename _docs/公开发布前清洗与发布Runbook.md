# 公开发布前 · 清洗与发布 Runbook

> 目标：把 `mi-xiao-mi-la-a-li-inc-monorepo` 在 **GitHub 仓库 / GitHub Packages / EdgeOne Makers** 三处全部置为 public，且**全程不泄露任何密钥**。
> 适用：本仓库当前为 **private**，且工作区/历史中存在真实在用密钥，必须先清洗再公开。

---

## 0. 重要前提（请先读）

- **本助手在当前 headless 环境无法做两件事**：①登录 GitHub 改仓库可见性；② `git push`（无生产 SSH、无 GITHUB_TOKEN 推送权限）。
  因此"翻 public + 推送清洗后的历史"这一步**必须由你在本机带令牌执行**。本 Runbook 已把你能在远程执行前的**全部本地清洗**做完，并固化了后续命令。
- **最危险的不是工作区，是 git 历史**：高德 Key 曾提交进 `daijia-dist_old_*/assets/js/location-*.js`，即使工作区已改干净，`git push` 仍会把含密钥的**历史对象**推上去。
  **唯一彻底解法 = `git filter-repo` 重写历史**（见第 2 节），这一步不可跳过。

---

## 1. 本次已完成的本地清洗（助手已执行）

| 动作 | 文件 | 说明 |
|---|---|---|
| 替换在用密钥 | `apps/laal-platform/daijia-dist_old_20261002_141312/assets/js/location-Bpr8y9zJ.js` | 高德 Key 字面量 → `AMAP_KEY_REDACTED` |
| 移除硬编码 KEK | `apps/email-aggregator/email-aggregator-go/src/security/local_kms.go` | dev 默认 KEK 改为"未提供 key 时回退随机内存 KEK" |
| 移除硬编码 KEK | `apps/email-aggregator/email-aggregator-go/src/security/vault.go` | `NewInMemoryKms`/`WithKEK` 改为随机 32 字节，不再内置固定 KEK |
| 加固 .gitignore | `.gitignore` | 新增 `**/*-dist_old*/`、`**/daijia-dist_old*/`、`**/_smoke*.log`、`**/fetched/` |
| 索引摘除 | `apps/laal-platform/daijia-dist_old_20261002_141312/`（整目录）、`apps/laal-platform/backend_dev.log` | `git rm --cached`，磁盘保留、不再进提交 |

✅ 复核：工作区已 `git grep` 确认无 `AMAP_KEY_REDACTED`、无 `KEK_REDACTED` 残留。

⚠️ 仍待你处理：`apps/coze-miniprogram/key/private.appid.key`（当前 0 字节空文件，非泄露，但建议删除或确保永不写入真实私钥）；`**/fetched/*.html`（38MB 抓取的公开网页，非密钥，但体积大，建议一并排除）。

---

## 2. 发布前必须做：历史重写 + 全量密钥扫描（你在本机执行）

### 2.1 安装 gitleaks（密钥扫描器）
```bash
# macOS
brew install gitleaks
# 或用 go
go install github.com/gitleaks/gitleaks/v8/cmd/gitleaks@latest
```

### 2.2 全量扫描（含整个 git 历史）
```bash
cd mi-xiao-mi-la-a-li-inc-monorepo
gitleaks detect --source . --redact -r leak-report.json
# 无泄漏 → 退出码 0；有泄漏 → 报告里会列出每处明文（含历史提交）
```
> 若 `leak-report.json` 非空，**不要**继续。先用报告里的明文去第 2.3 步生成替换表。

### 2.3 生成替换表 `secrets-replace.txt`（**本地文件，加入 .gitignore，绝不提交**）
格式为 `git filter-repo` 的 replace-text：`明文==>替换值`。
把第 2.2 步报告里出现的**真实字面量**逐行填入，例如（仅示意，请填你报告里的实际串）：
```
AMAP_KEY_REDACTED==>AMAP_KEY_REDACTED
KEK_REDACTED==>DEV_KEK_REDACTED
# 其余由 gitleaks 报告补充……
```
> 注意：本文件含明文密钥，**务必 `echo secrets-replace.txt >> .gitignore` 且不提交**。

### 2.4 重写历史（一次性、不可逆，会改写所有 commit hash）
```bash
# 建议先打包备份当前仓库
git bundle create ../repo-backup-$(date +%Y%m%d).bundle --all

# 执行重写：替换密钥 + 剥离 >50MB 的大对象（历史里的 zip/dll/mp4）
git filter-repo --replace-text secrets-replace.txt --strip-blobs-bigger-than 50M
```
> 若提示 "not a fresh clone"，先 `git clone --no-hardlinks /原路径 /干净路径` 到新目录再操作。

### 2.5 复核
```bash
gitleaks detect --source . --redact      # 必须 0 泄漏
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '$2>50000000' | head    # 应无 >50MB 对象
git gc --aggressive --prune=now
```

---

## 3. 推送（二选一）

### 方案 A · 新建公开镜像仓（推荐，零历史污染风险）
```bash
gh repo create afdk1991/mi-xiao-mi-la-a-li-inc-public --public --description "公开镜像（密钥已清洗）"
git remote add public git@github.com:afdk1991/mi-xiao-mi-la-a-li-inc-public.git
git push public --all --force
git push public --tags --force
```

### 方案 B · 原地翻 public（破坏性，需先通知所有协作者）
```bash
git push origin --all --force
git push origin --tags --force
gh repo edit afdk1991/mi-xiao-mi-la-a-li-inc-monorepo --visibility public
```
> 历史 hash 已变，协作者必须 `git pull --rebase` 或重新 clone，否则会冲突。

---

## 4. 三平台翻 public 的具体操作

### 4.1 GitHub 仓库
```bash
gh repo edit <repo> --visibility public
# 或在 GitHub 网页 → Settings → Change visibility
```

### 4.2 GitHub Packages（npm 包）
- `shared-map` / `shared-http` / `shared-config` 三个包**已验证无密钥**（仅 TS 源码与构建产物），可安全公开。
- 每个包版本单独设可见性：
```bash
for p in shared-map shared-http shared-config; do
  gh api -X PATCH "users/afdk1991/packages/npm/@afdk1991%2F$p/visibility" -f visibility=public
done
# 或网页：Package → Package settings → Change visibility
```
- 若走方案 A 镜像仓，包归属新仓，发布时 `publishConfig.registry` 指向新仓即可。

### 4.3 EdgeOne Makers
- **已部署站点**（如 `ai-server-resources`）：通常已通过 `*.edgeone.cool` / 自定义域名公网可达；公开化只需在 EdgeOne 控制台为项目**绑定已备案自定义域名**（如 `laal.top` / `mixm.top` 子域），关闭临时 `eo_token` 访问限制。
- **Makers 项目"公开"开关**：在 EdgeOne 控制台 → 项目设置 → 可见性，将项目设为公开（影响的是控制台/团队可见性，不影响已部署站点的公网可达性）。
- 构建若需拉取私有 Packages，保留 `NODE_AUTH_TOKEN=$GITHUB_TOKEN` 注入（见 `.github/workflows/deploy-edgeone-*.yml`）；仓库与包公开后该注入可省略。

---

## 5. 发布前检查清单 ✅

- [ ] `gitleaks detect` 全量（含历史）**0 泄漏**
- [ ] `git filter-repo` 已执行，历史中无明文密钥
- [ ] 无 `*.pem` / `*.key` / 真实 `.env`（非 `.example`）被跟踪
- [ ] `daijia-dist_old_*`、`*_smoke*.log`、`fetched/` 已从索引移除
- [ ] 大对象（>50MB）已从历史剥离
- [ ] 已 `git bundle` 备份原仓库
- [ ] GitHub 仓库可见性 = public
- [ ] 三个 `@afdk1991/shared-*` 包可见性 = public
- [ ] EdgeOne 站点已绑定自定义域名并公网可达

---

## 6. 我（助手）在本环境做不到、需你执行的部分

1. `gh auth login` / 提供 `GITHUB_TOKEN` → 改仓库可见性。
2. `git push --force` → 推送清洗后的历史（headless 无 SSH/令牌）。
3. EdgeOne 控制台的"项目公开"开关与自定义域名绑定（需你的账号）。

完成第 2、3、4 节后，三平台即全部 public 且零密钥泄露。
