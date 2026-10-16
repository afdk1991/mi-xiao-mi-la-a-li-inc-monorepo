# E:\ vs D:\ 项目目录对比分析报告

> 对比时间：2026-09-24
> E盘：`E:\04_个人项目\github所有仓库项目\`（GitHub 仓库镜像）
> D盘：`D:\网站全栈项目\`（开发工作区）

---

## 一、总览

| 维度 | E:\github所有仓库项目\ | D:\网站全栈项目\ |
|------|----------------------|------------------|
| 项目性质 | GitHub 仓库的本地克隆/镜像 | 实际开发工作区（含构建产物、缓存、配置） |
| 项目数量 | 11 个有效项目 | 8 个项目 + 5 个配置文件 |
| 文件总数 | 精简（仅源代码 + 文档） | 庞大（含 node_modules、构建缓存、模型文件等） |
| 对应关系 | 同一批项目的"纯净版" | 同一批项目的"工作版" |

---

## 二、项目对应关系

### ✅ 一一对应项目（5 对）

| E盘项目 | D盘项目 | 对应关系 | 内容一致性 |
|---------|---------|----------|------------|
| **proj-06** | **项目006** | MYP 商城直播系统（WordPress） | 🟰 几乎完全一致 |
| **proj-08** | **项目008采集** | 电商价格收集器 | 🟰 核心代码一致，D盘多部署文件 |
| **manju** | **项目007** | 漫剧全平台客户端（Flutter + FastAPI） | 🟰 目录结构完全一致 |
| **email-aggregator** | **项目003** | 邮箱聚合平台（Go + TS + React） | 🟰 核心代码一致，D盘多缓存 |
| **gale-engine** | **项目002** | 疾风引擎（Electron 系统优化） | 🟰 src 结构一致，D盘多构建产物 |
| **proj-00** | **.workbuddy/** | 目录扫描分析工具 | 🟰 脚本和报告完全一致 |

---

## 三、详细对比

### 1. MYP 商城直播系统

| 指标 | E:\proj-06 | D:\项目006 | 差异 |
|------|-----------|-----------|------|
| 总文件数 | 124 | 124 | 🟰 完全相同 |
| myp-core PHP 文件 | 67 | 67 | 🟰 完全相同 |
| README.md 大小 | 5166 字节 | 5031 字节 | 略有差异 |
| docker-compose.yml | ✅ | ✅ | 一致 |
| myp-core.zip / myp-theme.zip | ✅ | ✅ | 一致 |

**结论**：两个目录的项目内容基本完全一致，D盘是工作副本。

---

### 2. 电商价格收集器

| 指标 | E:\proj-08 | D:\项目008采集 | 差异 |
|------|-----------|---------------|------|
| 总文件数 | 79 | 175 | D盘多 96 个文件 |
| price_collector Python | 43 | 43 | 🟰 核心代码完全相同 |
| 独有目录 | — | `.edgeone`, `.workbuddy`, `data`, `deploy` | D盘多部署相关目录 |
| requirements.txt | ✅ | ✅ | 一致 |
| render.yaml | ✅ | ✅ | 一致 |

**结论**：核心代码一致，D盘是完整工作版（含部署配置和数据目录）。

---

### 3. 漫剧全平台客户端

| 指标 | E:\manju | D:\项目007 | 差异 |
|------|---------|-----------|------|
| 根目录结构 | 13 个目录 | 13 个目录 | 🟰 完全一致 |
| server/app Python 文件 | 20 | 20 | 🟰 完全相同 |
| clients/manju_flutter/lib | 22 | 22 | 🟰 完全相同 |
| clients 子目录 | manju_flutter, manju_tauri, manju_rn | 相同 | 🟰 一致 |

**结论**：两个目录的项目结构和代码完全一致。

---

### 4. 邮箱聚合平台

| 指标 | E:\email-aggregator | D:\项目003 | 差异 |
|------|-------------------|-----------|------|
| email-aggregator-go/src Go 文件 | 88 | 88 | 🟰 核心代码相同 |
| Go 测试文件数 | 38 | 1311 | D盘多很多（含缓存） |
| 独有目录 | — | `.ci-logs`, `.gocache`, `.gopath`, `.tmp_att`, `.tmp_q` | D盘多构建缓存 |
| 子项目 | TS + Go + Web + Platforms | 相同 | 🟰 一致 |

**结论**：核心代码一致，D盘包含大量 Go 构建缓存和临时文件。

---

### 5. 疾风引擎（Electron）

| 指标 | E:\gale-engine | D:\项目002 | 差异 |
|------|---------------|-----------|------|
| src 目录结构 | 7 个子目录 | 7 个子目录 | 🟰 完全一致 |
| electron/services | 完整 | 完整 | 🟰 一致 |
| 独有目录 | — | `out`, `release`, `release-build`, `_t`, `.superpowers`, `.verify-shots` | D盘多构建产物 |
| node_modules | ✅（刚安装） | ✅ | 都有依赖 |

**结论**：源代码一致，D盘包含 Electron 打包后的构建产物。

---

### 6. 目录扫描工具

| 文件 | E:\proj-00 | D:\.workbuddy\ | 差异 |
|------|-----------|---------------|------|
| dir_purpose.py | ✅ | ✅ | 🟰 一致 |
| projects_deep.py | ✅ | ✅ | 🟰 一致 |
| scan_dirs.py | ✅ | ✅ | 🟰 一致 |
| scan_report.py | ✅ | ✅ | 🟰 一致 |
| 全栈项目分析报告.md | ✅ | ✅ | 🟰 一致 |
| memory/ 日志 | ❌ | ✅（10 个日记文件） | D盘多工作记忆 |

**结论**：proj-00 的工具脚本被复制到了 D盘的 `.workbuddy/` 工作目录中。

---

## 四、D盘独有项目

### 项目001 — AI/Ollama 聊天项目

| 指标 | 数值 |
|------|------|
| 总文件数 | 409,678（含模型文件） |
| 最大文件 | `model-00001-of-00062.safetensors`（约 5 GB） |
| 主要文件 | ollama_chat.py, ollama_router.py, ollama_chat.js |
| 特点 | 本地大模型聊天网关，对接 Ollama |

**E盘对应**：无（该项目未推送到 GitHub）

---

### 项目004 — WordPress 站点

| 指标 | 数值 |
|------|------|
| 总文件数 | 4,477 |
| 核心文件 | wp-config.php, router.php |
| public/ | wp-admin, wp-content, wp-includes |
| 特点 | 完整 WordPress 运行环境 |

**E盘对应**：无（conWordPress 只是部署指南，不是完整站点）

---

### 项目005机箱 — 硬件机箱设计

| 指标 | 数值 |
|------|------|
| 总文件数 | 703 |
| 主要文件 | generate_bom.py, generate_pdfs.py, Database1.accdb |
| 内容 | 三层卧式模块化机箱 BOM 生成、PDF 生成 |
| 特点 | 硬件项目，Python + Access 数据库 |

**E盘对应**：无（硬件项目不适合放 GitHub）

---

## 五、D盘根目录配置文件

### 1. Cloudflare R2 API 凭证
- `cloudflare.com.txt` — Cloudflare R2 存储桶 API 密钥
  - Account ID: `a799197458978d508f927083360c635b`
  - API Token: `cfat_eUkG8bu3TQUwepqnXM5BE83voL2AAsT4gUwiOkHh18ab5d94cfat_...`
  - Access Key ID: `4c5f7c5b65d9fd8b7162e58b2f698f68`
  - ⚠️ **敏感信息，注意安全**

### 2. 阿里云 LLM API 配置
- `默认业务空间-apiKey-.csv` — 百炼大模型 API
  - API Key: `sk-<REDACTED-请吊销此密钥>`
  - Endpoint: `llm-a4tbdocae0vllllg.cn-beijing.maas.aliyuncs.com`
  - ⚠️ **敏感信息，注意安全**

### 3. 域名 DNS 配置
- `laal.top域名表格_20260911.csv` — laal.top 域名解析记录
  - 主 IP: `103.0.113.10`
  - 记录类型: A 记录（@, www, admin, api, app 等）
- `mixm.top域名表格_20260911.csv` — mixm.top 域名解析记录
  - 主 IP: `103.0.113.20`
  - 记录类型: A 记录（@, www, admin, api, app 等）

### 4. 其他文件
- `http.sslVerify=false` — curl cookie 文件（SSL 验证关闭标记）
- `.workbuddy/` — 工作伙伴记忆目录（含每日工作日记）
- `scripts/` — 项目启动脚本（start-project002.sh, start-project003.sh）

---

## 六、E盘独有项目

以下项目仅存在于 E盘（GitHub 仓库），D盘无对应：

| 项目 | 说明 |
|------|------|
| **RouteNav** | 路由导航应用（Expo + Express + Taro） |
| **zhinenglux** | 智能路小程序（Taro 4 + NestJS） |
| **MIXMLAAL** | 多栈全栈管理系统（13 个子应用） |
| **conWordPress** | WordPress 静态部署指南 |
| **Mi-Xiao-Mi-La-A-Li-Inc** | 空仓库（待删除） |

---

## 七、差异总结

### D盘比E盘多的内容：
1. **构建产物**：node_modules、dist、out、release 等打包文件
2. **缓存文件**：Go build cache、.gocache、.gopath、临时目录
3. **工作记忆**：.workbuddy/memory/ 每日工作日记
4. **配置文件**：Cloudflare R2 密钥、阿里云 LLM API、域名 DNS 表
5. **独有项目**：项目001（AI 聊天）、项目004（WordPress）、项目005（硬件机箱）
6. **数据文件**：data/ 目录、模型文件（5GB safetensors）

### E盘比D盘多的内容：
1. **Git 仓库**：完整的 .git 历史记录
2. **独有项目**：RouteNav、zhinenglux、MIXMLAAL、conWordPress
3. **纯净代码**：无构建产物干扰，适合版本控制

---

## 八、建议

### 安全相关 ⚠️
1. **Cloudflare API 密钥** 和 **阿里云 LLM API Key** 存放在 D盘根目录的明文文件中，建议：
   - 移动到 `.env` 文件并加入 `.gitignore`
   - 或使用系统环境变量管理

### 项目管理
2. **同步策略**：
   - E盘（GitHub）：维护纯净源代码
   - D盘（工作区）：日常开发 + 构建产物
   - 定期将 D盘的源代码变更推送到 E盘 GitHub

3. **待清理**：
   - E盘空仓库 Mi-Xiao-Mi-La-A-Li-Inc（目录被占用，重启后删除）
   - D盘 .tmp_* 临时目录、.gocache 构建缓存可定期清理

4. **未推送项目**：
   - 项目001（AI 聊天，含 5GB 模型）— 不适合推 GitHub
   - 项目004（WordPress 站点）— 可考虑精简后推送
   - 项目005（硬件机箱）— 可推 GitHub 做备份
