(function(){
  var results = {};
  
  // 1. Body 基础样式
  var body = document.body;
  var bodyStyle = getComputedStyle(body);
  results.body = {
    className: body.className,
    backgroundColor: bodyStyle.backgroundColor,
    color: bodyStyle.color,
    fontFamily: bodyStyle.fontFamily,
    fontSize: bodyStyle.fontSize,
    lineHeight: bodyStyle.lineHeight,
    margin: bodyStyle.margin,
    padding: bodyStyle.padding
  };
  
  // 2. HTML/根元素变量
  var htmlStyle = getComputedStyle(document.documentElement);
  results.rootVars = {
    '--theme-color': htmlStyle.getPropertyValue('--theme-color').trim(),
    '--color-primary': htmlStyle.getPropertyValue('--color-primary').trim(),
    '--main-text-color': htmlStyle.getPropertyValue('--main-text-color').trim(),
    '--main-text-secondary-color': htmlStyle.getPropertyValue('--main-text-secondary-color').trim(),
    '--color-bg': htmlStyle.getPropertyValue('--color-bg').trim(),
    '--color-bg-subtle': htmlStyle.getPropertyValue('--color-bg-subtle').trim()
  };
  
  // 3. 导航栏
  var navbar = document.querySelector('.navbar') || document.querySelector('nav') || document.querySelector('.navbar-top');
  if (navbar) {
    var navStyle = getComputedStyle(navbar);
    results.navbar = {
      tag: navbar.tagName,
      className: navbar.className.split(' ').slice(0, 5).join(' '),
      height: navStyle.height,
      minHeight: navStyle.minHeight,
      backgroundColor: navStyle.backgroundColor,
      boxShadow: navStyle.boxShadow,
      position: navStyle.position,
      zIndex: navStyle.zIndex,
      padding: navStyle.padding,
      margin: navStyle.margin
    };
  } else {
    results.navbar = null;
  }
  
  // 4. Header
  var header = document.querySelector('header') || document.querySelector('.site-header') || document.querySelector('.header');
  if (header) {
    var headerStyle = getComputedStyle(header);
    results.header = {
      tag: header.tagName,
      className: header.className.split(' ').slice(0, 5).join(' '),
      height: headerStyle.height,
      minHeight: headerStyle.minHeight,
      backgroundColor: headerStyle.backgroundColor,
      position: headerStyle.position,
      zIndex: headerStyle.zIndex
    };
  } else {
    results.header = null;
  }
  
  // 5. 容器
  var container = document.querySelector('.container') || document.querySelector('.site-container') || document.querySelector('.main-container');
  if (container) {
    var containerStyle = getComputedStyle(container);
    results.container = {
      tag: container.tagName,
      className: container.className.split(' ').slice(0, 5).join(' '),
      maxWidth: containerStyle.maxWidth,
      width: container.getBoundingClientRect().width,
      paddingLeft: containerStyle.paddingLeft,
      paddingRight: containerStyle.paddingRight,
      marginLeft: containerStyle.marginLeft,
      marginRight: containerStyle.marginRight
    };
  } else {
    results.container = null;
  }
  
  // 6. 文章卡片（首页列表）
  var postCard = document.querySelector('.post-card') || document.querySelector('.posts-item') || document.querySelector('article.post');
  if (postCard) {
    var cardStyle = getComputedStyle(postCard);
    results.postCard = {
      tag: postCard.tagName,
      className: postCard.className.split(' ').slice(0, 5).join(' '),
      backgroundColor: cardStyle.backgroundColor,
      borderRadius: cardStyle.borderRadius,
      boxShadow: cardStyle.boxShadow,
      padding: cardStyle.padding,
      margin: cardStyle.margin,
      width: postCard.getBoundingClientRect().width,
      border: cardStyle.border
    };
    
    // 卡片内部元素
    var cardTitle = postCard.querySelector('.post-title, .entry-title, h2, .item-title');
    var cardExcerpt = postCard.querySelector('.post-excerpt, .entry-excerpt, .item-excerpt, .entry-summary');
    var cardMeta = postCard.querySelector('.post-meta, .entry-meta, .item-meta');
    var cardBody = postCard.querySelector('.item-body, .card-body, .entry-body');
    
    if (cardTitle) {
      var titleStyle = getComputedStyle(cardTitle);
      results.postCard.title = {
        fontSize: titleStyle.fontSize,
        fontWeight: titleStyle.fontWeight,
        color: titleStyle.color,
        lineHeight: titleStyle.lineHeight,
        margin: titleStyle.margin,
        textDecoration: titleStyle.textDecoration
      };
    }
    if (cardExcerpt) {
      var excerptStyle = getComputedStyle(cardExcerpt);
      results.postCard.excerpt = {
        fontSize: excerptStyle.fontSize,
        color: excerptStyle.color,
        lineHeight: excerptStyle.lineHeight,
        margin: excerptStyle.margin
      };
    }
    if (cardMeta) {
      var metaStyle = getComputedStyle(cardMeta);
      results.postCard.meta = {
        fontSize: metaStyle.fontSize,
        color: metaStyle.color,
        margin: metaStyle.margin,
        padding: metaStyle.padding,
        borderTop: metaStyle.borderTop
      };
    }
    if (cardBody) {
      var bodyStyle = getComputedStyle(cardBody);
      results.postCard.cardBody = {
        padding: bodyStyle.padding
      };
    }
  } else {
    results.postCard = null;
  }
  
  // 7. 文章卡片网格布局
  var postGrid = document.querySelector('.post-list-grid') || document.querySelector('.posts-list') || document.querySelector('.post-list-container');
  if (postGrid) {
    var gridStyle = getComputedStyle(postGrid);
    results.postGrid = {
      tag: postGrid.tagName,
      className: postGrid.className.split(' ').slice(0, 3).join(' '),
      display: gridStyle.display,
      gridTemplateColumns: gridStyle.gridTemplateColumns,
      gap: gridStyle.gap,
      padding: gridStyle.padding,
      width: postGrid.getBoundingClientRect().width,
      childCount: postGrid.children.length
    };
  } else {
    results.postGrid = null;
  }
  
  // 8. 侧边栏
  var sidebar = document.querySelector('.sidebar') || document.querySelector('.widget-area') || document.querySelector('.aside');
  if (sidebar) {
    var sidebarStyle = getComputedStyle(sidebar);
    results.sidebar = {
      tag: sidebar.tagName,
      className: sidebar.className.split(' ').slice(0, 5).join(' '),
      width: sidebar.getBoundingClientRect().width,
      padding: sidebarStyle.padding,
      margin: sidebarStyle.margin,
      backgroundColor: sidebarStyle.backgroundColor
    };
    
    // 侧边栏小工具
    var widget = sidebar.querySelector('.widget');
    if (widget) {
      var widgetStyle = getComputedStyle(widget);
      results.sidebar.widget = {
        backgroundColor: widgetStyle.backgroundColor,
        borderRadius: widgetStyle.borderRadius,
        boxShadow: widgetStyle.boxShadow,
        padding: widgetStyle.padding,
        border: widgetStyle.border,
        marginBottom: widgetStyle.marginBottom
      };
      
      var widgetTitle = widget.querySelector('.widget-title, .widgettitle');
      if (widgetTitle) {
        var wtStyle = getComputedStyle(widgetTitle);
        results.sidebar.widget.title = {
          fontSize: wtStyle.fontSize,
          fontWeight: wtStyle.fontWeight,
          color: wtStyle.color,
          margin: wtStyle.margin,
          paddingBottom: wtStyle.paddingBottom,
          borderBottom: wtStyle.borderBottom
        };
      }
    }
  } else {
    results.sidebar = null;
  }
  
  // 9. 页脚
  var footer = document.querySelector('footer') || document.querySelector('.site-footer') || document.querySelector('.footer');
  if (footer) {
    var footerStyle = getComputedStyle(footer);
    results.footer = {
      tag: footer.tagName,
      className: footer.className.split(' ').slice(0, 5).join(' '),
      backgroundColor: footerStyle.backgroundColor,
      color: footerStyle.color,
      padding: footerStyle.padding,
      margin: footerStyle.margin,
      marginTop: footerStyle.marginTop,
      height: footer.getBoundingClientRect().height
    };
    
    // 页脚链接
    var footerLinks = footer.querySelectorAll('a');
    if (footerLinks.length > 0) {
      var flStyle = getComputedStyle(footerLinks[0]);
      results.footer.link = {
        color: flStyle.color,
        textDecoration: flStyle.textDecoration
      };
    }
  } else {
    results.footer = null;
  }
  
  // 10. 按钮样式
  var button = document.querySelector('button') || document.querySelector('.btn') || document.querySelector('.button') || document.querySelector('.but');
  if (button) {
    var btnStyle = getComputedStyle(button);
    results.button = {
      tag: button.tagName,
      className: button.className.split(' ').slice(0, 3).join(' '),
      fontSize: btnStyle.fontSize,
      fontWeight: btnStyle.fontWeight,
      backgroundColor: btnStyle.backgroundColor,
      color: btnStyle.color,
      borderRadius: btnStyle.borderRadius,
      padding: btnStyle.padding,
      border: btnStyle.border
    };
  } else {
    results.button = null;
  }
  
  // 11. 链接样式
  var link = document.querySelector('a');
  if (link) {
    var linkStyle = getComputedStyle(link);
    results.link = {
      color: linkStyle.color,
      textDecoration: linkStyle.textDecoration
    };
  }
  
  // 12. 标题样式
  var h1 = document.querySelector('h1');
  var h2 = document.querySelector('h2');
  if (h1) {
    var h1Style = getComputedStyle(h1);
    results.headings = {
      h1: {
        fontSize: h1Style.fontSize,
        fontWeight: h1Style.fontWeight,
        color: h1Style.color,
        lineHeight: h1Style.lineHeight,
        margin: h1Style.margin
      }
    };
  }
  if (h2) {
    var h2Style = getComputedStyle(h2);
    if (!results.headings) results.headings = {};
    results.headings.h2 = {
      fontSize: h2Style.fontSize,
      fontWeight: h2Style.fontWeight,
      color: h2Style.color,
      lineHeight: h2Style.lineHeight,
      margin: h2Style.margin
    };
  }
  
  // 13. 图片样式
  var img = document.querySelector('img');
  if (img) {
    var imgStyle = getComputedStyle(img);
    results.image = {
      maxWidth: imgStyle.maxWidth,
      height: imgStyle.height,
      borderRadius: imgStyle.borderRadius,
      display: imgStyle.display
    };
  }
  
  // 14. 导航链接
  var navLink = document.querySelector('.navbar a') || document.querySelector('.nav-link') || document.querySelector('.menu-item a');
  if (navLink) {
    var nlStyle = getComputedStyle(navLink);
    results.navLink = {
      fontSize: nlStyle.fontSize,
      color: nlStyle.color,
      padding: nlStyle.padding,
      lineHeight: nlStyle.lineHeight,
      textDecoration: nlStyle.textDecoration
    };
  }
  
  return JSON.stringify(results, null, 2);
})();
