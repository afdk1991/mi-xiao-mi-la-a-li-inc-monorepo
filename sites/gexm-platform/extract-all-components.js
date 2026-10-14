(function(){
  var results = {};

  // ============ 1. 头部导航完整结构 ============
  var header = document.querySelector('header.header');
  if (header) {
    results.header = {
      outerHTML: header.outerHTML.substring(0, 3000),
      children: Array.from(header.children).map(c => ({
        tag: c.tagName,
        cls: c.className,
        childCount: c.children.length
      })),
      styles: {
        height: getComputedStyle(header).height,
        backgroundColor: getComputedStyle(header).backgroundColor,
        position: getComputedStyle(header).position,
        borderBottom: getComputedStyle(header).borderBottom,
        boxShadow: getComputedStyle(header).boxShadow
      }
    };

    // Logo
    var logo = header.querySelector('.navbar-logo, .logo, .site-logo');
    if (logo) {
      var logoImg = logo.querySelector('img');
      results.header.logo = {
        outerHTML: logo.outerHTML.substring(0, 500),
        styles: {
          height: getComputedStyle(logo).height,
          lineHeight: getComputedStyle(logo).lineHeight,
          margin: getComputedStyle(logo).margin
        },
        img: logoImg ? {
          src: logoImg.src,
          maxHeight: getComputedStyle(logoImg).maxHeight,
          height: getComputedStyle(logoImg).height
        } : null
      };
    }

    // 主菜单
    var menu = header.querySelector('.navbar-nav, .main-menu, .menu');
    if (menu) {
      results.header.menu = {
        cls: menu.className,
        items: Array.from(menu.querySelectorAll(':scope > li, :scope > .menu-item')).slice(0, 8).map(li => {
          var a = li.querySelector('a');
          return {
            text: a ? a.textContent.trim().substring(0, 20) : null,
            href: a ? a.href : null,
            hasSub: !!li.querySelector('.sub-menu, .dropdown-menu'),
            styles: a ? {
              fontSize: getComputedStyle(a).fontSize,
              color: getComputedStyle(a).color,
              padding: getComputedStyle(a).padding,
              fontWeight: getComputedStyle(a).fontWeight
            } : null
          };
        })
      };
    }

    // 搜索按钮
    var search = header.querySelector('.main-search-btn, .nav-search-btn, [class*="search"]');
    if (search) {
      results.header.search = {
        cls: search.className,
        styles: {
          width: getComputedStyle(search).width,
          height: getComputedStyle(search).height,
          backgroundColor: getComputedStyle(search).backgroundColor,
          color: getComputedStyle(search).color,
          borderRadius: getComputedStyle(search).borderRadius
        }
      };
    }

    // 用户区域
    var userArea = header.querySelector('.navbar-user, .user-area, .signin-loader');
    if (userArea) {
      results.header.userArea = {
        cls: userArea.className,
        text: userArea.textContent.trim().substring(0, 50)
      };
    }
  }

  // ============ 2. 主内容区域结构 ============
  var main = document.querySelector('main, .site-main, #main');
  if (main) {
    results.main = {
      tag: main.tagName,
      cls: main.className,
      children: Array.from(main.children).slice(0, 10).map(c => ({
        tag: c.tagName,
        cls: c.className.split(' ').slice(0, 3).join(' '),
        childCount: c.children.length
      }))
    };

    // 社区概览/Banner
    var hero = main.querySelector('.community-hero, .hero, .banner, .page-hero');
    if (hero) {
      results.main.hero = {
        cls: hero.className,
        text: hero.textContent.trim().substring(0, 200),
        styles: {
          backgroundColor: getComputedStyle(hero).backgroundColor,
          padding: getComputedStyle(hero).padding,
          margin: getComputedStyle(hero).margin,
          borderRadius: getComputedStyle(hero).borderRadius
        }
      };
    }

    // 排序栏
    var sort = main.querySelector('.ajax-option, .post-filter, .sort-bar');
    if (sort) {
      results.main.sortBar = {
        cls: sort.className,
        text: sort.textContent.trim().substring(0, 100),
        styles: {
          backgroundColor: getComputedStyle(sort).backgroundColor,
          padding: getComputedStyle(sort).padding,
          borderRadius: getComputedStyle(sort).borderRadius,
          marginBottom: getComputedStyle(sort).marginBottom
        }
      };
    }

    // 文章列表容器
    var postList = main.querySelector('.post-list-container, .posts-list, .post-list');
    if (postList) {
      results.main.postList = {
        cls: postList.className,
        styles: {
          display: getComputedStyle(postList).display,
          gridTemplateColumns: getComputedStyle(postList).gridTemplateColumns,
          gap: getComputedStyle(postList).gap
        }
      };
    }
  }

  // ============ 3. 文章卡片完整结构 ============
  var postCard = document.querySelector('.posts-item, .post-card, article.post');
  if (postCard) {
    results.postCard = {
      outerHTML: postCard.outerHTML.substring(0, 2000),
      cls: postCard.className,
      children: Array.from(postCard.children).map(c => ({
        tag: c.tagName,
        cls: c.className,
        text: c.textContent.trim().substring(0, 100)
      })),
      styles: {
        backgroundColor: getComputedStyle(postCard).backgroundColor,
        borderRadius: getComputedStyle(postCard).borderRadius,
        boxShadow: getComputedStyle(postCard).boxShadow,
        padding: getComputedStyle(postCard).padding,
        margin: getComputedStyle(postCard).margin,
        border: getComputedStyle(postCard).border
      }
    };

    // 缩略图
    var thumb = postCard.querySelector('.item-thumb, .post-thumb, .entry-thumb, .thumb');
    if (thumb) {
      var thumbImg = thumb.querySelector('img');
      results.postCard.thumb = {
        cls: thumb.className,
        styles: {
          borderRadius: getComputedStyle(thumb).borderRadius,
          overflow: getComputedStyle(thumb).overflow,
          margin: getComputedStyle(thumb).margin
        },
        img: thumbImg ? {
          styles: {
            width: getComputedStyle(thumbImg).width,
            height: getComputedStyle(thumbImg).height,
            objectFit: getComputedStyle(thumbImg).objectFit
          }
        } : null
      };
    }

    // 卡片body
    var cardBody = postCard.querySelector('.item-body, .card-body, .post-body');
    if (cardBody) {
      results.postCard.body = {
        cls: cardBody.className,
        styles: {
          padding: getComputedStyle(cardBody).padding
        }
      };

      // 标题
      var title = cardBody.querySelector('.item-title, .post-title, h3, h2');
      if (title) {
        results.postCard.title = {
          text: title.textContent.trim().substring(0, 50),
          styles: {
            fontSize: getComputedStyle(title).fontSize,
            fontWeight: getComputedStyle(title).fontWeight,
            color: getComputedStyle(title).color,
            margin: getComputedStyle(title).margin,
            lineHeight: getComputedStyle(title).lineHeight
          }
        };
      }

      // 摘要
      var excerpt = cardBody.querySelector('.item-excerpt, .post-excerpt, .entry-excerpt');
      if (excerpt) {
        results.postCard.excerpt = {
          text: excerpt.textContent.trim().substring(0, 100),
          styles: {
            fontSize: getComputedStyle(excerpt).fontSize,
            color: getComputedStyle(excerpt).color,
            margin: getComputedStyle(excerpt).margin,
            lineHeight: getComputedStyle(excerpt).lineHeight,
            display: getComputedStyle(excerpt).display,
            webkitLineClamp: getComputedStyle(excerpt).webkitLineClamp
          }
        };
      }

      // Meta
      var meta = cardBody.querySelector('.item-meta, .post-meta, .entry-meta');
      if (meta) {
        results.postCard.meta = {
          text: meta.textContent.trim().substring(0, 100),
          styles: {
            fontSize: getComputedStyle(meta).fontSize,
            color: getComputedStyle(meta).color,
            margin: getComputedStyle(meta).margin,
            padding: getComputedStyle(meta).padding,
            borderTop: getComputedStyle(meta).borderTop
          }
        };
      }
    }
  }

  // ============ 4. 侧边栏小工具 ============
  var sidebar = document.querySelector('.sidebar, .widget-area, aside');
  if (sidebar) {
    results.sidebar = {
      cls: sidebar.className,
      styles: {
        width: sidebar.getBoundingClientRect().width,
        backgroundColor: getComputedStyle(sidebar).backgroundColor,
        padding: getComputedStyle(sidebar).padding
      },
      widgets: Array.from(sidebar.querySelectorAll('.widget')).slice(0, 5).map(w => {
        var title = w.querySelector('.widget-title, .widgettitle');
        return {
          cls: w.className.split(' ').slice(0, 3).join(' '),
          title: title ? title.textContent.trim() : null,
          styles: {
            backgroundColor: getComputedStyle(w).backgroundColor,
            borderRadius: getComputedStyle(w).borderRadius,
            boxShadow: getComputedStyle(w).boxShadow,
            padding: getComputedStyle(w).padding,
            marginBottom: getComputedStyle(w).marginBottom
          }
        };
      })
    };
  }

  // ============ 5. 页脚完整结构 ============
  var footer = document.querySelector('footer.footer, .site-footer, footer');
  if (footer) {
    results.footer = {
      cls: footer.className,
      children: Array.from(footer.children).slice(0, 5).map(c => ({
        tag: c.tagName,
        cls: c.className,
        childCount: c.children.length
      })),
      styles: {
        backgroundColor: getComputedStyle(footer).backgroundColor,
        color: getComputedStyle(footer).color,
        padding: getComputedStyle(footer).padding,
        margin: getComputedStyle(footer).margin,
        borderTop: getComputedStyle(footer).borderTop
      },
      copyright: (() => {
        var cp = footer.querySelector('.footer-copyright, .copyright, .site-info');
        return cp ? {
          cls: cp.className,
          text: cp.textContent.trim().substring(0, 100),
          styles: {
            fontSize: getComputedStyle(cp).fontSize,
            color: getComputedStyle(cp).color,
            padding: getComputedStyle(cp).padding,
            borderTop: getComputedStyle(cp).borderTop
          }
        } : null;
      })()
    };
  }

  // ============ 6. 按钮系统 ============
  var buttons = document.querySelectorAll('.but, .btn, .button');
  results.buttons = Array.from(buttons).slice(0, 5).map(b => ({
    cls: b.className.split(' ').slice(0, 5).join(' '),
    text: b.textContent.trim().substring(0, 20),
    styles: {
      fontSize: getComputedStyle(b).fontSize,
      fontWeight: getComputedStyle(b).fontWeight,
      backgroundColor: getComputedStyle(b).backgroundColor,
      color: getComputedStyle(b).color,
      borderRadius: getComputedStyle(b).borderRadius,
      padding: getComputedStyle(b).padding,
      border: getComputedStyle(b).border
    }
  }));

  // ============ 7. 链接hover色 ============
  results.linkColors = {
    normal: getComputedStyle(document.querySelector('a')).color,
    themeColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim() || '#ff3f9f'
  };

  return JSON.stringify(results, null, 2);
})();
