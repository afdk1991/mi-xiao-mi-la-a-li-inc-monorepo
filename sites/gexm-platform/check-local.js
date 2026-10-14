JSON.stringify({
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bodyColor: getComputedStyle(document.body).color,
  fontSize: getComputedStyle(document.body).fontSize,
  fontFamily: getComputedStyle(document.body).fontFamily,
  header: (() => {
    const h = document.querySelector('header, .header, .site-header, #header, .navbar');
    if (!h) return null;
    const cs = getComputedStyle(h);
    return { bg: cs.backgroundColor, height: cs.height, position: cs.position, class: h.className };
  })(),
  postCard: (() => {
    const c = document.querySelector('.post-card, article.post-card, .posts-item');
    if (!c) return null;
    const cs = getComputedStyle(c);
    return { 
      bg: cs.backgroundColor, 
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      padding: cs.padding,
      display: cs.display,
      width: cs.width,
      class: c.className
    };
  })(),
  postListGrid: (() => {
    const g = document.querySelector('.post-list-grid, .post-list-container, .posts-list');
    if (!g) return null;
    const cs = getComputedStyle(g);
    return { display: cs.display, gridTemplateColumns: cs.gridTemplateColumns, gap: cs.gap, class: g.className };
  })(),
  linkColor: (() => {
    const a = document.querySelector('.post-card-title a, h2 a, .entry-title a');
    if (!a) return null;
    return getComputedStyle(a).color;
  })()
})
