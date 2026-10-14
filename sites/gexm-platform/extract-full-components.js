(function() {
  const result = {};

  // 1. 所有 CSS 变量
  result.cssVariables = {};
  const styles = getComputedStyle(document.documentElement);
  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i];
    if (prop.startsWith('--')) {
      result.cssVariables[prop] = styles.getPropertyValue(prop).trim();
    }
  }

  // 2. body 的所有 class
  result.bodyClasses = Array.from(document.body.classList);

  // 3. 页面主要区域结构
  result.regions = {};

  // Header
  const header = document.querySelector('header, .header, .site-header, #header, .zib-header');
  if (header) {
    result.regions.header = {
      tag: header.tagName,
      classes: Array.from(header.classList),
      id: header.id,
      height: header.offsetHeight,
      position: getComputedStyle(header).position,
      innerHTML: header.innerHTML.substring(0, 3000)
    };
    // header 内的所有直接子元素
    result.regions.header.children = Array.from(header.children).map((el, i) => ({
      index: i,
      tag: el.tagName,
      classes: Array.from(el.classList),
      id: el.id,
      text: el.textContent.substring(0, 100)
    }));
  }

  // 主内容区
  const main = document.querySelector('main, .main, .site-main, #main, .container');
  if (main) {
    result.regions.main = {
      tag: main.tagName,
      classes: Array.from(main.classList),
      id: main.id,
      childrenCount: main.children.length
    };
  }

  // Sidebar
  const sidebar = document.querySelector('.sidebar, .widget-area, #sidebar, aside');
  if (sidebar) {
    result.regions.sidebar = {
      tag: sidebar.tagName,
      classes: Array.from(sidebar.classList),
      id: sidebar.id,
      widgetCount: sidebar.querySelectorAll('.widget').length
    };
    // 所有 widget
    result.regions.sidebar.widgets = Array.from(sidebar.querySelectorAll('.widget')).map(w => ({
      classes: Array.from(w.classList),
      title: w.querySelector('.widget-title, h2, h3, h4')?.textContent?.trim() || '',
      innerHTML: w.innerHTML.substring(0, 500)
    }));
  }

  // Footer
  const footer = document.querySelector('footer, .footer, .site-footer, #footer, .zib-footer');
  if (footer) {
    result.regions.footer = {
      tag: footer.tagName,
      classes: Array.from(footer.classList),
      id: footer.id,
      backgroundColor: getComputedStyle(footer).backgroundColor,
      children: Array.from(footer.children).map((el, i) => ({
        index: i,
        tag: el.tagName,
        classes: Array.from(el.classList),
        text: el.textContent.substring(0, 100)
      }))
    };
  }

  // 4. 文章卡片结构
  const postCards = document.querySelectorAll('.post-card, article.post, .posts-item, .card');
  result.postCards = [];
  if (postCards.length > 0) {
    for (let i = 0; i < Math.min(5, postCards.length); i++) {
      const card = postCards[i];
      result.postCards.push({
        classes: Array.from(card.classList),
        tag: card.tagName,
        innerHTML: card.innerHTML.substring(0, 2000),
        computedStyles: {
          borderRadius: getComputedStyle(card).borderRadius,
          boxShadow: getComputedStyle(card).boxShadow,
          border: getComputedStyle(card).border,
          padding: getComputedStyle(card).padding,
          margin: getComputedStyle(card).margin,
          backgroundColor: getComputedStyle(card).backgroundColor
        }
      });
    }
  }

  // 5. 导航菜单
  const navs = document.querySelectorAll('nav, .nav, .menu, .navigation');
  result.navs = Array.from(navs).slice(0, 5).map(nav => ({
    classes: Array.from(nav.classList),
    tag: nav.tagName,
    items: Array.from(nav.querySelectorAll('a, li')).slice(0, 10).map(item => ({
      text: item.textContent?.trim()?.substring(0, 30) || '',
      classes: Array.from(item.classList),
      tag: item.tagName
    }))
  }));

  // 6. 按钮样式
  const buttons = document.querySelectorAll('button, .btn, .button, a.button');
  result.buttons = [];
  const seenButtonClasses = new Set();
  for (const btn of buttons) {
    const classKey = Array.from(btn.classList).sort().join(',');
    if (classKey && !seenButtonClasses.has(classKey) && result.buttons.length < 10) {
      seenButtonClasses.add(classKey);
      result.buttons.push({
        classes: Array.from(btn.classList),
        tag: btn.tagName,
        text: btn.textContent?.trim()?.substring(0, 30) || '',
        computedStyles: {
          borderRadius: getComputedStyle(btn).borderRadius,
          backgroundColor: getComputedStyle(btn).backgroundColor,
          color: getComputedStyle(btn).color,
          padding: getComputedStyle(btn).padding,
          fontSize: getComputedStyle(btn).fontSize,
          fontWeight: getComputedStyle(btn).fontWeight
        }
      });
    }
  }

  // 7. 高频使用的 CSS 类名（前 100 个）
  const allElements = document.querySelectorAll('*');
  const classCount = {};
  for (const el of allElements) {
    for (const cls of el.classList) {
      classCount[cls] = (classCount[cls] || 0) + 1;
    }
  }
  result.topClasses = Object.entries(classCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([name, count]) => ({ name, count }));

  // 8. 所有使用的字体
  result.fonts = {
    body: getComputedStyle(document.body).fontFamily,
    headings: {}
  };
  for (let i = 1; i <= 6; i++) {
    const h = document.querySelector('h' + i);
    if (h) {
      result.fonts.headings['h' + i] = getComputedStyle(h).fontFamily;
    }
  }

  // 9. 颜色方案（从常用元素提取）
  result.colors = {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    headerBg: header ? getComputedStyle(header).backgroundColor : null,
    linkColor: null,
    primaryColor: null
  };
  const firstLink = document.querySelector('a');
  if (firstLink) {
    result.colors.linkColor = getComputedStyle(firstLink).color;
  }

  // 10. 页面上所有独特的组件类型（基于 class 前缀）
  const componentPrefixes = new Set();
  for (const cls of Object.keys(classCount)) {
    const parts = cls.split('-');
    if (parts.length >= 2 && parts[0].length > 2) {
      componentPrefixes.add(parts[0] + '-' + parts[1]);
    }
  }
  result.componentPrefixes = Array.from(componentPrefixes).sort();

  // 11. 顶部通知栏/公告栏
  const topBar = document.querySelector('.top-bar, .notification-bar, .site-notice, .header-notice');
  if (topBar) {
    result.topBar = {
      classes: Array.from(topBar.classList),
      text: topBar.textContent?.trim()?.substring(0, 200) || '',
      backgroundColor: getComputedStyle(topBar).backgroundColor
    };
  }

  // 12. 搜索框
  const searchForm = document.querySelector('.search-form, .search, form[role="search"]');
  if (searchForm) {
    result.searchForm = {
      classes: Array.from(searchForm.classList),
      innerHTML: searchForm.innerHTML.substring(0, 1000),
      placeholder: searchForm.querySelector('input[type="search"]')?.placeholder || ''
    };
  }

  // 13. 分页
  const pagination = document.querySelector('.pagination, .nav-links, .page-numbers, .wp-pagenavi');
  if (pagination) {
    result.pagination = {
      classes: Array.from(pagination.classList),
      innerHTML: pagination.innerHTML.substring(0, 1000)
    };
  }

  // 14. 面包屑
  const breadcrumb = document.querySelector('.breadcrumb, .breadcrumbs, .yoast-breadcrumb');
  if (breadcrumb) {
    result.breadcrumb = {
      classes: Array.from(breadcrumb.classList),
      text: breadcrumb.textContent?.trim()?.substring(0, 200) || ''
    };
  }

  // 15. 回到顶部按钮
  const backToTop = document.querySelector('.back-to-top, .scroll-top, .to-top, .go-top');
  if (backToTop) {
    result.backToTop = {
      classes: Array.from(backToTop.classList),
      display: getComputedStyle(backToTop).display
    };
  }

  // 16. 轮播/滑块
  const sliders = document.querySelectorAll('.slider, .swiper, .carousel, .banner-slider');
  result.sliders = Array.from(slayers).slice(0, 3).map(s => ({
    classes: Array.from(s.classList),
    slideCount: s.querySelectorAll('.slide, .swiper-slide, .carousel-item').length
  }));

  // 17. Tab 组件
  const tabs = document.querySelectorAll('.tabs, .tab-nav, .nav-tabs');
  result.tabs = Array.from(tabs).slice(0, 3).map(t => ({
    classes: Array.from(t.classList),
    tabItems: Array.from(t.querySelectorAll('.tab, li, .nav-item')).map(i => i.textContent?.trim()?.substring(0, 20) || '').filter(Boolean)
  }));

  // 18. 用户头像/作者卡片
  const authorCards = document.querySelectorAll('.author-card, .user-card, .author-box, .post-author');
  result.authorCards = Array.from(authorCards).slice(0, 3).map(a => ({
    classes: Array.from(a.classList),
    innerHTML: a.innerHTML.substring(0, 800)
  }));

  // 19. 标签/分类
  const tagClouds = document.querySelectorAll('.tag-cloud, .wp-tag-cloud, .tags, .post-tags');
  result.tagClouds = Array.from(tagClouds).slice(0, 3).map(t => ({
    classes: Array.from(t.classList),
    tagCount: t.querySelectorAll('a, .tag').length
  }));

  // 20. 评论区
  const comments = document.querySelector('.comments-area, #comments, .comment-list');
  if (comments) {
    result.comments = {
      classes: Array.from(comments.classList),
      commentCount: comments.querySelectorAll('.comment, .comment-body').length
    };
  }

  // 21. 社交分享
  const socialShare = document.querySelectorAll('.social-share, .share-buttons, .entry-share');
  result.socialShare = Array.from(socialShare).slice(0, 2).map(s => ({
    classes: Array.from(s.classList),
    platforms: Array.from(s.querySelectorAll('a')).map(a => a.className?.substring(0, 50) || '').filter(Boolean)
  }));

  // 22. 文章元信息（分类、标签、日期、作者）
  const postMeta = document.querySelectorAll('.post-meta, .entry-meta, .item-meta');
  result.postMetaSamples = Array.from(postMeta).slice(0, 3).map(m => ({
    classes: Array.from(m.classList),
    innerHTML: m.innerHTML.substring(0, 500)
  }));

  // 23. 页面布局容器结构
  result.layout = {
    containerWidth: document.querySelector('.container, .container-fluid')?.offsetWidth || 0,
    contentWidth: document.querySelector('.content, .main-content, #primary')?.offsetWidth || 0,
    sidebarWidth: document.querySelector('.sidebar, #secondary')?.offsetWidth || 0
  };

  return JSON.stringify(result, null, 2);
})();
