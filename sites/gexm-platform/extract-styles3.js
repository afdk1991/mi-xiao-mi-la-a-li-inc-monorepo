JSON.stringify({
  postContainer: (() => {
    const selectors = ['.zib-widget', '.post-list', '.posts-list', '.article-list', '.post-list-content', '.main-content', '#main', '.content-area', '.zib-widget-wrap'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const cs = getComputedStyle(el);
        return {
          selector: sel,
          class: el.className,
          display: cs.display,
          gridTemplateColumns: cs.gridTemplateColumns,
          gap: cs.gap,
          childCount: el.children.length,
          firstChildClass: el.children[0] ? el.children[0].className : null,
          firstChildTag: el.children[0] ? el.children[0].tagName : null
        };
      }
    }
    return 'none found';
  })(),
  allSections: (() => {
    const sections = document.querySelectorAll('section, .section, .zib-widget, .widget');
    return Array.from(sections).slice(0, 10).map(s => ({
      tag: s.tagName,
      class: s.className.substring(0, 100),
      childCount: s.children.length
    }));
  })(),
  firstArticleLink: (() => {
    const a = document.querySelector('article a, .item a, h2 a, .entry-title a');
    if (!a) return null;
    const card = a.closest('article, .item, .post, .zib-widget');
    if (!card) return { linkText: a.textContent.substring(0, 50), noCard: true };
    const cs = getComputedStyle(card);
    return {
      linkText: a.textContent.substring(0, 50),
      cardClass: card.className.substring(0, 100),
      cardBg: cs.backgroundColor,
      cardBorderRadius: cs.borderRadius,
      cardBoxShadow: cs.boxShadow,
      cardDisplay: cs.display,
      cardFlexDirection: cs.flexDirection,
      cardWidth: cs.width,
      cardParentClass: card.parentElement.className.substring(0, 100),
      cardParentDisplay: getComputedStyle(card.parentElement).display,
      cardParentGrid: getComputedStyle(card.parentElement).gridTemplateColumns
    };
  })()
})
