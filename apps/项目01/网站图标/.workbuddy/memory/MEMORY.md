# MEMORY.md — 网站图标项目长期记忆

## 站点身份（两个站点的固定信息）
- **拉啊里 / laal.top**
  - 品牌色：蓝渐变 `#4F8DF9 → #2F6BEB`，图标 = 白色描边地球（经纬线稿）
  - 工信部备案号：苏ICP备2025161175号-1（链接 https://beian.miit.gov.cn）
  - 公安备案号：苏公网安备32072202010512号（recordcode = 32072202010512，链接 beian.gov.cn）
  - 备案时间：2025-03-02 13:43:58
- **米小米 / mixm.top**
  - 品牌色：琥珀渐变 `#FBBF24 → #F59E0B`，图标 = 白色描边幼苗（茎叶线稿）
  - 工信部备案号：苏ICP备2025161175号-2
  - 公安备案号：苏公网安备32072202010511号（recordcode = 32072202010511）
  - 备案时间：2025-02-28 20:11:43

## 部署约定
- 真实上线：Docker Compose + Nginx `proxy_pass` **保留 `/api/` 前缀**反代到 node-api:8000；静态资源直接由 Nginx 服务，路径 `/var/www/<domain>/public`。
- 证书：Let's Encrypt 自动签发，路径 `/etc/letsencrypt/live/<domain>/`。
- favicon 部署命名：根目录固定 `favicon.ico` / `favicon-32.png` / `favicon-192.png` / `favicon-512.png` / `apple-touch-icon.png`(=180)；manifest 引用 PWA 标准尺寸 192/512。

## 项目资产地图
- 项目根：`D:\网站全栈项目\网站图标`
- Ardot 设计文件：`网站图标-备案展示`（fileId 719755932196150，4 页：图标&插画场景 / Favicon 导出 / 海报版 / 组件库）
- favicon PNG 原图与 ICO：`favicons/`
- React 组件源：`components/SiteFooter.tsx`，已复制到 `sites/<domain>/src/components/`
- 完整 public/ 部署包：`sites/<domain>/public/`（index.html + manifest + robots + favicon 系列）
- Nginx 配置：`deploy/nginx/<domain>.conf`
- 部署片段（早期版本）：`deploy/<domain>.head.html` + `deploy/<domain>.webmanifest`

## Ardot SVG 图标铁律（本环境）
1. 属性**必须双引号**，单引号导致 degenerate。
2. **任何形状都不能 fill**，只用 `stroke`（白描边）画在渐变底上；根 `fill="none"`。
3. **元素极简**：成功结构 = 1 `<circle>` + 1 `<path>`（path 内多段 `M…L…` 子路径画完所有线条），再多就失败。
4. SVG 帧**不设 `layout:"none"`**（只给 width/height）。
5. SVG 帧作为 `layout:"none"` 父级子节点时**必须显式 `x:0, y:0`**，否则被父级 clipsContent 裁掉。
6. 颜色规则：纯色 `color` 是 `{r,g,b}`（无 `a`），透明度走 `opacity`；渐变 `gradientStops[*].color` 用 `{r,g,b,a}`。
7. 多语句 batch_edit **别对含 `{` `}` 的 JSON 用 `str.format()`**（外层 `{` 顶掉），改用字符串拼接或 `.replace()`。

## Ardot 组件（reusable）子节点操作铁律
- 往 `reusable:true` 节点里**插入/更新子节点时，多语句 batch_edit 会触发解析串扰**（第一条报"Failed to parse"并把后续行串进错误信息）。
- **每条单独发一次 batch_edit** 才能稳过。返回的子节点 ID 立即用，不要在后续批量里复引用过期 binding。
- 跨实例覆盖用 `U("<instanceId>;<descendantId>", {...})`，同样**单条一次**。

## 中文字体
- `Sarasa Gothic SC`（Bold / Semi Bold / Regular 样式可用），是中文文本的默认字体。
