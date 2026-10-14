# 优选 · 综合型 Android APP

基于 **uni-app (Vue 3 + Vite + TypeScript)** 的跨端移动应用，本版本先交付 **Android**，同一套代码后续可打包 iOS / 微信小程序 / H5。

## 已实现功能

### 商城交易闭环
- 首页：搜索栏（跳搜索页）、分类金刚区、双列商品瀑布流、购物车角标
- 搜索页：历史搜索、热门推荐、前端实时过滤、商品跳转
- 商品详情：规格选择、加入购物车（真实入库）、立即购买、收藏、购物车角标
- 购物车：数量增减、单选/全选、删除、合计、结算
- 确认订单：地址选择、优惠券抵扣、实付款计算、下单 + 模拟支付
- 订单列表：按状态筛选（待付款/待发货/待收货/已完成/退款），支持从「我的」页各状态入口直达对应分组；去支付、确认收货、申请退款、删除（均含持久化）
- 订单详情：状态横幅、地址、商品明细、取消订单、再次支付

### 发现社区
- 顶部分类 Tab（推荐 / 热门按点赞排序 / 最新按发布时间排序）
- 信息流卡片：头像、正文、封面
- 点赞持久化到本地存储，再次进入状态保留
- 评论：底部输入栏、评论列表展示
- 分享：调用 `uni.setClipboardData` 真实复制链接到剪贴板

### 我的
- 手机号一键登录 / 验证码登录（本地模拟，支持微信/Apple 演示入口）
- 未登录时点「立即购买 / 结算 / 我的订单 / 收货地址」等，登录页会带上 `?redirect=`，登录成功后直达原目标页，无需再点一次
- 用户卡片：头像、昵称、手机号
- 订单状态入口：角标显示各状态订单数
- 收货地址：列表 / 新增 / 编辑 / 删除 / 设默认
- 优惠券：领取、满减门槛、使用
- 我的收藏：商品收藏列表、取消收藏
- 客服中心：智能问答对话框
- 设置：真实清除缓存（H5 清 localStorage 非业务键；App 清 savedFile，保留账号/订单/购物车等 `appsp_` 数据）、用户协议、隐私政策、退出登录
- 关于我们

### 工具箱（全部真实可用，不依赖后端）
| 工具 | 能力 |
| --- | --- |
| 待办清单 | 增删改查、完成状态、筛选、本地持久化 |
| 计算器 | 完整四则运算、百分号、退格 |
| 随手记 | 笔记列表、保存、删除 |
| 扫一扫 | 调起原生 `uni.scanCode` 扫码（H5 无此能力，会提示需在 App / 小程序中使用）|
| 生成二维码 | 输入文本/链接生成二维码图，含加载态与失败重试 |
| 汇率换算 | 8 种货币实时换算（固定参考汇率） |
| 水平仪 | 加速度计实时气泡（rpx→px 换算，内联样式可用）、倾角读数、不支持时明确提示 |

## 技术栈

- Vue 3 Composition API + `<script setup lang="ts">`
- Vite 5 构建
- uni-app 官方 `@dcloudio/vite-plugin-uni`
- 统一请求层 `src/api/request.ts`，支持 **Mock / CloudBase 一键切换**
- 本地状态层 `src/store/`：购物车 / 用户 / 地址 / 订单 / 优惠券 / 待办 / 笔记 / 收藏 / 点赞评论，全部基于 `uni.storage` 持久化，断网可用

## 目录结构

```
APPsp/
├── src/
│   ├── api/            # 请求封装与接口定义
│   ├── config/         # 环境配置（baseURL / mock 开关）
│   ├── mock/           # 本地 Mock 数据
│   ├── store/          # 响应式本地状态（cart/user/todo/note/community）
│   ├── utils/          # storage 封装
│   ├── pages/
│   │   ├── index/      # 商城首页
│   │   ├── discover/   # 发现
│   │   ├── tools/      # 工具首页 + 6 个工具子页
│   │   ├── mine/       # 我的
│   │   ├── product/    # 商品详情
│   │   ├── search/     # 搜索
│   │   ├── cart/       # 购物车
│   │   ├── order/      # 确认订单 / 列表 / 详情
│   │   ├── login/      # 登录
│   │   ├── address/    # 地址列表 / 编辑
│   │   ├── favorite/   # 收藏
│   │   ├── coupon/     # 优惠券
│   │   ├── service/    # 客服
│   │   ├── setting/    # 设置
│   │   └── about/      # 关于
│   ├── static/
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json
│   └── pages.json      # 路由与 TabBar
├── android-shell/  # 原生 Android WebView 壳（com.appsp.youxuan）
└── package.json
```

## 本地开发

```bash
npm install
npm run dev:h5       # H5 调试
npm run build:h5     # 生产包（输出到 dist/build/h5）
npm run type-check   # TS 类型检查
```

## 打 Android APK

### 方式一：HBuilderX 云打包（免费）

1. 下载安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)（App 开发版）。
2. 菜单 `文件 → 导入 → 从本地目录导入`，选择本项目根目录。
3. 菜单 `发行 → 原生App-云打包`，选 Android，证书先用「公用测试证书」。
4. 等待云端打包完成，下载 `.apk` 安装。

### 方式二：Gradle 本地打包（android-shell）

`android-shell/` 是一个最小原生 WebView 壳（包名 `com.appsp.youxuan`），
启动地址配置在 `app/src/main/res/values/strings.xml` 的 `start_url`，改这一处即可换站点，无需改 Java 代码。
启动图标同时提供 `mipmap-mdpi ~ mipmap-xxxhdpi` 位图（API 21-25）与 `mipmap-anydpi-v26` 自适应图标（API 26+）。

项目已内置 Gradle Wrapper（8.7），无需本机预装 gradle：

```bash
cd android-shell
# local.properties 需指定本机 Android SDK 路径（该文件已被 .gitignore 排除）
# Windows
gradlew.bat assembleDebug
# macOS / Linux
./gradlew assembleDebug
# 输出：app/build/outputs/apk/debug/app-debug.apk
```

> 首次执行会联网下载 Gradle 8.7 发行版至 `~/.gradle/wrapper/dists`（约 100MB），后续离线复用。
> 注意：`android-shell/local.properties` 含本机 SDK 路径，已在 `.gitignore` 中排除，不要提交。
> `.gitignore` 对 `gradle-wrapper.jar` 做了例外放行（全局 `*.jar` 规则会拦掉它），否则他人 clone 后无法构建。

## 版本管理与发布

版本号曾出现「v0.0.0 直接跳到 v1.0.1」的异常，根因是**版本号被手工分散在 4 个位置、且无任何递增脚本约束**，导致 `uni-app manifest` 与 `android Gradle` 的 `versionCode` 长期不一致（manifest 用 `100`、Gradle 用 `6`），两套打包产物互相视为降级、无法升级。

现已建立**单一事实源 + 自动同步 + 语义化递增**机制：

- **唯一事实源**：`package.json` 的 `version` 字段（`MAJOR.MINOR.PATCH` 标准 semver）。
- **自动同步脚本**：`scripts/bump-version.js`（零依赖）按 semver 递增后，把版本号与 `versionCode` 一次性写入其余 3 处：
  - `src/config/index.ts` 的 `APP_INFO.version`（App 内「关于/我的」页展示）
  - `src/manifest.json` 的 `versionName` + `versionCode`（HBuilderX 云打包通道）
  - `android-shell/app/build.gradle` 的 `versionName` + `versionCode`（本地 Gradle 壳通道）
- **versionCode 公式（两套通道必须共用同一整数）**：
  `versionCode = MAJOR * 10000 + MINOR * 100 + PATCH`（例：1.0.0 → 10000，1.2.3 → 10203）。
  该值恒大于历史遗留的 gradle(6) 与 manifest(100)，已装用户可平滑升级；MINOR/PATCH 各支持 0~99。
- **递增规则（语义化）**：
  - `patch` —— 修复 bug / 小调整（1.0.0 → 1.0.1）
  - `minor` —— 新增向后兼容功能（1.0.0 → 1.1.0）
  - `major` —— 不兼容的接口/体验变更（1.0.0 → 2.0.0）
- **发布包命名约定**：`优选-v{version}-android.apk`（如 `优选-v1.0.1-android.apk`），禁止手写跳变版本。

```bash
# 预览（不改文件）
node scripts/bump-version.js patch --dry-run

# 正式递增（自动同步四位置并校验一致性）
npm run version:patch     # 或 version:minor / version:major
node scripts/bump-version.js 1.2.3   # 也可直接指定目标版本
```

脚本结束时会对四位置做一致性校验，任一不一致会立即报错退出，杜绝版本漂移复发。

## 数据说明

- 商品/帖子数据：由 `src/config/index.ts` 的 `USE_MOCK` 决定。默认 `true` 走 `src/mock/data.ts` 本地数据；
  在 `.env` 设 `VITE_USE_MOCK=false` 即切到腾讯云 CloudBase PG REST（匿名只读），
  可用 `VITE_CLOUDBASE_PUBLISHABLE_KEY` 覆盖内置 Publishable Key，无需改代码。见 `.env.example`。
- 用户、购物车、订单、地址、收藏、点赞、评论、待办、笔记：全部存储在本机 `uni.storage`，卸载 App 才清除，无需后端账号。
- 登录为本地演示登录，接入真实后端时替换 `src/store/user.ts` 的 `login()` 为真实接口即可，页面层无需改动。
