JSON.stringify({
  header: (() => {
    const h = document.querySelector('.header, header, .site-header, #header');
    if (!h) return null;
    const cs = getComputedStyle(h);
    return { bg: cs.backgroundColor, height: cs.height, position: cs.position };
  })(),
  nav: (() => {
    const n = document.querySelector('.navbar, nav, .main-nav, .nav-menu');
    if (!n) return null;
    const cs = getComputedStyle(n);
    return { bg: cs.backgroundColor, height: cs.height };
  })(),
  postCard: (() => {
    const c = document.querySelector('.post-card, .article-card, .zib-widget .item, .post-list .item');
    if (!c) return null;
    const cs = getComputedStyle(c);
    return { 
      bg: cs.backgroundColor, 
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      padding: cs.padding,
      display: cs.display,
      flexDirection: cs.flexDirection
    };
  })(),
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bodyColor: getComputedStyle(document.body).color,
  primaryColor: (() => {
    const btn = document.querySelector('.btn-primary, .button-primary, a.button, .btn');
    if (!btn) return null;
    return getComputedStyle(btn).backgroundColor;
  })(),
  linkColor: (() => {
    const a = document.querySelector('.post-list a, .article-title a, h2 a, .item-title a');
    if (!a) return null;
    return getComputedStyle(a).color;
  })(),
  fontSize: getComputedStyle(document.body).fontSize,
  fontFamily: getComputedStyle(document.body).fontFamily,
  cardGrid: (() => {
    const g = document.querySelector('.post-list, .posts-list, .article-list');
    if (!g) return null;
    const cs = getComputedStyle(g);
    return { display: cs.display, gridTemplateColumns: cs.gridTemplateColumns, gap: cs.gap };
  })()
})
