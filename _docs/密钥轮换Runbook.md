# 密钥轮换 Runbook（三平台公开收官后续）

> 编写：2026-10-16 18:30｜更新：2026-10-16 18:45（据用户决策"不轮换、把加密做实"改写）
> 关联：`_docs/三平台公开收官报告.md` 第四节待办 #2
> 结论先行：**公开父仓（`mi-xiao-mi-la-a-li-inc-monorepo`）经 `git filter-repo` + `git grep --all` 复核，历史与当前树均无明文密钥，已确认干净。**
> 决策更新：**`email-aggregator` KEK 不再走"轮换"路线**——改为把加密做实（密钥库加密落盘 + REK 保护），真正机密是 REK 而非数据 KEK，因此无需轮换。详见第二节。

---

## 一、风险分级（不要再一概按"紧急泄露"处理）

| 类别 | 密钥 | 是否经 GitHub 公开暴露 | 真实风险 | 处置优先级 |
|---|---|---|---|---|
| **前端 JS Key** | 高德 JS API Key `mapKey`、高德安全密钥 `mapSecurityCode` | ❌ 否（仅本地松散文件，见下） | 低——按设计本就明文下发浏览器；防线是控制台域名白名单 | 🟡 启用白名单即可，轮换为卫生项 |
| **边缘函数服务端 Key** | 高德 Web 服务 `AMAP_WEB_KEY` / 签名 `AMAP_SIG` / 猎鹰 `AMAP_FALCON_KEY` / 腾讯 `TENCENT_KEY` / 百度 `BAIDU_AK` | ❌ 否（仅存 EdgeOne Makers 环境变量，不入仓） | 中——服务端凭证，但未入仓；若曾误提交则风险高 | 🟡 确认未入仓后启用白名单 |
| **服务端加密根密钥** | `email-aggregator` 数据 KEK（`KMS_KEYRING_FILE` → 已加密的 `bin/kms-keyring.json`，其本身再由 REK 加密落盘） | ❌ 否（密钥库已 gitignore 且加密；旧硬编码已移除） | 中——凭据信封用随机数据 KEK 加密；密钥库文件再用 REK（口令/机器密钥）加密；**真正机密是 REK**，数据 KEK 泄露也不直接暴露凭据 | 🟢 不轮换（已加密保护，换 REK 即可，无需动数据） |
| **云厂商 Secret** | `TENCENTCLOUD_SECRET_ID/SECRET_KEY`（仅模板占位 `os.environ.get`，非真实值） | ❌ 否 | 低 | 🟢 无需处理（模板） |

> 说明：此前收官报告第四节写"明文密钥曾 push 到远端"，经本次复核需**修正**为——父仓历史已清洗干净；唯一残留的明文高德 Key 仅存在于本地一个**遗留（broken）子模块目录**的松散文件里，并未进入公开仓对象库。子模块自身是否曾被公开推送，**无法从沙箱确认**（无 `.gitmodules`、无本地对象、无远端配置），需你在本机核实。

---

## 二、必做项（🟢 已实现加密保护，无需轮换）

### 1. `email-aggregator` 加密落地（替代"KEK 轮换"）

> 用户决策：**不轮换，把加密做实。** 代码已落地于 `apps/email-aggregator/email-aggregator-go/src/security/{local_kms.go,vault.go}`。

**设计（信封加密 + 两层密钥）**
- 凭据本身：一次性 DEK 加密明文 → 数据 KEK 包裹 DEK → 信封（`Envelope`）入库；明文仅存于进程内存、零落盘（见 `api/server.go:548` 的 `vault.Seal`）。
- 数据 KEK：随机 32 字节、多版本、由 `LocalKms` 持有。
- **密钥库文件（`KMS_KEYRING_FILE`，如 `bin/kms-keyring.json`）不再明文存 KEK**，而是用 **REK（密钥库加密密钥）** 做 AES-GCM 加密落盘。REK 来源按优先级：
  1. `KMS_KEYRING_PASSPHRASE` —— 口令经 PBKDF2-HMAC-SHA256（20 万次迭代）派生 REK，**可跨机迁移**。
  2. `KMS_KEYRING_KEYFILE` —— 直接提供 32 字节原始 REK 文件（最灵活）。
  3. 默认：在密钥库同目录自动生成 `<file>.mkey` 机器密钥（0600，已 gitignore）。
- **"不轮换"的依据**：真正机密是 REK 而非数据 KEK。换口令/换机器密钥只需调用 `LocalKms.RekeyRing(...)` 重封密钥库，**已封存的凭据信封无需重封、无需重新录入凭据**。若数据 KEK 万一需要轮换，`LocalKms` 的多版本机制也能无缝支持（旧信封仍可用 `Decrypt` 遍历历史 KEK 拆封）。

**运维变量（在 email-aggregator 运行环境设置）**
```bash
# 推荐：持久化密钥库 + 口令派生 REK（跨机一致，重启安全）
export KMS_KEYRING_FILE=/path/to/bin/kms-keyring.json
export KMS_KEYRING_PASSPHRASE='你的强口令'

# 或更稳妥：用 32 字节密钥文件（需自行用安全方式分发）
# export KMS_KEYRING_KEYFILE=/secure/path/kms-rek.bin
```
- 不设以上变量时，默认自动生成机器密钥文件（`<file>.mkey`，0600）——**重启安全、不丢凭据**，适合单机部署。
- 切勿两者都不设且让进程回退到"随机内存 KEK"（`KMS_KEYRING` 单 KEK 或纯内存模式）——那会在重启后无法解密历史凭据（已加告警）。

**变更口令（无需轮换数据）**
```go
// 仅需重封密钥库，不动任何凭据信封
newREK := pbkdf2HMACSHA256([]byte("新口令"), newSalt, 200000, 32)
_ = kms.RekeyRing(newREK, "pbkdf2-hmac-sha256", newSalt)
```

**相关测试**（本地 `go test ./src/security/...`）
- `TestLocalKms_PassphraseKDF`：同名口令可跨进程重载、错误口令失败。
- `TestLocalKms_RekeyRing`：换 REK 后旧信封仍可解密（验证"不轮换"）。
- `TestLocalKms_FilePersistence`：密钥库落盘后重启仍可解密历史信封。

---

## 三、前端 / 边缘 Key（🟡 启用白名单为主，轮换为辅）

### 2. 高德 JS API Key + 安全密钥（`daijia-config.js`）
- 位置（**本地松散文件，未入仓**）：`apps/laal-platform/Mi-Xiao-Mi-La-A-Li-Inc/08-卫星产品/daijia/mobile/assets/js/daijia-config.js`
  - 第 46 行 `mapKey: '3ec241d94ea4cce504d95eb16a8af9d9'`
  - 第 50 行 `mapSecurityCode: '9415af3380bc3beef803cb7f43c91d5d'`
- 该目录是一个**遗留 gitlink（子模块指针，commit `48961cb…`）**，但 `.gitmodules` 已丢失、本地未 checkout、无 `.git`、引用的 commit 不在对象库 → 父仓不会跟踪其中的文件，当前**不会**随父仓推送外泄。
- **处置**：
  1. 登录 高德控制台 → 应用 `MIXMLAAL-WebJS` → 开启**域名白名单（Referer 限制 / 安全密钥绑定）**，把业务域名加入。这是该 Key 的正确防护。
  2. （可选）轮换 Key。若轮换，直接改本地 `daijia-config.js` 两行即可（注意：改的是本地文件，别把它提交进任何会被公开的仓库）。
  3. **不要**为了"清理"而把这个子模块重新初始化并推送到公开远端——那才会把 Key 带出去。如需保留该子模块，先 redact 再提交。

### 3. 边缘函数服务端 Key（delivery-router）
- 全部走 EdgeOne Makers 环境变量，**不入仓**（见 `apps/delivery-router/edge-functions/api/{map,falcon}.js`）：
  `AMAP_WEB_KEY` / `AMAP_SIG` / `AMAP_FALCON_KEY` / `TENCENT_KEY` / `BAIDU_AK`
- 处置：在 EdgeOne Makers 控制台逐个 Key 配置**调用域名/服务白名单**；如需轮换，在 Makers 环境变量中替换新值后重新部署（`workflow_dispatch` 或 push 触发）。
- 历史校验：仓库内从未以明文存储这些 Key（`grep` 全仓仅见占位/env 读取），无需历史清洗。

### 4. 百度 AK
- 消费方：`apps/delivery-router/edge-functions/api/map.js`（`BAIDU_AK`）、`apps/mixmlaal-fullstack/.../mapServiceMulti.js`（`BAIDU_MAP_AK`）。均为 `process.env` 读取，无明文。
- 处置：百度控制台启用**应用/服务器 IP 或 Referer 白名单**；轮换即改对应环境变量。

### 5. 腾讯位置服务 Key
- 消费方：`apps/delivery-router/.../TENCENT_KEY`（边缘函数环境变量）。无明文入库。
- 处置：腾讯位置服务控制台启用**域名/签名校验**；轮换即改 Makers 环境变量。

---

## 四、核验清单

- [ ] 父仓 `git grep --all` 无明文密钥（已复核 ✅）
- [ ] `daijia-config.js` 两枚 Key 确认未进入任何公开仓（当前仅本地松散文件 ✅；子模块历史暴露需本机确认 ⚠️）
- [ ] 高德 / 百度 / 腾讯控制台均已开启域名白名单
- [ ] `email-aggregator` 密钥库已加密落盘（`KMS_KEYRING_FILE` + `KMS_KEYRING_PASSPHRASE`/`KEYFILE` 已配置），**不轮换**（已加密保护 ✅）
- [ ] 本地 `go test ./src/security/...` 全绿（含 `TestLocalKms_PassphraseKDF` / `TestLocalKms_RekeyRing`）
- [ ] EdgeOne Makers 环境变量中的 Key 已确认无历史明文提交

---

## 五、附：遗留 gitlink 清理建议（可选，非安全紧急项）

`apps/laal-platform/Mi-Xiao-Mi-La-A-Li-Inc` 在父仓 index 是悬空 gitlink（`160000 commit 48961cb…`），但 `.gitmodules` 丢失、无本地 `.git`、无对象。它目前反而"挡住"了父仓跟踪其中的松散文件。

- 若**不再需要**该子模块：从父仓 index 移除 gitlink（`git rm --cached apps/laal-platform/Mi-Xiao-Mi-La-A-Li-Inc`，**不要**加 `-r` 误删本地文件），并把这些本地文件加入 `.gitignore` 或物理移出仓库树，避免日后被误 `add`。
- 若**需要**该子模块：先 redact `daijia-config.js` 中的 Key，再补回 `.gitmodules` 与远端，正常初始化。
- ⚠️ 移除 gitlink 前务必先备份本地文件，且确保 `.gitignore` 已覆盖，否则松散文件会变身"未跟踪"状态、更易被误提交。
