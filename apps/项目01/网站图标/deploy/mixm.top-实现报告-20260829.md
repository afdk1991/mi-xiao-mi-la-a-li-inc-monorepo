# mixm.top · 米小米 —— 全栈实现报告

- 日期：2026-08-29
- 状态：**已完整实现并上线（本地 8890）**
- 项目归属：`D:\网站全栈项目\网站图标`（用户确认，不归位项目003）
- 品牌：米小米 · mixm.top｜琥珀渐变 #FBBF24→#F59E0B｜白色描边幼苗图标
- 备案：苏ICP备2025161175号-2（beian.miit.gov.cn）｜苏公网安备32072202010511号（beian.gov.cn）

---

## 一、实现范围

在既有部署资产（favicon 全套 / manifest / 备案页脚 / nginx conf）基础上，完成：

| 层 | 内容 | 位置 |
|---|---|---|
| 前端应用 | 品牌落地页（Hero + 概览 + 能力矩阵 + 功能模块 + 特性 + CTA + 备案页脚） | `sites\mixm.top\public\` |
| 后端接入 | 实时拉取平台 API（34 行业模块 + 8 功能模块带状态） | `public\assets\app.js` |
| 部署 | 独立 nginx 容器（8890→80），静态 + `/api/` 反代 | `deploy\docker-compose.yml`、`deploy\nginx\mixm.local.conf` |
| 生产配置修正 | `node-api:8000` → `node-api:3001`（实测容器内部端口） | `deploy\nginx\mixm.top.conf` |

## 二、访问方式

- **立即访问**：`http://localhost:8890`
- **域名访问**（需管理员执行一次，见下）：
  ```
  # 以管理员身份运行 PowerShell：
  Add-Content C:\Windows\System32\drivers\etc\hosts "`n127.0.0.1 mixm.top www.mixm.top"
  ```
  之后可访问 `http://mixm.top:8890`。

## 三、后端数据源（实测契约）

| 端点 | 返回 | 页面用途 |
|---|---|---|
| `/api/platform`（新增反代→node-api 根路由） | `{code, data:{version:"8.0.0", modules:[34]}}` | 能力矩阵·行业覆盖 |
| `/api/modules` | `{code, data:[{id,name,path,status} x8]}` | 核心功能模块（含已上线/开发中状态） |

> 实现坑：nginx 站点根 `/` 命中 SPA 静态页而非后端，故 34 行业清单走新增的 `location = /api/platform` 专用反代，避免与静态页冲突。

## 四、部署与运维

```powershell
# 启动
wsl -d Ubuntu -u root -- sh -c "cd /mnt/d/网站全栈项目/网站图标/deploy && docker compose up -d"
# 停止
wsl -d Ubuntu -u root -- sh -c "cd /mnt/d/网站全栈项目/网站图标/deploy && docker compose down"
# 重载配置（改 nginx conf 后）
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**
```

容器：`mixm-nginx`（nginx:1.27-alpine，restart=unless-stopped，compose 项目名 `mixm-top`，挂载 public 只读）。

## 五、验证矩阵（全部通过）

| 检查项 | 结果 |
|---|---|
| 首页 / 静态资源（CSS/JS/favicon/manifest/robots） | 200 |
| `/api/platform` 34 行业模块 | 200 ✓ |
| `/api/modules` 8 功能模块 | 200 ✓ |
| SPA 前端路由回退（/open） | 200 ✓ |
| 浏览器实渲染（34+8 模块、状态徽章、备案号、无控制台错误） | ✓ |
| favicon / PWA manifest / 主题色 | ✓ |

## 六、遗留事项

1. **hosts 域名解析**：追加 hosts 需管理员权限（已提供命令）。域名解析前用 `localhost:8890`。
2. **公网 HTTPS**：生产证书（Let's Encrypt）签发后，把 `mixm.local.conf` 替换为 `mixm.top.conf` 并挂载证书即可。
3. **姊妹站 laal.top**：同资产族，需要时按本方案同等部署。
4. **环境抖动**：本机 WSL 用户态约 8~10 分钟周期性回收重启，全部容器自动重启（数据卷保留）；`restart=unless-stopped` 已覆盖，无需干预。
5. **文件系统注意**：WSL DrvFs 与 Windows 侧对 /mnt/d 的删除/复制操作在极端情况下可能出现元数据不一致，操作后须双侧核对。
