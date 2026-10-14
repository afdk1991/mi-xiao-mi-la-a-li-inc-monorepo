# 优选 APP 全项目缺陷审计报告

- 审计日期：2026-10-08（第一轮 31 项 + 第二轮全量复核 20 项）
- 代码基线：uni-app Vue3 + TS + Vite5，24 个页面 / 6 个 store / Android WebView 壳
- 验证方式：`npx vue-tsc --noEmit`（0 错误）+ `npx uni build`（构建成功）+ dev server 启动冒烟（HTTP 200）
- 第一轮提交：`3e10e7c`（31 项 / 29 文件）
- 第二轮提交：见第八章（20 项 / 28 文件）

## 严重度说明

| 标记 | 含义 |
| --- | --- |
| 🔴 | 功能错误：点了没反应、结果不对、数据错乱 |
| 🟡 | 健壮性：异常场景无兜底，崩溃/白屏/假成功 |
| 🟢 | 体验与一致性：样式、文案、配置对齐 |

## 一、商城与交易

| # | 位置 | 问题 | 严重度 | 修复 |
| --- | --- | --- | --- | --- |
| 1 | `pages/product/detail.vue` | 商品 id 匹配失败时回退 `res.data[0]`，打开 A 商品会显示 B 商品 | 🔴 | 精确匹配失败即显示「商品不存在」 |
| 2 | `pages/order/list.vue` `pages/mine/mine.vue` | 「我的」页 5 个订单状态入口全部跳「全部」，分组失效；退款入口指向"全部" | 🔴 | 列表支持 `?status=` 直达，新增「退款」分组，各入口传对应状态 |
| 3 | `pages/address/list.vue` | `<script setup>` 下 `prev.$vm.address = a` 不生效，选地址后下单页无变化 | 🔴 | 改由 `userStore.setPendingAddress()` 中转 |
| 4 | `pages/order/list.vue` `pages/order/detail.vue` | 删除/取消订单直接改 `state.orders` 不持久化，重启后订单复活 | 🔴 | 走 `userStore.removeOrder()`，含持久化 |
| 5 | `pages/order/detail.vue` | 下单后 redirect 进详情（无上一页），`navigateBack` 失败卡死 | 🟡 | 检测页面栈，无上一页时 `redirectTo` 订单列表 |
| 6 | `pages/address/edit.vue` | `id = String(Date.now())` 同毫秒撞号；字段未 trim；无上一页回退失败 | 🟡 | id 加序列+随机，字段 trim，回退兜底 |
| 7 | `pages/order/confirm.vue` `pages/coupon/coupon.vue` | 优惠券无过期校验，过期券仍可领取并抵扣；未达门槛时仍显示「-¥10」 | 🟡 | 统一 `isExpired()` 判定，未达门槛文案改为「未满 X 元，暂不可用」 |
| 8 | `pages/index/index.vue` | 金刚区 8 个分类纯展示不可点 | 🟡 | 点击带关键词跳搜索页（数据无分类字段，走搜索最贴近预期） |
| 9 | `pages/search/search.vue` | `history` 是非响应式数组，历史记录存进去了但界面不刷新 | 🔴 | 改为 `ref<string[]>`；支持 `?keyword` 直达；大小写不敏感 + tag 匹配；失败可重试 |
| 10 | `pages/favorite/favorite.vue` | 加载失败静默空白 | 🟡 | 增加 catch 与提示 |

## 二、发现社区

| # | 位置 | 问题 | 严重度 | 修复 |
| --- | --- | --- | --- | --- |
| 11 | `pages/discover/discover.vue` | Tab「推荐/关注/附近」切换无任何效果（数据无对应字段） | 🔴 | 改为 推荐 / 热门（点赞降序）/ 最新（相对时间折算后升序），均真实生效 |
| 12 | 同上 | 空评论可直接提交 | 🟡 | 拦截并提示 |
| 13 | 同上 | 分享提示「链接已复制」但实际没复制 | 🔴 | 调用 `uni.setClipboardData` 真实写入剪贴板 |
| 14 | 同上 | 加载失败无提示无重试 | 🟡 | 错误态 + 重新加载按钮 |

## 三、工具箱

| # | 位置 | 问题 | 严重度 | 修复 |
| --- | --- | --- | --- | --- |
| 15 | `mock/data.ts` × `pages/tools/tools.vue` | mock 里工具 key 是 `qr`，页面只认 `qrcode`，**「生成二维码」点了弹「即将上线」** | 🔴 | switch 增加 `case 'qr'` 分支 |
| 16 | `pages/tools/level.vue` | 气泡 `transform: translate(Xrpx)`，uni-app 不转换动态内联样式的 rpx，**气泡永远不动** | 🔴 | 手动 `rpx → px` 换算（`windowWidth/750`）；增加倾角读数 |
| 17 | 同上 | 传感器不可用（H5 非 HTTPS）时无任何提示，页面静止 | 🟡 | `startAccelerometer.fail` 置位并提示 |
| 18 | `pages/tools/qrcode.vue` | 依赖外部 API，失败时永久空白 | 🟡 | 加载态 + 10s 超时 + `@error` 失败提示与重试 |
| 19 | `pages/tools/calc.vue` | 用 `new Function` 求值，App WebView CSP 下会被拦截 | 🔴 | 改为手写递归下降解析器（支持四则/括号/百分号/连续输入） |
| 20 | `pages/service/service.vue` | 新消息发出来在可视区外，看不到 | 🟡 | 改 `scroll-view` + `scroll-into-view` 自动滚到底 |

## 四、设置与其他

| # | 位置 | 问题 | 严重度 | 修复 |
| --- | --- | --- | --- | --- |
| 21 | `pages/setting/setting.vue` | 「清除缓存」只弹 toast 并把数字改成 0KB，**什么都没清**；App 端缓存大小永远显示 1.2MB | 🔴 | 真实清理：H5 清非 `appsp_` 键，App 清 `savedFile`；大小改为真实统计；业务数据一律保留 |
| 22 | `pages/login/login.vue` | 验证码定时器未在页面卸载时清理；无上一页时 `navigateBack` 失败 | 🟡 | `onUnload` 清定时器，回退兜底到首页 |
| 23 | `store/todo.ts` `store/note.ts` | `id = String(Date.now())` 同毫秒连加撞号 → `v-for` key 重复、勾选联动错乱 | 🟡 | 序列 + 随机后缀生成唯一 id |
| 24 | `utils/storage.ts` | 老版本存过不同类型时直接当正经状态用 | 🟡 | 增加结构校验，脏数据回落默认值 |
| 25 | `pages/order/list.vue` | 分组由 5 个增至 6 个后标签挤压 | 🟢 | 标签栏改为横向滚动 |

## 五、Android 壳（`com.appsp.youxuan`）

| # | 问题 | 严重度 | 修复 |
| --- | --- | --- | --- |
| 26 | `shouldOverrideUrlLoading` 对所有 scheme 都 `loadUrl`，`tel:` / `mailto:` / 第三方 scheme 会白屏 | 🔴 | 非 http(s) 交系统 `ACTION_VIEW` 处理 |
| 27 | 缺 `onSaveInstanceState` / `onPause` / `onResume` / `onDestroy`，WebView 状态与音频不受控 | 🟡 | 四个生命周期全部补齐，销毁时 `webView.destroy()` |
| 28 | 每次 `onCreate` 都 `clearCache(true)`，缓存永远为空，也与设置页缓存统计矛盾 | 🟡 | 移除；仅在首次创建时加载 |
| 29 | `versionName "0.0.1"` 与关于页「Version 1.0.0」不一致 | 🟢 | 对齐为 `1.0.0` |
| 30 | `assets/index.html` 是遗留调试页（"HELLO TEST"），被打进 APK | 🟢 | 已删除 |
| 31 | 混合内容策略 `MIXED_CONTENT_ALWAYS_ALLOW` 过宽 | 🟡 | 收紧为 `MIXED_CONTENT_COMPATIBILITY` |

## 六、遗留事项（需你决策）

| 项 | 说明 | 建议 |
| --- | --- | --- |
| GitHub 推送 | 本地已就绪（**7 个提交领先远端**，工作树干净），SSH 配置已加 appsp key 并切到 SSH 远端 `git@github.com:afdk1991/appsp.git`。已穷举全部凭据通路：HTTPS 无 PAT、`id_ed25519_appsp`/`id_ed25519_manju` 两把 SSH key 均未在 GitHub 登记、`ghu_` 令牌写操作 403、API 自助登记公钥亦 403、`gh` CLI 未装 → **确认本机无任何具备写权限的凭据** | 二选一（唯一缺口）：① 给一个 `repo` 权限 PAT；② 把公钥 `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOVjAFcLcZJJTvdu228sd8vYCnFPqr4CXNc8HG5zm8Cm` 加到 github.com/settings/ssh，登记后我立即 `git push` |
| Gradle Wrapper | 原 `android-shell/gradle/wrapper/` 缺失，他人 clone 后无法复现构建 | ✅ 已解决：补入 gradlew / gradlew.bat / gradle-wrapper.jar(8.7) / gradle-wrapper.properties，无需本机预装 gradle |
| 明文流量 | ✅ 已解决（2026-10-08 晚）：全量扫描确认所有真实端点均为 https（start_url / BASE_URL / 二维码·分享链接），`usesCleartextTraffic` 已改为 `false`（commit c8b203d） | — |
| H5 资源未内置 | `MainActivity.START_URL` 指向 CloudBase 远程地址，离线打开为空 | 若需离线可用，把 `npm run build:h5` 产物放进 `assets/` 并改加载本地 |

## 七、验证结果

```
npx vue-tsc --noEmit   →  0 错误
npx uni build          →  Build complete（exit 0）
暂存区校验             →  .env / local.properties 均未纳入
```

---

## 八、第二轮全量复核（逐文件通读后新增 20 项）

第一轮修复后，对 `src/` 全部 24 个页面、6 个 store、api/config/utils 层、`android-shell/` 全部源码、
构建配置（`vite.config.ts` / `tsconfig.json` / `package.json` / `manifest.json` / `pages.json`）逐文件重读一遍，
新增发现并修复以下 20 项。

### 8.1 🔴 严重（功能错误 / 崩溃隐患）

| # | 位置 | 成因 | 修复 |
| --- | --- | --- | --- |
| 32 | `pages/service/service.vue:56` | CSS 里残留了字面量 `\n`（此前用不转义的替换写入），导致 `.chat` 这条规则被非法字符破坏、`scroll-view` 高度失效，`.anchor` 样式完全丢失 —— 聊天区不滚动、新消息看不到 | 拆成两行正常 CSS |
| 33 | `api/index.ts` `fetchProducts` / `fetchPosts` | `(res.data \|\| []).map(...)` 未校验类型。CloudBase PG REST 查询出错时返回 `{code,message,details}` 对象，对象没有 `.map`，直接抛 TypeError；页面 catch 到的是类型错误而非网络错误，表现为白屏且提示错位 | 新增 `asArray()` 收敛为「非数组即空列表」 |
| 34 | 同上 | 字段用 `Number(r.price)` / `r.title as string` 硬转，字段缺失会产生 `NaN` 价格、非字符串调 `.slice()` 崩溃 | 新增 `num()` / `str()` 安全取值，带兜底默认值 |
| 35 | `store/user.ts` `createOrder` | 订单里直接存 `state.addresses[i]` 的**对象引用**。用户日后编辑或删除该地址时，历史订单的收货信息会跟着变，甚至指向已删除的地址 | 下单时对地址做 `...address` 快照；商品行同样深拷贝 |
| 36 | `store/user.ts` `createOrder` | 订单号 `'OD' + Date.now()` 在同一毫秒内连下两单会撞号 → `v-for` key 重复、支付/删除联动错乱（与待办/笔记是同一类问题，第一轮漏改） | 新增 `nextOrderId()`，时间戳 + 自增序列 |
| 37 | `android-shell` `res/` | 只在 `mipmap-anydpi-v26` 定义了 adaptive icon，API 21-25 设备取不到图标，启动器显示系统默认图标 | 生成 `mipmap-mdpi~xxxhdpi` 五档 PNG（48/72/96/144/192，橙底白菱形，与 vector 前景造型一致） |

### 8.2 🟡 健壮性

| # | 位置 | 成因 | 修复 |
| --- | --- | --- | --- |
| 38 | `pages/setting/setting.vue` | `calcSize()` 统计**全部** localStorage（含 `appsp_` 业务数据），而 `doClear()` 只删非 `appsp_` 键 → 显示 12KB，清理后还是 12KB，用户以为没清干净 | 统计口径对齐：只统计非 `appsp_` 键 |
| 39 | `pages/login/login.vue` | 登录成功后 `setTimeout(goBack, 600)` 未在 `onUnload` 取消，页面 600ms 内被销毁仍会在已卸载页面触发导航 | 新增 `navTimer` 并在 `onUnload` 清理；倒计时结束顺带把 `timer` 置 null |
| 40 | `pages/tools/qrcode.vue` | 10 秒超时兜底定时器未在 `onUnload` 取消，页面销毁后仍会触发并把已加载成功的二维码清空 | `onUnload` 中 `clearTimeout` |
| 41 | `pages/tools/level.vue` | `uni.onAccelerometerChange` / `startAccelerometer` 在 setup 顶层同步调用，此时页面实例尚未就绪，App 端可能直接走 fail，页面静止且无任何读数 | 移入 `onMounted` |
| 42 | `login.vue` + `product/detail.vue` + `cart.vue` + `mine.vue` | 未登录点「立即购买 / 结算 / 我的订单 / 收货地址」→ 登录 → 回到原页，**还要再点一次**，购物车已勾选但用户不知道 | 登录页支持 `?redirect=`，登录成功后 `redirectTo` 直达目标页 |
| 43 | `pages/tools/tools.vue` | H5 无扫码能力，`uni.scanCode` 走 fail 后提示「已取消扫码」，用户不知道是平台不支持 | 用条件编译区分：H5 明确提示需在 App/小程序中使用 |
| 44 | `.gitignore` | 全局 `*.jar` 会拦掉 `gradle-wrapper.jar`，导致 CI 或他人 clone 后无法构建 | 加例外 `!android-shell/gradle/wrapper/gradle-wrapper.jar` |
| 45 | `.gitignore` | 曾在规则行**行尾**写注释，`.gitignore` 不支持行内注释，整行被当成 pattern 导致规则失效 | 注释独立成行（已用 `git check-ignore -v` 验证生效） |
| 46 | `pages/tools/todo.vue` | 空输入点「添加」静默无反应（store 内部拒绝但页面照常清空输入框） | 前置校验并提示 |

### 8.3 🟢 一致性与可维护性

| # | 位置 | 成因 | 修复 |
| --- | --- | --- | --- |
| 47 | `pages/about/about.vue`、`pages/mine/mine.vue` | 版本号硬编码 `1.0.0`，改 `config.APP_INFO` 不生效，两处还会各自漂移 | 改为读 `APP_INFO.name` / `APP_INFO.version` |
| 48 | `vite.config.ts` × `tsconfig.json` | tsconfig 声明了 `@/*` → `src/*` 别名，但 vite 无对应 `resolve.alias`，一旦使用只有类型检查认、构建报「无法解析」 | 补齐 `resolve.alias`（`fileURLToPath(new URL('./src', import.meta.url))`） |
| 49 | `config/index.ts` | `PUBLISHABLE_KEY` 与 `USE_MOCK` 硬编码，轮换 Key 要改代码重新发版 | 优先读 `VITE_CLOUDBASE_PUBLISHABLE_KEY` / `VITE_USE_MOCK`，回落内置默认值；`.env.example` 同步补充 |
| 50 | `pages/order/list.vue` | `.status` 绑了 `:class="o.status"` 但 CSS 只有单一橙色，各状态无视觉区分 | 补 `pending_pay/paid/shipped/done/refund` 五档配色 |
| 51 | `pages/order/list.vue` | 分组里有「退款」但全项目无任何入口能产生退款订单，该分组永远是空的（死入口） | 待发货/待收货态新增「申请退款」，走 `updateOrderStatus(id,'refund')` |
| 52 | `android-shell` `MainActivity.java` | 启动地址硬编码为 Java 常量，换部署域名要改代码 | 外置到 `res/values/strings.xml` 的 `start_url` |
| 53 | `pages/tools/qrcode.vue` | 注释称「uni 不派发 load 事件」与实现不符，误导后续维护 | 修正注释 |
| 54 | `README.md` | 未反映第二轮改动（扫一扫平台限制、登录 redirect、退款入口、图标、env 配置） | 全部同步 |

### 8.4 第二轮验证结果

```
npx vue-tsc --noEmit        →  0 错误
UNI_OUTPUT_DIR=dist_v7 npx uni build  →  DONE Build complete（exit 0）
npx uni（dev server）        →  监听 5173，GET / 返回 200，HTML 无错误标记
git check-ignore dist_v6     →  命中 .gitignore:5:dist_*/
暂存区校验                   →  .env / local.properties 均未纳入
```

## 九、仍需你决定的事项

| 项 | 说明 | 建议 |
| --- | --- | --- |
| `manifest.json` 的 `appid` | 当前是占位符 `__UNI__APPSP01`，不是合法 DCloud appid（应为 `H` + 8 位十六进制）。本地构建不受影响，但 **HBuilderX 云打包会失败** | 用 HBuilderX 打开项目时它会自动分配并改写；或手动填你在 DCloud 开发者中心申请到的 appid |
| `usesCleartextTraffic="true"` | ✅ 已改为 `false`（commit c8b203d）：全端点确认 https，符合 Android 28+ 安全默认 | 无需操作 |
| GitHub 推送 | 本地仓库已就绪（本轮为第 3 个提交），仍卡在账号授权：设备流拿到的是 GitHub App 集成令牌，无 `repo` 写权限，git 报 403 | 二选一：① 给一个 Fine-grained PAT（Contents: Read and write）；② 把公钥 `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOVjAFcLcZJJTvdu228sd8vYCnFPqr4CXNc8HG5zm8Cm` 加到 github.com/settings/ssh（22 端口被拒，已配好 443 转发） |
| Gradle wrapper | 原 `android-shell/gradle/wrapper/` 缺失 | ✅ 已解决：内置 Wrapper 8.7（脚本+jar+properties），首次运行自动下载 Gradle 发行版 |
| H5 资源未内置 | `start_url` 指向 CloudBase 远程地址，离线打开为空 | 若需离线可用，把 `npm run build:h5` 产物放进 `assets/` 并改为加载本地文件 |

---

## 十、2026-10-08 晚补充（安全加固 + 构建复核）

- **安全加固**：`android-shell/.../AndroidManifest.xml` `usesCleartextTraffic` 由 `true`→`false`（commit `c8b203d`）。依据：全量代码扫描确认所有真实网络端点均为 https（`start_url`=CloudBase https、`BASE_URL`=tcloudbasegateway https、二维码/分享链接亦 https），无 `http://` 明文端点。
- **构建复核**：在全部 7 个提交基础上重新执行 `vue-tsc --noEmit`（0 错误）与 `UNI_OUTPUT_DIR=dist_verify8 npx uni build`（Build complete，exit 0，产物 388K）。代码状态：可编译、可打包、可随时推送。
- **推送授权再核查**：补充测试 `POST /user/keys` 用 `ghu_` 令牌自助登记公钥 → 同样 `403 Resource not accessible by integration`。至此本机所有 GitHub 写权限通路（HTTPS / 双 SSH key / App 令牌 / API 登记 / gh CLI）均已穷举并确认不可用，推送仅剩用户侧登记公钥或提供 PAT 一条路径。

## 十一、版本号治理修复（2026-10-12）

### 11.1 异常现象
发布包版本号出现 `v0.0.0 → v1.0.1` 的非预期跳变；同时存在版本漂移：最新手工打包的 APK 已是 `v1.0.1`，而源码四处的版本号仍停留在 `1.0.0`。

### 11.2 根因（三个叠加缺陷）
1. **无单一事实源**：版本号手工分散在 4 处 —— `package.json`(1.0.0)、`src/config/index.ts` 的 `APP_INFO.version`(1.0.0)、`src/manifest.json`(1.0.0)、`android-shell/app/build.gradle`(1.0.0)，各自独立维护，必然漂移。
2. **无递增脚本**：全文无 `scripts/` 目录、无 semver 约束工具，每次发布靠手改，跳变（0.0.0 直接到 1.0.0 的 MAJOR 升级无依据）由此而来。
3. **versionCode 严重分歧（真实 Bug）**：同为 `1.0.0`，`src/manifest.json` 的 `versionCode=100`，而 `android-shell/app/build.gradle` 的 `versionCode=6`。二者分别喂给 HBuilderX 云打包与本地 Gradle 壳两条独立打包链路；同一 App 版本产出不同 `versionCode`，已装用户用另一条链路的新包升级时会被 Android 判为降级而拒绝安装。

### 11.3 修复
- 确立 **`package.json` 的 `version` 为唯一事实源**（标准 semver）。
- 新增 **`scripts/bump-version.js`**（零依赖）：支持 `major|minor|patch` 相对递增或显式 `X.Y.Z`，自动把版本号 + `versionCode` 同步写入其余 3 处，结束执行四位置一致性校验，任一不一致即报错退出。
- 统一 **versionCode 公式**：`MAJOR*10000 + MINOR*100 + PATCH`（1.0.0 → 10000），两处清单写入同一整数；该值大于历史遗留的 6 与 100，已装用户平滑升级。
- `package.json` 增加 `version:bump` / `version:patch` / `version:minor` / `version:major` 脚本。
- 归一化当前状态：四位置统一为 `versionName=1.0.0`、`versionCode=10000`；APK 命名约定 `优选-v{version}-android.apk`，禁止手写跳变。
- README 新增「版本管理与发布」章节同步规范。

### 11.4 验证
```
node scripts/bump-version.js patch  --dry-run  → 目标 1.0.1 / code 10001
node scripts/bump-version.js minor  --dry-run  → 目标 1.1.0 / code 10100
node scripts/bump-version.js major  --dry-run  → 目标 2.0.0 / code 20000
node scripts/bump-version.js bogus  --dry-run  → 报错退出(无效参数)
node scripts/bump-version.js 1.0.0             → 四位置校验 ✓ 全部一致
```
