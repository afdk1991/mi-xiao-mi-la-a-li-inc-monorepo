# 配送定位与路径优化系统

批量客户地址管理 + 智能路线排序 + 地图可视化 + 自建实时导航。
一套代码同时提供 **Web 应用**、**Windows 桌面安装包**、**Android APK**。

---

## 功能特性

| 模块 | 能力 |
|---|---|
| 地址管理 | CSV / JSON / 粘贴批量导入，自动地理编码，IndexedDB 本地持久化，送达标记 |
| 路线优化 | TSP 最近邻 + 2-opt + Or-opt（开放路径优化），支持驾车/步行/骑行、货车模式、道路网距离矩阵 |
| 地图 | Leaflet 渲染，四家底图可切换（高德 / 腾讯 / 百度 / OSM），POI 商户搜索并直接入单 |
| 实时导航 | **自建导航引擎**（GPS 追踪 → 路线投影匹配 → 偏航检测 → 转向引导 → 语音播报），三源聚合算路，**不跳转第三方 App** |
| 实时位置 | 独立高频定位图层（蓝点 + 精度圈 + 朝向），跟随/定位到我，输入即搜的附近商户实时搜索 |
| 交付 | 导出 Excel（CSV，带 BOM）、打印配送单、轨迹记录与纠偏 |

---

## 技术栈

- **前端**：React 18 + TypeScript + Vite 5 + Zustand + Leaflet + IndexedDB(idb) + papaparse
- **桌面**：Electron 33（主进程内置本地静态服务器，保证 `http://` 源下 CORS 与 Service Worker 正常）
- **移动端**：Capacitor 6 + Android Gradle 构建
- **部署**：EdgeOne Makers（`delivery-router`）
- **PWA**：manifest + Service Worker，支持"添加到主屏幕"

---

## 快速开始

```bash
npm install
npm run dev        # 本地开发
npm run build      # 类型检查 + 生产构建（输出到 dist/）
npm run preview    # 预览构建产物
```

---

## 地图服务与 Key 配置

应用**不填 Key 也能用**，但国内精度有限；填入对应 Key 可获得精准结果。

| 模式 | 说明 |
|---|---|
| **免 Key（默认）** | 底图 OSM、地理编码与 POI 走 Photon、算路走 OSRM。坐标为 WGS-84，底图与标记天然对齐无偏移 |
| **直连填 Key** | 设置面板 → 模式切「直连」。高德填 **Web端 JS Key + 安全密钥**；腾讯填 **WebService Key**；百度填 **AK** |
| **服务端代理** | 设置面板 → 模式切「代理」。请求经 `/api/map` 边缘函数，Key 由服务端环境变量注入（`AMAP_WEB_KEY` / `AMAP_SIG` / `TENCENT_KEY` / `BAIDU_AK`），**前端零凭证** |

> 坐标系：高德/腾讯为 GCJ-02，百度为 BD-09，OSM 为 WGS-84。切换服务会自动清空旧路线（坐标系变化，旧几何失效）。

---

## 打包原生安装包

### Windows（Electron + NSIS）

```bash
npm run dist:win     # 产出 release/配送定位与路径优化-Setup-1.0.0.exe
npm run icon         # 重新生成图标（纯 Node 实现，零依赖）
```

产物：`release/配送定位与路径优化-Setup-1.0.0.exe`（约 80MB）。
另有免安装绿色版：`release/win-unpacked/配送定位与路径优化.exe`。

### Android（Capacitor）

```bash
npm run dist:android   # 构建 Web → cap copy → gradle assembleRelease
```

- **正式签名包**：`release/配送定位与路径优化-Android-1.1.0-release.apk`（签名密钥 `android/app/delivery-router.keystore`，口令配置在 `android/keystore.properties`，两者均不入库，请自行妥善备份）。
- 图标由 `npm run icon:android` 生成（品牌化：靛蓝 #4F6BED + 白色定位图钉，含自适应图标前景与启动背景）。
- 调试包：`npx cap sync && cd android && gradle assembleDebug --no-daemon`。

---

## 部署

```bash
npm run build
npx edgeone makers deploy dist -n delivery-router -e production
```

> 当前为匿名 preview 形态：访问链接带 `eo_token`/`eo_time`（有效期 3 小时），采用 **302 种 Cookie** 鉴权——浏览器首次访问后由 Cookie 维持会话，curl 验证需带 `-c/-b` cookie jar。

---

## 业务链路自检

```bash
node scripts/verify-business.mjs
```

验证免 Key 场景下的四段链路：地理编码、逆地理编码、POI 搜索、路径规划，并输出耗时。用于回归排查"地图功能突然不可用"。

---

## 数据备份与恢复

数据只存本机（IndexedDB），清缓存或卸载会丢失。左栏「备份」标签页提供：

- **导出备份**：全量 JSON（客户 + 轨迹 + 起点 + 地图/路线配置），文件名带日期；
  **备份文件不含任何地图 Key**，可安全归档或转移。
- **导入备份**：支持「合并」（按 id 去重增量）与「覆盖」（清空后导入）两种模式。
- **本地快照**：数据变化后自动留档（最多 5 份），误删/误改可一键回滚，也可手动建快照。
- **云同步**（可选）：同一「同步码」跨设备搬运数据，走边缘函数 `/api/sync` + EdgeOne KV；
  上传内容不含任何地图 Key；未开通 KV 时面板提示「云同步未开通」，其余功能不受影响。

开通云同步（控制台一次性操作）：EdgeOne 控制台 → **KV 存储** → 申请开通 → 创建命名空间 →
绑定到本项目，**变量名必须填 `sync_kv`**（与 `edge-functions/api/sync.js` 中的 KV_NAME 一致）。

> ⚠️ **边缘函数部署现状（已实测）**：
> - `npx edgeone makers dev -n delivery-router` 下 `/api/sync`、`/api/map` **均正常返回**（未开通 KV 时返回 501 引导、无 Key 时返回 40002 提示）；
> - 生产部署若只上传 `dist`（静态目录），边缘函数**不会**被挂载，`/api/*` 会回落首页，此时界面显示「云端接口未部署」；
> - 上传「dist + edge-functions」混合目录会部署失败/整站 404，zip 包亦失败；只有从**项目根目录**部署才会挂载 `/api/*` 路由（但静态资源会变成源码根目录）。
> - 结论：云同步与服务端代理的代码已就绪并通过本地验证，**生产启用需平台侧支持或改由控制台/Git 仓库部署**；在此之前站点继续以 `dist` 静态部署。

---

## 目录结构

```
src/
  mapservice.ts    地图服务抽象（服务/坐标系/凭证判定）
  geocode.ts       正/逆地理编码（含 Photon 兜底）
  routing.ts       路径规划、距离矩阵、货车路线
  optimize.ts      TSP 路线优化（2-opt / Or-opt）
  navigation.ts    自建导航引擎（投影匹配、偏航检测、引导）
  navroute.ts      三家导航聚合算路
  poisearch.ts     POI 商户搜索
  backup.ts        数据备份/导入/本地快照
  privacy.ts       定位用途告知与同意状态
  components/      UI 组件
electron/          Electron 主进程与预加载
edge-functions/    服务端代理函数（/api/map）
android/           Capacitor Android 工程
docs/              隐私政策、上架合规说明
scripts/           图标生成、业务自检
```

---

## 隐私与合规

- 位置信息属敏感个人信息，**默认关闭**，首次开启前弹窗告知用途并征得同意；
- 客户数据只存设备本地（IndexedDB），**不上传服务器**；
- 仅向地图服务商发送地址文本与坐标，**不发送姓名电话**；
- 详见 [`docs/隐私政策.md`](docs/隐私政策.md)、[`docs/上架合规说明.md`](docs/上架合规说明.md)。

---

## 已知限制

1. **Windows 未做代码签名**：安装时 SmartScreen 提示"未知发布者"（正常，选"仍要运行"）；正式分发需购买代码签名证书。
2. **iOS 平台未创建**：如需上架 App Store，执行 `npx cap add ios` 并补充定位用途文案。
3. **免 Key 精度**：Photon 基于 OSM 数据，坐标误差约数百米级，国内商户覆盖弱于商业地图。
4. **数据在本地**：全部业务数据存于浏览器/应用本地库，换设备不同步，清缓存或卸载即丢失。请定期用左栏「备份」导出 JSON，或「导出 Excel」留存路线单。
5. **preview 访问限制**：匿名部署链接的 token 3 小时过期，需重新部署刷新；绑定自定义域名可免鉴权长期访问（届时 PWA「安装应用」按钮也可用）。
