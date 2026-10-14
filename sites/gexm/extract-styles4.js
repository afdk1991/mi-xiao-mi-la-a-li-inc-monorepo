JSON.stringify({
  articleList: (() => {
    const h2s = document.querySelectorAll('h2 a');
    if (!h2s.length) return 'no h2 links';
    const first = h2s[0];
    let el = first;
    let parents = [];
    for (let i = 0; i < 6; i++) {
      el = el.parentElement;
      if (!el) break;
      const cs = getComputedStyle(el);
      parents.push({
        tag: el.tagName,
        class: el.className.substring(0, 120),
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
        gap: cs.gap,
        childCount: el.children.length
      });
    }
    return { linkText: first.textContent.substring(0, 60), parents };
  })(),
  postListGrid: (() => {
    const grids = document.querySelectorAll('[class*="post-list"], [class*="posts-list"], [class*="article-list"], [class*="post-grid"]');
    if (!grids.length) return 'no grids';
    return Array.from(grids).slice(0, 3).map(g => {
      const cs = getComputedStyle(g);
      return {
        class: g.className.substring(0, 100),
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
        gap: cs.gap,
        childCount: g.children.length
      };
    });
  })()
})
