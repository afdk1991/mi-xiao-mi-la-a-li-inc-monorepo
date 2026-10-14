JSON.stringify({
  cardDetails: (() => {
    const card = document.querySelector('posts.card, .posts-item.card');
    if (!card) return 'no card';
    const cs = getComputedStyle(card);
    const parent = card.parentElement;
    const parentCS = getComputedStyle(parent);
    return {
      cardClass: card.className,
      cardDisplay: cs.display,
      cardWidth: cs.width,
      cardHeight: cs.height,
      cardBg: cs.backgroundColor,
      cardBorderRadius: cs.borderRadius,
      cardBoxShadow: cs.boxShadow,
      cardPadding: cs.padding,
      cardMargin: cs.margin,
      cardVerticalAlign: cs.verticalAlign,
      cardBorder: cs.border,
      parentClass: parent.className.substring(0, 100),
      parentDisplay: parentCS.display,
      parentWidth: parentCS.width,
      parentPadding: parentCS.padding,
      parentMargin: parentCS.margin,
      siblingsCount: parent.children.length
    };
  })(),
  cardStructure: (() => {
    const card = document.querySelector('posts.card, .posts-item.card');
    if (!card) return null;
    return Array.from(card.children).map(c => {
      let cls = c.className || '';
      return { tag: c.tagName, class: typeof cls === 'string' ? cls.substring(0, 80) : '', children: c.children.length };
    });
  })(),
  thumbStyle: (() => {
    const thumb = document.querySelector('posts.card .item-thumb, .posts-item .item-thumb, .posts-item .thumb');
    if (!thumb) return null;
    const cs = getComputedStyle(thumb);
    return { width: cs.width, height: cs.height, borderRadius: cs.borderRadius, overflow: cs.overflow };
  })()
})
