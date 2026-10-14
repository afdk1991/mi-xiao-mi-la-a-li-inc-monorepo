# Zibll 子比主题 demo.zibll.com HTML 源码分析

> 基于演示站首页 HTML 源码的结构化拆解

---

## 一、页面基本信息

| 项目 | 值 |
|------|-----|
| 语言 | `zh-Hans`（简体中文） |
| 标题 | 更优雅的Wordpress主题模板_WP社区论坛商城主题_zibll子比主题官方演示 |
| 关键词 | zibll主题,子比主题,Wordpress主题,wordpress主题下载,wordpress商城主题,自媒体,网站建设,个人博客,网页模板,企业网站 |
| 描述 | Zibll子比主题专为博客、自媒体、资讯类的网站设计开发，采用简约优雅的设计风格... |
| 规范链接 | `https://demo.zibll.com/` |
| 主题版本 | 9.0 |
| 主题标识 | `wp-theme-zibll` |
| 主题色 | `#16b597`（青绿色） |
| 布局模式 | `site-layout-2` |
| 导航模式 | `nav-fixed`（固定导航栏） |
| 主题模式 | `dark-theme`（暗色主题，同时支持亮/暗切换） |

---

## 二、Head 区域：Meta 与 SEO 配置

### 2.1 视口与兼容性

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=0.0, viewport-fit=cover">
```

- 禁止用户缩放（`user-scalable=0`），锁定缩放比例
- `viewport-fit=cover` 适配刘海屏设备

### 2.2 SEO 相关

```html
<meta name="robots" content="max-image-preview:large" />
<link rel="canonical" href="https://demo.zibll.com/" />
```

- 允许搜索引擎展示大图预览
- 设置了规范链接防止重复内容

### 2.3 缓存控制

```html
<meta http-equiv="Cache-Control" content="no-transform" />
<meta http-equiv="Cache-Control" content="no-siteapp" />
```

- 禁止百度等搜索引擎转码（保持原始页面样式）
- 禁止 SiteApp 等中间层代理

### 2.4 PWA / 移动端适配

```html
<meta name="apple-mobile-web-app-title" content="WordPress主题模板-zibll子比主题官方演示">
<meta name="theme-color" content="#2F3135">
<link rel="apple-touch-icon-precomposed" href="https://oss.zibll.com/demo.zibll.com/2020/03/icon.png">
```

- iOS 添加到主屏幕时显示的标题
- 浏览器主题色（地址栏颜色）为深灰 `#2F3135`
- 预置了 Apple Touch Icon

---

## 三、CSS 架构：分层加载策略

### 3.1 加载顺序（4 层）

| 顺序 | 文件 | 用途 |
|------|------|------|
| 1 | `wp-block-library-inline-css` | WordPress 古腾堡区块基础样式（内联） |
| 2 | `classic-theme-styles-inline-css` | WordPress 经典主题兼容样式（内联） |
| 3 | `global-styles-inline-css` | 全局设计变量：颜色、渐变、字体、间距、阴影（内联 theme.json 生成） |
| 4 | `_bootstrap-css` | Bootstrap 框架（外部文件） |
| 5 | `_fontawesome-css` | Font Awesome 图标库（外部文件） |
| 6 | `_main-css` | 主题主样式文件（外部文件） |
| 7 | `shop-css` | 商城模块独立样式（外部文件） |

### 3.2 核心 CSS 变量（主题自定义）

```css
body {
  --theme-color: #16b597;                    /* 主题色：青绿 */
  --focus-shadow-color: rgba(22,181,151,.4);  /* 焦点阴影 */
  --focus-color-opacity1: rgba(22,181,151,.1);
  --focus-color-opacity05: rgba(22,181,151,.05);
  --focus-color-opacity3: rgba(22,181,151,.3);
  --focus-color-opacity6: rgba(22,181,151,.6);
  --mian-max-width: 1300px;                  /* 最大内容宽度 */
}

body, body.dark-theme {
  --footer-bg: #22292d;                      /* 页脚背景 */
  --footer-color: #e5e5e5;                   /* 页脚文字色 */
}
```

**设计特征**：
- 主题色基于单一颜色 `#16b597`，衍生出 5 个透明度级别，用于不同交互状态
- 亮/暗主题共享同一套 CSS 变量体系，通过 `.dark-theme` 类切换
- 内容最大宽度 1300px

### 3.3 WordPress 全局设计变量（theme.json 生成）

```css
:root {
  /* 预设颜色 - 10 种 */
  --wp--preset--color--black: #000000;
  --wp--preset--color--cyan-bluish-gray: #abb8c3;
  --wp--preset--color--white: #ffffff;
  --wp--preset--color--pale-pink: #f78da7;
  --wp--preset--color--vivid-red: #cf2e2e;
  --wp--preset--color--luminous-vivid-orange: #ff6900;
  --wp--preset--color--luminous-vivid-amber: #fcb900;
  --wp--preset--color--light-green-cyan: #7bdcb5;
  --wp--preset--color--vivid-green-cyan: #00d084;
  --wp--preset--color--pale-cyan-blue: #8ed1fc;
  --wp--preset--color--vivid-cyan-blue: #0693e3;
  --wp--preset--color--vivid-purple: #9b51e0;

  /* 预设渐变 - 10 种 */
  /* 预设字体大小 - 4 级（small:13px, medium:20px, large:36px, x-large:42px） */
  /* 预设间距 - 7 级（20~80） */
  /* 预设阴影 - 5 种（natural, deep, sharp, outlined, crisp） */
}
```

### 3.4 功能性内联样式

```css
/* 代码高亮限制高度 */
.enlighter-default .enlighter,
.wp-block-zibllblock-enlighter:not(:has(.enlighter)),
.enlighter-pre:not(:has(.enlighter)) {
  max-height: 400px;
  overflow-y: auto !important;
}

/* 评论评分进度条 */
.comment-score-progress {
  position: relative;
  border-radius: 50px;
  color: var(--muted-color);
  width: 160px;
  margin: 0 10px;
  background: var(--main-border-color);
  padding: 3px;
}
.comment-score-progress .vote-progress {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  transition: width 1s, background 0.2s;
  border-radius: 50px;
  background: #ff5473;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .meta-right .meta-like {
    display: unset !important;
  }
}
```

---

## 四、JavaScript 加载策略

| 文件 | 加载方式 | 位置 |
|------|----------|------|
| `jquery.min.js` | 同步加载（`<script>` 标签） | head 中 |
| `html5.min.js` | IE 条件注释加载 | head 底部 |

**注意**：jQuery 在 head 中同步加载，非 `defer`/`async`，这是较传统的做法。主题的主要 JS 文件未在源码片段中出现（可能在页面底部加载）。

---

## 五、Body 结构：页面布局

### 5.1 Body 类名解析

```html
<body class="home blog wp-theme-zibll dark-theme nav-fixed site-layout-2">
```

| 类名 | 含义 |
|------|------|
| `home` | 首页 |
| `blog` | 博客类型页面 |
| `wp-theme-zibll` | 主题标识 |
| `dark-theme` | 当前为暗色模式 |
| `nav-fixed` | 导航栏固定定位 |
| `site-layout-2` | 站点布局方案 2 |

### 5.2 页面加载遮罩

```html
<div class="qjl qj_loading" style="position: fixed; background: var(--main-bg-color);
  width: 100%; margin-top: -150px; height: 300%; z-index: 99999999">
  <div style="position: fixed; top: 0; left: 0; bottom: 0; right: 0;
    display: flex; align-items: center; justify-content: center"></div>
</div>
```

- 全屏遮罩层，`z-index: 99999999` 确保最高层级
- 使用 `height: 300%` + `margin-top: -150px` 技巧覆盖整个视口（包括滚动区域）
- 背景色跟随主题变量 `--main-bg-color`

### 5.3 SEO 预加载图片

```html
<div style="position: fixed; z-index: -999; left: -5000%;">
  <img src="https://oss.zibll.com/zibll.com/2021/12/购买页-幻灯片.jpg" alt="...">
</div>
```

- 将社交媒体分享时使用的预览图片放在屏幕外预加载
- SEO 优化：确保 Open Graph / 百度抓取时能获取到正确的图片

---

## 六、Header 结构：导航栏分析

### 6.1 Header 类名

```html
<header class="header header-layout-3 show-slide scroll-down-hide">
```

| 类名 | 含义 |
|------|------|
| `header-layout-3` | 导航布局方案 3 |
| `show-slide` | 滚动时显示滑块效果 |
| `scroll-down-hide` | 向下滚动时隐藏导航栏 |

### 6.2 导航栏容器

```html
<nav class="navbar navbar-top center">
  <div class="container-fluid container-header">
```

- `navbar-top`：顶部导航栏
- `center`：内容居中对齐
- `container-fluid`：全宽容器
- `container-header`：自定义 header 容器类

### 6.3 Logo 区域

```html
<div class="navbar-brand">
  <a class="navbar-logo" href="https://demo.zibll.com">
    <img src="夜间版Logo.svg"
         white-src="白天版Logo.svg"
         dark-src="夜间版Logo.svg"
         alt="..." loading="lazy">
  </a>
</div>
```

**Logo 切换机制**：
- 默认加载暗色 Logo（当前为暗色主题）
- `white-src` 属性存储亮色版 Logo
- `dark-src` 属性存储暗色版 Logo
- 通过 JavaScript 读取 `data-theme` 或 body 类名动态切换 `src`

### 6.4 移动端按钮组

```html
<!-- 汉堡菜单按钮 -->
<button type="button" data-toggle-class="mobile-navbar-show"
  data-target="body" class="navbar-toggle">
  <i class="em12 css-icon i-menu"><i></i></i>
</button>

<!-- 搜索按钮 -->
<a class="main-search-btn navbar-toggle" href="javascript:;">
  <svg class="icon" aria-hidden="true">
    <use xlink:href="#icon-search"></use>
  </svg>
</a>
```

- 使用 `data-toggle-class` 自定义属性切换 body 类名（非原生 Bootstrap 机制）
- 图标使用 SVG Sprite 方式（`<use xlink:href="#icon-xxx">`），Font Awesome 作为补充

### 6.5 用户登录下拉面板

结构层级：
```
navbar-collapse
├── navbar-form (导航折叠按钮)
│   └── SVG 图标按钮
├── navbar-form (右侧功能区)
│   └── list-inline splitters
│       ├── 用户图标按钮
│       │   └── sub-menu (下拉面板)
│       │       ├── padding-10 (内边距容器)
│       │       │   ├── sub-user-box
│       │       │   │   ├── 开通会员按钮 (jb-red 样式)
│       │       │   │   ├── flex jsa header-user-href
│       │       │   │   │   ├── 登录 (c-blue)
│       │       │   │   │   ├── 注册 (c-green)
│       │       │   │   │   └── 找回密码 (c-purple)
│       │       │   │   └── social-separator 分隔线
│       │       │   └── social_loginbar (第三方登录)
│       │       │       ├── QQ (fa-qq)
│       │       │       ├── 微信 (fa-weixin, qrcode-signin)
│       │       │       ├── 百度 (SVG icon)
│       │       │       ├── 支付宝 (SVG icon)
│       │       │       └── GitHub (fa-github)
│       │       └── (结束)
│       └── 搜索按钮
```

**交互设计要点**：
- 未登录时显示"登录/注册/找回密码"三个快捷入口
- 各按钮使用独立颜色标识（蓝/绿/紫）
- 第三方登录支持 5 种方式（QQ、微信、百度、支付宝、GitHub）
- 微信登录标记了 `qrcode-signin`，暗示扫码登录流程
- 所有 OAuth 链接携带 `rurl` 参数用于登录后跳转回原页面

---

## 七、技术特征总结

### 7.1 图标体系：双轨制

| 方式 | 用途 | 示例 |
|------|------|------|
| SVG Sprite | 主题自定义图标 | `#icon-search`, `#icon-user`, `#icon-vip_1` |
| Font Awesome | 通用图标补充 | `fa-qq`, `fa-weixin`, `fa-github` |

SVG Sprite 使用 `<svg><use xlink:href="#icon-xxx"></use></svg>` 引用，图标定义在页面某处的隐藏 SVG 中。

### 7.2 交互动效类

| 类名/属性 | 功能 |
|-----------|------|
| `scroll-down-hide` | 向下滚动自动隐藏导航栏 |
| `show-slide` | 滑出显示效果 |
| `data-toggle-class` | 自定义属性切换 CSS 类 |
| `data-target` | 指定类切换的目标元素 |
| `toggle-radius` | 切换时带圆角动画 |
| `jb-red` | 红色渐变按钮样式 |
| `payvip-icon` | 会员购买按钮带图标 |
| `signin-loader` / `signup-loader` | 触发登录/注册弹窗加载 |
| `radius4` | 4px 圆角 |

### 7.3 响应式断点

从内联 CSS 可识别的断点：
- `640px`：移动端适配断点
- 主容器最大宽度 `1300px`：桌面端内容限宽

### 7.4 资源域名

| 域名 | 用途 |
|------|------|
| `demo.zibll.com` | 演示站主域名（主题文件） |
| `oss.zibll.com` | 阿里云 OSS 静态资源存储（图片、Logo） |
| `apps.bdimg.com` | 百度 CDN（DNS 预解析） |

### 7.5 主题 CSS 命名规范

- 主样式：`_main.css`
- 模块样式：`shop/css/main.min.css`（商城模块独立目录）
- 图标库独立文件：`css/font-awesome.min.css`
- CSS ID 前缀：`_bootstrap`, `_fontawesome`, `_main`（下划线前缀标识主题资源）

---

## 八、可复用的设计模式

### 8.1 亮暗主题切换

```css
/* 亮暗主题共享变量 */
body, body.dark-theme { --footer-bg: #22292d; }

/* Logo 切换 */
<img dark-src="夜间.svg" white-src="白天.svg">
```

### 8.2 自定义数据属性交互

```html
<button data-toggle-class="mobile-navbar-show" data-target="body">
```

不依赖 Bootstrap 的 `data-toggle="collapse"`，使用自定义属性体系。

### 8.3 全屏加载遮罩

```html
<div class="qjl qj_loading" style="height: 300%; margin-top: -150%;">
```

三倍视口高度 + 负偏移的技巧，确保任何滚动位置都不露底。

### 8.4 评论投票进度条

```css
.comment-score-progress {
  border-radius: 50px;
  width: 160px;
  background: var(--main-border-color);
  padding: 3px;
}
.vote-progress {
  transition: width 1s, background 0.2s;
  background: #ff5473;
}
```

外层轨道 + 内层填充，带 1 秒过渡动画。

---

## 九、完整页面结构：从上传文件补充

> 基于上传的完整源码文件（481 行），补充首页后半部分结构

### 9.1 页面整体 DOM 树

```
body
├── qjl (全屏加载遮罩)
├── SEO 预加载图片 (fixed, z-index: -999)
├── header.header.header-layout-3 (桌面导航栏)
│   └── nav.navbar.navbar-top.center
│       ├── navbar-brand (Logo)
│       ├── navbar-toggle (汉堡菜单 + 搜索)
│       ├── navbar-collapse (导航菜单)
│       │   ├── 购买主题 (带 jb-pink 徽章 "限时优惠")
│       │   ├── 功能演示 (mega menu，多列链接)
│       │   │   ├── 功能体验：商城系统、知识付费、社区论坛、网址导航、文档导航
│       │   │   └── 页面布局：仅模块布局、全宽内容页、侧边栏靠左、图库文章、视频文章
│       │   ├── 特色功能 (图形卡片轮播，Swiper)
│       │   │   ├── 社区论坛圈子 (NEW 红色标签)
│       │   │   ├── 付费商城系统 (NEW 青色标签)
│       │   │   ├── 分销推广返佣
│       │   │   ├── VIP付费会员
│       │   │   ├── 可视模块化布局 (强大标签)
│       │   │   ├── 古腾堡编辑器 (强大标签)
│       │   │   ├── 用户权限管理
│       │   │   ├── 站内信/私信
│       │   │   └── 后台配置简单易用
│       │   └── 主题文档 (子菜单，8 个文档分类)
│       └── navbar-form (右侧：用户 + 搜索)
│           ├── 登录下拉面板 (会员/登录/注册/找回/社交登录)
│           ├── 开通会员 (VIP 卡片悬浮面板)
│           └── 搜索按钮
├── mobile-header (移动端独立导航)
│   └── nav.mobile-navbar (左侧滑入)
│       ├── Logo + 关闭按钮
│       ├── 主题切换按钮 + 语言切换下拉
│       ├── mobile-menus (与桌面端相同的菜单结构)
│       └── 社交登录栏 (QQ/微信/百度/支付宝/GitHub)
├── content-wrap (主内容区)
│   └── content-layout
│       ├── zib-widget-wrap (主内容列)
│       │   └── widget-container → zib-slider (首页幻灯片轮播)
│       │       └── new-swiper.slide-widget (Swiper 轮播)
│       └── ajax-option (排序过滤)
│           ├── option-dropdown (排序选择器)
│           └── list-inline.scroll-x (水平滚动分类)
├── sidebar (侧边栏)
│   ├── social-separator (分隔线)
│   └── social_loginbar (社交登录)
├── footer.footer (页脚)
│   ├── 链接区：免责声明、广告合作、关于我们
│   ├── 版权信息：Copyright © 2026
│   ├── 备案号：蜀ICP备20005655号
│   ├── 公安备案：川公网安备51140202000560号
│   ├── 提示文字："主题功能强大，部分功能未做演示"
│   └── footer-contact (微信客服 + QQ交流群二维码)
├── 浮动按钮组
│   ├── 限时特惠横幅 (colorful-bg jb-pink)
│   ├── VIP 开通会员 (float-btn, #f2c97d 金色)
│   ├── 客服按钮 (float-btn service)
│   └── 返回顶部 (float-btn ontop, fa-angle-up)
├── 搜索面板 (固定全屏, mini-touch="nav_search", 从顶部滑入)
├── 登录/注册弹窗 (modal#u_sign)
│   ├── 背景大图 (左侧)
│   ├── Logo
│   └── 表单区域
├── 系统通知弹窗 (modal#modal-system-notice)
│   ├── 彩色头部 (colorful-bg jb-pink)
│   ├── 通知内容："搭建网站从一个优秀的主题开始！"
│   └── 操作按钮：更新日志 / 主题文档 / 立即购买
└── 底部脚本区
    ├── speculationrules (预加载规则，排除后台/wp-admin等路径)
    ├── window._win (全局配置对象)
    ├── bootstrap.min.js
    ├── loader.js
    ├── shop/main.min.js
    ├── 百度统计 (hm.baidu.com)
    ├── 百度推送 (zz.bdstatic.com)
    └── 性能日志：数据库查询 7 次 | 页面生成耗时 238.964ms
```

### 9.2 导航菜单：mega menu 两种模式

**模式 1：多列链接布局**（`submenu-multi-column-links`）
```
links-columns-box.flex.jsa
├── links-column (功能体验)
│   └── link-item × 5 (商城系统/知识付费/社区论坛/网址导航/文档导航)
└── links-column (页面布局)
    └── link-item × 5 (仅模块/全宽/侧边栏靠左/图库/视频)
```

**模式 2：图形卡片轮播**（`submenu-graphic-card`）
```
swiper-container.swiper-scroll
├── swiper-slide × 10 (每张卡片：图片 + 标题 + badge 标签)
├── swiper-button-prev
└── swiper-button-next
```

每个 slide 的 `--ani-delay` 递增 0.05s（0s, 0.05s, 0.1s...），实现依次入场动画。

### 9.3 VIP 会员悬浮卡片

```html
<div class="sub-menu hover-show-con sub-vip-card">
  <div class="vip-card pointer level-1 vip-theme1 signin-loader" vip-level="1">
    <div class="vip-baicon">黄金会员 Logo</div>
    <div class="vip-name mb10">黄金会员</div>
    <ul class="mb10">
      <li>全站资源折扣购买</li>
      ...
    </ul>
  </div>
</div>
```

- 通过 `hover-show` / `hover-show-con` 实现鼠标悬停展示
- VIP 等级通过 `vip-level` 属性和 `level-*` / `vip-theme*` 类标识
- 支持 1 级（黄金会员）

### 9.4 多语言系统

支持 10 种语言，每种配有独立国旗 SVG：
- 简体中文 (`chinese_simplified`)
- 繁体中文 (`chinese_traditional`)
- English
- 한국어 (`korean`)
- 日本語 (`japanese`)
- Français (`french`)
- Italiano (`italian`)
- Deutsch (`deutsch`)
- Русский (`russian`)

翻译配置使用 `translate_config` 对象，支持：
- 术语表：`nomenclature`（如 子比 → zibll）
- 忽略词：`ignore_text`（如 zibll 不翻译）
- 服务：`service_use: "client.edge"`（Edge 浏览器端翻译）

### 9.5 全局配置对象 `window._win`

```javascript
window._win = {
  views: '',                    // 文章浏览量
  www: 'https://demo.zibll.com',
  uri: '.../wp-content/themes/zibll',
  ver: '9.0',                   // 主题版本
  pay_mark: 'R币',              // 虚拟货币名称
  pay_currency_unit: '元',      // 真实货币单位
  imgbox: '1',                  // 图片灯箱启用
  imgbox_type: 'group',         // 灯箱分组模式
  imgbox_thumbs: '1',           // 显示缩略图
  imgbox_zoom: '1',             // 缩放功能
  imgbox_full: '1',             // 全屏查看
  imgbox_play: '1',             // 播放功能
  imgbox_down: '1',             // 下载功能
  sign_type: 'modal',           // 登录方式：弹窗
  signin_url: '.../user-sign?tab=signin...',
  signup_url: '.../user-sign?tab=signup...',
  ajax_url: '.../wp-admin/admin-ajax.php',
  ajaxpager: '',                // AJAX 分页
  ajax_trigger: '加载更多',
  ajax_nomore: '没有更多内容了',
  qj_loading: '1',              // 全屏加载遮罩启用
  highlight_kg: '1',            // 代码高亮：关键词
  highlight_btn: '1',           // 代码高亮：复制按钮
  highlight_zt: 'dracula',      // 暗色主题代码高亮风格
  highlight_white_zt: 'enlighter', // 亮色主题代码高亮风格
  highlight_dark_zt: 'dracula',    // 暗色主题代码高亮风格
  upload_img_size: '2',          // 图片上传大小限制 (MB)
  img_upload_multiple: '6',      // 多图上传数量上限
  upload_video_size: '5',        // 视频上传大小限制 (MB)
  upload_file_size: '2',         // 文件上传大小限制 (MB)
  upload_ext: 'jpg|jpeg|...',   // 允许上传的文件扩展名
  user_upload_nonce: '866dcd3bb2',  // 上传 nonce
  post_action_nonce: 'bcacb14058',  // 文章操作 nonce
  is_split_upload: '1',         // 分片上传
  split_minimum_size: '20',     // 分片大小 (MB)
  i18n: { ... }                  // 国际化文本
}
```

### 9.6 浮动按钮系统

页面右下角浮动按钮组：

| 按钮 | 样式 | 功能 |
|------|------|------|
| 限时特惠横幅 | `colorful-bg jb-pink` | 点击跳转购买页 |
| VIP 开通会员 | `--this-color:#f2c97d` 金色 | 触发登录弹窗 |
| 客服 | `float-btn service` | 显示联系方式 |
| 返回顶部 | `float-btn ontop fade` | `scrollTopTo()` |

每个按钮使用 `float-btn` 基类 + `data-toggle="tooltip"` 提示。

### 9.7 系统通知弹窗

```javascript
window.onload = function(){
  setTimeout(function () {
    $('#modal-system-notice').modal('show');
    $.cookie("showed_system_notice","showed", {path: "/", expires: 0.008});
  }, 500);
};
```

- 页面加载 500ms 后自动弹出
- 使用 Cookie 记录已显示状态（`expires: 0.008` ≈ 约 7 分钟内不重复弹）
- 弹窗头部使用 `colorful-bg jb-pink` 彩色渐变背景
- 三个操作按钮（更新日志/主题文档/立即购买）分别用不同颜色

### 9.8 Speculation Rules 预加载

```json
{"prefetch":[{"source":"document","where":{"and":[
  {"href_matches":"/*"},
  {"not":{"href_matches":["/wp-*.php","/wp-admin/*","/demo.zibll.com/*",
    "/wp-content/*","/wp-content/plugins/*","/wp-content/themes/zibll/*","/*\\?(.+)"]},
  {"not":{"selector_matches":"a[rel~=\"nofollow\"]"}}
]}}]}
```

- 排除所有后台路径、静态资源路径、带查询参数的链接
- 排除 `rel="nofollow"` 的链接
- 符合条件的内部链接会被浏览器预加载

### 9.9 性能数据

控制台输出的性能指标：
- 数据库查询：**7 次**
- 页面生成耗时：**238.964ms**（约 0.24 秒）

### 9.10 第三方服务集成

| 服务 | 用途 | 域名 |
|------|------|------|
| 百度统计 | 流量分析 | `hm.baidu.com` |
| 百度推送 | 主动推送给百度收录 | `zz.bdstatic.com` |
| 阿里云 OSS | 静态资源 CDN | `oss.zibll.com` |
| Edge 翻译 | 多语言翻译 | 客户端集成 |
| Swiper | 轮播组件 | 主题内置 |

---

## 十、完整 CSS 类名速查表（主题自定义）

### 10.1 布局类

| 类名 | 用途 |
|------|------|
| `content-wrap` | 主内容包裹 |
| `content-layout` | 内容布局容器 |
| `zib-widget-wrap` | 小部件包裹 |
| `widget-container` | 小部件容器 |
| `widget-content` | 小部件内容 |
| `container-fluid container-header` | 导航容器 |
| `mobile-header` | 移动端导航容器 |
| `mobile-navbar` | 移动端导航栏 |

### 10.2 交互类

| 类名 | 用途 |
|------|------|
| `hover-show` | 鼠标悬停显示自身 |
| `hover-show-con` | 悬停时显示的子内容 |
| `toggle-radius` | 带圆角动画的切换元素 |
| `fade` | 淡入淡出效果 |
| `scroll-y` | 垂直滚动 |
| `scroll-x` | 水平滚动 |
| `mini-scrollbar` | 迷你滚动条 |
| `mini-touch` | 触摸滑动（`touch-direction`） |
| `ajax-replace` | AJAX 动态替换内容 |
| `ajax-option` | AJAX 筛选选项 |

### 10.3 工具类

| 类名 | 用途 |
|------|------|
| `flex jsa ac` | Flex 布局：space-between + 垂直居中 |
| `flex jsb` | Flex 布局：space-between |
| `flex-auto` | Flex 自动伸缩 |
| `flex0` | Flex 不伸缩 |
| `flex1` | Flex 占满剩余空间 |
| `text-center` | 文本居中 |
| `text-ellipsis` | 文本溢出省略号 |
| `relative` / `absolute` | 定位 |
| `radius4` / `radius8` | 圆角 |
| `pull-right` | 右浮动 |
| `inline-block` | 行内块 |
| `pointer` | 鼠标手型 |
| `nowave` | 取消波纹效果 |
| `hide-sm` | 小屏隐藏 |
| `visible-xs-block` | 仅小屏可见 |

### 10.4 颜色类

| 类名 | 颜色 |
|------|------|
| `c-blue` | 蓝色（登录） |
| `c-green` | 绿色（注册） |
| `c-purple` | 紫色（找回密码） |
| `c-red` | 红色 |
| `c-white` | 白色 |
| `c-yellow` | 黄色 |
| `jb-red` | 红色渐变（购买/重要按钮） |
| `jb-pink` | 粉色渐变（限时/通知） |
| `jb-cyan` | 青色渐变（NEW 标签） |
| `b-purple` | 紫色背景 |
| `b-yellow` | 黄色背景 |
| `c-purple-2` | 紫色文字 |

### 10.5 组件类

| 类名 | 组件 |
|------|------|
| `swiper-container/swiper-scroll` | Swiper 滚动容器 |
| `swiper-wrapper/swiper-slide` | Swiper 幻灯片 |
| `swiper-button-prev/next` | Swiper 前后按钮 |
| `sub-menu` | 下拉子菜单 |
| `senior-submenu` | 高级子菜单（mega menu） |
| `submenu-multi-column-links` | 多列链接子菜单 |
| `submenu-graphic-card` | 图形卡片子菜单 |
| `menu-graphic-card-item` | 菜单图形卡片 |
| `img-box hover-zoom-img` | 图片容器 + 悬停缩放 |
| `img-badg-box` | 图片角标容器 |
| `badg` | 徽章/标签 |
| `badg-sm` | 小号徽章 |
| `menu-item-badge` | 菜单项徽章 |
| `social_loginbar` | 社交登录栏 |
| `social-login-item` | 社交登录按钮 |
| `sign-content` | 登录注册内容 |
| `modal-colorful-header` | 彩色弹窗头部 |
| `colorful-bg` | 彩色渐变背景 |
| `colorful-make` | 彩色装饰元素 |
| `float-btn` | 浮动按钮 |
| `posts-nav-box` | 文章导航 |
| `footer-contact` | 页脚联系方式 |
| `footer-wechat-img` | 页脚微信二维码 |

### 10.6 尺寸/间距类

| 类名 | 含义 |
|------|------|
| `em09` | 字号 0.9em |
| `em12` | 字号 1.2em |
| `px12` | 字号 12px |
| `mb6/mb10/mb20` | 下外边距 6/10/20 |
| `mt6/mt10/mt20` | 上外边距 6/10/20 |
| `ml6/ml10` | 左外边距 6/10 |
| `mr3/mr6/mr10` | 右外边距 3/6/10 |
| `padding-10` | 内边距 10 |
| `padding-w10` | 水平内边距 10 |
| `p2-10` | 内边距 2-10 |
| `btn-block` | 按钮块级 |
